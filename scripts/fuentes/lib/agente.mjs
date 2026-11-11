// Orquestador del paso 2: por cada desarrollo con cambios corre los
// especialistas en orden fijo y guarda los borradores. Es código, no un agente:
// el orden siempre es el mismo y cada paso entrega datos con estructura fija.
import { createHash } from "node:crypto";
import { segmentar } from "../agentes/segmentador.mjs";
import { clasificar } from "../agentes/clasificador.mjs";
import { extraer } from "../agentes/extractor.mjs";
import { comparar } from "../agentes/comparador.mjs";
import { elegirFotos } from "../agentes/fotografo.mjs";
import { redactar } from "../agentes/redactor.mjs";
import { prepararDocumentos } from "./documentos.mjs";
import { dentroDe, firmaArchivos } from "./inventario.mjs";
import { cambiosPropuestos, claveModelo, datosPropiedad, faltantes, TIPOS } from "./borrador.mjs";
import { PresupuestoAgotado } from "./ia.mjs";

const BUCKET = "property-images";
const MIN_FOTOS_EXISTENTES = 5; // si la propiedad ya tiene 5+ fotos, no se le proponen más

async function leerTodo(q) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await q().range(desde, desde + 999);
    if (error) throw new Error(error.message);
    filas.push(...(data || []));
    if (!data || data.length < 1000) return filas;
  }
}

// ── Contexto compartido por toda la corrida ─────────────────────────────────
export async function cargarContexto(db) {
  const [inventario, imagenes, vinculos, lecciones, aprobados, ejemplos] = await Promise.all([
    leerTodo(() => db.from("properties").select(
      "id, title, type, operation, status, development, zone, address, city, state, price, price_type, currency, " +
      "bedrooms, bathrooms, m2_construction, m2_land, parking, amenities, description, is_published, updated_at").order("id")),
    leerTodo(() => db.from("property_images").select("property_id, url, is_cover").order("property_id").order("url")),
    leerTodo(() => db.from("propiedad_fuentes").select("fuente_id, clave_modelo, property_id").order("vinculado_en")),
    db.from("agente_lecciones").select("paso, leccion").eq("activa", true).order("created_at", { ascending: false }).limit(200),
    db.from("propiedad_borradores").select("datos, datos_finales, extra").eq("estado", "Aprobado")
      .not("datos_finales", "is", null).order("revisado_en", { ascending: false }).limit(40),
    db.from("properties").select("title, description, is_published").order("updated_at", { ascending: false }).limit(200),
  ]);

  const fotosPorPropiedad = new Map();
  for (const i of imagenes) fotosPorPropiedad.set(i.property_id, (fotosPorPropiedad.get(i.property_id) || 0) + 1);

  const porPaso = (paso) => (lecciones.data || []).filter(l => l.paso === paso || l.paso === "general").slice(0, 25).map(l => l.leccion);

  // Correcciones que hizo una persona al aprobar (lo propuesto vs lo guardado).
  const correccionesTexto = [];
  const correccionesDatos = [];
  for (const b of aprobados.data || []) {
    const antes = b.datos || {}, despues = b.datos_finales || {};
    if (antes.title && despues.title && antes.title !== despues.title) correccionesTexto.push(`Título propuesto "${antes.title}" → corregido a "${despues.title}"`);
    if (antes.description && despues.description && antes.description !== despues.description) {
      correccionesTexto.push(`Descripción corregida; versión final: "${despues.description.slice(0, 400)}…"`);
    }
    for (const c of ["price", "bedrooms", "bathrooms", "m2_construction", "m2_land", "parking", "type", "zone"]) {
      if (antes[c] != null && despues[c] != null && String(antes[c]) !== String(despues[c])) {
        correccionesDatos.push(`${despues.development || b.extra?.desarrollo || ""} ${b.extra?.modelo || ""}: ${c} ${antes[c]} → ${despues[c]}`.trim());
      }
    }
  }

  const publicadas = (ejemplos.data || []).filter(p => p.is_published);
  const ejemplosTitulos = [...new Set(publicadas.map(p => p.title).filter(Boolean))].slice(0, 40);
  const ejemplosDescripciones = (ejemplos.data || []).map(p => p.description?.trim())
    .filter(d => d && d.length >= 300 && d.length <= 2000).slice(0, 5);

  // Portadas actuales como referencia de estilo para el editor de fotos.
  const referencias = [];
  const idsPublicadas = new Set(inventario.filter(p => p.is_published).map(p => p.id));
  for (const img of imagenes.filter(i => i.is_cover && idsPublicadas.has(i.property_id)).slice(-12)) {
    if (referencias.length >= 3) break;
    try {
      const res = await fetch(img.url, { signal: AbortSignal.timeout(10000) });
      const mime = (res.headers.get("content-type") || "").split(";")[0];
      const buffer = Buffer.from(await res.arrayBuffer());
      if (res.ok && /^image\/(jpeg|png|webp)$/.test(mime) && buffer.length < 3.5 * 1024 * 1024) referencias.push({ buffer, mime });
    } catch { /* sin referencia */ }
  }

  return {
    inventario, fotosPorPropiedad, porPaso, referencias, ejemplosTitulos, ejemplosDescripciones,
    correccionesTexto: correccionesTexto.slice(0, 12), correccionesDatos: correccionesDatos.slice(0, 15),
    vinculos: (fuenteId) => new Map(vinculos.filter(v => v.fuente_id === fuenteId).map(v => [v.clave_modelo, v.property_id])),
  };
}

