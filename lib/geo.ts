// lib/geo.ts
// Distancia entre dos puntos (fórmula de Haversine, en km). Se usa para
// sugerir propiedades realmente cercanas cuando una búsqueda de zona no
// encuentra nada — en vez de mostrar cualquier propiedad destacada aunque
// esté en otra ciudad.
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Más allá de esto ya no cuenta como "cerca" dentro de la misma ciudad —
// evita sugerir, por ejemplo, una propiedad en Monterrey al buscar en Mérida.
export const RADIO_CERCA_KM = 15;

export function masCercanas<T extends { lat?: number | null; lng?: number | null }>(
  props: T[],
  lat: number,
  lng: number,
  max = 6
): T[] {
  return props
    .filter(p => typeof p.lat === "number" && typeof p.lng === "number")
    .map(p => ({ p, d: haversineKm(lat, lng, p.lat as number, p.lng as number) }))
    .filter(({ d }) => d <= RADIO_CERCA_KM)
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map(({ p }) => p);
}
