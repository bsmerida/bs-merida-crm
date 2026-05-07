import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtMXN } from "@/lib/utils";
import { Icon } from "@/components/Icon";

export default async function AdminPropiedades() {
  const supabase = createClient();
  const { data: properties } = await supabase.from("properties").select("*, agent:profiles(full_name)").order("created_at", { ascending: false });
  const props = (properties || []) as any[];

  return (
    <div className="p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Propiedades</h1>
          <p className="text-sm text-ink-muted mt-0.5">{props.length} en el inventario</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/propiedades/tokko" className="flex items-center gap-1.5 px-4 py-2 bg-brand-50 border border-brand-200 text-brand-700 rounded-full text-sm hover:bg-brand-100">
            🔄 Sincronizar Tokko
          </Link>
          <Link href="/admin/propiedades/importar" className="flex items-center gap-1.5 px-4 py-2 bg-white border border-ink-line text-ink rounded-full text-sm hover:border-ink-soft">
            <Icon name="arrowDown" className="w-3.5 h-3.5" /> Importar CSV
          </Link>
          <Link href="/admin/propiedades/nueva" className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-full text-sm hover:bg-brand-600">
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
          <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">Empieza por agregar tu primera propiedad. Una vez publicada aparecerá automáticamente en el sitio público.</p>
          <Link href="/admin/propiedades/nueva" className="inline-flex items-center gap-1.5 mt-5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-full text-sm">
            <Icon name="plus" className="w-3.5 h-3.5" /> Agregar primera propiedad
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-ink-line">
              <tr>{["Propiedad", "Tipo", "Precio", "Estado", "Asesor", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-5 py-3.5">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {props.map(p => (
                <tr key={p.id} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/40">
                  <td className="px-5 py-4">
                    <div className="font-medium text-sm text-ink">{p.title}</div>
                    <div className="text-xs text-ink-muted">{p.zone || p.city}</div>
                  </td>
                  <td className="px-5 py-4 text-sm text-ink">{p.type}<div className="text-xs text-ink-muted">{p.operation}</div></td>
                  <td className="px-5 py-4 text-sm font-semibold text-ink">{fmtMXN(Number(p.price))}</td>
                  <td className="px-5 py-4"><span className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700">{p.status}</span></td>
                  <td className="px-5 py-4 text-sm text-ink-muted">{p.agent?.full_name || "—"}</td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/admin/propiedades/${p.id}`} className="text-xs text-brand-600 hover:underline">Editar</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
