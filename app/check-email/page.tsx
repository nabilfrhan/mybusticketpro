"use client"

import Link from "next/link"

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p>We’ve sent you a confirmation link. Please verify your email.</p>
      </div>
    </div>
  )
}