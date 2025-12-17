import { Router, type Request, type Response } from "express";
import { TrackedItemsRepository } from "../../db/repositories/trackedItemsRepository.js";
import { ProductRepository } from "../../db/repositories/productRepository.js";
import { VariantRepository } from "../../db/repositories/variantRepository.js";
import { ProductIngestionService } from "../../services/productIngestionService.js";
import { trackVariant } from "../../services/trackingService.js";
import { logger } from "../utils/logger.js";
import { validateCreateTrackedItem } from "../utils/trackedItemsValidation.js";
import {
  invalidRequestError,
  internalError,
  productNotFoundError,
  variantNotFoundError,
  forbiddenError,
  notFoundError,
  formatError,
} from "../utils/errors.js";
import { postRateLimiter } from "../middleware/rateLimiting.js";
import { fetchProductPage } from "../../fetcher/index.js";
import { extractProductShell } from "../../extractor/index.js";
import { validateURL } from "../utils/urlValidation.js";
import { invalidURLError, fetchFailedError } from "../utils/errors.js";
import { hasReachedTrackedItemsLimit, checkPlanFeature, getUpgradeRequiredError } from "../utils/planLimits.js";

// Rate limit tracking for check-now endpoint (per tracked item)
// Key: `${userId}:${trackedItemId}`, Value: timestamp of last check request
const checkNowRateLimits = new Map<string, number>();
const CHECK_NOW_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown per item

const router = Router();

// Initialize repositories and service
const trackedItemsRepo = new TrackedItemsRepository();
const productRepo = new ProductRepository();
const variantRepo = new VariantRepository();
const ingestionService = new ProductIngestionService(productRepo, variantRepo);

/**
 * POST /me/tracked-items
 * Create a new tracked item for the authenticated user
 * Body: { product_id, variant_id?, url? }
 * Returns: { tracked_item: {...} }
 */
router.post(
  "/",
  postRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const userPlan = (req.user as any).plan || 'free';

      // Check if variant tracking is allowed for this plan
      const userPlanObj = { plan: userPlan as 'free' | 'pro' };
      if (req.body.variant_id && !checkPlanFeature(userPlanObj, 'variant_tracking')) {
        logger.info({ userId, feature: "variant tracking" }, "Free user attempted variant tracking");
        return res.status(403).json(getUpgradeRequiredError('variant tracking'));
      }

      // Check tracked items limit
      const currentItems = await trackedItemsRepo.getTrackedItemsByUser(userId);
      if (hasReachedTrackedItemsLimit(userPlanObj, currentItems.length)) {
        logger.info({ userId, currentItems: currentItems.length }, "Free user reached tracked items limit");
        return res.status(403).json({
          error: {
            code: "UPGRADE_REQUIRED",
            message: `You've reached the limit of ${currentItems.length} tracked items on the Free plan. Upgrade to Pro for unlimited tracking.`,
            currentCount: currentItems.length,
            maxAllowed: currentItems.length,
          },
        });
      }

      // Validate input
      const validation = validateCreateTrackedItem(req.body);
      if (!validation.valid) {
        return res.status(400).json(validation.error);
      }

      const { product_id, variant_id, url } = validation.data;

      let finalProductId = product_id;

      // If URL is provided, create/find the product first
      if (url) {
        // Validate URL
        const urlValidation = validateURL(url);
        if (!urlValidation.valid) {
          return res.status(400).json(urlValidation.error);
        }

        // Check if product already exists
        let existingProduct = await productRepo.findByURL(url);
        
        if (!existingProduct) {
          // Fetch and ingest the product
          const fetchResult = await fetchProductPage(url);
          if (!fetchResult.success) {
            return res.status(400).json(
              fetchFailedError(
                fetchResult.error || "Failed to fetch product page",
                { modeUsed: fetchResult.modeUsed }
              )
            );
          }

          const productShell = await extractProductShell(fetchResult);
          const result = await ingestionService.ingest(productShell);
          existingProduct = result.product;
        }

        finalProductId = existingProduct.id;

        // If variant_id was provided but doesn't match the product, validate it
        if (variant_id) {
          const variant = await variantRepo.getVariantById(variant_id);
          if (!variant || variant.product_id !== finalProductId) {
            return res.status(404).json(variantNotFoundError(variant_id));
          }
        }
      } else {
        // Validate product exists
        const product = await productRepo.getProductById(finalProductId);
        if (!product) {
          return res.status(404).json(productNotFoundError(finalProductId));
        }

        // Validate variant exists and belongs to product (if provided)
        if (variant_id) {
          const variant = await variantRepo.getVariantById(variant_id);
          if (!variant) {
            return res.status(404).json(variantNotFoundError(variant_id));
          }
          if (variant.product_id !== finalProductId) {
            return res.status(400).json(
              invalidRequestError("Variant does not belong to the specified product")
            );
          }
        }
      }

      // Create tracked item
      const trackedItem = await trackedItemsRepo.createTrackedItem({
        user_id: userId,
        product_id: finalProductId,
        variant_id: variant_id ?? null,
      });

      // Fetch the tracked item with relations
      const items = await trackedItemsRepo.getTrackedItemsByUser(userId);
      const createdItem = items.find((item) => item.id === trackedItem.id);

      if (!createdItem) {
        // Fallback: return basic tracked item if relations query fails
        res.status(201).json({
          tracked_item: {
            id: trackedItem.id,
            product_id: trackedItem.product_id,
            variant_id: trackedItem.variant_id,
            alias: trackedItem.alias,
            notifications_enabled: trackedItem.notifications_enabled,
            created_at: trackedItem.created_at,
            updated_at: trackedItem.updated_at,
          },
        });
        return;
      }

      res.status(201).json({
        tracked_item: createdItem,
      });
    } catch (error: any) {
      const userId = req.user!.id;
      logger.error({ error: error.message, userId, path: "/me/tracked-items" }, "Error in POST /me/tracked-items");
      
      // Handle unique constraint violation (duplicate tracking)
      if (error.code === "23505") {
        return res.status(409).json(
          invalidRequestError("This product/variant combination is already being tracked")
        );
      }

      const errorResponse = formatError(error);
      res.status(500).json(errorResponse);
    }
  }
);

