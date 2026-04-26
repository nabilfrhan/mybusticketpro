"use client";
import Link from "next/link";
import { Bus, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface HeaderProps {
  userRole?: "guest" | "user" | "staff" | "admin";
  userName?: string;
}

export function Header({ userRole = "guest", userName }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 🔥 NEW STATE (session-based)
  const [userRoleState, setUserRoleState] = useState(userRole);
  const [userNameState, setUserNameState] = useState(userName);

  // 🔥 SESSION + PROFILE FETCH
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserRoleState("user");

        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserNameState(profile.first_name);
        }
      } else {
        setUserRoleState("guest");
        setUserNameState("");
      }
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;

        if (currentUser) {
          setUserRoleState("user");

          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("id", currentUser.id)
            .single();

          if (profile) {
            setUserNameState(profile.first_name);
          }
        } else {
          setUserRoleState("guest");
          setUserNameState("");
        }
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Bus className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-foreground">
            MyBusTicket Pro
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-foreground hover:text-primary"
          >
            Home
          </Link>
          {(userRoleState === "admin" || userRoleState === "staff") && (
            <>
              {userRoleState === "admin" && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/staff"
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                Staff
              </Link>
            </>
          )}
        </nav>

        {/* User Menu */}
        <div className="hidden items-center gap-4 md:flex">
          {userRoleState === "guest" ? (
            <>
              <Link href="/signin">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  <span>{userNameState || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Link href="/bookings">My Bookings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={async () => {
                    try {
                      // SR1: Get current user BEFORE logout
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();

                      // SR2: Log user sign out activity
                      if (user) {
                        await fetch("/api/activity-log", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "Sign Out",
                            description: "User signed out",
                            user_id: user.id,
                            user_name: user.email,
                            category: "user",
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

                      // SR4: Clear client state
                      setUserRoleState("guest");
                      setUserNameState("");

                      // SR5: Optional extra safety
                      localStorage.clear();
                      sessionStorage.clear();

                      // SR6: Redirect after logout
                      window.location.href = "/";
                    } catch (err) {
                      // SR7: Fail-safe error handling
                      console.error("Unexpected logout error:", err);
                      alert("Something went wrong");
                    }
                  }}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-card px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Home
            </Link>
            <Link
              href="/search"
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Search Buses
            </Link>
            <Link
              href="/routes"
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Routes
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              About
            </Link>

            <div className="flex flex-col gap-2 pt-4 border-t">
              {userRoleState === "guest" ? (
                <>
                  <Link href="/signin">
                    <Button variant="ghost" size="sm" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm" className="w-full">
                      Sign Up
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/bookings">
                    <Button variant="ghost" size="sm" className="w-full">
                      My Bookings
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setUserRoleState("guest");
                      setUserNameState("");
                      window.location.href = "/";
                    }}
                  >
                    Sign Out
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
