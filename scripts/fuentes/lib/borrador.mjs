// Armado de borradores con el mismo formato que usa el formulario de propiedades.
// Funciones puras: sin red ni base de datos.
import { nulo } from "./ia.mjs";

export const TIPOS = ["Casa", "Departamento", "Oficina", "Local", "Terreno", "Bodega"];
export const OPERACIONES = ["Venta", "Renta"];

export const normalizar = (s) => String(s ?? "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const slug = (s) => normalizar(s).replace(/ /g, "-");

// Identifica el mismo modelo entre corridas aunque cambien precios o fotos.
export function claveModelo(desarrollo, modelo) {
  return [slug(desarrollo.nombre), slug(modelo.modelo || "general"), modelo.type, modelo.operation].join("|");
}

// "Kinora (Grupo Capital)": así se ve en el campo "Desarrollador / Proyecto".
export function campoDesarrollo(desarrollo) {
  const nombre = String(desarrollo.nombre || "").trim();
  const dev = String(desarrollo.desarrolladora || "").trim();
  if (!dev || normalizar(nombre).includes(normalizar(dev))) return nombre || null;
  return `${nombre} (${dev})`;
}

const numero = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

// Convierte la salida del extractor (+ texto del redactor) en los campos de properties.
export function datosPropiedad(desarrollo, modelo, texto = {}) {
  const amenidades = [...new Set([...(desarrollo.amenidades || []), ...(modelo.caracteristicas || [])]
    .map(a => String(a).trim()).filter(Boolean))].slice(0, 30);
  return {
    title: texto.title || null,
    description: texto.description || null,
    type: TIPOS.includes(modelo.type) ? modelo.type : null,
    operation: OPERACIONES.includes(modelo.operation) ? modelo.operation : "Venta",
    status: modelo.todas_vendidas === "si" ? "Vendida" : "Disponible",
    price: numero(modelo.price),
    price_type: modelo.price_type === "m2" ? "m2" : "total",
    currency: modelo.currency === "USD" ? "USD" : "MXN",
    address: nulo(desarrollo.direccion),
    zone: nulo(desarrollo.zona),
    city: nulo(desarrollo.ciudad) || "Mérida",
    state: nulo(desarrollo.estado) || "Yucatán",
    bedrooms: numero(modelo.bedrooms) || 0,
    bathrooms: numero(modelo.bathrooms) || 0,
    m2_construction: numero(modelo.m2_construction),
    m2_land: numero(modelo.m2_land),
    parking: numero(modelo.parking) || 0,
    amenities: amenidades,
    development: campoDesarrollo(desarrollo),
  };
}

// Datos que faltan para poder crear la propiedad: se muestran como dudas.
export function faltantes(datos) {
  const f = [];
  if (!datos.type) f.push("No se pudo determinar el tipo de propiedad.");
  if (!datos.price) f.push("No se encontró precio en los documentos.");
  if (!datos.title) f.push("Falta el título.");
  return f;
}

const iguales = (a, b) => {
  if (Array.isArray(a) || Array.isArray(b)) {
    const x = (a || []).map(normalizar).sort().join("|"), y = (b || []).map(normalizar).sort().join("|");
    return x === y;
  }
  if (typeof a === "number" || typeof b === "number") {
    const x = Number(a) || 0, y = Number(b) || 0;
    if (x === y) return true;
    return Math.abs(x - y) / Math.max(Math.abs(x), Math.abs(y)) < 0.005; // <0.5%: redondeos
  }
  return normalizar(a) === normalizar(b);
};
const vacio = (v) => v == null || v === "" || (Array.isArray(v) && v.length === 0) || v === 0;

// Qué se propone cambiar en una propiedad existente. Lo que ya llenó una
// persona (descripción, amenidades, zona…) solo se propone si está vacío;
// precio y medidas sí se proponen cuando cambian. Nunca toca título, fotos
// existentes ni la publicación.
const SIEMPRE = ["price", "currency", "price_type", "bedrooms", "bathrooms", "m2_construction", "m2_land", "parking"];
const SI_VACIO = ["description", "amenities", "zone", "address", "development"];

/** @param {any} actual @param {any} propuesta */
export function cambiosPropuestos(actual, propuesta) {
  /** @type {Record<string, { antes: any, despues: any }>} */
  const cambios = {};
  for (const campo of SIEMPRE) {
    const nuevo = propuesta[campo];
    if (vacio(nuevo)) continue;                       // el documento no lo dice: no se borra nada
    if (!iguales(actual[campo], nuevo)) cambios[campo] = { antes: actual[campo] ?? null, despues: nuevo };
  }
  for (const campo of SI_VACIO) {
    if (vacio(actual[campo]) && !vacio(propuesta[campo])) cambios[campo] = { antes: actual[campo] ?? null, despues: propuesta[campo] };
  }
  // Pasar a "Vendida" solo con evidencia explícita en la lista de precios.
  if (propuesta.status === "Vendida" && actual.status !== "Vendida") cambios.status = { antes: actual.status, despues: "Vendida" };
  return cambios;
}

// Campos que la API acepta al aprobar (lista blanca, igual al formulario).
export const CAMPOS_PROPIEDAD = [
  "title", "description", "type", "operation", "status", "price", "price_type", "currency",
  "address", "zone", "city", "state", "bedrooms", "bathrooms", "m2_construction", "m2_land",
  "parking", "amenities", "development",
];
