import { createClient } from "@/lib/supabase/server";
import { PublicHeaderV3 } from "@/components/PublicHeaderV3";
import { PublicFooterV3 } from "@/components/PublicFooterV3";
import { PublicChatbot } from "@/components/PublicChatbot";

export const metadata = { title: "Acerca de nosotros — Duclaud" };

const PILARES = [
  { n: "01", t: "Claridad",    d: "Costos, plazos y riesgos sobre la mesa desde la primera conversación." },
  { n: "02", t: "Rigor",       d: "Documentación revisada por nuestro equipo legal antes de publicar." },
  { n: "03", t: "Largo plazo", d: "Pensamos en el patrimonio de tu familia, no en la comisión de hoy." },
];

const REGISTROS = [
  { t: "Licencia inmobiliaria tipo A", d: "Bertha Duclaud · persona física",         n: "No. de licencia: por asignar", estado: "Vigente",    color: "bg-emerald-500" },
  { t: "Licencia inmobiliaria tipo B", d: "Duclaud Bienes Raíces · persona moral",   n: "No. de licencia: por asignar", estado: "En trámite", color: "bg-gold" },
  { t: "Contrato de adhesión",         d: "Registrado ante PROFECO",                  n: "No. 5589-2022",                estado: "Registrado", color: "bg-emerald-500" },
  { t: "Certificación AMPI",           d: "Asociación Mexicana de Profesionales Inmobiliarios", n: "No. de socio: por asignar", estado: "Socia", color: "bg-emerald-500" },
];

