import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { PropertyContactButtons } from "@/components/PropertyContactButtons";
import { PropertyMapEmbed } from "@/components/PropertyMapEmbed";
import { PropertyViewTracker } from "@/components/PropertyViewTracker";
import { Icon } from "@/components/Icon";
import { fmtMXN } from "@/lib/utils";
import type { Property, PropertyImage, Profile } from "@/lib/supabase/types";

const PLACEHOLDER_EMOJI: Record<string, string> = {
  Casa: "🏡", Departamento: "🏢", Oficina: "🏢", Local: "🏬", Terreno: "🌳", Bodega: "🏭",
};

function formatPrice(price: number, priceType: string, operation: string) {
  const base = fmtMXN(price);
  if (priceType === "m2") return `${base} / m²`;
  if (priceType === "lineal") return `${base} / ml`;
  if (operation === "Renta") return `${base} / mes`;
  return base;
}

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
  const images = (imgs || []) as PropertyImage[];
  const cover = images.find(i => i.is_cover) || images[0];
  const priceType = (property as any).price_type || "total";
  const lat = (property as any).lat;
  const lng = (property as any).lng;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bsmerida.com";
  const propUrl = `${baseUrl}/propiedad/${property.id}`;
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  const waMsg = `Hola, me interesa esta propiedad:\n\n*${property.title}*\n${propUrl}\n\n¿Me pueden dar más información?`;

  return (
    <>
      <PublicHeader />
      {/* Registrar vista en el cliente (sin bloquear SSR) */}
      <PropertyViewTracker propertyId={property.id} />

      <div className="max-w-7xl mx-auto px-8 py-8">
        <Link href="/comprar" className="text-sm text-ink-muted hover:text-ink mb-6 inline-flex items-center gap-1">← Regresar</Link>

        {/* Hero */}
        <div className="aspect-[2.4/1] bg-gradient-to-br from-brand-50 to-brand-100 rounded-3xl flex items-center justify-center text-9xl relative overflow-hidden mt-4">
          {cover ? <img src={cover.url} alt={property.title} className="w-full h-full object-cover" />
            : <span>{PLACEHOLDER_EMOJI[property.type] || "🏠"}</span>}
        </div>

        {images.length > 1 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {images.slice(1, 5).map(img => (
              <div key={img.id} className="aspect-[4/3] rounded-xl bg-ink-ghost overflow-hidden">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-10">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-brand-600 font-semibold">
                {property.type} · {property.operation}
                {(property as any).development && <span className="ml-2 text-ink-muted normal-case">· {(property as any).development}</span>}
              </div>
              <h1 className="text-4xl font-semibold text-ink tracking-tight mt-2">{property.title}</h1>
              {property.reference && <div className="text-xs font-mono text-ink-soft mt-1">{property.reference}</div>}
              <div className="flex items-center gap-1.5 text-ink-muted mt-2">
                <Icon name="pin" className="w-4 h-4" />
                <span className="text-sm">{property.address || [property.zone, property.city, property.state].filter(Boolean).join(", ")}</span>
              </div>
            </div>

            {/* Características */}
            <div className="flex flex-wrap gap-6 text-sm text-ink py-6 border-y border-ink-line">
              {property.bedrooms > 0 && <div className="flex items-center gap-2"><Icon name="bed" className="w-5 h-5 text-ink-muted"/><span><span className="font-semibold">{property.bedrooms}</span> recámaras</span></div>}
              {property.bathrooms > 0 && <div className="flex items-center gap-2"><Icon name="bath" className="w-5 h-5 text-ink-muted"/><span><span className="font-semibold">{property.bathrooms}</span> baños</span></div>}
              {property.m2_construction && <div className="flex items-center gap-2"><Icon name="sqm" className="w-5 h-5 text-ink-muted"/><span><span className="font-semibold">{property.m2_construction}</span> m² const.</span></div>}
              {property.m2_land && <div className="flex items-center gap-2"><Icon name="sqm" className="w-5 h-5 text-ink-muted"/><span><span className="font-semibold">{property.m2_land}</span> m² terreno</span></div>}
              {property.parking > 0 && <div className="flex items-center gap-2"><Icon name="car" className="w-5 h-5 text-ink-muted"/><span><span className="font-semibold">{property.parking}</span> cajones</span></div>}
            </div>

            {/* Descripción */}
            {property.description && (
              <div>
                <h2 className="text-xl font-semibold text-ink mb-4">Descripción</h2>
                <p className="text-ink-muted leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>
            )}

            {/* Amenidades */}
            {property.amenities?.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-ink mb-4">Amenidades</h2>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a: string) => (
                    <span key={a} className="bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1.5 rounded-full text-sm">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Mapa de ubicación */}
            {lat && lng && (
              <div>
                <h2 className="text-xl font-semibold text-ink mb-4">Ubicación</h2>
                <PropertyMapEmbed lat={lat} lng={lng} title={property.title} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white rounded-3xl border border-ink-line shadow-card p-6 sticky top-24">
              <div className="text-3xl font-semibold text-ink tracking-tight">
                {formatPrice(property.price, priceType, property.operation)}
              </div>
              {priceType !== "total" && (
                <div className="text-xs text-ink-muted mt-1">precio {priceType === "m2" ? "por m²" : "por metro lineal"}</div>
              )}

              <PropertyContactButtons
                propertyId={property.id}
                propertyTitle={property.title}
                propertyUrl={propUrl}
                propertyOperation={property.operation}
                waNumber={wa}
                waMsg={waMsg}
              />

              {agent && (
                <div className="mt-6 pt-6 border-t border-ink-line">
                  <div className="text-xs text-ink-muted">Asesor a cargo</div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                      {(agent as Profile).initials || (agent as Profile).full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-ink">{(agent as Profile).full_name}</div>
                      <div className="text-xs text-ink-muted">Inmobiliaria BS Mérida</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
      <PublicChatbot />
    </>
  );
}
