// app/api/sofia/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const fmtPrice = (p: number) => `$${Number(p).toLocaleString("es-MX")}`;

export async function POST(req: NextRequest) {
  const { messages, propertyCtx, sessionId } = await req.json();

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx";

  // ── Fase 1: Extraer contexto acumulado de toda la conversación ─────────────
  const conversationText = messages
    .map((m: any) => `${m.role === "user" ? "Cliente" : "Sofía"}: ${m.content}`)
    .join("\n");

  const filterRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Analiza esta conversación entre un cliente y Sofía (asistente de Duclaud, inmobiliaria en México).
Extrae toda la información que el cliente ya haya dado sobre lo que busca.
Si no se ha mencionado un campo, usa null.

Conversación:
${conversationText}

Responde SOLO con JSON válido:
{
  "operacion": null,
  "tipo": null,
  "zona": null,
  "precio_min": null,
  "precio_max": null,
  "recamaras_min": null,
  "tiene_suficiente_contexto": false,
  "faltan": []
}

"tiene_suficiente_contexto" es true cuando:
- El cliente mencionó zona O presupuesto (aunque sea uno solo), O
- El cliente dice variantes de "muestrame todo/todas/todas las opciones/todo lo que tengas/quiero ver todo/sin filtro".
Si el cliente ya dio zona y operacion en mensajes anteriores y ahora pide ver más, "tiene_suficiente_contexto" es SIEMPRE true.
"faltan" solo incluye campos que el cliente NUNCA mencionó y que son críticos.`,
      }],
    }),
  });

  let filters: any = {};
  let tieneSuficiente = false;
  let faltan: string[] = [];

  try {
    const filterData = await filterRes.json();
    const text = filterData.content?.[0]?.text || "{}";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    console.log("[Sofia filtros]", JSON.stringify(parsed));
    filters         = parsed;
    tieneSuficiente = parsed.tiene_suficiente_contexto || false;
    faltan          = parsed.faltan || [];
  } catch {
    filters = {};
  }

  // ── Fase 2: Buscar propiedades solo si hay suficiente contexto ─────────────
  let inventario = "";
  let totalEncontradas = 0;

  if (tieneSuficiente || propertyCtx) {
    let query = db
      .from("properties")
      .select("id, title, description, type, operation, price, currency, zone, city, state, bedrooms, bathrooms, m2_construction, m2_land, parking, amenities, status, development, reference")
      .eq("status", "Disponible")
      .eq("is_published", true)
      .order("featured", { ascending: false });

    if (filters.operacion) {
    const op = filters.operacion.toLowerCase();
    const opNorm = op.includes("rent") ? "Renta" : (op.includes("compr") || op.includes("vent")) ? "Venta" : filters.operacion;
    query = query.ilike("operation", `%${opNorm}%`);
  }
    if (filters.tipo)      query = query.ilike("type", `%${filters.tipo}%`);
    if (filters.zona)      query = query.or(`zone.ilike.%${filters.zona}%,city.ilike.%${filters.zona}%,state.ilike.%${filters.zona}%`);
    if (filters.precio_min) query = query.gte("price", filters.precio_min);
    if (filters.precio_max) query = query.lte("price", filters.precio_max);
    if (filters.recamaras_min) query = query.gte("bedrooms", filters.recamaras_min);

    const { data: props } = await query;
    totalEncontradas = props?.length || 0;

    inventario = (props || [])
      .map(p => {
        const amenidades = Array.isArray(p.amenities) && p.amenities.length
          ? `Amenidades: ${p.amenities.join(", ")}` : "";
        const desc = p.description
          ? `Desc: ${p.description.slice(0, 120)}${p.description.length > 120 ? "…" : ""}` : "";
        return [
          `[${p.id}]`,
          `${p.title}`,
          `${p.type} en ${p.operation}`,
          `${fmtPrice(p.price)} ${p.currency || "MXN"}`,
          `${[p.zone, p.city].filter(Boolean).join(", ")}`,
          `${p.bedrooms ? `${p.bedrooms} rec` : ""}${p.bathrooms ? ` · ${p.bathrooms} baños` : ""}${p.m2_construction ? ` · ${p.m2_construction}m²` : ""}${p.parking ? ` · ${p.parking} est` : ""}`,
          p.development ? `Desarrollo: ${p.development}` : "",
          amenidades,
          desc,
        ].filter(Boolean).join(" | ");
      })
      .join("\n\n");
  }

  const propCtxBlock = propertyCtx
    ? `\nEL VISITANTE ESTÁ VIENDO ESTA PROPIEDAD:\nID: ${propertyCtx.id} | ${propertyCtx.title} | ${propertyCtx.operation}\nResponde principalmente sobre esta propiedad. Para mostrarla usa [PROPS|${propertyCtx.id}]\n`
    : "";

  // ── Fase 3: Responder ──────────────────────────────────────────────────────
  const system = `Eres Sofía, asistente virtual de Duclaud — firma de consultoría inmobiliaria.
Tono: profesional, cálido, directo. Tratamiento de usted. Sin emojis.

SOBRE DUCLAUD:
- Firma de consultoría inmobiliaria (nunca "agencia"), certificada AMPI
- Presencia en Yucatán, Quintana Roo y Nuevo León
- Diferenciador: equipo legal y financiero interno
- Tagline: "Inversiones que trascienden."
- Terminología: "operación" (no "venta"), "consultor Duclaud" (no "agente")
- WhatsApp: ${process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272"}

CONTEXTO DETECTADO DE LA CONVERSACIÓN:
${JSON.stringify(filters, null, 2)}

${!tieneSuficiente && !propertyCtx ? `
INSTRUCCIÓN IMPORTANTE: Aún no tienes suficiente información para buscar propiedades.
Haz UNA SOLA pregunta concisa para obtener lo que falta: ${faltan.join(", ")}.
NO hagas múltiples preguntas a la vez. Sé natural, no uses listas.
NO busques ni menciones propiedades todavía.
` : `
INVENTARIO (${totalEncontradas} propiedades encontradas con los filtros del cliente):
${inventario || "No se encontraron propiedades con esos criterios."}

REGLAS PARA MOSTRAR PROPIEDADES:
1. SIEMPRE di cuántas encontraste en total ANTES de mostrar las más relevantes.
   Ejemplo: "Encontré 9 propiedades en esa zona, le muestro las más relevantes:"
2. Muestra máximo 3 con [PROPS|id1,id2,id3] al final.
3. NUNCA digas que solo hay las que muestras si hay más.
4. Si el cliente pregunta si es todo, di el total exacto.
5. NUNCA inventes datos. Si no está en el inventario, no existe.
6. Si no hay resultados, díselo y sugiere ajustar los criterios.
`}

${propCtxBlock}

CAPTURAR LEAD:
- Cuando tengas nombre + teléfono → incluye [LEAD|nombre=X|telefono=Y|presupuesto=Z|zona=W|operacion=V]
- Pide teléfono de forma natural después de 2-3 intercambios si hay interés real.

FORMATO: Respuestas cortas y directas.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 800,
      system,
      messages,
    }),
  });

  const data = await res.json();
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });

  let reply: string = data.content?.[0]?.text || "Lo siento, hubo un error. ¿Puede intentar de nuevo?";

  // Extraer lead
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

  // Extraer propiedades
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
          id:        p.id,
          title:     p.title,
          type:      p.type,
          operation: p.operation,
          price:     p.price,
          currency:  p.currency || "MXN",
          zone:      [p.zone, p.city].filter(Boolean).join(", "),
          bedrooms:  p.bedrooms,
          bathrooms: p.bathrooms,
          m2:        p.m2_construction,
          cover:     coverMap[p.id] || null,
          url:       `${siteUrl}/propiedad/${p.id}`,
        }));
    }
  }

  // Guardar mensaje
  if (sessionId) {
    await db.from("chatbot_messages").insert({
      session_id: sessionId,
      from_bot:   true,
      message:    reply,
    });
  }

  return NextResponse.json({ reply, leadData, propertyCards });
}
