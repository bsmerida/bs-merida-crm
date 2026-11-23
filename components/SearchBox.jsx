"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { loadGoogleMaps } from "@/lib/googleMaps";

const TYPES = ["Casa", "Departamento", "Terreno", "Oficina", "Local", "Bodega"];
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

const fmtMoney = (n) => "$" + Number(n).toLocaleString("es-MX");

export function SearchBox({ zones }) {
  const router = useRouter();
  const [op, setOp]             = useState("Venta");
  const [type, setType]         = useState("");
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState("");
  const [min, setMin]           = useState("");
  const [max, setMax]           = useState("");
  const [activeField, setActiveField] = useState(null); // "ubicacion" | "tipo" | "presupuesto" | null
  const [placeResults, setPlaceResults] = useState(null); // null = Places no listo/sin texto: usar zones locales
  const inputRef                = useRef(null);
  const boxRef                  = useRef(null);
  const autocompleteRef         = useRef(null);
  const debounceRef             = useRef(null);

  // Las zonas conocidas por nuestro inventario son una lista cerrada; con
  // Google Places el cliente puede escribir cualquier colonia real de
  // Yucatán o Nuevo León, exista o no todavía una propiedad ahí — como en
  // Inmuebles24/EasyBroker.
  useEffect(() => {
    if (!MAPS_KEY) return; // sin llave configurada, se queda con las zonas locales
    loadGoogleMaps(MAPS_KEY).then(() => {
      autocompleteRef.current = new window.google.maps.places.AutocompleteService();
    });
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q || !autocompleteRef.current) { setPlaceResults(null); return; }
    debounceRef.current = setTimeout(() => {
      autocompleteRef.current.getPlacePredictions(
        // "geocode" en vez de "(regions)": (regions) excluye calles y
        // avenidas (son tipo "route" en Google) — "Paseo de Montejo" no
        // aparecía como sugerencia por esto. "geocode" sí incluye calles,
        // colonias y ciudades; solo excluye negocios/restaurantes (ruido).
        { input: q, componentRestrictions: { country: "mx" }, types: ["geocode"] },
        (predictions) => {
          setPlaceResults((predictions || []).map(p => ({
            name: p.structured_formatting?.main_text || p.description,
            subtitle: p.structured_formatting?.secondary_text || "",
            isCity: false,
            isPlace: true,
          })));
        }
      );
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const suggestions = query.trim() === ""
    ? zones
    : placeResults !== null
      ? placeResults
      : zones.filter(z => z.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function handle(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setActiveField(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function pick(z) {
    setSelected(z.name);
    setQuery(z.name);
    setActiveField(null);
  }

  function clear() {
    setSelected("");
    setQuery("");
    inputRef.current?.focus();
  }

  function go() {
    const p = new URLSearchParams();
    if (type) p.set("type", type);
    // Si el cliente escribió algo pero nunca hizo clic en una sugerencia
    // (lo normal: escribir y darle directo a Buscar o Enter), "selected"
    // queda vacío — antes eso borraba silenciosamente lo que escribió y
    // mostraba todo sin filtro. Usamos el texto escrito como respaldo.
    const zona = selected || query.trim();
    if (zona) p.set("zone", zona);
    if (min) p.set("min", min);
    if (max) p.set("max", max);
    router.push((op === "Venta" ? "/comprar" : "/rentar") + (p.toString() ? "?" + p.toString() : ""));
  }

  const label    = "font-dmsans font-semibold text-[#6b7385] text-[11px] tracking-[1.1px] uppercase mb-1";
  const field    = "w-full bg-transparent font-dmsans font-medium text-[#1c2b4b] text-[17px] focus:outline-none appearance-none cursor-pointer placeholder:text-[#1c2b4b]/50 placeholder:font-medium truncate";
  const presupuestoLabel = min && max ? `${fmtMoney(min)} – ${fmtMoney(max)}`
    : min ? `Desde ${fmtMoney(min)}`
    : max ? `Hasta ${fmtMoney(max)}`
    : "Cualquier presupuesto";

  return (
    <div ref={boxRef} className="bg-white rounded-[28px] sm:rounded-[100px] flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-0 p-2.5 w-full font-dmsans relative">
      <div className="bg-[#ede9e1] flex items-start p-[4px] rounded-[100px] shrink-0 self-start sm:self-auto">
        {["Venta", "Renta"].map(o => (
          <button key={o} type="button" onClick={() => setOp(o)}
            className={"px-[24px] py-[12px] rounded-[100px] text-[15px] font-semibold transition-colors whitespace-nowrap " +
              (op === o ? "bg-[#1c2b4b] text-white" : "text-[#1c2b4b]")}>
            {o === "Venta" ? "Comprar" : "Rentar"}
          </button>
        ))}
      </div>

      {/* Ubicación */}
      <div className="flex-1 min-w-0 px-5 sm:px-[36px] py-1.5 sm:py-[4px] relative">
        <p className={label}>Ubicación</p>
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="¿Dónde buscas?"
            onChange={e => { setQuery(e.target.value); setSelected(""); setActiveField("ubicacion"); }}
            onFocus={() => setActiveField("ubicacion")}
            onKeyDown={e => {
              if (e.key === "Escape") setActiveField(null);
              if (e.key === "Enter") { if (suggestions.length === 1) pick(suggestions[0]); else go(); }
            }}
            className={field}
          />
          {query && (
            <button type="button" onClick={clear} className="text-[#1c2b4b]/40 hover:text-[#1c2b4b] transition-colors shrink-0">
              <Icon name="x" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {activeField === "ubicacion" && suggestions.length > 0 && (
          <div className="absolute left-0 top-full mt-2 w-full sm:w-[380px] bg-white rounded-[28px] shadow-float z-50 overflow-hidden">
            <div className="max-h-72 overflow-y-auto py-2 px-2">
              {suggestions.map(z => (
                <button key={z.name} type="button" onMouseDown={() => pick(z)}
                  className={"w-full text-left px-3 py-2.5 rounded-[20px] flex items-center gap-3 transition-colors " +
                    (selected === z.name ? "bg-cream" : "hover:bg-cream")}>
                  <span className="bg-stone w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0">
                    <Icon name={z.isPlace || z.isCity ? "pin" : "home"} className="w-4 h-4 text-navy" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-navy text-[15px] font-medium truncate">{z.name}</span>
                    {z.subtitle && <span className="block text-[#6b7385] text-xs truncate">{z.subtitle}</span>}
                  </span>
                  {/* Las sugerencias de Google Places no traen conteo de propiedades
                      (no son zonas de nuestro inventario, pueden no tener nada todavía) */}
                  {!z.isPlace && (
                    <span className="text-navy text-xs font-medium shrink-0">
                      {z.count > 0 ? `${z.count} propiedad${z.count !== 1 ? "es" : ""}` : "Sin propiedades"}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {query && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-stone">
                <button type="button" onMouseDown={go} className="text-navy text-sm font-semibold hover:text-gold transition-colors text-left">
                  {`Ver todos los resultados de "${query}" →`}
                </button>
                <button type="button" onMouseDown={() => setActiveField(null)} className="bg-stone text-navy text-xs font-medium px-3.5 py-1.5 rounded-full shrink-0 ml-2">
                  Cerrar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tipo */}
      <div className="flex-1 min-w-0 relative border-t sm:border-t-0 sm:border-l border-[#ede9e1]">
        <button type="button" onClick={() => setActiveField(activeField === "tipo" ? null : "tipo")}
          className="w-full text-left px-5 sm:px-[36px] py-1.5 sm:py-[4px]">
          <p className={label}>Tipo</p>
          <p className="font-dmsans font-medium text-[#1c2b4b] text-[17px] truncate">{type || "Casa o departamento"}</p>
        </button>
        {activeField === "tipo" && (
          <div className="absolute left-0 sm:left-[-8px] top-full mt-2 w-full sm:w-[260px] bg-white rounded-[28px] shadow-float z-50 overflow-hidden py-2 px-2">
            <button type="button" onClick={() => { setType(""); setActiveField(null); }}
              className={"w-full text-left px-4 py-2.5 rounded-[20px] text-[15px] transition-colors " + (type === "" ? "text-gold bg-cream font-medium" : "text-navy hover:bg-cream")}>
              Cualquier tipo
            </button>
            {TYPES.map(t => (
              <button key={t} type="button" onClick={() => { setType(t); setActiveField(null); }}
                className={"w-full text-left px-4 py-2.5 rounded-[20px] text-[15px] transition-colors " + (type === t ? "text-gold bg-cream font-medium" : "text-navy hover:bg-cream")}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Presupuesto */}
      <div className="flex-1 min-w-0 relative border-t sm:border-t-0 sm:border-l border-[#ede9e1]">
        <button type="button" onClick={() => setActiveField(activeField === "presupuesto" ? null : "presupuesto")}
          className="w-full text-left px-5 sm:px-[36px] py-1.5 sm:py-[4px]">
          <p className={label}>Presupuesto</p>
          <p className="font-dmsans font-medium text-[#1c2b4b] text-[17px] truncate">{presupuestoLabel}</p>
        </button>
        {activeField === "presupuesto" && (
          <div className="absolute left-0 sm:left-[-8px] top-full mt-2 w-full sm:w-[300px] bg-white rounded-[28px] shadow-float z-50 overflow-hidden p-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex-1 min-w-0 bg-cream rounded-[20px] px-4 py-2.5">
                <p className="text-[#6b7385] text-[10px] font-semibold tracking-[1px] uppercase">Desde</p>
                <input type="number" min="0" inputMode="numeric" value={min}
                  onChange={e => setMin(e.target.value)} placeholder="$0"
                  className="w-full bg-transparent text-navy text-[15px] font-medium focus:outline-none placeholder:text-navy/40" />
              </div>
              <div className="flex-1 min-w-0 bg-cream rounded-[20px] px-4 py-2.5">
                <p className="text-[#6b7385] text-[10px] font-semibold tracking-[1px] uppercase">Hasta</p>
                <input type="number" min="0" inputMode="numeric" value={max}
                  onChange={e => setMax(e.target.value)} placeholder="Sin límite"
                  className="w-full bg-transparent text-navy text-[15px] font-medium focus:outline-none placeholder:text-navy/40" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              {(min || max) ? (
                <button type="button" onClick={() => { setMin(""); setMax(""); }} className="text-navy/50 hover:text-navy text-xs font-medium transition-colors">
                  Quitar
                </button>
              ) : <span />}
              <button type="button" onClick={() => setActiveField(null)} className="bg-navy hover:bg-navy-mid text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors ml-auto">
                Aplicar
              </button>
            </div>
          </div>
        )}
      </div>

      <button type="button" onClick={go}
        className="bg-[#1c2b4b] hover:bg-navy-mid flex items-center justify-center gap-[10px] px-[32px] sm:pl-[32px] sm:pr-[36px] py-[16px] sm:py-[20px] rounded-full text-white font-semibold text-[16px] transition-colors shrink-0 whitespace-nowrap">
        <Icon name="search" className="w-5 h-5" />
        Buscar
      </button>
    </div>
  );
}
