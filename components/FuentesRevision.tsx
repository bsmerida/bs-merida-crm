"use client";
// Carrusel de borradores del agente de fuentes: uno a la vez, con fotos,
// datos editables y evidencia. Aprobar crea/actualiza; una nueva se publica solo si
// la persona marca "Publicar" al aprobar. Rechazar pide motivo y comentario para
// que el agente aprenda.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fmtMXN, TIPOS_PROPIEDAD, OPERACIONES } from "@/lib/utils";
import { Icon } from "@/components/Icon";
import { PORTALES } from "@/lib/portales";

// Lo último que eligió esta persona al aprobar (solo en su navegador), para no
// marcar lo mismo en cada propiedad.
type Publicar = { sitio: boolean; portales: string[] };
const CLAVE_PUBLICAR = "duclaud:publicar-al-aprobar";
function leerPublicar(): Publicar {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_PUBLICAR) || "null");
    if (v && typeof v.sitio === "boolean" && Array.isArray(v.portales)) return v;
  } catch { /* sin almacenamiento */ }
  return { sitio: false, portales: [] };
}

type Foto = { url: string; nombre?: string; ruta?: string };
type Cambio = { antes: unknown; despues: unknown };
type Borrador = {
  id: string; fuente_id: string; accion: "Nueva" | "Actualizar"; property_id: string | null;
  datos: Record<string, any>; cambios: Record<string, Cambio> | null; fotos: Foto[];
  extra: Record<string, any> | null; evidencia: { campo: string; cita: string; pagina: number | null; archivo: string | null; url: string | null }[];
  dudas: string[]; coincidencia: { metodo: string; razon: string; confianza: string; candidatos?: { id: string; title: string }[] } | null;
  created_at: string;
};
type Edicion = { datos: Record<string, any>; fotos: string[]; aceptados: string[] };

const MOTIVOS = [
  { valor: "Datos", etiqueta: "Datos incorrectos" },
  { valor: "Fotos", etiqueta: "Fotos" },
  { valor: "Texto", etiqueta: "Título o descripción" },
  { valor: "Coincidencia", etiqueta: "No es esa propiedad" },
  { valor: "Otro", etiqueta: "Otro" },
];

const ETIQUETAS: Record<string, string> = {
  title: "Título", description: "Descripción", type: "Tipo", operation: "Operación", status: "Estado",
  price: "Precio", currency: "Moneda", price_type: "Tipo de precio", bedrooms: "Recámaras", bathrooms: "Baños",
  m2_construction: "M² construcción", m2_land: "M² terreno", parking: "Estacionamientos", amenities: "Amenidades",
  zone: "Zona", address: "Dirección", city: "Ciudad", state: "Estado", development: "Desarrollador / Proyecto",
};

function fmtValor(campo: string, v: unknown, moneda = "MXN") {
  if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "—";
  if (campo === "price") return moneda === "USD" ? `US$${Number(v).toLocaleString("en-US")}` : fmtMXN(Number(v));
  if (Array.isArray(v)) return v.join(", ");
  if (campo.startsWith("m2_")) return `${v} m²`;
  return String(v);
}

const inicial = (b: Borrador): Edicion => ({
  datos: { ...b.datos, amenities: (b.datos.amenities || []).join(", ") },
  fotos: b.fotos.map(f => f.url),
  aceptados: Object.keys(b.cambios || {}),
});

