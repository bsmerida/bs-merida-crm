// Llamadas a Claude con respuesta JSON validada por esquema, y cuenta del costo.
// Por defecto todo va por la Batch API (50% más barata): la corrida es de
// madrugada y la espera no importa. Si un lote tarda demasiado o una solicitud
// falla en el lote, se repite con una llamada normal.
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
const DESCUENTO_LOTE = 0.5;

/** @param {string} modelo @param {any} usage @param {{ lote?: boolean }} [opciones] */
export function costoUsd(modelo, usage, { lote = false } = {}) {
  const entrada = (usage?.input_tokens || 0) + (usage?.cache_creation_input_tokens || 0) + (usage?.cache_read_input_tokens || 0);
  const tabla = PRECIOS[modelo] || PRECIOS["claude-opus-5-5"];
  const [pIn, pOut] = tabla(entrada);
  return ((entrada * pIn + (usage?.output_tokens || 0) * pOut) / 1_000_000) * (lote ? DESCUENTO_LOTE : 1);
}

export class PresupuestoAgotado extends Error {}

// Límites de la Batch API: 256 MB y 100,000 solicitudes por lote. Se deja margen.
const MAX_BYTES_LOTE = 180 * 1024 * 1024;
const MAX_SOLICITUDES_LOTE = 5000;

/**
 * @typedef {{ paso: string, modelo?: string, system: string, contenido: any[], schema: object, maxTokens?: number, effort?: "low" | "medium" | "high" }} Pedido
 * @typedef {{ data?: any, costo?: number, error?: Error }} Resultado
 */

