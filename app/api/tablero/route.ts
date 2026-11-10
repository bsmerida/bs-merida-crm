import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { isUuid } from "@/lib/security";

// POST /api/tablero — crear tablero para un lead
export async function POST(req: NextRequest) {
  const { auth, error: authError } = await requireAuth();
  if (authError) return authError;

  const { lead_id, title } = await req.json().catch(() => ({}));
  if (!isUuid(lead_id)) return NextResponse.json({ error: "lead_id requerido" }, { status: 400 });

  const db = createAdminClient();

  // Si ya existe uno para este lead, devolverlo
  const { data: existing } = await db.from("boards").select("*").eq("lead_id", lead_id).maybeSingle();
  if (existing) return NextResponse.json({ board: existing });

  const { data: board, error } = await db
    .from("boards")
    .insert({ lead_id, agent_id: auth.userId, title: (typeof title === "string" && title.slice(0, 200)) || "Propiedades seleccionadas para ti" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  return NextResponse.json({ board });
}
