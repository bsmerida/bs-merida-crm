// app/api/citas/solicitar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { emailAsesorNuevaSolicitud, sendEmail } from "@/lib/emails";

const FALLBACK_EMAIL = "bertha@duclaud.com.mx";

// ── Rate limiting simple en memoria (por IP) ──────────────────────────────
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now    = Date.now();
  const window = 60 * 60 * 1000; // 1 hora
  const limit  = 5; // máx 5 solicitudes por hora por IP

  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + window });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// ── Validaciones server-side ──────────────────────────────────────────────
function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return false;
  if (/^(\d)\1{9,}$/.test(digits)) return false;
  return true;
}

function validateEmail(email: string): boolean {
  if (!email) return true; // opcional
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email)) return false;
  const fakeDomains = ["test.com","example.com","fake.com","asdf.com"];
  const domain = email.split("@")[1]?.toLowerCase();
  if (fakeDomains.includes(domain)) return false;
  return true;
}

function validateName(name: string): boolean {
  return name.trim().length >= 3 && /\s/.test(name.trim());
}

function validateOptions(options: any[]): boolean {
  if (!Array.isArray(options) || options.length === 0 || options.length > 3) return false;
  return options.every(o =>
    typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) &&
    typeof o.time === "string" && /^\d{2}:\d{2}$/.test(o.time)
  );
}

export async function POST(req: NextRequest) {
  // Rate limiting por IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en una hora." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Request inválido" }, { status: 400 });

  const { property_id, property_title, agent_id, client_name, client_phone, client_email, options } = body;

  // Validaciones server-side
  if (!property_id || typeof property_id !== "string") {
    return NextResponse.json({ error: "Propiedad inválida" }, { status: 400 });
  }
  if (!client_name || !validateName(client_name)) {
    return NextResponse.json({ error: "Nombre inválido — ingresa nombre y apellido" }, { status: 400 });
  }
  if (!client_phone || !validatePhone(client_phone)) {
    return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });
  }
  if (client_email && !validateEmail(client_email)) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }
  if (!validateOptions(options)) {
    return NextResponse.json({ error: "Opciones de horario inválidas" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Auto-crear o actualizar lead
  let leadId: string | null = null;
  const { data: existingByPhone } = client_phone
    ? await supabase.from("leads").select("id").eq("phone", client_phone).maybeSingle()
    : { data: null };
  const { data: existingByEmail } = (!existingByPhone && client_email)
    ? await supabase.from("leads").select("id").eq("email", client_email).maybeSingle()
    : { data: null };
  const existing = existingByPhone || existingByEmail;

  if (existing) {
    await supabase.from("leads").update({
      last_contact_at: new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    }).eq("id", existing.id);
    leadId = existing.id;
  } else {
    const { data: newLead } = await supabase.from("leads").insert({
      name:            client_name.trim(),
      phone:           client_phone.trim(),
      email:           client_email?.trim() || null,
      source:          "Sitio web — Cita",
      status:          "Nuevo",
      agent_id:        agent_id || null,
      interest:        property_title ? `Interesado en: ${property_title}` : null,
      notes:           `Solicitó visita: ${options.map((o: any) => `${o.date} ${o.time}`).join(", ")}`,
      consent_privacy: true,
      consent_at:      new Date().toISOString(),
      last_contact_at: new Date().toISOString(),
    }).select("id").single();
    leadId = newLead?.id || null;
  }

  // Guardar solicitud
  const { data: request, error } = await supabase
    .from("appointment_requests")
    .insert({
      property_id,
      property_title:  property_title?.substring(0, 200) || null,
      agent_id:        agent_id || null,
      lead_id:         leadId,
      client_name:     client_name.trim(),
      client_phone:    client_phone.trim(),
      client_email:    client_email?.trim() || null,
      client_options:  options,
      status:          "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Error al guardar la solicitud" }, { status: 500 });
  }

  // Email al asesor
  let agentEmail: string = FALLBACK_EMAIL;
  let agentName          = "Bertha";
  if (agent_id) {
    const { data: agent } = await supabase
      .from("profiles").select("email, full_name").eq("id", agent_id).single();
    agentEmail = agent?.email || FALLBACK_EMAIL;
    agentName  = agent?.full_name || "Bertha";
  }

  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx"}/admin/citas/${request.id}`;
  const { html, subject } = emailAsesorNuevaSolicitud({
    requestId:     request.id,
    agentName,
    clientName:    client_name.trim(),
    clientPhone:   client_phone.trim(),
    clientEmail:   client_email,
    propertyTitle: property_title || "Propiedad",
    options,
    adminUrl,
  });
  await sendEmail({ to: agentEmail, subject, html }).catch(() => {});

  // Push notification
  await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx"}/api/push/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title:    "Nueva solicitud de visita",
      body:     `${client_name.trim()} quiere visitar ${property_title || "una propiedad"}`,
      url:      "/admin/citas",
      user_ids: agent_id ? [agent_id] : ["15f01899-4206-4613-bb01-e26ea4ba003f"],
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, request_id: request.id });
}
