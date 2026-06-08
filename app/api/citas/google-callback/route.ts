import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { property_id, agent_id, client_name, client_phone, client_email, date, time, property_title } = body;

  if (!property_id || !client_name || !client_phone || !date || !time) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  // Usar service role para saltarse RLS en todas las operaciones
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const starts_at = new Date(`${date}T${time}:00-06:00`).toISOString();
  const ends_at   = new Date(new Date(starts_at).getTime() + 60 * 60_000).toISOString();

  let googleEventId: string | null = null;
  let gcError: string | null = null;

  // ── Google Calendar ────────────────────────────────────────────────────────
  if (agent_id) {
    const { data: tokenRow } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("profile_id", agent_id)
      .single();

    if (tokenRow) {
      let accessToken = tokenRow.access_token;

      // Refrescar si está expirado
      if (Date.now() > tokenRow.expiry - 60_000) {
        const refreshed = await refreshAccessToken(tokenRow.refresh_token);
        if (refreshed.access_token) {
          accessToken = refreshed.access_token;
          await supabase.from("google_calendar_tokens").update({
            access_token: refreshed.access_token,
            expiry:       Date.now() + refreshed.expires_in * 1000,
            updated_at:   new Date().toISOString(),
          }).eq("profile_id", agent_id);
        }
      }

      // Obtener email del asesor para incluirlo como attendee
      const { data: agentProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", agent_id)
        .single();

      const attendees = [];
      if (agentProfile?.email) attendees.push({ email: agentProfile.email, displayName: agentProfile.full_name || undefined });
      if (client_email)        attendees.push({ email: client_email, displayName: client_name });

      const event = {
        summary:     `Visita: ${property_title || "Propiedad Duclaud"}`,
        description: `Cliente: ${client_name}\nTeléfono: ${client_phone}${client_email ? `\nEmail: ${client_email}` : ""}\n\nAgendado desde duclaud.mx`,
        start:       { dateTime: starts_at, timeZone: "America/Merida" },
        end:         { dateTime: ends_at,   timeZone: "America/Merida" },
        attendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 1440 }, // 24h antes
            { method: "email", minutes: 60  }, // 1h antes
            { method: "popup", minutes: 30  },
          ],
        },
      };

      // sendUpdates=all → Google manda invitación por email a todos los attendees
      const calendarId = tokenRow.calendar_id || "primary";
      const gcRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
        {
          method: "POST",
          headers: {
            Authorization:  `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      const gcData = await gcRes.json();
      if (gcData.id) {
        googleEventId = gcData.id;
      } else {
        gcError = gcData.error?.message || "Error desconocido de Google Calendar";
        console.error("Google Calendar error:", gcData);
      }
    }
  }

  // ── Auto-crear o actualizar lead ───────────────────────────────────────────
  let leadId: string | null = null;

  const { data: existingByPhone } = client_phone
    ? await supabase.from("leads").select("id").eq("phone", client_phone).maybeSingle()
    : { data: null };

  const { data: existingByEmail } = (!existingByPhone && client_email)
    ? await supabase.from("leads").select("id").eq("email", client_email).maybeSingle()
    : { data: null };

  const existingLead = existingByPhone || existingByEmail;

  if (existingLead) {
    await supabase.from("leads").update({
      last_contact_at: new Date().toISOString(),
      notes:           `Cita agendada para visitar: ${property_title || "propiedad"} el ${date} a las ${time} hrs.`,
      updated_at:      new Date().toISOString(),
    }).eq("id", existingLead.id);
    leadId = existingLead.id;
  } else {
    const { data: newLead } = await supabase.from("leads").insert({
      name:            client_name,
      phone:           client_phone || null,
      email:           client_email || null,
      source:          "Sitio web — Cita",
      status:          "Nuevo",
      agent_id:        agent_id || null,
      interest:        property_title ? `Visitó: ${property_title}` : null,
      notes:           `Cita agendada para el ${date} a las ${time} hrs.`,
      consent_privacy: true,
      consent_at:      new Date().toISOString(),
      last_contact_at: new Date().toISOString(),
    }).select("id").single();
    leadId = newLead?.id || null;
  }

  // ── Guardar cita ───────────────────────────────────────────────────────────
  const { data: appt, error } = await supabase
    .from("appointments")
    .insert({
      property_id,
      agent_id:        agent_id || null,
      lead_id:         leadId,
      client_name,
      client_phone,
      client_email:    client_email || null,
      starts_at,
      ends_at,
      google_event_id: googleEventId,
      status:          "confirmed",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok:          true,
    appointment: appt,
    lead_id:     leadId,
    gc_synced:   !!googleEventId,
    gc_error:    gcError,
  });
}
