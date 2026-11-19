import { afterEach, describe, expect, it, vi } from "vitest";
import { generarEmbedding, textoParaEmbedding } from "@/lib/embeddings";

describe("textoParaEmbedding", () => {
  it("junta descripción y amenidades", () => {
    expect(textoParaEmbedding({ description: "Casa tranquila", amenities: ["alberca", "jardín"] }))
      .toBe("Casa tranquila Amenidades: alberca, jardín.");
  });
  it("funciona sin amenidades ni descripción", () => {
    expect(textoParaEmbedding({ description: null, amenities: null })).toBe("");
    expect(textoParaEmbedding({ description: "  ", amenities: [] })).toBe("");
  });
});

describe("generarEmbedding", () => {
  const prevKey = process.env.VOYAGE_API_KEY;
  afterEach(() => {
    process.env.VOYAGE_API_KEY = prevKey;
    vi.unstubAllGlobals();
  });

  it("no hace nada si no hay VOYAGE_API_KEY", async () => {
    delete process.env.VOYAGE_API_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await generarEmbedding("un texto")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("no hace nada con texto vacío aunque haya llave", async () => {
    process.env.VOYAGE_API_KEY = "test-key";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await generarEmbedding("   ")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("devuelve null si Voyage responde error", async () => {
    process.env.VOYAGE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "unauthorized" }));
    expect(await generarEmbedding("algo")).toBeNull();
  });

  it("devuelve el vector cuando Voyage responde bien", async () => {
    process.env.VOYAGE_API_KEY = "test-key";
    const vector = [0.1, 0.2, 0.3];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ embedding: vector }] }) }));
    expect(await generarEmbedding("algo", "query")).toEqual(vector);
  });
});
