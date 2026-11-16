import Link from "next/link";
import { FavoritoButton } from "./FavoritoButton";

const fmtPrice = (n: number, cur = "MXN") =>
  new Intl.NumberFormat(cur === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(n);

export function PropertyCardV3({ p, coverUrl }: { p: any; coverUrl?: string | null }) {
  const currency = p.currency || "MXN";
  return (
    <Link href={`/propiedad/${p.id}`} className="bg-white rounded-[40px] p-3 flex flex-col gap-3.5 hover:shadow-float transition-shadow">
      <div className="h-[300px] rounded-[30px] relative overflow-hidden bg-navy flex items-start justify-between p-4">
        {coverUrl
          ? <img src={coverUrl} alt={p.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(145deg, #2B3F68 0%, #1C2B4B 71%)" }} />}
        <span className="relative bg-white text-navy text-[13px] font-semibold px-4 py-2 rounded-full">{p.operation}</span>
        <FavoritoButton id={p.id} className="relative" />
      </div>
      <div className="px-2 pb-2 flex flex-col gap-1.5">
        <p className="font-semibold text-navy text-[31px] tracking-[-0.31px]">
          {fmtPrice(Number(p.price), currency)}
          {p.operation === "Renta" && <span className="text-base font-medium text-[#6b7385]"> / mes</span>}
        </p>
        <p className="font-medium text-navy text-lg truncate">{p.title}</p>
        <p className="text-[#6b7385] text-[15px] truncate">{[p.zone, p.city].filter(Boolean).join(", ")}</p>
        <div className="flex gap-1.5 pt-2 flex-wrap">
          {p.bedrooms > 0 && <span className="bg-stone text-navy text-[13px] font-medium px-4 py-2 rounded-full">{p.bedrooms} rec</span>}
          {p.bathrooms > 0 && <span className="bg-stone text-navy text-[13px] font-medium px-4 py-2 rounded-full">{p.bathrooms} baños</span>}
          {p.m2_construction && <span className="bg-stone text-navy text-[13px] font-medium px-4 py-2 rounded-full">{p.m2_construction} m²</span>}
        </div>
      </div>
    </Link>
  );
}
