// Especialista 1 · Segmentador (modelo rápido).
// Lee el árbol de carpetas de una fuente y decide qué carpetas son un
// desarrollo o una propiedad, y cuáles son material interno que se ignora.
import { MODELO_RAPIDO, S } from "../lib/ia.mjs";
import { arbolCarpetas } from "../lib/inventario.mjs";

const SCHEMA = S.obj({
  desarrollos: S.arr(S.obj({
    ruta: S.str("Ruta exacta tal como aparece después de ⟶"),
    nombre: S.str("Nombre comercial del desarrollo o propiedad, en mayúscula inicial (ej. 'Rosamora', 'Kinora Plaza')"),
  })),
  omitidas: S.arr(S.obj({ ruta: S.str(), motivo: S.str() })),
});

const SYSTEM = `Organizas las carpetas que un master broker inmobiliario de Mérida comparte con D.UCLAUD Bienes Raíces.
Tu trabajo: identificar qué carpetas corresponden a UN desarrollo o UNA propiedad en venta o renta.

Reglas:
- Devuelve la carpeta que agrupa todo el material de un desarrollo/propiedad (brochure, precios, renders…), no sus subcarpetas internas.
- Nunca devuelvas una carpeta dentro de otra que ya devolviste.
- Las carpetas de categoría ("1. CASAS", "DEPARTAMENTOS PREVENTA", "VENTAS") no son desarrollos: entra a ellas.
- Si un mismo desarrollo aparece en dos categorías (ej. preventa y entrega inmediata), devuelve ambas carpetas.
- Omite material interno o que no es para clientes: comisiones, políticas de comercialización, datos bancarios, formatos y registros, capacitaciones, eventos, CV o portafolio del desarrollador, contactos, guías comerciales, promociones generales.
- Omite lo que ya no está disponible: carpetas de vendidas, rentadas, "no disponible", "pausado".
- El nombre va limpio: sin numeración ("01."), sin zona ni datos de recámaras, con mayúscula inicial (ej. "ROSAMORA / CASAS / CONKAL" → "Rosamora").
- Usa exactamente las rutas que aparecen después de ⟶.`;

export async function segmentar(ia, fuente, archivos, lecciones = []) {
  const arbol = arbolCarpetas(archivos);
  const contenido = [{
    type: "text",
    text: [
      `Fuente ${fuente.id}: ${fuente.proveedor}${fuente.alcance ? ` (${fuente.alcance})` : ""}.`,
      lecciones.length ? `\nIndicaciones del equipo (síguelas):\n- ${lecciones.join("\n- ")}\n` : "",
      "Árbol de carpetas:",
      arbol || "(sin carpetas: los archivos están en la raíz)",
    ].join("\n"),
  }];
  const { data } = await ia.json({ paso: "segmentador", modelo: MODELO_RAPIDO, system: SYSTEM, contenido, schema: SCHEMA, maxTokens: 8000, effort: "low" });

  // Validación: solo rutas que existen y sin carpetas anidadas.
  const rutas = new Set(archivos.flatMap(a => {
    const partes = a.ruta ? a.ruta.split("/") : [];
    return partes.map((_, i) => partes.slice(0, i + 1).join("/"));
  }));
  const elegidas = [];
  for (const d of data.desarrollos || []) {
    const ruta = String(d.ruta || "").trim();
    if (!rutas.has(ruta) || !d.nombre?.trim()) continue;
    if (elegidas.some(e => ruta.startsWith(`${e.ruta}/`) || e.ruta.startsWith(`${ruta}/`) || e.ruta === ruta)) continue;
    elegidas.push({ ruta, nombre: d.nombre.trim().slice(0, 120) });
  }
  // Fuente sin subcarpetas (una sola propiedad en la raíz): se trata como un desarrollo.
  if (!elegidas.length && !rutas.size && archivos.length) elegidas.push({ ruta: "", nombre: fuente.alcance || fuente.proveedor });
  return { desarrollos: elegidas, omitidas: data.omitidas || [] };
}
