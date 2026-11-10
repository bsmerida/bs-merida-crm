import { createClient } from "@/lib/supabase/server";
import { countByProperty } from "@/lib/stats";
import { PropertiesStatsClient } from "@/components/PropertiesStatsClient";
import Link from "next/link";

export default async function PropiedadesEstadisticasPage() {
  const supabase = createClient();

  // Solo se descargan las vistas de los últimos 30 días (para la gráfica);
  // los totales y los conteos por propiedad se calculan en la base.
  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);

  const [
    { data: properties },
    { data: recentViews },
    { count: totalViews },
    { count: totalInquiries },
    viewsBy,
    inquiriesBy,
  ] = await Promise.all([
    supabase.from("properties").select("id, title, type, operation, status, price, currency, zone, city, state, reference, is_published, created_at"),
    supabase.from("property_views").select("viewed_at").gte("viewed_at", d30.toISOString()),
    supabase.from("property_views").select("property_id", { count: "exact", head: true }),
    supabase.from("property_inquiries").select("property_id", { count: "exact", head: true }),
    countByProperty(supabase, "views"),
    countByProperty(supabase, "inquiries"),
  ]);

  const props = (properties || []) as any[];
  const propsWithStats = props.map(p => ({
    ...p,
    views_count: viewsBy.get(p.id) || 0,
    inquiries_count: inquiriesBy.get(p.id) || 0,
  }));

  // Vistas por día últimos 30 días
  const viewsByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    viewsByDay[d.toISOString().slice(0, 10)] = 0;
  }
  for (const v of recentViews || []) {
    const key = new Date(v.viewed_at).toISOString().slice(0, 10);
    if (viewsByDay[key] !== undefined) viewsByDay[key]++;
  }

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
        totalViews={totalViews || 0}
        totalInquiries={totalInquiries || 0}
      />
    </div>
  );
}
