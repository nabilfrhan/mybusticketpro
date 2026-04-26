import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { stripe } from "@/lib/stripe"

interface StoredPassengerDetails {
  seat: string
  name: string
  email: string
  phone: string
  gender: string
  age: string
}

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
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : ""

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID." }, { status: 400 })
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    })

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment has not been completed." },
        { status: 400 },
      )
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("stripe_checkout_session_id", sessionId)
      .single()

    if (paymentError || !payment || payment.user_id !== user.id) {
      console.error("Confirm payment lookup error:", paymentError)
      return NextResponse.json(
        { error: "Unable to verify payment." },
        { status: 400 },
      )
    }

    if (payment.status === "paid") {
      return NextResponse.json({
        bookingId: payment.id,
        alreadyConfirmed: true,
      })
    }

    const seats = Array.isArray(payment.seats)
      ? payment.seats.map((seat: string) => String(seat).trim().toUpperCase())
      : []
    const passengerDetails = Array.isArray(payment.passenger_details)
      ? (payment.passenger_details as StoredPassengerDetails[])
      : []

    if (seats.length === 0 || passengerDetails.length !== seats.length) {
      return NextResponse.json(
        { error: "Stored payment details are invalid." },
        { status: 400 },
      )
    }

    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from("schedules")
      .select("id, available_seats")
      .eq("id", payment.schedule_id)
      .single()

    if (scheduleError || !schedule) {
      console.error("Confirm schedule error:", scheduleError)
      return NextResponse.json(
        { error: "Unable to finalize booking." },
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
      console.error("Confirm booking verification error:", existingBookingsError)
      return NextResponse.json(
        { error: "Unable to verify booked seats." },
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

    // SR3: keep all database writes parameterized through Supabase queries.
    const { data: insertedBookings, error: insertBookingsError } =
      await supabaseAdmin
        .from("bookings")
        .insert(
          seats.map((seat: string) => ({
            schedule_id: payment.schedule_id,
            seat_number: seat,
            user_id: user.id,
            status: "confirmed",
          })),
        )
        .select("id, seat_number")

    if (insertBookingsError || !insertedBookings) {
      console.error("Insert bookings error:", insertBookingsError)
      return NextResponse.json(
        { error: "Unable to finalize booking." },
        { status: 400 },
      )
    }

    const bookingIdBySeat = new Map(
      insertedBookings.map((booking) => [booking.seat_number, booking.id]),
    )

    const { error: insertPassengersError } = await supabaseAdmin
      .from("passengers")
      .insert(
        passengerDetails.map((passenger) => ({
          booking_id: bookingIdBySeat.get(passenger.seat),
          full_name: passenger.name,
          email: passenger.email,
          phone: passenger.phone,
          gender: passenger.gender,
          age: Number(passenger.age),
        })),
      )

    if (insertPassengersError) {
      console.error("Insert passengers error:", insertPassengersError)
      await supabaseAdmin
        .from("bookings")
        .delete()
        .in("id", insertedBookings.map((booking) => booking.id))

      return NextResponse.json(
        { error: "Unable to save passenger details." },
        { status: 400 },
      )
    }

    const { error: updateScheduleError } = await supabaseAdmin
      .from("schedules")
      .update({
        available_seats: schedule.available_seats - seats.length,
      })
      .eq("id", payment.schedule_id)

    if (updateScheduleError) {
      console.error("Update schedule seats error:", updateScheduleError)
      await supabaseAdmin
        .from("bookings")
        .delete()
        .in("id", insertedBookings.map((booking) => booking.id))

      return NextResponse.json(
        { error: "Unable to finalize booking." },
        { status: 400 },
      )
    }

    const paymentIntentId =
      typeof checkoutSession.payment_intent === "string"
        ? checkoutSession.payment_intent
        : checkoutSession.payment_intent?.id || null

    const { error: updatePaymentError } = await supabaseAdmin
      .from("payments")
      .update({
        status: "paid",
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq("id", payment.id)

    if (updatePaymentError) {
      console.error("Update payment status error:", updatePaymentError)
    }

    return NextResponse.json({
      bookingId: payment.id,
      success: true,
    })
  } catch (error) {
    // SR4: never expose stack traces or internal details to users.
    console.error("Confirm payment route error:", error)
    return NextResponse.json(
      { error: "Unable to confirm payment. Please try again." },
      { status: 500 },
    )
  }
}
