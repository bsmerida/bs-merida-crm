#!/usr/bin/env node
// Revisión diaria de las carpetas de los proveedores (GitHub Actions, 6:00 Mérida).
//
//   node scripts/revisar-fuentes.mjs                    # revisa las 12 y corre el agente donde está activo
//   node scripts/revisar-fuentes.mjs --fuente F-0008    # solo una fuente
//   node scripts/revisar-fuentes.mjs --solo-revisar     # sin IA: solo detecta cambios de archivos
//   node scripts/revisar-fuentes.mjs --max-desarrollos 5 --max-costo 3
//
// Paso 0 (si hay FUENTES_EXCEL_URL): lee el Excel de fuentes en Drive y agrega
//   las fuentes con ID nuevo, apagadas. Si falla, se sigue con las ya registradas.
// Paso 1 (siempre, sin IA): lista cada carpeta en solo lectura y registra
//   archivos nuevos, modificados y eliminados.
// Paso 2 (fuentes con "agente_activo"): los especialistas leen los documentos
//   de los desarrollos con cambios y dejan borradores en /admin/fuentes.
//   Nada se publica: una persona aprueba o rechaza cada borrador.
//
// Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_API_KEY,
// DROPBOX_REFRESH_TOKEN + DROPBOX_APP_KEY + DROPBOX_APP_SECRET (o DROPBOX_ACCESS_TOKEN)
// ANTHROPIC_API_KEY (paso 2) y FUENTES_EXCEL_URL (paso 0). Nunca se imprimen.
import { createClient } from "@supabase/supabase-js";
import { conectarFuente, descargarHojaDrive } from "./fuentes/lib/plataformas.mjs";
import { leerExcelFuentes, sincronizarFuentes } from "./fuentes/lib/excel.mjs";
import { revisarFuente, marcarError } from "./fuentes/lib/revisar.mjs";
import { cargarContexto, procesarFuentes } from "./fuentes/lib/agente.mjs";
import { crearIA, PresupuestoAgotado } from "./fuentes/lib/ia.mjs";

const args = process.argv.slice(2);
const opcion = (nombre) => { const i = args.indexOf(`--${nombre}`); return i >= 0 ? args[i + 1] : undefined; };
const bandera = (nombre) => args.includes(`--${nombre}`);

const MAX_DESARROLLOS = Number(opcion("max-desarrollos") || process.env.FUENTES_MAX_DESARROLLOS || 25);
const MAX_COSTO_USD = Number(opcion("max-costo") || process.env.FUENTES_MAX_COSTO_USD || 15);

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// Paso 0: nunca detiene la corrida; el error queda registrado.
async function sincronizarExcel() {
  const excel = process.env.FUENTES_EXCEL_URL;
  if (!excel) return { resumen: null, error: null };
  console.log("Paso 0 · Excel de fuentes");
  try {
    const r = await sincronizarFuentes(db, leerExcelFuentes(await descargarHojaDrive(excel, process.env.GOOGLE_API_KEY)));
    console.log(r.agregadas.length ? `✓ Fuentes nuevas (apagadas): ${r.agregadas.join(", ")}` : "✓ Sin fuentes nuevas");
    for (const o of r.omitidas) console.log(`· ${o.id} no se agregó: ${o.motivo}`);
    return { resumen: r, error: null };
  } catch (e) {
    console.log(`✗ Excel de fuentes: ${e.message}`);
    return { resumen: null, error: `Excel de fuentes: ${e.message}` };
  }
}

async function main() {
  const excel = await sincronizarExcel();
  let q = db.from("fuentes").select("*").order("id");
  if (opcion("fuente")) q = q.eq("id", opcion("fuente"));
  const { data: fuentes, error } = await q;
  if (error) throw new Error(`No se pudieron leer las fuentes: ${error.message}`);
  if (!fuentes?.length) { console.log("No hay fuentes registradas. Corre supabase/seed/fuentes.sql."); return; }

  const { data: corrida } = await db.from("agente_corridas").insert({}).select("id").single();
  const errores = excel.error ? [excel.error] : [];
  const resumen = { fuentes: {}, borradores: 0, desarrollos: 0, ...(excel.resumen && { excel: excel.resumen }) };

  // ── Paso 1: revisar carpetas ──────────────────────────────────────────────
  console.log("\nPaso 1 · Revisión de carpetas");
  const revisadas = [];
  for (const fuente of fuentes) {
    const etiqueta = `${fuente.id} ${fuente.proveedor}${fuente.alcance ? ` · ${fuente.alcance}` : ""}`;
    try {
      const conector = await conectarFuente(fuente);
      const r = await revisarFuente(db, fuente, conector);
      revisadas.push({ fuente, conector, ...r });
      resumen.fuentes[fuente.id] = { archivos: r.archivos.length, cambios: r.cambios.length };
      console.log(`✓ ${etiqueta}: ${r.primeraVez ? `inventario base, ${r.archivos.length} archivos` : `${r.archivos.length} archivos, ${r.cambios.length} cambios`}`);
    } catch (e) {
      // Una fuente con problemas no detiene a las demás.
      errores.push(`${fuente.id}: ${e.message}`);
      resumen.fuentes[fuente.id] = { error: e.message };
      console.log(`✗ ${etiqueta}: ${e.message}`);
      await marcarError(db, fuente, e.message).catch(() => {});
    }
  }

  // ── Paso 2: agente (solo fuentes activas) ─────────────────────────────────
  const activas = revisadas.filter(r => r.fuente.agente_activo);
  let ia;
  if (!bandera("solo-revisar") && activas.length) {
    console.log(`\nPaso 2 · Agente (${activas.map(a => a.fuente.id).join(", ")}) · tope ${MAX_COSTO_USD} USD`);
    try {
      ia = crearIA({ maxCostoUsd: MAX_COSTO_USD, log: (m) => console.log(m) });
      const ctx = await cargarContexto(db);
      const res = await procesarFuentes(db, ia, { revisadas: activas, ctx, maxDesarrollos: MAX_DESARROLLOS });
      resumen.desarrollos = res.desarrollos;
      resumen.borradores = res.borradores;
      errores.push(...res.errores);
    } catch (e) {
      if (!(e instanceof PresupuestoAgotado)) {
        errores.push(`Agente: ${e.message}`);
        console.log(`  ✗ ${e.message}`);
      } else {
        console.log(`  · ${e.message}. Lo pendiente sigue en la próxima corrida.`);
      }
    }
  }

  const costo = ia?.cuenta.costoUsd || 0;
  if (corrida) {
    await db.from("agente_corridas").update({
      fin: new Date().toISOString(), costo_usd: Number(costo.toFixed(4)), errores,
      resumen: { ...resumen, costo_por_paso: ia?.cuenta.porPaso || {}, llamadas: ia?.cuenta.llamadas || 0, en_lote: ia?.cuenta.enLote || 0 },
    }).eq("id", corrida.id);
  }
  console.log(`\nListo: ${revisadas.length} fuentes al día, ${fuentes.length - revisadas.length} con error · ` +
    `${resumen.desarrollos} desarrollos procesados · ${resumen.borradores} borradores nuevos · ~${costo.toFixed(2)} USD`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
