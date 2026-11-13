import { describe, expect, it } from "vitest";
import { fotosPorPropiedad } from "@/lib/fotos";

// BD simulada que respeta .in(), .range() y el tope de 1000 filas de Supabase,
// y falla si se piden demasiados ids juntos (como la URL larga real).
function fakeDb(rows: { id: number; property_id: string; url: string; position: number; is_cover: boolean }[]) {
  const consultas: { ids: number; desde: number }[] = [];
  return {
    consultas,
    from: () => {
      let ids: string[] = []; let desde = 0; let hasta = 999;
      const q: any = {
        select: () => q, order: () => q,
        in: (_: string, v: string[]) => { ids = v; return q; },
        range: (a: number, b: number) => { desde = a; hasta = b; return q; },
        then: (ok: any) => {
          consultas.push({ ids: ids.length, desde });
          if (ids.length > 100) return Promise.resolve({ data: null, error: { message: "fetch failed" } }).then(ok);
          const filtradas = rows.filter(r => ids.includes(r.property_id))
            .sort((a, b) => a.property_id.localeCompare(b.property_id) || a.position - b.position || a.id - b.id);
          return Promise.resolve({ data: filtradas.slice(desde, Math.min(hasta + 1, desde + 1000)), error: null }).then(ok);
        },
      };
      return q;
    },
  };
}

describe("fotosPorPropiedad", () => {
  it("con 408 propiedades y 17 fotos cada una, todas reciben sus fotos", async () => {
    const ids = Array.from({ length: 408 }, (_, i) => `p${String(i).padStart(3, "0")}`);
    let n = 0;
    const rows = ids.flatMap(pid => Array.from({ length: 17 }, (_, pos) => ({ id: n++, property_id: pid, url: `${pid}-${pos}`, position: pos, is_cover: pos === 3 })));
    const db = fakeDb(rows);
    const fotos = await fotosPorPropiedad(db as any, ids);
    expect(Object.keys(fotos)).toHaveLength(408);
    // Máximo 5, la portada primero y luego por posición
    expect(fotos.p000).toEqual(["p000-3", "p000-0", "p000-1", "p000-2", "p000-4"]);
    expect(fotos.p407).toHaveLength(5);
    // Ningún lote pidió demasiados ids
    expect(Math.max(...db.consultas.map(c => c.ids))).toBeLessThanOrEqual(50);
  });

  it("pagina cuando un lote tiene más de 1000 fotos", async () => {
    let n = 0;
    const rows = ["a", "b"].flatMap(pid => Array.from({ length: 700 }, (_, pos) => ({ id: n++, property_id: pid, url: `${pid}-${pos}`, position: pos, is_cover: false })));
    const db = fakeDb(rows);
    const fotos = await fotosPorPropiedad(db as any, ["a", "b"], 2);
    expect(fotos.b).toEqual(["b-0", "b-1"]);
    expect(db.consultas.map(c => c.desde)).toEqual([0, 1000]);
  });

  it("sin propiedades no consulta nada", async () => {
    const db = fakeDb([]);
    expect(await fotosPorPropiedad(db as any, [])).toEqual({});
    expect(db.consultas).toHaveLength(0);
  });
});
