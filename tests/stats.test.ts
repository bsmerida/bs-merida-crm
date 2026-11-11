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
