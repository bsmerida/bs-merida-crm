"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TokkoSync({ apiKeyConfigured }: { apiKeyConfigured: boolean }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ total: number; synced: number; failed: number; images: number } | null>(null);
  const [error, setError] = useState<string>("");
  const router = useRouter();

  const sync = async () => {
    if (!confirm("Esto va a importar/actualizar todas tus propiedades de Tokko. ¿Continuar?")) return;
    setSyncing(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/tokko/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");
      setResult(data);
      setTimeout(() => router.refresh(), 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone shadow-card p-8">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-cream text-gold flex items-center justify-center text-2xl">🔄</div>
        <div className="flex-1">
          <h3 className="font-semibold text-navy">Sincronización completa con Tokko</h3>
          <p className="text-sm text-[#6b7385]">Trae propiedades + imágenes desde tu cuenta</p>
        </div>
      </div>

      <button
        onClick={sync}
        disabled={syncing || !apiKeyConfigured}
        className="w-full mt-6 bg-navy hover:bg-navy-mid disabled:opacity-50 text-white font-medium py-3 rounded-full"
      >
        {syncing ? "Sincronizando... esto puede tardar 1-3 minutos" : "Sincronizar ahora"}
      </button>

      {syncing && (
        <div className="mt-4 text-xs text-[#6b7385] text-center">
          Conectando con Tokko, descargando propiedades, mapeando imágenes…
        </div>
      )}

      {error && (
        <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="font-semibold text-navy">⚠️ Error en la sincronización</div>
          <div className="text-sm text-red-700 mt-1 break-words">{error}</div>
        </div>
      )}

      {result && (
        <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="font-semibold text-navy">✓ Sincronización completada</div>
          <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div><span className="text-[#6b7385]">Total recibidas:</span> <strong className="text-navy">{result.total}</strong></div>
            <div><span className="text-[#6b7385]">Guardadas:</span> <strong className="text-emerald-700">{result.synced}</strong></div>
            <div><span className="text-[#6b7385]">Fallaron:</span> <strong className={result.failed > 0 ? "text-red-700" : "text-[#6b7385]"}>{result.failed}</strong></div>
            <div><span className="text-[#6b7385]">Imágenes:</span> <strong className="text-navy">{result.images}</strong></div>
          </div>
          <div className="text-xs text-[#6b7385] mt-3">Ve a tu inventario para revisar las propiedades importadas.</div>
        </div>
      )}
    </div>
  );
}
