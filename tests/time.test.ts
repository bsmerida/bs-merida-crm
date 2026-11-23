import { describe, expect, it } from "vitest";
import { addDaysYmd, fechaYmdCorta, fechaYmdLarga, isVisitInNextHourWindow, meridaParts, meridaSlotToDate } from "@/lib/time";

describe("meridaParts", () => {
  it("convierte UTC a hora de Mérida (UTC-6)", () => {
    // 13:05 UTC = 7:05 en Mérida → debe disparar el bloque de las 7am
    expect(meridaParts(new Date("2026-11-10T13:05:00Z"))).toEqual({ ymd: "2026-11-10", hour: 7 });
    // 03:00 UTC del día 11 sigue siendo el día 10 en Mérida
    expect(meridaParts(new Date("2026-11-11T03:00:00Z"))).toEqual({ ymd: "2026-11-10", hour: 21 });
  });
});

describe("addDaysYmd", () => {
  it("cruza fin de mes y de año", () => {
    expect(addDaysYmd("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDaysYmd("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("isVisitInNextHourWindow", () => {
  const visit = meridaSlotToDate({ date: "2026-11-10", time: "11:00" }); // 17:00 UTC

  it("avisa una sola vez aunque el cron corra cada hora con retraso", () => {
    const runs = ["14:12", "15:12", "16:12", "17:12"].map(t => new Date(`2026-11-10T${t}:00Z`));
    const hits = runs.filter(now => isVisitInNextHourWindow(visit, now));
    expect(hits).toHaveLength(1);
  });

  it("no avisa visitas pasadas ni muy lejanas", () => {
    expect(isVisitInNextHourWindow(visit, new Date("2026-11-10T17:30:00Z"))).toBe(false);
    expect(isVisitInNextHourWindow(visit, new Date("2026-11-10T10:00:00Z"))).toBe(false);
  });
});

describe("fechaMerida", () => {
  it("un cliente que llegó a las 7:30 pm en Mérida es de ese día (en UTC ya es el siguiente)", async () => {
    const { fechaMerida } = await import("@/lib/time");
    expect(fechaMerida("2026-11-14T01:30:00Z")).toBe("13/11/2026");
    expect(fechaMerida("2026-11-14T06:30:00Z")).toBe("14/11/2026");
  });
});

describe("fechaYmdLarga / fechaYmdCorta", () => {
  it("no recorren el día (bug real: new Date(ymd) cae al día anterior en Mérida)", () => {
    expect(fechaYmdLarga("2026-03-01")).toBe("1 de marzo de 2026");
    expect(fechaYmdCorta("2026-03-01")).toMatch(/^1 mar/);
  });
  it("cruza fin de año sin problema", () => {
    expect(fechaYmdLarga("2026-12-31")).toBe("31 de diciembre de 2026");
  });
});