/** @param {{ apiKey?: string, maxCostoUsd?: number, cliente?: any, usarLotes?: boolean, esperaLoteMin?: number, intervaloMs?: number, log?: (m: string) => void }} [opciones] */
export function crearIA({
  apiKey = process.env.ANTHROPIC_API_KEY, maxCostoUsd = Infinity, cliente,
  usarLotes = process.env.FUENTES_SIN_LOTES !== "1",
  esperaLoteMin = Number(process.env.FUENTES_ESPERA_LOTE_MIN || 90),
  intervaloMs = 30_000, log = () => {},
} = {}) {
  if (!cliente && !apiKey) throw new Error("Falta ANTHROPIC_API_KEY");
  const client = cliente || new Anthropic({ apiKey, maxRetries: 4 });
  /** @type {{ costoUsd: number, llamadas: number, enLote: number, porPaso: Record<string, number> }} */
  const cuenta = { costoUsd: 0, llamadas: 0, enLote: 0, porPaso: {} };

  // ignorarTope: para pasos baratos que terminan trabajo ya pagado (comparar, fotos, textos).
  const revisarPresupuesto = (ignorarTope = false) => {
    if (!ignorarTope && cuenta.costoUsd >= maxCostoUsd) throw new PresupuestoAgotado(`Se alcanzó el tope de ${maxCostoUsd} USD de esta corrida`);
  };

  /** @param {Pedido} p */
  const parametros = ({ modelo = MODELO, system, contenido, schema, maxTokens = 8000, effort = "medium" }) => ({
    model: modelo,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: contenido }],
    output_config: { effort, format: { type: "json_schema", schema } },
  });

  // Cuenta el costo y convierte la respuesta en JSON (o lanza un error claro).
  /** @param {Pedido} p @param {any} msg @param {boolean} lote */
  function interpretar(p, msg, lote) {
    const costo = costoUsd(p.modelo || MODELO, msg.usage, { lote });
    cuenta.costoUsd += costo;
    cuenta.llamadas++;
    if (lote) cuenta.enLote++;
    cuenta.porPaso[p.paso] = (cuenta.porPaso[p.paso] || 0) + costo;

    if (msg.stop_reason === "refusal") throw new Error(`${p.paso}: el modelo se negó a responder`);
    if (msg.stop_reason === "max_tokens") throw new Error(`${p.paso}: la respuesta se cortó (max_tokens)`);
    const texto = msg.content.filter(b => b.type === "text").map(b => b.text).join("");
    try {
      return { data: JSON.parse(texto), costo };
    } catch {
      throw new Error(`${p.paso}: la respuesta no es JSON válido`);
    }
  }

  // Llamada normal (precio completo). Devuelve { data, costo } o lanza.
  /** @param {Pedido} p @param {{ ignorarTope?: boolean }} [opciones] */
  async function json(p, { ignorarTope = false } = {}) {
    revisarPresupuesto(ignorarTope);
    // Streaming evita cortes por tiempo con documentos grandes.
    const msg = await client.messages.stream(parametros(p)).finalMessage();
    return interpretar(p, msg, false);
  }

  const esperar = (ms) => new Promise(r => setTimeout(r, ms));

  // Varias solicitudes a la vez. `fabricas` son funciones que arman cada pedido
  // (o null si no hace falta): así los documentos pesados se descargan justo
  // antes de enviarlos y no se acumulan en memoria. Nunca lanza por una
  // solicitud: cada posición trae { data, costo } o { error }.
  /** @param {Array<() => (Pedido | null | Promise<Pedido | null>)>} fabricas @param {{ ignorarTope?: boolean }} [opciones] @returns {Promise<Resultado[]>} */
  async function lote(fabricas, { ignorarTope = false } = {}) {
    revisarPresupuesto(ignorarTope);
    /** @type {Resultado[]} */
    const resultados = fabricas.map(() => ({}));
    /** @type {Map<number, Pedido>} */
    const pedidos = new Map();
    /** @type {Map<number, Pedido>} solo paso y modelo, para cobrar y etiquetar sin guardar documentos */
    const meta = new Map();
    const directo = async (i) => {
      try {
        const p = pedidos.get(i) || await fabricas[i]();
        if (p) resultados[i] = await json(p, { ignorarTope });
      } catch (e) {
        if (e instanceof PresupuestoAgotado) throw e;
        resultados[i] = { error: e };
      }
    };

    if (!usarLotes) {
      for (let i = 0; i < fabricas.length; i++) await directo(i);
      return resultados;
    }

    // Arma y envía los lotes por tamaño. Los pedidos grandes (extractor) solo
    // se guardan hasta enviarse; si luego hay que repetirlos, se rearman.
    /** @type {{ id: string, indices: number[] }[]} */
    const enviados = [];
    let actual = [], bytes = 0;
    const enviar = async () => {
      if (!actual.length) return;
      const batch = await client.messages.batches.create({ requests: actual.map(a => a.req) });
      enviados.push({ id: batch.id, indices: actual.map(a => a.i) });
      for (const a of actual) if (a.grande) pedidos.delete(a.i);
      actual = []; bytes = 0;
    };
    for (let i = 0; i < fabricas.length; i++) {
      let p;
      try { p = await fabricas[i](); } catch (e) { resultados[i] = { error: e }; continue; }
      if (!p) continue;
      const req = { custom_id: `r${i}`, params: parametros(p) };
      const tam = Buffer.byteLength(JSON.stringify(req));
      if (tam > MAX_BYTES_LOTE) { pedidos.set(i, p); await directo(i); continue; }
      if (bytes + tam > MAX_BYTES_LOTE || actual.length >= MAX_SOLICITUDES_LOTE) await enviar();
      pedidos.set(i, p);
      meta.set(i, /** @type {Pedido} */ ({ paso: p.paso, modelo: p.modelo || MODELO, system: "", contenido: [], schema: {} }));
      actual.push({ i, req, grande: tam > 1024 * 1024 });
      bytes += tam;
    }
    await enviar();
    if (!enviados.length) return resultados;
    log(`  · ${enviados.length} lote(s) enviados a la Batch API (${enviados.reduce((s, e) => s + e.indices.length, 0)} solicitudes)`);

    // Espera a que terminen (normalmente minutos). Si se pasa del tiempo, se cancelan.
    const limite = Date.now() + esperaLoteMin * 60_000;
    const pendientes = new Set(enviados.map(e => e.id));
    while (pendientes.size) {
      for (const id of [...pendientes]) {
        const b = await client.messages.batches.retrieve(id);
        if (b.processing_status === "ended") pendientes.delete(id);
      }
      if (!pendientes.size) break;
      if (Date.now() > limite) {
        log(`  · los lotes tardaron más de ${esperaLoteMin} min: se cancelan y lo pendiente se pide normal`);
        for (const id of pendientes) await client.messages.batches.cancel(id).catch(() => {});
        // Tras cancelar, el lote termina y entrega lo que alcanzó a procesar.
        for (const id of pendientes) {
          for (let k = 0; k < 20; k++) {
            if ((await client.messages.batches.retrieve(id)).processing_status === "ended") break;
            await esperar(intervaloMs);
          }
        }
        break;
      }
      await esperar(intervaloMs);
    }

    // Resultados: lo que salió bien se cobra con descuento; lo demás se repite normal.
    const repetir = new Set(enviados.flatMap(e => e.indices));
    for (const e of enviados) {
      try {
        for await (const r of await client.messages.batches.results(e.id)) {
          const i = Number(String(r.custom_id).slice(1));
          if (r.result.type !== "succeeded") continue;
          repetir.delete(i);
          try { resultados[i] = interpretar(/** @type {Pedido} */ (meta.get(i)), r.result.message, true); }
          catch (err) { resultados[i] = { error: err }; }
        }
      } catch { /* sin resultados: todo el lote se repite normal */ }
    }
    if (repetir.size) log(`  · ${repetir.size} solicitudes se repiten sin lote`);
    for (const i of repetir) await directo(i);
    return resultados;
  }

  return { json, lote, cuenta };
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
