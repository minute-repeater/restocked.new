import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { createCheckoutSession, createPortalSession, getBillingStatus } from '../api/billing';
import { PLAN_DISPLAY_NAMES, getPlanLimits } from '@covet/shared';

const upgradePlans: {
  dbTier: 'basic' | 'premium';
  name: string;
  description: string;
  price: { monthly: number; annual: number };
  features: string[];
  highlight: boolean;
}[] = [
  {
    dbTier: 'basic',
    name: 'Premium',
    description: 'For the dedicated collector',
    price: { monthly: 12, annual: 9 },
    features: [
      '25 tracked items',
      '15-minute check interval',
      '30-day history',
      'Price drop alerts',
      'Target price alerts',
      'Priority support',
    ],
    highlight: true,
  },
  {
    dbTier: 'premium',
    name: 'Business',
    description: 'For resellers & stylists',
    price: { monthly: 39, annual: 29 },
    features: [
      '100 tracked items',
      '5-minute check interval',
      '90-day history',
      'Price drop alerts',
      'Target price alerts',
      'API access',
      'Dedicated support',
    ],
    highlight: false,
  },
];

export function Billing() {
  const { token, user, isLoading: authLoading } = useAuth();
  const [annual, setAnnual] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: billing } = useQuery({
    queryKey: ['billingStatus'],
    queryFn: () => getBillingStatus(token!),
    enabled: !!token,
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ plan, interval }: { plan: 'basic' | 'premium'; interval: 'monthly' | 'annual' }) =>
      createCheckoutSession(token!, plan, interval),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err) => {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed');
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => createPortalSession(token!),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err) => {
      setCheckoutError(err instanceof Error ? err.message : 'Could not open billing portal');
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-text-muted">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span className="text-sm font-light">Loading...</span>
        </div>
      </div>
    );
  }

  if (!token || !user) return <Navigate to="/login" replace />;

  const currentPlan = user.plan;
  const displayName = PLAN_DISPLAY_NAMES[currentPlan];
  const limits = getPlanLimits(currentPlan);
  const hasSubscription = billing?.hasSubscription ?? false;
  const cancelAtPeriodEnd = billing?.cancelAtPeriodEnd ?? false;
  const periodEnd = billing?.currentPeriodEnd ? new Date(billing.currentPeriodEnd) : null;

  return (
    <div className="p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <h2 className="text-4xl font-light text-text-main tracking-tight font-display">
          Billing & <span className="font-bold">Membership</span>
        </h2>
        <p className="text-text-muted mt-2 text-sm">
          Manage your subscription and plan details.
        </p>
      </div>

      {/* Error */}
      {checkoutError && (
        <div className="mb-8 p-4 rounded-2xl bg-blush-bg border border-blush-text/20 text-blush-text text-sm flex items-center gap-3">
          <span className="material-symbols-outlined !text-lg">error</span>
          {checkoutError}
          <button onClick={() => setCheckoutError(null)} className="ml-auto">
            <span className="material-symbols-outlined !text-lg">close</span>
          </button>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-white p-8 rounded-3xl shadow-soft mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Current Plan</p>
            <p className="text-2xl font-display font-light text-text-main">
              {displayName} <span className="text-sm text-text-muted font-sans">Membership</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-text-muted">
              <span>{limits.maxTrackedItems} tracked items</span>
              <span className="text-border-light">|</span>
              <span>{limits.checkIntervalMinutes}min checks</span>
              <span className="text-border-light">|</span>
              <span>{limits.retainHistoryDays}d history</span>
            </div>
          </div>

          {hasSubscription && (
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="bg-white border border-border-light text-text-main text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-cream transition-all disabled:opacity-50"
            >
              {portalMutation.isPending ? 'Opening...' : 'Manage Subscription'}
            </button>
          )}
        </div>

        {/* Cancellation warning */}
        {cancelAtPeriodEnd && periodEnd && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-3">
            <span className="material-symbols-outlined !text-lg mt-0.5">warning</span>
            <div>
              <p className="font-medium">Your subscription is set to cancel</p>
              <p className="text-amber-700 mt-1">
                You'll retain access to your {displayName} plan until{' '}
                {periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                After that, you'll be downgraded to the Free plan.
              </p>
            </div>
          </div>
        )}

        {/* Period info for active paid users */}
        {hasSubscription && !cancelAtPeriodEnd && periodEnd && (
          <p className="mt-4 text-[11px] text-text-muted">
            Next billing date: {periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Upgrade Section (only for free users or users who can upgrade) */}
      {(!hasSubscription || currentPlan === 'free') && (
        <>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-display font-light text-text-main italic">
              Upgrade your membership
            </h3>

            {/* Annual toggle */}
            <div className="flex items-center gap-3">
              <span
                className={`text-[11px] uppercase tracking-[0.1em] cursor-pointer transition-colors ${!annual ? 'text-text-main font-medium' : 'text-text-muted'}`}
                onClick={() => setAnnual(false)}
              >
                Monthly
              </span>
              <button
                className={`relative w-10 h-5 rounded-full transition-colors ${annual ? 'bg-brand-gold/20 border-brand-gold/50' : 'bg-border-light border-border-light'} border`}
                onClick={() => setAnnual(!annual)}
              >
                <div
                  className={`absolute top-[2px] w-[16px] h-[16px] rounded-full transition-all ${annual ? 'left-[22px] bg-brand-gold' : 'left-[2px] bg-text-muted/30'}`}
                />
              </button>
              <span
                className={`text-[11px] uppercase tracking-[0.1em] cursor-pointer transition-colors ${annual ? 'text-text-main font-medium' : 'text-text-muted'}`}
                onClick={() => setAnnual(true)}
              >
                Annual
              </span>
              {annual && (
                <span className="text-[9px] uppercase tracking-[0.1em] text-white bg-brand-gold px-2 py-0.5 rounded-full font-medium">
                  Save 25%
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upgradePlans
              .filter((p) => p.dbTier !== currentPlan) // Don't show current plan
              .map((plan) => {
                const price = annual ? plan.price.annual : plan.price.monthly;
                const isCurrentPlan = plan.dbTier === currentPlan;
                return (
                  <div
                    key={plan.dbTier}
                    className={`p-8 rounded-3xl border transition-all ${
                      plan.highlight
                        ? 'bg-white border-brand-gold/20 shadow-soft'
                        : 'bg-white border-border-light'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className={`text-[10px] uppercase tracking-[0.2em] mb-1 ${plan.highlight ? 'text-brand-gold' : 'text-text-muted/50'}`}>
                          {plan.name}
                        </p>
                        <p className="text-sm font-light italic text-text-muted/60">{plan.description}</p>
                      </div>
                      {plan.highlight && (
                        <span className="text-[8px] uppercase tracking-widest text-white bg-brand-gold px-2.5 py-1 rounded-full font-medium">
                          Popular
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1.5 mt-5 mb-1">
                      <span className="text-lg font-light text-text-muted/40">$</span>
                      <span className="text-4xl font-light font-display text-text-main">{price}</span>
                      <span className="text-[11px] text-text-muted/40 tracking-wide">/ mo</span>
                    </div>
                    <p className="text-[10px] text-brand-gold/60 tracking-wide mb-6">
                      {annual ? `Billed $${price * 12}/year` : 'Billed monthly'}
                    </p>

                    <button
                      onClick={() => checkoutMutation.mutate({ plan: plan.dbTier, interval: annual ? 'annual' : 'monthly' })}
                      disabled={checkoutMutation.isPending || isCurrentPlan}
                      className={`w-full py-3.5 text-[10px] uppercase tracking-[0.15em] font-medium transition-all rounded-xl mb-6 disabled:opacity-50 ${
                        plan.highlight
                          ? 'bg-brand-gold text-white hover:bg-champagne-gold'
                          : 'border border-border-light text-text-main hover:border-text-muted/40 hover:bg-cream'
                      }`}
                    >
                      {checkoutMutation.isPending ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                    </button>

                    <ul className="space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm font-light text-text-muted">
                          <span className="text-brand-gold text-xs mt-0.5 shrink-0">{'\u2726'}</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        </>
      )}

      {/* Already on paid plan and not free — show manage info */}
      {hasSubscription && currentPlan !== 'free' && !cancelAtPeriodEnd && (
        <div className="bg-cream p-8 rounded-3xl border border-black/5">
          <p className="text-sm text-text-muted font-light">
            To change your plan or update your payment method, click <strong>Manage Subscription</strong> above.
            You can upgrade, downgrade, or cancel from the billing portal.
          </p>
        </div>
      )}
    </div>
  );
}
