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
type PropertyContext = { id: string; title: string; url: string; operation: string } | null;

const fmt = (n: number, cur = "MXN") =>
  new Intl.NumberFormat(cur === "USD" ? "en-US" : "es-MX", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(n);

const GREETING_GENERAL = "¡Hola! Soy Sofía 👋 Asistente de BS Mérida Inmobiliaria. ¿Qué tipo de propiedad estás buscando? Cuéntame y te muestro opciones de nuestro inventario.";
const GREETING_PROP = (t: string) => `¡Hola! Soy Sofía 👋 Veo que te interesa *${t}*. ¿Tienes alguna pregunta o quieres ver propiedades similares?`;

function PropertyCardBubble({ card }: { card: PropCard }) {
  return (
    <a href={card.url} target="_blank" rel="noopener noreferrer"
      className="flex gap-3 bg-white border border-ink-line rounded-2xl overflow-hidden hover:border-brand-300 hover:shadow-md transition-all group">
      {/* Foto */}
      <div className="w-24 shrink-0 bg-brand-50">
        {card.cover
          ? <img src={card.cover} alt={card.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-2xl">🏠</div>
        }
      </div>
      {/* Info */}
      <div className="flex-1 py-2.5 pr-3 min-w-0">
        <p className="text-xs font-semibold text-ink truncate leading-tight">{card.title}</p>
        <p className="text-brand-600 font-bold text-sm mt-0.5">{fmt(card.price, card.currency)}</p>
        <p className="text-ink-muted text-[11px] truncate mt-0.5">{card.zone}</p>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-muted">
          {card.bedrooms > 0 && <span>🛏 {card.bedrooms}</span>}
          {card.bathrooms > 0 && <span>🚿 {card.bathrooms}</span>}
          {card.m2 && <span>📐 {card.m2}m²</span>}
        </div>
      </div>
      {/* Flecha */}
      <div className="flex items-center pr-3 text-brand-400 group-hover:text-brand-600 transition">›</div>
    </a>
  );
}

export function PublicChatbot() {
  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [teaserDismissed, setTeaserDismissed] = useState(false);
  const [propertyCtx, setPropertyCtx] = useState<PropertyContext>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [displayMsgs, setDisplayMsgs] = useState<DisplayMsg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [leadSaved, setLeadSaved] = useState(false);
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
    const greeting = ctx ? GREETING_PROP(ctx.title) : GREETING_GENERAL;
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
      const t = setTimeout(() => setShowTeaser(true), 4000);
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
      source: propertyCtx ? "Chatbot IA – propiedad" : "Chatbot IA",
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
    const newUserMsg: Msg = { role: "user", content: userText };
    const newMessages = [...messages, newUserMsg];
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
      const botText = error ? "Lo siento, hubo un error. Intenta de nuevo." : reply;
      setMessages(prev => [...prev, { role: "assistant", content: botText }]);
      setDisplayMsgs(prev => [...prev, { from_bot: true, text: botText, cards: propertyCards?.length ? propertyCards : undefined }]);
      if (leadData?.nombre && leadData?.telefono) await saveLead(leadData, sessionId);
    } catch {
      setTyping(false);
      setDisplayMsgs(prev => [...prev, { from_bot: true, text: "Problema de conexión. Intenta de nuevo." }]);
    }
    scrollBottom();
  };

  const openChat = () => {
    if (messages.length === 0) initConv(null);
    setOpen(true); setShowTeaser(false); setTeaserDismissed(true);
  };

  const waLink = `https://wa.me/${businessWa}?text=${encodeURIComponent(
    `Hola, vengo del sitio de BS Mérida${propertyCtx ? ` y me interesa: ${propertyCtx.title}` : ""}. Me atendió Sofía.`
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
          <div className="bg-white rounded-2xl rounded-br-md shadow-float border border-ink-line p-4 relative">
            <button onClick={() => { setShowTeaser(false); setTeaserDismissed(true); }}
              className="absolute top-2 right-2 text-ink-soft hover:text-ink-muted">
              <Icon name="x" className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-semibold">S</div>
              <div>
                <div className="font-semibold text-xs text-ink">Sofía · IA</div>
                <div className="text-[10px] text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>En línea
                </div>
              </div>
            </div>
            <p className="text-sm text-ink leading-relaxed">¡Hola! Dime qué buscas y te muestro propiedades de nuestro inventario al instante 🏠</p>
            <button onClick={openChat} className="mt-3 text-xs font-medium text-brand-600 hover:text-brand-700">Chatear con Sofía →</button>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button onClick={() => open ? setOpen(false) : openChat()} className="fixed bottom-6 right-6 z-40 group">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-float flex items-center justify-center transition group-hover:scale-105">
            {open ? <Icon name="x" className="w-6 h-6" /> : <Icon name="chat" className="w-7 h-7" />}
          </div>
          {!open && !teaserDismissed && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">1</span>
          )}
          {!open && <span className="absolute inset-0 rounded-full bg-brand-500 opacity-30 animate-ping pointer-events-none"></span>}
        </div>
      </button>

      {/* Ventana */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[400px] max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-float border border-ink-line overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-brand-500 to-brand-700 text-white p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-semibold shrink-0">S</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold tracking-tight">Sofía · Asistente IA</div>
              <div className="text-[11px] text-white/70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse"></span>
                En línea · responde en segundos
              </div>
            </div>
            {propertyCtx && <div className="text-[10px] text-white/60 max-w-[90px] truncate text-right shrink-0">{propertyCtx.title}</div>}
          </div>

          {/* Mensajes */}
          <div ref={chatRef} className="h-96 overflow-y-auto p-4 space-y-3 bg-ink-ghost">
            {displayMsgs.map((m, i) => (
              <div key={i} className={`flex flex-col ${!m.from_bot ? "items-end" : "items-start"} gap-2`}>
                {/* Burbuja de texto */}
                {m.text && (
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    !m.from_bot
                      ? "bg-brand-500 text-white rounded-br-md"
                      : "bg-white text-ink border border-ink-line rounded-bl-md"
                  }`}>
                    {fmtText(m.text)}
                  </div>
                )}
                {/* Tarjetas de propiedades */}
                {m.cards && m.cards.length > 0 && (
                  <div className="w-full space-y-2">
                    {m.cards.map(card => <PropertyCardBubble key={card.id} card={card} />)}
                  </div>
                )}
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="bg-white border border-ink-line rounded-2xl px-3 py-2.5 flex gap-1 items-center">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-ink-soft rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {leadSaved && (
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-2xl shadow-card">
                <Icon name="chat" className="w-5 h-5" /> Hablar con un asesor por WhatsApp
              </a>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-ink-line flex gap-2 bg-white">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={typing ? "Sofía está escribiendo..." : "¿Qué tipo de propiedad buscas?"}
              disabled={typing}
              className="flex-1 bg-ink-ghost rounded-full px-4 py-2.5 text-sm focus:outline-none disabled:opacity-50" />
            <button onClick={send} disabled={typing || !input.trim()}
              className="w-10 h-10 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition shrink-0">
              <Icon name="send" className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-2 border-t border-ink-line bg-white text-[10px] text-ink-soft text-center">
            Sofía · IA de BS Mérida · Tus datos están protegidos
          </div>
        </div>
      )}
    </>
  );
}
