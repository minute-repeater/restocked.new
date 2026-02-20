import type { PlanTier } from '../types/user.js';

export interface PlanLimits {
  maxTrackedItems: number;
  checkIntervalMinutes: number;
  retainHistoryDays: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxTrackedItems: 3,
    checkIntervalMinutes: 60, // check once per hour
    retainHistoryDays: 7,
  },
  basic: {
    maxTrackedItems: 25,
    checkIntervalMinutes: 15,
    retainHistoryDays: 30,
  },
  premium: {
    maxTrackedItems: 100,
    checkIntervalMinutes: 5,
    retainHistoryDays: 90,
  },
};

export function getPlanLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan];
}
