"use client";
import { useState } from "react";

const fmtMXN = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);

type ReportData = {
  period: string;
  pnl: any;
  deals: any[];
  expenses: any[];
  agentStats: any[];
  bySource: any[];
  pipelineData: any[];
  totalLeads: number;
};

const PREGUNTAS_RAPIDAS = [
  "¿Cómo estuvo el mes? Dame un resumen ejecutivo.",
  "¿Cuál fue el asesor más rentable y por qué?",
  "¿Qué canal de marketing funcionó mejor?",
  "¿Hay alguna alerta o problema que deba atender?",
  "¿Cuáles son mis 3 prioridades para el próximo mes?",
  "¿Cómo está el pipeline? ¿Cuánto esperamos cerrar?",
];

export function FinanzasAI({ data }: { data: ReportData }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const buildContext = () => {
    const { pnl, deals, agentStats, bySource, pipelineData, period, totalLeads } = data;
    return `
Eres el CFO virtual de BS Mérida, una inmobiliaria familiar en México.
Modelo: renta = 1er mes de renta como comisión. Venta = 3-5% del valor.

PERÍODO ANALIZADO: ${period}

ESTADO DE RESULTADOS:
- Ingresos totales: ${fmtMXN(pnl.ingresoTotal)} (venta: ${fmtMXN(pnl.ingresoVenta)}, renta: ${fmtMXN(pnl.ingresoRenta)})
- Gastos comisiones asesores: ${fmtMXN(pnl.gastoComisiones)}
- Nómina: ${fmtMXN(pnl.gastoNomina)}
- Marketing: ${fmtMXN(pnl.gastoMarketing)}
- Administrativo: ${fmtMXN(pnl.gastoAdmin)}
- Utilidad operativa: ${fmtMXN(pnl.utilidadOp)}
- Margen neto: ${(pnl.margenNeto * 100).toFixed(1)}%

OPERACIONES CERRADAS: ${deals.length}
${deals.slice(0, 10).map((d: any) => `- ${d.property?.title || "Propiedad"} | ${d.operation_type} | ${fmtMXN(Number(d.transaction_value))} | Com. neta: ${fmtMXN(Number(d.net_commission))} | ${d.status}`).join("\n")}

ASESORES:
${agentStats.map((a: any) => `- ${a.full_name}: ${a.myLeads} leads, ${a.cerrados} cierres, ${a.conv}% conv, ${fmtMXN(a.ingresos)} ingresos`).join("\n")}

CANALES DE MARKETING:
${bySource.slice(0, 8).map((s: any) => `- ${s.source}: ${s.leads} leads, ${s.cerrados} cerrados, ${s.conv}% conv, ${fmtMXN(s.ingresos)} ingresos`).join("\n")}

PIPELINE:
${pipelineData.map((p: any) => `- ${p.estado}: ${p.count} leads, ingreso ponderado: ${fmtMXN(p.ponderado)}`).join("\n")}
Total leads activos: ${totalLeads}

Responde siempre en español. Sé directo, usa bullets y números concretos. 
Máximo 300 palabras por respuesta. No repitas datos que ya mencioné, interprétalos.
`;
  };

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const newMessages = [...messages, { role: "user" as const, content: msg }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildContext(),
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "No pude generar una respuesta.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Error al conectar con la IA. Intenta de nuevo." }]);
    }
    setLoading(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-full text-sm font-medium">
        ✨ Analizar con IA
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: "85vh" }}>
        {/* Header */}
        <div className="p-5 border-b border-ink-line flex items-center justify-between flex-shrink-0">
          <div>
            <div className="font-semibold text-ink">Analista Financiero IA</div>
            <div className="text-xs text-ink-muted mt-0.5">Basado en tus datos de {data.period}</div>
          </div>
          <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink text-xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        {/* Preguntas rápidas */}
        {messages.length === 0 && (
          <div className="p-5 flex-shrink-0">
            <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Preguntas frecuentes</div>
            <div className="grid grid-cols-1 gap-2">
              {PREGUNTAS_RAPIDAS.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-left text-sm text-ink px-3 py-2.5 bg-ink-ghost hover:bg-brand-50 hover:text-brand-700 rounded-xl transition">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mensajes */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-brand-500 text-white rounded-br-md"
                    : "bg-ink-ghost text-ink rounded-bl-md"
                }`}>
                  {m.role === "assistant"
                    ? m.content.split("\n").map((line, j) => <div key={j}>{line || <br />}</div>)
                    : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-ink-ghost rounded-2xl px-4 py-3 flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-ink-soft rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-1.5 h-1.5 bg-ink-soft rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-1.5 h-1.5 bg-ink-soft rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-ink-line flex gap-2 flex-shrink-0">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Pregunta algo sobre tus finanzas..."
            className="flex-1 bg-ink-ghost rounded-full px-4 py-2.5 text-sm focus:outline-none"
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="w-10 h-10 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
