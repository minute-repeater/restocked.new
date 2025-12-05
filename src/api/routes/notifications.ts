import { Router, type Request, type Response } from "express";
import { NotificationRepository } from "../../db/repositories/notificationRepository.js";
import { UserNotificationSettingsRepository } from "../../db/repositories/userNotificationSettingsRepository.js";
import { logger } from "../utils/logger.js";
import {
  invalidRequestError,
  internalError,
  formatError,
} from "../utils/errors.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// All routes require authentication
router.use(requireAuth);

const notificationRepo = new NotificationRepository();
const settingsRepo = new UserNotificationSettingsRepository();

/**
 * GET /me/notifications
 * Get notifications for the authenticated user
 * Query params:
 *   - limit: Number of notifications (default: 50, max: 100)
 *   - offset: Pagination offset (default: 0)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // Set by requireAuth middleware

    const limit = Math.min(
      parseInt((req.query.limit as string) || "50", 10),
      100
    );
    const offset = parseInt((req.query.offset as string) || "0", 10);

    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      return res.status(400).json(
        invalidRequestError("Limit and offset must be positive numbers")
      );
    }

    const notifications = await notificationRepo.getNotificationsByUser(
      userId,
      limit,
      offset
    );

    const unreadCount = await notificationRepo.getUnreadCount(userId);

    logger.debug({ userId, unreadCount }, "Notification unread count");

    res.json({
      notifications,
      pagination: {
        limit,
        offset,
        count: notifications.length,
      },
      unread_count: unreadCount, // Use snake_case for consistency with API
      unreadCount, // Also include camelCase for backward compatibility
    });
  } catch (error: any) {
    const userId = req.user?.id;
    logger.error({ error: error.message, userId, path: "/me/notifications" }, "Error in GET /me/notifications");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * POST /me/notifications/mark-read
 * Mark notifications as read
 * Body: { notificationIds?: number[] } (optional - if empty, marks all as read)
 */
router.post("/mark-read", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // Set by requireAuth middleware
    const { notificationIds } = req.body;

    let ids: number[] | undefined;
    if (notificationIds) {
      if (!Array.isArray(notificationIds)) {
        return res.status(400).json(
          invalidRequestError("notificationIds must be an array")
        );
      }
      ids = notificationIds.map((id: any) => parseInt(String(id), 10)).filter((id: number) => !isNaN(id));
    }

    const count = await notificationRepo.markAsRead(userId, ids);

    res.json({
      success: true,
      markedCount: count,
    });
  } catch (error: any) {
    const userId = req.user?.id;
    logger.error({ error: error.message, userId, path: "/me/notifications/mark-read" }, "Error in POST /me/notifications/mark-read");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

export { router as notificationRoutes };

