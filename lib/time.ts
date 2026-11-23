// lib/time.ts
// Fechas en hora de Mérida. Los servidores de Vercel corren en UTC, así que
// new Date().getHours() NO es la hora local del negocio.
import { MERIDA_TZ } from "@/lib/google-calendar";

// Fecha (YYYY-MM-DD) y hora (0-23) en Mérida para un instante dado.
export function meridaParts(date: Date): { ymd: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MERIDA_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)!.value;
  return { ymd: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Instante de una visita guardada como fecha + hora locales de Mérida (UTC-6, sin horario de verano).
export function meridaSlotToDate(slot: { date: string; time: string }): Date {
  return new Date(`${slot.date}T${slot.time}:00-06:00`);
}

// El cron corre cada hora (con retrasos de GitHub Actions de hasta ~15 min).
// Una ventana de 60 min sin traslape, [ahora+30m, ahora+90m), hace que cada
// visita se avise exactamente una vez aunque la corrida llegue tarde.
export function isVisitInNextHourWindow(visit: Date, now: Date): boolean {
  const t = visit.getTime() - now.getTime();
  return t >= 30 * 60_000 && t < 90 * 60_000;
}

// Fecha corta (13/11/2026) de un instante, en hora de Mérida. En el servidor
// toLocaleDateString usa UTC: después de las 6 pm daría el día siguiente.
export function fechaMerida(instante: string | Date): string {
  return new Date(instante).toLocaleDateString("es-MX", { timeZone: MERIDA_TZ });
}

// Fecha larga (13 de noviembre de 2026) de un YYYY-MM-DD sin componente de
// hora (ej. leads.lead_date). No usa new Date(ymd) directo porque lo toma
// como medianoche UTC y en Mérida cae el día anterior — mediodía UTC es
// seguro para cualquier huso horario dentro de ±12h, como ya hace addDaysYmd.
export function fechaYmdLarga(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

// Igual que fechaYmdLarga pero corta (13 nov.), para tablas.
export function fechaYmdCorta(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
