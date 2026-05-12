"use client";
import { useState } from "react";

const fmtMXN = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

type ReportData = {
  period: string;
  pnl: {
    ingresoVenta: number; ingresoRenta: number; ingresoTotal: number;
    gastoComisiones: number; gastoNomina: number; gastoMarketing: number; gastoAdmin: number;
    gastoTotal: number; utilidadBruta: number; utilidadOp: number; margenNeto: number;
  };
  deals: any[];
  expenses: any[];
  agentStats: any[];
  bySource: any[];
};

export function ReportExporter({ data }: { data: ReportData }) {
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const exportExcel = async () => {
    setExporting("excel");
    try {
      const XLSX = await import("xlsx");

      const wb = XLSX.utils.book_new();

      // ── Hoja 1: P&L ──────────────────────────────────────────
      const pnlRows = [
        ["ESTADO DE RESULTADOS — " + data.period],
        [],
        ["INGRESOS", ""],
        ["Comisiones de venta", data.pnl.ingresoVenta],
        ["Comisiones de renta", data.pnl.ingresoRenta],
        ["INGRESOS TOTALES", data.pnl.ingresoTotal],
        [],
        ["COSTOS DIRECTOS", ""],
        ["Comisiones asesores y referidos", -data.pnl.gastoComisiones],
        ["UTILIDAD BRUTA", data.pnl.utilidadBruta],
        [],
        ["GASTOS OPERATIVOS", ""],
        ["Nómina", -data.pnl.gastoNomina],
        ["Marketing", -data.pnl.gastoMarketing],
        ["Administrativos", -data.pnl.gastoAdmin],
        [],
        ["UTILIDAD OPERATIVA", data.pnl.utilidadOp],
        ["MARGEN NETO", fmtPct(data.pnl.margenNeto)],
      ];
      const wsPnl = XLSX.utils.aoa_to_sheet(pnlRows);
      wsPnl["!cols"] = [{ wch: 40 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsPnl, "P&L");

      // ── Hoja 2: Operaciones ───────────────────────────────────
      const dealHeaders = ["Propiedad", "Cliente", "Tipo", "Deal", "Valor operación", "Com. bruta", "Com. asesor", "Com. neta", "Fecha cierre", "Estado"];
      const dealRows = data.deals.map((d: any) => [
        d.property?.title || "—",
        d.lead?.name || "—",
        d.operation_type,
        d.deal_type,
        Number(d.transaction_value),
        Number(d.gross_commission),
        Number(d.agent_commission || 0) + Number(d.agent2_commission || 0) + Number(d.referral_amount || 0),
        Number(d.net_commission),
        new Date(d.closing_date).toLocaleDateString("es-MX"),
        d.status,
      ]);
      const wsDeals = XLSX.utils.aoa_to_sheet([dealHeaders, ...dealRows]);
      wsDeals["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsDeals, "Operaciones");

      // ── Hoja 3: Gastos ────────────────────────────────────────
      const expHeaders = ["Categoría", "Descripción", "Monto", "Fecha", "Recurrente"];
      const expRows = data.expenses.map((e: any) => [
        e.category.replace(/_/g, " "),
        e.description,
        Number(e.amount),
        new Date(e.expense_date).toLocaleDateString("es-MX"),
        e.recurring ? "Sí" : "No",
      ]);
      const wsExp = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
      wsExp["!cols"] = [{ wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsExp, "Gastos");

      // ── Hoja 4: Asesores ──────────────────────────────────────
      const agentHeaders = ["Asesor", "Leads", "Cierres", "Conversión", "Ingresos generados", "Comisión", "Neto empresa"];
      const agentRows = data.agentStats.map((a: any) => [
        a.full_name, a.myLeads, a.cerrados, `${a.conv}%`,
        a.ingresos, a.comisiones, a.netEmpresa,
      ]);
      const wsAgents = XLSX.utils.aoa_to_sheet([agentHeaders, ...agentRows]);
      wsAgents["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsAgents, "Asesores");

      // ── Hoja 5: Marketing ─────────────────────────────────────
      const mktHeaders = ["Canal", "Leads", "Cerrados", "Conversión", "Ingresos"];
      const mktRows = data.bySource.map((s: any) => [s.source, s.leads, s.cerrados, `${s.conv}%`, s.ingresos]);
      const wsMkt = XLSX.utils.aoa_to_sheet([mktHeaders, ...mktRows]);
      wsMkt["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsMkt, "Marketing");

      XLSX.writeFile(wb, `BS-Merida-Finanzas-${data.period.replace(/\s/g, "-")}.xlsx`);
    } catch (e) {
      alert("Error al generar Excel: " + e);
    }
    setExporting(null);
  };

  const exportPDF = async () => {
    setExporting("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", format: "a4" });
      const brandColor: [number, number, number] = [94, 75, 142];
      const pageW = doc.internal.pageSize.getWidth();

      // ── Portada ───────────────────────────────────────────────
      doc.setFillColor(...brandColor);
      doc.rect(0, 0, pageW, 50, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("BS MÉRIDA", 14, 22);
      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.text("Reporte Financiero", 14, 32);
      doc.setFontSize(10);
      doc.text(data.period, 14, 42);
      doc.text(`Generado: ${new Date().toLocaleDateString("es-MX")}`, pageW - 14, 42, { align: "right" });

      // ── P&L ───────────────────────────────────────────────────
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Estado de Resultados", 14, 65);

      autoTable(doc, {
        startY: 70,
        head: [["Concepto", "Monto"]],
        body: [
          ["Comisiones de venta", fmtMXN(data.pnl.ingresoVenta)],
          ["Comisiones de renta", fmtMXN(data.pnl.ingresoRenta)],
          ["Ingresos totales", fmtMXN(data.pnl.ingresoTotal)],
          ["— Comisiones asesores/referidos", fmtMXN(data.pnl.gastoComisiones)],
          ["Utilidad bruta", fmtMXN(data.pnl.utilidadBruta)],
          ["— Nómina", fmtMXN(data.pnl.gastoNomina)],
          ["— Marketing", fmtMXN(data.pnl.gastoMarketing)],
          ["— Administrativos", fmtMXN(data.pnl.gastoAdmin)],
          ["UTILIDAD OPERATIVA", fmtMXN(data.pnl.utilidadOp)],
          ["MARGEN NETO", fmtPct(data.pnl.margenNeto)],
        ],
        headStyles: { fillColor: brandColor, textColor: 255, fontStyle: "bold" },
        bodyStyles: { fontSize: 10 },
        didParseCell: (data) => {
          if (["Ingresos totales", "Utilidad bruta", "UTILIDAD OPERATIVA", "MARGEN NETO"].includes(data.row.raw[0] as string)) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [245, 243, 255];
          }
        },
        columnStyles: { 1: { halign: "right" } },
        margin: { left: 14, right: 14 },
      });

      // ── Operaciones ───────────────────────────────────────────
      if (data.deals.length > 0) {
        doc.addPage();
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("Detalle de Operaciones", 14, 20);

        autoTable(doc, {
          startY: 25,
          head: [["Propiedad", "Cliente", "Tipo", "Com. bruta", "Com. neta", "Fecha", "Estado"]],
          body: data.deals.map((d: any) => [
            (d.property?.title || "—").slice(0, 25),
            (d.lead?.name || "—").slice(0, 18),
            d.operation_type,
            fmtMXN(Number(d.gross_commission)),
            fmtMXN(Number(d.net_commission)),
            new Date(d.closing_date).toLocaleDateString("es-MX"),
            d.status,
          ]),
          headStyles: { fillColor: brandColor, textColor: 255, fontStyle: "bold", fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
          margin: { left: 14, right: 14 },
        });
      }

      // ── Asesores ──────────────────────────────────────────────
      if (data.agentStats.length > 0) {
        doc.addPage();
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("Rendimiento por Asesor", 14, 20);

        autoTable(doc, {
          startY: 25,
          head: [["Asesor", "Leads", "Cierres", "Ingresos", "Comisión", "Neto empresa", "Conv."]],
          body: data.agentStats.map((a: any) => [
            a.full_name, a.myLeads, a.cerrados,
            fmtMXN(a.ingresos), fmtMXN(a.comisiones), fmtMXN(a.netEmpresa), `${a.conv}%`,
          ]),
          headStyles: { fillColor: brandColor, textColor: 255, fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
          margin: { left: 14, right: 14 },
        });
      }

      // ── Footer en todas las páginas ───────────────────────────
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`BS Mérida · Reporte Financiero · ${data.period} · Pág. ${i}/${totalPages}`, pageW / 2, 290, { align: "center" });
      }

      doc.save(`BS-Merida-Finanzas-${data.period.replace(/\s/g, "-")}.pdf`);
    } catch (e) {
      alert("Error al generar PDF: " + e);
    }
    setExporting(null);
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={exportExcel} disabled={exporting !== null}
        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-full text-sm disabled:opacity-50">
        {exporting === "excel" ? "⏳ Generando..." : "📊 Excel"}
      </button>
      <button onClick={exportPDF} disabled={exporting !== null}
        className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-full text-sm disabled:opacity-50">
        {exporting === "pdf" ? "⏳ Generando..." : "📄 PDF"}
      </button>
    </div>
  );
}
