import { Router, type Request, type Response } from "express";
import { UserNotificationSettingsRepository } from "../../db/repositories/userNotificationSettingsRepository.js";
import { internalError, invalidRequestError, formatError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { z } from "zod";

const router = Router();

// All routes require authentication
router.use(requireAuth);

const settingsRepo = new UserNotificationSettingsRepository();

/**
 * Validation schema for notification settings
 */
const notificationSettingsSchema = z.object({
  email_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  threshold_percentage: z.number().int().min(0).max(100).optional(),
});

/**
 * GET /me/settings/notifications
 * Get notification settings for the authenticated user
 */
router.get("/notifications", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // Set by requireAuth middleware

    const settings = await settingsRepo.getSettings(userId);

    res.json({
      settings,
    });
  } catch (error: any) {
    const userId = req.user?.id;
    logger.error({ error: error.message, userId, path: "/me/settings/notifications" }, "Error in GET /me/settings/notifications");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * POST /me/settings/notifications
 * Update notification settings for the authenticated user
 * Body: { email_enabled?, push_enabled?, threshold_percentage? }
 */
router.post("/notifications", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // Set by requireAuth middleware

    // Validate input
    const validation = notificationSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(
        invalidRequestError("Invalid settings data", {
          errors: validation.error.issues,
        })
      );
    }

    const updatedSettings = await settingsRepo.updateSettings(
      userId,
      validation.data
    );

    res.json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error: any) {
    const userId = req.user?.id;
    logger.error({ error: error.message, userId, path: "/me/settings/notifications" }, "Error in POST /me/settings/notifications");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

export { router as userSettingsRoutes };

