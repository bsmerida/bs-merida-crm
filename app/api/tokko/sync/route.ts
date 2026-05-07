import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAllTokkoProperties, mapTokkoProperty } from "@/lib/tokko";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5 min para procesar 191 propiedades

export async function POST(_req: NextRequest) {
  const supabase = createClient();

  // Verificar que sea un usuario autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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
    return NextResponse.json({ error: `Error al consultar Tokko: ${e.message}` }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;
  let imagesTotal = 0;

  for (const tp of tokkoProps) {
    try {
      const { data, images } = mapTokkoProperty(tp);

      // 1) Upsert propiedad por external_id
      const { data: prop, error: upErr } = await supabase
        .from("properties")
        .upsert(data, { onConflict: "external_id" })
        .select("id")
        .single();

      if (upErr || !prop) { failed++; continue; }

      // 2) Limpiar imágenes anteriores (volverá a ponerlas con orden actualizado)
      await supabase.from("property_images").delete().eq("property_id", prop.id);

      // 3) Insertar imágenes nuevas
      if (images.length > 0) {
        const imgRows = images.map((url, i) => ({
          property_id: prop.id,
          url,
          position: i,
          is_cover: i === 0,
        }));
        const { error: imgErr } = await supabase.from("property_images").insert(imgRows);
        if (!imgErr) imagesTotal += images.length;
      }

      synced++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    total: tokkoProps.length,
    synced,
    failed,
    images: imagesTotal,
  });
}
