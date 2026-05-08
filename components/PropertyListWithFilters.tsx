"use client";
import { useState, useMemo } from "react";
import { PropertyCard } from "@/components/PropertyCard";

type Prop = {
  id: string;
  title: string;
  type: string;
  operation: string;
  status: string;
  price: number;
  zone: string | null;
  city: string;
  bedrooms: number;
  cover: string | null;
  [key: string]: any;
};

export function PropertyListWithFilters({ props, operation }: { props: Prop[]; operation: "Venta" | "Renta" }) {
  const [filterType, setFilterType] = useState("Todos");
  const [filterZone, setFilterZone] = useState("Todas");
  const [filterBeds, setFilterBeds] = useState("0");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const types = ["Todos", ...Array.from(new Set(props.map(p => p.type)))];
  const zones = ["Todas", ...Array.from(new Set(props.map(p => p.zone || p.city).filter(Boolean)))];

  const filtered = useMemo(() => props.filter(p => {
    const matchType = filterType === "Todos" || p.type === filterType;
    const matchZone = filterZone === "Todas" || p.zone === filterZone || p.city === filterZone;
    const matchBeds = filterBeds === "0" || p.bedrooms >= Number(filterBeds);
    const matchMin = !priceMin || p.price >= Number(priceMin);
    const matchMax = !priceMax || p.price <= Number(priceMax);
    return matchType && matchZone && matchBeds && matchMin && matchMax;
  }), [props, filterType, filterZone, filterBeds, priceMin, priceMax]);

  const hasFilters = filterType !== "Todos" || filterZone !== "Todas" || filterBeds !== "0" || priceMin || priceMax;
  const clear = () => { setFilterType("Todos"); setFilterZone("Todas"); setFilterBeds("0"); setPriceMin(""); setPriceMax(""); };

  const sel = "bg-white border border-ink-line rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-brand-300 cursor-pointer";
  const inp = "bg-white border border-ink-line rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-brand-300 w-32";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 bg-white border border-ink-line rounded-2xl px-5 py-4">
        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Filtrar:</span>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={sel}>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterZone} onChange={e => setFilterZone(e.target.value)} className={sel}>
          {zones.map(z => <option key={z}>{z}</option>)}
        </select>
        <select value={filterBeds} onChange={e => setFilterBeds(e.target.value)} className={sel}>
          <option value="0">Cualquier recámara</option>
          <option value="1">1+ recámara</option>
          <option value="2">2+ recámaras</option>
          <option value="3">3+ recámaras</option>
          <option value="4">4+ recámaras</option>
        </select>
        <input type="number" placeholder="Precio mín" value={priceMin} onChange={e => setPriceMin(e.target.value)} className={inp} />
        <input type="number" placeholder="Precio máx" value={priceMax} onChange={e => setPriceMax(e.target.value)} className={inp} />
        {hasFilters && (
          <button onClick={clear} className="text-xs text-ink-muted hover:text-ink border border-ink-line rounded-full px-3 py-2">
            Limpiar ×
          </button>
        )}
      </div>

      <p className="text-sm text-ink-muted">
        <span className="font-semibold text-ink">{filtered.length}</span>{" "}
        {filtered.length === 1 ? "propiedad encontrada" : "propiedades encontradas"}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-ink-muted text-sm">
          No hay propiedades con esos filtros.{" "}
          <button onClick={clear} className="text-brand-600 hover:underline">Limpiar filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => <PropertyCard key={p.id} p={p} coverUrl={p.cover} />)}
        </div>
      )}
    </div>
  );
}
