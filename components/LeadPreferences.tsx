"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const TIPOS = ["Casa", "Departamento", "Oficina", "Local", "Terreno", "Bodega"];
const AMENIDADES = ["Alberca", "Jardín", "Roof garden", "Elevador", "Seguridad 24h", "Cuarto de servicio", "Bodega", "Gimnasio", "Área de juegos", "Vista al mar"];

type Zone = { name: string; city: string; label: string; lat: number; lng: number; count?: number };

type Prefs = {
  zones: Zone[];
  operation: string;
  types: string[];
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  bathrooms_min: number | null;
  m2_construction_min: number | null;
  m2_land_min: number | null;
  radius_km: number;
  amenities: string[];
  search_notes: string;
};

const DEFAULT: Prefs = {
  zones: [], operation: "", types: [], bedrooms_min: null, bedrooms_max: null,
  bathrooms_min: null, m2_construction_min: null, m2_land_min: null,
  radius_km: 3, amenities: [], search_notes: "",
};

export function LeadPreferences({ lead, onSaved }: { lead: any; onSaved?: () => void }) {
  const supabase = createClient();
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT, ...(lead.preferences || {}) });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Zone autocomplete
  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [zoneQuery, setZoneQuery] = useState("");
  const [zoneSuggestions, setZoneSuggestions] = useState<Zone[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/zones").then(r => r.json()).then(setAllZones);
  }, []);

  useEffect(() => {
    if (!zoneQuery.trim()) { setZoneSuggestions([]); return; }
    const q = zoneQuery.toLowerCase();
    setZoneSuggestions(allZones.filter(z => z.label.toLowerCase().includes(q)).slice(0, 8));
    setShowSugg(true);
  }, [zoneQuery, allZones]);

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) setShowSugg(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const set = useCallback(<K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs(p => ({ ...p, [k]: v })), []);

  const addZone = (z: Zone) => {
    if (prefs.zones.find(z2 => z2.label === z.label)) return;
    set("zones", [...prefs.zones, z]);
    setZoneQuery("");
    setShowSugg(false);
  };

  const removeZone = (label: string) => set("zones", prefs.zones.filter(z => z.label !== label));

  const toggleType = (t: string) =>
    set("types", prefs.types.includes(t) ? prefs.types.filter(x => x !== t) : [...prefs.types, t]);

  const toggleAmenidad = (a: string) =>
    set("amenities", prefs.amenities.includes(a) ? prefs.amenities.filter(x => x !== a) : [...prefs.amenities, a]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("leads").update({ preferences: prefs }).eq("id", lead.id);
    setSaving(false);
    if (!error) {
      setSavedAt(new Date().toLocaleTimeString("es-MX"));
      onSaved?.();
    } else {
      alert("Error al guardar: " + error.message);
    }
  };

  const inp = "w-full bg-ink-ghost border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-brand-300";
  const numInp = "w-full bg-ink-ghost border border-transparent rounded-xl px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-brand-300 text-center";

  return (
    <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink">¿Qué está buscando?</h3>
          <p className="text-xs text-ink-muted mt-0.5">La IA usa esto para sugerir propiedades con precisión</p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-emerald-600">✓ Guardado {savedAt}</span>}
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-full text-sm font-medium disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      {/* Zonas deseadas */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Zonas deseadas</label>

        {/* Chips de zonas seleccionadas */}
        {prefs.zones.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {prefs.zones.map(z => (
              <div key={z.label} className="flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-700 text-sm px-3 py-1.5 rounded-full">
                <span>📍 {z.label}</span>
                <button onClick={() => removeZone(z.label)} className="hover:text-red-500 text-base leading-none">×</button>
              </div>
            ))}
          </div>
        )}

        {/* Buscador de zonas */}
        <div className="space-y-2">
          <div ref={zoneRef} className="relative">
            <input
              value={zoneQuery}
              onChange={e => setZoneQuery(e.target.value)}
              onFocus={() => zoneQuery && setShowSugg(true)}
              placeholder="Buscar zona, colonia o ciudad..."
              className={inp}
            />
            {showSugg && zoneSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-ink-line rounded-xl shadow-lg z-20 overflow-hidden">
                {zoneSuggestions.map(z => (
                  <button key={z.label} onClick={() => addZone(z)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-ink-ghost flex items-center gap-2">
                    <span className="text-brand-500">📍</span>
                    <span className="text-ink">{z.label}</span>
                    <span className="text-ink-muted text-xs ml-auto">{z.count} prop.</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Radio de búsqueda */}
          {prefs.zones.length > 0 && (
            <div className="flex items-center gap-3 text-sm text-ink-muted">
              <span>Radio de búsqueda:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 5, 8].map(km => (
                  <button key={km} onClick={() => set("radius_km", km)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${prefs.radius_km === km ? "bg-brand-500 text-white border-brand-500" : "bg-white text-ink border-ink-line hover:border-brand-300"}`}>
                    {km} km
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Operación y tipo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Operación</label>
          <div className="flex gap-2">
            {["Venta", "Renta"].map(op => (
              <button key={op} onClick={() => set("operation", prefs.operation === op ? "" : op)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${prefs.operation === op ? "bg-brand-500 text-white border-brand-500" : "bg-ink-ghost border-transparent text-ink hover:border-brand-300"}`}>
                {op === "Venta" ? "Comprar" : "Rentar"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Tipo de propiedad</label>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS.map(t => (
              <button key={t} onClick={() => toggleType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${prefs.types.includes(t) ? "bg-brand-500 text-white border-brand-500" : "bg-ink-ghost border-transparent text-ink hover:border-brand-300"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recámaras y baños */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block text-center">Rec. mín</label>
          <input type="number" min="0" max="10" value={prefs.bedrooms_min ?? ""} onChange={e => set("bedrooms_min", e.target.value ? Number(e.target.value) : null)} placeholder="—" className={numInp} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block text-center">Rec. máx</label>
          <input type="number" min="0" max="10" value={prefs.bedrooms_max ?? ""} onChange={e => set("bedrooms_max", e.target.value ? Number(e.target.value) : null)} placeholder="—" className={numInp} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block text-center">Baños mín</label>
          <input type="number" min="0" max="10" value={prefs.bathrooms_min ?? ""} onChange={e => set("bathrooms_min", e.target.value ? Number(e.target.value) : null)} placeholder="—" className={numInp} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block text-center">m² constr. mín</label>
          <input type="number" min="0" value={prefs.m2_construction_min ?? ""} onChange={e => set("m2_construction_min", e.target.value ? Number(e.target.value) : null)} placeholder="—" className={numInp} />
        </div>
      </div>

      {/* m² terreno */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">m² terreno mínimo</label>
          <input type="number" min="0" value={prefs.m2_land_min ?? ""} onChange={e => set("m2_land_min", e.target.value ? Number(e.target.value) : null)} placeholder="Sin mínimo" className={inp} />
        </div>
      </div>

      {/* Amenidades */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Características importantes</label>
        <div className="flex flex-wrap gap-2">
          {AMENIDADES.map(a => (
            <button key={a} onClick={() => toggleAmenidad(a)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${prefs.amenities.includes(a) ? "bg-emerald-500 text-white border-emerald-500" : "bg-ink-ghost border-transparent text-ink hover:border-emerald-300"}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Notas adicionales de búsqueda</label>
        <textarea value={prefs.search_notes} onChange={e => set("search_notes", e.target.value)}
          placeholder="Ej: No quiere planta baja, necesita cuarto de servicio, busca algo moderno..."
          rows={2} className={`${inp} resize-none`} />
      </div>
    </div>
  );
}
