"use client";
import { useState } from "react";
import Link from "next/link";
import { Select } from "@/components/Select";
import { meridaParts, addDaysYmd } from "@/lib/time";

const DAYS   = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const DIAS_SEMANA = ["Lun","Mar","Mié","Jue","Vie","Sáb"];
const MONTHS = ["enero","febrero","marzo","abril","mayo","junio",
                "julio","agosto","septiembre","octubre","noviembre","diciembre"];

// Lunes (YYYY-MM-DD) de la semana que contiene esa fecha.
function lunesDe(ymd: string) {
  const dow = new Date(`${ymd}T12:00:00Z`).getUTCDay(); // 0=Dom..6=Sáb
  return addDaysYmd(ymd, dow === 0 ? -6 : -(dow - 1));
}

const hace = (iso: string) => {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "Hace unos min";
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Ayer" : `Hace ${d} días`;
};

function WeekCalendar({ requests }: { requests: any[] }) {
  const hoy = meridaParts(new Date()).ymd;
  const lunes = lunesDe(hoy);
  const dias = Array.from({ length: 6 }, (_, i) => addDaysYmd(lunes, i));
  const confirmadas = requests.filter(r => r.status === "confirmed" && r.confirmed_option?.date);
  const porDia = (ymd: string) => confirmadas
    .filter(r => r.confirmed_option.date === ymd)
    .sort((a, b) => a.confirmed_option.time.localeCompare(b.confirmed_option.time));

  const diaMes = (ymd: string) => Number(ymd.slice(8, 10));
  const rango = `${diaMes(lunes)} al ${diaMes(dias[5])} de ${MONTHS[Number(lunes.slice(5, 7)) - 1]}`;

  return (
    <div className="bg-white rounded-[28px] shadow-float p-6">
      <h2 className="font-serif text-navy text-[28px]">Esta semana</h2>
      <p className="text-sm text-[#6b7385] mb-5">Semana del {rango}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {dias.map((ymd, i) => {
          const esHoy = ymd === hoy;
          const citas = porDia(ymd);
          return (
            <div key={ymd} className={`rounded-[22px] p-3 min-h-[160px] ${esHoy ? "bg-navy" : "bg-cream"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${esHoy ? "text-white" : "text-navy"}`}>
                {DIAS_SEMANA[i]} {diaMes(ymd)}
              </p>
              <div className="mt-2 space-y-1.5">
                {citas.map(c => (
                  <div key={c.id} className={`rounded-[14px] px-2.5 py-2 ${esHoy ? "bg-white/10" : "bg-white"}`}>
                    <p className={`text-[11px] font-semibold ${esHoy ? "text-gold-lt" : "text-gold"}`}>{c.confirmed_option.time}</p>
                    <p className={`text-xs font-medium truncate ${esHoy ? "text-white" : "text-navy"}`}>{c.property_title}</p>
                    <p className={`text-[11px] truncate ${esHoy ? "text-white/60" : "text-[#6b7385]"}`}>{c.client_name}</p>
                  </div>
                ))}
                {citas.length === 0 && <p className={`text-[11px] ${esHoy ? "text-white/40" : "text-[#6b7385]/50"}`}>—</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PorConfirmarSidebar({ pending }: { pending: any[] }) {
  return (
    <div className="bg-white rounded-[28px] shadow-float p-6">
      <h2 className="font-serif text-navy text-[28px] mb-4">Por confirmar</h2>
      {pending.length === 0 ? (
        <p className="text-sm text-[#6b7385]">Sin solicitudes pendientes.</p>
      ) : (
        <div className="space-y-1">
          {pending.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-navy truncate">{r.client_name}</p>
                <p className="text-xs text-[#6b7385] truncate">
                  {r.client_options?.length ? `${r.client_options.length} horario${r.client_options.length > 1 ? "s" : ""} enviado${r.client_options.length > 1 ? "s" : ""}` : "Sin respuesta"}
                </p>
              </div>
              <span className="text-xs text-[#6b7385] shrink-0">{hace(r.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function labelDate(iso: string) {
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(y,m-1,d);
  return `${DAYS[dt.getDay()]} ${d} de ${MONTHS[m-1]}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string,string]> = {
    pending:     ["bg-amber-50 text-amber-700",   "Pendiente"   ],
    confirmed:   ["bg-emerald-50 text-emerald-700","Confirmada"],
    rescheduled: ["bg-blue-50 text-blue-600",      "Reagendada"  ],
    cancelled:   ["bg-red-50 text-red-600",         "Cancelada"   ],
  };
  const [cls,label] = map[status] || map.pending;
  return (
    <span className={`text-[10px] uppercase tracking-[0.1em] font-medium px-2.5 py-1 rounded-full ${cls}`}>
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
    <div className="mt-4 bg-blue-50 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-semibold text-blue-700">Proponer nuevas opciones al cliente</p>
      {agentOptions.map((o,i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-[10px] text-blue-500 w-16 shrink-0">Opción {i+1}</span>
          <input type="date" value={o.date} min={toYMD(today)}
            onChange={e=>updateOpt(i,"date",e.target.value)}
            className="flex-1 bg-white rounded-lg px-2 py-1.5 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy/30"/>
          <Select value={o.time} onChange={v=>updateOpt(i,"time",v)}
            options={[{value:"",label:"Hora"}, ...HOURS.map(h => ({value:h,label:h}))]}
            className="bg-white rounded-lg px-2 py-1.5 text-xs text-navy focus:outline-none text-left"/>
        </div>
      ))}
      <textarea value={message} onChange={e=>setMessage(e.target.value)}
        placeholder="Mensaje opcional para el cliente (ej. estoy en junta, por eso no puedo esa semana)"
        rows={2}
        className="w-full bg-white rounded-xl px-3 py-2 text-xs text-navy placeholder:text-blue-300 focus:outline-none focus:ring-1 focus:ring-navy/30 resize-none"/>
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
    else alert(r.error || "No se pudo confirmar la visita. Intenta de nuevo.");
    setAccepting(null);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/citas/${data.id}`, { method: "DELETE" });
    if (res.ok) setData((d: any) => ({...d, status:"cancelled"}));
    setDeleting(false); setConfirmDel(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-float p-5 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-navy">{data.client_name}</p>
          <p className="text-xs text-[#6b7385]">{data.property_title}</p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {/* Contacto */}
      <div className="flex flex-wrap gap-3">
        {data.client_phone && (
          <a href={`tel:${data.client_phone}`} className="text-xs text-gold hover:underline">{data.client_phone}</a>
        )}
        {data.client_email && (
          <a href={`mailto:${data.client_email}`} className="text-xs text-gold hover:underline">{data.client_email}</a>
        )}
        {data.lead_id && (
          <Link href={`/admin/leads/${data.lead_id}`} className="text-[10px] text-gold hover:underline">Ver en Clientes →</Link>
        )}
      </div>

      {/* Opciones del cliente */}
      {isPending && options.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#6b7385] mb-2">Opciones del cliente</p>
          <div className="space-y-2">
            {options.map((o,i) => (
              <div key={i} className="flex items-center justify-between gap-2 bg-stone rounded-xl px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-navy">{labelDate(o.date)}</p>
                  <p className="text-[11px] text-[#6b7385]">a las {o.time} hrs</p>
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
              className="mt-3 text-xs text-[#6b7385] hover:text-navy underline">
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
          <p className="text-xs text-[#6b7385]">a las {data.confirmed_option.time} hrs</p>
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
              <p className="text-xs text-[#6b7385] flex-1">¿Cancelar esta solicitud?</p>
              <button onClick={()=>setConfirmDel(false)} className="text-xs text-[#6b7385] px-2 py-1 rounded-lg hover:bg-cream">No</button>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WeekCalendar requests={all} />
        </div>
        <PorConfirmarSidebar pending={pending} />
      </div>

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
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#6b7385] mb-3">Otras</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rest.map(r => <RequestCard key={r.id} req={r} isAdmin={isAdmin}/>)}
          </div>
        </div>
      )}
      {all.length === 0 && (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-stone rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#6b7385]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-navy">Sin solicitudes</p>
          <p className="text-xs text-[#6b7385] mt-1">Las solicitudes de visita del sitio aparecerán aquí.</p>
        </div>
      )}
    </div>
  );
}
