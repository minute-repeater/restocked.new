import { db, users, products, trackedItems, stockChecks, notifications, sql, eq } from '@covet/db';

// ── Overview Stats ──────────────────────────────────────────────────

export async function getOverviewStats() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [counts] = await db
    .select({
      totalUsers: sql<number>`count(distinct ${users.id})::int`,
    })
    .from(users);

  const [productCounts] = await db
    .select({
      totalProducts: sql<number>`count(*)::int`,
    })
    .from(products);

  const [trackerCounts] = await db
    .select({
      activeTrackers: sql<number>`count(*) filter (where ${trackedItems.isActive} = true)::int`,
      totalTrackers: sql<number>`count(*)::int`,
    })
    .from(trackedItems);

  const [signups7d] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`${users.createdAt} >= ${sevenDaysAgo}`);

  const [signups30d] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`${users.createdAt} >= ${thirtyDaysAgo}`);

  const planDistribution = await db
    .select({
      plan: users.plan,
      count: sql<number>`count(*)::int`,
    })
    .from(users)
    .groupBy(users.plan);

  const [checks24h] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stockChecks)
    .where(sql`${stockChecks.checkedAt} >= ${oneDayAgo}`);

  const notificationStats = await db
    .select({
      status: notifications.status,
      count: sql<number>`count(*)::int`,
    })
    .from(notifications)
    .where(sql`${notifications.createdAt} >= ${sevenDaysAgo}`)
    .groupBy(notifications.status);

  return {
    totalUsers: counts.totalUsers,
    totalProducts: productCounts.totalProducts,
    activeTrackers: trackerCounts.activeTrackers,
    totalTrackers: trackerCounts.totalTrackers,
    signups7d: signups7d.count,
    signups30d: signups30d.count,
    planDistribution: Object.fromEntries(planDistribution.map(r => [r.plan, r.count])),
    stockChecks24h: checks24h.count,
    notifications7d: Object.fromEntries(notificationStats.map(r => [r.status, r.count])),
  };
}

// ── Users List ──────────────────────────────────────────────────────

export async function getUsers(search?: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const baseWhere = search
    ? sql`${users.email} ILIKE ${'%' + search + '%'}`
    : sql`1=1`;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(baseWhere);

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      plan: users.plan,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
      trackedCount: sql<number>`(
        select count(*)::int from tracked_items
        where tracked_items.user_id = ${users.id} and tracked_items.is_active = true
      )`,
    })
    .from(users)
    .where(baseWhere)
    .orderBy(sql`${users.createdAt} desc`)
    .limit(limit)
    .offset(offset);

  return { users: rows, total, page, limit };
}

// ── Top Products ────────────────────────────────────────────────────

export async function getTopProducts(page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(products);

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      url: products.url,
      retailer: products.retailer,
      imageUrl: products.imageUrl,
      trackerCount: sql<number>`(
        select count(*)::int from tracked_items
        where tracked_items.product_id = ${products.id} and tracked_items.is_active = true
      )`,
      lastCheckedAt: sql<string | null>`(
        select max(checked_at)::text from stock_checks
        where stock_checks.product_id = ${products.id}
      )`,
    })
    .from(products)
    .orderBy(sql`(
      select count(*) from tracked_items
      where tracked_items.product_id = ${products.id} and tracked_items.is_active = true
    ) desc`)
    .limit(limit)
    .offset(offset);

  return { products: rows, total, page, limit };
}

// ── System Health ───────────────────────────────────────────────────

export async function getSystemHealth() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Stock checks by retailer (last 24h)
  const retailerHealth = await db
    .select({
      retailer: products.retailer,
      checkCount: sql<number>`count(${stockChecks.id})::int`,
      lastCheck: sql<string | null>`max(${stockChecks.checkedAt})::text`,
    })
    .from(stockChecks)
    .innerJoin(products, eq(stockChecks.productId, products.id))
    .where(sql`${stockChecks.checkedAt} >= ${oneDayAgo}`)
    .groupBy(products.retailer)
    .orderBy(sql`count(${stockChecks.id}) desc`);

  // Notification delivery by type and status
  const notificationDelivery = await db
    .select({
      type: notifications.type,
      status: notifications.status,
      count: sql<number>`count(*)::int`,
    })
    .from(notifications)
    .where(sql`${notifications.createdAt} >= ${oneDayAgo}`)
    .groupBy(notifications.type, notifications.status);

  // Recent failed notifications
  const recentFailures = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      errorMessage: notifications.errorMessage,
      createdAt: notifications.createdAt,
      userEmail: users.email,
    })
    .from(notifications)
    .innerJoin(users, eq(notifications.userId, users.id))
    .where(eq(notifications.status, 'failed'))
    .orderBy(sql`${notifications.createdAt} desc`)
    .limit(20);

  return {
    retailerHealth,
    notificationDelivery,
    recentFailures,
  };
}
