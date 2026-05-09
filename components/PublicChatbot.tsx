"use client";
import { useState, useEffect, useRef } from "react";
import { Icon } from "./Icon";
import { createClient } from "@/lib/supabase/client";

type Msg = { from_bot: boolean; message: string };
type PropertyContext = { id: string; title: string; url: string; operation: string } | null;
type Captured = {
  name?: string;
  phone?: string;
  zone?: string;
  budget?: string;
  financing?: string;
  type?: string;
  operation?: string;
};

// Flujo cuando viene desde una propiedad específica
function getPropertySteps(ctx: PropertyContext) {
  const isRenta = ctx?.operation?.toLowerCase().includes("rent");
  return [
    { field: "name" as const,     ask: `¡Hola! Veo que te interesa *${ctx?.title}*. Soy Sofía 👋 ¿Cuál es tu nombre?` },
    { field: "phone" as const,    ask: "Perfecto. ¿Cuál es tu WhatsApp para que un asesor te contacte?" },
    { field: "budget" as const,   ask: isRenta ? "¿Cuál es tu presupuesto mensual para la renta?" : "¿Cuál es tu presupuesto aproximado?" },
    { field: "financing" as const, ask: isRenta
        ? "¿Cuentas con aval y/o puedes cubrir doble depósito?"
        : "¿Cuentas con crédito hipotecario aprobado, o lo pagas con recurso propio?" },
  ];
}

// Flujo general (sin propiedad)
const GENERAL_STEPS = [
  { field: "operation" as const, ask: "Hola, soy Sofía 👋 ¿Buscas comprar o rentar una propiedad?" },
  { field: "type" as const,      ask: "¿Qué tipo de propiedad? (casa, departamento, terreno...)" },
  { field: "zone" as const,      ask: "¿En qué zona o ciudad te interesa?" },
  { field: "budget" as const,    ask: "¿Cuál es tu presupuesto aproximado?" },
  { field: "financing" as const, ask: "" }, // se llena dinámicamente
  { field: "name" as const,      ask: "¡Casi listo! ¿Cuál es tu nombre?" },
  { field: "phone" as const,     ask: "¿Cuál es tu teléfono o WhatsApp?" },
];

function getGeneralQuestion(stepIndex: number, captured: Captured): string {
  if (stepIndex === 4) {
    const isRenta = (captured.operation || "").toLowerCase().includes("rent");
    return isRenta
      ? "¿Cuentas con aval y/o puedes cubrir doble depósito?"
      : "¿Cuentas con crédito hipotecario aprobado, o lo pagas con recurso propio?";
  }
  return GENERAL_STEPS[stepIndex].ask;
}

