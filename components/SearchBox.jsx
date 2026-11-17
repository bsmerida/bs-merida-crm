"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

const TYPES = ["Casa", "Departamento", "Terreno", "Oficina", "Local", "Bodega"];
const PRESUPUESTOS = [
  { v: "2000000", l: "Hasta $2,000,000" },
  { v: "3500000", l: "Hasta $3,500,000" },
  { v: "5000000", l: "Hasta $5,000,000" },
  { v: "8000000", l: "Hasta $8,000,000" },
  { v: "none",    l: "Sin límite" },
];

export function SearchBox({ zones }) {
  const router = useRouter();
  const [op, setOp]             = useState("Venta");
  const [type, setType]         = useState("");
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState("");
  const [max, setMax]           = useState("");
  const [activeField, setActiveField] = useState(null); // "ubicacion" | "tipo" | "presupuesto" | null
  const inputRef                = useRef(null);
  const boxRef                  = useRef(null);

  const suggestions = query.trim() === ""
    ? zones
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
    if (selected) p.set("zone", selected);
    if (max && max !== "none") p.set("max", max);
    router.push((op === "Venta" ? "/comprar" : "/rentar") + (p.toString() ? "?" + p.toString() : ""));
  }

  const label    = "font-dmsans font-semibold text-[#6b7385] text-[11px] tracking-[1.1px] uppercase mb-1";
  const field    = "w-full bg-transparent font-dmsans font-medium text-[#1c2b4b] text-[17px] focus:outline-none appearance-none cursor-pointer placeholder:text-[#1c2b4b]/50 placeholder:font-medium truncate";
  const presupuestoLabel = max === "" ? "Hasta $5,000,000" : (PRESUPUESTOS.find(p => p.v === max)?.l || "Hasta $5,000,000");

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
                    <Icon name={z.isCity ? "pin" : "home"} className="w-4 h-4 text-navy" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-navy text-[15px] font-medium truncate">{z.name}</span>
                    {z.subtitle && <span className="block text-[#6b7385] text-xs truncate">{z.subtitle}</span>}
                  </span>
                  <span className="text-navy text-xs font-medium shrink-0">
                    {z.count > 0 ? `${z.count} propiedad${z.count !== 1 ? "es" : ""}` : "Sin propiedades"}
                  </span>
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
          <div className="absolute left-0 sm:left-[-8px] top-full mt-2 w-full sm:w-[260px] bg-white rounded-[28px] shadow-float z-50 overflow-hidden py-2 px-2">
            {PRESUPUESTOS.map(p => (
              <button key={p.l} type="button" onClick={() => { setMax(p.v); setActiveField(null); }}
                className={"w-full text-left px-4 py-2.5 rounded-[20px] text-[15px] transition-colors " + (max === p.v ? "text-gold bg-cream font-medium" : "text-navy hover:bg-cream")}>
                {p.l}
              </button>
            ))}
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
