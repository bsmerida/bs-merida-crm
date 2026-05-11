import { createClient } from "@/lib/supabase/server";
import { PropertiesStatsClient } from "@/components/PropertiesStatsClient";
import Link from "next/link";

export default async function PropiedadesEstadisticasPage() {
  const supabase = createClient();

  const [
    { data: properties },
    { data: views },
    { data: inquiries },
  ] = await Promise.all([
    supabase.from("properties").select("id, title, type, operation, status, price, zone, city, reference, is_published, created_at"),
    supabase.from("property_views").select("property_id, viewed_at"),
    supabase.from("property_inquiries").select("property_id, created_at"),
  ]);

  const props = (properties || []) as any[];
  const allViews = (views || []) as any[];
  const allInquiries = (inquiries || []) as any[];

  // Agregar conteos a cada propiedad
  const propsWithStats = props.map(p => ({
    ...p,
    views_count: allViews.filter(v => v.property_id === p.id).length,
    inquiries_count: allInquiries.filter(v => v.property_id === p.id).length,
  }));

  // Vistas por día últimos 30 días
  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const viewsByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    viewsByDay[d.toISOString().slice(0, 10)] = 0;
  }
  allViews.filter(v => new Date(v.viewed_at) >= d30).forEach(v => {
    const key = new Date(v.viewed_at).toISOString().slice(0, 10);
    if (viewsByDay[key] !== undefined) viewsByDay[key]++;
  });

  const viewsTrend = Object.entries(viewsByDay).map(([date, count]) => ({ date, count }));

  return (
    <div className="p-10 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/propiedades" className="text-sm text-ink-muted hover:text-ink inline-flex items-center gap-1 mb-2">
            ← Volver a propiedades
          </Link>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Estadísticas de propiedades</h1>
          <p className="text-sm text-ink-muted mt-0.5">{props.length} propiedades en el inventario</p>
        </div>
      </div>
      <PropertiesStatsClient
        props={propsWithStats}
        viewsTrend={viewsTrend}
        totalViews={allViews.length}
        totalInquiries={allInquiries.length}
      />
    </div>
  );
}