export default async function NosotrosPage() {
  const supabase = createClient();
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  const { data: profiles } = await supabase
    .from("profiles").select("id, full_name, role, initials, phone, email")
    .eq("active", true).neq("role", "admin").order("full_name");

  return (
    <div className="bg-cream p-4 font-dmsans break-words">
      <PublicHeaderV3 active="/nosotros" />

      {/* Título */}
      <section className="pt-10 md:pt-24 pb-8 md:pb-20 px-5 md:px-16 flex flex-col items-center text-center gap-5 md:gap-7">
        <p className="text-gold text-[13px] font-semibold tracking-[3.12px]">ACERCA DE NOSOTROS</p>
        <h1 className="font-serif text-navy text-4xl md:text-[120px] md:leading-[112px] tracking-tight md:tracking-[-2.4px] max-w-[800px] min-w-0">
          Respaldo legal. <em className="italic font-serif text-gold">Visión financiera.</em>
        </h1>
        <p className="text-[#6b7385] text-base md:text-[22px] md:leading-[32px] max-w-[760px] min-w-0">
          Somos una firma inmobiliaria boutique. Cada operación pasa por un equipo legal y un análisis financiero antes de que tomes la decisión.
        </p>
      </section>

      {/* Foto equipo */}
      <section className="px-5 md:px-8 pb-10 md:pb-16">
        <div className="rounded-[32px] md:rounded-[48px] h-[220px] md:h-[400px] flex items-center justify-center"
          style={{ backgroundImage: "linear-gradient(135deg, #2B3F68 0%, #1C2B4B 71%)" }}>
          <p className="text-white/55 text-[13px] tracking-[1.04px] uppercase">Foto del equipo Duclaud</p>
        </div>
      </section>

      {/* Pilares */}
      <section className="px-5 md:px-12 py-10 md:py-[120px] flex flex-col items-center gap-10 md:gap-16">
        <h2 className="font-serif text-navy text-4xl md:text-[80px] md:leading-[80px] text-center min-w-0">
          Tres cosas que <em className="italic font-serif">no negociamos.</em>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {PILARES.map(p => (
            <div key={p.n} className="bg-stone rounded-[32px] md:rounded-[40px] px-7 md:px-9 py-8 md:py-10 flex flex-col gap-3.5">
              <p className="text-gold font-medium text-2xl md:text-[31px] md:tracking-[-0.31px]">{p.n}</p>
              <p className="font-serif text-navy text-3xl md:text-[52px] md:leading-[52px]">{p.t}</p>
              <p className="text-[#6b7385] text-base md:text-[17px] md:leading-[26px]">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bertha */}
      <section className="px-5 md:px-8 pt-6 md:pt-10 pb-10 md:pb-[120px] flex flex-col md:flex-row gap-8 md:gap-[72px] items-center">
        <div className="w-full md:w-[560px] h-[280px] md:h-[640px] rounded-[32px] md:rounded-[48px] shrink-0 flex items-center justify-center"
          style={{ backgroundImage: "linear-gradient(131deg, #2B3F68 0%, #1C2B4B 71%)" }}>
          <p className="text-white/55 text-[13px] tracking-[1.04px] uppercase">Foto de Bertha Duclaud</p>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-5 md:gap-6">
          <p className="text-gold text-xs font-semibold tracking-[2.64px]">FUNDADORA</p>
          <h2 className="font-serif text-navy text-3xl md:text-[64px] md:leading-[66px] min-w-0">
            Cada inversión es la decisión de <em className="italic font-serif">una familia.</em>
          </h2>
          <p className="text-[#6b7385] text-base md:text-[18px] md:leading-[28px] min-w-0">
            Bertha Duclaud lidera Duclaud Bienes Raíces desde Mérida. Socia AMPI.
          </p>
          <div className="flex flex-wrap gap-2">
            {["AMPI", "PROFECO 5589-2022", "+10 años"].map(c => (
              <span key={c} className="bg-stone text-navy text-sm font-medium px-[18px] py-2.5 rounded-full flex items-center gap-1.5">
                <span className="w-[7px] h-[7px] rounded-full bg-emerald-500" />{c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* El equipo */}
      {profiles && profiles.length > 0 && (
        <section className="px-5 md:px-8 pb-10 md:pb-16">
          <h2 className="font-serif text-navy text-3xl md:text-5xl mb-8 md:mb-10 text-center">El equipo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((p: any) => (
              <div key={p.id} className="bg-white rounded-[28px] shadow-float p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-navy rounded-full flex items-center justify-center shrink-0">
                    <span className="font-serif text-gold text-sm">
                      {(p.initials || p.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "D").toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-navy text-[15px]">{p.full_name}</p>
                    <p className="text-gold text-xs uppercase tracking-wide mt-0.5">{p.role === "asesor" ? "Consultor Duclaud" : p.role}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 pt-3 border-t border-stone text-sm text-[#6b7385]">
                  {p.phone && <a href={`https://wa.me/${p.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">{p.phone}</a>}
                  {p.email && <a href={`mailto:${p.email}`} className="hover:text-gold transition-colors">{p.email}</a>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Licencias y registros */}
      <section className="px-5 md:px-12 py-10 md:py-16 flex flex-col gap-5 md:gap-6">
        <p className="text-gold text-xs font-semibold tracking-[1.92px] uppercase">Licencias y registros</p>
        <h2 className="font-serif text-navy text-3xl md:text-[84px] md:leading-[84px] tracking-tight md:tracking-[-1.68px] min-w-0">
          Operamos con <em className="italic font-serif text-gold">licencia.</em>
        </h2>
        <p className="text-[#6b7385] text-base md:text-[20px] md:leading-[30px] max-w-[900px] min-w-0">
          Contamos con licencia inmobiliaria tipo A, a nombre de Bertha Duclaud. La licencia tipo B, de la persona moral, está en trámite. Cada contrato, certificación y licencia tiene su número de registro o identificación.
        </p>
        <div className="bg-stone rounded-[28px] md:rounded-[40px] px-5 md:px-7 py-1 md:py-3">
          {REGISTROS.map((r, i) => (
            <div key={r.t} className={`flex flex-col md:flex-row md:items-center gap-2 md:gap-5 py-5 ${i > 0 ? "border-t border-navy/10" : ""}`}>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <p className="font-semibold text-navy text-lg md:text-[22px]">{r.t}</p>
                <p className="text-[#6b7385] text-sm md:text-[15px]">{r.d}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-navy text-sm md:text-[15px] font-medium whitespace-nowrap">{r.n}</p>
                <span className="bg-white text-navy text-xs font-medium px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shrink-0">
                  <span className={`w-[6px] h-[6px] rounded-full ${r.color}`} />{r.estado}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[#6b7385] text-xs">Los números de licencia se muestran tal como los emiten las autoridades y las asociaciones.</p>
      </section>

      {/* Contacto */}
      <section className="rounded-[32px] md:rounded-[48px] bg-navy px-6 md:px-16 py-16 md:py-[130px] mt-4 flex flex-col items-center gap-5 md:gap-6">
        <p className="font-serif italic text-white text-5xl md:text-[136px] md:leading-[132px] tracking-tight md:tracking-[-2.72px] min-w-0">Hablemos.</p>
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
          className="bg-white text-navy font-semibold px-8 py-[18px] rounded-full hover:bg-stone transition-colors mt-2">
          Escribir por WhatsApp
        </a>
      </section>

      <PublicFooterV3 />
      <PublicChatbot />
    </div>
  );
}
