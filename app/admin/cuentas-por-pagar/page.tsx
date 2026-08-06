"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

const db = createClient();
const fmtMXN = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);
const CATEGORIAS = ["Renta oficina", "Servicios", "Marketing", "Legal", "Nómina", "Tecnología", "Mantenimiento", "Otro"];
const ESTADOS: Record<string, string> = { pendiente: "bg-amber-50 text-amber-700", pagado: "bg-emerald-50 text-emerald-700", vencido: "bg-red-50 text-red-700" };
type Bill = { id: string; concepto: string; proveedor: string; monto: number; fecha_vencimiento: string; estado: string; categoria: string; notas?: string };
const empty = { concepto: "", proveedor: "", monto: "", fecha_vencimiento: "", estado: "pendiente", categoria: "Otro", notas: "" };

export default function CuentasPorPagarPage() {
  const [bills, setBills]       = useState<Bill[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<any>(empty);
  const [saving, setSaving]     = useState(false);
  const [filterEstado, setFilterEstado] = useState("todos");

  async function load() {
    setLoading(true);
    const { data } = await db.from("cuentas_por_pagar").select("*").order("fecha_vencimiento", { ascending: true });
    setBills(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split("T")[0];
  const processed = useMemo(() => (bills as Bill[]).map(b => ({
    ...b,
    estado: b.estado === "pendiente" && b.fecha_vencimiento < today ? "vencido" : b.estado,
  })), [bills, today]);

  const filtered = filterEstado === "todos" ? processed : processed.filter(b => b.estado === filterEstado);
  const totalPendiente = processed.filter(b => b.estado !== "pagado").reduce((s, b) => s + Number(b.monto), 0);
  const totalVencido   = processed.filter(b => b.estado === "vencido").reduce((s, b) => s + Number(b.monto), 0);
  const totalMes       = processed.filter(b => b.fecha_vencimiento?.startsWith(today.slice(0, 7))).reduce((s, b) => s + Number(b.monto), 0);

  async function save() {
    if (!form.concepto || !form.monto || !form.fecha_vencimiento) return;
    setSaving(true);
    await db.from("cuentas_por_pagar").insert({ ...form, monto: Number(form.monto) });
    setForm(empty); setShowForm(false); setSaving(false); load();
  }
  async function marcarPagado(id: string) {
    await db.from("cuentas_por_pagar").update({ estado: "pagado" }).eq("id", id); load();
  }
  async function eliminar(id: string) {
    if (!confirm("Eliminar esta cuenta?")) return;
    await db.from("cuentas_por_pagar").delete().eq("id", id); load();
  }

  const inp = "w-full border border-ink-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-300";
  const sel = "bg-white border border-ink-line rounded-full px-4 py-2 text-sm focus:outline-none cursor-pointer";

  return (
    <div className="p-10 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Cuentas por pagar</h1>
          <p className="text-sm text-ink-muted mt-0.5">{filtered.length} cuentas · {fmtMXN(totalPendiente)} pendiente</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-navy text-white rounded-full text-sm font-medium hover:opacity-90">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Nueva cuenta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total pendiente", value: fmtMXN(totalPendiente), color: "text-amber-600" },
          { label: "Vencido",         value: fmtMXN(totalVencido),   color: totalVencido > 0 ? "text-red-600" : "text-ink" },
          { label: "Vence este mes",  value: fmtMXN(totalMes),       color: "text-ink" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-ink-line shadow-card p-5">
            <div className="text-xs text-ink-muted">{k.label}</div>
            <div className={"text-2xl font-semibold mt-2 tracking-tight " + k.color}>{k.value}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Nueva cuenta por pagar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-ink-muted mb-1 block">Concepto *</label>
              <input value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})} placeholder="Ej. Renta de oficina" className={inp} /></div>
            <div><label className="text-xs text-ink-muted mb-1 block">Proveedor</label>
              <input value={form.proveedor} onChange={e => setForm({...form, proveedor: e.target.value})} placeholder="Nombre del proveedor" className={inp} /></div>
            <div><label className="text-xs text-ink-muted mb-1 block">Monto *</label>
              <input type="number" value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} placeholder="0" className={inp} /></div>
            <div><label className="text-xs text-ink-muted mb-1 block">Fecha de vencimiento *</label>
              <input type="date" value={form.fecha_vencimiento} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})} className={inp} /></div>
            <div><label className="text-xs text-ink-muted mb-1 block">Categoría</label>
              <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className={inp}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className="text-xs text-ink-muted mb-1 block">Notas</label>
              <input value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} placeholder="Opcional" className={inp} /></div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-ink-muted border border-ink-line rounded-full">Cancelar</button>
            <button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-medium bg-navy text-white rounded-full disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className={sel}>
          <option value="todos">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="vencido">Vencido</option>
          <option value="pagado">Pagado</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-ink-line p-12 text-center text-sm text-ink-muted">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ink-line p-12 text-center text-sm text-ink-muted">Sin cuentas registradas.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-ink-line bg-ink-ghost/40">
                <tr>{["Concepto", "Proveedor", "Categoría", "Monto", "Vencimiento", "Estado", ""].map((h, i) => (
                  <th key={i} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-4 py-3">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className={"border-b border-ink-line last:border-0 hover:bg-ink-ghost/30 " + (b.estado === "vencido" ? "bg-red-50/30" : "")}>
                    <td className="px-4 py-3"><div className="text-sm font-medium text-ink">{b.concepto}</div>
                      {b.notas && <div className="text-xs text-ink-muted">{b.notas}</div>}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{b.proveedor || "—"}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{b.categoria}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-ink whitespace-nowrap">{fmtMXN(Number(b.monto))}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted whitespace-nowrap">
                      {new Date(b.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3">
                      <span className={"text-xs px-2 py-1 rounded-full font-medium capitalize " + (ESTADOS[b.estado] || "bg-ink-ghost text-ink-muted")}>{b.estado}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {b.estado !== "pagado" && (
                          <button onClick={() => marcarPagado(b.id)} className="text-xs text-emerald-600 hover:underline whitespace-nowrap">Marcar pagado</button>
                        )}
                        <button onClick={() => eliminar(b.id)} className="text-xs text-red-400 hover:text-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
