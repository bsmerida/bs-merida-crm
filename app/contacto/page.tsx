"use client";
import { useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicChatbot } from "@/components/PublicChatbot";
import { createClient } from "@/lib/supabase/client";

export default function ContactoPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setSubmitting(true);
    await supabase.from("leads").insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      source: "Sitio web",
      interest: form.message,
      consent_privacy: true,
      consent_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setSent(true);
  };

  return (
    <>
      <PublicHeader />
      <div className="max-w-3xl mx-auto px-8 py-20">
        <div className="text-xs uppercase tracking-wider text-brand-600 font-semibold">Contacto</div>
        <h1 className="text-4xl font-semibold text-ink tracking-tight mt-3">Hablemos.</h1>
        <p className="text-lg text-ink-muted mt-4">Cuéntanos qué buscas y te respondemos en menos de 24 horas.</p>

        {sent ? (
          <div className="mt-10 bg-brand-50 border border-brand-200 rounded-2xl p-8 text-center">
            <div className="text-2xl">✓</div>
            <h3 className="text-xl font-semibold text-ink mt-2">¡Recibimos tu mensaje!</h3>
            <p className="text-sm text-ink-muted mt-2">Un asesor te contactará en menos de 24 horas. Si es urgente, puedes escribirnos por WhatsApp ahora mismo.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-10">
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              placeholder="Nombre *" className="bg-ink-ghost border border-transparent rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-brand-300" />
            <input value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              placeholder="Correo" type="email" className="bg-ink-ghost border border-transparent rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-brand-300" />
            <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              placeholder="Teléfono o WhatsApp *" className="bg-ink-ghost border border-transparent rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-brand-300 md:col-span-2" />
            <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})}
              placeholder="¿Cómo podemos ayudarte?" rows={4}
              className="bg-ink-ghost border border-transparent rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white focus:border-brand-300 resize-none md:col-span-2"></textarea>
            <p className="text-xs text-ink-soft md:col-span-2">Al enviar aceptas nuestro aviso de privacidad y autorizas el uso de tus datos para que un asesor te contacte.</p>
            <button type="submit" disabled={submitting}
              className="md:col-span-2 mt-2 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium px-8 py-3 rounded-full">
              {submitting ? "Enviando..." : "Enviar mensaje"}
            </button>
          </form>
        )}
      </div>
      <PublicFooter />
      <PublicChatbot />
    </>
  );
}
