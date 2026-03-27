import type { PlanTier } from '@covet/shared';
import { config } from '../config.js';

export interface StripePriceConfig {
  monthly: string;
  annual: string;
}

/** Map DB plan tier → Stripe price IDs (from env vars). Free tier has no prices. */
export function getStripePrices(): Record<Exclude<PlanTier, 'free'>, StripePriceConfig> {
  return {
    basic: {
      monthly: config.stripePriceBasicMonthly!,
      annual: config.stripePriceBasicAnnual!,
    },
    premium: {
      monthly: config.stripePricePremiumMonthly!,
      annual: config.stripePricePremiumAnnual!,
    },
  };
}

/** Reverse lookup: Stripe price ID → DB plan tier (for webhook processing) */
export function getPlanFromPriceId(priceId: string): Exclude<PlanTier, 'free'> | null {
  const prices = getStripePrices();
  for (const [plan, config] of Object.entries(prices)) {
    if (config.monthly === priceId || config.annual === priceId) {
      return plan as Exclude<PlanTier, 'free'>;
    }
  }
  return null;
}
