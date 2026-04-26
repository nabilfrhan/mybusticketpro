"use client";

import { useState, useEffect, Suspense, use, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SeatSelector } from "@/components/seat-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Bus,
  Clock,
  MapPin,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Seat {
  id: string;
  row: number;
  column: string;
  status: "available" | "booked" | "selected";
  price: number;
  type: "regular";
}

interface BusDetails {
  operator: string;
  busType: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  seatPrice: number;
  totalSeats: number;
}

function BookingContent({ busId }: { busId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get("from") || "New York";
  const to = searchParams.get("to") || "Boston";
  const date =
    searchParams.get("date") || new Date().toISOString().split("T")[0];

  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [busDetails, setBusDetails] = useState<BusDetails | null>(null);
  const [bookedSeatIds, setBookedSeatIds] = useState<string[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingBusDetails, setIsLoadingBusDetails] = useState(true);

  useEffect(() => {
    const ensureSignedIn = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/signin");
        return;
      }

      setIsCheckingAuth(false);
    };

    ensureSignedIn();
  }, [router]);

  useEffect(() => {
    if (isCheckingAuth) return;

    const fetchBusDetails = async () => {
      try {
        if (!busId) return;

        setIsLoadingBusDetails(true);

        const { data: schedule, error: scheduleError } = await supabase
          .from("schedules")
          .select(
            "id, route_id, available_seats, departure_time, arrival_time",
          )
          .eq("id", busId)
          .single();

        if (scheduleError) {
          console.error("Fetch booking error:", scheduleError);
          return;
        }

        const { data: route, error: routeError } = await supabase
          .from("routes")
          .select("operator_id, route_name, duration, price")
          .eq("id", schedule.route_id)
          .single();

        if (routeError) {
          console.error("Fetch route error:", routeError);
          return;
        }

        const { data: operator, error: operatorError } = await supabase
          .from("operators")
          .select("name")
          .eq("id", route.operator_id)
          .single();

        if (operatorError) {
          console.error("Fetch operator error:", operatorError);
          return;
        }

        const { data: bookings, error: bookingsError } = await supabase
          .from("bookings")
          .select("seat_number, status")
          .eq("schedule_id", busId);

        if (bookingsError) {
          console.error("Fetch booked seats error:", bookingsError);
        }

        setBookedSeatIds(
          bookings
            ?.filter(
              (booking) =>
                booking.seat_number &&
                booking.status?.toLowerCase() !== "cancelled",
            )
            .map((booking) => booking.seat_number) || [],
        );

        setBusDetails({
          operator: operator?.name || "-",
          busType: route?.route_name || "Bus",
          departureTime: new Date(
            schedule.departure_time,
          ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          arrivalTime: new Date(schedule.arrival_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          duration: route?.duration || "-",
          seatPrice: Number(route?.price || 0),
          totalSeats: Number(
            (schedule.available_seats || 0) + (bookings?.length || 0) || 40,
          ),
        });
      } catch (err) {
        console.error("Unexpected booking fetch error:", err);
      } finally {
        setIsLoadingBusDetails(false);
      }
    };

    fetchBusDetails();
  }, [busId, isCheckingAuth]);

  const handleSeatSelect = useCallback((seats: Seat[]) => {
    setSelectedSeats(seats);
  }, []);

  const totalAmount = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  const handleProceed = () => {
    if (selectedSeats.length === 0) {
      alert("Please select at least one seat");
      return;
    }

    const seatIds = selectedSeats.map((seat) => seat.id).join(",");
    router.push(
      `/booking/${busId}/confirm?from=${from}&to=${to}&date=${date}&seats=${seatIds}&total=${totalAmount}`,
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isCheckingAuth || isLoadingBusDetails || !busDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Bus className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">
            Loading booking details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Link href={`/search?from=${from}&to=${to}&date=${date}`}>
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search Results
            </Button>
          </Link>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bus className="h-5 w-5" />
                    Select Your Seats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SeatSelector
                    onSeatSelect={handleSeatSelect}
                    maxSeats={6}
                    totalSeats={busDetails.totalSeats}
                    bookedSeatIds={bookedSeatIds}
                    seatPrice={busDetails.seatPrice}
                  />
                </CardContent>
              </Card>
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
                      <p className="font-bold">{busDetails.departureTime}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {from}
                      </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {busDetails.duration}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="text-center">
                      <p className="font-bold">{busDetails.arrivalTime}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {to}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground">Operator</p>
                    <p className="font-medium">{busDetails.operator}</p>
                    <Badge variant="secondary" className="mt-1">
                      {busDetails.busType}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedSeats.length > 0 ? (
                    <>
                      <div>
                        <p className="text-sm font-medium">Selected Seats:</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedSeats.map((seat) => (
                            <Badge key={seat.id} variant="outline">
                              {seat.id} - RM{seat.price.toFixed(2)}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 border-t pt-4">
                        <div className="flex justify-between text-sm">
                          <span>Seats ({selectedSeats.length})</span>
                          <span>RM{totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Service Fee</span>
                          <span>RM5.00</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 font-bold">
                          <span>Total</span>
                          <span className="text-primary">
                            RM{(totalAmount + 5).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      No seats selected yet
                    </p>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    disabled={selectedSeats.length === 0}
                    onClick={handleProceed}
                  >
                    Proceed to Checkout
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Bus className="mx-auto h-12 w-12 animate-pulse text-primary" />
            <p className="mt-4 text-muted-foreground">
              Loading booking details...
            </p>
          </div>
        </div>
      }
    >
      <BookingContent busId={resolvedParams.id} />
    </Suspense>
  );
}
