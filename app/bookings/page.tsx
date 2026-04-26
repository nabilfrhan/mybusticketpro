"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import {
  Bus,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  User,
  ArrowRight,
} from "lucide-react"

interface BookingRow {
  id: string
  schedule_id: string
  seat_number: string
  status: string
  created_at: string
}

interface ScheduleRow {
  id: string
  route_id: string
  departure_time: string
  arrival_time: string
}

interface RouteRow {
  id: string
  operator_id: string
  route_name: string
  from_city: string
  to_city: string
  duration: string
}

interface OperatorRow {
  id: string
  name: string
}

interface PassengerRow {
  booking_id: string
  full_name: string
  email: string
}

interface PaymentPassengerDetails {
  seat: string
  name: string
  email: string
}

interface PaymentRow {
  id: string
  schedule_id: string
  status: string
  amount: number
  created_at: string
  seats: string[]
  passenger_details: PaymentPassengerDetails[]
}

interface BookingHistoryItem {
  id: string
  kind: "booking" | "payment"
  seatNumber: string
  status: string
  bookedAt: string
  routeName: string
  fromCity: string
  toCity: string
  operatorName: string
  departureTime: string
  arrivalTime: string
  duration: string
  passengerName: string
  passengerEmail: string
  paymentAmount?: number
}

