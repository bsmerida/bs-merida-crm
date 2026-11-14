import { describe, expect, it } from "vitest";
import { countByProperty } from "@/lib/stats";
import { createFakeDb } from "./helpers/fake-supabase";

describe("countByProperty", () => {
  it("usa la función SQL cuando existe", async () => {
    const db = {
      rpc: async (name: string) => ({
        data: name === "property_view_counts" ? [{ property_id: "a", total: "12" }] : [],
        error: null,
      }),
      from: () => { throw new Error("no debería descargar filas"); },
    };
    const m = await countByProperty(db as any, "views");
    expect(m.get("a")).toBe(12);
  });

  it("cae al conteo en JS si la migración aún no se aplicó", async () => {
    const fake = createFakeDb({ property_views: [{ property_id: "a" }, { property_id: "a" }, { property_id: "b" }] });
    const db = { ...fake, rpc: async () => ({ data: null, error: { code: "PGRST202" } }) };
    const m = await countByProperty(db as any, "views");
    expect([m.get("a"), m.get("b")]).toEqual([2, 1]);
  });
});

describe("ultimosClientes", () => {
  it("los más recientes primero aunque la base los devuelva desordenados", async () => {
    const { ultimosClientes } = await import("@/lib/stats");
    const leads = ["2026-07-07T10:00:00Z", "2026-11-11T09:00:00Z", "2026-09-01T00:00:00Z", "2026-11-11T18:00:00Z", "2026-01-01T00:00:00Z", "2026-10-05T00:00:00Z"]
      .map((created_at, i) => ({ id: i, created_at }));
    expect(ultimosClientes(leads, 3).map(l => l.id)).toEqual([3, 1, 5]);
    expect(leads[0].id).toBe(0); // no modifica la lista original
  });
});
