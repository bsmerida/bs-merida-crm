"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

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

  const sel = "w-full bg-transparent text-sm text-white/80 focus:outline-none appearance-none cursor-pointer";

  return (
    <div className="bg-white/8 backdrop-blur-sm rounded-2xl overflow-visible border border-white/15">
      <div className="flex border-b border-white/10">
        {["Venta", "Renta"].map(o => (
          <button key={o} onClick={() => setOp(o)}
            className={"flex-1 py-3 text-[11px] uppercase tracking-[0.1em] transition-colors font-medium " +
              (op === o ? "text-gold bg-white/5" : "text-white/40 hover:text-white/70")}>
            {o === "Venta" ? "Comprar" : "Rentar"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap md:flex-nowrap relative">

        <div className="flex-1 min-w-[150px] px-5 py-4 border-b md:border-b-0 md:border-r border-white/10">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gold/80 mb-1.5">Tipo de propiedad</p>
          <select value={type} onChange={e => setType(e.target.value)} className={sel}>
            <option value="" className="bg-navy text-white">Todos los tipos</option>
            {TYPES.map(t => <option key={t} value={t} className="bg-navy text-white">{t}</option>)}
          </select>
        </div>

        <div ref={boxRef} className="flex-1 min-w-[180px] px-5 py-4 border-b md:border-b-0 md:border-r border-white/10 relative">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gold/80 mb-1.5">Ubicación</p>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-white/35 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Ej. San Pedro, Valle Oriente..."
              onChange={e => { setQuery(e.target.value); setSelected(""); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={e => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter") { if (suggestions.length === 1) pick(suggestions[0]); else go(); }
              }}
              className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/30 focus:outline-none"
            />
            {query && (
              <button onClick={clear} className="text-white/30 hover:text-white/70 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
          {open && suggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full min-w-[220px] bg-navy border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="max-h-52 overflow-y-auto py-1">
                {suggestions.map(z => (
                  <button key={z} onMouseDown={() => pick(z)}
                    className={"w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5 " +
                      (selected === z ? "text-gold bg-white/8" : "text-white/80 hover:bg-white/8 hover:text-white")}>
                    <svg className="w-3 h-3 text-gold/60 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    {z}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-[150px] px-5 py-4 border-b md:border-b-0 md:border-r border-white/10">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gold/80 mb-1.5">Presupuesto máx.</p>
          <input type="number" value={max} onChange={e => setMax(e.target.value)}
            placeholder="Sin límite"
            className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/30 focus:outline-none" />
        </div>

        <button onClick={go}
          className="px-8 py-5 bg-gold hover:bg-gold-lt text-navy text-[11px] uppercase tracking-[0.1em] font-semibold flex items-center gap-2 transition-colors whitespace-nowrap rounded-br-2xl">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          Buscar
        </button>
      </div>
    </div>
  );
}
