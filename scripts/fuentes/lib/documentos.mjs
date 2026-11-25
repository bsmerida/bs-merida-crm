// Convierte los archivos elegidos por el clasificador en bloques que Claude puede leer.
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
const execFileAsync = promisify(execFile);

const MB = 1024 * 1024;
export const MAX_PDF = 20 * MB;              // por documento, ya comprimido si hizo falta
export const MAX_PDF_DESCARGA = 60 * MB;     // arriba de esto ni lo intentamos: comprimir no lo va a salvar
export const MAX_TOTAL = 24 * MB;            // por solicitud (la API acepta 32 MB ya codificado)
export const MAX_PAGINAS_PDF = 100;          // límite real de la API de Claude por documento
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

// Los brochures pesan por las fotos de alta resolución incrustadas, no por el texto.
// Ghostscript las vuelve a comprimir (preset "ebook") sin tocar el contenido.
// Si gs no está instalado (ej. en una máquina local) ambas funciones devuelven null
// y el archivo sigue el camino de siempre (se manda tal cual, o se omite si pesa mucho).
export const herramientaPdfReal = {
  async paginas(ruta) {
    const { stdout } = await execFileAsync("gs", [
      "-q", "-dNODISPLAY", "-dNOSAFER",
      "-c", `(${ruta}) (r) file runpdfbegin pdfpagecount = quit`,
    ]);
    const n = parseInt(stdout.trim(), 10);
    return Number.isFinite(n) ? n : null;
  },
  async comprimir(entrada, salida) {
    await execFileAsync("gs", [
      "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4", "-dPDFSETTINGS=/ebook",
      "-dNOPAUSE", "-dBATCH", "-dQUIET", `-sOutputFile=${salida}`, entrada,
    ]);
  },
};

export async function contarPaginasPdf(buffer, herramienta = herramientaPdfReal) {
  const dir = await mkdtemp(join(tmpdir(), "pdf-pag-"));
  try {
    const ruta = join(dir, "in.pdf");
    await writeFile(ruta, buffer);
    return await herramienta.paginas(ruta);
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function comprimirPdf(buffer, herramienta = herramientaPdfReal) {
  const dir = await mkdtemp(join(tmpdir(), "pdf-comp-"));
  try {
    const entrada = join(dir, "in.pdf");
    const salida = join(dir, "out.pdf");
    await writeFile(entrada, buffer);
    await herramienta.comprimir(entrada, salida);
    return await readFile(salida);
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// archivos: [{ i, archivo }] en orden de prioridad. Devuelve { bloques, leidos, omitidos }.
export async function prepararDocumentos(archivos, conector, herramientaPdf = herramientaPdfReal) {
  const bloques = [];
  const leidos = [];
  const omitidos = [];
  let total = 0;
  for (const { i, archivo } of archivos) {
    const etiqueta = `Documento [${i}]: ${archivo.ruta ? `${archivo.ruta}/` : ""}${archivo.nombre}`;
    try {
      if (archivo.tamano && archivo.tamano > MAX_PDF_DESCARGA && !esHoja(archivo)) { omitidos.push(`${archivo.nombre} (muy pesado para leerlo)`); continue; }
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
        const { buffer: original } = await conector.descargar(archivo);
        if (original.subarray(0, 5).toString() !== "%PDF-") { omitidos.push(`${archivo.nombre} (no es un PDF válido)`); continue; }
        const paginas = await contarPaginasPdf(original, herramientaPdf);
        if (paginas && paginas > MAX_PAGINAS_PDF) { omitidos.push(`${archivo.nombre} (demasiadas páginas: ${paginas})`); continue; }
        let buffer = original;
        if (buffer.length > MAX_PDF) {
          const comprimido = await comprimirPdf(original, herramientaPdf);
          if (comprimido && comprimido.length < buffer.length) buffer = comprimido;
        }
        if (buffer.length > MAX_PDF || total + buffer.length > MAX_TOTAL) { omitidos.push(`${archivo.nombre} (muy pesado para leerlo)`); continue; }
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
