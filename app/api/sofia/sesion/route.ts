// app/api/sofia/sesion/route.ts
// Crea la sesión del chatbot y guarda el saludo. Antes lo hacía el navegador
// con la llave anónima (requería permisos públicos de escritura en la BD).
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!await rateLimit(`sofia-sesion:${clientIp(req.headers)}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiadas sesiones" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const greeting = typeof body?.greeting === "string" ? body.greeting.slice(0, 1000) : "";

  const db = createAdminClient();
  const { data, error } = await db
    .from("chatbot_sessions").insert({ visitor_id: randomUUID() }).select("id").single();
  if (error || !data) return NextResponse.json({ error: "No se pudo iniciar el chat" }, { status: 500 });

  if (greeting) {
    await db.from("chatbot_messages").insert({ session_id: data.id, from_bot: true, message: greeting });
  }
  return NextResponse.json({ id: data.id });
}
