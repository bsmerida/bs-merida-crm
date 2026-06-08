import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const DAYS   = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
    time: d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Merida" }),
  };
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-50 text-red-600 border-red-200",
    completed: "bg-stone-100 text-stone-500 border-stone-200",
  };
  const labels: Record<string, string> = {
    confirmed: "Confirmada",
    cancelled: "Cancelada",
    completed: "Completada",
  };
  return (
    <span className={`text-[10px] uppercase tracking-[0.1em] font-medium px-2.5 py-1 rounded-full border ${styles[status] || styles.confirmed}`}>
      {labels[status] || status}
    </span>
  );
}

export default async function AdminCitasPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile }  = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const isAdmin = profile?.role === "admin";

  const query = supabase
    .from("appointments")
    .select(`
      *,
      property:properties(title, address, zone, city),
      agent:profiles(full_name)
    `)
    .order("starts_at", { ascending: true });

  if (!isAdmin) query.eq("agent_id", user!.id);

  // Por defecto: citas de hoy en adelante
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  query.gte("starts_at", today.toISOString());

  const { data } = await query;
  const citas = (data || []) as any[];

  // Separar próximas vs pasadas
  const now       = new Date().toISOString();
  const proximas  = citas.filter(c => c.starts_at >= now && c.status !== "cancelled");
  const hoy       = citas.filter(c => {
    const d = new Date(c.starts_at);
    const t = new Date();
    return d.toDateString() === t.toDateString() && c.status !== "cancelled";
  });

  return (
    <div className="p-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Citas</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {hoy.length > 0
              ? `${hoy.length} cita${hoy.length > 1 ? "s" : ""} hoy · ${proximas.length} próximas`
              : `${proximas.length} cita${proximas.length !== 1 ? "s" : ""} próxima${proximas.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Citas de hoy destacadas */}
      {hoy.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold mb-3">Hoy</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {hoy.map(c => <CitaCard key={c.id} cita={c} isAdmin={isAdmin} highlight />)}
          </div>
        </div>
      )}

      {/* Todas las próximas */}
      {proximas.filter(c => !hoy.find(h => h.id === c.id)).length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-3">Próximas</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {proximas
              .filter(c => !hoy.find(h => h.id === c.id))
              .map(c => <CitaCard key={c.id} cita={c} isAdmin={isAdmin} />)}
          </div>
        </div>
      )}

      {citas.length === 0 && (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-ink-line" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-ink">Sin citas próximas</p>
          <p className="text-xs text-ink-muted mt-1">Las citas agendadas desde el sitio aparecerán aquí.</p>
        </div>
      )}
    </div>
  );
}

function CitaCard({ cita, isAdmin, highlight = false }: { cita: any; isAdmin: boolean; highlight?: boolean }) {
  const { date, time } = formatDateTime(cita.starts_at);
  return (
    <div className={`bg-white rounded-2xl border p-5 space-y-4 ${highlight ? "border-gold/40 shadow-sm" : "border-stone"}`}>
      {/* Fecha y hora */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${highlight ? "bg-gold/10" : "bg-cream"}`}>
            <svg className={`w-5 h-5 ${highlight ? "text-gold" : "text-ink-muted"}`} fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-navy">{date}</p>
            <p className="text-xs text-ink-muted">{time} hrs · 1 hora</p>
          </div>
        </div>
        <StatusBadge status={cita.status} />
      </div>

      {/* Cliente */}
      <div className="border-t border-stone pt-4">
        <p className="text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">Cliente</p>
        <p className="text-sm font-medium text-ink">{cita.client_name}</p>
        <div className="flex flex-wrap gap-3 mt-1">
          {cita.client_phone && (
            <a href={`tel:${cita.client_phone}`} className="text-xs text-brand-500 hover:underline">
              {cita.client_phone}
            </a>
          )}
          {cita.client_email && (
            <a href={`mailto:${cita.client_email}`} className="text-xs text-brand-500 hover:underline truncate max-w-[160px]">
              {cita.client_email}
            </a>
          )}
        </div>
        {cita.lead_id && (
          <Link href={`/admin/leads/${cita.lead_id}`}
            className="inline-flex items-center gap-1 text-[10px] text-gold hover:underline mt-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Ver en Clientes →
          </Link>
        )}
      </div>

      {/* Propiedad */}
      {cita.property && (
        <div className="border-t border-stone pt-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1">Propiedad</p>
          <Link href={`/admin/propiedades/${cita.property_id}`}
            className="text-sm text-navy hover:text-gold transition-colors line-clamp-1">
            {cita.property.title}
          </Link>
          <p className="text-xs text-ink-muted mt-0.5">
            {[cita.property.zone, cita.property.city].filter(Boolean).join(", ")}
          </p>
        </div>
      )}

      {/* Asesor (solo admins) */}
      {isAdmin && cita.agent && (
        <div className="border-t border-stone pt-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1">Asesor</p>
          <p className="text-sm text-ink">{cita.agent.full_name}</p>
        </div>
      )}

      {/* Google Calendar link */}
      {cita.google_event_id && (
        <div className="border-t border-stone pt-3">
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Sincronizado con Google Calendar
          </span>
        </div>
      )}
    </div>
  );
}
