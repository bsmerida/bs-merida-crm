import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const BRAND = "#5E4B8E";
const INK = "#2A2640";
const MUTED = "#6E6987";
const LINE = "#EAE5F2";
const GHOST = "#F8F6FB";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
  brand: { color: BRAND, fontSize: 16, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  brandSub: { color: MUTED, fontSize: 8, marginTop: 2 },
  refTag: { color: MUTED, fontSize: 9 },
  priceTag: { color: BRAND, fontSize: 28, fontFamily: "Helvetica-Bold" },
  operationLabel: { color: MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 18, color: INK },
  zone: { fontSize: 12, color: MUTED, marginTop: 6 },
  cover: { width: "100%", height: 280, backgroundColor: GHOST, marginTop: 16, borderRadius: 6, objectFit: "cover" },
  specsBox: { flexDirection: "row", flexWrap: "wrap", marginTop: 18, paddingTop: 14, paddingBottom: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE },
  spec: { width: "33.33%", padding: 6 },
  specLabel: { color: MUTED, fontSize: 8, textTransform: "uppercase", letterSpacing: 1 },
  specValue: { color: INK, fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2 },
  sectionTitle: { fontSize: 11, color: BRAND, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 22, marginBottom: 10 },
  paragraph: { fontSize: 11, color: INK, lineHeight: 1.6 },
  amenityList: { flexDirection: "row", flexWrap: "wrap" },
  amenity: { width: "50%", paddingVertical: 4, fontSize: 10, color: INK },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, paddingTop: 12, borderTopWidth: 1, borderColor: LINE },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { fontSize: 8, color: MUTED },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 16 },
  galleryImg: { width: "48%", height: 180, marginBottom: 12, marginRight: "2%", backgroundColor: GHOST, borderRadius: 4, objectFit: "cover" },
  disclaimer: { fontSize: 8, color: MUTED, lineHeight: 1.5, marginTop: 8 },
});

const fmtMXN = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

export type PDFProperty = {
  id: string; title: string; description: string | null; type: string; operation: string;
  price: number; address: string | null; zone: string | null; city: string; state: string;
  bedrooms: number; bathrooms: number; m2_construction: number | null; m2_land: number | null;
  parking: number; amenities: string[]; reference: string | null; development: string | null;
};
export type PDFAgent = { full_name: string | null; phone: string | null; email: string | null } | null;

