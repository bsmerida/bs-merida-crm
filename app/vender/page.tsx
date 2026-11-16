import { PublicHeaderV3 } from "@/components/PublicHeaderV3";
import { PublicFooterV3 } from "@/components/PublicFooterV3";
import { PublicChatbot } from "@/components/PublicChatbot";
import { ValuacionForm } from "@/components/ValuacionForm";

export const metadata = { title: "Vender con Duclaud" };

const PASOS = [
  { n: "01", t: "Valuación",      d: "Analizamos zona, comparables y estado real de la propiedad." },
  { n: "02", t: "Documentación",  d: "Revisamos escrituras, gravámenes y permisos antes de publicar." },
  { n: "03", t: "Difusión",       d: "Publicamos en nuestro sitio y en los principales portales." },
  { n: "04", t: "Cierre",         d: "Acompañamiento legal y financiero hasta la firma." },
];

export default function VenderPage() {
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";

  return (
    <div className="bg-cream p-4 font-dmsans break-words">
      <PublicHeaderV3 active="/vender" />

      {/* Título */}
      <section className="pt-10 md:pt-[88px] pb-8 md:pb-14 px-5 md:px-16 flex flex-col items-center text-center gap-4 md:gap-6">
        <p className="text-gold text-[13px] font-semibold tracking-[3.12px]">VENDER CON DUCLAUD</p>
        <h1 className="font-serif font-medium text-navy text-4xl md:text-[128px] tracking-tight md:tracking-[-2.56px] leading-[1.08] md:leading-[120px] min-w-0">
          Vende con <em className="italic not-italic font-serif text-gold">estructura</em>.
        </h1>
        <p className="text-[#6b7385] text-base md:text-[22px] md:leading-[32px] max-w-[720px] min-w-0">
          Valuación real, documentación en orden y difusión en los mejores portales. Sin sorpresas al cierre.
        </p>
      </section>

      {/* Valuación */}
      <section className="px-5 md:px-8 pb-14 md:pb-24 flex justify-center">
        <ValuacionForm />
      </section>

      {/* Proceso */}
      <section className="px-5 md:px-12 pb-14 md:pb-24 flex flex-col items-center gap-10 md:gap-14">
        <h2 className="font-serif text-navy text-3xl md:text-[80px] md:leading-[80px] text-center min-w-0">Así <em className="italic not-italic font-serif">trabajamos.</em></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
          {PASOS.map(p => (
            <div key={p.n} className="bg-stone rounded-[28px] md:rounded-[36px] px-6 md:px-7 pt-7 md:pt-8 pb-8 md:pb-9 flex flex-col gap-3 min-w-0">
              <p className="text-gold font-medium text-3xl md:text-[30px] tracking-tight md:tracking-[-0.3px]">{p.n}</p>
              <p className="font-serif text-navy text-[28px] md:text-[38px] md:leading-[38px] min-w-0">{p.t}</p>
              <p className="text-[#6b7385] text-[15px] md:text-[16px] leading-relaxed md:leading-[24px]">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contacto */}
      <section className="rounded-[32px] md:rounded-[48px] bg-navy px-6 md:px-16 py-14 md:py-[120px] flex flex-col items-center gap-4 md:gap-5 text-center">
        <p className="font-serif text-white text-3xl md:text-[80px] md:leading-[80px] min-w-0">¿Prefieres <em className="italic not-italic font-serif">platicarlo?</em></p>
        <p className="text-white/75 text-base md:text-[20px] min-w-0">Un asesor te llama el mismo día.</p>
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
          className="bg-white text-navy font-semibold px-8 md:px-[34px] py-[18px] rounded-full hover:bg-stone transition-colors mt-2">
          Escribir por WhatsApp
        </a>
      </section>

      <PublicFooterV3 />
      <PublicChatbot />
    </div>
  );
}
