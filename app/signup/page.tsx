"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bus, Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabaseClient";

export default function SignUpPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<any>({});
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ================= VALIDATION =================

  const validateField = (name: string, value: string) => {
    switch (name) {
      case "firstName":
      case "lastName":
        if (!value.trim()) return "Required";
        if (value.length > 30) return "Max 30 characters";
        if (!/^[A-Za-z\s]+$/.test(value)) return "Only letters allowed";
        return "";

      case "email":
        if (!value) return "Required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email";
        return "";

      case "phone":
        if (!value) return "Required";
        if (!/^\d{10,11}$/.test(value)) return "Must be 10-11 digits";
        return "";

      case "password":
        if (value.length < 6) return "Min 6 characters";
        if (value.length > 12) return "Max 12 characters";
        if (!/(?=.*[a-z])/.test(value)) return "Need lowercase";
        if (!/(?=.*[A-Z])/.test(value)) return "Need uppercase";
        if (!/(?=.*\d)/.test(value)) return "Need number";
        if (!/(?=.*[^A-Za-z\d])/.test(value)) return "Need symbol";
        return "";

      case "confirmPassword":
        if (value !== formData.password) return "Passwords do not match";
        return "";

      default:
        return "";
    }
  };

  // SR1: Controlled + validated input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData({ ...formData, [name]: value });

    // Live validation
    setErrors({
      ...errors,
      [name]: validateField(name, value),
    });
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // SR2: Final validation check
    const newErrors: any = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, (formData as any)[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!agreeTerms) {
      alert("Please agree to the terms");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
        },
        emailRedirectTo: "http://localhost:3001/signin",
      },
    });

    setIsLoading(false);

    // SR3: Error handling
    if (error) {
      alert(error.message);
      return;
    }

    // SR4: Activity logging
    if (data.user) {
      try {
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();

        await fetch("/api/activity-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "Sign Up",
            description: `New user ${formData.email} registered`,
            user_id: data.user.id,
            user_name: fullName || formData.email,
            category: "user",
          }),
        });
      } catch (err) {
        console.error(err);
      }
    }

    router.push("/check-email");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-4 flex items-center gap-2">
            <Bus className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">MyBusTicket Pro</span>
          </Link>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Sign up to start booking</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* FIRST NAME */}
            <div>
              <Input
                name="firstName"
                onChange={handleChange}
                maxLength={30}
                placeholder="First Name"
              />
              {errors.firstName && (
                <p className="text-xs text-red-500">{errors.firstName}</p>
              )}
            </div>

            {/* LAST NAME */}
            <div>
              <Input
                name="lastName"
                onChange={handleChange}
                maxLength={30}
                placeholder="Last Name"
              />
              {errors.lastName && (
                <p className="text-xs text-red-500">{errors.lastName}</p>
              )}
            </div>

            {/* EMAIL */}
            <div>
              <Input name="email" onChange={handleChange} placeholder="Email" />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* PHONE */}
            <div>
              <Input
                name="phone"
                onChange={handleChange}
                maxLength={11}
                placeholder="Phone"
              />
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone}</p>
              )}
            </div>

            {/* PASSWORD */}
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  onChange={handleChange}
                  maxLength={12}
                  className="pl-10 pr-10"
                  required
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password}</p>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  maxLength={12}
                  onChange={handleChange}
                  className="pl-10 pr-10"
                  required
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">
                    {errors.confirmPassword}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox onCheckedChange={(v) => setAgreeTerms(!!v)} />
              <label className="text-sm text-muted-foreground">
                I agree to the terms and conditions
              </label>
            </div>

            <Button type="submit" className="w-full">
              {isLoading ? "Creating..." : "Sign Up"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/signin" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
