"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bus, Eye, EyeOff, Mail, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabaseClient"

export default function AdminSignInPage() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // SR5: Input validation
    if (!email || !password) {
      alert("All fields required")
      return
    }

    if (password.length < 6) {
      alert("Invalid credentials")
      return
    }

    setIsLoading(true)

    // SR1: Authentication (Supabase Auth)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})

if (error || !data.user) {
  setIsLoading(false)
  // SR6: Generic error (do not expose details)
  alert("Invalid credentials")
  return
}

// SR2: Authorization (check role = admin)
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("role, first_name, last_name")
  .eq("id", data.user.id)
  .single()

if (profileError || !profile || profile.role !== "admin") {
  // SR3: Force logout if not admin
  await supabase.auth.signOut()

  setIsLoading(false)
  alert("Access denied")
  return
}

// SR4: Log admin sign in activity
try {
  const fullName = profile.first_name
    ? `${profile.first_name} ${profile.last_name || ""}`.trim()
    : data.user.email

  await fetch("/api/activity-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "Admin Sign In",
      description: "Admin logged into system",
      user_id: data.user.id,
      user_name: fullName,
      category: "system",
    }),
  })
} catch (logError) {
  // SR5: Logging failure should not break login
  console.error("Activity log failed:", logError)
}

// SR7: Successful redirect (admin only)
setIsLoading(false)
router.push("/admin")
}

return (
  <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
    <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-4 flex items-center gap-2">
            <Bus className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">MyBusTicket Pro</span>
          </Link>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>Sign in as administrator</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label className="text-sm text-muted-foreground">
                  Remember me
                </label>
              </div>

              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Admin access only
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}