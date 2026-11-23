import { describe, expect, it } from "vitest";
import { media, mediana, modaPorRango } from "@/lib/stats-descriptivas";

describe("media", () => {
  it("calcula el promedio", () => {
    expect(media([1_000_000, 2_000_000, 3_000_000])).toBe(2_000_000);
  });
  it("null con lista vacía", () => {
    expect(media([])).toBeNull();
  });
});

describe("mediana", () => {
  it("toma el valor de en medio con cantidad impar (ya ordenados)", () => {
    expect(mediana([1, 2, 3])).toBe(2);
  });
  it("promedia los dos de en medio con cantidad par (ya ordenados)", () => {
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
  });
  it("null con lista vacía", () => {
    expect(mediana([])).toBeNull();
  });
});

describe("modaPorRango", () => {
  const rangos = [
    { label: "<1M", min: 0, max: 1_000_000 },
    { label: "1-2M", min: 1_000_000, max: 2_000_000 },
    { label: "2-4M", min: 2_000_000, max: 4_000_000 },
  ];
  it("devuelve el rango con más valores", () => {
    expect(modaPorRango([500_000, 1_500_000, 1_800_000, 1_900_000], rangos)).toBe("1-2M");
  });
  it("null con lista vacía", () => {
    expect(modaPorRango([], rangos)).toBeNull();
  });
  it("null si ningún valor cae en los rangos dados", () => {
    expect(modaPorRango([50_000_000], rangos)).toBeNull();
  });
});
