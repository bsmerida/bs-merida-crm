// lib/portales.ts
// Portales que leen el feed de Duclaud. Cada uno tiene su columna publicar_<portal>
// en properties y su feed en /api/feed/<portal>.
export const PORTALES = [
  { clave: "publicar_inmuebles24", nombre: "Inmuebles24" },
  { clave: "publicar_mercadolibre", nombre: "Mercado Libre" },
  { clave: "publicar_tuportalonline", nombre: "TuPortalOnline" },
  { clave: "publicar_proppit", nombre: "Proppit" },
  { clave: "publicar_inmoxperts", nombre: "Inmoxperts" },
  { clave: "publicar_properstar", nombre: "Properstar" },
  { clave: "publicar_beleta", nombre: "Beleta" },
  { clave: "publicar_clasco", nombre: "Clasco" },
  { clave: "publicar_pincali", nombre: "Pincali" },
  { clave: "publicar_portalterreno", nombre: "Portal Terreno" },
  { clave: "publicar_propiedades", nombre: "Propiedades.com" },
  { clave: "publicar_valoresampi", nombre: "Valores AMPI" },
  { clave: "publicar_casasyterrenos", nombre: "Casas y Terrenos" },
] as const;

export type ClavePortal = (typeof PORTALES)[number]["clave"];
const CLAVES = new Set<string>(PORTALES.map(p => p.clave));

// Solo claves conocidas (lo que venga del navegador no puede escribir otras columnas)
export function portalesValidos(valor: unknown): ClavePortal[] {
  if (!Array.isArray(valor)) return [];
  return [...new Set(valor.map(String))].filter((c): c is ClavePortal => CLAVES.has(c));
}
