"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Activity,
  User,
  Bus,
  Route,
  Settings,
  CreditCard,
  Filter,
} from "lucide-react";

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  user: string;
  userRole: "Admin" | "Staff" | "User";
  category: "booking" | "user" | "route" | "operator" | "system";
  timestamp: string;
  ip: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  booking: <CreditCard className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  route: <Route className="h-4 w-4" />,
  operator: <Bus className="h-4 w-4" />,
  system: <Settings className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  booking: "bg-blue-100 text-blue-800",
  user: "bg-green-100 text-green-800",
  route: "bg-purple-100 text-purple-800",
  operator: "bg-orange-100 text-orange-800",
  system: "bg-gray-100 text-gray-800",
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Fetch all activities from database
  useEffect(() => {
    const init = async () => {
      try {
        // SR1: Session validation
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.warn("No session");
          window.location.href = "/admin-login";
          return;
        }

        const userId = session.user.id;

        // SR2: Role-based access control (RBAC)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (profileError || !profile || profile.role !== "admin") {
          console.warn("Unauthorized access");

          // SR3: Force logout
          await supabase.auth.signOut();
          window.location.href = "/admin-login";
          return;
        }

        // SR4: Only fetch AFTER security passes
        await fetchActivities();
      } catch (err) {
        console.error("Security check failed:", err);
        window.location.href = "/admin-login";
      }
    };

    init();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const activities: ActivityLog[] = [];

      // 1. Fetch bookings data
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          id,
          status,
          created_at,
          user_id,
          schedules (
            departure_time,
            routes (
              from_city,
              to_city
            )
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (bookingsError) {
        console.error("❌ Bookings fetch error:", bookingsError);
      } else if (bookings) {
        console.log("📋 Fetched bookings:", bookings.length);
        // Fetch user profiles for bookings
        for (const booking of bookings) {
          try {
            const { data: userData, error: profileError } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", booking.user_id)
              .maybeSingle();

            if (profileError) {
              console.warn(
                `⚠️ Profile fetch warning for user ${booking.user_id}:`,
                profileError.message,
              );
            }

            const route = booking.schedules?.[0]?.routes?.[0];
            // SR5: Ensure real user identity (no generic "User")
            const userName = userData?.first_name
              ? `${userData.first_name} ${userData.last_name || ""}`.trim()
              : "Unknown User";

            console.log(`👤 Booking user: ${userName}`);

            activities.push({
              id: booking.id,
              action:
                booking.status === "cancelled"
                  ? "Booking Cancelled"
                  : "Booking Created",
              description: route
                ? `${booking.status === "cancelled" ? "Booking cancelled" : "New booking"} for route ${route.from_city} to ${route.to_city}`
                : "Booking activity",
              user: userName,
              userRole: "User",
              category: "booking",
              timestamp: new Date(booking.created_at).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
              ip: "N/A",
            });
          } catch (error) {
            console.error("❌ Error processing booking:", error);
          }
        }
      }

      // 2. Fetch routes data
      const { data: routes, error: routesError } = await supabase
        .from("routes")
        .select("id, from_city, to_city, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!routesError && routes) {
        for (const route of routes) {
          activities.push({
            id: `route-${route.id}`,
            action: "Route Added",
            description: `New route ${route.from_city} to ${route.to_city} added`,
            user: "Admin",
            userRole: "Admin",
            category: "route",
            timestamp: new Date(route.created_at).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            ip: "192.168.1.1",
          });
        }
      }

      // 3. Fetch operators data
      const { data: operators, error: operatorsError } = await supabase
        .from("operators")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!operatorsError && operators) {
        for (const operator of operators) {
          activities.push({
            id: `operator-${operator.id}`,
            action: "Operator Added",
            description: `New operator ${operator.name} added to system`,
            user: "Admin",
            userRole: "Admin",
            category: "operator",
            timestamp: new Date(operator.created_at).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            ip: "192.168.1.1",
          });
        }
      }

      // 4. Fetch activity log (sign in, sign up, etc.)
      const { data: activityLogs, error: activityLogsError } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!activityLogsError && activityLogs) {
        for (const log of activityLogs) {
          activities.push({
            id: `activity-${log.id}`,
            action: log.action || "Activity",
            description: log.description || "",
            user: log.user_name || "Unknown User",
            userRole: "User",
            category: log.category || "user",
            timestamp: new Date(log.created_at).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            ip: log.ip || "N/A",
          });
        }
      }

      // 5. Fetch user registrations from profiles table (for additional user activities)
      const { data: profileUsers, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!profilesError && profileUsers) {
        for (const user of profileUsers) {
          // Only add if not already logged in activity_log
          if (
            !activityLogs?.some(
              (log) => log.user_id === user.id && log.action === "Sign Up",
            )
          ) {
            activities.push({
              id: `user-${user.id}`,
              action: "User Registered",
              description: `New user ${user.full_name} registered`,
              user: user.full_name || "Unknown User",
              userRole: "User",
              category: "user",
              timestamp: new Date(user.created_at).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
              ip: "N/A",
            });
          }
        }
      }

      // 6. Fetch payments (SR6: financial activity tracking)
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("id, amount, status, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!paymentsError && payments) {
        for (const payment of payments) {
          // fetch user
          const { data: userData } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", payment.user_id)
            .maybeSingle();

          const userName = userData?.first_name
            ? `${userData.first_name} ${userData.last_name || ""}`.trim()
            : "Unknown User";

          activities.push({
            id: `payment-${payment.id}`,
            action: "Payment Completed",
            description: `Payment of RM${payment.amount} (${payment.status})`,
            user: userName,
            userRole: "User",
            category: "system", // or "booking" if you want grouped
            timestamp: new Date(payment.created_at).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            ip: "N/A",
          });
        }
      }

      // Sort by timestamp (most recent first)
      activities.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });

      setLogs(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || log.category === categoryFilter;
    const matchesRole = roleFilter === "all" || log.userRole === roleFilter;
    return matchesSearch && matchesCategory && matchesRole;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Activity Logs</h1>
        <p className="text-muted-foreground">
          Monitor all system activities and user actions
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Activities
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bookings
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter((l) => l.category === "booking").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              User Actions
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter((l) => l.category === "user").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Admin Actions
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter((l) => l.userRole === "Admin").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                Recent system and user activities
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="booking">Bookings</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="route">Routes</SelectItem>
                  <SelectItem value="operator">Operators</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="User">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center">
                <Activity className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">
                  Loading activities...
                </p>
              </div>
            ) : (
              <>
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${categoryColors[log.category]}`}
                    >
                      {categoryIcons[log.category]}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {log.action}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {log.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {log.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {log.userRole}
                        </Badge>
                        <span>IP: {log.ip}</span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {log.timestamp}
                    </div>
                  </div>
                ))}

                {filteredLogs.length === 0 && !loading && (
                  <div className="py-12 text-center">
                    <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">
                      No activities found
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-6 flex justify-center">
            <Button variant="outline" disabled={loading}>
              Load More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
