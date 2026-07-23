// app/admin/mapa/page.tsx
import { createClient } from "@/lib/supabase/server";
import { PropertiesMap } from "@/components/PropertiesMap";
import Link from "next/link";

export default async function AdminMapaPage() {
  const supabase = createClient();

  const { data: props } = await supabase
    .from("properties")
    .select("id, title, price, operation, type, zone, lat, lng, status, is_published")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("created_at", { ascending: false });

  const propIds = (props || []).map(p => p.id);
  const { data: images } = await supabase
    .from("property_images")
    .select("property_id, url, sort_order")
    .in("property_id", propIds)
    .order("sort_order", { ascending: true });

  const imageMap: Record<string, string[]> = {};
  for (const img of images || []) {
    if (!imageMap[img.property_id]) imageMap[img.property_id] = [];
    if (imageMap[img.property_id].length < 5) imageMap[img.property_id].push(img.url);
  }

  const properties = (props || []).map(p => ({
    ...p,
    images: imageMap[p.id] || [],
  }));

  const { count: sinCoords } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .is("lat", null);

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Mapa de propiedades</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {properties.length} con coordenadas
            {sinCoords ? ` · ${sinCoords} sin geocodificar` : ""}
          </p>
        </div>
        {sinCoords ? (
          <Link href="/admin/propiedades?tab=coordenadas"
            className="text-sm bg-gold text-white px-4 py-2 rounded-full hover:bg-gold/90 transition">
            Geocodificar {sinCoords} propiedades →
          </Link>
        ) : null}
      </div>
      <PropertiesMap properties={properties} height="75vh"/>
    </div>
  );
}
