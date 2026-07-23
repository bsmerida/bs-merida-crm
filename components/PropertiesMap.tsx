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
  venta: "#0D1B2A",
  renta: "#C4956A",
  ambas: "#2D5A8E",
};

const OP_LABEL: Record<string, string> = {
  venta: "Venta",
  renta: "Renta",
  ambas: "Venta y Renta",
};

export function PropertiesMap({ properties, height = "600px" }: Props) {
  const mapRef  = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);
  const [loaded,   setLoaded]   = useState(false);
  const [selected, setSelected] = useState<MapProperty | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
    }

    const init = async () => {
      const L = (await import("leaflet")).default;

      const validProps = properties.filter(p => p.lat && p.lng);

      // Zoom inicial en Mérida / Yucatán — no México entero
      const defaultCenter: [number, number] = [20.9674, -89.5926];
      const defaultZoom = validProps.length > 0 ? 11 : 10;

      const map = L.map(mapRef.current!, {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: false, // lo ponemos abajo derecha manualmente
      });
      mapInst.current = map;

      // Controles de zoom — abajo derecha
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Tile limpio y elegante (CartoDB Positron — gris minimalista)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Pins
      validProps.forEach(prop => {
        const op    = prop.operation?.toLowerCase();
        const color = OP_COLOR[op] || "#0D1B2A";

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            background:${color};
            color:white;
            padding:4px 10px;
            border-radius:20px;
            font-size:11px;
            font-weight:700;
            font-family:sans-serif;
            white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
            border:2px solid rgba(255,255,255,0.2);
            cursor:pointer;
            transition:transform .15s;
          ">${formatPrice(prop.price)}</div>`,
          iconAnchor: [0, 0],
        });

        const marker = L.marker([prop.lat, prop.lng], { icon }).addTo(map);
        marker.on("click", () => {
          setSelected(prop);
          map.setView([prop.lat, prop.lng], Math.max(map.getZoom(), 14));
        });
      });

      // Fit bounds si hay propiedades
      if (validProps.length > 1) {
        const bounds = L.latLngBounds(validProps.map(p => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
      }

      setLoaded(true);
    };

    init();

    return () => {
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
    };
  }, []);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-stone" style={{ height }}>
      <div ref={mapRef} className="w-full h-full"/>

      {/* Leyenda — abajo izquierda, sobre el mapa */}
      <div className="absolute bottom-10 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl shadow px-3 py-2 flex items-center gap-3">
        {Object.entries(OP_COLOR).map(([op, color]) => (
          <div key={op} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }}/>
            <span className="text-[11px] text-ink-muted">{OP_LABEL[op]}</span>
          </div>
        ))}
      </div>

      {/* Card propiedad seleccionada */}
      {selected && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[1000] w-80">
          <div className="bg-white rounded-2xl shadow-xl border border-stone overflow-hidden">
            {selected.image && (
              <img src={selected.image} alt={selected.title} className="w-full h-32 object-cover"/>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy line-clamp-2">{selected.title}</p>
                  {selected.zone && <p className="text-xs text-ink-muted mt-0.5">{selected.zone}</p>}
                </div>
                <button onClick={() => setSelected(null)} className="text-ink-soft hover:text-navy p-1 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-lg font-bold text-navy">${selected.price.toLocaleString("es-MX")}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gold">
                    {selected.type} · {OP_LABEL[selected.operation?.toLowerCase()] || selected.operation}
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
