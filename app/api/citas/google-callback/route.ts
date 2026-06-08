import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/citas/google-callback?code=...&state=PROFILE_ID
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code      = searchParams.get("code");
  const profileId = searchParams.get("state");

  if (!code || !profileId) {
    return NextResponse.redirect(new URL("/admin/ajustes?calendar=error", req.url));
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://duclaud.mx";

  // Intercambiar code por tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  `${baseUrl}/api/citas/google-callback`,
      grant_type:    "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokens.access_token || !tokens.refresh_token) {
    return NextResponse.redirect(new URL("/admin/ajustes?calendar=error", req.url));
  }

  const supabase = createClient();

  await supabase.from("google_calendar_tokens").upsert({
    profile_id:    profileId,
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry:        Date.now() + tokens.expires_in * 1000,
    calendar_id:   "primary",
    updated_at:    new Date().toISOString(),
  }, { onConflict: "profile_id" });

  return NextResponse.redirect(new URL("/admin/ajustes?calendar=ok", req.url));
}
