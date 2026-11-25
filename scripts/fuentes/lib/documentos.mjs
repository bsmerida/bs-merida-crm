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
export const MAX_PDF = 20 * MB;              // por documento (o por parte, si se tuvo que dividir), ya comprimido si hizo falta
export const MAX_PDF_DESCARGA = 60 * MB;     // arriba de esto ni lo intentamos: ni comprimir ni dividir lo va a salvar
export const MAX_TOTAL = 24 * MB;            // por solicitud (la API acepta 32 MB ya codificado)
export const MAX_PAGINAS_PDF = 100;          // límite real de la API de Claude por documento
const PROFUNDIDAD_MAX = 5;                   // hasta 32 partes de un mismo PDF antes de rendirse
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
// Ghostscript las vuelve a comprimir (preset "ebook") o corta el PDF por páginas, sin
// tocar el contenido. Si gs no está instalado (ej. una máquina local) las tres funciones
// devuelven null y el archivo sigue el camino de siempre (se manda tal cual, o se omite).
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
  async dividir(entrada, salida, desde, hasta) {
    await execFileAsync("gs", [
      "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4",
      `-dFirstPage=${desde}`, `-dLastPage=${hasta}`,
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

export async function dividirPdf(buffer, desde, hasta, herramienta = herramientaPdfReal) {
  const dir = await mkdtemp(join(tmpdir(), "pdf-div-"));
  try {
    const entrada = join(dir, "in.pdf");
    const salida = join(dir, "out.pdf");
    await writeFile(entrada, buffer);
    await herramienta.dividir(entrada, salida, desde, hasta);
    return await readFile(salida);
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Intenta que un PDF (con `paginas` páginas, numeradas 1..paginas dentro de `buffer`)
// quepa en MAX_PDF y MAX_PAGINAS_PDF. Si no cabe tal cual ni comprimido, lo parte en
// dos mitades (por páginas) y resuelve cada mitad por su cuenta, recursivamente —
// así un catálogo de 300 páginas termina en varios documentos de ≤100 páginas cada uno
// en vez de omitirse. Devuelve un arreglo de buffers, o null si no se pudo resolver.
async function resolverParte(buffer, paginas, herramienta, profundidad) {
  let actual = buffer;
  if (actual.length > MAX_PDF) {
    const comprimido = await comprimirPdf(actual, herramienta);
    if (comprimido && comprimido.length < actual.length) actual = comprimido;
  }
  if (actual.length <= MAX_PDF && paginas <= MAX_PAGINAS_PDF) return [actual];
  if (paginas <= 1 || profundidad >= PROFUNDIDAD_MAX) return null;

  const mitad = Math.ceil(paginas / 2);
  const [piezaA, piezaB] = await Promise.all([
    dividirPdf(buffer, 1, mitad, herramienta),
    dividirPdf(buffer, mitad + 1, paginas, herramienta),
  ]);
  if (!piezaA || !piezaB) return null;
  const [resA, resB] = await Promise.all([
    resolverParte(piezaA, mitad, herramienta, profundidad + 1),
    resolverParte(piezaB, paginas - mitad, herramienta, profundidad + 1),
  ]);
  if (!resA || !resB) return null;
  return [...resA, ...resB];
}

async function resolverPdf(buffer, herramienta) {
  const paginas = await contarPaginasPdf(buffer, herramienta);
  if (!paginas) {
    // No sabemos cuántas páginas tiene (ej. sin Ghostscript): el camino de siempre.
    if (buffer.length <= MAX_PDF) return [buffer];
    const comprimido = await comprimirPdf(buffer, herramienta);
    return comprimido && comprimido.length <= MAX_PDF ? [comprimido] : null;
  }
  return resolverParte(buffer, paginas, herramienta, 0);
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
        const partes = await resolverPdf(original, herramientaPdf);
        if (!partes) { omitidos.push(`${archivo.nombre} (muy pesado para leerlo)`); continue; }
        const peso = partes.reduce((s, b) => s + b.length, 0);
        if (total + peso > MAX_TOTAL) { omitidos.push(`${archivo.nombre} (límite de tamaño)`); continue; }
        total += peso;
        bloques.push({ type: "text", text: etiqueta });
        partes.forEach((buffer, idx) => {
          const titulo = partes.length > 1 ? `${archivo.nombre} (parte ${idx + 1}/${partes.length})` : archivo.nombre;
          bloques.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") }, title: titulo.slice(0, 200) });
        });
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
