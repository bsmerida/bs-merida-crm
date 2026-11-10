// app/api/citas/responder/[id]/route.ts
// El asesor acepta una opción del cliente o propone nuevas. Requiere sesión:
// antes cualquiera con el id de la solicitud podía confirmarla o reagendarla.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { canManage, getAuth } from "@/lib/auth";
import { confirmRequest, FALLBACK_AGENT_ID } from "@/lib/citas";
import { emailClienteNuevasOpciones, sendEmail } from "@/lib/emails";
import { validateOptions } from "@/lib/validation";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx";

// Link "Elegir →" del email al asesor
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) {
    // Sin sesión: mandarlo a iniciar sesión y que gestione desde el CRM
    return NextResponse.redirect(new URL("/login", SITE));
  }

  const { searchParams } = new URL(req.url);
  const optionIdx = Number(searchParams.get("option") || "0");
  const db = createAdminClient();

  const { data: request } = await db.from("appointment_requests").select("*").eq("id", params.id).single();
  if (!request || !canManage(auth, request.agent_id || FALLBACK_AGENT_ID)) {
    return NextResponse.redirect(new URL("/admin/citas?error=not_found", SITE));
  }

  if (searchParams.get("action") === "accept" && request.status === "pending") {
    const option = (request.client_options as any[])?.[optionIdx];
    if (!option) return NextResponse.redirect(new URL("/admin/citas?error=invalid_option", SITE));
    await confirmRequest(db, request, option);
    return NextResponse.redirect(new URL("/admin/citas?confirmed=1", SITE));
  }

  return NextResponse.redirect(new URL("/admin/citas", SITE));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Request inválido" }, { status: 400 });
  const { action, option_index, agent_options, agent_message } = body;

  const db = createAdminClient();
  const { data: request } = await db.from("appointment_requests").select("*").eq("id", params.id).single();
  if (!request || !canManage(auth, request.agent_id || FALLBACK_AGENT_ID)) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (action === "accept") {
    const option = (request.client_options as any[])?.[Number(option_index ?? 0)];
    if (!option) return NextResponse.json({ error: "Opción inválida" }, { status: 400 });
    await confirmRequest(db, request, option);
    return NextResponse.json({ ok: true, status: "confirmed" });
  }

  if (action === "reject") {
    if (!validateOptions(agent_options, 5)) {
      return NextResponse.json({ error: "Opciones de horario inválidas" }, { status: 400 });
    }
    const message = typeof agent_message === "string" ? agent_message.slice(0, 1000) : null;

    await db.from("appointment_requests").update({
      status:        "rescheduled",
      agent_options,
      agent_message: message,
      updated_at:    new Date().toISOString(),
    }).eq("id", params.id);

    if (request.client_email) {
      const { data: agent } = await db
        .from("profiles").select("full_name").eq("id", request.agent_id || FALLBACK_AGENT_ID).single();
      const { html, subject } = emailClienteNuevasOpciones({
        clientName:    request.client_name,
        agentName:     agent?.full_name || "Tu asesor",
        propertyTitle: request.property_title || "la propiedad",
        agentOptions:  agent_options,
        clientToken:   request.client_token,
        agentMessage:  message,
      });
      await sendEmail({ to: request.client_email, subject, html });
    }

    return NextResponse.json({ ok: true, status: "rescheduled" });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
