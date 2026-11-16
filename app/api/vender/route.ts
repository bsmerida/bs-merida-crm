// app/api/vender/route.ts
// Formulario público de /vender ("Solicita tu valuación"): mismo patrón que
// /api/contacto, valida en el servidor e inserta un lead con el detalle de
// la propiedad en el campo "interest".
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/security";
import { validatePhone } from "@/lib/validation";

const TIPOS = ["Casa", "Departamento", "Terreno", "Local u oficina"];

export async function POST(req: NextRequest) {
  if (!await rateLimit(`vender:${clientIp(req.headers)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados envíos. Intente más tarde o escríbanos por WhatsApp." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const tipo     = typeof body?.tipo === "string" && TIPOS.includes(body.tipo) ? body.tipo : "";
  const location = typeof body?.location === "string" ? body.location.trim().slice(0, 200) : "";
  const m2       = typeof body?.m2 === "string" ? body.m2.trim().slice(0, 20) : "";
  const phone    = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!tipo) return NextResponse.json({ error: "Elija el tipo de propiedad." }, { status: 400 });
  if (location.length < 3) return NextResponse.json({ error: "Escriba la ubicación." }, { status: 400 });
  if (!validatePhone(phone)) return NextResponse.json({ error: "Teléfono inválido." }, { status: 400 });

  const interest = `Quiere vender: ${tipo} en ${location}` + (m2 ? `, ${m2} m²` : "");
  const now = new Date().toISOString();
  const { error } = await createAdminClient().from("leads").insert({
    name: `Solicitud de valuación (${phone})`, phone,
    source: "Vender", interest,
    consent_privacy: true, consent_at: now, last_contact_at: now,
  });
  if (error) {
    console.error("[vender]", error.message);
    return NextResponse.json({ error: "No pudimos enviar su solicitud. Intente por WhatsApp." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
