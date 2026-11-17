"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GeocodeRunner() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const supabase = createClient();

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const run = async () => {
    setRunning(true);
    setDone(false);
    setLog([]);

    const { data: props, error } = await supabase
      .from("properties")
      .select("id, title, address, zone, city, state")
      .is("lat", null);

    if (error || !props) {
      addLog("❌ Error al cargar propiedades: " + error?.message);
      setRunning(false);
      return;
    }

    addLog(`${props.length} propiedades sin coordenadas. Iniciando...`);

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
          const { data: saved } = await supabase.from("properties").update({ lat: data.lat, lng: data.lng }).eq("id", p.id).select("id");
          if (saved?.length) { addLog(`✓ ${p.title}`); ok++; }
          else { addLog(`✗ No se pudo guardar: ${p.title}`); fail++; }
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
    <>
      <button
        onClick={run}
        disabled={running}
        className="px-6 py-3 bg-navy hover:bg-navy-mid disabled:opacity-50 text-white rounded-full font-medium text-sm shrink-0"
      >
        {running ? "Procesando..." : "Iniciar"}
      </button>

      {done && (
        <div className="mt-4 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          ✓ Proceso terminado. Recarga la página de propiedades para ver los mapas.
        </div>
      )}

      {log.length > 0 && (
        <div className="mt-4 bg-stone rounded-2xl p-4 h-72 overflow-y-auto font-mono text-xs text-navy space-y-1">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </>
  );
}
