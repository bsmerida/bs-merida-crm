// Búsqueda de candidatos en el inventario (sin IA). El comparador con IA solo
// decide entre estos candidatos; si no hay ninguno, el modelo es "Nueva".
import { normalizar } from "./borrador.mjs";

// Palabras que no distinguen un desarrollo de otro.
const GENERICAS = new Set([
  "de", "del", "la", "las", "el", "los", "en", "y", "e", "a", "con", "sur", "norte", "nte",
  "residencial", "residencia", "residences", "desarrollo", "desarrollos", "privada", "priv", "fraccionamiento",
  "torre", "towers", "tower", "living", "apartments", "departamentos", "departamento", "deptos", "depto",
  "casas", "casa", "terrenos", "terreno", "lotes", "lote", "town", "houses", "house", "th", "locales", "local",
  "preventa", "venta", "renta", "merida", "yucatan", "modelo", "tipo", "luxury", "club", "country", "plaza",
]);

export const palabrasClave = (texto) =>
  normalizar(texto).split(" ").filter(p => p.length >= 3 && !GENERICAS.has(p) && !/^\d+$/.test(p));

// Puntaje de una propiedad del inventario contra un modelo extraído.
export function puntaje(prop, desarrollo, modelo) {
  const claves = palabrasClave(desarrollo.nombre);
  if (!claves.length) return 0;
  // En el inventario actual el desarrollo a veces está en la dirección ("Casa en Conkal", address "rosamora").
  const texto = ` ${normalizar(`${prop.title} ${prop.development || ""} ${prop.address || ""}`)} `;
  const coinciden = claves.filter(c => texto.includes(` ${c} `)).length;
  if (coinciden === 0) return 0; // sin el nombre del desarrollo no es candidato
  let p = (coinciden / claves.length) * 10;
  if (modelo.type && prop.type === modelo.type) p += 3;
  else if (modelo.type && prop.type && prop.type !== modelo.type) p -= 4;
  if (modelo.operation && prop.operation === modelo.operation) p += 1;
  if (modelo.bedrooms && Number(prop.bedrooms) === Number(modelo.bedrooms)) p += 2;
  // Nombre del modelo: palabras ("Iris", "Stella") o códigos cortos ("Tipo C", "Modelo B1"),
  // que solo cuentan si van después de tipo/modelo para no confundirlos con "y", "a"…
  const codigos = normalizar(modelo.modelo).split(" ").filter(x => /^[a-z]\d{0,2}$/.test(x));
  if (palabrasClave(modelo.modelo).some(c => texto.includes(` ${c} `))
    || codigos.some(c => new RegExp(` (tipo|modelo|mod|prototipo) ${c} `).test(texto))) p += 3;
  return p;
}

/** @param {any[]} inventario @param {any} desarrollo @param {any} modelo @returns {any[]} */
export function candidatos(inventario, desarrollo, modelo, max = 6) {
  return inventario
    .map(prop => ({ prop, p: puntaje(prop, desarrollo, modelo) }))
    .filter(x => x.p >= 5)
    .sort((a, b) => b.p - a.p)
    .slice(0, max)
    .map(x => x.prop);
}
