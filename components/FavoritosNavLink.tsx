"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listaFavoritos, suscribirFavoritos } from "@/lib/favoritos";

export function FavoritosNavLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const actualizar = () => setCount(listaFavoritos().length);
    actualizar();
    return suscribirFavoritos(actualizar);
  }, []);

  return (
    <Link href="/favoritos" className="relative bg-stone hover:bg-stone-dk w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-navy shrink-0 transition-colors" aria-label="Favoritos">
      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.7 1-1a5.5 5.5 0 000-7.8z"/>
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-gold text-white text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}
