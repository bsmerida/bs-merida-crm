// components/PropertiesMap.tsx
"use client";
import { useEffect, useRef, useState } from "react";

type MapProperty = {
  id: string;
  title: string;
  price: number;
  operation: string;
  type: string;
  zone: string | null;
  lat: number;
  lng: number;
  image?: string | null;
};

type Props = {
  properties: MapProperty[];
  height?: string;
};

function formatPrice(price: number) {
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000)     return `$${(price / 1_000).toFixed(0)}K`;
  return `$${price.toLocaleString()}`;
}

const OP_COLOR: Record<string, string> = {
  venta:  "#0D1B2A",
  renta:  "#C4956A",
  ambas:  "#2D5A8E",
};

export function PropertiesMap({ properties, height = "600px" }: Props) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const mapInst    = useRef<any>(null);
  const [loaded,   setLoaded]   = useState(false);
  const [selected, setSelected] = useState<MapProperty | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;

    // CSS de Leaflet
    if (!document.getElementById("leaflet-css")) {
      const link    = document.createElement("link");
      link.id       = "leaflet-css";
      link.rel      = "stylesheet";
      link.href     = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
    }

    const init = async () => {
      const L = (await import("leaflet")).default;

      // Centro en Mérida por defecto
      const validProps = properties.filter(p => p.lat && p.lng);
      const center: [number, number] = validProps.length > 0
        ? [
            validProps.reduce((s, p) => s + p.lat, 0) / validProps.length,
            validProps.reduce((s, p) => s + p.lng, 0) / validProps.length,
          ]
        : [20.9674, -89.5926];

      const map = L.map(mapRef.current!, {
        center,
        zoom: 12,
        zoomControl: true,
      });
      mapInst.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Pins personalizados por operación
      validProps.forEach(prop => {
        const color = OP_COLOR[prop.operation?.toLowerCase()] || "#0D1B2A";
        const priceLabel = formatPrice(prop.price);

        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              background: ${color};
              color: white;
              padding: 5px 10px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 700;
              font-family: sans-serif;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 2px solid ${color === "#C4956A" ? "#fff" : "#C4956A"};
              cursor: pointer;
            ">${priceLabel}</div>
          `,
          iconAnchor: [0, 0],
        });

        const marker = L.marker([prop.lat, prop.lng], { icon }).addTo(map);
        marker.on("click", () => {
          setSelected(prop);
          map.setView([prop.lat, prop.lng], Math.max(map.getZoom(), 14));
        });
      });

      setLoaded(true);
    };

    init();

    return () => {
      if (mapInst.current) {
        mapInst.current.remove();
        mapInst.current = null;
      }
    };
  }, []);

  const opLabel: Record<string, string> = {
    venta: "Venta",
    renta: "Renta",
    ambas: "Venta y Renta",
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-stone" style={{ height }}>
      {/* Mapa */}
      <div ref={mapRef} className="w-full h-full"/>

      {/* Leyenda */}
      <div className="absolute top-3 left-3 z-[1000] bg-white rounded-xl shadow-md px-3 py-2 flex items-center gap-3">
        {Object.entries(OP_COLOR).map(([op, color]) => (
          <div key={op} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: color }}/>
            <span className="text-[11px] text-ink-muted capitalize">{opLabel[op]}</span>
          </div>
        ))}
      </div>

      {/* Card de propiedad seleccionada */}
      {selected && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-80">
          <div className="bg-white rounded-2xl shadow-xl border border-stone overflow-hidden">
            {selected.image && (
              <img src={selected.image} alt={selected.title}
                className="w-full h-32 object-cover"/>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy line-clamp-2">{selected.title}</p>
                  {selected.zone && (
                    <p className="text-xs text-ink-muted mt-0.5">{selected.zone}</p>
                  )}
                </div>
                <button onClick={() => setSelected(null)}
                  className="text-ink-soft hover:text-navy p-1 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-lg font-bold text-navy">
                    ${selected.price.toLocaleString("es-MX")}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gold">
                    {selected.type} · {opLabel[selected.operation?.toLowerCase()] || selected.operation}
                  </p>
                </div>
                <a href={`/propiedad/${selected.id}`}
                  className="bg-navy text-white text-xs font-medium px-4 py-2 rounded-full hover:bg-navy/90 transition">
                  Ver →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loaded && (
        <div className="absolute inset-0 bg-cream flex items-center justify-center z-[999]">
          <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin"/>
        </div>
      )}
    </div>
  );
}
