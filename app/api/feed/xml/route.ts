import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600; // cache 1 hora

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("*, images:property_images(url, is_cover, position)")
    .eq("is_published", true)
    .neq("status", "Vendida")
    .neq("status", "Rentada")
    .neq("status", "Pausada");

  const baseUrl = new URL(request.url).origin;
  const props = (properties || []) as any[];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<listings>
  <provider>
    <name>Inmobiliaria BS Mérida</name>
    <website>https://www.bsmerida.com</website>
    <email>${process.env.NEXT_PUBLIC_BUSINESS_EMAIL || "bsmerida19@gmail.com"}</email>
    <phone>${process.env.NEXT_PUBLIC_BUSINESS_PHONE || "999 303 4815"}</phone>
  </provider>
  ${props.map(p => `
  <listing>
    <id>${p.id}</id>
    <title><![CDATA[${p.title}]]></title>
    <description><![CDATA[${p.description || ""}]]></description>
    <type>${p.type}</type>
    <operation>${p.operation === "Venta" ? "for-sale" : "for-rent"}</operation>
    <price>
      <amount>${p.price}</amount>
      <currency>MXN</currency>
      ${p.operation === "Renta" ? "<period>monthly</period>" : ""}
    </price>
    <address><![CDATA[${p.address || ""}]]></address>
    <city>${p.city || "Mérida"}</city>
    <state>${p.state || "Yucatán"}</state>
    <country>MX</country>
    <zone><![CDATA[${p.zone || ""}]]></zone>
    <details>
      <bedrooms>${p.bedrooms || 0}</bedrooms>
      <bathrooms>${p.bathrooms || 0}</bathrooms>
      <m2-construction>${p.m2_construction || 0}</m2-construction>
      <m2-land>${p.m2_land || 0}</m2-land>
      <parking>${p.parking || 0}</parking>
    </details>
    <amenities>
      ${(p.amenities || []).map((a: string) => `<amenity><![CDATA[${a}]]></amenity>`).join("")}
    </amenities>
    <images>
      ${(p.images || []).sort((a: any, b: any) => (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0) || a.position - b.position)
        .map((img: any) => `<image><url>${img.url}</url></image>`).join("")}
    </images>
    <listing-url>${baseUrl}/propiedad/${p.id}</listing-url>
    <updated-at>${p.updated_at}</updated-at>
  </listing>`).join("")}
</listings>`.trim();

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