// ── Fotos: se copian al Storage del CRM (las carpetas del proveedor no se tocan) ──
async function subirFoto(db, conector, fuente, archivo, cache) {
  if (cache.has(archivo.archivo_id)) return cache.get(archivo.archivo_id);
  const nombre = createHash("sha1").update(archivo.archivo_id).digest("hex").slice(0, 20);
  const ruta = `fuentes/${fuente.id}/${nombre}.jpg`;
  let img;
  try {
    img = await conector.miniatura(archivo, 2000); // JPEG de hasta 2000 px, listo para web
  } catch {
    const original = await conector.descargar(archivo);
    if (!/^image\/(jpeg|png|webp)$/.test(original.mime) || original.buffer.length > 8 * 1024 * 1024) throw new Error("imagen no compatible");
    img = original;
  }
  const { error } = await db.storage.from(BUCKET).upload(ruta, img.buffer, { contentType: img.mime, upsert: true });
  if (error) throw new Error(`Storage: ${error.message}`);
  const url = db.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
  const foto = { url, nombre: archivo.nombre, ruta: archivo.ruta, archivo_id: archivo.archivo_id };
  cache.set(archivo.archivo_id, foto);
  return foto;
}

// ── Un desarrollo ───────────────────────────────────────────────────────────
async function procesarDesarrollo(db, ia, { fuente, desarrollo, archivos, conector, ctx, vinculos, cacheFotos, log }) {
  const costoInicial = ia.cuenta.costoUsd;

  const clas = await clasificar(ia, desarrollo, archivos);
  const docs = clas.documentos.map(d => ({ i: d.i, archivo: clas.lista[d.i] }));
  if (!docs.length) return { nota: "Sin documentos con datos de venta", borradores: 0, clasificacion: { documentos: [], fotos: clas.fotos.length } };

  const { bloques, omitidos } = await prepararDocumentos(docs, conector);
  if (!bloques.length) return { nota: `No se pudo leer ningún documento (${omitidos.join("; ")})`, borradores: 0 };

  const ext = await extraer(ia, {
    fuente, desarrollo, bloques, lecciones: ctx.porPaso("extractor"), correcciones: ctx.correccionesDatos,
  });
  const dev = { ...ext.desarrollo, nombre: ext.desarrollo?.nombre || desarrollo.nombre };
  const modelos = (ext.modelos || []).filter(m => TIPOS.includes(m.type));
  if (!modelos.length) return { nota: "Los documentos no tienen modelos con datos suficientes", borradores: 0 };

  const claves = modelos.map(m => claveModelo(dev, m));
  const coincidencias = await comparar(ia, {
    desarrollo: dev, modelos, claves, inventario: ctx.inventario, vinculos, lecciones: ctx.porPaso("comparador"),
  });

  // Qué necesita cada modelo: las nuevas todo; las existentes solo lo que les falta.
  const plan = modelos.map((m, i) => {
    const prop = coincidencias[i].property;
    return {
      prop,
      necesitaFotos: !prop || (ctx.fotosPorPropiedad.get(prop.id) || 0) < MIN_FOTOS_EXISTENTES,
      necesitaTexto: !prop || !prop.description?.trim(),
    };
  });

  const idxFotos = plan.map((p, i) => (p.necesitaFotos ? i : -1)).filter(i => i >= 0);
  let fotosModelo = modelos.map(() => []);
  let descartadas = [];
  const candidatas = clas.fotos.map(i => clas.lista[i]);
  if (idxFotos.length && candidatas.length) {
    const r = await elegirFotos(ia, {
      desarrollo: dev, modelos: idxFotos.map(i => modelos[i]), candidatas, conector,
      referencias: ctx.referencias, lecciones: ctx.porPaso("fotos"),
    });
    idxFotos.forEach((i, k) => { fotosModelo[i] = r.porModelo[k] || []; });
    descartadas = r.descartadas;
  }

  const idxTexto = plan.map((p, i) => (p.necesitaTexto ? i : -1)).filter(i => i >= 0);
  const textos = modelos.map(() => ({}));
  if (idxTexto.length) {
    const r = await redactar(ia, {
      desarrollo: dev, modelos: idxTexto.map(i => modelos[i]),
      ejemplosTitulos: ctx.ejemplosTitulos, ejemplosDescripciones: ctx.ejemplosDescripciones,
      lecciones: ctx.porPaso("redactor"), correcciones: ctx.correccionesTexto,
    });
    idxTexto.forEach((i, k) => { textos[i] = r[k] || {}; });
  }

  const costoPorModelo = (ia.cuenta.costoUsd - costoInicial) / modelos.length;
  const evidenciaDe = (m) => (m.evidencia || []).map(e => {
    const a = clas.lista[e.documento];
    return { campo: e.campo, cita: e.cita, pagina: e.pagina || null, archivo: a?.nombre || null, url: a?.url || null };
  });
  const dudasComunes = [...(ext.dudas || []), ...omitidos.map(o => `No se leyó: ${o}`)];

  let creados = 0;
  for (let i = 0; i < modelos.length; i++) {
    const m = modelos[i];
    const { prop } = plan[i];
    const datos = datosPropiedad(dev, m, textos[i]);
    const cambios = prop ? cambiosPropuestos(prop, datos) : null;

    const fotos = [];
    for (const a of fotosModelo[i]) {
      try { fotos.push(await subirFoto(db, conector, fuente, a, cacheFotos)); } catch (e) { log(`  · foto omitida (${a.nombre}): ${e.message}`); }
    }
    if (prop && !Object.keys(cambios).length && !fotos.length) continue; // la propiedad ya está al día

    const coincidencia = coincidencias[i];
    const dudas = [
      ...dudasComunes,
      ...(prop ? [] : faltantes(datos)),
      ...(coincidencia.confianza === "media" ? [`Coincidencia con confianza media: ${coincidencia.razon}`] : []),
      ...(m.unidades_disponibles === 0 ? ["La lista de precios no muestra unidades disponibles de este modelo."] : []),
    ];

    const fila = {
      fuente_id: fuente.id, desarrollo_id: desarrollo.id, clave_modelo: claves[i],
      accion: prop ? "Actualizar" : "Nueva", property_id: prop?.id || null,
      datos, cambios, fotos, dudas,
      extra: {
        desarrollo: dev.nombre, desarrolladora: dev.desarrolladora || null, modelo: m.modelo,
        entrega: dev.entrega || null, precio_hasta: m.price_hasta || null,
        unidades_disponibles: m.unidades_disponibles >= 0 ? m.unidades_disponibles : null,
        fotos_descartadas: descartadas.slice(0, 20), proveedor: fuente.proveedor,
        propiedad_actual: prop ? { title: prop.title, fotos: ctx.fotosPorPropiedad.get(prop.id) || 0 } : null,
      },
      evidencia: evidenciaDe(m),
      coincidencia: { metodo: coincidencia.metodo, razon: coincidencia.razon, confianza: coincidencia.confianza, candidatos: coincidencia.candidatos || [] },
      costo_usd: Number(costoPorModelo.toFixed(4)),
    };

    // Un borrador nuevo del mismo modelo reemplaza al pendiente anterior.
    await db.from("propiedad_borradores").update({ estado: "Reemplazado" })
      .eq("fuente_id", fuente.id).eq("clave_modelo", claves[i]).eq("estado", "Pendiente");
    const { error } = await db.from("propiedad_borradores").insert(fila);
    if (error) throw new Error(`No se guardó el borrador: ${error.message}`);
    creados++;
  }

  return {
    borradores: creados, modelos: modelos.length,
    clasificacion: { documentos: docs.map(d => d.archivo.nombre), fotos: candidatas.length },
  };
}

