"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "./Icon";
import { createClient } from "@/lib/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };
type PropCard = {
  id: string; title: string; type: string; operation: string;
  price: number; currency: string; zone: string;
  bedrooms: number; bathrooms: number; m2: number | null;
  cover: string | null; url: string;
};
type DisplayMsg = { from_bot: boolean; text: string; cards?: PropCard[] };
type PropertyContext = { id: string; title: string; operation: string } | null;

const fmt = (n: number, cur = "MXN") =>
  new Intl.NumberFormat(cur === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(n);

const GREETING = "Hola, soy Sofía — asistente de Duclaud. ¿Qué tipo de propiedad está buscando? Cuénteme y le muestro opciones de nuestro inventario.";
const GREETING_PROP = (t: string) => `Hola, soy Sofía. Veo que le interesa *${t}*. ¿Tiene alguna pregunta o desea ver opciones similares?`;

function PropCard({ card }: { card: PropCard }) {
  return (
    <a href={card.url} target="_blank" rel="noopener noreferrer"
      className="flex gap-3 bg-white border border-stone rounded-2xl overflow-hidden hover:border-gold/50 hover:shadow-sm transition-all group">
      <div className="w-20 h-20 shrink-0 bg-stone">
        {card.cover
          ? <img src={card.cover} alt={card.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Icon name="building" className="w-6 h-6 text-stone-dk" /></div>}
      </div>
      <div className="flex-1 py-2.5 pr-2 min-w-0">
        <p className="text-xs font-medium text-navy truncate">{card.title}</p>
        <p className="text-gold font-semibold text-sm mt-0.5">{fmt(card.price, card.currency)}</p>
        <p className="text-ink-muted text-[10px] truncate mt-0.5">{card.zone}</p>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-muted">
          {card.bedrooms > 0  && <span className="flex items-center gap-1"><Icon name="bed"  className="w-3 h-3" />{card.bedrooms}</span>}
          {card.bathrooms > 0 && <span className="flex items-center gap-1"><Icon name="bath" className="w-3 h-3" />{card.bathrooms}</span>}
          {card.m2 && <span>{card.m2}m²</span>}
        </div>
      </div>
      <div className="flex items-center pr-2 text-stone-dk group-hover:text-gold transition">
        <Icon name="chevronRight" className="w-4 h-4" />
      </div>
    </a>
  );
}

export function PublicChatbot() {
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
  const chatRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const businessWa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";

  const scrollBottom = () =>
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 80);

  const initSession = useCallback(async (greeting: string) => {
    const { data } = await supabase.from("chatbot_sessions").insert({ visitor_id: crypto.randomUUID() }).select().single();
    if (data) {
      setSessionId(data.id);
      await supabase.from("chatbot_messages").insert({ session_id: data.id, from_bot: true, message: greeting });
    }
  }, [supabase]);

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
    const interest = propertyCtx
      ? `Propiedad: ${propertyCtx.title} | ${propertyCtx.operation}`
      : `${leadData.operacion || ""} ${leadData.zona || ""}`.trim();
    const { data: lead } = await supabase.from("leads").insert({
      name: leadData.nombre, phone: leadData.telefono,
      source: propertyCtx ? "Sofía IA – propiedad" : "Sofía IA",
      interest: interest || null, budget_text: leadData.presupuesto || null,
      consent_privacy: true, consent_at: new Date().toISOString(),
    }).select().single();
    if (lead && sid) {
      await supabase.from("chatbot_sessions").update({
        visitor_name: leadData.nombre, visitor_phone: leadData.telefono,
        visitor_data: leadData, qualified: true, lead_id: lead.id,
      }).eq("id", sid);
    }
    setLeadSaved(true);
  };

  const send = async () => {
    if (!input.trim() || typing) return;
    const userText = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: userText }];
    setMessages(newMessages);
    setDisplayMsgs(prev => [...prev, { from_bot: false, text: userText }]);
    if (sessionId) supabase.from("chatbot_messages").insert({ session_id: sessionId, from_bot: false, message: userText });
    setTyping(true);
    scrollBottom();

    try {
      const res = await fetch("/api/sofia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, propertyCtx, sessionId }),
      });
      const { reply, leadData, propertyCards, error } = await res.json();
      setTyping(false);
      const botText = error ? "Lo siento, hubo un error. Intente de nuevo." : reply;
      setMessages(prev => [...prev, { role: "assistant", content: botText }]);
      setDisplayMsgs(prev => [...prev, { from_bot: true, text: botText, cards: propertyCards?.length ? propertyCards : undefined }]);
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

  const waLink = `https://wa.me/${businessWa}?text=${encodeURIComponent(
    `Hola, vengo del sitio de Duclaud${propertyCtx ? ` y me interesa: ${propertyCtx.title}` : ""}. Me atendió Sofía.`
  )}`;

  const fmtText = (text: string) =>
    text.split(/(\*[^*]+\*)/g).map((p, i) =>
      p.startsWith("*") && p.endsWith("*") ? <strong key={i}>{p.slice(1, -1)}</strong> : p
    );

  return (
    <>
      {/* Teaser */}
      {showTeaser && !open && (
        <div className="fixed bottom-28 right-6 z-40 max-w-[280px]">
          <div className="bg-white rounded-2xl shadow-float border border-stone p-4 relative">
            <button onClick={() => { setShowTeaser(false); setTeaserDismissed(true); }}
              className="absolute top-2 right-2 text-ink-soft hover:text-ink-muted">
              <Icon name="x" className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 bg-navy flex items-center justify-center">
                <span className="font-serif text-xs text-gold">S</span>
              </div>
              <div>
                <div className="font-medium text-xs text-navy">Sofía · Duclaud</div>
                <div className="text-[10px] text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>En línea
                </div>
              </div>
            </div>
            <p className="text-sm text-ink leading-relaxed">¿Buscando una propiedad? Dígame qué necesita y le muestro opciones al instante.</p>
            <button onClick={openChat} className="mt-3 text-[11px] uppercase tracking-[0.08em] text-gold hover:text-gold-dk transition-colors">
              Iniciar conversación →
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button onClick={() => open ? setOpen(false) : openChat()} className="fixed bottom-6 right-6 z-40">
        <div className="relative">
          <div className="w-14 h-14 bg-navy hover:bg-navy-mid text-white shadow-float flex items-center justify-center transition-colors rounded-full">
            {open
              ? <Icon name="x" className="w-5 h-5" />
              : <span className="font-serif text-lg text-gold">S</span>}
          </div>
          {!open && <span className="absolute inset-0 bg-navy opacity-20 animate-ping pointer-events-none"></span>}
        </div>
      </button>

      {/* Ventana */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[390px] max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-float border border-stone overflow-hidden">
          {/* Header */}
          <div className="bg-navy text-white p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-gold/20 border border-gold/30 rounded-full flex items-center justify-center shrink-0">
              <span className="font-serif text-base text-gold">S</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium tracking-wide text-sm">Sofía · Asistente Duclaud</div>
              <div className="text-[10px] text-white/50 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                En línea · responde en segundos
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
              <Icon name="x" className="w-4 h-4" />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={chatRef} className="h-80 overflow-y-auto p-4 space-y-3 bg-cream">
            {displayMsgs.map((m, i) => (
              <div key={i} className={`flex flex-col ${!m.from_bot ? "items-end" : "items-start"} gap-2`}>
                {m.text && (
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    !m.from_bot
                      ? "bg-navy text-white rounded-br-sm"
                      : "bg-white text-ink border border-stone rounded-bl-sm"}`}>
                    {fmtText(m.text)}
                  </div>
                )}
                {m.cards && m.cards.length > 0 && (
                  <div className="w-full space-y-2">
                    {m.cards.map(card => <PropCard key={card.id} card={card} />)}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white border border-stone rounded-2xl px-3.5 py-2.5 flex gap-1 items-center">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-ink-soft rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            {leadSaved && (
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-1 bg-navy hover:bg-navy-mid text-white text-sm font-medium py-3 rounded-2xl transition-colors">
                <Icon name="whatsapp" className="w-4 h-4" /> Hablar con un asesor
              </a>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-stone flex gap-2 bg-white">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={typing ? "Sofía está escribiendo..." : "¿Qué tipo de propiedad busca?"}
              disabled={typing}
              className="flex-1 bg-cream rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gold/40 disabled:opacity-50" />
            <button onClick={send} disabled={typing || !input.trim()}
              className="w-10 h-10 bg-navy hover:bg-navy-mid disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors shrink-0">
              <Icon name="send" className="w-4 h-4" />
            </button>
          </div>
          <div className="px-4 py-2 border-t border-stone bg-white text-[10px] text-ink-soft text-center tracking-wide">
            SOFÍA · ASISTENTE DUCLAUD · Sus datos están protegidos
          </div>
        </div>
      )}
    </>
  );
}
