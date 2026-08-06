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
  const lastUserMsg = messages[messages.length - 1]?.content || "";

  // ── Fase 1: Extraer filtros del mensaje del cliente ───────────────────────
  const filterRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Del siguiente mensaje de un cliente de una inmobiliaria en Mérida, Yucatán, extrae los filtros de búsqueda en JSON.
Si no se menciona un filtro, usa null.
Zonas comunes: Mérida, San Pedro, Montejo, Benito Juárez, Itzimná, Altabrisa, Santa Gertrudis, Temozón, Cholul, Dzitya, Conkal, Komchen, etc.
Tipos: Casa, Departamento, Terreno, Local, Oficina, Bodega, Villa, Penthouse.
Operaciones: Venta, Renta.

Mensaje: "${lastUserMsg}"

Responde SOLO con JSON válido, sin markdown:
{"zona": null, "tipo": null, "operacion": null, "precio_min": null, "precio_max": null, "recamaras_min": null}`,
      }],
    }),
  });

  let filters: any = {};
  try {
    const filterData = await filterRes.json();
    const text = filterData.content?.[0]?.text || "{}";
    filters = JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    filters = {};
  }

  // ── Fase 2: Buscar propiedades con filtros ────────────────────────────────
  let query = db
    .from("properties")
    .select("id, title, description, type, operation, price, currency, zone, city, state, bedrooms, bathrooms, m2_construction, m2_land, parking, amenities, status, development, reference")
    .eq("status", "Disponible")
    .eq("is_published", true)
    .order("featured", { ascending: false });

  // Aplicar filtros detectados
  if (filters.operacion) {
    query = query.ilike("operation", `%${filters.operacion}%`);
  }
  if (filters.tipo) {
    query = query.ilike("type", `%${filters.tipo}%`);
  }
  if (filters.zona) {
    query = query.or(`zone.ilike.%${filters.zona}%,city.ilike.%${filters.zona}%,state.ilike.%${filters.zona}%`);
  }
  if (filters.precio_min) {
    query = query.gte("price", filters.precio_min);
  }
  if (filters.precio_max) {
    query = query.lte("price", filters.precio_max);
  }
  if (filters.recamaras_min) {
    query = query.gte("bedrooms", filters.recamaras_min);
  }

  // Si no hay filtros específicos, cargar muestra representativa
  const hasFilters = Object.values(filters).some(v => v !== null);
  if (!hasFilters) {
    query = query.limit(40);
  }

  const { data: props } = await query;

  const inventario = (props || [])
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

  const propCtxBlock = propertyCtx
    ? `\nEL VISITANTE ESTÁ VIENDO ESTA PROPIEDAD:\nID: ${propertyCtx.id} | ${propertyCtx.title} | ${propertyCtx.operation}\nResponde principalmente sobre esta propiedad. Para mostrarla usa [PROPS|${propertyCtx.id}]\n`
    : "";

  const filtrosAplicados = hasFilters
    ? `\nFILTROS APLICADOS A ESTE INVENTARIO: ${JSON.stringify(filters)}`
    : "";

  // ── Fase 3: Responder con Claude ──────────────────────────────────────────
  const system = `Eres Sofía, asistente virtual de Duclaud — firma de consultoría inmobiliaria en Mérida, Yucatán.
Tono: profesional, cálido, directo. Tratamiento de usted. Sin emojis.

SOBRE DUCLAUD:
- Firma de consultoría inmobiliaria (nunca "agencia"), certificada AMPI
- Fundada por Bertha Duclaud. 600+ propiedades gestionadas
- Diferenciador: equipo legal y financiero interno en la misma firma
- Presencia en Yucatán, Quintana Roo y Nuevo León
- Tagline: "Inversiones que trascienden."
- Terminología: "operación" (no "venta"), "consultor Duclaud" (no "agente")
- WhatsApp: ${process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272"}

INVENTARIO DISPONIBLE (${props?.length || 0} propiedades que coinciden con la búsqueda):
${inventario || "Sin propiedades disponibles con esos filtros."}
${filtrosAplicados}
${propCtxBlock}

REGLAS ESTRICTAS:
1. SOLO habla de propiedades que aparecen arriba. Si no está, no existe o no está disponible.
2. NUNCA inventes precios, medidas ni datos. Si no tienes el dato exacto, dilo.
3. Si no hay propiedades con esos filtros, díselo honestamente y ofrece alternativas cercanas.
4. NUNCA prometas descuentos, disponibilidad futura ni cosas que no puedes confirmar.
5. Si no sabes algo, di "No tengo ese dato, un consultor Duclaud puede resolverle esa duda".
6. Si el cliente pregunta cuántas propiedades hay en una zona, da el número exacto del inventario de arriba.

MOSTRAR PROPIEDADES:
- Muestra máximo 3 propiedades del inventario que mejor coincidan.
- Usa [PROPS|id1,id2,id3] al final de tu mensaje.
- Ordena por relevancia.

CAPTURAR LEAD:
- Cuando tengas nombre + teléfono → incluye [LEAD|nombre=X|telefono=Y|presupuesto=Z|zona=W|operacion=V]
- Pide teléfono de forma natural después de 2-3 intercambios si hay interés real.

FORMATO:
- Respuestas cortas: 1-3 oraciones, luego propiedades si aplica.
- Da precios exactos del inventario.`;

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

  // Extraer propiedades a mostrar
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
