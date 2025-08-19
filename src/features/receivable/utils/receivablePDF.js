import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "../../../assets/LogoAutopartes.jpg";

const getImageDataURL = (img, quality = 0.8) =>
  new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", quality));
    } catch (error) {
      reject(error);
    }
  });

const addLogo = async (doc, { x = 165, y = 5, width = 30, height = 30, quality = 0.8 } = {}) => {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout al cargar el logo")), 5000);
      img.onload = () => { clearTimeout(timeout); resolve(); };
      img.onerror = (error) => { clearTimeout(timeout); reject(error); };
      img.src = logoImage;
    });

    const imageDataURL = await getImageDataURL(img, quality);
    doc.addImage(imageDataURL, "JPEG", x, y, width, height);
  } catch {
    doc.setFont("helvetica", "bold").setFontSize(8).text("LOGO", x + width / 2, y + height / 2, { align: "center" });
  }
};

const safeText = (value, fallback = "-") =>
  value === null || value === undefined || value === "" ? fallback : String(value).trim();

const formatCurrency = (amount, currency = "", decimals = 2) =>
  typeof amount !== "number" || isNaN(amount) ? "0.00" : `${currency} ${amount.toFixed(decimals)}`.trim();

const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  return isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const addHeader = (doc) =>
  doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(0, 0, 0).text("CUENTA POR COBRAR", 14, 25);

const getEstadoInfo = (estado) => {
  const estados = {
    parcialmente_vencido: { text: "PARCIALMENTE VENCIDO", color: [23, 162, 184] },
    vencido: { text: "VENCIDO", color: [220, 53, 69] },
    al_dia: { text: "AL DÍA", color: [40, 167, 69] },
    por_vencer: { text: "POR VENCER", color: [23, 162, 184] },
  };
  return estados[estado] || { text: estado?.toUpperCase() || "SIN ESTADO", color: [108, 117, 125] };
};

const addClientInfo = (doc, debt) => {
  const startY = 40, leftX = 14, rightX = 110;
  doc.setFontSize(10);

  const estadoInfo = getEstadoInfo(debt.estado);
  doc.setFont("helvetica", "bold")
    .setFillColor(...estadoInfo.color)
    .setTextColor(255, 255, 255)
    .rect(leftX, startY - 4, 60, 8, "F")
    .text(estadoInfo.text, leftX + 2, startY + 1);

  doc.setTextColor(0, 0, 0);

  const leftData = [
    { label: "Cliente:", value: safeText(debt.nombre) },
    { label: "RUC:", value: safeText(debt.ruc) },
    { label: "Código:", value: safeText(debt.clienteCodigo) },
    { label: "Vendedor:", value: safeText(debt.vendedor) },
  ];

  const rightData = [
    { label: "Total Documentos:", value: safeText(debt.totalDocumentos, "0") },
    { label: "Docs. Vencidos:", value: safeText(debt.documentosVencidos, "0") },
    { label: "% Vencidos:", value: `${debt.porcentajeVencidos || 0}%` },
    { label: "Antigüedad Prom.:", value: `${debt.antiguedadPromedio || 0} días` },
  ];

  leftData.forEach((item, i) => {
    const y = startY + 12 + i * 8;
    doc.setFont("helvetica", "bold").text(item.label, leftX, y);
    doc.setFont("helvetica", "normal").text(item.value, leftX + 25, y);
  });

  rightData.forEach((item, i) => {
    const y = startY + 12 + i * 6;
    doc.setFont("helvetica", "bold").text(item.label, rightX, y);
    doc.setFont("helvetica", "normal").text(item.value, rightX + 35, y);
  });

  const montosY = startY + 44;
  doc.setDrawColor(200).setLineWidth(0.3).line(leftX, montosY, rightX + 80, montosY);

  doc.setFont("helvetica", "bold").setFontSize(9).text("SALDOS:", leftX, montosY + 8);
  doc.setFont("helvetica", "normal")
    .text(`PEN: ${formatCurrency(debt.saldoPEN || 0, "PEN")}`, leftX, montosY + 14)
    .text(`USD: ${formatCurrency(debt.saldoUSD || 0, "USD")}`, leftX, montosY + 20);

  doc.setFont("helvetica", "bold").text("VENCIDOS:", rightX, montosY + 8);
  doc.setFont("helvetica", "normal")
    .text(`PEN: ${formatCurrency(debt.saldoVencidoPEN || 0, "PEN")}`, rightX, montosY + 14)
    .text(`USD: ${formatCurrency(debt.saldoVencidoUSD || 0, "USD")}`, rightX, montosY + 20);
};

