"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SearchForm } from "@/components/search-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, MapPin, Bus, Wifi, Plug, Wind, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface BusResult {
  id: string;
  operator: string;
  operatorLogo: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  from: string;
  to: string;
  price: number;
  seatsAvailable: number;
  busType: string;
  amenities: string[];
}

const mockBuses: BusResult[] = [
  {
    id: "1",
    operator: "Greyhound Express",
    operatorLogo: "GE",
    departureTime: "06:00 AM",
    arrivalTime: "10:30 AM",
    duration: "4h 30m",
    from: "New York",
    to: "Boston",
    price: 45,
    seatsAvailable: 23,
    busType: "AC Sleeper",
    amenities: ["wifi", "charging", "ac"],
  },
  {
    id: "2",
    operator: "FlixBus",
    operatorLogo: "FB",
    departureTime: "08:30 AM",
    arrivalTime: "01:15 PM",
    duration: "4h 45m",
    from: "New York",
    to: "Boston",
    price: 38,
    seatsAvailable: 15,
    busType: "AC Seater",
    amenities: ["wifi", "ac"],
  },
  {
    id: "3",
    operator: "MegaBus",
    operatorLogo: "MB",
    departureTime: "10:00 AM",
    arrivalTime: "02:45 PM",
    duration: "4h 45m",
    from: "New York",
    to: "Boston",
    price: 35,
    seatsAvailable: 8,
    busType: "AC Seater",
    amenities: ["wifi", "charging", "ac"],
  },
  {
    id: "4",
    operator: "BoltBus",
    operatorLogo: "BB",
    departureTime: "12:30 PM",
    arrivalTime: "05:00 PM",
    duration: "4h 30m",
    from: "New York",
    to: "Boston",
    price: 42,
    seatsAvailable: 30,
    busType: "AC Sleeper",
    amenities: ["wifi", "charging", "ac"],
  },
  {
    id: "5",
    operator: "Peter Pan",
    operatorLogo: "PP",
    departureTime: "03:00 PM",
    arrivalTime: "07:30 PM",
    duration: "4h 30m",
    from: "New York",
    to: "Boston",
    price: 48,
    seatsAvailable: 18,
    busType: "Luxury",
    amenities: ["wifi", "charging", "ac"],
  },
  {
    id: "6",
    operator: "Greyhound Express",
    operatorLogo: "GE",
    departureTime: "06:00 PM",
    arrivalTime: "10:30 PM",
    duration: "4h 30m",
    from: "New York",
    to: "Boston",
    price: 40,
    seatsAvailable: 25,
    busType: "AC Seater",
    amenities: ["wifi", "ac"],
  },
];

