import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { cambiosPropuestos, campoDesarrollo, claveModelo, datosPropiedad, faltantes } from "../scripts/fuentes/lib/borrador.mjs";
import { candidatos, palabrasClave } from "../scripts/fuentes/lib/candidatos.mjs";
import { costoUsd, crearIA, PresupuestoAgotado } from "../scripts/fuentes/lib/ia.mjs";
import { hojaATexto, prepararDocumentos } from "../scripts/fuentes/lib/documentos.mjs";
import { comparar } from "../scripts/fuentes/agentes/comparador.mjs";
import { segmentar } from "../scripts/fuentes/agentes/segmentador.mjs";
import { clasificar } from "../scripts/fuentes/agentes/clasificador.mjs";

// IA simulada: devuelve respuestas fijas por paso y registra lo que se le pidió.
function iaFalsa(respuestas: Record<string, unknown>) {
  const pedidos: any[] = [];
  return {
    pedidos,
    cuenta: { costoUsd: 0, llamadas: 0, porPaso: {} },
    json: async (p: any) => { pedidos.push(p); return { data: respuestas[p.paso], costo: 0 }; },
  };
}

const kinora = { nombre: "Kinora", desarrolladora: "Desarrollos Capital", zona: "Conkal", ciudad: "Conkal", estado: "Yucatán", direccion: "", entrega: "Julio 2028", amenidades: ["Alberca", "Gimnasio"] };
const tipoA = {
  modelo: "Tipo A", type: "Departamento", operation: "Venta", price: 2_450_000, price_hasta: 2_900_000, currency: "MXN", price_type: "total",
  bedrooms: 2, bathrooms: 2, m2_construction: 85, m2_land: 0, parking: 1, unidades_disponibles: 4, todas_vendidas: "no",
  caracteristicas: ["Terraza"], evidencia: [],
};

describe("borrador", () => {
  it("la clave del modelo es estable ante mayúsculas y acentos", () => {
    expect(claveModelo({ nombre: "Kinora" }, tipoA)).toBe(claveModelo({ nombre: "KINORA" }, { ...tipoA, modelo: "tipo a" }));
    expect(claveModelo({ nombre: "Kinora" }, tipoA)).not.toBe(claveModelo({ nombre: "Kinora Plaza" }, tipoA));
  });

  it("arma los campos con el formato del formulario de propiedades", () => {
    const d = datosPropiedad(kinora, tipoA, { title: "Departamento en Kinora, Tipo A", description: "Texto" });
    expect(d).toMatchObject({
      title: "Departamento en Kinora, Tipo A", type: "Departamento", operation: "Venta", status: "Disponible",
      price: 2_450_000, currency: "MXN", price_type: "total", zone: "Conkal", city: "Conkal", state: "Yucatán",
      bedrooms: 2, m2_construction: 85, m2_land: null, address: null, development: "Kinora (Desarrollos Capital)",
    });
    expect(d.amenities).toEqual(["Alberca", "Gimnasio", "Terraza"]);
  });

  it("no repite la desarrolladora si ya está en el nombre", () => {
    expect(campoDesarrollo({ nombre: "Rosamora Residencial", desarrolladora: "Rosamora" })).toBe("Rosamora Residencial");
  });

  it("solo marca Vendida con evidencia explícita", () => {
    expect(datosPropiedad(kinora, { ...tipoA, todas_vendidas: "no_se" }).status).toBe("Disponible");
    expect(datosPropiedad(kinora, { ...tipoA, todas_vendidas: "si" }).status).toBe("Vendida");
  });

  it("reporta lo que falta para crear la propiedad", () => {
    expect(faltantes(datosPropiedad(kinora, { ...tipoA, price: 0 }))).toContain("No se encontró precio en los documentos.");
  });
});

describe("cambiosPropuestos", () => {
  const actual = {
    title: "Kinora Depto A", price: 2_300_000, currency: "MXN", price_type: "total", bedrooms: 2, bathrooms: 2,
    m2_construction: 85, m2_land: null, parking: 1, description: "Escrita por Bertha", amenities: [], zone: "Conkal",
    status: "Disponible", development: "Kinora",
  };

  it("propone el precio nuevo y llena lo vacío sin pisar lo que escribió una persona", () => {
    const c = cambiosPropuestos(actual, datosPropiedad(kinora, tipoA, { title: "Otro título", description: "Otra" }));
    expect(c.price).toEqual({ antes: 2_300_000, despues: 2_450_000 });
    expect(c.amenities).toBeDefined();          // estaba vacío
    expect(c.description).toBeUndefined();      // ya tenía texto
    expect(c.title).toBeUndefined();            // el título nunca se cambia solo
    expect(c.zone).toBeUndefined();
  });

  it("ignora diferencias de redondeo y datos que el documento no trae", () => {
    const c = cambiosPropuestos(actual, datosPropiedad(kinora, { ...tipoA, price: 2_305_000, m2_construction: 0 }));
    expect(c.price).toBeUndefined();
    expect(c.m2_construction).toBeUndefined();   // 0 = no aparece: no se borra
  });

  it("propone pasar a Vendida solo si el documento lo dice", () => {
    expect(cambiosPropuestos(actual, datosPropiedad(kinora, { ...tipoA, todas_vendidas: "si" })).status)
      .toEqual({ antes: "Disponible", despues: "Vendida" });
  });
});

