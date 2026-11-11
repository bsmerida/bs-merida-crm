import { afterEach, describe, expect, it, vi } from "vitest";
import { cdata, escapeHtml, isUuid, rateLimit, rateLimitLocal } from "@/lib/security";

describe("escapeHtml", () => {
  it("neutraliza etiquetas y atributos", () => {
    expect(escapeHtml(`<a href="x">Juan</a> & 'co'`))
      .toBe("&lt;a href=&quot;x&quot;&gt;Juan&lt;/a&gt; &amp; &#39;co&#39;");
  });
  it("tolera null/undefined/números", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(42)).toBe("42");
  });
});

describe("cdata", () => {
  it("no permite cerrar el bloque CDATA antes de tiempo", () => {
    const out = cdata("Casa ]]><script>x</script>");
    // Ningún "]]>" debe aparecer fuera del cierre final... salvo los que separan secciones
    expect(out.startsWith("<![CDATA[")).toBe(true);
    expect(out.endsWith("]]>")).toBe(true);
    expect(out).toContain("]]]]><![CDATA[>");
  });
});

describe("isUuid", () => {
  it("acepta UUIDs y rechaza lo demás", () => {
    expect(isUuid("15f01899-4206-4613-bb01-e26ea4ba003f")).toBe(true);
    expect(isUuid("1; drop table leads")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

describe("rateLimitLocal", () => {
  it("permite hasta el límite y luego bloquea hasta que expira la ventana", () => {
    const key = `test:${Math.random()}`;
    const t0 = 1_000_000;
    expect(rateLimitLocal(key, 2, 1000, t0)).toBe(true);
    expect(rateLimitLocal(key, 2, 1000, t0 + 1)).toBe(true);
    expect(rateLimitLocal(key, 2, 1000, t0 + 2)).toBe(false);
    expect(rateLimitLocal(key, 2, 1000, t0 + 1001)).toBe(true);
  });
});

describe("rateLimit (Upstash)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("devuelve una promesa que bloquea al pasar el límite (los callers deben usar await)", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "t";
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ result: ++n }, { result: 1 }]))));
    expect(await rateLimit("k", 2, 1000)).toBe(true);
    expect(await rateLimit("k", 2, 1000)).toBe(true);
    expect(await rateLimit("k", 2, 1000)).toBe(false);
  });

  it("si Redis falla, usa el límite local en vez de tumbar la ruta", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "t";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("red caída"); }));
    expect(await rateLimit(`fallo:${Math.random()}`, 1, 1000)).toBe(true);
  });
});