export function PublicChatbot() {
  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [teaserDismissed, setTeaserDismissed] = useState(false);
  const [propertyCtx, setPropertyCtx] = useState<PropertyContext>(null);
  const [conv, setConv] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState(0);
  const [captured, setCaptured] = useState<Captured>({});
  const [done, setDone] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const businessWa = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "529997466272";

  const initConv = (ctx: PropertyContext) => {
    const steps = ctx ? getPropertySteps(ctx) : GENERAL_STEPS;
    const firstMsg = ctx ? steps[0].ask : getGeneralQuestion(0, {});
    setConv([{ from_bot: true, message: firstMsg }]);
    setStep(0);
    setCaptured(ctx ? { operation: ctx.operation } : {});
    setDone(false);
  };

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
  }, []);

  useEffect(() => {
    if (!teaserDismissed && !open) {
      const t = setTimeout(() => setShowTeaser(true), 3000);
      return () => clearTimeout(t);
    }
  }, [teaserDismissed, open]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [conv, typing, open]);

  const persistMsg = async (m: Msg) => {
    if (sessionId) await supabase.from("chatbot_messages").insert({ session_id: sessionId, ...m });
  };

  const finalize = async (data: Captured, ctx: PropertyContext) => {
    if (sessionId) {
      await supabase.from("chatbot_sessions").update({
        visitor_name: data.name, visitor_phone: data.phone, visitor_data: data, qualified: true,
      }).eq("id", sessionId);
    }
    if (data.name && data.phone) {
      const interest = ctx
        ? `Propiedad: ${ctx.title} (${ctx.url}) | ${ctx.operation} | presupuesto: ${data.budget} | financiamiento: ${data.financing}`
        : `${data.operation} de ${data.type} en ${data.zone} | presupuesto: ${data.budget} | financiamiento: ${data.financing}`;
      const { data: lead } = await supabase.from("leads").insert({
        name: data.name, phone: data.phone,
        source: ctx ? "Chatbot IA – propiedad" : "Chatbot IA",
        interest, budget_text: data.budget,
        consent_privacy: true, consent_at: new Date().toISOString(),
      }).select().single();
      if (lead && sessionId)
        await supabase.from("chatbot_sessions").update({ lead_id: lead.id }).eq("id", sessionId);
    }
    setDone(true);
  };

  const send = async () => {
    if (!input.trim() || done) return;
    const userText = input.trim();
    const userMsg: Msg = { from_bot: false, message: userText };
    setConv(prev => [...prev, userMsg]);
    persistMsg(userMsg);
    setInput("");

    const steps = propertyCtx ? getPropertySteps(propertyCtx) : GENERAL_STEPS;
    const currentField = steps[step].field;
    const newCaptured = { ...captured, [currentField]: userText };
    setCaptured(newCaptured);

    setTyping(true);
    setTimeout(async () => {
      setTyping(false);
      const nextStep = step + 1;
      if (nextStep < steps.length) {
        const question = propertyCtx
          ? steps[nextStep].ask
          : getGeneralQuestion(nextStep, newCaptured);
        const next: Msg = { from_bot: true, message: question };
        setConv(prev => [...prev, next]);
        persistMsg(next);
        setStep(nextStep);
      } else {
        const summary = propertyCtx
          ? `¡Listo, ${newCaptured.name}! Un asesor te va a contactar por WhatsApp para darte todos los detalles de *${propertyCtx.title}*.`
          : `¡Listo, ${newCaptured.name}! Un asesor te contactará pronto con opciones que se ajusten a lo que buscas. Da clic abajo para continuar.`;
        const finalMsg: Msg = { from_bot: true, message: summary };
        setConv(prev => [...prev, finalMsg]);
        persistMsg(finalMsg);
        await finalize(newCaptured, propertyCtx);
      }
    }, 800);
  };

  const openChat = async () => {
    if (conv.length === 0) initConv(null);
    setOpen(true);
    setShowTeaser(false);
    setTeaserDismissed(true);
    if (!sessionId) {
      const firstMsg = propertyCtx ? getPropertySteps(propertyCtx)[0].ask : getGeneralQuestion(0, {});
      const { data } = await supabase.from("chatbot_sessions").insert({ visitor_id: crypto.randomUUID() }).select().single();
      if (data) {
        setSessionId(data.id);
        await supabase.from("chatbot_messages").insert({ session_id: data.id, from_bot: true, message: firstMsg });
      }
    }
  };

  const buildWaLink = () => {
    const propLine = propertyCtx ? `\n*Propiedad:* ${propertyCtx.title}\n${propertyCtx.url}` : "";
    const msg =
      `Hola Inmobiliaria BS Mérida, vengo del sitio web.\n\n` +
      `*Nombre:* ${captured.name || "—"}\n` +
      `*Teléfono:* ${captured.phone || "—"}\n` +
      (propertyCtx
        ? `*Interés:* ${propertyCtx.operation} — ${propertyCtx.title}\n*Presupuesto:* ${captured.budget || "—"}\n*Financiamiento:* ${captured.financing || "—"}`
        : `*Operación:* ${captured.operation || "—"}\n*Tipo:* ${captured.type || "—"}\n*Zona:* ${captured.zone || "—"}\n*Presupuesto:* ${captured.budget || "—"}\n*Financiamiento:* ${captured.financing || "—"}`) +
      propLine + `\n\nQuedo atento. Gracias.`;
    return `https://wa.me/${businessWa}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <>
      {showTeaser && !open && (
        <div className="fixed bottom-28 right-6 z-40 max-w-[280px] fade-in">
          <div className="bg-white rounded-2xl rounded-br-md shadow-float border border-ink-line p-4 relative">
            <button onClick={() => { setShowTeaser(false); setTeaserDismissed(true); }}
              className="absolute top-2 right-2 text-ink-soft hover:text-ink-muted">
              <Icon name="x" className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-semibold">S</div>
              <div>
                <div className="font-semibold text-xs text-ink">Sofía · Asistente IA</div>
                <div className="text-[10px] text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>En línea
                </div>
              </div>
            </div>
            <p className="text-sm text-ink leading-relaxed">¡Hola! ¿Te ayudo a encontrar la propiedad ideal? Estoy aquí 24/7.</p>
            <button onClick={openChat} className="mt-3 text-xs font-medium text-brand-600 hover:text-brand-700">Iniciar conversación →</button>
          </div>
        </div>
      )}

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

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[380px] max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-float border border-ink-line overflow-hidden fade-in">
          <div className="bg-gradient-to-br from-brand-500 to-brand-700 text-white p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">S</div>
            <div className="flex-1">
              <div className="font-semibold tracking-tight">Sofía · Asistente IA</div>
              <div className="text-[11px] text-white/70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full"></span> En línea · responde en segundos
              </div>
            </div>
            {propertyCtx && <div className="text-[10px] text-white/60 max-w-[90px] truncate text-right">{propertyCtx.title}</div>}
          </div>

          <div ref={chatRef} className="h-80 overflow-y-auto p-4 space-y-2.5 bg-ink-ghost">
            {conv.map((m, i) => (
              <div key={i} className={`flex ${!m.from_bot ? "justify-end" : "justify-start"} fade-in`}>
                <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${
                  !m.from_bot ? "bg-brand-500 text-white rounded-br-md" : "bg-white text-ink border border-ink-line rounded-bl-md"
                }`}>{m.message}</div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white border border-ink-line rounded-2xl px-3 py-2.5 flex gap-1">
                  {[0,1,2].map(i => <span key={i} className="typing-dot w-1.5 h-1.5 bg-ink-soft rounded-full"></span>)}
                </div>
              </div>
            )}
            {done && (
              <a href={buildWaLink()} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-2xl shadow-card fade-in">
                <Icon name="chat" className="w-5 h-5" /> Continuar por WhatsApp
              </a>
            )}
          </div>

          {!done ? (
            <div className="p-3 border-t border-ink-line flex gap-2 bg-white">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Escribe tu respuesta..."
                className="flex-1 bg-ink-ghost rounded-full px-4 py-2.5 text-sm focus:outline-none" />
              <button onClick={send}
                className="w-10 h-10 bg-brand-500 hover:bg-brand-600 text-white rounded-full flex items-center justify-center">
                <Icon name="send" className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-3 border-t border-ink-line bg-white text-center text-xs text-ink-muted">
              ✓ Información enviada. Un asesor te escribirá pronto.
            </div>
          )}
          <div className="px-4 py-2 border-t border-ink-line bg-white text-[10px] text-ink-soft text-center">
            Powered by IA · Tus datos están protegidos
          </div>
        </div>
      )}
    </>
  );
}
