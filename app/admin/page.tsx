import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { fmtMXN } from "@/lib/utils";
import { resumenInicio } from "@/lib/finanzas";
import { fechaMerida, meridaParts } from "@/lib/time";
import { ultimosClientes } from "@/lib/stats";
import { getAuth } from "@/lib/auth";

const ESTADOS_FUNNEL = [
  "Nuevo", "Contactado", "Calificado", "Visita agendada",
  "Visita realizada", "Oferta", "Negociación", "Cerrado ganado",
];

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  const [
    { data: leadsAll },
    { data: propsAll },
    { data: opsAll },
    { data: visitsProx },
    { data: agentes },
  ] = await Promise.all([
    supabase.from("leads").select("id, status, source, agent_id, created_at, name").order("created_at", { ascending: false }),
    supabase.from("properties").select("id, price, status"),
    // Las operaciones reales están en deals (Finanzas); "operations" es una tabla vieja vacía
    supabase.from("deals").select("status, operation_type, closing_date, transaction_value, gross_commission, amount_collected, agent_id, agent2_id, agent_commission, agent2_commission"),
    supabase.from("visits")
      .select("id, scheduled_at, status, agent_id, lead:leads(name), property:properties(title), agent:profiles(full_name)")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at")
      .limit(20),
    supabase.from("profiles").select("id, full_name, initials, role").eq("active", true),
  ]);

  const auth = await getAuth();
  // Montos de la empresa: solo administradores (como Finanzas)
  const verDinero = !!auth?.isAdmin;
  const todosLosLeads = leadsAll || [];
  // Un asesor ve solo sus clientes, como en la sección Clientes
  const leads = auth?.isAdmin ? todosLosLeads : todosLosLeads.filter(l => l.agent_id === auth?.userId);
  const props = propsAll || [];
  const resumen = resumenInicio(opsAll || [], meridaParts(new Date()).ymd);
  // Un asesor ve solo sus propias visitas, igual que en Clientes y en el filtro de leads de arriba
  const visitsAll = visitsProx || [];
  const visits = (auth?.isAdmin ? visitsAll : visitsAll.filter(v => v.agent_id === auth?.userId)).slice(0, 5);
  const agentList = agentes || [];
  const yo = agentList.find(a => a.id === auth?.userId);
  const primerNombre = yo?.full_name?.split(" ")[0] || "";
  const hora = meridaParts(new Date()).hour;
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  // Stats
  const leadsActivos = leads.filter(l => !["Cerrado ganado", "Cerrado perdido"].includes(l.status)).length;
  const propsDisponibles = props.filter(p => p.status === "Disponible").length;
  const valorInventario = props.filter(p => p.status === "Disponible").reduce((a, p) => a + Number(p.price), 0);

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
    const myLeads = todosLosLeads.filter(l => l.agent_id === a.id).length;
    const { ops: myOps, comision: myCom } = resumen.porAsesor(a.id);
    return { ...a, leads: myLeads, ops: myOps, comision: myCom };
  }).sort((a, b) => b.comision - a.comision).slice(0, 5);

  // Operaciones cerradas en los últimos 6 meses (ingreso por comisiones)
  const meses = resumen.meses;
  const maxMes = Math.max(...meses.map(m => m.val), 1);

  const card = "bg-white rounded-[32px] px-[26px] py-6";

  return (
    <div className="p-4 md:p-6 space-y-4 font-dmsans">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-navy text-4xl md:text-[52px] md:tracking-[-0.52px]">
            {saludo}{primerNombre ? <>, <em className="italic font-serif text-gold">{primerNombre}.</em></> : "."}
          </h1>
          <p className="text-[#6b7385] text-[15px] mt-1">Resumen de tu operación al día de hoy</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="bg-white rounded-full pl-4 pr-5 py-3 flex items-center gap-2.5 text-[#6b7385] text-sm">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
            Buscar clientes o propiedades
          </div>
          <button className="bg-white w-[46px] h-[46px] rounded-full flex items-center justify-center text-navy/60" aria-label="Notificaciones">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </button>
          <Link href="/admin/leads/nuevo" className="bg-navy hover:bg-navy-mid text-white font-semibold text-sm px-[22px] py-3 rounded-full transition-colors whitespace-nowrap">
            Nuevo cliente
          </Link>
        </div>
      </div>

      {/* Cifras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className={card}>
          <div className="text-[#6b7385] text-[13px]">Clientes activos</div>
          <div className="font-semibold text-navy text-[38px] tracking-[-0.76px] mt-1">{leadsActivos}</div>
          <Link href="/admin/leads" className="text-xs text-gold hover:text-gold-dk mt-3 inline-block font-medium">Ver clientes →</Link>
        </div>
        <div className={card}>
          <div className="text-[#6b7385] text-[13px]">Propiedades disponibles</div>
          <div className="font-semibold text-navy text-[38px] tracking-[-0.76px] mt-1">{propsDisponibles}</div>
          <div className="bg-cream text-navy text-xs font-medium px-3 py-1.5 rounded-full inline-block mt-3">{fmtMXN(valorInventario)} en inventario</div>
        </div>
        {verDinero && (
          <div className={card}>
            <div className="text-[#6b7385] text-[13px]">Por cobrar</div>
            <div className="font-semibold text-navy text-[38px] tracking-[-0.76px] mt-1">{fmtMXN(resumen.porCobrar)}</div>
            <div className="bg-cream text-navy text-xs font-medium px-3 py-1.5 rounded-full inline-block mt-3">{resumen.opsPorCobrar} operaciones sin cobrar completas</div>
          </div>
        )}
        {verDinero && (
          <div className={card}>
            <div className="text-[#6b7385] text-[13px]">Comisiones del mes</div>
            <div className="font-semibold text-navy text-[38px] tracking-[-0.76px] mt-1">{fmtMXN(resumen.comisionesMes)}</div>
            <div className="bg-cream text-navy text-xs font-medium px-3 py-1.5 rounded-full inline-block mt-3">{resumen.opsCerradasMes} operaciones cerradas</div>
          </div>
        )}
      </div>

      {/* Funnel + Equipo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className={`lg:col-span-2 ${card} flex flex-col gap-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-navy text-[28px]">Embudo de conversión</h3>
            <span className="text-xs text-[#6b7385]">Total: {leads.length} clientes</span>
          </div>
          {leads.length === 0 ? (
            <div className="text-sm text-[#6b7385] text-center py-12">Aún no hay clientes registrados.</div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {funnel.map(s => (
                <div key={s.estado} className="flex items-center gap-3.5">
                  <p className="text-navy text-sm font-medium w-[130px] shrink-0 truncate">{s.estado}</p>
                  <div className="flex-1 bg-cream rounded-full overflow-hidden h-[14px]">
                    <div className="h-full bg-navy rounded-full transition-all" style={{ width: `${s.pct}%` }} />
                  </div>
                  <span className="text-navy text-[15px] font-semibold w-8 text-right shrink-0">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${card} flex flex-col gap-4`}>
          <h3 className="font-serif text-navy text-[28px]">Equipo</h3>
          {ranking.length === 0 ? (
            <div className="text-sm text-[#6b7385] text-center py-8">Sin asesores activos</div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {ranking.map(a => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cream text-navy flex items-center justify-center text-sm font-semibold shrink-0">
                    {a.initials || a.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-navy truncate">{a.full_name}</div>
                    <div className="text-xs text-[#6b7385]">{a.leads} clientes · {a.ops} ops</div>
                  </div>
                  {verDinero ? (
                    <div className="text-sm font-semibold text-navy shrink-0">{fmtMXN(a.comision)}</div>
                  ) : (
                    <span className="bg-cream text-navy text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0">Activo</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Operaciones cerradas por mes */}
      {verDinero && (
        <div className={`${card} flex flex-col gap-4`}>
          <h3 className="font-serif text-navy text-[28px]">Operaciones cerradas · 6 meses</h3>
          <div className="flex items-end justify-center gap-5 h-[180px]">
            {meses.map((m, i) => {
              // Alto en px, no %: la columna no tiene altura fija y un % no se puede
              // resolver contra un contenedor de alto automático (colapsaba a minHeight).
              const ALTO_MAX_BARRA = 130;
              const alto = m.val > 0 ? Math.max((m.val / maxMes) * ALTO_MAX_BARRA, 8) : 4;
              const actual = i === meses.length - 1;
              return (
                <div key={m.mes} className="flex flex-col items-center gap-2 w-12">
                  <p className="text-navy text-[13px] font-semibold">{m.ops > 0 ? m.ops : ""}</p>
                  <div className={`w-full rounded-[14px] transition-all ${actual ? "bg-navy" : "bg-stone"}`} style={{ height: `${alto}px` }} />
                  <p className="text-[#6b7385] text-xs capitalize">{m.mes}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[#6b7385] text-xs text-center">Comisión cobrable de ventas y rentas por mes de cierre. El número arriba de cada barra es la cantidad de operaciones.</p>
        </div>
      )}

      {/* Origen de clientes + Próximas visitas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className={`${card} flex flex-col gap-4`}>
          <h3 className="font-serif text-navy text-[28px]">Origen de clientes</h3>
          {origenes.length === 0 ? (
            <div className="text-sm text-[#6b7385] text-center py-8">Sin clientes registrados</div>
          ) : (
            <div className="flex flex-col gap-3">
              {origenes.map(([fuente, count], i) => (
                <div key={fuente} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-navy font-medium">{fuente}</span>
                    <span className="text-navy font-semibold">{Math.round((count / leads.length) * 100)}%</span>
                  </div>
                  <div className="bg-cream rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${i === 0 ? "bg-navy" : "bg-gold"}`} style={{ width: `${(count / maxOrigen) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${card} flex flex-col gap-4`}>
          <h3 className="font-serif text-navy text-[28px]">Próximas visitas</h3>
          {visits.length === 0 ? (
            <div className="text-sm text-[#6b7385] text-center py-8">Sin visitas agendadas</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {visits.map((v: any) => {
                const fecha = new Date(v.scheduled_at);
                return (
                  <div key={v.id} className="bg-cream rounded-[22px] px-4 py-3 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-gold text-xs font-semibold">
                        {fecha.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" })} · {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${v.status === "Confirmada" ? "bg-white text-navy" : "bg-white text-[#6b7385]"}`}>{v.status}</span>
                    </div>
                    <p className="text-navy text-sm font-medium">{v.property?.title || "Sin propiedad"}</p>
                    <p className="text-[#6b7385] text-xs">{v.lead?.name || "Sin cliente"} · {v.agent?.full_name || "Sin asesor"}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Últimos clientes */}
      <div className={card}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-serif text-navy text-[28px]">Últimos clientes recibidos</h3>
          <Link href="/admin/leads" className="text-[#6b7385] hover:text-navy text-[13px] font-semibold transition-colors">Ver todos</Link>
        </div>
        {leads.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#6b7385]">
            No hay clientes registrados todavía. Los que lleguen del sitio web o el chatbot aparecerán aquí.
          </div>
        ) : (
          <div className="flex flex-col">
            {ultimosClientes(leads, 5).map((l: any) => (
              <Link href={`/admin/leads/${l.id}`} key={l.id}
                className="flex items-center gap-3.5 py-3 border-t border-stone first:border-t-0 hover:bg-cream/60 -mx-2 px-2 rounded-[18px] transition-colors">
                <div className="w-10 h-10 rounded-full bg-cream text-navy flex items-center justify-center text-sm font-semibold shrink-0">
                  {l.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-navy truncate">{l.name}</p>
                  <p className="text-[#6b7385] text-xs">{fechaMerida(l.created_at)}</p>
                </div>
                <span className="text-[#6b7385] text-[13px] shrink-0 hidden sm:inline">{l.source || "—"}</span>
                <span className="bg-cream text-navy text-xs font-medium px-3 py-1.5 rounded-full shrink-0">{l.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
