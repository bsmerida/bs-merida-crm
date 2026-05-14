"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fmtMXN } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  "Nuevo":            { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    bar: "#3B82F6" },
  "Contactado":       { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-500",  bar: "#6366F1" },
  "Calificado":       { bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500",  bar: "#8B5CF6" },
  "Visita agendada":  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   bar: "#F59E0B" },
  "Visita realizada": { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-500",  bar: "#F97316" },
  "Oferta":           { bg: "bg-pink-50",    text: "text-pink-700",    dot: "bg-pink-500",    bar: "#EC4899" },
  "Negociación":      { bg: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-500",    bar: "#F43F5E" },
  "Cerrado ganado":   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", bar: "#10B981" },
  "Cerrado perdido":  { bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-400",     bar: "#EF4444" },
};
const DEFAULT_STATUS = { bg: "bg-ink-ghost", text: "text-ink-muted", dot: "bg-ink-soft", bar: "#9CA3AF" };

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || DEFAULT_STATUS;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>{status}
    </span>
  );
}

// Gráfica de barras horizontal reutilizable
function HBarChart({ data, max, colorFn }: { data: [string, number][]; max: number; colorFn?: (k: string) => string }) {
  return (
    <div className="space-y-2.5">
      {data.map(([label, count]) => (
        <div key={label}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-ink truncate max-w-[60%]">{label}</span>
            <span className="text-ink-muted text-xs">{count}</span>
          </div>
          <div className="h-2 bg-ink-ghost rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(count / max) * 100}%`, backgroundColor: colorFn?.(label) || "#5E4B8E" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Gráfica de barras vertical
function VBarChart({ data, color = "#5E4B8E", height = 120 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const labelH = 18;
  const availH = height - labelH;
  return (
    <div style={{ height }}>
      <div className="flex items-end gap-1" style={{ height: availH }}>
        {data.map((d, i) => {
          const barH = d.value > 0 ? Math.max(Math.round((d.value / max) * availH), 4) : 2;
          return (
            <div key={i} className="flex-1 group relative flex flex-col justify-end">
              {d.value > 0 && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                  {d.label}: {d.value}
                </div>
              )}
              <div className="w-full rounded-t-sm transition-all duration-500 hover:opacity-75"
                style={{ height: barH, backgroundColor: d.value > 0 ? color : "#EAE5F2" }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px] text-ink-muted truncate block">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gráfica donut simple con SVG
function DonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="text-sm text-ink-muted text-center py-4">Sin datos</div>;

  let cumAngle = -90;
  const r = 60; const cx = 80; const cy = 80;

  const paths = slices.filter(s => s.value > 0).map(s => {
    const angle = (s.value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, cumAngle - 0.5);
    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
    return { ...s, path, angle, pct: ((s.value / total) * 100).toFixed(1) };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width="160" height="160" className="flex-shrink-0">
        {paths.map((p, i) => (
          <path key={i} d={p.path} fill={p.color} className="hover:opacity-80 transition cursor-default">
            <title>{p.label}: {p.value} ({p.pct}%)</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="white" />
        <text x={cx} y={cy - 6} textAnchor="middle" className="text-lg font-bold" style={{ fontSize: 20, fontWeight: 700, fill: "#2A2640" }}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 10, fill: "#6E6987" }}>total</text>
      </svg>
      <div className="space-y-2 flex-1 min-w-[120px]">
        {paths.map(p => (
          <div key={p.label} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }}></div>
            <span className="text-ink truncate flex-1">{p.label}</span>
            <span className="text-ink-muted font-medium">{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const fechaCorta = (s: string) => new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
const BUDGET_RANGES = [
  { label: "<1M",    min: 0,         max: 1_000_000 },
  { label: "1-2M",   min: 1_000_000, max: 2_000_000 },
  { label: "2-4M",   min: 2_000_000, max: 4_000_000 },
  { label: "4-7M",   min: 4_000_000, max: 7_000_000 },
  { label: "7-15M",  min: 7_000_000, max: 15_000_000 },
  { label: ">15M",   min: 15_000_000, max: Infinity },
];
const AGE_RANGES = [
  { label: "18-25", min: 18, max: 25 },
  { label: "26-35", min: 26, max: 35 },
  { label: "36-45", min: 36, max: 45 },
  { label: "46-55", min: 46, max: 55 },
  { label: "56-65", min: 56, max: 65 },
  { label: "65+",   min: 65, max: 200 },
];

type Lead = any;

export function LeadsClient({ leads: initialLeads, isAdmin = true }: { leads: Lead[]; isAdmin?: boolean }) {
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("lista");
  const [statsSection, setStatsSection] = useState<"general" | "perfil" | "tendencia">("general");
  const supabase = createClient();

  const statuses = ["Todos", ...Array.from(new Set(initialLeads.map((l: any) => l.status)))];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter((l: any) => {
      const matchSearch = !q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.interest?.toLowerCase().includes(q);
      const matchStatus = filterStatus === "Todos" || l.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [leads, search, filterStatus]);

  const deleteLead = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar al cliente "${name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(id);
    try {
      const res = await fetch("/api/leads/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`No se pudo eliminar: ${data.error}`);
        setDeleting(null);
        return;
      }
      setLeads((prev: any) => prev.filter((l: any) => l.id !== id));
    } catch (e: any) {
      alert(`Error: ${e?.message || JSON.stringify(e)}`);
    }
    setDeleting(null);
  };

  // ── STATS ────────────────────────────────────────────────────────────────
  const total = leads.length;
  const cerrados = leads.filter((l: any) => l.status === "Cerrado ganado").length;
  const perdidos = leads.filter((l: any) => l.status === "Cerrado perdido").length;
  const activos = leads.filter((l: any) => !["Cerrado ganado", "Cerrado perdido"].includes(l.status)).length;
  const conversion = total > 0 ? ((cerrados / total) * 100).toFixed(1) : "0";

  // Por estado (donut)
  const byStatus = Object.entries(
    leads.reduce((acc: any, l: any) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {})
  ).sort((a: any, b: any) => b[1] - a[1]) as [string, number][];

  const statusSlices = byStatus.map(([label, value]) => ({
    label, value: value as number,
    color: STATUS_CONFIG[label]?.bar || "#9CA3AF",
  }));

  // Por origen
  const bySource = Object.entries(
    leads.reduce((acc: any, l: any) => {
      const k = l.source || "Sin origen"; acc[k] = (acc[k] || 0) + 1; return acc;
    }, {})
  ).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).slice(0, 8) as [string, number][];
  const maxSource = bySource[0]?.[1] as number || 1;

  // Leads por mes (últimos 6)
  const now = new Date();
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const count = leads.filter((l: any) => { const c = new Date(l.created_at); return c >= d && c <= fin; }).length;
    const cerr = leads.filter((l: any) => {
      const c = new Date(l.last_contact_at || l.created_at);
      return l.status === "Cerrado ganado" && c >= d && c <= fin;
    }).length;
    return { label: d.toLocaleDateString("es-MX", { month: "short" }), value: count, cerr };
  });

  // Por presupuesto
  const byBudget = BUDGET_RANGES.map(r => ({
    label: r.label,
    value: leads.filter((l: any) => {
      const b = l.budget_min || l.budget_max;
      return b && b >= r.min && b < r.max;
    }).length,
  }));

  // Por edad
  const byAge = AGE_RANGES.map(r => ({
    label: r.label,
    value: leads.filter((l: any) => l.age && l.age >= r.min && l.age < r.max).length,
  }));
  const leadsWithAge = leads.filter((l: any) => l.age).length;
  const avgAge = leadsWithAge > 0
    ? Math.round(leads.filter((l: any) => l.age).reduce((s: number, l: any) => s + l.age, 0) / leadsWithAge)
    : null;

  // Por género
  const byGender = Object.entries(
    leads.reduce((acc: any, l: any) => {
      if (l.gender) { acc[l.gender] = (acc[l.gender] || 0) + 1; }
      return acc;
    }, {})
  ) as [string, number][];
  const genderColors: Record<string, string> = { "Hombre": "#5E4B8E", "Mujer": "#EC4899", "Otro": "#F59E0B" };
  const genderSlices = byGender.map(([label, value]) => ({ label, value, color: genderColors[label] || "#9CA3AF" }));

  // Por estado (geografía)
  const byClientState = Object.entries(
    leads.reduce((acc: any, l: any) => {
      if (l.client_state) { acc[l.client_state] = (acc[l.client_state] || 0) + 1; }
      return acc;
    }, {})
  ).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).slice(0, 8) as [string, number][];
  const maxState = byClientState[0]?.[1] as number || 1;

  // Zonas donde quieren comprar/rentar
  // Lee de preferences.zones (guardado por LeadEditor) + fallback a interest
  const zonaCount: Record<string, number> = {};
  leads.forEach((l: any) => {
    // Fuente principal: preferences.zones (array de {name, label, lat, lng})
    const zones = l.preferences?.zones;
    if (Array.isArray(zones) && zones.length > 0) {
      zones.forEach((z: any) => {
        const name = z.name || z.label;
        if (name) zonaCount[name] = (zonaCount[name] || 0) + 1;
      });
    } else if (l.interest) {
      // Fallback: intentar extraer zona del texto de interest capturado por Sofía
      const match = l.interest.match(/(?:en|zona|colonia|fraccionamiento)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][^|,\n]{2,35})/i);
      if (match) {
        const zona = match[1].trim();
        zonaCount[zona] = (zonaCount[zona] || 0) + 1;
      }
    }
  });
  const byZona = Object.entries(zonaCount)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 10) as [string, number][];
  const maxZona = byZona[0]?.[1] as number || 1;


  // Por operación buscada
  const byOperation = [
    { label: "Comprar", value: leads.filter((l: any) => l.search_operation === "Comprar").length, color: "#5E4B8E" },
    { label: "Rentar",  value: leads.filter((l: any) => l.search_operation === "Rentar").length,  color: "#10B981" },
    { label: "Sin definir", value: leads.filter((l: any) => !l.search_operation).length, color: "#D1D5DB" },
  ].filter(x => x.value > 0);

  // Por tipo de inmueble buscado (multi-select → expandir array)
  const bySearchType = Object.entries(
    leads.reduce((acc: any, l: any) => {
      const types = Array.isArray(l.search_types) ? l.search_types : (l.search_types ? [l.search_types] : []);
      types.forEach((t: string) => { acc[t] = (acc[t] || 0) + 1; });
      return acc;
    }, {})
  ).sort((a: any, b: any) => b[1] - a[1]) as [string, number][];
  const maxSearchType = bySearchType[0]?.[1] as number || 1;

  // Tasa de conversión por fuente
  const convBySource = bySource.map(([source, total]) => {
    const cerr = leads.filter((l: any) => l.source === source && l.status === "Cerrado ganado").length;
    return { label: source, total: total as number, cerr, pct: total > 0 ? ((cerr / (total as number)) * 100).toFixed(1) : "0" };
  }).sort((a, b) => Number(b.pct) - Number(a.pct));

  const tabs = [
    { id: "lista", label: "Lista" },
    ...(isAdmin ? [{ id: "stats", label: "Estadísticas" }] : []),
  ] as const;

  const statsTabs = [
    { id: "general", label: "General" },
    { id: "tendencia", label: "Tendencia" },
    { id: "perfil", label: "Perfil del cliente" },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Tabs principales */}
      <div className="flex gap-1 bg-ink-ghost p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-white text-ink shadow-card" : "text-ink-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LISTA ── */}
      {tab === "lista" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono, interés..."
              className="flex-1 min-w-[220px] px-4 py-2.5 bg-white border border-ink-line rounded-full text-sm focus:outline-none focus:border-brand-300" />
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
                  <tr>{["Cliente", "Contacto", "Interés", "Estado", "Asesor", "Fecha", ""].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {filtered.map((l: any) => (
                    <tr key={l.id} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30">
                      <td className="px-5 py-4">
                        <Link href={`/admin/leads/${l.id}`} className="font-medium text-sm text-ink hover:text-brand-600">{l.name}</Link>
                        {l.source && <div className="text-xs text-ink-muted mt-0.5">{l.source}</div>}
                      </td>
                      <td className="px-5 py-4 text-sm text-ink-muted">
                        <div>{l.phone || "—"}</div>
                        {l.email && <div className="text-xs">{l.email}</div>}
                      </td>
                      <td className="px-5 py-4 text-xs text-ink-muted max-w-[180px] truncate">{l.interest || "—"}</td>
                      <td className="px-5 py-4"><StatusBadge status={l.status} /></td>
                      <td className="px-5 py-4 text-sm text-ink-muted">{l.agent?.full_name || "Sin asignar"}</td>
                      <td className="px-5 py-4 text-xs text-ink-muted">{fechaCorta(l.created_at)}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/admin/leads/${l.id}`} className="text-xs text-brand-600 hover:underline">Ver →</Link>
                          <button onClick={() => deleteLead(l.id, l.name)} disabled={deleting === l.id}
                            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40">
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

      {/* ── ESTADÍSTICAS ── */}
      {tab === "stats" && (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="flex gap-1 bg-ink-ghost p-1 rounded-xl w-fit">
            {statsTabs.map(t => (
              <button key={t.id} onClick={() => setStatsSection(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${statsSection === t.id ? "bg-white text-ink shadow-card" : "text-ink-muted hover:text-ink"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── GENERAL ── */}
          {statsSection === "general" && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total clientes",     value: total,          sub: "registrados",     color: "text-ink" },
                  { label: "Activos en proceso",  value: activos,        sub: "sin cerrar",      color: "text-brand-600" },
                  { label: "Cerrados ganados",    value: cerrados,       sub: "operaciones",     color: "text-emerald-600" },
                  { label: "Tasa de conversión",  value: `${conversion}%`, sub: "ganados/total",  color: "text-amber-600" },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-2xl border border-ink-line shadow-card p-5">
                    <div className="text-xs text-ink-muted">{k.label}</div>
                    <div className={`text-3xl font-semibold mt-2 ${k.color}`}>{k.value}</div>
                    <div className="text-xs text-ink-muted mt-1">{k.sub}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Donut por estado */}
                <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
                  <h3 className="font-semibold text-ink mb-5">Distribución por estado</h3>
                  <DonutChart slices={statusSlices} />
                </div>

                {/* Origen */}
                <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
                  <h3 className="font-semibold text-ink mb-5">Origen de clientes</h3>
                  {bySource.length === 0
                    ? <div className="text-sm text-ink-muted text-center py-4">Sin datos de origen</div>
                    : <HBarChart data={bySource} max={maxSource} />}
                </div>
              </div>

              {/* Operación y tipo buscado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
                  <h3 className="font-semibold text-ink mb-5">Operación buscada</h3>
                  {byOperation.every(x => x.label === "Sin definir") ? (
                    <div className="text-sm text-ink-muted text-center py-4">Aún no hay datos — llena el campo en cada cliente</div>
                  ) : (
                    <div className="space-y-3">
                      {byOperation.map(op => (
                        <div key={op.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-ink">{op.label}</span>
                            <span className="text-ink-muted font-medium">{op.value} clientes</span>
                          </div>
                          <div className="h-2.5 bg-ink-ghost rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(op.value / total) * 100}%`, backgroundColor: op.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
                  <h3 className="font-semibold text-ink mb-5">Tipo de inmueble buscado</h3>
                  {bySearchType.length === 0 || (bySearchType.length === 1 && bySearchType[0][0] === "Sin definir") ? (
                    <div className="text-sm text-ink-muted text-center py-4">Aún no hay datos — llena el campo en cada cliente</div>
                  ) : (
                    <HBarChart data={bySearchType.filter(([k]) => k !== "Sin definir")} max={maxSearchType} />
                  )}
                </div>
              </div>

              {/* Conversión por fuente */}
              <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
                <h3 className="font-semibold text-ink mb-5">Tasa de conversión por origen</h3>
                {convBySource.length === 0
                  ? <div className="text-sm text-ink-muted text-center py-4">Sin datos suficientes</div>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b border-ink-line">
                          {["Origen", "Leads", "Cerrados", "Conversión"].map(h => (
                            <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-3 py-2">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {convBySource.map(r => (
                            <tr key={r.label} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30">
                              <td className="px-3 py-3 text-sm text-ink">{r.label}</td>
                              <td className="px-3 py-3 text-sm text-ink-muted">{r.total}</td>
                              <td className="px-3 py-3 text-sm text-emerald-600">{r.cerr}</td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-ink-ghost rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${r.pct}%` }} />
                                  </div>
                                  <span className="text-xs font-medium text-ink">{r.pct}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* ── TENDENCIA ── */}
          {statsSection === "tendencia" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
                <h3 className="font-semibold text-ink mb-6">Nuevos clientes vs cerrados — últimos 6 meses</h3>
                <div className="flex items-end gap-3 h-48">
                  {meses.map(m => (
                    <div key={m.label} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="w-full flex flex-col items-center gap-0.5">
                        <div className="text-xs text-ink-muted text-center">{m.value || ""}</div>
                        <div className="w-full flex gap-0.5 items-end" style={{ height: "160px" }}>
                          <div className="flex-1 bg-brand-400 rounded-t-sm hover:bg-brand-500 transition"
                            style={{ height: `${(m.value / Math.max(...meses.map(x => x.value), 1)) * 100}%`, minHeight: m.value > 0 ? 4 : 1 }} />
                          <div className="flex-1 bg-emerald-400 rounded-t-sm hover:bg-emerald-500 transition"
                            style={{ height: `${(m.cerr / Math.max(...meses.map(x => x.cerr), 1)) * 100}%`, minHeight: m.cerr > 0 ? 4 : 1 }} />
                        </div>
                      </div>
                      <span className="text-xs text-ink-muted capitalize">{m.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-6 mt-4 text-xs text-ink-muted">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-brand-400"></div><span>Nuevos leads</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-400"></div><span>Cerrados ganados</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ── PERFIL DEL CLIENTE ── */}
          {statsSection === "perfil" && (
            <div className="space-y-6">
              {(leadsWithAge === 0 && byGender.length === 0 && byClientState.length === 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
                  💡 Aún no hay datos de perfil. Los asesores pueden llenar edad, género y ciudad del cliente en la ficha de cada lead.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Por edad */}
                <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-ink">Edad</h3>
                    {avgAge && <span className="text-xs text-ink-muted">Promedio: <span className="font-semibold text-ink">{avgAge} años</span></span>}
                  </div>
                  {leadsWithAge === 0
                    ? <div className="text-sm text-ink-muted text-center py-8">Sin datos de edad</div>
                    : <VBarChart data={byAge} color="#5E4B8E" height={120} />}
                  {leadsWithAge > 0 && <div className="text-xs text-ink-muted mt-2">{leadsWithAge} de {total} clientes con edad registrada</div>}
                </div>

                {/* Por género */}
                <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
                  <h3 className="font-semibold text-ink mb-5">Género</h3>
                  {genderSlices.length === 0
                    ? <div className="text-sm text-ink-muted text-center py-8">Sin datos de género</div>
                    : <DonutChart slices={genderSlices} />}
                </div>
              </div>

              {/* Por presupuesto */}
              <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
                <h3 className="font-semibold text-ink mb-5">Distribución por presupuesto</h3>
                {byBudget.every(b => b.value === 0)
                  ? <div className="text-sm text-ink-muted text-center py-4">Sin datos de presupuesto numérico. Llena los campos "Presupuesto mínimo/máximo" en cada cliente.</div>
                  : <VBarChart data={byBudget} color="#5E4B8E" height={140} />}
              </div>

              {/* Por estado geográfico */}
              <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
                <h3 className="font-semibold text-ink mb-5">Clientes por estado (geografía)</h3>
                {byClientState.length === 0
                  ? <div className="text-sm text-ink-muted text-center py-4">Sin datos geográficos del cliente.</div>
                  : <HBarChart data={byClientState} max={maxState} />}
              </div>


              {/* Zonas de interés */}
              <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
                <h3 className="font-semibold text-ink mb-5">Zonas de interés</h3>
                {byZona.length === 0
                  ? <div className="text-sm text-ink-muted text-center py-4">Sin datos de zona. Llena el campo "Zonas de interés" en el perfil de cada cliente.</div>
                  : <HBarChart data={byZona} max={maxZona} colorFn={() => "#5E4B8E"} />}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
