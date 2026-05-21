import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

// ── Duclaud Brand ──────────────────────────────────────────────
const NAVY   = "#1C2B4B";
const GOLD   = "#C4956A";
const CREAM  = "#FAF8F5";
const STONE  = "#EDE9E1";
const INK    = "#111827";
const MUTED  = "#6B7280";
const WHITE  = "#FFFFFF";

const s = StyleSheet.create({
  // Layout
  page:         { backgroundColor: WHITE, fontFamily: "Helvetica", color: INK, fontSize: 10 },
  padded:       { padding: 48, paddingBottom: 80 },

  // Header navy
  header:       { backgroundColor: NAVY, paddingHorizontal: 48, paddingVertical: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  headerLogo:   { color: WHITE, fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: 3 },
  headerSub:    { color: GOLD, fontSize: 8, letterSpacing: 2, marginTop: 3 },
  headerRef:    { color: "#FFFFFF80", fontSize: 8, letterSpacing: 1 },

  // Gold accent bar
  goldBar:      { height: 3, backgroundColor: GOLD },

  // Operation + Price block
  opLabel:      { fontSize: 8, letterSpacing: 2.5, color: MUTED, textTransform: "uppercase", marginTop: 28, marginHorizontal: 48 },
  price:        { fontSize: 36, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: -0.5, marginHorizontal: 48, marginTop: 4 },
  priceSub:     { fontSize: 9, color: MUTED, marginHorizontal: 48, marginTop: 2 },

  // Property title
  title:        { fontSize: 22, fontFamily: "Helvetica-Bold", color: INK, marginHorizontal: 48, marginTop: 14, lineHeight: 1.3 },
  address:      { fontSize: 10, color: MUTED, marginHorizontal: 48, marginTop: 6, letterSpacing: 0.3 },

  // Cover image
  coverImg:     { marginHorizontal: 48, marginTop: 18, height: 260, objectFit: "cover", backgroundColor: STONE },

  // Specs strip
  specsRow:     { flexDirection: "row", marginHorizontal: 48, marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: STONE, paddingVertical: 16 },
  specItem:     { flex: 1, paddingHorizontal: 10, borderRightWidth: 1, borderColor: STONE },
  specItemLast: { flex: 1, paddingHorizontal: 10 },
  specLabel:    { fontSize: 7.5, letterSpacing: 1.5, color: MUTED, textTransform: "uppercase" },
  specValue:    { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 3 },

  // Section
  sectionTitle: { fontSize: 8, letterSpacing: 2, color: GOLD, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginHorizontal: 48, marginTop: 24, marginBottom: 8 },
  sectionLine:  { height: 1, backgroundColor: STONE, marginHorizontal: 48, marginBottom: 10 },
  bodyText:     { fontSize: 10, color: MUTED, lineHeight: 1.7, marginHorizontal: 48 },

  // Amenities
  amenityRow:   { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 48 },
  amenityItem:  { width: "50%", paddingVertical: 3, fontSize: 9.5, color: INK, flexDirection: "row", alignItems: "center" },
  amenityDot:   { width: 4, height: 4, backgroundColor: GOLD, borderRadius: 2, marginRight: 6 },

  // Map
  mapContainer: { marginHorizontal: 48, marginTop: 10, height: 200, backgroundColor: STONE },
  mapImg:       { width: "100%", height: 200, objectFit: "cover" },
  mapCaption:   { marginHorizontal: 48, marginTop: 5, fontSize: 8, color: MUTED },

  // Agent card
  agentCard:    { marginHorizontal: 48, marginTop: 8, padding: 14, backgroundColor: CREAM, flexDirection: "row", alignItems: "center" },
  agentInit:    { width: 36, height: 36, backgroundColor: NAVY, alignItems: "center", justifyContent: "center", marginRight: 12 },
  agentInitTxt: { color: GOLD, fontSize: 13, fontFamily: "Helvetica-Bold" },
  agentName:    { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY },
  agentRole:    { fontSize: 8, color: MUTED, letterSpacing: 1.5, marginTop: 1 },
  agentContact: { fontSize: 9, color: MUTED, marginTop: 4 },

  // Footer
  footer:       { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: NAVY, paddingHorizontal: 48, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerBrand:  { color: GOLD, fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  footerContact:{ color: "#FFFFFF60", fontSize: 8 },
  footerPage:   { color: "#FFFFFF60", fontSize: 8 },

  // Gallery
  galleryHeader:{ backgroundColor: NAVY, paddingHorizontal: 48, paddingVertical: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  galleryTitle: { color: WHITE, fontSize: 11, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  galleryGrid:  { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 44, paddingTop: 12 },
  galleryImg:   { width: "48%", height: 175, marginHorizontal: "1%", marginBottom: 10, objectFit: "cover", backgroundColor: STONE },

  // Contact / disclaimer page
  contactBlock: { marginHorizontal: 48, marginTop: 8 },
  contactLine:  { flexDirection: "row", marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderColor: STONE },
  contactLabel: { width: 90, fontSize: 9, letterSpacing: 1, color: MUTED, textTransform: "uppercase" },
  contactValue: { flex: 1, fontSize: 10, color: INK },
  disclaimer:   { fontSize: 8.5, color: MUTED, lineHeight: 1.7, marginHorizontal: 48, marginTop: 8 },
  credBadge:    { marginHorizontal: 48, marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cred:         { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: STONE, fontSize: 8, color: NAVY, marginRight: 6, marginBottom: 6 },
});

const fmt = (n: number, cur = "MXN") =>
  new Intl.NumberFormat(cur === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(n);

export type PDFProperty = {
  id: string; title: string; description: string | null; type: string; operation: string;
  price: number; currency?: string; address: string | null; zone: string | null;
  city: string; state: string; bedrooms: number; bathrooms: number;
  m2_construction: number | null; m2_land: number | null; parking: number;
  amenities: string[]; reference: string | null; development: string | null;
  lat?: number | null; lng?: number | null;
};
export type PDFAgent = { full_name: string | null; phone: string | null; email: string | null } | null;

function Initials({ name }: { name: string | null }) {
  const ini = (name || "D").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View style={s.agentInit}>
      <Text style={s.agentInitTxt}>{ini}</Text>
    </View>
  );
}

function Footer({ biz, hideContact }: { biz: any; hideContact?: boolean }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerBrand}>DUCLAUD</Text>
      {!hideContact && biz.phone && (
        <Text style={s.footerContact}>{biz.phone}  ·  {biz.email}</Text>
      )}
      <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <>
      <Text style={s.sectionTitle}>{children}</Text>
      <View style={s.sectionLine} />
    </>
  );
}

export function PropertyPDF({ property: p, images, agent, biz, hideHeader }: {
  property: PDFProperty;
  images: { url: string }[];
  agent: PDFAgent;
  biz: { name: string; phone: string; email: string; whatsapp: string; web?: string };
  hideHeader?: boolean;
}) {
  const cover     = images[0];
  const gallery   = images.slice(1, 9);
  const currency  = p.currency || "MXN";
  const isRenta   = p.operation === "Renta";
  const priceStr  = fmt(Number(p.price), currency);
  const mapUrl    = p.lat && p.lng
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${p.lat},${p.lng}&zoom=15&size=600x250&markers=${p.lat},${p.lng},ol-marker`
    : null;

  const hasSpecs  = p.bedrooms > 0 || p.bathrooms > 0 || p.parking > 0 || p.m2_construction || p.m2_land;
  const specs     = [
    p.bedrooms > 0       && { l: "Recámaras",       v: String(p.bedrooms) },
    p.bathrooms > 0      && { l: "Baños",            v: String(p.bathrooms) },
    p.parking > 0        && { l: "Estac.",           v: String(p.parking) },
    p.m2_construction    && { l: "m² Const.",        v: `${p.m2_construction}` },
    p.m2_land            && { l: "m² Terreno",       v: `${p.m2_land}` },
    true                 && { l: "Tipo",             v: p.type },
  ].filter(Boolean) as { l: string; v: string }[];

  return (
    <Document>
      {/* ══ PÁGINA 1 — FICHA PRINCIPAL ══════════════════════════ */}
      <Page size="A4" style={s.page}>
        {/* Header navy */}
        <View style={s.header}>
          <View>
            <Text style={s.headerLogo}>D · UCLAUD</Text>
            <Text style={s.headerSub}>CONSULTORÍA INMOBILIARIA</Text>
          </View>
          {p.reference && <Text style={s.headerRef}>Ref. {p.reference}</Text>}
        </View>
        <View style={s.goldBar} />

        {/* Precio + operación */}
        <Text style={s.opLabel}>PROPIEDAD EN {p.operation.toUpperCase()}</Text>
        <Text style={s.price}>{priceStr}{isRenta ? " /mes" : ""}</Text>
        {currency === "USD" && <Text style={s.priceSub}>Precio en dólares americanos</Text>}

        {/* Título y ubicación */}
        <Text style={s.title}>{p.title}</Text>
        <Text style={s.address}>
          {[p.zone, p.city, p.state].filter(Boolean).join("  ·  ")}
        </Text>

        {/* Foto principal */}
        {cover && <Image src={cover.url} style={s.coverImg} />}

        {/* Specs en franja */}
        {hasSpecs && (
          <View style={s.specsRow}>
            {specs.map((sp, i) => (
              <View key={i} style={i < specs.length - 1 ? s.specItem : s.specItemLast}>
                <Text style={s.specLabel}>{sp.l}</Text>
                <Text style={s.specValue}>{sp.v}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Descripción */}
        {p.description && (
          <>
            <SectionTitle>Descripción</SectionTitle>
            <Text style={s.bodyText}>{p.description}</Text>
          </>
        )}

        {/* Amenidades */}
        {p.amenities?.length > 0 && (
          <>
            <SectionTitle>Amenidades</SectionTitle>
            <View style={s.amenityRow}>
              {p.amenities.map((a, i) => (
                <View key={i} style={s.amenityItem}>
                  <View style={s.amenityDot} />
                  <Text>{a}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Mapa */}
        {mapUrl && (
          <>
            <SectionTitle>Ubicación</SectionTitle>
            <View style={s.mapContainer}>
              <Image src={mapUrl} style={s.mapImg} />
            </View>
            <Text style={s.mapCaption}>
              {[p.address, p.zone, p.city, p.state].filter(Boolean).join(", ")}
            </Text>
          </>
        )}

        {/* Asesor */}
        {agent && !hideHeader && (
          <>
            <SectionTitle>Consultor a cargo</SectionTitle>
            <View style={s.agentCard}>
              <Initials name={agent.full_name} />
              <View>
                <Text style={s.agentName}>{agent.full_name || ""}</Text>
                <Text style={s.agentRole}>CONSULTOR DUCLAUD</Text>
                {(agent.phone || agent.email) && (
                  <Text style={s.agentContact}>
                    {[agent.phone, agent.email].filter(Boolean).join("   ·   ")}
                  </Text>
                )}
              </View>
            </View>
          </>
        )}

        <Footer biz={biz} hideContact={hideHeader} />
      </Page>

      {/* ══ PÁGINA 2 — GALERÍA ══════════════════════════════════ */}
      {gallery.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.galleryHeader}>
            <Text style={s.galleryTitle}>D · UCLAUD  —  Galería fotográfica</Text>
            <Text style={{ color: "#FFFFFF60", fontSize: 8 }}>{p.title}</Text>
          </View>
          <View style={s.goldBar} />
          <View style={s.galleryGrid}>
            {gallery.map((img, i) => (
              <Image key={i} src={img.url} style={s.galleryImg} />
            ))}
          </View>
          <Footer biz={biz} hideContact={hideHeader} />
        </Page>
      )}

      {/* ══ PÁGINA 3 — CONTACTO Y LEGALES (solo cliente) ═══════ */}
      {!hideHeader && (
        <Page size="A4" style={s.page}>
          <View style={s.header}>
            <View>
              <Text style={s.headerLogo}>D · UCLAUD</Text>
              <Text style={s.headerSub}>CONSULTORÍA INMOBILIARIA</Text>
            </View>
          </View>
          <View style={s.goldBar} />

          <SectionTitle>Contacto</SectionTitle>
          <View style={s.contactBlock}>
            {[
              { l: "Teléfono",  v: biz.phone },
              { l: "WhatsApp",  v: biz.whatsapp },
              { l: "Correo",    v: biz.email },
              { l: "Sitio web", v: biz.web || "duclaud.mx" },
            ].map(c => c.v && (
              <View key={c.l} style={s.contactLine}>
                <Text style={s.contactLabel}>{c.l}</Text>
                <Text style={s.contactValue}>{c.v}</Text>
              </View>
            ))}
          </View>

          <SectionTitle>Credenciales</SectionTitle>
          <View style={s.credBadge}>
            {["Socios AMPI Mérida", "Certificación ECO 110.02", "PROFECO 5589-2022", "Criterio legal y financiero"].map(c => (
              <Text key={c} style={s.cred}>{c}</Text>
            ))}
          </View>

          <SectionTitle>Aviso importante</SectionTitle>
          <Text style={s.disclaimer}>
            Las imágenes presentadas son ilustrativas y pueden variar. Todos los precios están sujetos a cambio y disponibilidad. La responsabilidad del cumplimiento de garantías recae en los propietarios y/o constructoras. El precio total se determinará conforme a los conceptos de crédito y gastos notariales según la NOM-247-SE-2021. Los gastos administrativos, avalúos e impuestos se pagan según corresponda a cada parte. Consulte términos, condiciones y aviso de privacidad en duclaud.mx.
          </Text>

          <Footer biz={biz} />
        </Page>
      )}
    </Document>
  );
}
