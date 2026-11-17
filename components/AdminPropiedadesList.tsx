"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { fmtMXN } from "@/lib/utils";
import { Icon } from "@/components/Icon";

type Prop = {
  id: string; title: string; type: string; operation: string; status: string;
  price: number; zone: string | null; city: string; reference: string | null;
  development: string | null; agent?: { full_name: string | null } | null;
  cover?: string | null;
  views_count?: number; inquiries_count?: number;
};

const STATUS_COLORS: Record<string, string> = {
  Disponible: "bg-emerald-50 text-emerald-700",
  Reservada:  "bg-amber-50 text-amber-700",
  Vendida:    "bg-red-50 text-red-700",
  Rentada:    "bg-blue-50 text-blue-700",
  Pausada:    "bg-stone text-[#6b7385]",
};

type SortKey = "reciente" | "precio_asc" | "precio_desc" | "vistas";
const SORT_OPTIONS: { v: SortKey; l: string }[] = [
  { v: "reciente",    l: "Más recientes" },
  { v: "precio_desc", l: "Mayor precio" },
  { v: "precio_asc",  l: "Menor precio" },
  { v: "vistas",      l: "Más vistas" },
];

function Dropdown({ value, options, onChange, active, onToggle, width = "w-[200px]" }: {
  value: string; options: string[]; onChange: (v: string) => void; active: boolean; onToggle: () => void; width?: string;
}) {
  return (
    <div className="relative">
      <button type="button" onClick={onToggle}
        className="bg-white rounded-full px-5 py-2.5 text-sm font-medium text-navy flex items-center gap-2 whitespace-nowrap">
        {value}
        <svg className="w-3 h-3 text-navy/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {active && (
        <div className={`absolute left-0 top-full mt-2 ${width} bg-white rounded-[24px] shadow-float z-50 overflow-hidden py-2 px-2 max-h-72 overflow-y-auto`}>
          {options.map(o => (
            <button key={o} type="button" onClick={() => onChange(o)}
              className={`w-full text-left px-4 py-2.5 rounded-[18px] text-sm transition-colors ${value === o ? "text-gold bg-cream font-medium" : "text-navy hover:bg-cream"}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminPropiedadesList({ props }: { props: Prop[] }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Todos los tipos");
  const [filterOp, setFilterOp] = useState("Venta y renta");
  const [filterStatus, setFilterStatus] = useState("Todos los estados");
  const [filterZone, setFilterZone] = useState("Todas las zonas");
  const [sortBy, setSortBy] = useState<SortKey>("reciente");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setActiveFilter(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const types = ["Todos los tipos", ...Array.from(new Set(props.map(p => p.type)))];
  const statuses = ["Todos los estados", ...Array.from(new Set(props.map(p => p.status)))];
  const zones = ["Todas las zonas", ...Array.from(new Set(props.map(p => p.zone || p.city).filter(Boolean)))];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = props.filter(p => {
      const matchSearch = !q ||
        p.title.toLowerCase().includes(q) ||
        (p.reference || "").toLowerCase().includes(q) ||
        (p.zone || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.development || "").toLowerCase().includes(q);
      const matchType = filterType === "Todos los tipos" || p.type === filterType;
      const matchOp = filterOp === "Venta y renta" || p.operation === filterOp;
      const matchStatus = filterStatus === "Todos los estados" || p.status === filterStatus;
      const matchZone = filterZone === "Todas las zonas" || p.zone === filterZone || p.city === filterZone;
      const matchMin = !priceMin || Number(p.price) >= Number(priceMin);
      const matchMax = !priceMax || Number(p.price) <= Number(priceMax);
      return matchSearch && matchType && matchOp && matchStatus && matchZone && matchMin && matchMax;
    });

    if (sortBy === "precio_asc") result = [...result].sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === "precio_desc") result = [...result].sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === "vistas") result = [...result].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));

    return result;
  }, [props, search, filterType, filterOp, filterStatus, filterZone, sortBy, priceMin, priceMax]);

  const hasFilters = search || filterType !== "Todos los tipos" || filterOp !== "Venta y renta" || filterStatus !== "Todos los estados" || filterZone !== "Todas las zonas" || priceMin || priceMax;

  const clearFilters = () => {
    setSearch(""); setFilterType("Todos los tipos"); setFilterOp("Venta y renta");
    setFilterStatus("Todos los estados"); setFilterZone("Todas las zonas"); setPriceMin(""); setPriceMax("");
  };

  const toggle = (k: string) => setActiveFilter(a => (a === k ? null : k));

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <Icon name="search" className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7385]" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código, zona, desarrollador..."
          className="w-full pl-11 pr-5 py-3 bg-white rounded-full text-sm text-navy focus:outline-none focus:ring-1 focus:ring-gold/40 placeholder:text-[#6b7385]" />
      </div>

      {/* Filtros */}
      <div ref={filtersRef} className="flex flex-wrap items-center gap-2">
        <Dropdown value={filterType} options={types} active={activeFilter === "type"} onToggle={() => toggle("type")} onChange={v => { setFilterType(v); setActiveFilter(null); }} />
        <Dropdown value={filterOp} options={["Venta y renta", "Venta", "Renta"]} active={activeFilter === "op"} onToggle={() => toggle("op")} onChange={v => { setFilterOp(v); setActiveFilter(null); }} width="w-[160px]" />
        <Dropdown value={filterStatus} options={statuses} active={activeFilter === "status"} onToggle={() => toggle("status")} onChange={v => { setFilterStatus(v); setActiveFilter(null); }} />
        <Dropdown value={filterZone} options={zones} active={activeFilter === "zone"} onToggle={() => toggle("zone")} onChange={v => { setFilterZone(v); setActiveFilter(null); }} />
        <input type="number" placeholder="Precio mín." value={priceMin} onChange={e => setPriceMin(e.target.value)}
          className="bg-white rounded-full px-5 py-2.5 text-sm text-navy focus:outline-none w-32 placeholder:text-[#6b7385]" />
        <input type="number" placeholder="Precio máx." value={priceMax} onChange={e => setPriceMax(e.target.value)}
          className="bg-white rounded-full px-5 py-2.5 text-sm text-navy focus:outline-none w-32 placeholder:text-[#6b7385]" />
        <Dropdown value={SORT_OPTIONS.find(s => s.v === sortBy)?.l || "Más recientes"} options={SORT_OPTIONS.map(s => s.l)}
          active={activeFilter === "sort"} onToggle={() => toggle("sort")}
          onChange={l => { setSortBy(SORT_OPTIONS.find(s => s.l === l)?.v || "reciente"); setActiveFilter(null); }} />
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-[#6b7385] hover:text-navy bg-white rounded-full px-4 py-2.5">
            Limpiar ×
          </button>
        )}
      </div>

      <div className="text-xs text-[#6b7385] px-1">{filtered.length} de {props.length} propiedades</div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-[28px] p-12 text-center text-sm text-[#6b7385]">
          Sin resultados para esa búsqueda.
        </div>
      ) : (
        <div className="bg-white rounded-[28px] shadow-float overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-stone bg-cream">
              <tr>
                {["", "Propiedad", "Tipo", "Precio", "Estado", "Estadísticas", "Asesor", ""].map((h, i) => (
                  <th key={i} className="text-left text-[11px] font-semibold text-[#6b7385] uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-stone last:border-0 hover:bg-cream">
                  {/* Thumbnail */}
                  <td className="pl-4 pr-2 py-3 w-16">
                    <div className="w-14 h-10 rounded-[14px] overflow-hidden bg-stone flex items-center justify-center">
                      {p.cover
                        ? <img src={p.cover} alt="" className="w-full h-full object-cover" />
                        : <span className="text-base">🏠</span>}
                    </div>
                  </td>
                  {/* Título + código + zona */}
                  <td className="px-3 py-3 max-w-[220px]">
                    <div className="font-medium text-sm text-navy leading-tight truncate">{p.title}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {p.reference && (
                        <span className="text-[10px] font-mono bg-cream text-gold px-1.5 py-0.5 rounded">{p.reference}</span>
                      )}
                      <span className="text-xs text-[#6b7385]">{p.zone || p.city}</span>
                    </div>
                    {p.development && <div className="text-[10px] text-[#6b7385] mt-0.5">{p.development}</div>}
                  </td>
                  <td className="px-3 py-3 text-sm text-navy">
                    {p.type}
                    <div className="text-xs text-[#6b7385]">{p.operation}</div>
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-navy whitespace-nowrap">
                    {fmtMXN(Number(p.price))}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[p.status] || "bg-stone text-[#6b7385]"}`}>
                      {p.status}
                    </span>
                  </td>
                  {/* Estadísticas */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3 text-xs text-[#6b7385]">
                      <span title="Vistas">👁 {p.views_count || 0}</span>
                      <span title="Solicitudes">✉️ {p.inquiries_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-[#6b7385]">{p.agent?.full_name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/propiedades/${p.id}`} className="text-xs text-gold hover:text-gold-dk font-medium whitespace-nowrap">
                      Editar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
