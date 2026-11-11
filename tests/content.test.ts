import { describe, expect, it } from "vitest";
import { buildListingsXml } from "@/lib/feed";
import { emailAsesorNuevaSolicitud, emailClienteNuevasOpciones } from "@/lib/emails";
import { mapTokkoProperty } from "@/lib/tokko";
import { pickTaskFields } from "@/lib/tasks";

describe("buildListingsXml", () => {
  const prop = {
    id: "p1", title: "Casa ]]> <b>", description: "", type: "Casa<x>", operation: "Venta",
    price: 100, city: "Mérida & Co", amenities: ["Alberca"], images: [
      { url: "https://a/2.jpg", is_cover: false, position: 2 },
      { url: "https://a/1.jpg?x=1&y=2", is_cover: true, position: 5 },
    ],
    updated_at: "2026-11-10",
  };
  const xml = buildListingsXml([prop], "https://duclaud.mx", { name: "Duclaud", website: "https://duclaud.mx", email: "a@b.mx", phone: "1", phone2: "2" });

  it("escapa valores fuera de CDATA", () => {
    expect(xml).toContain("<type>Casa&lt;x&gt;</type>");
    expect(xml).toContain("<city>Mérida &amp; Co</city>");
    expect(xml).toContain("?x=1&amp;y=2");
  });
  it("incluye los datos del proveedor", () => {
    expect(xml).toContain("<name>Duclaud</name>");
    expect(xml).toContain("<phone2>2</phone2>");
  });
  it("pone la portada primero", () => {
    expect(xml.indexOf("1.jpg")).toBeLessThan(xml.indexOf("2.jpg"));
  });
  it("no rompe el CDATA del título", () => {
    expect(xml).toContain("<title><![CDATA[Casa ]]]]><![CDATA[> <b>]]></title>");
  });
});

describe("emails", () => {
  it("escapa el nombre del cliente en el email al asesor (no se pueden inyectar links)", () => {
    const { html } = emailAsesorNuevaSolicitud({
      requestId: "r1", agentName: "Bertha", clientName: `<a href="https://phish">Clic</a>`,
      clientPhone: "9997466272", propertyTitle: "Casa", options: [{ date: "2026-11-20", time: "10:00" }],
      adminUrl: "https://duclaud.mx/admin/citas",
    });
    expect(html).not.toContain(`<a href="https://phish">`);
    expect(html).toContain("&lt;a href=&quot;https://phish&quot;&gt;");
  });

  it("escapa el mensaje del asesor y codifica el token", () => {
    const { html } = emailClienteNuevasOpciones({
      clientName: "Ana López", agentName: "Bertha", propertyTitle: "Casa",
      agentOptions: [{ date: "2026-11-20", time: "10:00" }], clientToken: "a b&c",
      agentMessage: "<script>x</script>",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("token=a%20b%26c");
  });
});

describe("mapTokkoProperty", () => {
  it("mapea tipo, operación, ubicación, baños y fotos", () => {
    const { data, images } = mapTokkoProperty({
      id: 7, type: { name: "Apartment" },
      operations: [{ operation_type: "Rent", prices: [{ currency: "USD", price: 1 }, { currency: "MXN", price: 25000 }] }],
      location: { full_location: "México | Yucatán | Mérida | Montebello" },
      bathroom_amount: 2, toilet_amount: 1, status: 2,
      photos: [{ image: "b.jpg", order: 2 }, { image: "plano.jpg", is_blueprint: true }, { image: "a.jpg", order: 1 }],
    });
    expect(data).toMatchObject({
      external_id: "7", type: "Departamento", operation: "Renta", price: 25000,
      state: "Yucatán", city: "Mérida", zone: "Montebello", bathrooms: 2.5, is_published: true,
    });
    expect(images).toEqual(["a.jpg", "b.jpg"]);
  });
});

describe("pickTaskFields", () => {
  it("ignora columnas no permitidas (mass assignment)", () => {
    const out = pickTaskFields({ title: "  Llamar  ", created_by: "x", id: "y", status: "hacked", priority: "urgent" });
    expect(out).toEqual({ title: "Llamar", priority: "urgent" });
  });
  it("acepta los estados reales de la UI", () => {
    expect(pickTaskFields({ status: "todo" }).status).toBe("todo");
    expect(pickTaskFields({ status: "done" }).status).toBe("done");
  });
});
