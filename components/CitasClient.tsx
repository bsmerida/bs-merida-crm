"use client";
import { useState } from "react";
import Link from "next/link";

const DAYS   = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MONTHS = ["enero","febrero","marzo","abril","mayo","junio",
                "julio","agosto","septiembre","octubre","noviembre","diciembre"];

function labelDate(iso: string) {
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(y,m-1,d);
  return `${DAYS[dt.getDay()]} ${d} de ${MONTHS[m-1]}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string,string]> = {
    pending:     ["bg-amber-50 text-amber-700 border-amber-200",   "Pendiente"   ],
    confirmed:   ["bg-emerald-50 text-emerald-700 border-emerald-200","Confirmada"],
    rescheduled: ["bg-blue-50 text-blue-600 border-blue-200",      "Reagendada"  ],
    cancelled:   ["bg-red-50 text-red-600 border-red-200",         "Cancelada"   ],
  };
  const [cls,label] = map[status] || map.pending;
  return (
    <span className={`text-[10px] uppercase tracking-[0.1em] font-medium px-2.5 py-1 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

const HOURS = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];

function RejectForm({ requestId, onDone }: { requestId: string; onDone: (r: any) => void }) {
  const today = new Date();
  const [agentOptions, setAgentOptions] = useState<{date:string;time:string}[]>([
    {date:"",time:""},{date:"",time:""},{date:"",time:""}
  ]);
  const [message, setMessage] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  function updateOpt(i: number, field: "date"|"time", val: string) {
    setAgentOptions(prev => prev.map((o,idx) => idx===i ? {...o,[field]:val} : o));
  }

  async function submit() {
    const filled = agentOptions.filter(o => o.date && o.time);
    if (filled.length === 0) { setErr("Agrega al menos una opción de horario."); return; }
    setSaving(true); setErr("");
    const res = await fetch(`/api/citas/responder/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", agent_options: filled, agent_message: message }),
    });
    const data = await res.json();
    if (data.ok) onDone({ status: "rescheduled", agent_options: filled });
    else { setErr(data.error || "Error"); setSaving(false); }
  }

  return (
    <div className="mt-4 border border-blue-100 bg-blue-50 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-semibold text-blue-700">Proponer nuevas opciones al cliente</p>
      {agentOptions.map((o,i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-[10px] text-blue-500 w-16 shrink-0">Opción {i+1}</span>
          <input type="date" value={o.date} min={toYMD(today)}
            onChange={e=>updateOpt(i,"date",e.target.value)}
            className="flex-1 border border-blue-200 rounded-lg px-2 py-1.5 text-xs text-navy focus:outline-none focus:border-navy"/>
          <select value={o.time} onChange={e=>updateOpt(i,"time",e.target.value)}
            className="border border-blue-200 rounded-lg px-2 py-1.5 text-xs text-navy focus:outline-none focus:border-navy">
            <option value="">Hora</option>
            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      ))}
      <textarea value={message} onChange={e=>setMessage(e.target.value)}
        placeholder="Mensaje opcional para el cliente (ej. estoy en junta, por eso no puedo esa semana)"
        rows={2}
        className="w-full border border-blue-200 rounded-xl px-3 py-2 text-xs text-navy placeholder:text-blue-300 focus:outline-none focus:border-navy resize-none"/>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <button onClick={submit} disabled={saving}
        className="w-full bg-blue-600 text-white text-xs font-semibold py-2 rounded-full hover:bg-blue-700 transition disabled:opacity-50">
        {saving ? "Enviando..." : "Enviar opciones al cliente →"}
      </button>
    </div>
  );
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function RequestCard({ req, isAdmin }: { req: any; isAdmin: boolean }) {
  const [data,       setData]       = useState(req);
  const [showReject, setShowReject] = useState(false);
  const [accepting,  setAccepting]  = useState<number|null>(null);
  const [deleting,   setDeleting]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const options: {date:string;time:string}[] = data.client_options || [];
  const isPending = data.status === "pending";
  const isRescheduled = data.status === "rescheduled";

  async function accept(idx: number) {
    setAccepting(idx);
    const res = await fetch(`/api/citas/responder/${data.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", option_index: idx }),
    });
    const r = await res.json();
    if (r.ok) setData((d: any) => ({...d, status:"confirmed", confirmed_option: options[idx]}));
    setAccepting(null);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/citas/${data.id}`, { method: "DELETE" });
    if (res.ok) setData((d: any) => ({...d, status:"cancelled"}));
    setDeleting(false); setConfirmDel(false);
  }

  return (
    <div className={`bg-white rounded-2xl border p-5 space-y-4
      ${isPending ? "border-amber-200 shadow-sm" : "border-stone"}`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-navy">{data.client_name}</p>
          <p className="text-xs text-ink-muted">{data.property_title}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {/* Contacto */}
      <div className="flex flex-wrap gap-3">
        {data.client_phone && (
          <a href={`tel:${data.client_phone}`} className="text-xs text-brand-500 hover:underline">{data.client_phone}</a>
        )}
        {data.client_email && (
          <a href={`mailto:${data.client_email}`} className="text-xs text-brand-500 hover:underline">{data.client_email}</a>
        )}
        {data.lead_id && (
          <Link href={`/admin/leads/${data.lead_id}`} className="text-[10px] text-gold hover:underline">Ver en Clientes →</Link>
        )}
      </div>

      {/* Opciones del cliente */}
      {isPending && options.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-2">Opciones del cliente</p>
          <div className="space-y-2">
            {options.map((o,i) => (
              <div key={i} className="flex items-center justify-between gap-2 border border-stone rounded-xl px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-navy">{labelDate(o.date)}</p>
                  <p className="text-[11px] text-ink-muted">a las {o.time} hrs</p>
                </div>
                <button onClick={()=>accept(i)} disabled={accepting!==null}
                  className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-full font-semibold transition disabled:opacity-50 shrink-0">
                  {accepting===i ? "..." : "✓ Confirmar"}
                </button>
              </div>
            ))}
          </div>

          {!showReject ? (
            <button onClick={()=>setShowReject(true)}
              className="mt-3 text-xs text-ink-soft hover:text-navy underline">
              Ninguno me funciona — proponer otras fechas
            </button>
          ) : (
            <RejectForm requestId={data.id} onDone={update => { setData((d:any)=>({...d,...update})); setShowReject(false); }} />
          )}
        </div>
      )}

      {/* Confirmada */}
      {data.status === "confirmed" && data.confirmed_option && (
        <div className="bg-emerald-50 rounded-xl px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-600 mb-1">Visita confirmada</p>
          <p className="text-sm font-semibold text-navy">{labelDate(data.confirmed_option.date)}</p>
          <p className="text-xs text-ink-muted">a las {data.confirmed_option.time} hrs</p>
          {data.google_event_id && (
            <p className="text-[10px] text-emerald-600 mt-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              Sincronizado con Google Calendar
            </p>
          )}
        </div>
      )}

      {/* Reagendada — esperando al cliente */}
      {isRescheduled && (
        <div className="bg-blue-50 rounded-xl px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-blue-600 mb-1">Esperando respuesta del cliente</p>
          {(data.agent_options||[]).map((o:any,i:number) => (
            <p key={i} className="text-xs text-navy">{i+1}. {labelDate(o.date)} · {o.time} hrs</p>
          ))}
        </div>
      )}

      {/* Cancelar */}
      {data.status !== "cancelled" && (
        <div className="border-t border-stone pt-3">
          {!confirmDel ? (
            <button onClick={()=>setConfirmDel(true)} className="text-xs text-red-400 hover:text-red-600 transition">
              Cancelar solicitud
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-xs text-ink-muted flex-1">¿Cancelar esta solicitud?</p>
              <button onClick={()=>setConfirmDel(false)} className="text-xs text-ink-soft px-2 py-1 rounded-lg hover:bg-cream">No</button>
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg disabled:opacity-50">
                {deleting?"...":"Sí"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CitasClient({ requests, isAdmin }: { requests: any[]; isAdmin: boolean }) {
  const [all, setAll] = useState(requests);
  const pending   = all.filter(r => r.status === "pending");
  const rest      = all.filter(r => r.status !== "pending");

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-600 mb-3">
            Pendientes de respuesta ({pending.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pending.map(r => <RequestCard key={r.id} req={r} isAdmin={isAdmin}/>)}
          </div>
        </div>
      )}
      {rest.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft mb-3">Otras</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rest.map(r => <RequestCard key={r.id} req={r} isAdmin={isAdmin}/>)}
          </div>
        </div>
      )}
      {all.length === 0 && (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-ink-line" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-ink">Sin solicitudes</p>
          <p className="text-xs text-ink-muted mt-1">Las solicitudes de visita del sitio aparecerán aquí.</p>
        </div>
      )}
    </div>
  );
}
