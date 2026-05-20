import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { PropertyCard } from "@/components/PropertyCard";
import { SearchBox } from "@/components/SearchBox";

export default async function HomePage() {
  const supabase = createClient();
  const [{ data: properties }, { data: zonesData }] = await Promise.all([
    supabase.from("properties").select("*, property_images(url, position, is_cover)")
      .eq("is_published", true).eq("status", "Disponible")
      .order("featured", { ascending: false }).limit(6),
    supabase.from("properties").select("zone, city")
      .eq("is_published", true).eq("status", "Disponible"),
  ]);
  const zones = [...new Set((zonesData || []).flatMap((p: any) => [p.zone, p.city].filter(Boolean)))].sort() as string[];

  return (
    <>
      <PublicHeader />

      {/* Hero */}
      <section className="bg-navy min-h-[92vh] flex items-end relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] border border-gold/10 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[200px] h-[200px] border border-gold/6 rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-8 pb-20 pt-32 w-full relative z-10">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold mb-8">
            Consultoría Inmobiliaria · Mérida, Yucatán
          </p>
          <h1 className="font-serif text-5xl md:text-7xl font-light text-white leading-[1.03] tracking-tight max-w-3xl">
            Inversiones que<br />
            <em className="italic text-gold">trascienden.</em>
          </h1>
          <p className="text-white/45 text-base md:text-lg leading-relaxed mt-8 max-w-lg">
            La firma inmobiliaria que integra estructura legal y financiera interna. En un sector dominado por la informalidad, somos la alternativa institucional.
          </p>
          <div className="mt-12">
            <SearchBox zones={zones} />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-navy/95 border-t border-white/8">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/8">
            {[
              { n: "600+", l: "Propiedades gestionadas" },
              { n: "10",   l: "Años de trayectoria" },
              { n: "3",    l: "Estados · Yuc, Q.Roo, N.L." },
              { n: "AMPI", l: "Certificación vigente" },
            ].map(s => (
              <div key={s.n} className="py-8 px-6 first:pl-0">
                <p className="font-serif text-3xl font-bold text-white">{s.n}</p>
                <p className="text-[11px] uppercase tracking-[0.08em] text-white/35 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Propiedades */}
      <section className="max-w-7xl mx-auto px-8 py-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-3">Selección</p>
            <h2 className="font-serif text-4xl font-light text-navy">Propiedades disponibles</h2>
          </div>
          <Link href="/comprar" className="text-[11px] uppercase tracking-[0.08em] text-ink-muted hover:text-navy flex items-center gap-2 transition-colors">
            Ver inventario completo →
          </Link>
        </div>
        {properties && properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(properties as any[]).map(p => {
              const cover = p.property_images?.find((i: any) => i.is_cover)?.url
                || p.property_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url || null;
              return <PropertyCard key={p.id} p={p} coverUrl={cover} />;
            })}
          </div>
        ) : (
          <div className="py-24 text-center bg-white rounded-2xl border border-stone text-sm text-ink-muted">
            Cargando inventario...
          </div>
        )}
      </section>

      {/* Por qué Duclaud */}
      <section className="bg-navy py-24 rounded-none">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-6">La diferencia Duclaud</p>
              <h2 className="font-serif text-4xl md:text-5xl font-light text-white leading-tight">
                La firma que protege<br />
                <em className="italic text-gold">su patrimonio.</em>
              </h2>
              <p className="text-white/45 text-sm leading-relaxed mt-6 max-w-md">
                No somos intermediarios — somos la firma que tiene un abogado y un analista financiero en el mismo equipo que su consultor. En bienes raíces, eso cambia todo.
              </p>
              <Link href="/nosotros"
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-gold hover:text-gold-lt mt-8 transition-colors">
                Conocer la firma →
              </Link>
            </div>
            <div className="space-y-0 border-l border-white/10 pl-12">
              {[
                { t: "Equipo Legal Interno", d: "Las transacciones inmobiliarias tienen implicaciones serias. Las manejamos desde adentro." },
                { t: "Análisis Financiero Real", d: "No estimaciones genéricas — análisis de rendimiento, riesgo y retorno con formación real." },
                { t: "600+ Propiedades", d: "La experiencia no es teórica — es operacional, acumulada y probada operación por operación." },
                { t: "Firma con Nombre y Apellido", d: "No es una franquicia anónima. Hay personas reales detrás, con responsabilidad real." },
              ].map((f, i) => (
                <div key={f.t} className={`py-6 ${i < 3 ? "border-b border-white/10" : ""}`}>
                  <div className="flex items-start gap-4">
                    <span className="w-1.5 h-1.5 bg-gold rounded-full mt-2 shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">{f.t}</h3>
                      <p className="text-xs text-white/40 mt-1.5 leading-relaxed">{f.d}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-8 py-24">
        <div className="bg-cream border border-stone rounded-3xl px-10 py-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-3">Sin compromiso</p>
            <h2 className="font-serif text-3xl font-light text-navy">Hablemos directamente.</h2>
            <p className="text-ink-muted text-sm mt-2">Respondemos en menos de 30 minutos en horario hábil.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a href={`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272"}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[11px] uppercase tracking-[0.08em] font-semibold text-white bg-navy hover:bg-navy-mid px-6 py-3 rounded-full transition-colors">
              WhatsApp
            </a>
            <Link href="/contacto"
              className="text-[11px] uppercase tracking-[0.08em] text-navy border-2 border-navy hover:bg-navy hover:text-white px-6 py-3 rounded-full transition-colors">
              Formulario
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
      <PublicChatbot />
    </>
  );
}
