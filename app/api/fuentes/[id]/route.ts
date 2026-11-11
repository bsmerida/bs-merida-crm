// app/api/fuentes/[id]/route.ts
// Activar o pausar el agente en una fuente (solo admin). La revisión de
// archivos corre siempre; esto decide si además propone borradores.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAuth({ admin: true });
  if (authError) return authError;
  if (!/^F-\d{4}$/.test(params.id)) return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (typeof body?.agente_activo !== "boolean") return NextResponse.json({ error: "Valor inválido" }, { status: 400 });

  const { data, error } = await createAdminClient().from("fuentes")
    .update({ agente_activo: body.agente_activo }).eq("id", params.id).select("id");
  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
