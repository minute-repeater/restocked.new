import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah M.',
    role: 'Fashion Enthusiast',
    content: 'I finally got that limited edition bag I wanted! Restocked.now notified me the moment it came back in stock. Game changer!',
    rating: 5,
  },
  {
    name: 'Michael T.',
    role: 'Tech Shopper',
    content: 'Saved over $200 on a graphics card by tracking the price. The price history feature helped me know when to buy.',
    rating: 5,
  },
  {
    name: 'Emma L.',
    role: 'Home Decor Lover',
    content: 'No more checking websites every day. Restocked.now does all the work for me. So convenient!',
    rating: 5,
  },
]

export function SocialProof() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Loved by Early Users
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of users who never miss a restock or price drop
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card p-6 rounded-xl border border-border"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <Quote className="h-8 w-8 text-muted-foreground/30 mb-4" />
              <p className="text-foreground mb-6 italic">
                "{testimonial.content}"
              </p>
              <div>
                <p className="font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badge */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-4">Trusted by users tracking products from</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            <div className="text-muted-foreground font-semibold">Amazon</div>
            <div className="text-muted-foreground font-semibold">Shopify Stores</div>
            <div className="text-muted-foreground font-semibold">Brand Websites</div>
            <div className="text-muted-foreground font-semibold">E-commerce Sites</div>
          </div>
        </div>
      </div>
    </section>
  )
}

