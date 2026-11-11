// app/api/fuentes/lecciones/[id]/route.ts
// Quitar una lección que el agente aprendió de un rechazo (solo admin).
// No se borra: queda inactiva para conservar el historial.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { isUuid } from "@/lib/security";

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAuth({ admin: true });
  if (authError) return authError;
  if (!isUuid(params.id)) return NextResponse.json({ error: "Lección no encontrada" }, { status: 404 });
  const { error } = await createAdminClient().from("agente_lecciones").update({ activa: false }).eq("id", params.id);
  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
