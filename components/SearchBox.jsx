"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

const TYPES = ["Casa", "Departamento", "Terreno", "Oficina", "Local", "Bodega"];

export function SearchBox({ zones }) {
  const router = useRouter();
  const [op, setOp]             = useState("Venta");
  const [type, setType]         = useState("");
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState("");
  const [open, setOpen]         = useState(false);
  const [max, setMax]           = useState("");
  const inputRef                = useRef(null);
  const boxRef                  = useRef(null);

  const suggestions = query.trim() === ""
    ? zones
    : zones.filter(z => z.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function handle(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function pick(z) {
    setSelected(z);
    setQuery(z);
    setOpen(false);
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
    if (max) p.set("max", max);
    router.push((op === "Venta" ? "/comprar" : "/rentar") + (p.toString() ? "?" + p.toString() : ""));
  }

  const label = "font-dmsans font-semibold text-[#6b7385] text-[11px] tracking-[1.1px] uppercase mb-1";
  const field = "w-full bg-transparent font-dmsans font-medium text-[#1c2b4b] text-[17px] focus:outline-none appearance-none cursor-pointer placeholder:text-[#1c2b4b]/50 placeholder:font-medium";

  return (
    <div className="bg-white rounded-[28px] sm:rounded-[100px] flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-0 p-2.5 w-full font-dmsans">
      <div className="bg-[#ede9e1] flex items-start p-[4px] rounded-[100px] shrink-0 self-start sm:self-auto">
        {["Venta", "Renta"].map(o => (
          <button key={o} type="button" onClick={() => setOp(o)}
            className={"px-[24px] py-[12px] rounded-[100px] text-[15px] font-semibold transition-colors whitespace-nowrap " +
              (op === o ? "bg-[#1c2b4b] text-white" : "text-[#1c2b4b]")}>
            {o === "Venta" ? "Comprar" : "Rentar"}
          </button>
        ))}
      </div>

      <div ref={boxRef} className="flex-1 min-w-0 px-5 sm:px-[36px] py-1.5 sm:py-[4px] relative">
        <p className={label}>Ubicación</p>
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="¿Dónde buscas?"
            onChange={e => { setQuery(e.target.value); setSelected(""); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => {
              if (e.key === "Escape") setOpen(false);
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
        {open && suggestions.length > 0 && (
          <div className="absolute left-0 top-full mt-2 w-full min-w-[220px] bg-white border border-[#ede9e1] rounded-2xl shadow-float z-50 overflow-hidden">
            <div className="max-h-52 overflow-y-auto py-1">
              {suggestions.map(z => (
                <button key={z} type="button" onMouseDown={() => pick(z)}
                  className={"w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 " +
                    (selected === z ? "text-gold bg-stone/60" : "text-[#1c2b4b] hover:bg-stone/60")}>
                  <Icon name="pin" className="w-3 h-3 text-gold shrink-0" />
                  {z}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 px-5 sm:px-[36px] py-1.5 sm:py-[4px] border-t sm:border-t-0 sm:border-l border-[#ede9e1]">
        <p className={label}>Tipo</p>
        <select value={type} onChange={e => setType(e.target.value)} className={field}>
          <option value="">Casa o departamento</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="flex-1 min-w-0 px-5 sm:px-[36px] py-1.5 sm:py-[4px] border-t sm:border-t-0 sm:border-l border-[#ede9e1]">
        <p className={label}>Presupuesto</p>
        <input type="number" value={max} onChange={e => setMax(e.target.value)}
          placeholder="Hasta $5,000,000"
          className={field} />
      </div>

      <button type="button" onClick={go}
        className="bg-[#1c2b4b] hover:bg-navy-mid flex items-center justify-center gap-[10px] px-[32px] sm:pl-[32px] sm:pr-[36px] py-[16px] sm:py-[20px] rounded-full text-white font-semibold text-[16px] transition-colors shrink-0 whitespace-nowrap">
        <Icon name="search" className="w-5 h-5" />
        Buscar
      </button>
    </div>
  );
}
