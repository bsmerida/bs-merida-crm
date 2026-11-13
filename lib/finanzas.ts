// lib/finanzas.ts
// Fórmulas de dinero del módulo de Finanzas, como funciones puras para poder probarlas.

// Fecha "YYYY-MM-DD" de la BD como medianoche LOCAL. new Date("2026-11-01") la toma
// como medianoche UTC, que en Mérida (UTC-6) es el 31 de octubre a las 18:00:
// los gastos y cierres del día 1 caían en el mes anterior.
export function fechaLocal(valor: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? "");
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Para mostrar una fecha de la BD (sin recorrerla un día)
export function fechaCorta(valor: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  return fechaLocal(valor)?.toLocaleDateString("es-MX", opts) ?? "—";
}

// Hoy como "YYYY-MM-DD" en la hora del usuario (toISOString da la fecha UTC:
// después de las 6 pm en Mérida ya es "mañana").
export function hoyLocal(ahora = new Date()): string {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}`;
}

export function enRango(valor: string | null | undefined, start: Date, end: Date): boolean {
  const d = fechaLocal(valor);
  return !!d && d >= start && d <= end;
}

export type ComisionInput = {
  operation_type: string;
  deal_type: string;
  transaction_value: number;
  commission_rate: number;
  shared_pct?: number;
  referral_pct?: number;
  agent_split_pct?: number;
  agent2_split_pct?: number;
};

export type Comision = {
  gross: number; sharedPct: number; sharedAmt: number; refPct: number; refAmt: number;
  agentPct: number; agentAmt: number; agent2Pct: number; agent2Amt: number; net: number;
};

// Reparto de una operación: compartida → referido → asesores, cada uno sobre lo que queda.
export function calcularComision(i: ComisionInput): Comision {
  const tv = Number(i.transaction_value) || 0;
  // Rentas: el ingreso es el honorario directo; ventas: valor × % de comisión
  const gross = i.operation_type === "renta" ? tv : tv * (Number(i.commission_rate) || 0);

  const sharedPct = i.deal_type === "compartida" ? Number(i.shared_pct) || 0 : 0;
  const sharedAmt = gross * sharedPct;
  const afterShared = gross - sharedAmt;

  const refPct = i.deal_type === "referido" ? Number(i.referral_pct) || 0 : 0;
  const refAmt = afterShared * refPct;

  const base = afterShared - refAmt;
  const agentPct = ["asesor_solo", "asesor_compartida"].includes(i.deal_type) ? Number(i.agent_split_pct) || 0 : 0;
  const agent2Pct = i.deal_type === "asesor_compartida" ? Number(i.agent2_split_pct) || 0 : 0;
  const agentAmt = base * agentPct;
  const agent2Amt = base * agent2Pct;

  return {
    gross, sharedPct, sharedAmt, refPct, refAmt, agentPct, agentAmt, agent2Pct, agent2Amt,
    net: gross - sharedAmt - refAmt - agentAmt - agent2Amt,
  };
}

type DealMontos = {
  operation_type?: string; status?: string;
  transaction_value?: number | string | null; gross_commission?: number | string | null;
  shared_amount?: number | string | null; referral_amount?: number | string | null;
  agent_commission?: number | string | null; agent2_commission?: number | string | null;
  amount_collected?: number | string | null;
};

const n = (v: unknown) => Number(v || 0);

// Una operación cancelada no es ingreso ni gasto
export const cuentaEnResultados = (d: DealMontos) => d.status !== "cancelado";

export function ingresoDeal(d: DealMontos): number {
  return d.operation_type === "renta" ? n(d.transaction_value || d.gross_commission) : n(d.gross_commission);
}

export function repartosDeal(d: DealMontos): number {
  return n(d.shared_amount) + n(d.referral_amount) + n(d.agent_commission) + n(d.agent2_commission);
}

// Lo que le queda a la empresa, calculado con los montos guardados. No se usa
// net_commission porque hay operaciones viejas donde no se le restó lo compartido.
export const netoDeal = (d: DealMontos) => ingresoDeal(d) - repartosDeal(d);

// Dinero que de verdad entró: lo cobrado, o el total si está marcada como cobrada sin monto.
export function cobradoDeal(d: DealMontos): number {
  if (d.status === "cancelado") return 0;
  if (n(d.amount_collected) > 0) return n(d.amount_collected);
  return d.status === "cobrado" ? n(d.gross_commission) : 0;
}

type Gasto = {
  amount: number | string; expense_date: string; is_deferred?: boolean | null;
  amortization_months?: number | null; deferred_start_date?: string | null;
};

// Parte de un gasto que corresponde al período (los diferidos se reparten por mes de cobertura).
export function gastoEnPeriodo(e: Gasto, start: Date, end: Date): number {
  const meses = Number(e.amortization_months) || 0;
  if (!(e.is_deferred && meses > 1)) {
    return enRango(e.expense_date, start, end) ? n(e.amount) : 0;
  }
  const desde = fechaLocal(e.deferred_start_date) ?? fechaLocal(e.expense_date);
  if (!desde) return 0;
  const inicioMes = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const cubreDesde = inicioMes(desde);
  const cubreHasta = cubreDesde + meses - 1;
  const desdeP = Math.max(cubreDesde, inicioMes(start));
  const hastaP = Math.min(cubreHasta, inicioMes(end));
  if (desdeP > hastaP) return 0;
  return (n(e.amount) / meses) * (hastaP - desdeP + 1);
}
