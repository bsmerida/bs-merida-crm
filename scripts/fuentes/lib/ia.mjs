// Llamadas a Claude con respuesta JSON validada por esquema, y cuenta del costo.
import Anthropic from "@anthropic-ai/sdk";

// Modelos: el rápido clasifica (barato); el principal lee documentos, compara,
// elige fotos y redacta. Se pueden cambiar sin tocar código.
export const MODELO_RAPIDO = process.env.FUENTES_MODELO_RAPIDO || "claude-haiku-5-5";
export const MODELO = process.env.FUENTES_MODELO || "claude-sonnet-5-5";

// USD por millón de tokens [entrada, salida]. Es un estimado para la bitácora;
// la factura real está en console.anthropic.com.
const PRECIOS = {
  "claude-haiku-5-5": (entrada) => entrada > 100_000 ? [0.5, 2.5] : [0.1, 0.5],
  "claude-sonnet-5-5": () => [2, 10],
  "claude-opus-5-5": () => [4, 20],
};

export function costoUsd(modelo, usage) {
  const entrada = (usage?.input_tokens || 0) + (usage?.cache_creation_input_tokens || 0) + (usage?.cache_read_input_tokens || 0);
  const tabla = PRECIOS[modelo] || PRECIOS["claude-opus-5-5"];
  const [pIn, pOut] = tabla(entrada);
  return (entrada * pIn + (usage?.output_tokens || 0) * pOut) / 1_000_000;
}

export class PresupuestoAgotado extends Error {}

/** @param {{ apiKey?: string, maxCostoUsd?: number, cliente?: any }} [opciones] */
export function crearIA({ apiKey = process.env.ANTHROPIC_API_KEY, maxCostoUsd = Infinity, cliente } = {}) {
  if (!cliente && !apiKey) throw new Error("Falta ANTHROPIC_API_KEY");
  const client = cliente || new Anthropic({ apiKey, maxRetries: 4 });
  /** @type {{ costoUsd: number, llamadas: number, porPaso: Record<string, number> }} */
  const cuenta = { costoUsd: 0, llamadas: 0, porPaso: {} };

  // Devuelve el objeto JSON que pide `schema`. Lanza si la respuesta no sirve.
  /** @param {{ paso: string, modelo?: string, system: string, contenido: any[], schema: object, maxTokens?: number, effort?: "low" | "medium" | "high" }} p */
  async function json({ paso, modelo = MODELO, system, contenido, schema, maxTokens = 8000, effort = "medium" }) {
    if (cuenta.costoUsd >= maxCostoUsd) throw new PresupuestoAgotado(`Se alcanzó el tope de ${maxCostoUsd} USD de esta corrida`);
    const params = {
      model: modelo,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: contenido }],
      output_config: { effort, format: { type: "json_schema", schema } },
    };
    // Streaming evita cortes por tiempo con documentos grandes.
    const msg = await client.messages.stream(params).finalMessage();

    const costo = costoUsd(modelo, msg.usage);
    cuenta.costoUsd += costo;
    cuenta.llamadas++;
    cuenta.porPaso[paso] = (cuenta.porPaso[paso] || 0) + costo;

    if (msg.stop_reason === "refusal") throw new Error(`${paso}: el modelo se negó a responder`);
    if (msg.stop_reason === "max_tokens") throw new Error(`${paso}: la respuesta se cortó (max_tokens)`);
    const texto = msg.content.filter(b => b.type === "text").map(b => b.text).join("");
    try {
      return { data: JSON.parse(texto), costo };
    } catch {
      throw new Error(`${paso}: la respuesta no es JSON válido`);
    }
  }

  return { json, cuenta };
}

// Ayudas para esquemas JSON (salidas estructuradas). Las salidas estructuradas
// limitan los campos que aceptan null, así que "no aparece" se pide como ""
// (texto) o 0 (número) y se convierte a null al normalizar.
export const S = {
  str: (description) => ({ type: "string", ...(description && { description }) }),
  strV: (description) => ({ type: "string", description: `${description || ""} Cadena vacía si no aparece en los documentos.`.trim() }),
  num: (description) => ({ type: "number", ...(description && { description }) }),
  num0: (description) => ({ type: "number", description: `${description || ""} 0 si no aparece en los documentos.`.trim() }),
  int: (description) => ({ type: "integer", ...(description && { description }) }),
  enum: (values, description) => ({ type: "string", enum: values, ...(description && { description }) }),
  arr: (items, description) => ({ type: "array", items, ...(description && { description }) }),
  obj: (properties, description) => ({
    type: "object", properties, required: Object.keys(properties), additionalProperties: false,
    ...(description && { description }),
  }),
};

export const nulo = (v) => (v === "" || v === 0 || v === undefined ? null : v);
