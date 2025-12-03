import { Bell, TrendingDown, History, Shield, Zap } from 'lucide-react'

const features = [
  {
    icon: Bell,
    title: 'Instant Notifications',
    description: 'Get real-time alerts via email when products restock or prices change. Never miss a deal again.',
  },
  {
    icon: TrendingDown,
    title: 'Price Drop Alerts',
    description: 'Set your price threshold and get notified when products drop below your target price.',
  },
  {
    icon: History,
    title: 'Price & Stock History',
    description: 'Track price trends and stock patterns over time. See when products typically restock or go on sale.',
  },
  {
    icon: Zap,
    title: 'Automatic Tracking',
    description: 'We check your products multiple times per day automatically. No manual work required.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data is encrypted and secure. We never share your watchlist or personal information.',
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Never Miss Out
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to make product tracking effortless and reliable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

