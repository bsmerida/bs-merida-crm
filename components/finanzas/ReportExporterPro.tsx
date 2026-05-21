"use client";
import { useState } from "react";

const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);
const pct = (n: number) => `${((n || 0) * 100).toFixed(1)}%`;

type ReportData = {
  period: string;
  pnl: any;
  deals: any[];
  expenses: any[];
  agentStats: any[];
  bySource?: any[]; marketingByChannel?: any[];
  pipelineData: any[];
  totalLeads: number;
  history?: any[];
};

// ── Helpers de estilo Excel ──────────────────────────────────
function cellStyle(wb: any, XLSX: any, opts: {
  bold?: boolean; italic?: boolean;
  bgColor?: string; fgColor?: string;
  fontSize?: number; align?: string;
  border?: boolean; numFmt?: string;
  wrapText?: boolean;
}) {
  return {
    font: {
      bold: opts.bold || false,
      italic: opts.italic || false,
      sz: opts.fontSize || 11,
      color: { rgb: opts.fgColor || "000000" },
    },
    fill: opts.bgColor ? { fgColor: { rgb: opts.bgColor }, patternType: "solid" } : undefined,
    alignment: {
      horizontal: opts.align || "left",
      vertical: "center",
      wrapText: opts.wrapText || false,
    },
    border: opts.border ? {
      top: { style: "thin", color: { rgb: "EDE9E1" } },
      bottom: { style: "thin", color: { rgb: "EDE9E1" } },
      left: { style: "thin", color: { rgb: "EDE9E1" } },
      right: { style: "thin", color: { rgb: "EDE9E1" } },
    } : undefined,
    numFmt: opts.numFmt,
  };
}

