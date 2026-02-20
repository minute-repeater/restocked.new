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
} from '@restocked/db';
import { normalizeProductUrl, extractRetailer, getPlanLimits } from '@restocked/shared';
import type {
  TrackedItemWithDetails,
  ItemDetailResponse,
  StockCheckRecord,
  NotificationRecord,
  VariantInfo,
} from '@restocked/shared';
import { extractProductData } from '@restocked/scraper';
import { AppError } from '../middleware/errorHandler.js';

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
      const { data: extractedData } = await extractProductData(url);

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
      // If extraction fails, still create the product with minimal data
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
  // Get all active tracked items for user with product and latest check data
  const items = await db.query.trackedItems.findMany({
    where: and(eq(trackedItems.userId, userId), eq(trackedItems.isActive, true)),
    with: {
      // Note: We'll need to add relations to the schema for this to work
      // For now, we'll do separate queries
    },
    orderBy: desc(trackedItems.createdAt),
  });

  // Fetch product data and latest checks for each item
  const result: TrackedItemWithDetails[] = [];

  for (const item of items) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, item.productId),
    });

    if (!product) continue;

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

    result.push({
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
      variant: null, // TODO: fetch variant if variantId exists
      latestCheck: latestCheck
        ? {
            inStock: latestCheck.inStock,
            price: latestCheck.price,
            checkedAt: latestCheck.checkedAt,
          }
        : null,
    });
  }

  return result;
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
