// app/api/sofia/route.ts
// Chatbot público "Sofía": 1) extrae qué busca el cliente, 2) consulta el
// inventario con esos filtros, 3) responde. Es público, así que todo lo que
// llega del navegador o de la IA se valida antes de usarse.
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { crearSolicitudCita, parseCitaTag } from "@/lib/citas";
import { generarEmbedding } from "@/lib/embeddings";
import { clientIp, isUuid, rateLimit } from "@/lib/security";
import { meridaParts } from "@/lib/time";
import { cleanFilterNumber, cleanFilterText, cleanFreeText, normalizeSearch, sanitizeChatMessages, zonaCoincide } from "@/lib/validation";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MAX_INVENTARIO = 40; // propiedades que se pasan al modelo (el total se cuenta aparte)
const MAX_CANDIDATOS = 600; // antes de filtrar zona/ciudad sin acentos en JS

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
  "descripcion_deseada": null,
  "tiene_suficiente_contexto": false,
  "faltan": []
}

"tiene_suficiente_contexto" es true cuando:
- El cliente mencionó zona O presupuesto (aunque sea uno solo), O
- El cliente dice variantes de "muestrame todo/todas/todas las opciones/todo lo que tengas/quiero ver todo/sin filtro".
Si el cliente ya dio zona y operacion en mensajes anteriores y ahora pide ver más, "tiene_suficiente_contexto" es SIEMPRE true.
"faltan" solo incluye campos que el cliente NUNCA mencionó y que son críticos.
"descripcion_deseada" es SOLO para lo que el cliente describe con palabras vagas sobre ambiente/uso/estilo (ej. "tranquilo", "buena vista", "espacio para trabajar desde casa", "para una familia joven") — nunca para zona/precio/recámaras/tipo, eso va en sus propios campos. Si no describió nada así, usa null.
"operacion" es SOLO "Venta" o "Renta" (o null). Si el cliente dice "para vivir" o "para invertir", eso es el USO que le dará a la propiedad, NO es la operación — no lo pongas en "operacion" (puede ir en "descripcion_deseada" si aporta algo).`,
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
  // cleanFreeText (no cleanFilterText): esto nunca entra a un filtro .ilike(),
  // solo se usa como entrada de un embedding — quitarle comas/paréntesis
  // (como hace cleanFilterText) degradaría el significado sin necesidad.
  const descripcionDeseada = cleanFreeText(filters.descripcion_deseada, 300);

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
      // Si el modelo mandó algo que no es claramente renta/venta (ej. "vivir",
      // "invertir" — confundió el USO con la OPERACIÓN), se ignora en vez de
      // filtrar con ese texto: un ilike contra un valor así nunca matchea nada
      // y tumbaba la búsqueda completa a 0 resultados.
      const opNorm = op.includes("rent") ? "Renta" : (op.includes("compr") || op.includes("vent")) ? "Venta" : null;
      if (opNorm) query = query.ilike("operation", `%${opNorm}%`);
    }
    if (tipo)      query = query.ilike("type", `%${tipo}%`);
    if (precioMin) query = query.gte("price", precioMin);
    if (precioMax) query = query.lte("price", precioMax);
    if (recMin)    query = query.gte("bedrooms", recMin);

    // La zona se filtra aparte, en JS, sin acentos y por palabra (ver
    // zonaCoincide): ILIKE de Postgres no ignora acentos, y exigir la frase
    // completa como substring fallaba con descripciones como "norte de
    // Mérida" contra una zona guardada como "Temozón Norte".
    const traerMuchas = Boolean(zona || descripcionDeseada);
    let { data: props, count } = await query.limit(traerMuchas ? MAX_CANDIDATOS : MAX_INVENTARIO);
    if (zona && props) {
      props = props.filter(p => zonaCoincide(zona, [p.zone, p.city, p.state]));
      count = props.length; // el conteo exacto de SQL no sabe de este filtro en JS
    }
    totalEncontradas = count ?? props?.length ?? 0;

    // Búsqueda semántica: solo cuando el cliente describió algo vago (ambiente,
    // uso, estilo) que no es un filtro exacto. Reordena por significado entre
    // los candidatos ya filtrados por zona/precio/tipo/recámaras; nunca trae
    // propiedades fuera de esos criterios exactos. Si Voyage no está
    // configurada o algo falla, sigue con el orden normal (featured primero).
    if (descripcionDeseada && props && props.length > 1) {
      try {
        const queryEmbedding = await generarEmbedding(descripcionDeseada, "query");
        if (queryEmbedding) {
          const { data: matches, error: matchError } = await db.rpc("match_properties", {
            query_embedding: queryEmbedding,
            candidate_ids: props.map(p => p.id),
            match_count: props.length,
          });
          if (matchError) console.error("[sofia match_properties]", matchError.message);
          if (matches?.length) {
            const orden = new Map<string, number>(matches.map((m: { id: string }, i: number) => [m.id, i]));
            props = [...props].sort((a, b) => {
              const oa = orden.has(a.id) ? orden.get(a.id)! : Infinity;
              const ob = orden.has(b.id) ? orden.get(b.id)! : Infinity;
              return oa - ob;
            });
          }
        }
      } catch (e) {
        console.error("[sofia embeddings]", (e as Error)?.message);
      }
    }

    if (traerMuchas && props) props = props.slice(0, MAX_INVENTARIO);

    // Créditos aceptados: nota interna que deja el agente de fuentes. Sofía
    // solo la usa para responder si el cliente pregunta por financiamiento,
    // nunca la mete en la descripción general de la propiedad.
    const creditosPorProp: Record<string, string> = {};
    if (props?.length) {
      const { data: notas } = await db
        .from("property_notes")
        .select("property_id, content")
        .in("property_id", props.map(p => p.id))
        .ilike("content", "Créditos aceptados%");
      for (const n of notas || []) creditosPorProp[n.property_id] ??= n.content;
    }

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
          creditosPorProp[p.id] || "",
          desc,
        ].filter(Boolean).join(" | ");
      })
      .join("\n\n");
  }

  const propCtxBlock = ctxProp
    ? `\nEL VISITANTE ESTÁ VIENDO ESTA PROPIEDAD:\nID: ${ctxProp.id} | ${ctxProp.title} | ${ctxProp.operation}\nResponde principalmente sobre esta propiedad. Para mostrarla usa [PROPS|${ctxProp.id}]\n`
    : "";

  const detectedFilters = { operacion, tipo, zona, precio_min: precioMin, precio_max: precioMax, recamaras_min: recMin };
  const hoyMerida = meridaParts(new Date()).ymd;

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
2. Muestra máximo 3 con [PROPS|id1,id2,id3] al final — esto es OBLIGATORIO: si tu texto describe o menciona propiedades específicas, [PROPS|...] debe incluir el [id] de cada una (tal como aparece entre corchetes en el INVENTARIO de arriba); si no incluyes esta etiqueta, el cliente no ve ninguna tarjeta aunque tu texto las haya descrito.
3. NUNCA digas que solo hay las que muestras si hay más.
4. Si el cliente pregunta si es todo, di el total exacto.
5. NUNCA inventes datos. Si no está en el inventario, no existe.
6. El número en "INVENTARIO (N propiedades encontradas...)" de arriba es un hecho, no una sugerencia: si N es 0, dilo y sugiere ajustar los criterios; si N es mayor a 0, SIEMPRE hay resultados que mostrar — nunca digas "no encontramos" ni "no tenemos disponibilidad" cuando N > 0.
7. "Créditos aceptados" (cuando aparece en una propiedad) solo lo mencionas si el cliente pregunta por financiamiento, crédito, Infonavit, Fovissste o forma de pago — nunca de forma proactiva ni en la descripción general.
`}