// ── Una fuente ──────────────────────────────────────────────────────────────
export async function procesarFuente(db, ia, { fuente, archivos, cambios, conector, ctx, maxDesarrollos, log = console.log }) {
  const resumen = { desarrollos: 0, borradores: 0, errores: [] };

  const { data: existentes } = await db.from("fuente_desarrollos").select("*").eq("fuente_id", fuente.id);
  if (!existentes?.length || cambios.length) {
    const seg = await segmentar(ia, fuente, archivos, ctx.porPaso("general"));
    if (seg.desarrollos.length) {
      const { error } = await db.from("fuente_desarrollos")
        .upsert(seg.desarrollos.map(d => ({ fuente_id: fuente.id, ruta: d.ruta, nombre: d.nombre })), { onConflict: "fuente_id,ruta" });
      if (error) throw new Error(`No se guardaron los desarrollos: ${error.message}`);
    }
    log(`  ${seg.desarrollos.length} desarrollos, ${seg.omitidas.length} carpetas omitidas`);
  }

  const { data: desarrollos } = await db.from("fuente_desarrollos").select("*")
    .eq("fuente_id", fuente.id).neq("estado", "Omitido").order("ruta");
  const vinculos = ctx.vinculos(fuente.id);
  const cacheFotos = new Map();

  for (const desarrollo of desarrollos || []) {
    const suyos = dentroDe(archivos, desarrollo.ruta);
    if (!suyos.length) continue;                         // la carpeta ya no existe: se conserva el historial
    const firma = firmaArchivos(suyos);
    if (desarrollo.firma === firma && desarrollo.estado !== "Error") continue; // sin cambios
    if (resumen.desarrollos >= maxDesarrollos) { log(`  · tope de ${maxDesarrollos} desarrollos por corrida; el resto sigue mañana`); break; }
    resumen.desarrollos++;

    try {
      const r = await procesarDesarrollo(db, ia, { fuente, desarrollo, archivos: suyos, conector, ctx, vinculos, cacheFotos, log });
      resumen.borradores += r.borradores;
      await db.from("fuente_desarrollos").update({
        estado: "Procesado", firma, error: r.nota || null, procesado_en: new Date().toISOString(),
        ...(r.clasificacion && { clasificacion: r.clasificacion }),
      }).eq("id", desarrollo.id);
      log(`  ✓ ${desarrollo.nombre}: ${r.nota || `${r.modelos} modelos → ${r.borradores} borradores`}`);
    } catch (e) {
      if (e instanceof PresupuestoAgotado) throw e; // se detiene la corrida; este desarrollo se reintenta mañana
      resumen.errores.push(`${fuente.id} · ${desarrollo.nombre}: ${e.message}`);
      await db.from("fuente_desarrollos").update({ estado: "Error", error: String(e.message).slice(0, 500), procesado_en: new Date().toISOString() })
        .eq("id", desarrollo.id);
      log(`  ✗ ${desarrollo.nombre}: ${e.message}`);
    }
  }
  return resumen;
}
