"use client";
// Estado de las fuentes, cambios de archivos detectados y lecciones del agente.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Fuente = {
  id: string; proveedor: string; alcance: string | null; plataforma: string; url: string;
  contacto: string | null; responsable: string | null; notas: string | null;
  agente_activo: boolean; ultima_revision: string | null; estado: "Pendiente" | "Al día" | "Error"; error: string | null;
};
type CambioArchivo = { id: string; fuente_id: string; tipo: "Nuevo" | "Modificado" | "Eliminado"; nombre: string; ruta: string; detectado_en: string };
type Leccion = { id: string; paso: string; leccion: string; created_at: string };
type Corrida = { inicio: string; fin: string | null; costo_usd: number; resumen: any; errores: string[] } | null;

const ESTADO_COLORS: Record<string, string> = {
  "Al día":   "bg-emerald-50 text-emerald-700",
  Error:      "bg-red-50 text-red-700",
  Pendiente:  "bg-ink-ghost text-ink-muted",
};
const TIPO_COLORS: Record<string, string> = {
  Nuevo:      "bg-emerald-50 text-emerald-700",
  Modificado: "bg-amber-50 text-amber-700",
  Eliminado:  "bg-red-50 text-red-700",
};
const PASOS: Record<string, string> = {
  extractor: "Datos", fotos: "Fotos", redactor: "Texto", comparador: "Coincidencia", general: "General",
};

