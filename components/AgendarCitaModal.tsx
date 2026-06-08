"use client";
import { useState, useEffect } from "react";

type Slot = { time: string; available: boolean };

type Props = {
  propertyId: string;
  propertyTitle: string;
  agentId: string | null;
  onClose: () => void;
};

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

type Step = "calendar" | "form" | "success";

export function AgendarCitaModal({ propertyId, propertyTitle, agentId, onClose }: Props) {
  const today   = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year,  setYear]  = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots,  setSlots]  = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime,  setSelectedTime]  = useState<string | null>(null);
  const [step,  setStep]  = useState<Step>("calendar");
  const [name,  setName]  = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Generar días del mes
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isPast = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(0,0,0,0);
    const t = new Date(); t.setHours(0,0,0,0);
    return d < t;
  };
  const isSunday = (day: number) => new Date(year, month, day).getDay() === 0;

  async function fetchSlots(date: string) {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedTime(null);
    try {
      const res  = await fetch(`/api/citas/slots?agent_id=${agentId || ""}&date=${date}`);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  function selectDay(day: number) {
    if (isPast(day) || isSunday(day)) return;
    const date = toYMD(new Date(year, month, day));
    setSelectedDate(date);
    if (agentId) fetchSlots(date);
    else setSlots(buildDefaultSlots(new Date(year, month, day).getDay()));
  }

  function buildDefaultSlots(weekday: number): Slot[] {
    const end = weekday === 6 ? 14 : 18;
    const out: Slot[] = [];
    for (let h = 9; h < end; h++) out.push({ time: `${String(h).padStart(2,"0")}:00`, available: true });
    return out;
  }

  async function handleSubmit() {
    if (!name || !phone || !selectedDate || !selectedTime) {
      setError("Por favor completa todos los campos requeridos.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/citas/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id:    propertyId,
          property_title: propertyTitle,
          agent_id:       agentId,
          client_name:    name,
          client_phone:   phone,
          client_email:   email || null,
          date:           selectedDate,
          time:           selectedTime,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setStep("success");
    } catch (e: any) {
      setError(e.message || "Ocurrió un error. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const isPrevDisabled = year === today.getFullYear() && month === today.getMonth();

  const formatDate = (d: string) => {
    const [y,m,day] = d.split("-").map(Number);
    const dt = new Date(y, m-1, day);
    return `${DAYS[dt.getDay()]} ${day} de ${MONTHS[m-1]} ${y}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-stone">
          <div>
            <h2 className="font-serif text-xl text-navy">Agendar visita</h2>
            <p className="text-xs text-ink-muted mt-0.5 truncate max-w-xs">{propertyTitle}</p>
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-navy transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── STEP 1: Calendario ── */}
        {step === "calendar" && (
          <div className="p-7">
            {/* Nav mes */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} disabled={isPrevDisabled}
                className="p-2 rounded-xl hover:bg-cream disabled:opacity-30 transition">
                <svg className="w-4 h-4 text-navy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <span className="font-semibold text-navy text-sm">
                {MONTHS[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-cream transition">
                <svg className="w-4 h-4 text-navy" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            {/* Días de semana */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className={`text-center text-[10px] uppercase tracking-wider font-semibold py-1 ${d === "Dom" ? "text-red-300" : "text-ink-soft"}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grilla días */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const date    = toYMD(new Date(year, month, day));
                const past    = isPast(day);
                const sunday  = isSunday(day);
                const sel     = selectedDate === date;
                const disabled= past || sunday;
                return (
                  <button key={i} onClick={() => selectDay(day)} disabled={disabled}
                    className={`
                      aspect-square rounded-xl text-sm font-medium transition-all
                      ${sel ? "bg-navy text-white shadow-md" : ""}
                      ${!sel && !disabled ? "hover:bg-cream text-navy" : ""}
                      ${disabled ? "text-ink-line cursor-not-allowed" : ""}
                    `}>
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Slots de hora */}
            {selectedDate && (
              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gold mb-3">
                  Horarios disponibles — {formatDate(selectedDate)}
                </p>
                {loadingSlots ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-3">No hay horarios disponibles este día.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(s => (
                      <button key={s.time} onClick={() => setSelectedTime(s.time)} disabled={!s.available}
                        className={`
                          py-2 rounded-xl text-sm font-medium transition-all border
                          ${!s.available ? "border-stone bg-cream text-ink-line cursor-not-allowed line-through" : ""}
                          ${s.available && selectedTime !== s.time ? "border-stone hover:border-navy hover:bg-cream text-navy" : ""}
                          ${selectedTime === s.time ? "border-navy bg-navy text-white shadow" : ""}
                        `}>
                        {s.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CTA siguiente */}
            <button
              onClick={() => setStep("form")}
              disabled={!selectedDate || !selectedTime}
              className="mt-6 w-full bg-navy text-white font-medium py-3.5 rounded-full disabled:opacity-40 hover:bg-navy/90 transition">
              Continuar →
            </button>
          </div>
        )}

        {/* ── STEP 2: Formulario ── */}
        {step === "form" && (
          <div className="p-7">
            <div className="bg-cream rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
              <svg className="w-5 h-5 text-gold shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <div>
                <p className="text-xs font-semibold text-navy">{formatDate(selectedDate!)}</p>
                <p className="text-xs text-ink-muted">a las {selectedTime} hrs</p>
              </div>
              <button onClick={() => { setStep("calendar"); setSelectedTime(null); }}
                className="ml-auto text-[10px] text-ink-soft hover:text-navy underline">
                Cambiar
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">
                  Nombre completo *
                </label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full border border-stone rounded-xl px-4 py-3 text-sm text-navy placeholder:text-ink-line focus:outline-none focus:border-navy transition" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">
                  Teléfono / WhatsApp *
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="999 000 0000"
                  className="w-full border border-stone rounded-xl px-4 py-3 text-sm text-navy placeholder:text-ink-line focus:outline-none focus:border-navy transition" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-ink-soft block mb-1.5">
                  Correo electrónico (opcional)
                </label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  type="email" placeholder="tu@correo.com"
                  className="w-full border border-stone rounded-xl px-4 py-3 text-sm text-navy placeholder:text-ink-line focus:outline-none focus:border-navy transition" />
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep("calendar")}
                className="flex-1 border border-stone text-navy font-medium py-3.5 rounded-full hover:bg-cream transition text-sm">
                ← Atrás
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 bg-navy text-white font-medium py-3.5 rounded-full disabled:opacity-50 hover:bg-navy/90 transition text-sm">
                {submitting ? "Agendando..." : "Confirmar cita"}
              </button>
            </div>

            <p className="text-[10px] text-ink-muted text-center mt-4">
              Al agendar, aceptas que un asesor Duclaud se contacte contigo.
            </p>
          </div>
        )}

        {/* ── STEP 3: Éxito ── */}
        {step === "success" && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className="font-serif text-2xl text-navy mb-2">¡Cita confirmada!</h3>
            <p className="text-sm text-ink-muted mb-1">
              <strong className="text-navy">{formatDate(selectedDate!)}</strong> a las <strong className="text-navy">{selectedTime} hrs</strong>
            </p>
            <p className="text-sm text-ink-muted mt-3">
              Un asesor Duclaud te contactará para confirmar los detalles.
            </p>
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
