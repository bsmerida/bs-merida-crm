import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { lead, properties } = await req.json();

  const propList = properties
    .map((p: any) => `ID:${p.id} | ${p.title} | ${p.type} | ${p.operation} | $${p.price.toLocaleString()} ${p.currency || "MXN"} | ${[p.zone, p.city].filter(Boolean).join(", ")} | ${p.bedrooms}rec ${p.bathrooms}ba ${p.m2_construction ? p.m2_construction + "m²" : ""}`)
    .join("\n");

  const system = `Eres un experto asesor inmobiliario. Tu tarea es analizar el perfil de un cliente y un listado de propiedades disponibles, y seleccionar las que mejor se adaptan a sus necesidades.

Responde ÚNICAMENTE con un JSON válido con este formato exacto, sin texto adicional, sin markdown:
{
  "matches": [
    { "property_id": "uuid-aqui", "score": 9, "reason": "razón breve en español, máx 15 palabras" },
    ...
  ]
}

Reglas:
- Selecciona máximo 8 propiedades
- Solo incluye propiedades con score >= 6
- El score va de 1 a 10
- La razón debe ser concreta y personal para el cliente (ej: "Dentro de su presupuesto, 3 recámaras como pidió, zona Altabrisa")
- Ordena de mayor a menor score`;

  const userMsg = `PERFIL DEL CLIENTE:
Nombre: ${lead.name}
Operación buscada: ${lead.interest || "No especificado"}
Presupuesto: ${lead.budget_text || `$${lead.budget_min?.toLocaleString() || "?"} - $${lead.budget_max?.toLocaleString() || "?"} MXN`}
Zona de interés: ${lead.client_city || lead.notes || "No especificado"}
Notas del asesor: ${lead.notes || "Ninguna"}

PROPIEDADES DISPONIBLES (${properties.length} total):
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
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Error al parsear respuesta de IA" }, { status: 500 });
  }
}
