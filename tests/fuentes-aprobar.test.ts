// Aprobar / rechazar borradores del agente: solo admin, nada se publica,
// solo cambian los campos aceptados y el feedback se vuelve lección.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createFakeDb, createFakeSessionClient, type FakeDb } from "./helpers/fake-supabase";
import { limpiarDatos } from "@/lib/fuentes";

const ADMIN = "00000000-0000-4000-8000-000000000001";
const ASESOR = "00000000-0000-4000-8000-00000000000a";
const NUEVA = "00000000-0000-4000-8000-0000000000b1";
const ACTUALIZAR = "00000000-0000-4000-8000-0000000000b2";
const REVISADO = "00000000-0000-4000-8000-0000000000b3";
const PROP = "00000000-0000-4000-8000-0000000000e1";
const DESARROLLO = "00000000-0000-4000-8000-0000000000f1";

let db: FakeDb;
let currentUser: string | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createFakeSessionClient(db, currentUser),
  createAdminClient: () => db,
}));

const { PATCH } = await import("@/app/api/fuentes/borradores/[id]/route");
const { PATCH: PATCH_CAMBIOS } = await import("@/app/api/fuentes/cambios/route");

const patch = (id: string, body: unknown) =>
  PATCH(new NextRequest(`http://x/api/fuentes/borradores/${id}`, { method: "PATCH", body: JSON.stringify(body) }), { params: { id } });

const writes = (table: string, op?: string) => db.writes.filter(w => w.table === table && (!op || w.op === op));

const datosNueva = {
  title: "Departamento en Kinora, Tipo A", description: "Texto", type: "Departamento", operation: "Venta", status: "Disponible",
  price: 2450000, price_type: "total", currency: "MXN", zone: "Conkal", city: "Conkal", state: "Yucatán",
  bedrooms: 2, bathrooms: 2, m2_construction: 85, m2_land: null, parking: 1, amenities: ["Alberca"], development: "Kinora",
};

beforeEach(() => {
  currentUser = ADMIN;
  db = createFakeDb({
    profiles: [{ id: ADMIN, role: "admin", active: true }, { id: ASESOR, role: "asesor", active: true }],
    propiedad_borradores: [
      { id: NUEVA, fuente_id: "F-0010", desarrollo_id: DESARROLLO, clave_modelo: "kinora|tipo-a|Departamento|Venta", accion: "Nueva",
        property_id: null, estado: "Pendiente", datos: datosNueva, cambios: null,
        fotos: [{ url: "https://s/1.jpg" }, { url: "https://s/2.jpg" }] },
      { id: ACTUALIZAR, fuente_id: "F-0010", desarrollo_id: DESARROLLO, clave_modelo: "kinora|tipo-b|Departamento|Venta", accion: "Actualizar",
        property_id: PROP, estado: "Pendiente", datos: { ...datosNueva, title: "Otro" },
        cambios: { price: { antes: 2300000, despues: 2450000 }, m2_construction: { antes: 80, despues: 85 } }, fotos: [] },
      { id: REVISADO, fuente_id: "F-0010", clave_modelo: "x", accion: "Nueva", estado: "Aprobado", datos: datosNueva, fotos: [] },
    ],
  });
});

describe("permisos", () => {
  it("un asesor no puede aprobar", async () => {
    currentUser = ASESOR;
    expect((await patch(NUEVA, { accion: "aprobar" })).status).toBe(403);
    expect(writes("properties")).toHaveLength(0);
  });
  it("sin sesión → 401", async () => {
    currentUser = null;
    expect((await patch(NUEVA, { accion: "aprobar" })).status).toBe(401);
  });
  it("un borrador ya revisado no se vuelve a aplicar", async () => {
    expect((await patch(REVISADO, { accion: "aprobar" })).status).toBe(409);
  });
});

