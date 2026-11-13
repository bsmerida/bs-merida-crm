// app/api/citas/confirmar-cliente/route.ts
// El cliente elige una de las opciones propuestas por el asesor (link del email,
// autenticado por el client_token secreto de la solicitud).
//
// GET solo lleva a la página con el botón "Confirmar": los filtros de correo abren
// los links para revisarlos y antes eso podía confirmar la cita sin que el cliente
// la eligiera. La confirmación ocurre en el POST del botón.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { confirmRequest, etiquetaFecha } from "@/lib/citas";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/", SITE));
  const url = new URL("/cita-elegir", SITE);
  url.searchParams.set("token", token);
  url.searchParams.set("option", searchParams.get("option") || "0");
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const token     = String(form?.get("token") || "");
  const optionIdx = Number(form?.get("option") || "0");
  // 303: el navegador sigue la redirección con GET
  const go = (path: string) => NextResponse.redirect(new URL(path, SITE), 303);

  if (!token) return go("/");

  const db = createAdminClient();
  const { data: request } = await db
    .from("appointment_requests").select("*").eq("client_token", token).maybeSingle();

  if (!request || request.status !== "rescheduled") return go("/cita-confirmada?status=already");

  // El cliente elige entre las opciones del ASESOR (no las suyas)
  const chosen = (request.agent_options as { date: string; time: string }[])?.[optionIdx];
  if (!chosen) return go("/cita-confirmada?status=error");

  if (!await confirmRequest(db, request, chosen, "rescheduled")) return go("/cita-confirmada?status=already");

  return go(`/cita-confirmada?date=${encodeURIComponent(etiquetaFecha(chosen.date))}&time=${encodeURIComponent(chosen.time)}`);
}
