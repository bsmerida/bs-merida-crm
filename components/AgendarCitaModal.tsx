"use client";
import { useState } from "react";

type Option = { date: string; time: string };
type Props  = {
  propertyId: string; propertyTitle: string; agentId: string | null; onClose: () => void;
  propertyCover?: string | null; propertyPriceLabel?: string | null;
};

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

export function AgendarCitaModal({ propertyId, propertyTitle, agentId, onClose, propertyCover, propertyPriceLabel }: Props) {
  const today = new Date();
  const [step, setStep]   = useState<Step>("options");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
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
    if (ne||pe||ee||!acceptPrivacy) return;

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

  const stepIdx = step === "options" ? 0 : step === "form" ? 1 : 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-navy/60 backdrop-blur-sm font-dmsans" onClick={onClose}>
      <div className="bg-white rounded-none sm:rounded-[32px] shadow-2xl w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="px-7 pt-6 pb-5">
          <div className="flex items-center justify-between mb-5">
            <p className="font-serif text-navy text-2xl tracking-[1px]">D<span className="text-gold">.</span>UCLAUD</p>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-stone text-navy/50 hover:text-navy transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Progreso */}
          <div className="flex gap-1.5 mb-5">
            {[0,1,2].map(i => (
              <div key={i} className={`flex-1 h-1 rounded-full ${i <= stepIdx ? "bg-navy" : "bg-stone"}`} />
            ))}
          </div>

          {/* Visita a… */}
          <div className="flex items-center gap-3.5 bg-cream rounded-[20px] p-3">
            <div className="w-12 h-12 rounded-[14px] bg-stone shrink-0 overflow-hidden">
              {propertyCover && <img src={propertyCover} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[1.3px] text-gold">Visita a</p>
              <p className="text-[15px] font-medium text-navy truncate">{propertyTitle}</p>
              {propertyPriceLabel && <p className="text-sm text-[#6b7385]">{propertyPriceLabel}</p>}
            </div>
          </div>
        </div>

        {/* ── STEP 1: elegir 3 opciones ───────────────────────────────────── */}
        {step === "options" && (
          <div className="p-7">
            <p className="text-[15px] text-[#6b7385] mb-5 leading-relaxed">
              Elige hasta <strong className="text-navy font-semibold">3 opciones de fecha y hora</strong> en las que puedas visitar la propiedad. El asesor confirmará la que mejor le funcione.
            </p>

            {/* Opciones elegidas */}
            <div className="space-y-2.5 mb-5">
              {[0,1,2].map(i => (
                <div key={i}
                  onClick={() => { if (!options[i]) { setPicking(i); setPickDate(null); } }}
                  className={`flex items-center gap-3 rounded-[20px] px-4 py-3 transition-all
                    ${picking === i ? "bg-navy/10" : "bg-stone"}
                    ${!options[i] ? "cursor-pointer hover:bg-navy/5" : ""}
                  `}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-all
                    ${options[i] ? "bg-gold text-white" : picking===i ? "bg-navy text-white" : "bg-stone text-navy/50"}`}>
                    {i+1}
                  </div>
                  {options[i] ? (
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-navy">{labelDate(options[i]!.date)}</p>
                      <p className="text-sm text-[#6b7385]">a las {options[i]!.time} hrs</p>
                    </div>
                  ) : (
                    <p className="text-[15px] text-[#6b7385] flex-1">
                      {picking === i ? "Elige fecha y hora abajo" : "Agregar opción"}
                    </p>
                  )}
                  {options[i] && (
                    <button onClick={e=>{e.stopPropagation();removeOption(i);}}
                      className="text-navy/30 hover:text-red-400 transition-colors p-1">
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
              <div className="bg-cream rounded-[24px] p-4 mb-4">
                {/* Nav mes */}
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} disabled={isPrevDisabled}
                    className="p-1.5 rounded-full hover:bg-stone disabled:opacity-30 transition-colors">
                    <svg className="w-4 h-4 text-navy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <span className="text-[15px] font-semibold text-navy">{MONTHS[calMonth]} {calYear}</span>
                  <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-stone transition-colors">
                    <svg className="w-4 h-4 text-navy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {DAYS.map(d=>(
                    <div key={d} className={`text-center text-[11px] font-semibold py-1 ${d==="Dom"?"text-red-300":"text-[#6b7385]"}`}>{d}</div>
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
                        className={`aspect-square rounded-full text-sm font-medium transition-all
                          ${sel?"bg-navy text-white":""}
                          ${!sel&&!dis&&!used?"hover:bg-stone text-navy":""}
                          ${dis||used?"text-navy/20 cursor-not-allowed opacity-40":""}`}>
                        {day}
                      </button>
                    );
                  })}
                </div>

                {/* Horas */}
                {pickDate && (
                  <div className="mt-4 pt-4 border-t border-stone">
                    <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-gold mb-2.5">Horario — {labelDate(pickDate)}</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {HOURS.map(h => {
                        const used = options.some((o,oi)=>oi!==picking&&o?.date===pickDate&&o?.time===h);
                        return (
                          <button key={h} onClick={()=>selectTime(h)} disabled={used}
                            className={`py-2 rounded-full text-xs font-medium transition-colors
                              ${used?"bg-stone text-navy/20 cursor-not-allowed opacity-40":"bg-white shadow-float hover:bg-navy hover:text-white text-navy"}`}>
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
              className="w-full bg-navy hover:bg-navy-mid text-white font-semibold py-[16px] rounded-full disabled:opacity-40 transition-colors">
              Continuar {filledOptions.length > 0 && `· ${filledOptions.length} opción${filledOptions.length>1?"es":""}`}
            </button>
          </div>
        )}

        {/* ── STEP 2: datos del cliente ───────────────────────────────────── */}
        {step === "form" && (
          <div className="p-7">
            {/* Resumen opciones */}
            <div className="bg-cream rounded-[20px] px-5 py-4 mb-6 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[1.1px] text-gold">Tus opciones</p>
              {filledOptions.map((o,i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                  <p className="text-sm text-navy">{labelDate(o.date)} · {o.time} hrs</p>
                </div>
              ))}
              <button onClick={()=>setStep("options")} className="text-xs text-navy/50 hover:text-navy underline">Cambiar</button>
            </div>

            <div className="space-y-3.5">
              <div className="bg-cream rounded-[20px] px-5 py-3">
                <label className="text-[11px] font-semibold uppercase tracking-[1.1px] text-[#6b7385] block mb-0.5">Nombre completo</label>
                <input value={name} onChange={e=>{setName(e.target.value);setNameErr(validateName(e.target.value));}}
                  placeholder="Nombre y apellido"
                  className="w-full bg-transparent text-navy text-[15px] focus:outline-none placeholder:text-navy/40"/>
                {nameErr && <p className="text-xs text-red-500 mt-1">{nameErr}</p>}
              </div>
              <div className="bg-cream rounded-[20px] px-5 py-3">
                <label className="text-[11px] font-semibold uppercase tracking-[1.1px] text-[#6b7385] block mb-0.5">Teléfono / WhatsApp</label>
                <input value={phone} onChange={e=>{setPhone(e.target.value);setPhoneErr(validatePhone(e.target.value));}}
                  placeholder="999 000 0000" inputMode="tel"
                  className="w-full bg-transparent text-navy text-[15px] focus:outline-none placeholder:text-navy/40"/>
                {phoneErr && <p className="text-xs text-red-500 mt-1">{phoneErr}</p>}
              </div>
              <div className="bg-cream rounded-[20px] px-5 py-3">
                <label className="text-[11px] font-semibold uppercase tracking-[1.1px] text-[#6b7385] block mb-0.5">
                  Correo electrónico <span className="normal-case tracking-normal opacity-70">(para la confirmación)</span>
                </label>
                <input value={email} onChange={e=>{setEmail(e.target.value);setEmailErr(validateEmail(e.target.value));}}
                  type="email" placeholder="tu@correo.com"
                  className="w-full bg-transparent text-navy text-[15px] focus:outline-none placeholder:text-navy/40"/>
                {emailErr && <p className="text-xs text-red-500 mt-1">{emailErr}</p>}
              </div>
            </div>

            <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
              <input type="checkbox" checked={acceptPrivacy} onChange={e => setAcceptPrivacy(e.target.checked)}
                className="mt-0.5 accent-navy shrink-0" />
              <span className="text-xs text-[#6b7385]">
                Acepto el <a href="/aviso-privacidad" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">aviso de privacidad</a>
              </span>
            </label>

            {submitErr && <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-[16px] px-4 py-3">{submitErr}</p>}

            <div className="flex gap-2.5 mt-6">
              <button onClick={()=>setStep("options")}
                className="flex-1 bg-stone text-navy font-semibold py-[15px] rounded-full hover:bg-stone-dk transition-colors text-sm">
                ← Atrás
              </button>
              <button onClick={handleSubmit} disabled={submitting||!!nameErr||!!phoneErr||!!emailErr||!acceptPrivacy}
                className="flex-1 bg-navy hover:bg-navy-mid text-white font-semibold py-[15px] rounded-full disabled:opacity-50 transition-colors text-sm">
                {submitting ? "Enviando..." : "Solicitar visita"}
              </button>
            </div>
            <p className="text-xs text-[#6b7385] text-center mt-4">
              El asesor confirmará el horario en menos de 24 horas.
            </p>
          </div>
        )}

        {/* ── STEP 3: éxito ──────────────────────────────────────────────── */}
        {step === "success" && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-gold" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className="font-serif text-navy text-3xl mb-2">¡Solicitud enviada!</h3>
            <p className="text-[15px] text-[#6b7385] mt-2 leading-relaxed">
              El asesor revisará tu solicitud y te confirmará el horario en menos de 24 horas.
            </p>
            {email && (
              <p className="text-sm text-[#6b7385] mt-3">
                Recibirás la confirmación en <strong className="text-navy">{email}</strong>
              </p>
            )}
            <button onClick={onClose}
              className="mt-7 w-full bg-navy hover:bg-navy-mid text-white font-semibold py-[16px] rounded-full transition-colors">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
