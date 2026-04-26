"use client"

import { useEffect, useState, Suspense, use } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Bus,
  Clock,
  MapPin,
  Calendar,
  ArrowRight,
  User,
  Mail,
  Phone,
  CreditCard,
  CheckCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface TripDetails {
  operator: string
  departureTime: string
  arrivalTime: string
  duration: string
  busType: string
}

interface PassengerDetails {
  seat: string
  name: string
  email: string
  phone: string
  gender: string
  age: string
}

function ConfirmationContent({ busId }: { busId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const from = searchParams.get("from") || "New York"
  const to = searchParams.get("to") || "Boston"
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0]
  const seats = searchParams.get("seats")?.split(",").filter(Boolean) || []
  const total = Number(searchParams.get("total") || "0")
  const checkoutStatus = searchParams.get("checkout")
  const sessionId = searchParams.get("session_id")
  const returnStep = searchParams.get("step")

  const [step, setStep] = useState<"details" | "payment" | "success">(
    returnStep === "payment" ? "payment" : "details",
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [tripDetails, setTripDetails] = useState<TripDetails>({
    operator: "-",
    departureTime: "-",
    arrivalTime: "-",
    duration: "-",
    busType: "Bus",
  })
  const [passengerDetails, setPassengerDetails] = useState<PassengerDetails[]>(
    seats.map((seat) => ({
      seat,
      name: "",
      email: "",
      phone: "",
      gender: "",
      age: "",
    })),
  )
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [bookingId, setBookingId] = useState("")

  const normalizePassenger = (passenger: PassengerDetails) => ({
    seat: passenger.seat.trim().toUpperCase(),
    name: passenger.name.trim(),
    email: passenger.email.trim().toLowerCase(),
    phone: passenger.phone.replace(/\D/g, ""),
    gender: passenger.gender.trim().toLowerCase(),
    age: passenger.age.trim(),
  })

  const validatePassengerDetails = () => {
    if (passengerDetails.length === 0) {
      return "No passengers found for this booking."
    }

    const seenPassengers = new Set<string>()

    for (const rawPassenger of passengerDetails) {
      const passenger = normalizePassenger(rawPassenger)

      // SR2: syntactic and semantic validation for all passenger input.
      if (
        !passenger.name ||
        !passenger.email ||
        !passenger.phone ||
        !passenger.gender ||
        !passenger.age
      ) {
        return "Please fill in all passenger details."
      }

      // SR5: enforce strict field length and digit limits before any write.
      if (passenger.name.length > 100) {
        return "Passenger name must be 100 characters or fewer."
      }

      if (passenger.email.length > 255) {
        return "Passenger email must be 255 characters or fewer."
      }

      if (passenger.phone.length < 8 || passenger.phone.length > 15) {
        return "Passenger phone must contain 8 to 15 digits."
      }

      const ageNumber = Number(passenger.age)
      if (!Number.isInteger(ageNumber) || ageNumber < 1 || ageNumber > 120) {
        return "Passenger age must be a valid whole number between 1 and 120."
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(passenger.email)) {
        return "Please enter a valid passenger email address."
      }

      const duplicateKey = `${passenger.name}|${passenger.email}|${passenger.phone}`
      if (seenPassengers.has(duplicateKey)) {
        return "Each selected seat must have different passenger details."
      }

      seenPassengers.add(duplicateKey)
    }

    return null
  }

  useEffect(() => {
    const ensureSignedIn = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/signin")
        return
      }

      setIsCheckingAuth(false)
    }

    ensureSignedIn()
  }, [router])

  useEffect(() => {
    if (isCheckingAuth) return

    const fetchTripDetails = async () => {
      const { data: schedule, error: scheduleError } = await supabase
        .from("schedules")
        .select("route_id, departure_time, arrival_time")
        .eq("id", busId)
        .single()

      if (scheduleError || !schedule) {
        console.error("Fetch confirm schedule error:", scheduleError)
        return
      }

      const { data: route, error: routeError } = await supabase
        .from("routes")
        .select("operator_id, route_name, duration")
        .eq("id", schedule.route_id)
        .single()

      if (routeError || !route) {
        console.error("Fetch confirm route error:", routeError)
        return
      }

      const { data: operator, error: operatorError } = await supabase
        .from("operators")
        .select("name")
        .eq("id", route.operator_id)
        .single()

      if (operatorError) {
        console.error("Fetch confirm operator error:", operatorError)
      }

      setTripDetails({
        operator: operator?.name || "-",
        departureTime: new Date(schedule.departure_time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        arrivalTime: new Date(schedule.arrival_time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        duration: route.duration || "-",
        busType: route.route_name || "Bus",
      })
    }

    fetchTripDetails()
  }, [busId, isCheckingAuth])

  useEffect(() => {
    if (isCheckingAuth || checkoutStatus !== "success" || !sessionId) return

    const finalizeStripePayment = async () => {
      setIsLoading(true)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const accessToken = session?.access_token
        if (!accessToken) {
          alert("Please sign in again to verify your payment.")
          router.replace("/signin")
          return
        }

        const response = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ sessionId }),
        })

        const result = await response.json()

        if (!response.ok) {
          alert(result.error || "Failed to confirm payment.")
          return
        }

        setBookingId(result.bookingId || sessionId)
        setStep("success")
      } catch (error) {
        console.error("Finalize Stripe payment error:", error)
        alert("Failed to confirm payment.")
      } finally {
        setIsLoading(false)
      }
    }

    finalizeStripePayment()
  }, [checkoutStatus, isCheckingAuth, router, sessionId])

  const handlePassengerChange = (index: number, field: string, value: string) => {
    setPassengerDetails((prev) =>
      prev.map((passenger, passengerIndex) =>
        passengerIndex === index
          ? { ...passenger, [field]: value }
          : passenger,
      ),
    )
  }

  const startStripeCheckout = async () => {
    if (seats.length === 0) {
      alert("No seats selected")
      return
    }

    const validationError = validatePassengerDetails()
    if (validationError) {
      alert(validationError)
      setStep("details")
      return
    }

    setIsLoading(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const accessToken = session?.access_token
      if (!accessToken) {
        alert("Please sign in to complete your booking")
        router.replace("/signin")
        return
      }

      const response = await fetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          scheduleId: busId,
          seats,
          passengerDetails,
          from,
          to,
          date,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.url) {
        alert(result.error || "Unable to start payment.")
        return
      }

      window.location.href = result.url
    } catch (error) {
      // SR4: keep internal details in logs and only show generic messages in UI.
      console.error("Start Stripe checkout error:", error)
      alert("Unable to start payment.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueToPayment = async () => {
    const validationError = validatePassengerDetails()

    if (validationError) {
      alert(validationError)
      return
    }

    await startStripeCheckout()
  }

  const handleConfirmBooking = async () => {
    await startStripeCheckout()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Bus className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (step === "success") {
    return (
      <div className="flex min-h-screen flex-col">
        
        <main className="flex flex-1 items-center justify-center bg-muted px-4 py-12">
          <Card className="w-full max-w-lg text-center">
            <CardContent className="pt-8">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                Booking Confirmed!
              </h1>
              <p className="mb-6 text-muted-foreground">
                Your booking has been successfully confirmed. A confirmation email
                has been sent to your registered email address.
              </p>

              <div className="mb-6 rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Booking ID</p>
                <p className="text-xl font-bold text-primary">{bookingId}</p>
              </div>

              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Route</span>
                  <span className="font-medium">{from} to {to}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{formatDate(date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Departure</span>
                  <span className="font-medium">{tripDetails.departureTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seats</span>
                  <span className="font-medium">{seats.join(", ")}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Total Paid</span>
                  <span className="font-bold text-primary">
                    RM{(total + 5).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 print:hidden">
                <Button onClick={() => window.print()}>Download Ticket</Button>
                <Link href="/">
                  <Button variant="outline" className="w-full">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
        
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Link href={`/booking/${busId}?from=${from}&to=${to}&date=${date}`}>
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Seat Selection
            </Button>
          </Link>

          <div className="mb-8 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  step === "details"
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/20 text-primary"
                }`}
              >
                1
              </div>
              <span className="hidden text-sm font-medium sm:inline">
                Passenger Details
              </span>
            </div>
            <div className="h-px w-12 bg-border" />
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  step === "payment"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </div>
              <span className="hidden text-sm font-medium sm:inline">
                Payment
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {step === "details" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Passenger Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {passengerDetails.map((passenger, index) => (
                      <div
                        key={passenger.seat}
                        className="space-y-4 rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Seat {passenger.seat}</Badge>
                          <span className="text-sm text-muted-foreground">
                            Passenger {index + 1}
                          </span>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Full Name</label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="Enter full name"
                                value={passenger.name}
                                onChange={(e) =>
                                  handlePassengerChange(index, "name", e.target.value)
                                }
                                className="pl-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="email"
                                placeholder="Enter email"
                                value={passenger.email}
                                onChange={(e) =>
                                  handlePassengerChange(index, "email", e.target.value)
                                }
                                className="pl-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Phone</label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="tel"
                                placeholder="Enter phone"
                                value={passenger.phone}
                                onChange={(e) =>
                                  handlePassengerChange(index, "phone", e.target.value)
                                }
                                className="pl-10"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Gender</label>
                              <Select
                                value={passenger.gender}
                                onValueChange={(value) =>
                                  handlePassengerChange(index, "gender", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="male">Male</SelectItem>
                                  <SelectItem value="female">Female</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Age</label>
                              <Input
                                type="number"
                                placeholder="Age"
                                min="1"
                                max="120"
                                value={passenger.age}
                                onChange={(e) =>
                                  handlePassengerChange(index, "age", e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button className="w-full" onClick={handleContinueToPayment}>
                      Continue to Payment
                    </Button>
                  </CardContent>
                </Card>
              )}

              {step === "payment" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                      {["card", "paypal", "gpay"].map((method) => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`rounded-lg border p-4 text-center transition-colors ${
                            paymentMethod === method
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground"
                          }`}
                        >
                          <p className="font-medium capitalize">
                            {method === "card"
                              ? "Credit Card"
                              : method === "paypal"
                                ? "PayPal"
                                : "Google Pay"}
                          </p>
                        </button>
                      ))}
                    </div>

                    {paymentMethod === "card" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Card Number</label>
                          <Input placeholder="1234 5678 9012 3456" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Expiry Date</label>
                            <Input placeholder="MM/YY" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">CVV</label>
                            <Input type="password" placeholder="***" maxLength={4} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Name on Card</label>
                          <Input placeholder="Enter name as on card" />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setStep("details")}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleConfirmBooking}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        {isLoading ? "Processing..." : `Pay $${(total + 5).toFixed(2)}`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trip Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(date)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="font-bold text-foreground">
                        {tripDetails.departureTime}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {from}
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {tripDetails.duration}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-foreground">
                        {tripDetails.arrivalTime}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {to}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground">Operator</p>
                    <p className="font-medium">{tripDetails.operator}</p>
                    <Badge variant="secondary" className="mt-1">
                      {tripDetails.busType}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Price Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selected Seats:</p>
                    <div className="flex flex-wrap gap-2">
                      {seats.map((seat) => (
                        <Badge key={seat} variant="outline">
                          {seat}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Seats ({seats.length})</span>
                      <span>RM{total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Service Fee</span>
                      <span>RM5.00</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span>Total</span>
                      <span className="text-primary">RM{(total + 5).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function ConfirmBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Bus className="mx-auto h-12 w-12 animate-pulse text-primary" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ConfirmationContent busId={resolvedParams.id} />
    </Suspense>
  )
}
