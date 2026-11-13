// lib/fotos.ts
// Fotos de muchas propiedades a la vez, respetando dos límites de Supabase:
// - .in() con cientos de ids hace una URL tan larga que la petición falla completa
//   (con 408 propiedades el mapa no recibía ninguna foto);
// - cada consulta devuelve máximo 1000 filas.
import type { SupabaseClient } from "@supabase/supabase-js";

const IDS_POR_CONSULTA = 50;
const FILAS_POR_PAGINA = 1000;

// Hasta `max` fotos por propiedad (la portada primero, luego por posición).
export async function fotosPorPropiedad(
  db: SupabaseClient, ids: string[], max = 5,
): Promise<Record<string, string[]>> {
  const filas: { property_id: string; url: string; position: number | null; is_cover: boolean | null }[] = [];
  for (let i = 0; i < ids.length; i += IDS_POR_CONSULTA) {
    const lote = ids.slice(i, i + IDS_POR_CONSULTA);
    for (let desde = 0; ; desde += FILAS_POR_PAGINA) {
      // Orden único (id al final) para que las páginas no repitan ni salten filas
      const { data, error } = await db.from("property_images")
        .select("property_id, url, position, is_cover").in("property_id", lote)
        .order("property_id").order("position").order("id")
        .range(desde, desde + FILAS_POR_PAGINA - 1);
      if (error) { console.error("[fotos]", error.message); break; }
      filas.push(...(data || []));
      if (!data || data.length < FILAS_POR_PAGINA) break;
    }
  }

  const porPropiedad: Record<string, typeof filas> = {};
  for (const f of filas) (porPropiedad[f.property_id] ||= []).push(f);
  return Object.fromEntries(Object.entries(porPropiedad).map(([id, fs]) => [
    id,
    fs.sort((a, b) => Number(!!b.is_cover) - Number(!!a.is_cover) || (a.position ?? 0) - (b.position ?? 0))
      .slice(0, max).map(f => f.url),
  ]));
}
