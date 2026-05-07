import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { PropertyCard } from "@/components/PropertyCard";
import type { Property } from "@/lib/supabase/types";

export const metadata = { title: "Propiedades en Renta — BS Mérida" };

export default async function RentarPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("properties")
    .select("*, property_images(url, position, is_cover)")
    .eq("is_published", true)
    .eq("operation", "Renta")
    .neq("status", "Rentada")
    .order("created_at", { ascending: false });
  const props = (data || []) as any[];

  return (
    <>
      <PublicHeader />
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-ink tracking-tight">Propiedades en renta</h1>
          <p className="text-sm text-ink-muted mt-1">{props.length} {props.length === 1 ? "resultado" : "resultados"}</p>
        </div>
        {props.length === 0 ? (
          <div className="text-center py-20 text-ink-muted text-sm">No hay propiedades en renta publicadas todavía.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {props.map(p => {
              const cover = p.property_images?.find((i: any) => i.is_cover)?.url
                || p.property_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url
                || null;
              return <PropertyCard key={p.id} p={p} coverUrl={cover} />;
            })}
          </div>
        )}
      </div>
      <PublicFooter />
      <PublicChatbot />
    </>
  );
}
