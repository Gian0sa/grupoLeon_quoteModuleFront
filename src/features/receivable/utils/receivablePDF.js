import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── HELPER LOGO ───
const addLogo = async (doc, { x = 170, y = 5, width = 25, height = 25 } = {}) => {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout logo")), 2500);
      img.onload = () => { clearTimeout(timeout); resolve(); };
      img.onerror = (e) => { clearTimeout(timeout); reject(e); };
      img.src = "/assets/LogoAutopartes.png";
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width || 300;
    canvas.height = img.naturalHeight || img.height || 300;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const imageDataURL = canvas.toDataURL("image/png");
    doc.addImage(imageDataURL, "PNG", x, y, width, height, undefined, "FAST");
  } catch {
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(45, 150, 80);
    doc.text("Autopartes s.a.", x + width / 2, y + height / 2, { align: "center" });
  }
};

const safeText = (val, fb = "-") => (val !== null && val !== undefined && val !== "" ? String(val).trim() : fb);

const formatCurrency = (amount, currency = "", decimals = 2) => {
  if (typeof amount !== "number" || isNaN(amount)) return "0.00";
  const num = Math.abs(amount);
  const formatted = `${currency} ${num.toFixed(decimals)}`.trim();
  return amount < 0 ? `-${formatted}` : formatted;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";

  let d;
  if (typeof dateStr === "string" && dateStr.includes("-") && dateStr.split("-")[0].length <= 2) {
    const [day, month, year] = dateStr.split("-");
    d = new Date(year, month - 1, day);
  } else if (typeof dateStr === "string" && dateStr.includes("/") && dateStr.split("/")[0].length <= 2) {
    const [day, month, year] = dateStr.split("/");
    d = new Date(year, month - 1, day);
  } else if (typeof dateStr === "string" && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [year, month, day] = dateStr.split("T")[0].split("-");
    d = new Date(year, month - 1, day);
  } else {
    d = new Date(dateStr);
  }

  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const venceHoy = (docu) => {
  if (!docu) return false;
  const fechaVencimiento = docu.REFDATE || docu.fechaContable || docu.fechaVencimiento || "";
  if (!fechaVencimiento) return false;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let fechaDoc;
  if (typeof fechaVencimiento === "string" && fechaVencimiento.includes("-") && fechaVencimiento.split("-")[0].length <= 2) {
    const [day, month, year] = fechaVencimiento.split("-");
    fechaDoc = new Date(year, month - 1, day);
  } else if (typeof fechaVencimiento === "string" && fechaVencimiento.includes("/") && fechaVencimiento.split("/")[0].length <= 2) {
    const [day, month, year] = fechaVencimiento.split("/");
    fechaDoc = new Date(year, month - 1, day);
  } else if (typeof fechaVencimiento === "string" && fechaVencimiento.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [year, month, day] = fechaVencimiento.split("T")[0].split("-");
    fechaDoc = new Date(year, month - 1, day);
  } else {
    fechaDoc = new Date(fechaVencimiento);
  }

  if (isNaN(fechaDoc.getTime())) return false;
  fechaDoc.setHours(0, 0, 0, 0);
  return fechaDoc.getTime() === hoy.getTime();
};

const getEstadoInfo = (estado, tipoDoc) => {
  if (tipoDoc === "Nota de Crédito") {
    return { text: "SALDO A FAVOR", color: [23, 162, 184] };
  }
  const estados = {
    parcialmente_vencido: { text: "PARCIALMENTE VENCIDO", color: [255, 193, 7] },
    vencido: { text: "VENCIDO", color: [220, 53, 69] },
    al_dia: { text: "AL DÍA", color: [40, 167, 69] },
    por_vencer: { text: "POR VENCER", color: [23, 162, 184] },
  };
  return estados[estado] || { text: estado?.toUpperCase() || "AL DÍA", color: [40, 167, 69] };
};

// ============================================================================
// 📄 REPORTE 1: FICHA DE CUENTA POR COBRAR (Imagen 1 Exacta)
// Trigger: Botón "Ver detalles >" de la Tarjeta del Cliente (DebtCard.jsx)
// ============================================================================

const addHeader = (doc) => {
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(0, 0, 0).text("CUENTA POR COBRAR", 14, 20);
};

const addClientInfo = (doc, debt) => {
  const startY = 30;
  const leftX = 14;
  const rightX = 110;

  const estadoInfo = getEstadoInfo(debt.estado, debt.tipoDocumento);
  doc.setFont("helvetica", "bold")
    .setFontSize(8.5)
    .setFillColor(...estadoInfo.color)
    .setTextColor(255, 255, 255)
    .rect(leftX, startY - 3, 55, 7, "F")
    .text(estadoInfo.text, leftX + 2, startY + 1.5);

  doc.setTextColor(0, 0, 0);

  const docs = debt.documents || debt.documentos || [];
  const docsConVencimiento = docs.filter((d) => d.diasVencimiento && d.diasVencimiento > 0);
  const antiguedadPromedio = docsConVencimiento.length > 0
    ? Math.round(docsConVencimiento.reduce((sum, d) => sum + Number(d.diasVencimiento || 0), 0) / docsConVencimiento.length)
    : Number(debt.maxOverdueDays || 0);

  const cleanCode = safeText(debt.ruc || debt.clientCode, "-").replace("CL", "");
  const clientName = safeText(debt.nombre || debt.clientName, "Sin cliente");

  const leftData = [
    { label: "Cliente:", value: clientName },
    { label: "RUC:", value: cleanCode },
    { label: "Código:", value: cleanCode },
    { label: "Vendedor:", value: safeText(debt.vendedor, "No asignado") },
  ];

  const totalDocs = debt.totalDocumentos || debt.totalDocuments || docs.length;
  const vencidosCount = debt.documentosVencidos || debt.overdueDocumentsCount || docs.filter((d) => d.estaVencido).length;
  const pctVencidos = totalDocs > 0 ? Math.round((vencidosCount / totalDocs) * 100) : 0;

  const rightData = [
    { label: "Total Docs:", value: `${totalDocs}` },
    { label: "Vencidos:", value: `${vencidosCount}` },
    { label: "% Vencidos:", value: `${pctVencidos}%` },
    { label: "Antigüedad:", value: `${antiguedadPromedio}d` },
  ];

  leftData.forEach((item, i) => {
    const y = startY + 9 + i * 7.5;
    doc.setFont("helvetica", "bold").setFontSize(9).text(item.label, leftX, y);
    doc.setFont("helvetica", "normal").setFontSize(9);

    if (item.label === "Cliente:" && item.value.length > 30) {
      const maxWidth = 70; // Ancho máximo para no colisionar con la columna derecha
      const lines = doc.splitTextToSize(item.value, maxWidth);
      doc.text(lines, leftX + 23, y);
    } else {
      doc.text(item.value, leftX + 23, y);
    }
  });

  rightData.forEach((item, i) => {
    const y = startY + 9 + i * 6;
    doc.setFont("helvetica", "bold").setFontSize(9).text(item.label, rightX, y);
    doc.setFont("helvetica", "normal").setFontSize(9).text(item.value, rightX + 28, y);
  });

  const montosY = startY + 38;
  doc.setDrawColor(200).setLineWidth(0.3).line(leftX, montosY, rightX + 85, montosY);

  const saldoPEN = debt.pendingAmount?.PEN ?? debt.saldoPEN ?? 0;
  const saldoUSD = debt.pendingAmount?.USD ?? debt.saldoUSD ?? 0;
  const saldoVencidoPEN = debt.overdueAmount?.PEN ?? debt.saldoVencidoPEN ?? 0;
  const saldoVencidoUSD = debt.overdueAmount?.USD ?? debt.saldoVencidoUSD ?? 0;

  doc.setFont("helvetica", "bold").setFontSize(8).text("SALDOS:", leftX, montosY + 4);
  doc.setFont("helvetica", "normal")
    .text(`PEN: ${formatCurrency(saldoPEN, "PEN")}`, leftX, montosY + 9)
    .text(`USD: ${formatCurrency(saldoUSD, "USD")}`, leftX, montosY + 13.5);

  doc.setFont("helvetica", "bold").text("VENCIDOS:", rightX, montosY + 4);
  doc.setFont("helvetica", "normal")
    .text(`PEN: ${formatCurrency(saldoVencidoPEN, "PEN")}`, rightX, montosY + 9)
    .text(`USD: ${formatCurrency(saldoVencidoUSD, "USD")}`, rightX, montosY + 13.5);
};

const addDocumentsTable = (doc, debt) => {
  const documents = debt.documents || debt.documentos || [];

  if (!documents.length) {
    doc.setFont("helvetica", "italic").setFontSize(9).text("No hay documentos registrados", 14, 78);
    return;
  }

  const tableData = documents.map((d) => {
    const esNotaCredito = d.tipoDocumento === "Nota de Crédito" || d.TIPO_DOC === "Nota de Crédito";
    const moneda = (d.moneda || d.TIPOCAMBIO || "USD").toUpperCase().includes("USD") ? "USD" : "PEN";
    const venceHoyDoc = venceHoy(d);

    let monto = 0;
    if (moneda === "USD") {
      monto = Number(d.SALDO_USD ?? d.saldoPendiente?.USD ?? d.totalDocumento ?? d.TOTAL_DOC ?? 0);
    } else {
      monto = Number(d.SALDO_PEN ?? d.saldoPendiente?.PEN ?? d.totalDocumento ?? d.TOTAL_DOC ?? 0);
    }

    if (esNotaCredito && monto > 0) {
      monto = -monto;
    }

    let diasTexto = "-";
    if (venceHoyDoc && !esNotaCredito) {
      diasTexto = "HOY";
    } else if (d.estaVencido && !esNotaCredito) {
      diasTexto = `${d.diasVencimiento || 0}`;
    }

    // Extracción limpia de fechas en SAP / HANA sin Invalid Date
    const fechaDocRaw = d.TAXDATE || d.fechaImpuesto || d.FECHA_DOC || d.fechaDocumento;
    const fechaContRaw = d.REFDATE || d.fechaContable;

    return [
      safeText(d.numeroDocumento || d.NRO_DOC),
      safeText(d.tipoDocumento || d.TIPO_DOC, "Factura de Cliente"),
      formatDate(fechaDocRaw || fechaContRaw),
      formatDate(fechaContRaw || fechaDocRaw),
      safeText(d.condicionPago || d.CONDICION, "—"),
      diasTexto,
      formatCurrency(monto, moneda),
    ];
  });

  autoTable(doc, {
    startY: 68,
    head: [["N° Doc", "Tipo", "F. Doc", "F. Cont", "Cond", "Días", "Total"]],
    body: tableData,
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      overflow: "linebreak",
      halign: "left",
      valign: "middle",
    },
    headStyles: {
      fillColor: [52, 58, 64],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 32 },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 30 },
      5: { cellWidth: 15, halign: "center" },
      6: { cellWidth: 26, halign: "right" },
    },
    margin: { left: 14, right: 14 },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    didParseCell: (data) => {
      if (data.section === "body") {
        const docu = documents[data.row.index];
        const esNotaCredito = docu?.tipoDocumento === "Nota de Crédito" || docu?.TIPO_DOC === "Nota de Crédito";
        const venceHoyDoc = venceHoy(docu);

        if (esNotaCredito) {
          data.cell.styles.fillColor = [232, 245, 253];
          data.cell.styles.textColor = [1, 87, 155];
          if (data.column.index === 6) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [33, 150, 243];
            data.cell.styles.textColor = [255, 255, 255];
          }
        } else if (venceHoyDoc) {
          data.cell.styles.fillColor = [255, 243, 224];
          data.cell.styles.textColor = [230, 81, 0];
          if (data.column.index === 5 || data.column.index === 6) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [255, 152, 0];
            data.cell.styles.textColor = [255, 255, 255];
          }
        } else if (docu?.estaVencido) {
          data.cell.styles.fillColor = [255, 235, 238];
          data.cell.styles.textColor = [139, 0, 0];
          if (data.column.index === 6) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [220, 53, 69];
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
      }
    },
  });
};

