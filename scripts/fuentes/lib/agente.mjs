// Orquestador del paso 2. Es código, no un agente: el orden siempre es el
// mismo y cada especialista entrega datos con estructura fija al siguiente.
//
// Trabaja por fases sobre TODOS los desarrollos con cambios de la corrida, y
// cada fase va en un solo lote de la Batch API (50% más barato):
//   0 segmentar fuentes → 1 clasificar → 2 extraer → 3 comparar → 4 fotos y textos → 5 guardar
import { createHash } from "node:crypto";
import { leerSegmentar, pedidoSegmentar } from "../agentes/segmentador.mjs";
import { leerClasificar, prepararClasificar } from "../agentes/clasificador.mjs";
import { pedidoExtraer } from "../agentes/extractor.mjs";
import { leerComparar, prepararComparar } from "../agentes/comparador.mjs";
import { leerFotos, prepararFotos } from "../agentes/fotografo.mjs";
import { leerRedactar, pedidoRedactar } from "../agentes/redactor.mjs";
import { esImagen, prepararDocumentos } from "./documentos.mjs";
import { dentroDe, firmaArchivos } from "./inventario.mjs";
import { cambiosPropuestos, claveModelo, datosPropiedad, faltantes, TIPOS } from "./borrador.mjs";

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

// Solo los documentos cuentan para decidir si se reprocesa un desarrollo:
// si el proveedor solo sube fotos o videos, no se vuelve a pagar la lectura.
export const firmaDocumentos = (archivos) =>
  firmaArchivos(archivos.filter(a => !esImagen(a) && !/^video\//.test(a.mime || "")));

const mensaje = (e) => (e instanceof Error ? e.message : String(e));

// ── Todas las fuentes activas de la corrida ────────────────────────────────
// revisadas: [{ fuente, archivos, cambios, conector }] (salida del paso 1).
export async function procesarFuentes(db, ia, { revisadas, ctx, maxDesarrollos, log = console.log }) {
  const resumen = { desarrollos: 0, borradores: 0, errores: [] };

  // Fase 0 · segmentar las fuentes nuevas o con cambios
  const porSegmentar = [];
  for (const r of revisadas) {
    const { count } = await db.from("fuente_desarrollos").select("id", { count: "exact", head: true }).eq("fuente_id", r.fuente.id);
    if (!count || r.cambios.length) porSegmentar.push(r);
  }
  if (porSegmentar.length) {
    log("Fase 0 · segmentar carpetas");
    const res = await ia.lote(porSegmentar.map(r => () => pedidoSegmentar(r.fuente, r.archivos, ctx.porPaso("general"))));
    for (let k = 0; k < porSegmentar.length; k++) {
      const { fuente, archivos } = porSegmentar[k];
      if (res[k].error) { resumen.errores.push(`${fuente.id} (segmentar): ${mensaje(res[k].error)}`); continue; }
      const seg = leerSegmentar(res[k].data, fuente, archivos);
      if (seg.desarrollos.length) {
        const { error } = await db.from("fuente_desarrollos")
          .upsert(seg.desarrollos.map(d => ({ fuente_id: fuente.id, ruta: d.ruta, nombre: d.nombre })), { onConflict: "fuente_id,ruta" });
        if (error) resumen.errores.push(`${fuente.id}: no se guardaron los desarrollos (${error.message})`);
      }
      log(`  ${fuente.id}: ${seg.desarrollos.length} desarrollos, ${seg.omitidas.length} carpetas omitidas`);
    }
  }

  // Desarrollos con documentos nuevos o modificados (o que fallaron la vez pasada)
  const trabajos = [];
  for (const r of revisadas) {
    const { data: desarrollos } = await db.from("fuente_desarrollos").select("*")
      .eq("fuente_id", r.fuente.id).neq("estado", "Omitido").order("ruta");
    for (const desarrollo of desarrollos || []) {
      const archivos = dentroDe(r.archivos, desarrollo.ruta);
      if (!archivos.length) continue;                    // la carpeta ya no existe: se conserva el historial
      const firma = firmaDocumentos(archivos);
      if (desarrollo.firma === firma && desarrollo.estado !== "Error") continue;
      if (trabajos.length >= maxDesarrollos) { log(`  · tope de ${maxDesarrollos} desarrollos por corrida; el resto sigue en la próxima`); break; }
      trabajos.push({ ...r, desarrollo, archivos, firma, vinculos: ctx.vinculos(r.fuente.id) });
    }
  }
  if (!trabajos.length) { log("Sin desarrollos con documentos nuevos."); return resumen; }
  resumen.desarrollos = trabajos.length;
  const vivos = () => trabajos.filter(t => !t.error && !t.nota);

  // Fase 1 · clasificar archivos
  log(`Fase 1 · clasificar (${trabajos.length} desarrollos)`);
  for (const t of trabajos) t.clas = prepararClasificar(t.desarrollo, t.archivos);
  let res = await ia.lote(trabajos.map(t => () => t.clas.pedido));
  trabajos.forEach((t, k) => {
    if (res[k].error) { t.error = res[k].error; return; }
    t.clas = leerClasificar(res[k].data, t.clas.lista);
    t.docs = t.clas.documentos.map(d => ({ i: d.i, archivo: t.clas.lista[d.i] }));
    if (!t.docs.length) t.nota = "Sin documentos con datos de venta";
  });

  // Fase 2 · leer documentos (se descargan justo antes de enviarlos)
  let activos = vivos();
  if (activos.length) {
    log(`Fase 2 · extraer datos (${activos.length} desarrollos)`);
    res = await ia.lote(activos.map(t => async () => {
      const { bloques, omitidos } = await prepararDocumentos(t.docs, t.conector);
      t.omitidos = omitidos;
      if (!bloques.length) { t.nota = `No se pudo leer ningún documento (${omitidos.join("; ")})`; return null; }
      return pedidoExtraer({
        fuente: t.fuente, desarrollo: t.desarrollo, bloques,
        lecciones: ctx.porPaso("extractor"), correcciones: ctx.correccionesDatos,
      });
    }));
    activos.forEach((t, k) => {
      if (res[k].error) { t.error = res[k].error; return; }
      if (!res[k].data) return;
      const ext = res[k].data;
      t.dudas = [...(ext.dudas || []), ...(t.omitidos || []).map(o => `No se leyó: ${o}`)];
      t.dev = { ...ext.desarrollo, nombre: ext.desarrollo?.nombre || t.desarrollo.nombre };
      t.modelos = (ext.modelos || []).filter(m => TIPOS.includes(m.type));
      if (!t.modelos.length) t.nota = "Los documentos no tienen modelos con datos suficientes";
    });
  }

  // Fase 3 · comparar con el inventario (barata: no se corta por el tope)
  activos = vivos();
  if (activos.length) {
    log(`Fase 3 · comparar con el inventario`);
    for (const t of activos) {
      t.claves = t.modelos.map(m => claveModelo(t.dev, m));
      t.comp = prepararComparar({
        desarrollo: t.dev, modelos: t.modelos, claves: t.claves, inventario: ctx.inventario,
        vinculos: t.vinculos, lecciones: ctx.porPaso("comparador"),
      });
    }
    res = await ia.lote(activos.map(t => () => t.comp.pedido), { ignorarTope: true });
    activos.forEach((t, k) => {
      // Si falla, queda el resultado preliminar: "Nueva" con aviso de posible duplicado.
      t.coincidencias = leerComparar(res[k].error ? null : res[k].data, t.comp);
      t.plan = t.modelos.map((_, i) => {
        const prop = t.coincidencias[i].property;
        return {
          prop,
          necesitaFotos: !prop || (ctx.fotosPorPropiedad.get(prop.id) || 0) < MIN_FOTOS_EXISTENTES,
          necesitaTexto: !prop || !prop.description?.trim(),
        };
      });
    });

    // Fase 4 · fotos y textos, en el mismo lote
    log(`Fase 4 · elegir fotos y redactar`);
    const fabricas = [];
    const destinos = [];
    for (const t of activos) {
      t.idxFotos = t.plan.map((p, i) => (p.necesitaFotos ? i : -1)).filter(i => i >= 0);
      t.idxTexto = t.plan.map((p, i) => (p.necesitaTexto ? i : -1)).filter(i => i >= 0);
      const candidatas = t.clas.fotos.map(i => t.clas.lista[i]);
      t.fotosModelo = t.modelos.map(() => []);
      t.descartadas = [];
      t.textos = t.modelos.map(() => ({}));
      if (t.idxFotos.length && candidatas.length) {
        destinos.push({ t, tipo: "fotos" });
        fabricas.push(async () => {
          t.prepFotos = await prepararFotos({
            desarrollo: t.dev, modelos: t.idxFotos.map(i => t.modelos[i]), candidatas, conector: t.conector,
            referencias: ctx.referencias, lecciones: ctx.porPaso("fotos"),
          });
          return t.prepFotos.pedido;
        });
      }
      if (t.idxTexto.length) {
        destinos.push({ t, tipo: "texto" });
        fabricas.push(() => pedidoRedactar({
          desarrollo: t.dev, modelos: t.idxTexto.map(i => t.modelos[i]),
          ejemplosTitulos: ctx.ejemplosTitulos, ejemplosDescripciones: ctx.ejemplosDescripciones,
          lecciones: ctx.porPaso("redactor"), correcciones: ctx.correccionesTexto,
        }));
      }
    }
    res = await ia.lote(fabricas, { ignorarTope: true });
    destinos.forEach(({ t, tipo }, k) => {
      // Un fallo aquí no tira el borrador: llega sin fotos o sin texto y se avisa en dudas.
      if (tipo === "fotos") {
        if (res[k].error || !t.prepFotos) { t.dudas.push(`No se pudieron elegir fotos: ${mensaje(res[k].error || "sin imágenes")}`); return; }
        const r = leerFotos(res[k].data, t.prepFotos, t.idxFotos.map(i => t.modelos[i]));
        t.idxFotos.forEach((i, j) => { t.fotosModelo[i] = r.porModelo[j] || []; });
        t.descartadas = r.descartadas;
      } else {
        if (res[k].error) { t.dudas.push(`No se pudo redactar: ${mensaje(res[k].error)}`); return; }
        const r = leerRedactar(res[k].data, t.idxTexto.map(i => t.modelos[i]));
        t.idxTexto.forEach((i, j) => { t.textos[i] = r[j] || {}; });
      }
    });
  }

  // Fase 5 · guardar borradores y el estado de cada desarrollo
  const costoTotal = ia.cuenta.costoUsd;
  const costoPorTrabajo = trabajos.length ? costoTotal / trabajos.length : 0;
  const cacheFotos = new Map();
  for (const t of trabajos) {
    const etiqueta = `${t.fuente.id} · ${t.desarrollo.nombre}`;
    try {
      if (t.error) throw t.error;
      let creados = 0;
      if (!t.nota) creados = await guardarBorradores(db, t, ctx, cacheFotos, costoPorTrabajo, log);
      resumen.borradores += creados;
      await db.from("fuente_desarrollos").update({
        estado: "Procesado", firma: t.firma, error: t.nota || null, procesado_en: new Date().toISOString(),
        ...(t.clas?.documentos && { clasificacion: { documentos: (t.docs || []).map(d => d.archivo.nombre), fotos: t.clas.fotos.length } }),
      }).eq("id", t.desarrollo.id);
      log(`  ✓ ${etiqueta}: ${t.nota || `${t.modelos.length} modelos → ${creados} borradores`}`);
    } catch (e) {
      resumen.errores.push(`${etiqueta}: ${mensaje(e)}`);
      await db.from("fuente_desarrollos").update({ estado: "Error", error: mensaje(e).slice(0, 500), procesado_en: new Date().toISOString() })
        .eq("id", t.desarrollo.id);
      log(`  ✗ ${etiqueta}: ${mensaje(e)}`);
    }
  }
  return resumen;
}

async function guardarBorradores(db, t, ctx, cacheFotos, costoTrabajo, log) {
  const evidenciaDe = (m) => (m.evidencia || []).map(e => {
    const a = t.clas.lista[e.documento];
    return { campo: e.campo, cita: e.cita, pagina: e.pagina || null, archivo: a?.nombre || null, url: a?.url || null };
  });
  let creados = 0;
  for (let i = 0; i < t.modelos.length; i++) {
    const m = t.modelos[i];
    const { prop } = t.plan[i];
    const datos = datosPropiedad(t.dev, m, t.textos[i]);
    const cambios = prop ? cambiosPropuestos(prop, datos) : null;

    const fotos = [];
    for (const a of t.fotosModelo[i]) {
      try { fotos.push(await subirFoto(db, t.conector, t.fuente, a, cacheFotos)); } catch (e) { log(`  · foto omitida (${a.nombre}): ${mensaje(e)}`); }
    }
    if (prop && !Object.keys(cambios).length && !fotos.length) continue; // la propiedad ya está al día

    const coincidencia = t.coincidencias[i];
    const dudas = [
      ...t.dudas,
      ...(prop ? [] : faltantes(datos)),
      ...(coincidencia.confianza === "media" ? [`Revisa la coincidencia: ${coincidencia.razon}`] : []),
      ...(m.unidades_disponibles === 0 ? ["La lista de precios no muestra unidades disponibles de este modelo."] : []),
    ];

    const fila = {
      fuente_id: t.fuente.id, desarrollo_id: t.desarrollo.id, clave_modelo: t.claves[i],
      accion: prop ? "Actualizar" : "Nueva", property_id: prop?.id || null,
      datos, cambios, fotos, dudas,
      extra: {
        desarrollo: t.dev.nombre, desarrolladora: t.dev.desarrolladora || null, modelo: m.modelo,
        entrega: t.dev.entrega || null, precio_hasta: m.price_hasta || null,
        unidades_disponibles: m.unidades_disponibles >= 0 ? m.unidades_disponibles : null,
        fotos_descartadas: t.descartadas.slice(0, 20), proveedor: t.fuente.proveedor,
        propiedad_actual: prop ? { title: prop.title, fotos: ctx.fotosPorPropiedad.get(prop.id) || 0 } : null,
      },
      evidencia: evidenciaDe(m),
      coincidencia: { metodo: coincidencia.metodo, razon: coincidencia.razon, confianza: coincidencia.confianza, candidatos: coincidencia.candidatos || [] },
      costo_usd: Number((costoTrabajo / t.modelos.length).toFixed(4)),
    };

    // Un borrador nuevo del mismo modelo reemplaza al pendiente anterior.
    await db.from("propiedad_borradores").update({ estado: "Reemplazado" })
      .eq("fuente_id", t.fuente.id).eq("clave_modelo", t.claves[i]).eq("estado", "Pendiente");
    const { error } = await db.from("propiedad_borradores").insert(fila);
    if (error) throw new Error(`No se guardó el borrador: ${error.message}`);
    creados++;
  }
  return creados;
}
