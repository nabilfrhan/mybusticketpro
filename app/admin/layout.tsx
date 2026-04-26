"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bus,
  LayoutDashboard,
  Building2,
  Route,
  Activity,
  Users,
  LogOut,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

const sidebarItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/operators", icon: Building2, label: "Operators" },
  { href: "/admin/buses", icon: Bus, label: "Buses" },
  { href: "/admin/routes", icon: Route, label: "Routes" },
  { href: "/admin/schedules", icon: Calendar, label: "Schedules" },
  { href: "/admin/activity", icon: Activity, label: "Activity Logs" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-muted">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Bus className="h-8 w-8 text-primary" />
            <div>
              <span className="text-lg font-bold text-foreground">
                MyBusTicket
              </span>
              <span className="ml-1 text-xs text-muted-foreground">Admin</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {sidebarItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-foreground">
                  Admin User
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="mt-2 w-full justify-start text-muted-foreground"
              onClick={async () => {
                try {
                  // SR1: Get current user BEFORE logout (needed for logging)
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();

                  // SR2: Log activity (must be before signOut)
                  if (user) {
                    await fetch("/api/activity-log", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "Admin Sign Out", // change to "Sign Out" if user side
                        description: "Admin logged out of the system",
                        user_id: user.id,
                        user_name: user.email,
                        category: "system",
                      }),
                    });
                  }

                  // SR3: Proper session termination
                  const { error } = await supabase.auth.signOut();

                  if (error) {
                    console.error("Logout error:", error);
                    alert("Failed to sign out");
                    return;
                  }

                  // SR4: Clear client state (extra safety)
                  localStorage.clear();
                  sessionStorage.clear();

                  // SR5: Secure redirect AFTER logout
                  window.location.href = "/admin-login";
                } catch (err) {
                  // SR6: Fail-safe error handling
                  console.error("Unexpected logout error:", err);
                  alert("Something went wrong");
                }
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  );
}
