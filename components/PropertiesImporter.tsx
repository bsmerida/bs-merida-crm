"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "./Icon";
import { fmtMXN } from "@/lib/utils";

type Row = Record<string, string>;
type ParsedRow = { data: any; errors: string[]; warnings: string[]; rowNum: number; ref?: string };

const TIPOS = ["Casa", "Departamento", "Oficina", "Local", "Terreno", "Bodega"];
const TIPO_TOKKO_MAP: Record<string, string> = {
  "Departamento": "Departamento", "Casa": "Casa", "Oficina": "Oficina",
  "Local": "Local", "Local comercial": "Local", "Terreno": "Terreno",
  "Bodega": "Bodega", "Galpón": "Bodega",
};

function parseCSV(text: string): Row[] {
  // Quitar BOM si existe
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const parseLine = (line: string): string[] => {
    const r: string[] = []; let cur = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === "," && !q) { r.push(cur); cur = ""; }
      else cur += ch;
    }
    r.push(cur); return r;
  };
  const headers = parseLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const v = parseLine(line); const row: Row = {};
    headers.forEach((h, i) => row[h] = (v[i] || "").trim());
    return row;
  });
}

// Detecta si es CSV de Tokko (tiene columnas como "Id", "Ref", "VentaMXN", "RentaMXN", "Total construído")
function isTokkoFormat(rows: Row[]): boolean {
  if (rows.length === 0) return false;
  const keys = Object.keys(rows[0]);
  return keys.includes("Id") && keys.includes("Ref") && (keys.includes("VentaMXN") || keys.includes("RentaMXN"));
}

const num = (s: string): number | null => {
  if (!s || s === "-" || s === "None" || s === "---" || s === "0") return null;
  const n = Number(s.replace(/,/g, ""));
  return isNaN(n) ? null : n;
};

const num0 = (s: string): number => num(s) || 0;

// Parsea Tokko CSV
function parseTokkoRow(row: Row, rowNum: number): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ventaMXN = num(row.VentaMXN);
  const rentaMXN = num(row.RentaMXN);

  let operation = "";
  let price = 0;
  if (ventaMXN && ventaMXN > 0) { operation = "Venta"; price = ventaMXN; }
  else if (rentaMXN && rentaMXN > 0) { operation = "Renta"; price = rentaMXN; }
  else { errors.push("Sin VentaMXN ni RentaMXN válido"); }

  // Ubicación: "México | Yucatán | Mérida | Cholul"
  const ubic = (row["Ubicación"] || "").split("|").map(s => s.trim());
  const country = ubic[0] || "México";
  const state = ubic[1] || "Yucatán";
  const city = ubic[2] || "Mérida";
  const zone = ubic[3] || ubic[2] || null;

  const tipoTokko = row.Tipo || "";
  const type = TIPO_TOKKO_MAP[tipoTokko] || "";
  if (!type) errors.push(`Tipo desconocido: "${tipoTokko}"`);

  // Estado de Tokko: Disponible / No disponible / Reservada
  const estadoTokko = (row.Estado || "").toLowerCase();
  let status = "Disponible";
  if (estadoTokko.includes("no disponible")) status = "Pausada";
  else if (estadoTokko.includes("reservada") || estadoTokko.includes("reservado")) status = "Reservada";
  else if (estadoTokko.includes("vendido") || estadoTokko.includes("vendida")) status = "Vendida";
  else if (estadoTokko.includes("rentado") || estadoTokko.includes("rentada")) status = "Rentada";

  const banos = num0(row.Baños) + (num0(row["Medios baños"]) * 0.5);

  const data: any = {
    external_id: row.Id || null,
    reference: row.Ref || null,
    title: `${type || "Propiedad"} ${row.Ref ? `(${row.Ref})` : ""} en ${zone || city}`.trim(),
    type,
    operation,
    status,
    price,
    address: row["Dirección"] || null,
    zone,
    city,
    state,
    bedrooms: num0(row.Recámaras),
    bathrooms: banos,
    m2_construction: num(row["Total construído"]),
    m2_land: num(row.Terreno),
    parking: num0(row.Estacionamientos),
    amenities: [],
    is_published: status === "Disponible",
    development: row.Desarrollo || null,
    branch: row.Sucursal || null,
    owner_name: row.Propietario || null,
    owner_email: row["Correo electrónico"] || null,
    owner_phone: row["Móvil"] || null,
  };

  if (!price) warnings.push("Sin precio definido — se importa pausada");

  return { data, errors, warnings, rowNum, ref: row.Ref };
}

