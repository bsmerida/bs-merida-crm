"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { DUCLAUD_LOGO_WHITE } from "@/lib/duclaud-logo";

const NAV = [
  { href: "/",         l: "Inicio"   },
  { href: "/comprar",  l: "Comprar"  },
  { href: "/rentar",   l: "Rentar"   },
  { href: "/nosotros", l: "La firma" },
  { href: "/contacto", l: "Contacto" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  return (
    <header className="sticky top-0 z-30 bg-navy border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between gap-8">
        <Link href="/" className="select-none shrink-0">
          <Image
            src={DUCLAUD_LOGO_WHITE}
            alt="D.UCLAUD Bienes Raíces"
            width={200}
            height={56}
            className="h-12 w-auto"
            priority
          />
        </Link>
        <nav className="hidden md:flex items-center gap-7 flex-1 justify-center">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`text-[11px] tracking-[0.1em] uppercase transition-colors ${
                pathname === n.href ? "text-gold" : "text-white/50 hover:text-white/75"}`}>
              {n.l}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/login"
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-white/35 hover:text-white/60 transition-colors px-3 py-2 rounded-full border border-white/10 hover:border-white/25">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Staff
          </Link>
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-[11px] tracking-[0.08em] uppercase text-navy bg-gold hover:bg-gold-lt transition-colors px-5 py-2 rounded-full font-medium">
            Agendar consulta
          </a>
        </div>
      </div>
    </header>
  );
}
