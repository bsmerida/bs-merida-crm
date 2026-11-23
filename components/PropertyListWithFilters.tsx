"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { PropertyCardV3 } from "@/components/PropertyCardV3";
import { zonaCoincide } from "@/lib/validation";
import { masCercanas } from "@/lib/geo";

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
            onChange={e => { const v = e.target.value; setQuery(v); onChange(v || "Todas"); setOpen(true); }}
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

// Pills "Recámaras" con el mismo valor que BEDS_OPTIONS, para el cajón de
// filtros móvil (Figma las muestra como pills, no como dropdown).
const BEDS_PILLS = [{ v: "0", l: "Todas" }, { v: "1", l: "1+" }, { v: "2", l: "2+" }, { v: "3", l: "3+" }, { v: "4", l: "4+" }];

// Amenidades del cajón de filtros móvil ("Incluye" en Figma). Cada una
// filtra por subcadenas reales que sí existen en properties.amenities —
// no son categorías inventadas.
const AMENITY_FILTERS = [
  { key: "alberca",   label: "Alberca",        match: ["alberca"] },
  { key: "jardin",     label: "Jardín",         match: ["jard"] },
  { key: "pet",        label: "Pet friendly",   match: ["pet", "mascota"] },
  { key: "seguridad",  label: "Seguridad 24 h", match: ["seguridad"] },
  { key: "amueblada",  label: "Amueblada",      match: ["amueblad"] },
];
const tieneAmenidad = (p: Prop, match: string[]) =>
  Array.isArray(p.amenities) && p.amenities.some((a: string) => match.some(m => a.toLowerCase().includes(m)));

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

// Recuerda filtros, "ver más" y scroll por operación (Venta/Renta) para que
// al volver con el botón "atrás" del navegador se quede donde estaba, en vez
// de reiniciar todo y mandar hasta arriba.
type ListaGuardada = {
  filterType: string; filterZone: string; filterBeds: string; filterBaths: string;
  priceMin: string; priceMax: string; sortBy: string; visibles: number; scrollY: number;
  amenities?: string[];
};
const storageKey = (operation: string) => `lista:${operation}`;
function leerGuardado(operation: string): ListaGuardada | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(sessionStorage.getItem(storageKey(operation)) || "null"); } catch { return null; }
}