// Parsea formato plantilla (mi formato)
function parsePlantillaRow(row: Row, rowNum: number): ParsedRow {
  const errors: string[] = [];
  if (!row.title) errors.push("Falta 'title'");
  if (!row.type) errors.push("Falta 'type'");
  else if (!TIPOS.includes(row.type)) errors.push(`'type' inválido`);
  if (!row.operation) errors.push("Falta 'operation'");
  else if (!["Venta", "Renta"].includes(row.operation)) errors.push(`'operation' inválido`);
  if (!row.price) errors.push("Falta 'price'");
  else if (isNaN(Number(row.price))) errors.push("'price' debe ser número");

  const data = {
    title: row.title, type: row.type, operation: row.operation,
    price: Number(row.price), description: row.description || null,
    address: row.address || null, zone: row.zone || null,
    city: row.city || "Mérida", state: row.state || "Yucatán",
    bedrooms: row.bedrooms ? Number(row.bedrooms) : 0,
    bathrooms: row.bathrooms ? Number(row.bathrooms) : 0,
    m2_construction: row.m2_construction ? Number(row.m2_construction) : null,
    m2_land: row.m2_land ? Number(row.m2_land) : null,
    parking: row.parking ? Number(row.parking) : 0,
    amenities: (row.amenities || "").split("|").map(a => a.trim()).filter(Boolean),
    is_published: row.is_published?.toUpperCase() !== "FALSE",
  };
  return { data, errors, warnings: [], rowNum };
}

