/**
 * Tracking Service for Restocked App
 * 
 * Implements variant tracking workflow using the normalized schema (migration 009):
 * - Fetches variant data from product pages using existing fetch/extract utilities
 * - Compares current state to previous state
 * - Detects price drops, stock changes, and threshold met events
 * - Updates denormalized variant_prices and variant_stock tables
 * - Creates notifications based on user preferences
 * 
 * Uses PostgreSQL schema from migration 009_complete_normalized_schema.sql
 * All imports use .js extensions for ESM compatibility
 */

import { query, withTransaction } from "../db/client.js";
import { fetchProductPage } from "../fetcher/index.js";
import { extractProductShell } from "../extractor/index.js";
import { extractPrice } from "../pricing/priceExtractor.js";
import { extractStock } from "../stock/stockExtractor.js";
import { loadDom } from "../parser/loadDom.js";
import { extractEmbeddedJson } from "../parser/jsonExtraction.js";
import { logger } from "../api/utils/logger.js";
import { stockCheckRepository } from "../db/repositories/stockCheckRepository.js";
import { sendRestockAlert, isTelegramConfigured } from "./telegramService.js";
import type { PoolClient } from "pg";

// ============================================================================
// TELEGRAM ALERT CONFIGURATION
// ============================================================================

/**
 * Minimum confidence required to send Telegram alerts
 * Default: 70 (can be overridden via STOCKCHECK_NOTIFY_CONFIDENCE_MIN)
 */
const NOTIFY_CONFIDENCE_MIN = parseInt(
  process.env.STOCKCHECK_NOTIFY_CONFIDENCE_MIN || "70",
  10
);

/**
 * Cooldown period for Telegram alerts per tracked item (in milliseconds)
 * Prevents spam if item keeps going in/out of stock
 * Default: 1 hour
 */
const TELEGRAM_ALERT_COOLDOWN_MS = parseInt(
  process.env.TELEGRAM_ALERT_COOLDOWN_MS || String(60 * 60 * 1000),
  10
);

// ============================================================================
// TYPES (Matching PostgreSQL Schema 009)
// ============================================================================

/**
 * Stock status enum matching database type stock_status_type
 */
export type StockStatusType = 'in_stock' | 'out_of_stock' | 'low_stock' | 'preorder' | 'unknown';

/**
 * Notification type enum matching database type notification_type
 */
export type NotificationType = 'price_drop' | 'back_in_stock' | 'stock_change' | 'threshold_met';

/**
 * Product from database (schema 009)
 */
