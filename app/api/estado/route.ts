// app/api/estado/route.ts
// Para un monitor externo (UptimeRobot, Better Stack…): 200 si todo está bien,
// 503 si la base no responde o el agente de fuentes lleva más de un día sin correr.
// No devuelve datos del negocio, solo el estado.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { evaluarEstado } from "@/lib/estado";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = createAdminClient();
  const [bd, corrida] = await Promise.all([
    db.from("properties").select("id", { count: "exact", head: true }),
    db.from("agente_corridas").select("fin").not("fin", "is", null).order("fin", { ascending: false }).limit(1),
  ]);
  const estado = evaluarEstado({ bdOk: !bd.error, ultimaCorridaFin: corrida.data?.[0]?.fin ?? null });
  return NextResponse.json(estado, { status: estado.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
