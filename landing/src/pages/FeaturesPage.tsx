import { Bell, TrendingDown, Settings, Clock, Mail, Link2, LayoutDashboard, History, Shield } from 'lucide-react'

export function FeaturesPage() {
  return (
    <main className="pt-16">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-primary/5">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
              Everything you care about, monitored automatically
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Restocked.now keeps an eye on the products you want so you don't waste time checking pages over and over. Add an item once, and we handle the rest.
            </p>
          </div>
        </section>

        {/* Features Content */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="container mx-auto max-w-6xl">
            <div className="space-y-20">
              {/* Real-Time Restock Tracking */}
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                    <Bell className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Real-Time Restock Tracking</h2>
                  <p className="text-lg text-muted-foreground">
                    Get notified the moment an item comes back in stock. No more manually refreshing product pages or missing limited drops.
                  </p>
                </div>
              </div>

              {/* Price Change Monitoring */}
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                    <TrendingDown className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Price Change Monitoring</h2>
                  <p className="text-lg text-muted-foreground">
                    Know instantly when prices move—up or down. Whether you're waiting for a sale or avoiding unnecessary markups, Restocked.now keeps you in the loop.
                  </p>
                </div>
              </div>

              {/* Smart Tracking Modes */}
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                    <Settings className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Smart Tracking Modes</h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    Choose how you want an item monitored:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">Whole Product</strong> – Track availability and pricing of the entire listing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong className="text-foreground">(Optional future mode) Variant Tracking</strong> – Size, color, or style-specific checks</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Custom Check Frequencies */}
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Custom Check Frequencies</h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    Decide how often Restocked.now checks each product:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Every hour (Free)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Every 30 minutes (Pro)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Every 15 minutes (Pro)</span>
                    </li>
                  </ul>
                  <p className="text-lg text-muted-foreground mt-4">
                    Faster checks mean faster alerts.
                  </p>
                </div>
              </div>

              {/* Email Backup Alerts */}
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Email Backup Alerts</h2>
                  <p className="text-lg text-muted-foreground">
                    Add an optional email to ensure you never miss an important notification—even if you're offline.
                  </p>
                </div>
              </div>

              {/* Simple Add-Item Flow */}
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                    <Link2 className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Simple Add-Item Flow</h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    Just paste a product URL and Restocked.now automatically:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Detects the store</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Pulls product details</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Begins monitoring instantly</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Clean Dashboard Overview */}
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                    <LayoutDashboard className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Clean Dashboard Overview</h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    See everything at a glance:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Items being tracked</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Current stock status</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Recent price changes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>When each product was last checked</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* History & Trends */}
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                    <History className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">History & Trends</h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    Restocked.now automatically logs:
                  </p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>When an item went in/out of stock</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Recent price movement</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Check history for transparency</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Privacy-Respecting & Lightweight */}
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">Privacy-Respecting & Lightweight</h2>
                  <p className="text-lg text-muted-foreground">
                    We don't need personal data beyond optional notification details. No tracking, no clutter—just product monitoring done right.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
  )
}
