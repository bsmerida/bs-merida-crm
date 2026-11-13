import { describe, expect, it } from "vitest";
import {
  calcularComision, cobradoDeal, cuentaEnResultados, enRango, fechaCorta, fechaLocal, gastoEnPeriodo, hoyLocal, netoDeal,
} from "@/lib/finanzas";

// Noviembre 2026 en hora local (Mérida)
const NOV_INI = new Date(2026, 10, 1);
const NOV_FIN = new Date(2026, 11, 0, 23, 59, 59);

describe("fechas de la BD", () => {
  it("corre con la hora de Mérida", () => {
    expect(new Date(2026, 10, 1).getTimezoneOffset()).toBe(360);
  });

  it("un gasto del día 1 cae en ese mes, no en el anterior", () => {
    expect(fechaLocal("2026-11-01")?.getDate()).toBe(1);
    expect(enRango("2026-11-01", NOV_INI, NOV_FIN)).toBe(true);
    expect(enRango("2026-10-31", NOV_INI, NOV_FIN)).toBe(false);
    expect(enRango("2026-11-30", NOV_INI, NOV_FIN)).toBe(true);
    expect(enRango("2026-12-01", NOV_INI, NOV_FIN)).toBe(false);
  });

  it("se muestra el mismo día que está guardado", () => {
    expect(fechaCorta("2026-11-01")).toBe("1/11/2026");
    expect(fechaCorta(null)).toBe("—");
  });

  it("'hoy' a las 7 pm en Mérida sigue siendo hoy (en UTC ya sería mañana)", () => {
    expect(hoyLocal(new Date(2026, 10, 13, 19, 0))).toBe("2026-11-13");
    expect(hoyLocal(new Date(2026, 0, 5, 8, 0))).toBe("2026-01-05");
  });

  it("fechas vacías o inválidas no cuentan", () => {
    expect(fechaLocal(null)).toBeNull();
    expect(enRango("", NOV_INI, NOV_FIN)).toBe(false);
  });
});

describe("calcularComision (casos hechos a mano)", () => {
  it("venta directa: 4% de 3,000,000 = 120,000, todo para la empresa", () => {
    const c = calcularComision({ operation_type: "venta", deal_type: "directa", transaction_value: 3_000_000, commission_rate: 0.04 });
    expect(c.gross).toBe(120_000);
    expect(c.net).toBe(120_000);
  });

  it("renta: el ingreso es el honorario, no valor × %", () => {
    const c = calcularComision({ operation_type: "renta", deal_type: "directa", transaction_value: 15_000, commission_rate: 0.04 });
    expect(c.gross).toBe(15_000);
  });

  it("compartida 50%: de 120,000 se van 60,000 a la otra inmobiliaria", () => {
    const c = calcularComision({ operation_type: "venta", deal_type: "compartida", transaction_value: 3_000_000, commission_rate: 0.04, shared_pct: 0.5 });
    expect(c.sharedAmt).toBe(60_000);
    expect(c.net).toBe(60_000);
  });

  it("referido 10%: 12,000 al referidor, 108,000 quedan", () => {
    const c = calcularComision({ operation_type: "venta", deal_type: "referido", transaction_value: 3_000_000, commission_rate: 0.04, referral_pct: 0.1 });
    expect(c.refAmt).toBe(12_000);
    expect(c.net).toBe(108_000);
  });

  it("dos asesores 40% + 30% sobre 120,000: 48,000 + 36,000, quedan 36,000", () => {
    const c = calcularComision({ operation_type: "venta", deal_type: "asesor_compartida", transaction_value: 3_000_000, commission_rate: 0.04, agent_split_pct: 0.4, agent2_split_pct: 0.3 });
    expect(c.agentAmt).toBe(48_000);
    expect(c.agent2Amt).toBe(36_000);
    expect(c.net).toBe(36_000);
  });

  it("un porcentaje que no aplica al tipo de operación se ignora", () => {
    const c = calcularComision({ operation_type: "venta", deal_type: "directa", transaction_value: 1_000_000, commission_rate: 0.05, shared_pct: 0.5, agent_split_pct: 0.4 });
    expect(c.net).toBe(50_000);
  });
});

describe("montos de operaciones guardadas", () => {
  it("el neto resta lo compartido aunque net_commission guardado diga otra cosa", () => {
    // Caso real: operaciones viejas con net_commission = bruto
    expect(netoDeal({ operation_type: "venta", gross_commission: 100_000, shared_amount: 50_000 })).toBe(50_000);
    expect(netoDeal({ operation_type: "renta", transaction_value: 20_000, referral_amount: 2_000, agent_commission: 5_000 })).toBe(13_000);
  });

  it("las canceladas no cuentan", () => {
    expect(cuentaEnResultados({ status: "cancelado" })).toBe(false);
    expect(cuentaEnResultados({ status: "cobrado" })).toBe(true);
    expect(cobradoDeal({ status: "cancelado", gross_commission: 100, amount_collected: 100 })).toBe(0);
  });

  it("flujo de caja: solo entra lo cobrado", () => {
    expect(cobradoDeal({ status: "pendiente", gross_commission: 100_000 })).toBe(0);
    expect(cobradoDeal({ status: "parcial", gross_commission: 100_000, amount_collected: 30_000 })).toBe(30_000);
    expect(cobradoDeal({ status: "cobrado", gross_commission: 100_000 })).toBe(100_000);
  });
});

describe("gastoEnPeriodo", () => {
  it("gasto normal del día 1 cuenta completo en su mes", () => {
    expect(gastoEnPeriodo({ amount: 5_000, expense_date: "2026-11-01" }, NOV_INI, NOV_FIN)).toBe(5_000);
    expect(gastoEnPeriodo({ amount: 5_000, expense_date: "2026-10-31" }, NOV_INI, NOV_FIN)).toBe(0);
  });

  it("diferido de 12,000 en 12 meses desde el 1 de oct: 1,000 en noviembre", () => {
    const e = { amount: 12_000, expense_date: "2026-10-01", is_deferred: true, amortization_months: 12, deferred_start_date: "2026-10-01" };
    expect(gastoEnPeriodo(e, NOV_INI, NOV_FIN)).toBe(1_000);
    // Septiembre está fuera de la cobertura (antes la fecha del día 1 la recorría a septiembre)
    expect(gastoEnPeriodo(e, new Date(2026, 8, 1), new Date(2026, 9, 0, 23, 59, 59))).toBe(0);
  });

  it("diferido de 6 meses visto en un año completo: los 6 meses dentro", () => {
    const e = { amount: 6_000, expense_date: "2026-03-15", is_deferred: true, amortization_months: 6 };
    expect(gastoEnPeriodo(e, new Date(2026, 0, 1), new Date(2026, 11, 31, 23, 59, 59))).toBe(6_000);
  });

  it("diferido que termina antes del período: 0", () => {
    const e = { amount: 3_000, expense_date: "2026-01-10", is_deferred: true, amortization_months: 3 };
    expect(gastoEnPeriodo(e, NOV_INI, NOV_FIN)).toBe(0);
  });
});
