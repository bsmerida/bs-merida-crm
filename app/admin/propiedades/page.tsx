import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/Icon";
import { AdminPropiedadesList } from "@/components/AdminPropiedadesList";

export default async function AdminPropiedades() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  const isAdmin = profile?.role === "admin";

  // Admin ve todas, asesor solo las suyas
  const query = supabase
    .from("properties")
    .select("*, agent:profiles(full_name), property_images(url, is_cover, position)")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query.eq("agent_id", user!.id);
  }

  const { data: properties } = await query;

  // Conteos de vistas y solicitudes (solo admin)
  let viewsMap: Record<string, number> = {};
  let inquiriesMap: Record<string, number> = {};

  if (isAdmin) {
    const { data: viewCounts } = await supabase.from("property_views").select("property_id");
    const { data: inquiryCounts } = await supabase.from("property_inquiries").select("property_id");
    (viewCounts || []).forEach((v: any) => { viewsMap[v.property_id] = (viewsMap[v.property_id] || 0) + 1; });
    (inquiryCounts || []).forEach((v: any) => { inquiriesMap[v.property_id] = (inquiriesMap[v.property_id] || 0) + 1; });
  }

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
          <p className="text-sm text-ink-muted mt-0.5">
            {isAdmin ? `${props.length} en el inventario` : `${props.length} propiedades asignadas a ti`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <>
              <Link href="/admin/propiedades/estadisticas"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-stone text-ink rounded-full text-sm hover:border-navy transition-colors">
                <svg className="w-4 h-4 text-navy" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 4-6"/>
                </svg>
                Estadísticas
              </Link>
              <Link href="/admin/propiedades/tokko"
                className="flex items-center gap-2 px-4 py-2 bg-navy/5 border border-navy/20 text-navy rounded-full text-sm hover:bg-navy/10 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                </svg>
                Sincronizar
              </Link>
              <Link href="/admin/geocode"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-stone text-ink rounded-full text-sm hover:border-navy transition-colors">
                <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                Coordenadas
              </Link>
            </>
          )}
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
