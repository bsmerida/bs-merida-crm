"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { DealForm } from "@/components/finanzas/DealForm";
import { ExpenseForm } from "@/components/finanzas/ExpenseForm";
import { ReportExporterPro } from "@/components/finanzas/ReportExporterPro";
import { FinanzasAI } from "@/components/finanzas/FinanzasAI";

const fmtMXN = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

type Period = "mes" | "trimestre" | "cuatrimestre" | "semestre" | "año";
type Deal = any;
type Expense = any;

const PERIODOS: { value: Period; label: string }[] = [
  { value: "mes", label: "Este mes" },
  { value: "trimestre", label: "Trimestre" },
  { value: "cuatrimestre", label: "Cuatrimestre" },
  { value: "semestre", label: "Semestre" },
  { value: "año", label: "Este año" },
];

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  let start: Date;
  switch (period) {
    case "mes":          start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case "trimestre":    start = new Date(now.getFullYear(), now.getMonth() - 2, 1); break;
    case "cuatrimestre": start = new Date(now.getFullYear(), now.getMonth() - 3, 1); break;
    case "semestre":     start = new Date(now.getFullYear(), now.getMonth() - 5, 1); break;
    case "año":          start = new Date(now.getFullYear(), 0, 1); break;
  }
  return { start, end };
}

const PIPELINE_PROB: Record<string, number> = {
  "Nuevo": 0.05, "Contactado": 0.10, "Calificado": 0.20,
  "Visita agendada": 0.35, "Visita realizada": 0.50,
  "Oferta": 0.65, "Negociación": 0.80, "Cerrado ganado": 1,
};

const STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  parcial: "bg-blue-50 text-blue-700",
  cobrado: "bg-emerald-50 text-emerald-700",
  cancelado: "bg-red-50 text-red-600",
};

function KPICard({ label, value, sub, color = "text-ink" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-ink-line shadow-card p-5">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className={`text-2xl font-semibold mt-2 tracking-tight ${color}`}>{value}</div>
      {sub && <div className="text-xs text-ink-muted mt-1">{sub}</div>}
    </div>
  );
}

