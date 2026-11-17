import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { PublicHeaderV3 } from "@/components/PublicHeaderV3";
import { PublicFooterV3 } from "@/components/PublicFooterV3";
import { PropertyCardV3 } from "@/components/PropertyCardV3";

export const dynamic = "force-dynamic";

const fmt = (n: number, cur = "MXN") =>
  new Intl.NumberFormat(cur === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(n);

export default async function TableroPage({ params }: { params: { slug: string } }) {
  // Página pública: se lee con service role, pero SOLO lo que el cliente debe ver
  // (nombre del cliente, asesor y propiedades del tablero). Así las tablas leads
  // y boards no necesitan ser legibles con la llave anónima.
  const db = createAdminClient();

  const { data: board }: { data: any } = await db
    .from("boards")
    .select("id, title, lead:leads(name), agent:profiles(full_name, phone)")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!board) notFound();

  const { data: boardProps } = await db
    .from("board_properties")
    .select("ai_reason, ai_score, added_by, property:properties(id,title,type,operation,price,currency,zone,city,state,bedrooms,bathrooms,m2_construction,m2_land,parking,status,is_published)")
    .eq("board_id", board.id)
    .order("ai_score", { ascending: false });

  const rows = (boardProps || []).filter((r: any) => r.property?.is_published);
  const ids = rows.map((r: any) => r.property.id);

  // Portadas en una sola consulta (antes: una consulta por propiedad)
  const { data: covers } = ids.length
    ? await db.from("property_images").select("property_id, url").in("property_id", ids).eq("is_cover", true)
    : { data: [] };
  const coverMap = new Map((covers || []).map((c: any) => [c.property_id, c.url]));

  const propsWithCovers = rows.map((row: any) => ({
    ...row.property, ai_reason: row.ai_reason, ai_score: row.ai_score, added_by: row.added_by,
    cover: coverMap.get(row.property.id),
  }));

  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  const waMsg = "Hola! Vi el tablero de propiedades que me compartieron y me interesa agendar una visita.";
  const subtitulo = board.agent?.full_name
    ? `${board.agent.full_name} eligió estas propiedades según lo que buscas.`
    : "Tu asesor eligió estas propiedades según lo que buscas.";

  return (
    <div className="bg-cream p-4 font-dmsans break-words">
      <PublicHeaderV3 active="" />

      <section className="px-5 md:px-16 pt-10 md:pt-24 pb-10 md:pb-16 flex flex-col gap-5 md:gap-7">
        <p className="text-gold text-xs font-semibold tracking-[1.92px] uppercase">Selección preparada para ti</p>
        <h1 className="font-serif text-navy text-4xl md:text-[96px] md:leading-[96px] tracking-tight md:tracking-[-1.92px] min-w-0">
          Tu <em className="italic not-italic font-serif text-gold">selección.</em>
        </h1>
        <p className="text-[#6b7385] text-base md:text-[22px] md:leading-[33px] max-w-[800px] min-w-0">
          {board.lead?.name ? `Hola, ${board.lead.name.split(" ")[0]}. ` : ""}{subtitulo}
        </p>

        {propsWithCovers.length > 0 && (
          <div className="flex flex-col md:flex-row gap-3 w-full">
            <div className="bg-stone rounded-[24px] md:rounded-[30px] px-6 md:px-[26px] py-[18px] md:py-[22px] flex-1">
              <p className="font-semibold text-navy text-2xl md:text-[34px] tracking-[-0.34px]">{propsWithCovers.length}</p>
              <p className="text-[#6b7385] text-sm">opciones seleccionadas</p>
            </div>
            <div className="bg-stone rounded-[24px] md:rounded-[30px] px-6 md:px-[26px] py-[18px] md:py-[22px] flex-1">
              <p className="font-semibold text-navy text-2xl md:text-[34px] tracking-[-0.34px]">{fmt(Math.min(...propsWithCovers.map(p => p.price)))}</p>
              <p className="text-[#6b7385] text-sm">precio más bajo</p>
            </div>
            <div className="bg-stone rounded-[24px] md:rounded-[30px] px-6 md:px-[26px] py-[18px] md:py-[22px] flex-1">
              <p className="font-semibold text-navy text-2xl md:text-[34px] tracking-[-0.34px]">{fmt(Math.max(...propsWithCovers.map(p => p.price)))}</p>
              <p className="text-[#6b7385] text-sm">precio más alto</p>
            </div>
          </div>
        )}

        {propsWithCovers.length === 0 ? (
          <div className="py-10 text-center text-[#6b7385]">Tu asesor está preparando tu selección. ¡Vuelve pronto!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {propsWithCovers.map((p: any) => (
              <div key={p.id} className="flex flex-col gap-2.5">
                <PropertyCardV3 p={p} coverUrl={p.cover} />
                {p.ai_reason && (
                  <p className="text-gold text-[13px] bg-gold/10 rounded-2xl px-4 py-2.5 leading-relaxed">{p.ai_reason}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-navy rounded-[32px] md:rounded-[44px] px-7 md:px-16 py-9 md:py-14 flex flex-col gap-3.5 w-full">
          <p className="font-serif text-white text-3xl md:text-[64px] md:leading-[64px] md:tracking-[-0.64px] min-w-0">¿Alguna te llamó la atención?</p>
          <p className="text-[#c9cfdb] text-base md:text-[20px] min-w-0">Escríbenos y agendamos una visita a la que más te guste.</p>
          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer"
            className="self-start bg-white hover:bg-stone text-navy font-semibold px-[30px] py-[17px] rounded-full transition-colors mt-2">
            Agendar visita
          </a>
        </div>
      </section>

      <PublicFooterV3 />
    </div>
  );
}
