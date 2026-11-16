"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PUBLIC_PROPERTY_COLUMNS, conPortada } from "@/lib/public-property";
import { PublicHeaderV3 } from "@/components/PublicHeaderV3";
import { PublicFooterV3 } from "@/components/PublicFooterV3";
import { PublicChatbot } from "@/components/PublicChatbot";
import { PropertyCardV3 } from "@/components/PropertyCardV3";
import { listaFavoritos, suscribirFavoritos } from "@/lib/favoritos";

export default function FavoritosPage() {
  const [props, setProps] = useState<any[] | null>(null);
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      const ids = listaFavoritos();
      if (ids.length === 0) { setProps([]); return; }
      const supabase = createClient();
      const { data } = await supabase.from("properties").select(PUBLIC_PROPERTY_COLUMNS)
        .in("id", ids).eq("is_published", true);
      if (!cancelado) setProps((data || []).map((p: any) => conPortada(p)));
    }
    cargar();
    const unsub = suscribirFavoritos(cargar);
    return () => { cancelado = true; unsub(); };
  }, []);

  const waMsg = props && props.length > 0
    ? `Hola, me gustaría agendar un recorrido para ver estas propiedades:\n\n${props.map((p: any) => `· ${p.title}`).join("\n")}`
    : "Hola, me gustaría agendar un recorrido.";

  return (
    <div className="bg-cream p-4 font-dmsans break-words">
      <PublicHeaderV3 active="/favoritos" />

      <section className="pt-10 md:pt-[72px] pb-6 md:pb-10 px-5 md:px-8 flex flex-col items-center text-center gap-3 md:gap-4">
        <h1 className="font-serif text-navy text-4xl md:text-[112px] md:leading-[108px] tracking-tight md:tracking-[-1.12px] min-w-0">
          Tus <em className="italic not-italic font-serif text-gold">favoritos.</em>
        </h1>
        <p className="text-[#6b7385] text-base md:text-[20px] min-w-0">
          {props === null ? "Cargando…" : props.length === 0
            ? "Aún no guardas propiedades. Toca el corazón en cualquier tarjeta para guardarla aquí."
            : `${props.length} propiedad${props.length !== 1 ? "es" : ""} guardada${props.length !== 1 ? "s" : ""}. Agenda un recorrido por todas en un solo día.`}
        </p>
      </section>

      <section className="px-5 md:px-8 pb-10 md:pb-16">
        {props === null ? (
          <div className="py-16 text-center text-[#6b7385]">Cargando…</div>
        ) : props.length === 0 ? (
          <div className="py-16 text-center">
            <Link href="/comprar" className="bg-navy hover:bg-navy-mid text-white font-semibold px-8 py-4 rounded-full transition-colors">
              Ver propiedades
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {props.map((p: any) => <PropertyCardV3 key={p.id} p={p} coverUrl={p.cover} />)}
          </div>
        )}
      </section>

      {props && props.length > 1 && (
        <section className="rounded-[32px] md:rounded-[48px] bg-navy px-6 md:px-16 py-10 md:py-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <p className="font-serif text-white text-3xl md:text-[56px] md:leading-[58px]">
              Un día. <em className="italic not-italic font-serif text-gold">{props.length} propiedades.</em>
            </p>
            <p className="text-white/75 text-base md:text-[18px]">Organizamos la ruta y te acompañamos en cada visita.</p>
          </div>
          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer"
            className="bg-white text-navy font-semibold px-9 py-[18px] rounded-full hover:bg-stone transition-colors shrink-0">
            Agendar recorrido
          </a>
        </section>
      )}

      <PublicFooterV3 />
      <PublicChatbot />
    </div>
  );
}
