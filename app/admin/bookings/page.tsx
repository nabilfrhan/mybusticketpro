"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Booking type (aligned with your DB)
type Booking = {
  id: string;
  seat_number: string;
  status: string;
  created_at: string;

  schedules: {
    departure_time: string;
    routes: {
      from_city: string;
      to_city: string;
    }[];
  }[];
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // SR1: Secure fetch with proper error handling
  const fetchBookings = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        seat_number,
        status,
        created_at,
        schedules (
          departure_time,
          routes (
            from_city,
            to_city
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch bookings error:", error);
      alert("Failed to fetch bookings");
      setLoading(false);
      return;
    }

    setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bookings</h1>
      </div>

      {/* Table Container */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-4">
          <h2 className="text-lg font-medium">All Bookings</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-t">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Departure</th>
                <th className="px-4 py-3">Seat</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4" colSpan={5}>
                    Loading...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td className="px-4 py-4" colSpan={5}>
                    No bookings found
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="border-t">
                    {/* Route */}
                    <td className="px-4 py-3">
                      {b.schedules?.[0]?.routes?.[0]?.from_city || "-"} →{" "}
                      {b.schedules?.[0]?.routes?.[0]?.to_city || "-"}
                    </td>

                    {/* Departure */}
                    <td className="px-4 py-3">
                      {b.schedules?.[0]?.departure_time
                        ? new Date(
                            b.schedules[0].departure_time
                          ).toLocaleString()
                        : "-"}
                    </td>

                    {/* Seat */}
                    <td className="px-4 py-3">{b.seat_number}</td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          b.status === "confirmed"
                            ? "bg-green-100 text-green-700"
                            : b.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}