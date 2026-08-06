import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  // Verificar que el usuario está autenticado
  const auth = createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  // Usar service role para bypassear RLS
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Borrar en orden: tablas hijas primero, luego el lead
  const tablas = [
    "chatbot_sessions",
    "activities",
    "visits",
    "deals",
    "property_inquiries",
  ];

  for (const tabla of tablas) {
    const { error } = await admin.from(tabla).delete().eq("lead_id", id);
    if (error && !String(error?.message || "").includes("does not exist")) {
      return NextResponse.json({ error: `Error en ${tabla}: ${error.message}` }, { status: 500 });
    }
  }

  const { error } = await admin.from("leads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
