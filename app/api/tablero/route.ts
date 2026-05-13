import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as authClient } from "@/lib/supabase/server";

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/tablero — crear tablero para un lead
export async function POST(req: NextRequest) {
  const auth = authClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { lead_id, title } = await req.json();
  if (!lead_id) return NextResponse.json({ error: "lead_id requerido" }, { status: 400 });

  const db = adminDb();

  // Si ya existe uno para este lead, devolverlo
  const { data: existing } = await db.from("boards").select("*").eq("lead_id", lead_id).single();
  if (existing) return NextResponse.json({ board: existing });

  const { data: board, error } = await db
    .from("boards")
    .insert({ lead_id, agent_id: user.id, title: title || "Propiedades seleccionadas para ti" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ board });
}
