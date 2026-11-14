// Rutas que gastan dinero por llamada: sin sesión válida o pasado el tope, no llaman a la IA.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createFakeDb, createFakeSessionClient, type FakeDb } from "./helpers/fake-supabase";

const ADMIN = "00000000-0000-4000-8000-000000000001";
const INACTIVO = "00000000-0000-4000-8000-00000000000b";
const PROP = "00000000-0000-4000-8000-0000000000e1";

let db: FakeDb;
let currentUser: string | null = null;
const create = vi.fn(async () => ({ content: [{ type: "text", text: "Descripción" }] }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createFakeSessionClient(db, currentUser),
  createAdminClient: () => db,
}));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));

const post = (body: unknown) =>
  new NextRequest("http://x/api/generar-descripcion", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.resetModules(); // el límite vive en memoria: cada prueba empieza en cero
  create.mockClear();
  currentUser = null;
  db = createFakeDb({
    profiles: [{ id: ADMIN, role: "admin", active: true }, { id: INACTIVO, role: "asesor", active: false }],
    properties: [{ id: PROP, type: "Casa", operation: "Venta", is_published: false }],
    property_images: [],
  });
});

describe("POST /api/generar-descripcion", () => {
  it("sin sesión: 401 y no llama a la IA", async () => {
    const { POST } = await import("@/app/api/generar-descripcion/route");
    expect((await POST(post({ property_id: PROP }))).status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("usuario desactivado: 401 y no llama a la IA", async () => {
    currentUser = INACTIVO;
    const { POST } = await import("@/app/api/generar-descripcion/route");
    expect((await POST(post({ property_id: PROP }))).status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("genera también para propiedades NO publicadas", async () => {
    currentUser = ADMIN;
    const { POST } = await import("@/app/api/generar-descripcion/route");
    const res = await POST(post({ property_id: PROP }));
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("después de 20 en una hora: 429 sin llamar a la IA", async () => {
    currentUser = ADMIN;
    const { POST } = await import("@/app/api/generar-descripcion/route");
    for (let i = 0; i < 20; i++) expect((await POST(post({ property_id: PROP }))).status).toBe(200);
    create.mockClear();
    const res = await POST(post({ property_id: PROP }));
    expect(res.status).toBe(429);
    expect(create).not.toHaveBeenCalled();
  });
});
