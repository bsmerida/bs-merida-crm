import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLeadsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("leads")
    .select("*, agent:profiles(full_name)")
    .order("created_at", { ascending: false });
  const leads = (data || []) as any[];

  const fechaCorta = (s: string) => new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

  return (
    <div className="p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Clientes</h1>
        <p className="text-sm text-ink-muted mt-0.5">{leads.length} en seguimiento</p>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ink-line p-16 text-center">
          <h3 className="font-semibold text-ink">Aún no hay clientes registrados</h3>
          <p className="text-sm text-ink-muted mt-2 max-w-md mx-auto">Cuando alguien llene el formulario de contacto del sitio web o use el chatbot, aparecerá aquí automáticamente.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-ink-line">
              <tr>{["Cliente", "Contacto", "Origen", "Estado", "Asesor", "Recibido"].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-5 py-3.5">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/40 cursor-pointer" onClick={() => {}}>
                  <td className="px-5 py-4">
                    <Link href={`/admin/leads/${l.id}`} className="font-medium text-sm text-ink hover:text-brand-600">{l.name}</Link>
                    {l.interest && <div className="text-xs text-ink-muted">{l.interest}</div>}
                  </td>
                  <td className="px-5 py-4 text-sm text-ink-muted">
                    <div>{l.phone || "—"}</div>
                    <div className="text-xs">{l.email || ""}</div>
                  </td>
                  <td className="px-5 py-4"><span className="text-xs px-2 py-1 bg-ink-ghost text-ink-muted rounded-full">{l.source || "—"}</span></td>
                  <td className="px-5 py-4"><span className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700">{l.status}</span></td>
                  <td className="px-5 py-4 text-sm text-ink-muted">{l.agent?.full_name || "Sin asignar"}</td>
                  <td className="px-5 py-4 text-xs text-ink-muted">{fechaCorta(l.created_at)}</td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/admin/leads/${l.id}`} className="text-xs text-brand-600 hover:underline">Editar →</Link>
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
