"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fmtMXN } from "@/lib/utils";
import { media as mediaDe, mediana as medianaDe, modaPorRango } from "@/lib/stats-descriptivas";
import { LeadsKanban } from "@/components/LeadsKanban";

// bg/text/dot: para las etiquetas de estado (tablero y lista) — un color por
// estado ayuda a distinguirlos de un vistazo entre 9 posibles.
// bar: para las gráficas de Estadísticas — ahí sí debe ser la paleta de marca
// (navy → gold por etapa, verde/rojo solo para el resultado final).
const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  "Nuevo":            { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500",    bar: "#1C2B4B" },
  "Contactado":       { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-500",  bar: "#2C3B5E" },
  "Calificado":       { bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500",  bar: "#3D5278" },
  "Visita agendada":  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   bar: "#6B6468" },
  "Visita realizada": { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-500",  bar: "#8C6040" },
  "Oferta":           { bg: "bg-pink-50",    text: "text-pink-700",    dot: "bg-pink-500",    bar: "#AD7A55" },
  "Negociación":      { bg: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-500",    bar: "#C4956A" },
  "Cerrado ganado":   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", bar: "#10B981" },
  "Cerrado perdido":  { bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-400",     bar: "#EF4444" },
};
const DEFAULT_STATUS = { bg: "bg-stone", text: "text-[#6b7385]", dot: "bg-stone-dk", bar: "#D4CFC6" };

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
            <span className="text-navy truncate max-w-[60%]">{label}</span>
            <span className="text-[#6b7385] text-xs">{count}</span>
          </div>
          <div className="h-2 bg-stone rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(count / max) * 100}%`, backgroundColor: colorFn?.(label) || "#1C2B4B" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Gráfica de barras vertical
function VBarChart({ data, color = "#1C2B4B", height = 120 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
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
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-navy text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                  {d.label}: {d.value}
                </div>
              )}
              <div className="w-full rounded-t-sm transition-all duration-500 hover:opacity-75"
                style={{ height: barH, backgroundColor: d.value > 0 ? color : "#EDE9E1" }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px] text-[#6b7385] truncate block">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gráfica donut simple con SVG
function DonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="text-sm text-[#6b7385] text-center py-4">Sin datos</div>;

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
        <text x={cx} y={cy - 6} textAnchor="middle" className="text-lg font-bold" style={{ fontSize: 20, fontWeight: 700, fill: "#1C2B4B" }}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 10, fill: "#6b7385" }}>total</text>
      </svg>
      <div className="space-y-2 flex-1 min-w-[120px]">
        {paths.map(p => (
          <div key={p.label} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }}></div>
            <span className="text-navy truncate flex-1">{p.label}</span>
            <span className="text-[#6b7385] font-medium">{p.pct}%</span>
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

// Media y mediana de presupuesto por periodo (dos líneas, misma escala — nunca
// doble eje). La moda (rango más repetido) es categórica, no un valor en la
// misma escala de dinero, así que se muestra aparte como etiqueta por periodo
// en vez de forzarla como una tercera línea numérica.
function BudgetTrendChart({ data, max }: {
  data: { label: string; media: number | null; mediana: number | null; moda: string | null; n: number }[];
  max: number;
}) {
  const W = 600, H = 160, padX = 14, padTop = 22, padBottom = 10;
  const plotW = W - padX * 2, plotH = H - padTop - padBottom;
  const n = data.length;
  const x = (i: number) => padX + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  const y = (v: number) => padTop + plotH - (v / max) * plotH;

  const linePath = (key: "media" | "mediana") => {
    const pts = data.map((d, i) => (d[key] != null ? `${x(i)},${y(d[key] as number)}` : null)).filter(Boolean);
    return pts.length > 1 ? `M ${pts.join(" L ")}` : "";
  };

  // Último periodo con datos — las tres cifras grandes arriba son de ese mes.
  const ultimo = [...data].reverse().find(d => d.n > 0) || null;

  return (
    <div>
      {ultimo && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Media", value: fmtMXN(ultimo.media!), color: "text-navy" },
            { label: "Mediana", value: fmtMXN(ultimo.mediana!), color: "text-[#8C6040]" },
            { label: "Moda (rango)", value: ultimo.moda || "Sin datos", color: "text-navy" },
          ].map(k => (
            <div key={k.label} className="bg-cream rounded-[20px] px-4 py-3">
              <div className="text-[10px] text-[#6b7385] uppercase tracking-wide font-semibold">{k.label}</div>
              <div className={`text-lg font-semibold mt-0.5 ${k.color}`}>{k.value}</div>
            </div>
          ))}
          <div className="col-span-3 text-[11px] text-[#6b7385] -mt-1">
            {ultimo.label} · {ultimo.n} cliente{ultimo.n !== 1 ? "s" : ""} con presupuesto registrado
          </div>
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <path d={linePath("media")} fill="none" stroke="#1C2B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={linePath("mediana")} fill="none" stroke="#C4956A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={i}>
            {d.media != null && (
              <g className="hover:opacity-75 transition">
                <circle cx={x(i)} cy={y(d.media)} r="4" fill="#1C2B4B" />
                <title>{`Media ${d.label}: ${fmtMXN(d.media)} (n=${d.n})`}</title>
              </g>
            )}
            {d.mediana != null && (
              <g className="hover:opacity-75 transition">
                <circle cx={x(i)} cy={y(d.mediana)} r="4" fill="#C4956A" />
                <title>{`Mediana ${d.label}: ${fmtMXN(d.mediana)} (n=${d.n})`}</title>
              </g>
            )}
          </g>
        ))}
      </svg>

      <div className="flex items-center gap-5 text-xs text-[#6b7385] mt-1">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-navy inline-block" />Media</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gold inline-block" />Mediana</span>
      </div>

      <div className="grid gap-1 mt-2 mb-4" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {data.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-[#6b7385]">{d.label}</div>
        ))}
      </div>

      <div>
        <div className="text-[10px] text-[#6b7385] uppercase tracking-wide font-semibold mb-2">Moda (rango más común) por mes</div>
        <div className="flex flex-wrap gap-1.5">
          {data.filter(d => d.moda).map(d => (
            <span key={d.label} className="bg-stone text-navy text-xs font-medium px-3 py-1 rounded-full">
              {d.label}: {d.moda}
            </span>
          ))}
          {data.every(d => !d.moda) && <span className="text-xs text-[#6b7385]">Sin datos todavía</span>}
        </div>
      </div>

    </div>
  );
}

