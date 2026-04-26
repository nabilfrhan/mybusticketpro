"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bus,
  Users,
  DollarSign,
  Route as RouteIcon,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface StatItem {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: typeof Bus;
}

interface RecentBookingItem {
  id: string;
  passenger: string;
  route: string;
  date: string;
  status: string;
  amount: string;
}

interface TopRouteItem {
  route: string;
  bookings: number;
  revenue: string;
}

interface BookingRow {
  id: string;
  schedule_id: string;
  user_id: string;
  status: string;
  created_at: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  first_name: string | null;
}

interface ScheduleRow {
  id: string;
  route_id: string;
}

interface RouteRow {
  id: string;
  route_name: string;
  from_city: string;
  to_city: string;
  price: number;
  is_active: boolean;
}

const formatCurrency = (value: number) =>
  `RM${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const calculateChange = (current: number, previous: number) => {
  if (previous <= 0) {
    return {
      change: current > 0 ? "+100.0%" : "0.0%",
      trend: "up" as const,
    };
  }

  const percent = ((current - previous) / previous) * 100;

  return {
    change: `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`,
    trend: percent >= 0 ? ("up" as const) : ("down" as const),
  };
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [recentBookings, setRecentBookings] = useState<RecentBookingItem[]>([]);
  const [topRoutes, setTopRoutes] = useState<TopRouteItem[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        // SR1: Check session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          window.location.href = "/admin-login";
          return;
        }

        const userId = session.user.id;

        // SR2: Check role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (!profile || profile.role !== "admin") {
          await supabase.auth.signOut();
          window.location.href = "/admin-login";
          return;
        }

        // ✅ ONLY call AFTER security pass
        await fetchDashboardData();
      } catch (err) {
        console.error(err);
        window.location.href = "/admin-login";
      }
    };

    init();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [
        { data: bookings, error: bookingsError },
        { data: payments, error: paymentsError },
        { data: profiles, error: profilesError },
        { data: routes, error: routesError },
        { data: schedules, error: schedulesError },
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, schedule_id, user_id, status, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("id, amount, status, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, first_name"),
        supabase
          .from("routes")
          .select("id, route_name, from_city, to_city, price, is_active"),
        supabase.from("schedules").select("id, route_id"),
      ]);

      if (
        bookingsError ||
        paymentsError ||
        profilesError ||
        routesError ||
        schedulesError
      ) {
        console.error("Fetch admin dashboard error:", {
          bookingsError,
          paymentsError,
          profilesError,
          routesError,
          schedulesError,
        });
        return;
      }

      const bookingRows = (bookings || []) as BookingRow[];
      const paymentRows = (payments || []) as PaymentRow[];
      const routeRows = (routes || []) as RouteRow[];
      const scheduleRows = (schedules || []) as ScheduleRow[];
      const profileRows = (profiles || []) as ProfileRow[];

      const now = new Date();
      const startOfCurrentMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );
      const startOfPreviousMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );

      const currentMonthBookings = bookingRows.filter(
        (booking) => new Date(booking.created_at) >= startOfCurrentMonth,
      ).length;
      const previousMonthBookings = bookingRows.filter((booking) => {
        const bookingDate = new Date(booking.created_at);
        return (
          bookingDate >= startOfPreviousMonth &&
          bookingDate < startOfCurrentMonth
        );
      }).length;

      const schedulesById = new Map(
        scheduleRows.map((schedule) => [schedule.id, schedule]),
      );
      const routesById = new Map(routeRows.map((route) => [route.id, route]));
      const profilesById = new Map(
        profileRows.map((profile) => [profile.id, profile]),
      );
      const bookingRevenueEntries = bookingRows
        .map((booking) => {
          const schedule = schedulesById.get(booking.schedule_id);
          const route = schedule
            ? routesById.get(schedule.route_id)
            : undefined;

          if (!route) return null;

          return {
            createdAt: booking.created_at,
            revenue: Number(route.price || 0),
          };
        })
        .filter(
          (entry): entry is { createdAt: string; revenue: number } =>
            entry !== null,
        );

      const currentMonthRevenue = bookingRevenueEntries
        .filter((entry) => new Date(entry.createdAt) >= startOfCurrentMonth)
        .reduce((sum, entry) => sum + entry.revenue, 0);

      const previousMonthRevenue = bookingRevenueEntries
        .filter((entry) => {
          const paymentDate = new Date(entry.createdAt);
          return (
            paymentDate >= startOfPreviousMonth &&
            paymentDate < startOfCurrentMonth
          );
        })
        .reduce((sum, entry) => sum + entry.revenue, 0);

      const currentMonthUsers = (profiles || []).length;
      const previousMonthUsers = Math.max(currentMonthUsers - 1, 0);

      const activeRoutes = routeRows.filter((route) => route.is_active).length;
      const previousActiveRoutes = activeRoutes;

      const bookingsChange = calculateChange(
        currentMonthBookings,
        previousMonthBookings,
      );
      const revenueChange = calculateChange(
        currentMonthRevenue,
        previousMonthRevenue,
      );
      const usersChange = calculateChange(
        currentMonthUsers,
        previousMonthUsers,
      );
      const routesChange = calculateChange(activeRoutes, previousActiveRoutes);

      setStats([
        {
          title: "Total Bookings",
          value: bookingRows.length.toLocaleString("en-MY"),
          change: bookingsChange.change,
          trend: bookingsChange.trend,
          icon: Bus,
        },
        {
          title: "Total Revenue",
          value: formatCurrency(
            bookingRevenueEntries.reduce(
              (sum, entry) => sum + entry.revenue,
              0,
            ),
          ),
          change: revenueChange.change,
          trend: revenueChange.trend,
          icon: DollarSign,
        },
        {
          title: "Active Users",
          value: currentMonthUsers.toLocaleString("en-MY"),
          change: usersChange.change,
          trend: usersChange.trend,
          icon: Users,
        },
        {
          title: "Active Routes",
          value: activeRoutes.toLocaleString("en-MY"),
          change: routesChange.change,
          trend: routesChange.trend,
          icon: RouteIcon,
        },
      ]);

      const paymentsByBookingIndex = paymentRows
        .filter((payment) => payment.status === "paid")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

      setRecentBookings(
        bookingRows.slice(0, 5).map((booking, index) => {
          const schedule = schedulesById.get(booking.schedule_id);
          const route = schedule
            ? routesById.get(schedule.route_id)
            : undefined;
          const profile = profilesById.get(booking.user_id);
          const payment = paymentsByBookingIndex[index];

          return {
            id: booking.id,
            passenger: profile?.first_name || "User unavailable",
            route:
              route?.route_name ||
              `${route?.from_city || "-"} to ${route?.to_city || "-"}`,
            date: new Date(booking.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            status:
              booking.status?.charAt(0).toUpperCase() +
                booking.status?.slice(1).toLowerCase() || "Unknown",
            amount: formatCurrency(
              Number(payment?.amount || route?.price || 0),
            ),
          };
        }),
      );

      const routeBookingCounts = new Map<
        string,
        { route: string; bookings: number; revenue: number }
      >();

      bookingRows.forEach((booking) => {
        const schedule = schedulesById.get(booking.schedule_id);
        const route = schedule ? routesById.get(schedule.route_id) : undefined;

        if (!route) return;

        const key = route.id;
        const existing = routeBookingCounts.get(key);

        if (existing) {
          existing.bookings += 1;
          existing.revenue += Number(route.price || 0);
        } else {
          routeBookingCounts.set(key, {
            route: route.route_name || `${route.from_city} to ${route.to_city}`,
            bookings: 1,
            revenue: Number(route.price || 0),
          });
        }
      });

      setTopRoutes(
        [...routeBookingCounts.values()]
          .sort((a, b) => b.bookings - a.bookings)
          .slice(0, 5)
          .map((route) => ({
            route: route.route,
            bookings: route.bookings,
            revenue: formatCurrency(route.revenue),
          })),
      );
    } catch (error) {
      console.error("Unexpected admin dashboard error:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s your business overview.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
                )}
                <span
                  className={
                    stat.trend === "up" ? "text-green-500" : "text-red-500"
                  }
                >
                  {stat.change}
                </span>
                <span className="ml-1 text-muted-foreground">
                  from last month
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Latest booking transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{booking.passenger}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.route}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{booking.amount}</p>
                    <Badge
                      variant={
                        booking.status === "Confirmed"
                          ? "default"
                          : booking.status === "Pending"
                            ? "secondary"
                            : "destructive"
                      }
                      className="mt-1"
                    >
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Routes</CardTitle>
            <CardDescription>Most popular routes by bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topRoutes.map((route, index) => (
                <div key={route.route} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{route.route}</p>
                    <p className="text-xs text-muted-foreground">
                      {route.bookings} bookings
                    </p>
                  </div>
                  <p className="text-sm font-medium text-primary">
                    {route.revenue}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
