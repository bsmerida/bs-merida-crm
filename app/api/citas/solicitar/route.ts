// app/api/citas/solicitar/route.ts
// Formulario público "Agendar visita".
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { emailAsesorNuevaSolicitud, sendEmail } from "@/lib/emails";
import { sendPush } from "@/lib/push";
import { FALLBACK_AGENT_ID } from "@/lib/citas";
import { clientIp, isUuid, rateLimit } from "@/lib/security";
import { validateEmail, validateName, validateOptions, validatePhone } from "@/lib/validation";

const FALLBACK_EMAIL = process.env.FALLBACK_AGENT_EMAIL || "bertha@duclaud.com.mx";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx";

export async function POST(req: NextRequest) {
  // Máx 5 solicitudes por hora por IP
  if (!await rateLimit(`solicitar:${clientIp(req.headers)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta de nuevo en una hora." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Request inválido" }, { status: 400 });

  const { property_id, agent_id, client_name, client_phone, client_email, options } = body;

  if (!isUuid(property_id)) {
    return NextResponse.json({ error: "Propiedad inválida" }, { status: 400 });
  }
  if (typeof client_name !== "string" || !validateName(client_name)) {
    return NextResponse.json({ error: "Nombre inválido — ingresa nombre y apellido" }, { status: 400 });
  }
  if (typeof client_phone !== "string" || !validatePhone(client_phone)) {
    return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });
  }
  if (client_email && (typeof client_email !== "string" || !validateEmail(client_email))) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }
  if (!validateOptions(options)) {
    return NextResponse.json({ error: "Opciones de horario inválidas" }, { status: 400 });
  }

  const db = createAdminClient();

  // El título y el asesor se toman de la BD, no del navegador: así nadie puede
  // mandar la notificación a otro asesor ni meter texto arbitrario en el email.
  const { data: property } = await db
    .from("properties").select("id, title, agent_id, is_published").eq("id", property_id).maybeSingle();
  if (!property || !property.is_published) {
    return NextResponse.json({ error: "Propiedad inválida" }, { status: 400 });
  }
  const agentId: string | null = property.agent_id || (isUuid(agent_id) ? agent_id : null);
  const propertyTitle: string = property.title || "Propiedad";

  const name  = client_name.trim();
  const phone = client_phone.trim();
  const email = client_email?.trim() || null;
  const now   = new Date().toISOString();

  // Auto-crear o actualizar lead
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
      name,
      phone,
      email,
      source:          "Sitio web — Cita",
      status:          "Nuevo",
      agent_id:        agentId,
      interest:        `Interesado en: ${propertyTitle}`,
      notes:           `Solicitó visita: ${options.map(o => `${o.date} ${o.time}`).join(", ")}`,
      consent_privacy: true,
      consent_at:      now,
      last_contact_at: now,
    }).select("id").single();
    leadId = newLead?.id || null;
  }

  const { data: request, error } = await db
    .from("appointment_requests")
    .insert({
      property_id,
      property_title: propertyTitle.substring(0, 200),
      agent_id:       agentId,
      lead_id:        leadId,
      client_name:    name,
      client_phone:   phone,
      client_email:   email,
      client_options: options,
      status:         "pending",
    })
    .select("id")
    .single();

  if (error || !request) {
    return NextResponse.json({ error: "Error al guardar la solicitud" }, { status: 500 });
  }

  // Email al asesor
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
    options,
    adminUrl:    `${SITE}/admin/citas`, // antes apuntaba a /admin/citas/{id}, que no existe
  });
  await sendEmail({ to: agentEmail, subject, html }).catch(() => {});

  await sendPush([agentId || FALLBACK_AGENT_ID], {
    title: "Nueva solicitud de visita",
    body:  `${name} quiere visitar ${propertyTitle}`,
    url:   "/admin/citas",
  }).catch(() => {});

  return NextResponse.json({ ok: true, request_id: request.id });
}
