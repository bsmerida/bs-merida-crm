// Convierte los archivos elegidos por el clasificador en bloques que Claude puede leer.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const MB = 1024 * 1024;
export const MAX_PDF = 20 * MB;          // por documento
export const MAX_TOTAL = 24 * MB;        // por solicitud (la API acepta 32 MB ya codificado)
const MAX_TEXTO_HOJA = 60_000;

export const esPdf = (a) => a.mime === "application/pdf" || /\.pdf$/i.test(a.nombre)
  || /^application\/vnd\.google-apps\.(document|spreadsheet|presentation)$/.test(a.mime || "");
export const esHoja = (a) => /\.(xlsx|xls|csv)$/i.test(a.nombre) || /spreadsheetml|ms-excel|text\/csv/.test(a.mime || "");
export const esImagen = (a) => /^image\//.test(a.mime || "") || /\.(jpe?g|png|webp|heic)$/i.test(a.nombre);

export function hojaATexto(buffer) {
  const libro = XLSX.read(buffer, { type: "buffer" });
  return libro.SheetNames.map(n => `### Hoja: ${n}\n${XLSX.utils.sheet_to_csv(libro.Sheets[n], { blankrows: false })}`)
    .join("\n\n").slice(0, MAX_TEXTO_HOJA);
}

// archivos: [{ i, archivo }] en orden de prioridad. Devuelve { bloques, leidos, omitidos }.
export async function prepararDocumentos(archivos, conector) {
  const bloques = [];
  const leidos = [];
  const omitidos = [];
  let total = 0;
  for (const { i, archivo } of archivos) {
    const etiqueta = `Documento [${i}]: ${archivo.ruta ? `${archivo.ruta}/` : ""}${archivo.nombre}`;
    try {
      if (archivo.tamano && archivo.tamano > MAX_PDF && !esHoja(archivo)) { omitidos.push(`${archivo.nombre} (muy pesado para leerlo)`); continue; }
      if (esImagen(archivo)) {
        const img = await conector.miniatura(archivo, 1600);
        if (total + img.buffer.length > MAX_TOTAL) { omitidos.push(`${archivo.nombre} (límite de tamaño)`); continue; }
        total += img.buffer.length;
        bloques.push({ type: "text", text: etiqueta },
          { type: "image", source: { type: "base64", media_type: img.mime, data: img.buffer.toString("base64") } });
      } else if (esHoja(archivo)) {
        const { buffer } = await conector.descargar(archivo);
        bloques.push({ type: "text", text: `${etiqueta}\n${hojaATexto(buffer)}` });
      } else if (esPdf(archivo)) {
        const { buffer } = await conector.descargar(archivo);
        if (buffer.length > MAX_PDF || total + buffer.length > MAX_TOTAL) { omitidos.push(`${archivo.nombre} (límite de tamaño)`); continue; }
        if (buffer.subarray(0, 5).toString() !== "%PDF-") { omitidos.push(`${archivo.nombre} (no es un PDF válido)`); continue; }
        total += buffer.length;
        bloques.push({ type: "text", text: etiqueta },
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") }, title: archivo.nombre.slice(0, 200) });
      } else {
        omitidos.push(`${archivo.nombre} (formato no compatible)`);
        continue;
      }
      leidos.push(i);
    } catch (e) {
      omitidos.push(`${archivo.nombre} (${e.message})`);
    }
  }
  return { bloques, leidos, omitidos };
}
