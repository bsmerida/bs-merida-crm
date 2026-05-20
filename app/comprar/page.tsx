import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { PropertyListWithFilters } from "@/components/PropertyListWithFilters";

export const metadata = { title: "Propiedades en Venta — Duclaud" };

export default async function ComprarPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("properties")
    .select("*, property_images(url, position, is_cover)")
    .eq("is_published", true).eq("operation", "Venta").neq("status", "Vendida")
    .order("featured", { ascending: false }).order("created_at", { ascending: false });

  const props = (data || []).map((p: any) => ({
    ...p,
    cover: p.property_images?.find((i: any) => i.is_cover)?.url ||
      p.property_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url || null,
  }));

  return (
    <>
      <PublicHeader />
      <div className="bg-navy py-16 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-4">Inventario</p>
          <h1 className="font-serif text-4xl md:text-5xl font-light text-white">Propiedades en venta</h1>
          <p className="text-white/40 text-sm mt-3">Yucatán · Quintana Roo · Nuevo León</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-8 py-16 pb-24">
        <PropertyListWithFilters props={props} operation="Venta" />
      </div>
      <PublicFooter />
      <PublicChatbot />
    </>
  );
}
