import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAllTokkoProperties, mapTokkoProperty } from "@/lib/tokko";
 
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
 
export async function POST(_req: NextRequest) {
  const supabase = createClient();
 
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
 
  // Pre-cargar descriptions existentes para no sobreescribirlas
  const { data: existingProps } = await supabase
    .from("properties")
    .select("external_id, description");
  const existingDescMap: Record<string, string | null> = {};
  for (const p of existingProps || []) {
    if (p.external_id) existingDescMap[p.external_id] = p.description;
  }
 
  let synced = 0;
  let failed = 0;
  let imagesTotal = 0;
 
  for (const tp of tokkoProps) {
    try {
      const { data, images } = mapTokkoProperty(tp);
 
      // Si ya existe una description guardada manualmente en el CRM, preservarla
      const existingDesc = existingDescMap[data.external_id];
      if (existingDesc && existingDesc.trim().length > 0) {
        // Hay descripción manual → no la sobreescribimos aunque Tokko traiga algo
        delete data.description;
      }
      // Si no hay descripción en CRM y Tokko tampoco trae → omitir el campo
      if (!data.description) {
        delete data.description;
      }
 
      const { data: prop, error: upErr } = await supabase
        .from("properties")
        .upsert(data, { onConflict: "external_id" })
        .select("id")
        .single();
 
      if (upErr || !prop) { failed++; continue; }
 
      // Limpiar imágenes anteriores y reemplazar con las de Tokko
      await supabase.from("property_images").delete().eq("property_id", prop.id);
 
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
