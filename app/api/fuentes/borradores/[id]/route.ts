// app/api/fuentes/borradores/[id]/route.ts
// Aprobar o rechazar un borrador del agente de fuentes (solo admin).
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { isUuid } from "@/lib/security";
import { aprobarBorrador, rechazarBorrador, ErrorBorrador, type Borrador } from "@/lib/fuentes";

// PATCH /api/fuentes/borradores/[id]
//   { accion: "aprobar", datos?, aceptados?, fotos? }
//   { accion: "rechazar", motivo, feedback, rehacer? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, error: authError } = await requireAuth({ admin: true });
  if (authError) return authError;
  if (!isUuid(params.id)) return NextResponse.json({ error: "Borrador no encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || (body.accion !== "aprobar" && body.accion !== "rechazar")) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: borrador } = await db.from("propiedad_borradores")
    .select("id, fuente_id, desarrollo_id, clave_modelo, accion, property_id, estado, datos, cambios, fotos")
    .eq("id", params.id).single();
  if (!borrador) return NextResponse.json({ error: "Borrador no encontrado" }, { status: 404 });
  if (borrador.estado !== "Pendiente") return NextResponse.json({ error: "Este borrador ya fue revisado." }, { status: 409 });

  try {
    if (body.accion === "aprobar") {
      const datos = body.datos && typeof body.datos === "object" ? body.datos : undefined;
      const aceptados = Array.isArray(body.aceptados) ? body.aceptados.map(String) : undefined;
      const { propertyId } = await aprobarBorrador(db, borrador as Borrador, { datos, aceptados, fotos: body.fotos }, auth.userId);
      return NextResponse.json({ ok: true, property_id: propertyId });
    }
    await rechazarBorrador(db, borrador as Borrador, body, auth.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ErrorBorrador) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("fuentes/borradores error:", (e as Error)?.message);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
