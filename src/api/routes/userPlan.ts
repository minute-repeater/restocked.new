import { Router, type Request, type Response } from "express";
import { UserRepository } from "../../db/repositories/userRepository.js";
import { TrackedItemsRepository } from "../../db/repositories/trackedItemsRepository.js";
import { internalError, invalidRequestError } from "../utils/errors.js";
import { postRateLimiter } from "../middleware/rateLimiting.js";
import { PLAN_LIMITS, ENABLE_TEST_PLANS } from "../utils/planLimits.js";

const router = Router();
const userRepo = new UserRepository();
const trackedItemsRepo = new TrackedItemsRepository();

/**
 * POST /me/upgrade
 * Upgrade user to Pro plan (testing only, no billing)
 * Returns: { user: {...} }
 */
router.post("/upgrade", postRateLimiter, async (req: Request, res: Response) => {
  try {
    if (!ENABLE_TEST_PLANS) {
      return res.status(400).json(
        invalidRequestError("Plan system is not enabled")
      );
    }

    if (!req.user) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const userId = req.user.id;

    // Update user plan to 'pro'
    const updatedUser = await userRepo.updatePlan(userId, 'pro');

    console.log(`[Plan] User ${userId} upgraded to Pro`);

    res.json({
      user: updatedUser,
      message: "Successfully upgraded to Pro plan",
    });
  } catch (error: any) {
    console.error("Error in POST /me/upgrade:", error);
    res.status(500).json(internalError(error.message, { stack: error.stack }));
  }
});

/**
 * POST /me/downgrade
 * Downgrade user to Free plan (testing only)
 * Returns: { user: {...} } or error if user has too many tracked items
 */
router.post("/downgrade", postRateLimiter, async (req: Request, res: Response) => {
  try {
    if (!ENABLE_TEST_PLANS) {
      return res.status(400).json(
        invalidRequestError("Plan system is not enabled")
      );
    }

    if (!req.user) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const userId = req.user.id;

    // Check if user has more than free tier limit of tracked items
    const trackedItems = await trackedItemsRepo.getTrackedItemsByUser(userId);
    const freeLimit = PLAN_LIMITS.free.MAX_TRACKED_ITEMS;

    if (trackedItems.length > freeLimit) {
      return res.status(400).json({
        error: {
          code: "DOWNGRADE_BLOCKED",
          message: `You have ${trackedItems.length} tracked items. Please reduce to ${freeLimit} or fewer before downgrading to Free plan.`,
          currentCount: trackedItems.length,
          maxAllowed: freeLimit,
        },
      });
    }

    // Update user plan to 'free'
    const updatedUser = await userRepo.updatePlan(userId, 'free');

    console.log(`[Plan] User ${userId} downgraded to Free`);

    res.json({
      user: updatedUser,
      message: "Successfully downgraded to Free plan",
    });
  } catch (error: any) {
    console.error("Error in POST /me/downgrade:", error);
    res.status(500).json(internalError(error.message, { stack: error.stack }));
  }
});

/**
 * GET /me/plan
 * Get current user's plan information
 * Returns: { plan: 'free' | 'pro', limits: {...} }
 */
router.get("/plan", async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const user = await userRepo.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    const limits = PLAN_LIMITS[user.plan];

    res.json({
      plan: user.plan,
      limits: {
        maxTrackedItems: limits.MAX_TRACKED_ITEMS === Infinity ? null : limits.MAX_TRACKED_ITEMS,
        maxChecksPerDay: limits.MAX_CHECKS_PER_DAY === Infinity ? null : limits.MAX_CHECKS_PER_DAY,
        maxProductsPerHistoryPage: limits.MAX_PRODUCTS_PER_HISTORY_PAGE === Infinity ? null : limits.MAX_PRODUCTS_PER_HISTORY_PAGE,
        allowVariantTracking: limits.ALLOW_VARIANT_TRACKING,
        minCheckIntervalMinutes: limits.MIN_CHECK_INTERVAL_MINUTES,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /me/plan:", error);
    res.status(500).json(internalError(error.message, { stack: error.stack }));
  }
});

export { router as userPlanRoutes };

