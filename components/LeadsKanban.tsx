"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const COLUMNAS = [
  "Nuevo", "Contactado", "Calificado", "Visita agendada",
  "Visita realizada", "Oferta", "Negociación", "Cerrado ganado", "Cerrado perdido",
];

type Lead = any;

const hace = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "Hace unos min";
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  return `Hace ${d} d`;
};

const subtitulo = (l: Lead) => {
  const tipos = Array.isArray(l.search_types) ? l.search_types.join(", ") : l.search_types;
  const presupuesto = l.budget_max ? `hasta $${(Number(l.budget_max) / 1_000_000).toFixed(1)}M` : null;
  return [tipos, presupuesto].filter(Boolean).join(" · ") || l.interest || "Sin detalles";
};

export function LeadsKanban({ leads, setLeads }: { leads: Lead[]; setLeads: (fn: (prev: Lead[]) => Lead[]) => void }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const supabase = createClient();

  const moverA = async (id: string, status: string) => {
    const previo = leads.find(l => l.id === id)?.status;
    if (!id || previo === status) return;
    setSaving(id);
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, status } : l)));
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) {
      setLeads(prev => prev.map(l => (l.id === id ? { ...l, status: previo } : l)));
      alert("No se pudo mover el cliente. Intenta de nuevo.");
    }
    setSaving(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNAS.map(col => {
        const items = leads.filter(l => l.status === col);
        return (
          <div key={col}
            onDragOver={e => { e.preventDefault(); setOverCol(col); }}
            onDragLeave={() => setOverCol(c => (c === col ? null : c))}
            onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); setOverCol(null); moverA(id, col); }}
            className={`flex flex-col gap-2.5 px-3 py-3.5 rounded-[28px] shrink-0 w-[240px] transition-colors ${overCol === col ? "bg-stone-dk" : "bg-stone"}`}>
            <div className="flex items-center justify-between px-1 pb-1.5">
              <p className="text-navy text-sm font-semibold">{col}</p>
              <span className="bg-white text-navy text-xs font-semibold px-2.5 py-0.5 rounded-full">{items.length}</span>
            </div>
            {items.map(l => (
              <Link key={l.id} href={`/admin/leads/${l.id}`}
                draggable
                onDragStart={e => { e.dataTransfer.setData("text/plain", l.id); setDragId(l.id); }}
                onDragEnd={() => setDragId(null)}
                className={`bg-white rounded-[22px] p-4 flex flex-col gap-2.5 cursor-grab active:cursor-grabbing transition-opacity ${dragId === l.id || saving === l.id ? "opacity-50" : "hover:shadow-float"}`}>
                <div className="flex items-center gap-2.5">
                  <div className="bg-stone w-[34px] h-[34px] rounded-full flex items-center justify-center text-navy text-xs font-semibold shrink-0">
                    {l.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-navy text-sm font-semibold truncate">{l.name}</p>
                    <p className="text-[#6b7385] text-xs truncate">{subtitulo(l)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="bg-stone text-navy text-[11px] font-medium px-2.5 py-1 rounded-full truncate max-w-[55%]">{l.source || "Sin origen"}</span>
                  <p className="text-[#6b7385] text-[11px] shrink-0">{hace(l.created_at)}</p>
                </div>
              </Link>
            ))}
            {items.length === 0 && (
              <div className="text-center text-[#6b7385] text-xs py-6">Sin clientes</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
