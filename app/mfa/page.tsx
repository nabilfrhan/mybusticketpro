"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function MFAPage() {
  const [code, setCode] = useState("")
  const [qr, setQr] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSetup, setIsSetup] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkMFA = async () => {
      const { data } = await supabase.auth.mfa.listFactors()

      const totpFactors = data?.totp

      if (totpFactors && totpFactors.length > 0) {
        // already enrolled → skip setup
        setFactorId(totpFactors[0].id)
        setIsSetup(false)
        return
      }

      // enroll only if no MFA
      const { data: enrollData, error } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",
        })

      if (error) {
        // ignore duplicate error silently
        if (!error.message.includes("already exists")) {
          console.error(error.message)
        }
        return
      }

      setQr(enrollData.totp.qr_code)
      setFactorId(enrollData.id)
      setIsSetup(true)
    }

    checkMFA()
  }, [])

  const handleVerify = async () => {
    if (!factorId) return

    setIsLoading(true)

    // Step 1: create challenge
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId,
      })

    if (challengeError) {
      console.error(challengeError.message)
      setIsLoading(false)
      return
    }

    // Step 2: verify
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })

    setIsLoading(false)

    if (verifyError) {
      console.error(verifyError.message)
      return
    }

    // success → home
    router.push("/")
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-6 text-center max-w-sm">

        <h1 className="text-2xl font-bold">
          {isSetup ? "Setup MFA" : "Enter MFA Code"}
        </h1>

        {/* QR (only first time) */}
        {isSetup && qr && (
          <div className="space-y-2">
            <p>Scan this QR code with Google Authenticator</p>
            <img src={qr} alt="QR Code" className="mx-auto" />
          </div>
        )}

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter 6-digit code"
          className="border p-3 text-center w-full"
        />

        <button
          onClick={handleVerify}
          disabled={isLoading}
          className="bg-black text-white px-4 py-2 w-full"
        >
          {isLoading
            ? "Verifying..."
            : isSetup
            ? "Verify & Activate MFA"
            : "Verify"}
        </button>
      </div>
    </div>
  )
}
