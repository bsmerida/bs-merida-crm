// Especialista 2 · Clasificador (modelo rápido).
// Con solo los nombres de los archivos de un desarrollo decide qué documentos
// leer (precios, brochure, ficha técnica) y qué imágenes pueden ser fotos.
import { MODELO_RAPIDO, S } from "../lib/ia.mjs";
import { esHoja, esImagen, esPdf } from "../lib/documentos.mjs";

const MAX_LISTA = 400;
const MAX_IMAGENES_POR_CARPETA = 25;

const SCHEMA = S.obj({
  documentos: S.arr(S.obj({
    i: S.int("Número del archivo"),
    tipo: S.enum(["lista_precios", "disponibilidad", "ficha_tecnica", "brochure", "memoria_descriptiva", "otro"]),
  }), "Máximo 5, en orden de importancia: precios/disponibilidad primero, luego ficha técnica y brochure."),
  fotos: S.arr(S.int(), "Números de imágenes que pueden servir como fotos de venta (máximo 40)."),
  operacion: S.enum(["Venta", "Renta", "Venta y renta"]),
});

const SYSTEM = `Clasificas los archivos de un desarrollo inmobiliario de Mérida para el equipo de D.UCLAUD.
Elige:
1. documentos: los que contienen los datos de venta. Prioridad: lista de precios vigente y disponibilidad (si hay varias, la más reciente), ficha técnica o resumen, brochure, memoria descriptiva. Ignora datos bancarios, formatos, reglamentos, avisos de privacidad, procesos de venta, KMZ, videos y documentos marcados como "sin datos" cuando exista la versión completa.
2. fotos: imágenes que un comprador vería en un anuncio: renders y fotos reales de fachadas, interiores, amenidades, áreas comunes, vistas, casa muestra. NO elijas planos, masterplans, mapas, flyers con texto o precios, logos, capturas de pantalla, cuentas bancarias, ni fotos de avance de obra (salvo que sea lo único que haya).
3. operacion: si se vende, se renta o ambas.`;

// Lista numerada y acotada para no gastar de más con carpetas enormes.
export function listarParaClasificar(archivos) {
  const utiles = archivos.filter(a => esPdf(a) || esHoja(a) || esImagen(a));
  const porCarpeta = new Map();
  const lista = [];
  for (const a of utiles) {
    if (esImagen(a)) {
      const n = (porCarpeta.get(a.ruta) || 0) + 1;
      porCarpeta.set(a.ruta, n);
      if (n > MAX_IMAGENES_POR_CARPETA) continue;
    }
    lista.push(a);
    if (lista.length >= MAX_LISTA) break;
  }
  return lista;
}

// Devuelve la lista numerada y el pedido (null si no hay nada que clasificar).
export function prepararClasificar(desarrollo, archivos) {
  const lista = listarParaClasificar(archivos);
  if (!lista.length) return { lista, pedido: null };
  const base = desarrollo.ruta ? `${desarrollo.ruta}/` : "";
  const texto = lista.map((a, i) => {
    const ruta = a.ruta.startsWith(base) ? a.ruta.slice(base.length) : a.ruta;
    const mb = a.tamano ? ` · ${(a.tamano / 1024 / 1024).toFixed(1)} MB` : "";
    const fecha = a.modificado ? ` · ${String(a.modificado).slice(0, 10)}` : "";
    return `[${i}] ${ruta ? `${ruta}/` : ""}${a.nombre}${mb}${fecha}`;
  }).join("\n");
  return {
    lista,
    pedido: {
      paso: "clasificador", modelo: MODELO_RAPIDO, system: SYSTEM, schema: SCHEMA, maxTokens: 4000, effort: "low",
      contenido: [{ type: "text", text: `Desarrollo: ${desarrollo.nombre}\n\nArchivos:\n${texto}` }],
    },
  };
}

export function leerClasificar(data, lista) {
  if (!data) return { documentos: [], fotos: [], operacion: "Venta", lista };
  const valido = (i) => Number.isInteger(i) && i >= 0 && i < lista.length;
  return {
    // Una imagen solo cuenta como documento si es la lista de precios (algunos la mandan en JPG).
    documentos: (data.documentos || [])
      .filter(d => valido(d.i) && (!esImagen(lista[d.i]) || d.tipo === "lista_precios")).slice(0, 5),
    fotos: [...new Set((data.fotos || []).filter(i => valido(i) && esImagen(lista[i])))].slice(0, 40),
    operacion: data.operacion,
    lista,
  };
}

export async function clasificar(ia, desarrollo, archivos) {
  const { lista, pedido } = prepararClasificar(desarrollo, archivos);
  return leerClasificar(pedido ? (await ia.json(pedido)).data : null, lista);
}
