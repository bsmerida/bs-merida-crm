"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PropertiesMap } from "@/components/PropertiesMap";

type MapaProp = {
  id: string; title: string; price: number; operation: string; type: string;
  zone: string | null; city: string | null; lat: number; lng: number;
  bedrooms: number; bathrooms: number; m2_construction: number | null;
  images: string[];
};

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

export function MapaExplorer({ properties }: { properties: MapaProp[] }) {
  const [query, setQuery]       = useState("");
  const [operation, setOperation] = useState<"Todas" | "Venta" | "Renta">("Todas");
  const [vista, setVista]       = useState<"mapa" | "lista">("mapa");

  const filtered = useMemo(() => {
    return properties.filter(p => {
      const matchOp = operation === "Todas" || p.operation === operation;
      const q = query.trim().toLowerCase();
      const matchQuery = !q || [p.zone, p.city, p.title].filter(Boolean).some(s => s!.toLowerCase().includes(q));
      return matchOp && matchQuery;
    });
  }, [properties, query, operation]);

  return (
    <div className="rounded-[32px] md:rounded-[48px] bg-white shadow-float overflow-hidden flex flex-col md:flex-row h-[80vh] md:h-[820px]">
      {/* Panel de resultados */}
      <div className="w-full md:w-[420px] shrink-0 border-b md:border-b-0 md:border-r border-stone flex flex-col">
        <div className="p-5 pb-4">
          <h2 className="font-serif text-navy text-2xl md:text-[32px] mb-4">Explora el mapa.</h2>
          <div className="bg-cream rounded-[24px] px-5 py-3 flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-navy/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Zona o ciudad"
              className="flex-1 min-w-0 bg-transparent text-navy text-[15px] focus:outline-none placeholder:text-navy/40" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["Todas", "Venta", "Renta"] as const).map(o => (
              <button key={o} onClick={() => setOperation(o)}
                className={`text-[13px] font-semibold px-4 py-2 rounded-full transition-colors ${
                  operation === o ? "bg-navy text-white" : "bg-stone text-navy hover:bg-stone-dk"}`}>
                {o}
              </button>
            ))}
            <button onClick={() => setVista(v => v === "mapa" ? "lista" : "mapa")}
              className="md:hidden text-[13px] font-semibold px-4 py-2 rounded-full bg-stone text-navy ml-auto">
              {vista === "mapa" ? "Ver lista" : "Ver mapa"}
            </button>
          </div>
          <p className="text-[#6b7385] text-sm mt-3">{filtered.length} propiedad{filtered.length !== 1 ? "es" : ""} en esta zona</p>
        </div>
        <div className={`flex-1 overflow-y-auto px-5 pb-5 space-y-3 ${vista === "mapa" ? "hidden md:block" : ""}`}>
          {filtered.length === 0 ? (
            <p className="text-sm text-[#6b7385] py-8 text-center">Sin propiedades con esos filtros.</p>
          ) : filtered.map(p => (
            <Link key={p.id} href={`/propiedad/${p.id}`} className="flex gap-3 p-2 rounded-[20px] hover:bg-cream transition-colors">
              <div className="w-24 h-24 rounded-2xl bg-stone shrink-0 overflow-hidden">
                {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <p className="font-semibold text-navy text-lg truncate">{fmtPrice(p.price)}</p>
                <p className="text-navy text-sm truncate mt-0.5">{p.title}</p>
                <p className="text-[#6b7385] text-xs mt-0.5 truncate">
                  {[p.bedrooms > 0 && `${p.bedrooms} rec`, p.bathrooms > 0 && `${p.bathrooms} baños`, p.m2_construction && `${p.m2_construction} m²`].filter(Boolean).join(" · ")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Mapa */}
      <div className={`flex-1 relative ${vista === "lista" ? "hidden md:block" : ""}`}>
        <PropertiesMap properties={filtered} height="100%" />
      </div>
    </div>
  );
}
