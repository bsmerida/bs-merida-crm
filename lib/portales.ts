// lib/portales.ts
// Portales que leen el feed de Duclaud. Cada uno tiene su columna publicar_<portal>
// en properties y su feed en /api/feed/<portal>.
export const PORTALES = [
  { clave: "publicar_inmuebles24", nombre: "Inmuebles24", abrev: "I24" },
  { clave: "publicar_mercadolibre", nombre: "Mercado Libre", abrev: "ML" },
  { clave: "publicar_tuportalonline", nombre: "TuPortalOnline", abrev: "TPO" },
  { clave: "publicar_proppit", nombre: "Proppit", abrev: "L" },
  { clave: "publicar_inmoxperts", nombre: "Inmoxperts", abrev: "IX" },
  { clave: "publicar_properstar", nombre: "Properstar", abrev: "PS" },
  { clave: "publicar_beleta", nombre: "Beleta", abrev: "BE" },
  { clave: "publicar_clasco", nombre: "Clasco", abrev: "CL" },
  { clave: "publicar_pincali", nombre: "Pincali", abrev: "PI" },
  { clave: "publicar_portalterreno", nombre: "Portal Terreno", abrev: "PT" },
  { clave: "publicar_propiedades", nombre: "Propiedades.com", abrev: "P" },
  { clave: "publicar_valoresampi", nombre: "Valores AMPI", abrev: "VA" },
  { clave: "publicar_casasyterrenos", nombre: "Casas y Terrenos", abrev: "CT" },
] as const;

export type ClavePortal = (typeof PORTALES)[number]["clave"];
const CLAVES = new Set<string>(PORTALES.map(p => p.clave));

// Solo claves conocidas (lo que venga del navegador no puede escribir otras columnas)
export function portalesValidos(valor: unknown): ClavePortal[] {
  if (!Array.isArray(valor)) return [];
  return [...new Set(valor.map(String))].filter((c): c is ClavePortal => CLAVES.has(c));
}
