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
} from '@covet/db';
import { extractProductData, closeBrowser } from '@covet/scraper';
import { getPlanLimits, type NotificationPayload, type NotificationType } from '@covet/shared';
import { createLogger } from '@covet/shared/logger';
import { sendEmailNotification } from '../notifications/email.js';

const log = createLogger('worker:stockChecker');

const SCRAPE_RETRY_DELAY_MS = 5000;
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * In-memory consecutive failure counter per product.
 * Resets on successful scrape or worker restart (acceptable for beta).
 */
const consecutiveFailures = new Map<string, number>();

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

  if (results.length === 0) return [];

  // Batch-fetch latest stock checks for all products in a single query
  // Uses DISTINCT ON to get the most recent check per product+variant
  const productIds = [...new Set(results.map(r => r.productId))];
  const latestChecks = await db.execute<{
    product_id: string;
    variant_id: string | null;
    in_stock: boolean;
    price: number | null;
    checked_at: Date;
  }>(sql`
    SELECT DISTINCT ON (product_id, variant_id)
      product_id, variant_id, in_stock, price, checked_at
    FROM stock_checks
    WHERE product_id IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})
    ORDER BY product_id, variant_id, checked_at DESC
  `);

  // Build lookup map: "productId:variantId" -> latest check
  const checkRows = [...latestChecks];
  const checkMap = new Map<string, (typeof checkRows)[0]>();
  for (const check of checkRows) {
    const key = `${check.product_id}:${check.variant_id ?? 'null'}`;
    checkMap.set(key, check);
  }

  // Filter by check interval using the batch-fetched data
  const toCheck: ProductToCheck[] = [];
  const now = Date.now();

  for (const row of results) {
    const limits = getPlanLimits(row.userPlan);
    const intervalMs = limits.checkIntervalMinutes * 60 * 1000;

    const checkKey = `${row.productId}:${row.variantId ?? 'null'}`;
    const lastCheck = checkMap.get(checkKey);

    // Check if enough time has passed since last check
    const lastCheckTime = lastCheck?.checked_at
      ? new Date(lastCheck.checked_at).getTime()
      : 0;

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
        lastInStock: lastCheck?.in_stock ?? null,
        lastPrice: lastCheck?.price ?? null,
      });
    }
  }

  return toCheck;
}

/**
 * Checks a single product and sends notifications if needed.
 * Retries once after a delay if the initial scrape fails.
 */
async function checkProduct(product: ProductToCheck): Promise<void> {
  log.info({ url: product.productUrl }, 'Checking product');

  const failureKey = `${product.productId}:${product.variantId ?? 'null'}`;

  try {
    // Attempt scrape with one retry
    const { data } = await scrapeWithRetry(product.productUrl);

    // Reset consecutive failure counter on success
    consecutiveFailures.delete(failureKey);

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
    // Track consecutive failures
    const failures = (consecutiveFailures.get(failureKey) ?? 0) + 1;
    consecutiveFailures.set(failureKey, failures);

    log.error(
      { err: error, url: product.productUrl, consecutiveFailures: failures },
      'Failed to check product'
    );

    // After MAX_CONSECUTIVE_FAILURES, deactivate tracking to stop wasting resources
    if (failures >= MAX_CONSECUTIVE_FAILURES) {
      log.warn(
        { productId: product.productId, trackedItemId: product.trackedItemId, failures },
        'Deactivating tracked item after repeated scrape failures'
      );

      await db
        .update(trackedItems)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(trackedItems.id, product.trackedItemId));

      consecutiveFailures.delete(failureKey);
    }
  }
}

/**
 * Attempts to scrape a product URL, retrying once after a delay on failure.
 */
async function scrapeWithRetry(url: string) {
  try {
    return await extractProductData(url);
  } catch (firstError) {
    log.warn({ err: firstError, url }, 'Scrape failed, retrying after delay');
    await sleep(SCRAPE_RETRY_DELAY_MS);
    return await extractProductData(url);
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

  // Send email if enabled (default to sending if no settings row exists)
  if (!settings || settings.emailEnabled === 'true') {
    const emailTo = settings?.emailAddress || product.userEmail;

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