interface Product {
  id: bigint;
  url: string;
  name: string;
  brand: string | null;
  vendor: string | null;
  category: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Product variant from database (schema 009)
 */
interface ProductVariant {
  id: bigint;
  product_id: bigint;
  name: string;
  sku: string | null;
  upc: string | null;
  attributes: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Variant price state (denormalized - schema 009)
 */
interface VariantPrice {
  variant_id: bigint;
  current_price: number;
  previous_price: number | null;
  currency: string;
  last_seen_at: string;
  first_seen_at: string;
  discount_percent: number | null;
}

/**
 * Variant stock state (denormalized - schema 009)
 */
interface VariantStock {
  variant_id: bigint;
  stock_status: StockStatusType;
  quantity_available: number | null;
  last_seen_at: string;
  first_seen_at: string;
}

/**
 * Tracked item with notification preferences (schema 009)
 */
interface TrackedItem {
  id: bigint;
  user_id: string; // UUID
  variant_id: bigint;
  target_price: number | null;
  notify_on_price_drop: boolean;
  notify_on_back_in_stock: boolean;
  notify_on_any_stock_change: boolean;
  active: boolean;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User settings (schema 009)
 */
interface UserSettings {
  user_id: string; // UUID
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  price_drop_threshold_percent: number;
  timezone: string | null;
  quiet_hours: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Current state loaded from database
 */
interface CurrentState {
  product: Product;
  variant: ProductVariant;
  price: VariantPrice | null;
  stock: VariantStock | null;
  trackedItems: Array<TrackedItem & { user_settings: UserSettings | null }>;
}

/**
 * Fetched variant data from product page
 */
interface FetchedVariantData {
  price: {
    value: number;
    currency: string;
  } | null;
  stock: {
    status: StockStatusType;
    quantity: number | null;
  } | null;
  stockMetadata: {
    strategyName: string;
    confidence: number | null;
    reasonCode: string | null;
    evidence: string[];
    rawMetadata: Record<string, any> | null;
  } | null;
}

/**
 * Price change detection result
 */
interface PriceChange {
  oldPrice: number | null;
  newPrice: number | null;
  percentChange: number | null;
}

/**
 * Stock change detection result
 */
interface StockChange {
  oldStatus: string | null;
  newStatus: string;
  wentInStock: boolean;
  wentOutOfStock: boolean;
}

/**
 * Track variant result
 */
interface TrackVariantResult {
  variantId: number;
  priceChange?: PriceChange;
  stockChange?: StockChange;
  notificationsCreated: number;
  updatedTrackedItems: number;
}

/**
 * Track variants result
 */
interface TrackVariantsResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    variantId: number;
    ok: boolean;
    error?: string;
  }>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map extracted stock status to database enum
 * Handles differences between extraction types and database enum
 */
function mapToStockStatusType(status: string | null | undefined): StockStatusType {
  if (!status) return 'unknown';
  
  const normalized = status.toLowerCase().trim();
  
  switch (normalized) {
    case 'in_stock':
    case 'in stock':
    case 'available':
      return 'in_stock';
    case 'out_of_stock':
    case 'out of stock':
    case 'unavailable':
    case 'sold out':
      return 'out_of_stock';
    case 'low_stock':
    case 'low stock':
    case 'limited':
      return 'low_stock';
    case 'preorder':
    case 'pre-order':
    case 'pre order':
      return 'preorder';
    default:
      return 'unknown';
  }
}

/**
 * Calculate price change percentage
 */
function calculatePercentChange(oldPrice: number, newPrice: number): number {
  if (oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Check if notification should be created based on price change
 */
function shouldNotifyPriceDrop(
  priceChange: PriceChange | null,
  trackedItem: TrackedItem,
  userSettings: UserSettings | null
): boolean {
  if (!priceChange || !priceChange.oldPrice || !priceChange.newPrice) {
    return false;
  }

  // Price must have dropped
  if (priceChange.newPrice >= priceChange.oldPrice) {
    return false;
  }

  // User must have price drop notifications enabled
  if (!trackedItem.notify_on_price_drop) {
    return false;
  }

  // Check threshold if user settings exist
  if (userSettings && priceChange.percentChange !== null) {
    const threshold = Math.abs(userSettings.price_drop_threshold_percent);
    if (Math.abs(priceChange.percentChange) < threshold) {
      return false;
    }
  }

  return true;
}

/**
 * Check if notification should be created for back in stock
 */
function shouldNotifyBackInStock(
  stockChange: StockChange | null,
  trackedItem: TrackedItem
): boolean {
  if (!stockChange || !stockChange.wentInStock) {
    return false;
  }

  return trackedItem.notify_on_back_in_stock;
}

/**
 * Check if notification should be created for stock change
 */
function shouldNotifyStockChange(
  stockChange: StockChange | null,
  trackedItem: TrackedItem
): boolean {
  if (!stockChange || !stockChange.oldStatus || stockChange.oldStatus === stockChange.newStatus) {
    return false;
  }

  // Don't notify if it's a back-in-stock (handled separately)
  if (stockChange.wentInStock) {
    return false;
  }

  return trackedItem.notify_on_any_stock_change;
}

/**
 * Check if notification should be created for threshold met
 */
function shouldNotifyThresholdMet(
  newPrice: number | null,
  trackedItem: TrackedItem
): boolean {
  if (!newPrice || !trackedItem.target_price) {
    return false;
  }

  return newPrice <= trackedItem.target_price;
}

// ============================================================================
// TELEGRAM ALERT FUNCTIONS
// ============================================================================

/**
 * Send Telegram restock alert with confidence threshold and deduplication
 * 
 * @param productName - Name of the product
 * @param productUrl - URL to the product page
 * @param confidence - Detection confidence (0-100)
 * @param trackedItem - Tracked item for deduplication check
 */
async function sendTelegramRestockAlert(
  productName: string,
  productUrl: string,
  confidence: number,
  trackedItem: TrackedItem
): Promise<void> {
  // Skip if Telegram not configured
  if (!isTelegramConfigured()) {
    logger.debug("[Telegram] Not configured, skipping restock alert");
    return;
  }
  
  // Check confidence threshold
  if (confidence < NOTIFY_CONFIDENCE_MIN) {
    logger.info(
      {
        productName,
        confidence,
        threshold: NOTIFY_CONFIDENCE_MIN,
        trackedItemId: Number(trackedItem.id),
      },
      "[Telegram] Skipping alert due to low confidence"
    );
    return;
  }
  
  // Check deduplication - don't send if we recently notified
  // Uses last_notified_at from tracked_items table
  if (trackedItem.last_notified_at) {
    const lastNotified = new Date(trackedItem.last_notified_at).getTime();
    const now = Date.now();
    const timeSinceLastNotify = now - lastNotified;
    
    if (timeSinceLastNotify < TELEGRAM_ALERT_COOLDOWN_MS) {
      logger.info(
        {
          productName,
          trackedItemId: Number(trackedItem.id),
          timeSinceLastNotifyMs: timeSinceLastNotify,
          cooldownMs: TELEGRAM_ALERT_COOLDOWN_MS,
        },
        "[Telegram] Skipping alert due to cooldown (recently notified)"
      );
      return;
    }
  }
  
  // Also check if a back_in_stock notification was recently created
  // This provides additional deduplication via the notifications table
  try {
    const recentNotificationResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE tracked_item_id = $1 
         AND type = 'back_in_stock' 
         AND created_at > NOW() - INTERVAL '1 hour'`,
      [trackedItem.id]
    );
    
    const recentCount = parseInt(recentNotificationResult.rows[0]?.count || "0", 10);
    if (recentCount > 1) {
      // More than the one we just created = duplicate
      logger.info(
        {
          productName,
          trackedItemId: Number(trackedItem.id),
          recentNotifications: recentCount,
        },
        "[Telegram] Skipping alert - recent back_in_stock notification exists"
      );
      return;
    }
  } catch (error) {
    // Non-fatal - proceed with sending
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "[Telegram] Failed to check for recent notifications, proceeding anyway"
    );
  }
  
  // Send the alert
  try {
    const success = await sendRestockAlert(productName, productUrl, confidence);
    
    if (success) {
      logger.info(
        {
          productName,
          productUrl,
          confidence,
          trackedItemId: Number(trackedItem.id),
        },
        "[Telegram] ✅ Restock alert sent"
      );
      
      // Update last_notified_at to prevent duplicate alerts
      try {
        await query(
          `UPDATE tracked_items SET last_notified_at = NOW() WHERE id = $1`,
          [trackedItem.id]
        );
      } catch (updateError) {
        logger.warn(
          { error: updateError instanceof Error ? updateError.message : String(updateError) },
          "[Telegram] Failed to update last_notified_at"
        );
      }
    } else {
      logger.error(
        { productName, trackedItemId: Number(trackedItem.id) },
        "[Telegram] ❌ Failed to send restock alert"
      );
    }
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        productName,
        trackedItemId: Number(trackedItem.id),
      },
      "[Telegram] Error sending restock alert"
    );
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Load current state from database for a variant
 */
async function loadCurrentState(
  variantId: number,
  client?: PoolClient
): Promise<CurrentState> {
  // Load product, variant, price, stock, and tracked items in parallel
  let variantResult, priceResult, stockResult, trackedItemsResult;
  
  if (client) {
    [variantResult, priceResult, stockResult, trackedItemsResult] = await Promise.all([
      client.query<{
        id: bigint;
        product_id: bigint;
        name: string;
        sku: string | null;
        upc: string | null;
        attributes: Record<string, unknown> | null;
      }>(
        `SELECT v.id, v.product_id, v.name, v.sku, v.upc, v.attributes
         FROM product_variants v
         WHERE v.id = $1`,
        [variantId]
      ),
      client.query<VariantPrice>(
        `SELECT * FROM variant_prices WHERE variant_id = $1`,
        [variantId]
      ),
      client.query<VariantStock>(
        `SELECT * FROM variant_stock WHERE variant_id = $1`,
        [variantId]
      ),
      client.query<{
        id: bigint;
        user_id: string;
        variant_id: bigint;
        target_price: number | null;
        notify_on_price_drop: boolean;
        notify_on_back_in_stock: boolean;
        notify_on_any_stock_change: boolean;
        active: boolean;
        last_notified_at: string | null;
        created_at: string;
        updated_at: string;
        settings_user_id: string | null;
        email_notifications_enabled: boolean | null;
        push_notifications_enabled: boolean | null;
        price_drop_threshold_percent: number | null;
        timezone: string | null;
      }>(
        `SELECT 
          ti.id,
          ti.user_id,
          ti.variant_id,
          ti.target_price,
          ti.notify_on_price_drop,
          ti.notify_on_back_in_stock,
          ti.notify_on_any_stock_change,
          ti.active,
          ti.last_notified_at,
          ti.created_at,
          ti.updated_at,
          us.user_id AS settings_user_id,
          us.email_notifications_enabled,
          us.push_notifications_enabled,
          us.price_drop_threshold_percent,
          us.timezone
         FROM tracked_items ti
         LEFT JOIN user_settings us ON ti.user_id = us.user_id
         WHERE ti.variant_id = $1 AND ti.active = TRUE`,
        [variantId]
      ),
    ]);
  } else {
    [variantResult, priceResult, stockResult, trackedItemsResult] = await Promise.all([
      query<{
        id: bigint;
        product_id: bigint;
        name: string;
        sku: string | null;
        upc: string | null;
        attributes: Record<string, unknown> | null;
      }>(
        `SELECT v.id, v.product_id, v.name, v.sku, v.upc, v.attributes
         FROM product_variants v
         WHERE v.id = $1`,
        [variantId]
      ),
      query<VariantPrice>(
        `SELECT * FROM variant_prices WHERE variant_id = $1`,
        [variantId]
      ),
      query<VariantStock>(
        `SELECT * FROM variant_stock WHERE variant_id = $1`,
        [variantId]
      ),
      query<{
        id: bigint;
        user_id: string;
        variant_id: bigint;
        target_price: number | null;
        notify_on_price_drop: boolean;
        notify_on_back_in_stock: boolean;
        notify_on_any_stock_change: boolean;
        active: boolean;
        last_notified_at: string | null;
        created_at: string;
        updated_at: string;
        settings_user_id: string | null;
        email_notifications_enabled: boolean | null;
        push_notifications_enabled: boolean | null;
        price_drop_threshold_percent: number | null;
        timezone: string | null;
      }>(
        `SELECT 
          ti.id,
          ti.user_id,
          ti.variant_id,
          ti.target_price,
          ti.notify_on_price_drop,
          ti.notify_on_back_in_stock,
          ti.notify_on_any_stock_change,
          ti.active,
          ti.last_notified_at,
          ti.created_at,
          ti.updated_at,
          us.user_id AS settings_user_id,
          us.email_notifications_enabled,
          us.push_notifications_enabled,
          us.price_drop_threshold_percent,
          us.timezone
         FROM tracked_items ti
         LEFT JOIN user_settings us ON ti.user_id = us.user_id
         WHERE ti.variant_id = $1 AND ti.active = TRUE`,
        [variantId]
      ),
    ]);
  }

  if (variantResult.rows.length === 0) {
    throw new Error(`Variant ${variantId} not found`);
  }

  const variant = variantResult.rows[0];

  // Load product
  let productResult;
  if (client) {
    productResult = await client.query<Product>(
      `SELECT * FROM products WHERE id = $1`,
      [Number(variant.product_id)]
    );
  } else {
    productResult = await query<Product>(
      `SELECT * FROM products WHERE id = $1`,
      [Number(variant.product_id)]
    );
  }

  if (productResult.rows.length === 0) {
    throw new Error(`Product ${variant.product_id} not found`);
  }

  const product = productResult.rows[0];

  // Map tracked items with user settings
  const trackedItems = trackedItemsResult.rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    variant_id: row.variant_id,
    target_price: row.target_price,
    notify_on_price_drop: row.notify_on_price_drop,
    notify_on_back_in_stock: row.notify_on_back_in_stock,
    notify_on_any_stock_change: row.notify_on_any_stock_change,
    active: row.active,
    last_notified_at: row.last_notified_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_settings: row.settings_user_id
      ? {
          user_id: row.settings_user_id,
          email_notifications_enabled: row.email_notifications_enabled ?? true,
          push_notifications_enabled: row.push_notifications_enabled ?? false,
          price_drop_threshold_percent: row.price_drop_threshold_percent ?? 5.0,
          timezone: row.timezone,
          quiet_hours: null,
          created_at: '',
          updated_at: '',
        }
      : null,
  }));

  return {
    product,
    variant: {
      id: variant.id,
      product_id: variant.product_id,
      name: variant.name,
      sku: variant.sku,
      upc: variant.upc,
      attributes: variant.attributes,
      created_at: new Date().toISOString(), // Placeholder - not used in tracking
      updated_at: new Date().toISOString(), // Placeholder - not used in tracking
    },
    price: priceResult.rows[0] || null,
    stock: stockResult.rows[0] || null,
    trackedItems,
  };
}

/**
 * Fetch fresh variant data from product page
 */
async function fetchVariantData(
  productUrl: string,
  variant: ProductVariant
): Promise<FetchedVariantData> {
  // Fetch product page
  const fetchResult = await fetchProductPage(productUrl);
  if (!fetchResult.success) {
    throw new Error(`Failed to fetch product page: ${fetchResult.error}`);
  }

  // Load DOM and extract JSON
  const html = fetchResult.renderedHTML || fetchResult.rawHTML;
  if (!html) {
    throw new Error("No HTML content in fetch result");
  }

  const $ = loadDom(html);
  const jsonBlobs = extractEmbeddedJson(html);

  // Extract product shell to get variant data
  const productShell = await extractProductShell(fetchResult);

  // Find matching variant in extracted data
  // VariantShell uses array of VariantAttribute objects, so we match by converting
  // database attributes (JSONB) to VariantAttribute array format
  let extractedVariant = null;
  if (variant.attributes) {
    // Convert database attributes (Record) to VariantAttribute array for matching
    const dbAttributes = Object.entries(variant.attributes).map(([name, value]) => ({
      name,
      value: String(value),
    }));
    
    // Try to match by attributes
    extractedVariant = productShell.variants.find((v) => {
      if (!v.attributes || v.attributes.length === 0) return false;
      
      // Check if all database attributes match extracted variant attributes
      for (const dbAttr of dbAttributes) {
        const match = v.attributes.find(
          (attr) => attr.name === dbAttr.name && attr.value === dbAttr.value
        );
        if (!match) return false;
      }
      return true;
    });
  }
  // If still no match, use first variant (fallback)
  if (!extractedVariant && productShell.variants.length > 0) {
    extractedVariant = productShell.variants[0];
  }

  // Extract price and stock
  const priceContext = {
    $,
    html,
    jsonBlobs,
    finalURL: fetchResult.finalURL || productUrl,
  };

  const stockContext = {
    $,
    html,
    jsonBlobs,
    finalURL: fetchResult.finalURL || productUrl,
  };

  const priceResult = extractPrice(priceContext);
  const stockResult = extractStock(stockContext);

  // Build stock metadata for persistence (sanitized, no secrets)
  // IMPORTANT: If stock data exists, stockMetadata MUST be populated to keep denormalized fields consistent
  let stockMetadata = null;
  if (stockResult.stock) {
    // SECURITY: Sanitize evidence to prevent secrets/PII leakage
    // Filter out any notes that might contain sensitive information
    const sensitivePatterns = /token|auth|cookie|password|bearer|api[_-]?key|secret|credential|session/i;
    const rawEvidence = stockResult.notes || [];
    const evidence = rawEvidence.filter((note) => !sensitivePatterns.test(note));
    
    // Extract strategy name from the structured field added in fix #6
    // If not available, fall back to parsing from notes (legacy) or 'unknown'
    const strategyName = stockResult.strategyName 
      || stockResult.notes?.find((n) => n.includes('extracted using'))?.match(/extracted using (.+)$/)?.[1] 
      || 'unknown';
    
    // Build reason code from metadata source field
    // CONTRACT: reason_code format is "{source}_detection" where source comes from strategy metadata
    // Frontend mapping must handle all possible values (see stockReasonMapping.ts)
    const reasonCode = stockResult.stock.metadata?.source
      ? `${stockResult.stock.metadata.source}_detection`
      : `${strategyName}_detection`; // Fallback: use strategy name if no source
    
    // Calculate confidence score (0-100) if available
    // FALLBACK: If no score provided, use 50 as neutral confidence rather than null
    // This ensures denormalized last_confidence is never null when we have stock data
    const rawScore = stockResult.stock.metadata?.score;
    const confidence = rawScore !== undefined && rawScore !== null
      ? Math.min(100, Math.max(0, Number(rawScore)))
      : 50; // Default confidence when strategy doesn't provide score
    
    // Sanitize raw metadata - remove HTML, cookies, PII
    const rawMetadata = stockResult.stock.metadata
      ? {
          source: stockResult.stock.metadata.source,
          score: stockResult.stock.metadata.score,
          candidatesCount: stockResult.stock.metadata.candidatesCount,
          hasActivePurchaseCTA: stockResult.stock.metadata.hasActivePurchaseCTA,
          elementsFound: stockResult.stock.metadata.elementsFound,
          // DO NOT include: HTML, cookies, tokens, PII, full page content
        }
      : null;
    
    stockMetadata = {
      strategyName,
      confidence,
      reasonCode,
      evidence,
      rawMetadata,
    };
  }

  return {
    price: priceResult.price?.amount
      ? {
          value: priceResult.price.amount,
          currency: priceResult.price.currency || 'USD',
        }
      : null,
    stock: stockResult.stock
      ? {
          status: mapToStockStatusType(stockResult.stock.status),
          quantity: stockResult.stock.metadata?.count || null,
        }
      : null,
    stockMetadata,
  };
}

/**
 * Upsert variant price
 */
async function upsertVariantPrice(
  variantId: number,
  newPrice: number,
  currency: string,
  client: PoolClient
): Promise<void> {
  const now = new Date().toISOString();

  await client.query(
    `INSERT INTO variant_prices (
      variant_id,
      current_price,
      previous_price,
      currency,
      last_seen_at,
      first_seen_at
    )
    VALUES ($1, $2, NULL, $3, $4, $4)
    ON CONFLICT (variant_id) DO UPDATE SET
      previous_price = variant_prices.current_price,
      current_price = EXCLUDED.current_price,
      currency = EXCLUDED.currency,
      last_seen_at = EXCLUDED.last_seen_at,
      discount_percent = CASE
        WHEN variant_prices.current_price > 0 AND EXCLUDED.current_price < variant_prices.current_price
        THEN ((variant_prices.current_price - EXCLUDED.current_price) / variant_prices.current_price * 100)
        ELSE NULL
      END`,
    [variantId, newPrice, currency, now]
  );
}

/**
 * Upsert variant stock
 */
async function upsertVariantStock(
  variantId: number,
  stockStatus: StockStatusType,
  quantity: number | null,
  client: PoolClient
): Promise<void> {
  const now = new Date().toISOString();

  await client.query(
    `INSERT INTO variant_stock (
      variant_id,
      stock_status,
      quantity_available,
      last_seen_at,
      first_seen_at
    )
    VALUES ($1, $2, $3, $4, $4)
    ON CONFLICT (variant_id) DO UPDATE SET
      stock_status = EXCLUDED.stock_status,
      quantity_available = EXCLUDED.quantity_available,
      last_seen_at = EXCLUDED.last_seen_at`,
    [variantId, stockStatus, quantity, now]
  );
}

/**
 * Update tracked item last checked timestamp
 * Note: Schema doesn't have next_check_at, so we use a placeholder approach
 */
async function updateTrackedItemChecked(
  trackedItemId: bigint,
  client: PoolClient
): Promise<void> {
  // Since schema doesn't have next_check_at, we'll update updated_at
  // In a future migration, we can add next_check_at and set it here
  await client.query(
    `UPDATE tracked_items SET updated_at = now() WHERE id = $1`,
    [trackedItemId]
  );
}

/**
 * Create notification
 */
async function createNotification(
  userId: string,
  trackedItemId: bigint,
  variantId: number,
  type: NotificationType,
  title: string,
  body: string,
  metadata: Record<string, unknown> | null,
  client: PoolClient
): Promise<void> {
  await client.query(
    `INSERT INTO notifications (
      user_id,
      tracked_item_id,
      variant_id,
      type,
      title,
      body,
      created_at,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, now(), $7)`,
    [userId, trackedItemId, variantId, type, title, body, metadata ? JSON.stringify(metadata) : null]
  );
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get variants that need tracking
 * 
 * Returns variant IDs that should be checked now based on:
 * - tracked_items.active = true
 * - Variants that haven't been checked recently (last 30 minutes)
 * - Or variants without price/stock records
 * 
 * Note: Schema doesn't have next_check_at or paused fields, so we use
 * a time-based approach checking last_seen_at from variant_prices/variant_stock
 */
export async function getVariantsNeedingTracking(limit?: number): Promise<number[]> {
  try {
    const limitClause = limit ? `LIMIT ${limit}` : '';
    
    const result = await query<{ variant_id: number }>(
      `SELECT DISTINCT ti.variant_id
       FROM tracked_items ti
       LEFT JOIN variant_prices vp ON ti.variant_id = vp.variant_id
       LEFT JOIN variant_stock vs ON ti.variant_id = vs.variant_id
       WHERE ti.active = TRUE
         AND (
           vp.variant_id IS NULL
           OR vs.variant_id IS NULL
           OR vp.last_seen_at < now() - INTERVAL '30 minutes'
           OR vs.last_seen_at < now() - INTERVAL '30 minutes'
         )
       ORDER BY 
         COALESCE(LEAST(vp.last_seen_at, vs.last_seen_at), '1970-01-01'::timestamptz) ASC,
         ti.variant_id ASC
       ${limitClause}`
    );

    return result.rows.map((row) => Number(row.variant_id));
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to get variants needing tracking"
    );
    throw error;
  }
}

/**
 * Track a single variant
 * 
 * Flow:
 * 1. Load current state from DB
 * 2. Fetch fresh product data
 * 3. Compare old vs new
 * 4. Update DB in transaction
 * 5. Generate notifications
 */
export async function trackVariant(variantId: number): Promise<TrackVariantResult> {
  const startTime = Date.now();

  try {
    // Load current state
    const currentState = await loadCurrentState(variantId);

    // Fetch fresh data
    const fetchedData = await fetchVariantData(currentState.product.url, currentState.variant);

    // Detect changes
    const priceChange: PriceChange | null = fetchedData.price
      ? {
          oldPrice: currentState.price?.current_price ?? null,
          newPrice: fetchedData.price.value,
          percentChange:
            currentState.price?.current_price && fetchedData.price.value
              ? calculatePercentChange(
                  currentState.price.current_price,
                  fetchedData.price.value
                )
              : null,
        }
      : null;

    const stockChange: StockChange | null = fetchedData.stock
      ? {
          oldStatus: currentState.stock?.stock_status ?? null,
          newStatus: fetchedData.stock.status,
          wentInStock:
            (currentState.stock?.stock_status === 'out_of_stock' ||
              currentState.stock?.stock_status === 'unknown' ||
              currentState.stock?.stock_status === null) &&
            fetchedData.stock.status === 'in_stock',
          wentOutOfStock:
            currentState.stock?.stock_status === 'in_stock' &&
            fetchedData.stock.status === 'out_of_stock',
        }
      : null;

    // Update database and create notifications in transaction
    let notificationsCreated = 0;
    let updatedTrackedItems = 0;

    await withTransaction(async (client) => {
      // Upsert price
      if (fetchedData.price) {
        await upsertVariantPrice(
          variantId,
          fetchedData.price.value,
          fetchedData.price.currency,
          client
        );
      }

      // Upsert stock
      if (fetchedData.stock) {
        await upsertVariantStock(
          variantId,
          fetchedData.stock.status,
          fetchedData.stock.quantity,
          client
        );
      }

      // Update tracked items and create notifications
      for (const trackedItem of currentState.trackedItems) {
        // Persist stock check metadata
        if (fetchedData.stockMetadata) {
          await client.query(
            `INSERT INTO stock_checks (
              tracked_item_id,
              availability,
              confidence,
              strategy_name,
              reason_code,
              evidence,
              raw_metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              trackedItem.id,
              fetchedData.stock?.status || 'unknown',
              fetchedData.stockMetadata.confidence,
              fetchedData.stockMetadata.strategyName,
              fetchedData.stockMetadata.reasonCode,
              fetchedData.stockMetadata.evidence,
              fetchedData.stockMetadata.rawMetadata
                ? JSON.stringify(fetchedData.stockMetadata.rawMetadata)
                : null,
            ]
          );
        }

        // Update tracked_items with denormalized latest check data
        await client.query(
          `UPDATE tracked_items SET
            updated_at = now(),
            last_checked_at = now(),
            last_availability = $2,
            last_confidence = $3,
            last_strategy_name = $4,
            last_reason_code = $5
          WHERE id = $1`,
          [
            trackedItem.id,
            fetchedData.stock?.status || null,
            fetchedData.stockMetadata?.confidence || null,
            fetchedData.stockMetadata?.strategyName || null,
            fetchedData.stockMetadata?.reasonCode || null,
          ]
        );
        updatedTrackedItems++;

        // Check for notifications
        const userSettings = trackedItem.user_settings;

        // Price drop notification
        if (priceChange && shouldNotifyPriceDrop(priceChange, trackedItem, userSettings)) {
          const title = 'Price Drop Detected';
          const body = `Price dropped from $${priceChange.oldPrice?.toFixed(2)} to $${priceChange.newPrice?.toFixed(2)} (${priceChange.percentChange?.toFixed(1)}% decrease)`;
          const metadata = {
            price_before: priceChange.oldPrice,
            price_after: priceChange.newPrice,
            percent_change: priceChange.percentChange,
          };

          await createNotification(
            trackedItem.user_id,
            trackedItem.id,
            variantId,
            'price_drop',
            title,
            body,
            metadata,
            client
          );
          notificationsCreated++;
        }

        // Back in stock notification
        if (stockChange && shouldNotifyBackInStock(stockChange, trackedItem)) {
          const title = 'Back In Stock';
          const body = `Product is now back in stock!`;
          const metadata = {
            stock_before: stockChange.oldStatus,
            stock_after: stockChange.newStatus,
          };

          await createNotification(
            trackedItem.user_id,
            trackedItem.id,
            variantId,
            'back_in_stock',
            title,
            body,
            metadata,
            client
          );
          notificationsCreated++;
          
          // Send Telegram alert for back-in-stock events
          await sendTelegramRestockAlert(
            currentState.product.name || 'Unknown Product',
            currentState.product.url,
            fetchedData.stockMetadata?.confidence || 50,
            trackedItem
          );
        }

        // Stock change notification
        if (stockChange && shouldNotifyStockChange(stockChange, trackedItem)) {
          const title = 'Stock Status Changed';
          const body = `Stock status changed from ${stockChange.oldStatus} to ${stockChange.newStatus}`;
          const metadata = {
            stock_before: stockChange.oldStatus,
            stock_after: stockChange.newStatus,
          };

          await createNotification(
            trackedItem.user_id,
            trackedItem.id,
            variantId,
            'stock_change',
            title,
            body,
            metadata,
            client
          );
          notificationsCreated++;
        }

        // Threshold met notification
        if (
          fetchedData.price &&
          shouldNotifyThresholdMet(fetchedData.price.value, trackedItem)
        ) {
          const title = 'Target Price Reached';
          const body = `Price has reached your target of $${trackedItem.target_price?.toFixed(2)}. Current price: $${fetchedData.price.value.toFixed(2)}`;
          const metadata = {
            target_price: trackedItem.target_price,
            current_price: fetchedData.price.value,
          };

          await createNotification(
            trackedItem.user_id,
            trackedItem.id,
            variantId,
            'threshold_met',
            title,
            body,
            metadata,
            client
          );
          notificationsCreated++;
        }
      }
    });