export function ReportExporterPro({ data }: { data: ReportData }) {
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [pdfStep, setPdfStep] = useState("");

  // ── EXCEL PRO ─────────────────────────────────────────────
  const exportExcel = async () => {
    setExporting("excel");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const BRAND = "1C2B4B";
      const BRAND_LIGHT = "EDE9E1";
      const GREEN = "14532D";
      const GREEN_LIGHT = "DCFCE7";
      const RED = "7F1D1D";
      const RED_LIGHT = "FEE2E2";
      const GRAY = "374151";
      const GRAY_LIGHT = "F9FAFB";
      const BORDER_COLOR = "E5E7EB";

      // ── HOJA 1: DASHBOARD EJECUTIVO ──────────────────────
      const dash: any[][] = [];

      // Título
      dash.push(["BS MÉRIDA · REPORTE FINANCIERO EJECUTIVO", "", "", "", ""]);
      dash.push([data.period, "", "", "", `Generado: ${new Date().toLocaleDateString("es-MX")}`]);
      dash.push([]);

      // KPIs principales en 4 columnas
      dash.push(["INDICADORES CLAVE DE DESEMPEÑO", "", "", "", ""]);
      dash.push([]);
      dash.push(["INGRESOS TOTALES", "UTILIDAD OPERATIVA", "MARGEN NETO", "OPERACIONES CERRADAS"]);
      dash.push([
        data.pnl.ingresoTotal,
        data.pnl.utilidadOp,
        data.pnl.margenNeto,
        data.deals.length,
      ]);
      dash.push([
        "período analizado",
        data.pnl.utilidadOp >= 0 ? "▲ positivo" : "▼ negativo",
        pct(data.pnl.margenNeto),
        `${data.totalLeads} leads activos`,
      ]);
      dash.push([]);

      // Estado de resultados detallado
      dash.push(["ESTADO DE RESULTADOS", "", "MONTO", "% INGRESOS"]);
      dash.push([]);

      const totalIng = data.pnl.ingresoTotal || 1;
      const pnlRows = [
        { label: "INGRESOS", isHeader: true },
        { label: "  Comisiones de venta", value: data.pnl.ingresoVenta },
        { label: "  Comisiones de renta", value: data.pnl.ingresoRenta },
        { label: "TOTAL INGRESOS", value: data.pnl.ingresoTotal, isTotal: true },
        { label: "" },
        { label: "COSTOS DIRECTOS", isHeader: true },
        { label: "  Comisiones asesores y referidos", value: -data.pnl.gastoComisiones },
        { label: "UTILIDAD BRUTA", value: data.pnl.utilidadBruta, isTotal: true },
        { label: "" },
        { label: "GASTOS OPERATIVOS", isHeader: true },
        { label: "  Nómina", value: -data.pnl.gastoNomina },
        { label: "  Marketing y publicidad", value: -data.pnl.gastoMarketing },
        { label: "  Gastos administrativos", value: -data.pnl.gastoAdmin },
        { label: "TOTAL GASTOS", value: -data.pnl.gastoTotal, isTotal: true },
        { label: "" },
        { label: "UTILIDAD OPERATIVA (EBIT)", value: data.pnl.utilidadOp, isGrand: true },
        { label: "MARGEN NETO", value: null, pctOnly: pct(data.pnl.margenNeto), isGrand: true },
      ];

      pnlRows.forEach(row => {
        if (!row.label && !row.value) { dash.push([]); return; }
        if (row.isGrand) {
          dash.push([row.label, "", row.value !== null ? row.value : row.pctOnly, row.value !== null ? pct((row.value || 0) / totalIng) : ""]);
        } else if (row.isTotal) {
          dash.push([row.label, "", row.value, pct((row.value || 0) / totalIng)]);
        } else if (row.isHeader) {
          dash.push([row.label, "", "", ""]);
        } else {
          dash.push([row.label || "", "", row.value !== undefined ? row.value : "", row.value !== undefined ? pct((row.value || 0) / totalIng) : ""]);
        }
      });

      const wsDash = XLSX.utils.aoa_to_sheet(dash);
      wsDash["!cols"] = [{ wch: 40 }, { wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 30 }];
      wsDash["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
      ];
      XLSX.utils.book_append_sheet(wb, wsDash, "📊 Dashboard");

      // ── HOJA 2: OPERACIONES ──────────────────────────────
      const opsHeaders = ["#", "Propiedad", "Cliente", "Tipo", "Modelo", "Valor operación", "Com. bruta", "% Com.", "Com. asesores", "Com. neta empresa", "Asesor", "Fecha cierre", "Estado cobro"];
      const opsRows = data.deals.map((d: any, i: number) => [
        i + 1,
        d.property?.title || "—",
        d.lead?.name || "—",
        d.operation_type === "venta" ? "Venta" : "Renta",
        d.deal_type || "directa",
        Number(d.transaction_value),
        Number(d.gross_commission),
        Number(d.commission_rate || 0),
        Number(d.agent_commission || 0) + Number(d.agent2_commission || 0) + Number(d.referral_amount || 0),
        Number(d.net_commission),
        d.agent?.full_name || "—",
        new Date(d.closing_date).toLocaleDateString("es-MX"),
        d.status,
      ]);

      // Totales
      const opsTotals = ["", "TOTALES", "", "", "",
        data.deals.reduce((s: number, d: any) => s + Number(d.transaction_value), 0),
        data.deals.reduce((s: number, d: any) => s + Number(d.gross_commission), 0),
        "",
        data.deals.reduce((s: number, d: any) => s + Number(d.agent_commission || 0) + Number(d.agent2_commission || 0) + Number(d.referral_amount || 0), 0),
        data.deals.reduce((s: number, d: any) => s + Number(d.net_commission), 0),
        "", "", "",
      ];

      const wsOps = XLSX.utils.aoa_to_sheet([opsHeaders, ...opsRows, [], opsTotals]);
      wsOps["!cols"] = [
        { wch: 4 }, { wch: 32 }, { wch: 20 }, { wch: 8 }, { wch: 18 },
        { wch: 18 }, { wch: 15 }, { wch: 8 }, { wch: 16 }, { wch: 18 },
        { wch: 20 }, { wch: 14 }, { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, wsOps, "💼 Operaciones");

      // ── HOJA 3: ASESORES ─────────────────────────────────
      const agHeaders = ["Asesor", "Leads asignados", "Leads cerrados", "Tasa conversión", "Valor total vendido", "Ingresos generados", "Comisiones pagadas", "Neto para empresa", "Margen empresa"];
      const agRows = data.agentStats.map((a: any) => [
        a.full_name,
        a.myLeads,
        a.cerrados,
        Number(a.conv) / 100,
        data.deals.filter((d: any) => d.agent_id === a.id || d.agent2_id === a.id).reduce((s: number, d: any) => s + Number(d.transaction_value), 0),
        a.ingresos,
        a.comisiones,
        a.netEmpresa,
        a.ingresos > 0 ? a.netEmpresa / a.ingresos : 0,
      ]);
      const agTotals = ["TOTALES",
        data.agentStats.reduce((s: number, a: any) => s + a.myLeads, 0),
        data.agentStats.reduce((s: number, a: any) => s + a.cerrados, 0),
        "",
        data.agentStats.reduce((s: number, a: any) => s + data.deals.filter((d: any) => d.agent_id === a.id || d.agent2_id === a.id).reduce((s2: number, d: any) => s2 + Number(d.transaction_value), 0), 0),
        data.agentStats.reduce((s: number, a: any) => s + a.ingresos, 0),
        data.agentStats.reduce((s: number, a: any) => s + a.comisiones, 0),
        data.agentStats.reduce((s: number, a: any) => s + a.netEmpresa, 0),
        "",
      ];
      const wsAgents = XLSX.utils.aoa_to_sheet([agHeaders, ...agRows, [], agTotals]);
      wsAgents["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsAgents, "👥 Asesores");

      // ── HOJA 4: MARKETING ────────────────────────────────
      const mktHeaders = ["Canal", "Leads generados", "% del total", "Leads cerrados", "Tasa conversión", "Ingresos atribuidos", "Ingreso por lead"];
      const totalLeads = data.bySource.reduce((s: number, b: any) => s + b.leads, 0) || 1;
      const mktRows = data.bySource.map((s: any) => [
        s.source,
        s.leads,
        s.leads / totalLeads,
        s.cerrados,
        Number(s.conv) / 100,
        s.ingresos,
        s.leads > 0 ? s.ingresos / s.leads : 0,
      ]);
      const wsMkt = XLSX.utils.aoa_to_sheet([mktHeaders, ...mktRows]);
      wsMkt["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsMkt, "📣 Marketing");

      // ── HOJA 5: GASTOS ───────────────────────────────────
      const expHeaders = ["Categoría", "Descripción", "Monto", "% del total gastos", "Fecha", "Recurrente"];
      const totalGastos = data.expenses.reduce((s: number, e: any) => s + Number(e.amount), 0) || 1;
      const expRows = data.expenses.map((e: any) => [
        e.category.replace(/_/g, " "),
        e.description,
        Number(e.amount),
        Number(e.amount) / totalGastos,
        new Date(e.expense_date).toLocaleDateString("es-MX"),
        e.recurring ? "Sí" : "No",
      ]);
      const expTotals = ["TOTAL", "", totalGastos, 1, "", ""];
      const wsExp = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows, [], expTotals]);
      wsExp["!cols"] = [{ wch: 25 }, { wch: 35 }, { wch: 16 }, { wch: 18 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsExp, "💰 Gastos");

      // ── HOJA 6: PIPELINE ─────────────────────────────────
      const pipHeaders = ["Etapa", "Leads", "Probabilidad", "Com. potencial", "Com. ponderada"];
      const pipRows = data.pipelineData.map((p: any) => [
        p.estado, p.count, p.prob, p.comPot, p.ponderado,
      ]);
      const pipTotal = ["TOTAL PONDERADO", data.pipelineData.reduce((s: number, p: any) => s + p.count, 0), "",
        data.pipelineData.reduce((s: number, p: any) => s + p.comPot, 0),
        data.pipelineData.reduce((s: number, p: any) => s + p.ponderado, 0),
      ];
      const wsPip = XLSX.utils.aoa_to_sheet([pipHeaders, ...pipRows, [], pipTotal]);
      wsPip["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsPip, "🔮 Pipeline");

      // ── HOJA 7: HISTÓRICO (si hay) ───────────────────────
      if (data.history && data.history.length > 0) {
        const histHeaders = ["Período", "Ingresos", "Utilidad Op.", "Margen Neto", "Operaciones", "vs. Mes Ant. (Ing.)"];
        const histRows = data.history.map((h: any, i: number) => {
          const prev = i > 0 ? data.history![i - 1] : null;
          const growth = prev && prev.ingreso_total > 0 ? (h.ingreso_total - prev.ingreso_total) / prev.ingreso_total : null;
          return [
            `${h.year}/${String(h.month).padStart(2, "0")}`,
            h.ingreso_total,
            h.utilidad_op,
            h.margen_neto,
            h.num_operaciones,
            growth !== null ? growth : "—",
          ];
        });
        const wsHist = XLSX.utils.aoa_to_sheet([histHeaders, ...histRows]);
        wsHist["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsHist, "📈 Histórico");
      }

      XLSX.writeFile(wb, `Duclaud-Finanzas-${data.period.replace(/\s/g, "-")}.xlsx`);
    } catch (e: any) {
      alert("Error al generar Excel: " + e.message);
    }
    setExporting(null);
  };

  // ── PDF McKINSEY CON IA ───────────────────────────────────
  // ── REPORTE EJECUTIVO PDF — Estándar consultora ───────────────
  const exportPDF = async () => {
    setExporting("pdf");
    try {
      setPdfStep("Preparando reporte...");
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const { DUCLAUD_LOGO_B64 } = await import("@/lib/duclaud-logo");

      const doc = new jsPDF({ orientation: "portrait", format: "a4" });
      const pW = doc.internal.pageSize.getWidth();   // 210
      const pH = doc.internal.pageSize.getHeight();  // 297
      const M = 16; // margen izq/der

      // ── Paleta ─────────────────────────────────────────────────
      const NAVY: [number, number, number] = [28, 43, 75];
      const GOLD: [number, number, number] = [196, 149, 106];
      const CREAM: [number, number, number] = [250, 248, 245];
      const STONE: [number, number, number] = [237, 233, 225];
      const INK: [number, number, number] = [17, 24, 39];
      const MUTED: [number, number, number] = [107, 114, 128];
      const GREEN: [number, number, number] = [16, 185, 129];
      const RED: [number, number, number] = [239, 68, 68];
      const AMB: [number, number, number] = [217, 119, 6];

      // ── Helpers ────────────────────────────────────────────────
      const setNav = () => { doc.setTextColor(...NAVY); };
      const setInk = () => { doc.setTextColor(...INK); };
      const setMute = () => { doc.setTextColor(...MUTED); };
      const setGold = () => { doc.setTextColor(...GOLD); };
      const setWhi = () => { doc.setTextColor(255, 255, 255); };

      const header = (title: string) => {
        doc.setFillColor(...NAVY);
        doc.rect(0, 0, pW, 20, "F");
        doc.setFillColor(...GOLD);
        doc.rect(0, 20, pW, 2.5, "F");
        // Logo pequeño
        try { doc.addImage(DUCLAUD_LOGO_B64, "PNG", M, 4, 44, 12); } catch { }
        setWhi();
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(title, pW - M, 13, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.text(data.period, M + 48, 13);
      };

      const footer = (pageNum: number) => {
        doc.setFillColor(...STONE);
        doc.rect(0, pH - 12, pW, 12, "F");
        try { doc.addImage(DUCLAUD_LOGO_B64, "PNG", M, pH - 10, 30, 8); } catch { }
        setMute();
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("Documento confidencial · Solo para uso interno", pW / 2, pH - 4.5, { align: "center" });
        doc.text(`${pageNum}`, pW - M, pH - 4.5, { align: "right" });
      };

      const sectionHeader = (txt: string, y: number): number => {
        setGold();
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text(txt.toUpperCase(), M, y);
        doc.setDrawColor(...GOLD);
        doc.setLineWidth(0.5);
        doc.line(M, y + 1.5, pW - M, y + 1.5);
        return y + 8;
      };

      const kpiBox = (x: number, y: number, w: number, h: number, label: string, value: string, sub: string, color: [number, number, number]) => {
        doc.setFillColor(...CREAM);
        doc.roundedRect(x, y, w, h, 2, 2, "F");
        doc.setFillColor(...color);
        doc.rect(x, y, 2.5, h, "F");
        doc.setTextColor(...MUTED);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(label.toUpperCase(), x + 6, y + 7);
        doc.setTextColor(...NAVY);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(value, x + 6, y + 17);
        doc.setTextColor(...color);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text(sub, x + 6, y + 23);
      };

      const barH = (x: number, y: number, w: number, h: number, val: number, maxVal: number, color: [number, number, number], label: string, valueStr: string) => {
        const bw = maxVal > 0 ? Math.max((val / maxVal) * w, 1.5) : 1.5;
        doc.setFillColor(...STONE);
        doc.roundedRect(x, y, w, h, 1, 1, "F");
        doc.setFillColor(...color);
        doc.roundedRect(x, y, bw, h, 1, 1, "F");
        setInk();
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text(label, x - 2, y + h - 1, { align: "right" });
        setMute();
        doc.text(valueStr, x + w + 2, y + h - 1);
      };

      const textBox = (x: number, y: number, w: number, text: string, opts?: { bg?: [number, number, number]; accent?: [number, number, number]; label?: string }): number => {
        const lines = doc.splitTextToSize(text, w - 12) as string[];
        const bh = lines.length * 5.2 + (opts?.label ? 14 : 10);
        doc.setFillColor(...(opts?.bg || CREAM));
        doc.roundedRect(x, y, w, bh, 2, 2, "F");
        if (opts?.accent) {
          doc.setFillColor(...opts.accent);
          doc.rect(x, y, 2.5, bh, "F");
        }
        let ty = y + 8;
        if (opts?.label) {
          doc.setTextColor(...(opts.accent || GOLD));
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.text(opts.label.toUpperCase(), x + 6, ty - 2);
          ty += 4;
        }
        setInk();
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(lines, x + 6, ty);
        return bh + 5;
      };

      // ── Cálculos analíticos ────────────────────────────────────
      setPdfStep("Calculando métricas...");
      const pnl = data.pnl;
      const deals = data.deals;
      const agents = data.agentStats || [];
      const mktCh = data.marketingByChannel || [];
      const hist = data.history || [];
      const pipeline = data.pipelineData || [];

      const totalIng = pnl.ingresoTotal || 1;
      const margen = pnl.margenNeto * 100;
      const numDeals = deals.length;
      const avgTicket = numDeals > 0 ? deals.reduce((s: number, d: any) => s + Number(d.transaction_value), 0) / numDeals : 0;
      const cobrado = deals.filter((d: any) => d.status === "cobrado").reduce((s: number, d: any) => s + Number(d.gross_commission), 0);
      const pendCxC = deals.filter((d: any) => d.status !== "cobrado" && d.status !== "cancelado").reduce((s: number, d: any) => s + Number(d.gross_commission), 0);
      const topAgent = agents.length > 0 ? [...agents].sort((a: any, b: any) => b.ingresos - a.ingresos)[0] : null;
      const topAgentShare = topAgent && totalIng > 0 ? (Number(topAgent.ingresos) / totalIng * 100) : 0;
      const top3Share = agents.slice(0, 3).reduce((s: number, a: any) => s + Number(a.ingresos), 0) / totalIng * 100;
      const prevHist = hist.length >= 2 ? hist[hist.length - 2] : null;
      const prevIng = prevHist ? Number(prevHist.ingreso_total) : 0;
      const growth = prevIng > 0 ? ((totalIng - prevIng) / prevIng * 100) : 0;
      const totalPipeline = pipeline.reduce((s: number, p: any) => s + Number(p.ponderado || 0), 0);
      const bestCh = mktCh.filter((c: any) => c.revenue > 0).sort((a: any, b: any) => b.revenue - a.revenue)[0];

      // Semáforos
      const marginColor = margen >= 30 ? GREEN : margen >= 0 ? AMB : RED;
      const marginLabel = margen >= 30 ? "Saludable" : margen >= 0 ? "Mejorable" : "Crítico";
      const growthColor = growth >= 0 ? GREEN : RED;
      const cxcRisk = pendCxC > totalIng * 0.5;

      // ────────────────────────────────────────────────────────────
      // PORTADA
      // ────────────────────────────────────────────────────────────
      setPdfStep("Generando portada...");
      doc.setFillColor(...NAVY);
      doc.rect(0, 0, pW, pH, "F");

      // Logo centrado grande
      try { doc.addImage(DUCLAUD_LOGO_B64, "PNG", pW / 2 - 55, 55, 110, 32); } catch {
        setWhi(); doc.setFontSize(28); doc.setFont("helvetica", "bold"); doc.text("DUCLAUD", pW / 2, 75, { align: "center" });
      }

      // Línea gold
      doc.setFillColor(...GOLD);
      doc.rect(M, 105, pW - M * 2, 1.5, "F");

      setWhi();
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("REPORTE FINANCIERO EJECUTIVO", pW / 2, 118, { align: "center" });

      setGold();
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(data.period, pW / 2, 135, { align: "center" });

      // KPIs portada en cajas
      const coverKPIs = [
        { l: "Ingresos totales", v: fmt(pnl.ingresoTotal), c: GOLD },
        { l: "Utilidad operativa", v: fmt(pnl.utilidadOp), c: pnl.utilidadOp >= 0 ? GREEN : RED },
        { l: "Margen neto", v: `${margen.toFixed(1)}%`, c: marginColor },
        { l: "Operaciones cerradas", v: String(numDeals), c: GOLD },
      ];
      coverKPIs.forEach((k, i) => {
        const bx = M + i * (pW - M * 2) / 4;
        const bw = (pW - M * 2) / 4 - 3;
        doc.setFillColor(255, 255, 255);
        (doc as any).GState && doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
        doc.roundedRect(bx, 152, bw, 35, 2, 2, "F");
        (doc as any).GState && doc.setGState(new (doc as any).GState({ opacity: 1 }));
        doc.setFillColor(...k.c);
        doc.rect(bx, 152, 2, 35, "F");
        doc.setTextColor(...MUTED);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(k.l.toUpperCase(), bx + 5, 162);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(k.v, bx + 5, 175);
      });

      doc.setFillColor(...GOLD);
      doc.rect(M, 198, pW - M * 2, 0.5, "F");

      setMute();
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Generado el ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}`, pW / 2, 208, { align: "center" });
      doc.text("Duclaud Consultoría Inmobiliaria  ·  Documento confidencial", pW / 2, 215, { align: "center" });

      // ────────────────────────────────────────────────────────────
      // PÁG 2: RESUMEN EJECUTIVO + SEMÁFORO
      // ────────────────────────────────────────────────────────────
      setPdfStep("Generando resumen ejecutivo...");
      doc.addPage();
      header("RESUMEN EJECUTIVO");

      let y = 30;

      // Párrafo ejecutivo principal
      const execSummary = `El período ${data.period} registró ingresos totales de ${fmt(pnl.ingresoTotal)}, con ${numDeals} operaciones cerradas y un ticket promedio de ${fmt(avgTicket)}. La composición de ingresos fue ${pnl.ingresoVenta > 0 ? `${fmt(pnl.ingresoVenta)} en ventas (${(pnl.ingresoVenta / totalIng * 100).toFixed(0)}%)` : "sin ventas"} y ${pnl.ingresoRenta > 0 ? `${fmt(pnl.ingresoRenta)} en rentas (${(pnl.ingresoRenta / totalIng * 100).toFixed(0)}%)` : "sin rentas"}. El margen neto operativo resultó en ${margen.toFixed(1)}% — ${margen >= 30 ? "por encima del umbral saludable del 25-35% para inmobiliarias boutique en México" : margen >= 0 ? "dentro de rango mínimo aceptable; hay oportunidad de optimización" : "por debajo de cero, indicando que los costos superan los ingresos en el período"}.${growth !== 0 && prevIng > 0 ? ` Respecto al período anterior, los ingresos ${growth >= 0 ? "crecieron" : "cayeron"} un ${Math.abs(growth).toFixed(1)}%.` : ""}`;

      y += textBox(M, y, pW - M * 2, execSummary, { bg: CREAM, accent: NAVY });

      // 4 indicadores semáforo
      y = sectionHeader("Indicadores clave del período", y);
      const indicadores = [
        { l: "Margen neto", v: `${margen.toFixed(1)}%`, s: marginLabel, c: marginColor },
        { l: "Tendencia vs anterior", v: prevIng > 0 ? `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%` : "Sin hist.", s: growth >= 0 ? "Crecimiento" : "Caída", c: growthColor },
        { l: "Cuentas por cobrar", v: fmt(pendCxC), s: cxcRisk ? "Riesgo alto" : "Controlado", c: cxcRisk ? RED : GREEN },
        { l: "Concentración Top-3", v: `${top3Share.toFixed(0)}%`, s: top3Share > 80 ? "Dependencia alta" : "Diversificado", c: top3Share > 80 ? AMB : GREEN },
      ];
      const iw = (pW - M * 2 - 9) / 4;
      indicadores.forEach((ind, i) => {
        kpiBox(M + i * (iw + 3), y, iw, 32, ind.l, ind.v, ind.s, ind.c);
      });
      y += 40;

      // Highlights cuadros de texto
      y = sectionHeader("Hallazgos principales", y);
      const highlights: { txt: string; c: [number, number, number]; label: string }[] = [
        topAgent
          ? { txt: `El consultor ${topAgent.full_name} lideró el período con ${fmt(topAgent.ingresos)} en ingresos y ${topAgent.cerrados} cierres (${topAgent.conv}% de conversión), representando el ${topAgentShare.toFixed(1)}% de los ingresos totales de la firma.`, c: NAVY, label: "Desempeño comercial" }
          : { txt: "No se registraron operaciones atribuidas a asesores en el período.", c: MUTED, label: "Desempeño comercial" },
        bestCh
          ? { txt: `El canal "${bestCh.channel}" generó ${fmt(bestCh.revenue)} en ingresos${bestCh.spend > 0 ? `, con un ROI de ${bestCh.roi?.toFixed(0)}% y un CAC de ${fmt(bestCh.cac || 0)} por cliente captado.` : ". Registre inversión en marketing para calcular ROI y CAC."}`, c: GOLD, label: "Marketing y adquisición" }
          : { txt: "Sin datos de canales de marketing. Asigne gastos a canales específicos para ver ROI y CAC.", c: MUTED, label: "Marketing y adquisición" },
        totalPipeline > 0
          ? { txt: `El pipeline activo tiene un valor ponderado de ${fmt(totalPipeline)}. Si la firma mantiene la tasa de conversión histórica, este pipeline representa ingreso potencial para los próximos 30-60 días.`, c: GREEN, label: "Pipeline y proyección" }
          : { txt: "Sin pipeline activo registrado. Actualice el estado de los leads para habilitar proyecciones.", c: MUTED, label: "Pipeline y proyección" },
      ];
      const hw = (pW - M * 2 - 6) / 3;
      highlights.forEach((h, i) => {
        const hh = textBox(M + i * (hw + 3), y, hw, h.txt, { accent: h.c, label: h.label });
        // all same height -- handled by tallest
      });
      y += 65;

      if (cxcRisk) {
        y += textBox(M, y, pW - M * 2,
          `ALERTA: Las cuentas por cobrar (${fmt(pendCxC)}) representan más del 50% de los ingresos del período. Se recomienda priorizar la cobranza activa de estas operaciones antes de cerrar nuevas para no comprometer el flujo de caja.`,
          { bg: [254, 226, 226], accent: RED, label: "⚠ Alerta de flujo de caja" });
      }

      footer(2);

      // ────────────────────────────────────────────────────────────
      // PÁG 3: P&L + GRÁFICA
      // ────────────────────────────────────────────────────────────
      setPdfStep("Generando estado de resultados...");
      doc.addPage();
      header("ESTADO DE RESULTADOS");
      y = 30;

      y = sectionHeader("Resultados del período " + data.period, y);

      // Gráfica horizontal de composición
      const items = [
        { l: "Comisiones ventas", v: pnl.ingresoVenta, c: NAVY },
        { l: "Comisiones rentas", v: pnl.ingresoRenta, c: GOLD },
        { l: "Com. a asesores", v: pnl.gastoComisiones, c: RED },
        { l: "Gastos nómina", v: pnl.gastoNomina, c: MUTED },
        { l: "Gastos marketing", v: pnl.gastoMarketing, c: AMB },
        { l: "Gastos admin", v: pnl.gastoAdmin, c: STONE },
      ].filter(i => i.v > 0);

      const maxV = Math.max(...items.map(i => i.v));
      const barZoneX = M + 45;
      const barZoneW = pW - M - 45 - 40;

      items.forEach((item, i) => {
        barH(barZoneX, y, barZoneW, 7, item.v, maxV, item.c, item.l, fmt(item.v));
        y += 12;
      });

      // Resultado final destacado
      const resultBg: [number, number, number] = pnl.utilidadOp >= 0 ? [220, 252, 231] : [254, 226, 226];
      doc.setFillColor(...resultBg);
      doc.roundedRect(M, y, pW - M * 2, 18, 2, 2, "F");
      doc.setFillColor(...(pnl.utilidadOp >= 0 ? GREEN : RED));
      doc.rect(M, y, 3, 18, "F");
      doc.setTextColor(...(pnl.utilidadOp >= 0 ? ([20, 83, 45] as [number, number, number]) : ([127, 29, 29] as [number, number, number])));
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("UTILIDAD OPERATIVA (EBIT)", M + 7, y + 7);
      doc.setFontSize(14);
      doc.text(fmt(pnl.utilidadOp), M + 7, y + 15);
      doc.setFontSize(9);
      doc.text(`Margen ${margen.toFixed(1)}%  ·  ${marginLabel}`, pW - M - 5, y + 11, { align: "right" });
      y += 26;

      // Tabla P&L detallada
      y = sectionHeader("Desglose completo", y);
      autoTable(doc, {
        startY: y,
        head: [["Concepto", "Monto", "% Ingresos", "Observación"]],
        body: [
          ["INGRESOS", "", "", ""],
          [`  Comisiones de venta`, fmt(pnl.ingresoVenta), pct(pnl.ingresoVenta / totalIng), numDeals > 0 ? `${deals.filter((d: any) => d.operation_type === "venta").length} ops` : "—"],
          [`  Comisiones de renta`, fmt(pnl.ingresoRenta), pct(pnl.ingresoRenta / totalIng), numDeals > 0 ? `${deals.filter((d: any) => d.operation_type === "renta").length} ops` : "—"],
          ["TOTAL INGRESOS", fmt(pnl.ingresoTotal), "100.0%", `Ticket promedio: ${fmt(avgTicket)}`],
          ["", "", "", ""],
          ["COSTOS DIRECTOS", "", "", ""],
          ["  Comisiones asesores / referidos", fmt(pnl.gastoComisiones), pct(pnl.gastoComisiones / totalIng), `${(pnl.gastoComisiones / totalIng * 100).toFixed(0)}% de bruto`],
          ["UTILIDAD BRUTA", fmt(pnl.utilidadBruta), pct(pnl.utilidadBruta / totalIng), ""],
          ["", "", "", ""],
          ["GASTOS OPERATIVOS", "", "", ""],
          ["  Nómina y recursos humanos", fmt(pnl.gastoNomina), pct(pnl.gastoNomina / totalIng), pnl.gastoNomina / totalIng > 0.3 ? "Revisar eficiencia" : "OK"],
          ["  Marketing y publicidad", fmt(pnl.gastoMarketing), pct(pnl.gastoMarketing / totalIng), ""],
          ["  Gastos administrativos", fmt(pnl.gastoAdmin), pct(pnl.gastoAdmin / totalIng), ""],
          ["TOTAL GASTOS OPERATIVOS", fmt(pnl.gastoTotal), pct(pnl.gastoTotal / totalIng), ""],
          ["", "", "", ""],
          ["UTILIDAD OPERATIVA (EBIT)", fmt(pnl.utilidadOp), pct(pnl.margenNeto), marginLabel],
        ],
        headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
        bodyStyles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "left", textColor: MUTED } },
        didParseCell: (d: any) => {
          const r = d.row.raw[0] as string;
          if (["TOTAL INGRESOS", "UTILIDAD BRUTA", "TOTAL GASTOS OPERATIVOS", "UTILIDAD OPERATIVA (EBIT)"].includes(r)) {
            d.cell.styles.fontStyle = "bold";
            d.cell.styles.fillColor = [237, 233, 225];
          }
          if (["INGRESOS", "COSTOS DIRECTOS", "GASTOS OPERATIVOS"].includes(r)) {
            d.cell.styles.fontStyle = "bold";
            d.cell.styles.textColor = NAVY;
          }
          if (r === "UTILIDAD OPERATIVA (EBIT)") {
            d.cell.styles.fillColor = pnl.utilidadOp >= 0 ? [220, 252, 231] : [254, 226, 226];
            d.cell.styles.textColor = pnl.utilidadOp >= 0 ? [20, 83, 45] : [127, 29, 29];
          }
        },
        margin: { left: M, right: M },
      });

      footer(3);

      // ────────────────────────────────────────────────────────────
      // PÁG 4: ANÁLISIS COMERCIAL — Asesores + Canales
      // ────────────────────────────────────────────────────────────
      setPdfStep("Analizando desempeño comercial...");
      doc.addPage();
      header("ANÁLISIS COMERCIAL");
      y = 30;

      // Asesores — gráfica + tabla
      y = sectionHeader("Desempeño por consultor", y);

      if (agents.length > 0) {
        const sortedA = [...agents].sort((a: any, b: any) => b.ingresos - a.ingresos);
        const maxA = Number(sortedA[0]?.ingresos) || 1;
        const aZoneX = M + 52;
        const aZoneW = pW / 2 - aZoneX - 5;

        sortedA.slice(0, 6).forEach((a: any, i: number) => {
          const ag = y + i * 11;
          barH(aZoneX, ag, aZoneW, 7, Number(a.ingresos), maxA, i === 0 ? GOLD : NAVY,
            (a.full_name || "Sin nombre").split(" ").slice(0, 2).join(" "),
            fmt(Number(a.ingresos)));
          // Conv rate al lado
          doc.setTextColor(...MUTED);
          doc.setFontSize(7.5);
          doc.text(`${a.conv}% conv.`, M + 52 + aZoneW + 26, ag + 5.5);
        });

        const tableY = y + Math.min(agents.length, 6) * 11 + 5;

        autoTable(doc, {
          startY: tableY,
          head: [["#", "Consultor", "Leads asig.", "Cierres", "Conversión", "Ingresos", "Comisión", "Neto firma"]],
          body: sortedA.map((a: any, i: number) => [
            i === 0 ? "1°" : i === 1 ? "2°" : i === 2 ? "3°" : `${i + 1}°`,
            a.full_name || "—",
            a.myLeads,
            a.cerrados,
            `${a.conv}%`,
            fmt(Number(a.ingresos)),
            fmt(Number(a.comisiones)),
            fmt(Number(a.netEmpresa)),
          ]),
          foot: [["", "TOTAL", "", deals.length, "", fmt(pnl.ingresoTotal), fmt(pnl.gastoComisiones), fmt(pnl.utilidadBruta)]],
          headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
          bodyStyles: { fontSize: 8, cellPadding: 2.5 },
          footStyles: { fillColor: [237, 233, 225], textColor: NAVY, fontStyle: "bold", fontSize: 8 },
          columnStyles: { 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
          margin: { left: M, right: M },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // Análisis de concentración
      if (agents.length >= 2) {
        const conc = textBox(M, y, pW - M * 2,
          `Análisis de concentración: el ${top3Share.toFixed(0)}% de los ingresos proviene de los ${Math.min(3, agents.length)} principales consultores. ${top3Share > 80 ? "Esta concentración representa un riesgo: si alguno de los top 3 sale de la firma, el impacto en ingresos sería significativo. Se recomienda desarrollar capacidades en el resto del equipo." : "La distribución de ingresos es relativamente sana, sin dependencia excesiva de un solo productor."}`,
          { accent: top3Share > 80 ? AMB : GREEN, label: top3Share > 80 ? "Riesgo de concentración" : "Distribución saludable" });
        y += conc;
      }

      // Canales de marketing
      if (mktCh.length > 0) {
        y = sectionHeader("Análisis de canales de adquisición", y);
        autoTable(doc, {
          startY: y,
          head: [["Canal", "Leads", "Clientes", "Conversión", "Inversión", "Ingresos", "ROI", "CAC"]],
          body: mktCh.map((c: any) => [
            c.channel,
            c.leads,
            c.cerrados,
            `${c.conv}%`,
            c.spend > 0 ? fmt(c.spend) : "Sin dato",
            c.revenue > 0 ? fmt(c.revenue) : "—",
            c.roi !== null ? `${c.roi?.toFixed(0)}%` : "—",
            c.cac !== null ? fmt(c.cac) : "—",
          ]),
          headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
          bodyStyles: { fontSize: 8, cellPadding: 2.5 },
          didParseCell: (d: any) => {
            if (d.section === "body" && d.column.index === 6) {
              const roi = parseFloat(String(d.cell.raw));
              if (!isNaN(roi)) {
                d.cell.styles.textColor = roi >= 100 ? [20, 83, 45] : roi >= 0 ? [120, 53, 15] : [127, 29, 29];
                d.cell.styles.fontStyle = "bold";
              }
            }
          },
          margin: { left: M, right: M },
        });
      }

      footer(4);

      // ────────────────────────────────────────────────────────────
      // PÁG 5: PIPELINE + OBSERVACIONES ESTRATÉGICAS
      // ────────────────────────────────────────────────────────────
      setPdfStep("Generando análisis estratégico...");
      doc.addPage();
      header("PIPELINE Y RECOMENDACIONES");
      y = 30;

      // Pipeline
      if (pipeline.length > 0) {
        y = sectionHeader("Estado del pipeline comercial", y);
        autoTable(doc, {
          startY: y,
          head: [["Etapa", "Leads", "Valor pond.", "% del total", "Lectura"]],
          body: pipeline.map((p: any) => {
            const pct2 = totalPipeline > 0 ? (Number(p.ponderado) / totalPipeline * 100).toFixed(0) : "0";
            const reading = p.estado === "Nuevo" ? "Recién ingresados" : p.estado === "Contactado" ? "Requiere seguimiento" : p.estado === "En negociación" ? "Alta probabilidad de cierre" : p.estado === "Cerrado ganado" ? "Cerrado — gestionar cobranza" : "Sin actividad reciente";
            return [p.estado, p.count, fmt(Number(p.ponderado)), `${pct2}%`, reading];
          }),
          foot: [["TOTAL PIPELINE", pipeline.reduce((s: any, p: any) => s + p.count, 0), fmt(totalPipeline), "100%", ""]],
          headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
          bodyStyles: { fontSize: 8, cellPadding: 2.5 },
          footStyles: { fillColor: [237, 233, 225], textColor: NAVY, fontStyle: "bold", fontSize: 8 },
          columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
          margin: { left: M, right: M },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Recomendaciones estratégicas
      y = sectionHeader("Observaciones y recomendaciones", y);

      const recos: { txt: string; tag: string; c: [number, number, number] }[] = [];

      if (margen < 0) {
        recos.push({ tag: "URGENTE", c: RED, txt: `El margen negativo de ${Math.abs(margen).toFixed(1)}% indica que los costos superan los ingresos. Prioridad inmediata: revisar la estructura de gastos operativos y acelerar el cierre de leads calientes en pipeline.` });
      } else if (margen < 20) {
        recos.push({ tag: "OPTIMIZAR", c: AMB, txt: `El margen del ${margen.toFixed(1)}% está por debajo del rango óptimo (25-40%). Oportunidad de mejora en control de gastos administrativos o aumento de volumen de operaciones.` });
      }

      if (pendCxC > 0) {
        recos.push({ tag: "COBRANZA", c: pendCxC > totalIng * 0.3 ? AMB : MUTED, txt: `Existe ${fmt(pendCxC)} en cuentas por cobrar pendientes. ${pendCxC > totalIng * 0.5 ? "Esta cifra es significativa — establezca un proceso de cobranza activa esta semana." : "Dar seguimiento en los próximos 15 días para no comprometer el flujo de caja del próximo período."}` });
      }

      if (topAgentShare > 60) {
        recos.push({ tag: "RIESGO", c: AMB, txt: `Alta dependencia del consultor ${topAgent?.full_name} (${topAgentShare.toFixed(0)}% de ingresos). Considere distribuir más leads a otros consultores y crear un plan de desarrollo comercial para el equipo.` });
      }

      if (totalPipeline > totalIng * 0.5) {
        recos.push({ tag: "OPORTUNIDAD", c: GREEN, txt: `El pipeline activo (${fmt(totalPipeline)}) representa el ${(totalPipeline / totalIng * 100).toFixed(0)}% de los ingresos del período. Con gestión activa, el próximo período podría superar al actual.` });
      }

      if (mktCh.every((c: any) => c.spend === 0)) {
        recos.push({ tag: "MARKETING", c: MUTED, txt: "Sin inversión de marketing registrada por canal. Registrar el gasto por canal (Facebook, Inmuebles24, etc.) en la sección de Gastos habilitará el cálculo de ROI, CAC y ROAS para optimizar la inversión." });
      }

      if (recos.length === 0) {
        recos.push({ tag: "BUEN DESEMPEÑO", c: GREEN, txt: `El período muestra indicadores sólidos: margen del ${margen.toFixed(1)}%, ${numDeals} operaciones y cuentas por cobrar bajo control. Mantener el ritmo comercial y enfocarse en aumentar el volumen de pipeline para el siguiente período.` });
      }

      const recW = (pW - M * 2 - (recos.length - 1) * 4) / Math.min(recos.length, 2);
      recos.forEach((r, i) => {
        const rx = M + (i % 2) * (recW + 4);
        const ry = y + Math.floor(i / 2) * 55;
        textBox(rx, ry, recW, r.txt, { accent: r.c, label: r.tag });
      });

      footer(5);

      // ────────────────────────────────────────────────────────────
      // PÁG 6: HISTÓRICO (si hay datos)
      // ────────────────────────────────────────────────────────────
      if (hist.length > 1) {
        setPdfStep("Generando análisis histórico...");
        doc.addPage();
        header("ANÁLISIS HISTÓRICO");
        y = 30;

        y = sectionHeader("Evolución de ingresos (últimos períodos)", y);

        // Mini gráfica de barras verticales para histórico
        const histShow = hist.slice(-12);
        const maxH = Math.max(...histShow.map((h: any) => Number(h.ingreso_total)));
        const barW2 = (pW - M * 2) / histShow.length - 2;
        const chartH = 45;

        histShow.forEach((h: any, i: number) => {
          const bx = M + i * (barW2 + 2);
          const bh = maxH > 0 ? (Number(h.ingreso_total) / maxH) * chartH : 1;
          const isCurrent = i === histShow.length - 1;
          doc.setFillColor(...(isCurrent ? GOLD : NAVY));
          doc.rect(bx, y + chartH - bh, barW2, bh, "F");
          setMute();
          doc.setFontSize(5.5);
          doc.setFont("helvetica", "normal");
          doc.text(`${h.month}/${String(h.year).slice(2)}`, bx + barW2 / 2, y + chartH + 5, { align: "center" });
          if (isCurrent) { setGold(); doc.setFont("helvetica", "bold"); }
          doc.text(h.ingreso_total > 0 ? fmt(Number(h.ingreso_total)).replace("$", "").trim() : "—",
            bx + barW2 / 2, y + chartH - bh - 2, { align: "center" });
        });

        y += chartH + 12;

        autoTable(doc, {
          startY: y,
          head: [["Período", "Ingresos", "Utilidad op.", "Margen", "Operaciones", "Δ ingresos"]],
          body: hist.slice(-12).map((h: any, i: number) => {
            const prev2 = i > 0 ? Number(hist[hist.length - 12 + i - 1]?.ingreso_total || 0) : 0;
            const g = prev2 > 0 ? ((Number(h.ingreso_total) - prev2) / prev2 * 100).toFixed(1) : "—";
            return [
              `${h.year}/${String(h.month).padStart(2, "0")}`,
              fmt(Number(h.ingreso_total)),
              fmt(Number(h.utilidad_op)),
              `${(Number(h.margen_neto || 0) * 100).toFixed(1)}%`,
              h.num_operaciones,
              typeof g === "string" && g !== "—" ? `${Number(g) >= 0 ? "+" : ""}${g}%` : "—",
            ];
          }),
          headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
          bodyStyles: { fontSize: 8, cellPadding: 2.5 },
          columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
          didParseCell: (d: any) => {
            if (d.section === "body" && d.column.index === 5 && String(d.cell.raw) !== "—") {
              const v = parseFloat(String(d.cell.raw));
              d.cell.styles.textColor = v >= 0 ? [20, 83, 45] : [127, 29, 29];
              d.cell.styles.fontStyle = "bold";
            }
          },
          margin: { left: M, right: M },
        });

        footer(6);
      }

      doc.save(`Duclaud-Reporte-${data.period.replace(/\s/g, "-")}.pdf`);
    } catch (e: any) {
      alert("Error al generar PDF: " + e.message);
    }
    setExporting(null);
    setPdfStep("");
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={exportExcel} disabled={exporting !== null}
        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-full text-sm font-medium disabled:opacity-50">
        {exporting === "excel" ? "Generando..." : "Exportar Excel"}
      </button>
      <button onClick={exportPDF} disabled={exporting !== null}
        className="flex items-center gap-1.5 px-4 py-2 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 rounded-full text-sm font-medium disabled:opacity-50">
        {exporting === "pdf" ? (pdfStep || "Generando...") : "Reporte Ejecutivo PDF"}
      </button>
    </div>
  );
}
