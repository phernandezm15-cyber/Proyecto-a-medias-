import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface Sheet {
  name: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  totals?: (string | number)[];
}

export function exportPDF(title: string, sheets: Sheet[], file: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, w, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString("es-GT")}`, w - 14, 14, { align: "right" });
  doc.setTextColor(30, 41, 59);
  let y = 32;
  sheets.forEach((s) => {
    doc.setFontSize(12);
    doc.text(s.name, 14, y);
    if (s.subtitle) {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(s.subtitle, 14, y + 5);
      doc.setTextColor(30, 41, 59);
    }
    autoTable(doc, {
      startY: y + (s.subtitle ? 8 : 3),
      head: [s.headers],
      body: s.rows.map((r) => r.map(String)),
      ...(s.totals ? { foot: [s.totals.map(String)] } : {}),
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      styles: { fontSize: 8, cellPadding: 2.5 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 12;
  });
  doc.save(`${file}.pdf`);
}

export function exportXLSX(sheets: Sheet[], file: string) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const aoa: (string | number)[][] = [];
    if (s.subtitle) aoa.push([s.subtitle], []);
    aoa.push(s.headers, ...s.rows);
    if (s.totals) aoa.push(s.totals);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = s.headers.map((h, i) => ({
      wch: Math.min(50, Math.max(h.length, ...s.rows.map((r) => String(r[i] ?? "").length)) + 2),
    }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  XLSX.writeFile(wb, `${file}.xlsx`);
}

export function exportCSV(sheets: Sheet[], file: string) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = sheets
    .map((s) => [s.headers.map(esc).join(","), ...s.rows.map((r) => r.map(esc).join(",")), ...(s.totals ? [s.totals.map(esc).join(",")] : [])].join("\n"))
    .join("\n\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${file}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
