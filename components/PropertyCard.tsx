import Link from "next/link";
import type { Property } from "@/lib/supabase/types";

const fmt = (n: number, cur = "MXN") =>
  new Intl.NumberFormat(cur === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(n);

export function PropertyCard({ p, coverUrl }: { p: Property & { currency?: string }; coverUrl?: string | null }) {
  const currency = (p as any).currency || "MXN";
  return (
    <Link href={`/propiedad/${p.id}`}
      className="group block border border-stone hover:border-gold/60 bg-white transition-colors duration-200">
      {/* Imagen */}
      <div className="relative aspect-[4/3] overflow-hidden bg-stone">
        {coverUrl ? (
          <img src={coverUrl} alt={p.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-stone-dk" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.08em] font-medium px-2.5 py-1 bg-white/95 text-navy">
            {p.operation}
          </span>
          <span className={`text-[10px] uppercase tracking-[0.06em] font-semibold px-2.5 py-1 ${
            currency === "USD" ? "bg-blue-50 text-blue-700" : "bg-gold-50 text-gold-dk"}`}>
            {currency}
          </span>
        </div>
      </div>
      {/* Info */}
      <div className="p-5">
        <p className="text-[10px] uppercase tracking-[0.1em] text-ink-soft font-medium">{p.type}</p>
        <h3 className="font-serif text-lg font-light text-navy mt-1 leading-snug truncate">{p.title}</h3>
        <div className="flex items-center gap-1.5 mt-2 text-xs text-ink-muted">
          <svg className="w-3.5 h-3.5 shrink-0 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="truncate">{[p.zone, p.city].filter(Boolean).join(" · ")}</span>
        </div>
        <div className="mt-4 pt-4 border-t border-stone flex items-end justify-between">
          <div>
            <p className="font-serif text-xl font-light text-navy">{fmt(Number(p.price), currency)}</p>
            {p.operation === "Renta" && <p className="text-[10px] text-ink-soft mt-0.5 uppercase tracking-wider">por mes</p>}
          </div>
          <div className="flex items-center gap-3 text-ink-muted">
            {p.bedrooms > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 7v13M21 7v13M3 14h18M3 7a4 4 0 014-4h10a4 4 0 014 4"/>
                </svg>{p.bedrooms}
              </span>
            )}
            {p.bathrooms > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 12h16M4 12V6a2 2 0 012-2h2M4 12v4a2 2 0 002 2h12a2 2 0 002-2v-4"/>
                </svg>{p.bathrooms}
              </span>
            )}
            {p.m2_construction && <span className="text-xs">{p.m2_construction}m²</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
