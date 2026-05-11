"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  "Nuevo":             { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500" },
  "Contactado":        { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  "Calificado":        { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  "Visita agendada":   { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500" },
  "Visita realizada":  { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  "Oferta":            { bg: "bg-pink-50",   text: "text-pink-700",   dot: "bg-pink-500" },
  "Negociación":       { bg: "bg-rose-50",   text: "text-rose-700",   dot: "bg-rose-500" },
  "Cerrado ganado":    { bg: "bg-emerald-50",text: "text-emerald-700",dot: "bg-emerald-500" },
  "Cerrado perdido":   { bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-400" },
};

const DEFAULT_STATUS = { bg: "bg-ink-ghost", text: "text-ink-muted", dot: "bg-ink-soft" };

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || DEFAULT_STATUS;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
      {status}
    </span>
  );
}

const fechaCorta = (s: string) =>
  new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

type Lead = { id: string; name: string; phone: string; email: string; source: string; status: string; interest: string; created_at: string; agent?: { full_name: string } };

export function LeadsClient({ leads: initialLeads }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [tab, setTab] = useState<"lista" | "stats">("lista");
  const supabase = createClient();

  const statuses = ["Todos", ...Array.from(new Set(initialLeads.map(l => l.status)))];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter(l => {
      const matchSearch = !q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.interest?.toLowerCase().includes(q);
      const matchStatus = filterStatus === "Todos" || l.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [leads, search, filterStatus]);

  const deleteLead = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar al cliente "${name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(id);
    await supabase.from("leads").delete().eq("id", id);
    setLeads(prev => prev.filter(l => l.id !== id));
    setDeleting(null);
  };

  // Stats
  const byStatus = Object.entries(
    leads.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  const bySource = Object.entries(
    leads.reduce((acc, l) => { const k = l.source || "Sin origen"; acc[k] = (acc[k] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const maxSource = bySource[0]?.[1] || 1;

  // Leads por mes (últimos 6)
  const now = new Date();
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const count = leads.filter(l => {
      const c = new Date(l.created_at);
      return c >= d && c <= fin;
    }).length;
    return { mes: d.toLocaleDateString("es-MX", { month: "short" }), count };
  });
  const maxMes = Math.max(...meses.map(m => m.count), 1);

  const cerrados = leads.filter(l => l.status === "Cerrado ganado").length;
  const conversion = leads.length > 0 ? ((cerrados / leads.length) * 100).toFixed(1) : "0";
  const activos = leads.filter(l => !["Cerrado ganado", "Cerrado perdido"].includes(l.status)).length;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-ink-ghost p-1 rounded-xl w-fit">
        {(["lista", "stats"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? "bg-white text-ink shadow-card" : "text-ink-muted hover:text-ink"}`}>
            {t === "lista" ? "Lista" : "Estadísticas"}
          </button>
        ))}
      </div>

      {tab === "stats" && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total clientes", value: leads.length, color: "text-ink" },
              { label: "Activos", value: activos, color: "text-brand-600" },
              { label: "Cerrados ganados", value: cerrados, color: "text-emerald-600" },
              { label: "Tasa de conversión", value: `${conversion}%`, color: "text-amber-600" },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl border border-ink-line shadow-card p-5">
                <div className="text-xs text-ink-muted">{k.label}</div>
                <div className={`text-3xl font-semibold mt-2 ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Leads por mes */}
          <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
            <h3 className="font-semibold text-ink mb-6">Nuevos clientes por mes</h3>
            <div className="flex items-end gap-3 h-40">
              {meses.map(m => (
                <div key={m.mes} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="text-xs text-ink-muted">{m.count || ""}</div>
                  <div className="w-full bg-brand-500 rounded-t-lg"
                    style={{ height: `${(m.count / maxMes) * 100}%`, minHeight: m.count > 0 ? "6px" : "2px", opacity: m.count > 0 ? 1 : 0.2 }} />
                  <div className="text-xs text-ink-muted capitalize">{m.mes}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Por estado */}
            <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
              <h3 className="font-semibold text-ink mb-5">Por estado</h3>
              <div className="space-y-3">
                {byStatus.map(([status, count]) => {
                  const c = STATUS_CONFIG[status] || DEFAULT_STATUS;
                  const pct = Math.round((count / leads.length) * 100);
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className={`flex items-center gap-1.5 font-medium ${c.text}`}>
                          <span className={`w-2 h-2 rounded-full ${c.dot}`}></span>
                          {status}
                        </span>
                        <span className="text-ink-muted"><span className="text-ink font-medium">{count}</span> · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-ink-ghost rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.dot}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Por origen */}
            <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
              <h3 className="font-semibold text-ink mb-5">Por origen</h3>
              <div className="space-y-3">
                {bySource.map(([source, count]) => (
                  <div key={source}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-ink">{source}</span>
                      <span className="text-ink-muted"><span className="text-ink font-medium">{count}</span></span>
                    </div>
                    <div className="h-1.5 bg-ink-ghost rounded-full overflow-hidden">
                      <div className="h-full bg-brand-400 rounded-full" style={{ width: `${(count / maxSource) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "lista" && (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono, interés..."
              className="flex-1 min-w-[220px] pl-4 pr-4 py-2.5 bg-white border border-ink-line rounded-full text-sm focus:outline-none focus:border-brand-300" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-white border border-ink-line rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-brand-300">
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
            {(search || filterStatus !== "Todos") && (
              <button onClick={() => { setSearch(""); setFilterStatus("Todos"); }}
                className="text-xs text-ink-muted hover:text-ink border border-ink-line rounded-full px-3 py-2 bg-white">
                Limpiar ×
              </button>
            )}
          </div>
          <div className="text-xs text-ink-muted px-1">{filtered.length} de {leads.length} clientes</div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-ink-line p-16 text-center">
              <h3 className="font-semibold text-ink">Sin resultados</h3>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-ink-line bg-ink-ghost/40">
                  <tr>
                    {["Cliente", "Contacto", "Interés", "Estado", "Asesor", "Fecha", ""].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30">
                      <td className="px-5 py-4">
                        <Link href={`/admin/leads/${l.id}`} className="font-medium text-sm text-ink hover:text-brand-600">
                          {l.name}
                        </Link>
                        {l.source && <div className="text-xs text-ink-muted mt-0.5">{l.source}</div>}
                      </td>
                      <td className="px-5 py-4 text-sm text-ink-muted">
                        <div>{l.phone || "—"}</div>
                        {l.email && <div className="text-xs">{l.email}</div>}
                      </td>
                      <td className="px-5 py-4 text-xs text-ink-muted max-w-[200px] truncate">{l.interest || "—"}</td>
                      <td className="px-5 py-4"><StatusBadge status={l.status} /></td>
                      <td className="px-5 py-4 text-sm text-ink-muted">{l.agent?.full_name || "Sin asignar"}</td>
                      <td className="px-5 py-4 text-xs text-ink-muted">{fechaCorta(l.created_at)}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/admin/leads/${l.id}`} className="text-xs text-brand-600 hover:underline">Ver →</Link>
                          <button
                            onClick={() => deleteLead(l.id, l.name)}
                            disabled={deleting === l.id}
                            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                          >
                            {deleting === l.id ? "..." : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
