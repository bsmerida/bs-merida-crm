// lib/feed.ts
// Feed XML para portales inmobiliarios. Todo valor de la BD se escapa:
// antes un título con "]]>" o un tipo con "<" rompía el XML para los portales.
import { cdata, escapeXml as x } from "@/lib/security";

export function buildListingsXml(props: any[], baseUrl: string, provider: { email: string; phone: string }): string {
  const listings = props.map(p => {
    const images = [...(p.images || [])]
      .sort((a: any, b: any) => (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0) || a.position - b.position)
      .map((img: any) => `<image><url>${x(img.url)}</url></image>`).join("");
    return `
  <listing>
    <id>${x(p.id)}</id>
    <title>${cdata(p.title)}</title>
    <description>${cdata(p.description || "")}</description>
    <type>${x(p.type)}</type>
    <operation>${p.operation === "Venta" ? "for-sale" : "for-rent"}</operation>
    <price>
      <amount>${Number(p.price) || 0}</amount>
      <currency>${x(p.currency || "MXN")}</currency>
      ${p.operation === "Renta" ? "<period>monthly</period>" : ""}
    </price>
    <address>${cdata(p.address || "")}</address>
    <city>${x(p.city || "Mérida")}</city>
    <state>${x(p.state || "Yucatán")}</state>
    <country>MX</country>
    <zone>${cdata(p.zone || "")}</zone>
    <details>
      <bedrooms>${Number(p.bedrooms) || 0}</bedrooms>
      <bathrooms>${Number(p.bathrooms) || 0}</bathrooms>
      <m2-construction>${Number(p.m2_construction) || 0}</m2-construction>
      <m2-land>${Number(p.m2_land) || 0}</m2-land>
      <parking>${Number(p.parking) || 0}</parking>
    </details>
    <amenities>
      ${(p.amenities || []).map((a: string) => `<amenity>${cdata(a)}</amenity>`).join("")}
    </amenities>
    <images>
      ${images}
    </images>
    <listing-url>${x(`${baseUrl}/propiedad/${p.id}`)}</listing-url>
    <updated-at>${x(p.updated_at)}</updated-at>
  </listing>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<listings>
  <provider>
    <name>Inmobiliaria BS Mérida</name>
    <website>https://www.bsmerida.com</website>
    <email>${x(provider.email)}</email>
    <phone>${x(provider.phone)}</phone>
  </provider>
  ${listings}
</listings>`.trim();
}
