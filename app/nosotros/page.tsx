import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "La Firma — Duclaud" };

export default async function NosotrosPage() {
  const supabase = createClient();
  const { data: profiles } = await supabase
    .from("profiles").select("id, full_name, role, initials, phone, email")
    .eq("active", true).neq("role", "admin").order("full_name");

  return (
    <>
      <PublicHeader />

      {/* Hero */}
      <div className="bg-navy py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 border border-gold/8 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-6">La firma</p>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-white leading-tight">
            Asesores inmobiliarios,<br />
            <em className="italic text-gold">no simples intermediarios.</em>
          </h1>
          <p className="text-white/40 text-base mt-6 max-w-lg leading-relaxed">
            Duclaud es una consultoría inmobiliaria con criterio legal y financiero integrado. Acompañamos cada operación como si fuera nuestra.
          </p>
        </div>
      </div>

      {/* Misión / Visión */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-stone">
          <div className="bg-cream p-12">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-6">Misión</p>
            <p className="font-serif text-xl font-light text-navy leading-relaxed italic">
              "Brindar asesoría inmobiliaria de alta calidad basada en confianza, profesionalismo y ética, maximizando el valor patrimonial de cada cliente."
            </p>
          </div>
          <div className="bg-white p-12">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-6">Visión</p>
            <p className="font-serif text-xl font-light text-navy leading-relaxed italic">
              "Convertirnos en el referente de consultoría inmobiliaria en Yucatán, transformando transacciones en procesos transparentes y memorables."
            </p>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="bg-navy py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-12">Valores fundamentales</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10">
            {[
              { n: "01", t: "Integridad", d: "Honestidad y transparencia en cada operación, construyendo relaciones basadas en la confianza." },
              { n: "02", t: "Profesionalismo", d: "Asesoría certificada AMPI con enfoque multidisciplinario y resultados de largo plazo." },
              { n: "03", t: "Orientación al cliente", d: "Soluciones personalizadas que protegen y maximizan el valor patrimonial de cada cliente." },
            ].map(v => (
              <div key={v.n} className="bg-navy p-10">
                <p className="font-serif text-5xl font-light text-white/15 mb-6">{v.n}</p>
                <h3 className="font-serif text-xl font-light text-white mb-3">{v.t}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipo */}
      {profiles && profiles.length > 0 && (
        <section className="max-w-7xl mx-auto px-8 py-20">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-12">Nuestro equipo</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-stone">
            {profiles.map((p: any) => (
              <div key={p.id} className="bg-cream p-8 hover:bg-white transition-colors">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-navy flex items-center justify-center shrink-0">
                    <span className="font-serif text-sm font-light text-gold tracking-wider">
                      {(p.initials || p.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "D").toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">{p.full_name}</p>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-ink-muted mt-0.5">
                      {p.role === "asesor" ? "Asesor Duclaud" : p.role}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 pt-5 border-t border-stone">
                  {p.phone && (
                    <a href={`https://wa.me/${p.phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-ink-muted hover:text-gold transition-colors">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.05 10.5 19.79 19.79 0 01-.02 1.84 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.28-1.28a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                      {p.phone}
                    </a>
                  )}
                  {p.email && (
                    <a href={`mailto:${p.email}`}
                      className="flex items-center gap-2 text-xs text-ink-muted hover:text-gold transition-colors">
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      {p.email}
                    </a>
                  )}
                </div>
                <div className="mt-4">
                  <span className="text-[10px] uppercase tracking-[0.1em] text-gold border border-gold/30 px-2 py-0.5">
                    AMPI Certificado
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Credenciales */}
      <section className="bg-stone py-16">
        <div className="max-w-7xl mx-auto px-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-10">Credenciales</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-stone-dk">
            {[
              { t: "AMPI Mérida", d: "Asociación Mexicana de Profesionales Inmobiliarios", sub: "Socio activo" },
              { t: "ECO 110.02",  d: "Certificación nacional de competencias profesionales", sub: "Folio D-0036107323" },
              { t: "PROFECO",     d: "Contrato de adhesión registrado", sub: "Registro 5589-2022" },
            ].map(c => (
              <div key={c.t} className="bg-white p-8">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gold mb-2">{c.sub}</p>
                <p className="font-serif text-xl font-light text-navy">{c.t}</p>
                <p className="text-xs text-ink-muted mt-1">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
      <PublicChatbot />
    </>
  );
}
