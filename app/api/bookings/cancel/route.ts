import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

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
    const bookingId = typeof body.bookingId === "string" ? body.bookingId : ""

    if (!bookingId) {
      return NextResponse.json({ error: "Invalid booking request." }, { status: 400 })
    }

    // SR2: verify ownership and current state on the server before mutation.
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, schedule_id, user_id, status")
      .eq("id", bookingId)
      .single()

    if (bookingError || !booking || booking.user_id !== user.id) {
      console.error("Cancel booking lookup error:", bookingError)
      return NextResponse.json(
        { error: "Unable to find this booking." },
        { status: 404 },
      )
    }

    if (booking.status?.toLowerCase() === "cancelled") {
      return NextResponse.json({ success: true, alreadyCancelled: true })
    }

    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from("schedules")
      .select("id, available_seats")
      .eq("id", booking.schedule_id)
      .single()

    if (scheduleError || !schedule) {
      console.error("Cancel booking schedule error:", scheduleError)
      return NextResponse.json(
        { error: "Unable to update seat availability." },
        { status: 400 },
      )
    }

    // SR3: use parameterized updates via Supabase instead of string-built SQL.
    const { error: updateBookingError } = await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)

    if (updateBookingError) {
      console.error("Cancel booking update error:", updateBookingError)
      return NextResponse.json(
        { error: "Unable to cancel this booking." },
        { status: 400 },
      )
    }

    const { error: updateScheduleError } = await supabaseAdmin
      .from("schedules")
      .update({
        available_seats: Number(schedule.available_seats || 0) + 1,
      })
      .eq("id", booking.schedule_id)

    if (updateScheduleError) {
      console.error("Cancel booking schedule update error:", updateScheduleError)
      return NextResponse.json(
        { error: "Booking cancelled, but seat count update failed." },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // SR4: log internal details only and return a generic message to the user.
    console.error("Cancel booking route error:", error)
    return NextResponse.json(
      { error: "Unable to cancel booking. Please try again." },
      { status: 500 },
    )
  }
}
