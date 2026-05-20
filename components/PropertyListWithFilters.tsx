"use client";
import { useState, useMemo } from "react";
import { PropertyCard } from "@/components/PropertyCard";
import { SlidersHorizontal, X } from "lucide-react";

type Prop = any;

export function PropertyListWithFilters({ props, operation, initialType, initialZone }: {
  props: Prop[]; operation: "Venta" | "Renta"; initialType?: string; initialZone?: string;
}) {
  const [filterType, setFilterType] = useState(initialType || "Todos");
  const [filterZone, setFilterZone] = useState(initialZone || "Todas");
  const [filterBeds, setFilterBeds] = useState("0");
  const [priceMin, setPriceMin]     = useState("");
  const [priceMax, setPriceMax]     = useState("");
  const [sortBy, setSortBy]         = useState("recent");

  const types = ["Todos", ...Array.from(new Set(props.map((p: Prop) => p.type)))];
  const zones = ["Todas", ...Array.from(new Set(props.map((p: Prop) => p.zone || p.city).filter(Boolean)))];

  const filtered = useMemo(() => {
    let r = props.filter((p: Prop) => {
      return (filterType === "Todos" || p.type === filterType)
        && (filterZone === "Todas" || p.zone === filterZone || p.city === filterZone)
        && (filterBeds === "0" || p.bedrooms >= Number(filterBeds))
        && (!priceMin || p.price >= Number(priceMin))
        && (!priceMax || p.price <= Number(priceMax));
    });
    if (sortBy === "price_asc")  r = [...r].sort((a,b) => a.price - b.price);
    if (sortBy === "price_desc") r = [...r].sort((a,b) => b.price - a.price);
    return r;
  }, [props, filterType, filterZone, filterBeds, priceMin, priceMax, sortBy]);

  const hasFilters = filterType !== "Todos" || filterZone !== "Todas" || filterBeds !== "0" || priceMin || priceMax;
  const clear = () => { setFilterType("Todos"); setFilterZone("Todas"); setFilterBeds("0"); setPriceMin(""); setPriceMax(""); };

  const sel = "border border-stone bg-white text-sm text-ink px-4 py-2.5 rounded-full focus:outline-none focus:border-gold cursor-pointer";

  return (
    <div className="space-y-8">
      {/* Tipos */}
      <div className="flex flex-wrap gap-2">
        {(types as string[]).map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`text-[11px] uppercase tracking-[0.08em] px-4 py-2 rounded-full border transition-all ${
              filterType === t
                ? "bg-navy text-white border-navy shadow-sm"
                : "bg-white text-ink-muted border-stone hover:border-navy hover:text-navy"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Filtros secundarios */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-stone shadow-card">
        <SlidersHorizontal size={14} className="text-ink-muted shrink-0" />
        <select value={filterZone} onChange={e => setFilterZone(e.target.value)} className={sel}>
          {(zones as string[]).map(z => <option key={z}>{z}</option>)}
        </select>
        {operation === "Venta" && (
          <select value={filterBeds} onChange={e => setFilterBeds(e.target.value)} className={sel}>
            <option value="0">Recámaras</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        )}
        <input type="number" placeholder="Precio mín." value={priceMin} onChange={e => setPriceMin(e.target.value)}
          className={`${sel} w-36 placeholder:text-ink-soft`} />
        <input type="number" placeholder="Precio máx." value={priceMax} onChange={e => setPriceMax(e.target.value)}
          className={`${sel} w-36 placeholder:text-ink-soft`} />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={sel}>
          <option value="recent">Más recientes</option>
          <option value="price_asc">Menor precio</option>
          <option value="price_desc">Mayor precio</option>
        </select>
        <div className="ml-auto flex items-center gap-3">
          {hasFilters && (
            <button onClick={clear} className="flex items-center gap-1 text-xs text-ink-muted hover:text-navy transition-colors">
              <X size={12} /> Limpiar
            </button>
          )}
          <span className="text-xs text-ink-muted bg-stone px-3 py-1.5 rounded-full">
            <span className="font-semibold text-navy">{filtered.length}</span> {filtered.length === 1 ? "propiedad" : "propiedades"}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-stone">
          <p className="text-sm text-ink-muted">Sin propiedades con esos filtros.</p>
          <button onClick={clear} className="text-xs text-gold hover:underline mt-2 block mx-auto">Limpiar filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p: Prop) => <PropertyCard key={p.id} p={p} coverUrl={p.cover} />)}
        </div>
      )}
    </div>
  );
}
