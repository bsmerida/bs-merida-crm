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
