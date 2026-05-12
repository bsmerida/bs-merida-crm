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
  bySource: any[];
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
      top: { style: "thin", color: { rgb: "CCCCCC" } },
      bottom: { style: "thin", color: { rgb: "CCCCCC" } },
      left: { style: "thin", color: { rgb: "CCCCCC" } },
      right: { style: "thin", color: { rgb: "CCCCCC" } },
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

      const BRAND = "3E2370";
      const BRAND_LIGHT = "EDE9F7";
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

      XLSX.writeFile(wb, `BS-Merida-CFO-${data.period.replace(/\s/g, "-")}.xlsx`);
    } catch (e: any) {
      alert("Error al generar Excel: " + e.message);
    }
    setExporting(null);
  };

  // ── PDF McKINSEY CON IA ───────────────────────────────────
  const exportPDF = async () => {
    setExporting("pdf");
    try {
      // 1. Generar narrativa con IA
      setPdfStep("Consultando con IA (McKinsey mode)...");
      let narrative = "";
      try {
        const aiRes = await fetch("/api/generar-reporte", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });
        const aiData = await aiRes.json();
        narrative = aiData.narrative || "";
      } catch {
        narrative = "No se pudo generar el análisis de IA. Mostrando solo datos.";
      }

      // 2. Generar PDF
      setPdfStep("Generando PDF profesional...");
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const BRAND: [number, number, number] = [62, 35, 112];
      const BRAND_LIGHT: [number, number, number] = [237, 233, 247];
      const DARK: [number, number, number] = [17, 24, 39];
      const GRAY: [number, number, number] = [107, 114, 128];
      const GREEN: [number, number, number] = [16, 185, 129];
      const RED: [number, number, number] = [239, 68, 68];

      // ── PORTADA ─────────────────────────────────────────
      // Fondo oscuro completo
      doc.setFillColor(...BRAND);
      doc.rect(0, 0, pageW, pageH, "F");

      // Línea decorativa
      doc.setFillColor(255, 255, 255);
      doc.rect(14, 60, 4, 40, "F");

      // Texto portada
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont("helvetica", "bold");
      doc.text("BS MÉRIDA", 24, 80);

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 185, 240);
      doc.text("INMOBILIARIA · REPORTE FINANCIERO EJECUTIVO", 24, 92);

      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(data.period, 24, 120);

      // KPIs en portada
      const kpis = [
        { label: "INGRESOS", value: fmt(data.pnl.ingresoTotal) },
        { label: "UTILIDAD", value: fmt(data.pnl.utilidadOp) },
        { label: "MARGEN", value: pct(data.pnl.margenNeto) },
        { label: "CIERRES", value: String(data.deals.length) },
      ];
      kpis.forEach((k, i) => {
        const x = 14 + i * 46;
        const y = 155;
        doc.setFillColor(255, 255, 255);
        doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
        doc.roundedRect(x, y, 42, 28, 3, 3, "F");
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
        doc.setTextColor(200, 185, 240);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(k.label, x + 4, y + 8);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(k.value, x + 4, y + 20);
      });

      // Footer portada
      doc.setFontSize(8);
      doc.setTextColor(150, 130, 190);
      doc.setFont("helvetica", "normal");
      doc.text(`Generado: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}`, 14, pageH - 20);
      doc.text("Confidencial · BS Mérida · Uso interno", pageW - 14, pageH - 20, { align: "right" });

      // ── PÁGINA 2: NARRATIVA IA ──────────────────────────
      if (narrative) {
        doc.addPage();

        // Header de página
        doc.setFillColor(...BRAND);
        doc.rect(0, 0, pageW, 18, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("BS MÉRIDA · ANÁLISIS EJECUTIVO", 14, 12);
        doc.text(data.period, pageW - 14, 12, { align: "right" });

        doc.setTextColor(...DARK);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Análisis Ejecutivo", 14, 35);

        doc.setFillColor(...BRAND);
        doc.rect(14, 38, 40, 1.5, "F");

        // Renderizar markdown de la narrativa
        let y = 50;
        const lines = narrative.split("\n");
        const maxWidth = pageW - 28;

        for (const line of lines) {
          if (y > pageH - 25) {
            doc.addPage();
            // Header en nueva página
            doc.setFillColor(...BRAND);
            doc.rect(0, 0, pageW, 18, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("BS MÉRIDA · ANÁLISIS EJECUTIVO", 14, 12);
            doc.text(data.period, pageW - 14, 12, { align: "right" });
            y = 30;
          }

          if (line.startsWith("## ")) {
            // Sección header
            y += 4;
            doc.setFillColor(...BRAND_LIGHT);
            doc.rect(14, y - 5, pageW - 28, 12, "F");
            doc.setTextColor(...BRAND);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(line.replace("## ", ""), 17, y + 3);
            y += 12;
          } else if (line.startsWith("• ") || line.startsWith("- ")) {
            // Bullet point
            doc.setTextColor(...DARK);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            const text = line.replace(/^[•\-] /, "");
            // Handle bold within bullets
            const cleanText = text.replace(/\*\*(.*?)\*\*/g, "$1");
            doc.text("•", 16, y);
            const wrapped = doc.splitTextToSize(cleanText, maxWidth - 8);
            doc.text(wrapped, 22, y);
            y += wrapped.length * 5 + 1;
          } else if (line.trim() === "") {
            y += 3;
          } else {
            // Texto normal
            doc.setTextColor(...DARK);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            const cleanText = line.replace(/\*\*(.*?)\*\*/g, "$1");
            const wrapped = doc.splitTextToSize(cleanText, maxWidth);
            doc.text(wrapped, 14, y);
            y += wrapped.length * 5 + 1;
          }
        }
      }

      // ── PÁGINA 3: ESTADO DE RESULTADOS ─────────────────
      doc.addPage();
      doc.setFillColor(...BRAND);
      doc.rect(0, 0, pageW, 18, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("BS MÉRIDA · ESTADO DE RESULTADOS", 14, 12);
      doc.text(data.period, pageW - 14, 12, { align: "right" });

      doc.setTextColor(...DARK);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Estado de Resultados", 14, 32);

      const totalIng = data.pnl.ingresoTotal || 1;
      autoTable(doc, {
        startY: 38,
        head: [["Concepto", "Monto", "% Ingresos"]],
        body: [
          ["INGRESOS", "", ""],
          ["  Comisiones de venta", fmt(data.pnl.ingresoVenta), pct(data.pnl.ingresoVenta / totalIng)],
          ["  Comisiones de renta", fmt(data.pnl.ingresoRenta), pct(data.pnl.ingresoRenta / totalIng)],
          ["TOTAL INGRESOS", fmt(data.pnl.ingresoTotal), "100.0%"],
          ["", "", ""],
          ["COSTOS DIRECTOS", "", ""],
          ["  Comisiones asesores / referidos", fmt(data.pnl.gastoComisiones), pct(data.pnl.gastoComisiones / totalIng)],
          ["UTILIDAD BRUTA", fmt(data.pnl.utilidadBruta), pct(data.pnl.utilidadBruta / totalIng)],
          ["", "", ""],
          ["GASTOS OPERATIVOS", "", ""],
          ["  Nómina", fmt(data.pnl.gastoNomina), pct(data.pnl.gastoNomina / totalIng)],
          ["  Marketing y publicidad", fmt(data.pnl.gastoMarketing), pct(data.pnl.gastoMarketing / totalIng)],
          ["  Gastos administrativos", fmt(data.pnl.gastoAdmin), pct(data.pnl.gastoAdmin / totalIng)],
          ["TOTAL GASTOS", fmt(data.pnl.gastoTotal), pct(data.pnl.gastoTotal / totalIng)],
          ["", "", ""],
          ["UTILIDAD OPERATIVA (EBIT)", fmt(data.pnl.utilidadOp), pct(data.pnl.margenNeto)],
        ],
        headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
        didParseCell: (d) => {
          const boldRows = ["TOTAL INGRESOS", "UTILIDAD BRUTA", "TOTAL GASTOS", "UTILIDAD OPERATIVA (EBIT)"];
          const headerRows = ["INGRESOS", "COSTOS DIRECTOS", "GASTOS OPERATIVOS"];
          const label = d.row.raw[0] as string;
          if (boldRows.includes(label)) {
            d.cell.styles.fontStyle = "bold";
            d.cell.styles.fillColor = BRAND_LIGHT;
          }
          if (headerRows.includes(label)) {
            d.cell.styles.fontStyle = "bold";
            d.cell.styles.textColor = BRAND;
          }
          if (label === "UTILIDAD OPERATIVA (EBIT)") {
            d.cell.styles.fillColor = data.pnl.utilidadOp >= 0 ? [220, 252, 231] : [254, 226, 226];
            d.cell.styles.textColor = data.pnl.utilidadOp >= 0 ? [20, 83, 45] : [127, 29, 29];
          }
        },
        margin: { left: 14, right: 14 },
      });

      // ── PÁGINA 4: OPERACIONES ───────────────────────────
      if (data.deals.length > 0) {
        doc.addPage();
        doc.setFillColor(...BRAND);
        doc.rect(0, 0, pageW, 18, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("BS MÉRIDA · OPERACIONES", 14, 12);
        doc.text(data.period, pageW - 14, 12, { align: "right" });

        doc.setTextColor(...DARK);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Detalle de Operaciones", 14, 32);

        autoTable(doc, {
          startY: 38,
          head: [["Propiedad", "Cliente", "Tipo", "Valor Op.", "Com. bruta", "Com. neta", "Fecha", "Estado"]],
          body: data.deals.map((d: any) => [
            (d.property?.title || "—").slice(0, 22),
            (d.lead?.name || "—").slice(0, 15),
            d.operation_type,
            fmt(Number(d.transaction_value)),
            fmt(Number(d.gross_commission)),
            fmt(Number(d.net_commission)),
            new Date(d.closing_date).toLocaleDateString("es-MX"),
            d.status,
          ]),
          foot: [["", "TOTALES", "",
            fmt(data.deals.reduce((s: number, d: any) => s + Number(d.transaction_value), 0)),
            fmt(data.deals.reduce((s: number, d: any) => s + Number(d.gross_commission), 0)),
            fmt(data.deals.reduce((s: number, d: any) => s + Number(d.net_commission), 0)),
            "", "",
          ]],
          headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          footStyles: { fillColor: BRAND_LIGHT, textColor: BRAND, fontStyle: "bold", fontSize: 8 },
          columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
          didParseCell: (d) => {
            if (d.section === "body" && d.column.index === 7) {
              if (d.cell.raw === "cobrado") d.cell.styles.textColor = [20, 83, 45];
              if (d.cell.raw === "pendiente") d.cell.styles.textColor = [120, 53, 15];
              if (d.cell.raw === "cancelado") d.cell.styles.textColor = [127, 29, 29];
            }
          },
          margin: { left: 14, right: 14 },
        });
      }

      // ── PÁGINA 5: ASESORES ──────────────────────────────
      if (data.agentStats.length > 0) {
        doc.addPage();
        doc.setFillColor(...BRAND);
        doc.rect(0, 0, pageW, 18, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("BS MÉRIDA · DESEMPEÑO ASESORES", 14, 12);
        doc.text(data.period, pageW - 14, 12, { align: "right" });

        doc.setTextColor(...DARK);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Desempeño por Asesor", 14, 32);

        autoTable(doc, {
          startY: 38,
          head: [["#", "Asesor", "Leads", "Cierres", "Conversión", "Ingresos", "Comisión", "Neto empresa"]],
          body: data.agentStats.map((a: any, i: number) => [
            i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1),
            a.full_name,
            a.myLeads,
            a.cerrados,
            `${a.conv}%`,
            fmt(a.ingresos),
            fmt(a.comisiones),
            fmt(a.netEmpresa),
          ]),
          headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
          margin: { left: 14, right: 14 },
        });
      }

      // ── HISTÓRICO (si hay) ──────────────────────────────
      if (data.history && data.history.length > 0) {
        doc.addPage();
        doc.setFillColor(...BRAND);
        doc.rect(0, 0, pageW, 18, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("BS MÉRIDA · ANÁLISIS HISTÓRICO", 14, 12);

        doc.setTextColor(...DARK);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Tendencia Histórica", 14, 32);

        autoTable(doc, {
          startY: 38,
          head: [["Período", "Ingresos", "Utilidad Op.", "Margen", "Operaciones", "Δ vs anterior"]],
          body: data.history.map((h: any, i: number) => {
            const prev = i > 0 ? data.history![i - 1] : null;
            const growth = prev && prev.ingreso_total > 0
              ? `${((h.ingreso_total - prev.ingreso_total) / prev.ingreso_total * 100).toFixed(1)}%`
              : "—";
            return [
              `${h.year}/${String(h.month).padStart(2, "0")}`,
              fmt(h.ingreso_total),
              fmt(h.utilidad_op),
              pct(h.margen_neto),
              h.num_operaciones,
              growth,
            ];
          }),
          headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
          didParseCell: (d) => {
            if (d.section === "body" && d.column.index === 5 && d.cell.raw !== "—") {
              const val = parseFloat(String(d.cell.raw));
              d.cell.styles.textColor = val >= 0 ? [20, 83, 45] : [127, 29, 29];
              d.cell.styles.fontStyle = "bold";
            }
          },
          margin: { left: 14, right: 14 },
        });
      }

      // ── FOOTER EN TODAS LAS PÁGINAS ─────────────────────
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(245, 243, 255);
        doc.rect(0, pageH - 14, pageW, 14, "F");
        doc.setFontSize(7);
        doc.setTextColor(...GRAY);
        doc.text(`BS Mérida · Reporte Financiero · ${data.period} · Confidencial`, 14, pageH - 5);
        doc.text(`Página ${i} de ${totalPages}`, pageW - 14, pageH - 5, { align: "right" });
      }

      doc.save(`BS-Merida-McKinsey-${data.period.replace(/\s/g, "-")}.pdf`);
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
        {exporting === "excel" ? "⏳ Generando..." : "📊 Excel CFO"}
      </button>
      <button onClick={exportPDF} disabled={exporting !== null}
        className="flex items-center gap-1.5 px-4 py-2 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 rounded-full text-sm font-medium disabled:opacity-50">
        {exporting === "pdf" ? `⏳ ${pdfStep || "Generando..."}` : "📄 PDF McKinsey + IA"}
      </button>
    </div>
  );
}
