import {
  db,
  products,
  trackedItems,
  stockChecks,
  variants,
  notifications,
  users,
  eq,
  and,
  desc,
  isNull,
  sql,
} from '@covet/db';
import { normalizeProductUrl, extractRetailer, getPlanLimits } from '@covet/shared';
import type {
  TrackedItemWithDetails,
  ItemDetailResponse,
  StockCheckRecord,
  NotificationRecord,
  VariantInfo,
} from '@covet/shared';
import { extractProductData, closeBrowser } from '@covet/scraper';
import { AppError } from '../middleware/errorHandler.js';

const SCRAPER_TIMEOUT_MS = 15000;

export async function addTrackedItem(
  userId: string,
  url: string,
  targetPrice?: number,
  variantId?: string
) {
  // Check user's plan limits
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const limits = getPlanLimits(user.plan);

  // Count existing tracked items
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trackedItems)
    .where(and(eq(trackedItems.userId, userId), eq(trackedItems.isActive, true)));

  const currentCount = countResult[0]?.count ?? 0;

  if (currentCount >= limits.maxTrackedItems) {
    throw new AppError(
      403,
      `Plan limit reached. ${user.plan} plan allows ${limits.maxTrackedItems} tracked items.`
    );
  }

  // Normalize URL
  const normalizedUrl = normalizeProductUrl(url);

  // Check if product already exists
  let product = await db.query.products.findFirst({
    where: eq(products.normalizedUrl, normalizedUrl),
  });

  // If not, create it and fetch initial data
  if (!product) {
    try {
      // Wrap scraper with timeout to prevent hanging API requests
      const { data: extractedData } = await Promise.race([
        extractProductData(url),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Scraper timeout')), SCRAPER_TIMEOUT_MS)
        ),
      ]);

      [product] = await db
        .insert(products)
        .values({
          url,
          normalizedUrl,
          name: extractedData.name,
          imageUrl: extractedData.imageUrl,
          retailer: extractedData.retailer,
        })
        .returning();

      // Store initial stock check
      if (extractedData.inStock !== null) {
        await db.insert(stockChecks).values({
          productId: product.id,
          variantId: variantId || null,
          inStock: extractedData.inStock,
          price: extractedData.price,
          currency: extractedData.currency,
        });
      }
    } catch (error) {
      // If extraction fails or times out, still create the product with minimal data
      // Close browser to release resources on timeout
      await closeBrowser().catch(() => {});

      [product] = await db
        .insert(products)
        .values({
          url,
          normalizedUrl,
          retailer: extractRetailer(url),
        })
        .returning();
    }
  }

  // Check if user is already tracking this product+variant combo
  const existingTracked = await db.query.trackedItems.findFirst({
    where: and(
      eq(trackedItems.userId, userId),
      eq(trackedItems.productId, product.id),
      variantId ? eq(trackedItems.variantId, variantId) : isNull(trackedItems.variantId)
    ),
  });

  if (existingTracked) {
    // Reactivate if inactive, or return error if already active
    if (!existingTracked.isActive) {
      const [updated] = await db
        .update(trackedItems)
        .set({
          isActive: true,
          targetPrice: targetPrice ?? existingTracked.targetPrice,
          updatedAt: new Date(),
        })
        .where(eq(trackedItems.id, existingTracked.id))
        .returning();

      return updated;
    }

    throw new AppError(409, 'Already tracking this product');
  }

  // Create tracked item
  const [trackedItem] = await db
    .insert(trackedItems)
    .values({
      userId,
      productId: product.id,
      variantId: variantId || null,
      targetPrice: targetPrice || null,
    })
    .returning();

  return trackedItem;
}

