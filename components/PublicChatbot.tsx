"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "./Icon";

type Msg = { role: "user" | "assistant"; content: string };
type PropCard = {
  id: string; title: string; type: string; operation: string;
  price: number; currency: string; zone: string;
  bedrooms: number; bathrooms: number; m2: number | null;
  cover: string | null; url: string;
};
type DisplayMsg = { from_bot: boolean; text: string; cards?: PropCard[]; appointmentRequested?: boolean };
type PropertyContext = { id: string; title: string; operation: string } | null;

const fmt = (n: number, cur = "MXN") =>
  new Intl.NumberFormat(cur === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(n);

const GREETING = "Hola, soy Sofía — asistente de Duclaud. ¿Qué tipo de propiedad está buscando? Cuénteme y le muestro opciones de nuestro inventario.";
const GREETING_PROP = (t: string) => `Hola, soy Sofía. Veo que le interesa *${t}*. ¿Tiene alguna pregunta o desea ver opciones similares?`;

function Avatar({ size = "w-10 h-10", text = "text-base" }: { size?: string; text?: string }) {
  return (
    <div className={`${size} bg-navy rounded-full flex items-center justify-center shrink-0`}>
      <span className={`font-serif ${text} text-gold`}>S</span>
    </div>
  );
}

function PropCard({ card }: { card: PropCard }) {
  return (
    <a href={card.url} target="_blank" rel="noopener noreferrer"
      className="flex gap-3 bg-white rounded-[22px] overflow-hidden shadow-sm hover:shadow-float transition-shadow group">
      <div className="w-20 h-20 shrink-0 bg-stone">
        {card.cover
          ? <img src={card.cover} alt={card.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Icon name="building" className="w-6 h-6 text-stone-dk" /></div>}
      </div>
      <div className="flex-1 py-2.5 pr-2 min-w-0">
        <p className="text-xs font-medium text-navy truncate">{card.title}</p>
        <p className="text-gold font-semibold text-sm mt-0.5">{fmt(card.price, card.currency)}</p>
        <p className="text-[#6b7385] text-[10px] truncate mt-0.5">{card.zone}</p>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-[#6b7385]">
          {card.bedrooms > 0  && <span className="flex items-center gap-1"><Icon name="bed"  className="w-3 h-3" />{card.bedrooms}</span>}
          {card.bathrooms > 0 && <span className="flex items-center gap-1"><Icon name="bath" className="w-3 h-3" />{card.bathrooms}</span>}
          {(card.m2 ?? 0) > 0 && <span>{card.m2}m²</span>}
        </div>
      </div>
      <div className="flex items-center pr-3 text-stone-dk group-hover:text-gold transition-colors">
        <Icon name="chevronRight" className="w-4 h-4" />
      </div>
    </a>
  );
}

// liftedOnMobile: la ficha de propiedad tiene una barra fija de "Agendar
// visita" al pie en celular (ver MobileAgendarBar) — sube el widget para
// que no se encimen.
export function PublicChatbot({ liftedOnMobile = false }: { liftedOnMobile?: boolean } = {}) {
  const [open, setOpen]             = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [teaserDismissed, setTeaserDismissed] = useState(false);
  const [propertyCtx, setPropertyCtx]         = useState<PropertyContext>(null);
  const [messages, setMessages]     = useState<Msg[]>([]);
  const [displayMsgs, setDisplayMsgs] = useState<DisplayMsg[]>([]);
  const [input, setInput]           = useState("");
  const [typing, setTyping]         = useState(false);
  const [sessionId, setSessionId]   = useState<string | null>(null);
  const [leadSaved, setLeadSaved]   = useState(false);
  const [lastLead, setLastLead]     = useState<Record<string, string> | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const businessWa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";

  const scrollBottom = () =>
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 80);

  const initSession = useCallback(async (greeting: string) => {
    try {
      const res = await fetch("/api/sofia/sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ greeting }),
      });
      const data = await res.json();
      if (data.id) setSessionId(data.id);
    } catch { /* el chat funciona aunque no se guarde la sesión */ }
  }, []);

  const initConv = useCallback((ctx: PropertyContext) => {
    const greeting = ctx ? GREETING_PROP(ctx.title) : GREETING;
    setMessages([{ role: "assistant", content: greeting }]);
    setDisplayMsgs([{ from_bot: true, text: greeting }]);
    setLeadSaved(false);
    initSession(greeting);
  }, [initSession]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ctx = (e as CustomEvent).detail as PropertyContext;
      setPropertyCtx(ctx);
      initConv(ctx);
      setOpen(true);
      setShowTeaser(false);
      setTeaserDismissed(true);
    };
    window.addEventListener("sofia:open", handler);
    return () => window.removeEventListener("sofia:open", handler);
  }, [initConv]);

  useEffect(() => {
    if (!teaserDismissed && !open) {
      const t = setTimeout(() => setShowTeaser(true), 5000);
      return () => clearTimeout(t);
    }
  }, [teaserDismissed, open]);

  useEffect(() => { scrollBottom(); }, [displayMsgs, typing, open]);

  const saveLead = async (leadData: Record<string, string>, sid: string | null) => {
    if (leadSaved || !leadData.nombre || !leadData.telefono) return;
    const res = await fetch("/api/sofia/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead: leadData, sessionId: sid, propertyId: propertyCtx?.id }),
    }).catch(() => null);
    if (!res?.ok) return; // se reintenta si Sofía vuelve a capturar los datos
    setLeadSaved(true);
    setLastLead(leadData);
  };

  const send = async () => {
    if (!input.trim() || typing) return;
    const userText = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: userText }];
    setMessages(newMessages);
    setDisplayMsgs(prev => [...prev, { from_bot: false, text: userText }]);
    setTyping(true);
    scrollBottom();

    try {
      const res = await fetch("/api/sofia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, propertyCtx, sessionId }),
      });
      const { reply, leadData, propertyCards, appointmentRequested, error } = await res.json();
      setTyping(false);
      const botText = error ? "Lo siento, hubo un error. Intente de nuevo." : reply;
      setMessages(prev => [...prev, { role: "assistant", content: botText }]);
      setDisplayMsgs(prev => [...prev, {
        from_bot: true, text: botText,
        cards: propertyCards?.length ? propertyCards : undefined,
        appointmentRequested: !!appointmentRequested,
      }]);
      if (leadData?.nombre && leadData?.telefono) await saveLead(leadData, sessionId);
    } catch {
      setTyping(false);
      setDisplayMsgs(prev => [...prev, { from_bot: true, text: "Problema de conexión. Intente de nuevo." }]);
    }
    scrollBottom();
  };

  const openChat = () => {
    if (messages.length === 0) initConv(null);
    setOpen(true); setShowTeaser(false); setTeaserDismissed(true);
  };

  // Contexto que ya capturó Sofía, para que el asesor no tenga que preguntar
  // todo de nuevo cuando la conversación sigue por WhatsApp.
  const contextoLead = [
    propertyCtx ? `me interesa: ${propertyCtx.title}` : lastLead?.zona ? `busco en ${lastLead.zona}` : "",
    lastLead?.operacion ? lastLead.operacion.toLowerCase() : "",
    lastLead?.presupuesto ? `presupuesto ${lastLead.presupuesto}` : "",
  ].filter(Boolean).join(", ");

  const waLink = `https://wa.me/${businessWa}?text=${encodeURIComponent(
    `Hola, vengo del sitio de Duclaud${contextoLead ? ` — ${contextoLead}` : ""}. Me atendió Sofía${lastLead?.nombre ? `, soy ${lastLead.nombre}` : ""}.`
  )}`;

  const fmtText = (text: string) =>
    text.split(/(\*[^*]+\*)/g).map((p, i) =>
      p.startsWith("*") && p.endsWith("*") ? <strong key={i}>{p.slice(1, -1)}</strong> : p
    );

  return (
    <>
      {/* Teaser */}
      {showTeaser && !open && (
        <div className={`fixed ${liftedOnMobile ? "bottom-44 lg:bottom-28" : "bottom-28"} right-6 z-40 max-w-[300px] font-dmsans`}>
          <div className="bg-white rounded-[28px] shadow-float p-5 relative">
            <button onClick={() => { setShowTeaser(false); setTeaserDismissed(true); }}
              className="absolute top-3.5 right-3.5 text-navy/30 hover:text-navy transition-colors">
              <Icon name="x" className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <Avatar size="w-10 h-10" text="text-base" />
              <div>
                <div className="font-semibold text-sm text-navy">Sofía · Duclaud</div>
                <div className="text-[11px] text-emerald-600 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>En línea
                </div>
              </div>
            </div>
            <p className="text-sm text-navy leading-relaxed">¿Buscando una propiedad? Dígame qué necesita y le muestro opciones al instante.</p>
            <button onClick={openChat}
              className="mt-3.5 bg-navy hover:bg-navy-mid text-white text-[13px] font-semibold px-4 py-2 rounded-full transition-colors">
              Iniciar conversación →
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button onClick={() => open ? setOpen(false) : openChat()}
        className={`fixed ${liftedOnMobile ? "bottom-24 lg:bottom-6" : "bottom-6"} right-6 z-40`}>
        <div className="relative">
          <div className="w-16 h-16 bg-navy hover:bg-navy-mid text-white shadow-float flex items-center justify-center transition-colors rounded-full">
            {open
              ? <Icon name="x" className="w-5 h-5" />
              : <span className="font-serif text-xl text-gold">S</span>}
          </div>
          {!open && <span className="absolute inset-0 bg-navy opacity-20 animate-ping pointer-events-none rounded-full"></span>}
        </div>
      </button>

      {/* Ventana */}
      {open && (
        <div className={`fixed ${liftedOnMobile ? "bottom-40 lg:bottom-24" : "bottom-24"} right-6 z-40 w-[400px] max-w-[calc(100vw-3rem)] max-h-[min(640px,calc(100dvh-140px))] bg-white rounded-[36px] shadow-float overflow-hidden flex flex-col font-dmsans`}>
          {/* Header */}
          <div className="bg-navy text-white p-5 flex items-center gap-3.5">
            <Avatar size="w-11 h-11" text="text-lg" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[15px]">Sofía · Asistente Duclaud</div>
              <div className="text-[12px] text-white/55 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                En línea · responde en segundos
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors shrink-0">
              <Icon name="x" className="w-4 h-4" />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={chatRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-cream">
            {displayMsgs.map((m, i) => (
              <div key={i} className={`flex flex-col ${!m.from_bot ? "items-end" : "items-start"} gap-2`}>
                {m.text && (
                  <div className={`max-w-[85%] px-4 py-3 rounded-[22px] text-[14px] leading-relaxed ${
                    !m.from_bot
                      ? "bg-navy text-white rounded-br-[8px]"
                      : "bg-white text-navy shadow-sm rounded-bl-[8px]"}`}>
                    {fmtText(m.text)}
                  </div>
                )}
                {m.cards && m.cards.length > 0 && (
                  <div className="w-full space-y-2">
                    {m.cards.map(card => <PropCard key={card.id} card={card} />)}
                  </div>
                )}
                {m.appointmentRequested && (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-medium px-3.5 py-2 rounded-full">
                    <Icon name="calendar" className="w-3.5 h-3.5" /> Solicitud de visita enviada
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white shadow-sm rounded-[22px] px-4 py-3 flex gap-1 items-center">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-navy/30 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            {leadSaved && (
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-1 bg-navy hover:bg-navy-mid text-white text-sm font-semibold py-3.5 rounded-full transition-colors">
                <Icon name="whatsapp" className="w-4 h-4" /> Hablar con un asesor
              </a>
            )}
          </div>

          {/* Input */}
          <div className="p-3.5 flex gap-2 bg-white">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={typing ? "Sofía está escribiendo..." : "¿Qué tipo de propiedad busca?"}
              disabled={typing}
              className="flex-1 min-w-0 bg-cream rounded-full px-5 py-3 text-[14px] text-navy focus:outline-none focus:ring-1 focus:ring-gold/40 disabled:opacity-50 placeholder:text-[#6b7385]" />
            <button onClick={send} disabled={typing || !input.trim()}
              className="w-11 h-11 bg-navy hover:bg-navy-mid disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors shrink-0">
              <Icon name="send" className="w-4 h-4" />
            </button>
          </div>
          <div className="px-5 pb-4 pt-1 bg-white text-[10px] text-navy/35 text-center tracking-[1.2px] uppercase whitespace-nowrap">
            Sofía · Duclaud · Datos protegidos
          </div>
        </div>
      )}
    </>
  );
}
