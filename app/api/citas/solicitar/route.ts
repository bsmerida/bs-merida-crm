// app/api/citas/solicitar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { emailAsesorNuevaSolicitud, sendEmail } from "@/lib/emails";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    property_id, property_title, agent_id,
    client_name, client_phone, client_email,
    options, // [{date, time}, {date, time}, {date, time}]
  } = body;

  if (!property_id || !client_name || !client_phone || !options?.length) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
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
      name:            client_name,
      phone:           client_phone || null,
      email:           client_email || null,
      source:          "Sitio web — Cita",
      status:          "Nuevo",
      agent_id:        agent_id || null,
      interest:        property_title ? `Interesado en: ${property_title}` : null,
      notes:           `Solicitó visita para: ${options.map((o: any) => `${o.date} ${o.time}`).join(", ")}`,
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
      property_title,
      agent_id:     agent_id || null,
      lead_id:      leadId,
      client_name,
      client_phone,
      client_email: client_email || null,
      client_options: options,
      status:       "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("[solicitar] DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Obtener datos del asesor
  let agentEmail: string | null = null;
  let agentName  = "Asesor";
  if (agent_id) {
    const { data: agent } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", agent_id)
      .single();
    agentEmail = agent?.email || null;
    agentName  = agent?.full_name || "Asesor";
  }

  // Enviar email al asesor
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://duclaud.mx"}/admin/citas/${request.id}`;
  if (agentEmail) {
    const { html, subject } = emailAsesorNuevaSolicitud({
      requestId:     request.id,
      agentName,
      clientName:    client_name,
      clientPhone:   client_phone,
      clientEmail:   client_email,
      propertyTitle: property_title || "Propiedad",
      options,
      adminUrl,
    });
    await sendEmail({ to: agentEmail, subject, html });
  }

  return NextResponse.json({ ok: true, request_id: request.id });
}
