import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = createClient();

  const starts_at = new Date(`${date}T${time}:00-06:00`).toISOString();
  const ends_at   = new Date(new Date(starts_at).getTime() + 60 * 60_000).toISOString();

  let googleEventId: string | null = null;

  // Crear evento en Google Calendar si el asesor tiene token
  if (agent_id) {
    const { data: tokenRow } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("profile_id", agent_id)
      .single();

    if (tokenRow) {
      let accessToken = tokenRow.access_token;
      if (Date.now() > tokenRow.expiry - 60_000) {
        const refreshed = await refreshAccessToken(tokenRow.refresh_token);
        if (refreshed.access_token) {
          accessToken = refreshed.access_token;
          await supabase.from("google_calendar_tokens").update({
            access_token: refreshed.access_token,
            expiry: Date.now() + refreshed.expires_in * 1000,
            updated_at: new Date().toISOString(),
          }).eq("profile_id", agent_id);
        }
      }

      const event = {
        summary: `Visita: ${property_title || "Propiedad Duclaud"}`,
        description: `Cliente: ${client_name}\nTeléfono: ${client_phone}${client_email ? `\nEmail: ${client_email}` : ""}`,
        start: { dateTime: starts_at, timeZone: "America/Merida" },
        end:   { dateTime: ends_at,   timeZone: "America/Merida" },
        attendees: client_email ? [{ email: client_email }] : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email",  minutes: 60 },
            { method: "popup",  minutes: 30 },
          ],
        },
      };

      const gcRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${tokenRow.calendar_id || "primary"}/events`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(event),
        }
      );
      const gcData = await gcRes.json();
      googleEventId = gcData.id || null;
    }
  }

  // ── Auto-crear o actualizar lead ──────────────────────────────────────────
  // Buscar por teléfono primero, luego por email
  let leadId: string | null = null;

  const { data: existingByPhone } = client_phone
    ? await supabase.from("leads").select("id").eq("phone", client_phone).maybeSingle()
    : { data: null };

  const { data: existingByEmail } = (!existingByPhone && client_email)
    ? await supabase.from("leads").select("id").eq("email", client_email).maybeSingle()
    : { data: null };

  const existingLead = existingByPhone || existingByEmail;

  if (existingLead) {
    // Actualizar last_contact_at y agregar nota de cita
    await supabase.from("leads").update({
      last_contact_at: new Date().toISOString(),
      notes: `Cita agendada para visitar: ${property_title || "propiedad"} el ${date} a las ${time} hrs.`,
      updated_at: new Date().toISOString(),
    }).eq("id", existingLead.id);
    leadId = existingLead.id;
  } else {
    // Crear lead nuevo
    const { data: newLead } = await supabase.from("leads").insert({
      name:             client_name,
      phone:            client_phone || null,
      email:            client_email || null,
      source:           "Sitio web — Cita",
      status:           "Nuevo",
      agent_id:         agent_id || null,
      interest:         property_title ? `Visitó: ${property_title}` : null,
      notes:            `Cita agendada para el ${date} a las ${time} hrs.`,
      consent_privacy:  true,
      consent_at:       new Date().toISOString(),
      last_contact_at:  new Date().toISOString(),
    }).select("id").single();
    leadId = newLead?.id || null;
  }

  // Guardar cita en Supabase
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

  return NextResponse.json({ ok: true, appointment: appt, lead_id: leadId });
}