describe("candidatos", () => {
  const inventario = [
    { id: "1", title: "Departamento en Kinora, Conkal", type: "Departamento", operation: "Venta", bedrooms: 2, development: null },
    { id: "2", title: "Departamentos en Preventa TIPO A, Kinora", type: "Departamento", operation: "Venta", bedrooms: 2, development: null },
    { id: "3", title: "Casa en Conkal", type: "Casa", operation: "Venta", bedrooms: 3, development: null },
    { id: "4", title: "Torre Temozón Departamento Tipo B1", type: "Departamento", operation: "Venta", bedrooms: 2, development: null },
  ];
  it("ignora palabras genéricas al buscar el desarrollo", () => {
    expect(palabrasClave("Torre Temozón Departamentos Residencial")).toEqual(["temozon"]);
  });
  it("encuentra el desarrollo y prioriza el modelo correcto", () => {
    expect(candidatos(inventario, kinora, tipoA).map(p => p.id)).toEqual(["2", "1"]);
  });
  it("encuentra el desarrollo aunque esté en la dirección y no en el título", () => {
    const inv = [{ id: "r", title: "Casa en Conkal", address: "rosamora", type: "Casa", operation: "Venta", bedrooms: 3 }];
    expect(candidatos(inv, { nombre: "Rosamora" }, { ...tipoA, type: "Casa", modelo: "Modelo Iris", bedrooms: 3 }).map(p => p.id)).toEqual(["r"]);
  });
  it("no confunde códigos de modelo con palabras sueltas", () => {
    expect(candidatos(inventario, { nombre: "Torre Temozón" }, { ...tipoA, modelo: "Tipo B1" })[0].id).toBe("4");
  });
});

describe("comparador", () => {
  const inventario = [
    { id: "p1", title: "Departamento en Kinora Tipo A", type: "Departamento", operation: "Venta", bedrooms: 2 },
    { id: "p2", title: "Departamento en Kinora Tipo B", type: "Departamento", operation: "Venta", bedrooms: 2 },
  ];
  const modelos = [tipoA, { ...tipoA, modelo: "Tipo B" }];
  const claves = modelos.map(m => claveModelo(kinora, m));

  it("usa el vínculo aprobado antes, sin preguntarle a la IA", async () => {
    const ia = iaFalsa({});
    const r = await comparar(ia as any, { desarrollo: kinora, modelos: [tipoA], claves: [claves[0]], inventario, vinculos: new Map([[claves[0], "p1"]]) });
    expect(r[0].property.id).toBe("p1");
    expect(ia.pedidos).toHaveLength(0);
  });

  it("rechaza ids que no estaban entre los candidatos y confianza baja", async () => {
    const ia = iaFalsa({ comparador: { decisiones: [
      { modelo: 0, property_id: "inventado", confianza: "alta", razon: "x" },
      { modelo: 1, property_id: "p2", confianza: "baja", razon: "no sé" },
    ] } });
    const r = await comparar(ia as any, { desarrollo: kinora, modelos, claves, inventario, vinculos: new Map() });
    expect(r[0].property).toBeNull();
    expect(r[1].property).toBeNull();
  });

  it("una propiedad no puede quedar asignada a dos modelos", async () => {
    const ia = iaFalsa({ comparador: { decisiones: [
      { modelo: 0, property_id: "p1", confianza: "alta", razon: "mismo modelo" },
      { modelo: 1, property_id: "p1", confianza: "media", razon: "parecido" },
    ] } });
    const r = await comparar(ia as any, { desarrollo: kinora, modelos, claves, inventario, vinculos: new Map() });
    expect(r[0].property.id).toBe("p1");
    expect(r[1].property).toBeNull();
  });

  it("sin candidatos en el inventario no llama a la IA", async () => {
    const ia = iaFalsa({});
    const r = await comparar(ia as any, { desarrollo: { nombre: "Zibá" }, modelos: [tipoA], claves: ["x"], inventario, vinculos: new Map() });
    expect(r[0].property).toBeNull();
    expect(ia.pedidos).toHaveLength(0);
  });
});

