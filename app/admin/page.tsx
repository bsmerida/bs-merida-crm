import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtMXN } from "@/lib/utils";
import { Icon } from "@/components/Icon";

const ESTADOS_FUNNEL = [
  "Nuevo", "Contactado", "Calificado", "Visita agendada",
  "Visita realizada", "Oferta", "Negociación", "Cerrado ganado",
];

export default async function AdminDashboard() {
  const supabase = createClient();
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
  const inicioMesIso = inicioMes.toISOString();

  const [
    { data: leadsAll },
    { data: propsAll },
    { data: opsAll },
    { data: visitsProx },
    { data: agentes },
  ] = await Promise.all([
    supabase.from("leads").select("id, status, source, agent_id, created_at, name"),
    supabase.from("properties").select("id, price, status"),
    supabase.from("operations").select("id, value, commission, agent_id, stage, closed_at, created_at"),
    supabase.from("visits")
      .select("id, scheduled_at, status, lead:leads(name), property:properties(title), agent:profiles(full_name)")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at")
      .limit(5),
    supabase.from("profiles").select("id, full_name, initials, role").eq("active", true),
  ]);

  const leads = leadsAll || [];
  const props = propsAll || [];
  const ops = opsAll || [];
  const visits = visitsProx || [];
  const agentList = agentes || [];

  // Stats
  const leadsActivos = leads.filter(l => !["Cerrado ganado", "Cerrado perdido"].includes(l.status)).length;
  const propsDisponibles = props.filter(p => p.status === "Disponible").length;
  const valorInventario = props.filter(p => p.status === "Disponible").reduce((a, p) => a + Number(p.price), 0);
  const opsCerradasMes = ops.filter(o => o.stage === "Cerrada ganada" && o.closed_at && new Date(o.closed_at) >= inicioMes);
  const comisionesMes = opsCerradasMes.reduce((a, o) => a + Number(o.commission || 0), 0);
  const valorPipeline = ops.filter(o => !["Cerrada ganada", "Cerrada perdida"].includes(o.stage)).reduce((a, o) => a + Number(o.value || 0), 0);

  // Funnel
  const funnelTotal = leads.length || 1;
  const funnel = ESTADOS_FUNNEL.map(estado => {
    const reachedThisOrFurther = leads.filter(l => {
      const idx = ESTADOS_FUNNEL.indexOf(l.status);
      return idx >= ESTADOS_FUNNEL.indexOf(estado);
    }).length;
    return { estado, count: reachedThisOrFurther, pct: Math.round((reachedThisOrFurther / funnelTotal) * 100) };
  });

  // Origen de leads
  const sources = new Map<string, number>();
  leads.forEach(l => {
    const k = l.source || "Sin origen";
    sources.set(k, (sources.get(k) || 0) + 1);
  });
  const origenes = Array.from(sources.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxOrigen = origenes[0]?.[1] || 1;

  // Ranking agentes
  const ranking = agentList.map(a => {
    const myLeads = leads.filter(l => l.agent_id === a.id).length;
    const myOps = ops.filter(o => o.agent_id === a.id && o.stage === "Cerrada ganada").length;
    const myCom = ops.filter(o => o.agent_id === a.id && o.closed_at && new Date(o.closed_at) >= inicioMes)
                     .reduce((s, o) => s + Number(o.commission || 0), 0);
    return { ...a, leads: myLeads, ops: myOps, comision: myCom };
  }).sort((a, b) => b.comision - a.comision).slice(0, 5);

  // Ventas últimos 6 meses
  const ahora = new Date();
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1);
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const opsDeMes = ops.filter(o => o.closed_at && new Date(o.closed_at) >= d && new Date(o.closed_at) <= fin && o.stage === "Cerrada ganada");
    return {
      mes: d.toLocaleDateString("es-MX", { month: "short" }),
      val: opsDeMes.reduce((a, o) => a + Number(o.value || 0), 0),
      ops: opsDeMes.length,
    };
  });
  const maxMes = Math.max(...meses.map(m => m.val), 1);

  return (
    <div className="p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">Inicio</h1>
        <p className="text-sm text-ink-muted mt-0.5">Resumen de la operación · {ahora.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-ink-line p-6 shadow-card">
          <div className="text-[13px] text-ink-muted">Clientes activos</div>
          <div className="text-3xl font-semibold tracking-tight mt-2 text-ink">{leadsActivos}</div>
          <Link href="/admin/leads" className="text-xs text-brand-600 hover:underline mt-3 inline-block">Ver clientes →</Link>
        </div>
        <div className="bg-white rounded-2xl border border-ink-line p-6 shadow-card">
          <div className="text-[13px] text-ink-muted">Propiedades disponibles</div>
          <div className="text-3xl font-semibold tracking-tight mt-2 text-ink">{propsDisponibles}</div>
          <div className="text-xs text-ink-muted mt-3">{fmtMXN(valorInventario)} en inventario</div>
        </div>
        <div className="bg-white rounded-2xl border border-ink-line p-6 shadow-card">
          <div className="text-[13px] text-ink-muted">Pipeline en curso</div>
          <div className="text-3xl font-semibold tracking-tight mt-2 text-brand-600">{fmtMXN(valorPipeline)}</div>
          <div className="text-xs text-ink-muted mt-3">{ops.filter(o => !["Cerrada ganada","Cerrada perdida"].includes(o.stage)).length} operaciones abiertas</div>
        </div>
        <div className="bg-white rounded-2xl border border-ink-line p-6 shadow-card">
          <div className="text-[13px] text-ink-muted">Comisiones del mes</div>
          <div className="text-3xl font-semibold tracking-tight mt-2 text-ink">{fmtMXN(comisionesMes)}</div>
          <div className="text-xs text-ink-muted mt-3">{opsCerradasMes.length} operaciones cerradas</div>
        </div>
      </div>

      {/* Funnel + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-ink-line shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-ink">Embudo de conversión</h3>
            <span className="text-xs text-ink-muted">Total: {leads.length} clientes</span>
          </div>
          {leads.length === 0 ? (
            <div className="text-sm text-ink-muted text-center py-12">Aún no hay clientes registrados.</div>
          ) : (
            <div className="space-y-4">
              {funnel.map(s => (
                <div key={s.estado}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-ink">{s.estado}</span>
                    <span className="text-ink-muted"><span className="text-ink font-medium">{s.count}</span> · {s.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-ink-ghost rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${s.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
          <h3 className="font-semibold text-ink mb-5">Equipo</h3>
          {ranking.length === 0 ? (
            <div className="text-sm text-ink-muted text-center py-8">Sin asesores activos</div>
          ) : (
            <div className="space-y-5">
              {ranking.map(a => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                    {a.initials || a.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-ink truncate">{a.full_name}</div>
                    <div className="text-xs text-ink-muted">{a.leads} clientes · {a.ops} ops</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-ink">{fmtMXN(a.comision)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gráfico de ventas mensual */}
      <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
        <h3 className="font-semibold text-ink mb-6">Ventas cerradas (últimos 6 meses)</h3>
        <div className="flex items-end justify-between gap-3 h-56">
          {meses.map(m => (
            <div key={m.mes} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs text-ink-muted">{m.val > 0 ? `${(m.val / 1_000_000).toFixed(1)}M` : "—"}</div>
              <div className="w-full bg-brand-500 rounded-t-lg relative" style={{ height: `${(m.val / maxMes) * 100}%`, minHeight: m.val > 0 ? "8px" : "2px" }}>
                {m.ops > 0 && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-ink">{m.ops}</div>}
              </div>
              <div className="text-xs text-ink-muted font-medium capitalize">{m.mes}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-ink-muted mt-4 text-center">El número arriba de cada barra es la cantidad de operaciones cerradas en ese mes</div>
      </div>

      {/* Origen de leads + Próximas visitas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
          <h3 className="font-semibold text-ink mb-5">Origen de clientes</h3>
          {origenes.length === 0 ? (
            <div className="text-sm text-ink-muted text-center py-8">Sin clientes registrados</div>
          ) : (
            <div className="space-y-3">
              {origenes.map(([fuente, count]) => (
                <div key={fuente} className="flex items-center gap-3 text-sm">
                  <span className="w-32 text-ink truncate">{fuente}</span>
                  <div className="flex-1 h-1.5 bg-ink-ghost rounded-full overflow-hidden">
                    <div className="h-full bg-brand-400 rounded-full" style={{ width: `${(count / maxOrigen) * 100}%` }}></div>
                  </div>
                  <span className="text-ink font-medium w-8 text-right text-sm">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
          <h3 className="font-semibold text-ink mb-5">Próximas visitas</h3>
          {visits.length === 0 ? (
            <div className="text-sm text-ink-muted text-center py-8">Sin visitas agendadas</div>
          ) : (
            <div className="space-y-1">
              {visits.map((v: any) => {
                const fecha = new Date(v.scheduled_at);
                return (
                  <div key={v.id} className="flex items-center gap-4 py-3 border-b border-ink-line last:border-0">
                    <div className="w-14 text-center">
                      <div className="text-[11px] text-ink-muted uppercase tracking-wide">{fecha.toLocaleDateString("es-MX", { month: "short", day: "numeric" })}</div>
                      <div className="text-sm font-semibold text-ink">{fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{v.lead?.name || "Sin cliente"}</div>
                      <div className="text-xs text-ink-muted truncate">{v.property?.title || "Sin propiedad"} · {v.agent?.full_name || "Sin asesor"}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${v.status === "Confirmada" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{v.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Últimos clientes */}
      <div className="bg-white rounded-2xl border border-ink-line shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-ink-line flex items-center justify-between">
          <h3 className="font-semibold text-ink">Últimos clientes recibidos</h3>
          <Link href="/admin/leads" className="text-xs text-brand-600 hover:underline">Ver todos</Link>
        </div>
        {leads.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            No hay clientes registrados todavía. Los que lleguen del sitio web o el chatbot aparecerán aquí.
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-ink-line">
              <tr>{["Cliente", "Origen", "Estado", "Recibido"].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-ink-muted uppercase tracking-wide px-6 py-3.5">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {leads.slice(0, 5).map((l: any) => (
                <tr key={l.id} className="border-b border-ink-line last:border-0">
                  <td className="px-6 py-4"><div className="font-medium text-sm text-ink">{l.name}</div></td>
                  <td className="px-6 py-4 text-xs text-ink-muted">{l.source || "—"}</td>
                  <td className="px-6 py-4"><span className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700">{l.status}</span></td>
                  <td className="px-6 py-4 text-xs text-ink-muted">{new Date(l.created_at).toLocaleDateString("es-MX")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
