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

  // Inventario disponible con IDs para que Sofía pueda referenciarlos
  const { data: props } = await db
    .from("properties")
    .select("id, title, type, operation, price, currency, zone, city, bedrooms, bathrooms, m2_construction, status")
    .eq("status", "Disponible")
    .order("created_at", { ascending: false })
    .limit(40);

  const inventario = (props || [])
    .map(p =>
      `[${p.id}] ${p.title} | ${p.type} en ${p.operation} | ` +
      `$${Number(p.price).toLocaleString("es-MX")} ${p.currency || "MXN"} | ` +
      `${[p.zone, p.city].filter(Boolean).join(", ")} | ` +
      `${p.bedrooms}rec ${p.bathrooms}ba${p.m2_construction ? ` ${p.m2_construction}m²` : ""}`
    )
    .join("\n");

  const propCtxBlock = propertyCtx
    ? `\nEL VISITANTE ESTÁ VIENDO ESTA PROPIEDAD:
Nombre: ${propertyCtx.title}
Operación: ${propertyCtx.operation}
ID: ${propertyCtx.id}
Responde sobre esta propiedad. Para mostrarla usa [PROPS|${propertyCtx.id}]\n`
    : "";

  const system = `Eres Sofía, asistente virtual de Duclaud — firma de consultoría inmobiliaria con sede en Mérida, Yucatán. Tono: profesional, cálido, directo. Tratamiento de usted. Sin emojis.

SOBRE DUCLAUD:
- Firma de consultoría inmobiliaria (no "agencia"), certificada AMPI
- Fundada por Bertha Duclaud. 600+ propiedades gestionadas
- Diferenciador: equipo legal y financiero interno en la misma firma
- Yucatán · Quintana Roo · Nuevo León
- Tagline: "Inversiones que trascienden."
- Terminología: "operación" (no venta), "consultor Duclaud" (no agente), "patrimonio"

INVENTARIO (formato [ID] nombre | detalles):
${inventario || "Sin propiedades disponibles."}

MOSTRAR PROPIEDADES: incluir al final [PROPS|id1,id2,id3] — máx 3 IDs del inventario.
CAPTURAR LEAD: cuando tenga nombre + teléfono → [LEAD|nombre=X|telefono=Y|presupuesto=Z|zona=W|operacion=V]
${propCtxBlock}
REGLAS: respuestas cortas (1-3 oraciones), mostrar propiedades de inmediato si describe lo que busca, no inventar datos.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL_HAIKU || "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system,
      messages,
    }),
  });

  const data = await res.json();
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });

  let reply: string = data.content?.[0]?.text || "Lo siento, hubo un error. ¿Puedes intentar de nuevo?";

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
      // Traer datos de esas propiedades
      const { data: propData } = await db
        .from("properties")
        .select("id, title, type, operation, price, currency, zone, city, bedrooms, bathrooms, m2_construction")
        .in("id", ids);

      // Traer portadas en una sola query
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
