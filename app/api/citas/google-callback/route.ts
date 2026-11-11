import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx";

function redirectAjustes(query: string) {
  const res = NextResponse.redirect(new URL(`/admin/ajustes?${query}`, SITE));
  res.cookies.delete({ name: "gcal_oauth_state", path: "/api/citas/google-callback" });
  return res;
}

function sameState(a: string, b: string) {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code   = searchParams.get("code");
  const state  = searchParams.get("state");
  const cookie = req.cookies.get("gcal_oauth_state")?.value;

  // El token se guarda para el usuario con sesión, nunca para un id que venga
  // en la URL. Y el state debe coincidir con el nonce que pusimos en cookie
  // (/api/citas/google-connect), para que nadie pueda forzar esta conexión.
  const auth = await getAuth();
  if (!auth) return NextResponse.redirect(new URL("/login", SITE));
  if (!code || !state || !cookie || !sameState(state, cookie)) {
    return redirectAjustes("calendar=error&reason=invalid_state");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  `${SITE}/api/citas/google-callback`,
      grant_type:    "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();

  if (!tokens.access_token || !tokens.refresh_token) {
    console.error("[GCal callback] Sin tokens:", tokens.error, tokens.error_description);
    return redirectAjustes(`calendar=error&reason=${encodeURIComponent(tokens.error || "no_tokens")}`);
  }

  const { error } = await createAdminClient()
    .from("google_calendar_tokens")
    .upsert({
      profile_id:    auth.userId,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry:        Date.now() + (tokens.expires_in || 3600) * 1000,
      calendar_id:   "primary",
      updated_at:    new Date().toISOString(),
    }, { onConflict: "profile_id" });

  if (error) {
    console.error("[GCal callback] Error al guardar token:", error.message);
    return redirectAjustes("calendar=error&reason=db_error");
  }
  return redirectAjustes("calendar=ok");
}
