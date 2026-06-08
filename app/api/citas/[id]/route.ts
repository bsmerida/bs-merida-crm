import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  // Obtener la cita para saber si tiene evento en Google Calendar
  const { data: appt, error: fetchError } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchError || !appt) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  // Eliminar evento de Google Calendar si existe
  if (appt.google_event_id && appt.agent_id) {
    const { data: tokenRow } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("profile_id", appt.agent_id)
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
          }).eq("profile_id", appt.agent_id);
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
      // sendUpdates=all → Google manda email de cancelación a los attendees
    }
  }

  // Borrar de Supabase
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
