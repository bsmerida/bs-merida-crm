import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { enlaceFuente, leerExcelFuentes, nombrePropio, sincronizarFuentes } from "../scripts/fuentes/lib/excel.mjs";
import { descargarHojaDrive } from "../scripts/fuentes/lib/plataformas.mjs";
import { createFakeDb } from "./helpers/fake-supabase";

const XLSX = createRequire(import.meta.url)("xlsx");

const DRIVE = (id: string) => `https://drive.google.com/drive/folders/${id}?usp=sharing`;
const ENCABEZADOS = ["ID proveedor", "Máster / proveedor *", "Constructor", "Desarrollo / alcance", "Plataforma",
  "Carpeta original *", "Contacto proveedor", "Última revisión", "Estado de fuente", "Notas de revisión",
  "Organización de la fuente", "Ruta interna / subcarpeta"];

function excel(filas: unknown[][]) {
  const hoja = XLSX.utils.aoa_to_sheet([["PROVEEDORES Y FUENTES"], [], ENCABEZADOS, ...filas]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hoja, "Hoja1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const fila = (id: string, proveedor: string, url: string, extra: Partial<Record<string, string | number>> = {}) =>
  [id, proveedor, "VARIOS", extra.alcance ?? "", "DRIVE", url, extra.contacto ?? "", "", "", extra.notas ?? "", extra.responsable ?? "", extra.ruta ?? ""];

describe("leerExcelFuentes", () => {
  it("lee las filas por nombre de columna, limpia enlaces y salta las filas vacías", () => {
    const { filas, omitidas } = leerExcelFuentes(excel([
      fila("F-0001", "CONCEPTO MASTER BROKER",
        "https://www.dropbox.com/scl/fo/abc/XYZ?rlkey=k1&st=tmp&dl=0", { alcance: "TERRENOS", responsable: "ROSY" }),
      fila("F-0013", "SIMCA", "https://drive.google.com/drive/u/0/folders/1P7g27CHiEvYHOwVwyK51Ve5QzAveX49o",
        { contacto: 9992505416, responsable: "AZAEL/ABRAHAM", ruta: "Ventas" }),
      fila("F-0014", "MALO", "https://docs.google.com/document/d/123"),
      ["F-0022", "", "", "", "", "", "", "", "", "", "", ""],
    ]));
    expect(filas).toEqual([
      expect.objectContaining({ id: "F-0001", proveedor: "Concepto Master Broker", alcance: "Terrenos", plataforma: "Dropbox",
        url: "https://www.dropbox.com/scl/fo/abc/XYZ?rlkey=k1&dl=0", responsable: "Rosy" }),
      expect.objectContaining({ id: "F-0013", proveedor: "Simca", plataforma: "Google Drive",
        url: "https://drive.google.com/drive/folders/1P7g27CHiEvYHOwVwyK51Ve5QzAveX49o",
        contacto: "9992505416", responsable: "Azael/Abraham", notas: "Subcarpeta: Ventas" }),
    ]);
    expect(omitidas).toEqual([{ id: "F-0014", motivo: expect.stringMatching(/no es una carpeta/) }]);
  });

  it("falla con un mensaje claro si el Excel cambió de formato", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["otra cosa"]]), "Hoja1");
    expect(() => leerExcelFuentes(XLSX.write(wb, { type: "buffer", bookType: "xlsx" })))
      .toThrow(/No encontré la tabla de fuentes/);
  });

  it("nombres propios respetan siglas y conectores", () => {
    expect(nombrePropio("AQ  PROYECTOS")).toBe("AQ Proyectos");
    expect(nombrePropio("CASAS Y TOWN HOUSE")).toBe("Casas y Town House");
    expect(enlaceFuente("https://ejemplo.com/x")).toBeNull();
  });
});

describe("sincronizarFuentes", () => {
  const existentes = [
    { id: "F-0006", plataforma: "Google Drive", url: "https://drive.google.com/drive/folders/1vjvzGhvxh_Dk-HFWBPMwXU0XZJtlyOTw", agente_activo: true },
  ];

  it("agrega solo los ID nuevos, apagados, y nunca toca los existentes", async () => {
    const db = createFakeDb({ fuentes: existentes });
    const r = await sincronizarFuentes(db, leerExcelFuentes(excel([
      fila("F-0006", "OTRO NOMBRE", DRIVE("1vjvzGhvxh_Dk-HFWBPMwXU0XZJtlyOTw")),
      fila("F-0016", "ENALTO", DRIVE("1_1UBMmEwXAagQyBwkGw7qnzPv919Wu74")),
    ])));
    expect(r.agregadas).toEqual(["F-0016"]);
    expect(db.writes).toHaveLength(1);
    expect(db.writes[0]).toMatchObject({ table: "fuentes", op: "insert",
      payload: [expect.objectContaining({ id: "F-0016", proveedor: "Enalto", agente_activo: false })] });
  });

  it("no duplica una carpeta que ya está registrada con otro ID", async () => {
    const db = createFakeDb({ fuentes: existentes });
    const r = await sincronizarFuentes(db, leerExcelFuentes(excel([
      fila("F-0015", "MELD MMB", "https://drive.google.com/drive/folders/1vjvzGhvxh_Dk-HFWBPMwXU0XZJtlyOTw?hl=es-419"),
    ])));
    expect(r.agregadas).toEqual([]);
    expect(r.omitidas).toEqual([{ id: "F-0015", motivo: "misma carpeta que F-0006" }]);
    expect(db.writes).toHaveLength(0);
  });
});

describe("descargarHojaDrive", () => {
  const respuesta = (cuerpo: unknown) => ({ ok: true, status: 200, json: async () => cuerpo, arrayBuffer: async () => new ArrayBuffer(4) });

  it("descarga el .xlsx subido tal cual y exporta las Hojas de Google a .xlsx", async () => {
    for (const [mime, esperado] of [
      ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", /\/ABCDEFGHIJ1\?alt=media/],
      ["application/vnd.google-apps.spreadsheet", /\/ABCDEFGHIJ1\/export\?mimeType=/],
    ] as const) {
      const urls: string[] = [];
      const fetchImpl: any = async (u: string) => { urls.push(u); return respuesta({ mimeType: mime }) as any; };
      await descargarHojaDrive("https://docs.google.com/spreadsheets/d/ABCDEFGHIJ1/edit?usp=sharing", "k", { fetchImpl });
      expect(urls[1]).toMatch(esperado);
    }
  });
});
