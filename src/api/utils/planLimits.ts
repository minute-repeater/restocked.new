import "dotenv/config";
import type { DBUser } from "../../db/repositories/userRepository.js";

/**
 * Plan limits configuration
 */
export const PLAN_LIMITS = {
  free: {
    MAX_TRACKED_ITEMS: 3,
    MAX_CHECKS_PER_DAY: 10,
    MAX_PRODUCTS_PER_HISTORY_PAGE: 20,
    ALLOW_VARIANT_TRACKING: false,
    MIN_CHECK_INTERVAL_MINUTES: 30,
  },
  pro: {
    MAX_TRACKED_ITEMS: Infinity,
    MAX_CHECKS_PER_DAY: Infinity,
    MAX_PRODUCTS_PER_HISTORY_PAGE: Infinity,
    ALLOW_VARIANT_TRACKING: true,
    MIN_CHECK_INTERVAL_MINUTES: 5,
  },
} as const;

/**
 * Check if plan system is enabled (for testing)
 */
export const ENABLE_TEST_PLANS = process.env.ENABLE_TEST_PLANS === "true";

/**
 * Get limits for a user's plan
 */
export function getPlanLimits(plan: 'free' | 'pro') {
  return PLAN_LIMITS[plan];
}

/**
 * Check if a feature is available for the user's plan
 */
export function checkPlanFeature(user: { plan: 'free' | 'pro' }, feature: string): boolean {
  if (!ENABLE_TEST_PLANS) {
    // If test plans disabled, allow everything
    return true;
  }

  const limits = getPlanLimits(user.plan);

  switch (feature) {
    case 'variant_tracking':
      return limits.ALLOW_VARIANT_TRACKING;
    case 'unlimited_tracking':
      return limits.MAX_TRACKED_ITEMS === Infinity;
    case 'unlimited_checks':
      return limits.MAX_CHECKS_PER_DAY === Infinity;
    case 'advanced_history':
      return limits.MAX_PRODUCTS_PER_HISTORY_PAGE === Infinity;
    case 'frequent_checks':
      return limits.MIN_CHECK_INTERVAL_MINUTES <= 5;
    default:
      return true;
  }
}

/**
 * Check if user has reached tracked items limit
 */
export function hasReachedTrackedItemsLimit(
  user: { plan: 'free' | 'pro' },
  currentCount: number
): boolean {
  if (!ENABLE_TEST_PLANS) return false;
  const limits = getPlanLimits(user.plan);
  return currentCount >= limits.MAX_TRACKED_ITEMS;
}

/**
 * Check if user has reached daily check limit
 */
export function hasReachedDailyCheckLimit(
  user: { plan: 'free' | 'pro' },
  checksToday: number
): boolean {
  if (!ENABLE_TEST_PLANS) return false;
  const limits = getPlanLimits(user.plan);
  return checksToday >= limits.MAX_CHECKS_PER_DAY;
}

/**
 * Get upgrade required error response
 */
export function getUpgradeRequiredError(feature?: string) {
  return {
    error: {
      code: "UPGRADE_REQUIRED",
      message: feature 
        ? `This feature (${feature}) is available on the Pro plan.`
        : "This feature is available on the Pro plan.",
    },
  };
}








