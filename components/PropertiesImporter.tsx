"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "./Icon";
import { fmtMXN } from "@/lib/utils";

type Row = Record<string, string>;
type ParsedRow = {
  data: any;
  errors: string[];
  rowNum: number;
};

// CSV parser simple. Soporta comillas dobles para escapar comas.
function parseCSV(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(cur); cur = "";
      } else cur += ch;
    }
    result.push(cur);
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row: Row = {};
    headers.forEach((h, i) => row[h] = (values[i] || "").trim());
    return row;
  });
}

const TIPOS = ["Casa", "Departamento", "Oficina", "Local", "Terreno", "Bodega"];
const OPS = ["Venta", "Renta"];

function validateRow(row: Row, rowNum: number): ParsedRow {
  const errors: string[] = [];
  if (!row.title) errors.push("Falta 'title'");
  if (!row.type) errors.push("Falta 'type'");
  else if (!TIPOS.includes(row.type)) errors.push(`'type' debe ser: ${TIPOS.join(", ")}`);
  if (!row.operation) errors.push("Falta 'operation'");
  else if (!OPS.includes(row.operation)) errors.push(`'operation' debe ser: ${OPS.join(", ")}`);
  if (!row.price) errors.push("Falta 'price'");
  else if (isNaN(Number(row.price))) errors.push("'price' debe ser número");

  const amenities = (row.amenities || "").split("|").map(a => a.trim()).filter(Boolean);
  const data = {
    title: row.title,
    type: row.type,
    operation: row.operation,
    price: Number(row.price),
    description: row.description || null,
    address: row.address || null,
    zone: row.zone || null,
    city: row.city || "Mérida",
    state: row.state || "Yucatán",
    bedrooms: row.bedrooms ? Number(row.bedrooms) : 0,
    bathrooms: row.bathrooms ? Number(row.bathrooms) : 0,
    m2_construction: row.m2_construction ? Number(row.m2_construction) : null,
    m2_land: row.m2_land ? Number(row.m2_land) : null,
    parking: row.parking ? Number(row.parking) : 0,
    amenities,
    is_published: row.is_published?.toUpperCase() !== "FALSE",
  };
  return { data, errors, rowNum };
}

export function PropertiesImporter() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ ok: number; fail: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleFile = async (file: File) => {
    setDone(null);
    const text = await file.text();
    const parsed = parseCSV(text);
    const validated = parsed.map((row, i) => validateRow(row, i + 2));
    setRows(validated);
  };

  const importAll = async () => {
    const validRows = rows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) return;

    setImporting(true);
    let ok = 0, fail = 0;
    // Insertar en lotes de 50
    for (let i = 0; i < validRows.length; i += 50) {
      const batch = validRows.slice(i, i + 50).map(r => r.data);
      const { error } = await supabase.from("properties").insert(batch);
      if (error) fail += batch.length;
      else ok += batch.length;
    }
    setImporting(false);
    setDone({ ok, fail });
    if (ok > 0) setTimeout(() => router.push("/admin/propiedades"), 2500);
  };

  const validas = rows.filter(r => r.errors.length === 0).length;
  const invalidas = rows.length - validas;

  return (
    <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
      <h3 className="font-semibold text-ink mb-4">Subir archivo</h3>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {rows.length === 0 ? (
        <button onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-ink-line rounded-2xl py-12 text-center hover:border-brand-300 hover:bg-brand-50/30 transition">
          <Icon name="building" className="w-10 h-10 mx-auto text-ink-soft" />
          <div className="mt-3 text-sm font-medium text-ink">Selecciona o arrastra tu CSV</div>
          <div className="text-xs text-ink-muted mt-1">Solo formato .csv</div>
        </button>
      ) : (
        <div>
          {/* Resumen */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-sm text-ink"><strong>{rows.length}</strong> filas leídas</span>
            <span className="text-sm text-emerald-600">✓ {validas} válidas</span>
            {invalidas > 0 && <span className="text-sm text-red-600">⚠ {invalidas} con errores</span>}
            <button onClick={() => { setRows([]); setDone(null); }} className="ml-auto text-xs text-ink-muted hover:text-ink">Reiniciar</button>
          </div>

          {/* Preview tabla */}
          <div className="border border-ink-line rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-ghost sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted">#</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted">Título</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted">Tipo</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted">Operación</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted">Precio</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.rowNum} className={`border-t border-ink-line ${r.errors.length > 0 ? "bg-red-50" : ""}`}>
                    <td className="px-3 py-2 text-xs text-ink-muted">{r.rowNum}</td>
                    <td className="px-3 py-2 text-ink truncate max-w-xs">{r.data.title || "—"}</td>
                    <td className="px-3 py-2 text-ink-muted">{r.data.type || "—"}</td>
                    <td className="px-3 py-2 text-ink-muted">{r.data.operation || "—"}</td>
                    <td className="px-3 py-2 text-ink-muted">{r.data.price ? fmtMXN(r.data.price) : "—"}</td>
                    <td className="px-3 py-2">
                      {r.errors.length === 0 ? (
                        <span className="text-emerald-600 text-xs">✓ Lista</span>
                      ) : (
                        <span className="text-red-600 text-xs" title={r.errors.join("; ")}>⚠ {r.errors.length} error{r.errors.length > 1 ? "es" : ""}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invalidas > 0 && (
            <div className="mt-3 text-xs text-ink-muted">
              Pasa el cursor sobre "errores" en cada fila para ver el detalle. Las filas con errores NO se van a importar.
            </div>
          )}

          {!done && (
            <button onClick={importAll} disabled={importing || validas === 0}
              className="w-full mt-5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium py-3 rounded-full">
              {importing ? "Importando..." : `Importar ${validas} propiedades`}
            </button>
          )}

          {done && (
            <div className={`mt-5 p-4 rounded-xl ${done.ok > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              <div className="font-semibold text-ink">
                {done.ok > 0 ? `✓ ${done.ok} propiedades importadas` : "⚠ No se importó ninguna"}
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
