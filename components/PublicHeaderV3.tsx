import Link from "next/link";

export const NAV_V3 = [
  { href: "/",         l: "Inicio"             },
  { href: "/comprar",  l: "Comprar"            },
  { href: "/rentar",   l: "Rentar"             },
  { href: "/vender",   l: "Vender"             },
  { href: "/mapa",     l: "Mapa"               },
  { href: "/nosotros", l: "Acerca de nosotros" },
  { href: "/contacto", l: "Contacto"           },
];

export function PublicHeaderV3({ active }: { active: string }) {
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  return (
    <div className="flex items-center justify-between gap-3 md:gap-6 flex-wrap font-dmsans px-4 md:px-8 pt-5 md:pt-7 pb-3">
      <Link href="/" className="flex flex-col items-center gap-0.5 text-navy select-none min-w-0">
        <p className="font-serif text-2xl md:text-[34px] tracking-[1.12px] md:tracking-[1.36px] leading-none">D<span className="text-gold">.</span>UCLAUD</p>
        <p className="text-[9px] md:text-[10px] tracking-[2.8px] md:tracking-[3.4px] uppercase opacity-80">Bienes Raíces</p>
      </Link>
      <nav className="hidden lg:flex items-center gap-0.5 bg-stone rounded-full p-1.5">
        {NAV_V3.map(n => (
          <Link key={n.href} href={n.href}
            className={`px-5 py-2.5 rounded-full text-[15px] font-medium transition-colors whitespace-nowrap ${
              active === n.href ? "bg-navy text-white" : "text-navy hover:bg-navy/5"}`}>
            {n.l}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2 md:gap-2.5 shrink-0">
        <span className="bg-stone w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-navy shrink-0" title="Favoritos (próximamente)">
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
            <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.7 1-1a5.5 5.5 0 000-7.8z"/>
          </svg>
        </span>
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
          className="bg-navy hover:bg-navy-mid text-white px-5 md:px-[26px] py-3 md:py-[14px] rounded-full text-sm md:text-[15px] font-semibold transition-colors whitespace-nowrap">
          Agendar visita
        </a>
      </div>
    </div>
  );
}
