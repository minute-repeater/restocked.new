import {
  db,
  products,
  trackedItems,
  stockChecks,
  notifications,
  users,
  userNotificationSettings,
  eq,
  and,
  desc,
  isNull,
  sql,
} from '@restocked/db';
import { extractProductData, closeBrowser } from '@restocked/scraper';
import { getPlanLimits, type NotificationPayload, type NotificationType } from '@restocked/shared';
import { createLogger } from '@restocked/shared/logger';
import { sendEmailNotification } from '../notifications/email.js';

const log = createLogger('worker:stockChecker');

export interface ProductToCheck {
  productId: string;
  productUrl: string;
  productName: string | null;
  variantId: string | null;
  trackedItemId: string;
  userId: string;
  userEmail: string;
  targetPrice: number | null;
  lastInStock: boolean | null;
  lastPrice: number | null;
}

/**
 * Main stock checking job. Runs periodically to check all products that need updates.
 */
export async function runStockCheck(): Promise<void> {
  log.info('Starting stock check job');

  try {
    // Get all products that need checking
    const productsToCheck = await getProductsToCheck();
    log.info({ count: productsToCheck.length }, 'Found products to check');

    // Process in batches to avoid overwhelming resources
    const batchSize = 5;
    for (let i = 0; i < productsToCheck.length; i += batchSize) {
      const batch = productsToCheck.slice(i, i + batchSize);
      await Promise.all(batch.map(checkProduct));

      // Small delay between batches
      if (i + batchSize < productsToCheck.length) {
        await sleep(2000);
      }
    }

    log.info('Stock check job complete');
  } catch (error) {
    log.error({ err: error }, 'Stock check job failed');
  } finally {
    // Clean up browser if it was used
    await closeBrowser();
  }
}

/**
 * Gets all products that need checking based on plan intervals.
 */
async function getProductsToCheck(): Promise<ProductToCheck[]> {
  // Complex query to get products needing checks based on user plan intervals
  // We join tracked_items -> products -> users and check the last check time

  const results = await db
    .select({
      productId: products.id,
      productUrl: products.url,
      productName: products.name,
      variantId: trackedItems.variantId,
      trackedItemId: trackedItems.id,
      userId: users.id,
      userEmail: users.email,
      userPlan: users.plan,
      targetPrice: trackedItems.targetPrice,
    })
    .from(trackedItems)
    .innerJoin(products, eq(trackedItems.productId, products.id))
    .innerJoin(users, eq(trackedItems.userId, users.id))
    .where(eq(trackedItems.isActive, true));

  // Filter by check interval and get last check data
  const toCheck: ProductToCheck[] = [];

  for (const row of results) {
    const limits = getPlanLimits(row.userPlan);
    const intervalMs = limits.checkIntervalMinutes * 60 * 1000;

    // Get last check for this product+variant
    const [lastCheck] = await db
      .select()
      .from(stockChecks)
      .where(
        and(
          eq(stockChecks.productId, row.productId),
          row.variantId
            ? eq(stockChecks.variantId, row.variantId)
            : isNull(stockChecks.variantId)
        )
      )
      .orderBy(desc(stockChecks.checkedAt))
      .limit(1);

    // Check if enough time has passed since last check
    const lastCheckTime = lastCheck?.checkedAt?.getTime() ?? 0;
    const now = Date.now();

    if (now - lastCheckTime >= intervalMs) {
      toCheck.push({
        productId: row.productId,
        productUrl: row.productUrl,
        productName: row.productName,
        variantId: row.variantId,
        trackedItemId: row.trackedItemId,
        userId: row.userId,
        userEmail: row.userEmail,
        targetPrice: row.targetPrice,
        lastInStock: lastCheck?.inStock ?? null,
        lastPrice: lastCheck?.price ?? null,
      });
    }
  }

  return toCheck;
}

/**
 * Checks a single product and sends notifications if needed.
 */
async function checkProduct(product: ProductToCheck): Promise<void> {
  log.info({ url: product.productUrl }, 'Checking product');

  try {
    const { data } = await extractProductData(product.productUrl);

    // Record the check
    await db.insert(stockChecks).values({
      productId: product.productId,
      variantId: product.variantId,
      inStock: data.inStock ?? false,
      price: data.price,
      currency: data.currency,
    });

    // Update product info if we got better data
    if (data.name || data.imageUrl) {
      await db
        .update(products)
        .set({
          name: data.name ?? undefined,
          imageUrl: data.imageUrl ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(products.id, product.productId));
    }

    // Check for notification triggers
    const notificationType = getNotificationType(product, data);

    if (notificationType) {
      await sendNotification(product, data, notificationType);
    }
  } catch (error) {
    log.error({ err: error, url: product.productUrl }, 'Failed to check product');
  }
}

/**
 * Determines if a notification should be sent.
 * Exported for use by simulator/testing scripts.
 */
export function getNotificationType(
  product: ProductToCheck,
  data: { inStock: boolean | null; price: number | null }
): NotificationType | null {
  // Back in stock: was out of stock, now in stock
  if (product.lastInStock === false && data.inStock === true) {
    return 'back_in_stock';
  }

  // Price target hit: price dropped to or below target
  if (
    product.targetPrice &&
    data.price &&
    product.lastPrice &&
    data.price <= product.targetPrice &&
    product.lastPrice > product.targetPrice
  ) {
    return 'price_target_hit';
  }

  // Price drop: significant decrease (> 5%)
  if (product.lastPrice && data.price && data.price < product.lastPrice) {
    const dropPercent = ((product.lastPrice - data.price) / product.lastPrice) * 100;
    if (dropPercent >= 5) {
      return 'price_drop';
    }
  }

  return null;
}

/**
 * Sends a notification to the user.
 */
async function sendNotification(
  product: ProductToCheck,
  data: { inStock: boolean | null; price: number | null },
  type: NotificationType
): Promise<void> {
  // Get user's notification settings
  const settings = await db.query.userNotificationSettings.findFirst({
    where: eq(userNotificationSettings.userId, product.userId),
  });

  // Create notification record
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: product.userId,
      trackedItemId: product.trackedItemId,
      type,
      status: 'pending',
    })
    .returning();

  // Send email if enabled
  if (settings?.emailEnabled === 'true') {
    const emailTo = settings.emailAddress || product.userEmail;

    const payload: NotificationPayload = {
      type,
      productName: product.productName || 'Product',
      productUrl: product.productUrl,
      imageUrl: null, // Could fetch from product if needed
      previousPrice: product.lastPrice,
      currentPrice: data.price,
      targetPrice: product.targetPrice,
    };

    const success = await sendEmailNotification(emailTo, payload);

    await db
      .update(notifications)
      .set({
        status: success ? 'sent' : 'failed',
        sentAt: success ? new Date() : null,
        errorMessage: success ? null : 'Email send failed',
      })
      .where(eq(notifications.id, notification.id));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
