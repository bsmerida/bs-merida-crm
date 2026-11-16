import { createClient } from "@/lib/supabase/server";
import { PUBLIC_PROPERTY_COLUMNS, conPortada } from "@/lib/public-property";
import { PublicHeaderV3 } from "@/components/PublicHeaderV3";
import { PublicFooterV3 } from "@/components/PublicFooterV3";
import { PublicChatbot } from "@/components/PublicChatbot";
import { PropertyListWithFilters } from "@/components/PropertyListWithFilters";

export const metadata = { title: "Propiedades en Renta — Duclaud" };

export default async function RentarPage({ searchParams }: { searchParams: { type?: string; zone?: string; max?: string } }) {
  const supabase = createClient();
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  let query = supabase.from("properties")
    .select(PUBLIC_PROPERTY_COLUMNS)
    .eq("is_published", true).eq("operation", "Renta").neq("status", "Rentada")
    .order("featured", { ascending: false }).order("created_at", { ascending: false });
  if (searchParams.max) query = (query as any).lte("price", Number(searchParams.max));
  const { data } = await query;

  const props = (data || []).map((p: any) => conPortada(p));

  return (
    <div className="bg-cream p-4 font-dmsans break-words">
      <PublicHeaderV3 active="/rentar" />

      <section className="pt-10 md:pt-[72px] pb-6 md:pb-10 px-5 md:px-8 flex flex-col items-center text-center gap-3 md:gap-4">
        <h1 className="font-serif text-navy text-4xl md:text-[112px] md:leading-[108px] tracking-tight md:tracking-[-1.12px] min-w-0">
          Propiedades en <em className="italic not-italic font-serif text-gold">renta.</em>
        </h1>
        <p className="text-[#6b7385] text-base md:text-[20px] min-w-0">
          {props.length} propiedades disponibles · Casas, departamentos, locales y oficinas.
        </p>
      </section>

      <section className="px-5 md:px-8 pb-16">
        <PropertyListWithFilters props={props} operation="Renta"
          initialType={searchParams.type} initialZone={searchParams.zone} />
      </section>

      <section className="rounded-[32px] md:rounded-[48px] bg-navy px-6 md:px-16 py-14 md:py-24 flex flex-col items-center gap-4 md:gap-5 text-center">
        <p className="font-serif text-white text-3xl md:text-[72px] md:leading-[74px] min-w-0">
          ¿No encuentras lo que <em className="italic not-italic font-serif text-gold">buscas?</em>
        </p>
        <p className="text-white/75 text-base md:text-[20px] min-w-0">Cuéntanos qué necesitas. Buscamos por ti, incluso antes de que se publique.</p>
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
          className="bg-white text-navy font-semibold px-8 py-[18px] rounded-full hover:bg-stone transition-colors mt-2">
          Hablar con un asesor
        </a>
      </section>

      <PublicFooterV3 />
      <PublicChatbot />
    </div>
  );
}
