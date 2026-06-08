import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { PropertyContactButtons } from "@/components/PropertyContactButtons";
import { PropertyGallery } from "@/components/PropertyGallery";
import { PropertyMapEmbed } from "@/components/PropertyMapEmbed";
import { PropertyViewTracker } from "@/components/PropertyViewTracker";
import type { Property, PropertyImage, Profile } from "@/lib/supabase/types";

const fmt = (n: number, cur = "MXN") =>
  new Intl.NumberFormat(cur === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(n);

function SpecBox({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 px-4 text-center bg-white rounded-2xl border border-stone">
      <div className="text-gold">{icon}</div>
      <span className="text-xl font-bold text-navy">{value}</span>
      <span className="text-[10px] uppercase tracking-[0.1em] text-ink-soft">{label}</span>
    </div>
  );
}

const IBed  = <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M3 7v13M21 7v13M3 14h18M3 7a4 4 0 014-4h10a4 4 0 014 4"/></svg>;
const IBath = <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M4 12h16v3a5 5 0 01-5 5H9a5 5 0 01-5-5v-3z"/><path d="M6 12V5a2 2 0 014 0"/></svg>;
const ISqm  = <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1"/></svg>;
const ICar  = <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M5 17H3v-5l3-6h12l3 6v5h-2"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg>;
const IPin  = <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IChk  = <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>;

export default async function PropiedadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase.from("properties").select("*").eq("id", params.id).single();
  if (!p || !p.is_published) notFound();

  const { data: imgs } = await supabase
    .from("property_images").select("*").eq("property_id", params.id).order("position");
  const { data: agent } = p.agent_id
    ? await supabase.from("profiles").select("*").eq("id", p.agent_id).single()
    : { data: null };

  const property = p as Property;
  const images   = (imgs || []) as PropertyImage[];
  const currency = (property as any).currency || "MXN";
  const priceType= (property as any).price_type || "total";
  const lat      = (property as any).lat;
  const lng      = (property as any).lng;

  const baseUrl  = process.env.NEXT_PUBLIC_SITE_URL || "https://duclaud.mx";
  const propUrl  = `${baseUrl}/propiedad/${property.id}`;
  const wa       = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  const waMsg    = `Hola, me interesa esta propiedad:\n\n*${property.title}*\n${propUrl}\n\n¿Me pueden dar más información?`;

  const priceLabel = (() => {
    const base = fmt(property.price, currency);
    if (priceType === "m2") return `${base} / m²`;
    if (property.operation === "Renta") return `${base} / mes`;
    return base;
  })();

  return (
    <>
      <PublicHeader />
      <PropertyViewTracker propertyId={property.id} />

      {/* Hero navy con precio */}
      <div className="bg-navy pb-0">
        <div className="max-w-7xl mx-auto px-8 pt-10 pb-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-white/40 mb-6">
            <Link href="/" className="hover:text-gold transition-colors">Inicio</Link>
            <span>/</span>
            <Link href={property.operation === "Renta" ? "/rentar" : "/comprar"}
              className="hover:text-gold transition-colors capitalize">{property.operation}</Link>
            <span>/</span>
            <span className="text-white/60 truncate max-w-xs">{property.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-[10px] uppercase tracking-[0.1em] font-semibold px-3 py-1 rounded-full bg-gold/20 text-gold border border-gold/30">
                  {property.type}
                </span>
                <span className="text-[10px] uppercase tracking-[0.1em] font-medium px-3 py-1 rounded-full bg-white/10 text-white/70">
                  En {property.operation}
                </span>
                {(property as any).development && (
                  <span className="text-[10px] px-3 py-1 rounded-full bg-white/10 text-white/60">
                    {(property as any).development}
                  </span>
                )}
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-light text-white leading-tight">{property.title}</h1>
              {property.reference && (
                <p className="text-[10px] font-mono text-white/30 mt-2 tracking-widest">{property.reference}</p>
              )}
              <div className="flex items-center gap-2 text-white/50 mt-3 text-sm">
                <span className="text-gold">{IPin}</span>
                <span>{property.address || [property.zone, property.city, property.state].filter(Boolean).join(", ")}</span>
              </div>
            </div>

            <div className="lg:text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold/70 mb-2">
                {property.operation === "Renta" ? "Renta mensual" : "Precio de venta"}
              </p>
              <p className="text-4xl md:text-5xl font-bold text-white tracking-tight">{priceLabel}</p>
              {currency === "USD" && (
                <p className="text-[11px] text-white/40 mt-1 uppercase tracking-wider">Precio en dólares americanos</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Galería */}
      <div className="bg-navy pb-0">
        <PropertyGallery images={images} title={property.title} />
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-10">

            {/* Specs */}
            {(property.bedrooms > 0 || property.bathrooms > 0 || property.m2_construction || property.parking > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {property.bedrooms > 0  && <SpecBox icon={IBed}  label="Recámaras"        value={String(property.bedrooms)} />}
                {property.bathrooms > 0 && <SpecBox icon={IBath} label="Baños"            value={String(property.bathrooms)} />}
                {property.m2_construction && <SpecBox icon={ISqm} label="m² construcción" value={`${property.m2_construction}`} />}
                {property.parking > 0   && <SpecBox icon={ICar}  label="Estacionamientos" value={String(property.parking)} />}
              </div>
            )}

            {/* Descripción */}
            {property.description && (
              <div className="bg-white rounded-2xl border border-stone p-8">
                <p className="text-[10px] uppercase tracking-[0.18em] text-gold mb-5">Descripción</p>
                <p className="text-ink-muted text-sm leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>
            )}

            {/* Detalles técnicos */}
            {(property.m2_land || (property as any).floors || (property as any).year_built) && (
              <div className="bg-white rounded-2xl border border-stone p-8">
                <p className="text-[10px] uppercase tracking-[0.18em] text-gold mb-5">Detalles técnicos</p>
                <div className="grid grid-cols-2 gap-4">
                  {property.m2_land && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-ink-soft">Terreno</p>
                      <p className="text-sm font-semibold text-navy mt-1">{property.m2_land} m²</p>
                    </div>
                  )}
                  {(property as any).floors && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-ink-soft">Niveles</p>
                      <p className="text-sm font-semibold text-navy mt-1">{(property as any).floors}</p>
                    </div>
                  )}
                  {(property as any).year_built && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-ink-soft">Año de construcción</p>
                      <p className="text-sm font-semibold text-navy mt-1">{(property as any).year_built}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amenidades */}
            {property.amenities?.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone p-8">
                <p className="text-[10px] uppercase tracking-[0.18em] text-gold mb-5">Amenidades</p>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a: string) => (
                    <span key={a} className="flex items-center gap-2 text-xs text-navy border border-stone px-3 py-2 rounded-full bg-cream">
                      <span className="text-gold">{IChk}</span>{a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Mapa */}
            {lat && lng && (
              <div className="bg-white rounded-2xl border border-stone overflow-hidden">
                <div className="px-8 py-5 border-b border-stone">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Ubicación</p>
                  <p className="text-sm text-ink-muted mt-1">{[property.zone, property.city, property.state].filter(Boolean).join(", ")}</p>
                </div>
                <div className="h-72">
                  <PropertyMapEmbed lat={lat} lng={lng} title={property.title} />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Precio y contacto */}
            <div className="bg-white rounded-2xl border border-stone p-6 sticky top-24">
              <div className="pb-5 mb-5 border-b border-stone">
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-1">
                  {property.operation === "Renta" ? "Renta mensual" : "Precio"}
                </p>
                <p className="text-3xl font-bold text-navy">{priceLabel}</p>
              </div>

              <PropertyContactButtons
                propertyId={property.id}
                propertyTitle={property.title}
                propertyUrl={propUrl}
                propertyOperation={property.operation}
                waNumber={wa}
                waMsg={waMsg}
                agentId={p.agent_id || null}
              />

              {/* Asesor */}
              {agent && (
                <div className="mt-5 pt-5 border-t border-stone">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft mb-3">Consultor a cargo</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center shrink-0">
                      <span className="font-serif text-sm text-gold">
                        {(agent as Profile).initials || (agent as Profile).full_name?.split(" ").map((w: string) => w[0]).join("").slice(0,2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{(agent as Profile).full_name}</p>
                      <p className="text-[10px] text-ink-muted uppercase tracking-wider">Consultor Duclaud</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Credenciales */}
              <div className="mt-5 pt-5 border-t border-stone space-y-2">
                {["Socios AMPI Mérida", "Certificación ECO 110.02", "PROFECO 5589-2022", "Criterio legal y financiero"].map(c => (
                  <div key={c} className="flex items-center gap-2 text-[11px] text-ink-muted">
                    <span className="text-gold">{IChk}</span>{c}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
      <PublicChatbot />
    </>
  );
}
