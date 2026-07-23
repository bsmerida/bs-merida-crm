// components/PropertiesMap.tsx
"use client";
import { useEffect, useRef, useState, useCallback } from "react";

type MapProperty = {
  id: string;
  title: string;
  price: number;
  operation: string;
  type: string;
  zone: string | null;
  lat: number;
  lng: number;
  images?: string[];  // múltiples imágenes
};

type Props = { properties: MapProperty[]; height?: string };

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

const MAP_STYLE = [
  { elementType: "geometry",           stylers: [{ color: "#f5f3ef" }] },
  { elementType: "labels.text.fill",   stylers: [{ color: "#6b5e4e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f3ef" }] },
  { featureType: "water",    elementType: "geometry",         stylers: [{ color: "#c9d8e8" }] },
  { featureType: "water",    elementType: "labels.text.fill", stylers: [{ color: "#9eb8cc" }] },
  { featureType: "road",     elementType: "geometry",         stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry",   stylers: [{ color: "#ede9e3" }] },
  { featureType: "road.highway",  elementType: "geometry",   stylers: [{ color: "#ddd5c8" }] },
  { featureType: "poi",            stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry",        stylers: [{ color: "#d8e8d0" }, { visibility: "on" }] },
  { featureType: "transit",        stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry",  stylers: [{ color: "#c8bfb5" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#7a6858" }] },
];

declare global { interface Window { google: any } }

let gmapsPromise: Promise<void> | null = null;
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve) => {
    if (window.google?.maps) { resolve(); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true; script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return gmapsPromise;
}

function makePinSvg(label: string, color: string): string {
  const w = Math.max(label.length * 7 + 20, 50);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="26">
    <rect x="0" y="0" width="${w}" height="26" rx="13" fill="${color}"/>
    <text x="${w/2}" y="17" text-anchor="middle" font-size="11" font-weight="700"
      font-family="sans-serif" fill="white">${label}</text>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

// ── Mini carrusel de imágenes ─────────────────────────────────────────────
function ImageCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return null;

  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); };
  const next = (e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); };

  return (
    <div className="relative w-full h-32 overflow-hidden bg-cream">
      <img
        src={images[idx]}
        alt=""
        className="w-full h-full object-cover transition-opacity duration-200"
      />
      {images.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <button onClick={next}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
          {/* Dots */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {images.slice(0, 5).map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition ${i === idx ? "bg-white" : "bg-white/40"}`}/>
            ))}
            {images.length > 5 && <span className="text-[9px] text-white/60 ml-0.5">+{images.length - 5}</span>}
          </div>
        </>
      )}
    </div>
  );
}

export function PropertiesMap({ properties, height = "600px" }: Props) {
  const mapRef  = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [selected, setSelected] = useState<MapProperty | null>(null);

  const handleSelect = useCallback((prop: MapProperty) => setSelected(prop), []);

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

    const init = async () => {
      await loadGoogleMaps(apiKey);
      const G = window.google.maps;
      const validProps = properties.filter(p => p.lat && p.lng);

      const map = new G.Map(mapRef.current, {
        center: { lat: 20.9674, lng: -89.5926 },
        zoom: 11,
        styles: MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: G.ControlPosition.RIGHT_BOTTOM },
        gestureHandling: "cooperative",
        clickableIcons: false,
      });
      mapInst.current = map;

      const newMarkers = validProps.map(prop => {
        const op    = prop.operation?.toLowerCase();
        const color = OP_COLOR[op] || "#0D1B2A";
        const label = formatPrice(prop.price);
        const w     = Math.max(label.length * 7 + 20, 50);

        const marker = new G.Marker({
          position: { lat: prop.lat, lng: prop.lng },
          map,
          icon: {
            url:    makePinSvg(label, color),
            size:   new G.Size(w, 26),
            anchor: new G.Point(w / 2, 13),
          },
          optimized: true,
        });

        marker.addListener("click", () => {
          handleSelect(prop);
          map.panTo({ lat: prop.lat, lng: prop.lng });
          if (map.getZoom() < 14) map.setZoom(14);
        });

        return marker;
      });

      markers.current = newMarkers;

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

    return () => {
      markers.current.forEach(m => m.setMap(null));
      markers.current = [];
    };
  }, []);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-stone" style={{ height }}>
      <div ref={mapRef} className="w-full h-full"/>

      {/* Leyenda */}
      <div className="absolute bottom-10 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-xl shadow px-3 py-2 flex items-center gap-3">
        {Object.entries(OP_COLOR).map(([op, color]) => (
          <div key={op} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }}/>
            <span className="text-[11px] text-ink-muted">{OP_LABEL[op]}</span>
          </div>
        ))}
      </div>

      {/* Card con carrusel */}
      {selected && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 w-72">
          <div className="bg-white rounded-2xl shadow-xl border border-stone overflow-hidden">
            <ImageCarousel images={selected.images || []}/>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy line-clamp-1">{selected.title}</p>
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
                  <p className="text-base font-bold text-navy">${selected.price.toLocaleString("es-MX")}</p>
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