export async function getTrackedItems(userId: string): Promise<TrackedItemWithDetails[]> {
  // Get all active tracked items with product data in a single query
  const items = await db
    .select({
      id: trackedItems.id,
      userId: trackedItems.userId,
      productId: trackedItems.productId,
      variantId: trackedItems.variantId,
      targetPrice: trackedItems.targetPrice,
      isActive: trackedItems.isActive,
      createdAt: trackedItems.createdAt,
      productDbId: products.id,
      productUrl: products.url,
      productName: products.name,
      productImageUrl: products.imageUrl,
      productRetailer: products.retailer,
    })
    .from(trackedItems)
    .innerJoin(products, eq(trackedItems.productId, products.id))
    .where(and(eq(trackedItems.userId, userId), eq(trackedItems.isActive, true)))
    .orderBy(desc(trackedItems.createdAt));

  if (items.length === 0) return [];

  // Batch-fetch latest stock checks using a lateral join approach
  // For each tracked item, get the latest stock check in one query
  const productIds = [...new Set(items.map(i => i.productId))];
  const latestChecks = await db
    .select({
      productId: stockChecks.productId,
      variantId: stockChecks.variantId,
      inStock: stockChecks.inStock,
      price: stockChecks.price,
      checkedAt: stockChecks.checkedAt,
    })
    .from(stockChecks)
    .where(
      sql`${stockChecks.productId} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})
        AND ${stockChecks.id} = (
          SELECT sc2.id FROM ${stockChecks} sc2
          WHERE sc2.product_id = ${stockChecks.productId}
            AND (sc2.variant_id IS NOT DISTINCT FROM ${stockChecks.variantId})
          ORDER BY sc2.checked_at DESC
          LIMIT 1
        )`
    );

  // Build a lookup map: "productId:variantId" -> latest check
  const checkMap = new Map<string, typeof latestChecks[0]>();
  for (const check of latestChecks) {
    const key = `${check.productId}:${check.variantId ?? 'null'}`;
    checkMap.set(key, check);
  }

  // Batch-fetch variants for items that have a variantId
  const variantIds = [...new Set(items.map(i => i.variantId).filter((id): id is string => id != null))];
  const variantMap = new Map<string, { id: string; name: string | null; sku: string | null }>();
  if (variantIds.length > 0) {
    const variantRows = await db
      .select({ id: variants.id, name: variants.name, sku: variants.sku })
      .from(variants)
      .where(sql`${variants.id} IN (${sql.join(variantIds.map(id => sql`${id}`), sql`, `)})`);
    for (const v of variantRows) {
      variantMap.set(v.id, v);
    }
  }

  return items.map(item => {
    const checkKey = `${item.productId}:${item.variantId ?? 'null'}`;
    const latestCheck = checkMap.get(checkKey);
    const variant = item.variantId ? variantMap.get(item.variantId) ?? null : null;

    return {
      id: item.id,
      userId: item.userId,
      targetPrice: item.targetPrice,
      isActive: item.isActive,
      createdAt: item.createdAt,
      product: {
        id: item.productDbId,
        url: item.productUrl,
        name: item.productName,
        imageUrl: item.productImageUrl,
        retailer: item.productRetailer,
      },
      variant: variant ? { id: variant.id, name: variant.name ?? 'Unknown' } : null,
      latestCheck: latestCheck
        ? {
            inStock: latestCheck.inStock,
            price: latestCheck.price,
            checkedAt: latestCheck.checkedAt,
          }
        : null,
    };
  });
}

export async function updateTrackedItem(
  userId: string,
  trackedItemId: string,
  updates: { targetPrice?: number | null; isActive?: boolean }
) {
  // Verify ownership
  const item = await db.query.trackedItems.findFirst({
    where: and(eq(trackedItems.id, trackedItemId), eq(trackedItems.userId, userId)),
  });

  if (!item) {
    throw new AppError(404, 'Tracked item not found');
  }

  const [updated] = await db
    .update(trackedItems)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(trackedItems.id, trackedItemId))
    .returning();

  return updated;
}