/**
 * GET /me/tracked-items/list
 * Get paginated list of tracked items with full details + stock detection metadata
 * Query params: page, pageSize, search, stockFilter, sortBy
 * Returns: { items: [...], page, pageSize, total, hasMore }
 * 
 * Stock detection metadata is read from tracked_items.last_* columns (denormalized)
 * Evidence preview is fetched from the latest stock_checks row
 */
router.get("/list", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));
    const offset = (page - 1) * pageSize;
    const search = (req.query.search as string) || '';
    const stockFilter = (req.query.stockFilter as string) || 'all';
    const sortBy = (req.query.sortBy as string) || 'newest';

    const { query } = await import("../../db/client.js");

    // Build WHERE clause for filters
    const whereConditions: string[] = ['ti.user_id = $1', 'ti.active = TRUE'];
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    // Search filter
    if (search) {
      whereConditions.push(
        `(p.name ILIKE $${paramIndex} OR p.vendor ILIKE $${paramIndex} OR pv.sku ILIKE $${paramIndex} OR p.url ILIKE $${paramIndex})`
      );
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Stock filter - use tracked_items.last_availability as THE source of truth
    // PENDING STATE: Items with last_availability IS NULL are "pending first check"
    // - 'all' filter: includes pending items (no stock condition)
    // - 'in_stock' filter: excludes pending (only items explicitly in_stock)
    // - 'out_of_stock' filter: excludes pending (only items explicitly out_of_stock)
    // - 'pending' filter: only items that haven't been checked yet
    if (stockFilter === 'in_stock') {
      // Exclude pending items - only show items confirmed in_stock
      whereConditions.push(`ti.last_availability = 'in_stock'`);
    } else if (stockFilter === 'out_of_stock') {
      // Exclude pending items - only show items confirmed out_of_stock
      whereConditions.push(`ti.last_availability = 'out_of_stock'`);
    } else if (stockFilter === 'pending') {
      // Only show items that haven't been checked yet
      whereConditions.push(`ti.last_availability IS NULL`);
    } else if (stockFilter === 'price_drop') {
      whereConditions.push(`vp.current_price IS NOT NULL AND ti.target_price IS NOT NULL AND vp.current_price <= ti.target_price`);
    }
    // Note: 'all' filter has no stock condition, includes all items (pending + checked)

    const whereClause = whereConditions.join(' AND ');

    // Build ORDER BY clause
    let orderBy = 'ti.created_at DESC';
    if (sortBy === 'lowest_price') {
      orderBy = 'vp.current_price ASC NULLS LAST';
    } else if (sortBy === 'highest_price') {
      orderBy = 'vp.current_price DESC NULLS LAST';
    } else if (sortBy === 'last_checked') {
      orderBy = 'ti.last_checked_at DESC NULLS LAST';
    }

    // Get total count
    // Note: No variant_stock join needed - we use tracked_items.last_availability as source of truth
    const countResult = await query<{ count: string }>(
      `
      SELECT COUNT(*) as count
      FROM tracked_items ti
      INNER JOIN products p ON ti.product_id = p.id
      INNER JOIN product_variants pv ON ti.variant_id = pv.id
      LEFT JOIN variant_prices vp ON pv.id = vp.variant_id
      WHERE ${whereClause}
      `,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated items with all related data including stock detection metadata
    // Stock status comes ONLY from tracked_items.last_* columns (denormalized from stock_checks)
    // Items with last_availability IS NULL are in "pending" state - no fallback to variant_stock
    const itemsResult = await query<{
      tracked_item_id: string;
      variant_id: number;
      product_id: number;
      product_name: string | null;
      variant_name: string | null;
      current_price: number | null;
      currency: string | null;
      target_price: number | null;
      notify_price_drop: boolean;
      notify_back_in_stock: boolean;
      notify_stock_change: boolean;
      created_at: string;
      product_image_url: string | null;
      variant_sku: string | null;
      // Stock detection metadata from tracked_items.last_* columns
      last_availability: string | null;
      last_confidence: number | null;
      last_strategy_name: string | null;
      last_reason_code: string | null;
      last_checked_at: string | null;
    }>(
      `
      SELECT 
        ti.id::text as tracked_item_id,
        ti.variant_id,
        ti.product_id,
        p.name as product_name,
        pv.name as variant_name,
        vp.current_price,
        vp.currency,
        ti.target_price,
        ti.notify_on_price_drop as notify_price_drop,
        ti.notify_on_back_in_stock as notify_back_in_stock,
        ti.notify_on_any_stock_change as notify_stock_change,
        ti.created_at,
        COALESCE(p.image_url, p.main_image_url) as product_image_url,
        pv.sku as variant_sku,
        -- Stock detection metadata from denormalized columns
        ti.last_availability,
        ti.last_confidence,
        ti.last_strategy_name,
        ti.last_reason_code,
        ti.last_checked_at
      FROM tracked_items ti
      INNER JOIN products p ON ti.product_id = p.id
      INNER JOIN product_variants pv ON ti.variant_id = pv.id
      LEFT JOIN variant_prices vp ON pv.id = vp.variant_id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...queryParams, pageSize, offset]
    );

    // Get evidence preview for each tracked item from latest stock_checks row
    const trackedItemIds = itemsResult.rows.map((r) => r.tracked_item_id);
    let evidenceMap: Map<string, string[]> = new Map();
    
    if (trackedItemIds.length > 0) {
      const evidenceResult = await query<{
        tracked_item_id: string;
        evidence: string[] | null;
      }>(
        `
        SELECT DISTINCT ON (tracked_item_id)
          tracked_item_id::text,
          evidence
        FROM stock_checks
        WHERE tracked_item_id = ANY($1::bigint[])
        ORDER BY tracked_item_id, checked_at DESC
        `,
        [trackedItemIds]
      );
      
      for (const row of evidenceResult.rows) {
        // Take first 3 evidence strings as preview
        const preview = (row.evidence || []).slice(0, 3);
        evidenceMap.set(row.tracked_item_id, preview);
      }
    }

    const items = itemsResult.rows.map((row) => {
      // PENDING STATE: Items with last_availability IS NULL are "pending" first check
      // This is a first-class state - no fallback to variant_stock
      const isPending = row.last_availability === null;
      const stockStatus = isPending ? 'pending' : row.last_availability;
      
      return {
        tracked_item_id: row.tracked_item_id,
        variant_id: row.variant_id,
        product_id: row.product_id,
        product_name: row.product_name,
        variant_name: row.variant_name,
        current_price: row.current_price ? Number(row.current_price) : null,
        currency: row.currency || 'USD',
        // Stock status: 'pending' for new items, actual status once checked
        stock_status: stockStatus as 'in_stock' | 'out_of_stock' | 'low_stock' | 'preorder' | 'unknown' | 'pending',
        target_price: row.target_price ? Number(row.target_price) : null,
        notify_price_drop: row.notify_price_drop,
        notify_back_in_stock: row.notify_back_in_stock,
        notify_stock_change: row.notify_stock_change,
        last_checked_at: row.last_checked_at,
        created_at: row.created_at,
        product_image_url: row.product_image_url,
        variant_sku: row.variant_sku,
        // Stock detection metadata
        // For pending items, reason_code is 'pending_first_check' and other fields are null
        detection: {
          confidence: row.last_confidence ? Number(row.last_confidence) : null,
          strategy_name: row.last_strategy_name,
          reason_code: isPending ? 'pending_first_check' : row.last_reason_code,
          evidence_preview: evidenceMap.get(row.tracked_item_id) || [],
        },
      };
    });

    res.json({
      items,
      page,
      pageSize,
      total,
      hasMore: offset + items.length < total,
    });
  } catch (error: any) {
    const userId = req.user!.id;
    logger.error({ error: error.message, userId, path: "/me/tracked-items/list" }, "Error in GET /me/tracked-items/list");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /me/tracked-items/:id/stock-checks
 * Get stock check history for a tracked item
 * Query params: limit (default 20, max 100)
 * Returns: { checks: [...], total }
 */
router.get("/:id/stock-checks", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const trackedItemId = req.params.id;
    
    // Validate id parameter
    if (!trackedItemId || !/^\d+$/.test(trackedItemId)) {
      return res.status(400).json(invalidRequestError("Invalid tracked item ID"));
    }
    
    // Validate limit parameter
    const limitParam = req.query.limit as string;
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20));

    const { query } = await import("../../db/client.js");

    // Verify the tracked item belongs to this user
    const ownershipResult = await query<{ id: string }>(
      `SELECT id::text FROM tracked_items WHERE id = $1 AND user_id = $2 AND active = TRUE`,
      [trackedItemId, userId]
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json(notFoundError("Tracked item not found"));
    }

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM stock_checks WHERE tracked_item_id = $1`,
      [trackedItemId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get stock checks history
    const checksResult = await query<{
      id: string;
      checked_at: string;
      availability: string;
      confidence: number | null;
      strategy_name: string;
      reason_code: string | null;
      evidence: string[] | null;
    }>(
      `
      SELECT 
        id::text,
        checked_at,
        availability::text,
        confidence,
        strategy_name,
        reason_code,
        evidence
      FROM stock_checks
      WHERE tracked_item_id = $1
      ORDER BY checked_at DESC
      LIMIT $2
      `,
      [trackedItemId, limit]
    );

    const checks = checksResult.rows.map((row) => ({
      id: row.id,
      checked_at: row.checked_at,
      availability: row.availability as 'in_stock' | 'out_of_stock' | 'low_stock' | 'preorder' | 'unknown',
      confidence: row.confidence ? Number(row.confidence) : null,
      strategy_name: row.strategy_name,
      reason_code: row.reason_code,
      evidence: row.evidence || [],
    }));

    res.json({
      checks,
      total,
    });
  } catch (error: any) {
    const userId = req.user!.id;
    logger.error({ error: error.message, userId, path: `/me/tracked-items/${req.params.id}/stock-checks` }, "Error in GET /me/tracked-items/:id/stock-checks");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * POST /me/tracked-items/:id/check-now
 * Trigger an immediate stock check for a tracked item
 * Rate limited: 1 request per minute per item
 * Returns: 202 { queued: true, message: string }
 */
router.post("/:id/check-now", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const trackedItemId = req.params.id;
    
    // Validate id parameter
    if (!trackedItemId || !/^\d+$/.test(trackedItemId)) {
      return res.status(400).json(invalidRequestError("Invalid tracked item ID"));
    }

    const { query } = await import("../../db/client.js");

    // Verify the tracked item belongs to this user and get variant_id
    const ownershipResult = await query<{ id: string; variant_id: number }>(
      `SELECT id::text, variant_id FROM tracked_items WHERE id = $1 AND user_id = $2 AND active = TRUE`,
      [trackedItemId, userId]
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json(notFoundError("Tracked item not found"));
    }

    const variantId = ownershipResult.rows[0].variant_id;

    // Rate limit check: 1 request per minute per item
    const rateLimitKey = `${userId}:${trackedItemId}`;
    const lastCheck = checkNowRateLimits.get(rateLimitKey);
    const now = Date.now();
    
    if (lastCheck && (now - lastCheck) < CHECK_NOW_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((CHECK_NOW_COOLDOWN_MS - (now - lastCheck)) / 1000);
      return res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: `Please wait ${remainingSeconds} seconds before checking this item again`,
          retryAfter: remainingSeconds,
        },
      });
    }

    // Update rate limit timestamp
    checkNowRateLimits.set(rateLimitKey, now);
    
    // Clean up old entries periodically (every 100 requests)
    if (checkNowRateLimits.size > 1000) {
      const cutoff = now - CHECK_NOW_COOLDOWN_MS * 2;
      for (const [key, timestamp] of checkNowRateLimits.entries()) {
        if (timestamp < cutoff) {
          checkNowRateLimits.delete(key);
        }
      }
    }

    logger.info({ userId, trackedItemId, variantId }, "Manual stock check requested");

    // Trigger the stock check asynchronously (fire-and-forget)
    // The result will update tracked_items.last_* fields and stock_checks table
    trackVariant(variantId).catch((error) => {
      logger.error(
        { error: error.message, userId, trackedItemId, variantId },
        "Manual stock check failed"
      );
    });

    // Return 202 Accepted immediately - check runs in background
    res.status(202).json({
      queued: true,
      message: "Stock check started. Results will be available shortly.",
    });
  } catch (error: any) {
    const userId = req.user!.id;
    logger.error({ error: error.message, userId, path: `/me/tracked-items/${req.params.id}/check-now` }, "Error in POST /me/tracked-items/:id/check-now");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /me/tracked-items
 * Get all tracked items for the authenticated user
 * Returns: { items: [...] }
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // Set by requireAuth middleware

    const items = await trackedItemsRepo.getTrackedItemsByUser(userId);

    res.json({
      items,
    });
  } catch (error: any) {
    const userId = req.user!.id;
    logger.error({ error: error.message, userId, path: "/me/tracked-items" }, "Error in GET /me/tracked-items");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /me/tracked-items/:variantId/history
 * Get tracking history for a variant (last 30 days)
 * Returns: { priceHistory: [...], stockHistory: [...], notifications: [...] }
 */
router.get("/:variantId/history", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const variantId = parseInt(req.params.variantId, 10);

    if (isNaN(variantId)) {
      return res.status(400).json(
        invalidRequestError("Variant ID must be a number", { variantId: req.params.variantId })
      );
    }

    // Verify user is tracking this variant
    const trackedItems = await trackedItemsRepo.getTrackedItemsByUser(userId);
    const isTrackingVariant = trackedItems.some(
      (item) => item.variant_id === variantId || (item.variant_id === null && item.product_id)
    );

    if (!isTrackingVariant) {
      return res.status(403).json(
        forbiddenError("You must be tracking this variant to view its history")
      );
    }

    // Get history from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Query price history from variant_price_history table (if exists)
    // Fallback to notifications with price_drop type
    const { query } = await import("../../db/client.js");

    // Try to get price history from variant_price_history
    let priceHistory: any[] = [];
    try {
      const priceHistoryResult = await query<{
        id: number;
        variant_id: number;
        recorded_at: string;
        price: number;
        currency: string;
        raw: string | null;
        metadata: any;
      }>(
        `
        SELECT id, variant_id, recorded_at, price, currency, raw, metadata
        FROM variant_price_history
        WHERE variant_id = $1 AND recorded_at >= $2
        ORDER BY recorded_at DESC
        LIMIT 100
        `,
        [variantId, thirtyDaysAgo.toISOString()]
      );
      priceHistory = priceHistoryResult.rows.map((row) => ({
        timestamp: row.recorded_at,
        price: Number(row.price),
        currency: row.currency,
        source: row.metadata?.source || 'tracking',
        old_value: null,
        new_value: Number(row.price),
      }));
    } catch (error: any) {
      // Table might not exist, fall back to notifications
      logger.debug({ error: error.message }, "variant_price_history table not available, using notifications");
    }

    // If no price history from table, get from notifications
    if (priceHistory.length === 0) {
      const notificationsResult = await query<{
        id: number;
        created_at: string;
        type: string;
        metadata: any;
      }>(
        `
        SELECT id, created_at, type, metadata
        FROM notifications
        WHERE variant_id = $1 
          AND user_id = $2
          AND type IN ('price_drop', 'threshold_met')
          AND created_at >= $3
        ORDER BY created_at DESC
        LIMIT 50
        `,
        [variantId, userId, thirtyDaysAgo.toISOString()]
      );

      priceHistory = notificationsResult.rows.map((row) => ({
        timestamp: row.created_at,
        price: row.metadata?.price_after || row.metadata?.new_price || null,
        currency: row.metadata?.currency || 'USD',
        source: 'notification',
        old_value: row.metadata?.price_before || row.metadata?.old_price || null,
        new_value: row.metadata?.price_after || row.metadata?.new_price || null,
      }));
    }

    // Get stock history from variant_stock_history table (if exists)
    // Fallback to notifications with stock change types
    let stockHistory: any[] = [];
    try {
      const stockHistoryResult = await query<{
        id: number;
        variant_id: number;
        recorded_at: string;
        status: string;
        raw: string | null;
        metadata: any;
      }>(
        `
        SELECT id, variant_id, recorded_at, status, raw, metadata
        FROM variant_stock_history
        WHERE variant_id = $1 AND recorded_at >= $2
        ORDER BY recorded_at DESC
        LIMIT 100
        `,
        [variantId, thirtyDaysAgo.toISOString()]
      );
      stockHistory = stockHistoryResult.rows.map((row) => ({
        timestamp: row.recorded_at,
        status: row.status,
        source: row.metadata?.source || 'tracking',
        old_value: null,
        new_value: row.status,
      }));
    } catch (error: any) {
      // Table might not exist, fall back to notifications
      logger.debug({ error: error.message }, "variant_stock_history table not available, using notifications");
    }

    // If no stock history from table, get from notifications
    if (stockHistory.length === 0) {
      const stockNotificationsResult = await query<{
        id: number;
        created_at: string;
        type: string;
        metadata: any;
      }>(
        `
        SELECT id, created_at, type, metadata
        FROM notifications
        WHERE variant_id = $1 
          AND user_id = $2
          AND type IN ('back_in_stock', 'stock_change')
          AND created_at >= $3
        ORDER BY created_at DESC
        LIMIT 50
        `,
        [variantId, userId, thirtyDaysAgo.toISOString()]
      );

      stockHistory = stockNotificationsResult.rows.map((row) => ({
        timestamp: row.created_at,
        status: row.metadata?.stock_status_after || row.metadata?.new_status || null,
        source: 'notification',
        old_value: row.metadata?.stock_status_before || row.metadata?.old_status || null,
        new_value: row.metadata?.stock_status_after || row.metadata?.new_status || null,
      }));
    }

    // Get all notifications for this variant
    const allNotificationsResult = await query<{
      id: number;
      created_at: string;
      type: string;
      title: string;
      body: string;
      metadata: any;
    }>(
      `
      SELECT id, created_at, type, title, body, metadata
      FROM notifications
      WHERE variant_id = $1 
        AND user_id = $2
        AND created_at >= $3
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [variantId, userId, thirtyDaysAgo.toISOString()]
    );

    const notifications = allNotificationsResult.rows.map((row) => ({
      id: String(row.id),
      timestamp: row.created_at,
      type: row.type,
      title: row.title,
      body: row.body,
      metadata: row.metadata,
    }));

    res.json({
      priceHistory,
      stockHistory,
      notifications,
    });
  } catch (error: any) {
    const userId = req.user!.id;
    const variantId = parseInt(req.params.variantId, 10);
    logger.error(
      { error: error.message, userId, variantId, path: "/me/tracked-items/:variantId/history" },
      "Error in GET /me/tracked-items/:variantId/history"
    );
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * DELETE /me/tracked-items/:id
 * Delete a tracked item (only if it belongs to the authenticated user)
 * Returns: { success: true }
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // Set by requireAuth middleware
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json(
        invalidRequestError("Tracked item ID must be a number", { id: req.params.id })
      );
    }

    // Verify tracked item exists
    const trackedItem = await trackedItemsRepo.getTrackedItemById(id);
    if (!trackedItem) {
      return res.status(404).json(notFoundError("Tracked item", id));
    }

    // Delete (only if owned by user)
    const deleted = await trackedItemsRepo.deleteTrackedItem(id, userId);
    if (!deleted) {
      return res.status(403).json(
        forbiddenError("You do not have permission to delete this tracked item")
      );
    }

    res.json({
      success: true,
    });
  } catch (error: any) {
    const userId = req.user!.id;
    const id = parseInt(req.params.id, 10);
    logger.error({ error: error.message, userId, id, path: "/me/tracked-items/:id" }, "Error in DELETE /me/tracked-items/:id");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

export { router as trackedItemsRoutes };

