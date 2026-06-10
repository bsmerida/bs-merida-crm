// app/api/citas/confirmar-cliente/route.ts
// El cliente elige una de las opciones propuestas por el asesor
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { emailClienteConfirmado, sendEmail } from "@/lib/emails";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token     = searchParams.get("token");
  const optionIdx = parseInt(searchParams.get("option") || "0");

  if (!token) {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL!));
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: request } = await supabase
    .from("appointment_requests")
    .select("*")
    .eq("client_token", token)
    .single();

  if (!request || request.status === "confirmed") {
    return NextResponse.redirect(
      new URL("/cita-confirmada?status=already", process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }

  const agentOptions = request.agent_options as { date: string; time: string }[];
  const chosen       = agentOptions?.[optionIdx];

  if (!chosen) {
    return NextResponse.redirect(
      new URL("/cita-confirmada?status=error", process.env.NEXT_PUBLIC_SITE_URL!)
    );
  }

  // Reutilizar la misma lógica de confirmación
  const confirmRes = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/citas/responder/${request.id}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", option_index: optionIdx }),
    }
  );

  // Redirigir a página de éxito
  const d = new Date(`${chosen.date}T12:00:00-06:00`);
  const days   = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const label  = `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;

  return NextResponse.redirect(
    new URL(
      `/cita-confirmada?date=${encodeURIComponent(label)}&time=${encodeURIComponent(chosen.time)}`,
      process.env.NEXT_PUBLIC_SITE_URL!
    )
  );
}
