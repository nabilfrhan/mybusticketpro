import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { stripe } from "@/lib/stripe"

const getAuthorizedUser = async (request: Request) => {
  const authorization = request.headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return { user: null, error: "Unauthorized" }
  }

  const token = authorization.replace("Bearer ", "")
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return { user: null, error: "Unauthorized" }
  }

  return { user, error: null }
}

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthorizedUser(request)

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const paymentId = typeof body.paymentId === "string" ? body.paymentId : ""

    if (!paymentId) {
      return NextResponse.json({ error: "Invalid payment request." }, { status: 400 })
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single()

    if (paymentError || !payment || payment.user_id !== user.id) {
      console.error("Resume payment lookup error:", paymentError)
      return NextResponse.json(
        { error: "Unable to find this payment." },
        { status: 404 },
      )
    }

    if (payment.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending payments can be continued." },
        { status: 400 },
      )
    }

    const seats = Array.isArray(payment.seats)
      ? payment.seats.map((seat: string) => String(seat).trim().toUpperCase())
      : []

    if (seats.length === 0) {
      return NextResponse.json(
        { error: "Pending payment does not contain seat information." },
        { status: 400 },
      )
    }

    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from("schedules")
      .select("id, route_id, departure_time, arrival_time, available_seats")
      .eq("id", payment.schedule_id)
      .single()

    if (scheduleError || !schedule) {
      console.error("Resume payment schedule error:", scheduleError)
      return NextResponse.json(
        { error: "Unable to continue this payment." },
        { status: 400 },
      )
    }

    const { data: route, error: routeError } = await supabaseAdmin
      .from("routes")
      .select("route_name, from_city, to_city")
      .eq("id", schedule.route_id)
      .single()

    if (routeError || !route) {
      console.error("Resume payment route error:", routeError)
      return NextResponse.json(
        { error: "Unable to continue this payment." },
        { status: 400 },
      )
    }

    const { data: existingBookings, error: existingBookingsError } =
      await supabaseAdmin
        .from("bookings")
        .select("seat_number, status")
        .eq("schedule_id", payment.schedule_id)
        .in("seat_number", seats)

    if (existingBookingsError) {
      console.error("Resume payment bookings error:", existingBookingsError)
      return NextResponse.json(
        { error: "Unable to verify seat availability." },
        { status: 400 },
      )
    }

    const unavailableSeats =
      existingBookings
        ?.filter((booking) => booking.status?.toLowerCase() !== "cancelled")
        .map((booking) => booking.seat_number) || []

    if (unavailableSeats.length > 0 || schedule.available_seats < seats.length) {
      await supabaseAdmin
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id)

      return NextResponse.json(
        { error: "Selected seats are no longer available." },
        { status: 409 },
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const bookingPath = `/booking/${payment.schedule_id}/confirm`
    const subtotal = Math.max(Number(payment.amount || 0) - 5, 0)
    const redirectParams = new URLSearchParams({
      from: route.from_city || "",
      to: route.to_city || "",
      date: new Date(schedule.departure_time).toISOString().split("T")[0],
      seats: seats.join(","),
      total: subtotal.toFixed(2),
    })

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${appUrl}${bookingPath}?${redirectParams.toString()}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/bookings`,
      metadata: {
        payment_id: payment.id,
        schedule_id: payment.schedule_id,
        user_id: user.id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: String(payment.currency || "myr"),
            unit_amount: Math.round(Number(payment.amount || 0) * 100),
            product_data: {
              name: route.route_name || "Bus Booking Payment",
            },
          },
        },
      ],
    })

    const { error: paymentUpdateError } = await supabaseAdmin
      .from("payments")
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq("id", payment.id)

    if (paymentUpdateError) {
      console.error("Resume payment update error:", paymentUpdateError)
      return NextResponse.json(
        { error: "Unable to continue this payment." },
        { status: 400 },
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Resume payment route error:", error)
    return NextResponse.json(
      { error: "Unable to continue payment. Please try again." },
      { status: 500 },
    )
  }
}
