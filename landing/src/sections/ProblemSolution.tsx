import { X, Check } from 'lucide-react'

export function ProblemSolution() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Problem Column */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Tired of Missing Out?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              We've all been there. You find the perfect product, but it's out of stock. Or you see a great deal, but by the time you check back, the price has gone up.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <X className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Manual Checking is Exhausting</h3>
                  <p className="text-muted-foreground">
                    Constantly refreshing product pages, checking multiple websites, and still missing restocks.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <X className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Price Drops Happen When You're Not Looking</h3>
                  <p className="text-muted-foreground">
                    Sales and discounts come and go while you're busy with life. You only find out when it's too late.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <X className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">No Way to Track History</h3>
                  <p className="text-muted-foreground">
                    Can't see price trends or stock patterns. Making decisions without data is frustrating.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Solution Column */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Restocked.now Solves This
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              We automate everything. Just add products to your watchlist, and we'll handle the rest. Get instant notifications when something changes.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Automatic Monitoring</h3>
                  <p className="text-muted-foreground">
                    We check your products multiple times per day. No manual work required—set it and forget it.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Instant Alerts</h3>
                  <p className="text-muted-foreground">
                    Get notified immediately when products restock or prices drop. Never miss an opportunity again.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Price & Stock History</h3>
                  <p className="text-muted-foreground">
                    See price trends over time and stock availability patterns. Make informed decisions with data.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">One Watchlist, All Your Products</h3>
                  <p className="text-muted-foreground">
                    Track products from any website in one place. Manage everything from your dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

