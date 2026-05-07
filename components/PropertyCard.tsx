import Link from "next/link";
import { fmtMXN } from "@/lib/utils";
import { Icon } from "./Icon";
import type { Property } from "@/lib/supabase/types";

const PLACEHOLDER_EMOJI: Record<string, string> = {
  Casa: "🏡", Departamento: "🏢", Oficina: "🏢", Local: "🏬", Terreno: "🌳", Bodega: "🏭",
};

export function PropertyCard({ p, coverUrl }: { p: Property; coverUrl?: string | null }) {
  return (
    <Link href={`/propiedad/${p.id}`} className="block bg-white rounded-2xl border border-ink-line overflow-hidden hover:shadow-float hover:border-brand-200 transition">
      <div className="aspect-[4/3] bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center text-7xl relative overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={p.title} className="w-full h-full object-cover" />
        ) : (
          <span>{PLACEHOLDER_EMOJI[p.type] || "🏠"}</span>
        )}
        <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-medium bg-white/95 text-ink">{p.operation}</span>
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-ink tracking-tight">{p.title}</h3>
        <div className="text-xs text-ink-muted mt-1 truncate">{p.zone || p.city} · {p.state}</div>
        <div className="text-2xl font-semibold text-ink mt-3 tracking-tight">
          {fmtMXN(Number(p.price))}
          {p.operation === "Renta" && <span className="text-xs text-ink-muted font-normal"> /mes</span>}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-ink-muted">
          {p.bedrooms > 0 && <span className="flex items-center gap-1"><Icon name="bed" className="w-3.5 h-3.5"/>{p.bedrooms}</span>}
          {p.bathrooms > 0 && <span className="flex items-center gap-1"><Icon name="bath" className="w-3.5 h-3.5"/>{p.bathrooms}</span>}
          {p.m2_construction && <span className="flex items-center gap-1"><Icon name="sqm" className="w-3.5 h-3.5"/>{p.m2_construction} m²</span>}
          {p.parking > 0 && <span className="flex items-center gap-1"><Icon name="car" className="w-3.5 h-3.5"/>{p.parking}</span>}
        </div>
      </div>
    </Link>
  );
}
