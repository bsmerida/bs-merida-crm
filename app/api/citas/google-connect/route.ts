// app/api/citas/google-connect/route.ts
// Inicia la conexión con Google Calendar para el usuario con sesión.
// Genera un nonce (state) que se guarda en cookie y el callback lo verifica.
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx";

export async function GET() {
  const auth = await getAuth();
  if (!auth) return NextResponse.redirect(new URL("/login", SITE));

  const state = randomBytes(24).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  `${SITE}/api/citas/google-callback`,
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
    access_type:   "offline",
    prompt:        "consent",
    state,
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set("gcal_oauth_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/citas/google-callback",
  });
  return res;
}
