import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "La Firma — Duclaud" };

const VALORES = [
  {
    n: "01", t: "Estructura",
    d: "Operamos con rigor legal y financiero. Cada transacción está respaldada por expertise real — no por improvisación. En un sector informal, somos la excepción que protege al cliente.",
  },
  {
    n: "02", t: "Integridad",
    d: "Decimos lo que es, aunque no sea lo que el cliente quiere escuchar. La confianza se gana con verdad, no con promesas vacías. Nuestra reputación se construye operación por operación.",
  },
  {
    n: "03", t: "Transformación",
    d: "Sabemos lo que significa que un patrimonio cambie una vida. No vendemos propiedades — construimos el futuro económico de las familias que confían en nosotros.",
  },
  {
    n: "04", t: "Excelencia",
    d: "El estándar que nos exigimos es el más alto disponible. No comparamos con la media del sector — comparamos con lo que debería ser. Cada detalle de la operación refleja ese compromiso.",
  },
];

const DIFERENCIADORES = [
  {
    t: "Equipo Legal Interno",
    d: "Las transacciones inmobiliarias tienen implicaciones legales serias. Duclaud las maneja desde adentro, no desde afuera.",
    icon: <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />,
  },
  {
    t: "Análisis Financiero Real",
    d: "No estimaciones genéricas — análisis de rendimiento, riesgo y retorno con formación de finanzas.",
    icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  },
  {
    t: "Portafolio de Escala",
    d: "600+ propiedades gestionadas. La experiencia no es teórica — es operacional, acumulada y probada.",
    icon: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  },
  {
    t: "Firma Familiar, Compromiso Real",
    d: "No es una franquicia ni una corporación anónima. Hay nombres y apellidos detrás. Eso crea responsabilidad real.",
    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx={9} cy={7} r={4} /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>,
  },
];

export default async function NosotrosPage() {
  const supabase = createClient();
  const { data: profiles } = await supabase
    .from("profiles").select("id, full_name, role, initials, phone, email")
    .eq("active", true).neq("role", "admin").order("full_name");

  return (
    <>
      <PublicHeader />

      {/* Hero */}
      <div className="bg-navy py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 border border-gold/8 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-6">La firma</p>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-white leading-[1.05]">
            Una firma diferente,<br />
            <em className="italic text-gold">nacida de la adversidad.</em>
          </h1>
          <p className="text-white/40 text-base mt-6 max-w-xl leading-relaxed">
            Duclaud nació de la convicción de que el mercado inmobiliario merecía algo distinto: la seriedad, la estructura y la ética que el sector rara vez tiene — no como discurso, sino como práctica diaria.
          </p>
        </div>
      </div>

      {/* Propósito / Misión / Visión */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-stone">
          <div className="bg-navy p-12">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-5">Propósito</p>
            <p className="font-serif text-lg font-light text-white/80 leading-relaxed">
              Transformar la vida de las personas a través del patrimonio inmobiliario — con determinación, rigor y la estructura que cada operación merece.
            </p>
          </div>
          <div className="bg-white p-12">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-5">Misión</p>
            <p className="font-serif text-lg font-light text-navy leading-relaxed">
              Brindar servicios inmobiliarios con la seriedad, estructura legal y rigor financiero que el sector informal no puede ofrecer — en cada mercado donde operamos.
            </p>
          </div>
          <div className="bg-cream p-12 border border-stone">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-5">Visión</p>
            <p className="font-serif text-lg font-light text-navy leading-relaxed">
              Ser la firma inmobiliaria de referencia en México: reconocida por su integridad, su sofisticación y la protección real a sus clientes.
            </p>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="bg-navy py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-14">Lo que nos define</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10">
            {VALORES.map(v => (
              <div key={v.n} className="bg-navy p-10 hover:bg-navy-mid transition-colors">
                <p className="font-serif text-5xl font-light text-white/10 mb-5">{v.n}</p>
                <h3 className="font-serif text-2xl font-light text-white mb-3">{v.t}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciadores */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-12">Por qué Duclaud</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-stone">
          {DIFERENCIADORES.map(d => (
            <div key={d.t} className="bg-white p-10 flex gap-6 items-start">
              <div className="w-10 h-10 bg-navy flex items-center justify-center shrink-0">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="#C4956A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {d.icon}
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-navy tracking-wide">{d.t}</h3>
                <p className="text-sm text-ink-muted mt-2 leading-relaxed">{d.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Equipo */}
      {profiles && profiles.length > 0 && (
        <section className="bg-cream border-t border-stone py-20">
          <div className="max-w-7xl mx-auto px-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-12">El equipo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-stone">
              {profiles.map((p: any) => (
                <div key={p.id} className="bg-white p-8 hover:bg-cream transition-colors">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-navy flex items-center justify-center shrink-0">
                      <span className="font-serif text-sm font-light text-gold tracking-wider">
                        {(p.initials || p.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "D").toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy">{p.full_name}</p>
                      <p className="text-[10px] uppercase tracking-[0.1em] text-gold mt-0.5">
                        {p.role === "asesor" ? "Consultor Duclaud" : p.role}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2.5 pt-5 border-t border-stone">
                    {p.phone && (
                      <a href={`https://wa.me/${p.phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-ink-muted hover:text-gold transition-colors">
                        <span className="w-px h-3 bg-gold/50 shrink-0" />{p.phone}
                      </a>
                    )}
                    {p.email && (
                      <a href={`mailto:${p.email}`}
                        className="flex items-center gap-2 text-xs text-ink-muted hover:text-gold transition-colors">
                        <span className="w-px h-3 bg-gold/50 shrink-0" />{p.email}
                      </a>
                    )}
                  </div>
                  <div className="mt-5">
                    <span className="text-[9px] uppercase tracking-[0.14em] text-gold border border-gold/25 px-2.5 py-1">
                      AMPI Certificado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Credenciales */}
      <section className="bg-navy py-16">
        <div className="max-w-7xl mx-auto px-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-10">Credenciales</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10">
            {[
              { t: "AMPI Mérida",  d: "Asociación Mexicana de Profesionales Inmobiliarios", s: "Socio activo" },
              { t: "ECO 110.02",   d: "Certificación nacional de competencias profesionales", s: "Folio D-0036107323" },
              { t: "PROFECO",      d: "Contrato de adhesión registrado", s: "Registro 5589-2022" },
            ].map(c => (
              <div key={c.t} className="bg-navy-mid p-8">
                <p className="text-[9px] uppercase tracking-[0.16em] text-gold/60 mb-2">{c.s}</p>
                <p className="font-serif text-xl font-light text-white">{c.t}</p>
                <p className="text-xs text-white/35 mt-1">{c.d}</p>
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
