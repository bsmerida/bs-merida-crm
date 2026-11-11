import { describe, expect, it } from "vitest";
import { syncTokkoProperties } from "@/lib/tokko-sync";
import { createFakeDb } from "./helpers/fake-supabase";

const tokko = (id: number, desc: string | null, photos = 2) => ({
  id, description: desc, type: { name: "Casa" },
  operations: [{ operation_type: "Sale", prices: [{ currency: "MXN", price: 1_000_000 }] }],
  photos: Array.from({ length: photos }, (_, i) => ({ image: `https://t/${id}-${i}.jpg`, order: i })),
});

describe("syncTokkoProperties", () => {
  it("guarda por lotes en vez de una consulta por propiedad", async () => {
    const db = createFakeDb({ properties: [] });
    const props = Array.from({ length: 120 }, (_, i) => tokko(i + 1, "desc"));
    const res = await syncTokkoProperties(db as any, props as any);

    expect(res).toMatchObject({ total: 120, synced: 120, failed: 0, images: 240 });
    const upserts = db.writes.filter(w => w.table === "properties" && w.op === "upsert");
    expect(upserts).toHaveLength(3); // 50 + 50 + 20
    expect(upserts.every(u => u.options?.defaultToNull === false)).toBe(true);
  });

  it("no pisa descripciones escritas a mano en el CRM", async () => {
    const db = createFakeDb({ properties: [{ external_id: "1", description: "Texto del asesor" }] });
    await syncTokkoProperties(db as any, [tokko(1, "Texto de Tokko"), tokko(2, "Otra")] as any);
    const rows = db.writes.find(w => w.op === "upsert")!.payload as any[];
    expect(rows.find(r => r.external_id === "1")).not.toHaveProperty("description");
    expect(rows.find(r => r.external_id === "2").description).toBe("Otra");
  });

  it("pone la primera foto como portada", async () => {
    const db = createFakeDb({ properties: [] });
    await syncTokkoProperties(db as any, [tokko(9, null, 3)] as any);
    const imgs = db.writes.find(w => w.table === "property_images" && w.op === "insert")!.payload as any[];
    expect(imgs.map(i => i.is_cover)).toEqual([true, false, false]);
  });
});