export function PropertyListWithFilters({ props, operation, initialType, initialZone, initialMin, initialMax, initialLat, initialLng }: { props: Prop[]; operation: "Venta" | "Renta"; initialType?: string; initialZone?: string; initialMin?: string; initialMax?: string; initialLat?: string; initialLng?: string; }) {
  // Coordenadas de la zona que escribió el cliente en el buscador del Home
  // (si eligió una sugerencia de Google Places) — solo para sugerir
  // propiedades realmente cercanas si esa zona exacta no tiene resultados.
  const coords = useMemo(
    () => (initialLat && initialLng ? { lat: Number(initialLat), lng: Number(initialLng) } : null),
    [initialLat, initialLng]
  );
  const guardado = useRef(leerGuardado(operation)).current;
  // Si vienes de una búsqueda nueva (el buscador del Home manda type/zone/
  // min/max por la URL), eso debe ganarle a un filtro guardado de una visita
  // anterior — si no, la búsqueda nueva se ve ignorada silenciosamente y la
  // página parece que no filtró nada. "guardado" solo debe reaparecer cuando
  // NO hay una búsqueda nueva explícita (ej. navegación normal "atrás").
  const [filterType, setFilterType] = useState(initialType || guardado?.filterType || "Todos");
  const [filterZone, setFilterZone] = useState(initialZone || guardado?.filterZone || "Todas");
  const [filterBeds, setFilterBeds] = useState(guardado?.filterBeds ?? "0");
  const [filterBaths, setFilterBaths] = useState(guardado?.filterBaths ?? "0");
  const [priceMin, setPriceMin]   = useState(initialMin || guardado?.priceMin || "");
  const [priceMax, setPriceMax]   = useState(initialMax || guardado?.priceMax || "");
  const [sortBy, setSortBy]       = useState(guardado?.sortBy ?? "recent");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(guardado?.amenities ?? []);
  const [activeField, setActiveField] = useState<null | "beds" | "baths" | "sort">(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const primerRender = useRef(true);

  const toggleAmenity = (key: string) =>
    setSelectedAmenities(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setActiveField(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);
  // Se dibujan de POR_PAGINA en POR_PAGINA: con las 400+ tarjetas de golpe la
  // página pesaba ~1 MB por visita (transferencia de Vercel).
  const [visibles, setVisibles]   = useState(guardado?.visibles ?? POR_PAGINA);

  const types = ["Todos", ...Array.from(new Set(props.map((p: Prop) => p.type)))];
  const zones = Array.from(new Set(props.map((p: Prop) => p.zone || p.city).filter(Boolean))) as string[];

  const filtered = useMemo(() => {
    let result = props.filter((p: Prop) => {
      const matchType  = filterType === "Todos" || p.type === filterType;
      // Antes exigía que filterZone fuera EXACTAMENTE una zona ya detectada en
      // los datos (el dropdown); escribir algo libre como "norte de Mérida"
      // nunca encontraba nada. zonaCoincide compara por palabra, así que
      // también funciona con lo que el cliente escriba sin elegir del listado.
      const matchZone  = filterZone === "Todas" || zonaCoincide(filterZone, [p.zone, p.city, p.state]);
      const matchBeds  = filterBeds === "0"  || (filterBeds === "4" ? p.bedrooms  >= 4 : p.bedrooms  === Number(filterBeds));
      const matchBaths = filterBaths === "0" || (filterBaths === "3" ? p.bathrooms >= 3 : p.bathrooms === Number(filterBaths));
      const matchMin   = !priceMin || p.price >= Number(priceMin);
      const matchMax   = !priceMax || p.price <= Number(priceMax);
      const matchAmenities = selectedAmenities.every(key =>
        tieneAmenidad(p, AMENITY_FILTERS.find(a => a.key === key)!.match));
      return matchType && matchZone && matchBeds && matchBaths && matchMin && matchMax && matchAmenities;
    });
    if (sortBy === "price_asc")  result = [...result].sort((a,b) => a.price - b.price);
    if (sortBy === "price_desc") result = [...result].sort((a,b) => b.price - a.price);
    return result;
  }, [props, filterType, filterZone, filterBeds, filterBaths, priceMin, priceMax, sortBy, selectedAmenities]);

  // Sin resultados exactos en la zona pedida: en vez de mostrar propiedades
  // destacadas al azar (podían salir en otra ciudad), se sugieren las más
  // cercanas de verdad por coordenadas — solo si el cliente eligió la zona
  // desde una sugerencia de Google Places (así sabemos dónde está).
  const cercanas = useMemo(() => {
    if (filtered.length > 0 || !coords) return [];
    const candidatas = props.filter((p: Prop) => {
      const matchType  = filterType === "Todos" || p.type === filterType;
      const matchBeds  = filterBeds === "0"  || (filterBeds === "4" ? p.bedrooms  >= 4 : p.bedrooms  === Number(filterBeds));
      const matchBaths = filterBaths === "0" || (filterBaths === "3" ? p.bathrooms >= 3 : p.bathrooms === Number(filterBaths));
      const matchMin   = !priceMin || p.price >= Number(priceMin);
      const matchMax   = !priceMax || p.price <= Number(priceMax);
      return matchType && matchBeds && matchBaths && matchMin && matchMax;
    });
    return masCercanas(candidatas, coords.lat, coords.lng);
  }, [filtered.length, coords, props, filterType, filterBeds, filterBaths, priceMin, priceMax]);

  useEffect(() => {
    // No reiniciar al restaurar desde sessionStorage al montar: solo cuando
    // la persona de verdad cambia un filtro.
    if (primerRender.current) { primerRender.current = false; return; }
    setVisibles(POR_PAGINA);
  }, [filterType, filterZone, filterBeds, filterBaths, priceMin, priceMax, sortBy, selectedAmenities]);

  // Guarda filtros + "ver más" en cada cambio, y la posición del scroll antes
  // de salir de la página (al hacer clic en una propiedad, por ejemplo).
  useEffect(() => {
    const guardar = () => {
      const datos: ListaGuardada = {
        filterType, filterZone, filterBeds, filterBaths, priceMin, priceMax, sortBy, visibles,
        scrollY: window.scrollY, amenities: selectedAmenities,
      };
      try { sessionStorage.setItem(storageKey(operation), JSON.stringify(datos)); } catch { /* ignorar: modo privado u otro bloqueo */ }
    };
    guardar();
    window.addEventListener("pagehide", guardar);
    return () => window.removeEventListener("pagehide", guardar);
  }, [operation, filterType, filterZone, filterBeds, filterBaths, priceMin, priceMax, sortBy, visibles, selectedAmenities]);

  // Al volver (atrás del navegador), restaura el scroll una sola vez, después
  // de que ya se dibujaron las tarjetas restauradas (si no, no hay a dónde bajar).
  useEffect(() => {
    if (!guardado?.scrollY) return;
    const id = requestAnimationFrame(() => window.scrollTo(0, guardado.scrollY));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  const hasFilters = filterType !== "Todos" || filterZone !== "Todas" || filterBeds !== "0" || filterBaths !== "0" || !!priceMin || !!priceMax || selectedAmenities.length > 0;
  const clear = () => { setFilterType("Todos"); setFilterZone("Todas"); setFilterBeds("0"); setFilterBaths("0"); setPriceMin(""); setPriceMax(""); setSelectedAmenities([]); };
  const countActivos = (filterType !== "Todos" ? 1 : 0) + (filterZone !== "Todas" ? 1 : 0) + (filterBeds !== "0" ? 1 : 0)
    + (filterBaths !== "0" ? 1 : 0) + (priceMin || priceMax ? 1 : 0) + selectedAmenities.length;

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

      {/* Móvil: ubicación siempre visible + botón que abre el cajón de filtros
          (Figma no muestra los 6 campos expandidos de golpe en una pantalla
          de 390px — un solo campo + un botón "Filtros"). */}
      <div className="md:hidden flex gap-2 items-stretch">
        <div className="flex-1 min-w-0">
          <ZoneAutocomplete zones={zones} value={filterZone} onChange={setFilterZone} />
        </div>
        <button type="button" onClick={() => setFiltersOpen(true)}
          className="relative shrink-0 bg-navy hover:bg-navy-mid text-white text-[15px] font-semibold px-6 rounded-[24px] transition-colors">
          Filtros
          {countActivos > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-gold text-navy text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {countActivos}
            </span>
          )}
        </button>
      </div>

      <div ref={filtersRef} className="hidden md:flex bg-white rounded-[28px] shadow-float p-3 flex-wrap gap-2 items-stretch">
        <ZoneAutocomplete zones={zones} value={filterZone} onChange={setFilterZone} />
        <FieldDropdown label="Recámaras" value={filterBeds} options={BEDS_OPTIONS} onChange={v => { setFilterBeds(v); setActiveField(null); }}
          active={activeField === "beds"} onToggle={() => setActiveField(activeField === "beds" ? null : "beds")} />
        <FieldDropdown label="Baños" value={filterBaths} options={BATHS_OPTIONS} onChange={v => { setFilterBaths(v); setActiveField(null); }}
          active={activeField === "baths"} onToggle={() => setActiveField(activeField === "baths" ? null : "baths")} />
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

      {/* Cajón de filtros móvil — Tipo, Precio, Recámaras y Amenidades, como en Figma.
          Baños y Ordenar no están en el mockup, pero ya existen y son reales: se
          agregan al final del cajón en vez de quitarlos. */}
      {filtersOpen && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-navy/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-cream rounded-t-[32px] max-h-[88vh] overflow-y-auto">
            <div className="w-11 h-1.5 bg-stone-dk rounded-full mx-auto mt-3" />
            <div className="px-6 pt-4 pb-3 flex items-center justify-between">
              <h2 className="font-serif text-navy text-4xl">Filtros</h2>
              {hasFilters && (
                <button onClick={clear} className="text-sm text-[#6b7385] hover:text-navy">Limpiar</button>
              )}
            </div>

            <div className="px-6 pb-6 space-y-6">
              <div>
                <p className={`${label} mb-2.5`}>Tipo</p>
                <div className="flex flex-wrap gap-2">
                  {(types as string[]).map(t => (
                    <button key={t} onClick={() => setFilterType(t)}
                      className={`text-[14px] font-medium px-4 py-2.5 rounded-full transition-colors ${
                        filterType === t ? "bg-navy text-white" : "bg-white text-navy hover:bg-stone"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={`${label} mb-2.5`}>Precio</p>
                <div className="flex gap-2">
                  <input type="number" placeholder="Mínimo" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                    className="flex-1 min-w-0 bg-white rounded-[20px] px-5 py-3 text-navy text-[16px] focus:outline-none placeholder:text-navy/40" />
                  <input type="number" placeholder="Máximo" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                    className="flex-1 min-w-0 bg-white rounded-[20px] px-5 py-3 text-navy text-[16px] focus:outline-none placeholder:text-navy/40" />
                </div>
              </div>

              <div>
                <p className={`${label} mb-2.5`}>Recámaras</p>
                <div className="flex flex-wrap gap-2">
                  {BEDS_PILLS.map(o => (
                    <button key={o.v} onClick={() => setFilterBeds(o.v)}
                      className={`text-[14px] font-medium px-4 py-2.5 rounded-full transition-colors ${
                        filterBeds === o.v ? "bg-navy text-white" : "bg-white text-navy hover:bg-stone"}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={`${label} mb-2.5`}>Baños</p>
                <div className="flex flex-wrap gap-2">
                  {BATHS_OPTIONS.map(o => (
                    <button key={o.v} onClick={() => setFilterBaths(o.v)}
                      className={`text-[14px] font-medium px-4 py-2.5 rounded-full transition-colors ${
                        filterBaths === o.v ? "bg-navy text-white" : "bg-white text-navy hover:bg-stone"}`}>
                      {o.l === "Cualquiera" ? "Todos" : o.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={`${label} mb-2.5`}>Incluye</p>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_FILTERS.map(a => (
                    <button key={a.key} onClick={() => toggleAmenity(a.key)}
                      className={`text-[14px] font-medium px-4 py-2.5 rounded-full transition-colors ${
                        selectedAmenities.includes(a.key) ? "bg-navy text-white" : "bg-white text-navy hover:bg-stone"}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={`${label} mb-2.5`}>Ordenar</p>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map(o => (
                    <button key={o.v} onClick={() => setSortBy(o.v)}
                      className={`text-[14px] font-medium px-4 py-2.5 rounded-full transition-colors ${
                        sortBy === o.v ? "bg-navy text-white" : "bg-white text-navy hover:bg-stone"}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setFiltersOpen(false)}
                className="w-full bg-navy hover:bg-navy-mid text-white font-semibold py-4 rounded-full transition-colors">
                Ver {filtered.length} {filtered.length === 1 ? "propiedad" : "propiedades"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {filterZone !== "Todas"
                ? `No encontramos propiedades en "${filterZone}".`
                : "No encontramos propiedades con esos filtros."}{" "}
              Prueba ampliar el presupuesto o la zona, o pídele a Sofía que te ayude.
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
          {cercanas.length > 0 ? (
            <div className="w-full mt-4">
              <p className="font-serif text-navy text-2xl mb-5">Propiedades cerca de &ldquo;{filterZone}&rdquo;</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cercanas.map((p: Prop) => <PropertyCardV3 key={p.id} p={p} coverUrl={p.cover} />)}
              </div>
            </div>
          ) : (
            // Sin coordenadas de la zona pedida (no se buscó eligiendo una
            // sugerencia de Places) no sabemos qué tan "cerca" está nada, así
            // que no se inventa cercanía — se sugiere del inventario general,
            // pero solo cuando el motivo de 0 resultados no fue la zona.
            filterZone === "Todas" && props.length > 0 && (
              <div className="w-full mt-4">
                <p className="font-serif text-navy text-2xl mb-5">Propiedades que podrían interesarte</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {props.slice(0, 3).map((p: Prop) => <PropertyCardV3 key={p.id} p={p} coverUrl={p.cover} />)}
                </div>
              </div>
            )
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
