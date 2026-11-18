// Agendar visita: formulario público y el mismo flujo reusado por Sofía (chat).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createFakeDb, type FakeDb } from "./helpers/fake-supabase";

let db: FakeDb;
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => db, createClient: () => db }));
vi.mock("@/lib/emails", () => ({
  sendEmail: vi.fn(async () => ({})),
  emailClienteConfirmado: () => ({ html: "", subject: "" }),
  emailAsesorNuevaSolicitud: () => ({ html: "", subject: "" }),
}));
vi.mock("@/lib/push", () => ({ sendPush: vi.fn(async () => 0) }));

const PROP = "00000000-0000-4000-8000-0000000000f1";
const AGENT = "00000000-0000-4000-8000-0000000000a1";
const OPTS = [{ date: "2027-01-10", time: "11:00" }];

const baseTables = () => ({
  properties: [{ id: PROP, title: "Casa en Cholul", agent_id: AGENT, is_published: true }],
  profiles:   [{ id: AGENT, email: "asesor@duclaud.com.mx", full_name: "Mariana" }],
  leads:      [] as any[],
  appointment_requests: [] as any[],
});

describe("crearSolicitudCita", () => {
  beforeEach(() => { db = createFakeDb(baseTables()); });

  it("crea el lead y la solicitud cuando el cliente es nuevo", async () => {
    const { crearSolicitudCita } = await import("@/lib/citas");
    const result = await crearSolicitudCita(db as any, {
      propertyId: PROP, clientName: "Ana López", clientPhone: "9991234567",
      clientEmail: null, options: OPTS, source: "Test", adminUrl: "http://x/admin/citas",
    });
    expect(result.ok).toBe(true);
    const leadIns = db.writes.find(w => w.table === "leads" && w.op === "insert");
    expect(leadIns?.payload).toMatchObject({ name: "Ana López", phone: "9991234567" });
    const reqIns = db.writes.find(w => w.table === "appointment_requests" && w.op === "insert");
    expect(reqIns?.payload).toMatchObject({ property_id: PROP, client_phone: "9991234567", status: "pending" });
  });

  it("reutiliza el lead si ya existe por teléfono, en vez de duplicarlo", async () => {
    db = createFakeDb({ ...baseTables(), leads: [{ id: "lead-1", phone: "9991234567" }] });
    const { crearSolicitudCita } = await import("@/lib/citas");
    await crearSolicitudCita(db as any, {
      propertyId: PROP, clientName: "Ana López", clientPhone: "9991234567",
      clientEmail: null, options: OPTS, source: "Sofía IA — Cita", adminUrl: "http://x/admin/citas",
    });
    expect(db.writes.some(w => w.table === "leads" && w.op === "insert")).toBe(false);
    expect(db.writes.some(w => w.table === "leads" && w.op === "update")).toBe(true);
  });

  it("rechaza una propiedad que no existe o no está publicada", async () => {
    const { crearSolicitudCita } = await import("@/lib/citas");
    const result = await crearSolicitudCita(db as any, {
      propertyId: "00000000-0000-4000-8000-00000000ffff", clientName: "Ana López", clientPhone: "9991234567",
      clientEmail: null, options: OPTS, source: "Test", adminUrl: "http://x/admin/citas",
    });
    expect(result.ok).toBe(false);
  });
});

describe("POST /api/citas/solicitar", () => {
  beforeEach(() => { db = createFakeDb(baseTables()); });

  const post = (body: unknown) => new NextRequest("http://x", {
    method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
  });

  it("acepta una solicitud válida", async () => {
    const { POST } = await import("@/app/api/citas/solicitar/route");
    const res = await POST(post({
      property_id: PROP, client_name: "Ana López", client_phone: "9991234567", options: OPTS,
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("rechaza nombre sin apellido sin escribir nada", async () => {
    const { POST } = await import("@/app/api/citas/solicitar/route");
    const res = await POST(post({ property_id: PROP, client_name: "Ana", client_phone: "9991234567", options: OPTS }));
    expect(res.status).toBe(400);
    expect(db.writes).toHaveLength(0);
  });
});

describe("parseCitaTag", () => {
  it("extrae los datos cuando el tag viene completo", async () => {
    const { parseCitaTag } = await import("@/lib/citas");
    const reply = `Listo, ya quedó agendada. [CITA|propiedad=${PROP}|nombre=Ana López|telefono=9991234567|correo=ana@x.com|fecha1=2027-01-10|hora1=11:00]`;
    const { clean, data } = parseCitaTag(reply);
    expect(clean).toBe("Listo, ya quedó agendada.");
    expect(data).toEqual({
      propertyId: PROP, clientName: "Ana López", clientPhone: "9991234567",
      clientEmail: "ana@x.com", options: [{ date: "2027-01-10", time: "11:00" }],
    });
  });

  it("junta hasta 3 opciones de horario", async () => {
    const { parseCitaTag } = await import("@/lib/citas");
    const reply = `[CITA|propiedad=${PROP}|nombre=Ana López|telefono=9991234567|fecha1=2027-01-10|hora1=11:00|fecha2=2027-01-11|hora2=12:00]`;
    expect(parseCitaTag(reply).data?.options).toHaveLength(2);
  });

  it("no hace nada si no hay tag", async () => {
    const { parseCitaTag } = await import("@/lib/citas");
    const { clean, data } = parseCitaTag("Claro, ¿qué tipo de propiedad busca?");
    expect(data).toBeNull();
    expect(clean).toBe("Claro, ¿qué tipo de propiedad busca?");
  });

  it("no crea la cita si falta el teléfono o la propiedad no es un id válido", async () => {
    const { parseCitaTag } = await import("@/lib/citas");
    expect(parseCitaTag(`[CITA|propiedad=${PROP}|nombre=Ana|fecha1=2027-01-10|hora1=11:00]`).data).toBeNull();
    expect(parseCitaTag(`[CITA|propiedad=no-es-un-id|nombre=Ana|telefono=9991234567|fecha1=2027-01-10|hora1=11:00]`).data).toBeNull();
  });
});
