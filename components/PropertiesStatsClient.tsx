"use client";
import { useState } from "react";
import { fmtMXN } from "@/lib/utils";

type Prop = {
  id: string; title: string; type: string; operation: string; status: string;
  price: number; zone: string | null; city: string; reference: string | null;
  is_published: boolean; created_at: string;
  views_count: number; inquiries_count: number;
};

// Gráfica de barras horizontal
function HBar({ data, max, color = "#5E4B8E" }: { data: [string, number][]; max: number; color?: string }) {
  return (
    <div className="space-y-2.5">
      {data.map(([label, value]) => (
        <div key={label}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-ink truncate max-w-[60%]">{label}</span>
            <span className="text-ink-muted text-xs font-medium">{value}</span>
          </div>
          <div className="h-2 bg-ink-ghost rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Gráfica de barras vertical
function VBar({ data, color = "#5E4B8E", height = 120 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          {d.value > 0 && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
              {d.label}: {d.value}
            </div>
          )}
          <div className="w-full rounded-t-sm transition-all duration-500 hover:opacity-80"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 1, backgroundColor: d.value > 0 ? color : "#EAE5F2" }} />
          <span className="text-[9px] text-ink-muted truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// Donut
function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function DonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="text-sm text-ink-muted text-center py-4">Sin datos</div>;
  let cumAngle = -90;
  const r = 55; const cx = 70; const cy = 70;
  const paths = slices.filter(s => s.value > 0).map(s => {
    const angle = (s.value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, cumAngle - 0.5);
    const largeArc = angle > 180 ? 1 : 0;
    return { ...s, path: `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`, pct: ((s.value / total) * 100).toFixed(1) };
  });
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width="140" height="140" className="flex-shrink-0">
        {paths.map((p, i) => (
          <path key={i} d={p.path} fill={p.color} className="hover:opacity-80 transition cursor-default">
            <title>{p.label}: {p.value} ({p.pct}%)</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="white" />
        <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 18, fontWeight: 700, fill: "#2A2640" }}>{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 9, fill: "#6E6987" }}>total</text>
      </svg>
      <div className="space-y-1.5 flex-1 min-w-[100px]">
        {paths.map(p => (
          <div key={p.label} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }}></div>
            <span className="text-ink truncate flex-1">{p.label}</span>
            <span className="text-ink font-medium">{p.value}</span>
            <span className="text-ink-muted">({p.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  "Casa": "#5E4B8E", "Departamento": "#8B5CF6", "Terreno": "#10B981",
  "Oficina": "#F59E0B", "Local": "#EC4899", "Bodega": "#6B7280",
};
const STATUS_COLORS: Record<string, string> = {
  "Disponible": "#10B981", "Reservada": "#F59E0B", "Vendida": "#EF4444",
  "Rentada": "#3B82F6", "Pausada": "#9CA3AF",
};
const PRICE_RANGES = [
  { label: "<1M",   min: 0,           max: 1_000_000 },
  { label: "1-3M",  min: 1_000_000,   max: 3_000_000 },
  { label: "3-6M",  min: 3_000_000,   max: 6_000_000 },
  { label: "6-10M", min: 6_000_000,   max: 10_000_000 },
  { label: "10-20M",min: 10_000_000,  max: 20_000_000 },
  { label: ">20M",  min: 20_000_000,  max: Infinity },
];

const DIVISAS = [
  { code: "MXN", label: "MXN $", rate: 1 },
  { code: "USD", label: "USD $", rate: 0.058 },
  { code: "EUR", label: "EUR €", rate: 0.053 },
];

export function PropertiesStatsClient({ props, viewsTrend, totalViews, totalInquiries }: {
  props: Prop[];
  viewsTrend: { date: string; count: number }[];
  totalViews: number;
  totalInquiries: number;
}) {
  const [section, setSection] = useState<"inventario" | "trafico" | "top">("inventario");
  const [divisa, setDivisa] = useState("MXN");
  
  const divisaConfig = DIVISAS.find(d => d.code === divisa) || DIVISAS[0];
  const fmtDivisa = (n: number) => {
    const converted = n * divisaConfig.rate;
    return new Intl.NumberFormat("es-MX", { 
      style: "currency", 
      currency: divisa === "MXN" ? "MXN" : divisa === "USD" ? "USD" : "EUR",
      maximumFractionDigits: 0 
    }).format(converted);
  };

  const published = props.filter(p => p.is_published).length;
  const available = props.filter(p => p.status === "Disponible").length;
  const valorInventario = props.filter(p => p.status === "Disponible").reduce((s, p) => s + Number(p.price), 0);
  const convProp = totalViews > 0 ? ((totalInquiries / totalViews) * 100).toFixed(1) : "0";

  // Por tipo
  const byType = Object.entries(
    props.reduce((acc, p) => { acc[p.type] = (acc[p.type] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]) as [string, number][];

  // Por operación
  const byOp = Object.entries(
    props.reduce((acc, p) => { acc[p.operation] = (acc[p.operation] || 0) + 1; return acc; }, {} as Record<string, number>)
  ) as [string, number][];

  // Por estado
  const byStatus = Object.entries(
    props.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]) as [string, number][];

  // Por ciudad
  const byCity = Object.entries(
    props.reduce((acc, p) => { const k = p.city || "Sin ciudad"; acc[k] = (acc[k] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 8) as [string, number][];
  const maxCity = byCity[0]?.[1] || 1;

  // Por precio
  const byPrice = PRICE_RANGES.map(r => ({
    label: r.label,
    value: props.filter(p => Number(p.price) >= r.min && Number(p.price) < r.max).length,
  }));

  // Top vistas
  const topViews = [...props].sort((a, b) => b.views_count - a.views_count).slice(0, 10);
  const maxViews = topViews[0]?.views_count || 1;

  // Top solicitudes
  const topInq = [...props].sort((a, b) => b.inquiries_count - a.inquiries_count)
    .filter(p => p.inquiries_count > 0).slice(0, 10);
  const maxInq = topInq[0]?.inquiries_count || 1;

  // Sin vistas
  const sinVistas = props.filter(p => p.views_count === 0 && p.is_published).slice(0, 10);

  // Tendencia vistas
  const maxTrend = Math.max(...viewsTrend.map(d => d.count), 1);
  const showLabel = (i: number) => i === 0 || i === 14 || i === 29;

  const sections = [
    { id: "inventario", label: "Inventario" },
    { id: "trafico",    label: "Tráfico" },
    { id: "top",        label: "Top propiedades" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Selector de divisa */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-muted">Divisa:</span>
        <div className="flex gap-1 bg-ink-ghost p-1 rounded-xl">
          {DIVISAS.map(d => (
            <button key={d.code} onClick={() => setDivisa(d.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${divisa === d.code ? "bg-white text-ink shadow-card" : "text-ink-muted hover:text-ink"}`}>
              {d.label}
            </button>
          ))}
        </div>
        {divisa !== "MXN" && <span className="text-xs text-ink-muted">Tipo de cambio aprox. · actualiza manualmente</span>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total inventario",  value: props.length,   sub: "propiedades",     color: "text-ink" },
          { label: "Disponibles",       value: available,       sub: "en venta/renta",  color: "text-emerald-600" },
          { label: "Vistas totales",    value: totalViews,      sub: "en el sitio",     color: "text-brand-600" },
          { label: "Conversión",        value: `${convProp}%`,  sub: "vistas→solicitud",color: "text-amber-600" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-ink-line shadow-card p-5">
            <div className="text-xs text-ink-muted">{k.label}</div>
            <div className={`text-3xl font-semibold mt-2 ${k.color}`}>{k.value}</div>
            <div className="text-xs text-ink-muted mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Valor de inventario */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white">
        <div className="text-sm text-white/70">Valor total del inventario disponible</div>
        <div className="text-4xl font-semibold tracking-tight mt-2">{fmtDivisa(valorInventario)}</div>
        <div className="text-sm text-white/60 mt-1">{published} propiedades publicadas · {available} disponibles</div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-ink-ghost p-1 rounded-xl w-fit">
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${section === s.id ? "bg-white text-ink shadow-card" : "text-ink-muted hover:text-ink"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── INVENTARIO ── */}
      {section === "inventario" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
              <h3 className="font-semibold text-ink mb-5">Por tipo</h3>
              <DonutChart slices={byType.map(([label, value]) => ({ label, value, color: TYPE_COLORS[label] || "#9CA3AF" }))} />
            </div>
            <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
              <h3 className="font-semibold text-ink mb-5">Por operación</h3>
              <DonutChart slices={byOp.map(([label, value]) => ({ label, value, color: label === "Venta" ? "#5E4B8E" : "#10B981" }))} />
            </div>
            <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
              <h3 className="font-semibold text-ink mb-5">Por estado</h3>
              <DonutChart slices={byStatus.map(([label, value]) => ({ label, value, color: STATUS_COLORS[label] || "#9CA3AF" }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
              <h3 className="font-semibold text-ink mb-5">Distribución por precio</h3>
              <VBar data={byPrice} color="#5E4B8E" height={140} />
            </div>
            <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
              <h3 className="font-semibold text-ink mb-5">Por estado</h3>
              <HBar data={byState} max={maxState} />
            </div>
          </div>
        </div>
      )}

      {/* ── TRÁFICO ── */}
      {section === "trafico" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
            <h3 className="font-semibold text-ink mb-6">Vistas del sitio — últimos 30 días</h3>
            {totalViews === 0 ? (
              <div className="h-24 flex items-center justify-center text-sm text-ink-muted bg-ink-ghost rounded-xl">
                Sin vistas registradas aún. Las vistas se registran automáticamente cuando alguien visita una propiedad.
              </div>
            ) : (
              <>
                <div className="flex items-end gap-[2px] h-32">
                  {viewsTrend.map((d, i) => (
                    <div key={d.date} className="flex-1 flex flex-col items-end group relative">
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                        {new Date(d.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}: {d.count}
                      </div>
                      <div className="w-full bg-brand-400 hover:bg-brand-500 rounded-t-sm transition"
                        style={{ height: `${Math.max((d.count / maxTrend) * 100, d.count > 0 ? 4 : 1)}%` }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-[2px] mt-1">
                  {viewsTrend.map((d, i) => (
                    <div key={d.date} className="flex-1 text-center">
                      {showLabel(i) && <span className="text-[9px] text-ink-muted">{new Date(d.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TOP PROPIEDADES ── */}
      {section === "top" && (
        <div className="space-y-6">
          {/* Top vistas */}
          <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
            <h3 className="font-semibold text-ink mb-5">Top 10 — más vistas</h3>
            {topViews.every(p => p.views_count === 0) ? (
              <div className="text-sm text-ink-muted text-center py-4">Sin vistas registradas aún.</div>
            ) : (
              <div className="space-y-3">
                {topViews.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-ink-muted w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink truncate">{p.title}</div>
                      <div className="text-xs text-ink-muted">{p.reference || p.city}</div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-semibold text-ink">👁 {p.views_count}</div>
                    </div>
                    <div className="w-24 h-1.5 bg-ink-ghost rounded-full overflow-hidden">
                      <div className="h-full bg-brand-400 rounded-full" style={{ width: `${(p.views_count / maxViews) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top solicitudes */}
          <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
            <h3 className="font-semibold text-ink mb-5">Top 10 — más solicitudes</h3>
            {topInq.length === 0 ? (
              <div className="text-sm text-ink-muted text-center py-4">Sin solicitudes registradas aún.</div>
            ) : (
              <div className="space-y-3">
                {topInq.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-ink-muted w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink truncate">{p.title}</div>
                      <div className="text-xs text-ink-muted">{p.reference || p.city}</div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-semibold text-emerald-600">✉️ {p.inquiries_count}</div>
                    </div>
                    <div className="w-24 h-1.5 bg-ink-ghost rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(p.inquiries_count / maxInq) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Propiedades sin vistas */}
          {sinVistas.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <h3 className="font-semibold text-amber-800 mb-1">⚠️ Propiedades publicadas sin vistas</h3>
              <p className="text-xs text-amber-700 mb-4">Estas propiedades están publicadas pero nadie las ha visitado. Considera mejorar sus fotos, descripción o precio.</p>
              <div className="space-y-2">
                {sinVistas.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-amber-900 truncate flex-1">{p.title}</span>
                    <span className="text-amber-600 text-xs ml-2">{fmtMXN(Number(p.price))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
