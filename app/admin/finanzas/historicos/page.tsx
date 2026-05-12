"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);

const emptyRow = () => ({
  year: new Date().getFullYear(),
  month: 1,
  ingreso_venta: "",
  ingreso_renta: "",
  ingreso_otro: "",
  gasto_nomina: "",
  gasto_marketing: "",
  gasto_admin: "",
  gasto_otro: "",
  num_operaciones: "",
  notes: "",
});

export default function HistoricosPage() {
  const supabase = createClient();
  const [records, setRecords] = useState<any[]>([]);
  const [form, setForm] = useState(emptyRow());
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [tab, setTab] = useState<"manual" | "importar" | "ver">("ver");

  const load = async () => {
    const { data } = await supabase.from("financial_history").select("*").order("year", { ascending: false }).order("month", { ascending: false });
    setRecords(data || []);
  };

  useEffect(() => { load(); }, []);

  const ingTotal = () => (Number(form.ingreso_venta) || 0) + (Number(form.ingreso_renta) || 0) + (Number(form.ingreso_otro) || 0);
  const gastoTotal = () => (Number(form.gasto_nomina) || 0) + (Number(form.gasto_marketing) || 0) + (Number(form.gasto_admin) || 0) + (Number(form.gasto_otro) || 0);
  const utilBruta = () => ingTotal() - (0); // sin costos directos en histórico simplificado
  const utilOp = () => ingTotal() - gastoTotal();
  const margen = () => ingTotal() > 0 ? utilOp() / ingTotal() : 0;

  const save = async () => {
    setSaving(true);
    const it = ingTotal();
    const gt = gastoTotal();
    const payload = {
      year: Number(form.year),
      month: Number(form.month),
      ingreso_venta: Number(form.ingreso_venta) || 0,
      ingreso_renta: Number(form.ingreso_renta) || 0,
      ingreso_otro: Number(form.ingreso_otro) || 0,
      ingreso_total: it,
      gasto_nomina: Number(form.gasto_nomina) || 0,
      gasto_marketing: Number(form.gasto_marketing) || 0,
      gasto_admin: Number(form.gasto_admin) || 0,
      gasto_otro: Number(form.gasto_otro) || 0,
      gasto_total: gt,
      utilidad_bruta: it,
      utilidad_op: it - gt,
      margen_neto: it > 0 ? (it - gt) / it : 0,
      num_operaciones: Number(form.num_operaciones) || 0,
      notes: form.notes || null,
      source: "manual",
    };
    const { error } = await supabase.from("financial_history").upsert(payload, { onConflict: "year,month" });
    if (error) alert("Error: " + error.message);
    else { setForm(emptyRow()); load(); setTab("ver"); }
    setSaving(false);
  };

  const importFromExcel = async (file: File) => {
    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Intentar detectar formato: buscar fila de encabezados
      const headers = rows[0]?.map((h: any) => String(h).toLowerCase()) || [];
      const colYear = headers.findIndex((h: string) => h.includes("año") || h.includes("year"));
      const colMonth = headers.findIndex((h: string) => h.includes("mes") || h.includes("month"));
      const colIngVenta = headers.findIndex((h: string) => h.includes("venta"));
      const colIngRenta = headers.findIndex((h: string) => h.includes("renta"));
      const colIngTotal = headers.findIndex((h: string) => h.includes("ingreso") && h.includes("total"));
      const colGastoTotal = headers.findIndex((h: string) => h.includes("gasto") && h.includes("total"));
      const colUtilOp = headers.findIndex((h: string) => h.includes("utilidad"));
      const colOps = headers.findIndex((h: string) => h.includes("operac"));

      if (colYear === -1 || colMonth === -1) {
        alert("No encontré columnas de año/mes. El Excel debe tener columnas llamadas 'Año' y 'Mes' (o 'Year' y 'Month').");
        setImporting(false);
        return;
      }

      const records = rows.slice(1).filter((r: any[]) => r[colYear] && r[colMonth]).map((r: any[]) => {
        const ingV = colIngVenta >= 0 ? Number(r[colIngVenta]) || 0 : 0;
        const ingR = colIngRenta >= 0 ? Number(r[colIngRenta]) || 0 : 0;
        const ingT = colIngTotal >= 0 ? Number(r[colIngTotal]) || 0 : ingV + ingR;
        const gastoT = colGastoTotal >= 0 ? Number(r[colGastoTotal]) || 0 : 0;
        const utilOp = colUtilOp >= 0 ? Number(r[colUtilOp]) || 0 : ingT - gastoT;
        return {
          year: Number(r[colYear]),
          month: Number(r[colMonth]),
          ingreso_venta: ingV,
          ingreso_renta: ingR,
          ingreso_total: ingT,
          ingreso_otro: 0,
          gasto_total: gastoT,
          gasto_nomina: 0,
          gasto_marketing: 0,
          gasto_admin: 0,
          gasto_otro: gastoT,
          utilidad_bruta: ingT,
          utilidad_op: utilOp,
          margen_neto: ingT > 0 ? utilOp / ingT : 0,
          num_operaciones: colOps >= 0 ? Number(r[colOps]) || 0 : 0,
          source: "importado",
        };
      });

      if (records.length === 0) { alert("No se encontraron datos válidos en el Excel."); setImporting(false); return; }

      const { error } = await supabase.from("financial_history").upsert(records, { onConflict: "year,month" });
      if (error) alert("Error al importar: " + error.message);
      else { alert(`✅ ${records.length} meses importados correctamente.`); load(); setTab("ver"); }
    } catch (e: any) {
      alert("Error al leer el Excel: " + e.message);
    }
    setImporting(false);
  };

  const deleteRecord = async (id: string) => {
    if (!confirm("¿Eliminar este registro?")) return;
    await supabase.from("financial_history").delete().eq("id", id);
    load();
  };

  const inp = "w-full bg-ink-ghost border border-transparent rounded-xl px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-brand-300";

  return (
    <div className="p-10 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <a href="/admin/finanzas" className="text-sm text-ink-muted hover:text-ink mb-2 inline-flex items-center gap-1">← Finanzas</a>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Históricos financieros</h1>
          <p className="text-sm text-ink-muted mt-0.5">Carga datos anteriores para análisis histórico y comparativas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ink-ghost p-1 rounded-xl w-fit">
        {[{ id: "ver", label: `Ver registros (${records.length})` }, { id: "manual", label: "Captura manual" }, { id: "importar", label: "Importar Excel" }].map((t: any) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-white text-ink shadow-card" : "text-ink-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Ver registros */}
      {tab === "ver" && (
        <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
          {records.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-semibold text-ink">Sin históricos cargados</h3>
              <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">Carga datos históricos para que la IA pueda analizar tendencias y comparar vs períodos anteriores.</p>
              <button onClick={() => setTab("importar")}
                className="mt-4 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-full text-sm font-medium">
                Importar desde Excel
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-ink-ghost/40 border-b border-ink-line">
                <tr>{["Período", "Ingresos totales", "Utilidad op.", "Margen", "Operaciones", "Fuente", ""].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-4 py-3">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30">
                    <td className="px-4 py-3 font-medium text-sm text-ink">{r.year}/{String(r.month).padStart(2, "0")} — {MONTHS[r.month - 1]} {r.year}</td>
                    <td className="px-4 py-3 text-sm text-ink">{fmt(r.ingreso_total)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={r.utilidad_op >= 0 ? "text-emerald-600" : "text-red-500"}>{fmt(r.utilidad_op)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={r.margen_neto >= 0.2 ? "text-emerald-600" : r.margen_neto >= 0 ? "text-amber-600" : "text-red-500"}>
                        {(r.margen_neto * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{r.num_operaciones}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.source === "importado" ? "bg-brand-50 text-brand-700" : "bg-ink-ghost text-ink-muted"}`}>
                        {r.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteRecord(r.id)} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Captura manual */}
      {tab === "manual" && (
        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-5">
          <h3 className="font-semibold text-ink">Capturar mes histórico</h3>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-ink-muted">Año</label><div className="mt-1.5">
              <input type="number" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} className={inp} />
            </div></div>
            <div><label className="text-xs text-ink-muted">Mes</label><div className="mt-1.5">
              <select value={form.month} onChange={e => setForm({ ...form, month: Number(e.target.value) })} className={inp}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div></div>
          </div>

          <div className="border-t border-ink-line pt-4">
            <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Ingresos</div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-ink-muted">Comisiones venta</label><div className="mt-1.5"><input type="number" value={form.ingreso_venta} onChange={e => setForm({ ...form, ingreso_venta: e.target.value })} placeholder="0" className={inp} /></div></div>
              <div><label className="text-xs text-ink-muted">Comisiones renta</label><div className="mt-1.5"><input type="number" value={form.ingreso_renta} onChange={e => setForm({ ...form, ingreso_renta: e.target.value })} placeholder="0" className={inp} /></div></div>
              <div><label className="text-xs text-ink-muted">Otros ingresos</label><div className="mt-1.5"><input type="number" value={form.ingreso_otro} onChange={e => setForm({ ...form, ingreso_otro: e.target.value })} placeholder="0" className={inp} /></div></div>
            </div>
          </div>

          <div className="border-t border-ink-line pt-4">
            <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Gastos</div>
            <div className="grid grid-cols-4 gap-3">
              <div><label className="text-xs text-ink-muted">Nómina</label><div className="mt-1.5"><input type="number" value={form.gasto_nomina} onChange={e => setForm({ ...form, gasto_nomina: e.target.value })} placeholder="0" className={inp} /></div></div>
              <div><label className="text-xs text-ink-muted">Marketing</label><div className="mt-1.5"><input type="number" value={form.gasto_marketing} onChange={e => setForm({ ...form, gasto_marketing: e.target.value })} placeholder="0" className={inp} /></div></div>
              <div><label className="text-xs text-ink-muted">Administrativo</label><div className="mt-1.5"><input type="number" value={form.gasto_admin} onChange={e => setForm({ ...form, gasto_admin: e.target.value })} placeholder="0" className={inp} /></div></div>
              <div><label className="text-xs text-ink-muted">Otros gastos</label><div className="mt-1.5"><input type="number" value={form.gasto_otro} onChange={e => setForm({ ...form, gasto_otro: e.target.value })} placeholder="0" className={inp} /></div></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-ink-muted">Número de operaciones cerradas</label><div className="mt-1.5"><input type="number" value={form.num_operaciones} onChange={e => setForm({ ...form, num_operaciones: e.target.value })} placeholder="0" className={inp} /></div></div>
            <div><label className="text-xs text-ink-muted">Notas</label><div className="mt-1.5"><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Contexto del mes..." className={inp} /></div></div>
          </div>

          {/* Preview calculado */}
          {ingTotal() > 0 && (
            <div className="bg-ink-ghost rounded-2xl p-4 grid grid-cols-3 gap-4 text-center">
              <div><div className="text-xs text-ink-muted">Ingresos totales</div><div className="text-lg font-semibold text-ink mt-1">{fmt(ingTotal())}</div></div>
              <div><div className="text-xs text-ink-muted">Utilidad operativa</div><div className={`text-lg font-semibold mt-1 ${utilOp() >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmt(utilOp())}</div></div>
              <div><div className="text-xs text-ink-muted">Margen neto</div><div className={`text-lg font-semibold mt-1 ${margen() >= 0 ? "text-emerald-600" : "text-red-500"}`}>{(margen() * 100).toFixed(1)}%</div></div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={save} disabled={saving}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white rounded-full text-sm font-medium">
              {saving ? "Guardando..." : "Guardar mes"}
            </button>
          </div>
        </div>
      )}

      {/* Importar Excel */}
      {tab === "importar" && (
        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-5">
          <h3 className="font-semibold text-ink">Importar desde Excel</h3>

          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 text-sm text-brand-800 space-y-2">
            <div className="font-semibold">Formato esperado del Excel:</div>
            <div>Tu archivo debe tener estas columnas (los nombres pueden variar):</div>
            <div className="grid grid-cols-2 gap-1 text-xs mt-2">
              {["Año / Year", "Mes / Month (número 1-12)", "Venta (ingresos de venta)", "Renta (ingresos de renta)", "Ingresos Total (opcional)", "Gastos Total (opcional)", "Utilidad (opcional)", "Operaciones (opcional)"].map(c => (
                <div key={c} className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0"></span>{c}</div>
              ))}
            </div>
            <div className="text-xs text-brand-600 mt-2">Si Ingresos Total no está, se calcula como Venta + Renta. Si Gastos Total no está, queda en 0 (puedes editarlo después).</div>
          </div>

          <div>
            <input type="file" accept=".xlsx,.xls,.csv" id="excel-upload" className="hidden"
              onChange={e => e.target.files?.[0] && importFromExcel(e.target.files[0])} />
            <label htmlFor="excel-upload"
              className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl py-12 cursor-pointer transition ${importing ? "border-brand-300 bg-brand-50" : "border-ink-line hover:border-brand-300 hover:bg-brand-50/30"}`}>
              {importing ? (
                <><div className="text-2xl mb-2">⏳</div><div className="text-sm text-brand-700 font-medium">Procesando Excel...</div></>
              ) : (
                <><div className="text-3xl mb-3">📂</div><div className="text-sm text-ink font-medium">Clic para seleccionar tu Excel histórico</div><div className="text-xs text-ink-muted mt-1">.xlsx, .xls o .csv</div></>
              )}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
