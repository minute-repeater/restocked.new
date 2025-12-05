import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { schedulerService } from "../../scheduler/schedulerService.js";
import { logger } from "../utils/logger.js";
import { SchedulerLogRepository } from "../../db/repositories/schedulerLogRepository.js";
import { UserRepository } from "../../db/repositories/userRepository.js";
import { query } from "../../db/client.js";
import {
  invalidRequestError,
  notFoundError,
  internalError,
  forbiddenError,
  formatError,
} from "../utils/errors.js";
import { checkScheduler } from "../../jobs/checkScheduler.js";
import { NotificationRepository } from "../../db/repositories/notificationRepository.js";

const router = Router();

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /admin/scheduler/status
 * Get current scheduler status
 */
router.get("/scheduler/status", async (req: Request, res: Response) => {
  try {
    const status = schedulerService.getStatus();

    // Get latest log entry for additional context
    const logRepo = new SchedulerLogRepository();
    const latestLog = await logRepo.getLatestLog();

    res.json({
      ...status,
      processed_products: latestLog?.products_checked || 0,
      lastRunDetails: latestLog
        ? {
            run_started_at: latestLog.run_started_at,
            run_finished_at: latestLog.run_finished_at,
            products_checked: latestLog.products_checked,
            items_checked: latestLog.items_checked,
            success: latestLog.success,
            error: latestLog.error,
          }
        : null,
    });
  } catch (error: any) {
    logger.error({ error: error.message, path: "/admin/scheduler/status" }, "Error in GET /admin/scheduler/status");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * POST /admin/scheduler/run-now
 * Trigger a scheduler run immediately
 */
router.post("/scheduler/run-now", async (req: Request, res: Response) => {
  try {
    // Run scheduler check in background
    schedulerService.runNow().catch((error) => {
      logger.error({ error: error.message }, "Error running scheduler manually");
    });

    res.json({
      success: true,
      message: "Scheduler run triggered",
      status: schedulerService.getStatus(),
    });
  } catch (error: any) {
    logger.error({ error: error.message, path: "/admin/scheduler/run-now" }, "Error in POST /admin/scheduler/run-now");
    
    if (error.message.includes("already running")) {
      return res.status(409).json(
        invalidRequestError("Scheduler is already running a check")
      );
    }

    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * POST /admin/checks/run-now
 * Trigger a check worker run immediately and return detailed results
 */
router.post("/checks/run-now", async (req: Request, res: Response) => {
  try {
    if (checkScheduler.getStatus().isRunning) {
      return res.status(409).json(
        invalidRequestError("Check worker is already running")
      );
    }

    logger.info("Manual check run triggered");

    // Run checks synchronously and wait for results
    const result = await checkScheduler.runChecks();

    // Get notification counts
    const notificationStats = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes') as recent_count,
        COUNT(*) FILTER (WHERE type = 'PRICE' AND created_at > NOW() - INTERVAL '5 minutes') as price_count,
        COUNT(*) FILTER (WHERE type = 'RESTOCK' AND created_at > NOW() - INTERVAL '5 minutes') as restock_count,
        COUNT(*) FILTER (WHERE type = 'STOCK' AND created_at > NOW() - INTERVAL '5 minutes') as stock_count
      FROM notifications
    `);

    const stats = notificationStats.rows[0];

    res.json({
      success: true,
      message: "Check run completed",
      totalProducts: result.productsChecked + result.productsSkipped + result.productsFailed,
      productsChecked: result.productsChecked,
      productsSkipped: result.productsSkipped,
      productsFailed: result.productsFailed,
      changesDetected: parseInt(stats?.recent_count || "0", 10),
      notificationsCreated: parseInt(stats?.recent_count || "0", 10),
      notificationBreakdown: {
        price: parseInt(stats?.price_count || "0", 10),
        restock: parseInt(stats?.restock_count || "0", 10),
        stock: parseInt(stats?.stock_count || "0", 10),
      },
      durationMs: result.durationMs,
      errors: result.errors.length > 0 ? result.errors : [],
    });
  } catch (error: any) {
    logger.error({ error: error.message, path: "/admin/checks/run-now" }, "Error in POST /admin/checks/run-now");
    
    if (error.message.includes("already running")) {
      return res.status(409).json(
        invalidRequestError("Check worker is already running")
      );
    }

    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * POST /admin/users/:id/promote
 * Promote a user to admin role
 */
router.post("/users/:id/promote", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json(
        invalidRequestError("User ID is required")
      );
    }

    // Verify user exists
    const userRepo = new UserRepository();
    const user = await userRepo.findById(userId);

    if (!user) {
      return res.status(404).json(notFoundError("User", userId));
    }

    // Update user role to admin
    await query(
      "UPDATE users SET role = 'admin' WHERE id = $1 RETURNING id, email, role",
      [userId]
    );

    res.json({
      success: true,
      message: "User promoted to admin",
      user: {
        id: user.id,
        email: user.email,
        role: "admin",
      },
    });
  } catch (error: any) {
    const userId = parseInt(req.params.id, 10);
    logger.error({ error: error.message, userId, path: "/admin/users/:id/promote" }, "Error in POST /admin/users/:id/promote");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /admin/checks/recent
 * Get recent check runs
 * Query params:
 *   - limit: Number of checks (default: 50, max: 200)
 *   - product_id: Filter by product ID (optional)
 *   - status: Filter by status (optional: 'success', 'failed')
 */
router.get("/checks/recent", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(
      parseInt((req.query.limit as string) || "50", 10),
      200
    );
    const productId = req.query.product_id
      ? parseInt(req.query.product_id as string, 10)
      : null;
    const status = req.query.status as string | undefined;

    if (isNaN(limit) || limit < 1) {
      return res.status(400).json(
        invalidRequestError("Limit must be a positive number")
      );
    }

    if (productId !== null && isNaN(productId)) {
      return res.status(400).json(
        invalidRequestError("Product ID must be a number")
      );
    }

    let sql = `
      SELECT 
        cr.id,
        cr.product_id,
        p.name as product_name,
        p.url as product_url,
        cr.started_at,
        cr.finished_at,
        cr.status,
        cr.error_message,
        cr.metadata,
        EXTRACT(EPOCH FROM (cr.finished_at - cr.started_at)) * 1000 as duration_ms
      FROM check_runs cr
      INNER JOIN products p ON cr.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (productId !== null) {
      sql += ` AND cr.product_id = $${paramIndex++}`;
      params.push(productId);
    }

    if (status) {
      sql += ` AND cr.status = $${paramIndex++}`;
      params.push(status);
    }

    sql += ` ORDER BY cr.started_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(sql, params);

    res.json({
      checks: result.rows,
      count: result.rows.length,
      limit,
    });
  } catch (error: any) {
    logger.error({ error: error.message, path: "/admin/checks/recent" }, "Error in GET /admin/checks/recent");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /admin/checks/stats
 * Get check run statistics
 */
router.get("/checks/stats", async (req: Request, res: Response) => {
  try {
    // Overall stats
    const overallStats = await query(`
      SELECT 
        COUNT(*) as total_checks,
        COUNT(*) FILTER (WHERE status = 'success') as successful_checks,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_checks,
        AVG(EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000) as avg_duration_ms,
        MAX(EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000) as max_duration_ms,
        MIN(EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000) as min_duration_ms
      FROM check_runs
      WHERE finished_at IS NOT NULL
    `);

    // Recent activity (last 24 hours)
    const recentActivity = await query(`
      SELECT 
        COUNT(*) as checks_last_24h,
        COUNT(*) FILTER (WHERE status = 'success') as successful_last_24h,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_last_24h
      FROM check_runs
      WHERE started_at > NOW() - INTERVAL '24 hours'
    `);

    // Products checked in last 24 hours
    const productsChecked = await query(`
      SELECT COUNT(DISTINCT product_id) as unique_products_checked
      FROM check_runs
      WHERE started_at > NOW() - INTERVAL '24 hours'
    `);

    // Status breakdown
    const statusBreakdown = await query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM check_runs
      GROUP BY status
      ORDER BY count DESC
    `);

    res.json({
      overall: overallStats.rows[0],
      recent: {
        ...recentActivity.rows[0],
        unique_products_checked: productsChecked.rows[0]?.unique_products_checked || 0,
      },
      statusBreakdown: statusBreakdown.rows,
    });
  } catch (error: any) {
    logger.error({ error: error.message, path: "/admin/checks/stats" }, "Error in GET /admin/checks/stats");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /admin/checks/slow
 * Get slowest check runs
 * Query params:
 *   - limit: Number of checks (default: 20, max: 100)
 *   - min_duration_ms: Minimum duration in milliseconds (optional)
 */
router.get("/checks/slow", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(
      parseInt((req.query.limit as string) || "20", 10),
      100
    );
    const minDurationMs = req.query.min_duration_ms
      ? parseInt(req.query.min_duration_ms as string, 10)
      : null;

    if (isNaN(limit) || limit < 1) {
      return res.status(400).json(
        invalidRequestError("Limit must be a positive number")
      );
    }

    let sql = `
      SELECT 
        cr.id,
        cr.product_id,
        p.name as product_name,
        p.url as product_url,
        cr.started_at,
        cr.finished_at,
        cr.status,
        cr.error_message,
        EXTRACT(EPOCH FROM (cr.finished_at - cr.started_at)) * 1000 as duration_ms
      FROM check_runs cr
      INNER JOIN products p ON cr.product_id = p.id
      WHERE cr.finished_at IS NOT NULL
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (minDurationMs !== null) {
      sql += ` AND EXTRACT(EPOCH FROM (cr.finished_at - cr.started_at)) * 1000 >= $${paramIndex++}`;
      params.push(minDurationMs);
    }

    sql += ` ORDER BY duration_ms DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(sql, params);

    res.json({
      checks: result.rows,
      count: result.rows.length,
      limit,
    });
  } catch (error: any) {
    logger.error({ error: error.message, path: "/admin/checks/slow" }, "Error in GET /admin/checks/slow");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

export { router as adminRoutes };

