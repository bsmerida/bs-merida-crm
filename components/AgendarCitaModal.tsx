"use client";
import { useState } from "react";

type Option = { date: string; time: string };
type Props  = { propertyId: string; propertyTitle: string; agentId: string | null; onClose: () => void; };

const DAYS   = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const HOURS  = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function labelDate(iso: string) {
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(y,m-1,d);
  return `${DAYS[dt.getDay()]} ${d} ${MONTHS[m-1]}`;
}
function validatePhone(p: string) {
  const d = p.replace(/\D/g,"");
  if (d.length < 10) return "Mínimo 10 dígitos.";
  if (/^(\d)\1{9,}$/.test(d)) return "Número no válido.";
  return "";
}
function validateEmail(e: string) {
  if (!e) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return "Formato de correo inválido.";
  const fakeDomains = ["test.com","example.com","fake.com","asdf.com"];
  if (fakeDomains.includes(e.split("@")[1]?.toLowerCase())) return "Ingresa un correo real.";
  return "";
}
function validateName(n: string) {
  if (n.trim().length < 3) return "Ingresa tu nombre completo.";
  if (!/\s/.test(n.trim()))  return "Ingresa nombre y apellido.";
  return "";
}

type Step = "options" | "form" | "success";

export function AgendarCitaModal({ propertyId, propertyTitle, agentId, onClose }: Props) {
  const today = new Date();
  const [step, setStep]   = useState<Step>("options");
  const [options, setOptions] = useState<(Option | null)[]>([null, null, null]);
  const [picking, setPicking] = useState<number | null>(0); // cuál opción se está armando
  const [pickDate, setPickDate] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear,  setCalYear]  = useState(today.getFullYear());

  const [name,  setName]  = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nameErr,  setNameErr]  = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [submitErr, setSubmitErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Calendario ──────────────────────────────────────────────────────────────
  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const cells: (number|null)[] = Array(firstDay).fill(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);

  const isPast   = (d: number) => { const dt=new Date(calYear,calMonth,d); dt.setHours(0,0,0,0); const t=new Date(); t.setHours(0,0,0,0); return dt<t; };
  const isSunday = (d: number) => new Date(calYear,calMonth,d).getDay()===0;
  const isPrevDisabled = calYear===today.getFullYear()&&calMonth===today.getMonth();
  const prevMonth = () => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); };
  const nextMonth = () => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); };

  function selectDay(d: number) {
    if (isPast(d)||isSunday(d)) return;
    setPickDate(toYMD(new Date(calYear,calMonth,d)));
  }

  function selectTime(t: string) {
    if (picking === null || !pickDate) return;
    // Verificar que no esté duplicada
    const already = options.some((o,i) => i !== picking && o?.date === pickDate && o?.time === t);
    if (already) return;
    const newOpts = [...options];
    newOpts[picking] = { date: pickDate, time: t };
    setOptions(newOpts);
    setPickDate(null);
    // Ir a la siguiente opción vacía
    const next = newOpts.findIndex((o,i) => i > picking && !o);
    setPicking(next === -1 ? null : next);
  }

  function removeOption(i: number) {
    const newOpts = [...options];
    newOpts[i] = null;
    setOptions(newOpts);
    setPicking(i);
  }

  const filledOptions = options.filter(Boolean) as Option[];
  const canContinue   = filledOptions.length >= 1;

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const ne = validateName(name);
    const pe = validatePhone(phone);
    const ee = validateEmail(email);
    setNameErr(ne); setPhoneErr(pe); setEmailErr(ee);
    if (ne||pe||ee) return;

    setSubmitErr(""); setSubmitting(true);
    try {
      const res = await fetch("/api/citas/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id:    propertyId,
          property_title: propertyTitle,
          agent_id:       agentId,
          client_name:    name.trim(),
          client_phone:   phone.trim(),
          client_email:   email.trim() || null,
          options:        filledOptions,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setStep("success");
    } catch(e: any) {
      setSubmitErr(e.message || "Ocurrió un error. Intenta de nuevo.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-stone">
          <div>
            <h2 className="font-serif text-xl text-navy">Solicitar visita</h2>
            <p className="text-xs text-ink-muted mt-0.5 truncate max-w-xs">{propertyTitle}</p>
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-navy transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── STEP 1: elegir 3 opciones ───────────────────────────────────── */}
        {step === "options" && (
          <div className="p-7">
            <p className="text-sm text-ink-muted mb-5 leading-relaxed">
              Elige hasta <strong className="text-navy">3 opciones de fecha y hora</strong> en las que puedas visitar la propiedad. El asesor confirmará la que mejor le funcione.
            </p>

            {/* Opciones elegidas */}
            <div className="space-y-2 mb-5">
              {[0,1,2].map(i => (
                <div key={i}
                  onClick={() => { if (!options[i]) { setPicking(i); setPickDate(null); } }}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all
                    ${picking === i ? "border-navy bg-navy/5" : "border-stone"}
                    ${!options[i] ? "cursor-pointer hover:border-navy/40" : ""}
                  `}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all
                    ${options[i] ? "bg-gold text-white" : picking===i ? "bg-navy text-white" : "bg-cream text-ink-soft"}`}>
                    {i+1}
                  </div>
                  {options[i] ? (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy">{labelDate(options[i]!.date)}</p>
                      <p className="text-xs text-ink-muted">a las {options[i]!.time} hrs</p>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-muted flex-1">
                      {picking === i ? "Elige fecha y hora abajo" : "Agregar opción"}
                    </p>
                  )}
                  {options[i] && (
                    <button onClick={e=>{e.stopPropagation();removeOption(i);}}
                      className="text-ink-line hover:text-red-400 transition-colors p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Calendario (cuando hay opción seleccionada para editar) */}
            {picking !== null && (
              <div className="border border-stone rounded-2xl p-4 mb-4">
                {/* Nav mes */}
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} disabled={isPrevDisabled}
                    className="p-1.5 rounded-lg hover:bg-cream disabled:opacity-30 transition">
                    <svg className="w-4 h-4 text-navy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <span className="text-sm font-semibold text-navy">{MONTHS[calMonth]} {calYear}</span>
                  <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-cream transition">
                    <svg className="w-4 h-4 text-navy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {DAYS.map(d=>(
                    <div key={d} className={`text-center text-[10px] font-semibold py-1 ${d==="Dom"?"text-red-300":"text-ink-soft"}`}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {cells.map((day,i)=>{
                    if(!day) return <div key={i}/>;
                    const date=toYMD(new Date(calYear,calMonth,day));
                    const dis=isPast(day)||isSunday(day);
                    const sel=pickDate===date;
                    const used=options.some((o,oi)=>oi!==picking&&o?.date===date);
                    return (
                      <button key={i} onClick={()=>selectDay(day)} disabled={dis||used}
                        className={`aspect-square rounded-lg text-xs font-medium transition-all
                          ${sel?"bg-navy text-white":""}
                          ${!sel&&!dis&&!used?"hover:bg-cream text-navy":""}
                          ${dis||used?"text-ink-line cursor-not-allowed opacity-40":""}`}>
                        {day}
                      </button>
                    );
                  })}
                </div>

                {/* Horas */}
                {pickDate && (
                  <div className="mt-4 pt-4 border-t border-stone">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-gold mb-2">Horario — {labelDate(pickDate)}</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {HOURS.map(h => {
                        const used = options.some((o,oi)=>oi!==picking&&o?.date===pickDate&&o?.time===h);
                        return (
                          <button key={h} onClick={()=>selectTime(h)} disabled={used}
                            className={`py-1.5 rounded-lg text-xs font-medium border transition-all
                              ${used?"border-stone text-ink-line cursor-not-allowed opacity-40":"border-stone hover:border-navy hover:bg-navy hover:text-white text-navy"}`}>
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={()=>setStep("form")} disabled={!canContinue}
              className="w-full bg-navy text-white font-medium py-3.5 rounded-full disabled:opacity-40 hover:bg-navy/90 transition">
              Continuar → {filledOptions.length > 0 && `(${filledOptions.length} opción${filledOptions.length>1?"es":""})`}
            </button>
          </div>
        )}

        {/* ── STEP 2: datos del cliente ───────────────────────────────────── */}
        {step === "form" && (
          <div className="p-7">
            {/* Resumen opciones */}
            <div className="bg-cream rounded-2xl px-5 py-4 mb-6 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-gold">Tus opciones</p>
              {filledOptions.map((o,i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                  <p className="text-xs text-navy">{labelDate(o.date)} · {o.time} hrs</p>
                </div>
              ))}
              <button onClick={()=>setStep("options")} className="text-[10px] text-ink-soft hover:text-navy underline">Cambiar</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Nombre completo *</label>
                <input value={name} onChange={e=>{setName(e.target.value);setNameErr(validateName(e.target.value));}}
                  placeholder="Nombre y apellido"
                  className={`w-full border rounded-xl px-4 py-3 text-sm text-navy placeholder:text-ink-line focus:outline-none transition
                    ${nameErr?"border-red-300 bg-red-50":"border-stone focus:border-navy"}`}/>
                {nameErr && <p className="text-xs text-red-500 mt-1">{nameErr}</p>}
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">Teléfono / WhatsApp *</label>
                <input value={phone} onChange={e=>{setPhone(e.target.value);setPhoneErr(validatePhone(e.target.value));}}
                  placeholder="999 000 0000" inputMode="tel"
                  className={`w-full border rounded-xl px-4 py-3 text-sm text-navy placeholder:text-ink-line focus:outline-none transition
                    ${phoneErr?"border-red-300 bg-red-50":"border-stone focus:border-navy"}`}/>
                {phoneErr && <p className="text-xs text-red-500 mt-1">{phoneErr}</p>}
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">
                  Correo electrónico <span className="text-ink-line normal-case tracking-normal">(para recibir confirmación)</span>
                </label>
                <input value={email} onChange={e=>{setEmail(e.target.value);setEmailErr(validateEmail(e.target.value));}}
                  type="email" placeholder="tu@correo.com"
                  className={`w-full border rounded-xl px-4 py-3 text-sm text-navy placeholder:text-ink-line focus:outline-none transition
                    ${emailErr?"border-red-300 bg-red-50":"border-stone focus:border-navy"}`}/>
                {emailErr && <p className="text-xs text-red-500 mt-1">{emailErr}</p>}
              </div>
            </div>

            {submitErr && <p className="mt-3 text-xs text-red-500 bg-red-50 rounded-xl px-4 py-3">{submitErr}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={()=>setStep("options")}
                className="flex-1 border border-stone text-navy font-medium py-3.5 rounded-full hover:bg-cream transition text-sm">
                ← Atrás
              </button>
              <button onClick={handleSubmit} disabled={submitting||!!nameErr||!!phoneErr||!!emailErr}
                className="flex-1 bg-navy text-white font-medium py-3.5 rounded-full disabled:opacity-50 hover:bg-navy/90 transition text-sm">
                {submitting ? "Enviando..." : "Solicitar visita"}
              </button>
            </div>
            <p className="text-[10px] text-ink-muted text-center mt-4">
              El asesor confirmará el horario en menos de 24 horas.
            </p>
          </div>
        )}

        {/* ── STEP 3: éxito ──────────────────────────────────────────────── */}
        {step === "success" && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className="font-serif text-2xl text-navy mb-2">¡Solicitud enviada!</h3>
            <p className="text-sm text-ink-muted mt-2 leading-relaxed">
              El asesor revisará tu solicitud y te confirmará el horario en menos de 24 horas.
            </p>
            {email && (
              <p className="text-xs text-ink-muted mt-3">
                Recibirás la confirmación en <strong>{email}</strong>
              </p>
            )}
            <button onClick={onClose}
              className="mt-7 w-full bg-navy text-white font-medium py-3.5 rounded-full hover:bg-navy/90 transition">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
