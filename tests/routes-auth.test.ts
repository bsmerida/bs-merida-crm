// Verifica que las rutas que antes estaban abiertas ahora exigen sesión y permisos.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createFakeDb, createFakeSessionClient, type FakeDb } from "./helpers/fake-supabase";

const ADMIN = "00000000-0000-4000-8000-000000000001";
const ASESOR_A = "00000000-0000-4000-8000-00000000000a";
const ASESOR_B = "00000000-0000-4000-8000-00000000000b";
const LEAD = "00000000-0000-4000-8000-0000000000c1";
const REQ = "00000000-0000-4000-8000-0000000000d1";

let db: FakeDb;
let currentUser: string | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createFakeSessionClient(db, currentUser),
  createAdminClient: () => db,
}));
vi.mock("@/lib/emails", () => ({
  sendEmail: vi.fn(async () => ({})),
  emailClienteConfirmado: () => ({ html: "", subject: "" }),
  emailClienteNuevasOpciones: () => ({ html: "", subject: "" }),
  emailAsesorNuevaSolicitud: () => ({ html: "", subject: "" }),
}));
vi.mock("@/lib/push", () => ({ sendPush: vi.fn(async () => 0) }));
vi.mock("@/lib/google-calendar", () => ({
  MERIDA_TZ: "America/Merida",
  getCalendarAccess: vi.fn(async () => null),
  createCalendarEvent: vi.fn(async () => null),
  deleteCalendarEvent: vi.fn(async () => {}),
}));

const json = (url: string, method: string, body?: unknown) =>
  new NextRequest(url, { method, body: body ? JSON.stringify(body) : undefined, headers: { "content-type": "application/json" } });

beforeEach(() => {
  currentUser = null;
  db = createFakeDb({
    profiles: [
      { id: ADMIN, role: "admin", active: true },
      { id: ASESOR_A, role: "asesor", active: true },
      { id: ASESOR_B, role: "asesor", active: false },
    ],
    leads: [{ id: LEAD, agent_id: ASESOR_A }],
    appointment_requests: [{
      id: REQ, agent_id: ASESOR_A, status: "pending", client_name: "Ana López",
      client_options: [{ date: "2026-11-20", time: "10:00" }],
      agent_options: [{ date: "2026-11-21", time: "12:00" }], client_token: "tok",
    }],
  });
});

const deletes = (table: string) => db.writes.filter(w => w.table === table && w.op === "delete");

describe("DELETE /api/citas/[id]", () => {
  it("rechaza sin sesión y no borra nada", async () => {
    const { DELETE } = await import("@/app/api/citas/[id]/route");
    const res = await DELETE(json("http://x/api/citas/" + REQ, "DELETE"), { params: { id: REQ } });
    expect(res.status).toBe(401);
    expect(deletes("appointment_requests")).toHaveLength(0);
  });

  it("un asesor no puede borrar la cita de otro asesor", async () => {
    db = createFakeDb({
      profiles: [{ id: ASESOR_B, role: "asesor", active: true }],
      appointment_requests: [{ id: REQ, agent_id: ASESOR_A }],
    });
    currentUser = ASESOR_B;
    const { DELETE } = await import("@/app/api/citas/[id]/route");
    const res = await DELETE(json("http://x", "DELETE"), { params: { id: REQ } });
    expect(res.status).toBe(404);
    expect(deletes("appointment_requests")).toHaveLength(0);
  });

  it("el asesor asignado sí puede", async () => {
    currentUser = ASESOR_A;
    const { DELETE } = await import("@/app/api/citas/[id]/route");
    const res = await DELETE(json("http://x", "DELETE"), { params: { id: REQ } });
    expect(res.status).toBe(200);
    expect(deletes("appointment_requests")).toHaveLength(1);
  });
});

describe("POST /api/citas/responder/[id]", () => {
  it("rechaza sin sesión", async () => {
    const { POST } = await import("@/app/api/citas/responder/[id]/route");
    const res = await POST(json("http://x", "POST", { action: "accept" }), { params: { id: REQ } });
    expect(res.status).toBe(401);
    expect(db.writes).toHaveLength(0);
  });
});

