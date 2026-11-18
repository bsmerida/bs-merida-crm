"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { fmtMXN } from "@/lib/utils";
import { Icon } from "@/components/Icon";

type Prop = {
  id: string; title: string; type: string; operation: string; status: string;
  price: number; zone: string | null; city: string; reference: string | null;
  development: string | null; agent?: { full_name: string | null } | null;
  cover?: string | null; portales?: string[];
  views_count?: number; inquiries_count?: number;
};

const ESTADOS = ["Disponible", "Reservada", "Vendida", "Rentada", "Pausada"];

// Degradados de portada cuando no hay foto — mismo tono que usa Figma para las tarjetas.
const GRADIENTES = [
  "linear-gradient(146deg, #2B3F68 0%, #1C2B4B 71%)",
  "linear-gradient(146deg, #3B5586 0%, #1C2B4B 71%)",
  "linear-gradient(146deg, #22345A 0%, #1C2B4B 71%)",
];

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

function PropCard({ p, idx }: { p: Prop; idx: number }) {
  const esRenta = p.operation === "Renta";
  return (
    <Link href={`/admin/propiedades/${p.id}`}
      className="bg-white rounded-[30px] p-2 flex flex-col gap-3 hover:shadow-float transition-shadow">
      <div className="h-[170px] rounded-[22px] overflow-hidden relative flex items-start p-3"
        style={p.cover ? undefined : { backgroundImage: GRADIENTES[idx % GRADIENTES.length] }}>
        {p.cover && <img src={p.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <span className="relative bg-white text-navy text-[11px] font-semibold px-2.5 py-1.5 rounded-full flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${p.status === "Disponible" ? "bg-emerald-500" : "bg-navy/30"}`} />
          {p.status}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 px-2.5 pb-2">
        <p className="font-semibold text-navy text-[22px] tracking-[-0.22px]">
          {fmtMXN(Number(p.price))}{esRenta ? " / mes" : ""}
        </p>
        <p className="text-navy text-sm truncate">{p.title}</p>
        <div className="flex items-center justify-between pt-1.5">
          <p className="text-[#6b7385] text-xs">{p.views_count || 0} vistas{p.agent?.full_name ? ` · ${p.agent.full_name}` : ""}</p>
          {!!p.portales?.length && (
            <div className="flex gap-1 shrink-0">
              {p.portales.slice(0, 3).map(ab => (
                <span key={ab} className="bg-stone text-navy text-[10px] font-medium px-2 py-0.5 rounded-full">{ab}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function AdminPropiedadesList({ props }: { props: Prop[] }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Todos los tipos");
  const [filterOp, setFilterOp] = useState("Venta y renta");
  const [filterStatus, setFilterStatus] = useState("Todas");
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
      const matchStatus = filterStatus === "Todas" || p.status === filterStatus;
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

  const hasFilters = search || filterType !== "Todos los tipos" || filterOp !== "Venta y renta" || filterStatus !== "Todas" || filterZone !== "Todas las zonas" || priceMin || priceMax;

  const clearFilters = () => {
    setSearch(""); setFilterType("Todos los tipos"); setFilterOp("Venta y renta");
    setFilterStatus("Todas"); setFilterZone("Todas las zonas"); setPriceMin(""); setPriceMax("");
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

      {/* Herramientas: estados en pills (como Figma) + el resto de filtros */}
      <div ref={filtersRef} className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {["Todas", ...ESTADOS].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-[13px] font-semibold px-[18px] py-[9px] rounded-full transition-colors ${
                filterStatus === s ? "bg-navy text-white" : "bg-white text-navy hover:bg-cream"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dropdown value={filterType} options={types} active={activeFilter === "type"} onToggle={() => toggle("type")} onChange={v => { setFilterType(v); setActiveFilter(null); }} />
          <Dropdown value={filterOp} options={["Venta y renta", "Venta", "Renta"]} active={activeFilter === "op"} onToggle={() => toggle("op")} onChange={v => { setFilterOp(v); setActiveFilter(null); }} width="w-[160px]" />
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
      </div>

      <div className="text-xs text-[#6b7385] px-1">{filtered.length} de {props.length} propiedades</div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-[28px] p-12 text-center text-sm text-[#6b7385]">
          Sin resultados para esa búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filtered.map((p, i) => <PropCard key={p.id} p={p} idx={i} />)}
        </div>
      )}
    </div>
  );
}
