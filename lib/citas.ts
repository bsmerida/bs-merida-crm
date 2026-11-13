// lib/citas.ts
// Confirmación de solicitudes de visita (compartida por el CRM y el link del cliente).
import type { SupabaseClient } from "@supabase/supabase-js";
import { emailClienteConfirmado, sendEmail } from "@/lib/emails";
import { createCalendarEvent, getCalendarAccess, MERIDA_TZ } from "@/lib/google-calendar";
import type { SlotOption } from "@/lib/validation";

// Asesora por defecto cuando la solicitud no trae agent_id.
export const FALLBACK_AGENT_ID = process.env.FALLBACK_AGENT_ID || "15f01899-4206-4613-bb01-e26ea4ba003f";

const DAYS   = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

// "Sábado 21 de noviembre" para una fecha YYYY-MM-DD
export function etiquetaFecha(date: string): string {
  const d = new Date(`${date}T12:00:00-06:00`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}

// Confirma la solicitud solo si sigue en `fromStatus`. Devuelve false si ya la había
// confirmado alguien más (doble clic, asesor y cliente a la vez): así no se crean
// dos eventos en el calendario ni se mandan dos correos.
export async function confirmRequest(
  db: SupabaseClient, request: any, confirmed: SlotOption, fromStatus: "pending" | "rescheduled",
): Promise<boolean> {
  const { data: claimed } = await db.from("appointment_requests").update({
    status:           "confirmed",
    confirmed_option: confirmed,
    updated_at:       new Date().toISOString(),
  }).eq("id", request.id).eq("status", fromStatus).select("id");
  if (!claimed?.length) return false;

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

  if (googleEventId) {
    await db.from("appointment_requests").update({ google_event_id: googleEventId }).eq("id", request.id);
  }

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
  return true;
}