${propCtxBlock}

CAPTURAR LEAD:
- Cuando tengas nombre + teléfono → incluye [LEAD|nombre=X|telefono=Y|presupuesto=Z|zona=W|operacion=V]
- Pide teléfono de forma natural después de 2-3 intercambios si hay interés real.

AGENDAR VISITA:
- Si el cliente quiere visitar una propiedad (la que está viendo, o alguna de las que le mostraste — usa el [id] con el que aparece en el inventario de arriba), ofrécele proponer hasta 3 opciones de fecha y hora.
- Hoy es ${hoyMerida} (zona horaria de Mérida). Las fechas que agendes deben ser futuras, horario de 09:00 a 18:00.
- Cuando tengas el id de esa propiedad + nombre + teléfono + al menos una fecha y hora, incluye al final (sin corchetes extra, solo este formato):
  [CITA|propiedad=ID|nombre=X|telefono=Y|correo=Z|fecha1=YYYY-MM-DD|hora1=HH:MM|fecha2=YYYY-MM-DD|hora2=HH:MM|fecha3=YYYY-MM-DD|hora3=HH:MM]
  correo es opcional (omítelo si no lo dio); omite fecha2/hora2 y fecha3/hora3 si solo propuso una o dos opciones.
- No muestres este formato al cliente ni lo menciones; después de incluirlo, dile en tu propio texto que ya quedó la solicitud y que un consultor Duclaud confirmará el horario a la brevedad por WhatsApp o llamada.
- Si ya tiene cita pendiente en esta conversación, no la repitas.

FORMATO: Respuestas cortas y directas.`;

  let reply = "Lo siento, hubo un error. ¿Puede intentar de nuevo?";
  try {
    const response = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 800,
      temperature: 0.4, // menos variación al leer el inventario — ya vimos casos donde con temperatura alta decía "no hay" habiendo resultados
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

  // Agendar visita: Sofía propuso fecha(s) y ya tiene propiedad + nombre + teléfono.
  // crearSolicitudCita vuelve a validar la propiedad contra la base (publicada y
  // existente), así que un id inventado por el modelo simplemente no encuentra nada.
  let appointmentRequested = false;
  const cita = parseCitaTag(reply);
  reply = cita.clean;
  if (cita.data) {
    const result = await crearSolicitudCita(db, {
      ...cita.data,
      source:   "Sofía IA — Cita",
      adminUrl: `${siteUrl}/admin/citas`,
    });
    appointmentRequested = result.ok;
    if (!result.ok) console.error("[sofia cita]", result.error);
  }

  // Guardar la pregunta del visitante y la respuesta de Sofía (antes la pregunta
  // la insertaba el navegador con la llave anónima)
  if (sessionId) {
    await db.from("chatbot_messages").insert([
      { session_id: sessionId, from_bot: false, message: messages[messages.length - 1].content },
      { session_id: sessionId, from_bot: true,  message: reply },
    ]);
  }

  return NextResponse.json({ reply, leadData, propertyCards, appointmentRequested });
}
