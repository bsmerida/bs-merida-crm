"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { PropertyCard } from "@/components/PropertyCard";

type Prop = any;

function ZoneAutocomplete({ zones, value, onChange }: { zones: string[]; value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value === "Todas" ? "" : value);
  const [open, setOpen]   = useState(false);
  const boxRef            = useRef<HTMLDivElement>(null);

  const suggestions = ["Todas", ...zones.filter(z =>
    query.trim() === "" || z.toLowerCase().includes(query.toLowerCase())
  )];

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function pick(z: string) {
    onChange(z);
    setQuery(z === "Todas" ? "" : z);
    setOpen(false);
  }

  function clear() {
    onChange("Todas");
    setQuery("");
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-1.5 border border-stone bg-white px-3 py-2 focus-within:border-gold transition-colors">
        <svg className="w-3.5 h-3.5 text-ink-muted shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <input
          type="text"
          value={query}
          placeholder="Zona o ciudad..."
          onChange={e => { setQuery(e.target.value); onChange("Todas"); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
          className="text-sm text-ink bg-transparent focus:outline-none w-36 placeholder:text-ink-soft"
        />
        {query && (
          <button onClick={clear} className="text-ink-muted hover:text-navy transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[200px] bg-white border border-stone shadow-xl z-50 overflow-hidden">
          <div className="max-h-52 overflow-y-auto py-1">
            {suggestions.map(z => (
              <button key={z} onMouseDown={() => pick(z)}
                className={"w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors " +
                  (value === z ? "text-gold font-medium bg-cream" : "text-ink hover:bg-cream")}>
                {z === "Todas"
                  ? <><svg className="w-3 h-3 text-ink-muted shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>Todas las zonas</>
                  : <><svg className="w-3 h-3 text-gold/60 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>{z}</>
                }
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PropertyListWithFilters({ props, operation, initialType, initialZone }: { props: Prop[]; operation: "Venta" | "Renta"; initialType?: string; initialZone?: string; }) {
  const [filterType, setFilterType] = useState(initialType || "Todos");
  const [filterZone, setFilterZone] = useState(initialZone || "Todas");
  const [filterBeds, setFilterBeds] = useState("0");
  const [filterBaths, setFilterBaths] = useState("0");
  const [priceMin, setPriceMin]   = useState("");
  const [priceMax, setPriceMax]   = useState("");
  const [sortBy, setSortBy]       = useState("recent");

  const types = ["Todos", ...Array.from(new Set(props.map((p: Prop) => p.type)))];
  const zones = Array.from(new Set(props.map((p: Prop) => p.zone || p.city).filter(Boolean))) as string[];

  const filtered = useMemo(() => {
    let result = props.filter((p: Prop) => {
      const matchType  = filterType === "Todos" || p.type === filterType;
      const matchZone  = filterZone === "Todas" || p.zone === filterZone || p.city === filterZone;
      const matchBeds  = filterBeds === "0"  || p.bedrooms  >= Number(filterBeds);
      const matchBaths = filterBaths === "0" || p.bathrooms >= Number(filterBaths);
      const matchMin   = !priceMin || p.price >= Number(priceMin);
      const matchMax   = !priceMax || p.price <= Number(priceMax);
      return matchType && matchZone && matchBeds && matchBaths && matchMin && matchMax;
    });
    if (sortBy === "price_asc")  result = [...result].sort((a,b) => a.price - b.price);
    if (sortBy === "price_desc") result = [...result].sort((a,b) => b.price - a.price);
    return result;
  }, [props, filterType, filterZone, filterBeds, filterBaths, priceMin, priceMax, sortBy]);

  const hasFilters = filterType !== "Todos" || filterZone !== "Todas" || filterBeds !== "0" || filterBaths !== "0" || priceMin || priceMax;
  const clear = () => { setFilterType("Todos"); setFilterZone("Todas"); setFilterBeds("0"); setFilterBaths("0"); setPriceMin(""); setPriceMax(""); };

  const sel = "border border-stone bg-white text-sm text-ink px-3 py-2 focus:outline-none focus:border-gold cursor-pointer";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-1.5">
        {(types as string[]).map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`text-[11px] uppercase tracking-[0.08em] px-4 py-2 border transition-colors ${
              filterType === t ? "bg-navy text-white border-navy" : "bg-white text-ink-muted border-stone hover:border-navy"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ZoneAutocomplete zones={zones} value={filterZone} onChange={setFilterZone} />
        {operation === "Venta" && (
          <>
            <select value={filterBeds} onChange={e => setFilterBeds(e.target.value)} className={sel}>
              <option value="0">Recámaras</option>
              <option value="1">1+ rec.</option>
              <option value="2">2+ rec.</option>
              <option value="3">3+ rec.</option>
              <option value="4">4+ rec.</option>
            </select>
            <select value={filterBaths} onChange={e => setFilterBaths(e.target.value)} className={sel}>
              <option value="0">Baños</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
            </select>
          </>
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
        <div className="ml-auto flex items-center gap-4">
          {hasFilters && (
            <button onClick={clear} className="text-xs text-ink-muted hover:text-navy underline underline-offset-2">
              Limpiar filtros
            </button>
          )}
          <span className="text-xs text-ink-muted">
            <span className="text-navy font-medium">{filtered.length}</span> {filtered.length === 1 ? "propiedad" : "propiedades"}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-sm text-ink-muted">Sin propiedades con esos filtros.</p>
          <button onClick={clear} className="text-xs text-gold hover:underline mt-2 block mx-auto">Limpiar filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-stone">
          {filtered.map((p: Prop) => (
            <div key={p.id} className="bg-cream">
              <PropertyCard p={p} coverUrl={p.cover} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
