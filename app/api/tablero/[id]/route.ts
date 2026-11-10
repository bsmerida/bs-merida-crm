import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { isUuid } from "@/lib/security";

// POST /api/tablero/[id] — agregar propiedad al tablero
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { property_id, ai_reason, ai_score, added_by } = await req.json().catch(() => ({}));
  if (!isUuid(params.id) || !isUuid(property_id)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { error } = await createAdminClient().from("board_properties").upsert({
    board_id:  params.id,
    property_id,
    ai_reason: typeof ai_reason === "string" ? ai_reason.slice(0, 500) : null,
    ai_score:  Number.isFinite(ai_score) ? ai_score : null,
    added_by:  added_by === "ai" ? "ai" : "agent",
  }, { onConflict: "board_id,property_id" });

  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/tablero/[id] — quitar propiedad del tablero
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { property_id } = await req.json().catch(() => ({}));
  if (!isUuid(property_id)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { error } = await createAdminClient().from("board_properties")
    .delete()
    .eq("board_id", params.id)
    .eq("property_id", property_id);

  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
