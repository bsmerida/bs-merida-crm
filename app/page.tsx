import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertySearch } from "@/components/PropertySearch";

export default async function HomePage() {
  const supabase = createClient();
  const [{ data: properties }, { data: zonesData }] = await Promise.all([
    supabase.from("properties")
      .select("*, property_images(url, position, is_cover)")
      .eq("is_published", true).eq("status", "Disponible")
      .order("featured", { ascending: false }).limit(6),
    supabase.from("properties")
      .select("zone, city").eq("is_published", true).eq("status", "Disponible"),
  ]);

  const zones = [...new Set((zonesData || []).flatMap((p: any) => [p.zone, p.city].filter(Boolean)))].sort();

  return (
    <>
      <PublicHeader />

      {/* Hero */}
      <section className="bg-navy min-h-[92vh] flex items-end relative overflow-hidden">
        {/* Decoración */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] border border-gold/10 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] border border-gold/6 rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-8 pb-20 pt-32 w-full relative z-10">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold mb-8">
            Consultoría inmobiliaria · Mérida, Yucatán
          </p>
          <h1 className="font-serif text-5xl md:text-7xl font-light text-white leading-[1.03] tracking-tight max-w-3xl">
            Inversiones que
            <em className="italic text-gold">trascienden.</em>
          </h1>
          <p className="text-white/45 text-base md:text-lg leading-relaxed mt-8 max-w-lg">
            La firma inmobiliaria que integra estructura legal y financiera interna. En un sector dominado por la informalidad, somos la alternativa institucional.
          </p>

          {/* Buscador funcional */}
          <div className="mt-12">
            <PropertySearch zones={zones} />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-navy border-t border-white/10">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
            {[
              { n: "600+", l: "Propiedades gestionadas" },
              { n: "10",   l: "Años de experiencia" },
              { n: "3",    l: "Estados · Yuc, Q. Roo, N.L." },
              { n: "AMPI", l: "Certificación vigente" },
            ].map(s => (
              <div key={s.n} className="py-8 px-6">
                <p className="font-serif text-3xl font-light text-white">{s.n}</p>
                <p className="text-[11px] uppercase tracking-[0.1em] text-white/35 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Propiedades destacadas */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-3">Selección</p>
            <h2 className="font-serif text-4xl font-light text-navy">Propiedades disponibles</h2>
          </div>
          <Link href="/comprar" className="text-[11px] uppercase tracking-[0.08em] text-ink-muted hover:text-navy flex items-center gap-2 transition-colors">
            Ver inventario completo
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>

        {properties && properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-stone">
            {(properties as any[]).map(p => {
              const cover = p.property_images?.find((i: any) => i.is_cover)?.url
                || p.property_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url || null;
              return <div key={p.id} className="bg-cream"><PropertyCard p={p} coverUrl={cover} /></div>;
            })}
          </div>
        ) : (
          <div className="py-24 text-center text-sm text-ink-muted border border-stone">
            Cargando inventario...
          </div>
        )}
      </section>

      {/* Por qué Duclaud */}
      <section className="bg-navy py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-6">La diferencia Duclaud</p>
              <h2 className="font-serif text-4xl md:text-5xl font-light text-white leading-tight">
                La firma que protege
                <em className="italic text-gold">su patrimonio.</em>
              </h2>
              <p className="text-white/45 text-sm leading-relaxed mt-6 max-w-md">
                No somos intermediarios — somos la firma que tiene un abogado y un analista financiero en el mismo equipo que su asesor. En bienes raíces, eso cambia todo.
              </p>
              <Link href="/nosotros"
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-gold hover:text-gold-lt mt-8 transition-colors">
                Conocer la firma
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
            <div className="border-l border-white/10 pl-12 space-y-0">
              {[
                { t: "Asesores certificados AMPI", d: "Conocimiento profundo del marco legal y el mercado local." },
                { t: "Propiedades verificadas", d: "Cada inmueble revisado en sitio y validado jurídicamente antes de publicarse." },
                { t: "Criterio financiero integrado", d: "Analizamos la operación desde todos los ángulos para proteger su inversión." },
                { t: "Atención 24/7 con IA", d: "Sofía responde sus consultas en segundos. Asesores disponibles en horario hábil." },
              ].map((f, i) => (
                <div key={f.t} className={`py-7 ${i < 3 ? "border-b border-white/10" : ""}`}>
                  <div className="flex items-start gap-4">
                    <span className="w-px h-4 bg-gold mt-1.5 shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-white">{f.t}</h3>
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
        <div className="border border-stone bg-white px-10 py-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-3">Sin compromiso</p>
            <h2 className="font-serif text-3xl font-light text-navy">Hablemos directamente.</h2>
            <p className="text-ink-muted text-sm mt-2">Respondemos en menos de 30 minutos en horario hábil.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a href={`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272"}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[11px] uppercase tracking-[0.08em] font-medium text-white bg-navy hover:bg-navy-mid px-6 py-3 transition-colors">
              WhatsApp
            </a>
            <Link href="/contacto"
              className="text-[11px] uppercase tracking-[0.08em] text-navy border border-navy hover:bg-navy hover:text-white px-6 py-3 transition-colors">
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
