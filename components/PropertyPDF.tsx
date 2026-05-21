import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { DUCLAUD_LOGO_B64 } from "@/lib/duclaud-logo";

const NAVY  = "#1C2B4B";
const GOLD  = "#C4956A";
const CREAM = "#FAF8F5";
const STONE = "#EDE9E1";
const INK   = "#111827";
const MUTED = "#6B7280";
const WHITE = "#FFFFFF";

const s = StyleSheet.create({
  page:        { backgroundColor: WHITE, fontFamily: "Helvetica", color: INK, fontSize: 10 },

  // ── Header ──────────────────────────────────────────
  header:      { backgroundColor: NAVY, paddingHorizontal: 48, paddingTop: 20, paddingBottom: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo:        { width: 160, height: 45, objectFit: "contain" },
  refBadge:    { color: "#FFFFFF60", fontSize: 8, fontFamily: "Helvetica-Oblique", letterSpacing: 1 },
  goldBar:     { height: 3, backgroundColor: GOLD },

  // ── Precio block ────────────────────────────────────
  priceBlock:  { backgroundColor: CREAM, paddingHorizontal: 48, paddingVertical: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  opTag:       { backgroundColor: NAVY, color: WHITE, fontSize: 7, letterSpacing: 2.5, fontFamily: "Helvetica-Bold", paddingHorizontal: 9, paddingVertical: 4, marginBottom: 8, alignSelf: "flex-start" },
  priceNum:    { fontFamily: "Helvetica-Bold", fontSize: 32, color: NAVY, letterSpacing: -0.5 },
  priceSub:    { fontFamily: "Helvetica", fontSize: 9, color: MUTED, marginTop: 2 },
  curTag:      { backgroundColor: GOLD, color: WHITE, fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-end" },

  // ── Título ──────────────────────────────────────────
  titleBlock:  { paddingHorizontal: 48, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: STONE },
  propTitle:   { fontFamily: "Helvetica-Bold", fontSize: 19, color: INK, lineHeight: 1.3 },
  propAddr:    { fontSize: 9.5, color: MUTED, marginTop: 5, letterSpacing: 0.3 },

  // ── Imagen cover ────────────────────────────────────
  cover:       { marginHorizontal: 48, marginTop: 16, height: 240, objectFit: "cover", backgroundColor: STONE },

  // ── Specs ────────────────────────────────────────────
  specsRow:    { flexDirection: "row", marginHorizontal: 48, marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: STONE, paddingVertical: 14 },
  specBox:     { flex: 1, paddingHorizontal: 10, borderRightWidth: 1, borderColor: STONE },
  specBoxLast: { flex: 1, paddingHorizontal: 10 },
  specLabel:   { fontSize: 7, letterSpacing: 2, color: MUTED, textTransform: "uppercase" },
  specValue:   { fontFamily: "Helvetica-Bold", fontSize: 14, color: NAVY, marginTop: 3 },

  // ── Sección ─────────────────────────────────────────
  secTitle:    { fontSize: 7.5, letterSpacing: 2.5, color: GOLD, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginHorizontal: 48, marginTop: 20, marginBottom: 6 },
  secLine:     { height: 1, backgroundColor: STONE, marginHorizontal: 48, marginBottom: 10 },

  // ── Cuerpo de texto en box ───────────────────────────
  textBox:     { marginHorizontal: 48, backgroundColor: CREAM, padding: 14, marginBottom: 4 },
  bodyText:    { fontSize: 9.5, color: MUTED, lineHeight: 1.75 },

  // ── Amenidades ───────────────────────────────────────
  amenRow:     { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 48 },
  amenItem:    { width: "50%", flexDirection: "row", alignItems: "center", paddingVertical: 3.5 },
  amenDot:     { width: 4, height: 4, backgroundColor: GOLD, borderRadius: 2, marginRight: 6 },
  amenText:    { fontSize: 9.5, color: INK },

  // ── Mapa ─────────────────────────────────────────────
  mapBox:      { marginHorizontal: 48, marginTop: 10, height: 190, objectFit: "cover", backgroundColor: STONE },
  mapCaption:  { marginHorizontal: 48, marginTop: 5, fontSize: 8, color: MUTED, letterSpacing: 0.3 },

  // ── Asesor ───────────────────────────────────────────
  agentCard:   { marginHorizontal: 48, marginTop: 8, padding: 14, backgroundColor: CREAM, flexDirection: "row", alignItems: "center" },
  agentInit:   { width: 38, height: 38, backgroundColor: NAVY, alignItems: "center", justifyContent: "center", marginRight: 12 },
  agentInitTx: { color: GOLD, fontSize: 14, fontFamily: "Helvetica-Bold" },
  agentName:   { fontFamily: "Helvetica-Bold", fontSize: 11, color: NAVY },
  agentRole:   { fontSize: 7.5, color: MUTED, letterSpacing: 2, marginTop: 2 },
  agentContac: { fontSize: 9, color: MUTED, marginTop: 4 },

  // ── Footer navy ──────────────────────────────────────
  footer:      { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: NAVY, paddingHorizontal: 48, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLogo:  { width: 80, height: 22, objectFit: "contain" },
  footerInfo:  { color: "#FFFFFF50", fontSize: 7.5, letterSpacing: 0.5 },
  footerPage:  { color: GOLD, fontSize: 8, fontFamily: "Helvetica-Bold" },

  // ── Página galería ───────────────────────────────────
  galHeader:   { backgroundColor: NAVY, paddingHorizontal: 48, paddingVertical: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  galTitle:    { color: WHITE, fontSize: 10, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  galSub:      { color: "#FFFFFF50", fontSize: 8 },
  galGrid:     { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 44, paddingTop: 12 },
  galImg:      { width: "48%", height: 168, marginHorizontal: "1%", marginBottom: 10, objectFit: "cover", backgroundColor: STONE },

  // ── Página contacto ──────────────────────────────────
  contactRow:  { flexDirection: "row", marginHorizontal: 48, marginBottom: 0, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: STONE },
  contactLbl:  { width: 88, fontSize: 8, letterSpacing: 1.5, color: MUTED, textTransform: "uppercase", paddingTop: 1 },
  contactVal:  { flex: 1, fontSize: 10, color: INK, fontFamily: "Helvetica-Bold" },
  credRow:     { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 48, marginTop: 8 },
  credBadge:   { borderWidth: 1, borderColor: STONE, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6, fontSize: 7.5, color: NAVY, letterSpacing: 0.5 },
  disclaimer:  { marginHorizontal: 48, marginTop: 10, fontSize: 8, color: MUTED, lineHeight: 1.75, backgroundColor: CREAM, padding: 14 },
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

function SectionTitle({ children }: { children: string }) {
  return (
    <>
      <Text style={s.secTitle}>{children}</Text>
      <View style={s.secLine} />
    </>
  );
}

function Footer({ biz, hideContact }: { biz: any; hideContact?: boolean }) {
  return (
    <View style={s.footer} fixed>
      <Image src={DUCLAUD_LOGO_B64} style={s.footerLogo} />
      {!hideContact && biz.phone
        ? <Text style={s.footerInfo}>{biz.phone}  ·  {biz.email}</Text>
        : <Text style={s.footerInfo}> </Text>}
      <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function PropertyPDF({ property: p, images, agent, biz, hideHeader, mapImageB64 }: {
  property: PDFProperty;
  images: { url: string }[];
  agent: PDFAgent;
  biz: { name: string; phone: string; email: string; whatsapp: string; web?: string };
  hideHeader?: boolean;
  mapImageB64?: string | null;
}) {
  const cover    = images[0];
  const gallery  = images.slice(1, 9);
  const currency = (p as any).currency || "MXN";
  const isRenta  = p.operation === "Renta";

  const specs = [
    p.bedrooms > 0     ? { l: "Recámaras",      v: String(p.bedrooms) }     : null,
    p.bathrooms > 0    ? { l: "Baños",           v: String(p.bathrooms) }    : null,
    p.parking > 0      ? { l: "Estac.",          v: String(p.parking) }      : null,
    p.m2_construction  ? { l: "m² Construcción", v: `${p.m2_construction}` } : null,
    p.m2_land          ? { l: "m² Terreno",      v: `${p.m2_land}` }         : null,
                         { l: "Tipo",            v: p.type },
  ].filter(Boolean) as { l: string; v: string }[];

  const address = [p.zone, p.city, p.state].filter(Boolean).join("  ·  ");

  return (
    <Document>
      {/* ══ PÁGINA 1: FICHA PRINCIPAL ══════════════════════════════ */}
      <Page size="A4" style={[s.page, { paddingBottom: 50 }]}>
        {/* Header con logo real */}
        <View style={s.header}>
          <Image src={DUCLAUD_LOGO_B64} style={s.logo} />
          {p.reference && <Text style={s.refBadge}>Ref. {p.reference}</Text>}
        </View>
        <View style={s.goldBar} />

        {/* Precio */}
        <View style={s.priceBlock}>
          <View>
            <Text style={s.opTag}>PROPIEDAD EN {p.operation.toUpperCase()}</Text>
            <Text style={s.priceNum}>
              {fmt(Number(p.price), currency)}{isRenta ? " /mes" : ""}
            </Text>
            {currency === "USD" && <Text style={s.priceSub}>Precio en dólares americanos</Text>}
          </View>
          <Text style={s.curTag}>{currency}</Text>
        </View>

        {/* Título */}
        <View style={s.titleBlock}>
          <Text style={s.propTitle}>{p.title}</Text>
          <Text style={s.propAddr}>{address}</Text>
        </View>

        {/* Imagen cover */}
        {cover && <Image src={cover.url} style={s.cover} />}

        {/* Specs */}
        {specs.length > 0 && (
          <View style={s.specsRow}>
            {specs.map((sp, i) => (
              <View key={i} style={i < specs.length - 1 ? s.specBox : s.specBoxLast}>
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
            <View style={s.textBox}>
              <Text style={s.bodyText}>{p.description}</Text>
            </View>
          </>
        )}

        {/* Amenidades */}
        {p.amenities?.length > 0 && (
          <>
            <SectionTitle>Amenidades y características</SectionTitle>
            <View style={s.amenRow}>
              {p.amenities.map((a, i) => (
                <View key={i} style={s.amenItem}>
                  <View style={s.amenDot} />
                  <Text style={s.amenText}>{a}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Mapa */}
        {mapImageB64 && (
          <>
            <SectionTitle>Ubicación</SectionTitle>
            <Image src={mapImageB64} style={s.mapBox} />
            <Text style={s.mapCaption}>{[p.address, p.zone, p.city, p.state].filter(Boolean).join(", ")}</Text>
          </>
        )}

        {/* Asesor */}
        {agent && !hideHeader && (
          <>
            <SectionTitle>Consultor a cargo</SectionTitle>
            <View style={s.agentCard}>
              <View style={s.agentInit}>
                <Text style={s.agentInitTx}>
                  {(agent.full_name || "D").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={s.agentName}>{agent.full_name || ""}</Text>
                <Text style={s.agentRole}>CONSULTOR DUCLAUD</Text>
                <Text style={s.agentContac}>
                  {[agent.phone, agent.email].filter(Boolean).join("   ·   ")}
                </Text>
              </View>
            </View>
          </>
        )}

        <Footer biz={biz} hideContact={hideHeader} />
      </Page>

      {/* ══ PÁGINA 2: GALERÍA ══════════════════════════════════════ */}
      {gallery.length > 0 && (
        <Page size="A4" style={[s.page, { paddingBottom: 50 }]}>
          <View style={s.galHeader}>
            <Image src={DUCLAUD_LOGO_B64} style={{ width: 120, height: 34, objectFit: "contain" }} />
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.galTitle}>GALERÍA FOTOGRÁFICA</Text>
              <Text style={s.galSub}>{p.title}</Text>
            </View>
          </View>
          <View style={s.goldBar} />
          <View style={s.galGrid}>
            {gallery.map((img, i) => <Image key={i} src={img.url} style={s.galImg} />)}
          </View>
          <Footer biz={biz} hideContact={hideHeader} />
        </Page>
      )}

      {/* ══ PÁGINA 3: CONTACTO Y LEGALES (solo cliente) ═══════════ */}
      {!hideHeader && (
        <Page size="A4" style={[s.page, { paddingBottom: 50 }]}>
          <View style={s.header}>
            <Image src={DUCLAUD_LOGO_B64} style={s.logo} />
          </View>
          <View style={s.goldBar} />

          <SectionTitle>Información de contacto</SectionTitle>
          {[
            { l: "Teléfono",  v: biz.phone },
            { l: "WhatsApp",  v: biz.whatsapp },
            { l: "Correo",    v: biz.email },
            { l: "Web",       v: biz.web || "duclaud.mx" },
          ].filter(c => c.v).map(c => (
            <View key={c.l} style={s.contactRow}>
              <Text style={s.contactLbl}>{c.l}</Text>
              <Text style={s.contactVal}>{c.v}</Text>
            </View>
          ))}

          <SectionTitle>Credenciales y certificaciones</SectionTitle>
          <View style={s.credRow}>
            {["Socios AMPI Mérida", "Certificación ECO 110.02", "PROFECO 5589-2022", "Criterio legal y financiero integrado"].map(c => (
              <Text key={c} style={s.credBadge}>{c}</Text>
            ))}
          </View>

          <SectionTitle>Aviso importante</SectionTitle>
          <View style={s.disclaimer}>
            <Text style={s.bodyText}>
              Las imágenes son ilustrativas y pueden variar sin previo aviso. Todos los precios están sujetos a cambio y disponibilidad. La responsabilidad de garantías recae en propietarios y/o constructoras. El precio total se determinará conforme a crédito y gastos notariales según la NOM-247-SE-2021. Los gastos administrativos, avalúos e impuestos se cubren según corresponda a cada parte. Consulte términos, condiciones y aviso de privacidad en duclaud.mx.
            </Text>
          </View>

          <Footer biz={biz} />
        </Page>
      )}
    </Document>
  );
}
