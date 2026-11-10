import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { canManage, requireAuth } from "@/lib/auth";
import { isUuid } from "@/lib/security";

// Tablas hijas que referencian al lead (se borran primero)
const CHILD_TABLES = ["chatbot_sessions", "activities", "visits", "deals", "property_inquiries"];

export async function DELETE(req: NextRequest) {
  const { auth, error: authError } = await requireAuth();
  if (authError) return authError;

  const { id } = await req.json().catch(() => ({}));
  if (!isUuid(id)) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const db = createAdminClient();

  // Antes cualquier usuario con sesión podía borrar cualquier cliente (con el service role).
  const { data: lead } = await db.from("leads").select("id, agent_id").eq("id", id).single();
  if (!lead || !canManage(auth, lead.agent_id)) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  for (const table of CHILD_TABLES) {
    const { error } = await db.from(table).delete().eq("lead_id", id);
    if (error && !String(error.message || "").includes("does not exist")) {
      console.error(`[leads/delete] ${table}:`, error.message);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  }

  const { error } = await db.from("leads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
