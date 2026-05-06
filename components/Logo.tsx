"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type LogoProps = { className?: string; color?: string; showText?: boolean };

/**
 * Lee la URL del logo desde la tabla business_settings al primer render.
 * Si existe URL → muestra el logo subido.
 * Si NO existe o falla → cae al SVG dibujado (fallback).
 */
export function Logo({ className = "h-9", color = "#5E4B8E", showText = true }: LogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("business_settings").select("logo_url").eq("id", 1).single()
      .then(({ data }) => {
        if (data?.logo_url) setLogoUrl(data.logo_url);
        setLoaded(true);
      });
  }, []);

  // Mientras carga: SVG. Si tiene URL: imagen. Si falló: SVG.
  const useImage = loaded && logoUrl && !imgFailed;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {useImage ? (
        <img
          src={logoUrl}
          alt="Inmobiliaria BS Mérida"
          className="h-full w-auto"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <>
          <svg viewBox="0 0 200 240" className="h-full w-auto" xmlns="http://www.w3.org/2000/svg">
            <path d="M 30 215 L 30 95 L 80 62 L 80 215" fill="none" stroke={color} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 88 215 L 88 58 L 128 28 L 128 215 Z" fill={color} />
            <path d="M 135 215 L 135 35 L 180 4 L 180 215" fill="none" stroke={color} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {showText && (
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold tracking-tight" style={{ color }}>BS</span>
              <span className="opacity-40 font-light" style={{ color }}>|</span>
              <span className="font-medium tracking-wider text-[0.85em]" style={{ color }}>INMOBILIARIA</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
