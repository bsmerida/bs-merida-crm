"use client";
// Pantalla cuando una página falla. Si el error es porque se publicó una versión
// nueva mientras la página estaba abierta (faltan archivos de la versión vieja),
// recarga sola una vez.
import { useEffect } from "react";
import { esVersionNueva } from "@/lib/estado";

const CLAVE_RECARGA = "duclaud:recarga-por-version";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    if (!esVersionNueva(error)) return;
    try {
      // Solo una vez por pestaña, para no quedar en un ciclo de recargas
      if (sessionStorage.getItem(CLAVE_RECARGA)) return;
      sessionStorage.setItem(CLAVE_RECARGA, "1");
    } catch { /* sin almacenamiento: recargar de todos modos */ }
    window.location.reload();
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-ink">Algo salió mal</h1>
        <p className="text-sm text-ink-muted mt-3">
          No pudimos cargar esta página. Intenta de nuevo; si sigue pasando, recarga el navegador.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <button onClick={reset} className="px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium">
            Intentar de nuevo
          </button>
          <a href="/" className="px-5 py-2.5 rounded-full border border-ink-line text-sm text-ink">Ir al inicio</a>
        </div>
        {error.digest && <p className="text-xs text-ink-muted mt-6">Código: {error.digest}</p>}
      </div>
    </div>
  );
}
