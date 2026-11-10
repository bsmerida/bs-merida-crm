// Supabase simulado para probar rutas sin red ni base de datos.
// Cada tabla tiene filas fijas; las operaciones de escritura quedan registradas.

type Row = Record<string, any>;
export type FakeDb = ReturnType<typeof createFakeDb>;

export function createFakeDb(tables: Record<string, Row[]> = {}) {
  const writes: { table: string; op: string; payload?: unknown; options?: any; filters: [string, unknown][] }[] = [];
  let nextId = 1;

  function from(table: string) {
    const filters: [string, unknown][] = [];
    let op = "select";
    let payload: unknown;
    let options: any;
    const rows = () => (tables[table] || []).filter(r => filters.every(([k, v]) => r[k] === v));
    const result = () => {
      if (op === "select") return { data: rows(), error: null, count: rows().length };
      writes.push({ table, op, payload, options, filters: [...filters] });
      // insert/upsert devuelven las filas escritas con un id simulado
      const written = op === "insert" || op === "upsert"
        ? (Array.isArray(payload) ? payload : [payload]).map((r: any) => ({ id: `id-${nextId++}`, ...r }))
        : null;
      return { data: written, error: null, count: 0 };
    };
    const q: any = {
      select: () => q,
      insert: (p: unknown) => { op = "insert"; payload = p; return q; },
      update: (p: unknown) => { op = "update"; payload = p; return q; },
      upsert: (p: unknown, o?: unknown) => { op = "upsert"; payload = p; options = o; return q; },
      delete: () => { op = "delete"; return q; },
      eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
      in: () => q, is: () => q, not: () => q, neq: () => q, gte: () => q, lt: () => q, order: () => q, limit: () => q,
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
