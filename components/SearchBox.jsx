"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = ["Casa", "Departamento", "Terreno", "Oficina", "Local", "Bodega"];

export function SearchBox({ zones }) {
  const router = useRouter();
  const [op, setOp]     = useState("Venta");
  const [type, setType] = useState("");
  const [zone, setZone] = useState("");
  const [max, setMax]   = useState("");

  function go() {
    var p = new URLSearchParams();
    if (type) p.set("type", type);
    if (zone) p.set("zone", zone);
    if (max)  p.set("max", max);
    router.push((op === "Venta" ? "/comprar" : "/rentar") + "?" + p.toString());
  }

  var sel = "w-full bg-transparent text-sm text-white/80 focus:outline-none appearance-none cursor-pointer";

  return (
    <div className="bg-white/8 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/15">
      <div className="flex border-b border-white/10">
        {["Venta", "Renta"].map(function(o) {
          return (
            <button key={o} onClick={function() { setOp(o); }}
              className={"flex-1 py-3 text-[11px] uppercase tracking-[0.1em] transition-colors font-medium " +
                (op === o ? "text-gold bg-white/5" : "text-white/40 hover:text-white/70")}>
              {o === "Venta" ? "Comprar" : "Rentar"}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap md:flex-nowrap">
        <div className="flex-1 min-w-[150px] px-5 py-4 border-b md:border-b-0 md:border-r border-white/10">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gold/80 mb-1.5">Tipo de propiedad</p>
          <select value={type} onChange={function(e) { setType(e.target.value); }} className={sel}>
            <option value="" className="bg-navy text-white">Todos los tipos</option>
            {TYPES.map(function(t) { return <option key={t} value={t} className="bg-navy text-white">{t}</option>; })}
          </select>
        </div>
        <div className="flex-1 min-w-[150px] px-5 py-4 border-b md:border-b-0 md:border-r border-white/10">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gold/80 mb-1.5">Zona o ciudad</p>
          <select value={zone} onChange={function(e) { setZone(e.target.value); }} className={sel}>
            <option value="" className="bg-navy text-white">Cualquier zona</option>
            {zones.map(function(z) { return <option key={z} value={z} className="bg-navy text-white">{z}</option>; })}
          </select>
        </div>
        <div className="flex-1 min-w-[150px] px-5 py-4 border-b md:border-b-0 md:border-r border-white/10">
          <p className="text-[9px] uppercase tracking-[0.18em] text-gold/80 mb-1.5">Presupuesto máx.</p>
          <input type="number" value={max} onChange={function(e) { setMax(e.target.value); }}
            placeholder="Sin límite"
            className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/30 focus:outline-none" />
        </div>
        <button onClick={go}
          className="px-8 py-5 bg-gold hover:bg-gold-lt text-navy text-[11px] uppercase tracking-[0.1em] font-semibold flex items-center gap-2 transition-colors whitespace-nowrap">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          Buscar
        </button>
      </div>
    </div>
  );
}
