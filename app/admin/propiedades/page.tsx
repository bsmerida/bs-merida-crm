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

  const props = (properties || []).map((p: any) => {
    const imgs = (p.property_images || []) as { url: string; is_cover: boolean; position: number }[];
    const cover =
      imgs.find(i => i.is_cover)?.url ||
      imgs.sort((a, b) => a.position - b.position)[0]?.url ||
      null;
    return {
      id: p.id,
      title: p.title,
      type: p.type,
      operation: p.operation,
      status: p.status,
      price: p.price,
      zone: p.zone,
      city: p.city,
      reference: p.reference,
      development: p.development,
      agent: p.agent,
      cover,
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
          <Link href="/admin/propiedades/tokko"
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-50 border border-brand-200 text-brand-700 rounded-full text-sm hover:bg-brand-100">
            🔄 Sincronizar Tokko
          </Link>
          <Link href="/admin/propiedades/importar"
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-ink-line text-ink rounded-full text-sm hover:border-ink-soft">
            <Icon name="arrowDown" className="w-3.5 h-3.5" /> Importar CSV
          </Link>
          <Link href="/admin/propiedades/nueva"
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-full text-sm hover:bg-brand-600">
            <Icon name="plus" className="w-3.5 h-3.5" /> Nueva propiedad
          </Link>
        </div>
      </div>

      {props.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ink-line p-16 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
            <Icon name="building" className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-ink">Aún no hay propiedades</h3>
          <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">
            Empieza por agregar tu primera propiedad.
          </p>
          <Link href="/admin/propiedades/nueva"
            className="inline-flex items-center gap-1.5 mt-5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-full text-sm">
            <Icon name="plus" className="w-3.5 h-3.5" /> Agregar primera propiedad
          </Link>
        </div>
      ) : (
        <AdminPropiedadesList props={props} />
      )}
    </div>
  );
}