const amenityIcons: Record<string, React.ReactNode> = {
  wifi: <Wifi className="h-4 w-4" />,
  charging: <Plug className="h-4 w-4" />,
  ac: <Wind className="h-4 w-4" />,
};

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "New York";
  const to = searchParams.get("to") || "Boston";
  const date =
    searchParams.get("date") || new Date().toISOString().split("T")[0];

  const [sortBy, setSortBy] = useState("price");
  const [buses, setBuses] = useState<BusResult[]>([]);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        if (!from || !to || !date) return;

        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const [
          { data: schedules, error: schedulesError },
          { data: routes, error: routesError },
          { data: operators, error: operatorsError },
        ] = await Promise.all([
          supabase
            .from("schedules")
            .select(
              "id, route_id, departure_time, arrival_time, available_seats",
            )
            .gte("departure_time", startDate.toISOString())
            .lte("departure_time", endDate.toISOString()),
          supabase
            .from("routes")
            .select(
              "id, operator_id, route_name, from_city, to_city, price, duration, is_active",
            ),
          supabase.from("operators").select("id, name"),
        ]);

        const firstError = schedulesError || routesError || operatorsError;

        if (firstError) {
          console.error("Fetch buses error:", {
            schedulesError,
            routesError,
            operatorsError,
          });
          return;
        }

        const routesById = new Map(
          (routes || []).map((route: any) => [route.id, route]),
        );
        const operatorsById = new Map(
          (operators || []).map((operator: any) => [operator.id, operator]),
        );

        const formatted: BusResult[] = (schedules || [])
          .map((schedule: any) => {
            const route = routesById.get(schedule.route_id);
            const operator = route
              ? operatorsById.get(route.operator_id)
              : undefined;

            if (
              !route ||
              route.from_city !== from ||
              route.to_city !== to ||
              route.is_active !== true ||
              schedule.available_seats <= 0
            ) {
              return null;
            }

            const dep = new Date(schedule.departure_time);
            const arr = new Date(schedule.arrival_time);

            return {
              id: schedule.id,
              operator: operator?.name || "Unknown",
              operatorLogo: (operator?.name || "U")[0],
              departureTime: dep.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              arrivalTime: arr.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              duration: route?.duration || "-",
              from: route?.from_city,
              to: route?.to_city,
              price: route?.price || 0,
              seatsAvailable: schedule.available_seats,
              busType: route?.route_name || "Bus",
              amenities: ["wifi", "ac"],
            };
          })
          .filter((bus): bus is BusResult => Boolean(bus));

        const sorted = [...formatted].sort((a, b) => {
          if (sortBy === "price") return a.price - b.price;
          if (sortBy === "departure")
            return a.departureTime.localeCompare(b.departureTime);
          if (sortBy === "duration")
            return a.duration.localeCompare(b.duration);
          return 0;
        });

        setBuses(sorted);
      } catch (err) {
        console.error("Unexpected fetch error:", err);
      }
    };

    fetchBuses();
  }, [from, to, date, sortBy]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Search Form Section */}
        <section className="bg-primary px-4 py-8">
          <div className="mx-auto max-w-4xl">
            <SearchForm />
          </div>
        </section>

        {/* Results Section */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-4xl">
            {/* Results Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-muted-foreground">
                  {formatDate(date)} - {buses.length} buses found
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Price: Low to High</SelectItem>
                    <SelectItem value="departure">Departure Time</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bus List */}
            <div className="space-y-4">
              {buses.map((bus) => (
                <Card
                  key={bus.id}
                  className="overflow-hidden transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row">
                      {/* Operator Info */}
                      <div className="flex items-center gap-4 border-b p-4 lg:w-48 lg:border-b-0 lg:border-r">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                          {bus.operatorLogo}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {bus.operator}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {bus.busType}
                          </p>
                        </div>
                      </div>

                      {/* Journey Details */}
                      <div className="flex flex-1 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">
                              {bus.departureTime}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {from}
                            </p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <div className="h-px w-8 bg-border" />
                              <Clock className="h-4 w-4" />
                              <span className="text-xs">{bus.duration}</span>
                              <div className="h-px w-8 bg-border" />
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">
                              {bus.arrivalTime}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {to}
                            </p>
                          </div>
                        </div>

                        {/* Amenities */}
                        <div className="flex items-center gap-2">
                          {bus.amenities.map((amenity) => (
                            <div
                              key={amenity}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
                              title={amenity}
                            >
                              {amenityIcons[amenity]}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Price & Booking */}
                      <div className="flex items-center justify-between gap-4 border-t p-4 lg:w-48 lg:flex-col lg:border-l lg:border-t-0">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">
                            RM{bus.price}
                          </p>
                          <Badge
                            variant={
                              bus.seatsAvailable < 10
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {bus.seatsAvailable} seats left
                          </Badge>
                        </div>
                        <Link
                          href={`/booking/${bus.id}?from=${from}&to=${to}&date=${date}`}
                        >
                          <Button>Select Seats</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Bus className="mx-auto h-12 w-12 animate-pulse text-primary" />
            <p className="mt-4 text-muted-foreground">
              Loading search results...
            </p>
          </div>
        </div>
      }
    >
      <SearchResultsContent />
    </Suspense>
  );
}
