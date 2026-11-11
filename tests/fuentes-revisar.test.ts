import { describe, expect, it } from "vitest";
import { arbolCarpetas, compararInventario, dentroDe, firmaArchivos } from "../scripts/fuentes/lib/inventario.mjs";
import {
  driveFolderId, dropboxArg, dropboxSharedUrl, listarDrive, listarDropbox, segmento,
} from "../scripts/fuentes/lib/plataformas.mjs";

const f = (id: string, extra: Record<string, unknown> = {}) => ({
  archivo_id: id, nombre: `${id}.pdf`, ruta: "Kinora", modificado: "2026-11-01T10:00:00Z", tamano: 100, ...extra,
});

describe("compararInventario", () => {
  it("la primera revisión carga el inventario base sin generar cambios", () => {
    const r = compararInventario([], [f("a"), f("b")], { baseCargada: false });
    expect(r.filas).toHaveLength(2);
    expect(r.cambios).toEqual([]);
  });

  it("detecta nuevos, modificados (fecha o tamaño) y eliminados", () => {
    const previos = [f("a"), f("b"), f("c"), f("d")];
    const actuales = [f("a"), f("b", { modificado: "2026-11-09T10:00:00Z" }), f("c", { tamano: 999 }), f("e")];
    const r = compararInventario(previos, actuales, { baseCargada: true });
    expect(r.cambios!.map((c: any) => `${c.tipo}:${c.archivo_id}`).sort())
      .toEqual(["Eliminado:d", "Modificado:b", "Modificado:c", "Nuevo:e"]);
    expect(r.eliminados).toEqual(["d"]);
  });

  it("un archivo que reaparece cuenta como nuevo y no se vuelve a marcar eliminado", () => {
    const previos = [f("a"), f("b", { eliminado_en: "2026-11-01" })];
    const r = compararInventario(previos, [f("a"), f("b")], { baseCargada: true });
    expect(r.cambios).toEqual([expect.objectContaining({ tipo: "Nuevo", archivo_id: "b" })]);
    expect(r.filas!.find((x: any) => x.archivo_id === "b").eliminado_en).toBeNull();
  });

  it("si la carpeta aparece vacía no marca nada como eliminado (probable falta de acceso)", () => {
    const r = compararInventario([f("a")], [], { baseCargada: true });
    expect(r.error).toMatch(/vacía o sin acceso/);
  });

  it("si desaparece casi todo de golpe, se detiene en vez de marcar eliminados", () => {
    const previos = Array.from({ length: 30 }, (_, i) => f(`x${i}`));
    const r = compararInventario(previos, [f("x0")], { baseCargada: true });
    expect(r.error).toMatch(/Desaparecieron 29 de 30/);
  });

  it("ignora archivos repetidos (atajos)", () => {
    const r = compararInventario([], [f("a"), f("a")], { baseCargada: true });
    expect(r.filas).toHaveLength(1);
  });
});

describe("firma y árbol", () => {
  it("la firma cambia solo si cambian los archivos", () => {
    const a = firmaArchivos([f("a"), f("b")]);
    expect(firmaArchivos([f("b"), f("a")])).toBe(a);
    expect(firmaArchivos([f("a"), f("b", { tamano: 5 })])).not.toBe(a);
  });
  it("dentroDe incluye subcarpetas pero no carpetas con nombre parecido", () => {
    const archivos = [f("1", { ruta: "Kinora" }), f("2", { ruta: "Kinora/Renders" }), f("3", { ruta: "Kinora Plaza" })];
    expect(dentroDe(archivos, "Kinora").map((x: any) => x.archivo_id)).toEqual(["1", "2"]);
  });
  it("arma el árbol de carpetas con conteos", () => {
    const txt = arbolCarpetas([f("1", { ruta: "A/B" }), f("2", { ruta: "A" })]);
    expect(txt).toContain("A/  (2 archivos)");
    expect(txt).toContain("  B/  (1 archivos)  ⟶ A/B");
  });
});

