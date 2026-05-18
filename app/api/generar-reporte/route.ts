import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Sin API key" }, { status: 500 });

  try {
    const { data } = await req.json();
    const { period, pnl, deals, agentStats, bySource, pipelineData, expenses, history } = data;

    const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);
    const pct = (n: number) => `${((n || 0) * 100).toFixed(1)}%`;

    // Construir contexto histórico si existe
    const historyContext = history && history.length > 0 ? `
CONTEXTO HISTÓRICO (últimos ${history.length} meses):
${history.map((h: any) => `${h.year}/${String(h.month).padStart(2,"0")}: Ingresos ${fmt(h.ingreso_total)}, Utilidad ${fmt(h.utilidad_op)}, Margen ${pct(h.margen_neto)}, Ops ${h.num_operaciones}`).join("\n")}
Promedio histórico ingresos: ${fmt(history.reduce((s: number, h: any) => s + h.ingreso_total, 0) / history.length)}
Mejor mes: ${fmt(Math.max(...history.map((h: any) => h.ingreso_total)))}
Peor mes: ${fmt(Math.min(...history.map((h: any) => h.ingreso_total)))}
` : "Sin datos históricos previos disponibles.";

    const system = `Eres socio senior de McKinsey & Company especializado en real estate y empresas familiares en México. 
Tu trabajo es generar reportes ejecutivos de máximo nivel profesional en español.
Usas datos concretos, eres directo, identificas patrones, señalas riesgos y oportunidades con precisión quirúrgica.
Formato: usa markdown con headers ##, bullets •, y negritas **. Máximo 800 palabras. Sin florituras, solo insights accionables.`;

    const prompt = `Genera un reporte ejecutivo financiero para BS Mérida, inmobiliaria boutique en México.
Período: ${period}

ESTADO DE RESULTADOS:
• Ingresos totales: ${fmt(pnl.ingresoTotal)} (venta: ${fmt(pnl.ingresoVenta)} | renta: ${fmt(pnl.ingresoRenta)})
• Costo comisiones asesores/referidos: ${fmt(pnl.gastoComisiones)}
• Utilidad bruta: ${fmt(pnl.utilidadBruta)} | Margen bruto: ${pct(pnl.ingresoTotal > 0 ? pnl.utilidadBruta/pnl.ingresoTotal : 0)}
• Nómina: ${fmt(pnl.gastoNomina)} | Marketing: ${fmt(pnl.gastoMarketing)} | Admin: ${fmt(pnl.gastoAdmin)}
• Utilidad operativa: ${fmt(pnl.utilidadOp)} | Margen neto: ${pct(pnl.margenNeto)}

OPERACIONES (${deals.length} cierres):
${deals.slice(0,6).map((d: any) => `• ${d.property?.title?.slice(0,30) || "Propiedad"} | ${d.operation_type} | ${fmt(Number(d.transaction_value))} | Neto empresa: ${fmt(Number(d.net_commission))} | ${d.status}`).join("\n")}

ASESORES:
${agentStats.map((a: any) => `• ${a.full_name}: ${a.myLeads} leads | ${a.cerrados} cierres | ${a.conv}% conv | ${fmt(a.ingresos)} ingresos | ${fmt(a.comisiones)} pagado`).join("\n")}

CANALES:
${bySource.slice(0,6).map((s: any) => `• ${s.source}: ${s.leads} leads | ${s.cerrados} cierres | ${s.conv}% conv | ${fmt(s.ingresos)} ingresos`).join("\n")}

PIPELINE:
${pipelineData.map((p: any) => `• ${p.estado}: ${p.count} leads | ponderado: ${fmt(p.ponderado)}`).join("\n")}
Total ponderado pipeline: ${fmt(pipelineData.reduce((s: number, p: any) => s + p.ponderado, 0))}

${historyContext}

Estructura el reporte con exactamente estas secciones:
## Resumen Ejecutivo
## Análisis de Ingresos
## Rentabilidad y Márgenes
## Desempeño Comercial
## Pipeline y Proyección
${history && history.length > 0 ? "## Análisis Histórico y Tendencias\n" : ""}## Alertas y Riesgos
## Recomendaciones Estratégicas (top 3 acciones para el próximo mes)`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL_SONNET || "claude-sonnet-4-6",
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const result = await res.json();
    const narrative = result.content?.[0]?.text || "";
    return NextResponse.json({ narrative });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
