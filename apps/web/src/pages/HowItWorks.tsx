import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

const steps = [
  {
    number: '01',
    icon: 'link',
    title: 'Paste a product URL',
    body: 'Find something you love on any luxury retailer or independent boutique. Copy the product URL and paste it into Covet.',
    detail: 'Works with any product page — including specific size and colour variants.',
  },
  {
    number: '02',
    icon: 'tune',
    title: 'Set your preferences',
    body: 'Choose whether you want back-in-stock alerts, price drop notifications, or a target price. We only notify you when your exact condition is met.',
    detail: 'Set a target price and we alert you the moment it drops to your number.',
  },
  {
    number: '03',
    icon: 'schedule',
    title: 'We monitor, you live your life',
    body: 'Our checker runs every 5\u201360 minutes depending on your plan. The moment something changes, we fire an alert straight to your inbox.',
    detail: 'No refreshing. No checking. Just a notification when it matters.',
  },
  {
    number: '04',
    icon: 'bolt',
    title: 'Buy before it\u2019s gone again',
    body: 'Your alert includes a direct link to the product. One tap and you\u2019re at checkout \u2014 while everyone else is still refreshing.',
    detail: 'Speed is everything with limited-run pieces.',
  },
];

const alertTypes = [
  {
    icon: 'inventory_2',
    label: 'Back in stock',
    desc: 'Item was unavailable. Now it\u2019s not. You\u2019re first to know.',
  },
  {
    icon: 'trending_down',
    label: 'Price drop',
    desc: 'Price fell 5% or more from the last check. Time to reconsider.',
  },
  {
    icon: 'my_location',
    label: 'Target price',
    desc: 'You named your price. We tell you when it hits.',
  },
];

const retailers = [
  'Net-a-Porter', 'Mytheresa', 'Ssense', 'Browns', 'Farfetch',
  'Selfridges', 'Harvey Nichols', 'Luisaviaroma', 'Bergdorf Goodman',
  'Saks Fifth Avenue', 'Shopify Stores', 'Independent Boutiques',
];

export function HowItWorks() {
  return (
    <>
      <SEO
        title="How It Works"
        description="Learn how Covet monitors luxury boutiques and notifies you the instant items restock or drop in price. Four simple steps to securing your desired pieces."
        path="/how-it-works"
      />
      {/* Hero */}
      <section className="px-8 pt-24 pb-16 lg:pt-32 lg:pb-20">
        <div className="mx-auto max-w-[900px] text-center">
          <div className="mb-6 inline-flex items-center gap-3 px-0 py-1 text-[10px] uppercase tracking-[0.3em] text-champagne-gold border-b border-soft-gold">
            How it works
          </div>
          <h1 className="text-5xl md:text-7xl font-light leading-[1.05] text-text-main mb-6 font-display">
            Four steps.{' '}
            <span className="italic text-text-muted/40">One obsession.</span>
          </h1>
          <p className="text-lg font-light text-text-muted leading-relaxed max-w-[520px] mx-auto">
            Covet watches the pages you can't. The moment something changes, you're the first to know.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="px-8 pb-24">
        <div className="mx-auto max-w-[1100px]">
          {steps.map((step) => (
            <div
              key={step.number}
              className="grid grid-cols-1 md:grid-cols-[80px_1fr_1fr] gap-4 md:gap-x-16 items-start py-16 border-t border-border-light last:border-b"
            >
              {/* Number */}
              <div className="text-[11px] tracking-[0.15em] text-champagne-gold/50 font-medium pt-1">
                {step.number}
              </div>

              {/* Title + Body */}
              <div>
                <h2 className="text-2xl md:text-3xl font-light text-text-main font-display leading-tight mb-4">
                  {step.title}
                </h2>
                <p className="text-base font-light text-text-muted leading-relaxed">
                  {step.body}
                </p>
              </div>

              {/* Detail sidebar */}
              <div className="md:border-l border-champagne-gold/20 md:pl-5 pt-4 md:pt-1 border-t md:border-t-0 border-border-light">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-champagne-gold !text-lg mt-0.5">{step.icon}</span>
                  <p className="text-sm text-champagne-gold/70 leading-relaxed font-light">
                    {step.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Alert Types */}
      <section className="py-24 bg-white border-y border-border-light">
        <div className="mx-auto max-w-[1100px] px-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-muted text-center mb-16">
            Alert types
          </p>
          <div className="grid sm:grid-cols-3 gap-px bg-border-light border border-border-light max-w-[900px] mx-auto">
            {alertTypes.map((a) => (
              <div key={a.label} className="bg-cream p-10 sm:p-12">
                <span className="material-symbols-outlined text-champagne-gold !text-3xl mb-6 block">
                  {a.icon}
                </span>
                <h3 className="text-xl font-light font-display text-text-main mb-3">{a.label}</h3>
                <p className="text-sm font-light text-text-muted leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Retailers */}
      <section className="py-24 px-8">
        <div className="mx-auto max-w-[860px] text-center">
          <h2 className="text-3xl font-light font-display text-text-muted mb-2">
            Works with <span className="text-text-main italic">any retailer</span>
          </h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted/60 mb-12">
            Paste any product URL. More retailers tested regularly.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {retailers.map((r) => (
              <span
                key={r}
                className="text-[10px] uppercase tracking-[0.1em] text-text-muted/50 border border-border-light px-4 py-2 hover:text-text-muted hover:border-text-muted/30 transition-all bg-cream"
              >
                {r}
              </span>
            ))}
          </div>
          <p className="mt-6 text-[10px] tracking-[0.1em] text-champagne-gold/60">
            + many more independent stores
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white border-t border-border-light text-center px-8">
        <div className="mx-auto max-w-[700px]">
          <h2 className="text-4xl md:text-5xl font-light font-display text-text-main mb-4">
            Ready to stop<br />
            <span className="italic text-text-muted/40">missing out?</span>
          </h2>
          <p className="text-base font-light text-text-muted mb-10">
            Free to start. No credit card required.
          </p>
          <div className="flex flex-wrap gap-4 justify-center items-center">
            <Link
              to="/register"
              className="bg-text-main text-white px-10 py-4 text-[10px] uppercase tracking-[0.25em] font-medium hover:bg-black transition-all"
            >
              Start tracking free
            </Link>
            <Link
              to="/pricing"
              className="text-[10px] uppercase tracking-[0.15em] font-medium text-text-muted hover:text-text-main transition-colors px-6 py-4"
            >
              View pricing &rarr;
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
