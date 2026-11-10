import { createClient } from "@/lib/supabase/server";
import { buildListingsXml } from "@/lib/feed";

export const revalidate = 3600; // cache 1 hora

// Solo columnas públicas: nunca owner_name/owner_email/owner_phone
const FEED_COLUMNS = "id, title, description, type, operation, price, currency, address, zone, city, state, bedrooms, bathrooms, m2_construction, m2_land, parking, amenities, updated_at, images:property_images(url, is_cover, position)";

export async function GET(request: Request) {
  const { data: properties } = await createClient()
    .from("properties")
    .select(FEED_COLUMNS)
    .eq("is_published", true)
    .not("status", "in", '("Vendida","Rentada","Pausada")');

  const xml = buildListingsXml(properties || [], new URL(request.url).origin, {
    email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "contacto@duclaud.com.mx",
    phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE || "999 746 6272",
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
