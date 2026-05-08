"use client";
import { useState, useEffect, useRef } from "react";
import { Icon } from "./Icon";
import { createClient } from "@/lib/supabase/client";

type Msg = { from_bot: boolean; message: string };
type PropertyContext = { id: string; title: string; url: string } | null;
type Captured = {
  operation?: string;
  type?: string;
  zone?: string;
  budget?: string;
  financing?: string;
  name?: string;
  phone?: string;
};

function getStepQuestion(stepIndex: number, captured: Captured, ctx: PropertyContext): string {
  const isRenta = (captured.operation || "").toLowerCase().includes("rent");
  switch (stepIndex) {
    case 0:
      return ctx
        ? `¡Hola! Veo que te interesa *${ctx.title}*. Soy Sofía, asistente IA de BS Mérida. ¿Buscas comprarla o rentarla?`
        : "Hola, soy Sofía 👋 ¿Buscas comprar o rentar una propiedad?";
    case 1: return "Perfecto. ¿Qué tipo de propiedad? (casa, departamento, oficina, terreno...)";
    case 2: return "¿En qué zona o ciudad te interesa?";
    case 3: return "¿Cuál es tu presupuesto aproximado?";
    case 4: return isRenta
      ? "¿Cuentas con aval y/o puedes cubrir doble depósito para la renta?"
      : "¿Cuentas con crédito hipotecario aprobado, o lo cubres con recurso propio?";
    case 5: return "¡Casi listo! ¿Cuál es tu nombre?";
    case 6: return "Por último, ¿cuál es tu teléfono o WhatsApp?";
    default: return "";
  }
}

const TOTAL_STEPS = 7;

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
    const firstMsg = getStepQuestion(0, {}, ctx);
    setConv([{ from_bot: true, message: firstMsg }]);
    setStep(0);
    setCaptured({});
    setDone(false);
  };

  // Escucha el evento disparado por PropertyContactButtons
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

  const startSession = async (firstMsg: string) => {
    const { data } = await supabase
      .from("chatbot_sessions")
      .insert({ visitor_id: crypto.randomUUID() })
      .select()
      .single();
    if (data) {
      setSessionId(data.id);
      await supabase.from("chatbot_messages").insert({ session_id: data.id, from_bot: true, message: firstMsg });
      return data.id;
    }
    return null;
  };

  const persistMsg = async (m: Msg) => {
    if (sessionId) await supabase.from("chatbot_messages").insert({ session_id: sessionId, ...m });
  };

  const finalize = async (data: Captured, ctx: PropertyContext) => {
    if (sessionId) {
      await supabase.from("chatbot_sessions").update({
        visitor_name: data.name,
        visitor_phone: data.phone,
        visitor_data: data,
        qualified: true,
      }).eq("id", sessionId);
    }
    if (data.name && data.phone) {
      const interest = ctx
        ? `Propiedad: ${ctx.title} (${ctx.url}) | ${data.operation} ${data.type} en ${data.zone} | presupuesto ${data.budget} | financiamiento: ${data.financing}`
        : `${data.operation} ${data.type} en ${data.zone} | presupuesto ${data.budget} | financiamiento: ${data.financing}`;
      const { data: lead } = await supabase.from("leads").insert({
        name: data.name,
        phone: data.phone,
        source: ctx ? "Chatbot IA – propiedad" : "Chatbot IA",
        interest,
        budget_text: data.budget,
        consent_privacy: true,
        consent_at: new Date().toISOString(),
      }).select().single();
      if (lead && sessionId) {
        await supabase.from("chatbot_sessions").update({ lead_id: lead.id }).eq("id", sessionId);
      }
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

    const fields: (keyof Captured)[] = ["operation", "type", "zone", "budget", "financing", "name", "phone"];
    const newCaptured = { ...captured, [fields[step]]: userText };
    setCaptured(newCaptured);

    setTyping(true);
    setTimeout(async () => {
      setTyping(false);
      const nextStep = step + 1;
      if (nextStep < TOTAL_STEPS) {
        const question = getStepQuestion(nextStep, newCaptured, propertyCtx);
        const next: Msg = { from_bot: true, message: question };
        setConv(prev => [...prev, next]);
        persistMsg(next);
        setStep(nextStep);
      } else {
        const summary = propertyCtx
          ? `¡Perfecto, ${newCaptured.name}! Registré tu interés en *${propertyCtx.title}*. Un asesor te contactará por WhatsApp con todos los detalles.`
          : `¡Perfecto, ${newCaptured.name}! Ya tengo tu información. Un asesor te mostrará las mejores opciones. ¡Da clic en el botón de abajo!`;
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
      const firstMsg = getStepQuestion(0, {}, propertyCtx);
      await startSession(firstMsg);
    }
  };

  const buildWaLink = () => {
    const propLine = propertyCtx
      ? `\n*Propiedad:* ${propertyCtx.title}\n${propertyCtx.url}`
      : "";
    const msg =
      `Hola Inmobiliaria BS Mérida, vengo del sitio web. Mi info:\n\n` +
      `*Nombre:* ${captured.name || "—"}\n` +
      `*Teléfono:* ${captured.phone || "—"}\n` +
      `*Operación:* ${captured.operation || "—"}\n` +
      `*Tipo:* ${captured.type || "—"}\n` +
      `*Zona:* ${captured.zone || "—"}\n` +
      `*Presupuesto:* ${captured.budget || "—"}\n` +
      `*Financiamiento:* ${captured.financing || "—"}` +
      propLine +
      `\n\nQuedo atento. Gracias.`;
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
            <button onClick={openChat} className="mt-3 text-xs font-medium text-brand-600 hover:text-brand-700">
              Iniciar conversación →
            </button>
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
            {propertyCtx && (
              <div className="text-[10px] text-white/60 max-w-[90px] truncate text-right">{propertyCtx.title}</div>
            )}
          </div>

          <div ref={chatRef} className="h-80 overflow-y-auto p-4 space-y-2.5 bg-ink-ghost">
            {conv.map((m, i) => (
              <div key={i} className={`flex ${!m.from_bot ? "justify-end" : "justify-start"} fade-in`}>
                <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${
                  !m.from_bot ? "bg-brand-500 text-white rounded-br-md" : "bg-white text-ink border border-ink-line rounded-bl-md"
                }`}>
                  {m.message}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white border border-ink-line rounded-2xl px-3 py-2.5 flex gap-1">
                  <span className="typing-dot w-1.5 h-1.5 bg-ink-soft rounded-full"></span>
                  <span className="typing-dot w-1.5 h-1.5 bg-ink-soft rounded-full"></span>
                  <span className="typing-dot w-1.5 h-1.5 bg-ink-soft rounded-full"></span>
                </div>
              </div>
            )}
            {done && (
              <div className="fade-in">
                <a href={buildWaLink()} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full mt-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-2xl shadow-card">
                  <Icon name="chat" className="w-5 h-5" /> Continuar por WhatsApp
                </a>
              </div>
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
