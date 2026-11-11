// lib/portal-feed.ts
// Feed XML compartido por /api/feed/xml y los feeds por portal (/api/feed/<portal>).
// Antes cada portal tenía una copia de 70 líneas del feed (13 copias idénticas
// salvo la columna publicar_<portal>), sin escapar el XML y con select("*").
import { createClient } from "@/lib/supabase/server";
import { buildListingsXml, type FeedProvider } from "@/lib/feed";

// Solo columnas públicas: nunca owner_name/owner_email/owner_phone
const FEED_COLUMNS = "id, title, description, type, operation, price, currency, address, zone, city, state, bedrooms, bathrooms, m2_construction, m2_land, parking, amenities, updated_at, images:property_images(url, is_cover, position)";

export const FEED_PROVIDER: FeedProvider = {
  name:    "Duclaud Bienes Raíces",
  website: "https://www.duclaud.com.mx",
  email:   process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "contacto@duclaud.com.mx",
  phone:   process.env.NEXT_PUBLIC_BUSINESS_PHONE || "999 746 6272",
  phone2:  "8140101300",
};

// portalFlag: columna booleana que indica si la propiedad se publica en ese portal
// (p. ej. "publicar_proppit"). Sin flag: todas las publicadas.
export function portalFeed(portalFlag?: `publicar_${string}`) {
  return async function GET(request: Request) {
    let query = createClient()
      .from("properties")
      .select(FEED_COLUMNS)
      .eq("is_published", true)
      .not("status", "in", '("Vendida","Rentada","Pausada")');
    if (portalFlag) query = query.eq(portalFlag, true);

    const { data: properties } = await query;
    const xml = buildListingsXml(properties || [], new URL(request.url).origin, FEED_PROVIDER);

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  };
}
