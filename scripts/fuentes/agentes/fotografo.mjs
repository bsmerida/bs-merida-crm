// Especialista 5 · Editor de fotos (modelo principal con visión).
// Ve miniaturas de las imágenes candidatas y elige, para cada modelo, las que
// mejor venden en el sitio y los portales, con la portada primero.
import { MODELO, S } from "../lib/ia.mjs";

const ANCHO_MINIATURA = 480;

const SCHEMA = S.obj({
  por_modelo: S.arr(S.obj({
    modelo: S.int("Número del modelo"),
    fotos: S.arr(S.int(), "Números de foto en orden de aparición: la primera es la portada. Entre 6 y 16."),
  })),
  descartadas: S.arr(S.obj({ foto: S.int(), motivo: S.str() }), "Solo las descartadas por calidad o contenido, con motivo breve."),
});

const SYSTEM = `Eres el editor de fotografía de D.UCLAUD Bienes Raíces. Eliges las fotos que se publicarán en el sitio web y, desde ahí, en todos los portales inmobiliarios. Los compradores deciden con estas fotos.

Criterios:
- Portada: la imagen más atractiva y representativa (fachada o vista principal, bien iluminada, sin texto encima).
- Después: interiores principales (sala, cocina, recámara principal, baños), luego terrazas, vistas y amenidades.
- Descarta: planos, mapas, masterplans, flyers o imágenes con texto/precios/logos grandes, capturas de pantalla, fotos borrosas, oscuras o pixeladas, avance de obra, duplicados o casi duplicados (deja la mejor).
- Si una imagen es claramente de un modelo específico (por su carpeta o nombre), úsala solo en ese modelo. Las amenidades y fachadas generales sirven para todos los modelos del desarrollo.
- Entre 6 y 16 fotos por modelo, salvo que haya menos fotos buenas: es mejor pocas buenas que rellenar con malas.
- Las imágenes de referencia (si las hay) muestran el estilo de portada que ya usa la inmobiliaria.`;

// candidatas: archivos de imagen. Devuelve { porModelo: [[archivo…]…], descartadas }.
export async function elegirFotos(ia, { desarrollo, modelos, candidatas, conector, referencias = [], lecciones = [] }) {
  const vistas = [];
  for (const a of candidatas) {
    try {
      const img = await conector.miniatura(a, ANCHO_MINIATURA);
      if (img.buffer.length > 3.5 * 1024 * 1024) continue;
      vistas.push({ archivo: a, img });
    } catch { /* la imagen no se pudo previsualizar: se omite */ }
  }
  if (!vistas.length) return { porModelo: modelos.map(() => []), descartadas: [] };

  const contenido = [{
    type: "text",
    text: [
      `Desarrollo: ${desarrollo.nombre}`,
      `Modelos:\n${modelos.map((m, i) => `[${i}] ${m.modelo} (${m.type}${m.bedrooms ? `, ${m.bedrooms} rec` : ""})`).join("\n")}`,
      lecciones.length ? `Indicaciones del equipo (síguelas):\n- ${lecciones.join("\n- ")}` : "",
    ].filter(Boolean).join("\n\n"),
  }];
  referencias.forEach((r, i) => contenido.push(
    { type: "text", text: `Referencia de estilo ${i + 1} (portada actual del sitio):` },
    { type: "image", source: { type: "base64", media_type: r.mime, data: r.buffer.toString("base64") } },
  ));
  vistas.forEach((v, i) => contenido.push(
    { type: "text", text: `Foto ${i} · ${v.archivo.ruta ? `${v.archivo.ruta}/` : ""}${v.archivo.nombre}` },
    { type: "image", source: { type: "base64", media_type: v.img.mime, data: v.img.buffer.toString("base64") } },
  ));

  const { data } = await ia.json({
    paso: "fotos", modelo: MODELO, system: SYSTEM, schema: SCHEMA, maxTokens: 4000, effort: "medium", contenido,
  });

  const porModelo = modelos.map(() => []);
  for (const pm of data.por_modelo || []) {
    if (!porModelo[pm.modelo]) continue;
    const vistasModelo = [...new Set(pm.fotos || [])].filter(n => vistas[n]).slice(0, 16);
    porModelo[pm.modelo] = vistasModelo.map(n => vistas[n].archivo);
  }
  const descartadas = (data.descartadas || []).filter(d => vistas[d.foto])
    .map(d => ({ nombre: vistas[d.foto].archivo.nombre, motivo: d.motivo }));
  return { porModelo, descartadas };
}
