// lib/tokko-sync.ts
// Guarda en Supabase las propiedades traídas de Tokko, por lotes.
// Antes eran 3 consultas secuenciales por propiedad (~600 para 191 propiedades),
// lo que con más inventario chocaba con el límite de 300 s de Vercel.
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapTokkoProperty, type TokkoProperty } from "@/lib/tokko";

const PROPERTY_BATCH = 50;
const IMAGE_BATCH = 500;

function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

export async function syncTokkoProperties(db: SupabaseClient, tokkoProps: TokkoProperty[]) {
  // Descripciones escritas a mano en el CRM: no se pisan con las de Tokko
  const { data: existing } = await db.from("properties").select("external_id, description");
  const manualDesc = new Set(
    (existing || []).filter(p => p.external_id && p.description?.trim()).map(p => String(p.external_id)),
  );

  const mapped: { data: any; images: string[] }[] = [];
  let failed = 0;
  for (const tp of tokkoProps) {
    try {
      const m = mapTokkoProperty(tp);
      if (manualDesc.has(m.data.external_id) || !m.data.description) delete m.data.description;
      mapped.push(m);
    } catch {
      failed++;
    }
  }

  let synced = 0;
  let imagesTotal = 0;

  for (const batch of chunk(mapped, PROPERTY_BATCH)) {
    // defaultToNull: false → si una fila no trae description, se conserva la guardada
    const { data: saved, error } = await db
      .from("properties")
      .upsert(batch.map(m => m.data), { onConflict: "external_id", defaultToNull: false })
      .select("id, external_id");

    if (error || !saved) {
      console.error("[tokko-sync] lote falló:", error?.message);
      failed += batch.length;
      continue;
    }
    synced += saved.length;

    const idByExternal = new Map(saved.map(p => [String(p.external_id), p.id as string]));
    const ids = [...idByExternal.values()];

    // Reemplazar imágenes del lote con las actuales de Tokko
    await db.from("property_images").delete().in("property_id", ids);
    const imgRows = batch.flatMap(m => {
      const propertyId = idByExternal.get(m.data.external_id);
      return propertyId
        ? m.images.map((url, i) => ({ property_id: propertyId, url, position: i, is_cover: i === 0 }))
        : [];
    });
    for (const rows of chunk(imgRows, IMAGE_BATCH)) {
      const { error: imgErr } = await db.from("property_images").insert(rows);
      if (imgErr) console.error("[tokko-sync] imágenes:", imgErr.message);
      else imagesTotal += rows.length;
    }
  }

  return { total: tokkoProps.length, synced, failed, images: imagesTotal };
}
