import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { fetchAllTokkoProperties } from "@/lib/tokko";
import { syncTokkoProperties } from "@/lib/tokko-sync";
 
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
 
export async function POST(_req: NextRequest) {
  // Sincronizar reescribe todo el inventario: solo administradores
  const { error: authError } = await requireAuth({ admin: true });
  if (authError) return authError;
  const supabase = createClient();
 
  const apiKey = process.env.TOKKO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: "Falta configurar TOKKO_API_KEY en las variables de entorno de Vercel",
    }, { status: 500 });
  }
 
  let tokkoProps;
  try {
    tokkoProps = await fetchAllTokkoProperties(apiKey, process.env.TOKKO_AGENCY_ID);
  } catch (e: any) {
    console.error("[tokko/sync]", e.message);
    return NextResponse.json({ error: "Error al consultar Tokko. Revisa la API key y vuelve a intentar." }, { status: 502 });
  }
 
  return NextResponse.json(await syncTokkoProperties(supabase, tokkoProps));
}
