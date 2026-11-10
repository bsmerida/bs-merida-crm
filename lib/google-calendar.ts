// lib/google-calendar.ts
// Acceso a Google Calendar de un asesor. Antes esta lógica estaba copiada en 4 rutas.
import type { SupabaseClient } from "@supabase/supabase-js";

export const MERIDA_TZ = "America/Merida";

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

// Token válido del asesor (refrescándolo si expiró), o null si no conectó su calendario.
export async function getCalendarAccess(
  db: SupabaseClient, profileId: string,
): Promise<{ accessToken: string; calendarId: string } | null> {
  const { data: row } = await db
    .from("google_calendar_tokens").select("*").eq("profile_id", profileId).maybeSingle();
  if (!row) return null;

  let accessToken = row.access_token as string;
  if (Date.now() > row.expiry - 60_000) {
    const refreshed = await refreshAccessToken(row.refresh_token);
    if (!refreshed.access_token) {
      console.error("[GCal] No se pudo refrescar el token de", profileId, refreshed.error);
      return null;
    }
    accessToken = refreshed.access_token;
    await db.from("google_calendar_tokens").update({
      access_token: accessToken,
      expiry:       Date.now() + (refreshed.expires_in || 3600) * 1000,
      updated_at:   new Date().toISOString(),
    }).eq("profile_id", profileId);
  }
  return { accessToken, calendarId: row.calendar_id || "primary" };
}

export async function createCalendarEvent(
  access: { accessToken: string; calendarId: string }, event: Record<string, unknown>,
): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(access.calendarId)}/events?sendUpdates=all`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${access.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    },
  );
  const data = await res.json();
  if (!data.id) console.error("[GCal] Error al crear evento:", data.error?.message);
  return data.id || null;
}

export async function deleteCalendarEvent(
  access: { accessToken: string; calendarId: string }, eventId: string,
): Promise<void> {
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(access.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${access.accessToken}` } },
  );
}
