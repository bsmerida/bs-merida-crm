// Especialista 3 · Extractor (modelo principal).
// Lee brochure, lista de precios y ficha técnica, y devuelve los datos de cada
// modelo con la evidencia de dónde salió cada dato. No redacta ni inventa.
import { MODELO, S } from "../lib/ia.mjs";
import { TIPOS } from "../lib/borrador.mjs";

const SCHEMA = S.obj({
  desarrollo: S.obj({
    nombre: S.str("Nombre comercial con mayúscula inicial"),
    desarrolladora: S.strV("Empresa que desarrolla o construye."),
    zona: S.strV("Colonia, comisaría o zona (ej. 'Temozón Norte', 'Conkal', 'Cholul')."),
    ciudad: S.strV("Municipio (ej. 'Mérida', 'Conkal', 'Progreso')."),
    estado: S.strV("Estado de la República."),
    direccion: S.strV("Calle o referencia de ubicación."),
    entrega: S.strV("Fecha o etapa de entrega (ej. 'Diciembre 2027', 'Entrega inmediata')."),
    amenidades: S.arr(S.str(), "Amenidades del desarrollo, cada una corta y con mayúscula inicial (ej. 'Alberca', 'Gimnasio', 'Seguridad 24/7')."),
  }),
  modelos: S.arr(S.obj({
    modelo: S.str("Nombre del modelo o tipología tal como lo usa el desarrollador (ej. 'Tipo C', 'Modelo Iris', 'Lote residencial')."),
    type: S.enum(TIPOS),
    operation: S.enum(["Venta", "Renta"]),
    price: S.num0("Precio DESDE: el menor precio de lista de las unidades DISPONIBLES de este modelo."),
    price_hasta: S.num0("Mayor precio de lista de las unidades disponibles de este modelo."),
    currency: S.enum(["MXN", "USD"]),
    price_type: S.enum(["total", "m2"], "'m2' solo si el documento da precio por metro cuadrado y no precio total."),
    bedrooms: S.num0("Recámaras."),
    bathrooms: S.num0("Baños completos + 0.5 por cada medio baño."),
    m2_construction: S.num0("M² de construcción (en departamentos, m² totales o interiores del modelo)."),
    m2_land: S.num0("M² de terreno (lotes y casas)."),
    parking: S.num0("Cajones de estacionamiento."),
    unidades_disponibles: S.int("Unidades disponibles de este modelo según la lista; -1 si no se sabe."),
    todas_vendidas: S.enum(["si", "no", "no_se"], "'si' solo si la lista de precios muestra explícitamente todas las unidades de este modelo como vendidas."),
    caracteristicas: S.arr(S.str(), "Características propias del modelo (ej. 'Cuarto de servicio', 'Roof garden privado'), cortas y con mayúscula inicial."),
    evidencia: S.arr(S.obj({
      campo: S.str("price, bedrooms, m2_construction…"),
      documento: S.int("Número del documento [n]"),
      pagina: S.int("Página del PDF; 0 si no aplica."),
      cita: S.str("Texto breve del documento que respalda el dato."),
    })),
  })),
  dudas: S.arr(S.str(), "Contradicciones entre documentos, precios vencidos, datos que no se pudieron confirmar."),
});

const SYSTEM = `Eres el analista de inventario de D.UCLAUD Bienes Raíces (Mérida, Yucatán). Lees el material que comparten los desarrolladores y extraes los datos para dar de alta cada modelo en el CRM.

Reglas:
- Un registro por MODELO o tipología (ej. "Departamento Tipo A", "Casa Modelo Iris"), no por unidad. En terrenos, un solo registro por desarrollo ("Lote residencial") salvo que haya tipos de lote claramente distintos (residencial, comercial, macrolote).
- precio = el MENOR precio de lista entre las unidades DISPONIBLES de ese modelo. Ignora las vendidas o apartadas. Usa precio de lista, no precios con descuento por contado.
- Si hay varias listas de precios, usa la más reciente y anota la contradicción en dudas.
- NO inventes. Si un dato no aparece, déjalo vacío (texto "") o en 0. Nunca supongas recámaras o m² por el tipo de propiedad.
- Cada precio, recámaras y m² debe llevar evidencia: número de documento, página y la cita breve.
- type debe ser uno de: ${TIPOS.join(", ")}. Town houses y villas son "Casa"; lotes y macrolotes son "Terreno"; consultorios y locales comerciales son "Local".
- Usa mayúscula inicial en nombres y amenidades (no todo en mayúsculas).
- Si los documentos dicen que el desarrollo está agotado, devuelve los modelos con todas_vendidas = "si".`;

export function pedidoExtraer({ fuente, desarrollo, bloques, lecciones = [], correcciones = [] }) {
  const contexto = [
    `Fuente: ${fuente.proveedor}${fuente.alcance ? ` · ${fuente.alcance}` : ""}. Carpeta del desarrollo: "${desarrollo.nombre}".`,
    lecciones.length ? `\nIndicaciones del equipo aprendidas de revisiones anteriores (síguelas):\n- ${lecciones.join("\n- ")}` : "",
    correcciones.length ? `\nCorrecciones recientes que hizo el equipo a datos extraídos (evita repetir el error):\n- ${correcciones.join("\n- ")}` : "",
    "\nExtrae los datos de los siguientes documentos:",
  ].join("\n");
  return {
    paso: "extractor", modelo: MODELO, system: SYSTEM, schema: SCHEMA, maxTokens: 16000, effort: "medium",
    contenido: [{ type: "text", text: contexto }, ...bloques],
  };
}

export async function extraer(ia, entrada) {
  return (await ia.json(pedidoExtraer(entrada))).data;
}
