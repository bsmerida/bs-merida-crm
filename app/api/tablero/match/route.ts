import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { lead, properties } = await req.json();

  // Pre-filtro por presupuesto antes de mandar a la IA
  const budgetMax = lead.budget_max ? Number(lead.budget_max) : null;
  const budgetMin = lead.budget_min ? Number(lead.budget_min) : null;

  const filtered = properties.filter((p: any) => {
    if (budgetMax && Number(p.price) > budgetMax * 1.05) return false; // 5% de tolerancia
    if (budgetMin && Number(p.price) < budgetMin * 0.5) return false;
    return true;
  });

  const propList = filtered
    .map((p: any) => `ID:${p.id} | ${p.title} | ${p.type} | ${p.operation} | $${Number(p.price).toLocaleString()} ${p.currency || "MXN"} | ${[p.zone, p.city].filter(Boolean).join(", ")} | ${p.bedrooms}rec ${p.bathrooms}ba ${p.m2_construction ? p.m2_construction + "m²" : ""}`)
    .join("\n");

  const budgetLine = budgetMax
    ? `Presupuesto MÁXIMO: $${Number(budgetMax).toLocaleString()} MXN. NO incluyas propiedades que superen este monto bajo ninguna circunstancia.`
    : "Presupuesto: no especificado.";

  const system = `Eres un experto asesor inmobiliario. Tu tarea es analizar el perfil de un cliente y un listado de propiedades disponibles, y seleccionar las que mejor se adaptan a sus necesidades.

REGLA CRÍTICA DE PRESUPUESTO: NUNCA sugieras propiedades cuyo precio supere el presupuesto máximo del cliente. Esta regla es absoluta y no tiene excepciones.

Responde ÚNICAMENTE con un JSON válido con este formato exacto, sin texto adicional, sin markdown:
{
  "matches": [
    { "property_id": "uuid-aqui", "score": 9, "reason": "razón breve en español, máx 15 palabras" },
    ...
  ]
}

Reglas adicionales:
- Selecciona máximo 8 propiedades
- Solo incluye propiedades con score >= 6
- El score va de 1 a 10
- La razón debe ser concreta y personal (ej: "Dentro de presupuesto, 3 recámaras, zona solicitada")
- Ordena de mayor a menor score`;

  const userMsg = `PERFIL DEL CLIENTE:
Nombre: ${lead.name}
Operación buscada: ${lead.interest || "No especificado"}
${budgetLine}
${budgetMin ? `Presupuesto mínimo: $${Number(budgetMin).toLocaleString()} MXN` : ""}
Zona de interés: ${lead.client_city || "No especificado"}
Notas del asesor: ${lead.notes || "Ninguna"}

PROPIEDADES DISPONIBLES DENTRO DEL PRESUPUESTO (${filtered.length} total):
${propList}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  const data = await res.json();
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });

  try {
    const text = data.content?.[0]?.text || "{}";
    // Limpiar posibles backticks de markdown que Claude a veces agrega
    const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch (e) {
    const raw = data.content?.[0]?.text || "vacío";
    return NextResponse.json({ error: `JSON inválido. Respuesta: ${raw.slice(0, 300)}` }, { status: 500 });
  }
}
