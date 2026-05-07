// Cliente para la API de Tokko Broker
// Docs: https://www.tokkobroker.com/api/

const TOKKO_BASE = "https://www.tokkobroker.com/api/v1";

export type TokkoProperty = {
  id: number;
  reference_code?: string | null;
  publication_title?: string | null;
  description?: string | null;
  rich_description?: string | null;
  address?: string | null;
  fake_address?: string | null;
  type?: { name?: string } | null;
  operations?: Array<{
    operation_type?: string;
    prices?: Array<{ currency?: string; price?: number; period?: string }>;
  }>;
  location?: { name?: string; full_location?: string; state?: string; division?: string } | null;
  photos?: Array<{ image?: string; thumb?: string; is_blueprint?: boolean; order?: number }>;
  suite_amount?: number | string;
  bathroom_amount?: number | string;
  toilet_amount?: number | string;
  parking_lot_amount?: number | string;
  total_surface?: number | string;
  surface?: number | string;
  roofed_surface?: number | string;
  expenses?: number | string;
  status?: number;
  age?: number | string;
  tags?: Array<{ name?: string }>;
  custom1?: string;
  development?: { name?: string } | null;
};

const num = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};
const num0 = (v: any): number => num(v) || 0;

const TYPE_MAP: Record<string, string> = {
  "Departamento": "Departamento", "Apartment": "Departamento",
  "Casa": "Casa", "House": "Casa",
  "Oficina": "Oficina", "Office": "Oficina",
  "Local": "Local", "Local comercial": "Local", "Commercial": "Local",
  "Terreno": "Terreno", "Land": "Terreno", "Lote": "Terreno",
  "Bodega": "Bodega", "Galpón": "Bodega", "Warehouse": "Bodega",
};

// Tokko usa códigos numéricos para status: 2=Disponible, 3=Reservada, 4=Vendida
const STATUS_MAP: Record<number, string> = {
  1: "Pausada",
  2: "Disponible",
  3: "Reservada",
  4: "Vendida",
};

/**
 * Llama a la API de Tokko paginadamente y devuelve TODAS las propiedades.
 */
export async function fetchAllTokkoProperties(apiKey: string, agencyId?: string): Promise<TokkoProperty[]> {
  const all: TokkoProperty[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const params = new URLSearchParams({ key: apiKey, limit: String(limit), offset: String(offset), format: "json" });
    const url = `${TOKKO_BASE}/property/?${params.toString()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Tokko API ${res.status}: ${t.slice(0, 300)}`);
    }
    const data = await res.json();
    const objects: TokkoProperty[] = data.objects || data.results || data || [];
    all.push(...objects);
    if (objects.length < limit) break;
    offset += limit;
    if (offset > 5000) break; // guardrail
  }
  return all;
}

/**
 * Mapea una propiedad de Tokko al schema interno del CRM.
 * Devuelve la propiedad y un array de URLs de imágenes (en orden).
 */
export function mapTokkoProperty(t: TokkoProperty): { data: any; images: string[] } {
  // Tipo
  const typeName = t.type?.name || "";
  const type = TYPE_MAP[typeName] || "Casa";

  // Operación + precio (en Tokko hay operations[]; agarrar la primera con precio MXN)
  let operation = "Venta";
  let price = 0;
  for (const op of t.operations || []) {
    const opType = (op.operation_type || "").toLowerCase();
    const pr = op.prices?.find(p => (p.currency || "").toUpperCase() === "MXN") || op.prices?.[0];
    if (pr?.price && pr.price > 0) {
      operation = opType.includes("rent") || opType.includes("alquil") || opType.includes("renta") ? "Renta" : "Venta";
      price = Number(pr.price);
      break;
    }
  }

  // Ubicación: full_location suele venir como "México | Yucatán | Mérida | Cholul"
  const locStr = t.location?.full_location || "";
  const locParts = locStr.split("|").map(s => s.trim()).filter(Boolean);
  const country = locParts[0] || "México";
  const state = locParts[1] || t.location?.state || "Yucatán";
  const city = locParts[2] || t.location?.division || "Mérida";
  const zone = locParts[3] || t.location?.name || null;

  // Baños: completos + medios (cuentan 0.5)
  const bathrooms = num0(t.bathroom_amount) + (num0(t.toilet_amount) * 0.5);

  // Imágenes ordenadas
  const photos = (t.photos || []).filter(p => !p.is_blueprint && p.image).sort((a, b) => (a.order || 0) - (b.order || 0));
  const imageUrls = photos.map(p => p.image as string);

  // Amenidades desde tags
  const amenities = (t.tags || []).map(tag => tag.name).filter(Boolean) as string[];

  const reference = t.reference_code || null;
  const titleBase = t.publication_title?.trim() || `${type} en ${zone || city}`;

  const data = {
    external_id: String(t.id),
    reference,
    title: titleBase,
    type,
    operation,
    status: t.status ? (STATUS_MAP[t.status] || "Disponible") : "Disponible",
    price,
    description: t.rich_description || t.description || null,
    address: t.fake_address || t.address || null,
    zone,
    city,
    state,
    bedrooms: num0(t.suite_amount),
    bathrooms,
    m2_construction: num(t.roofed_surface) || num(t.total_surface),
    m2_land: num(t.surface) || num(t.total_surface),
    parking: num0(t.parking_lot_amount),
    amenities,
    is_published: t.status === 2,
    development: t.development?.name || null,
  };

  return { data, images: imageUrls };
}
