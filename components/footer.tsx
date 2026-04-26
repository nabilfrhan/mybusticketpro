import Link from "next/link"
import { Bus, Facebook, Twitter, Instagram, Mail, Phone, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Bus className="h-8 w-8" />
              <span className="text-xl font-bold">MyBusTicket Pro</span>
            </Link>
            <p className="text-sm text-background/70">
              Your trusted partner for comfortable and affordable bus travel across the country.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-background/70 hover:text-background">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-background/70 hover:text-background">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-background/70 hover:text-background">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/search" className="text-sm text-background/70 hover:text-background">
                Search Buses
              </Link>
              <Link href="/routes" className="text-sm text-background/70 hover:text-background">
                Popular Routes
              </Link>
              <Link href="/about" className="text-sm text-background/70 hover:text-background">
                About Us
              </Link>
              <Link href="/faq" className="text-sm text-background/70 hover:text-background">
                FAQ
              </Link>
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Support</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/help" className="text-sm text-background/70 hover:text-background">
                Help Center
              </Link>
              <Link href="/refund" className="text-sm text-background/70 hover:text-background">
                Refund Policy
              </Link>
              <Link href="/terms" className="text-sm text-background/70 hover:text-background">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-sm text-background/70 hover:text-background">
                Privacy Policy
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Us</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-background/70">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-background/70">
                <Mail className="h-4 w-4" />
                <span>support@mybusticket.pro</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-background/70">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>123 Transport Street, City, State 12345</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-background/20 pt-8 text-center text-sm text-background/70">
          <p>&copy; {new Date().getFullYear()} MyBusTicket Pro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
