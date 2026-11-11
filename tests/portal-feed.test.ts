import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: { method: string; args: unknown[] }[] = [];
const rows = [{ id: "p1", title: "Casa & jardín", type: "Casa", operation: "Venta", price: 1, images: [] }];

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => {
    const q: any = {};
    for (const m of ["from", "select", "eq", "not"]) q[m] = (...args: unknown[]) => { calls.push({ method: m, args }); return q; };
    q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(ok);
    return q;
  },
}));

beforeEach(() => { calls.length = 0; });

describe("feeds por portal", () => {
  it("filtra por la columna del portal y escapa el XML", async () => {
    const { GET } = await import("@/app/api/feed/proppit/route");
    const res = await GET(new Request("https://duclaud.mx/api/feed/proppit"));
    expect(res.headers.get("content-type")).toContain("application/xml");
    expect(calls).toContainEqual({ method: "eq", args: ["publicar_proppit", true] });
    const xml = await res.text();
    expect(xml).toContain("<name>Duclaud Bienes Raíces</name>");
    expect(xml).toContain("https://duclaud.mx/propiedad/p1");
  });

  it("nunca pide columnas del propietario", async () => {
    const { GET } = await import("@/app/api/feed/inmuebles24/route");
    await GET(new Request("https://duclaud.mx/api/feed/inmuebles24"));
    const select = calls.find(c => c.method === "select")!.args[0] as string;
    expect(select).not.toMatch(/owner|\*/);
  });

  it("el feed general no filtra por portal", async () => {
    const { GET } = await import("@/app/api/feed/xml/route");
    await GET(new Request("https://duclaud.mx/api/feed/xml"));
    expect(calls.some(c => c.method === "eq" && String(c.args[0]).startsWith("publicar_"))).toBe(false);
  });
});
