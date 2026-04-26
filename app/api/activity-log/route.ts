import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, description, user_id, user_name, category = "user" } = body

    console.log("🔍 Activity log received:", { action, user_name, category })

    // Get client IP
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "Unknown"

    // Insert activity log using admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from("activity_log")
      .insert([
        {
          action,
          description,
          user_id,
          user_name,
          category,
          ip,
          created_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) {
      console.error("❌ Activity log insert error:", error)
      return NextResponse.json(
        { 
          error: "Failed to log activity", 
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      )
    }

    console.log("✅ Activity logged successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("❌ Activity log catch error:", error)
    return NextResponse.json(
      { 
        error: "Failed to log activity", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
}
