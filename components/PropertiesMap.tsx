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

// Estilo Google Maps sobrio y elegante
const MAP_STYLE = [
  { elementType: "geometry",        stylers: [{ color: "#f5f3ef" }] },
  { elementType: "labels.text.fill",stylers: [{ color: "#6b5e4e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f3ef" }] },
  { featureType: "water",           elementType: "geometry",    stylers: [{ color: "#c9d8e8" }] },
  { featureType: "water",           elementType: "labels.text.fill", stylers: [{ color: "#9eb8cc" }] },
  { featureType: "road",            elementType: "geometry",    stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial",   elementType: "geometry",    stylers: [{ color: "#ede9e3" }] },
  { featureType: "road.highway",    elementType: "geometry",    stylers: [{ color: "#ddd5c8" }] },
  { featureType: "poi",             stylers: [{ visibility: "off" }] },
  { featureType: "poi.park",        elementType: "geometry",    stylers: [{ color: "#d8e8d0" }, { visibility: "on" }] },
  { featureType: "transit",         stylers: [{ visibility: "off" }] },
  { featureType: "administrative",  elementType: "geometry",    stylers: [{ color: "#c8bfb5" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9a8070" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#7a6858" }] },
];

declare global {
  interface Window { google: any; __gmapsLoaded?: boolean; }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.maps) { resolve(); return; }
    if (window.__gmapsLoaded) {
      const interval = setInterval(() => {
        if (window.google?.maps) { clearInterval(interval); resolve(); }
      }, 100);
      return;
    }
    window.__gmapsLoaded = true;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export function PropertiesMap({ properties, height = "600px" }: Props) {
  const mapRef    = useRef<HTMLDivElement>(null);
  const mapInst   = useRef<any>(null);
  const [loaded,   setLoaded]   = useState(false);
  const [selected, setSelected] = useState<MapProperty | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

    const init = async () => {
      await loadGoogleMaps(apiKey);
      const G = window.google.maps;

      const validProps = properties.filter(p => p.lat && p.lng);
      const center = { lat: 20.9674, lng: -89.5926 }; // Mérida

      const map = new G.Map(mapRef.current, {
        center,
        zoom: 11,
        styles: MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: G.ControlPosition.RIGHT_BOTTOM },
        gestureHandling: "cooperative",
      });
      mapInst.current = map;

      // Crear marcadores
      validProps.forEach(prop => {
        const op    = prop.operation?.toLowerCase();
        const color = OP_COLOR[op] || "#0D1B2A";

        const marker = new G.Marker({
          position: { lat: prop.lat, lng: prop.lng },
          map,
          label: {
            text: formatPrice(prop.price),
            color: "white",
            fontSize: "11px",
            fontWeight: "700",
            fontFamily: "sans-serif",
          },
          icon: {
            path: G.SymbolPath.CIRCLE,
            scale: 0,
          },
        });

        // Overlay personalizado con div
        const overlay = new G.OverlayView();
        overlay.onAdd = function() {
          const div = document.createElement("div");
          div.style.cssText = `
            position: absolute;
            background: ${color};
            color: white;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            font-family: sans-serif;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            border: 2px solid rgba(255,255,255,0.2);
            cursor: pointer;
            transform: translate(-50%, -50%);
          `;
          div.textContent = formatPrice(prop.price);
          div.addEventListener("click", () => {
            setSelected(prop);
            map.panTo({ lat: prop.lat, lng: prop.lng });
            if (map.getZoom() < 14) map.setZoom(14);
          });
          this.getPanes().overlayMouseTarget.appendChild(div);
          this._div = div;
        };
        overlay.draw = function() {
          const point = this.getProjection().fromLatLngToDivPixel(
            new G.LatLng(prop.lat, prop.lng)
          );
          if (point) {
            this._div.style.left = point.x + "px";
            this._div.style.top  = point.y + "px";
          }
        };
        overlay.setMap(map);
      });

      // Fit bounds
      if (validProps.length > 1) {
        const bounds = new G.LatLngBounds();
        validProps.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
        map.fitBounds(bounds, 60);
        G.event.addListenerOnce(map, "idle", () => {
          if (map.getZoom() > 13) map.setZoom(13);
        });
      }

      setLoaded(true);
    };

    init();
  }, []);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-stone" style={{ height }}>
      <div ref={mapRef} className="w-full h-full"/>

      {/* Leyenda — abajo izquierda */}
      <div className="absolute bottom-10 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-xl shadow px-3 py-2 flex items-center gap-3">
        {Object.entries(OP_COLOR).map(([op, color]) => (
          <div key={op} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }}/>
            <span className="text-[11px] text-ink-muted">{OP_LABEL[op]}</span>
          </div>
        ))}
      </div>

      {/* Card propiedad seleccionada */}
      {selected && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 w-80">
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
        <div className="absolute inset-0 bg-cream flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin"/>
        </div>
      )}
    </div>
  );
}
