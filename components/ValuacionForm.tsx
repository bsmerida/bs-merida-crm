"use client";
import { useState } from "react";

const TIPOS = ["Casa", "Departamento", "Terreno", "Local u oficina"];

export function ValuacionForm() {
  const [tipo, setTipo]       = useState("Casa");
  const [location, setLocation] = useState("");
  const [m2, setM2]           = useState("");
  const [phone, setPhone]     = useState("");
  const [sent, setSent]       = useState(false);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");
  const wa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !phone) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/vender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, location, m2, phone }),
      });
      const data = await res.json();
      if (data.ok) setSent(true);
      else setError(data.error || "No pudimos enviar su solicitud. Intente por WhatsApp.");
    } catch {
      setError("Problema de conexión. Intente de nuevo o escríbanos por WhatsApp.");
    }
    setBusy(false);
  };

  const field = "bg-cream rounded-[24px] px-6 py-3.5 w-full flex flex-col gap-0.5";
  const label = "text-[#6b7385] text-[11px] font-semibold tracking-[1.1px] uppercase";
  const inp   = "bg-transparent text-navy text-[17px] w-full focus:outline-none placeholder:text-[#6b7385]";

  if (sent) {
    return (
      <div className="bg-white rounded-[28px] md:rounded-[44px] p-6 md:px-12 md:py-11 w-full max-w-[760px] flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 bg-gold/10 border border-gold/30 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 className="font-serif text-navy text-3xl">Solicitud recibida</h3>
        <p className="text-[#6b7385] max-w-xs">Un asesor Duclaud le contactará en menos de 24 horas hábiles.</p>
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-dk text-sm font-semibold mt-1">
          También por WhatsApp →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-[28px] md:rounded-[44px] p-6 md:px-12 md:py-11 w-full max-w-[760px] flex flex-col gap-4.5">
      <h2 className="font-serif text-navy text-3xl md:text-[44px] md:leading-[44px]">Solicita tu valuación</h2>
      <div>
        <p className="text-[#6b7385] text-xs font-semibold tracking-[1.68px] uppercase mb-2.5">Tipo de propiedad</p>
        <div className="flex gap-2 flex-wrap">
          {TIPOS.map(t => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className={`px-[22px] py-[11px] rounded-full text-[15px] font-semibold transition-colors ${
                tipo === t ? "bg-navy text-white" : "border border-navy/20 text-navy"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className={field}>
        <label className={label} htmlFor="ubicacion">Ubicación</label>
        <input id="ubicacion" required value={location} onChange={e => setLocation(e.target.value)}
          placeholder="Colonia o fraccionamiento, ciudad" className={inp} />
      </div>
      <div className={field}>
        <label className={label} htmlFor="m2">Metros cuadrados</label>
        <input id="m2" value={m2} onChange={e => setM2(e.target.value)}
          placeholder="Ej. 210 m²" className={inp} />
      </div>
      <div className={field}>
        <label className={label} htmlFor="tel">Tu teléfono</label>
        <input id="tel" required value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="999 000 0000" className={inp} />
      </div>
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      <button type="submit" disabled={busy}
        className="bg-navy hover:bg-navy-mid disabled:opacity-50 text-white font-semibold py-[19px] rounded-full transition-colors">
        {busy ? "Enviando..." : "Solicitar valuación"}
      </button>
      <p className="text-[#6b7385] text-sm text-center">Respuesta en 24 horas hábiles. Sin costo ni compromiso.</p>
    </form>
  );
}
