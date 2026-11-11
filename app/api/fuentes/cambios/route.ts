// app/api/fuentes/cambios/route.ts
// Marcar como revisados los cambios de archivos detectados (solo admin).
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { isUuid } from "@/lib/security";

// PATCH /api/fuentes/cambios   { ids: string[] }  o  { fuente_id: "F-0008" } (todos los de la fuente)
export async function PATCH(req: NextRequest) {
  const { auth, error: authError } = await requireAuth({ admin: true });
  if (authError) return authError;
  const body = await req.json().catch(() => null);

  const marca = { revisado: true, revisado_por: auth.userId, revisado_en: new Date().toISOString() };
  let q = createAdminClient().from("fuente_cambios").update(marca).eq("revisado", false);
  if (Array.isArray(body?.ids) && body.ids.length && body.ids.length <= 500 && body.ids.every(isUuid)) {
    q = q.in("id", body.ids);
  } else if (typeof body?.fuente_id === "string" && /^F-\d{4}$/.test(body.fuente_id)) {
    q = q.eq("fuente_id", body.fuente_id);
  } else {
    return NextResponse.json({ error: "Indica los cambios a marcar" }, { status: 400 });
  }
  const { error } = await q;
  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
