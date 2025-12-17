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
 * Validation schema for notification settings (legacy endpoint)
 */
const notificationSettingsSchema = z.object({
  email_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  threshold_percentage: z.number().int().min(0).max(100).optional(),
});

/**
 * User Settings schema validation (new endpoint)
 */
const userSettingsSchema = z.object({
  email_notifications_enabled: z.boolean().optional(),
  price_drop_notifications_enabled: z.boolean().optional(),
  back_in_stock_notifications_enabled: z.boolean().optional(),
  stock_change_notifications_enabled: z.boolean().optional(),
  default_price_drop_threshold: z.number().min(0).nullable().optional(),
  timezone: z.string().optional().nullable(),
});

/**
 * GET /me/settings/notifications
 * Get notification settings for the authenticated user (legacy endpoint)
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
 * Update notification settings for the authenticated user (legacy endpoint)
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

/**
 * GET /me/settings
 * Get user settings (creates default if missing)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { query } = await import("../../db/client.js");

    // Get or create user settings
    let settingsResult = await query<{
      user_id: string;
      email_notifications_enabled: boolean;
      push_notifications_enabled: boolean;
      price_drop_threshold_percent: number;
      timezone: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      SELECT 
        user_id,
        email_notifications_enabled,
        push_notifications_enabled,
        price_drop_threshold_percent,
        timezone,
        created_at,
        updated_at
      FROM user_settings
      WHERE user_id = $1
      `,
      [userId]
    );

    // Create default settings if not exists
    if (settingsResult.rows.length === 0) {
      await query(
        `
        INSERT INTO user_settings (
          user_id,
          email_notifications_enabled,
          push_notifications_enabled,
          price_drop_threshold_percent,
          timezone
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [userId, true, false, 5.0, null]
      );

      // Fetch the newly created settings
      settingsResult = await query(
        `
        SELECT 
          user_id,
          email_notifications_enabled,
          push_notifications_enabled,
          price_drop_threshold_percent,
          timezone,
          created_at,
          updated_at
        FROM user_settings
        WHERE user_id = $1
        `,
        [userId]
      );
    }

    const settings = settingsResult.rows[0];

    // Map to frontend-friendly format
    // Note: The schema doesn't have separate fields for notification types,
    // so we'll use email_notifications_enabled as the base and interpret
    // price_drop_threshold_percent as the default threshold
    res.json({
      email_notifications_enabled: settings.email_notifications_enabled,
      price_drop_notifications_enabled: settings.email_notifications_enabled, // Default to email setting
      back_in_stock_notifications_enabled: settings.email_notifications_enabled, // Default to email setting
      stock_change_notifications_enabled: settings.push_notifications_enabled, // Use push as stock change toggle
      default_price_drop_threshold: Number(settings.price_drop_threshold_percent),
      timezone: settings.timezone,
    });
  } catch (error: any) {
    const userId = req.user?.id;
    logger.error({ error: error.message, userId, path: "/me/settings" }, "Error in GET /me/settings");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

/**
 * PUT /me/settings
 * Update user settings
 */
router.put("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate input
    const validation = userSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(
        invalidRequestError("Invalid settings data", {
          errors: validation.error.issues,
        })
      );
    }

    const { query } = await import("../../db/client.js");

    // Ensure settings exist
    let settingsResult = await query(
      `SELECT user_id FROM user_settings WHERE user_id = $1`,
      [userId]
    );

    if (settingsResult.rows.length === 0) {
      await query(
        `
        INSERT INTO user_settings (
          user_id,
          email_notifications_enabled,
          push_notifications_enabled,
          price_drop_threshold_percent,
          timezone
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [userId, true, false, 5.0, null]
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Map frontend fields to database fields
    // email_notifications_enabled maps directly
    if (validation.data.email_notifications_enabled !== undefined) {
      updates.push(`email_notifications_enabled = $${paramIndex++}`);
      values.push(validation.data.email_notifications_enabled);
    }

    // price_drop_notifications_enabled, back_in_stock_notifications_enabled
    // both control email_notifications_enabled (we'll use the first one that's set)
    if (validation.data.price_drop_notifications_enabled !== undefined) {
      updates.push(`email_notifications_enabled = $${paramIndex++}`);
      values.push(validation.data.price_drop_notifications_enabled);
    } else if (validation.data.back_in_stock_notifications_enabled !== undefined) {
      updates.push(`email_notifications_enabled = $${paramIndex++}`);
      values.push(validation.data.back_in_stock_notifications_enabled);
    }

    // stock_change_notifications_enabled maps to push_notifications_enabled
    if (validation.data.stock_change_notifications_enabled !== undefined) {
      updates.push(`push_notifications_enabled = $${paramIndex++}`);
      values.push(validation.data.stock_change_notifications_enabled);
    }

    // default_price_drop_threshold maps to price_drop_threshold_percent
    if (validation.data.default_price_drop_threshold !== undefined) {
      updates.push(`price_drop_threshold_percent = $${paramIndex++}`);
      values.push(validation.data.default_price_drop_threshold);
    }

    // timezone maps directly
    if (validation.data.timezone !== undefined) {
      updates.push(`timezone = $${paramIndex++}`);
      values.push(validation.data.timezone);
    }

    if (updates.length === 0) {
      // No updates, just return current settings
      const currentResult = await query(
        `
        SELECT 
          user_id,
          email_notifications_enabled,
          push_notifications_enabled,
          price_drop_threshold_percent,
          timezone,
          created_at,
          updated_at
        FROM user_settings
        WHERE user_id = $1
        `,
        [userId]
      );
      const current = currentResult.rows[0];
      return res.json({
        email_notifications_enabled: current.email_notifications_enabled,
        price_drop_notifications_enabled: current.email_notifications_enabled,
        back_in_stock_notifications_enabled: current.email_notifications_enabled,
        stock_change_notifications_enabled: current.push_notifications_enabled,
        default_price_drop_threshold: Number(current.price_drop_threshold_percent),
        timezone: current.timezone,
      });
    }

    // Add updated_at
    updates.push(`updated_at = now()`);
    values.push(userId);
    paramIndex++;

    // Execute update
    const updateResult = await query(
      `
      UPDATE user_settings
      SET ${updates.join(", ")}
      WHERE user_id = $${paramIndex}
      RETURNING 
        user_id,
        email_notifications_enabled,
        push_notifications_enabled,
        price_drop_threshold_percent,
        timezone,
        created_at,
        updated_at
      `,
      values
    );

    if (updateResult.rows.length === 0) {
      throw new Error("Failed to update settings");
    }

    const updated = updateResult.rows[0];

    // Return in frontend format
    res.json({
      email_notifications_enabled: updated.email_notifications_enabled,
      price_drop_notifications_enabled: updated.email_notifications_enabled,
      back_in_stock_notifications_enabled: updated.email_notifications_enabled,
      stock_change_notifications_enabled: updated.push_notifications_enabled,
      default_price_drop_threshold: Number(updated.price_drop_threshold_percent),
      timezone: updated.timezone,
    });
  } catch (error: any) {
    const userId = req.user?.id;
    logger.error({ error: error.message, userId, path: "/me/settings" }, "Error in PUT /me/settings");
    const errorResponse = formatError(error);
    res.status(500).json(errorResponse);
  }
});

export { router as userSettingsRoutes };
