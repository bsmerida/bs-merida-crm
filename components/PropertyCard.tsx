import Link from "next/link";
import type { Property } from "@/lib/supabase/types";

const fmt = (n: number, cur = "MXN") =>
  new Intl.NumberFormat(cur === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(n);

const IPin = () => <svg className="w-3.5 h-3.5 shrink-0 text-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IBed = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M3 7v13M21 7v13M3 14h18M3 7a4 4 0 014-4h10a4 4 0 014 4"/></svg>;
const IBath = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M4 12h16v3a5 5 0 01-5 5H9a5 5 0 01-5-5v-3z"/><path d="M6 12V5a2 2 0 014 0"/></svg>;
const ISqm = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1"/></svg>;

export function PropertyCard({ p, coverUrl }: { p: Property & { currency?: string }; coverUrl?: string | null }) {
  const currency = (p as any).currency || "MXN";
  return (
    <Link href={`/propiedad/${p.id}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-stone hover:border-gold/50 hover:shadow-float transition-all duration-300">
      <div className="relative aspect-[4/3] overflow-hidden bg-stone">
        {coverUrl ? (
          <img src={coverUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-navy/5">
            <svg className="w-12 h-12 text-stone-dk" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.08em] font-semibold px-2.5 py-1 rounded-full bg-white/95 text-navy shadow-sm">
            {p.operation}
          </span>
          <span className={`text-[10px] uppercase tracking-[0.06em] font-bold px-2.5 py-1 rounded-full shadow-sm ${currency === "USD" ? "bg-blue-100 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
            {currency}
          </span>
        </div>
      </div>
      <div className="p-5">
        <p className="text-[10px] uppercase tracking-[0.12em] text-ink-soft font-medium">{p.type}</p>
        <h3 className="font-medium text-navy mt-1 text-sm leading-snug truncate">{p.title}</h3>
        <div className="flex items-center gap-1.5 mt-2 text-xs text-ink-muted">
          <IPin />
          <span className="truncate">{[p.zone, p.city].filter(Boolean).join(" · ")}</span>
        </div>
        <div className="mt-4 pt-4 border-t border-stone flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-navy tracking-tight leading-tight">
              {fmt(Number(p.price), currency)}
            </p>
            {p.operation === "Renta" && <p className="text-[10px] text-ink-soft mt-0.5 uppercase tracking-wider">por mes</p>}
          </div>
          <div className="flex items-center gap-2.5 text-ink-muted">
            {p.bedrooms > 0  && <span className="flex items-center gap-1 text-xs font-medium"><IBed />{p.bedrooms}</span>}
            {p.bathrooms > 0 && <span className="flex items-center gap-1 text-xs font-medium"><IBath />{p.bathrooms}</span>}
            {p.m2_construction && <span className="flex items-center gap-1 text-xs font-medium"><ISqm />{p.m2_construction}m²</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
