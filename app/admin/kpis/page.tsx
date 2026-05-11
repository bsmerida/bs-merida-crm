import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtMXN } from "@/lib/utils";
import Link from "next/link";

export default async function KPIsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  // Solo admin puede ver KPIs
  if (profile?.role !== "admin") redirect("/admin");

  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioMesAnt = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const finMesAnt = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);

  const [
    { data: leadsAll },
    { data: propsAll },
    { data: opsAll },
    { data: agentes },
    { data: viewsAll },
    { data: inquiriesAll },
  ] = await Promise.all([
    supabase.from("leads").select("id, status, source, agent_id, created_at, last_contact_at, budget_min, budget_max"),
    supabase.from("properties").select("id, price, status, operation, type, agent_id, created_at"),
    supabase.from("operations").select("id, value, commission, agent_id, stage, closed_at, created_at"),
    supabase.from("profiles").select("id, full_name, initials, role").eq("active", true),
    supabase.from("property_views").select("property_id, viewed_at"),
    supabase.from("property_inquiries").select("property_id, created_at"),
  ]);

  const leads = leadsAll || [];
  const props = propsAll || [];
  const ops = opsAll || [];
  const views = viewsAll || [];
  const inquiries = inquiriesAll || [];
  const agentList = (agentes || []).filter((a: any) => a.role === "asesor");

  // ── LEADS ──────────────────────────────────────────────────────
  const leadsTotal = leads.length;
  const leadsMes = leads.filter(l => new Date(l.created_at) >= inicioMes).length;
  const leadsMesAnt = leads.filter(l => new Date(l.created_at) >= inicioMesAnt && new Date(l.created_at) <= finMesAnt).length;
  const leadsActivos = leads.filter(l => !["Cerrado ganado", "Cerrado perdido"].includes(l.status)).length;
  const leadsCerrados = leads.filter(l => l.status === "Cerrado ganado").length;
  const leadsPerdidos = leads.filter(l => l.status === "Cerrado perdido").length;
  const convGeneral = leadsTotal > 0 ? ((leadsCerrados / leadsTotal) * 100).toFixed(1) : "0";
  const growthLeads = leadsMesAnt > 0 ? (((leadsMes - leadsMesAnt) / leadsMesAnt) * 100).toFixed(0) : null;

  // ── PIPELINE ───────────────────────────────────────────────────
  const opsActivas = ops.filter((o: any) => !["Cerrada ganada", "Cerrada perdida"].includes(o.stage));
  const valorPipeline = opsActivas.reduce((s: number, o: any) => s + Number(o.value || 0), 0);
  const opsCerradasMes = ops.filter((o: any) => o.stage === "Cerrada ganada" && o.closed_at && new Date(o.closed_at) >= inicioMes);
  const opsCerradasMesAnt = ops.filter((o: any) => o.stage === "Cerrada ganada" && o.closed_at && new Date(o.closed_at) >= inicioMesAnt && new Date(o.closed_at) <= finMesAnt);
  const comisionesMes = opsCerradasMes.reduce((s: number, o: any) => s + Number(o.commission || 0), 0);
  const comisionesMesAnt = opsCerradasMesAnt.reduce((s: number, o: any) => s + Number(o.commission || 0), 0);
  const ticketPromedio = opsCerradasMes.length > 0
    ? opsCerradasMes.reduce((s: number, o: any) => s + Number(o.value || 0), 0) / opsCerradasMes.length
    : 0;
  const growthComisiones = comisionesMesAnt > 0 ? (((comisionesMes - comisionesMesAnt) / comisionesMesAnt) * 100).toFixed(0) : null;

  // ── INVENTARIO ─────────────────────────────────────────────────
  const propsDisponibles = props.filter((p: any) => p.status === "Disponible").length;
  const valorInventario = props.filter((p: any) => p.status === "Disponible").reduce((s: number, p: any) => s + Number(p.price), 0);

  // ── TRÁFICO ────────────────────────────────────────────────────
  const totalViews = views.length;
  const totalInquiries = inquiries.length;
  const convTrafico = totalViews > 0 ? ((totalInquiries / totalViews) * 100).toFixed(1) : "0";
  const viewsMes = views.filter((v: any) => new Date(v.viewed_at) >= inicioMes).length;

  // ── RANKING ASESORES ───────────────────────────────────────────
  const ranking = agentList.map((a: any) => {
    const myLeads = leads.filter(l => l.agent_id === a.id).length;
    const myCerrados = leads.filter(l => l.agent_id === a.id && l.status === "Cerrado ganado").length;
    const myConv = myLeads > 0 ? ((myCerrados / myLeads) * 100).toFixed(0) : "0";
    const myComMes = ops
      .filter((o: any) => o.agent_id === a.id && o.stage === "Cerrada ganada" && o.closed_at && new Date(o.closed_at) >= inicioMes)
      .reduce((s: number, o: any) => s + Number(o.commission || 0), 0);
    const initials = a.initials || a.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) || "?";
    return { ...a, initials, myLeads, myCerrados, myConv, myComMes };
  }).sort((a: any, b: any) => b.myComMes - a.myComMes);

  // ── VELOCIDAD DE CONVERSIÓN ─────────────────────────────────────
  // Días promedio desde creación hasta cierre (leads cerrados)
  const leadsCerradosConFecha = leads.filter(l =>
    l.status === "Cerrado ganado" && l.last_contact_at && l.created_at
  );
  const diasPromConversion = leadsCerradosConFecha.length > 0
    ? Math.round(
        leadsCerradosConFecha.reduce((s, l) => {
          const dias = (new Date(l.last_contact_at!).getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24);
          return s + dias;
        }, 0) / leadsCerradosConFecha.length
      )
    : null;

  // ── EMBUDO ─────────────────────────────────────────────────────
  const ESTADOS_FUNNEL = ["Nuevo", "Contactado", "Calificado", "Visita agendada", "Visita realizada", "Oferta", "Negociación", "Cerrado ganado"];
  const funnelTotal = leads.length || 1;
  const funnel = ESTADOS_FUNNEL.map(estado => {
    const idx = ESTADOS_FUNNEL.indexOf(estado);
    const count = leads.filter(l => ESTADOS_FUNNEL.indexOf(l.status) >= idx).length;
    return { estado, count, pct: Math.round((count / funnelTotal) * 100) };
  });

  // ── HELPERS ────────────────────────────────────────────────────
  const delta = (val: string | null, positive = true) => {
    if (!val) return null;
    const n = Number(val);
    const color = positive ? (n >= 0 ? "text-emerald-600" : "text-red-500") : (n <= 0 ? "text-emerald-600" : "text-red-500");
    return <span className={`text-xs font-medium ${color}`}>{n >= 0 ? "↑" : "↓"} {Math.abs(n)}% vs mes anterior</span>;
  };

  return (
    <div className="p-10 space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">KPIs</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          {ahora.toLocaleDateString("es-MX", { month: "long", year: "numeric", day: "numeric" })}
        </p>
      </div>

      {/* ── SECCIÓN 1: KPIs principales ── */}
      <div>
        <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Negocio</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Comisiones del mes",
              value: fmtMXN(comisionesMes),
              sub: delta(growthComisiones),
              color: "text-ink",
              bg: "bg-white",
            },
            {
              label: "Pipeline activo",
              value: fmtMXN(valorPipeline),
              sub: <span className="text-xs text-ink-muted">{opsActivas.length} operaciones</span>,
              color: "text-brand-600",
              bg: "bg-white",
            },
            {
              label: "Ticket promedio",
              value: ticketPromedio > 0 ? fmtMXN(ticketPromedio) : "—",
              sub: <span className="text-xs text-ink-muted">{opsCerradasMes.length} cierres este mes</span>,
              color: "text-ink",
              bg: "bg-white",
            },
            {
              label: "Tasa de conversión",
              value: `${convGeneral}%`,
              sub: <span className="text-xs text-ink-muted">{leadsCerrados} de {leadsTotal} leads</span>,
              color: "text-emerald-600",
              bg: "bg-white",
            },
          ].map(k => (
            <div key={k.label} className={`${k.bg} rounded-2xl border border-ink-line shadow-card p-5`}>
              <div className="text-xs text-ink-muted">{k.label}</div>
              <div className={`text-2xl font-semibold mt-2 tracking-tight ${k.color}`}>{k.value}</div>
              <div className="mt-1">{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECCIÓN 2: Leads ── */}
      <div>
        <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Clientes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Nuevos este mes",
              value: leadsMes,
              sub: delta(growthLeads),
            },
            {
              label: "Activos en proceso",
              value: leadsActivos,
              sub: <span className="text-xs text-ink-muted">sin cerrar</span>,
            },
            {
              label: "Cerrados ganados",
              value: leadsCerrados,
              sub: <span className="text-xs text-ink-muted">{leadsPerdidos} perdidos</span>,
            },
            {
              label: "Días prom. a cierre",
              value: diasPromConversion !== null ? `${diasPromConversion}d` : "—",
              sub: <span className="text-xs text-ink-muted">desde primer contacto</span>,
            },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-ink-line shadow-card p-5">
              <div className="text-xs text-ink-muted">{k.label}</div>
              <div className="text-2xl font-semibold mt-2 tracking-tight text-ink">{k.value}</div>
              <div className="mt-1">{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECCIÓN 3: Inventario y tráfico ── */}
      <div>
        <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">Inventario y tráfico web</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Propiedades disponibles", value: propsDisponibles, sub: fmtMXN(valorInventario) + " en inventario" },
            { label: "Vistas totales", value: totalViews, sub: `${viewsMes} este mes` },
            { label: "Solicitudes totales", value: totalInquiries, sub: "via chatbot y WA" },
            { label: "Conversión web", value: `${convTrafico}%`, sub: "vistas → solicitud" },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-ink-line shadow-card p-5">
              <div className="text-xs text-ink-muted">{k.label}</div>
              <div className="text-2xl font-semibold mt-2 tracking-tight text-ink">{k.value}</div>
              <div className="text-xs text-ink-muted mt-1">{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECCIÓN 4: Embudo + Ranking ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Embudo */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-ink-line shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-ink">Embudo de conversión</h3>
            <span className="text-xs text-ink-muted">{leads.length} leads totales</span>
          </div>
          {leads.length === 0 ? (
            <div className="text-sm text-ink-muted text-center py-12">Sin leads registrados.</div>
          ) : (
            <div className="space-y-3">
              {funnel.map((s, i) => (
                <div key={s.estado}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-ink">{s.estado}</span>
                    <span className="text-ink-muted">
                      <span className="text-ink font-semibold">{s.count}</span> · {s.pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-ink-ghost rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${s.pct}%`,
                        backgroundColor: `hsl(${250 - i * 20}, 60%, ${55 + i * 3}%)`,
                      }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ranking asesores */}
        <div className="bg-white rounded-2xl border border-ink-line shadow-card p-6">
          <h3 className="font-semibold text-ink mb-5">Ranking asesores</h3>
          <p className="text-xs text-ink-muted mb-4">Por comisiones cerradas este mes</p>
          {ranking.length === 0 ? (
            <div className="text-sm text-ink-muted text-center py-8">Sin asesores activos.</div>
          ) : (
            <div className="space-y-4">
              {ranking.map((a: any, i: number) => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                    i === 0 ? "bg-amber-100 text-amber-700" :
                    i === 1 ? "bg-ink-ghost text-ink-muted" :
                    "bg-ink-ghost text-ink-soft"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {a.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-ink truncate">{a.full_name}</div>
                    <div className="text-xs text-ink-muted">{a.myLeads} leads · {a.myConv}% conv.</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-ink">{fmtMXN(a.myComMes)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Links rápidos */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link href="/admin/leads" className="text-xs text-brand-600 hover:underline">Ver todos los clientes →</Link>
        <Link href="/admin/propiedades/estadisticas" className="text-xs text-brand-600 hover:underline">Estadísticas de propiedades →</Link>
      </div>
    </div>
  );
}
