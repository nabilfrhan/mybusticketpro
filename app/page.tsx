import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SearchForm } from "@/components/search-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Clock, CreditCard, Headphones, MapPin, Star } from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "Safe & Secure",
    description: "Travel with confidence. All our buses meet safety standards.",
  },
  {
    icon: Clock,
    title: "On-Time Departures",
    description: "Punctual service with real-time tracking available.",
  },
  {
    icon: CreditCard,
    title: "Easy Payments",
    description: "Multiple payment options including cards and digital wallets.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Our support team is always ready to assist you.",
  },
]

const popularRoutes = [
  { from: "Kuala Lumpur", to: "Melaka", price: 35, duration: "1h 52m" },
  { from: "Ipoh", to: "Penang", price: 55, duration: "1h 58m" },
  { from: "Johor", to: "Kuantan", price: 50, duration: "4h 4m" },
]

const testimonials = [
  {
    name: "Sarah Johnson",
    rating: 5,
    comment: "Excellent service! The bus was clean and comfortable. Will definitely book again.",
  },
  {
    name: "Michael Chen",
    rating: 5,
    comment: "Very easy to book online. The journey was smooth and arrived on time.",
  },
  {
    name: "Emily Rodriguez",
    rating: 4,
    comment: "Great value for money. The staff was friendly and helpful throughout.",
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-primary px-4 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 text-center text-primary-foreground">
              <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl text-balance">
                Book Your Bus Journey Today
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-primary-foreground/80">
                Travel comfortably across the country with our reliable bus services. 
                Find the best routes, compare prices, and book your tickets in minutes.
              </p>
            </div>
            <div className="mx-auto max-w-4xl">
              <SearchForm />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
              Why Choose MyBusTicket Pro?
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card key={feature.title} className="text-center">
                  <CardHeader>
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Routes Section */}
        <section className="bg-muted px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
              Popular Routes
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {popularRoutes.map((route, index) => (
                <Card key={index} className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">
                          {route.from} to {route.to}
                        </p>
                        <p className="text-sm text-muted-foreground">{route.duration}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">RM{route.price}</p>
                      <p className="text-xs text-muted-foreground">starting from</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
              What Our Customers Say
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="mb-4 flex gap-1">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="mb-4 text-muted-foreground">{`"${testimonial.comment}"`}</p>
                    <p className="font-medium text-foreground">- {testimonial.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary px-4 py-16">
          <div className="mx-auto max-w-3xl text-center text-primary-foreground">
            <h2 className="mb-4 text-3xl font-bold">Ready to Start Your Journey?</h2>
            <p className="mb-8 text-primary-foreground/80">
              Join thousands of satisfied travelers who book with MyBusTicket Pro. 
              Sign up today and get 10% off your first booking!
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
