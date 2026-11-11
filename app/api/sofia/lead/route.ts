// app/api/sofia/lead/route.ts
// Guarda el lead que capturó Sofía y lo liga a la sesión del chat.
// Antes el navegador hacía insert().select() en "leads" con la llave anónima:
// eso solo funciona si la tabla de clientes es legible públicamente.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { clientIp, isUuid, rateLimit } from "@/lib/security";
import { validatePhone } from "@/lib/validation";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: NextRequest) {
  if (!await rateLimit(`sofia-lead:${clientIp(req.headers)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const lead = body?.lead || {};
  const name  = str(lead.nombre, 120);
  const phone = str(lead.telefono, 30);
  if (name.length < 2 || !validatePhone(phone)) {
    return NextResponse.json({ error: "Datos de contacto inválidos" }, { status: 400 });
  }

  const db = createAdminClient();

  // El contexto de la propiedad se lee de la BD, no del navegador
  const propertyId = isUuid(body?.propertyId) ? body.propertyId : null;
  const { data: property } = propertyId
    ? await db.from("properties").select("title, operation").eq("id", propertyId).eq("is_published", true).maybeSingle()
    : { data: null };

  const interest = property
    ? `Propiedad: ${property.title} | ${property.operation}`
    : `${str(lead.operacion, 40)} ${str(lead.zona, 120)}`.trim();

  const now = new Date().toISOString();
  const { data: saved, error } = await db.from("leads").insert({
    name, phone,
    source: property ? "Sofía IA – propiedad" : "Sofía IA",
    interest: interest || null,
    budget_text: str(lead.presupuesto, 120) || null,
    consent_privacy: true, consent_at: now, last_contact_at: now,
  }).select("id").single();

  if (error || !saved) {
    console.error("[sofia/lead]", error?.message);
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }

  // Ligar la sesión solo si existe y aún no tiene lead (no se puede reasignar una ajena)
  if (isUuid(body?.sessionId)) {
    await db.from("chatbot_sessions").update({
      visitor_name: name, visitor_phone: phone,
      visitor_data: { nombre: name, telefono: phone, presupuesto: str(lead.presupuesto, 120), zona: str(lead.zona, 120), operacion: str(lead.operacion, 40) },
      qualified: true, lead_id: saved.id,
    }).eq("id", body.sessionId).is("lead_id", null);
  }

  return NextResponse.json({ ok: true });
}
