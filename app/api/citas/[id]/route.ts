import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const FALLBACK_AGENT_ID = "15f01899-4206-4613-bb01-e26ea4ba003f";

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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: appt, error: fetchError } = await supabase
    .from("appointment_requests")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchError || !appt) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  // Eliminar evento de Google Calendar si existe
  if (appt.google_event_id) {
    const agentId = appt.agent_id || FALLBACK_AGENT_ID;
    const { data: tokenRow } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("profile_id", agentId)
      .single();

    if (tokenRow) {
      let accessToken = tokenRow.access_token;
      if (Date.now() > tokenRow.expiry - 60_000) {
        const refreshed = await refreshAccessToken(tokenRow.refresh_token);
        if (refreshed.access_token) {
          accessToken = refreshed.access_token;
          await supabase.from("google_calendar_tokens").update({
            access_token: refreshed.access_token,
            expiry:       Date.now() + refreshed.expires_in * 1000,
            updated_at:   new Date().toISOString(),
          }).eq("profile_id", agentId);
        }
      }

      const calendarId = tokenRow.calendar_id || "primary";
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${appt.google_event_id}?sendUpdates=all`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
    }
  }

  const { error } = await supabase
    .from("appointment_requests")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
} 