describe("confirmación del cliente (link del correo)", () => {
  const reagendada = (status = "rescheduled") => createFakeDb({
    appointment_requests: [{
      id: REQ, agent_id: ASESOR_A, status, client_token: "tok",
      client_options: [{ date: "2026-11-20", time: "10:00" }],
      agent_options: [{ date: "2026-11-21", time: "12:00" }],
    }],
  });
  const form = (fields: Record<string, string>) =>
    new NextRequest("http://x/api/citas/confirmar-cliente", { method: "POST", body: new URLSearchParams(fields) });

  it("abrir el link NO confirma nada: solo lleva a la página con el botón", async () => {
    db = reagendada();
    const { GET } = await import("@/app/api/citas/confirmar-cliente/route");
    const res = await GET(new NextRequest("http://x/api/citas/confirmar-cliente?token=tok&option=0"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/cita-elegir?token=tok&option=0");
    expect(db.writes).toHaveLength(0);
  });

  it("el botón confirma la opción del ASESOR que eligió el cliente (no la del cliente)", async () => {
    db = reagendada();
    const { POST } = await import("@/app/api/citas/confirmar-cliente/route");
    const res = await POST(form({ token: "tok", option: "0" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/cita-confirmada?date=");
    const update = db.writes.find(w => w.table === "appointment_requests" && w.op === "update");
    expect((update?.payload as any).confirmed_option).toEqual({ date: "2026-11-21", time: "12:00" });
    // Solo confirma si sigue reagendada (nadie la confirmó antes)
    expect(update?.filters).toContainEqual(["status", "rescheduled"]);
  });

  it("si ya estaba confirmada no vuelve a confirmar ni manda correo", async () => {
    db = reagendada("confirmed");
    const { sendEmail } = await import("@/lib/emails");
    vi.mocked(sendEmail).mockClear();
    const { POST } = await import("@/app/api/citas/confirmar-cliente/route");
    const res = await POST(form({ token: "tok", option: "0" }));
    expect(res.headers.get("location")).toContain("status=already");
    expect(db.writes).toHaveLength(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("confirmRequest", () => {
  it("si otra persona la confirmó primero (carrera), no crea evento ni manda correo", async () => {
    // La fila ya no está en 'pending': el update condicionado no encuentra nada
    db = createFakeDb({ appointment_requests: [{ id: REQ, status: "confirmed", client_email: "a@b.mx" }] });
    const { sendEmail } = await import("@/lib/emails");
    const { getCalendarAccess } = await import("@/lib/google-calendar");
    vi.mocked(sendEmail).mockClear(); vi.mocked(getCalendarAccess).mockClear();
    const { confirmRequest } = await import("@/lib/citas");
    const ok = await confirmRequest(db as any, { id: REQ, client_email: "a@b.mx" }, { date: "2026-11-20", time: "10:00" }, "pending");
    expect(ok).toBe(false);
    expect(getCalendarAccess).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("si sigue pendiente, confirma una vez y manda el correo", async () => {
    db = createFakeDb({ appointment_requests: [{ id: REQ, status: "pending" }], profiles: [] });
    const { sendEmail } = await import("@/lib/emails");
    vi.mocked(sendEmail).mockClear();
    const { confirmRequest } = await import("@/lib/citas");
    const ok = await confirmRequest(db as any, { id: REQ, client_email: "a@b.mx", client_name: "Ana" }, { date: "2026-11-20", time: "10:00" }, "pending");
    expect(ok).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/citas/responder/[id] (aceptar)", () => {
  it("una cita ya confirmada no se vuelve a confirmar (409)", async () => {
    db = createFakeDb({
      profiles: [{ id: ASESOR_A, role: "asesor", active: true }],
      appointment_requests: [{ id: REQ, agent_id: ASESOR_A, status: "confirmed", client_options: [{ date: "2026-11-20", time: "10:00" }] }],
    });
    currentUser = ASESOR_A;
    const { POST } = await import("@/app/api/citas/responder/[id]/route");
    const res = await POST(json("http://x", "POST", { action: "accept", option_index: 0 }), { params: { id: REQ } });
    expect(res.status).toBe(409);
    expect(db.writes).toHaveLength(0);
  });
});

describe("DELETE /api/leads/delete", () => {
  it("un asesor no puede borrar clientes de otro", async () => {
    db = createFakeDb({
      profiles: [{ id: ASESOR_B, role: "asesor", active: true }],
      leads: [{ id: LEAD, agent_id: ASESOR_A }],
    });
    currentUser = ASESOR_B;
    const { DELETE } = await import("@/app/api/leads/delete/route");
    const res = await DELETE(json("http://x", "DELETE", { id: LEAD }));
    expect(res.status).toBe(404);
    expect(db.writes).toHaveLength(0);
  });

  it("el admin sí puede", async () => {
    currentUser = ADMIN;
    const { DELETE } = await import("@/app/api/leads/delete/route");
    const res = await DELETE(json("http://x", "DELETE", { id: LEAD }));
    expect(res.status).toBe(200);
    expect(deletes("leads")).toHaveLength(1);
  });
});

describe("usuarios desactivados", () => {
  it("no pueden usar la API aunque tengan sesión", async () => {
    currentUser = ASESOR_B; // active: false
    const { DELETE } = await import("@/app/api/citas/[id]/route");
    const res = await DELETE(json("http://x", "DELETE"), { params: { id: REQ } });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/finanzas-ai", () => {
  it("rechaza sin sesión (antes era un proxy abierto a la API de Anthropic)", async () => {
    const { POST } = await import("@/app/api/finanzas-ai/route");
    const res = await POST(json("http://x", "POST", { messages: [{ role: "user", content: "hola" }], system: "x" }));
    expect(res.status).toBe(401);
  });
});

describe("/api/admin/usuarios", () => {
  it("solo admins, y valida el rol", async () => {
    currentUser = ASESOR_A;
    const { POST } = await import("@/app/api/admin/usuarios/route");
    expect((await POST(json("http://x", "POST", {}))).status).toBe(403);

    currentUser = ADMIN;
    const res = await POST(json("http://x", "POST", { email: "a@b.mx", password: "0123456789", full_name: "A B", role: "superadmin" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/cron/notificaciones", () => {
  it("rechaza sin el secreto correcto", async () => {
    process.env.CRON_SECRET = "s3cret";
    const { GET } = await import("@/app/api/cron/notificaciones/route");
    const res = await GET(new NextRequest("http://x", { headers: { "x-cron-secret": "nope" } }));
    expect(res.status).toBe(401);
  });

  it("rechaza si CRON_SECRET no está configurado", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("@/app/api/cron/notificaciones/route");
    const res = await GET(new NextRequest("http://x"));
    expect(res.status).toBe(401);
  });
});

describe("middleware: secciones solo-admin", () => {
  it("identifica rutas restringidas sin falsos positivos", async () => {
    const { isAdminOnlyPath } = await import("@/lib/supabase/middleware");
    expect(isAdminOnlyPath("/admin/finanzas")).toBe(true);
    expect(isAdminOnlyPath("/admin/finanzas/historicos")).toBe(true);
    expect(isAdminOnlyPath("/admin/kpisx")).toBe(false);
    expect(isAdminOnlyPath("/admin/leads")).toBe(false);
  });
});
