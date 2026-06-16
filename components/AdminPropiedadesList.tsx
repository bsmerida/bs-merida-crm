"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { fmtMXN } from "@/lib/utils";
import { Icon } from "@/components/Icon";

type Prop = {
  id: string; title: string; type: string; operation: string; status: string;
  price: number; zone: string | null; city: string; reference: string | null;
  development: string | null; agent?: { full_name: string | null } | null;
  cover?: string | null;
  views_count?: number; inquiries_count?: number;
};

const STATUS_COLORS: Record<string, string> = {
  Disponible: "bg-emerald-50 text-emerald-700",
  Reservada:  "bg-amber-50 text-amber-700",
  Vendida:    "bg-red-50 text-red-700",
  Rentada:    "bg-blue-50 text-blue-700",
  Pausada:    "bg-ink-ghost text-ink-muted",
};

type SortKey = "reciente" | "precio_asc" | "precio_desc" | "vistas";

export function AdminPropiedadesList({ props }: { props: Prop[] }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Todos los tipos");
  const [filterOp, setFilterOp] = useState("Venta y renta");
  const [filterStatus, setFilterStatus] = useState("Todos los estados");
  const [filterZone, setFilterZone] = useState("Todas las zonas");
  const [sortBy, setSortBy] = useState<SortKey>("reciente");

  const types = ["Todos los tipos", ...Array.from(new Set(props.map(p => p.type)))];
  const statuses = ["Todos los estados", ...Array.from(new Set(props.map(p => p.status)))];
  const zones = ["Todas las zonas", ...Array.from(new Set(props.map(p => p.zone || p.city).filter(Boolean)))];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = props.filter(p => {
      const matchSearch = !q ||
        p.title.toLowerCase().includes(q) ||
        (p.reference || "").toLowerCase().includes(q) ||
        (p.zone || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.development || "").toLowerCase().includes(q);
      const matchType = filterType === "Todos los tipos" || p.type === filterType;
      const matchOp = filterOp === "Venta y renta" || p.operation === filterOp;
      const matchStatus = filterStatus === "Todos los estados" || p.status === filterStatus;
      const matchZone = filterZone === "Todas las zonas" || p.zone === filterZone || p.city === filterZone;
      return matchSearch && matchType && matchOp && matchStatus && matchZone;
    });

    // Ordenar
    if (sortBy === "precio_asc") result = [...result].sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === "precio_desc") result = [...result].sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === "vistas") result = [...result].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));

    return result;
  }, [props, search, filterType, filterOp, filterStatus, filterZone, sortBy]);

  const hasFilters = search || filterType !== "Todos los tipos" || filterOp !== "Venta y renta" || filterStatus !== "Todos los estados" || filterZone !== "Todas las zonas";

  const clearFilters = () => {
    setSearch(""); setFilterType("Todos los tipos"); setFilterOp("Venta y renta");
    setFilterStatus("Todos los estados"); setFilterZone("Todas las zonas");
  };

  const sel = "bg-white border border-ink-line rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-brand-300 cursor-pointer";

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código, zona, desarrollador..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-ink-line rounded-full text-sm focus:outline-none focus:border-brand-300" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={sel}>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterOp} onChange={e => setFilterOp(e.target.value)} className={sel}>
          {["Venta y renta", "Venta", "Renta"].map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={sel}>
          {statuses.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterZone} onChange={e => setFilterZone(e.target.value)} className={sel}>
          {zones.map(z => <option key={z}>{z}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className={sel}>
          <option value="reciente">Más recientes</option>
          <option value="precio_desc">Mayor precio</option>
          <option value="precio_asc">Menor precio</option>
          <option value="vistas">Más vistas</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters}
            className="text-xs text-ink-muted hover:text-ink border border-ink-line rounded-full px-3 py-2 bg-white">
            Limpiar ×
          </button>
        )}
      </div>

      <div className="text-xs text-ink-muted px-1">{filtered.length} de {props.length} propiedades</div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-ink-line p-12 text-center text-sm text-ink-muted">
          Sin resultados para esa búsqueda.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-ink-line bg-ink-ghost/40">
              <tr>
                {["", "Propiedad", "Tipo", "Precio", "Estado", "Estadísticas", "Asesor", ""].map((h, i) => (
                  <th key={i} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-ink-line last:border-0 hover:bg-ink-ghost/30">
                  {/* Thumbnail */}
                  <td className="pl-4 pr-2 py-3 w-16">
                    <div className="w-14 h-10 rounded-lg overflow-hidden bg-brand-50 flex items-center justify-center">
                      {p.cover
                        ? <img src={p.cover} alt="" className="w-full h-full object-cover" />
                        : <span className="text-base">🏠</span>}
                    </div>
                  </td>
                  {/* Título + código + zona */}
                  <td className="px-3 py-3 max-w-[220px]">
                    <div className="font-medium text-sm text-ink leading-tight truncate">{p.title}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {p.reference && (
                        <span className="text-[10px] font-mono bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded">{p.reference}</span>
                      )}
                      <span className="text-xs text-ink-muted">{p.zone || p.city}</span>
                    </div>
                    {p.development && <div className="text-[10px] text-ink-soft mt-0.5">{p.development}</div>}
                  </td>
                  <td className="px-3 py-3 text-sm text-ink">
                    {p.type}
                    <div className="text-xs text-ink-muted">{p.operation}</div>
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-ink whitespace-nowrap">
                    {fmtMXN(Number(p.price))}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[p.status] || "bg-ink-ghost text-ink-muted"}`}>
                      {p.status}
                    </span>
                  </td>
                  {/* Estadísticas */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3 text-xs text-ink-muted">
                      <span title="Vistas">👁 {p.views_count || 0}</span>
                      <span title="Solicitudes">✉️ {p.inquiries_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-ink-muted">{p.agent?.full_name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/propiedades/${p.id}`} className="text-xs text-brand-600 hover:underline whitespace-nowrap">
                      Editar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
