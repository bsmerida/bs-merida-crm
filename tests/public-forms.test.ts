// Formularios públicos que antes escribían directo a la BD desde el navegador.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createFakeDb, type FakeDb } from "./helpers/fake-supabase";

let db: FakeDb;
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => db, createClient: () => db }));

let ipCounter = 0;
const post = (body: unknown) => new NextRequest("http://x", {
  method: "POST", body: JSON.stringify(body),
  headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ipCounter}` },
});

beforeEach(() => { db = createFakeDb({}); });

describe("POST /api/contacto", () => {
  it("valida y guarda el lead", async () => {
    const { POST } = await import("@/app/api/contacto/route");
    const res = await POST(post({ name: "Ana", phone: "999 746 6272", email: "", message: "Busco casa" }));
    expect(res.status).toBe(200);
    const ins = db.writes.find(w => w.table === "leads" && w.op === "insert")!;
    expect(ins.payload).toMatchObject({ name: "Ana", phone: "999 746 6272", email: null, source: "Sitio web" });
  });

  it("rechaza teléfono inválido sin escribir nada", async () => {
    const { POST } = await import("@/app/api/contacto/route");
    expect((await POST(post({ name: "Ana", phone: "123" }))).status).toBe(400);
    expect(db.writes).toHaveLength(0);
  });

  it("limita envíos repetidos de la misma IP", async () => {
    const { POST } = await import("@/app/api/contacto/route");
    const same = () => new NextRequest("http://x", {
      method: "POST", body: JSON.stringify({ name: "Ana", phone: "9997466272" }),
      headers: { "content-type": "application/json", "x-forwarded-for": "10.9.9.9" },
    });
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await POST(same())).status);
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
  });
});

describe("POST /api/sofia/lead", () => {
  it("guarda el lead y solo liga sesiones que aún no tienen lead", async () => {
    const { POST } = await import("@/app/api/sofia/lead/route");
    const sid = "00000000-0000-4000-8000-0000000000aa";
    const res = await POST(post({ lead: { nombre: "Luis", telefono: "9991234567", zona: "Montebello" }, sessionId: sid }));
    expect(res.status).toBe(200);
    const upd = db.writes.find(w => w.table === "chatbot_sessions" && w.op === "update")!;
    expect(upd.filters).toEqual([["id", sid]]);
  });

  it("rechaza datos inválidos", async () => {
    const { POST } = await import("@/app/api/sofia/lead/route");
    expect((await POST(post({ lead: { nombre: "L", telefono: "1" } }))).status).toBe(400);
    expect(db.writes).toHaveLength(0);
  });
});
