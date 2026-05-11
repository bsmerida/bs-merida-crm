import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/Icon";
import { AdminPropiedadesList } from "@/components/AdminPropiedadesList";

export default async function AdminPropiedades() {
  const supabase = createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("*, agent:profiles(full_name), property_images(url, is_cover, position)")
    .order("created_at", { ascending: false });

  const { data: viewCounts } = await supabase.from("property_views").select("property_id");
  const { data: inquiryCounts } = await supabase.from("property_inquiries").select("property_id");

  const viewsMap: Record<string, number> = {};
  const inquiriesMap: Record<string, number> = {};
  (viewCounts || []).forEach((v: any) => { viewsMap[v.property_id] = (viewsMap[v.property_id] || 0) + 1; });
  (inquiryCounts || []).forEach((v: any) => { inquiriesMap[v.property_id] = (inquiriesMap[v.property_id] || 0) + 1; });

  const props = (properties || []).map((p: any) => {
    const imgs = (p.property_images || []) as { url: string; is_cover: boolean; position: number }[];
    const cover = imgs.find(i => i.is_cover)?.url || imgs.sort((a, b) => a.position - b.position)[0]?.url || null;
    return {
      id: p.id, title: p.title, type: p.type, operation: p.operation,
      status: p.status, price: p.price, zone: p.zone, city: p.city,
      reference: p.reference, development: p.development, agent: p.agent, cover,
      views_count: viewsMap[p.id] || 0,
      inquiries_count: inquiriesMap[p.id] || 0,
    };
  });

  return (
    <div className="p-10 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Propiedades</h1>
          <p className="text-sm text-ink-muted mt-0.5">{props.length} en el inventario</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón de estadísticas */}
          <Link href="/admin/propiedades/estadisticas"
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-ink-line text-ink rounded-full text-sm hover:border-ink-soft">
            📊 Estadísticas
          </Link>
          <Link href="/admin/propiedades/tokko"
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-50 border border-brand-200 text-brand-700 rounded-full text-sm hover:bg-brand-100">
            🔄 Sincronizar Tokko
          </Link>
          <Link href="/admin/geocode"
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-ink-line text-ink rounded-full text-sm hover:border-ink-soft">
            📍 Geocodificar
          </Link>
          <Link href="/admin/propiedades/nueva"
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-full text-sm hover:bg-brand-600">
            <Icon name="plus" className="w-3.5 h-3.5" /> Nueva propiedad
          </Link>
        </div>
      </div>
      <AdminPropiedadesList props={props} />
    </div>
  );
}
