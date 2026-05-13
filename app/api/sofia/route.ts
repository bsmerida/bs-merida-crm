import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { messages, propertyCtx, sessionId } = await req.json();

  // Cargar inventario disponible para que Sofía pueda recomendar
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: props } = await db
    .from("properties")
    .select("id, title, type, operation, price, currency, zone, city, bedrooms, bathrooms, m2_construction, status")
    .eq("status", "Disponible")
    .order("created_at", { ascending: false })
    .limit(40);

  const inventario = (props || [])
    .map(p =>
      `• ${p.title} | ${p.type} en ${p.operation} | $${Number(p.price).toLocaleString("es-MX")} ${p.currency || "MXN"} | ${[p.zone, p.city].filter(Boolean).join(", ")} | ${p.bedrooms}rec ${p.bathrooms}ba${p.m2_construction ? ` ${p.m2_construction}m²` : ""}`
    )
    .join("\n");

  const propCtxBlock = propertyCtx
    ? `\nEL VISITANTE ESTÁ VIENDO ESTA PROPIEDAD ESPECÍFICA:
Nombre: ${propertyCtx.title}
Operación: ${propertyCtx.operation}
URL: ${propertyCtx.url}
Responde preguntas sobre esta propiedad. Si no sabes un detalle específico, di que un asesor puede ampliar la información.\n`
    : "";

  const system = `Eres Sofía, asistente virtual de BS Mérida Inmobiliaria. Eres cálida, inteligente y conoces bien el mercado inmobiliario mexicano.
${propCtxBlock}
INVENTARIO DISPONIBLE ACTUALMENTE (para hacer recomendaciones):
${inventario || "No hay propiedades disponibles en este momento."}

TUS OBJETIVOS (en orden):
1. Ayudar al visitante a encontrar su propiedad ideal
2. Responder preguntas sobre propiedades con base en el inventario
3. Capturar de forma natural: nombre, WhatsApp/teléfono, presupuesto, zona de interés

REGLAS IMPORTANTES:
- Respuestas CORTAS: máximo 2-3 oraciones. El chat es pequeño.
- No pidas todos los datos de golpe. Uno a la vez, cuando sea natural.
- Si alguien pregunta por una propiedad específica del inventario, descríbela.
- Si no hay propiedades exactas para lo que buscan, sugiere las más cercanas.
- Cuando ya tengas nombre Y teléfono del visitante, agrega al FINAL de tu respuesta esta línea exacta (sin cambiar el formato):
  [LEAD|nombre=NOMBRE|telefono=TELEFONO|presupuesto=PRESUPUESTO|zona=ZONA|operacion=OPERACION]
  Donde los campos que no sepas los dejas vacíos. Ejemplo: [LEAD|nombre=Ana|telefono=9991234567|presupuesto=3M|zona=Altabrisa|operacion=Compra]
- Esa línea la procesa el sistema automáticamente, el usuario NO la ve.
- Siempre en español. Tono: amigable pero profesional.
- Nunca inventes precios ni datos que no estén en el inventario.
- Si te preguntan algo que no sabes, di que un asesor puede dar más detalles.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system,
      messages,
    }),
  });

  const data = await res.json();
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });

  let reply: string = data.content?.[0]?.text || "Lo siento, hubo un error. ¿Puedes intentar de nuevo?";

  // Extraer datos del lead si Sofía los capturó
  let leadData: Record<string, string> | null = null;
  const leadMatch = reply.match(/\[LEAD\|([^\]]+)\]/);
  if (leadMatch) {
    leadData = {};
    leadMatch[1].split("|").forEach(pair => {
      const [k, v] = pair.split("=");
      if (k && v) leadData![k.trim()] = v.trim();
    });
    // Quitar la línea [LEAD|...] del texto que ve el usuario
    reply = reply.replace(/\[LEAD\|[^\]]+\]\s*/g, "").trim();
  }

  // Guardar mensaje de Sofía en la sesión
  if (sessionId) {
    await db.from("chatbot_messages").insert({
      session_id: sessionId,
      from_bot: true,
      message: reply,
    });
  }

  return NextResponse.json({ reply, leadData });
}
