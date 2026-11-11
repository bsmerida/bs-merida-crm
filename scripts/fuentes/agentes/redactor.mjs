// Especialista 6 · Redactor (modelo principal).
// Escribe título y descripción con el tono de la inmobiliaria, a partir de los
// datos ya extraídos. Mismas reglas que el botón "Generar descripción" del CRM.
import { MODELO, S } from "../lib/ia.mjs";

const SCHEMA = S.obj({
  textos: S.arr(S.obj({
    modelo: S.int("Número del modelo"),
    title: S.str("Título del anuncio"),
    description: S.str("Descripción del anuncio"),
  })),
});

const SYSTEM = `Eres el redactor de D.UCLAUD Bienes Raíces, inmobiliaria premium de Mérida, Yucatán. Escribes el título y la descripción de cada propiedad para el sitio web y los portales.

Título:
- Sigue el patrón de los títulos reales que te paso: tipo de propiedad + desarrollo + modelo y/o zona (ej. "Departamento en Nia Tower, Modelo G", "Casa en preventa en Privada Mystika").
- Máximo 80 caracteres, mayúscula inicial (no todo en mayúsculas), sin precio, sin emojis.

Descripción:
- Español, tono formal pero cálido y aspiracional.
- 2 a 4 párrafos, máximo 220 palabras.
- Empieza destacando la ubicación y el estilo de vida que ofrece.
- Menciona recámaras, baños, m², amenidades y entrega cuando estén en los datos.
- NO inventes datos que no estén en la información.
- NO uses listas ni viñetas, solo párrafos continuos. NO uses emojis ni símbolos especiales.
- NO incluyas el precio.
- Adopta el tono y vocabulario de los ejemplos reales.`;

export function pedidoRedactar({ desarrollo, modelos, ejemplosTitulos = [], ejemplosDescripciones = [], lecciones = [], correcciones = [] }) {
  const datos = modelos.map((m, i) => [
    `## Modelo [${i}]: ${m.modelo}`,
    `Tipo: ${m.type} · Operación: ${m.operation}`,
    m.bedrooms ? `Recámaras: ${m.bedrooms}` : "", m.bathrooms ? `Baños: ${m.bathrooms}` : "",
    m.m2_construction ? `M² construcción: ${m.m2_construction}` : "", m.m2_land ? `M² terreno: ${m.m2_land}` : "",
    m.parking ? `Estacionamientos: ${m.parking}` : "",
    m.caracteristicas?.length ? `Características: ${m.caracteristicas.join(", ")}` : "",
  ].filter(Boolean).join("\n")).join("\n\n");

  const texto = [
    `DESARROLLO: ${desarrollo.nombre}${desarrollo.desarrolladora ? ` (${desarrollo.desarrolladora})` : ""}`,
    [desarrollo.zona, desarrollo.ciudad, desarrollo.estado].filter(Boolean).join(", "),
    desarrollo.entrega ? `Entrega: ${desarrollo.entrega}` : "",
    desarrollo.amenidades?.length ? `Amenidades: ${desarrollo.amenidades.join(", ")}` : "",
    `\n${datos}`,
    ejemplosTitulos.length ? `\nTÍTULOS REALES DE LA INMOBILIARIA (sigue este patrón):\n- ${ejemplosTitulos.join("\n- ")}` : "",
    ejemplosDescripciones.length ? `\nDESCRIPCIONES REALES (adopta este tono y vocabulario):\n${ejemplosDescripciones.join("\n\n---\n\n")}` : "",
    lecciones.length ? `\nINDICACIONES DEL EQUIPO (síguelas):\n- ${lecciones.join("\n- ")}` : "",
    correcciones.length ? `\nCORRECCIONES QUE HIZO EL EQUIPO A TEXTOS ANTERIORES (aprende de ellas):\n- ${correcciones.join("\n- ")}` : "",
    "\nEscribe título y descripción para cada modelo.",
  ].filter(Boolean).join("\n");

  return {
    paso: "redactor", modelo: MODELO, system: SYSTEM, schema: SCHEMA, maxTokens: 8000, effort: "medium",
    contenido: [{ type: "text", text: texto }],
  };
}

export function leerRedactar(data, modelos) {
  const textos = modelos.map(() => ({}));
  for (const t of data?.textos || []) {
    if (!textos[t.modelo]) continue;
    textos[t.modelo] = { title: String(t.title || "").trim().slice(0, 120), description: String(t.description || "").trim() };
  }
  return textos;
}

export async function redactar(ia, entrada) {
  return leerRedactar((await ia.json(pedidoRedactar(entrada))).data, entrada.modelos);
}
