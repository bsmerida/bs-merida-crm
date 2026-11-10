// app/api/contacto/route.ts
// Formulario público de /contacto. Antes el navegador insertaba directo en
// "leads" con la llave anónima: sin validación, sin límite y mostrando
// "enviado" aunque fallara.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/security";
import { validateEmail, validatePhone } from "@/lib/validation";

export async function POST(req: NextRequest) {
  if (!await rateLimit(`contacto:${clientIp(req.headers)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados envíos. Intente más tarde o escríbanos por WhatsApp." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const name    = typeof body?.name === "string" ? body.name.trim() : "";
  const phone   = typeof body?.phone === "string" ? body.phone.trim() : "";
  const email   = typeof body?.email === "string" ? body.email.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : "";

  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Escriba su nombre." }, { status: 400 });
  if (!validatePhone(phone)) return NextResponse.json({ error: "Teléfono inválido." }, { status: 400 });
  if (email && !validateEmail(email)) return NextResponse.json({ error: "Correo inválido." }, { status: 400 });

  const now = new Date().toISOString();
  const { error } = await createAdminClient().from("leads").insert({
    name, phone, email: email || null,
    source: "Sitio web", interest: message || null,
    consent_privacy: true, consent_at: now, last_contact_at: now,
  });
  if (error) {
    console.error("[contacto]", error.message);
    return NextResponse.json({ error: "No pudimos enviar su mensaje. Intente por WhatsApp." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
