// Especialista 4 · Comparador.
// El código busca candidatos en el inventario; la IA solo decide cuando hay
// candidatos. Si duda, prefiere "ninguna" (nunca actualiza a ciegas).
import { MODELO, S } from "../lib/ia.mjs";
import { candidatos } from "../lib/candidatos.mjs";

const SCHEMA = S.obj({
  decisiones: S.arr(S.obj({
    modelo: S.int("Número del modelo"),
    property_id: S.str("id de la propiedad que es el MISMO modelo del mismo desarrollo; cadena vacía si ninguna lo es."),
    confianza: S.enum(["alta", "media", "baja"]),
    razon: S.str("Explicación breve en español."),
  })),
});

const SYSTEM = `Comparas modelos de desarrollos inmobiliarios con el inventario del CRM de D.UCLAUD para no duplicar propiedades.
Una propiedad del inventario es el mismo modelo solo si coincide el desarrollo Y el modelo/tipología (o, si el título no menciona modelo, el tipo y recámaras son los mismos).
- Mismo desarrollo pero distinto modelo → NO es la misma.
- Desarrollos con nombre parecido pero distintos (ej. "Kinora" vs "Kinora Plaza") → NO es la misma.
- Si no estás seguro, responde cadena vacía: es mejor crear un borrador nuevo que actualizar la propiedad equivocada.`;

const resumenProp = (p) => [
  `id=${p.id}`, `"${p.title}"`, p.development ? `desarrollo: ${p.development}` : "", p.address ? `dirección: ${p.address}` : "", `${p.type} en ${p.operation}`,
  p.zone ? `zona: ${p.zone}` : "", p.bedrooms ? `${p.bedrooms} rec` : "", p.m2_construction ? `${p.m2_construction} m²` : "",
  p.price ? `$${Number(p.price).toLocaleString("es-MX")}` : "", p.status,
].filter(Boolean).join(" · ");

// vinculos: Map clave_modelo → property_id (aprobaciones anteriores).
// Devuelve el resultado preliminar y el pedido para la IA (null si no hace falta).
export function prepararComparar({ desarrollo, modelos, claves, inventario, vinculos, lecciones = [] }) {
  const porId = new Map(inventario.map(p => [p.id, p]));
  const resultado = modelos.map(() => ({ property: null, metodo: "sin candidatos", razon: "No hay propiedades de este desarrollo en el inventario.", confianza: "alta" }));
  const preguntas = [];

  modelos.forEach((m, i) => {
    const vinculada = vinculos.get(claves[i]);
    if (vinculada && porId.has(vinculada)) {
      resultado[i] = { property: porId.get(vinculada), metodo: "vínculo", razon: "Ya se había aprobado como este modelo.", confianza: "alta" };
      return;
    }
    const c = candidatos(inventario, desarrollo, m);
    if (!c.length) return;
    preguntas.push({ i, m, c });
    // Si la IA no llega a responder, queda como nueva PERO con aviso de posible duplicado.
    resultado[i] = { property: null, metodo: "pendiente", confianza: "media",
      razon: "Hay propiedades parecidas en el inventario; revisa que no sea un duplicado.",
      candidatos: c.map(p => ({ id: p.id, title: p.title })) };
  });
  if (!preguntas.length) return { resultado, preguntas, pedido: null };

  const texto = preguntas.map(({ i, m, c }) => [
    `## Modelo [${i}]: ${desarrollo.nombre} · ${m.modelo} · ${m.type} en ${m.operation}` +
      `${m.bedrooms ? ` · ${m.bedrooms} rec` : ""}${m.m2_construction ? ` · ${m.m2_construction} m²` : ""}${m.price ? ` · desde $${Number(m.price).toLocaleString("es-MX")}` : ""}`,
    "Candidatos del inventario:",
    ...c.map(p => `- ${resumenProp(p)}`),
  ].join("\n")).join("\n\n");

  return {
    resultado, preguntas,
    pedido: {
      paso: "comparador", modelo: MODELO, system: SYSTEM, schema: SCHEMA, maxTokens: 4000, effort: "low",
      contenido: [{ type: "text", text: `${lecciones.length ? `Indicaciones del equipo:\n- ${lecciones.join("\n- ")}\n\n` : ""}${texto}` }],
    },
  };
}

export function leerComparar(data, { resultado: preliminar, preguntas }) {
  const resultado = [...preliminar];
  for (const d of data?.decisiones || []) {
    const pregunta = preguntas.find(p => p.i === d.modelo);
    if (!pregunta) continue;
    // Solo se acepta un id que estaba entre los candidatos, y no con confianza baja.
    const elegida = pregunta.c.find(p => p.id === d.property_id);
    resultado[d.modelo] = elegida && d.confianza !== "baja"
      ? { property: elegida, metodo: "comparador", razon: d.razon, confianza: d.confianza }
      : { property: null, metodo: "comparador", razon: d.razon || "Ningún candidato es el mismo modelo.", confianza: d.confianza,
          candidatos: pregunta.c.map(p => ({ id: p.id, title: p.title })) };
  }

  // Una propiedad no puede ser dos modelos a la vez: se queda con el de más confianza.
  const rango = { alta: 3, media: 2, baja: 1 };
  const usadas = new Map();
  resultado.forEach((r, i) => {
    if (!r.property) return;
    const previo = usadas.get(r.property.id);
    if (previo === undefined) { usadas.set(r.property.id, i); return; }
    const pierde = (rango[r.confianza] || 0) > (rango[resultado[previo].confianza] || 0) ? previo : i;
    if (pierde === previo) usadas.set(r.property.id, i);
    resultado[pierde] = { property: null, metodo: "comparador", confianza: "media",
      razon: `"${r.property.title}" ya se asignó a otro modelo; se propone como nueva para que lo revises.` };
  });
  return resultado;
}

export async function comparar(ia, entrada) {
  const preparado = prepararComparar(entrada);
  return leerComparar(preparado.pedido ? (await ia.json(preparado.pedido)).data : null, preparado);
}
