// app/api/sofia/route.ts
// Chatbot público "Sofía": 1) extrae qué busca el cliente, 2) consulta el
// inventario con esos filtros, 3) responde. Es público, así que todo lo que
// llega del navegador o de la IA se valida antes de usarse.
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { clientIp, isUuid, rateLimit } from "@/lib/security";
import { cleanFilterNumber, cleanFilterText, sanitizeChatMessages } from "@/lib/validation";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MAX_INVENTARIO = 40; // propiedades que se pasan al modelo (el total se cuenta aparte)

const fmtPrice = (p: number) => `$${Number(p).toLocaleString("es-MX")}`;

function textOf(msg: Anthropic.Message): string {
  return msg.content.flatMap(b => (b.type === "text" ? [b.text] : [])).join("\n").trim();
}

export async function POST(req: NextRequest) {
  // Endpoint público: limitar por IP para que nadie use la API key de Anthropic a costa nuestra
  if (!await rateLimit(`sofia:${clientIp(req.headers)}`, 40, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Demasiados mensajes, intente más tarde." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const messages = sanitizeChatMessages(body?.messages, { maxMessages: 16, maxChars: 1000 });
  if (!messages) return NextResponse.json({ error: "Mensajes inválidos" }, { status: 400 });
  const sessionId = isUuid(body.sessionId) ? body.sessionId : null;

  const db = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.duclaud.com.mx";

  // El contexto de la propiedad se lee de la BD por id; antes se insertaba en el
  // system prompt el título/operación que mandaba el navegador (prompt injection).
  const ctxId = isUuid(body.propertyCtx?.id) ? body.propertyCtx.id : null;
  const { data: ctxProp } = ctxId
    ? await db.from("properties").select("id, title, operation").eq("id", ctxId).eq("is_published", true).maybeSingle()
    : { data: null };

  // ── Fase 1: Extraer contexto acumulado de toda la conversación ─────────────
  const conversationText = messages
    .map(m => `${m.role === "user" ? "Cliente" : "Sofía"}: ${m.content}`)
    .join("\n");

  let filters: Record<string, unknown> = {};
  let tieneSuficiente = false;
  let faltan: string[] = [];

  try {
    const filterMsg = await anthropic.messages.create({
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
    });
    const parsed = JSON.parse(textOf(filterMsg).replace(/```json|```/g, "").trim());
    if (parsed && typeof parsed === "object") {
      filters         = parsed;
      tieneSuficiente = parsed.tiene_suficiente_contexto === true;
      faltan          = Array.isArray(parsed.faltan)
        ? parsed.faltan.filter((f: unknown) => typeof f === "string").slice(0, 5)
        : [];
    }
  } catch (e) {
    // Sin filtros, Sofía pregunta lo que falta en vez de fallar
    console.error("[sofia filtros]", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : (e as Error)?.message);
  }

  const operacion = cleanFilterText(filters.operacion, 20);
  const tipo      = cleanFilterText(filters.tipo, 40);
  const zona      = cleanFilterText(filters.zona, 60);
  const precioMin = cleanFilterNumber(filters.precio_min);
  const precioMax = cleanFilterNumber(filters.precio_max);
  const recMin    = cleanFilterNumber(filters.recamaras_min);

  // ── Fase 2: Buscar propiedades solo si hay suficiente contexto ─────────────
  let inventario = "";
  let totalEncontradas = 0;

  if (tieneSuficiente || ctxProp) {
    let query = db
      .from("properties")
      .select("id, title, description, type, operation, price, currency, zone, city, state, bedrooms, bathrooms, m2_construction, m2_land, parking, amenities, status, development, reference", { count: "exact" })
      .eq("status", "Disponible")
      .eq("is_published", true)
      .order("featured", { ascending: false });

    if (operacion) {
      const op = operacion.toLowerCase();
      const opNorm = op.includes("rent") ? "Renta" : (op.includes("compr") || op.includes("vent")) ? "Venta" : operacion;
      query = query.ilike("operation", `%${opNorm}%`);
    }
    if (tipo)      query = query.ilike("type", `%${tipo}%`);
    if (zona)      query = query.or(`zone.ilike.%${zona}%,city.ilike.%${zona}%,state.ilike.%${zona}%`);
    if (precioMin) query = query.gte("price", precioMin);
    if (precioMax) query = query.lte("price", precioMax);
    if (recMin)    query = query.gte("bedrooms", recMin);

    // Total real con count; al modelo solo se le pasan las primeras MAX_INVENTARIO
    // (antes "muéstrame todo" mandaba el inventario completo en cada mensaje).
    const { data: props, count } = await query.limit(MAX_INVENTARIO);
    totalEncontradas = count ?? props?.length ?? 0;

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

  const propCtxBlock = ctxProp
    ? `\nEL VISITANTE ESTÁ VIENDO ESTA PROPIEDAD:\nID: ${ctxProp.id} | ${ctxProp.title} | ${ctxProp.operation}\nResponde principalmente sobre esta propiedad. Para mostrarla usa [PROPS|${ctxProp.id}]\n`
    : "";

  const detectedFilters = { operacion, tipo, zona, precio_min: precioMin, precio_max: precioMax, recamaras_min: recMin };

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
${JSON.stringify(detectedFilters, null, 2)}

${!tieneSuficiente && !ctxProp ? `
INSTRUCCIÓN IMPORTANTE: Aún no tienes suficiente información para buscar propiedades.
Haz UNA SOLA pregunta concisa para obtener lo que falta: ${faltan.join(", ")}.
NO hagas múltiples preguntas a la vez. Sé natural, no uses listas.
NO busques ni menciones propiedades todavía.
` : `
INVENTARIO (${totalEncontradas} propiedades encontradas con los filtros del cliente${totalEncontradas > MAX_INVENTARIO ? `; abajo están las ${MAX_INVENTARIO} más destacadas` : ""}):
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

  let reply = "Lo siento, hubo un error. ¿Puede intentar de nuevo?";
  try {
    const response = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 800,
      system,
      messages,
    });
    reply = textOf(response) || reply;
  } catch (e) {
    console.error("[sofia]", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return NextResponse.json({ error: "Asistente no disponible" }, { status: 502 });
  }

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

  // Extraer propiedades (solo ids válidos y publicados)
  let propertyCards: any[] = [];
  const propsMatch = reply.match(/\[PROPS\|([^\]]+)\]/);
  if (propsMatch) {
    const ids = propsMatch[1].split(",").map(id => id.trim()).filter(isUuid).slice(0, 3);
    reply = reply.replace(/\[PROPS\|[^\]]+\]\s*/g, "").trim();

    if (ids.length) {
      const [{ data: propData }, { data: covers }] = await Promise.all([
        db.from("properties")
          .select("id, title, type, operation, price, currency, zone, city, bedrooms, bathrooms, m2_construction")
          .in("id", ids)
          .eq("is_published", true),
        db.from("property_images")
          .select("property_id, url")
          .in("property_id", ids)
          .eq("is_cover", true),
      ]);

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

  // Guardar la pregunta del visitante y la respuesta de Sofía (antes la pregunta
  // la insertaba el navegador con la llave anónima)
  if (sessionId) {
    await db.from("chatbot_messages").insert([
      { session_id: sessionId, from_bot: false, message: messages[messages.length - 1].content },
      { session_id: sessionId, from_bot: true,  message: reply },
    ]);
  }

  return NextResponse.json({ reply, leadData, propertyCards });
}
