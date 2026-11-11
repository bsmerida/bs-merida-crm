// app/api/citas/confirmar-cliente/route.ts
// El cliente elige una de las opciones propuestas por el asesor (link del email,
// autenticado por el client_token secreto de la solicitud).
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { confirmRequest } from "@/lib/citas";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx";

const DAYS   = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token     = searchParams.get("token");
  const optionIdx = Number(searchParams.get("option") || "0");

  if (!token) return NextResponse.redirect(new URL("/", SITE));

  const db = createAdminClient();
  const { data: request } = await db
    .from("appointment_requests").select("*").eq("client_token", token).maybeSingle();

  if (!request || request.status !== "rescheduled") {
    return NextResponse.redirect(new URL("/cita-confirmada?status=already", SITE));
  }

  // El cliente elige entre las opciones del ASESOR. Antes se reenviaba a
  // /responder con el índice y éste confirmaba client_options[idx]: la fecha equivocada.
  const chosen = (request.agent_options as { date: string; time: string }[])?.[optionIdx];
  if (!chosen) return NextResponse.redirect(new URL("/cita-confirmada?status=error", SITE));

  await confirmRequest(db, request, chosen);

  const d = new Date(`${chosen.date}T12:00:00-06:00`);
  const label = `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
  return NextResponse.redirect(
    new URL(`/cita-confirmada?date=${encodeURIComponent(label)}&time=${encodeURIComponent(chosen.time)}`, SITE),
  );
}
