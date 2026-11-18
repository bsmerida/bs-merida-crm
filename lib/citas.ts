// lib/citas.ts
// Solicitar y confirmar visitas (compartido por el formulario público, Sofía y el CRM).
import type { SupabaseClient } from "@supabase/supabase-js";
import { emailAsesorNuevaSolicitud, emailClienteConfirmado, sendEmail } from "@/lib/emails";
import { createCalendarEvent, getCalendarAccess, MERIDA_TZ } from "@/lib/google-calendar";
import { sendPush } from "@/lib/push";
import { isUuid } from "@/lib/security";
import { validateOptions, type SlotOption } from "@/lib/validation";

// Asesora por defecto cuando la solicitud no trae agent_id.
export const FALLBACK_AGENT_ID = process.env.FALLBACK_AGENT_ID || "15f01899-4206-4613-bb01-e26ea4ba003f";
const FALLBACK_EMAIL = process.env.FALLBACK_AGENT_EMAIL || "bertha@duclaud.com.mx";

type SolicitudInput = {
  propertyId: string; clientName: string; clientPhone: string; clientEmail?: string | null;
  options: SlotOption[]; agentIdHint?: string | null; source?: string; adminUrl: string;
};

// Crea (o reutiliza, si ya existe por teléfono/correo) el lead y la solicitud
// de visita. La usan tanto el formulario público "Agendar visita" como Sofía,
// para no terminar con un lead duplicado cuando el cliente ya había dejado
// sus datos en el chat antes de pedir la visita.
export async function crearSolicitudCita(
  db: SupabaseClient, input: SolicitudInput,
): Promise<{ ok: true; requestId: string; propertyTitle: string } | { ok: false; error: string }> {
  const { data: property } = await db
    .from("properties").select("id, title, agent_id, is_published").eq("id", input.propertyId).maybeSingle();
  if (!property || !property.is_published) return { ok: false, error: "Propiedad inválida" };

  const agentId: string | null = property.agent_id || input.agentIdHint || null;
  const propertyTitle: string = property.title || "Propiedad";
  const name  = input.clientName.trim();
  const phone = input.clientPhone.trim();
  const email = input.clientEmail?.trim() || null;
  const now   = new Date().toISOString();

  let leadId: string | null = null;
  const { data: byPhone } = await db.from("leads").select("id").eq("phone", phone).limit(1).maybeSingle();
  const { data: byEmail } = !byPhone && email
    ? await db.from("leads").select("id").eq("email", email).limit(1).maybeSingle()
    : { data: null };
  const existing = byPhone || byEmail;

  if (existing) {
    await db.from("leads").update({ last_contact_at: now, updated_at: now }).eq("id", existing.id);
    leadId = existing.id;
  } else {
    const { data: newLead } = await db.from("leads").insert({
      name, phone, email,
      source:          input.source || "Sitio web — Cita",
      status:          "Nuevo",
      agent_id:        agentId,
      interest:        `Interesado en: ${propertyTitle}`,
      notes:           `Solicitó visita: ${input.options.map(o => `${o.date} ${o.time}`).join(", ")}`,
      consent_privacy: true,
      consent_at:      now,
      last_contact_at: now,
    }).select("id").single();
    leadId = newLead?.id || null;
  }

  const { data: request, error } = await db
    .from("appointment_requests")
    .insert({
      property_id:    input.propertyId,
      property_title: propertyTitle.substring(0, 200),
      agent_id:       agentId,
      lead_id:        leadId,
      client_name:    name,
      client_phone:   phone,
      client_email:   email,
      client_options: input.options,
      status:         "pending",
    })
    .select("id")
    .single();

  if (error || !request) return { ok: false, error: "Error al guardar la solicitud" };

  let agentEmail = FALLBACK_EMAIL;
  let agentName  = "Bertha";
  if (agentId) {
    const { data: agent } = await db.from("profiles").select("email, full_name").eq("id", agentId).single();
    agentEmail = agent?.email || FALLBACK_EMAIL;
    agentName  = agent?.full_name || agentName;
  }

  const { html, subject } = emailAsesorNuevaSolicitud({
    requestId:   request.id,
    agentName,
    clientName:  name,
    clientPhone: phone,
    clientEmail: email,
    propertyTitle,
    options:     input.options,
    adminUrl:    input.adminUrl,
  });
  await sendEmail({ to: agentEmail, subject, html }).catch(() => {});

  await sendPush([agentId || FALLBACK_AGENT_ID], {
    title: "Nueva solicitud de visita",
    body:  `${name} quiere visitar ${propertyTitle}`,
    url:   "/admin/citas",
  }).catch(() => {});

  return { ok: true, requestId: request.id, propertyTitle };
}

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

export type CitaTagData = {
  propertyId: string; clientName: string; clientPhone: string; clientEmail: string | null; options: SlotOption[];
};

// Lee el [CITA|...] que Sofía incluye en su respuesta cuando ya tiene propiedad +
// nombre + teléfono + al menos una fecha/hora. Función pura (sin red ni BD) para
// poder probarla sin tener que simular la API de Anthropic.
export function parseCitaTag(reply: string): { clean: string; data: CitaTagData | null } {
  const match = reply.match(/\[CITA\|([^\]]+)\]/);
  if (!match) return { clean: reply, data: null };
  const clean = reply.replace(/\[CITA\|[^\]]+\]\s*/g, "").trim();

  const campos: Record<string, string> = {};
  match[1].split("|").forEach(pair => {
    const [k, v] = pair.split("=");
    if (k && v) campos[k.trim()] = v.trim();
  });
  const options = [1, 2, 3]
    .map(n => ({ date: campos[`fecha${n}`], time: campos[`hora${n}`] }))
    .filter(o => o.date && o.time);

  if (!isUuid(campos.propiedad) || !campos.nombre || !campos.telefono || !validateOptions(options)) {
    return { clean, data: null };
  }
  return {
    clean,
    data: {
      propertyId:  campos.propiedad,
      clientName:  campos.nombre,
      clientPhone: campos.telefono,
      clientEmail: campos.correo || null,
      options,
    },
  };
}
