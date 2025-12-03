import { query } from "../db/client.js";
import { NotificationRepository } from "../db/repositories/notificationRepository.js";
import { UserNotificationSettingsRepository } from "../db/repositories/userNotificationSettingsRepository.js";
import { TrackedItemsRepository } from "../db/repositories/trackedItemsRepository.js";
import type { PoolClient } from "pg";

/**
 * Notification event types
 */
export type NotificationType = "STOCK" | "PRICE" | "RESTOCK";

/**
 * Price change detection result
 */
interface PriceChange {
  changed: boolean;
  oldPrice: number | null;
  newPrice: number | null;
  percentageChange: number | null;
}

/**
 * Stock change detection result
 */
interface StockChange {
  changed: boolean;
  oldStatus: string | null;
  newStatus: string | null;
  isRestock: boolean;
  isOutOfStock: boolean;
}

/**
 * Service for detecting changes and creating notifications
 */
export class NotificationService {
  private notificationRepo: NotificationRepository;
  private settingsRepo: UserNotificationSettingsRepository;
  private trackedItemsRepo: TrackedItemsRepository;

  constructor() {
    this.notificationRepo = new NotificationRepository();
    this.settingsRepo = new UserNotificationSettingsRepository();
    this.trackedItemsRepo = new TrackedItemsRepository();
  }

