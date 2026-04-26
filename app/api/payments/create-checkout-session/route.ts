import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { stripe } from "@/lib/stripe"

interface PassengerInput {
  seat: string
  name: string
  email: string
  phone: string
  gender: string
  age: string
}

const SERVICE_FEE = 5

const normalizePassenger = (passenger: PassengerInput) => ({
  seat: passenger.seat.trim().toUpperCase(),
  name: passenger.name.trim(),
  email: passenger.email.trim().toLowerCase(),
  phone: passenger.phone.replace(/\D/g, ""),
  gender: passenger.gender.trim().toLowerCase(),
  age: passenger.age.trim(),
})

const validatePassengerDetails = (passengers: PassengerInput[]) => {
  if (!Array.isArray(passengers) || passengers.length === 0) {
    return "Passenger details are required."
  }

  const seenPassengers = new Set<string>()

  for (const rawPassenger of passengers) {
    const passenger = normalizePassenger(rawPassenger)

    if (
      !passenger.seat ||
      !passenger.name ||
      !passenger.email ||
      !passenger.phone ||
      !passenger.gender ||
      !passenger.age
    ) {
      return "Passenger details are incomplete."
    }

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
      return "Passenger age must be a valid whole number."
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(passenger.email)) {
      return "Passenger email format is invalid."
    }

    const duplicateKey = `${passenger.name}|${passenger.email}|${passenger.phone}`
    if (seenPassengers.has(duplicateKey)) {
      return "Each seat must have different passenger details."
    }

    seenPassengers.add(duplicateKey)
  }

  return null
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
    const scheduleId = typeof body.scheduleId === "string" ? body.scheduleId : ""
    const seats = Array.isArray(body.seats)
      ? body.seats.map((seat: string) => String(seat).trim().toUpperCase())
      : []
    const passengerDetails = Array.isArray(body.passengerDetails)
      ? (body.passengerDetails as PassengerInput[])
      : []
    const from = typeof body.from === "string" ? body.from : ""
    const to = typeof body.to === "string" ? body.to : ""
    const date = typeof body.date === "string" ? body.date : ""

    // SR2/SR5: validate all incoming data before payment creation.
    if (!scheduleId || seats.length === 0 || seats.length > 6) {
      return NextResponse.json(
        { error: "Invalid booking request." },
        { status: 400 },
      )
    }

    if (new Set(seats).size !== seats.length) {
      return NextResponse.json(
        { error: "Duplicate seats are not allowed." },
        { status: 400 },
      )
    }

    if (passengerDetails.length !== seats.length) {
      return NextResponse.json(
        { error: "Passenger details do not match selected seats." },
        { status: 400 },
      )
    }

    const passengerValidationError = validatePassengerDetails(passengerDetails)
    if (passengerValidationError) {
      return NextResponse.json(
        { error: passengerValidationError },
        { status: 400 },
      )
    }

    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from("schedules")
      .select("id, route_id, available_seats")
      .eq("id", scheduleId)
      .single()

    if (scheduleError || !schedule) {
      console.error("Create checkout schedule error:", scheduleError)
      return NextResponse.json(
        { error: "Unable to create checkout session." },
        { status: 400 },
      )
    }

    const { data: route, error: routeError } = await supabaseAdmin
      .from("routes")
      .select("route_name, price")
      .eq("id", schedule.route_id)
      .single()

    if (routeError || !route) {
      console.error("Create checkout route error:", routeError)
      return NextResponse.json(
        { error: "Unable to create checkout session." },
        { status: 400 },
      )
    }

    const { data: existingBookings, error: existingBookingsError } =
      await supabaseAdmin
        .from("bookings")
        .select("seat_number, status")
        .eq("schedule_id", scheduleId)
        .in("seat_number", seats)

    if (existingBookingsError) {
      console.error("Create checkout bookings error:", existingBookingsError)
      return NextResponse.json(
        { error: "Unable to verify selected seats." },
        { status: 400 },
      )
    }

    const unavailableSeats =
      existingBookings
        ?.filter((booking) => booking.status?.toLowerCase() !== "cancelled")
        .map((booking) => booking.seat_number) || []

    if (unavailableSeats.length > 0 || schedule.available_seats < seats.length) {
      return NextResponse.json(
        { error: "Some selected seats are no longer available." },
        { status: 409 },
      )
    }

    const seatPrice = Number(route.price || 0)
    const subtotal = seatPrice * seats.length
    const totalAmount = subtotal + SERVICE_FEE

    const { data: payment, error: paymentInsertError } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: user.id,
        schedule_id: scheduleId,
        amount: totalAmount,
        currency: "myr",
        status: "pending",
        payment_provider: "stripe",
        seats,
        passenger_details: passengerDetails.map(normalizePassenger),
      })
      .select("id")
      .single()

    if (paymentInsertError || !payment) {
      console.error("Create payment record error:", paymentInsertError)
      return NextResponse.json(
        { error: "Unable to create payment record." },
        { status: 400 },
      )
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const bookingPath = `/booking/${scheduleId}/confirm`
    const redirectParams = new URLSearchParams({
      from,
      to,
      date,
      seats: seats.join(","),
      total: subtotal.toFixed(2),
    })

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${appUrl}${bookingPath}?${redirectParams.toString()}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}${bookingPath}?${redirectParams.toString()}&step=payment`,
      metadata: {
        payment_id: payment.id,
        schedule_id: scheduleId,
        user_id: user.id,
      },
      line_items: [
        {
          quantity: seats.length,
          price_data: {
            currency: "myr",
            unit_amount: Math.round(seatPrice * 100),
            product_data: {
              name: route.route_name || "Bus Ticket",
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: "myr",
            unit_amount: Math.round(SERVICE_FEE * 100),
            product_data: {
              name: "Service Fee",
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
      console.error("Update payment session error:", paymentUpdateError)
      await supabaseAdmin.from("payments").delete().eq("id", payment.id)
      return NextResponse.json(
        { error: "Unable to create payment session." },
        { status: 400 },
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    // SR4: log detailed exceptions internally and return generic messages.
    console.error("Create checkout session error:", error)
    return NextResponse.json(
      { error: "Unable to start payment. Please try again." },
      { status: 500 },
    )
  }
}
