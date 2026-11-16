"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { PropertyCardV3 } from "@/components/PropertyCardV3";

type Prop = any;
const POR_PAGINA = 24;

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
    <div ref={boxRef} className="relative min-w-0">
      <div className="bg-cream rounded-[24px] px-6 py-3 flex flex-col gap-0.5">
        <p className="text-[#6b7385] text-[11px] font-semibold tracking-[1.1px] uppercase">Ubicación</p>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={query}
            placeholder="Zona o ciudad"
            onChange={e => { setQuery(e.target.value); onChange("Todas"); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
            className="flex-1 min-w-0 text-navy text-[17px] bg-transparent focus:outline-none placeholder:text-navy/50"
          />
          {query && (
            <button type="button" onClick={clear} className="text-navy/40 hover:text-navy transition-colors shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-2 w-full min-w-[220px] bg-white border border-stone rounded-2xl shadow-float z-50 overflow-hidden">
          <div className="max-h-52 overflow-y-auto py-1">
            {suggestions.map(z => (
              <button key={z} type="button" onMouseDown={() => pick(z)}
                className={"w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors " +
                  (value === z ? "text-gold font-medium bg-cream" : "text-navy hover:bg-cream")}>
                {z === "Todas" ? "Todas las zonas" : z}
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
  // Se dibujan de POR_PAGINA en POR_PAGINA: con las 400+ tarjetas de golpe la
  // página pesaba ~1 MB por visita (transferencia de Vercel).
  const [visibles, setVisibles]   = useState(POR_PAGINA);

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

  useEffect(() => { setVisibles(POR_PAGINA); }, [filterType, filterZone, filterBeds, filterBaths, priceMin, priceMax, sortBy]);

  const hasFilters = filterType !== "Todos" || filterZone !== "Todas" || filterBeds !== "0" || filterBaths !== "0" || priceMin || priceMax;
  const clear = () => { setFilterType("Todos"); setFilterZone("Todas"); setFilterBeds("0"); setFilterBaths("0"); setPriceMin(""); setPriceMax(""); };

  const field = "bg-cream rounded-[24px] px-6 py-3 flex flex-col gap-0.5 min-w-0";
  const label = "text-[#6b7385] text-[11px] font-semibold tracking-[1.1px] uppercase";
  const sel   = "text-navy text-[17px] bg-transparent focus:outline-none w-full cursor-pointer";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(types as string[]).map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`text-[13px] font-semibold px-[18px] py-[10px] rounded-full transition-colors ${
              filterType === t ? "bg-navy text-white" : "bg-stone text-navy hover:bg-stone-dk"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[28px] border border-stone p-3 flex flex-wrap gap-2 items-stretch">
        <ZoneAutocomplete zones={zones} value={filterZone} onChange={setFilterZone} />
        {operation === "Venta" && (
          <>
            <div className={field}>
              <p className={label}>Recámaras</p>
              <select value={filterBeds} onChange={e => setFilterBeds(e.target.value)} className={sel}>
                <option value="0">Cualquiera</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>
            <div className={field}>
              <p className={label}>Baños</p>
              <select value={filterBaths} onChange={e => setFilterBaths(e.target.value)} className={sel}>
                <option value="0">Cualquiera</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
              </select>
            </div>
          </>
        )}
        <div className={field}>
          <p className={label}>Precio mín.</p>
          <input type="number" placeholder="Sin límite" value={priceMin} onChange={e => setPriceMin(e.target.value)}
            className="text-navy text-[17px] bg-transparent focus:outline-none w-full placeholder:text-navy/40" />
        </div>
        <div className={field}>
          <p className={label}>Precio máx.</p>
          <input type="number" placeholder="Sin límite" value={priceMax} onChange={e => setPriceMax(e.target.value)}
            className="text-navy text-[17px] bg-transparent focus:outline-none w-full placeholder:text-navy/40" />
        </div>
        <div className={field}>
          <p className={label}>Ordenar</p>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={sel}>
            <option value="recent">Más recientes</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {hasFilters ? (
          <button onClick={clear} className="text-sm text-navy hover:text-gold underline underline-offset-2 transition-colors">
            Limpiar filtros
          </button>
        ) : <span />}
        <span className="text-sm text-[#6b7385]">
          <span className="text-navy font-semibold">{filtered.length}</span> {filtered.length === 1 ? "propiedad" : "propiedades"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-sm text-[#6b7385]">Sin propiedades con esos filtros.</p>
          <button onClick={clear} className="text-sm text-gold hover:underline mt-2 block mx-auto">Limpiar filtros</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.slice(0, visibles).map((p: Prop) => (
              <PropertyCardV3 key={p.id} p={p} coverUrl={p.cover} />
            ))}
          </div>
          {filtered.length > visibles && (
            <div className="text-center pt-4">
              <button onClick={() => setVisibles(v => v + POR_PAGINA)}
                className="bg-navy hover:bg-navy-mid text-white font-semibold px-8 py-4 rounded-full transition-colors">
                Ver más propiedades ({filtered.length - visibles})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
