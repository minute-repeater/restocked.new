import { Check, ArrowRight } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out Restocked.now',
    features: [
      'Track up to 3 products',
      'Email notifications',
      'Price & stock history',
      'Basic alerts',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: 'per month',
    description: 'For serious product trackers',
    features: [
      'Unlimited product tracking',
      'Email notifications',
      'Price & stock history',
      'Advanced price alerts',
      'Priority support',
      'Export data',
    ],
    cta: 'Coming Soon',
    popular: true,
    comingSoon: true,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free. Upgrade when you need more. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-card p-8 rounded-2xl border-2 ${
                plan.popular
                  ? 'border-primary shadow-xl scale-105'
                  : 'border-border shadow-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.period !== 'forever' && (
                    <span className="text-muted-foreground">/{plan.period}</span>
                  )}
                </div>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.comingSoon ? '#' : (import.meta.env.VITE_APP_URL ? `${import.meta.env.VITE_APP_URL}/register` : "/register")}
                className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:bg-primary-dark'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                } ${plan.comingSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={(e) => plan.comingSoon && e.preventDefault()}
              >
                {plan.comingSoon ? (
                  plan.cta
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            All plans include our core features. No credit card required to start.
          </p>
          <a href={import.meta.env.VITE_APP_URL ? `${import.meta.env.VITE_APP_URL}/register` : "/register"} className="text-primary hover:text-primary-dark font-semibold">
            Start tracking products now →
          </a>
        </div>
      </div>
    </section>
  )
}