export default function BookingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<BookingHistoryItem[]>([])
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace("/signin")
          return
        }

        // SR2: fetch only the current user's bookings and never trust route input.
        const { data: bookings, error: bookingsError } = await supabase
          .from("bookings")
          .select("id, schedule_id, seat_number, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        const { data: payments, error: paymentsError } = await supabase
          .from("payments")
          .select(
            "id, schedule_id, status, amount, created_at, seats, passenger_details",
          )
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })

        if (bookingsError) {
          console.error("Fetch bookings error:", bookingsError)
          return
        }

        if (paymentsError) {
          console.error("Fetch pending payments error:", paymentsError)
          return
        }

        if ((!bookings || bookings.length === 0) && (!payments || payments.length === 0)) {
          setItems([])
          return
        }

        const scheduleIds = [
          ...new Set([
            ...(bookings || []).map((booking) => booking.schedule_id),
            ...(payments || []).map((payment) => payment.schedule_id),
          ]),
        ]
        const bookingIds = (bookings || []).map((booking) => booking.id)

        const [
          { data: schedules, error: schedulesError },
          { data: passengers, error: passengersError },
        ] = await Promise.all([
          supabase
            .from("schedules")
            .select("id, route_id, departure_time, arrival_time")
            .in("id", scheduleIds),
          supabase
            .from("passengers")
            .select("booking_id, full_name, email")
            .in("booking_id", bookingIds),
        ])

        if (schedulesError) {
          console.error("Fetch schedules for bookings error:", schedulesError)
          return
        }

        if (passengersError) {
          console.error("Fetch passengers for bookings error:", passengersError)
        }

        const routeIds = [...new Set((schedules || []).map((schedule) => schedule.route_id))]

        const { data: routes, error: routesError } = await supabase
          .from("routes")
          .select("id, operator_id, route_name, from_city, to_city, duration")
          .in("id", routeIds)

        if (routesError) {
          console.error("Fetch routes for bookings error:", routesError)
          return
        }

        const operatorIds = [...new Set((routes || []).map((route) => route.operator_id))]

        const { data: operators, error: operatorsError } = await supabase
          .from("operators")
          .select("id, name")
          .in("id", operatorIds)

        if (operatorsError) {
          console.error("Fetch operators for bookings error:", operatorsError)
          return
        }

        const schedulesById = new Map(
          ((schedules || []) as ScheduleRow[]).map((schedule) => [schedule.id, schedule]),
        )
        const routesById = new Map(
          ((routes || []) as RouteRow[]).map((route) => [route.id, route]),
        )
        const operatorsById = new Map(
          ((operators || []) as OperatorRow[]).map((operator) => [operator.id, operator]),
        )
        const passengersByBookingId = new Map(
          ((passengers || []) as PassengerRow[]).map((passenger) => [
            passenger.booking_id,
            passenger,
          ]),
        )

        const historyItems: BookingHistoryItem[] = (bookings as BookingRow[])
          .map((booking) => {
            const schedule = schedulesById.get(booking.schedule_id)
            const route = schedule ? routesById.get(schedule.route_id) : undefined
            const operator = route
              ? operatorsById.get(route.operator_id)
              : undefined
            const passenger = passengersByBookingId.get(booking.id)

            if (!schedule || !route) {
              return null
            }

            return {
              id: booking.id,
              kind: "booking",
              seatNumber: booking.seat_number,
              status: booking.status || "unknown",
              bookedAt: booking.created_at,
              routeName: route.route_name || "Bus Trip",
              fromCity: route.from_city || "-",
              toCity: route.to_city || "-",
              operatorName: operator?.name || "Unknown Operator",
              departureTime: schedule.departure_time,
              arrivalTime: schedule.arrival_time,
              duration: route.duration || "-",
              passengerName: passenger?.full_name || "Passenger details unavailable",
              passengerEmail: passenger?.email || "-",
            }
          })
          .filter((item): item is BookingHistoryItem => Boolean(item))

        const pendingItems = ((payments || []) as PaymentRow[])
          .map<BookingHistoryItem | null>((payment) => {
            const schedule = schedulesById.get(payment.schedule_id)
            const route = schedule ? routesById.get(schedule.route_id) : undefined
            const operator = route
              ? operatorsById.get(route.operator_id)
              : undefined

            if (!schedule || !route) {
              return null
            }

            const paymentPassengers = Array.isArray(payment.passenger_details)
              ? payment.passenger_details
              : []
            const passengerNames = paymentPassengers
              .map((passenger) => passenger.name)
              .filter(Boolean)
            const passengerEmails = paymentPassengers
              .map((passenger) => passenger.email)
              .filter(Boolean)
            const paymentSeats = Array.isArray(payment.seats)
              ? payment.seats
              : []

            return {
              id: payment.id,
              kind: "payment",
              seatNumber:
                paymentSeats.length > 0 ? paymentSeats.join(", ") : "Seats pending",
              status: "pending",
              bookedAt: payment.created_at,
              routeName: route.route_name || "Bus Trip",
              fromCity: route.from_city || "-",
              toCity: route.to_city || "-",
              operatorName: operator?.name || "Unknown Operator",
              departureTime: schedule.departure_time,
              arrivalTime: schedule.arrival_time,
              duration: route.duration || "-",
              passengerName:
                passengerNames.length > 0
                  ? passengerNames.join(", ")
                  : "Passenger details saved",
              passengerEmail:
                passengerEmails.length > 0 ? passengerEmails.join(", ") : "-",
              paymentAmount: Number(payment.amount || 0),
            }
          })
          .filter((item): item is BookingHistoryItem => item !== null)

        setItems(
          [...pendingItems, ...historyItems].sort(
            (a, b) =>
              new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime(),
          ),
        )
      } catch (error) {
        // SR4: keep detailed errors internal while showing generic UI states.
        console.error("Unexpected bookings page error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookings()
  }, [router])

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return session?.access_token || null
  }

  const handleCancelBooking = async (bookingId: string) => {
    setActionId(bookingId)

    try {
      const accessToken = await getAccessToken()

      if (!accessToken) {
        router.replace("/signin")
        return
      }

      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ bookingId }),
      })

      const result = await response.json()

      if (!response.ok) {
        alert(result.error || "Unable to cancel booking.")
        return
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === bookingId ? { ...item, status: "cancelled" } : item,
        ),
      )
    } catch (error) {
      console.error("Cancel booking action error:", error)
      alert("Unable to cancel booking.")
    } finally {
      setActionId(null)
    }
  }

  const handleContinuePayment = async (paymentId: string) => {
    setActionId(paymentId)

    try {
      const accessToken = await getAccessToken()

      if (!accessToken) {
        router.replace("/signin")
        return
      }

      const response = await fetch("/api/payments/resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ paymentId }),
      })

      const result = await response.json()

      if (!response.ok || !result.url) {
        alert(result.error || "Unable to continue payment.")
        return
      }

      window.location.href = result.url
    } catch (error) {
      console.error("Continue payment action error:", error)
      alert("Unable to continue payment.")
    } finally {
      setActionId(null)
    }
  }

  const groupedItems = useMemo(() => items, [items])

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-muted">
        <section className="border-b bg-primary px-4 py-10">
          <div className="mx-auto max-w-6xl text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary-foreground/15 p-3">
                <Ticket className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">My Bookings</h1>
                <p className="mt-1 text-primary-foreground/80">
                  Review your ticket history, seat details, and trip information.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-8">
          <div className="mx-auto max-w-6xl">
            {isLoading ? (
              <div className="flex min-h-[40vh] items-center justify-center">
                <div className="text-center">
                  <Bus className="mx-auto h-12 w-12 animate-pulse text-primary" />
                  <p className="mt-4 text-muted-foreground">
                    Loading your booking history...
                  </p>
                </div>
              </div>
            ) : groupedItems.length === 0 ? (
              <Card className="mx-auto max-w-2xl">
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <Ticket className="h-12 w-12 text-primary" />
                  <h2 className="mt-4 text-2xl font-semibold">No bookings yet</h2>
                  <p className="mt-2 max-w-md text-muted-foreground">
                    Once you book a trip, your travel history will appear here with
                    route, passenger, and seat details.
                  </p>
                  <Link href="/search" className="mt-6">
                    <Button>Search Buses</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {groupedItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardHeader className="border-b bg-card">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <CardTitle className="text-xl">{item.routeName}</CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Booked on {formatDate(item.bookedAt)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            item.status.toLowerCase() === "confirmed"
                              ? "secondary"
                              : item.status.toLowerCase() === "cancelled"
                                ? "destructive"
                                : "outline"
                          }
                          className="w-fit capitalize"
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(item.departureTime)}</span>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div className="text-center">
                              <p className="text-xl font-bold">
                                {formatTime(item.departureTime)}
                              </p>
                              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{item.fromCity}</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-center">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="mt-1 text-xs text-muted-foreground">
                                {item.duration}
                              </span>
                              <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground" />
                            </div>

                            <div className="text-center">
                              <p className="text-xl font-bold">
                                {formatTime(item.arrivalTime)}
                              </p>
                              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{item.toCity}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-lg border bg-card p-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Operator</p>
                            <p className="font-medium">{item.operatorName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Seat</p>
                            <p className="font-medium">{item.seatNumber}</p>
                          </div>
                          {typeof item.paymentAmount === "number" && (
                            <div>
                              <p className="text-sm text-muted-foreground">Payment</p>
                              <p className="font-medium">
                                RM {item.paymentAmount.toFixed(2)}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-muted-foreground">Passenger</p>
                            <div className="flex items-start gap-2">
                              <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{item.passengerName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.passengerEmail}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="pt-2">
                            {item.kind === "booking" &&
                              item.status.toLowerCase() === "confirmed" && (
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  disabled={actionId === item.id}
                                  onClick={() => handleCancelBooking(item.id)}
                                >
                                  {actionId === item.id
                                    ? "Cancelling..."
                                    : "Cancel Booking"}
                                </Button>
                              )}
                            {item.kind === "payment" &&
                              item.status.toLowerCase() === "pending" && (
                                <Button
                                  className="w-full"
                                  disabled={actionId === item.id}
                                  onClick={() => handleContinuePayment(item.id)}
                                >
                                  {actionId === item.id
                                    ? "Redirecting..."
                                    : "Continue Payment"}
                                </Button>
                              )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
