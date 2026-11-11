#!/usr/bin/env node
// Revisión diaria de las carpetas de los proveedores (GitHub Actions, 6:00 Mérida).
//
//   node scripts/revisar-fuentes.mjs                 # revisa las 12 fuentes
//   node scripts/revisar-fuentes.mjs --fuente F-0008 # solo una
//
// Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_API_KEY y
// DROPBOX_REFRESH_TOKEN + DROPBOX_APP_KEY + DROPBOX_APP_SECRET (o DROPBOX_ACCESS_TOKEN).
// Nunca se imprimen. Las carpetas solo se leen.
import { createClient } from "@supabase/supabase-js";
import { conectarFuente } from "./fuentes/lib/plataformas.mjs";
import { revisarFuente, marcarError } from "./fuentes/lib/revisar.mjs";

const args = process.argv.slice(2);
const opcion = (nombre) => { const i = args.indexOf(`--${nombre}`); return i >= 0 ? args[i + 1] : undefined; };

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  let q = db.from("fuentes").select("*").order("id");
  if (opcion("fuente")) q = q.eq("id", opcion("fuente"));
  const { data: fuentes, error } = await q;
  if (error) throw new Error(`No se pudieron leer las fuentes: ${error.message}`);
  if (!fuentes?.length) { console.log("No hay fuentes registradas. Corre supabase/seed/fuentes.sql."); return; }

  let fallidas = 0;
  for (const fuente of fuentes) {
    const etiqueta = `${fuente.id} ${fuente.proveedor}${fuente.alcance ? ` · ${fuente.alcance}` : ""}`;
    try {
      const conector = await conectarFuente(fuente);
      const r = await revisarFuente(db, fuente, conector);
      const resumen = r.primeraVez
        ? `inventario base: ${r.archivos.length} archivos`
        : `${r.archivos.length} archivos, ${r.cambios.length} cambios`;
      console.log(`✓ ${etiqueta}: ${resumen}`);
    } catch (e) {
      // Una fuente con problemas no detiene a las demás.
      fallidas++;
      console.log(`✗ ${etiqueta}: ${e.message}`);
      await marcarError(db, fuente, e.message).catch(() => {});
    }
  }
  console.log(`\nListo: ${fuentes.length - fallidas} al día, ${fallidas} con error.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