export function PropertyPDF({ property: p, images, agent, biz, hideHeader }: {
  property: PDFProperty;
  images: { url: string }[];
  agent: PDFAgent;
  biz: { name: string; phone: string; email: string; whatsapp: string; web?: string };
  hideHeader?: boolean;
}) {
  const cover = images[0];
  const restImages = images.slice(1, 9);
  const showBiz = !hideHeader && biz.name;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header — solo en modo cliente */}
        {showBiz && (
          <View style={s.topBar}>
            <View>
              <Text style={s.brand}>BS | INMOBILIARIA</Text>
              <Text style={s.brandSub}>{biz.name}</Text>
            </View>
            {p.reference && <Text style={s.refTag}>Ref. {p.reference}</Text>}
          </View>
        )}
        {/* En modo asesor solo mostramos la referencia si existe */}
        {hideHeader && p.reference && (
          <View style={[s.topBar, { marginBottom: 12 }]}>
            <View />
            <Text style={s.refTag}>Ref. {p.reference}</Text>
          </View>
        )}

        <Text style={s.operationLabel}>EN {p.operation.toUpperCase()}</Text>
        <Text style={s.priceTag}>{fmtMXN(Number(p.price))}{p.operation === "Renta" ? " /mes" : ""}</Text>
        <Text style={s.title}>{p.title}</Text>
        <Text style={s.zone}>{[p.zone, p.city, p.state].filter(Boolean).join(", ")}</Text>

        {cover && <Image src={cover.url} style={s.cover} />}

        <View style={s.specsBox}>
          {p.bedrooms > 0 && <View style={s.spec}><Text style={s.specLabel}>Recámaras</Text><Text style={s.specValue}>{p.bedrooms}</Text></View>}
          {p.bathrooms > 0 && <View style={s.spec}><Text style={s.specLabel}>Baños</Text><Text style={s.specValue}>{p.bathrooms}</Text></View>}
          {p.parking > 0 && <View style={s.spec}><Text style={s.specLabel}>Estacionamientos</Text><Text style={s.specValue}>{p.parking}</Text></View>}
          {p.m2_construction && <View style={s.spec}><Text style={s.specLabel}>m² Construcción</Text><Text style={s.specValue}>{Number(p.m2_construction)}</Text></View>}
          {p.m2_land && <View style={s.spec}><Text style={s.specLabel}>m² Terreno</Text><Text style={s.specValue}>{Number(p.m2_land)}</Text></View>}
          <View style={s.spec}><Text style={s.specLabel}>Tipo</Text><Text style={s.specValue}>{p.type}</Text></View>
        </View>

        {p.description && (<><Text style={s.sectionTitle}>Descripción</Text><Text style={s.paragraph}>{p.description}</Text></>)}

        {p.amenities?.length > 0 && (
          <><Text style={s.sectionTitle}>Amenidades</Text>
          <View style={s.amenityList}>{p.amenities.map((a, i) => <Text key={i} style={s.amenity}>• {a}</Text>)}</View></>
        )}

        {agent && (
          <><Text style={s.sectionTitle}>Asesor a cargo</Text>
          <Text style={s.paragraph}>{agent.full_name || ""}{agent.phone ? `  ·  ${agent.phone}` : ""}{agent.email ? `  ·  ${agent.email}` : ""}</Text></>
        )}

        {/* Footer solo en modo cliente */}
        {showBiz && (
          <View style={s.footer} fixed>
            <View style={s.footerRow}>
              <Text style={s.footerText}>{biz.name}  ·  {biz.phone}  ·  {biz.email}</Text>
              <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
            </View>
          </View>
        )}
        {hideHeader && (
          <View style={s.footer} fixed>
            <View style={s.footerRow}>
              <Text style={s.footerText}></Text>
              <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
            </View>
          </View>
        )}
      </Page>

      {/* Galería */}
      {restImages.length > 0 && (
        <Page size="A4" style={s.page}>
          {showBiz && (
            <View style={s.topBar}>
              <View><Text style={s.brand}>BS | INMOBILIARIA</Text><Text style={s.brandSub}>Galería  ·  {p.title}</Text></View>
              {p.reference && <Text style={s.refTag}>Ref. {p.reference}</Text>}
            </View>
          )}
          <View style={s.galleryGrid}>
            {restImages.map((img, i) => <Image key={i} src={img.url} style={s.galleryImg} />)}
          </View>
          {showBiz && (
            <View style={s.footer} fixed>
              <View style={s.footerRow}>
                <Text style={s.footerText}>{biz.name}  ·  {biz.phone}  ·  {biz.email}</Text>
                <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
              </View>
            </View>
          )}
        </Page>
      )}

      {/* Página de contacto — solo en modo cliente */}
      {showBiz && (
        <Page size="A4" style={s.page}>
          <View style={s.topBar}>
            <Text style={s.brand}>BS | INMOBILIARIA</Text>
            {p.reference && <Text style={s.refTag}>Ref. {p.reference}</Text>}
          </View>
          <Text style={s.sectionTitle}>Contacto</Text>
          <Text style={s.paragraph}>
            {biz.name}{"\n"}
            Teléfono: {biz.phone}{"\n"}
            WhatsApp: {biz.whatsapp}{"\n"}
            Correo: {biz.email}
            {biz.web ? `\nWeb: ${biz.web}` : ""}
          </Text>
          <Text style={s.sectionTitle}>Información importante</Text>
          <Text style={s.disclaimer}>
            Las imágenes presentadas son meramente ilustrativas y pueden cambiar sin previo aviso.{"\n"}
            Todos los precios están sujetos a cambio y disponibilidad sin previo aviso.{"\n"}
            La responsabilidad y cumplimiento de garantía es a cargo de los propietarios y/o constructoras.{"\n"}
            El precio total se determinará en función de los montos variables de conceptos de crédito y notariales que deben ser consultados con los promotores de conformidad con lo establecido en la NOM-247-SE-2021.{"\n"}
            Los gastos administrativos, avalúos e impuestos se pagan según corresponda a cada parte.{"\n"}
            Consulte términos, condiciones y aviso de privacidad en nuestra página web.
          </Text>
          <Text style={s.sectionTitle}>Credenciales</Text>
          <Text style={s.disclaimer}>
            Socios de AMPI Mérida.{"\n"}
            Certificación ECO110.02 · Folio D-0036107323.{"\n"}
            Contrato de adhesión registrado ante PROFECO bajo el número 5589-2022.
          </Text>
          <View style={s.footer} fixed>
            <View style={s.footerRow}>
              <Text style={s.footerText}>{biz.name}  ·  {biz.phone}  ·  {biz.email}</Text>
              <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
            </View>
          </View>
        </Page>
      )}
    </Document>
  );
}
