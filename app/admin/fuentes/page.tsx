// app/admin/fuentes/page.tsx
// Agente de fuentes: borradores por revisar (carrusel), estado de las carpetas
// de los proveedores, cambios de archivos y lo que el agente ha aprendido.
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { getAuth } from "@/lib/auth";
import { FuentesRevision } from "@/components/FuentesRevision";
import { FuentesPanel } from "@/components/FuentesPanel";

export const dynamic = "force-dynamic";

export default async function FuentesPage() {
  const auth = await getAuth();
  if (!auth?.isAdmin) redirect("/admin");
  const supabase = createAdminClient();

  const [{ data: fuentes }, { data: borradores }, { data: cambios }, { count: totalCambios }, { data: lecciones }, { data: corridas }] = await Promise.all([
    supabase.from("fuentes").select("*").order("id"),
    supabase.from("propiedad_borradores")
      .select("id, fuente_id, accion, property_id, datos, cambios, fotos, extra, evidencia, dudas, coincidencia, created_at")
      .eq("estado", "Pendiente").order("created_at", { ascending: true }).limit(200),
    supabase.from("fuente_cambios").select("id, fuente_id, tipo, nombre, ruta, detectado_en")
      .eq("revisado", false).order("detectado_en", { ascending: false }).limit(500),
    supabase.from("fuente_cambios").select("id", { count: "exact", head: true }).eq("revisado", false),
    supabase.from("agente_lecciones").select("id, paso, leccion, created_at").eq("activa", true).order("created_at", { ascending: false }).limit(100),
    supabase.from("agente_corridas").select("inicio, fin, costo_usd, resumen, errores").order("inicio", { ascending: false }).limit(1),
  ]);

  const lista = fuentes || [];
  const pendientes = borradores || [];
  const ultima = corridas?.[0] || null;
  const proveedores = Object.fromEntries(lista.map(f => [f.id, `${f.proveedor}${f.alcance ? ` · ${f.alcance}` : ""}`]));

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Fuentes</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          {lista.length} fuentes · {pendientes.length} {pendientes.length === 1 ? "borrador" : "borradores"} por revisar
          {totalCambios ? ` · ${totalCambios} cambios en archivos` : ""}
        </p>
      </div>

      {!ultima && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-semibold text-ink">⚠️ El agente todavía no ha corrido</h3>
          <p className="text-sm text-ink-muted mt-2 leading-relaxed">
            Revisa diario a las 6:00 am desde GitHub Actions. Para activarlo, agrega estos secrets en GitHub → tu repositorio → Settings → Secrets and variables → Actions:
          </p>
          <ul className="mt-3 space-y-1 text-sm text-ink font-mono">
            <li>• <strong>SUPABASE_URL</strong> y <strong>SUPABASE_SERVICE_ROLE_KEY</strong></li>
            <li>• <strong>GOOGLE_API_KEY</strong> = API key de Google restringida a Drive API</li>
            <li>• <strong>DROPBOX_REFRESH_TOKEN</strong>, <strong>DROPBOX_APP_KEY</strong>, <strong>DROPBOX_APP_SECRET</strong></li>
            <li>• <strong>ANTHROPIC_API_KEY</strong></li>
          </ul>
          <p className="text-xs text-ink-muted mt-3">
            Después ve a Actions → “Agente de fuentes” → Run workflow para la primera corrida.
          </p>
        </div>
      )}

      <FuentesRevision borradores={pendientes} proveedores={proveedores} />

      <FuentesPanel
        fuentes={lista}
        cambios={cambios || []}
        totalCambios={totalCambios || 0}
        lecciones={lecciones || []}
        ultima={ultima}
      />

      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6">
        <h3 className="font-semibold text-ink">¿Qué hace esto exactamente?</h3>
        <ol className="mt-3 space-y-2 text-sm text-ink-muted leading-relaxed">
          <li><strong>1.</strong> Cada día a las 6:00 am revisamos las carpetas de tus proveedores en Drive y Dropbox. Solo leemos: nunca movemos, editamos ni borramos nada en ellas.</li>
          <li><strong>2.</strong> En las fuentes con el agente activo, leemos los brochures, listas de precios y fichas técnicas de los desarrollos que cambiaron.</li>
          <li><strong>3.</strong> Comparamos cada modelo con tu inventario: si ya existe te proponemos solo lo que cambió (por ejemplo, el precio); si no existe, te armamos la propiedad completa con fotos, características, desarrollador y descripción.</li>
          <li><strong>4.</strong> Tú decides en el carrusel. Al aprobar una nueva, se crea <strong>sin publicar</strong>: la publicas desde Propiedades cuando quieras, igual que siempre.</li>
          <li><strong>5.</strong> Cuando rechazas, tu comentario se convierte en una lección para el paso que se equivocó (datos, fotos, texto o coincidencia) y el agente la toma en cuenta desde la siguiente revisión.</li>
        </ol>
        <p className="text-xs text-ink-muted mt-4">
          Importante: que un archivo desaparezca de una carpeta no significa que se vendió. Confírmalo con el proveedor antes de cambiar algo en tu inventario.
        </p>
      </div>
    </div>
  );
}