describe("segmentador y clasificador", () => {
  const archivos = [
    { archivo_id: "1", nombre: "brochure.pdf", ruta: "1. PROYECTOS/Kinora", mime: "application/pdf" },
    { archivo_id: "2", nombre: "render.jpg", ruta: "1. PROYECTOS/Kinora/Renders", mime: "image/jpeg" },
    { archivo_id: "3", nombre: "cuenta.pdf", ruta: "2. DATOS BANCARIOS", mime: "application/pdf" },
  ];

  it("solo acepta rutas que existen y sin carpetas anidadas", async () => {
    const ia = iaFalsa({ segmentador: {
      desarrollos: [
        { ruta: "1. PROYECTOS/Kinora", nombre: "Kinora" },
        { ruta: "1. PROYECTOS/Kinora/Renders", nombre: "Renders" },   // anidada
        { ruta: "Inventada", nombre: "X" },                          // no existe
      ],
      omitidas: [{ ruta: "2. DATOS BANCARIOS", motivo: "interno" }],
    } });
    const r = await segmentar(ia as any, { id: "F-0010", proveedor: "Capital" }, archivos);
    expect(r.desarrollos).toEqual([{ ruta: "1. PROYECTOS/Kinora", nombre: "Kinora" }]);
  });

  it("el clasificador no acepta una foto como documento (salvo lista de precios) ni un PDF como foto", async () => {
    const ia = iaFalsa({ clasificador: {
      documentos: [{ i: 0, tipo: "brochure" }, { i: 1, tipo: "brochure" }, { i: 9, tipo: "otro" }],
      fotos: [0, 1, 1], operacion: "Venta",
    } });
    const r = await clasificar(ia as any, { nombre: "Kinora", ruta: "1. PROYECTOS/Kinora" }, archivos.slice(0, 2));
    expect(r.documentos.map((d: any) => d.i)).toEqual([0]);
    expect(r.fotos).toEqual([1]);
  });
});

describe("documentos", () => {
  it("convierte un Excel de precios en texto", () => {
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([["Lote", "Precio"], [1, 2500000]]), "Precios");
    const texto = hojaATexto(XLSX.write(libro, { type: "buffer", bookType: "xlsx" }));
    expect(texto).toContain("### Hoja: Precios");
    expect(texto).toContain("1,2500000");
  });

  it("omite PDFs inválidos o pesados y explica por qué", async () => {
    const conector = {
      descargar: async (a: any) => ({ buffer: Buffer.from(a.nombre === "ok.pdf" ? "%PDF-1.4 ..." : "<html>"), mime: "application/pdf" }),
      miniatura: async () => ({ buffer: Buffer.from("jpg"), mime: "image/jpeg" }),
    };
    const r = await prepararDocumentos([
      { i: 0, archivo: { nombre: "ok.pdf", ruta: "", mime: "application/pdf" } },
      { i: 1, archivo: { nombre: "falso.pdf", ruta: "", mime: "application/pdf" } },
      { i: 2, archivo: { nombre: "enorme.pdf", ruta: "", mime: "application/pdf", tamano: 50 * 1024 * 1024 } },
      { i: 3, archivo: { nombre: "plano.dwg", ruta: "", mime: "application/octet-stream" } },
    ], conector);
    expect(r.leidos).toEqual([0]);
    expect(r.bloques.some((b: any) => b.type === "document")).toBe(true);
    expect(r.omitidos.join(" ")).toMatch(/no es un PDF válido.*muy pesado.*formato no compatible/);
  });
});

describe("ia", () => {
  const cliente = (msg: any) => ({ messages: { stream: () => ({ finalMessage: async () => msg }) } });
  const ok = { stop_reason: "end_turn", content: [{ type: "text", text: '{"a":1}' }], usage: { input_tokens: 1_000_000, output_tokens: 100_000 } };

  it("calcula el costo según el modelo", () => {
    expect(costoUsd("claude-sonnet-5-5", { input_tokens: 1_000_000, output_tokens: 100_000 })).toBeCloseTo(3);
    expect(costoUsd("claude-haiku-5-5", { input_tokens: 50_000, output_tokens: 0 })).toBeCloseTo(0.005);
  });

  it("devuelve el JSON y suma el costo por paso", async () => {
    const ia = crearIA({ cliente: cliente(ok) as any });
    const r = await ia.json({ paso: "extractor", modelo: "claude-sonnet-5-5", system: "", contenido: [], schema: {} });
    expect(r.data).toEqual({ a: 1 });
    expect(ia.cuenta.porPaso.extractor).toBeCloseTo(3);
  });

  it("se detiene al llegar al tope de costo de la corrida", async () => {
    const ia = crearIA({ cliente: cliente(ok) as any, maxCostoUsd: 2 });
    await ia.json({ paso: "x", modelo: "claude-sonnet-5-5", system: "", contenido: [], schema: {} });
    await expect(ia.json({ paso: "x", system: "", contenido: [], schema: {} })).rejects.toBeInstanceOf(PresupuestoAgotado);
  });

  it("falla con un mensaje claro si la respuesta se corta o se niega", async () => {
    const corta = crearIA({ cliente: cliente({ ...ok, stop_reason: "max_tokens" }) as any });
    await expect(corta.json({ paso: "redactor", system: "", contenido: [], schema: {} })).rejects.toThrow(/se cortó/);
    const niega = crearIA({ cliente: cliente({ ...ok, stop_reason: "refusal" }) as any });
    await expect(niega.json({ paso: "redactor", system: "", contenido: [], schema: {} })).rejects.toThrow(/se negó/);
  });
});
