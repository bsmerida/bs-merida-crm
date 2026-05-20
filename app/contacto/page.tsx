"use client";
import { useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { createClient } from "@/lib/supabase/client";
import { Phone, Mail, MapPin, Check, MessageCircle } from "lucide-react";

export default function ContactoPage() {
  const [form, setForm]   = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent]   = useState(false);
  const [busy, setBusy]   = useState(false);
  const supabase = createClient();
  const wa    = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";
  const phone = process.env.NEXT_PUBLIC_BUSINESS_PHONE    || "999 303 4815";
  const email = process.env.NEXT_PUBLIC_BUSINESS_EMAIL    || "contacto@duclaud.mx";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setBusy(true);
    await supabase.from("leads").insert({
      name: form.name, email: form.email, phone: form.phone,
      source: "Sitio web", interest: form.message,
      consent_privacy: true, consent_at: new Date().toISOString(),
    });
    setBusy(false); setSent(true);
  };

  const inp = "w-full border border-stone bg-white px-4 py-3 rounded-xl text-sm text-navy placeholder:text-ink-soft focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 transition-all";

  return (
    <>
      <PublicHeader />
      <div className="bg-navy py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-4">Contacto</p>
          <h1 className="font-serif text-5xl font-light text-white">
            Hablemos<br /><em className="italic text-gold">directamente.</em>
          </h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-8 py-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <p className="text-sm text-ink-muted leading-relaxed max-w-sm mb-10">
              Cuéntenos qué busca. Respondemos en menos de 30 minutos en horario hábil con la información que necesita.
            </p>
            <div className="space-y-4">
              {[
                { Icon: MessageCircle, l: "WhatsApp", v: phone, href: `https://wa.me/${wa}` },
                { Icon: Mail,          l: "Correo",   v: email, href: `mailto:${email}` },
                { Icon: MapPin,        l: "Sede",     v: "Mérida, Yucatán · México", href: undefined },
              ].map(({ Icon, l, v, href }) => (
                <div key={l} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone hover:border-gold/40 transition-colors group">
                  <div className="w-10 h-10 bg-navy/5 rounded-xl flex items-center justify-center text-gold shrink-0 group-hover:bg-gold/10 transition-colors">
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">{l}</p>
                    {href ? (
                      <a href={href} target={href.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer" className="text-sm font-medium text-navy hover:text-gold transition-colors">
                        {v}
                      </a>
                    ) : <p className="text-sm text-ink-muted">{v}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {sent ? (
            <div className="bg-white border border-stone rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-5">
              <div className="w-14 h-14 bg-gold/10 border border-gold/30 rounded-full flex items-center justify-center">
                <Check size={22} className="text-gold" strokeWidth={2.5} />
              </div>
              <h3 className="font-serif text-2xl font-light text-navy">Mensaje recibido</h3>
              <p className="text-sm text-ink-muted max-w-xs">Un consultor Duclaud le contactará en menos de 24 horas.</p>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                className="text-[11px] uppercase tracking-[0.1em] text-gold hover:text-gold-dk mt-2 transition-colors">
                También por WhatsApp →
              </a>
            </div>
          ) : (
            <form onSubmit={submit} className="bg-white border border-stone rounded-3xl p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.12em] text-ink-soft block mb-2">Nombre *</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Su nombre" className={inp} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.12em] text-ink-soft block mb-2">Correo</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="correo@ejemplo.com" className={inp} />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-ink-soft block mb-2">Teléfono *</label>
                <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="999 123 4567" className={inp} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.12em] text-ink-soft block mb-2">¿Cómo podemos ayudarle?</label>
                <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})}
                  placeholder="Cuéntenos qué busca..." rows={5} className={`${inp} resize-none`} />
              </div>
              <p className="text-[11px] text-ink-soft">Al enviar autoriza que un consultor Duclaud le contacte.</p>
              <button type="submit" disabled={busy}
                className="w-full bg-navy hover:bg-navy-mid disabled:opacity-50 text-white text-[11px] uppercase tracking-[0.1em] font-semibold py-4 rounded-full transition-colors">
                {busy ? "Enviando..." : "Enviar mensaje"}
              </button>
            </form>
          )}
        </div>
      </div>
      <PublicFooter />
      <PublicChatbot />
    </>
  );
}