function HBar({ label, value, max, color = "#5E4B8E" }: { label: string; value: number; max: number; color?: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-ink">{label}</span>
        <span className="text-ink-muted font-medium">{fmtMXN(value)}</span>
      </div>
      <div className="h-2 bg-ink-ghost rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function FinanzasPage() {
  const supabase = createClient();
  const [tab, setTab] = useState("pnl");
  const [period, setPeriod] = useState<Period>("mes");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDealForm, setShowDealForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [refresh, setRefresh] = useState(0);
  const [historialData, setHistorialData] = useState<any[]>([]);
  const [editingMetas, setEditingMetas] = useState(false);
  const [metas, setMetas] = useState({ ingresos: 0, utilidad: 0, margen: 0, gastos: 0 });
  const [metasMensuales, setMetasMensuales] = useState({ ingresos: 0, utilidad: 0, margen: 0, gastos: 0 });
  const [savingMetas, setSavingMetas] = useState(false);

  // Obtener los meses que cubre el período actual
  const monthsInPeriod = useMemo(() => {
    const { start } = getPeriodRange(period);
    const months: string[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const now = new Date();
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor <= endMonth) {
      months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }, [period]);

  const numMonths = monthsInPeriod.length;
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  // Cargar metas de la DB cuando cambia el período
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("financial_goals")
        .select("*")
        .in("month", monthsInPeriod)
        .order("month", { ascending: false });

      if (!data || data.length === 0) {
        // Sin metas — buscar la más reciente como referencia
        const { data: latest } = await supabase
          .from("financial_goals")
          .select("*")
          .order("month", { ascending: false })
          .limit(1);
        const ref = latest?.[0];
        const monthly = ref
          ? { ingresos: Number(ref.ingresos), utilidad: Number(ref.utilidad), margen: Number(ref.margen), gastos: Number(ref.gastos) }
          : { ingresos: 0, utilidad: 0, margen: 0, gastos: 0 };
        setMetasMensuales(monthly);
        setMetas({ ingresos: monthly.ingresos * numMonths, utilidad: monthly.utilidad * numMonths, margen: monthly.margen, gastos: monthly.gastos * numMonths });
        return;
      }

      // Sumar los meses del período
      const sum = data.reduce((acc, row) => ({
        ingresos: acc.ingresos + Number(row.ingresos),
        utilidad: acc.utilidad + Number(row.utilidad),
        margen:   acc.margen   + Number(row.margen),
        gastos:   acc.gastos   + Number(row.gastos),
      }), { ingresos: 0, utilidad: 0, margen: 0, gastos: 0 });

      // Meta mensual = promedio de los meses con datos
      const avgMonths = data.length;
      setMetasMensuales({
        ingresos: sum.ingresos / avgMonths,
        utilidad: sum.utilidad / avgMonths,
        margen:   sum.margen   / avgMonths,
        gastos:   sum.gastos   / avgMonths,
      });

      // Si el período tiene más meses que los registrados, extrapolar
      const factor = numMonths / avgMonths;
      setMetas({
        ingresos: sum.ingresos * factor,
        utilidad: sum.utilidad * factor,
        margen:   sum.margen / avgMonths, // margen es % no se suma
        gastos:   sum.gastos * factor,
      });
    };
    load();
  }, [monthsInPeriod, numMonths]);

  // Guardar metas — siempre guarda por mes, distribuye uniformemente en el período
  const saveMetas = async () => {
    setSavingMetas(true);
    const m = metasMensuales;
    // Upsert para cada mes en el período
    for (const month of monthsInPeriod) {
      await supabase.from("financial_goals").upsert({
        month,
        ingresos: m.ingresos,
        utilidad: m.utilidad,
        margen:   m.margen,
        gastos:   m.gastos,
        updated_at: new Date().toISOString(),
      }, { onConflict: "month" });
    }
    // Actualizar totales del período
    setMetas({
      ingresos: m.ingresos * numMonths,
      utilidad: m.utilidad * numMonths,
      margen:   m.margen,
      gastos:   m.gastos * numMonths,
    });
    setSavingMetas(false);
    setEditingMetas(false);
  };

  const reload = () => setRefresh(r => r + 1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Cargar histórico
      const histRes = await supabase.from("financial_history").select("*").order("year", { ascending: false }).order("month", { ascending: false }).limit(24);
      setHistorialData(histRes.data || []);

      const [d, e, l, a] = await Promise.all([
        supabase.from("deals").select("*, property:properties(title), lead:leads(name), agent:profiles!deals_agent_id_fkey(full_name), agent2:profiles!deals_agent2_id_fkey(full_name)"),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
        supabase.from("leads").select("id, name, status, source, budget_min, budget_max, agent_id, created_at"),
        supabase.from("profiles").select("id, full_name, initials").eq("role", "asesor").eq("active", true),
      ]);
      setDeals(d.data || []);
      setExpenses(e.data || []);
      setLeads(l.data || []);
      setAgents(a.data || []);
      setLoading(false);
    };
    load();
  }, [refresh]);

  const { start, end } = useMemo(() => getPeriodRange(period), [period]);

  const dealsInPeriod = useMemo(() =>
    deals.filter(d => { const dt = new Date(d.closing_date); return dt >= start && dt <= end; }),
    [deals, start, end]
  );

  // ── GASTOS: separar caja vs P&L ────────────────────────────────────────────
  // Flujo de caja: usa el monto real pagado en la fecha del pago
  const expensesCashInPeriod = useMemo(() =>
    expenses.filter(e => { const dt = new Date(e.expense_date); return dt >= start && dt <= end; }),
    [expenses, start, end]
  );

  // P&L: usa gastos amortizados (diferidos se distribuyen entre meses de cobertura)
  const expensesPnL = useMemo(() => {
    const periodStartM = new Date(start.getFullYear(), start.getMonth(), 1);
    const periodEndM   = new Date(end.getFullYear(),   end.getMonth() + 1, 0);

    return expenses.reduce((total: Record<string, number>, e: any) => {
      const cat = e.category || "otro";
      const isDeferred = e.is_deferred && e.amortization_months > 1;

      if (!isDeferred) {
        // Gasto normal: cae en el período si su fecha de pago está dentro
        const payDate = new Date(e.expense_date);
        if (payDate >= start && payDate <= end) {
          total[cat] = (total[cat] || 0) + Number(e.amount);
        }
        return total;
      }

      // Gasto diferido: calcular qué parte de la cobertura cae en el período
      const coverFrom = e.deferred_start_date ? new Date(e.deferred_start_date) : new Date(e.expense_date);
      const coverStart = new Date(coverFrom.getFullYear(), coverFrom.getMonth(), 1);
      const coverEnd   = new Date(coverFrom.getFullYear(), coverFrom.getMonth() + e.amortization_months, 0);

      const overlapStart = new Date(Math.max(coverStart.getTime(), periodStartM.getTime()));
      const overlapEnd   = new Date(Math.min(coverEnd.getTime(),   periodEndM.getTime()));
      if (overlapStart > overlapEnd) return total; // sin solapamiento

      const overlapMonths = (overlapEnd.getFullYear() - overlapStart.getFullYear()) * 12
        + overlapEnd.getMonth() - overlapStart.getMonth() + 1;

      const monthly = Number(e.amount) / e.amortization_months;
      total[cat] = (total[cat] || 0) + (monthly * overlapMonths);
      return total;
    }, {} as Record<string, number>);
  }, [expenses, start, end]);

  // ── P&L ────────────────────────────────────────────────────────────────────
  const ingresoVenta   = dealsInPeriod.filter(d => d.operation_type === "venta").reduce((s: number, d: any) => s + Number(d.gross_commission), 0);
  const ingresoRenta   = dealsInPeriod.filter(d => d.operation_type === "renta").reduce((s: number, d: any) => s + Number(d.gross_commission), 0);
  const ingresoTotal   = ingresoVenta + ingresoRenta;

  const gastoCompartida = dealsInPeriod.reduce((s: number, d: any) => s + Number(d.shared_amount || 0), 0);
  const gastoReferidos  = dealsInPeriod.reduce((s: number, d: any) => s + Number(d.referral_amount || 0), 0);
  const gastoAsesores   = dealsInPeriod.reduce((s: number, d: any) => s + Number(d.agent_commission || 0) + Number(d.agent2_commission || 0), 0);
  const gastoComisiones = gastoCompartida + gastoReferidos + gastoAsesores;
  const gastoNomina     = (expensesPnL["nomina"] || 0);
  const gastoMarketing  = (expensesPnL["marketing_digital"] || 0) + (expensesPnL["portales_inmobiliarios"] || 0);
  const gastoAdmin      = Object.entries(expensesPnL)
    .filter(([cat]) => !["nomina", "marketing_digital", "portales_inmobiliarios", "comisiones_asesores"].includes(cat))
    .reduce((s, [, v]) => s + (v as number), 0);
  const gastoTotal      = gastoComisiones + gastoNomina + gastoMarketing + gastoAdmin;
  const utilidadBruta   = ingresoTotal - gastoComisiones;
  const utilidadOp      = ingresoTotal - gastoTotal;
  const margenNeto      = ingresoTotal > 0 ? utilidadOp / ingresoTotal : 0;

  // ── CxC ────────────────────────────────────────────────────────────────────
  const dealsPendientes = deals.filter(d => d.status !== "cobrado" && d.status !== "cancelado");
  const totalCxC  = dealsPendientes.reduce((s: number, d: any) => s + Number(d.gross_commission) - Number(d.amount_collected || 0), 0);
  const today     = new Date();
  const vencido   = dealsPendientes
    .filter(d => d.expected_collection_date && new Date(d.expected_collection_date) < today)
    .reduce((s: number, d: any) => s + Number(d.gross_commission) - Number(d.amount_collected || 0), 0);

  // ── ASESORES ───────────────────────────────────────────────────────────────
  const agentStats = agents.map((a: any) => {
    const myDeals    = dealsInPeriod.filter((d: any) => d.agent_id === a.id || d.agent2_id === a.id);
    const myLeads    = leads.filter((l: any) => l.agent_id === a.id);
    const cerrados   = myLeads.filter((l: any) => l.status === "Cerrado ganado").length;
    const ingresos   = myDeals.reduce((s: number, d: any) => s + Number(d.gross_commission), 0);
    const comisiones = myDeals.reduce((s: number, d: any) => {
      const c1 = d.agent_id  === a.id ? Number(d.agent_commission  || 0) : 0;
      const c2 = d.agent2_id === a.id ? Number(d.agent2_commission || 0) : 0;
      return s + c1 + c2;
    }, 0);
    const conv = myLeads.length > 0 ? ((cerrados / myLeads.length) * 100).toFixed(0) : "0";
    return { ...a, myDeals: myDeals.length, myLeads: myLeads.length, cerrados, ingresos, comisiones, conv, netEmpresa: ingresos - comisiones };
  }).sort((a: any, b: any) => b.ingresos - a.ingresos);

  // ── PIPELINE ───────────────────────────────────────────────────────────────
  const pipelineStages = Object.keys(PIPELINE_PROB).filter(s => s !== "Cerrado ganado").map(estado => {
    const count    = leads.filter((l: any) => l.status === estado).length;
    const valorPot = leads.filter((l: any) => l.status === estado).reduce((s: number, l: any) => s + Number(l.budget_max || l.budget_min || 0), 0);
    const comPot   = valorPot * 0.04;
    const ponderado = comPot * PIPELINE_PROB[estado];
    return { estado, count, valorPot, comPot, ponderado, prob: PIPELINE_PROB[estado] };
  });
  const totalPonderado = pipelineStages.reduce((s, p) => s + p.ponderado, 0);

  // ── MARKETING ROI ──────────────────────────────────────────────────────────
  const bySource = Object.entries(
    leads.reduce((acc: any, l: any) => {
      const k = l.source || "Sin origen"; acc[k] = acc[k] || { leads: 0, cerrados: 0 };
      acc[k].leads++;
      if (l.status === "Cerrado ganado") acc[k].cerrados++;
      return acc;
    }, {})
  ).map(([source, data]: any) => ({
    source, leads: data.leads,
    cerrados: data.cerrados,
    conv: data.leads > 0 ? ((data.cerrados / data.leads) * 100).toFixed(1) : "0",
    ingresos: dealsInPeriod.filter(d => {
      const lead = leads.find(l => l.id === d.lead_id);
      return lead?.source === source;
    }).reduce((s: number, d: any) => s + Number(d.gross_commission), 0),
  })).sort((a, b) => b.leads - a.leads);

  // ── FLUJO DE CAJA ──────────────────────────────────────────
  const flujoMeses = useMemo(() => {
    const mesesMap: Record<string, { entradas: number; salidas: number }> = {};
    // Últimos 12 meses
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      mesesMap[key] = { entradas: 0, salidas: 0 };
    }
    // Entradas: comisiones de deals cobrados (amount_collected)
    deals.forEach((d: any) => {
      if (!d.closing_date) return;
      const key = d.closing_date.slice(0, 7);
      if (!mesesMap[key]) return;
      mesesMap[key].entradas += Number(d.amount_collected || d.gross_commission || 0);
    });
    // Salidas: gastos reales pagados en el mes (no amortizados — esto es flujo de caja real)
    expenses.forEach((e: any) => {
      if (!e.expense_date) return;
      const key = e.expense_date.slice(0, 7);
      if (!mesesMap[key]) return;
      mesesMap[key].salidas += Number(e.amount || 0);
    });
    // Salidas: pagos de comisiones a terceros (compartida, referidos, asesores)
    // Se registran en la fecha de cierre del deal como salida de caja
    deals.forEach((d: any) => {
      if (!d.closing_date) return;
      const key = d.closing_date.slice(0, 7);
      if (!mesesMap[key]) return;
      const pagosComisiones =
        Number(d.shared_amount    || 0) +
        Number(d.referral_amount  || 0) +
        Number(d.agent_commission || 0) +
        Number(d.agent2_commission|| 0);
      mesesMap[key].salidas += pagosComisiones;
    });
    // Construir array con flujo neto y acumulado
    let acumulado = 0;
    return Object.entries(mesesMap).map(([mes, v]) => {
      const neto = v.entradas - v.salidas;
      acumulado += neto;
      const [anio, m] = mes.split("-");
      const label = new Date(Number(anio), Number(m) - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
      return { mes, label, entradas: v.entradas, salidas: v.salidas, neto, acumulado };
    });
  }, [deals, expenses]);

  const maxFlujo = Math.max(...flujoMeses.map(m => Math.max(m.entradas, m.salidas)), 1);

  const TABS = [
    { id: "pnl",       label: "P&L" },
    { id: "flujo",     label: "Flujo de Caja" },
    { id: "cxc",       label: "Cuentas por cobrar" },
    { id: "comisiones",label: "Comisiones" },
    { id: "asesores",  label: "Asesores" },
    { id: "pipeline",  label: "Pipeline" },
    { id: "marketing", label: "Marketing ROI" },
    { id: "gastos",    label: "Gastos" },
  ];

  if (loading) return (
    <div className="p-10 flex items-center justify-center h-64">
      <div className="text-ink-muted text-sm">Cargando datos financieros...</div>
    </div>
  );

  return (
    <div className="p-10 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Finanzas</h1>
          <p className="text-sm text-ink-muted mt-0.5">Módulo financiero BS Mérida</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de período */}
          <div className="flex gap-1 bg-ink-ghost p-1 rounded-xl">
            {PERIODOS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${period === p.value ? "bg-white text-ink shadow-card" : "text-ink-muted hover:text-ink"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <ReportExporterPro data={{
            period: PERIODOS.find(p => p.value === period)?.label || period,
            pnl: { ingresoVenta, ingresoRenta, ingresoTotal, gastoComisiones, gastoNomina, gastoMarketing, gastoAdmin, gastoTotal, utilidadBruta, utilidadOp, margenNeto },
            deals: dealsInPeriod, expenses: expensesCashInPeriod, agentStats, bySource,
            pipelineData: pipelineStages, totalLeads: leads.length, history: historialData,
          }} />
          <FinanzasAI data={{
            period: PERIODOS.find(p => p.value === period)?.label || period,
            pnl: { ingresoVenta, ingresoRenta, ingresoTotal, gastoComisiones, gastoNomina, gastoMarketing, gastoAdmin, gastoTotal, utilidadBruta, utilidadOp, margenNeto },
            deals: dealsInPeriod, expenses: expensesCashInPeriod, agentStats, bySource,
            pipelineData: pipelineStages, totalLeads: leads.length,
          }} />
          <a href="/admin/finanzas/historicos"
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-ink-line text-ink rounded-full text-sm hover:border-ink-soft">
            📅 Históricos
          </a>
          <button onClick={() => setShowExpenseForm(true)}
            className="px-4 py-2 bg-white border border-ink-line text-ink rounded-full text-sm hover:border-ink-soft">
            + Gasto
          </button>
          <button onClick={() => setShowDealForm(true)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-full text-sm font-medium">
            + Operación
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ink-ghost p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-white text-ink shadow-card" : "text-ink-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── P&L ── */}
      {tab === "pnl" && (
        <div className="space-y-6">
          {/* Semáforo de metas */}
          <div className="bg-white rounded-2xl border border-ink-line shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-ink">Semáforo de metas</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {numMonths === 1
                    ? `Mes actual · ${new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" })}`
                    : `${numMonths} meses · las metas se definen mensualmente y se suman`}
                </p>
              </div>
              <button
                onClick={() => editingMetas ? saveMetas() : setEditingMetas(true)}
                disabled={savingMetas}
                className="text-xs text-brand-600 hover:underline px-3 py-1.5 border border-brand-200 rounded-full disabled:opacity-50">
                {savingMetas ? "Guardando..." : editingMetas ? "✓ Guardar metas" : "✏️ Editar metas"}
              </button>
            </div>

            {editingMetas && (
              <div className="mb-4 bg-brand-50 border border-brand-100 rounded-xl px-4 py-2.5 text-xs text-brand-700">
                {numMonths === 1
                  ? "Define la meta para este mes. Se guardará en la base de datos."
                  : `Defines la meta mensual. Se guardará igual en los ${numMonths} meses del período y el total será ×${numMonths}.`}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {([
                { key: "ingresos" as const, label: "Ingresos", real: ingresoTotal, fmt: fmtMXN, invertido: false },
                { key: "utilidad" as const, label: "Utilidad operativa", real: utilidadOp, fmt: fmtMXN, invertido: false },
                { key: "margen"   as const, label: "Margen neto", real: margenNeto * 100, fmt: (n: number) => `${n.toFixed(1)}%`, invertido: false },
                { key: "gastos"   as const, label: "Gastos máx.", real: gastoTotal, fmt: fmtMXN, invertido: true },
              ] as const).map(({ key, label, real, fmt, invertido }) => {
                const meta = metas[key];
                const pct = meta > 0 ? (real / meta) * 100 : null;
                const ok   = pct !== null && (invertido ? pct <= 100 : pct >= 90);
                const warn = pct !== null && (invertido ? pct > 100 && pct <= 115 : pct >= 70 && pct < 90);
                const bad  = pct !== null && (invertido ? pct > 115 : pct < 70);
                const semaforo = ok ? "🟢" : warn ? "🟡" : bad ? "🔴" : "⚪";
                return (
                  <div key={key} className={`rounded-xl border p-4 ${ok ? "border-emerald-200 bg-emerald-50" : warn ? "border-amber-200 bg-amber-50" : bad ? "border-red-200 bg-red-50" : "border-ink-line bg-white"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ink-muted">{label}</span>
                      <span className="text-base">{semaforo}</span>
                    </div>
                    <div className={`text-xl font-semibold tracking-tight ${ok ? "text-emerald-700" : warn ? "text-amber-700" : bad ? "text-red-600" : "text-ink"}`}>
                      {fmt(real)}
                    </div>
                    {editingMetas ? (
                      <div className="mt-2">
                        <p className="text-[10px] text-ink-muted mb-1">Meta {numMonths > 1 ? "mensual" : "del mes"}</p>
                        <input
                          type="number" min="0"
                          placeholder="Ej. 150000"
                          value={metasMensuales[key] || ""}
                          onChange={e => setMetasMensuales(m => ({ ...m, [key]: Number(e.target.value) }))}
                          className="w-full text-xs border border-ink-line rounded-lg px-2 py-1.5 text-ink focus:outline-none focus:border-brand-400"
                        />
                        {numMonths > 1 && metasMensuales[key] > 0 && key !== "margen" && (
                          <p className="text-[10px] text-brand-600 mt-1">Total período: {fmtMXN(metasMensuales[key] * numMonths)}</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2">
                        {meta > 0 ? (
                          <>
                            <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${ok ? "bg-emerald-500" : warn ? "bg-amber-400" : "bg-red-400"}`}
                                style={{ width: `${Math.min(pct || 0, 100)}%` }} />
                            </div>
                            <p className="text-[10px] text-ink-muted mt-1">
                              {pct?.toFixed(0)}% de {fmt(meta)}
                              {numMonths > 1 && key !== "margen" && <span className="ml-1">({fmtMXN(metasMensuales[key])}/mes)</span>}
                            </p>
                          </>
                        ) : (
                          <p className="text-[10px] text-ink-muted">Sin meta — clic en Editar</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Estado de resultados */}
            <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
              <h3 className="font-semibold text-ink mb-5">Estado de resultados</h3>
              <div className="space-y-3">
                {[
                  { label: "Comisiones de venta",                     value: ingresoVenta,     type: "ingreso" },
                  { label: "Comisiones de renta",                     value: ingresoRenta,     type: "ingreso" },
                  { label: "Ingresos totales",                        value: ingresoTotal,     type: "total" },
                  ...(gastoCompartida > 0 ? [{ label: "— Comisión compartida (otra inmob.)", value: -gastoCompartida, type: "gasto" }] : []),
                  ...(gastoReferidos  > 0 ? [{ label: "— Comisión referidos externos",       value: -gastoReferidos,  type: "gasto" }] : []),
                  ...(gastoAsesores   > 0 ? [{ label: "— Comisión asesores internos",         value: -gastoAsesores,   type: "gasto" }] : []),
                  { label: "Utilidad bruta (neto comisiones)",        value: utilidadBruta,    type: "subtotal" },
                  { label: "— Nómina", value: -gastoNomina, type: "gasto" },
                  { label: "— Marketing", value: -gastoMarketing, type: "gasto" },
                  { label: "— Gastos administrativos", value: -gastoAdmin, type: "gasto" },
                  { label: "Utilidad operativa (EBIT)", value: utilidadOp, type: "total" },
                ].map((row, i) => (
                  <div key={i} className={`flex justify-between text-sm py-1.5 ${
                    row.type === "total" ? "font-semibold border-t border-ink-line pt-3 mt-1" :
                    row.type === "subtotal" ? "font-medium border-t border-dashed border-ink-line pt-2" : ""
                  }`}>
                    <span className={row.type === "gasto" ? "text-ink-muted pl-4" : "text-ink"}>{row.label}</span>
                    <span className={row.value >= 0 ? "text-emerald-600" : "text-red-500"}>{fmtMXN(Math.abs(row.value))}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Desglose visual */}
            <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
              <h3 className="font-semibold text-ink mb-5">Estructura de ingresos y gastos</h3>
              <div className="space-y-4">
                {ingresoTotal > 0 && (
                  <>
                    <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Ingresos</div>
                    {ingresoVenta > 0 && <HBar label="Comisiones venta" value={ingresoVenta} max={ingresoTotal} color="#10B981" />}
                    {ingresoRenta > 0 && <HBar label="Comisiones renta" value={ingresoRenta} max={ingresoTotal} color="#34D399" />}
                    <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mt-4">Gastos</div>
                    {gastoCompartida > 0 && <HBar label="Compartida (otra inmob.)" value={gastoCompartida} max={ingresoTotal} color="#F97316" />}
                    {gastoReferidos > 0 && <HBar label="Referidos externos" value={gastoReferidos} max={ingresoTotal} color="#FB923C" />}
                    {gastoAsesores > 0 && <HBar label="Asesores internos" value={gastoAsesores} max={ingresoTotal} color="#EF4444" />}
                    {gastoNomina > 0 && <HBar label="Nómina" value={gastoNomina} max={ingresoTotal} color="#F97316" />}
                    {gastoMarketing > 0 && <HBar label="Marketing" value={gastoMarketing} max={ingresoTotal} color="#F59E0B" />}
                    {gastoAdmin > 0 && <HBar label="Administrativo" value={gastoAdmin} max={ingresoTotal} color="#6B7280" />}
                  </>
                )}
                {ingresoTotal === 0 && (
                  <div className="text-sm text-ink-muted text-center py-8">Sin operaciones en este período.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FLUJO DE CAJA ── */}
      {tab === "flujo" && (
        <div className="space-y-6">
          {/* KPIs resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard label="Entradas acumuladas (12m)" value={fmtMXN(flujoMeses.reduce((s, m) => s + m.entradas, 0))} color="text-emerald-600" />
            <KPICard label="Salidas acumuladas (12m)" value={fmtMXN(flujoMeses.reduce((s, m) => s + m.salidas, 0))} color="text-red-500" />
            <KPICard label="Flujo neto (12m)" value={fmtMXN(flujoMeses.reduce((s, m) => s + m.neto, 0))} color={flujoMeses.reduce((s, m) => s + m.neto, 0) >= 0 ? "text-emerald-600" : "text-red-500"} />
            <KPICard label="Saldo acumulado" value={fmtMXN(flujoMeses[flujoMeses.length - 1]?.acumulado || 0)} color="text-brand-600" />
          </div>

          {/* Gráfica de barras entradas vs salidas */}
          <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-ink">Entradas vs Salidas — últimos 12 meses</h3>
              <div className="flex items-center gap-4 text-xs text-ink-muted">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block"></span>Entradas</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block"></span>Salidas</span>
              </div>
            </div>
            <div className="flex items-end gap-1" style={{ height: 160 }}>
              {flujoMeses.map(m => (
                <div key={m.mes} className="flex-1 flex items-end gap-[2px] group relative">
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 text-center">
                    {m.label}<br/>E: {fmtMXN(m.entradas)}<br/>S: {fmtMXN(m.salidas)}
                  </div>
                  <div className="flex-1 rounded-t-sm bg-emerald-400 hover:bg-emerald-500 transition"
                    style={{ height: m.entradas > 0 ? `${Math.max((m.entradas / maxFlujo) * 140, 3)}px` : "2px" }} />
                  <div className="flex-1 rounded-t-sm bg-red-400 hover:bg-red-500 transition"
                    style={{ height: m.salidas > 0 ? `${Math.max((m.salidas / maxFlujo) * 140, 3)}px` : "2px" }} />
                </div>
              ))}
            </div>
            <div className="flex gap-1 mt-2">
              {flujoMeses.map(m => (
                <div key={m.mes} className="flex-1 text-center">
                  <span className="text-[9px] text-ink-muted block">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla detalle mensual */}
          <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
            <div className="p-5 border-b border-ink-line">
              <h3 className="font-semibold text-ink">Flujo mensual detallado</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ink-ghost/40 border-b border-ink-line">
                  <tr>{["Mes", "Entradas", "Salidas", "Flujo neto", "Flujo acumulado"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {[...flujoMeses].reverse().map(m => (
                    <tr key={m.mes} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30">
                      <td className="px-5 py-3 text-sm font-medium text-ink capitalize">{m.label}</td>
                      <td className="px-5 py-3 text-sm text-emerald-600 font-medium">{fmtMXN(m.entradas)}</td>
                      <td className="px-5 py-3 text-sm text-red-500">{fmtMXN(m.salidas)}</td>
                      <td className={`px-5 py-3 text-sm font-semibold ${m.neto >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {m.neto >= 0 ? "+" : ""}{fmtMXN(m.neto)}
                      </td>
                      <td className={`px-5 py-3 text-sm font-semibold ${m.acumulado >= 0 ? "text-brand-600" : "text-red-500"}`}>
                        {fmtMXN(m.acumulado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 text-sm text-blue-800">
            💡 Las <strong>entradas</strong> se calculan con los montos cobrados de tus operaciones. Las <strong>salidas</strong> con los gastos registrados. Registra todo en <strong>Comisiones</strong> y <strong>Gastos</strong> para mantener este flujo actualizado.
          </div>
        </div>
      )}

      {/* ── CUENTAS POR COBRAR ── */}
      {tab === "cxc" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <KPICard label="Total por cobrar" value={fmtMXN(totalCxC)} color="text-ink" />
            <KPICard label="Vencido" value={fmtMXN(vencido)} color="text-red-500" sub="Con fecha esperada pasada" />
            <KPICard label="Por vencer" value={fmtMXN(totalCxC - vencido)} color="text-amber-600" />
          </div>

          <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
            <div className="p-5 border-b border-ink-line flex items-center justify-between">
              <h3 className="font-semibold text-ink">Operaciones pendientes de cobro</h3>
              <span className="text-xs text-ink-muted">{dealsPendientes.length} operaciones</span>
            </div>
            {dealsPendientes.length === 0 ? (
              <div className="p-12 text-center text-sm text-ink-muted">🎉 Todo cobrado. Sin cuentas pendientes.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-ink-ghost/40 border-b border-ink-line">
                    <tr>{["Propiedad", "Cliente", "Comisión", "Pendiente", "Fecha esperada", "Días vencidos", "Estado"].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {dealsPendientes.map((d: any) => {
                      const pendiente = Number(d.gross_commission) - Number(d.amount_collected || 0);
                      const diasVencidos = d.expected_collection_date
                        ? Math.max(0, Math.floor((today.getTime() - new Date(d.expected_collection_date).getTime()) / (1000 * 60 * 60 * 24)))
                        : 0;
                      return (
                        <tr key={d.id} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30">
                          <td className="px-4 py-3 text-sm text-ink truncate max-w-[160px]">{d.property?.title || "—"}</td>
                          <td className="px-4 py-3 text-sm text-ink-muted">{d.lead?.name || "—"}</td>
                          <td className="px-4 py-3 text-sm font-medium text-ink">{fmtMXN(Number(d.gross_commission))}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-amber-600">{fmtMXN(pendiente)}</td>
                          <td className="px-4 py-3 text-sm text-ink-muted">
                            {d.expected_collection_date ? new Date(d.expected_collection_date).toLocaleDateString("es-MX") : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {diasVencidos > 0 ? (
                              <span className="text-xs text-red-600 font-medium">{diasVencidos}d vencido</span>
                            ) : <span className="text-xs text-ink-muted">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[d.status] || ""}`}>{d.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── COMISIONES ── */}
      {tab === "comisiones" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard label="Operaciones en período" value={String(dealsInPeriod.length)} />
            <KPICard label="Comisión bruta total" value={fmtMXN(ingresoTotal)} color="text-emerald-600" />
            <KPICard label="Comisión neta empresa" value={fmtMXN(ingresoTotal - gastoComisiones)} color="text-brand-600" />
            <KPICard label="Ticket promedio" value={dealsInPeriod.length > 0 ? fmtMXN(dealsInPeriod.reduce((s: number, d: any) => s + Number(d.transaction_value), 0) / dealsInPeriod.length) : "—"} />
          </div>

          <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
            <div className="p-5 border-b border-ink-line flex items-center justify-between">
              <h3 className="font-semibold text-ink">Detalle de operaciones</h3>
              <button onClick={() => setShowDealForm(true)}
                className="text-xs text-brand-600 hover:underline">+ Nueva operación</button>
            </div>
            {dealsInPeriod.length === 0 ? (
              <div className="p-12 text-center text-sm text-ink-muted">Sin operaciones en este período.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-ink-ghost/40 border-b border-ink-line">
                    <tr>{["Propiedad", "Cliente", "Tipo", "Valor operación", "Com. bruta", "Compartida / Ref.", "Asesores", "Neto empresa", "Cierre", "Estado", ""].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-3 py-3">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {dealsInPeriod.map((d: any) => (
                      <tr key={d.id} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30">
                        <td className="px-3 py-3 text-sm text-ink truncate max-w-[130px]">{d.property?.title || "—"}</td>
                        <td className="px-3 py-3 text-sm text-ink-muted">{d.lead?.name || "—"}</td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${d.operation_type === "venta" ? "bg-brand-50 text-brand-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {d.operation_type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm font-medium text-ink">{fmtMXN(Number(d.transaction_value))}</td>
                        <td className="px-3 py-3 text-sm text-ink">{fmtMXN(Number(d.gross_commission))}</td>
                        <td className="px-3 py-3 text-sm text-orange-600">
                          {(Number(d.shared_amount || 0) + Number(d.referral_amount || 0)) > 0
                            ? `− ${fmtMXN(Number(d.shared_amount || 0) + Number(d.referral_amount || 0))}`
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-sm text-brand-600">
                          {(Number(d.agent_commission || 0) + Number(d.agent2_commission || 0)) > 0
                            ? `− ${fmtMXN(Number(d.agent_commission || 0) + Number(d.agent2_commission || 0))}`
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-emerald-600">{fmtMXN(Number(d.net_commission))}</td>
                        <td className="px-3 py-3 text-xs text-ink-muted">{new Date(d.closing_date).toLocaleDateString("es-MX")}</td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[d.status] || ""}`}>{d.status}</span>
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => { setEditingDeal(d); setShowDealForm(true); }}
                            className="text-xs text-brand-600 hover:text-brand-700 border border-brand-200 rounded-full px-2 py-0.5 hover:bg-brand-50">
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ASESORES ── */}
      {tab === "asesores" && (
        <div className="space-y-6">
          {agentStats.length === 0 ? (
            <div className="bg-white rounded-2xl border border-ink-line p-12 text-center text-sm text-ink-muted">Sin asesores activos.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard label="Top asesor" value={agentStats[0]?.full_name || "—"} sub={`${agentStats[0]?.myDeals || 0} operaciones`} />
                <KPICard label="Ingreso promedio por asesor" value={fmtMXN(agentStats.length > 0 ? agentStats.reduce((s: number, a: any) => s + a.ingresos, 0) / agentStats.length : 0)} />
                <KPICard label="Conversión promedio" value={`${agentStats.length > 0 ? (agentStats.reduce((s: number, a: any) => s + Number(a.conv), 0) / agentStats.length).toFixed(0) : 0}%`} />
              </div>
              <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-ink-ghost/40 border-b border-ink-line">
                    <tr>{["Asesor", "Leads", "Cierres", "Valor vendido", "Ingresos generados", "Comisión", "Neto empresa", "Conversión"].map(h => (
                      <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {agentStats.map((a: any, i: number) => (
                      <tr key={a.id} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {i === 0 && <span className="text-amber-500">🥇</span>}
                            {i === 1 && <span>🥈</span>}
                            {i === 2 && <span>🥉</span>}
                            <span className="font-medium text-sm text-ink">{a.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-ink-muted">{a.myLeads}</td>
                        <td className="px-4 py-3 text-sm text-ink">{a.cerrados}</td>
                        <td className="px-4 py-3 text-sm text-ink">{fmtMXN(dealsInPeriod.filter((d: any) => d.agent_id === a.id || d.agent2_id === a.id).reduce((s: number, d: any) => s + Number(d.transaction_value), 0))}</td>
                        <td className="px-4 py-3 text-sm font-medium text-emerald-600">{fmtMXN(a.ingresos)}</td>
                        <td className="px-4 py-3 text-sm text-orange-600">{fmtMXN(a.comisiones)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-brand-600">{fmtMXN(a.netEmpresa)}</td>
                        <td className="px-4 py-3 text-sm text-ink">{a.conv}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PIPELINE ── */}
      {tab === "pipeline" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <KPICard label="Leads activos en pipeline" value={String(leads.filter(l => !["Cerrado ganado", "Cerrado perdido"].includes(l.status)).length)} />
            <KPICard label="Ingreso esperado ponderado" value={fmtMXN(totalPonderado)} sub="Basado en probabilidad por etapa" color="text-brand-600" />
            <KPICard label="Potencial total si todo cierra" value={fmtMXN(pipelineStages.reduce((s, p) => s + p.comPot, 0))} />
          </div>

          <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-ink-ghost/40 border-b border-ink-line">
                <tr>{["Etapa", "Leads", "Prob.", "Valor potencial", "Com. potencial", "Com. ponderada"].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-4 py-3">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {pipelineStages.map(p => (
                  <tr key={p.estado} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30">
                    <td className="px-4 py-3 font-medium text-sm text-ink">{p.estado}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{p.count}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{(p.prob * 100).toFixed(0)}%</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">{fmtMXN(p.valorPot)}</td>
                    <td className="px-4 py-3 text-sm text-ink">{fmtMXN(p.comPot)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600">{fmtMXN(p.ponderado)}</td>
                  </tr>
                ))}
                <tr className="bg-brand-50 font-semibold">
                  <td className="px-4 py-3 text-sm text-brand-700">TOTAL</td>
                  <td className="px-4 py-3 text-sm text-brand-700">{pipelineStages.reduce((s, p) => s + p.count, 0)}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-sm text-brand-700">{fmtMXN(pipelineStages.reduce((s, p) => s + p.valorPot, 0))}</td>
                  <td className="px-4 py-3 text-sm text-brand-700">{fmtMXN(pipelineStages.reduce((s, p) => s + p.comPot, 0))}</td>
                  <td className="px-4 py-3 text-sm text-brand-700">{fmtMXN(totalPonderado)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MARKETING ROI ── */}
      {tab === "marketing" && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-sm text-amber-800">
            💡 Para calcular CAC y ROAS, ve a <strong>Gastos</strong> y registra tus inversiones en marketing digital y portales.
          </div>
          <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
            <div className="p-5 border-b border-ink-line">
              <h3 className="font-semibold text-ink">Rendimiento por canal de origen</h3>
            </div>
            {bySource.length === 0 ? (
              <div className="p-12 text-center text-sm text-ink-muted">Sin datos de origen.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-ink-ghost/40 border-b border-ink-line">
                  <tr>{["Canal", "Leads", "Cerrados", "Conversión", "Ingresos generados"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {bySource.map((s: any) => (
                    <tr key={s.source} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30">
                      <td className="px-4 py-3 font-medium text-sm text-ink">{s.source}</td>
                      <td className="px-4 py-3 text-sm text-ink-muted">{s.leads}</td>
                      <td className="px-4 py-3 text-sm text-emerald-600">{s.cerrados}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-ink-ghost rounded-full overflow-hidden">
                            <div className="h-full bg-brand-400 rounded-full" style={{ width: `${s.conv}%` }} />
                          </div>
                          <span className="text-xs text-ink">{s.conv}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-ink">{fmtMXN(s.ingresos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── GASTOS ── */}
      {tab === "gastos" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard label="Gasto P&L del período" value={fmtMXN(gastoTotal)} color="text-red-500" sub="Amortizado" />
            <KPICard label="Salidas reales de caja" value={fmtMXN(expensesCashInPeriod.reduce((s: number, e: any) => s + Number(e.amount), 0))} color="text-red-500" sub="Pagos reales" />
            <KPICard label="Marketing + portales" value={fmtMXN(gastoMarketing)} sub="Digital y portales" />
            <KPICard label="Gastos diferidos activos" value={`${expenses.filter(e => e.is_deferred && e.amortization_months > 1).length}`} sub="Con amortización" />
          </div>

          {/* Gastos diferidos activos */}
          {expenses.some(e => e.is_deferred && e.amortization_months > 1) && (
            <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
              <div className="p-5 border-b border-ink-line">
                <h3 className="font-semibold text-ink">Gastos diferidos activos</h3>
                <p className="text-xs text-ink-muted mt-0.5">Pagos únicos que se distribuyen en el P&L mensualmente</p>
              </div>
              <table className="w-full">
                <thead className="bg-ink-ghost/40 border-b border-ink-line">
                  <tr>{["Descripción", "Pago total", "Cobertura", "Impacto mensual", "Estado"].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {expenses.filter(e => e.is_deferred && e.amortization_months > 1).map((e: any) => {
                    const coverStart = new Date(e.deferred_start_date || e.expense_date);
                    const coverEnd   = new Date(coverStart.getFullYear(), coverStart.getMonth() + e.amortization_months, 0);
                    const nowDate    = new Date();
                    const isActive   = nowDate >= coverStart && nowDate <= coverEnd;
                    const pctDone    = Math.min(100, Math.max(0,
                      ((nowDate.getTime() - coverStart.getTime()) / (coverEnd.getTime() - coverStart.getTime())) * 100
                    ));
                    return (
                      <tr key={e.id} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-ink">{e.description}</p>
                          {e.vendor && <p className="text-xs text-ink-muted">{e.vendor}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-ink">{fmtMXN(Number(e.amount))}</td>
                        <td className="px-4 py-3 text-xs text-ink-muted">
                          {e.amortization_months} meses<br/>
                          <span className="text-ink-soft">{coverStart.toLocaleDateString("es-MX", { month:"short", year:"2-digit" })} – {coverEnd.toLocaleDateString("es-MX", { month:"short", year:"2-digit" })}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-brand-600">{fmtMXN(Number(e.amount) / e.amortization_months)}<span className="text-xs text-ink-muted font-normal">/mes</span></p>
                          <div className="h-1.5 bg-ink-ghost rounded-full mt-1 w-24">
                            <div className="h-1.5 bg-brand-400 rounded-full" style={{ width: `${pctDone}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-ink-ghost text-ink-muted"}`}>
                            {isActive ? "Activo" : coverEnd < nowDate ? "Vencido" : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Todos los gastos del período */}
          <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
            <div className="p-5 border-b border-ink-line flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-ink">Gastos del período</h3>
                <p className="text-xs text-ink-muted mt-0.5">Pagos reales realizados en el período seleccionado</p>
              </div>
              <div className="flex items-center gap-2">
                <a href="/admin/finanzas/historicos"
                  className="text-xs text-ink-muted hover:text-ink border border-ink-line rounded-full px-3 py-1.5">
                  📅 Históricos
                </a>
                <button onClick={() => setShowExpenseForm(true)}
                  className="text-xs text-brand-600 border border-brand-200 hover:bg-brand-50 rounded-full px-3 py-1.5">
                  + Registrar gasto
                </button>
              </div>
            </div>
            {expensesCashInPeriod.length === 0 ? (
              <div className="p-12 text-center text-sm text-ink-muted">Sin gastos registrados en este período.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-ink-ghost/40 border-b border-ink-line">
                  <tr>{["Categoría", "Descripción", "Proveedor", "Monto real", "Impacto mensual P&L", "Fecha", "Tipo", ""].map(h => (
                    <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {expensesCashInPeriod.map((e: any) => {
                    const monthly = e.is_deferred && e.amortization_months > 1
                      ? Number(e.amount) / e.amortization_months
                      : Number(e.amount);
                    return (
                      <tr key={e.id} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30">
                        <td className="px-4 py-3">
                          <span className="text-xs bg-ink-ghost text-ink-muted px-2 py-0.5 rounded-full capitalize">
                            {e.category.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-ink">{e.description}</td>
                        <td className="px-4 py-3 text-xs text-ink-muted">{e.vendor || "—"}</td>
                        <td className="px-4 py-3 text-sm font-medium text-red-500">{fmtMXN(Number(e.amount))}</td>
                        <td className="px-4 py-3 text-sm text-ink-muted">
                          {e.is_deferred && e.amortization_months > 1
                            ? <span className="text-brand-600">{fmtMXN(monthly)}/mes × {e.amortization_months}</span>
                            : <span className="text-ink-soft">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-muted">{new Date(e.expense_date).toLocaleDateString("es-MX")}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            {e.is_deferred && <span className="text-xs text-brand-600">Diferido</span>}
                            {e.recurring   && <span className="text-xs text-emerald-600">Recurrente</span>}
                            {e.invoiced    && <span className="text-xs text-ink-muted">Facturado</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => { setEditingExpense(e); setShowExpenseForm(true); }}
                            className="text-xs text-brand-600 hover:text-brand-700 border border-brand-200 rounded-full px-2 py-0.5 hover:bg-brand-50">
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showDealForm && (
        <DealForm
          deal={editingDeal || undefined}
          onClose={() => { setShowDealForm(false); setEditingDeal(null); }}
          onSaved={reload}
        />
      )}
      {showExpenseForm && (
        <ExpenseForm
          expense={editingExpense || undefined}
          onClose={() => { setShowExpenseForm(false); setEditingExpense(null); }}
          onSaved={reload}
        />
      )}
    </div>
  );
}
