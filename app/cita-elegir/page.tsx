// app/cita-elegir/page.tsx
// El cliente revisa los horarios que el asesor le propuso y confirma uno con un botón.
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { etiquetaFecha } from "@/lib/citas";
import { PublicHeaderV3 } from "@/components/PublicHeaderV3";
import { PublicFooterV3 } from "@/components/PublicFooterV3";
import { ElegirHorarioForm } from "@/components/ElegirHorarioForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirmar visita — Duclaud Bienes Raíces", robots: { index: false } };

export default async function CitaElegirPage({ searchParams }: { searchParams: { token?: string; option?: string } }) {
  const token = searchParams.token || "";
  const optionIdx = Number(searchParams.option || "0");
  const db = createAdminClient();
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";

  const { data: request } = token
    ? await db.from("appointment_requests")
        .select("status, property_title, agent_options, agent_id").eq("client_token", token).maybeSingle()
    : { data: null };

  const opciones = ((request?.agent_options as { date: string; time: string }[] | undefined) || [])
    .map(o => ({ label: etiquetaFecha(o.date), time: o.time }));
  const yaAtendida = request && request.status !== "rescheduled";

  let agentName = "Tu asesor";
  if (request?.agent_id) {
    const { data: agent } = await db.from("profiles").select("full_name").eq("id", request.agent_id).maybeSingle();
    if (agent?.full_name) agentName = agent.full_name;
  }

  return (
    <div className="bg-cream p-4 font-dmsans break-words">
      <PublicHeaderV3 active="" />

      <section className="px-5 md:px-16 pt-10 md:pt-24 pb-14 md:pb-24 flex flex-col gap-5 md:gap-7">
        {!request || opciones.length === 0 ? (
          <>
            <p className="text-gold text-xs font-semibold tracking-[1.92px] uppercase">Algo salió mal</p>
            <h1 className="font-serif text-navy text-4xl md:text-[96px] md:leading-[96px] tracking-tight md:tracking-[-1.92px] min-w-0">
              Enlace no <em className="italic font-serif text-gold">válido.</em>
            </h1>
            <p className="text-[#6b7385] text-base md:text-[22px] md:leading-[33px] max-w-[800px] min-w-0">
              Este enlace no es válido o ya expiró. Contacta directamente con tu asesor.
            </p>
            <div className="flex gap-2.5 flex-wrap mt-2 md:mt-3">
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                className="bg-navy hover:bg-navy-mid text-white font-semibold px-[30px] py-[17px] rounded-full transition-colors">
                Escribir por WhatsApp
              </a>
              <Link href="/" className="bg-stone hover:bg-stone-dk text-navy font-semibold px-[30px] py-[17px] rounded-full transition-colors">
                Ir al inicio
              </Link>
            </div>
          </>
        ) : yaAtendida ? (
          <>
            <p className="text-gold text-xs font-semibold tracking-[1.92px] uppercase">Cita</p>
            <h1 className="font-serif text-navy text-4xl md:text-[96px] md:leading-[96px] tracking-tight md:tracking-[-1.92px] min-w-0">
              Esta visita ya fue <em className="italic font-serif text-gold">atendida.</em>
            </h1>
            <p className="text-[#6b7385] text-base md:text-[22px] md:leading-[33px] max-w-[800px] min-w-0">
              Revisa tu correo con los detalles o contacta a tu asesor si necesitas cambiarla.
            </p>
            <div className="flex gap-2.5 flex-wrap mt-2 md:mt-3">
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                className="bg-navy hover:bg-navy-mid text-white font-semibold px-[30px] py-[17px] rounded-full transition-colors">
                Escribir por WhatsApp
              </a>
              <Link href="/" className="bg-stone hover:bg-stone-dk text-navy font-semibold px-[30px] py-[17px] rounded-full transition-colors">
                Ir al inicio
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-gold text-xs font-semibold tracking-[1.92px] uppercase">
              Visita{request.property_title ? ` · ${request.property_title}` : ""}
            </p>
            <h1 className="font-serif text-navy text-4xl md:text-[96px] md:leading-[96px] tracking-tight md:tracking-[-1.92px] min-w-0">
              Confirma tu <em className="italic font-serif text-gold">visita.</em>
            </h1>
            <p className="text-[#6b7385] text-base md:text-[22px] md:leading-[33px] max-w-[800px] min-w-0">
              {agentName} te propuso {opciones.length === 1 ? "un horario" : opciones.length === 3 ? "tres horarios" : `${opciones.length} horarios`}. Elige el que mejor te acomode.
            </p>
            <ElegirHorarioForm token={token} opciones={opciones} defaultIdx={Math.min(optionIdx, opciones.length - 1)} />
          </>
        )}
      </section>

      <PublicFooterV3 />
    </div>
  );
}
