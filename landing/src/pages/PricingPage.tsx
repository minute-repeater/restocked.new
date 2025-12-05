import { Check, ArrowRight } from 'lucide-react'

export function PricingPage() {
  return (
    <main className="pt-16">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-primary/5">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
              Simple, transparent plans
            </h1>
          </div>
        </section>

        {/* Pricing Content */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
              {/* Free Plan */}
              <div className="bg-card p-8 rounded-2xl border-2 border-border shadow-sm">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Free Plan</h3>
                  <p className="text-muted-foreground mb-4">Perfect for casual users tracking a few items.</p>
                </div>

                <div className="mb-8">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-2 mb-2">
                      <span className="text-4xl font-bold text-foreground">$0</span>
                    </div>
                    <p className="text-muted-foreground text-sm">No credit card needed</p>
                  </div>

                  <p className="text-foreground font-semibold mb-4">Includes:</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">Track up to 3 items</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">Hourly product checks</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">Restock alerts</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">Price change alerts</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">Optional email notifications</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">Full history & monitoring dashboard</span>
                    </li>
                  </ul>
                </div>

                <a
                  href={import.meta.env.VITE_APP_URL ? `${import.meta.env.VITE_APP_URL}/register` : "/register"}
                  className="block w-full text-center px-6 py-3 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80 transition-colors"
                >
                  Get Started
                </a>
              </div>

              {/* Pro Plan */}
              <div className="relative bg-card p-8 rounded-2xl border-2 border-primary shadow-xl scale-105">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Pro Plan</h3>
                  <p className="text-muted-foreground mb-4">Ideal for power users and deal hunters who want faster checks and unlimited tracking.</p>
                </div>

                <div className="mb-8">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-2 mb-2">
                      <span className="text-4xl font-bold text-foreground">$4.99</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-muted-foreground text-sm">or $39/year (save 35%)</p>
                  </div>

                  <p className="text-foreground font-semibold mb-4">Includes everything in Free, plus:</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">Unlimited tracked items</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">Faster check frequencies:</span>
                    </li>
                    <li className="flex items-start gap-3 pl-8">
                      <span className="text-muted-foreground">• Every 30 minutes</span>
                    </li>
                    <li className="flex items-start gap-3 pl-8">
                      <span className="text-muted-foreground">• Every 15 minutes</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">Priority monitoring queue</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">Early access to new features</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">Advanced insights (future expansion)</span>
                    </li>
                  </ul>
                </div>

                <a
                  href={import.meta.env.VITE_APP_URL ? `${import.meta.env.VITE_APP_URL}/register` : "/register"}
                  className="block w-full text-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                >
                  <span className="flex items-center justify-center gap-2">
                    Upgrade to Pro
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </a>
              </div>
            </div>

            {/* Why Upgrade Section */}
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">Why Upgrade?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Faster checks = faster alerts. If you care about limited drops, quick sellouts, or price fluctuations, Pro gives you a real advantage.
              </p>
              <p className="text-muted-foreground">
                No hidden fees. Cancel anytime.
              </p>
            </div>
          </div>
        </section>
      </main>
  )
}
