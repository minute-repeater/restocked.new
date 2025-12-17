/**
 * Notification API Routes
 * 
 * Provides endpoints for users to view and manage their notifications
 * Uses the normalized schema from migration 009
 * 
 * Routes:
 * - GET /notifications - Paginated list of notifications
 * - GET /notifications/unread-count - Unread notification count
 * - POST /notifications/mark-read - Mark specific notifications as read
 * - POST /notifications/mark-all-read - Mark all notifications as read
 */

import { Router, type Request, type Response } from "express";
import { query } from "../../db/client.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { logger } from "../utils/logger.js";
import {
  invalidRequestError,
  formatError,
} from "../utils/errors.js";

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /notifications
 * Get paginated list of notifications for the current user
 * 
 * Query params:
 *   - page: Page number (default: 1)
 *   - pageSize: Items per page (default: 20, max: 100)
 * 
 * Response:
 *   {
 *     items: Array<{
 *       id: string;
 *       type: "price_drop" | "back_in_stock" | "stock_change" | "threshold_met";
 *       title: string;
 *       body: string;
 *       is_read: boolean;
 *       created_at: string;
 *       product_id: number | null;
 *       variant_id: number | null;
 *     }>;
 *     page: number;
 *     pageSize: number;
 *     total: number;
 *     hasMore: boolean;
 *   }
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // Set by requireAuth middleware

    // Parse and validate query parameters
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const pageSize = Math.min(
      Math.max(1, parseInt((req.query.pageSize as string) || "20", 10)),
      100
    );

    if (isNaN(page) || isNaN(pageSize)) {
      return res.status(400).json(
        invalidRequestError("Page and pageSize must be valid numbers")
      );
    }

    const offset = (page - 1) * pageSize;

    // Get total count for pagination
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE user_id = $1`,
      [userId]
    );
    const total = parseInt(countResult.rows[0]?.count || "0", 10);

    // Get notifications with product_id and variant_id
    // Join with product_variants to get product_id
    // Note: 'read' column exists from migration 004 (migration 009 uses IF NOT EXISTS so it persists)
    const notificationsResult = await query<{
      id: bigint;
      type: string;
      title: string;
      body: string;
      read: boolean;
      created_at: string;
      variant_id: bigint;
      product_id: bigint | null;
    }>(
      `SELECT 
        n.id,
        n.type,
        n.title,
        n.body,
        n.created_at,
        n.variant_id,
        pv.product_id,
        COALESCE(n.read, FALSE) as read
       FROM notifications n
       INNER JOIN product_variants pv ON n.variant_id = pv.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );

    // Map to response format
    const items = notificationsResult.rows.map((row) => ({
      id: String(row.id),
      type: row.type as "price_drop" | "back_in_stock" | "stock_change" | "threshold_met",
      title: row.title,
      body: row.body,
      is_read: row.read,
      created_at: row.created_at,
      product_id: row.product_id ? Number(row.product_id) : null,
      variant_id: row.variant_id ? Number(row.variant_id) : null,
    }));

    const hasMore = offset + items.length < total;

    res.json({
      items,
      page,
      pageSize,
      total,
      hasMore,
    });
  } catch (error: any) {
    const userId = req.user?.id;
    logger.error(
      { error: error.message, userId, path: "/notifications" },
      "Error in GET /notifications"
    );
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /notifications/unread-count
 * Get unread notification count for the current user
 * 
 * Response:
 *   { count: number }
 */
router.get("/unread-count", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Count unread notifications
    // Note: 'read' column exists from migration 004
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE user_id = $1
         AND COALESCE(read, FALSE) = FALSE`,
      [userId]
    );

    const count = parseInt(result.rows[0]?.count || "0", 10);

    res.json({ count });
  } catch (error: any) {
    const userId = req.user?.id;
    logger.error(
      { error: error.message, userId, path: "/notifications/unread-count" },
      "Error in GET /notifications/unread-count"
    );
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * POST /notifications/mark-read
 * Mark specific notifications as read for the current user
 * 
 * Body:
 *   { ids: string[] }
 * 
 * Response:
 *   { success: boolean, markedCount: number }
 */
router.post("/mark-read", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { ids } = req.body;

    // Validate request body
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json(
        invalidRequestError("ids must be an array of notification IDs")
      );
    }

    if (ids.length === 0) {
      return res.json({ success: true, markedCount: 0 });
    }

    // Validate all IDs are strings/numbers and convert to bigint
    const notificationIds: bigint[] = [];
    for (const id of ids) {
      const parsed = typeof id === "string" ? parseInt(id, 10) : id;
      if (isNaN(parsed) || parsed <= 0) {
        return res.status(400).json(
          invalidRequestError(`Invalid notification ID: ${id}`)
        );
      }
      notificationIds.push(BigInt(parsed));
    }

    // Update notifications - only for this user and only if they exist
    // Note: 'read' column exists from migration 004
    const result = await query<{ id: bigint }>(
      `UPDATE notifications
       SET read = TRUE
       WHERE user_id = $1
         AND id = ANY($2::bigint[])
         AND COALESCE(read, FALSE) = FALSE
       RETURNING id`,
      [userId, notificationIds]
    );

    const markedCount = result.rowCount || 0;

    logger.info(
      { userId, markedCount, notificationIds: ids },
      "Marked notifications as read"
    );

    res.json({
      success: true,
      markedCount,
    });
  } catch (error: any) {
    const userId = req.user?.id;
    logger.error(
      { error: error.message, userId, path: "/notifications/mark-read" },
      "Error in POST /notifications/mark-read"
    );
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * POST /notifications/mark-all-read
 * Mark all notifications as read for the current user
 * 
 * Response:
 *   { success: boolean, markedCount: number }
 */
router.post("/mark-all-read", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Update all unread notifications for this user
    // Note: 'read' column exists from migration 004
    const result = await query<{ id: bigint }>(
      `UPDATE notifications
       SET read = TRUE
       WHERE user_id = $1
         AND COALESCE(read, FALSE) = FALSE
       RETURNING id`,
      [userId]
    );

    const markedCount = result.rowCount || 0;

    logger.info(
      { userId, markedCount },
      "Marked all notifications as read"
    );

    res.json({
      success: true,
      markedCount,
    });
  } catch (error: any) {
    const userId = req.user?.id;
    logger.error(
      { error: error.message, userId, path: "/notifications/mark-all-read" },
      "Error in POST /notifications/mark-all-read"
    );
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

export { router as notificationRoutes };
