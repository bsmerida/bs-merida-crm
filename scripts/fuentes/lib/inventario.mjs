// Comparación del inventario de archivos de una fuente contra la revisión anterior.
// Funciones puras: no tocan la red ni la base de datos.

const ms = (v) => (v ? new Date(v).getTime() : null);

// Un archivo cambió si cambió su fecha de modificación o su tamaño.
export function archivoCambio(previo, actual) {
  const fechaPrev = ms(previo.modificado), fechaAct = ms(actual.modificado);
  if (fechaPrev !== null && fechaAct !== null && fechaPrev !== fechaAct) return true;
  if (previo.tamano != null && actual.tamano != null && Number(previo.tamano) !== Number(actual.tamano)) return true;
  return false;
}

// previos: filas de fuente_archivos (incluye las marcadas como eliminadas).
// actuales: archivos que devolvió el conector en esta revisión.
// baseCargada: false en la primera revisión → solo carga el inventario, sin cambios.
export function compararInventario(previos, actuales, { baseCargada, ahora = new Date().toISOString() }) {
  const porId = new Map(previos.map(p => [p.archivo_id, p]));
  const vistos = new Set();
  const filas = [];
  const cambios = [];
  const cambio = (tipo, a) => cambios.push({ tipo, archivo_id: a.archivo_id, nombre: a.nombre, ruta: a.ruta });

  for (const a of actuales) {
    if (vistos.has(a.archivo_id)) continue; // un atajo puede repetir un archivo
    vistos.add(a.archivo_id);
    filas.push({ ...a, visto_en: ahora, eliminado_en: null });
    if (!baseCargada) continue;
    const p = porId.get(a.archivo_id);
    if (!p || p.eliminado_en) cambio("Nuevo", a);        // nuevo o reapareció
    else if (archivoCambio(p, a)) cambio("Modificado", a);
  }

  const desaparecidos = previos.filter(p => !p.eliminado_en && !vistos.has(p.archivo_id));
  const activosAntes = previos.filter(p => !p.eliminado_en).length;

  // Si la carpeta de pronto aparece vacía o casi vacía, lo más probable es que
  // se perdió el acceso: no se marca nada como eliminado y se reporta error.
  if (baseCargada && activosAntes > 0 && vistos.size === 0) {
    return { error: "La carpeta aparece vacía o sin acceso. No se marcó ningún archivo como eliminado." };
  }
  if (baseCargada && activosAntes >= 20 && desaparecidos.length / activosAntes > 0.8) {
    return { error: `Desaparecieron ${desaparecidos.length} de ${activosAntes} archivos de golpe. Revisa que el enlace siga compartido; no se marcó nada como eliminado.` };
  }

  if (baseCargada) for (const p of desaparecidos) cambio("Eliminado", p);
  return { filas, cambios, eliminados: desaparecidos.map(p => p.archivo_id) };
}

// Huella de un conjunto de archivos: si cambia, el desarrollo se vuelve a procesar.
export function firmaArchivos(archivos) {
  const base = archivos
    .map(a => `${a.archivo_id}:${ms(a.modificado) ?? ""}:${a.tamano ?? ""}`)
    .sort().join("|");
  let h = 2166136261; // FNV-1a 32 bits: basta para detectar cambios
  for (let i = 0; i < base.length; i++) { h ^= base.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `${archivos.length}-${(h >>> 0).toString(16)}`;
}

// Archivos que viven dentro de una carpeta (incluidas sus subcarpetas).
export const dentroDe = (archivos, ruta) =>
  archivos.filter(a => !ruta || a.ruta === ruta || a.ruta.startsWith(`${ruta}/`));

// Árbol de carpetas con conteo de archivos, en texto, para que el segmentador lo lea.
export function arbolCarpetas(archivos, { maxLineas = 600 } = {}) {
  const conteo = new Map();
  for (const a of archivos) {
    const partes = a.ruta ? a.ruta.split("/") : [];
    for (let i = 0; i <= partes.length; i++) {
      const r = partes.slice(0, i).join("/");
      conteo.set(r, (conteo.get(r) || 0) + 1);
    }
  }
  const lineas = [...conteo.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b, "es"))
    .map(r => `${"  ".repeat(r.split("/").length - 1)}${r.split("/").pop()}/  (${conteo.get(r)} archivos)  ⟶ ${r}`);
  return lineas.length > maxLineas ? [...lineas.slice(0, maxLineas), `… ${lineas.length - maxLineas} carpetas más`].join("\n") : lineas.join("\n");
}