// En móvil, Figma no muestra el tablero (kanban) ni la tabla de Lista — una
// sola lista de tarjetas filtrable por estado, para las dos pestañas.
function subtituloLead(l: any) {
  const tipos = Array.isArray(l.search_types) ? l.search_types.join(", ") : l.search_types;
  const presupuesto = l.budget_max ? `hasta $${(Number(l.budget_max) / 1_000_000).toFixed(1)}M` : null;
  return [tipos, presupuesto].filter(Boolean).join(" · ") || l.interest || "Sin detalles";
}

function MobileLeadList({ leads }: { leads: any[] }) {
  if (leads.length === 0) {
    return <div className="bg-white rounded-[28px] p-10 text-center text-sm text-[#6b7385]">Sin resultados.</div>;
  }
  return (
    <div className="space-y-2.5">
      {leads.map(l => (
        <Link key={l.id} href={`/admin/leads/${l.id}`}
          className="flex items-center gap-3 bg-white rounded-[22px] p-4 hover:shadow-float transition-shadow">
          <div className="w-11 h-11 rounded-full bg-cream text-navy flex items-center justify-center text-sm font-semibold shrink-0">
            {l.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-navy truncate">{l.name}</p>
            <p className="text-xs text-[#6b7385] truncate">{subtituloLead(l)}</p>
          </div>
          <StatusBadge status={l.status} />
        </Link>
      ))}
    </div>
  );
}
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
  const [tab, setTab] = useState<string>("tablero");
  const [statsSection, setStatsSection] = useState<"general" | "perfil" | "tendencia">("general");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
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
    color: STATUS_CONFIG[label]?.bar || "#D4CFC6",
  }));

  // Por origen
  const bySource = Object.entries(
    leads.reduce((acc: any, l: any) => {
      const k = l.source || "Sin origen"; acc[k] = (acc[k] || 0) + 1; return acc;
    }, {})
  ).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).slice(0, 8) as [string, number][];
  const maxSource = bySource[0]?.[1] as number || 1;

  // Últimos 6 meses — se reutiliza para "leads por mes" y "presupuesto por periodo"
  const now = new Date();
  const rangosMensuales = Array.from({ length: 6 }, (_, i) => {
    const inicio = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0, 23, 59, 59);
    return { inicio, fin, label: inicio.toLocaleDateString("es-MX", { month: "short" }) };
  });

  // Leads por mes (últimos 6)
  const meses = rangosMensuales.map(({ inicio, fin, label }) => {
    const count = leads.filter((l: any) => { const c = new Date(l.created_at); return c >= inicio && c <= fin; }).length;
    const cerr = leads.filter((l: any) => {
      const c = new Date(l.last_contact_at || l.created_at);
      return l.status === "Cerrado ganado" && c >= inicio && c <= fin;
    }).length;
    return { label, value: count, cerr };
  });

  // Presupuesto promedio por periodo: media, mediana y moda (rango más común,
  // de BUDGET_RANGES) por mes, a partir del campo estructurado de presupuesto
  // (budget_min/budget_max) — es el dato que sí se llena de forma confiable
  // (91% de los clientes), no las notas de texto libre.
  // Descarta valores debajo de $1,000: ya encontramos un caso real
  // (budget_max=3.7) de alguien capturando "3.7 millones" directo como 3.7 —
  // ningún presupuesto real de propiedad es así de chico, y ese solo dato
  // distorsionaba por completo el mes en el que cayó. No es que se cuenten
  // los clientes sin presupuesto como $0 (esos ya se excluían bien); es este
  // tipo de error de captura el que había que filtrar.
  const PRESUPUESTO_MINIMO_VALIDO = 1_000;
  const valorPresupuesto = (l: any): number | null => {
    const vals = [l.budget_min, l.budget_max].filter((v: any) => typeof v === "number" && v >= PRESUPUESTO_MINIMO_VALIDO);
    return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
  };
  const presupuestoPorMes = rangosMensuales.map(({ inicio, fin, label }) => {
    const valores = leads
      .filter((l: any) => { const c = new Date(l.created_at); return c >= inicio && c <= fin; })
      .map(valorPresupuesto)
      .filter((v: unknown): v is number => v !== null)
      .sort((a: number, b: number) => a - b);
    return { label, media: mediaDe(valores), mediana: medianaDe(valores), moda: modaPorRango(valores, BUDGET_RANGES), n: valores.length };
  });
  const maxPresupuesto = Math.max(1, ...presupuestoPorMes.flatMap(p => [p.media ?? 0, p.mediana ?? 0]));

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
  const genderColors: Record<string, string> = { "Hombre": "#1C2B4B", "Mujer": "#C4956A", "Otro": "#D4CFC6" };
  const genderSlices = byGender.map(([label, value]) => ({ label, value, color: genderColors[label] || "#D4CFC6" }));

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
    { label: "Comprar", value: leads.filter((l: any) => l.search_operation === "Comprar").length, color: "#1C2B4B" },
    { label: "Rentar",  value: leads.filter((l: any) => l.search_operation === "Rentar").length,  color: "#C4956A" },
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
    { id: "tablero", label: "Tablero" },
    { id: "lista", label: "Lista" },
    ...(isAdmin ? [{ id: "stats", label: "Estadísticas" }] : []),
  ] as const;

  const statsTabs = [
    { id: "general", label: "General" },
    { id: "tendencia", label: "Tendencia" },
    { id: "perfil", label: "Perfil del cliente" },
  ] as const;

  // Móvil: una sola vista de lista filtrable por estado, para Tablero y Lista
  // por igual — Figma no ofrece el kanban ni la tabla en pantallas chicas.
  const mobileToolbarAndList = (
    <div className="md:hidden space-y-3">
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre, teléfono, interés..."
        className="w-full px-5 py-3 bg-white rounded-full text-sm text-navy focus:outline-none focus:ring-1 focus:ring-gold/40 placeholder:text-[#6b7385]" />
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`text-[13px] font-medium px-4 py-2 rounded-full transition-colors ${
              filterStatus === s ? "bg-navy text-white" : "bg-white text-navy hover:bg-cream"}`}>
            {s === "Todos" ? "Todos" : s}
          </button>
        ))}
      </div>
      <MobileLeadList leads={filtered} />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tabs principales */}
      <div className="flex gap-1 bg-stone p-1 rounded-full w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === t.id ? "bg-navy text-white" : "text-navy hover:bg-cream"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TABLERO ── */}
      {tab === "tablero" && (
        <>
          {mobileToolbarAndList}
          <div className="hidden md:block">
            <p className="text-sm text-[#6b7385] mb-3">Arrastra una tarjeta para cambiar su etapa</p>
            <LeadsKanban leads={leads} setLeads={setLeads} />
          </div>
        </>
      )}

      {/* ── LISTA ── */}
      {tab === "lista" && (
        <>
          {mobileToolbarAndList}
          <div className="hidden md:flex flex-wrap items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono, interés..."
              className="flex-1 min-w-[220px] px-5 py-3 bg-white rounded-full text-sm text-navy focus:outline-none focus:ring-1 focus:ring-gold/40 placeholder:text-[#6b7385]" />
            <div className="relative">
              <button type="button" onClick={() => setStatusMenuOpen(o => !o)}
                className="bg-white rounded-full px-5 py-3 text-sm font-medium text-navy flex items-center gap-2">
                {filterStatus === "Todos" ? "Todos los estados" : filterStatus}
                <svg className="w-3 h-3 text-navy/50" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {statusMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-[220px] bg-white rounded-[24px] shadow-float z-50 overflow-hidden py-2 px-2 max-h-72 overflow-y-auto">
                  {statuses.map(s => (
                    <button key={s} type="button" onClick={() => { setFilterStatus(s); setStatusMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 rounded-[18px] text-sm transition-colors ${filterStatus === s ? "text-gold bg-cream font-medium" : "text-navy hover:bg-cream"}`}>
                      {s === "Todos" ? "Todos los estados" : s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {(search || filterStatus !== "Todos") && (
              <button onClick={() => { setSearch(""); setFilterStatus("Todos"); }}
                className="text-xs text-[#6b7385] hover:text-navy bg-white rounded-full px-4 py-3">
                Limpiar ×
              </button>
            )}
          </div>
          <div className="hidden md:block">
            <div className="text-xs text-[#6b7385] px-1 mb-3">{filtered.length} de {leads.length} clientes</div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-[28px] p-16 text-center">
                <h3 className="font-semibold text-navy">Sin resultados</h3>
              </div>
            ) : (
              <div className="bg-white rounded-[28px] shadow-float overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-stone bg-cream">
                    <tr>{["Cliente", "Contacto", "Interés", "Estado", "Asesor", "Fecha", ""].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-[#6b7385] uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {filtered.map((l: any) => (
                      <tr key={l.id} className="border-b border-stone last:border-0 hover:bg-cream">
                        <td className="px-5 py-4">
                          <Link href={`/admin/leads/${l.id}`} className="font-medium text-sm text-navy hover:text-gold">{l.name}</Link>
                          {l.source && <div className="text-xs text-[#6b7385] mt-0.5">{l.source}</div>}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#6b7385]">
                          <div>{l.phone || "—"}</div>
                          {l.email && <div className="text-xs">{l.email}</div>}
                        </td>
                        <td className="px-5 py-4 text-xs text-[#6b7385] max-w-[180px] truncate">{l.interest || "—"}</td>
                        <td className="px-5 py-4"><StatusBadge status={l.status} /></td>
                        <td className="px-5 py-4 text-sm text-[#6b7385]">{l.agent?.full_name || "Sin asignar"}</td>
                        <td className="px-5 py-4 text-xs text-[#6b7385]">{fechaCorta(l.created_at)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link href={`/admin/leads/${l.id}`} className="text-xs text-gold hover:underline">Ver →</Link>
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
              </div>
            )}
          </div>
        </>
      )}

      {/* ── ESTADÍSTICAS ── */}
      {tab === "stats" && (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="flex gap-1 bg-stone p-1 rounded-full w-fit">
            {statsTabs.map(t => (
              <button key={t.id} onClick={() => setStatsSection(t.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${statsSection === t.id ? "bg-navy text-white" : "text-[#6b7385] hover:bg-cream"}`}>
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
                  { label: "Total clientes",     value: total,          sub: "registrados",     color: "text-navy" },
                  { label: "Activos en proceso",  value: activos,        sub: "sin cerrar",      color: "text-gold" },
                  { label: "Cerrados ganados",    value: cerrados,       sub: "operaciones",     color: "text-emerald-600" },
                  { label: "Tasa de conversión",  value: `${conversion}%`, sub: "ganados/total",  color: "text-amber-600" },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-[28px] shadow-float p-5">
                    <div className="text-xs text-[#6b7385]">{k.label}</div>
                    <div className={`text-3xl font-semibold mt-2 ${k.color}`}>{k.value}</div>
                    <div className="text-xs text-[#6b7385] mt-1">{k.sub}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Donut por estado */}
                <div className="bg-white rounded-[28px] shadow-float p-6">
                  <h3 className="font-serif text-navy text-[28px] mb-5">Distribución por estado</h3>
                  <DonutChart slices={statusSlices} />
                </div>

                {/* Origen */}
                <div className="bg-white rounded-[28px] shadow-float p-6">
                  <h3 className="font-serif text-navy text-[28px] mb-5">Origen de clientes</h3>
                  {bySource.length === 0
                    ? <div className="text-sm text-[#6b7385] text-center py-4">Sin datos de origen</div>
                    : <HBarChart data={bySource} max={maxSource} />}
                </div>
              </div>

              {/* Operación y tipo buscado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-[28px] shadow-float p-6">
                  <h3 className="font-serif text-navy text-[28px] mb-5">Operación buscada</h3>
                  {byOperation.every(x => x.label === "Sin definir") ? (
                    <div className="text-sm text-[#6b7385] text-center py-4">Aún no hay datos — llena el campo en cada cliente</div>
                  ) : (
                    <div className="space-y-3">
                      {byOperation.map(op => (
                        <div key={op.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-navy">{op.label}</span>
                            <span className="text-[#6b7385] font-medium">{op.value} clientes</span>
                          </div>
                          <div className="h-2.5 bg-stone rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(op.value / total) * 100}%`, backgroundColor: op.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-[28px] shadow-float p-6">
                  <h3 className="font-serif text-navy text-[28px] mb-5">Tipo de inmueble buscado</h3>
                  {bySearchType.length === 0 || (bySearchType.length === 1 && bySearchType[0][0] === "Sin definir") ? (
                    <div className="text-sm text-[#6b7385] text-center py-4">Aún no hay datos — llena el campo en cada cliente</div>
                  ) : (
                    <HBarChart data={bySearchType.filter(([k]) => k !== "Sin definir")} max={maxSearchType} />
                  )}
                </div>
              </div>

              {/* Conversión por fuente */}
              <div className="bg-white rounded-[28px] shadow-float p-6">
                <h3 className="font-serif text-navy text-[28px] mb-5">Tasa de conversión por origen</h3>
                {convBySource.length === 0
                  ? <div className="text-sm text-[#6b7385] text-center py-4">Sin datos suficientes</div>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b border-stone">
                          {["Origen", "Leads", "Cerrados", "Conversión"].map(h => (
                            <th key={h} className="text-left text-[11px] font-semibold text-[#6b7385] uppercase tracking-wide px-3 py-2">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {convBySource.map(r => (
                            <tr key={r.label} className="border-b border-stone last:border-0 hover:bg-cream">
                              <td className="px-3 py-3 text-sm text-navy">{r.label}</td>
                              <td className="px-3 py-3 text-sm text-[#6b7385]">{r.total}</td>
                              <td className="px-3 py-3 text-sm text-emerald-600">{r.cerr}</td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-stone rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${r.pct}%` }} />
                                  </div>
                                  <span className="text-xs font-medium text-navy">{r.pct}%</span>
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
              <div className="bg-white rounded-[28px] shadow-float p-6">
                <h3 className="font-serif text-navy text-[28px] mb-6">Nuevos clientes vs cerrados — últimos 6 meses</h3>
                <div className="flex items-end gap-3 h-48">
                  {meses.map(m => (
                    <div key={m.label} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="w-full flex flex-col items-center gap-0.5">
                        <div className="text-xs text-[#6b7385] text-center">{m.value || ""}</div>
                        <div className="w-full flex gap-0.5 items-end" style={{ height: "160px" }}>
                          <div className="flex-1 bg-gold rounded-t-sm hover:bg-navy transition"
                            style={{ height: `${(m.value / Math.max(...meses.map(x => x.value), 1)) * 100}%`, minHeight: m.value > 0 ? 4 : 1 }} />
                          <div className="flex-1 bg-emerald-400 rounded-t-sm hover:bg-emerald-500 transition"
                            style={{ height: `${(m.cerr / Math.max(...meses.map(x => x.cerr), 1)) * 100}%`, minHeight: m.cerr > 0 ? 4 : 1 }} />
                        </div>
                      </div>
                      <span className="text-xs text-[#6b7385] capitalize">{m.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-6 mt-4 text-xs text-[#6b7385]">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gold"></div><span>Nuevos leads</span></div>
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
                <div className="bg-white rounded-[28px] shadow-float p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-serif text-navy text-[28px]">Edad</h3>
                    {avgAge && <span className="text-xs text-[#6b7385]">Promedio: <span className="font-semibold text-navy">{avgAge} años</span></span>}
                  </div>
                  {leadsWithAge === 0
                    ? <div className="text-sm text-[#6b7385] text-center py-8">Sin datos de edad</div>
                    : <VBarChart data={byAge} color="#1C2B4B" height={120} />}
                  {leadsWithAge > 0 && <div className="text-xs text-[#6b7385] mt-2">{leadsWithAge} de {total} clientes con edad registrada</div>}
                </div>

                {/* Por género */}
                <div className="bg-white rounded-[28px] shadow-float p-6">
                  <h3 className="font-serif text-navy text-[28px] mb-5">Género</h3>
                  {genderSlices.length === 0
                    ? <div className="text-sm text-[#6b7385] text-center py-8">Sin datos de género</div>
                    : <DonutChart slices={genderSlices} />}
                </div>
              </div>

              {/* Por presupuesto */}
              <div className="bg-white rounded-[28px] shadow-float p-6">
                <h3 className="font-serif text-navy text-[28px] mb-5">Distribución por presupuesto</h3>
                {byBudget.every(b => b.value === 0)
                  ? <div className="text-sm text-[#6b7385] text-center py-4">Sin datos de presupuesto numérico. Llena los campos “Presupuesto mínimo/máximo” en cada cliente.</div>
                  : <VBarChart data={byBudget} color="#1C2B4B" height={140} />}
              </div>

              {/* Presupuesto promedio por periodo */}
              <div className="bg-white rounded-[28px] shadow-float p-6">
                <h3 className="font-serif text-navy text-[28px] mb-5">Presupuesto promedio por periodo</h3>
                {presupuestoPorMes.every(p => p.n === 0)
                  ? <div className="text-sm text-[#6b7385] text-center py-4">Sin datos de presupuesto numérico. Llena los campos “Presupuesto mínimo/máximo” en cada cliente.</div>
                  : <BudgetTrendChart data={presupuestoPorMes} max={maxPresupuesto} />}
              </div>

              {/* Por estado geográfico */}
              <div className="bg-white rounded-[28px] shadow-float p-6">
                <h3 className="font-serif text-navy text-[28px] mb-5">Clientes por estado (geografía)</h3>
                {byClientState.length === 0
                  ? <div className="text-sm text-[#6b7385] text-center py-4">Sin datos geográficos del cliente.</div>
                  : <HBarChart data={byClientState} max={maxState} />}
              </div>


              {/* Zonas de interés */}
              <div className="bg-white rounded-[28px] shadow-float p-6">
                <h3 className="font-serif text-navy text-[28px] mb-5">Zonas de interés</h3>
                {byZona.length === 0
                  ? <div className="text-sm text-[#6b7385] text-center py-4">Sin datos de zona. Llena el campo “Zonas de interés” en el perfil de cada cliente.</div>
                  : <HBarChart data={byZona} max={maxZona} colorFn={() => "#1C2B4B"} />}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
