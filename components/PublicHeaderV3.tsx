"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import { FavoritosNavLink } from "./FavoritosNavLink";
import { NAV_V3 } from "@/lib/public-nav";

export function PublicHeaderV3({ active }: { active: string }) {
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  const [open, setOpen] = useState(false);

  return (
    <div className="font-dmsans">
      <div className="flex items-center justify-between gap-3 md:gap-6 flex-wrap px-4 md:px-8 pt-5 md:pt-7 pb-3">
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
          <FavoritosNavLink />
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:inline-block bg-navy hover:bg-navy-mid text-white px-5 md:px-[26px] py-3 md:py-[14px] rounded-full text-sm md:text-[15px] font-semibold transition-colors whitespace-nowrap">
            Agendar visita
          </a>
          <button onClick={() => setOpen(true)} aria-label="Abrir menú"
            className="lg:hidden w-11 h-11 flex items-center justify-center bg-navy hover:bg-navy-mid rounded-full text-white transition-colors shrink-0">
            <Icon name="menu" className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Menú móvil: pantalla completa */}
      {open && (
        <div className="fixed inset-0 z-50 bg-navy flex flex-col lg:hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
            <Link href="/" onClick={() => setOpen(false)} className="flex flex-col gap-0.5 text-white select-none">
              <p className="font-serif text-2xl tracking-[1.12px] leading-none">D<span className="text-gold">.</span>UCLAUD</p>
              <p className="text-[9px] tracking-[2.8px] uppercase opacity-70">Bienes Raíces</p>
            </Link>
            <button onClick={() => setOpen(false)} aria-label="Cerrar menú"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
              <Icon name="close" className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-6 pt-6 space-y-1">
            {NAV_V3.map(n => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                className={`flex items-center justify-between py-3 font-serif text-[32px] transition-colors ${
                  active === n.href ? "text-gold" : "text-white hover:text-gold/80"}`}>
                {n.l}
                <Icon name="arrowRight" className="w-4 h-4 opacity-50" />
              </Link>
            ))}
          </nav>

          <div className="px-6 pb-8 pt-4 space-y-3 shrink-0">
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
              className="block text-center bg-white text-navy font-semibold py-4 rounded-full">
              Agendar visita
            </a>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
              className="block text-center border border-white/30 text-white font-semibold py-4 rounded-full">
              Escribir por WhatsApp
            </a>
            <p className="text-center text-white/60 text-sm pt-2">999 746 6272 · Mérida, Yucatán</p>
          </div>
        </div>
      )}
    </div>
  );
}