export function FuentesRevision({ borradores, proveedores, fotosActuales = {} }: {
  borradores: Borrador[]; proveedores: Record<string, string>; fotosActuales?: Record<string, string[]>;
}) {
  const router = useRouter();
  const [lista, setLista] = useState(borradores);
  const [i, setI] = useState(0);
  const [ediciones, setEdiciones] = useState<Record<string, Edicion>>({});
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rehacer, setRehacer] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState<{ texto: string; href?: string } | null>(null);
  const [publicar, setPublicarState] = useState<Publicar>({ sitio: false, portales: [] });
  useEffect(() => setPublicarState(leerPublicar()), []);
  const setPublicar = (p: Publicar) => {
    setPublicarState(p);
    try { localStorage.setItem(CLAVE_PUBLICAR, JSON.stringify(p)); } catch { /* sin almacenamiento */ }
  };
  const togglePortal = (clave: string) => setPublicar({
    ...publicar,
    portales: publicar.portales.includes(clave) ? publicar.portales.filter(c => c !== clave) : [...publicar.portales, clave],
  });

  const b = lista[Math.min(i, lista.length - 1)];
  const ed = useMemo(() => (b ? ediciones[b.id] || inicial(b) : null), [b, ediciones]);
  const editar = (cambio: Partial<Edicion>) => b && ed && setEdiciones(e => ({ ...e, [b.id]: { ...ed, ...cambio } }));
  const setDato = (campo: string, valor: unknown) => ed && editar({ datos: { ...ed.datos, [campo]: valor } });

  const mover = useCallback((paso: number) => {
    setRechazando(false); setError("");
    setI(x => (lista.length ? (x + paso + lista.length) % lista.length : 0));
  }, [lista.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === "ArrowRight") mover(1);
      if (e.key === "ArrowLeft") mover(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mover]);

  if (!b || !ed) {
    return (
      <div className="bg-white rounded-2xl border border-ink-line shadow-card p-10 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">✓</div>
        <h3 className="font-semibold text-ink mt-4">No hay borradores por revisar</h3>
        <p className="text-sm text-ink-muted mt-1">Cuando el agente detecte desarrollos nuevos o cambios de precio, aparecerán aquí.</p>
        {aviso && <p className="text-sm text-emerald-700 mt-4">{aviso.texto} {aviso.href && <Link href={aviso.href} className="underline">Ver →</Link>}</p>}
      </div>
    );
  }

  const nueva = b.accion === "Nueva";
  const moneda = ed.datos.currency || "MXN";
  const fotosSel = ed.fotos.map(u => b.fotos.find(f => f.url === u)).filter(Boolean) as Foto[];
  const portada = fotosSel[0];
  // Fotos que la propiedad ya tiene en el CRM (solo para reconocerla, no se modifican).
  const actuales = (b.property_id && fotosActuales[b.property_id]) || [];

  const quitarActual = (texto: string, href?: string) => {
    setLista(l => l.filter(x => x.id !== b.id));
    setI(x => Math.max(0, Math.min(x, lista.length - 2)));
    setRechazando(false); setMotivo(""); setFeedback(""); setRehacer(true);
    setAviso({ texto, href });
    router.refresh();
  };

  const enviar = async (cuerpo: Record<string, unknown>) => {
    setEnviando(true); setError("");
    try {
      const res = await fetch(`/api/fuentes/borradores/${b.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setEnviando(false);
    }
  };

  const aprobar = async () => {
    const datos = nueva
      ? { ...ed.datos, amenities: String(ed.datos.amenities || "").split(",").map((s: string) => s.trim()).filter(Boolean) }
      : Object.fromEntries(ed.aceptados.filter(c => c in ed.datos && c !== "amenities").map(c => [c, ed.datos[c]]));
    const r = await enviar({
      accion: "aprobar", datos, aceptados: ed.aceptados, fotos: ed.fotos,
      ...(nueva ? { publicar } : {}),
    });
    if (r) quitarActual(
      !nueva ? "✓ Cambios aplicados." : r.publicada ? "✓ Propiedad creada y publicada." : "✓ Propiedad creada sin publicar.",
      `/admin/propiedades/${r.property_id}`,
    );
  };

  const rechazar = async () => {
    const r = await enviar({ accion: "rechazar", motivo, feedback, rehacer });
    if (r) quitarActual("✓ Rechazado. El agente aprenderá de tu comentario.");
  };

  const toggleFoto = (url: string) =>
    editar({ fotos: ed.fotos.includes(url) ? ed.fotos.filter(u => u !== url) : [...ed.fotos, url] });
  const hacerPortada = (url: string) => editar({ fotos: [url, ...ed.fotos.filter(u => u !== url)] });
  const toggleCambio = (campo: string) =>
    editar({ aceptados: ed.aceptados.includes(campo) ? ed.aceptados.filter(c => c !== campo) : [...ed.aceptados, campo] });

  const inp = "w-full bg-ink-ghost border border-transparent rounded-xl px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-brand-300";
  const campoNum = (campo: string, label: string) => (
    <div>
      <label className="text-xs text-ink-muted">{label}</label>
      <input type="number" value={ed.datos[campo] ?? ""} onChange={e => setDato(campo, e.target.value === "" ? null : Number(e.target.value))} className={`${inp} mt-1`} />
    </div>
  );
  const extra = b.extra || {};

  return (
    <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-6 py-4 border-b border-ink-line bg-ink-ghost/40">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Borrador {Math.min(i, lista.length - 1) + 1} de {lista.length}</span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${nueva ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
            {nueva ? "Nueva" : "Actualizar"}
          </span>
          <span className="text-[10px] font-mono bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded">{b.fuente_id}</span>
          <span className="text-xs text-ink-muted">{proveedores[b.fuente_id] || extra.proveedor}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => mover(-1)} className="p-2 rounded-full hover:bg-white text-ink-muted hover:text-ink" title="Anterior (←)"><Icon name="arrowLeft" className="w-4 h-4" /></button>
          <button onClick={() => mover(1)} className="p-2 rounded-full hover:bg-white text-ink-muted hover:text-ink" title="Siguiente (→)"><Icon name="arrowRight" className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-0">
        {/* Fotos */}
        <div className="p-6 border-b md:border-b-0 md:border-r border-ink-line">
          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-brand-50 flex items-center justify-center">
            {portada
              ? <img src={portada.url} alt={portada.nombre || ""} className="w-full h-full object-cover" />
              : actuales.length && !b.fotos.length
              ? <img src={actuales[0]} alt="Portada actual" className="w-full h-full object-cover" />
              : <span className="text-sm text-ink-muted">{b.fotos.length ? "Elige al menos una foto" : nueva ? "El agente no encontró fotos aptas" : "No se proponen fotos (la propiedad ya tiene)"}</span>}
          </div>
          {b.fotos.length > 0 && (
            <>
              <div className="flex items-center justify-between mt-4 mb-2">
                <span className="text-xs text-ink-muted">{ed.fotos.length} de {b.fotos.length} fotos · la primera es la portada</span>
                <span className="text-[11px] text-ink-soft">Clic para quitar · ★ para portada</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {b.fotos.map(f => {
                  const pos = ed.fotos.indexOf(f.url);
                  return (
                    <div key={f.url} className="relative group">
                      <button onClick={() => toggleFoto(f.url)} title={f.nombre}
                        className={`block w-full aspect-square rounded-lg overflow-hidden border-2 transition ${pos >= 0 ? "border-brand-500" : "border-transparent opacity-35"}`}>
                        <img src={f.url} alt={f.nombre || ""} className="w-full h-full object-cover" />
                      </button>
                      {pos >= 0 && <span className="absolute top-1 left-1 bg-brand-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{pos + 1}</span>}
                      {pos > 0 && (
                        <button onClick={() => hacerPortada(f.url)} title="Usar como portada"
                          className="absolute top-1 right-1 bg-white/90 text-gold text-xs rounded-full w-5 h-5 hidden group-hover:flex items-center justify-center">★</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {actuales.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-ink-muted mb-2">
                {b.fotos.length ? "Fotos que ya tiene en el CRM" : "Así está hoy en el CRM"} · {actuales.length} fotos (no se modifican)
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
                {actuales.slice(0, 12).map(url => (
                  <img key={url} src={url} alt="" loading="lazy" className="w-full aspect-square object-cover rounded-md" />
                ))}
              </div>
            </div>
          )}
          {extra.fotos_descartadas?.length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-ink-muted cursor-pointer hover:text-ink">{extra.fotos_descartadas.length} imágenes descartadas por el agente</summary>
              <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                {extra.fotos_descartadas.map((d: any, k: number) => <li key={k}>• {d.nombre}: {d.motivo}</li>)}
              </ul>
            </details>
          )}
        </div>

        {/* Datos */}
        <div className="p-6 space-y-5">
          <div className="flex flex-wrap gap-2 text-xs">
            {extra.desarrollo && <span className="bg-ink-ghost text-ink px-2 py-1 rounded-full">{extra.desarrollo}</span>}
            {extra.modelo && <span className="bg-ink-ghost text-ink px-2 py-1 rounded-full">Modelo: {extra.modelo}</span>}
            {extra.desarrolladora && <span className="bg-ink-ghost text-ink-muted px-2 py-1 rounded-full">{extra.desarrolladora}</span>}
            {extra.entrega && <span className="bg-ink-ghost text-ink-muted px-2 py-1 rounded-full">Entrega: {extra.entrega}</span>}
            {extra.unidades_disponibles != null && <span className="bg-ink-ghost text-ink-muted px-2 py-1 rounded-full">{extra.unidades_disponibles} disponibles</span>}
            {extra.precio_hasta && <span className="bg-ink-ghost text-ink-muted px-2 py-1 rounded-full">Hasta {fmtValor("price", extra.precio_hasta, moneda)}</span>}
          </div>

          {nueva ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-ink-muted">Título</label>
                <input value={ed.datos.title || ""} onChange={e => setDato("title", e.target.value)} className={`${inp} mt-1 font-medium`} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-ink-muted">Tipo</label>
                  <select value={ed.datos.type || ""} onChange={e => setDato("type", e.target.value)} className={`${inp} mt-1`}>
                    <option value="">—</option>{TIPOS_PROPIEDAD.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-ink-muted">Operación</label>
                  <select value={ed.datos.operation || "Venta"} onChange={e => setDato("operation", e.target.value)} className={`${inp} mt-1`}>
                    {OPERACIONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-ink-muted">Precio desde ({moneda})</label>
                  <input type="number" value={ed.datos.price ?? ""} onChange={e => setDato("price", e.target.value === "" ? null : Number(e.target.value))} className={`${inp} mt-1`} />
                </div>
                {campoNum("bedrooms", "Recámaras")}
                {campoNum("bathrooms", "Baños")}
                {campoNum("parking", "Estacionamientos")}
                {campoNum("m2_construction", "M² construcción")}
                {campoNum("m2_land", "M² terreno")}
                <div>
                  <label className="text-xs text-ink-muted">Zona</label>
                  <input value={ed.datos.zone || ""} onChange={e => setDato("zone", e.target.value)} className={`${inp} mt-1`} />
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted">Desarrollador / Proyecto</label>
                <input value={ed.datos.development || ""} onChange={e => setDato("development", e.target.value)} className={`${inp} mt-1`} />
              </div>
              <div>
                <label className="text-xs text-ink-muted">Amenidades</label>
                <input value={ed.datos.amenities || ""} onChange={e => setDato("amenities", e.target.value)} placeholder="Alberca, Gimnasio, Seguridad 24/7" className={`${inp} mt-1`} />
              </div>
              <div>
                <label className="text-xs text-ink-muted">Descripción</label>
                <textarea value={ed.datos.description || ""} onChange={e => setDato("description", e.target.value)} rows={7} className={`${inp} mt-1 leading-relaxed`} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-ink">
                Propiedad actual:{" "}
                <Link href={`/admin/propiedades/${b.property_id}`} target="_blank" className="font-medium text-brand-600 hover:underline">
                  {extra.propiedad_actual?.title || "Ver propiedad"} ↗
                </Link>
              </div>
              <div className="text-xs text-ink-muted">Marca los cambios que quieres aplicar:</div>
              <div className="border border-ink-line rounded-xl divide-y divide-ink-line">
                {Object.entries(b.cambios || {}).map(([campo, c]) => (
                  <label key={campo} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-ink-ghost/30">
                    <input type="checkbox" checked={ed.aceptados.includes(campo)} onChange={() => toggleCambio(campo)} className="mt-1 accent-brand-500" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{ETIQUETAS[campo] || campo}</div>
                      {campo === "description" ? (
                        <textarea value={ed.datos.description ?? String(c.despues ?? "")} onChange={e => setDato("description", e.target.value)} rows={5} className={`${inp} mt-1`} />
                      ) : (
                        <div className="text-sm mt-0.5">
                          <span className="text-ink-muted line-through">{fmtValor(campo, c.antes, moneda)}</span>
                          <span className="mx-2 text-ink-soft">→</span>
                          <span className="font-semibold text-ink">{fmtValor(campo, c.despues, moneda)}</span>
                        </div>
                      )}
                    </div>
                  </label>
                ))}
                {!Object.keys(b.cambios || {}).length && <div className="px-4 py-3 text-sm text-ink-muted">Solo se proponen fotos nuevas.</div>}
              </div>
            </div>
          )}

          {b.dudas?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Revisa esto</div>
              <ul className="mt-2 space-y-1 text-sm text-ink">{b.dudas.map((d, k) => <li key={k}>• {d}</li>)}</ul>
            </div>
          )}

          {b.coincidencia?.razon && (
            <p className="text-xs text-ink-muted"><strong>Inventario:</strong> {b.coincidencia.razon}
              {!!b.coincidencia.candidatos?.length && <> Parecidas: {b.coincidencia.candidatos.map((c, k) => (
                <span key={c.id}>{k > 0 && ", "}
                  {fotosActuales[c.id]?.[0] && <img src={fotosActuales[c.id][0]} alt="" loading="lazy" className="inline-block w-8 h-8 rounded object-cover align-middle mr-1" />}
                  <Link href={`/admin/propiedades/${c.id}`} target="_blank" className="text-brand-600 hover:underline">{c.title}</Link></span>
              ))}.</>}
            </p>
          )}

          {b.evidencia?.length > 0 && (
            <details>
              <summary className="text-sm text-brand-600 cursor-pointer hover:underline">¿De dónde salió cada dato? ({b.evidencia.length})</summary>
              <ul className="mt-3 space-y-2 text-xs text-ink-muted">
                {b.evidencia.map((e, k) => (
                  <li key={k} className="bg-ink-ghost rounded-lg p-3">
                    <strong className="text-ink">{ETIQUETAS[e.campo] || e.campo}:</strong> “{e.cita}”
                    <div className="mt-1">
                      {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{e.archivo}</a> : e.archivo}
                      {e.pagina ? ` · pág. ${e.pagina}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="border-t border-ink-line px-6 py-4 bg-ink-ghost/30">
        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">⚠️ {error}</div>}
        {aviso && !error && (
          <div className="mb-3 text-sm text-emerald-700">{aviso.texto} {aviso.href && <Link href={aviso.href} className="underline">Ver →</Link>}</div>
        )}

        {nueva && !rechazando && (
          <div className="mb-4 p-3 rounded-xl border border-ink-line bg-white space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input type="checkbox" checked={publicar.sitio} onChange={e => setPublicar({ ...publicar, sitio: e.target.checked })}
                className="accent-brand-500" />
              Publicar al aprobar en duclaud.com.mx
            </label>
            {publicar.sitio && (
              <>
                <div className="text-xs text-ink-muted">Y enviarla a estos portales (se recuerda tu elección):</div>
                <div className="flex flex-wrap gap-1.5">
                  {PORTALES.map(p => (
                    <button key={p.clave} type="button" onClick={() => togglePortal(p.clave)} aria-pressed={publicar.portales.includes(p.clave)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${publicar.portales.includes(p.clave) ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-ink border-ink-line hover:border-emerald-300"}`}>
                      {p.nombre}
                    </button>
                  ))}
                </div>
                {!ed.fotos.length && <div className="text-xs text-amber-700">⚠️ Sin fotos elegidas no se puede publicar.</div>}
              </>
            )}
          </div>
        )}

        {rechazando ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-ink">¿Qué estuvo mal?</div>
            <div className="flex flex-wrap gap-2">
              {MOTIVOS.map(m => (
                <button key={m.valor} type="button" onClick={() => setMotivo(m.valor)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${motivo === m.valor ? "bg-red-600 text-white border-red-600" : "bg-white text-ink border-ink-line hover:border-red-300"}`}>
                  {m.etiqueta}
                </button>
              ))}
            </div>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3}
              placeholder="Ej. El precio de la lista es con descuento de contado; usa el precio de lista. / No uses fotos con texto encima."
              className={inp} />
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input type="checkbox" checked={rehacer} onChange={e => setRehacer(e.target.checked)} className="accent-brand-500" />
              Volver a intentarlo en la próxima revisión con este comentario
            </label>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRechazando(false)} className="px-4 py-2 rounded-full text-sm text-ink-muted hover:text-ink">Cancelar</button>
              <button onClick={rechazar} disabled={enviando || !motivo || feedback.trim().length < 5}
                className="px-5 py-2 rounded-full text-sm font-medium bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white">
                {enviando ? "Guardando…" : "Rechazar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setRechazando(true)} disabled={enviando}
              className="px-5 py-2.5 rounded-full text-sm border border-red-200 text-red-700 bg-white hover:bg-red-50">Rechazar</button>
            <button onClick={() => mover(1)} disabled={enviando || lista.length < 2}
              className="px-5 py-2.5 rounded-full text-sm text-ink-muted hover:text-ink disabled:opacity-40">Saltar</button>
            <button onClick={aprobar} disabled={enviando}
              className="ml-auto px-6 py-2.5 rounded-full text-sm font-medium bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white">
              {enviando ? "Guardando…" : nueva ? (publicar.sitio ? "Aprobar y publicar" : "Aprobar y crear (sin publicar)") : `Aprobar ${ed.aceptados.length + (ed.fotos.length ? 1 : 0)} cambios`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
