// Paso 1 · Revisor de carpetas (sin IA).
// Lista la carpeta de la fuente, la compara con la revisión anterior y guarda
// los cambios. Si algo falla, la fuente queda en 'Error' con el motivo.
import { compararInventario } from "./inventario.mjs";

const LOTE = 500;

async function leerTodo(db, tabla, columnas, filtro) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await filtro(db.from(tabla).select(columnas)).range(desde, desde + 999);
    if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`);
    filas.push(...(data || []));
    if (!data || data.length < 1000) return filas;
  }
}

async function enLotes(items, fn) {
  for (let i = 0; i < items.length; i += LOTE) await fn(items.slice(i, i + LOTE));
}

export async function marcarError(db, fuente, mensaje) {
  await db.from("fuentes").update({
    estado: "Error", error: String(mensaje).slice(0, 500), ultima_revision: new Date().toISOString(),
  }).eq("id", fuente.id);
}

// Devuelve { archivos, cambios } o lanza un error (que el llamador registra).
export async function revisarFuente(db, fuente, conector) {
  const actuales = await conector.listar();
  const previos = await leerTodo(db, "fuente_archivos", "archivo_id, nombre, ruta, modificado, tamano, eliminado_en",
    q => q.eq("fuente_id", fuente.id));

  const ahora = new Date().toISOString();
  const r = compararInventario(previos, actuales, { baseCargada: fuente.base_cargada, ahora });
  if (r.error) throw new Error(r.error);

  await enLotes(r.filas.map(f => ({ ...f, fuente_id: fuente.id })), async (lote) => {
    const { error } = await db.from("fuente_archivos").upsert(lote, { onConflict: "fuente_id,archivo_id" });
    if (error) throw new Error(`No se guardó el inventario: ${error.message}`);
  });
  await enLotes(r.eliminados, async (ids) => {
    const { error } = await db.from("fuente_archivos").update({ eliminado_en: ahora })
      .eq("fuente_id", fuente.id).in("archivo_id", ids);
    if (error) throw new Error(`No se marcaron los eliminados: ${error.message}`);
  });
  await enLotes(r.cambios.map(c => ({ ...c, fuente_id: fuente.id, detectado_en: ahora })), async (lote) => {
    const { error } = await db.from("fuente_cambios").insert(lote);
    if (error) throw new Error(`No se guardaron los cambios: ${error.message}`);
  });

  await db.from("fuentes").update({
    estado: "Al día", error: null, ultima_revision: ahora, base_cargada: true,
  }).eq("id", fuente.id);

  return { archivos: r.filas, cambios: r.cambios, primeraVez: !fuente.base_cargada };
}
