import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as authClient } from "@/lib/supabase/server";

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/tablero/[id] — agregar propiedad al tablero
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = authClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { property_id, ai_reason, ai_score, added_by } = await req.json();
  const db = adminDb();

  const { error } = await db.from("board_properties").upsert({
    board_id: params.id,
    property_id,
    ai_reason: ai_reason || null,
    ai_score: ai_score || null,
    added_by: added_by || "agent",
  }, { onConflict: "board_id,property_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/tablero/[id] — quitar propiedad del tablero
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = authClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { property_id } = await req.json();
  const db = adminDb();

  const { error } = await db.from("board_properties")
    .delete()
    .eq("board_id", params.id)
    .eq("property_id", property_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
