// lib/public-property.ts
// Columnas de "properties" que se pueden mandar al navegador en páginas públicas.
// NUNCA usar select("*") en páginas públicas: la tabla incluye owner_name,
// owner_email y owner_phone (datos personales del propietario, LFPDPPP).
export const PUBLIC_PROPERTY_COLUMNS =
  "id, title, type, operation, status, price, currency, zone, city, state, bedrooms, bathrooms, m2_construction, m2_land, parking, featured, created_at, property_images(url, position, is_cover)";

// Ficha pública y PDF: todos los campos de la propiedad excepto los del propietario.
export const PUBLIC_PROPERTY_DETAIL_COLUMNS =
  "id, title, description, type, operation, status, price, price_type, currency, address, zone, city, state, " +
  "bedrooms, bathrooms, m2_construction, m2_land, parking, amenities, development, " +
  "reference, agent_id, is_published, lat, lng, featured, created_at, updated_at";