describe("aprobar una nueva", () => {
  it("crea la propiedad SIN publicar, con referencia DLC y las fotos elegidas en orden", async () => {
    const res = await patch(NUEVA, {
      accion: "aprobar", datos: { title: "Kinora Tipo A", is_published: true, agent_id: "hack" },
      fotos: ["https://s/2.jpg", "https://evil.com/x.jpg", "https://s/1.jpg"],
    });
    expect(res.status).toBe(200);
    const prop = writes("properties", "insert")[0].payload as any;
    expect(prop).toMatchObject({ title: "Kinora Tipo A", is_published: false, featured: false, price: 2450000, type: "Departamento" });
    expect(prop.reference).toMatch(/^DLC-\d{4}-\d{3}$/);
    expect(prop.agent_id).toBeUndefined();
    const imgs = writes("property_images", "insert")[0].payload as any[];
    expect(imgs.map(i => [i.url, i.position, i.is_cover])).toEqual([["https://s/2.jpg", 0, true], ["https://s/1.jpg", 1, false]]);
    expect(writes("propiedad_fuentes", "upsert")[0].payload).toMatchObject({ fuente_id: "F-0010", clave_modelo: "kinora|tipo-a|Departamento|Venta" });
  });

  it("con 'Publicar' marcado: se publica y solo en los portales válidos elegidos", async () => {
    const res = await patch(NUEVA, {
      accion: "aprobar",
      publicar: { sitio: true, portales: ["publicar_inmuebles24", "publicar_proppit", "is_published", "agent_id", "publicar_inmuebles24"] },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ publicada: true });
    const prop = writes("properties", "insert")[0].payload as any;
    expect(prop.is_published).toBe(true);
    expect(prop.publicar_inmuebles24).toBe(true);
    expect(prop.publicar_proppit).toBe(true);
    expect(prop.agent_id).toBeUndefined();
    expect(Object.keys(prop).filter(k => k.startsWith("publicar_")).sort()).toEqual(["publicar_inmuebles24", "publicar_proppit"]);
  });

  it("portales sin marcar 'Publicar' en el sitio: no publica nada", async () => {
    await patch(NUEVA, { accion: "aprobar", publicar: { sitio: false, portales: ["publicar_inmuebles24"] } });
    const prop = writes("properties", "insert")[0].payload as any;
    expect(prop.is_published).toBe(false);
    expect(prop.publicar_inmuebles24).toBeUndefined();
  });

  it("'sitio' tiene que ser exactamente true (no 'true' ni 1)", async () => {
    await patch(NUEVA, { accion: "aprobar", publicar: { sitio: "true" } });
    expect((writes("properties", "insert")[0].payload as any).is_published).toBe(false);
  });

  it("publicar sin fotos: no crea nada y lo explica", async () => {
    const res = await patch(NUEVA, { accion: "aprobar", fotos: [], publicar: { sitio: true } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/foto/);
    expect(writes("properties")).toHaveLength(0);
    expect(writes("propiedad_borradores", "update")).toHaveLength(0);
  });

  it("sin precio no crea nada", async () => {
    const res = await patch(NUEVA, { accion: "aprobar", datos: { price: 0 } });
    expect(res.status).toBe(400);
    expect(writes("properties")).toHaveLength(0);
    expect(writes("propiedad_borradores", "update")).toHaveLength(0);
  });
});

describe("aprobar una actualización", () => {
  it("cambia solo los campos marcados y nunca el título ni la publicación", async () => {
    const res = await patch(ACTUALIZAR, {
      accion: "aprobar", aceptados: ["price", "title", "is_published"], datos: { title: "X", is_published: true },
      publicar: { sitio: true, portales: ["publicar_inmuebles24"] },
    });
    expect(res.status).toBe(200);
    const upd = writes("properties", "update")[0];
    expect(upd.payload).toEqual({ price: 2450000 });
    expect(upd.filters).toContainEqual(["id", PROP]);
  });

  it("sin cambios marcados pide rechazar", async () => {
    expect((await patch(ACTUALIZAR, { accion: "aprobar", aceptados: [] })).status).toBe(400);
    expect(writes("properties")).toHaveLength(0);
  });
});

describe("rechazar", () => {
  it("exige motivo y comentario", async () => {
    expect((await patch(NUEVA, { accion: "rechazar", feedback: "mal" })).status).toBe(400);
    expect((await patch(NUEVA, { accion: "rechazar", motivo: "Fotos", feedback: "" })).status).toBe(400);
  });

  it("guarda la lección para el paso que se equivocó y puede pedir que se rehaga", async () => {
    const res = await patch(NUEVA, { accion: "rechazar", motivo: "Fotos", feedback: "No uses flyers con precios", rehacer: true });
    expect(res.status).toBe(200);
    expect(writes("agente_lecciones", "insert")[0].payload).toMatchObject({ paso: "fotos", leccion: "No uses flyers con precios", borrador_id: NUEVA });
    const reset = writes("fuente_desarrollos", "update")[0];
    expect(reset.payload).toEqual({ firma: null });
    expect(reset.filters).toContainEqual(["id", DESARROLLO]);
    expect(writes("properties")).toHaveLength(0);
  });
});

describe("cambios de archivos", () => {
  it("solo acepta ids válidos o un id de fuente", async () => {
    const req = (body: unknown) => new NextRequest("http://x/api/fuentes/cambios", { method: "PATCH", body: JSON.stringify(body) });
    expect((await PATCH_CAMBIOS(req({ ids: ["1; drop table"] }))).status).toBe(400);
    expect((await PATCH_CAMBIOS(req({ fuente_id: "F-0008" }))).status).toBe(200);
    currentUser = ASESOR;
    expect((await PATCH_CAMBIOS(req({ fuente_id: "F-0008" }))).status).toBe(403);
  });
});

describe("limpiarDatos", () => {
  it("solo deja campos del formulario de propiedades, con tipos correctos", () => {
    expect(limpiarDatos({ title: "  Casa  ", price: "abc", m2_land: 0, type: "Castillo", amenities: "Alberca, , Gym", owner_phone: "999" }))
      .toEqual({ title: "Casa", price: 0, m2_land: null, amenities: ["Alberca", "Gym"] });
  });
});
