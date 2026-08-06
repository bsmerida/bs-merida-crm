import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
 
export const dynamic = "force-dynamic";
 
export async function POST(req: NextRequest) {
  const { messages, propertyCtx, sessionId } = await req.json();
 
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
 
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bs-merida-crm.vercel.app";
 
  // Inventario completo con todos los detalles relevantes
  const { data: props } = await db
    .from("properties")
    .select("id, title, description, type, operation, price, currency, zone, city, state, bedrooms, bathrooms, m2_construction, m2_land, parking, amenities, status, development, reference")
    .eq("status", "Disponible")
    .eq("is_published", true)
    .order("featured", { ascending: false })
    .limit(60);
 
  const inventario = (props || [])
    .map(p => {
      const amenidades = Array.isArray(p.amenities) && p.amenities.length
        ? `Amenidades: ${p.amenities.join(", ")}` : "";
      const desc = p.description
        ? `Descripción: ${p.description.slice(0, 150)}${p.description.length > 150 ? "…" : ""}` : "";
      return [
        `[${p.id}]`,
        `${p.title}`,
        `${p.type} en ${p.operation}`,
        `Precio: $${Number(p.price).toLocaleString("es-MX")} ${p.currency || "MXN"}`,
        `Ubicación: ${[p.zone, p.city, p.state].filter(Boolean).join(", ")}`,
        `${p.bedrooms ? `${p.bedrooms} recámaras` : ""}${p.bathrooms ? ` · ${p.bathrooms} baños` : ""}${p.m2_construction ? ` · ${p.m2_construction}m² construcción` : ""}${p.m2_land ? ` · ${p.m2_land}m² terreno` : ""}${p.parking ? ` · ${p.parking} estacionamientos` : ""}`,
        p.development ? `Desarrollo: ${p.development}` : "",
        amenidades,
        desc,
      ].filter(Boolean).join(" | ");
    })
    .join("\n\n");
 
  const propCtxBlock = propertyCtx
    ? `\nEL VISITANTE ESTÁ VIENDO ESTA PROPIEDAD ESPECÍFICA:
ID: ${propertyCtx.id}
Nombre: ${propertyCtx.title}
Operación: ${propertyCtx.operation}
Responde principalmente sobre esta propiedad. Para mostrarla usa [PROPS|${propertyCtx.id}]\n`
    : "";
 
  const system = `Eres Sofía, asistente virtual de Duclaud — firma de consultoría inmobiliaria en Mérida, Yucatán.
Tono: profesional, cálido, directo. Tratamiento de usted. Sin emojis.
 
SOBRE DUCLAUD:
- Firma de consultoría inmobiliaria (nunca "agencia"), certificada AMPI
- Fundada por Bertha Duclaud. 600+ propiedades gestionadas
- Diferenciador: equipo legal y financiero interno en la misma firma
- Presencia en Yucatán, Quintana Roo y Nuevo León
- Tagline: "Inversiones que trascienden."
- Terminología correcta: "operación" (no "venta"), "consultor Duclaud" (no "agente"), "patrimonio"
- Contacto WhatsApp: ${process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272"}
 
INVENTARIO ACTUAL (solo estas propiedades existen, no inventes otras):
${inventario || "Sin propiedades disponibles en este momento."}
 
REGLAS ESTRICTAS — DEBES CUMPLIRLAS SIEMPRE:
1. SOLO habla de propiedades que aparecen en el inventario de arriba. Si no está en la lista, no existe.
2. NUNCA inventes precios, medidas, recámaras, baños ni ningún dato. Si no tienes el dato, dilo.
3. Si el cliente pide algo que no tienes en inventario, díselo honestamente y ofrece lo más parecido.
4. NUNCA prometas cosas que no puedes confirmar (disponibilidad futura, descuentos, etc).
5. Si no sabes algo, di "No tengo ese dato, un consultor Duclaud puede resolverle esa duda".
 
MOSTRAR PROPIEDADES:
- Cuando el cliente describa lo que busca, muestra máximo 3 propiedades del inventario que mejor coincidan.
- Usa el formato [PROPS|id1,id2,id3] al final de tu mensaje (solo IDs del inventario).
- Ordena por relevancia: primero las que mejor coincidan con presupuesto y características.
 
CAPTURAR LEAD:
- Cuando tengas nombre + teléfono del visitante → incluye [LEAD|nombre=X|telefono=Y|presupuesto=Z|zona=W|operacion=V]
- Pide el teléfono de forma natural después de 2-3 intercambios si el cliente muestra interés real.
${propCtxBlock}
FORMATO DE RESPUESTAS:
- Respuestas cortas: 1-3 oraciones máximo, luego muestra propiedades si aplica.
- Si el cliente pregunta por precio, da el precio exacto del inventario.
- Si el cliente pide comparación, compara solo propiedades del inventario.`;
 
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system,
      messages,
    }),
  });
 
  const data = await res.json();
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });
 
  let reply: string = data.content?.[0]?.text || "Lo siento, hubo un error. ¿Puede intentar de nuevo?";
 
  // Extraer lead data
  let leadData: Record<string, string> | null = null;
  const leadMatch = reply.match(/\[LEAD\|([^\]]+)\]/);
  if (leadMatch) {
    leadData = {};
    leadMatch[1].split("|").forEach(pair => {
      const [k, v] = pair.split("=");
      if (k && v) leadData![k.trim()] = v.trim();
    });
    reply = reply.replace(/\[LEAD\|[^\]]+\]\s*/g, "").trim();
  }
 
  // Extraer IDs de propiedades a mostrar
  let propertyCards: any[] = [];
  const propsMatch = reply.match(/\[PROPS\|([^\]]+)\]/);
  if (propsMatch) {
    const ids = propsMatch[1].split(",").map(id => id.trim()).filter(Boolean);
    reply = reply.replace(/\[PROPS\|[^\]]+\]\s*/g, "").trim();
 
    if (ids.length) {
      const { data: propData } = await db
        .from("properties")
        .select("id, title, type, operation, price, currency, zone, city, bedrooms, bathrooms, m2_construction")
        .in("id", ids);
 
      const { data: covers } = await db
        .from("property_images")
        .select("property_id, url")
        .in("property_id", ids)
        .eq("is_cover", true);
 
      const coverMap = Object.fromEntries((covers || []).map(c => [c.property_id, c.url]));
 
      propertyCards = (propData || [])
        .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
        .map(p => ({
          id: p.id,
          title: p.title,
          type: p.type,
          operation: p.operation,
          price: p.price,
          currency: p.currency || "MXN",
          zone: [p.zone, p.city].filter(Boolean).join(", "),
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          m2: p.m2_construction,
          cover: coverMap[p.id] || null,
          url: `${siteUrl}/propiedad/${p.id}`,
        }));
    }
  }
 
  // Guardar mensaje de Sofía
  if (sessionId) {
    await db.from("chatbot_messages").insert({
      session_id: sessionId,
      from_bot: true,
      message: reply,
    });
  }
 
  return NextResponse.json({ reply, leadData, propertyCards });
}