    const duration = Date.now() - startTime;
    logger.info(
      {
        variantId,
        priceChange: priceChange ? { old: priceChange.oldPrice, new: priceChange.newPrice } : null,
        stockChange: stockChange ? { old: stockChange.oldStatus, new: stockChange.newStatus } : null,
        notificationsCreated,
        updatedTrackedItems,
        duration: `${duration}ms`,
      },
      "Variant tracking completed"
    );

    return {
      variantId,
      priceChange: priceChange || undefined,
      stockChange: stockChange || undefined,
      notificationsCreated,
      updatedTrackedItems,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      {
        variantId,
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
      },
      "Failed to track variant"
    );
    throw error;
  }
}

/**
 * Track multiple variants with concurrency control
 */
export async function trackVariants(
  variantIds: number[],
  concurrency: number = 5
): Promise<TrackVariantsResult> {
  const results: Array<{ variantId: number; ok: boolean; error?: string }> = [];
  let succeeded = 0;
  let failed = 0;

  // Process variants in batches
  for (let i = 0; i < variantIds.length; i += concurrency) {
    const batch = variantIds.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map((variantId) => trackVariant(variantId))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const variantId = batch[j];

      if (result.status === 'fulfilled') {
        results.push({ variantId, ok: true });
        succeeded++;
      } else {
        const error = result.reason instanceof Error ? result.reason.message : String(result.reason);
        results.push({ variantId, ok: false, error });
        failed++;
        logger.warn(
          { variantId, error },
          "Failed to track variant in batch"
        );
      }
    }
  }

  return {
    total: variantIds.length,
    succeeded,
    failed,
    results,
  };
}
