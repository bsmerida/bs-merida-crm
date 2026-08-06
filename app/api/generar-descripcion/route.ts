import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { property_id } = await req.json();
    if (!property_id) return NextResponse.json({ error: "property_id requerido" }, { status: 400 });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: prop } = await supabase
      .from("properties").select("*").eq("id", property_id).single();
    if (!prop) return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });

    const { data: images } = await supabase
      .from("property_images").select("url").eq("property_id", property_id)
      .order("position").limit(4);

    const { data: samples } = await supabase
      .from("properties").select("description, type, zone, city")
      .not("description", "is", null).neq("id", property_id).limit(8);

    const styleExamples = (samples || [])
      .filter((s: any) => s.description?.trim().length > 80)
      .slice(0, 5)
      .map((s: any) => `[${s.type} en ${s.zone || s.city}]\n${s.description}`)
      .join("\n\n---\n\n");

    const detalles = [
      `Tipo: ${prop.type}`,
      `Operación: ${prop.operation}`,
      prop.zone            ? `Colonia/Zona: ${prop.zone}` : null,
      prop.city            ? `Ciudad: ${prop.city}` : null,
      prop.state           ? `Estado: ${prop.state}` : null,
      (prop as any).development ? `Desarrollo: ${(prop as any).development}` : null,
      prop.bedrooms        ? `Recámaras: ${prop.bedrooms}` : null,
      prop.bathrooms       ? `Baños: ${prop.bathrooms}` : null,
      prop.m2_construction ? `M² construcción: ${prop.m2_construction}` : null,
      prop.m2_land         ? `M² terreno: ${prop.m2_land}` : null,
      prop.parking         ? `Cajones de estacionamiento: ${prop.parking}` : null,
      prop.amenities && (prop.amenities as string[]).length > 0
        ? `Amenidades: ${Array.isArray(prop.amenities) ? (prop.amenities as string[]).join(", ") : prop.amenities}`
        : null,
    ].filter(Boolean).join("\n");

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const contentParts: any[] = [];

    for (const img of (images || [])) {
      try {
        const res = await fetch(img.url, { signal: AbortSignal.timeout(8000) });
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mediaType = (res.headers.get("content-type") || "image/jpeg").split(";")[0] as any;
        contentParts.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } });
      } catch { /* imagen no disponible */ }
    }

    const prompt = [
      "DATOS DE LA PROPIEDAD:",
      detalles,
      "",
      styleExamples
        ? `ESTILO DE REDACCIÓN (ejemplos reales de esta inmobiliaria — adopta exactamente este tono y vocabulario):\n${styleExamples}\n`
        : "",
      "REGLAS:",
      "- Escribe en español, tono formal pero cálido y aspiracional",
      "- 2 a 4 párrafos, máximo 220 palabras",
      "- Empieza destacando la ubicación y el estilo de vida que ofrece",
      "- Si ves imágenes, describe acabados, materiales o espacios que puedas identificar",
      "- NO inventes datos que no estén en la información o en las imágenes",
      "- NO uses listas ni viñetas, solo párrafos continuos",
      "- NO uses emojis ni símbolos especiales",
      "- NO incluyas el precio",
      "",
      "Responde ÚNICAMENTE con la descripción, sin título ni explicaciones adicionales.",
    ].join("\n");

    contentParts.push({ type: "text", text: prompt });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: "Eres un experto en redacción de descripciones para propiedades inmobiliarias premium en México.",
      messages: [{ role: "user", content: contentParts }],
    });

    const description = (message.content[0] as any).text.trim();
    return NextResponse.json({ description });

  } catch (err: any) {
    console.error("generar-descripcion error:", err?.message);
    return NextResponse.json({ error: err.message || "Error generando descripción" }, { status: 500 });
  }
}
