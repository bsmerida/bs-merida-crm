"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",         l: "Inicio"    },
  { href: "/comprar",  l: "Comprar"   },
  { href: "/rentar",   l: "Rentar"    },
  { href: "/nosotros", l: "La firma"  },
  { href: "/contacto", l: "Contacto"  },
];

export function PublicHeader() {
  const pathname = usePathname();
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  return (
    <header className="sticky top-0 z-30 bg-navy border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link href="/" className="select-none">
          <span className="font-serif text-xl font-light tracking-[0.16em] text-white uppercase">
            D<span className="text-gold mx-0.5">·</span>UCLAUD
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`text-[11px] tracking-[0.1em] uppercase transition-colors ${
                pathname === n.href ? "text-gold" : "text-white/50 hover:text-white/75"
              }`}>
              {n.l}
            </Link>
          ))}
        </nav>
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
          className="text-[11px] tracking-[0.08em] uppercase text-navy bg-gold hover:bg-gold-lt transition-colors px-5 py-2 font-medium">
          Agendar consulta
        </a>
      </div>
    </header>
  );
}
