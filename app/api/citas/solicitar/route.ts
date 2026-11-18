// app/api/citas/solicitar/route.ts
// Formulario público "Agendar visita".
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { crearSolicitudCita } from "@/lib/citas";
import { clientIp, isUuid, rateLimit } from "@/lib/security";
import { validateEmail, validateName, validateOptions, validatePhone } from "@/lib/validation";

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

  const result = await crearSolicitudCita(db, {
    propertyId:  property_id,
    clientName:  client_name,
    clientPhone: client_phone,
    clientEmail: client_email,
    options,
    agentIdHint: isUuid(agent_id) ? agent_id : null,
    source:      "Sitio web — Cita",
    adminUrl:    `${SITE}/admin/citas`, // antes apuntaba a /admin/citas/{id}, que no existe
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === "Propiedad inválida" ? 400 : 500 });
  return NextResponse.json({ ok: true, request_id: result.requestId });
}
