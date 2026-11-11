// lib/stats.ts
// Conteos por propiedad. Usa las funciones SQL de
// supabase/migrations/20261110000000_conteos_por_propiedad.sql; si todavía no
// se aplicó la migración, cae al método anterior (descargar filas y contar).
import type { SupabaseClient } from "@supabase/supabase-js";

type Source = "views" | "inquiries";
const RPC = { views: "property_view_counts", inquiries: "property_inquiry_counts" } as const;
const TABLE = { views: "property_views", inquiries: "property_inquiries" } as const;

export async function countByProperty(db: SupabaseClient, source: Source): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  const { data, error } = await db.rpc(RPC[source]);
  if (!error && Array.isArray(data)) {
    for (const r of data as { property_id: string; total: number }[]) counts.set(r.property_id, Number(r.total));
    return counts;
  }

  const { data: rows } = await db.from(TABLE[source]).select("property_id");
  for (const r of rows || []) counts.set(r.property_id, (counts.get(r.property_id) || 0) + 1);
  return counts;
}
