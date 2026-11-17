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
        <div className="absolute left-0 top-full mt-2 w-full min-w-[220px] bg-white rounded-[24px] shadow-float z-50 overflow-hidden">
          <div className="max-h-52 overflow-y-auto py-2 px-2">
            {suggestions.map(z => (
              <button key={z} type="button" onMouseDown={() => pick(z)}
                className={"w-full text-left px-4 py-2.5 rounded-[18px] text-sm flex items-center gap-2 transition-colors " +
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

const BEDS_OPTIONS  = [{ v: "0", l: "Cualquiera" }, { v: "1", l: "1" }, { v: "2", l: "2" }, { v: "3", l: "3" }, { v: "4", l: "4+" }];
const BATHS_OPTIONS = [{ v: "0", l: "Cualquiera" }, { v: "1", l: "1" }, { v: "2", l: "2" }, { v: "3", l: "3+" }];
const SORT_OPTIONS  = [{ v: "recent", l: "Más recientes" }, { v: "price_asc", l: "Menor precio" }, { v: "price_desc", l: "Mayor precio" }];

function FieldDropdown({ label, value, options, onChange, active, onToggle }: {
  label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void;
  active: boolean; onToggle: () => void;
}) {
  const selected = options.find(o => o.v === value)?.l || options[0].l;
  return (
    <div className="relative min-w-0 flex-1">
      <button type="button" onClick={onToggle} className="bg-cream rounded-[24px] px-6 py-3 flex flex-col gap-0.5 w-full text-left">
        <p className="text-[#6b7385] text-[11px] font-semibold tracking-[1.1px] uppercase">{label}</p>
        <p className="text-navy text-[17px] truncate">{selected}</p>
      </button>
      {active && (
        <div className="absolute left-0 top-full mt-2 w-full min-w-[160px] bg-white rounded-[24px] shadow-float z-50 overflow-hidden py-2 px-2">
          {options.map(o => (
            <button key={o.v} type="button" onMouseDown={() => onChange(o.v)}
              className={"w-full text-left px-4 py-2.5 rounded-[18px] text-sm transition-colors " +
                (value === o.v ? "text-gold font-medium bg-cream" : "text-navy hover:bg-cream")}>
              {o.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PropertyListWithFilters({ props, operation, initialType, initialZone, initialMin, initialMax }: { props: Prop[]; operation: "Venta" | "Renta"; initialType?: string; initialZone?: string; initialMin?: string; initialMax?: string; }) {
  const [filterType, setFilterType] = useState(initialType || "Todos");
  const [filterZone, setFilterZone] = useState(initialZone || "Todas");
  const [filterBeds, setFilterBeds] = useState("0");
  const [filterBaths, setFilterBaths] = useState("0");
  const [priceMin, setPriceMin]   = useState(initialMin || "");
  const [priceMax, setPriceMax]   = useState(initialMax || "");
  const [sortBy, setSortBy]       = useState("recent");
  const [activeField, setActiveField] = useState<null | "beds" | "baths" | "sort">(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setActiveField(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);
  // Se dibujan de POR_PAGINA en POR_PAGINA: con las 400+ tarjetas de golpe la
  // página pesaba ~1 MB por visita (transferencia de Vercel).
  const [visibles, setVisibles]   = useState(POR_PAGINA);

  const types = ["Todos", ...Array.from(new Set(props.map((p: Prop) => p.type)))];
  const zones = Array.from(new Set(props.map((p: Prop) => p.zone || p.city).filter(Boolean))) as string[];

  const filtered = useMemo(() => {
    let result = props.filter((p: Prop) => {
      const matchType  = filterType === "Todos" || p.type === filterType;
      const matchZone  = filterZone === "Todas" || p.zone === filterZone || p.city === filterZone;
      const matchBeds  = filterBeds === "0"  || (filterBeds === "4" ? p.bedrooms  >= 4 : p.bedrooms  === Number(filterBeds));
      const matchBaths = filterBaths === "0" || (filterBaths === "3" ? p.bathrooms >= 3 : p.bathrooms === Number(filterBaths));
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

  const field = "bg-cream rounded-[24px] px-6 py-3 flex flex-col gap-0.5 min-w-0 flex-1";
  const label = "text-[#6b7385] text-[11px] font-semibold tracking-[1.1px] uppercase";

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

      <div ref={filtersRef} className="bg-white rounded-[28px] shadow-float p-3 flex flex-wrap gap-2 items-stretch">
        <ZoneAutocomplete zones={zones} value={filterZone} onChange={setFilterZone} />
        {operation === "Venta" && (
          <>
            <FieldDropdown label="Recámaras" value={filterBeds} options={BEDS_OPTIONS} onChange={v => { setFilterBeds(v); setActiveField(null); }}
              active={activeField === "beds"} onToggle={() => setActiveField(activeField === "beds" ? null : "beds")} />
            <FieldDropdown label="Baños" value={filterBaths} options={BATHS_OPTIONS} onChange={v => { setFilterBaths(v); setActiveField(null); }}
              active={activeField === "baths"} onToggle={() => setActiveField(activeField === "baths" ? null : "baths")} />
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
        <FieldDropdown label="Ordenar" value={sortBy} options={SORT_OPTIONS} onChange={v => { setSortBy(v); setActiveField(null); }}
          active={activeField === "sort"} onToggle={() => setActiveField(activeField === "sort" ? null : "sort")} />
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
        <div className="py-16 text-center flex flex-col items-center gap-6">
          <div>
            <h3 className="font-serif text-navy text-4xl md:text-5xl">Sin resultados.</h3>
            <p className="text-[#6b7385] text-base md:text-lg mt-3 max-w-xl">
              No encontramos propiedades con esos filtros. Prueba ampliar el presupuesto o la zona, o pídele a Sofía que te ayude.
            </p>
          </div>
          <div className="flex gap-2.5 flex-wrap justify-center">
            <button onClick={clear} className="bg-stone hover:bg-stone-dk text-navy font-semibold px-7 py-3.5 rounded-full transition-colors">
              Quitar filtros
            </button>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("sofia:open", { detail: null }))}
              className="bg-navy hover:bg-navy-mid text-white font-semibold px-7 py-3.5 rounded-full transition-colors">
              Hablar con Sofía
            </button>
          </div>
          {props.length > 0 && (
            <div className="w-full mt-4">
              <p className="font-serif text-navy text-2xl mb-5">Propiedades que podrían interesarte</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {props.slice(0, 3).map((p: Prop) => <PropertyCardV3 key={p.id} p={p} coverUrl={p.cover} />)}
              </div>
            </div>
          )}
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