const addDocumentsTable = (doc, debt) => {
  const documents = debt.documentos || [];
  if (!documents.length) return doc.setFont("helvetica", "italic").setFontSize(10).text("No hay documentos registrados", 14, 95);

  const tableData = documents.map((d, i) => [
    safeText(d.numeroDocumento),
    safeText(d.tipoDocumento),
    formatDate(d.fechaDocumento),
    formatDate(d.fechaContable),
    safeText(d.condicionPago),
    d.estaVencido ? `${d.diasVencimiento || 0}` : "-",
    safeText(d.moneda) + " - " + formatCurrency(d.totalDocumento),
  ]);

  autoTable(doc, {
    startY: 85,
    head: [[ "N° Documento", "Tipo", "F. Documento", "F. Contable", "Condición Pago", "Días Venc.", "Total"]],
    body: tableData,
    styles: { fontSize: 7, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [52, 58, 64], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 7 },
    columnStyles: { 7: { halign: "right", cellWidth: 30 } },
    margin: { left: 14, right: 14 },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    didParseCell: (data) => {
      const docu = documents[data.row.index];
      if (docu?.estaVencido) {
        data.cell.styles.fillColor = [255, 235, 238];
        data.cell.styles.textColor = [139, 0, 0];
        if (data.column.index === 6) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [220, 53, 69];
          data.cell.styles.textColor = [255, 255, 255];
        }
      }
    },
  });
};

const addSummary = (doc, debt) => {
  const finalY = doc.lastAutoTable?.finalY || 150;
  const startY = finalY + 15;

  doc.setFont("helvetica", "bold")
    .setFontSize(12)
    .text("RESUMEN EJECUTIVO", 14, startY);

  doc.setDrawColor(52, 58, 64)
    .setLineWidth(0.5)
    .line(14, startY + 3, 80, startY + 3);

  const docs = debt.documentos || [];
  const vencidos = docs.filter((d) => d.estaVencido);
  const porVencer = docs.filter((d) => !d.estaVencido);

  const sum = (arr, moneda) =>
    arr.filter((d) => d.moneda === moneda).reduce((s, d) => s + (d.totalDocumento || 0), 0);

  const left = [
    { label: "Documentos Vencidos:", value: `${vencidos.length} de ${docs.length}` },
    { label: "Monto Vencido PEN:", value: formatCurrency(sum(vencidos, "PEN"), "PEN") },
    { label: "Monto Vencido USD:", value: formatCurrency(sum(vencidos, "USD"), "USD") },
  ];

  const right = [
    { label: "Estado General:", value: getEstadoInfo(debt.estado).text },
    { label: "Documentos por Vencer:", value: `${porVencer.length}` },
    { label: "Monto por Vencer PEN:", value: formatCurrency(sum(porVencer, "PEN"), "PEN") },
    { label: "Monto por Vencer USD:", value: formatCurrency(sum(porVencer, "USD"), "USD") },
  ];

  // 🔹 Contenido con fuente más pequeña
  const contentFontSize = 9;

  left.forEach((item, i) => {
    const y = startY + 10 + i * 6;
    doc.setFont("helvetica", "bold").setFontSize(contentFontSize).text(item.label, 14, y);
    doc.setFont("helvetica", "normal").setFontSize(contentFontSize).text(item.value, 55, y);
  });

  right.forEach((item, i) => {
    const y = startY + 10 + i * 6;
    doc.setFont("helvetica", "bold").setFontSize(contentFontSize).text(item.label, 110, y);
    doc.setFont("helvetica", "normal").setFontSize(contentFontSize).text(item.value, 150, y);
  });
};

const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200).setLineWidth(0.3).line(14, 280, 196, 280);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(100)
      .text(`Generado el: ${new Date().toLocaleString("es-PE")}`, 14, 285)
      .text(`Página ${i} de ${pageCount}`, 196, 285, { align: "right" });
  }
};

export const generateReceivablePDF = async (debt, { filename = `Cuenta-Por-Cobrar-${safeText(debt?.ruc, "Sin-RUC")}.pdf`, logoOptions = {}, autoDownload = true } = {}) => {
  if (!debt) return;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await addLogo(doc, logoOptions);
  addHeader(doc, debt);
  addClientInfo(doc, debt);
  addDocumentsTable(doc, debt);
  addSummary(doc, debt);
  addFooter(doc);
  if (autoDownload) doc.save(filename);
  else return doc;
};

export const previewReceivablePDF = async (debt, options = {}) => {
  const doc = await generateReceivablePDF(debt, { ...options, autoDownload: false });
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const previewWindow = window.open(pdfUrl, "_blank");
  if (!previewWindow) doc.save(options.filename || `Cuenta-Por-Cobrar-${safeText(debt.ruc, "Sin-RUC")}.pdf`);
};
