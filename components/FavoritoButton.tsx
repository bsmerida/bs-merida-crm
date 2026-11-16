"use client";
import { useEffect, useState } from "react";
import { esFavorito, alternarFavorito, suscribirFavoritos } from "@/lib/favoritos";

export function FavoritoButton({ id, className = "" }: { id: string; className?: string }) {
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    setActivo(esFavorito(id));
    return suscribirFavoritos(() => setActivo(esFavorito(id)));
  }, [id]);

  return (
    <button
      type="button"
      onClick={e => { e.preventDefault(); e.stopPropagation(); setActivo(alternarFavorito(id)); }}
      aria-label={activo ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={`bg-white w-[42px] h-[42px] rounded-full flex items-center justify-center transition-transform active:scale-90 ${className}`}>
      <svg className={activo ? "w-[18px] h-[18px] text-gold" : "w-[18px] h-[18px] text-navy"}
        viewBox="0 0 24 24" fill={activo ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
        <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.7 1-1a5.5 5.5 0 000-7.8z"/>
      </svg>
    </button>
  );
}