const fecha = (iso: string | null) => iso
  ? new Date(iso).toLocaleString("es-MX", { timeZone: "America/Merida", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
  : "Nunca";

export function FuentesPanel({ fuentes, cambios, totalCambios, lecciones, ultima }: {
  fuentes: Fuente[]; cambios: CambioArchivo[]; totalCambios: number; lecciones: Leccion[]; ultima: Corrida;
}) {
  const router = useRouter();
  const [lista, setLista] = useState(fuentes);
  const [pendientes, setPendientes] = useState(cambios);
  const [activas, setActivas] = useState(lecciones);
  const [error, setError] = useState("");

  const porFuente = useMemo(() => {
    const m = new Map<string, CambioArchivo[]>();
    for (const c of pendientes) m.set(c.fuente_id, [...(m.get(c.fuente_id) || []), c]);
    return [...m.entries()];
  }, [pendientes]);

  const llamar = async (url: string, body: unknown) => {
    setError("");
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || "No se pudo guardar"); return false; }
    return true;
  };

  const toggleAgente = async (f: Fuente) => {
    const valor = !f.agente_activo;
    if (valor && !confirm(`El agente empezará a leer los documentos de ${f.proveedor}${f.alcance ? ` · ${f.alcance}` : ""} y proponer borradores desde la próxima revisión. ¿Activar?`)) return;
    setLista(l => l.map(x => (x.id === f.id ? { ...x, agente_activo: valor } : x)));
    if (!(await llamar(`/api/fuentes/${f.id}`, { agente_activo: valor }))) {
      setLista(l => l.map(x => (x.id === f.id ? { ...x, agente_activo: !valor } : x)));
    }
  };

  const marcar = async (ids: string[] | null, fuenteId?: string) => {
    const antes = pendientes;
    setPendientes(p => p.filter(c => (ids ? !ids.includes(c.id) : c.fuente_id !== fuenteId)));
    if (!(await llamar("/api/fuentes/cambios", ids ? { ids } : { fuente_id: fuenteId }))) setPendientes(antes);
    else router.refresh();
  };

  const quitarLeccion = async (id: string) => {
    if (!confirm("El agente dejará de tomar en cuenta esta indicación. ¿Quitarla?")) return;
    const antes = activas;
    setActivas(a => a.filter(l => l.id !== id));
    if (!(await llamar(`/api/fuentes/lecciones/${id}`, {}))) setActivas(antes);
  };

  const errores = ultima?.errores || [];

  return (
    <div className="space-y-8">
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">⚠️ {error}</div>}

      {/* Fuentes */}
      <section className="space-y-3">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-semibold text-ink">Carpetas de proveedores</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Última revisión: {fecha(ultima?.inicio || null)}
              {ultima?.resumen?.borradores != null && ` · ${ultima.resumen.borradores} borradores nuevos`}
              {ultima && Number(ultima.costo_usd) > 0 && ` · ~${Number(ultima.costo_usd).toFixed(2)} USD de IA`}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-ink-line bg-ink-ghost/40">
                <tr>
                  {["Fuente", "Plataforma", "Última revisión", "Estado", "Agente", ""].map((h, k) => (
                    <th key={k} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map(f => (
                  <tr key={f.id} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30 align-top">
                    <td className="px-4 py-3 max-w-[280px]">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded">{f.id}</span>
                        <span className="font-medium text-sm text-ink truncate">{f.proveedor}</span>
                      </div>
                      <div className="text-xs text-ink-muted mt-0.5">
                        {[f.alcance, f.responsable].filter(Boolean).join(" · ")}
                        {f.contacto && <> · <a href={`https://wa.me/52${f.contacto.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{f.contacto}</a></>}
                      </div>
                      {f.notas && <div className="text-[10px] text-ink-soft mt-0.5">{f.notas}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink whitespace-nowrap">{f.plataforma}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted whitespace-nowrap">{fecha(f.ultima_revision)}</td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADO_COLORS[f.estado] || ESTADO_COLORS.Pendiente}`}>{f.estado}</span>
                      {f.estado === "Error" && f.error && <div className="text-xs text-red-700 mt-1.5 break-words">{f.error}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleAgente(f)} role="switch" aria-checked={f.agente_activo}
                        title={f.agente_activo ? "Propone borradores" : "Solo revisa cambios de archivos"}
                        className={`relative w-10 h-6 rounded-full transition ${f.agente_activo ? "bg-brand-500" : "bg-ink-line"}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${f.agente_activo ? "left-5" : "left-1"}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline whitespace-nowrap">Abrir carpeta ↗</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {errores.length > 0 && (
          <details className="text-xs text-ink-muted">
            <summary className="cursor-pointer hover:text-ink">{errores.length} avisos en la última revisión</summary>
            <ul className="mt-2 space-y-1">{errores.map((e, k) => <li key={k}>• {e}</li>)}</ul>
          </details>
        )}
      </section>

      {/* Cambios de archivos */}
      <section className="space-y-3">
        <div>
          <h2 className="font-semibold text-ink">Cambios en archivos</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {totalCambios ? `${totalCambios} sin revisar${totalCambios > pendientes.length ? ` (se muestran los ${pendientes.length} más recientes)` : ""}` : "Todo revisado"}
            {" "}· “Eliminado” significa que ya no está en la carpeta, no que se vendió.
          </p>
        </div>
        {porFuente.length === 0 ? (
          <div className="bg-white rounded-2xl border border-ink-line p-8 text-center text-sm text-ink-muted">Sin cambios pendientes.</div>
        ) : porFuente.map(([fuenteId, items]) => {
          const f = lista.find(x => x.id === fuenteId);
          return (
            <details key={fuenteId} className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
              <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-ink-ghost/30">
                <span className="text-[10px] font-mono bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded">{fuenteId}</span>
                <span className="text-sm font-medium text-ink flex-1">{f ? `${f.proveedor}${f.alcance ? ` · ${f.alcance}` : ""}` : fuenteId}</span>
                <span className="text-xs text-ink-muted">{items.length} cambios</span>
                <button onClick={(e) => { e.preventDefault(); marcar(null, fuenteId); }}
                  className="text-xs text-ink-muted hover:text-ink border border-ink-line rounded-full px-3 py-1 bg-white">Marcar todos revisados</button>
              </summary>
              <ul className="divide-y divide-ink-line border-t border-ink-line">
                {items.map(c => (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${TIPO_COLORS[c.tipo]}`}>
                      {c.tipo === "Eliminado" ? "Eliminado · revisar" : c.tipo}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink truncate">{c.nombre}</div>
                      <div className="text-[11px] text-ink-soft truncate">{c.ruta || "(raíz)"}</div>
                    </div>
                    <span className="text-xs text-ink-muted whitespace-nowrap hidden sm:block">{fecha(c.detectado_en)}</span>
                    <button onClick={() => marcar([c.id])} className="text-xs text-brand-600 hover:underline whitespace-nowrap">Marcar revisado</button>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </section>

      {/* Lecciones */}
      <section className="space-y-3">
        <div>
          <h2 className="font-semibold text-ink">Lo que el agente ha aprendido</h2>
          <p className="text-xs text-ink-muted mt-0.5">Sale de tus comentarios al rechazar. Cada lección solo la usa el paso que se equivocó.</p>
        </div>
        {activas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-ink-line p-8 text-center text-sm text-ink-muted">Todavía no hay lecciones.</div>
        ) : (
          <ul className="bg-white rounded-2xl border border-ink-line shadow-card divide-y divide-ink-line">
            {activas.map(l => (
              <li key={l.id} className="flex items-start gap-3 px-5 py-3">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-ink-ghost text-ink-muted shrink-0">{PASOS[l.paso] || l.paso}</span>
                <p className="text-sm text-ink flex-1">{l.leccion}</p>
                <button onClick={() => quitarLeccion(l.id)} className="text-xs text-ink-muted hover:text-red-700">Quitar</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
