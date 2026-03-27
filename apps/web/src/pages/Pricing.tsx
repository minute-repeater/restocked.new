import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { createCheckoutSession } from '../api/billing';
import { SEO } from '../components/SEO';

const plans = [
  {
    name: 'Free',
    dbTier: null as null,
    price: { monthly: 0, annual: 0 },
    description: 'For the occasional hunter',
    features: [
      '3 tracked items',
      'Email alerts',
      '60-minute check interval',
      '7-day history',
      'Back-in-stock alerts',
    ],
    cta: 'Start free',
    ctaLoggedIn: 'Current plan',
    highlight: false,
  },
  {
    name: 'Premium',
    dbTier: 'basic' as const,
    price: { monthly: 12, annual: 9 },
    description: 'For the dedicated collector',
    features: [
      '25 tracked items',
      'Email alerts',
      '15-minute check interval',
      '30-day history',
      'Price drop alerts',
      'Target price alerts',
      'Priority support',
    ],
    cta: 'Start Premium',
    ctaLoggedIn: 'Upgrade to Premium',
    highlight: true,
  },
  {
    name: 'Business',
    dbTier: 'premium' as const,
    price: { monthly: 39, annual: 29 },
    description: 'For resellers & stylists',
    features: [
      '100 tracked items',
      'Email + webhook alerts',
      '5-minute check interval',
      '90-day history',
      'Price drop alerts',
      'Target price alerts',
      'API access',
      'Dedicated support',
    ],
    cta: 'Start Business',
    ctaLoggedIn: 'Upgrade to Business',
    highlight: false,
  },
];

const comparisonRows = [
  ['Tracked items', '3', '25', '100'],
  ['Check interval', '60 min', '15 min', '5 min'],
  ['Alert history', '7 days', '30 days', '90 days'],
  ['Email alerts', '\u2713', '\u2713', '\u2713'],
  ['Price drop alerts', '\u2014', '\u2713', '\u2713'],
  ['Target price alerts', '\u2014', '\u2713', '\u2713'],
  ['Webhooks', '\u2014', '\u2014', '\u2713'],
  ['API access', '\u2014', '\u2014', '\u2713'],
];

