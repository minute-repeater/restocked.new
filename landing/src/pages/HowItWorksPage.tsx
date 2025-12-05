import { Link2, Settings, Zap, Bell, LayoutDashboard, ShoppingCart, ArrowRight } from 'lucide-react'

export function HowItWorksPage() {
  return (
    <main className="pt-16">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-primary/5">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
              A smarter way to track availability and prices
            </h1>
          </div>
        </section>

        {/* Steps Content */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="container mx-auto max-w-4xl">
            <div className="space-y-16">
              {/* Step 1 */}
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-2xl font-bold">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Link2 className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Add a Product</h2>
                  <p className="text-lg text-muted-foreground">
                    Paste any product URL from supported stores. Restocked.now automatically identifies the item and pulls in the essential details.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-2xl font-bold">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Settings className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Choose Monitoring Settings</h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    Customize how closely the item is watched:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Check frequency</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Monitoring mode</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Optional email backup notifications</span>
                    </li>
                  </ul>
                  <p className="text-lg text-muted-foreground mt-4">
                    Your preferences are saved instantly.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-2xl font-bold">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">We Track in the Background</h2>
                  <p className="text-lg text-muted-foreground">
                    Restocked.now checks stock levels and pricing at your chosen interval. No need to keep the app open or refresh anything.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-2xl font-bold">
                    4
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Bell className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Get Instant Alerts</h2>
                  <p className="text-lg text-muted-foreground">
                    As soon as a restock or price drop happens, you're notified. Push notifications + optional email backup.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-2xl font-bold">
                    5
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <LayoutDashboard className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Review Updates & History</h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    Your dashboard shows:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Real-time status</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Recent price movement</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Past checks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>When the product last changed availability</span>
                    </li>
                  </ul>
                  <p className="text-lg text-muted-foreground mt-4">
                    Everything stays clean and easy to scan.
                  </p>
                </div>
              </div>

              {/* Step 6 */}
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-2xl font-bold">
                    6
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Take Action When the Time Is Right</h2>
                  <p className="text-lg text-muted-foreground">
                    With timely alerts, you can jump on limited drops, avoid markups, or finally buy that item when it hits your target price.
                  </p>
                </div>
              </div>
            </div>

            {/* Closing Statement */}
            <div className="mt-20 text-center">
              <p className="text-2xl font-semibold text-foreground mb-8">
                No clutter. No noise. Just actionable alerts when they matter.
              </p>
              <a
                href={import.meta.env.VITE_APP_URL ? `${import.meta.env.VITE_APP_URL}/register` : "/register"}
                className="inline-flex items-center px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl"
              >
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </div>
          </div>
        </section>
      </main>
  )
}