export async function deleteTrackedItem(userId: string, trackedItemId: string) {
  // Verify ownership
  const item = await db.query.trackedItems.findFirst({
    where: and(eq(trackedItems.id, trackedItemId), eq(trackedItems.userId, userId)),
  });

  if (!item) {
    throw new AppError(404, 'Tracked item not found');
  }

  // Soft delete by setting isActive to false
  await db
    .update(trackedItems)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(trackedItems.id, trackedItemId));
}

export async function getTrackedItemById(
  userId: string,
  trackedItemId: string
): Promise<ItemDetailResponse> {
  // Verify ownership
  const item = await db.query.trackedItems.findFirst({
    where: and(eq(trackedItems.id, trackedItemId), eq(trackedItems.userId, userId)),
  });

  if (!item) {
    throw new AppError(404, 'Tracked item not found');
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, item.productId),
  });

  if (!product) {
    throw new AppError(404, 'Product not found');
  }

  // Get latest stock check
  const [latestCheck] = await db
    .select()
    .from(stockChecks)
    .where(
      and(
        eq(stockChecks.productId, item.productId),
        item.variantId
          ? eq(stockChecks.variantId, item.variantId)
          : isNull(stockChecks.variantId)
      )
    )
    .orderBy(desc(stockChecks.checkedAt))
    .limit(1);

  // Get variant info if set
  let variantInfo: { id: string; name: string } | null = null;
  if (item.variantId) {
    const v = await db.query.variants.findFirst({
      where: eq(variants.id, item.variantId),
    });
    if (v) variantInfo = { id: v.id, name: v.name };
  }

  // Get all variants for this product
  const productVariants = await db
    .select({ id: variants.id, name: variants.name, sku: variants.sku })
    .from(variants)
    .where(eq(variants.productId, item.productId));

  // Get stock history (last 200 records)
  const stockHistory = await getStockHistory(userId, trackedItemId);

  // Get notification history
  const itemNotifications = await getItemNotifications(userId, trackedItemId);

  return {
    item: {
      id: item.id,
      userId: item.userId,
      targetPrice: item.targetPrice,
      isActive: item.isActive,
      createdAt: item.createdAt,
      product: {
        id: product.id,
        url: product.url,
        name: product.name,
        imageUrl: product.imageUrl,
        retailer: product.retailer,
      },
      variant: variantInfo,
      latestCheck: latestCheck
        ? {
            inStock: latestCheck.inStock,
            price: latestCheck.price,
            checkedAt: latestCheck.checkedAt,
          }
        : null,
    },
    variants: productVariants as VariantInfo[],
    stockHistory,
    notifications: itemNotifications,
  };
}

export async function getStockHistory(
  userId: string,
  trackedItemId: string
): Promise<StockCheckRecord[]> {
  const item = await db.query.trackedItems.findFirst({
    where: and(eq(trackedItems.id, trackedItemId), eq(trackedItems.userId, userId)),
  });

  if (!item) {
    throw new AppError(404, 'Tracked item not found');
  }

  const checks = await db
    .select({
      inStock: stockChecks.inStock,
      price: stockChecks.price,
      currency: stockChecks.currency,
      checkedAt: stockChecks.checkedAt,
    })
    .from(stockChecks)
    .where(
      and(
        eq(stockChecks.productId, item.productId),
        item.variantId
          ? eq(stockChecks.variantId, item.variantId)
          : isNull(stockChecks.variantId)
      )
    )
    .orderBy(desc(stockChecks.checkedAt))
    .limit(200);

  return checks;
}

export async function getItemNotifications(
  userId: string,
  trackedItemId: string
): Promise<NotificationRecord[]> {
  const item = await db.query.trackedItems.findFirst({
    where: and(eq(trackedItems.id, trackedItemId), eq(trackedItems.userId, userId)),
  });

  if (!item) {
    throw new AppError(404, 'Tracked item not found');
  }

  const records = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      status: notifications.status,
      sentAt: notifications.sentAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.trackedItemId, trackedItemId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return records;
}
