"use client";
import { useState } from "react";
import { PublicHeaderV3 } from "@/components/PublicHeaderV3";
import { PublicFooterV3 } from "@/components/PublicFooterV3";
import { PublicChatbot } from "@/components/PublicChatbot";

const INTERESES = ["Comprar", "Rentar", "Vender", "Invertir"];

export default function ContactoPage() {
  const [form, setForm]   = useState({ name: "", email: "", phone: "", message: "" });
  const [interes, setInteres] = useState("Comprar");
  const [sent, setSent]   = useState(false);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState("");
  const wa    = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  const phone = process.env.NEXT_PUBLIC_BUSINESS_PHONE    || "999 746 6272";
  const email = process.env.NEXT_PUBLIC_BUSINESS_EMAIL    || "contacto@duclaud.com.mx";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, message: `Interés: ${interes}. ${form.message}`.trim() }),
      });
      const data = await res.json();
      if (data.ok) setSent(true);
      else setError(data.error || "No pudimos enviar su mensaje. Intente por WhatsApp.");
    } catch {
      setError("Problema de conexión. Intente de nuevo o escríbanos por WhatsApp.");
    }
    setBusy(false);
  };

  const field = "bg-cream rounded-[24px] px-6 py-3.5 flex flex-col gap-0.5";
  const label = "text-[#6b7385] text-[11px] font-semibold tracking-[1.1px] uppercase";
  const inp   = "bg-transparent text-navy text-[17px] w-full focus:outline-none placeholder:text-[#6b7385]";

  return (
    <div className="bg-cream p-4 font-dmsans break-words">
      <PublicHeaderV3 active="/contacto" />

      <section className="pt-10 md:pt-24 pb-6 md:pb-10 px-5 md:px-16">
        <h1 className="font-serif italic text-navy text-5xl md:text-[108px] md:leading-[108px] tracking-tight min-w-0">Hablemos.</h1>
        <p className="text-[#6b7385] text-base md:text-[24px] mt-3 min-w-0">Un asesor de Duclaud te responde en horario hábil.</p>
      </section>

      <section className="px-5 md:px-8 pb-12 md:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Formulario — en móvil va después de los datos de contacto, como en Figma */}
          <div className="order-2 lg:order-none lg:col-span-3 bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-11">
            {sent ? (
              <div className="flex flex-col items-center text-center gap-4 py-10">
                <div className="w-14 h-14 bg-gold/10 border border-gold/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 className="font-serif text-navy text-3xl">Mensaje recibido</h3>
                <p className="text-[#6b7385] max-w-xs">Un consultor Duclaud le contactará en menos de 24 horas.</p>
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-dk text-sm font-semibold mt-1">
                  También por WhatsApp →
                </a>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <h2 className="font-serif text-navy text-2xl md:text-[36px] mb-1">Cuéntanos qué buscas</h2>
                <div className={field}>
                  <label className={label} htmlFor="name">Nombre</label>
                  <input id="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Tu nombre" className={inp} />
                </div>
                <div className={field}>
                  <label className={label} htmlFor="phone">Teléfono</label>
                  <input id="phone" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="999 000 0000" className={inp} />
                </div>
                <div className={field}>
                  <label className={label} htmlFor="email">Correo</label>
                  <input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="tucorreo@correo.com" className={inp} />
                </div>
                <div>
                  <p className={label + " mb-2.5"}>Interés</p>
                  <div className="flex gap-2 flex-wrap">
                    {INTERESES.map(i => (
                      <button key={i} type="button" onClick={() => setInteres(i)}
                        className={`px-5 py-2.5 rounded-full text-[15px] font-semibold transition-colors ${
                          interes === i ? "bg-navy text-white" : "border border-navy/20 text-navy"}`}>
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={field}>
                  <label className={label} htmlFor="message">Mensaje</label>
                  <textarea id="message" rows={3} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                    placeholder="Cuéntanos zona, presupuesto y tiempos." className={inp + " resize-none"} />
                </div>
                {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
                <button type="submit" disabled={busy}
                  className="bg-navy hover:bg-navy-mid disabled:opacity-50 text-white font-semibold py-[18px] rounded-full transition-colors mt-1">
                  {busy ? "Enviando..." : "Enviar mensaje"}
                </button>
              </form>
            )}
          </div>

          {/* Info */}
          <div className="order-1 lg:order-none lg:col-span-2 flex flex-col gap-4">
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="bg-navy hover:bg-navy-mid transition-colors rounded-[24px] md:rounded-[32px] px-6 md:px-8 py-5 md:py-6.5 block">
              <p className="text-gold text-[11px] font-semibold tracking-[2.2px]">WHATSAPP</p>
              <p className="font-medium text-white text-2xl md:text-[28px] md:tracking-[-0.28px] mt-1">{phone}</p>
              <p className="text-white/75 text-sm mt-1.5">Respuesta más rápida</p>
            </a>
            <a href={`mailto:${email}`} className="bg-stone hover:bg-stone-dk transition-colors rounded-[24px] md:rounded-[32px] px-6 md:px-8 py-5 md:py-6.5 block">
              <p className="text-gold text-[11px] font-semibold tracking-[2.2px]">CORREO</p>
              <p className="font-serif text-navy text-2xl mt-1">{email}</p>
              <p className="text-[#6b7385] text-sm mt-1.5">Te respondemos el mismo día</p>
            </a>
            <div className="bg-stone rounded-[24px] md:rounded-[32px] px-6 md:px-8 py-5 md:py-6.5">
              <p className="text-gold text-[11px] font-semibold tracking-[2.2px]">HORARIO</p>
              <p className="font-medium text-navy text-2xl md:text-[28px] md:tracking-[-0.28px] mt-1">Lun – Vie · 9:00 a 18:00</p>
              <p className="text-[#6b7385] text-sm mt-1.5">Sáb · 10:00 a 14:00</p>
            </div>
            <div className="hidden lg:flex bg-stone rounded-[24px] md:rounded-[32px] h-[200px] md:h-[260px] relative overflow-hidden items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[160%] h-px bg-white/60 rotate-[10deg]" />
                <div className="w-px h-[160%] bg-white/60 -rotate-[14deg] absolute" />
                <div className="w-px h-[160%] bg-white/60 rotate-[18deg] absolute" />
              </div>
              <span className="relative bg-navy text-white text-[13px] font-semibold px-[18px] py-2.5 rounded-full flex items-center gap-1.5">
                <span className="w-[7px] h-[7px] rounded-full bg-gold" />Duclaud · Mérida
              </span>
            </div>
          </div>
        </div>
      </section>

      <PublicFooterV3 />
      <PublicChatbot />
    </div>
  );
}
