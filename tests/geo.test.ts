import { describe, expect, it } from "vitest";
import { haversineKm, masCercanas, RADIO_CERCA_KM } from "@/lib/geo";

// Puntos de referencia reales para las pruebas.
const MERIDA_CENTRO = { lat: 20.9674, lng: -89.5926 };
const MONTEBELLO    = { lat: 21.0353, lng: -89.5837 }; // norte de Mérida, ~7.6km del centro
const MONTERREY     = { lat: 25.6866, lng: -100.3161 }; // ~870km de Mérida

describe("haversineKm", () => {
  it("da 0 para el mismo punto", () => {
    expect(haversineKm(MERIDA_CENTRO.lat, MERIDA_CENTRO.lng, MERIDA_CENTRO.lat, MERIDA_CENTRO.lng)).toBeCloseTo(0, 5);
  });
  it("da una distancia razonable entre dos puntos dentro de Mérida", () => {
    const d = haversineKm(MERIDA_CENTRO.lat, MERIDA_CENTRO.lng, MONTEBELLO.lat, MONTEBELLO.lng);
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(10);
  });
  it("da una distancia grande entre Mérida y Monterrey", () => {
    const d = haversineKm(MERIDA_CENTRO.lat, MERIDA_CENTRO.lng, MONTERREY.lat, MONTERREY.lng);
    expect(d).toBeGreaterThan(800);
  });
});

describe("masCercanas", () => {
  const props = [
    { id: "centro", lat: MERIDA_CENTRO.lat, lng: MERIDA_CENTRO.lng },
    { id: "montebello", lat: MONTEBELLO.lat, lng: MONTEBELLO.lng },
    { id: "monterrey", lat: MONTERREY.lat, lng: MONTERREY.lng },
    { id: "sin-coords", lat: null, lng: null },
  ];

  it("ordena por cercanía y descarta lo que está fuera del radio (no manda a Monterrey)", () => {
    const resultado = masCercanas(props, MERIDA_CENTRO.lat, MERIDA_CENTRO.lng);
    expect(resultado.map(p => p.id)).toEqual(["centro", "montebello"]);
  });

  it("ignora propiedades sin coordenadas", () => {
    const resultado = masCercanas(props, MERIDA_CENTRO.lat, MERIDA_CENTRO.lng);
    expect(resultado.find(p => p.id === "sin-coords")).toBeUndefined();
  });

  it("respeta el máximo de resultados", () => {
    const resultado = masCercanas(props, MERIDA_CENTRO.lat, MERIDA_CENTRO.lng, 1);
    expect(resultado.length).toBe(1);
  });

  it("el radio por defecto es de 15km", () => {
    expect(RADIO_CERCA_KM).toBe(15);
  });
});
