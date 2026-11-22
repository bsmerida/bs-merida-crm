#!/usr/bin/env node
// Genera (o regenera) el embedding de descripción/amenidades de las propiedades
// que no lo tienen todavía, para que Sofía pueda reordenar resultados por
// significado cuando el cliente describe lo que busca con palabras vagas
// ("quiero algo tranquilo, con espacio para trabajar desde casa") en vez de
// criterios exactos.
//
//   node --env-file=.env.local scripts/generar-embeddings.mjs            # solo las que les falta
//   node --env-file=.env.local scripts/generar-embeddings.mjs --todas    # recalcula todas (ej. si cambia el modelo)
//
// Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOYAGE_API_KEY.
// Sin VOYAGE_API_KEY no hace nada — igual que el resto del sistema cuando
// falta la llave de un servicio externo (Twilio, VAPID…): se corre solo
// cuando ya esté configurada, sin tocar código.
import { createClient } from "@supabase/supabase-js";

const TODAS = process.argv.includes("--todas");
const MODELO = process.env.VOYAGE_EMBED_MODEL || "voyage-3.5";
const LOTE = 20; // Voyage acepta varios textos por solicitud

if (!process.env.VOYAGE_API_KEY) {
  console.log("Sin VOYAGE_API_KEY configurada todavía: nada que hacer.");
  process.exit(0);
}

// Misma limpieza que revisar-fuentes.mjs: el secreto SUPABASE_URL en GitHub
// Actions a veces trae espacio/slash de más, y eso rompe la URL de la API
// ("Invalid path specified in request URL") aunque localmente funcione bien.
const url = (process.env.SUPABASE_URL || "").trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

const textoDe = (p) => {
  const amenidades = Array.isArray(p.amenities) && p.amenities.length ? `Amenidades: ${p.amenities.join(", ")}.` : "";
  return [p.description?.trim(), amenidades].filter(Boolean).join(" ");
};

async function embeber(textos) {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: textos, model: MODELO, input_type: "document" }),
  });
  if (!res.ok) throw new Error(`Voyage respondió ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const data = await res.json();
  return data.data.map(d => d.embedding);
}

let query = db.from("properties").select("id, description, amenities");
if (!TODAS) query = query.is("description_embedding", null);
const { data: props, error } = await query;
if (error) { console.error("Error leyendo propiedades:", error.message); process.exit(1); }

const pendientes = (props || []).filter(p => textoDe(p).length > 0);
console.log(`${pendientes.length} propiedades por generar${TODAS ? " (--todas)" : ""}.`);

let hechas = 0;
for (let i = 0; i < pendientes.length; i += LOTE) {
  const lote = pendientes.slice(i, i + LOTE);
  const textos = lote.map(textoDe);
  try {
    const vectores = await embeber(textos);
    for (let j = 0; j < lote.length; j++) {
      const { error: errUpd } = await db.from("properties").update({ description_embedding: vectores[j] }).eq("id", lote[j].id);
      if (errUpd) console.error(`  · ${lote[j].id}: ${errUpd.message}`);
      else hechas++;
    }
    console.log(`  · lote ${Math.floor(i / LOTE) + 1}: ${lote.length} propiedades`);
  } catch (e) {
    console.error(`  · lote ${Math.floor(i / LOTE) + 1} falló: ${e.message}`);
  }
}

console.log(`Listo: ${hechas} de ${pendientes.length} propiedades con embedding nuevo.`);
