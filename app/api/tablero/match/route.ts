import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as authClient } from "@/lib/supabase/server";

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  const auth = authClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { lead } = await req.json();
  const prefs = lead.preferences || {};

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: allProps } = await db
    .from("properties")
    .select("id,title,type,operation,price,currency,zone,city,state,lat,lng,bedrooms,bathrooms,m2_construction,m2_land,amenities,status")
    .eq("status", "Disponible");

  if (!allProps?.length) return NextResponse.json({ matches: [] });

  let candidates: any[] = allProps.map(p => ({ ...p, zone_match: "exact" }));

  // 1. Presupuesto
  const budgetMax = lead.budget_max ? Number(lead.budget_max) : null;
  const budgetMin = lead.budget_min ? Number(lead.budget_min) : null;
  if (budgetMax) candidates = candidates.filter(p => Number(p.price) <= budgetMax * 1.05);
  if (budgetMin) candidates = candidates.filter(p => Number(p.price) >= budgetMin * 0.5);

  // 2. Operación
  if (prefs.operation) candidates = candidates.filter(p => p.operation === prefs.operation);

  // 3. Tipo
  if (prefs.types?.length) candidates = candidates.filter(p => prefs.types.includes(p.type));

  // 4. Recámaras
  if (prefs.bedrooms_min != null) candidates = candidates.filter(p => p.bedrooms >= prefs.bedrooms_min);
  if (prefs.bedrooms_max != null) candidates = candidates.filter(p => p.bedrooms <= prefs.bedrooms_max);

  // 5. Baños
  if (prefs.bathrooms_min != null) candidates = candidates.filter(p => p.bathrooms >= prefs.bathrooms_min);

  // 6. m²
  if (prefs.m2_construction_min != null)
    candidates = candidates.filter(p => !p.m2_construction || p.m2_construction >= prefs.m2_construction_min);
  if (prefs.m2_land_min != null)
    candidates = candidates.filter(p => !p.m2_land || p.m2_land >= prefs.m2_land_min);

  // 7. Zona por distancia — criterio PRINCIPAL
  if (prefs.zones?.length) {
    const radius = prefs.radius_km || 3;
    const withDist = candidates.map(p => {
      if (!p.lat || !p.lng) return { ...p, minDist: 999, zone_match: "city" };
      const minDist = Math.min(...prefs.zones.map((z: any) => distKm(Number(p.lat), Number(p.lng), z.lat, z.lng)));
      const zone_match = minDist <= radius ? "exact" : minDist <= radius * 2.5 ? "nearby" : "far";
      return { ...p, minDist, zone_match };
    }).filter(p => p.zone_match !== "far");

    const hasExact = withDist.some(p => p.zone_match === "exact");
    candidates = hasExact ? withDist.filter(p => p.zone_match !== "city") : withDist;
  }

  if (!candidates.length) return NextResponse.json({ matches: [], empty: true });
  candidates = candidates.slice(0, 30);

  const propList = candidates.map((p: any) =>
    `ID:${p.id} | ${p.title} | ${p.type} | ${p.operation} | ` +
    `$${Number(p.price).toLocaleString()} ${p.currency || "MXN"} | ` +
    `${[p.zone, p.city].filter(Boolean).join(", ")} | ` +
    `${p.bedrooms}rec ${p.bathrooms}ba${p.m2_construction ? ` ${p.m2_construction}m²` : ""} | zona:${p.zone_match}`
  ).join("\n");

  const system = `Eres un experto asesor inmobiliario mexicano. Rankea las propiedades candidatas según el perfil del cliente.

PRIORIDADES:
1. Zona exacta (zone_match=exact) siempre por encima de zona cercana (nearby)
2. Precio dentro del rango ideal
3. Características que coincidan

Responde SOLO con JSON, sin texto extra ni markdown:
{"matches":[{"property_id":"uuid","score":9,"reason":"razón breve máx 12 palabras"}]}

Máximo 8 propiedades, score mínimo 6, orden descendente.`;

  const userMsg = `CLIENTE: ${lead.name}
Zona(s): ${prefs.zones?.map((z: any) => z.label).join(", ") || "no especificada"} (radio ${prefs.radius_km || 3}km)
Presupuesto: ${budgetMin ? `$${budgetMin.toLocaleString()}` : "sin mín"} - ${budgetMax ? `$${budgetMax.toLocaleString()} MXN` : "sin máx"}
Operación: ${prefs.operation || "no especificada"}
Tipos: ${prefs.types?.join(", ") || "cualquiera"}
Recámaras: ${prefs.bedrooms_min ?? "—"} a ${prefs.bedrooms_max ?? "—"}
Baños mín: ${prefs.bathrooms_min ?? "—"}
Características: ${prefs.amenities?.join(", ") || "ninguna"}
Notas: ${prefs.search_notes || "Ninguna"}

CANDIDATAS (${candidates.length}):
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
      max_tokens: 1200,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  const data = await res.json();
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });

  try {
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    return NextResponse.json(JSON.parse(clean));
  } catch {
    return NextResponse.json({ error: `JSON inválido: ${data.content?.[0]?.text?.slice(0, 200)}` }, { status: 500 });
  }
}
