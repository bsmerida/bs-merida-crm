import { createClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { PropertyListWithFilters } from "@/components/PropertyListWithFilters";

export const metadata = { title: "Propiedades en Renta — BS Mérida" };

export default async function RentarPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("properties")
    .select("*, property_images(url, position, is_cover)")
    .eq("is_published", true)
    .eq("operation", "Renta")
    .neq("status", "Rentada")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  const props = (data || []).map((p: any) => ({
    ...p,
    cover:
      p.property_images?.find((i: any) => i.is_cover)?.url ||
      p.property_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url ||
      null,
  }));

  return (
    <>
      <PublicHeader />
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-ink tracking-tight">Propiedades en renta</h1>
          <p className="text-sm text-ink-muted mt-1">Casas, departamentos y más en renta</p>
        </div>
        <PropertyListWithFilters props={props} operation="Renta" />
      </div>
      <PublicFooter />
      <PublicChatbot />
    </>
  );
}