  /**
   * Check for price changes and create notifications
   * Called after price history is inserted
   *
   * @param client - Database client (for transaction)
   * @param variantId - Variant ID
   * @param newPrice - New price value
   * @param currency - Currency code
   */
  async checkPriceChange(
    client: PoolClient,
    variantId: number,
    newPrice: number,
    currency: string | null
  ): Promise<void> {
    try {
      // Get price change info
      const priceChange = await this.detectPriceChange(client, variantId, newPrice);

      if (!priceChange.changed || !priceChange.percentageChange) {
        return; // No significant change
      }

      // Get all tracked items for this variant
      const trackedItems = await this.getTrackedItemsForVariant(client, variantId);

      for (const item of trackedItems) {
        // Get user settings
        const settings = await this.settingsRepo.getSettings(item.user_id);

        // Check if user wants price change notifications
        if (!settings.email_enabled) {
          continue;
        }

        // Check threshold (only notify if change exceeds threshold)
        const absPercentageChange = Math.abs(priceChange.percentageChange);
        if (absPercentageChange < settings.threshold_percentage) {
          continue;
        }

        // Check if notifications are enabled for this tracked item
        if (!item.notifications_enabled) {
          continue;
        }

        // Create notification
        const message = this.formatPriceChangeMessage(
          item.product.name || "Product",
          priceChange.oldPrice,
          priceChange.newPrice,
          currency,
          priceChange.percentageChange
        );

        const notification = await this.notificationRepo.createNotification({
          user_id: item.user_id,
          product_id: item.product_id,
          variant_id: variantId,
          type: "PRICE",
          message,
          old_price: priceChange.oldPrice,
          new_price: priceChange.newPrice,
          notify_price_change: true,
        });

        console.log(
          `[NOTIFICATION] Created PRICE notification ${notification.id} for user ${item.user_id}, product ${item.product_id}, variant ${variantId}`
        );
        console.log(
          `[NOTIFICATION]   Price: ${priceChange.oldPrice} → ${priceChange.newPrice} (${priceChange.percentageChange?.toFixed(1)}%)`
        );
      }
    } catch (error) {
      console.error(`[NotificationService] Error checking price change for variant ${variantId}:`, error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Check for stock changes and create notifications
   * Called after stock history is inserted
   *
   * @param client - Database client (for transaction)
   * @param variantId - Variant ID
   * @param newStatus - New stock status
   */
  async checkStockChange(
    client: PoolClient,
    variantId: number,
    newStatus: string
  ): Promise<void> {
    try {
      // Get stock change info
      const stockChange = await this.detectStockChange(client, variantId, newStatus);

      if (!stockChange.changed) {
        return; // No change
      }

      // Get all tracked items for this variant
      const trackedItems = await this.getTrackedItemsForVariant(client, variantId);

      for (const item of trackedItems) {
        // Get user settings
        const settings = await this.settingsRepo.getSettings(item.user_id);

        // Check if user wants stock notifications
        if (!settings.email_enabled) {
          continue;
        }

        // Check if notifications are enabled for this tracked item
        if (!item.notifications_enabled) {
          continue;
        }

        // Determine notification type and check user preferences
        let notificationType: NotificationType = "STOCK";
        let shouldNotify = false;

        if (stockChange.isRestock) {
          notificationType = "RESTOCK";
          shouldNotify = true; // Always notify on restock
        } else if (stockChange.isOutOfStock) {
          shouldNotify = true; // Notify on out of stock
        } else {
          shouldNotify = true; // Notify on any stock status change
        }

        if (!shouldNotify) {
          continue;
        }

        // Create notification
        const message = this.formatStockChangeMessage(
          item.product.name || "Product",
          stockChange.oldStatus,
          stockChange.newStatus,
          stockChange.isRestock
        );

        const notification = await this.notificationRepo.createNotification({
          user_id: item.user_id,
          product_id: item.product_id,
          variant_id: variantId,
          type: notificationType,
          message,
          old_status: stockChange.oldStatus,
          new_status: stockChange.newStatus,
          notify_restock: stockChange.isRestock,
          notify_oos: stockChange.isOutOfStock,
        });

        console.log(
          `[NOTIFICATION] Created ${notificationType} notification ${notification.id} for user ${item.user_id}, product ${item.product_id}, variant ${variantId}`
        );
        console.log(
          `[NOTIFICATION]   Stock: ${stockChange.oldStatus || "unknown"} → ${stockChange.newStatus}${stockChange.isRestock ? " (RESTOCK)" : ""}${stockChange.isOutOfStock ? " (OUT OF STOCK)" : ""}`
        );
      }
    } catch (error) {
      console.error(`[NotificationService] Error checking stock change for variant ${variantId}:`, error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Detect price change by comparing with last price history entry
   */
  private async detectPriceChange(
    client: PoolClient,
    variantId: number,
    newPrice: number
  ): Promise<PriceChange> {
    const sql = `
      SELECT price
      FROM variant_price_history
      WHERE variant_id = $1
      ORDER BY recorded_at DESC
      LIMIT 2
    `;

    const result = await client.query<{ price: number }>(sql, [variantId]);

    if (result.rows.length < 2) {
      // First price entry - no change to detect
      return {
        changed: false,
        oldPrice: null,
        newPrice,
        percentageChange: null,
      };
    }

    const oldPrice = result.rows[1].price; // Second most recent
    const priceChanged = oldPrice !== newPrice;

    if (!priceChanged) {
      return {
        changed: false,
        oldPrice,
        newPrice,
        percentageChange: null,
      };
    }

    // Calculate percentage change
    const percentageChange = oldPrice
      ? ((newPrice - oldPrice) / oldPrice) * 100
      : null;

    return {
      changed: true,
      oldPrice,
      newPrice,
      percentageChange,
    };
  }

  /**
   * Detect stock change by comparing with last stock history entry
   */
  private async detectStockChange(
    client: PoolClient,
    variantId: number,
    newStatus: string
  ): Promise<StockChange> {
    const sql = `
      SELECT status
      FROM variant_stock_history
      WHERE variant_id = $1
      ORDER BY recorded_at DESC
      LIMIT 2
    `;

    const result = await client.query<{ status: string }>(sql, [variantId]);

    if (result.rows.length < 2) {
      // First stock entry - check if it's in stock (restock notification)
      const isRestock = newStatus === "in_stock";
      return {
        changed: true,
        oldStatus: null,
        newStatus,
        isRestock,
        isOutOfStock: newStatus === "out_of_stock",
      };
    }

    const oldStatus = result.rows[1].status; // Second most recent
    const statusChanged = oldStatus !== newStatus;

    if (!statusChanged) {
      return {
        changed: false,
        oldStatus,
        newStatus,
        isRestock: false,
        isOutOfStock: false,
      };
    }

    // Check if this is a restock (was out of stock, now in stock)
    const isRestock =
      (oldStatus === "out_of_stock" || oldStatus === "unknown") &&
      newStatus === "in_stock";

    const isOutOfStock = newStatus === "out_of_stock";

    return {
      changed: true,
      oldStatus,
      newStatus,
      isRestock,
      isOutOfStock,
    };
  }

  /**
   * Get all tracked items for a variant (including product-level tracking)
   */
  private async getTrackedItemsForVariant(
    client: PoolClient,
    variantId: number
  ): Promise<Array<{
    id: number;
    user_id: string;
    product_id: number;
    variant_id: number | null;
    notifications_enabled: boolean;
    product: { name: string | null };
  }>> {
    // Get variant's product_id
    const variantResult = await client.query<{ product_id: number }>(
      "SELECT product_id FROM variants WHERE id = $1",
      [variantId]
    );

    if (variantResult.rows.length === 0) {
      return [];
    }

    const productId = variantResult.rows[0].product_id;

    // Get tracked items for this variant OR for the product (variant_id IS NULL)
    const sql = `
      SELECT 
        ti.id,
        ti.user_id,
        ti.product_id,
        ti.variant_id,
        ti.notifications_enabled,
        json_build_object('name', p.name) as product
      FROM tracked_items ti
      INNER JOIN products p ON ti.product_id = p.id
      WHERE ti.product_id = $1
        AND (ti.variant_id = $2 OR ti.variant_id IS NULL)
    `;

    const result = await client.query<{
      id: number;
      user_id: string;
      product_id: number;
      variant_id: number | null;
      notifications_enabled: boolean;
      product: { name: string | null };
    }>(sql, [productId, variantId]);

    return result.rows;
  }

  /**
   * Format price change notification message
   */
  private formatPriceChangeMessage(
    productName: string,
    oldPrice: number | null,
    newPrice: number | null,
    currency: string | null,
    percentageChange: number | null
  ): string {
    const currencyStr = currency ? ` ${currency}` : "";
    const changeStr = percentageChange
      ? percentageChange > 0
        ? `increased by ${percentageChange.toFixed(1)}%`
        : `decreased by ${Math.abs(percentageChange).toFixed(1)}%`
      : "changed";

    if (oldPrice === null) {
      return `${productName} is now available for ${newPrice}${currencyStr}`;
    }

    return `${productName} price ${changeStr} from ${oldPrice}${currencyStr} to ${newPrice}${currencyStr}`;
  }

  /**
   * Format stock change notification message
   */
  private formatStockChangeMessage(
    productName: string,
    oldStatus: string | null,
    newStatus: string | null,
    isRestock: boolean
  ): string {
    if (isRestock) {
      return `${productName} is back in stock!`;
    }

    if (newStatus === "out_of_stock") {
      return `${productName} is now out of stock`;
    }

    if (oldStatus === null) {
      return `${productName} stock status: ${newStatus}`;
    }

    return `${productName} stock changed from ${oldStatus} to ${newStatus}`;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

