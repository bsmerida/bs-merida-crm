import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SLOT_DURATION = 60; // minutos
const WORK_START   = 9;   // 9am
const WORK_END     = 18;  // 6pm

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  return res.json();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id");
  const date    = searchParams.get("date"); // YYYY-MM-DD

  if (!agentId || !date) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const supabase = createClient();

  // Obtener token del asesor
  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("profile_id", agentId)
    .single();

  if (!tokenRow) {
    // Si el asesor no tiene Google Calendar conectado, devolver slots fijos
    return NextResponse.json({ slots: buildFixedSlots(date), connected: false });
  }

  // Refrescar token si está expirado
  let accessToken = tokenRow.access_token;
  if (Date.now() > tokenRow.expiry - 60_000) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    if (refreshed.access_token) {
      accessToken = refreshed.access_token;
      await supabase.from("google_calendar_tokens").update({
        access_token: refreshed.access_token,
        expiry: Date.now() + refreshed.expires_in * 1000,
        updated_at: new Date().toISOString(),
      }).eq("profile_id", agentId);
    }
  }

  // Consultar Google Calendar FreeBusy
  const timeMin = `${date}T00:00:00-06:00`;
  const timeMax = `${date}T23:59:59-06:00`;

  const fbRes = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: "America/Merida",
      items: [{ id: tokenRow.calendar_id || "primary" }],
    }),
  });

  const fbData = await fbRes.json();
  const busy: { start: string; end: string }[] =
    fbData.calendars?.[tokenRow.calendar_id || "primary"]?.busy || [];

  const slots = buildFixedSlots(date).map(slot => {
    const slotStart = new Date(`${date}T${slot}:00-06:00`).getTime();
    const slotEnd   = slotStart + SLOT_DURATION * 60_000;
    const isBusy = busy.some(b => {
      const bs = new Date(b.start).getTime();
      const be = new Date(b.end).getTime();
      return slotStart < be && slotEnd > bs;
    });
    return { time: slot, available: !isBusy };
  });

  return NextResponse.json({ slots, connected: true });
}

function buildFixedSlots(date: string): string[] {
  const slots: string[] = [];
  const day = new Date(`${date}T12:00:00-06:00`).getDay(); // 0=dom, 6=sab
  if (day === 0) return []; // domingo cerrado
  const end = day === 6 ? 14 : WORK_END; // sábado hasta 2pm
  for (let h = WORK_START; h < end; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}
