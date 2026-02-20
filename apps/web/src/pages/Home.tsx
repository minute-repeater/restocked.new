import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ctaEmail, setCtaEmail] = useState('');

  return (
    <>
      {/* Hero */}
      <section className="relative px-8 pt-24 pb-32 lg:pt-32 lg:pb-48">
        <div className="mx-auto max-w-[1280px] text-center">
          <div className="mb-8 inline-flex items-center gap-3 px-0 py-1 text-[10px] uppercase tracking-[0.3em] text-champagne-gold border-b border-soft-gold">
            Monitoring Luxury &amp; Independent Boutiques
          </div>
          <h1 className="text-5xl md:text-7xl font-light leading-[1.1] text-text-main mb-8 font-display">
            The pieces you love,{' '}
            <span className="italic block">effortlessly secured.</span>
          </h1>
          <p className="text-lg font-light text-text-muted leading-relaxed mb-10 max-w-[560px] mx-auto">
            Delicate monitoring for sought-after drops. We notify you the moment your favorite creator pieces and niche label staples return to stock.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            {user ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto bg-text-main text-white px-10 py-4 text-[10px] uppercase tracking-[0.25em] hover:bg-black transition-all"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                to="/register"
                className="w-full sm:w-auto bg-text-main text-white px-10 py-4 text-[10px] uppercase tracking-[0.25em] hover:bg-black transition-all"
              >
                Request Early Access
              </Link>
            )}
          </div>
          <p className="mt-6 text-[9px] uppercase tracking-[0.2em] text-text-muted">
            Invitations currently limited
          </p>
        </div>
      </section>

      {/* Preview Card */}
      <section className="px-8 pb-32">
        <div className="mx-auto max-w-[700px]">
          <div className="bg-white/70 backdrop-blur-xl rounded-xl p-8 shadow-2xl border border-border-light relative">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm uppercase tracking-widest font-medium">Your Tracked Pieces</h3>
              <span className="text-[9px] uppercase tracking-widest bg-soft-gold text-white px-3 py-1 rounded-full">
                Active Surveillance
              </span>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-border-light">
                <div className="w-16 h-16 bg-cream border border-border-light flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-soft-gold">shopping_bag</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-medium">Structured Leather Tote</h4>
                    <span className="text-xs font-light">$1,250</span>
                  </div>
                  <p className="text-[10px] text-text-muted uppercase tracking-tight mt-1">Noir / One Size</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="text-[9px] uppercase tracking-widest text-red-500">Out of Stock</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 pb-6 border-b border-border-light">
                <div className="w-16 h-16 bg-cream border border-border-light flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-soft-gold">ac_unit</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-medium">Silk-Cashmere Wrap</h4>
                    <span className="text-xs font-light">$450</span>
                  </div>
                  <p className="text-[10px] text-text-muted uppercase tracking-tight mt-1">Champagne / Petite</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[9px] uppercase tracking-widest text-green-600 italic">Restocked!</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-cream border border-border-light flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-soft-gold">flare</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-medium">Artisan Scented Candle</h4>
                    <span className="text-xs font-light text-champagne-gold font-medium">
                      $65 <span className="line-through text-stone-300 ml-1 font-light text-[10px]">$85</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted uppercase tracking-tight mt-1">Santal &amp; Fig / 300g</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="text-[9px] uppercase tracking-widest text-blue-500">Price Drop Alert</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-soft-gold/10 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-champagne-gold/5 rounded-full blur-2xl -z-10" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 bg-cream border-y border-border-light" id="how-it-works">
        <div className="mx-auto max-w-[1280px] px-8 text-center mb-24">
          <h2 className="text-4xl font-light font-display italic mb-4">How It Works</h2>
          <p className="text-[10px] uppercase tracking-[0.4em] text-text-muted">Three steps to securing your desired pieces</p>
        </div>
        <div className="mx-auto max-w-[1000px] px-8">
          <div className="grid sm:grid-cols-3 gap-12">
            {[
              {
                num: '01',
                icon: 'link',
                title: 'The Selection',
                desc: 'Simply paste the link to the item you desire from any luxury Shopify or creator boutique.',
              },
              {
                num: '02',
                icon: 'tune',
                title: 'The Preference',
                desc: 'Specify your exact size and colorway. We monitor with surgical precision, ignoring the noise.',
              },
              {
                num: '03',
                icon: 'notifications_active',
                title: 'The Notification',
                desc: 'Receive a discrete notification the instant your piece is available. Speed, with poise.',
              },
            ].map((step) => (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full border border-border-light flex items-center justify-center mb-8 relative">
                  <span className="material-symbols-outlined text-champagne-gold">{step.icon}</span>
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-text-main text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-lg font-medium font-display mb-4">{step.title}</h3>
                <p className="text-xs text-text-muted font-light leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Boutiques */}
      <section className="py-32 bg-white" id="features">
        <div className="mx-auto max-w-[1200px] px-8 text-center mb-16">
          <h2 className="text-3xl font-light font-display mb-4">Works With Any Retailer</h2>
          <p className="text-[10px] uppercase tracking-[0.4em] text-text-muted">Paste any product link — Shopify stores, independent boutiques, and major retailers</p>
        </div>
        <div className="mx-auto max-w-[800px] px-8">
          <div className="grid grid-cols-3 gap-y-10 gap-x-12 opacity-70">
            {['Shopify Stores', 'Independent Boutiques', 'Major Retailers'].map(
              (name) => (
                <div key={name} className="flex justify-center border-b border-border-light pb-4 text-[11px] uppercase tracking-[0.3em] font-medium text-text-muted">
                  {name}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Pricing / Features */}
      <section className="py-32 bg-cream border-y border-border-light" id="pricing">
        <div className="mx-auto max-w-[1100px] px-8">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <h2 className="text-4xl font-light font-display leading-tight mb-12">
                Sophisticated tools for the discerning collector.
              </h2>
              <div className="space-y-10">
                {[
                  {
                    icon: 'speed',
                    title: 'High-Frequency Scans',
                    desc: 'Our engine monitors boutique inventory every few seconds, providing you the ultimate advantage.',
                  },
                  {
                    icon: 'notifications',
                    title: 'Refined Notifications',
                    desc: 'Instant email alerts that respect your time and attention.',
                  },
                  {
                    icon: 'trending_down',
                    title: 'Valuation Tracking',
                    desc: 'Be notified of subtle price adjustments and seasonal archives returning to the shop floor.',
                  },
                ].map((feat) => (
                  <div key={feat.title} className="flex gap-4">
                    <span className="material-symbols-outlined text-champagne-gold mt-0.5">{feat.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest mb-2">{feat.title}</h4>
                      <p className="text-sm text-text-muted font-light leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-10 shadow-soft border border-border-light">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs uppercase tracking-[0.2em] font-bold">Bespoke Tier</h3>
                <span className="text-[9px] uppercase tracking-widest bg-champagne-gold text-white px-3 py-1 rounded-full">
                  Most Selected
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-light font-display">$9</span>
                <span className="text-xs text-text-muted uppercase tracking-widest">per month</span>
              </div>
              <ul className="space-y-4 mb-10">
                {[
                  'Unlimited Active Tracks',
                  'Priority Check Intervals (5 min)',
                  'Priority Server Processing',
                  '90-Day Price & Stock History',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-text-muted">
                    <span className="material-symbols-outlined text-champagne-gold !text-base">check</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block w-full bg-text-main text-white text-center py-4 text-[10px] uppercase tracking-[0.25em] font-medium hover:bg-black transition-all"
              >
                Begin Your Membership
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-[#F5F2ED] border-t border-border-light">
        <div className="mx-auto max-w-[900px] px-8 text-center">
          <h2 className="text-5xl font-light font-display italic mb-10">Never miss a restock again.</h2>
          <p className="text-lg font-light text-text-muted mb-12">
            Join our early access community of shoppers who value their time as much as their style.
          </p>
          <form
            className="inline-flex flex-col sm:flex-row w-full max-w-md items-center shadow-lg bg-white p-2"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/register${ctaEmail ? `?email=${encodeURIComponent(ctaEmail)}` : ''}`);
            }}
          >
            <input
              className="w-full h-14 border-none focus:ring-0 px-6 font-light text-sm bg-transparent"
              placeholder="Email Address"
              type="email"
              value={ctaEmail}
              onChange={(e) => setCtaEmail(e.target.value)}
            />
            <button
              type="submit"
              className="w-full sm:w-auto h-14 px-8 bg-text-main text-white text-[10px] uppercase tracking-[0.3em] font-medium hover:bg-black transition-all whitespace-nowrap"
            >
              Request Early Access
            </button>
          </form>
          <p className="mt-8 text-[9px] uppercase tracking-[0.2em] text-text-muted">
            Invitations currently limited to maintain quality of service
          </p>
        </div>
      </section>
    </>
  );
}
