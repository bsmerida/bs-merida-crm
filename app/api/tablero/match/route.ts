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

  // Leer preferencias de AMBOS lugares: columnas directas + JSONB
  const prefs = lead.preferences || {};
  const operation  = lead.search_operation || prefs.operation || "";
  const types      = (lead.search_types?.length ? lead.search_types : null) || prefs.types || [];
  const zones      = prefs.zones || [];
  const radius     = prefs.radius_km || 3;
  const budgetMax  = lead.budget_max  ? Number(lead.budget_max)  : null;
  const budgetMin  = lead.budget_min  ? Number(lead.budget_min)  : null;
  const bedsMin    = prefs.bedrooms_min  != null ? prefs.bedrooms_min  : null;
  const bedsMax    = prefs.bedrooms_max  != null ? prefs.bedrooms_max  : null;
  const bathsMin   = prefs.bathrooms_min != null ? prefs.bathrooms_min : null;
  const m2Min      = prefs.m2_construction_min != null ? prefs.m2_construction_min : null;

  // Verificar que hay criterios mínimos para no mandar basura
  const hasCriteria = budgetMax || zones.length || types.length || operation;
  if (!hasCriteria) {
    return NextResponse.json({
      no_criteria: true,
      error: "Completa al menos el presupuesto máximo o las zonas de interés antes de usar la IA."
    }, { status: 400 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: allProps } = await db
    .from("properties")
    .select("id,title,type,operation,price,currency,zone,city,state,lat,lng,bedrooms,bathrooms,m2_construction,m2_land,amenities,status")
    .eq("status", "Disponible");

  if (!allProps?.length) return NextResponse.json({ matches: [] });

  let candidates: any[] = allProps.map(p => ({ ...p, zone_match: "exact", minDist: 0 }));

  // ── Filtros duros ─────────────────────────────────────────
  // 1. Presupuesto — sin tolerancia
  if (budgetMax) candidates = candidates.filter(p => Number(p.price) <= budgetMax);
  if (budgetMin) candidates = candidates.filter(p => Number(p.price) >= budgetMin * 0.8);

  // 2. Operación (Venta ↔ Comprar, Renta ↔ Rentar)
  if (operation) {
    const opMap: Record<string, string> = { "Comprar": "Venta", "Rentar": "Renta", "Venta": "Venta", "Renta": "Renta" };
    const opDb = opMap[operation] || operation;
    candidates = candidates.filter(p => p.operation === opDb);
  }

  // 3. Tipo de inmueble (multi)
  if (types.length) candidates = candidates.filter(p => types.includes(p.type));

  // 4. Recámaras
  if (bedsMin != null) candidates = candidates.filter(p => p.bedrooms >= bedsMin);
  if (bedsMax != null) candidates = candidates.filter(p => p.bedrooms <= bedsMax);

  // 5. Baños
  if (bathsMin != null) candidates = candidates.filter(p => p.bathrooms >= bathsMin);

  // 6. m² construcción
  if (m2Min != null) candidates = candidates.filter(p => !p.m2_construction || p.m2_construction >= m2Min);

  // 7. Zona por distancia — criterio PRINCIPAL
  if (zones.length) {
    const withDist = candidates.map(p => {
      if (!p.lat || !p.lng) return { ...p, minDist: 999, zone_match: "sin_coords" };
      const minDist = Math.min(...zones.map((z: any) => distKm(Number(p.lat), Number(p.lng), z.lat, z.lng)));
      const zone_match = minDist <= radius ? "exact" : minDist <= radius * 2 ? "nearby" : "far";
      return { ...p, minDist, zone_match };
    });

    const inZone = withDist.filter(p => p.zone_match !== "far" && p.zone_match !== "sin_coords");

    if (inZone.length >= 3) {
      // Hay suficientes en la zona — priorizar exactas
      const exact = inZone.filter(p => p.zone_match === "exact");
      candidates = exact.length >= 3 ? exact : inZone;
    } else {
      // Pocas en zona — ampliar radio x2 y avisar
      const wider = withDist.filter(p => p.minDist <= radius * 4);
      candidates = wider.length ? wider : withDist.filter(p => p.zone_match !== "far");
    }
  }

  if (!candidates.length) return NextResponse.json({
    matches: [], empty: true,
    debug: {
      total_props: allProps.length,
      after_budget: allProps.filter((p: any) => {
        if (budgetMax && Number(p.price) > budgetMax) return false;
        if (budgetMin && Number(p.price) < budgetMin * 0.8) return false;
        return true;
      }).length,
      after_operation: (() => {
        const opMap: Record<string, string> = { "Comprar": "Venta", "Rentar": "Renta", "Venta": "Venta", "Renta": "Renta" };
        const opDb = operation ? (opMap[operation] || operation) : null;
        return opDb ? allProps.filter((p: any) => p.operation === opDb).length : allProps.length;
      })(),
      after_types: types.length ? allProps.filter((p: any) => types.includes(p.type)).length : allProps.length,
      operation, types, budgetMax, budgetMin,
      zones_count: zones.length,
      sample_operations: [...new Set(allProps.slice(0, 20).map((p: any) => p.operation))],
      sample_types: [...new Set(allProps.slice(0, 20).map((p: any) => p.type))],
    }
  });

  // Limitar a 20 para el prompt (ya están bien filtrados)
  candidates = candidates
    .sort((a, b) => a.minDist - b.minDist)
    .slice(0, 20);

  // ── Prompt ────────────────────────────────────────────────
  const propList = candidates.map((p: any) =>
    `ID:${p.id} | ${p.title} | ${p.type} | ${p.operation} | ` +
    `$${Number(p.price).toLocaleString()} ${p.currency || "MXN"} | ` +
    `${[p.zone, p.city].filter(Boolean).join(", ")} | ` +
    `${p.bedrooms}rec ${p.bathrooms}ba${p.m2_construction ? ` ${p.m2_construction}m²` : ""}` +
    (p.zone_match ? ` | zona:${p.zone_match}` : "")
  ).join("\n");

  const system = `Eres un asesor inmobiliario mexicano experto. Tu trabajo es seleccionar las MEJORES propiedades de la lista para este cliente específico.

REGLAS ESTRICTAS:
- Estas propiedades ya fueron pre-filtradas por presupuesto, tipo y zona. No tienes que verificar eso.
- Prioriza siempre zone_match=exact sobre zone_match=nearby
- Selecciona máximo 8, score mínimo 7 (sé exigente)
- Si ninguna es realmente buena, devuelve menos propiedades o ninguna
- La razón debe ser específica para ESTE cliente (máx 12 palabras)

Responde SOLO con JSON sin texto extra:
{"matches":[{"property_id":"uuid","score":9,"reason":"razón"}]}`;

  const zonasTxt = zones.map((z: any) => z.label).join(", ") || "no especificada";
  const tiposTxt = types.join(", ") || "cualquiera";

  const userMsg = `CLIENTE: ${lead.name}
Busca: ${operation || "no especificado"} | Tipo: ${tiposTxt}
Zona(s): ${zonasTxt} (radio ${radius}km)
Presupuesto: ${budgetMin ? `$${budgetMin.toLocaleString()}` : "sin mín"} — ${budgetMax ? `$${budgetMax.toLocaleString()} MXN` : "sin máx"}
Recámaras: ${bedsMin ?? "—"} a ${bedsMax ?? "—"} | Baños mín: ${bathsMin ?? "—"}
Notas: ${prefs.search_notes || lead.interest || "Ninguna"}

PROPIEDADES CANDIDATAS (${candidates.length}, ya filtradas):
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
      max_tokens: 1000,
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
