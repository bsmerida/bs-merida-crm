// Excel "CARPETA DE DRIVES Y DROPBOX" en Drive: lista maestra de fuentes.
// Cada mañana se leen sus filas y las fuentes con ID nuevo se agregan APAGADAS
// (sin agente). Nunca se modifica ni se borra una fuente que ya existe.
import { createRequire } from "node:module";
import { driveFolderId, dropboxSharedUrl } from "./plataformas.mjs";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const sinAcentos = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const encabezado = (s) => sinAcentos(s).toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ").trim();

// Columnas por nombre (el orden puede cambiar en el Excel).
const COLUMNAS = {
  id: (h) => h.startsWith("id"),
  proveedor: (h) => h.startsWith("master") || h === "proveedor",
  alcance: (h) => h.startsWith("desarrollo"),
  url: (h) => h.startsWith("carpeta") || h.startsWith("enlace"),
  contacto: (h) => h.startsWith("contacto"),
  responsable: (h) => h.startsWith("organizacion") || h.startsWith("responsable"),
  notas: (h) => h.startsWith("notas"),
  subcarpeta: (h) => h.startsWith("ruta"),
};

const CONECTORES = new Set(["de", "del", "la", "las", "el", "los", "y", "en"]);

// "CONCEPTO MASTER BROKER" → "Concepto Master Broker"; siglas cortas ("AQ", "MR") se quedan.
export function nombrePropio(texto) {
  const t = String(texto ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const palabra = (p, i) => {
    const min = p.toLowerCase();
    if (i > 0 && CONECTORES.has(min)) return min;
    if (p.length <= 2 && p === p.toUpperCase()) return p;
    return min.charAt(0).toUpperCase() + min.slice(1);
  };
  return t.split(" ").map((p, i) => p.split("/").map(x => palabra(x, i)).join("/")).join(" ");
}

// Enlace limpio y plataforma; null si no es una carpeta reconocible.
export function enlaceFuente(url) {
  const u = String(url ?? "").trim().replace(/&amp;/g, "&");
  try {
    if (/drive\.google\.com/.test(u)) {
      return { plataforma: "Google Drive", url: `https://drive.google.com/drive/folders/${driveFolderId(u)}` };
    }
    if (/dropbox\.com/.test(u)) {
      const limpio = dropboxSharedUrl(u);
      return { plataforma: "Dropbox", url: `${limpio}${limpio.includes("?") ? "&" : "?"}dl=0` };
    }
  } catch { /* enlace inválido */ }
  return null;
}

// Misma carpeta aunque el enlace cambie de forma (parámetros, /u/0/, etc.).
export function claveCarpeta(fuente) {
  if (fuente.plataforma === "Google Drive") return `drive:${driveFolderId(fuente.url)}`;
  return `dropbox:${dropboxSharedUrl(fuente.url).replace(/\?.*$/, "")}`;
}

// Lee la primera hoja con encabezados "ID proveedor" y "Carpeta original".
// Devuelve { filas, omitidas: [{id, motivo}] }.
export function leerExcelFuentes(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  for (const nombre of wb.SheetNames) {
    const hoja = wb.Sheets[nombre];
    if (!hoja["!ref"]) continue;
    const rango = XLSX.utils.decode_range(hoja["!ref"]);
    const celda = (r, c) => {
      const x = hoja[XLSX.utils.encode_cell({ r, c })];
      if (!x) return "";
      const v = String(x.w ?? x.v ?? "").trim();
      // Si el texto no es el enlace pero la celda tiene hipervínculo, se usa el vínculo.
      return !/^https?:/i.test(v) && x.l?.Target && /^https?:/i.test(x.l.Target) ? x.l.Target : v;
    };

    for (let r = rango.s.r; r <= Math.min(rango.e.r, rango.s.r + 50); r++) {
      const cols = {};
      for (let c = rango.s.c; c <= rango.e.c; c++) {
        const h = encabezado(celda(r, c));
        if (!h) continue;
        for (const [campo, es] of Object.entries(COLUMNAS)) if (cols[campo] === undefined && es(h)) { cols[campo] = c; break; }
      }
      if (cols.id === undefined || cols.url === undefined) continue;

      const filas = [];
      const omitidas = [];
      const val = (fila, campo) => cols[campo] === undefined ? "" : celda(fila, cols[campo]);
      for (let f = r + 1; f <= rango.e.r; f++) {
        const id = val(f, "id").toUpperCase();
        if (!/^F-\d{4}$/.test(id)) continue;
        const crudo = val(f, "url");
        if (!crudo) continue; // fila reservada sin datos
        const enlace = enlaceFuente(crudo);
        if (!enlace) { omitidas.push({ id, motivo: "el enlace no es una carpeta de Drive o Dropbox" }); continue; }
        const sub = val(f, "subcarpeta");
        const notas = [nombrePropio(val(f, "notas")), sub ? `Subcarpeta: ${sub}` : ""].filter(Boolean).join(" · ");
        filas.push({
          id,
          proveedor: nombrePropio(val(f, "proveedor")) || id,
          alcance: nombrePropio(val(f, "alcance")) || null,
          ...enlace,
          contacto: val(f, "contacto").replace(/\D/g, "") || null,
          responsable: nombrePropio(val(f, "responsable")) || null,
          notas: notas || null,
        });
      }
      return { filas, omitidas };
    }
  }
  throw new Error("No encontré la tabla de fuentes (columnas \"ID proveedor\" y \"Carpeta original\")");
}

// Agrega solo las fuentes con ID nuevo, apagadas. Una carpeta que ya está
// registrada con otro ID no se duplica (se revisaría dos veces).
/** @param {any} db @param {{ filas: any[], omitidas?: { id: string, motivo: string }[] }} excel */
export async function sincronizarFuentes(db, { filas, omitidas = [] }) {
  const { data: existentes, error } = await db.from("fuentes").select("id, plataforma, url");
  if (error) throw new Error(`No se pudieron leer las fuentes: ${error.message}`);

  const ids = new Set((existentes || []).map(e => e.id));
  const carpetas = new Map();
  for (const e of existentes || []) {
    try { carpetas.set(claveCarpeta(e), e.id); } catch { /* enlace viejo inválido */ }
  }

  const nuevas = [];
  const saltadas = [...omitidas];
  for (const f of filas) {
    if (ids.has(f.id)) continue;
    const clave = claveCarpeta(f);
    if (carpetas.has(clave)) { saltadas.push({ id: f.id, motivo: `misma carpeta que ${carpetas.get(clave)}` }); continue; }
    carpetas.set(clave, f.id);
    ids.add(f.id);
    nuevas.push({ ...f, agente_activo: false });
  }

  if (nuevas.length) {
    const { error: e } = await db.from("fuentes").insert(nuevas);
    if (e) throw new Error(`No se pudieron agregar las fuentes nuevas: ${e.message}`);
  }
  return { agregadas: nuevas.map(f => f.id), omitidas: saltadas };
}
