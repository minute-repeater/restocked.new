import { apiRequest } from './client';
import type { PlanTier } from '@covet/shared';

export interface BillingStatus {
  plan: PlanTier;
  hasSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

export async function createCheckoutSession(
  token: string,
  plan: 'basic' | 'premium',
  interval: 'monthly' | 'annual'
): Promise<{ url: string }> {
  return apiRequest<{ url: string }>('/billing/checkout', {
    method: 'POST',
    token,
    body: { plan, interval },
  });
}

export async function createPortalSession(
  token: string
): Promise<{ url: string }> {
  return apiRequest<{ url: string }>('/billing/portal', {
    method: 'POST',
    token,
  });
}

export async function getBillingStatus(token: string): Promise<BillingStatus> {
  return apiRequest<BillingStatus>('/billing/status', { token });
}