const addSummary = (doc, debt) => {
  const finalY = doc.lastAutoTable?.finalY || 120;
  const startY = finalY + 8;
  const leftX = 14;
  const rightX = 110;

  const docs = debt.documents || debt.documentos || [];

  const sum = (arr, moneda) =>
    arr
      .filter((d) => {
        const m = (d.moneda || d.TIPOCAMBIO || "USD").toUpperCase();
        return moneda === "USD" ? m.includes("USD") : !m.includes("USD");
      })
      .reduce((s, d) => {
        const monto = moneda === "USD"
          ? (d.SALDO_USD ?? d.saldoPendiente?.USD ?? d.totalDocumento ?? d.TOTAL_DOC ?? 0)
          : (d.SALDO_PEN ?? d.saldoPendiente?.PEN ?? d.totalDocumento ?? d.TOTAL_DOC ?? 0);
        return s + Number(monto);
      }, 0);

  const docsReales = docs;
  const vencidosTotal = docsReales.filter((d) => d.estaVencido && !venceHoy(d));
  const porVencerTotal = docsReales.filter((d) => !d.estaVencido && !venceHoy(d));
  const vencenHoyTotal = docsReales.filter((d) => venceHoy(d));

  // SECCIÓN IZQUIERDA - Resumen Ejecutivo
  doc.setFont("helvetica", "bold").setFontSize(10).text("RESUMEN EJECUTIVO", leftX, startY);
  doc.setDrawColor(52, 58, 64).setLineWidth(0.4).line(leftX, startY + 1.5, leftX + 60, startY + 1.5);

  const leftData = [
    { label: "Docs Vencidos:", value: `${vencidosTotal.length} de ${debt.totalDocumentos || docs.length}` },
    { label: "Monto Venc PEN:", value: formatCurrency(sum(vencidosTotal, "PEN"), "PEN") },
    { label: "Monto Venc USD:", value: formatCurrency(sum(vencidosTotal, "USD"), "USD") },
    { label: "Vencen Hoy:", value: `${vencenHoyTotal.length}`, highlight: vencenHoyTotal.length > 0 },
    { label: "Monto Hoy PEN:", value: formatCurrency(sum(vencenHoyTotal, "PEN"), "PEN"), highlight: vencenHoyTotal.length > 0 },
    { label: "Monto Hoy USD:", value: formatCurrency(sum(vencenHoyTotal, "USD"), "USD"), highlight: vencenHoyTotal.length > 0 },
    { label: "Estado General:", value: getEstadoInfo(debt.estado, debt.tipoDocumento).text },
    { label: "Docs por Vencer:", value: `${porVencerTotal.length}` },
    { label: "Monto p/Venc PEN:", value: formatCurrency(sum(porVencerTotal, "PEN"), "PEN") },
    { label: "Monto p/Venc USD:", value: formatCurrency(sum(porVencerTotal, "USD"), "USD") },
  ];

  leftData.forEach((item, i) => {
    const y = startY + 7 + i * 5;
    if (item.highlight) {
      doc.setTextColor(255, 152, 0);
      doc.setFont("helvetica", "bold").setFontSize(7.5).text(item.label, leftX, y);
      doc.setFont("helvetica", "bold").setFontSize(7.5).text(item.value, leftX + 35, y);
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setFont("helvetica", "bold").setFontSize(7.5).text(item.label, leftX, y);
      doc.setFont("helvetica", "normal").setFontSize(7.5).text(item.value, leftX + 35, y);
    }
  });

  // SECCIÓN DERECHA - Por Tipo de Documento
  doc.setFont("helvetica", "bold").setFontSize(10).text("POR TIPO DE DOCUMENTO", rightX, startY);
  doc.setDrawColor(52, 58, 64).setLineWidth(0.4).line(rightX, startY + 1.5, rightX + 85, startY + 1.5);

  const facturas = docs.filter((d) => (d.tipoDocumento || d.TIPO_DOC || "").includes("Factura"));
  const boletas = docs.filter((d) => (d.tipoDocumento || d.TIPO_DOC || "").includes("Boleta"));
  const notasCredito = docs.filter((d) => (d.tipoDocumento || d.TIPO_DOC || "").includes("Crédito"));
  const notasDebito = docs.filter((d) => (d.tipoDocumento || d.TIPO_DOC || "").includes("Débito"));
  const letras = docs.filter((d) => (d.tipoDocumento || d.TIPO_DOC || "").includes("Letra"));

  const rightData = [
    { label: "Facturas", docs: facturas },
    { label: "Boletas", docs: boletas },
    { label: "N. Crédito", docs: notasCredito },
    { label: "N. Débito", docs: notasDebito },
    { label: "Letras", docs: letras },
  ];

  let yPos = startY + 7;
  rightData.forEach((item) => {
    const totalUSD = sum(item.docs, "USD");
    const totalPEN = sum(item.docs, "PEN");
    const total = totalUSD !== 0 ? formatCurrency(totalUSD, "USD") : formatCurrency(totalPEN, "PEN");

    doc.setFont("helvetica", "bold").setFontSize(7.5);
    doc.text(`${item.label}:`, rightX, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(total, rightX + 85, yPos, { align: "right" });
    yPos += 5;
  });

  yPos += 2;
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(100);
  doc.text("Cartera: 0.00", rightX + 85, yPos, { align: "right" });
  yPos += 4;
  doc.text("Banco: 0.00", rightX + 85, yPos, { align: "right" });

  const allUSD = sum(docs, "USD");
  const allPEN = sum(docs, "PEN");
  const monedaGeneral = allUSD !== 0 ? "USD" : "PEN";
  const montoGeneral = allUSD !== 0 ? allUSD : allPEN;

  yPos += 2;
  doc.setDrawColor(0).setLineWidth(0.4).line(rightX + 40, yPos, rightX + 85, yPos);
  doc.line(rightX + 40, yPos + 0.5, rightX + 85, yPos + 0.5);

  yPos += 5;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0, 0, 0);
  doc.text(monedaGeneral, rightX + 40, yPos);
  doc.text(formatCurrency(montoGeneral, ""), rightX + 85, yPos, { align: "right" });
};

