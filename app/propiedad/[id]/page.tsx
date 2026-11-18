import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_PROPERTY_COLUMNS, PUBLIC_PROPERTY_DETAIL_COLUMNS, conPortada } from "@/lib/public-property";
import { PublicHeaderV3 } from "@/components/PublicHeaderV3";
import { PublicFooterV3 } from "@/components/PublicFooterV3";
import { PublicChatbot } from "@/components/PublicChatbot";
import { PropertyContactButtons } from "@/components/PropertyContactButtons";
import { MobileAgendarBar } from "@/components/MobileAgendarBar";
import { PropertyGallery } from "@/components/PropertyGallery";
import { PropertyMapEmbed } from "@/components/PropertyMapEmbed";
import { PropertyViewTracker } from "@/components/PropertyViewTracker";
import { PropertyCardV3 } from "@/components/PropertyCardV3";
import { FavoritoButton } from "@/components/FavoritoButton";
import type { Property, PropertyImage, Profile } from "@/lib/supabase/types";

const fmt = (n: number, cur = "MXN") =>
  new Intl.NumberFormat(cur === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(n);

// Estimación de referencia: 20% de enganche, tasa anual 10.5%, 20 años. No es una cotización real.
function mensualidadEstimada(price: number) {
  const prestamo = price * 0.8;
  const r = 0.105 / 12;
  const n = 20 * 12;
  const pago = (prestamo * r) / (1 - Math.pow(1 + r, -n));
  return Math.round(pago / 100) * 100;
}

export default async function PropiedadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: p }: { data: any } = await supabase.from("properties").select(PUBLIC_PROPERTY_DETAIL_COLUMNS).eq("id", params.id).single();
  if (!p || !p.is_published) notFound();

  const [{ data: imgs }, { data: agent }, { data: similaresRaw }] = await Promise.all([
    supabase.from("property_images").select("*").eq("property_id", params.id).order("position"),
    p.agent_id
      ? supabase.from("profiles").select("id, full_name, phone, email").eq("id", p.agent_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("properties").select(PUBLIC_PROPERTY_COLUMNS)
      .eq("is_published", true).eq("operation", p.operation).eq("type", p.type).neq("id", params.id)
      .order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(3),
  ]);

  const property = p as Property;
  const images   = (imgs || []) as PropertyImage[];
  const similares = (similaresRaw || []).map((sp: any) => conPortada(sp));
  const currency = (property as any).currency || "MXN";
  const priceType= (property as any).price_type || "total";
  const lat      = (property as any).lat;
  const lng      = (property as any).lng;

  const baseUrl  = process.env.NEXT_PUBLIC_SITE_URL || "https://duclaud.mx";
  const propUrl  = `${baseUrl}/propiedad/${property.id}`;
  const wa       = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  const waMsg    = `Hola, me interesa esta propiedad:\n\n*${property.title}*\n${propUrl}\n\n¿Me pueden dar más información?`;
  const listado  = property.operation === "Renta" ? "/rentar" : "/comprar";

  const priceLabel = (() => {
    const base = fmt(property.price, currency);
    if (priceType === "m2") return `${base} / m²`;
    if (property.operation === "Renta") return `${base} / mes`;
    return base;
  })();

  return (
    <div className="bg-cream p-4 font-dmsans break-words">
      <PublicHeaderV3 active={listado} />
      <PropertyViewTracker propertyId={property.id} />

      <div className="px-5 md:px-8 pt-6 pb-4">
        <Link href={listado} className="text-sm text-[#6b7385] hover:text-navy transition-colors">
          ← Volver a propiedades en {property.operation === "Renta" ? "renta" : "venta"}
        </Link>
      </div>

      {/* Galería */}
      <div className="px-5 md:px-8 relative">
        <div className="absolute top-8 left-8 md:left-11 z-10 flex gap-2">
          <span className="bg-white text-navy text-[13px] font-semibold px-4 py-2 rounded-full">{property.operation}</span>
          <span className="bg-white text-navy text-[13px] font-medium px-4 py-2 rounded-full flex items-center gap-1.5">
            <span className="w-[7px] h-[7px] rounded-full bg-emerald-500" />Verificada
          </span>
        </div>
        <div className="absolute top-8 right-8 md:right-11 z-10">
          <FavoritoButton id={property.id} />
        </div>
        <PropertyGallery images={images} title={property.title} />
      </div>

      {/* Cuerpo */}
      <div className="px-5 md:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Izquierda */}
          <div className="lg:col-span-2 flex flex-col gap-8 md:gap-10">
            <div className="flex flex-col gap-2.5">
              <p className="text-gold text-xs font-semibold tracking-[2.4px] uppercase">
                {[property.city, property.zone].filter(Boolean).join(", ").toUpperCase() || property.state?.toUpperCase()}
              </p>
              <h1 className="font-serif text-navy text-4xl md:text-[76px] md:leading-[76px] tracking-tight md:tracking-[-0.76px] min-w-0">
                {property.title}
              </h1>
            </div>

            {(property.bedrooms > 0 || property.bathrooms > 0 || property.m2_construction || property.parking > 0) && (
              <div className="flex flex-wrap">
                {[
                  property.bedrooms > 0 && { v: property.bedrooms, l: "recámaras" },
                  property.bathrooms > 0 && { v: property.bathrooms, l: "baños" },
                  property.m2_construction && { v: property.m2_construction, l: "m² construidos" },
                  property.parking > 0 && { v: property.parking, l: "cocheras" },
                ].filter(Boolean).map((d: any, i) => (
                  <div key={d.l} className={`flex-1 min-w-[45%] md:min-w-0 flex flex-col gap-1 py-2 ${i > 0 ? "md:border-l-2 md:border-stone md:pl-8" : ""}`}>
                    <p className="font-medium text-navy text-3xl md:text-[44px] tracking-tight md:tracking-[-0.44px]">{d.v}</p>
                    <p className="text-[#6b7385] text-[15px]">{d.l}</p>
                  </div>
                ))}
              </div>
            )}

            {property.description && (
              <div className="flex flex-col gap-3.5">
                <p className="font-serif text-navy text-2xl md:text-[36px]">Sobre la propiedad</p>
                <p className="text-[#6b7385] text-base md:text-[18px] md:leading-[29px] whitespace-pre-line">{property.description}</p>
              </div>
            )}

            {property.amenities?.length > 0 && (
              <div className="flex flex-col gap-4">
                <p className="font-serif text-navy text-2xl md:text-[36px]">Qué incluye</p>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a: string) => (
                    <span key={a} className="bg-stone text-navy text-[15px] font-medium px-5 py-[11px] rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-stone rounded-[32px] p-7 flex flex-col gap-4">
              <p className="font-serif text-navy text-2xl md:text-[30px]">Documentación verificada</p>
              {["Escrituras y libertad de gravamen", "Predial y servicios al corriente", "Uso de suelo y permisos"].map(item => (
                <div key={item} className="flex items-center justify-between gap-4">
                  <p className="text-navy text-[15px] md:text-[16px]">{item}</p>
                  <span className="bg-white text-navy text-[13px] font-medium px-4 py-2 rounded-full flex items-center gap-1.5 shrink-0">
                    <span className="w-[7px] h-[7px] rounded-full bg-emerald-500" />Revisado
                  </span>
                </div>
              ))}
            </div>

            {(property.m2_land || (property as any).floors || (property as any).year_built) && (
              <div className="bg-white rounded-[32px] shadow-float p-7">
                <p className="font-serif text-navy text-2xl md:text-[30px] mb-5">Detalles técnicos</p>
                <div className="grid grid-cols-2 gap-5">
                  {(property.m2_land ?? 0) > 0 && (
                    <div>
                      <p className="text-[#6b7385] text-[11px] uppercase tracking-[1.1px]">Terreno</p>
                      <p className="text-navy font-semibold mt-1">{property.m2_land} m²</p>
                    </div>
                  )}
                  {(property as any).floors > 0 && (
                    <div>
                      <p className="text-[#6b7385] text-[11px] uppercase tracking-[1.1px]">Niveles</p>
                      <p className="text-navy font-semibold mt-1">{(property as any).floors}</p>
                    </div>
                  )}
                  {(property as any).year_built > 0 && (
                    <div>
                      <p className="text-[#6b7385] text-[11px] uppercase tracking-[1.1px]">Año de construcción</p>
                      <p className="text-navy font-semibold mt-1">{(property as any).year_built}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {lat && lng && (
              <div className="bg-white rounded-[32px] shadow-float overflow-hidden">
                <div className="px-7 py-5 border-b border-stone">
                  <p className="font-serif text-navy text-2xl md:text-[30px]">Ubicación</p>
                  <p className="text-[#6b7385] text-sm mt-1">{[property.zone, property.city, property.state].filter(Boolean).join(", ")}</p>
                </div>
                <div className="h-72">
                  <PropertyMapEmbed lat={lat} lng={lng} title={property.title} />
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta precio */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[40px] p-7 md:p-8 flex flex-col gap-5 sticky top-6">
              <p className="text-[#6b7385] text-xs font-semibold tracking-[2.16px] uppercase">
                {property.operation === "Renta" ? "Renta mensual" : "Precio"}
              </p>
              <p className="font-semibold text-navy text-4xl md:text-[49px] tracking-tight md:tracking-[-1.47px] -mt-3">{priceLabel}</p>
              <p className="text-[#6b7385] text-sm -mt-3">{currency} · Precio de lista</p>

              {property.operation === "Venta" && priceType === "total" && currency === "MXN" && (
                <div className="bg-stone rounded-[24px] px-[22px] py-5 flex flex-col gap-1.5">
                  <p className="text-[#6b7385] text-[11px] font-semibold tracking-[1.98px]">DESDE</p>
                  <div className="flex gap-2 items-end">
                    <p className="font-semibold text-navy text-[31px] tracking-[-0.31px]">{fmt(mensualidadEstimada(property.price), currency)}</p>
                    <p className="text-[#6b7385] text-[15px]">/ mes*</p>
                  </div>
                  <p className="text-[#6b7385] text-xs leading-[17px]">*Estimado con 20% de enganche, tasa de referencia a 20 años. Sujeto a aprobación bancaria.</p>
                </div>
              )}

              <PropertyContactButtons
                propertyId={property.id}
                propertyTitle={property.title}
                propertyUrl={propUrl}
                propertyOperation={property.operation}
                waNumber={wa}
                waMsg={waMsg}
                agentId={p.agent_id || null}
                propertyCover={images[0]?.url || null}
                propertyPriceLabel={priceLabel}
              />

              <div className="flex items-center gap-3.5 pt-2">
                <div className="bg-navy w-[52px] h-[52px] rounded-full flex items-center justify-center shrink-0">
                  <span className="font-serif text-2xl text-white">
                    {agent ? ((agent as Profile).initials || (agent as Profile).full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2)) : "D."}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-navy text-[16px]">{agent ? (agent as Profile).full_name : "Equipo Duclaud"}</p>
                  <p className="text-[#6b7385] text-[13px]">Respuesta en horas hábiles</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similares */}
      {similares.length > 0 && (
        <section className="px-5 md:px-8 py-10 md:py-16">
          <h2 className="font-serif text-navy text-3xl md:text-6xl mb-8 md:mb-12">Quizá también te guste.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {similares.map((sp: any) => <PropertyCardV3 key={sp.id} p={sp} coverUrl={sp.cover} />)}
          </div>
        </section>
      )}

      {/* Leyenda legal NOM-247-SE-2021 */}
      <section className="px-5 md:px-8 pb-8">
        <p className="text-[11px] text-[#6b7385] leading-relaxed max-w-5xl mx-auto">
          ** Los precios NO Incluyen gastos Notariales, impuestos, derechos, NI costos de contratos de servicios.
          La responsabilidad y cumplimiento de garantía es a cargo de los propietarios y/o Constructoras.
          El precio total se determinará en función de los montos variables de conceptos de crédito y notariales
          que deben ser consultados con los promotores de conformidad con lo establecido en la NOM-247-SE-2021.
          Las imágenes presentadas en brochure o anuncio son meramente ilustrativas y pueden cambiar sin previo
          aviso Todas las propiedades están sujetas a cambio de precio y disponibilidad sin previo aviso.
          El costo del avalúo es responsabilidad de la parte compradora. Los impuestos se pagarán según
          corresponda a cada una de las partes. Los gastos administrativos corren por parte de la compradora.
          Consulte términos, condiciones y el aviso de privacidad en nuestra página web. www.inmobiliariabs.net
          Comentarios y/o sugerencias comuníquese al número celular 9999496562 vía mensaje de WhatsApp ó a
          nuestra dirección de correo electrónica.- contacto@duclaud.com.mx
        </p>
      </section>

      <MobileAgendarBar
        propertyId={property.id}
        propertyTitle={property.title}
        agentId={p.agent_id || null}
        propertyCover={images[0]?.url || null}
        priceLabel={priceLabel}
      />

      <PublicFooterV3 />
      <PublicChatbot liftedOnMobile />
    </div>
  );
}
