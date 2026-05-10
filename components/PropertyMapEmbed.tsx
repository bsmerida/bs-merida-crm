"use client";
import { useEffect, useRef } from "react";

type Props = { lat: number; lng: number; title: string };

export function PropertyMapEmbed({ lat, lng, title }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
    }

    const loadMap = async () => {
      const L = (await import("leaflet")).default;

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
        attributionControl: false,
      });

      // Tiles con mejor diseño (CartoDB Positron — más limpio y moderno)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Pin personalizado
      const icon = L.divIcon({
        html: `<div style="
          width: 36px; height: 36px;
          background: #5E4B8E;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        className: "",
      });

      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<strong style="font-family:sans-serif;font-size:13px">${title}</strong>`)
        .openPopup();

      mapInstanceRef.current = map;
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, title]);

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="w-full rounded-2xl overflow-hidden border border-ink-line"
        style={{ height: "320px" }}
      />
      <a
        href={`https://maps.google.com/?q=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-ink-muted hover:text-brand-600 flex items-center gap-1"
      >
        <span>↗</span> Abrir en Google Maps
      </a>
    </div>
  );
}