const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200).setLineWidth(0.3).line(14, 283, 196, 283);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(100)
      .text(`Generado: ${new Date().toLocaleString("es-PE")}`, 14, 287)
      .text(`Pág ${i}/${pageCount}`, 196, 287, { align: "right" });
  }
};

/**
 * 📄 REPORTE 1: Ficha de Cuenta por Cobrar (CUENTA POR COBRAR - Imagen 1 Exacta)
 */
export const generateReceivablePDF = async (debt, { filename, autoDownload = true } = {}) => {
  if (!debt) return;

  const defaultFilename = `Cuenta-Por-Cobrar-${safeText(debt?.ruc || debt?.clientCode, "Sin-RUC")}.pdf`;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await addLogo(doc, { x: 170, y: 5, width: 25, height: 25 });
  addHeader(doc);
  addClientInfo(doc, debt);
  addDocumentsTable(doc, debt);
  addSummary(doc, debt);
  addFooter(doc);

  if (autoDownload) doc.save(filename || defaultFilename);
  return doc;
};

// ============================================================================
// 📄 REPORTE 2: ESTADO DE CUENTA DE CLIENTES (Autopartes S.A. Oficial SAP)
// Trigger: Botón "[📄 Descargar Estado de Cuenta (PDF)]" del Modal (InvoicesModal.jsx)
// ============================================================================

