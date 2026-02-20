import { describe, it, expect } from 'vitest';
import { getPlanLimits, PLAN_LIMITS } from '../constants/plans.js';

describe('PLAN_LIMITS', () => {
  it('has free tier with correct limits', () => {
    expect(PLAN_LIMITS.free).toEqual({
      maxTrackedItems: 3,
      checkIntervalMinutes: 60,
      retainHistoryDays: 7,
    });
  });

  it('has basic tier with correct limits', () => {
    expect(PLAN_LIMITS.basic).toEqual({
      maxTrackedItems: 25,
      checkIntervalMinutes: 15,
      retainHistoryDays: 30,
    });
  });

  it('has premium tier with correct limits', () => {
    expect(PLAN_LIMITS.premium).toEqual({
      maxTrackedItems: 100,
      checkIntervalMinutes: 5,
      retainHistoryDays: 90,
    });
  });

  it('premium has more items than basic, basic more than free', () => {
    expect(PLAN_LIMITS.premium.maxTrackedItems).toBeGreaterThan(PLAN_LIMITS.basic.maxTrackedItems);
    expect(PLAN_LIMITS.basic.maxTrackedItems).toBeGreaterThan(PLAN_LIMITS.free.maxTrackedItems);
  });

  it('premium checks more frequently than basic, basic more than free', () => {
    expect(PLAN_LIMITS.premium.checkIntervalMinutes).toBeLessThan(PLAN_LIMITS.basic.checkIntervalMinutes);
    expect(PLAN_LIMITS.basic.checkIntervalMinutes).toBeLessThan(PLAN_LIMITS.free.checkIntervalMinutes);
  });
});

describe('getPlanLimits', () => {
  it('returns correct limits for free plan', () => {
    expect(getPlanLimits('free')).toEqual(PLAN_LIMITS.free);
  });

  it('returns correct limits for basic plan', () => {
    expect(getPlanLimits('basic')).toEqual(PLAN_LIMITS.basic);
  });

  it('returns correct limits for premium plan', () => {
    expect(getPlanLimits('premium')).toEqual(PLAN_LIMITS.premium);
  });
});
