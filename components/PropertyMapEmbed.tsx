"use client";
import { useEffect, useRef } from "react";

type Props = { lat: number; lng: number; title: string };

export function PropertyMapEmbed({ lat, lng, title }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Cargar Leaflet dinámicamente para no afectar SSR
    const loadLeaflet = async () => {
      const L = (await import("leaflet")).default;

      // Fix para los íconos de Leaflet en Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<strong>${title}</strong>`)
        .openPopup();

      mapInstanceRef.current = map;
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, title]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div
        ref={mapRef}
        className="w-full h-64 rounded-2xl overflow-hidden border border-ink-line"
      />
      <a
        href={`https://maps.google.com/?q=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-ink-muted hover:text-brand-600 mt-2 inline-block"
      >
        Abrir en Google Maps ↗
      </a>
    </>
  );
}