export const generateAccountStatementPDF = async (debt, { filename, autoDownload = true } = {}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  const timeFormatted = now.toTimeString().split(" ")[0];

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout logo")), 2500);
      img.onload = () => { clearTimeout(timeout); resolve(); };
      img.onerror = (e) => { clearTimeout(timeout); reject(e); };
      img.src = "/assets/logo.svg";
    });

    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 146;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, 720, 146);
    const dataUrl = canvas.toDataURL("image/png");
    doc.addImage(dataUrl, "PNG", 10, 8, 45, 9.1);
  } catch {
    doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(45, 150, 80);
    doc.text("Autopartes s.a.", 10, 15);
  }

  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(0, 0, 0);
  doc.text(`Fecha ${dateFormatted}`, 200, 9, { align: "right" });
  doc.text(`Hora ${timeFormatted}`, 200, 13, { align: "right" });
  doc.text(`Página 1 de 1`, 200, 19, { align: "right" });

  doc.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(0, 0, 0);
  doc.text("*** Estado de Cuenta de Clientes ***", 105, 23, { align: "center" });

  doc.setFont("helvetica", "normal").setFontSize(8.5);

  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"
  ];
  const dateLongStr = `${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
  doc.text(`Estado de Cuenta al ${dateLongStr}`, 105, 27.5, { align: "center" });

  const rawDocuments = debt.documents || debt.documentos || debt.docs || [];
  const documents = rawDocuments.filter((d) => {
    const info = (d?.detalle || d?.INFORMACION_DETALLADA || "").toLowerCase();
    const tipo = (d?.tipoDocumento || d?.TIPO_DOC || d?.tipo || "").toLowerCase();
    const num = (d?.numeroDocumento || d?.NRO_DOC || d?.num || "").trim();
    if (!num || num === "—" || num === "-" || num.toLowerCase() === "null") return false;
    if (tipo.includes("otro")) return false;
    if (info.includes("dif. cambio") || info.includes("diferencia de cambio")) return false;
    return true;
  });
  const hasPen = documents.some((d) => {
    const mon = (d.moneda || d.TIPOCAMBIO || d.mon || "USD").toUpperCase();
    return mon.includes("PEN") || mon.includes("SOL") || mon.includes("S/");
  });
  const hasUsd = documents.some((d) => {
    const mon = (d.moneda || d.TIPOCAMBIO || d.mon || "USD").toUpperCase();
    return !mon.includes("PEN") && !mon.includes("SOL") && !mon.includes("S/");
  }) || !hasPen;

  const headerY = 34;
  doc.setDrawColor(0, 0, 0).setLineWidth(0.5);
  doc.line(10, headerY, 200, headerY);

  doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(0, 0, 0);
  doc.text("EMISIÓN", 10, headerY + 4);
  doc.text("VENCE", 29, headerY + 4);
  doc.text("CONDICIÓN DE PAGO", 50, headerY + 4);
  doc.text("SERIE - DOCUMENTO", 78, headerY + 4);
  doc.text("CODIGO UNICO", 122, headerY + 4);

  if (hasPen && hasUsd) {
    doc.text("MONTO", 162, headerY + 4, { align: "right" });
    doc.text("SALDO PEN", 181, headerY + 4, { align: "right" });
    doc.text("SALDO USD", 200, headerY + 4, { align: "right" });
  } else if (hasPen) {
    doc.text("MONTO", 175, headerY + 4, { align: "right" });
    doc.text("SALDO PEN", 200, headerY + 4, { align: "right" });
  } else {
    doc.text("MONTO", 175, headerY + 4, { align: "right" });
    doc.text("SALDO USD", 200, headerY + 4, { align: "right" });
  }

  doc.line(10, headerY + 6, 200, headerY + 6);
  const salesperson = safeText(debt.vendedor || debt.sales || documents[0]?.NOMBVENDEDOR, "No Asignado");
  const rawCode = safeText(debt.clientCode || debt.ruc || debt.cCode || documents[0]?.CARDCODE, "");
  const cleanCode = rawCode ? `CL${rawCode.replace("CL", "")}` : "CL—";
  const clientName = safeText(debt.nombre || debt.clientName || debt.cName || documents[0]?.CARDNAME, "CLIENTE");

  const vendorY = headerY + 11.5;
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(0, 0, 0);
  const sellerText = `Vendedor: ${salesperson}`;
  doc.text(sellerText, 105, vendorY, { align: "center" });
  const sellerWidth = doc.getTextWidth(sellerText);
  doc.setLineWidth(0.4).line(105 - sellerWidth / 2, vendorY + 0.8, 105 + sellerWidth / 2, vendorY + 0.8);

  const clientY = vendorY + 6.5;
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0, 0, 0);
  doc.text(`${cleanCode}    "${clientName}"`, 10, clientY);

  let totalSaldoPEN = 0;
  let totalSaldoUSD = 0;

  const tableRows = documents.map((d) => {
    const emision = formatDate(d.TAXDATE || d.fechaImpuesto || d.FECHA_DOC || d.fechaDocumento || d.emi);
    const vence = formatDate(d.REFDATE || d.fechaContable || d.fechaVencimiento || d.ven);
    const condicion = safeText(d.condicionPago || d.CONDICION || d.con, "—");

    const numDoc = safeText(d.numeroDocumento || d.NRO_DOC || d.num, "");
    const tipoDoc = safeText(d.tipoDocumento || d.TIPO_DOC || d.tipo, "");
    const refMatriz = d.facturaOrigen || (Array.isArray(d.referencia) && d.referencia[0]) || d.ref || "";
    const folio = safeText(d.folioNum || d.FOLIONUM || d.docEntry || d.DOCENTRY || d.fol || "", "");

    let serieDocText = numDoc;
    if (refMatriz && refMatriz !== numDoc) {
      serieDocText += ` ${refMatriz}`;
    }
    if (folio && folio !== numDoc && folio !== refMatriz) {
      serieDocText += ` ${folio}`;
    }

    const codigoUnico = safeText(d.idUnico || d.ID_UNICO || d.letraSAP || d.uni, "");

    const numDocUpper = numDoc.toUpperCase();
    const isLetra = Boolean(
      d.esLetra ||
      tipoDoc.toLowerCase().includes("letra") ||
      numDocUpper.startsWith("LC-") ||
      numDocUpper.startsWith("LT-")
    );
    const ubicacion = safeText(d.ubicacion || d.UBICACION || d.ESTADO, "").toUpperCase();
    const ubicacionRaw = String(d.ubicacion || d.UBICACION || d.ESTADO || "").trim().toUpperCase();
    const condUpper = condicion.toUpperCase();
    const enBanco = Boolean(
      d.enBanco ||
      (isLetra && (
        ubicacionRaw === "1" ||
        ubicacionRaw.includes("BANCO") ||
        ubicacionRaw.includes("COBRANZA") ||
        condUpper.includes("BANCO")
      ))
    );
    const isVD = Boolean(
      d.isVD ||
      (isLetra && !enBanco && (
        ubicacionRaw === "0" ||
        ubicacionRaw === "VD" ||
        ubicacionRaw.includes("CARTERA") ||
        ubicacionRaw.includes("VD") ||
        condUpper.includes("VD") ||
        condUpper.includes("CARTERA") ||
        !codigoUnico ||
        d.VD === "VD"
      ))
    );

    let displayCodigo = codigoUnico;
    if (isLetra) {
      const isNumOnly = /^\d+$/.test(codigoUnico);
      const isBank = isNumOnly && codigoUnico.length >= 6 && (enBanco || codigoUnico.length >= 7);
      if (isBank) {
        displayCodigo = codigoUnico;
      } else if (codigoUnico && codigoUnico !== "0" && codigoUnico.toLowerCase() !== "null" && codigoUnico !== "—") {
        displayCodigo = `Cart. ${codigoUnico}`;
      } else {
        displayCodigo = isVD ? "Falta Recoger" : "—";
      }
    }

    const moneda = (d.moneda || d.TIPOCAMBIO || d.mon || "USD").toUpperCase();
    const isDocUSD = !moneda.includes("PEN") && !moneda.includes("SOL") && !moneda.includes("S/");
    const totalOriginal = Number(d.totalOriginal || d.totalOriginalExact || d.totalDocumento || d.TOTAL_DOC || d.tot || 0);

    let saldoPEN = 0;
    let saldoUSD = 0;
    if (isDocUSD) {
      saldoUSD = Number(d.saldoUSD ?? d.saldoUsd ?? d.SALDO_USD ?? d.sUsd ?? d.saldoPendiente?.USD ?? 0);
      if (saldoUSD === 0 && d.totalDocumento && !d.saldoPendiente) saldoUSD = totalOriginal;
    } else {
      saldoPEN = Number(d.saldoPEN ?? d.saldoPen ?? d.SALDO_PEN ?? d.sPen ?? d.saldoPendiente?.PEN ?? 0);
      if (saldoPEN === 0 && d.totalDocumento && !d.saldoPendiente) saldoPEN = totalOriginal;
    }

    const isCredit = saldoPEN < 0 || saldoUSD < 0 || tipoDoc.toLowerCase().includes("credito") || tipoDoc.toLowerCase().includes("abono") || numDocUpper.startsWith("NC-") || numDocUpper.startsWith("ABO-") || numDocUpper.startsWith("AB0-") || numDocUpper.startsWith("07F");
    if (isCredit) {
      if (saldoPEN !== 0) saldoPEN = -Math.abs(saldoPEN);
      if (saldoUSD !== 0) saldoUSD = -Math.abs(saldoUSD);
    }

    totalSaldoPEN += saldoPEN;
    totalSaldoUSD += saldoUSD;

    const isOverdue = !isCredit && Boolean(d.isOverdue || d.estaVencido || d.vdStatus === "VENCIDO" || (d.saldoVencidoUSD && Number(d.saldoVencidoUSD) > 0)) && (saldoUSD > 0 || saldoPEN > 0);
    const isVenceHoy = !isCredit && !isOverdue && Boolean(d.isVenceHoy || d.vdStatus === "HOY" || d.vdStatus === "VENCE_HOY" || d.categoriaVencimiento === "HOY") && (saldoUSD > 0 || saldoPEN > 0);

    const formatMoney = (amount) =>
      Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      emision,
      vence,
      isOverdue,
      isVenceHoy,
      condicion,
      isVD,
      serieDocText,
      codigoUnico: displayCodigo,
      montoTexto: `${isDocUSD ? "USD" : "PEN"}  ${formatMoney(Math.abs(totalOriginal))}`,
      saldoPENTexto: formatMoney(saldoPEN),
      saldoUSDTexto: formatMoney(saldoUSD),
      saldoPEN,
      saldoUSD,
      numDoc,
      tipoDoc,
      rawDoc: d,
    };
  });

  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let bodyData = [];
  let colStyles = {};

  if (hasPen && hasUsd) {
    bodyData = tableRows.length > 0
      ? tableRows.map((r) => [
          r.emision,
          r.vence,
          r.condicion,
          r.isVD ? "VD" : "",
          r.serieDocText,
          r.codigoUnico,
          r.montoTexto,
          r.saldoPEN !== 0 ? r.saldoPENTexto : "0.00",
          r.saldoUSD !== 0 ? r.saldoUSDTexto : "0.00",
        ])
      : [["—", "—", "Sin documentos pendientes", "", "—", "—", "—", "0.00", "0.00"]];
    colStyles = {
      0: { cellWidth: 19, halign: "left" },
      1: { cellWidth: 21, halign: "left" },
      2: { cellWidth: 21, halign: "left" },
      3: { cellWidth: 7, halign: "center", fontStyle: "bold" },
      4: { cellWidth: 44, halign: "left" },
      5: { cellWidth: 20, halign: "left" },
      6: { cellWidth: 20, halign: "right" },
      7: { cellWidth: 19, halign: "right" },
      8: { cellWidth: 19, halign: "right" },
    };
  } else if (hasPen) {
    bodyData = tableRows.length > 0
      ? tableRows.map((r) => [
          r.emision,
          r.vence,
          r.condicion,
          r.isVD ? "VD" : "",
          r.serieDocText,
          r.codigoUnico,
          r.montoTexto,
          r.saldoPEN !== 0 ? r.saldoPENTexto : "0.00",
        ])
      : [["—", "—", "Sin documentos pendientes", "", "—", "—", "—", "0.00"]];
    colStyles = {
      0: { cellWidth: 20, halign: "left" },
      1: { cellWidth: 22, halign: "left" },
      2: { cellWidth: 22, halign: "left" },
      3: { cellWidth: 7, halign: "center", fontStyle: "bold" },
      4: { cellWidth: 50, halign: "left" },
      5: { cellWidth: 23, halign: "left" },
      6: { cellWidth: 23, halign: "right" },
      7: { cellWidth: 23, halign: "right" },
    };
  } else {
    // Solo USD
    bodyData = tableRows.length > 0
      ? tableRows.map((r) => [
          r.emision,
          r.vence,
          r.condicion,
          r.isVD ? "VD" : "",
          r.serieDocText,
          r.codigoUnico,
          r.montoTexto,
          r.saldoUSD !== 0 ? r.saldoUSDTexto : "0.00",
        ])
      : [["—", "—", "Sin documentos pendientes", "", "—", "—", "—", "0.00"]];
    colStyles = {
      0: { cellWidth: 20, halign: "left" },
      1: { cellWidth: 22, halign: "left" },
      2: { cellWidth: 22, halign: "left" },
      3: { cellWidth: 7, halign: "center", fontStyle: "bold" },
      4: { cellWidth: 50, halign: "left" },
      5: { cellWidth: 23, halign: "left" },
      6: { cellWidth: 23, halign: "right" },
      7: { cellWidth: 23, halign: "right" },
    };
  }

  autoTable(doc, {
    startY: clientY + 3.5,
    body: bodyData,
    showHead: "never",
    theme: "plain",
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 1.1, bottom: 1.1, left: 0.8, right: 0.8 },
      font: "helvetica",
      textColor: [0, 0, 0],
      overflow: "linebreak",
    },
    columnStyles: colStyles,
    margin: { left: 10, right: 10 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1 && tableRows[data.row.index]) {
        const rowObj = tableRows[data.row.index];
        if (rowObj?.isOverdue) {
          data.cell.styles.fillColor = [220, 53, 69];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.halign = "center";
        } else if (rowObj?.isVenceHoy) {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.textColor = [146, 64, 14];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.halign = "center";
        }
      }
    },
  });

  let currentY = (doc.lastAutoTable?.finalY || (clientY + 15)) + 1;

  const totalLineStartX = (hasPen && hasUsd) ? 162 : 175;
  doc.setDrawColor(0, 0, 0).setLineWidth(0.4);
  doc.line(totalLineStartX, currentY, 200, currentY);
  currentY += 3.5;

  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0, 0, 0);
  if (hasPen && hasUsd) {
    doc.text(formatMoney(totalSaldoPEN), 181, currentY, { align: "right" });
    doc.text(formatMoney(totalSaldoUSD), 200, currentY, { align: "right" });
  } else if (hasPen) {
    doc.text(formatMoney(totalSaldoPEN), 200, currentY, { align: "right" });
  } else {
    doc.text(formatMoney(totalSaldoUSD), 200, currentY, { align: "right" });
  }

  currentY += 1.2;
  doc.setLineWidth(0.3).line(totalLineStartX, currentY, 200, currentY);
  doc.line(totalLineStartX, currentY + 0.5, 200, currentY + 0.5);

  currentY += 12;

  const startSummaryY = currentY;

  // ─── RESUMEN CONSOLIDADO FIEL A SAP CRYSTAL REPORTS ───
  // En SAP Crystal Reports (Autopartes S.A.), el resumen siempre se totaliza y consolida en USD
  const summaryCurrency = "USD";
  const currLabel = "USD";

  const getDocEquiv = (r, targetCurrency = "USD") => {
    const d = r.rawDoc || {};
    if (targetCurrency === "USD") {
      if (d.saldoUsdEquivalente !== undefined && d.saldoUsdEquivalente !== null && !isNaN(Number(d.saldoUsdEquivalente))) {
        return Number(d.saldoUsdEquivalente);
      }
      if (d.SALDO_SYS !== undefined && d.SALDO_SYS !== null && !isNaN(Number(d.SALDO_SYS))) {
        return Number(d.SALDO_SYS);
      }
      if (r.saldoUSD !== 0) return r.saldoUSD;
      if (d.sUsd && Number(d.sUsd) !== 0) return Number(d.sUsd);
      const rate = Number(d.docRate || d.DocRate || d.DOCRATE || 3.371);
      const sPenVal = r.saldoPEN !== 0 ? r.saldoPEN : Number(d.sPen || 0);
      if (rate > 0 && sPenVal !== 0) return Number((sPenVal / rate).toFixed(2));
      return sPenVal;
    } else {
      if (r.saldoPEN !== 0) return r.saldoPEN;
      if (d.sPen && Number(d.sPen) !== 0) return Number(d.sPen);
      const rate = Number(d.docRate || d.DocRate || d.DOCRATE || 3.371);
      const sUsdVal = r.saldoUSD !== 0 ? r.saldoUSD : Number(d.sUsd || 0);
      if (rate > 0 && sUsdVal !== 0) return Number((sUsdVal * rate).toFixed(2));
      return sUsdVal;
    }
  };

  const getNumUpper = (r) => (r.numDoc || r.rawDoc?.numeroDocumento || r.rawDoc?.NRO_DOC || r.rawDoc?.num || r.serieDocText || "").toUpperCase();
  const getTipoLower = (r) => (r.tipoDoc || r.rawDoc?.tipoDocumento || r.rawDoc?.TIPO_DOC || r.rawDoc?.tipo || "").toLowerCase();
  const getSapDocType = (r) => String(r.rawDoc?.TIPO_DOC_SAP || "").trim();

  const vencidos = tableRows.filter((r) => r.isOverdue);
  const venceHoy = tableRows.filter((r) => r.isVenceHoy);

  const letras = tableRows.filter((r) => {
    const num = getNumUpper(r);
    const tipo = getTipoLower(r);
    return Boolean(r.rawDoc?.esLetra || num.startsWith("LC-") || num.startsWith("LT-") || tipo.includes("letra"));
  });

  const notasCred = tableRows.filter((r) => {
    const num = getNumUpper(r);
    const tipo = getTipoLower(r);
    return r.saldoUSD < 0 || r.saldoPEN < 0 || (r.rawDoc?.sPen < 0) || (r.rawDoc?.sUsd < 0) || num.startsWith("NC-") || num.startsWith("ABO-") || num.startsWith("07F") || num.startsWith("07-") || num.includes("07F") || tipo.includes("credito") || tipo.includes("abono");
  });

  const notasDeb = tableRows.filter((r) => {
    const num = getNumUpper(r);
    const tipo = getTipoLower(r);
    return num.startsWith("ND-") || num.startsWith("08F") || num.startsWith("08-") || num.includes("08F") || tipo.includes("debito");
  });

  const boletas = tableRows.filter((r) => {
    if (letras.includes(r) || notasCred.includes(r) || notasDeb.includes(r)) return false;
    const num = getNumUpper(r);
    const tipo = getTipoLower(r);
    const sapType = getSapDocType(r);
    return sapType === "03" || num.startsWith("BOL-") || num.startsWith("BV-") || num.startsWith("03B") || num.startsWith("03-") || tipo.includes("boleta");
  });

  const facturas = tableRows.filter((r) => {
    if (letras.includes(r) || notasCred.includes(r) || notasDeb.includes(r) || boletas.includes(r)) return false;
    const num = getNumUpper(r);
    const tipo = getTipoLower(r);
    const sapType = getSapDocType(r);
    return sapType === "01" || num.startsWith("FAC-") || num.startsWith("FT-") || num.startsWith("01F") || num.startsWith("01-") || tipo.includes("factura") || (!num.startsWith("BOL-") && !num.startsWith("03"));
  });

  const crystal = debt.resumenSapCrystal || {};

  const calcFacturas = crystal.totalFacturasUSD !== undefined
    ? Number(crystal.totalFacturasUSD)
    : Number(facturas.reduce((acc, r) => acc + getDocEquiv(r, "USD"), 0).toFixed(2));

  const calcBoletas = crystal.totalBoletasUSD !== undefined
    ? Number(crystal.totalBoletasUSD)
    : Number(boletas.reduce((acc, r) => acc + getDocEquiv(r, "USD"), 0).toFixed(2));

  const calcNC = crystal.totalNotasCreditoUSD !== undefined
    ? Number(crystal.totalNotasCreditoUSD)
    : Number(notasCred.reduce((acc, r) => acc + (getDocEquiv(r, "USD") < 0 ? getDocEquiv(r, "USD") : -Math.abs(getDocEquiv(r, "USD"))), 0).toFixed(2));

  const calcND = crystal.totalNDUSD !== undefined
    ? Number(crystal.totalNDUSD)
    : Number(notasDeb.reduce((acc, r) => acc + getDocEquiv(r, "USD"), 0).toFixed(2));

  const calcLetras = crystal.totalLetrasUSD !== undefined
    ? Number(crystal.totalLetrasUSD)
    : Number(letras.reduce((acc, r) => acc + getDocEquiv(r, "USD"), 0).toFixed(2));

  const calcLetrasCartera = Number(letras.filter((r) => r.isVD).reduce((acc, r) => acc + getDocEquiv(r, "USD"), 0).toFixed(2));
  const calcLetrasBanco = Number(letras.filter((r) => !r.isVD).reduce((acc, r) => acc + getDocEquiv(r, "USD"), 0).toFixed(2));

  let calcTotalConsolidado = crystal.totalConsolidadoUSD !== undefined
    ? Number(crystal.totalConsolidadoUSD)
    : debt.totalConsolidadoUSD !== undefined
    ? Number(debt.totalConsolidadoUSD)
    : Number((calcFacturas + calcBoletas + calcNC + calcND + calcLetras).toFixed(2));

  const calcVenceHoy = crystal.venceHoyUSD !== undefined
    ? Number(crystal.venceHoyUSD)
    : Number(venceHoy.reduce((acc, r) => acc + getDocEquiv(r, "USD"), 0).toFixed(2));

  const calcPorVencer = crystal.porVencerUSD !== undefined
    ? Number(crystal.porVencerUSD)
    : Number(tableRows.filter((r) => !r.isOverdue && !r.isVenceHoy && r.saldoUSD >= 0 && r.saldoPEN >= 0 && !notasCred.includes(r)).reduce((acc, r) => acc + getDocEquiv(r, "USD"), 0).toFixed(2));

  let calcVencidosNeto = crystal.vencidosNetoUSD !== undefined
    ? Number(crystal.vencidosNetoUSD)
    : Math.max(Number((calcTotalConsolidado - calcVenceHoy - calcPorVencer).toFixed(2)), 0);

  const countVencidos = crystal.countVencidos ?? vencidos.length;
  const countVenceHoy = crystal.countVenceHoy ?? venceHoy.length;
  const countPorVencer = crystal.countPorVencer ?? tableRows.filter((r) => !r.isOverdue && !r.isVenceHoy && !notasCred.includes(r)).length;

  const leftX = 18;
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(0, 0, 0);
  doc.text("RESUMEN POR VENCIMIENTO", leftX, startSummaryY);

  doc.setFont("helvetica", "bold").setFontSize(7);
  doc.text("Cant Doc.", leftX + 30, startSummaryY + 5.5, { align: "right" });
  doc.text(`Total Doc. ${currLabel}`, leftX + 56, startSummaryY + 5.5, { align: "right" });

  let yL = startSummaryY + 10.5;
  doc.setFont("helvetica", "normal").setFontSize(7.5);
  doc.text("Doc. Vencidos", leftX - 8, yL);
  doc.text(":", leftX + 13, yL);

  if (countVencidos > 0) {
    doc.setFillColor(220, 53, 69);
    doc.rect(leftX + 21, yL - 3.2, 8, 4.3, "F");
    doc.setTextColor(255, 255, 255).setFont("helvetica", "bold");
    doc.text(String(countVencidos), leftX + 25, yL - 0.2, { align: "center" });
    doc.setTextColor(0, 0, 0).setFont("helvetica", "normal");
  } else {
    doc.text("0", leftX + 25, yL, { align: "center" });
  }
  doc.text(formatMoney(calcVencidosNeto), leftX + 56, yL, { align: "right" });

  yL += 4.5;
  doc.text("Doc. Vence Hoy", leftX - 8, yL);
  doc.text(":", leftX + 13, yL);
  if (countVenceHoy > 0) {
    doc.setFillColor(217, 119, 6);
    doc.rect(leftX + 21, yL - 3.2, 8, 4.3, "F");
    doc.setTextColor(255, 255, 255).setFont("helvetica", "bold");
    doc.text(String(countVenceHoy), leftX + 25, yL - 0.2, { align: "center" });
    doc.setTextColor(0, 0, 0).setFont("helvetica", "normal");
  } else {
    doc.text("0", leftX + 25, yL, { align: "center" });
  }
  doc.text(formatMoney(calcVenceHoy), leftX + 56, yL, { align: "right" });

  yL += 4.5;
  doc.text("Doc. por Vencer", leftX - 8, yL);
  doc.text(":", leftX + 13, yL);
  doc.text(String(countPorVencer), leftX + 25, yL, { align: "center" });
  doc.text(formatMoney(calcPorVencer), leftX + 56, yL, { align: "right" });

  yL += 3.5;
  doc.setLineWidth(0.4).line(leftX + 32, yL, leftX + 56, yL);
  yL += 4.5;
  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text(currLabel, leftX + 24, yL);
  doc.text(formatMoney(calcTotalConsolidado), leftX + 56, yL, { align: "right" });

  const rightX = 86;
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(0, 0, 0);
  doc.text("RESUMEN POR TIPO DE DOCUMENTO", rightX, startSummaryY);

  doc.setFont("helvetica", "bold").setFontSize(7);
  doc.text("Tipo Doc.", rightX, startSummaryY + 5.5);
  doc.text(`Total Doc. ${currLabel}`, rightX + 58, startSummaryY + 5.5, { align: "right" });

  let yR = startSummaryY + 10.5;
  doc.setFont("helvetica", "normal").setFontSize(7.5);

  doc.text("Total Factura", rightX, yR);
  doc.text(":", rightX + 20, yR);
  doc.text(formatMoney(calcFacturas), rightX + 58, yR, { align: "right" });

  yR += 4;
  doc.text("Total Boleta", rightX, yR);
  doc.text(":", rightX + 20, yR);
  doc.text(formatMoney(calcBoletas), rightX + 58, yR, { align: "right" });

  yR += 4;
  doc.text("Total Nota Cred", rightX, yR);
  doc.text(":", rightX + 20, yR);
  doc.text(formatMoney(calcNC), rightX + 58, yR, { align: "right" });

  yR += 4;
  doc.text("Total Nota Deb", rightX, yR);
  doc.text(":", rightX + 20, yR);
  doc.text(formatMoney(calcND), rightX + 58, yR, { align: "right" });

  yR += 4;
  doc.text("Total Letras", rightX, yR);
  doc.text(":", rightX + 20, yR);
  doc.text(formatMoney(calcLetras), rightX + 58, yR, { align: "right" });

  yR += 3.5;
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(60, 60, 60);
  doc.text(`En Cartera : ${formatMoney(calcLetrasCartera)}`, rightX + 16, yR);
  yR += 3.2;
  doc.text(`En el Banco : ${formatMoney(calcLetrasBanco)}`, rightX + 16, yR);

  yR += 2.5;
  doc.setLineWidth(0.3).line(rightX + 34, yR, rightX + 58, yR);
  doc.line(rightX + 34, yR + 0.5, rightX + 58, yR + 0.5);

  yR += 4.5;
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0, 0, 0);
  doc.text(currLabel, rightX + 26, yR);
  doc.text(formatMoney(calcTotalConsolidado), rightX + 58, yR, { align: "right" });

  doc.setLineWidth(0.6).line(77, startSummaryY - 2, 77, Math.max(yL, yR) + 2);

  const safeClientSlug = cleanCode.replace(/[^A-Za-z0-9]/g, "");
  const finalFilename = filename || `EstadoDeCuenta_${safeClientSlug}_${dateFormatted.replace(/\//g, "-")}.pdf`;

  if (autoDownload) {
    doc.save(finalFilename);
  }

  return doc;
};

export const previewReceivablePDF = async (debt, options = {}) => {
  const doc = await generateReceivablePDF(debt, { ...options, autoDownload: false });
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
};