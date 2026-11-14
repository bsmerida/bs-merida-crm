import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Sesión activa (rechaza usuarios desactivados) y tope de uso: cada llamada
    // cuesta (Claude Sonnet con hasta 4 fotos) y antes no tenía límite.
    const { auth, error: authError } = await requireAuth();
    if (authError) return authError;
    if (!await rateLimit(`generar-descripcion:${auth.userId}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Llegaste al límite de 20 descripciones por hora. Intenta más tarde." }, { status: 429 });
    }

    const { property_id } = await req.json();
    if (!property_id) return NextResponse.json({ error: "property_id requerido" }, { status: 400 });

    // Llave de servicio tras verificar la sesión: con la de sesión, RLS solo deja
    // leer propiedades publicadas y las no publicadas daban "no encontrada".
    const supabase = createAdminClient();

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

    const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    for (const img of (images || [])) {
      try {
        // Solo URLs https: evita que el servidor pida recursos internos (SSRF)
        if (!String(img.url).startsWith("https://")) continue;
        const res = await fetch(img.url, { signal: AbortSignal.timeout(8000) });
        const mediaType = (res.headers.get("content-type") || "").split(";")[0].trim();
        if (!res.ok || !IMAGE_TYPES.includes(mediaType)) continue;
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 5 * 1024 * 1024) continue; // límite de la API por imagen
        const base64 = Buffer.from(buffer).toString("base64");
        contentParts.push({ type: "image", source: { type: "base64", media_type: mediaType as any, data: base64 } });
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

    const description = message.content.flatMap(b => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    return NextResponse.json({ description });

  } catch (err: any) {
    console.error("generar-descripcion error:", err?.message);
    return NextResponse.json({ error: "Error generando descripción" }, { status: 500 });
  }
}
