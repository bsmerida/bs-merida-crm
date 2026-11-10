// lib/citas.ts
// Confirmación de solicitudes de visita (compartida por el CRM y el link del cliente).
import type { SupabaseClient } from "@supabase/supabase-js";
import { emailClienteConfirmado, sendEmail } from "@/lib/emails";
import { createCalendarEvent, getCalendarAccess, MERIDA_TZ } from "@/lib/google-calendar";
import type { SlotOption } from "@/lib/validation";

// Asesora por defecto cuando la solicitud no trae agent_id.
export const FALLBACK_AGENT_ID = process.env.FALLBACK_AGENT_ID || "15f01899-4206-4613-bb01-e26ea4ba003f";

export async function confirmRequest(db: SupabaseClient, request: any, confirmed: SlotOption) {
  const startsAt = new Date(`${confirmed.date}T${confirmed.time}:00-06:00`).toISOString();
  const endsAt   = new Date(new Date(startsAt).getTime() + 60 * 60_000).toISOString();
  const agentId  = request.agent_id || FALLBACK_AGENT_ID;

  const { data: agent } = await db
    .from("profiles").select("email, full_name, phone").eq("id", agentId).single();

  let googleEventId: string | null = null;
  const access = await getCalendarAccess(db, agentId);
  if (access) {
    const attendees: { email: string; displayName?: string }[] = [];
    if (agent?.email)         attendees.push({ email: agent.email, displayName: agent.full_name || undefined });
    if (request.client_email) attendees.push({ email: request.client_email, displayName: request.client_name });

    googleEventId = await createCalendarEvent(access, {
      summary:     `Visita: ${request.property_title || "Propiedad Duclaud"}`,
      description: `Cliente: ${request.client_name}\nTeléfono: ${request.client_phone}${request.client_email ? `\nEmail: ${request.client_email}` : ""}\n\nAgendado desde duclaud.com.mx`,
      start:       { dateTime: startsAt, timeZone: MERIDA_TZ },
      end:         { dateTime: endsAt,   timeZone: MERIDA_TZ },
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 1440 },
          { method: "email", minutes: 60   },
          { method: "popup", minutes: 30   },
        ],
      },
    });
  } else {
    console.error("[GCal] Sin calendario conectado para agentId:", agentId);
  }

  await db.from("appointment_requests").update({
    status:           "confirmed",
    confirmed_option: confirmed,
    google_event_id:  googleEventId,
    updated_at:       new Date().toISOString(),
  }).eq("id", request.id);

  if (request.client_email) {
    const { html, subject } = emailClienteConfirmado({
      clientName:    request.client_name,
      agentName:     agent?.full_name || "Tu asesor",
      agentPhone:    agent?.phone,
      propertyTitle: request.property_title || "la propiedad",
      confirmed,
    });
    await sendEmail({ to: request.client_email, subject, html });
  }
}
