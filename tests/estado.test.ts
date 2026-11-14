import { describe, expect, it } from "vitest";
import { esVersionNueva, evaluarEstado } from "@/lib/estado";

const AHORA = new Date("2026-11-14T12:00:00Z");

describe("evaluarEstado", () => {
  it("todo bien: BD responde y el agente corrió hace 6 h", () => {
    const e = evaluarEstado({ bdOk: true, ultimaCorridaFin: "2026-11-14T06:00:00Z" }, AHORA);
    expect(e).toEqual({ ok: true, base_de_datos: "ok", agente_fuentes: "ok", horas_desde_ultima_corrida: 6 });
  });

  it("agente con 30 h todavía está bien; con 31 h está atrasado", () => {
    expect(evaluarEstado({ bdOk: true, ultimaCorridaFin: "2026-11-13T06:00:00Z" }, AHORA).ok).toBe(true);
    const e = evaluarEstado({ bdOk: true, ultimaCorridaFin: "2026-11-13T05:00:00Z" }, AHORA);
    expect(e.ok).toBe(false);
    expect(e.agente_fuentes).toBe("atrasado");
  });

  it("BD caída: no ok", () => {
    expect(evaluarEstado({ bdOk: false, ultimaCorridaFin: "2026-11-14T06:00:00Z" }, AHORA))
      .toMatchObject({ ok: false, base_de_datos: "error" });
  });

  it("sin corridas registradas: no ok", () => {
    expect(evaluarEstado({ bdOk: true, ultimaCorridaFin: null }, AHORA))
      .toMatchObject({ ok: false, agente_fuentes: "sin_datos", horas_desde_ultima_corrida: null });
  });
});

describe("esVersionNueva", () => {
  it("reconoce los errores de archivos de una versión vieja", () => {
    expect(esVersionNueva({ name: "ChunkLoadError", message: "Loading chunk 123 failed." })).toBe(true);
    expect(esVersionNueva({ name: "TypeError", message: "Failed to fetch dynamically imported module: /x.js" })).toBe(true);
  });

  it("no confunde otros errores (no debe recargar en ciclo)", () => {
    expect(esVersionNueva({ name: "TypeError", message: "Cannot read properties of undefined" })).toBe(false);
  });
});
