"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const fmtMXN = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const QUICK = [
  "¿Cómo va el mes en comisiones?",
  "¿Qué clientes no han sido contactados?",
  "¿Cuál es el canal de marketing más efectivo?",
  "¿Qué propiedad lleva más tiempo sin movimiento?",
  "Resume el desempeño de los asesores este mes",
  "¿Cuánto tengo pendiente de cobrar?",
];

export default function AsistentePage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [context, setContext]   = useState<string>("");
  const [contextReady, setContextReady] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => { buildContext(); }, []);
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const buildContext = async () => {
    try {
      const now = new Date();
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [leads, deals, expenses, props, profiles] = await Promise.all([
        supabase.from("leads").select("id,name,status,source,created_at,agent_id").order("created_at", { ascending: false }).limit(100),
        supabase.from("deals").select("id,transaction_value,gross_commission,net_commission,operation_type,status,closing_date,agent_id").order("closing_date", { ascending: false }).limit(50),
        supabase.from("expenses").select("id,category,description,amount,expense_date").order("expense_date", { ascending: false }).limit(50),
        supabase.from("properties").select("id,title,status,operation,price,type,created_at").eq("is_published", true).limit(50),
        supabase.from("profiles").select("id,full_name,role").eq("active", true),
      ]);

      const leadsData = leads.data || [];
      const dealsData = deals.data || [];
      const propsData = props.data || [];

      const mesDeals = dealsData.filter(d => d.closing_date && d.closing_date >= inicioMes);
      const comMes = mesDeals.reduce((s, d) => s + Number(d.net_commission || 0), 0);
      const cxc = dealsData.filter(d => d.status !== "cobrado" && d.status !== "cancelado")
        .reduce((s, d) => s + Number(d.gross_commission || 0), 0);

      const byStatus: Record<string, number> = {};
      leadsData.forEach(l => { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });

      const bySource: Record<string, number> = {};
      leadsData.forEach(l => { if (l.source) bySource[l.source] = (bySource[l.source] || 0) + 1; });

      const ctx = `Eres el asistente IA de Duclaud, firma de consultoría inmobiliaria en Mérida, Yucatán.
Tienes acceso en tiempo real a los datos del CRM. Responde en español, de forma directa y profesional.
Usa "usted" con los asesores. Sin emojis. Respuestas concretas con números cuando aplique.

DATOS ACTUALES:

LEADS (${leadsData.length} total):
${Object.entries(byStatus).map(([s, n]) => `  · ${s}: ${n}`).join("\n")}
Por origen: ${Object.entries(bySource).slice(0, 6).map(([s, n]) => `${s}: ${n}`).join(", ")}
Sin contactar (Nuevo): ${byStatus["Nuevo"] || 0}

OPERACIONES DEL MES (${mesDeals.length}):
Comisiones netas: ${fmtMXN(comMes)}
${mesDeals.slice(0, 5).map(d => `  · ${d.operation_type} | ${fmtMXN(Number(d.transaction_value))} | ${fmtMXN(Number(d.net_commission))} | ${d.status}`).join("\n")}

CUENTAS POR COBRAR: ${fmtMXN(cxc)}

INVENTARIO (${propsData.length} propiedades):
Disponibles: ${propsData.filter(p => p.status === "Disponible").length}
En proceso: ${propsData.filter(p => p.status === "En proceso").length}
Más antiguas sin vender: ${propsData.filter(p => p.status === "Disponible").slice(-3).map(p => p.title).join(", ")}

EQUIPO:
${(profiles.data || []).map(p => `  · ${p.full_name} (${p.role})`).join("\n")}`;

      setContext(ctx);
      setContextReady(true);
    } catch (err: any) {
      setError("Error al cargar datos del CRM: " + err.message);
      setContextReady(true);
    }
  };

  const send = async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");
    setError(null);
    const newMsgs: Msg[] = [...messages, { role: "user", content: userText }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const res = await fetch("/api/finanzas-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs, system: context }),
      });

      if (!res.ok) throw new Error(`Error del servidor: ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setError(err.message || "Error al conectar con el asistente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-cream">
      {/* Header */}
      <div className="bg-white border-b border-stone px-8 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center">
            <span className="font-serif text-base text-gold">A</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-navy tracking-wide">Asistente IA · Duclaud</h1>
            <p className="text-[11px] text-ink-muted flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${contextReady ? "bg-emerald-500" : "bg-amber-400"}`}></span>
              {contextReady ? "Datos cargados · en línea" : "Cargando datos del CRM..."}
            </p>
          </div>
        </div>
        <button onClick={() => { setMessages([]); setError(null); }}
          className="text-xs text-ink-muted hover:text-navy border border-stone rounded-full px-4 py-2 transition-colors">
          Nueva conversación
        </button>
      </div>

      {/* Context chips */}
      <div className="bg-white border-b border-stone px-8 py-3 flex items-center gap-2 flex-wrap shrink-0">
        {["Leads activos","Comisiones del mes","Inventario","Equipo","CxC","Pipeline"].map(c => (
          <span key={c} className="text-[10px] uppercase tracking-[0.08em] text-navy/60 bg-navy/5 border border-navy/10 px-3 py-1 rounded-full">
            {c}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-ink-soft">Contexto actualizado ahora</span>
      </div>

      {/* Chat */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-stone p-8 text-center mb-8">
              <div className="w-14 h-14 bg-navy rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="font-serif text-2xl text-gold">A</span>
              </div>
              <h2 className="font-serif text-xl font-light text-navy mb-2">Asistente de Duclaud</h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Tengo acceso a los datos en tiempo real del CRM — leads, operaciones, inventario y finanzas. Pregúnteme lo que necesite.
              </p>
            </div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-ink-soft mb-3 text-center">Preguntas frecuentes</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-left text-sm text-ink-muted bg-white border border-stone hover:border-gold/50 hover:text-navy rounded-xl p-4 transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 bg-navy rounded-lg flex items-center justify-center shrink-0 mr-3 mt-1">
                <span className="font-serif text-xs text-gold">A</span>
              </div>
            )}
            <div className={`max-w-[70%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-navy text-white rounded-br-sm"
                : "bg-white text-ink border border-stone rounded-bl-sm"}`}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-navy rounded-lg flex items-center justify-center shrink-0">
              <span className="font-serif text-xs text-gold">A</span>
            </div>
            <div className="bg-white border border-stone rounded-2xl rounded-bl-sm px-5 py-4 flex gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-2 h-2 bg-navy/30 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700 flex items-start gap-3">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-stone px-8 py-4 shrink-0">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          <div className="flex-1 bg-cream border border-stone rounded-2xl px-4 py-3 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/10 transition-all">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={contextReady ? "Pregúnteme sobre clientes, operaciones, finanzas..." : "Cargando datos..."}
              disabled={loading || !contextReady}
              rows={1}
              className="w-full bg-transparent text-sm text-ink resize-none focus:outline-none placeholder:text-ink-soft disabled:opacity-50"
              style={{ maxHeight: "120px" }}
            />
          </div>
          <button onClick={() => send()} disabled={loading || !input.trim() || !contextReady}
            className="w-11 h-11 bg-navy hover:bg-navy-mid disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-ink-soft text-center mt-2">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
