"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GeocodeBatchPage() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const supabase = createClient();

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const run = async () => {
    setRunning(true);
    setDone(false);
    setLog([]);

    // 1. Traer todas las propiedades sin coordenadas
    const { data: props, error } = await supabase
      .from("properties")
      .select("id, title, address, zone, city, state")
      .is("lat", null);

    if (error || !props) {
      addLog("❌ Error al cargar propiedades: " + error?.message);
      setRunning(false);
      return;
    }

    addLog(`📋 ${props.length} propiedades sin coordenadas. Iniciando...`);

    let ok = 0, fail = 0;

    for (const p of props) {
      const q = [p.address, p.zone, p.city, p.state, "México"].filter(Boolean).join(", ");
      if (!q.trim()) {
        addLog(`⚠️ Sin dirección: ${p.title}`);
        fail++;
        continue;
      }

      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = await res.json();

        if (res.ok && data.lat) {
          await supabase.from("properties").update({ lat: data.lat, lng: data.lng }).eq("id", p.id);
          addLog(`✓ ${p.title}`);
          ok++;
        } else {
          addLog(`✗ Sin resultado: ${p.title} (${q})`);
          fail++;
        }
      } catch {
        addLog(`✗ Error: ${p.title}`);
        fail++;
      }

      // 200ms entre requests para no sobrepasar rate limit
      await new Promise(r => setTimeout(r, 200));
    }

    addLog(`\n🏁 Listo. ✓ ${ok} actualizadas · ✗ ${fail} sin resultado.`);
    setDone(true);
    setRunning(false);
  };

  return (
    <div className="p-10 max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink tracking-tight">Geocodificar propiedades</h1>
      <p className="text-sm text-ink-muted mt-2 mb-6">
        Busca automáticamente las coordenadas de todas las propiedades que no tienen mapa todavía.
        Solo se procesan las que no tienen lat/lng — las que ya tienen coordenadas no se tocan.
      </p>

      <button
        onClick={run}
        disabled={running}
        className="px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white rounded-full font-medium"
      >
        {running ? "⏳ Procesando..." : "📍 Iniciar geocodificación"}
      </button>

      {done && (
        <div className="mt-4 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          ✓ Proceso terminado. Recarga la página de propiedades para ver los mapas.
        </div>
      )}

      {log.length > 0 && (
        <div className="mt-6 bg-ink-ghost rounded-2xl p-4 h-96 overflow-y-auto font-mono text-xs text-ink space-y-1">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
