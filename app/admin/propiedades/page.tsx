import Link from "next/link";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { countByProperty } from "@/lib/stats";
import { Icon } from "@/components/Icon";
import { AdminPropiedadesList } from "@/components/AdminPropiedadesList";
import { PORTALES } from "@/lib/portales";

export default async function AdminPropiedades() {
  const supabase = createAdminClient();
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  const isAdmin = profile?.role === "admin";

  // Admin ve todas, asesor solo las suyas
  const portalCols = PORTALES.map(p => p.clave).join(", ");
  const query = supabase
    .from("properties")
    .select(`*, ${portalCols}, agent:profiles(full_name), property_images(url, is_cover, position)`)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query.eq("agent_id", user!.id);
  }

  const { data: properties } = await query;

  // Conteos de vistas y solicitudes (solo admin)
  const [viewsMap, inquiriesMap] = isAdmin
    ? await Promise.all([countByProperty(supabase, "views"), countByProperty(supabase, "inquiries")])
    : [new Map<string, number>(), new Map<string, number>()];

  const props = (properties || []).map((p: any) => {
    const imgs = (p.property_images || []) as { url: string; is_cover: boolean; position: number }[];
    const cover = imgs.find(i => i.is_cover)?.url || imgs.sort((a, b) => a.position - b.position)[0]?.url || null;
    const portales = PORTALES.filter(portal => p[portal.clave]).map(portal => portal.abrev);
    return {
      id: p.id, title: p.title, type: p.type, operation: p.operation,
      status: p.status, price: p.price, zone: p.zone, city: p.city,
      reference: p.reference, development: p.development, agent: p.agent, cover, portales,
      views_count: viewsMap.get(p.id) || 0,
      inquiries_count: inquiriesMap.get(p.id) || 0,
    };
  });

  const disponibles = props.filter(p => p.status === "Disponible").length;
  const reservadas  = props.filter(p => p.status === "Reservada").length;
  const cerradas    = props.filter(p => p.status === "Vendida" || p.status === "Rentada").length;

  return (
    <div className="p-4 md:p-6 space-y-5 font-dmsans">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-navy text-4xl md:text-[52px] md:tracking-[-0.52px]">
            Propiedades<em className="italic font-serif text-gold">.</em>
          </h1>
          <p className="text-[#6b7385] text-[15px] mt-1">
            {isAdmin
              ? `${disponibles} disponibles · ${reservadas} reservadas · ${cerradas} vendidas o rentadas`
              : `${props.length} propiedades asignadas a ti`}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {isAdmin && (
            <>
              <Link href="/admin/propiedades/estadisticas"
                className="bg-stone hover:bg-stone-dk text-navy font-semibold text-sm px-[22px] py-3 rounded-full transition-colors">
                Estadísticas
              </Link>
              <Link href="/admin/propiedades/tokko"
                className="bg-stone hover:bg-stone-dk text-navy font-semibold text-sm px-[22px] py-3 rounded-full transition-colors">
                Tokko
              </Link>
              <Link href="/admin/geocode"
                className="bg-stone hover:bg-stone-dk text-navy font-semibold text-sm px-[22px] py-3 rounded-full transition-colors">
                Coordenadas
              </Link>
              <Link href="/admin/propiedades/importar"
                className="bg-stone hover:bg-stone-dk text-navy font-semibold text-sm px-[22px] py-3 rounded-full transition-colors">
                Importar
              </Link>
            </>
          )}
          <Link href="/admin/propiedades/nueva"
            className="bg-navy hover:bg-navy-mid text-white font-semibold text-sm px-[22px] py-3 rounded-full transition-colors flex items-center gap-1.5">
            <Icon name="plus" className="w-3.5 h-3.5" /> Nueva propiedad
          </Link>
        </div>
      </div>
      <AdminPropiedadesList props={props} />
    </div>
  );
}
