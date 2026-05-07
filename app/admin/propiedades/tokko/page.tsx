import Link from "next/link";
import { TokkoSync } from "@/components/TokkoSync";

export default function TokkoSyncPage() {
  const apiKeyConfigured = !!process.env.TOKKO_API_KEY;

  return (
    <div className="p-10 max-w-3xl space-y-6">
      <Link href="/admin/propiedades" className="text-sm text-ink-muted hover:text-ink inline-flex items-center gap-1">← Volver a propiedades</Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight mt-2">Sincronizar con Tokko</h1>
        <p className="text-sm text-ink-muted mt-1">Trae todas las propiedades de tu cuenta Tokko, con imágenes incluidas.</p>
      </div>

      {!apiKeyConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-semibold text-ink">⚠️ API Key no configurada</h3>
          <p className="text-sm text-ink-muted mt-2 leading-relaxed">
            Antes de poder sincronizar, agrega estas variables en Vercel → tu proyecto → Settings → Environment Variables:
          </p>
          <ul className="mt-3 space-y-1 text-sm text-ink font-mono">
            <li>• <strong>TOKKO_API_KEY</strong> = tu API key de Tokko</li>
            <li>• <strong>TOKKO_AGENCY_ID</strong> = ID de tu empresa (opcional)</li>
          </ul>
          <p className="text-xs text-ink-muted mt-3">
            Importante: NO uses prefijo NEXT_PUBLIC_ para estas — son secretas, solo el servidor las lee. Después de agregarlas, redeploya.
          </p>
        </div>
      )}

      <TokkoSync apiKeyConfigured={apiKeyConfigured} />

      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6">
        <h3 className="font-semibold text-ink">¿Qué hace esto exactamente?</h3>
        <ol className="mt-3 space-y-2 text-sm text-ink-muted leading-relaxed">
          <li><strong>1.</strong> Llama a la API de Tokko y descarga TODAS tus propiedades (las activas y las pausadas).</li>
          <li><strong>2.</strong> Mapea cada propiedad al formato del CRM (tipo, operación, precio, ubicación, características, etc.).</li>
          <li><strong>3.</strong> Para propiedades nuevas: las crea. Para propiedades existentes (mismo Tokko ID): las actualiza.</li>
          <li><strong>4.</strong> Por cada propiedad, importa todas sus fotos en orden, marcando la primera como portada.</li>
          <li><strong>5.</strong> No descargamos las imágenes (siguen alojadas en el CDN de Tokko). Si después quieres independizarte de Tokko, hacemos un proceso adicional.</li>
        </ol>
        <p className="text-xs text-ink-muted mt-4">
          Puedes correr esto cuando quieras — siempre actualiza con lo último de Tokko sin duplicar nada.
        </p>
      </div>
    </div>
  );
}
