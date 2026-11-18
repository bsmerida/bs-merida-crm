"use client";
import { useState } from "react";
import { PropertiesMap } from "@/components/PropertiesMap";

type Prop = {
  id: string; title: string; price: number; operation: string; type: string;
  zone: string | null; lat: number; lng: number; images: string[];
};

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

export function AdminMapaExplorer({ properties }: { properties: Prop[] }) {
  const [focusId, setFocusId] = useState<string | null>(properties[0]?.id ?? null);

  return (
    <div className="flex flex-col md:flex-row gap-5 h-[75vh]">
      <div className="w-full md:w-[340px] shrink-0 bg-white rounded-[28px] shadow-float p-5 flex flex-col overflow-hidden">
        <h2 className="font-serif text-navy text-2xl mb-4 shrink-0">Propiedades</h2>
        <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
          {properties.map(p => (
            <button key={p.id} onClick={() => setFocusId(p.id)}
              className={`w-full text-left rounded-[20px] px-4 py-3 transition-colors ${
                focusId === p.id ? "bg-navy text-white" : "bg-cream text-navy hover:bg-stone"}`}>
              <p className="text-sm font-semibold truncate">{p.title}</p>
              <p className={`text-xs mt-0.5 ${focusId === p.id ? "text-white/70" : "text-[#6b7385]"}`}>{fmtPrice(p.price)}</p>
            </button>
          ))}
          {properties.length === 0 && (
            <p className="text-sm text-[#6b7385] text-center py-8">Sin propiedades con ubicación.</p>
          )}
        </div>
      </div>
      <div className="flex-1 rounded-[32px] overflow-hidden">
        <PropertiesMap properties={properties} height="100%" focusId={focusId} />
      </div>
    </div>
  );
}
