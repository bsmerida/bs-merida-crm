// Supabase simulado para probar rutas sin red ni base de datos.
// Cada tabla tiene filas fijas; las operaciones de escritura quedan registradas.

type Row = Record<string, any>;
export type FakeDb = ReturnType<typeof createFakeDb>;

export function createFakeDb(tables: Record<string, Row[]> = {}) {
  const writes: { table: string; op: string; payload?: unknown; options?: any; filters: [string, unknown][] }[] = [];
  let nextId = 1;

  function from(table: string) {
    const filters: [string, unknown][] = [];
    // Predicados de comparación/patrón (gte, lte, ilike, in...): aparte de
    // `filters` para no romper los tests que ya revisan `.filters` como
    // tuplas [clave, valor] de los `.eq()`.
    const extra: ((r: Row) => boolean)[] = [];
    let op = "select";
    let payload: unknown;
    let options: any;
    const likeToRegex = (pattern: string) =>
      new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`, "i");
    const rows = () => (tables[table] || [])
      .filter(r => filters.every(([k, v]) => r[k] === v))
      .filter(r => extra.every(fn => fn(r)));
    const result = () => {
      if (op === "select") return { data: rows(), error: null, count: rows().length };
      writes.push({ table, op, payload, options, filters: [...filters] });
      // insert/upsert devuelven las filas escritas con un id simulado
      // update devuelve las filas que cumplen los filtros (como .update().eq().select())
      const written = op === "insert" || op === "upsert"
        ? (Array.isArray(payload) ? payload : [payload]).map((r: any) => ({ id: `id-${nextId++}`, ...r }))
        : op === "update" ? rows().map(r => ({ ...r, ...(payload as Row) })) : null;
      return { data: written, error: null, count: 0 };
    };
    const q: any = {
      select: () => q,
      insert: (p: unknown) => { op = "insert"; payload = p; return q; },
      update: (p: unknown) => { op = "update"; payload = p; return q; },
      upsert: (p: unknown, o?: unknown) => { op = "upsert"; payload = p; options = o; return q; },
      delete: () => { op = "delete"; return q; },
      eq:    (k: string, v: unknown) => { filters.push([k, v]); return q; },
      in:    (k: string, v: unknown[]) => { extra.push(r => v.includes(r[k])); return q; },
      ilike: (k: string, pattern: string) => { const re = likeToRegex(pattern); extra.push(r => typeof r[k] === "string" && re.test(r[k])); return q; },
      like:  (k: string, pattern: string) => { const re = likeToRegex(pattern); extra.push(r => typeof r[k] === "string" && re.test(r[k])); return q; },
      gte:   (k: string, v: any) => { extra.push(r => r[k] >= v); return q; },
      lte:   (k: string, v: any) => { extra.push(r => r[k] <= v); return q; },
      lt:    (k: string, v: any) => { extra.push(r => r[k] < v); return q; },
      neq:   (k: string, v: unknown) => { extra.push(r => r[k] !== v); return q; },
      is: () => q, not: () => q, order: () => q, limit: () => q,
      single: async () => { const r = result(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; },
      maybeSingle: async () => { const r = result(); return { ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }; },
      then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(result()).then(ok, ko),
    };
    return q;
  }

  return { from, writes };
}

// Cliente "de sesión": devuelve el usuario indicado (o ninguno) y lee profiles de la misma BD.
export function createFakeSessionClient(db: FakeDb, userId: string | null) {
  return {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null } }),
      signOut: async () => ({}),
    },
    from: db.from,
  };
}
