import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { AuthContext, canManage, requireAuth } from "@/lib/auth";
import { isUuid } from "@/lib/security";

// Un tablero (board) pertenece a un lead y tiene su propio agent_id: solo el
// asesor dueño del tablero (o un admin) puede modificarlo.
async function boardOwnerOk(auth: AuthContext, boardId: string) {
  const { data: board } = await createAdminClient().from("boards").select("agent_id").eq("id", boardId).maybeSingle();
  if (!board) return false;
  return canManage(auth, board.agent_id);
}

// POST /api/tablero/[id] — agregar propiedad al tablero
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, error: authError } = await requireAuth();
  if (authError) return authError;

  const { property_id, ai_reason, ai_score, added_by } = await req.json().catch(() => ({}));
  if (!isUuid(params.id) || !isUuid(property_id)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  if (!(await boardOwnerOk(auth, params.id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
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
  const { auth, error: authError } = await requireAuth();
  if (authError) return authError;

  const { property_id } = await req.json().catch(() => ({}));
  if (!isUuid(property_id)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  if (!(await boardOwnerOk(auth, params.id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { error } = await createAdminClient().from("board_properties")
    .delete()
    .eq("board_id", params.id)
    .eq("property_id", property_id);

  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