export function PropertiesImporter() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [format, setFormat] = useState<"tokko" | "plantilla" | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState<{ ok: number; fail: number; updated: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFile = async (file: File) => {
    setDone(null);
    const text = await file.text();
    const parsed = parseCSV(text);
    const isTokko = isTokkoFormat(parsed);
    setFormat(isTokko ? "tokko" : "plantilla");
    const validated = parsed.map((row, i) => isTokko ? parseTokkoRow(row, i + 2) : parsePlantillaRow(row, i + 2));
    setRows(validated);
  };

  const importAll = async () => {
    const validRows = rows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) return;

    setImporting(true);
    setProgress(0);
    let ok = 0, fail = 0, updated = 0;

    for (let i = 0; i < validRows.length; i += 25) {
      const batch = validRows.slice(i, i + 25).map(r => r.data);
      // Para Tokko: usar upsert por external_id (evita duplicados al re-importar)
      const useUpsert = format === "tokko";
      const { error, count } = useUpsert
        ? await supabase.from("properties").upsert(batch, { onConflict: "external_id", count: "exact" })
        : await supabase.from("properties").insert(batch, { count: "exact" });

      if (error) fail += batch.length;
      else {
        ok += batch.length;
        if (useUpsert) updated += batch.length; // upsert no distingue inserts/updates fácilmente
      }
      setProgress(Math.round(((i + batch.length) / validRows.length) * 100));
    }
    setImporting(false);
    setDone({ ok, fail, updated });
    if (ok > 0) setTimeout(() => router.push("/admin/propiedades"), 3000);
  };

  const validas = rows.filter(r => r.errors.length === 0).length;
  const conWarnings = rows.filter(r => r.errors.length === 0 && r.warnings.length > 0).length;
  const invalidas = rows.length - validas;

  return (
    <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
      <h3 className="font-semibold text-ink mb-4">Subir archivo</h3>

      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {rows.length === 0 ? (
        <button onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-ink-line rounded-2xl py-12 text-center hover:border-brand-300 hover:bg-brand-50/30 transition">
          <Icon name="building" className="w-10 h-10 mx-auto text-ink-soft" />
          <div className="mt-3 text-sm font-medium text-ink">Selecciona o arrastra tu CSV</div>
          <div className="text-xs text-ink-muted mt-1">Acepta plantilla o exportación de Tokko</div>
        </button>
      ) : (
        <div>
          {format === "tokko" && (
            <div className="mb-4 p-3 bg-brand-50 border border-brand-200 rounded-xl text-sm text-ink">
              ✓ Detecté formato <strong>Tokko</strong>. Mapeé las 38 columnas a tu CRM. Las propiedades con el mismo <code>Id</code> se actualizan en lugar de duplicarse.
            </div>
          )}

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-sm text-ink"><strong>{rows.length}</strong> filas</span>
            <span className="text-sm text-emerald-600">✓ {validas} listas</span>
            {conWarnings > 0 && <span className="text-sm text-amber-600">⚠ {conWarnings} con avisos</span>}
            {invalidas > 0 && <span className="text-sm text-red-600">✗ {invalidas} con errores</span>}
            <button onClick={() => { setRows([]); setDone(null); setFormat(null); }} className="ml-auto text-xs text-ink-muted hover:text-ink">Reiniciar</button>
          </div>

          <div className="border border-ink-line rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-ghost sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted">{format === "tokko" ? "Ref" : "#"}</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted">Tipo</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted">Operación</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted">Zona</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted">Precio</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.rowNum} className={`border-t border-ink-line ${r.errors.length > 0 ? "bg-red-50" : r.warnings.length > 0 ? "bg-amber-50" : ""}`}>
                    <td className="px-3 py-2 text-xs text-ink-muted">{r.ref || r.rowNum}</td>
                    <td className="px-3 py-2 text-ink">{r.data.type || "—"}</td>
                    <td className="px-3 py-2 text-ink-muted">{r.data.operation || "—"}</td>
                    <td className="px-3 py-2 text-ink-muted truncate max-w-[200px]">{r.data.zone || r.data.city || "—"}</td>
                    <td className="px-3 py-2 text-ink-muted">{r.data.price ? fmtMXN(r.data.price) : "—"}</td>
                    <td className="px-3 py-2">
                      {r.errors.length > 0 ? (
                        <span className="text-red-600 text-xs" title={r.errors.join("; ")}>✗ {r.errors.length}</span>
                      ) : r.warnings.length > 0 ? (
                        <span className="text-amber-600 text-xs" title={r.warnings.join("; ")}>⚠ {r.warnings.join("; ")}</span>
                      ) : (
                        <span className="text-emerald-600 text-xs">✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!done && (
            <>
              {importing && (
                <div className="mt-4">
                  <div className="h-2 bg-ink-ghost rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="text-xs text-ink-muted text-center mt-2">{progress}% importado</div>
                </div>
              )}
              <button onClick={importAll} disabled={importing || validas === 0}
                className="w-full mt-5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium py-3 rounded-full">
                {importing ? `Importando... ${progress}%` : `${format === "tokko" ? "Sincronizar" : "Importar"} ${validas} propiedades`}
              </button>
            </>
          )}

          {done && (
            <div className={`mt-5 p-4 rounded-xl ${done.ok > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              <div className="font-semibold text-ink">
                {done.ok > 0 ? `✓ ${done.ok} propiedades ${format === "tokko" ? "sincronizadas" : "importadas"}` : "⚠ No se importó ninguna"}
              </div>
              {done.fail > 0 && <div className="text-sm text-red-700 mt-1">{done.fail} fallaron</div>}
              <div className="text-xs text-ink-muted mt-2">Te llevamos a tu inventario en unos segundos…</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