describe("enlaces", () => {
  it("saca el id de la carpeta de Drive", () => {
    expect(driveFolderId("https://drive.google.com/drive/folders/1M_zyLjMDGoaHsk1IA6Y5Q7AHtyi86Z3L?usp=drive_link"))
      .toBe("1M_zyLjMDGoaHsk1IA6Y5Q7AHtyi86Z3L");
    expect(() => driveFolderId("https://drive.google.com/file/d/abc/view")).toThrow();
  });
  it("conserva el rlkey de Dropbox y quita el rastreo", () => {
    expect(dropboxSharedUrl("https://www.dropbox.com/scl/fo/abc/HASH?rlkey=k1&st=xyz&dl=0"))
      .toBe("https://www.dropbox.com/scl/fo/abc/HASH?rlkey=k1");
  });
  it("escapa acentos para el encabezado de Dropbox", () => {
    expect(dropboxArg({ path: "/Ábita" })).toBe('{"path":"/\\u00c1bita"}');
  });
  it("las diagonales dentro de un nombre de carpeta no rompen la ruta", () => {
    expect(segmento("ROSAMORA / CASAS / CONKAL")).toBe("ROSAMORA ／ CASAS ／ CONKAL");
  });
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("listarDrive", () => {
  it("recorre subcarpetas y sigue atajos a carpetas, solo con lecturas GET", async () => {
    const llamadas: { url: string; method?: string }[] = [];
    const contenido: Record<string, any[]> = {
      root: [
        { id: "sub", name: "Renders / Fotos", mimeType: "application/vnd.google-apps.folder" },
        { id: "p1", name: "Lista.pdf", mimeType: "application/pdf", modifiedTime: "2026-11-01T00:00:00Z", size: "10" },
        { id: "sc", name: "Atajo", mimeType: "application/vnd.google-apps.shortcut", shortcutDetails: { targetId: "sub2", targetMimeType: "application/vnd.google-apps.folder" } },
      ],
      sub: [{ id: "i1", name: "render.jpg", mimeType: "image/jpeg" }],
      sub2: [{ id: "i2", name: "foto.jpg", mimeType: "image/jpeg" }],
    };
    const fetchImpl = async (url: string, init?: RequestInit) => {
      llamadas.push({ url, method: init?.method });
      const parent = new URL(url).searchParams.get("q")!.match(/'([^']+)' in parents/)![1];
      return json({ files: contenido[parent] || [] });
    };
    const archivos = await listarDrive("root", "KEY", { fetchImpl: fetchImpl as any });
    expect(archivos.map(a => `${a.ruta}|${a.nombre}`).sort()).toEqual(["Atajo|foto.jpg", "Renders ／ Fotos|render.jpg", "|Lista.pdf"].sort());
    expect(llamadas.every(l => !l.method || l.method === "GET")).toBe(true);
  });

  it("explica cuando la carpeta no es pública", async () => {
    const fetchImpl = async () => json({ error: { message: "File not found" } }, 404);
    await expect(listarDrive("x", "KEY", { fetchImpl: fetchImpl as any })).rejects.toThrow(/sin acceso público/);
  });
});

describe("listarDropbox", () => {
  it("recorre carpeta por carpeta (Dropbox no permite recursive con enlaces) y pagina", async () => {
    const fetchImpl = async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (url.endsWith("/continue")) return json({ entries: [{ ".tag": "file", id: "id:3", name: "c.pdf", size: 3 }], has_more: false });
      if (body.path === "") return json({ entries: [{ ".tag": "folder", name: "Ábita" }, { ".tag": "file", id: "id:1", name: "a.pdf", size: 1 }], has_more: true, cursor: "c1" });
      if (body.path === "/Ábita") return json({ entries: [{ ".tag": "file", id: "id:2", name: "b.jpg", size: 2, server_modified: "2026-11-01T00:00:00Z" }], has_more: false });
      throw new Error(`ruta inesperada ${body.path}`);
    };
    const archivos = await listarDropbox("https://www.dropbox.com/scl/fo/x/y?rlkey=k", "TOKEN", { fetchImpl: fetchImpl as any });
    expect(archivos.map(a => `${a.ruta}|${a.nombre}|${a.mime}`)).toEqual(["|a.pdf|application/pdf", "|c.pdf|application/pdf", "Ábita|b.jpg|image/jpeg"]);
  });
});