const faqs = [
  {
    q: 'Which retailers do you monitor?',
    a: 'Covet works with any product URL \u2014 Shopify stores, independent boutiques, and major luxury retailers like Net-a-Porter, Mytheresa, Ssense, Farfetch, and more. If it has a product page, we can track it.',
  },
  {
    q: 'How fast are the alerts?',
    a: 'On the Business plan, we check every 5 minutes. Premium checks every 15 minutes. For sought-after pieces, even minutes matter \u2014 upgrading significantly improves your odds.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no cancellation fees. Your plan continues until the end of your billing period.',
  },
  {
    q: 'What counts as a \u2018tracked item\u2019?',
    a: 'Each unique product URL is one tracked item. Tracking the same jacket in two different sizes counts as two items.',
  },
  {
    q: 'Do price drop alerts work across all retailers?',
    a: 'Price drop and target price alerts are available on Premium and Business plans, and work on any retailer where we can reliably detect pricing data.',
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { token, user } = useAuth();

  const checkoutMutation = useMutation({
    mutationFn: ({ plan, interval }: { plan: 'basic' | 'premium'; interval: 'monthly' | 'annual' }) =>
      createCheckoutSession(token!, plan, interval),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  return (
    <>
      <SEO
        title="Pricing"
        description="Simple pricing for stock alerts. Free to start, upgrade when you need faster checks and more tracked items."
        path="/pricing"
      />
      {/* Hero */}
      <section className="px-8 pt-24 pb-12 lg:pt-32 lg:pb-16 text-center">
        <div className="mx-auto max-w-[700px]">
          <div className="mb-6 inline-flex items-center gap-3 px-0 py-1 text-[10px] uppercase tracking-[0.3em] text-champagne-gold border-b border-soft-gold">
            Simple pricing
          </div>
          <h1 className="text-5xl md:text-6xl font-light leading-[1.1] text-text-main mb-5 font-display italic">
            Never miss a <span className="not-italic text-champagne-gold">restock</span> again
          </h1>
          <p className="text-lg font-light text-text-muted leading-relaxed max-w-[440px] mx-auto mb-10">
            From casual browsers to dedicated collectors. Pay only for what you need.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-4 bg-white border border-border-light px-5 py-2 rounded-full">
            <span
              className={`text-[11px] uppercase tracking-[0.1em] cursor-pointer transition-colors ${!annual ? 'text-text-main font-medium' : 'text-text-muted'}`}
              onClick={() => setAnnual(false)}
            >
              Monthly
            </span>
            <button
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-champagne-gold/20 border-champagne-gold/50' : 'bg-border-light border-border-light'} border`}
              onClick={() => setAnnual(!annual)}
            >
              <div
                className={`absolute top-[3px] w-[18px] h-[18px] rounded-full transition-all ${annual ? 'left-[26px] bg-champagne-gold' : 'left-[3px] bg-text-muted/30'}`}
              />
            </button>
            <span
              className={`text-[11px] uppercase tracking-[0.1em] cursor-pointer transition-colors ${annual ? 'text-text-main font-medium' : 'text-text-muted'}`}
              onClick={() => setAnnual(true)}
            >
              Annual
            </span>
            {annual && (
              <span className="text-[9px] uppercase tracking-[0.1em] text-white bg-champagne-gold px-2.5 py-1 rounded-full font-medium">
                Save 25%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="px-8 pb-24">
        <div className="mx-auto max-w-[1100px] grid grid-cols-1 md:grid-cols-3 gap-px bg-border-light border border-border-light">
          {plans.map((plan) => {
            const price = annual ? plan.price.annual : plan.price.monthly;
            return (
              <div
                key={plan.name}
                className={`relative p-10 sm:p-12 ${plan.highlight ? 'bg-white' : 'bg-cream'}`}
              >
                {/* Featured badge */}
                {plan.highlight && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px bg-champagne-gold text-white text-[9px] uppercase tracking-[0.15em] px-4 py-1 font-medium">
                    Most popular
                  </div>
                )}

                {/* Plan name */}
                <div className={`text-[10px] uppercase tracking-[0.2em] mb-2 ${plan.highlight ? 'text-champagne-gold' : 'text-text-muted/50'}`}>
                  {plan.name}
                </div>

                {/* Description */}
                <p className="text-sm font-light italic text-text-muted/60 mb-8">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1.5 mb-1">
                  {price > 0 && <span className="text-lg font-light text-text-muted/40">$</span>}
                  <span className="text-5xl font-light font-display text-text-main">
                    {price === 0 ? 'Free' : price}
                  </span>
                  {price > 0 && <span className="text-[11px] text-text-muted/40 tracking-wide">/ mo</span>}
                </div>
                <p className="text-[10px] text-champagne-gold/60 tracking-wide mb-8 min-h-[16px]">
                  {annual && price > 0
                    ? `Billed $${price * 12}/year`
                    : price > 0
                      ? 'Billed monthly'
                      : 'No credit card required'}
                </p>

                {/* CTA */}
                {token && user && plan.dbTier ? (
                  <button
                    onClick={() => checkoutMutation.mutate({ plan: plan.dbTier!, interval: annual ? 'annual' : 'monthly' })}
                    disabled={checkoutMutation.isPending || user.plan === plan.dbTier}
                    className={`block w-full text-center py-3.5 text-[10px] uppercase tracking-[0.15em] font-medium transition-all mb-8 disabled:opacity-50 ${
                      plan.highlight
                        ? 'bg-champagne-gold text-white hover:bg-brand-gold'
                        : 'border border-border-light text-text-main hover:border-text-muted/40 hover:bg-white/50'
                    }`}
                  >
                    {user.plan === plan.dbTier ? 'Current plan' : checkoutMutation.isPending ? 'Redirecting...' : plan.ctaLoggedIn}
                  </button>
                ) : (
                  <Link
                    to={price === 0 ? '/register' : `/register?plan=${plan.name.toLowerCase()}`}
                    className={`block w-full text-center py-3.5 text-[10px] uppercase tracking-[0.15em] font-medium transition-all mb-8 ${
                      plan.highlight
                        ? 'bg-champagne-gold text-white hover:bg-brand-gold'
                        : 'border border-border-light text-text-main hover:border-text-muted/40 hover:bg-white/50'
                    }`}
                  >
                    {token && user && !plan.dbTier ? 'Current plan' : plan.cta}
                  </Link>
                )}

                {/* Divider */}
                <div className="h-px bg-border-light mb-8" />

                {/* Features */}
                <ul className="space-y-3.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm font-light text-text-muted">
                      <span className="text-champagne-gold text-xs mt-0.5 shrink-0">{'\u2726'}</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-8 pb-24">
        <div className="mx-auto max-w-[900px]">
          <p className="text-2xl font-light font-display italic text-text-muted/50 text-center mb-12">
            Compare at a glance
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[10px] uppercase tracking-[0.2em] text-text-muted/40 pb-5 font-medium" />
                  <th className="text-center text-[10px] uppercase tracking-[0.2em] text-text-muted/40 pb-5 font-medium">Free</th>
                  <th className="text-center text-[10px] uppercase tracking-[0.2em] text-text-muted/40 pb-5 font-medium">Premium</th>
                  <th className="text-center text-[10px] uppercase tracking-[0.2em] text-text-muted/40 pb-5 font-medium">Business</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(([feature, free, premium, business]) => (
                  <tr key={feature} className="border-t border-border-light/70">
                    <td className="py-4 text-sm font-light text-text-muted/70 font-display">{feature}</td>
                    <td className={`py-4 text-center text-sm tracking-wide ${free === '\u2014' ? 'text-text-muted/20' : 'text-champagne-gold'}`}>
                      {free}
                    </td>
                    <td className={`py-4 text-center text-sm tracking-wide ${premium === '\u2014' ? 'text-text-muted/20' : 'text-champagne-gold'}`}>
                      {premium}
                    </td>
                    <td className={`py-4 text-center text-sm tracking-wide ${business === '\u2014' ? 'text-text-muted/20' : 'text-champagne-gold'}`}>
                      {business}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-8 pb-24">
        <div className="mx-auto max-w-[720px]">
          <h2 className="text-3xl font-light font-display italic text-text-main text-center mb-14">
            Questions
          </h2>
          {faqs.map((item, i) => (
            <div key={i} className="border-t border-border-light last:border-b">
              <button
                className="w-full flex justify-between items-center gap-4 py-7 text-left group"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="text-base font-light text-text-muted/70 group-hover:text-text-main transition-colors font-display">
                  {item.q}
                </span>
                <span
                  className={`text-xl text-champagne-gold shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-45' : ''}`}
                >
                  +
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openFaq === i ? 'max-h-48 pb-7' : 'max-h-0'
                }`}
              >
                <p className="text-sm font-light text-text-muted leading-relaxed">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 border-t border-border-light text-center px-8">
        <div className="mx-auto max-w-[700px]">
          <p className="text-3xl md:text-4xl font-light font-display italic text-text-muted/40 leading-snug mb-10">
            Start tracking for free.<br />
            <span className="not-italic text-text-main">Upgrade when it matters.</span>
          </p>
          <Link
            to="/register"
            className="inline-block bg-text-main text-white px-10 py-4 text-[10px] uppercase tracking-[0.25em] font-medium hover:bg-black transition-all"
          >
            Create free account
          </Link>
        </div>
      </section>
    </>
  );
}
