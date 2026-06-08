"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DAYS   = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`,
    time: d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Merida" }),
  };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    confirmed: ["bg-emerald-50 text-emerald-700 border-emerald-200", "Confirmada"],
    cancelled: ["bg-red-50 text-red-600 border-red-200",             "Cancelada" ],
    completed: ["bg-stone-100 text-stone-500 border-stone-200",       "Completada"],
  };
  const [cls, label] = map[status] || map.confirmed;
  return (
    <span className={`text-[10px] uppercase tracking-[0.1em] font-medium px-2.5 py-1 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

type Cita = any;

function CitaCard({ cita, isAdmin, onDelete }: { cita: Cita; isAdmin: boolean; onDelete: (id: string) => void }) {
  const { date, time } = formatDateTime(cita.starts_at);
  const isToday = new Date(cita.starts_at).toDateString() === new Date().toDateString();
  const [confirming, setConfirming] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/citas/${cita.id}`, { method: "DELETE" });
    if (res.ok) {
      onDelete(cita.id);
    } else {
      alert("No se pudo eliminar la cita. Intenta de nuevo.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className={`bg-white rounded-2xl border p-5 space-y-4 ${isToday ? "border-gold/40 shadow-sm" : "border-stone"}`}>
      {/* Fecha */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isToday ? "bg-gold/10" : "bg-cream"}`}>
            <svg className={`w-5 h-5 ${isToday ? "text-gold" : "text-ink-muted"}`} fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-navy">{isToday ? "Hoy" : date}</p>
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
            <a href={`tel:${cita.client_phone}`} className="text-xs text-brand-500 hover:underline">{cita.client_phone}</a>
          )}
          {cita.client_email && (
            <a href={`mailto:${cita.client_email}`} className="text-xs text-brand-500 hover:underline truncate max-w-[160px]">{cita.client_email}</a>
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
          <Link href={`/admin/propiedades/${cita.property.id}`}
            className="text-sm text-navy hover:text-gold transition-colors line-clamp-1">
            {cita.property.title}
          </Link>
          <p className="text-xs text-ink-muted mt-0.5">
            {[cita.property.zone, cita.property.city].filter(Boolean).join(", ")}
          </p>
        </div>
      )}

      {/* Asesor */}
      {isAdmin && cita.agent && (
        <div className="border-t border-stone pt-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-1">Asesor</p>
          <p className="text-sm text-ink">{cita.agent.full_name}</p>
        </div>
      )}

      {/* Google Calendar */}
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

      {/* Botón borrar */}
      <div className="border-t border-stone pt-4">
        {!confirming ? (
          <button onClick={() => setConfirming(true)}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
            Cancelar cita
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-xs text-ink-muted flex-1">¿Confirmas que quieres cancelar esta cita?</p>
            <button onClick={() => setConfirming(false)}
              className="text-xs text-ink-soft hover:text-ink px-2 py-1 rounded-lg hover:bg-cream transition">
              No
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg transition disabled:opacity-50">
              {deleting ? "..." : "Sí, cancelar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CitasClient({ citas: initial, isAdmin }: { citas: any[]; isAdmin: boolean }) {
  const [citas, setCitas] = useState(initial);
  const router = useRouter();

  function handleDelete(id: string) {
    setCitas(prev => prev.filter(c => c.id !== id));
  }

  const now     = new Date().toISOString();
  const hoy     = citas.filter(c => new Date(c.starts_at).toDateString() === new Date().toDateString() && c.status !== "cancelled");
  const proximas= citas.filter(c => c.starts_at > now && !hoy.find(h => h.id === c.id));

  if (citas.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-ink-line" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
        </div>
        <p className="text-sm font-medium text-ink">Sin citas próximas</p>
        <p className="text-xs text-ink-muted mt-1">Las citas agendadas desde el sitio aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {hoy.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold mb-3">Hoy</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {hoy.map(c => <CitaCard key={c.id} cita={c} isAdmin={isAdmin} onDelete={handleDelete} />)}
          </div>
        </div>
      )}
      {proximas.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-3">Próximas</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {proximas.map(c => <CitaCard key={c.id} cita={c} isAdmin={isAdmin} onDelete={handleDelete} />)}
          </div>
        </div>
      )}
    </div>
  );
}
