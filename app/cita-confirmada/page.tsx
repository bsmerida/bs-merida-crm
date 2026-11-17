// app/cita-confirmada/page.tsx
import Link from "next/link";
import { PublicHeaderV3 } from "@/components/PublicHeaderV3";
import { PublicFooterV3 } from "@/components/PublicFooterV3";

export const metadata = { title: "Visita confirmada — Duclaud Bienes Raíces", robots: { index: false } };

export default function CitaConfirmadaPage({
  searchParams,
}: {
  searchParams: { date?: string; time?: string; status?: string; property?: string; agent?: string; agentPhone?: string };
}) {
  const already = searchParams.status === "already";
  const error   = searchParams.status === "error";
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";

  return (
    <div className="bg-cream p-4 font-dmsans break-words">
      <PublicHeaderV3 active="" />

      <section className="px-5 md:px-16 pt-10 md:pt-24 pb-14 md:pb-24 flex flex-col gap-5 md:gap-7">
        {error ? (
          <>
            <p className="text-gold text-xs font-semibold tracking-[1.92px] uppercase">Algo salió mal</p>
            <h1 className="font-serif text-navy text-4xl md:text-[96px] md:leading-[96px] tracking-tight md:tracking-[-1.92px] min-w-0">
              Enlace no <em className="italic font-serif text-gold">válido.</em>
            </h1>
            <p className="text-[#6b7385] text-base md:text-[22px] md:leading-[33px] max-w-[800px] min-w-0">
              Este enlace no es válido o ya expiró. Contacta directamente con tu asesor.
            </p>
            <Botones wa={wa} />
          </>
        ) : already ? (
          <>
            <p className="text-gold text-xs font-semibold tracking-[1.92px] uppercase">Cita</p>
            <h1 className="font-serif text-navy text-4xl md:text-[96px] md:leading-[96px] tracking-tight md:tracking-[-1.92px] min-w-0">
              Ya está <em className="italic font-serif text-gold">confirmada.</em>
            </h1>
            <p className="text-[#6b7385] text-base md:text-[22px] md:leading-[33px] max-w-[800px] min-w-0">
              Tu visita ya fue confirmada anteriormente. Revisa tu correo con los detalles.
            </p>
            <Botones wa={wa} />
          </>
        ) : (
          <>
            <div className="bg-navy w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h1 className="font-serif text-navy text-4xl md:text-[96px] md:leading-[96px] tracking-tight md:tracking-[-1.92px] min-w-0">
              ¡Visita <em className="italic font-serif text-gold">confirmada!</em>
            </h1>
            <p className="text-[#6b7385] text-base md:text-[22px] md:leading-[33px] max-w-[800px] min-w-0">
              Te enviamos los detalles por correo. Tu asesor te espera.
            </p>
            {searchParams.date && (
              <div className="bg-stone rounded-[28px] md:rounded-[36px] px-7 md:px-11 py-6 md:py-9 flex flex-col gap-3.5 w-full max-w-[600px]">
                {searchParams.property && (
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[#6b7385] text-[11px] font-semibold tracking-[1.54px] uppercase">Propiedad</p>
                    <p className="text-navy font-medium text-lg md:text-[22px]">{searchParams.property}</p>
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  <p className="text-[#6b7385] text-[11px] font-semibold tracking-[1.54px] uppercase">Fecha y hora</p>
                  <p className="text-navy font-medium text-lg md:text-[22px]">{searchParams.date} · {searchParams.time} h</p>
                </div>
                {searchParams.agent && (
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[#6b7385] text-[11px] font-semibold tracking-[1.54px] uppercase">Asesor</p>
                    <p className="text-navy font-medium text-lg md:text-[22px]">{searchParams.agent}{searchParams.agentPhone ? ` · ${searchParams.agentPhone}` : ""}</p>
                  </div>
                )}
              </div>
            )}
            <Link href="/" className="self-start bg-navy hover:bg-navy-mid text-white font-semibold px-[30px] py-[17px] rounded-full transition-colors mt-2 md:mt-3">
              Ir al inicio
            </Link>
          </>
        )}
      </section>

      <PublicFooterV3 />
    </div>
  );
}

function Botones({ wa }: { wa: string }) {
  return (
    <div className="flex gap-2.5 flex-wrap mt-2 md:mt-3">
      <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
        className="bg-navy hover:bg-navy-mid text-white font-semibold px-[30px] py-[17px] rounded-full transition-colors">
        Escribir por WhatsApp
      </a>
      <Link href="/" className="bg-stone hover:bg-stone-dk text-navy font-semibold px-[30px] py-[17px] rounded-full transition-colors">
        Ir al inicio
      </Link>
    </div>
  );
}
