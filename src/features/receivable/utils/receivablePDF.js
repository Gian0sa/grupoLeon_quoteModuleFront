import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── HELPER DE LOGO VECTORIAL SVG ───
const addLogo = async (doc, { x = 145, y = 10, width = 50, height = 15 } = {}) => {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout logo")), 2500);
      img.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      img.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
      img.src = "/assets/logo.svg";
    });

    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 146;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 720, 146);
    ctx.drawImage(img, 0, 0, 720, 146);
    const dataUrl = canvas.toDataURL("image/png");
    doc.addImage(dataUrl, "PNG", x, y, width, height);
  } catch {
    doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(45, 150, 80);
    doc.text("Autopartes s.a.", x, y + 8);
  }
};

const safeText = (val, fb = "") => (val !== null && val !== undefined && val !== "" ? String(val).trim() : fb);

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  let d;
  if (dateStr.includes("-") && dateStr.split("-")[0].length <= 2) {
    const [day, month, year] = dateStr.split("-");
    d = new Date(year, month - 1, day);
  } else if (dateStr.includes("/") && dateStr.split("/")[0].length <= 2) {
    const [day, month, year] = dateStr.split("/");
    d = new Date(year, month - 1, day);
  } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [year, month, day] = dateStr.split("T")[0].split("-");
    d = new Date(year, month - 1, day);
  } else {
    d = new Date(dateStr);
  }

  if (isNaN(d.getTime())) return String(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatDateLong = (dateObj) => {
  const d = dateObj instanceof Date ? dateObj : new Date();
  const day = d.getDate();
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} de ${month} de ${year}`;
};

const formatCurrencyNum = (amount) => {
  const num = Number(amount || 0);
  return num.toFixed(2);
};

const formatCurrency = (amount, currency = "PEN") => {
  const num = Number(amount || 0);
  const formatted = num.toFixed(2);
  if (!currency) return formatted;
  const symbol = currency === "USD" ? "USD" : "PEN";
  return `${symbol} ${formatted}`;
};

const getEstadoInfo = (estado, tipoDoc) => {
  if (tipoDoc === "Nota de Crédito") {
    return { text: "SALDO A FAVOR", bg: [23, 162, 184], fg: [255, 255, 255] };
  }
  switch (estado) {
    case "vencido":
      return { text: "VENCIDO", bg: [220, 53, 69], fg: [255, 255, 255] };
    case "parcialmente_vencido":
      return { text: "PARCIALMENTE VENCIDO", bg: [245, 166, 35], fg: [255, 255, 255] };
    case "al_dia":
    default:
      return { text: "AL DÍA", bg: [40, 167, 69], fg: [255, 255, 255] };
  }
};

const venceHoy = (docu) => {
  if (!docu) return false;
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const fechaDoc = docu.fechaContable || docu.REFDATE || docu.fechaDocumento || "";
  return fechaDoc.startsWith(hoyStr);
};

// ============================================================================
// 📄 REPORTE 1: FICHA DE CUENTA POR COBRAR (Título: "CUENTA POR COBRAR")
// Trigger: Botón "Ver detalles >" de la Tarjeta del Cliente (DebtCard.jsx)
// ============================================================================

const addReceivableHeader = (doc, debt) => {
  // Banner azul para el título
  doc.setFillColor(31, 78, 121);
  doc.rect(14, 12, 110, 10, "F");
  doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(255, 255, 255);
  doc.text("CUENTA POR COBRAR", 17, 19);

  // Badge de Estado del Cliente
  const estadoInfo = getEstadoInfo(debt.estado, debt.tipoDocumento);
  doc.setFillColor(...estadoInfo.bg);
  doc.rect(14, 25, 60, 6, "F");
  doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...estadoInfo.fg);
  doc.text(estadoInfo.text, 17, 29.2);
};

const addReceivableClientInfo = (doc, debt) => {
  const startY = 36;
  doc.setFontSize(8.5).setTextColor(0, 0, 0);

  const cleanCode = safeText(debt.ruc || debt.clientCode, "").replace("CL", "");
  const clientName = safeText(debt.nombre || debt.clientName, "Sin cliente");
  const vendedor = safeText(debt.vendedor, "No asignado");
  const totalDocs = debt.totalDocumentos || debt.documents?.length || 0;
  const vencidosCount = debt.documentosVencidos || debt.documents?.filter((d) => d.estaVencido).length || 0;
  const pctVencidos = totalDocs > 0 ? Math.round((vencidosCount / totalDocs) * 100) : 0;

  const docs = debt.documents || debt.documentos || [];
  const overdueDocs = docs.filter((d) => d.estaVencido || (d.diasVencimiento && d.diasVencimiento > 0));
  const maxOverdueDays = overdueDocs.length > 0
    ? Math.max(...overdueDocs.map((d) => Number(d.diasVencimiento || 0)))
    : Number(debt.maxOverdueDays || 0);

  // Columna Izquierda
  const leftItems = [
    { label: "Cliente:", value: `"${clientName}"` },
    { label: "RUC:", value: cleanCode },
    { label: "Código:", value: cleanCode },
    { label: "Vendedor:", value: vendedor },
  ];

  leftItems.forEach((item, index) => {
    const y = startY + index * 5.5;
    doc.setFont("helvetica", "bold").text(item.label, 14, y);
    doc.setFont("helvetica", "bold").text(item.value, 40, y);
  });

  // Columna Derecha
  const rightItems = [
    { label: "Total Docs:", value: `${totalDocs}` },
    { label: "Vencidos:", value: `${vencidosCount}` },
    { label: "% Vencidos:", value: `${pctVencidos}%` },
    { label: "Antigüedad:", value: `${maxOverdueDays}d` },
  ];

  rightItems.forEach((item, index) => {
    const y = startY + index * 5.5;
    doc.setFont("helvetica", "bold").text(item.label, 110, y);
    doc.setFont("helvetica", "normal").text(item.value, 142, y);
  });

  // Barra de Encabezado de Saldos / Vencidos
  const barY = startY + 24;
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0, 0, 0);
  doc.text("SALDOS:", 14, barY);
  doc.text("VENCIDOS:", 110, barY);
  doc.setDrawColor(0, 0, 0).setLineWidth(0.4).line(14, barY + 1.5, 196, barY + 1.5);
};

const addReceivableDocumentsTable = (doc, debt) => {
  const documents = debt.documents || debt.documentos || [];

  if (documents.length === 0) {
    doc.setFont("helvetica", "italic").setFontSize(9).text("No hay documentos registrados", 14, 75);
    return;
  }

  const tableData = documents.map((document) => {
    const numDoc = safeText(document.numeroDocumento || document.NRO_DOC);
    const tipo = safeText(document.tipoDocumento || document.TIPO_DOC, "Factura");
    const fDoc = formatDate(document.fechaImpuesto || document.TAXDATE || document.fechaDocumento);
    const fCont = formatDate(document.fechaContable || document.REFDATE);
    const cond = safeText(document.condicionPago || document.CONDICION, "—");
    const dias = document.estaVencido ? String(document.diasVencimiento || 0) : "-";

    const isUSD = (document.moneda || document.TIPOCAMBIO || "USD").toUpperCase().includes("USD");
    const totalOriginal = Number(document.totalDocumento || document.TOTAL_DOC || 0);
    const montoText = `${isUSD ? "USD" : "PEN"} ${formatCurrencyNum(totalOriginal)}`;

    return [numDoc, tipo, fDoc, fCont, cond, dias, montoText];
  });

  autoTable(doc, {
    startY: 65,
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
      1: { cellWidth: 25 },
      2: { cellWidth: 24, halign: "center" },
      3: { cellWidth: 24, halign: "center" },
      4: { cellWidth: 30 },
      5: { cellWidth: 15, halign: "center" },
      6: { cellWidth: 29, halign: "right" },
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

const addReceivableSummary = (doc, debt) => {
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
          ? (d.SALDO_USD || d.saldoPendiente?.USD || d.totalDocumento || d.TOTAL_DOC || 0)
          : (d.SALDO_PEN || d.saldoPendiente?.PEN || d.totalDocumento || d.TOTAL_DOC || 0);
        return s + Number(monto);
      }, 0);

  const vencidosTotal = docs.filter((d) => d.estaVencido && !venceHoy(d));
  const porVencerTotal = docs.filter((d) => !d.estaVencido && !venceHoy(d));
  const vencenHoyTotal = docs.filter((d) => venceHoy(d));

  // SECCIÓN IZQUIERDA - Resumen Ejecutivo
  doc.setFont("helvetica", "bold").setFontSize(9.5).text("RESUMEN EJECUTIVO", leftX, startY);
  doc.setDrawColor(52, 58, 64).setLineWidth(0.4).line(leftX, startY + 1.5, leftX + 55, startY + 1.5);

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
    const y = startY + 6.5 + i * 4.6;
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
  doc.setFont("helvetica", "bold").setFontSize(9.5).text("POR TIPO DE DOCUMENTO", rightX, startY);
  doc.setDrawColor(52, 58, 64).setLineWidth(0.4).line(rightX, startY + 1.5, rightX + 86, startY + 1.5);

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

  let yPos = startY + 6.5;
  rightData.forEach((item) => {
    const totalUSD = sum(item.docs, "USD");
    const totalPEN = sum(item.docs, "PEN");
    const total = totalUSD !== 0 ? formatCurrency(totalUSD, "USD") : formatCurrency(totalPEN, "PEN");

    doc.setFont("helvetica", "bold").setFontSize(7.5);
    doc.text(`${item.label}:`, rightX, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(total, rightX + 86, yPos, { align: "right" });
    yPos += 4.6;
  });

  yPos += 2;
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(100);
  doc.text("Cartera: 0.00", rightX + 86, yPos, { align: "right" });
  yPos += 3.5;
  doc.text("Banco: 0.00", rightX + 86, yPos, { align: "right" });

  const allUSD = sum(docs, "USD");
  const allPEN = sum(docs, "PEN");
  const monedaGeneral = allUSD !== 0 ? "USD" : "PEN";
  const montoGeneral = allUSD !== 0 ? allUSD : allPEN;

  yPos += 2;
  doc.setDrawColor(0).setLineWidth(0.4).line(rightX + 40, yPos, rightX + 86, yPos);
  doc.line(rightX + 40, yPos + 0.5, rightX + 86, yPos + 0.5);

  yPos += 4.5;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0, 0, 0);
  doc.text(monedaGeneral, rightX + 40, yPos);
  doc.text(formatCurrencyNum(montoGeneral), rightX + 86, yPos, { align: "right" });
};

const addReceivableFooter = (doc) => {
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
 * 📄 REPORTE 1: Ficha de Cuenta por Cobrar (CUENTA POR COBRAR - Imagen 1)
 */
export const generateReceivablePDF = async (debt, { filename, autoDownload = true } = {}) => {
  if (!debt) return;

  const defaultFilename = `Cuenta-Por-Cobrar-${safeText(debt?.ruc || debt?.clientCode, "Sin-RUC")}.pdf`;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await addLogo(doc, { x: 145, y: 10, width: 50, height: 15 });
  addReceivableHeader(doc, debt);
  addReceivableClientInfo(doc, debt);
  addReceivableDocumentsTable(doc, debt);
  addReceivableSummary(doc, debt);
  addReceivableFooter(doc);

  if (autoDownload) doc.save(filename || defaultFilename);
  return doc;
};

// ============================================================================
// 📄 REPORTE 2: ESTADO DE CUENTA DE CLIENTES (Autopartes S.A. Oficial)
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

  // 1. Logo Vectorial SVG Oficial Nítido
  await addLogo(doc, { x: 10, y: 8, width: 45, height: 9.1 });

  // 2. Metadatos de Cabecera Superior Derecha
  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(0, 0, 0);
  doc.text(`Fecha ${dateFormatted}`, 200, 9, { align: "right" });
  doc.text(`Hora ${timeFormatted}`, 200, 13, { align: "right" });
  doc.text(`Página 1 de 1`, 200, 19, { align: "right" });

  // 3. Título Centrado Oficial
  doc.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(0, 0, 0);
  doc.text("*** Estado de Cuenta de Clientes ***", 105, 23, { align: "center" });

  doc.setFont("helvetica", "normal").setFontSize(8.5);
  doc.text(`Estado de Cuenta al ${formatDateLong(now)}`, 105, 27.5, { align: "center" });

  // 4. Barra Superior de Títulos de Tabla
  const headerY = 34;
  doc.setDrawColor(0, 0, 0).setLineWidth(0.5);
  doc.line(10, headerY, 200, headerY);

  doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(0, 0, 0);
  doc.text("EMISIÓN", 10, headerY + 4);
  doc.text("VENCE", 29, headerY + 4);
  doc.text("CONDICIÓN DE PAGO", 50, headerY + 4);
  doc.text("SERIE - DOCUMENTO", 78, headerY + 4);
  doc.text("CODIGO UNICO", 122, headerY + 4);
  doc.text("MONTO", 162, headerY + 4, { align: "right" });
  doc.text("SALDO PEN", 181, headerY + 4, { align: "right" });
  doc.text("SALDO USD", 200, headerY + 4, { align: "right" });

  doc.line(10, headerY + 6, 200, headerY + 6);

  // 5. Vendedor Centrado Subrayado
  const documents = debt.documents || debt.documentos || [];
  const salesperson = safeText(debt.vendedor || documents[0]?.NOMBVENDEDOR, "No Asignado");
  const rawCode = safeText(debt.clientCode || debt.ruc || documents[0]?.CARDCODE, "");
  const cleanCode = rawCode ? `CL${rawCode.replace("CL", "")}` : "CL—";
  const clientName = safeText(debt.nombre || debt.clientName || documents[0]?.CARDNAME, "CLIENTE");

  const vendorY = headerY + 11.5;
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(0, 0, 0);
  const sellerText = `Vendedor: ${salesperson}`;
  doc.text(sellerText, 105, vendorY, { align: "center" });
  const sellerWidth = doc.getTextWidth(sellerText);
  doc.setLineWidth(0.4).line(105 - sellerWidth / 2, vendorY + 0.8, 105 + sellerWidth / 2, vendorY + 0.8);

  // 6. Cliente
  const clientY = vendorY + 6.5;
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0, 0, 0);
  doc.text(`${cleanCode}    "${clientName}"`, 10, clientY);

  // 7. Preparación de datos de documentos
  let totalSaldoPEN = 0;
  let totalSaldoUSD = 0;

  const tableRows = documents.map((d) => {
    const isOverdue = Boolean(d.estaVencido);
    const emision = formatDate(d.TAXDATE || d.fechaImpuesto || d.FECHA_DOC || d.fechaDocumento);
    const vence = formatDate(d.REFDATE || d.fechaContable);
    const condicion = safeText(d.condicionPago || d.CONDICION, "—");

    const numDoc = safeText(d.numeroDocumento || d.NRO_DOC, "");
    const refMatriz = d.facturaOrigen || (Array.isArray(d.referencia) && d.referencia[0]) || "";
    const folio = safeText(d.folioNum || d.FOLIONUM || d.docEntry || d.DOCENTRY || "", "");

    let serieDocText = numDoc;
    if (refMatriz && refMatriz !== numDoc) {
      serieDocText += ` ${refMatriz}`;
    }
    if (folio && folio !== numDoc && folio !== refMatriz) {
      serieDocText += ` ${folio}`;
    }

    const codigoUnico = safeText(d.idUnico || d.ID_UNICO || d.letraSAP, "");

    const moneda = (d.moneda || d.TIPOCAMBIO || "USD").toUpperCase();
    const isUSD = moneda === "USD" || moneda === "US$" || moneda === "$";
    const totalOriginal = Number(d.totalDocumento || d.TOTAL_DOC || 0);

    let saldoPEN = 0;
    let saldoUSD = 0;

    if (isUSD) {
      saldoUSD = Number(d.saldoPendiente?.USD ?? d.SALDO_USD ?? totalOriginal);
      saldoPEN = 0;
    } else {
      saldoPEN = Number(d.saldoPendiente?.PEN ?? d.SALDO_PEN ?? totalOriginal);
      saldoUSD = 0;
    }

    totalSaldoPEN += saldoPEN;
    totalSaldoUSD += saldoUSD;

    return {
      emision,
      vence,
      isOverdue,
      condicion,
      serieDocText,
      codigoUnico,
      montoTexto: `${isUSD ? "USD" : "PEN"}  ${formatCurrencyNum(totalOriginal)}`,
      saldoPENTexto: formatCurrencyNum(saldoPEN),
      saldoUSDTexto: formatCurrencyNum(saldoUSD),
      saldoPEN,
      saldoUSD,
      rawDoc: d,
    };
  });

  const bodyData = tableRows.length > 0
    ? tableRows.map((r) => [
        r.emision,
        r.vence,
        r.condicion,
        r.serieDocText,
        r.codigoUnico,
        r.montoTexto,
        r.saldoPENTexto,
        r.saldoUSDTexto,
      ])
    : [["—", "—", "Sin documentos pendientes", "—", "—", "—", "0.00", "0.00"]];

  // 8. Renderizado de Tabla de Datos
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
    columnStyles: {
      0: { cellWidth: 19, halign: "left" },
      1: { cellWidth: 21, halign: "left" },
      2: { cellWidth: 28, halign: "left" },
      3: { cellWidth: 44, halign: "left" },
      4: { cellWidth: 20, halign: "left" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 19, halign: "right" },
      7: { cellWidth: 19, halign: "right" },
    },
    margin: { left: 10, right: 10 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1 && tableRows[data.row.index]) {
        const rowObj = tableRows[data.row.index];
        if (rowObj?.isOverdue) {
          data.cell.styles.fillColor = [220, 53, 69];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.halign = "center";
        }
      }
    },
  });

  let currentY = (doc.lastAutoTable?.finalY || (clientY + 15)) + 1;

  // 9. Fila de Totales de la Tabla
  doc.setDrawColor(0, 0, 0).setLineWidth(0.4);
  doc.line(162, currentY, 200, currentY);
  currentY += 3.5;

  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0, 0, 0);
  doc.text(formatCurrencyNum(totalSaldoPEN), 181, currentY, { align: "right" });
  doc.text(formatCurrencyNum(totalSaldoUSD), 200, currentY, { align: "right" });

  currentY += 1.2;
  doc.setLineWidth(0.3).line(162, currentY, 200, currentY);
  doc.line(162, currentY + 0.5, 200, currentY + 0.5);

  currentY += 12;

  // 10. Paneles de Resumen Inferior
  const startSummaryY = currentY;

  const vencidos = tableRows.filter((r) => r.isOverdue);
  const porVencer = tableRows.filter((r) => !r.isOverdue);

  const totalVencidosUSD = vencidos.reduce((acc, r) => acc + r.saldoUSD, 0);
  const totalPorVencerUSD = porVencer.reduce((acc, r) => acc + r.saldoUSD, 0);

  const letras = tableRows.filter((r) => {
    const num = (r.rawDoc?.numeroDocumento || r.rawDoc?.NRO_DOC || "").toUpperCase();
    return r.rawDoc?.esLetra || num.startsWith("LC-") || (r.rawDoc?.tipoDocumento || "").toLowerCase().includes("letra");
  });
  const facturas = tableRows.filter((r) => {
    const num = (r.rawDoc?.numeroDocumento || r.rawDoc?.NRO_DOC || "").toUpperCase();
    return num.startsWith("FAC-") || (r.rawDoc?.tipoDocumento || "").toLowerCase().includes("factura");
  });
  const boletas = tableRows.filter((r) => {
    const num = (r.rawDoc?.numeroDocumento || r.rawDoc?.NRO_DOC || "").toUpperCase();
    return num.startsWith("BOL-") || (r.rawDoc?.tipoDocumento || "").toLowerCase().includes("boleta");
  });
  const notasCred = tableRows.filter((r) => {
    const num = (r.rawDoc?.numeroDocumento || r.rawDoc?.NRO_DOC || "").toUpperCase();
    return num.startsWith("NC-") || (r.rawDoc?.tipoDocumento || "").toLowerCase().includes("credito");
  });
  const notasDeb = tableRows.filter((r) => {
    const num = (r.rawDoc?.numeroDocumento || r.rawDoc?.NRO_DOC || "").toUpperCase();
    return num.startsWith("ND-") || (r.rawDoc?.tipoDocumento || "").toLowerCase().includes("debito");
  });

  const totalLetrasUSD = letras.reduce((acc, r) => acc + r.saldoUSD, 0);
  const totalFacturasUSD = facturas.reduce((acc, r) => acc + r.saldoUSD, 0);
  const totalBoletasUSD = boletas.reduce((acc, r) => acc + r.saldoUSD, 0);
  const totalNCUSD = notasCred.reduce((acc, r) => acc + r.saldoUSD, 0);
  const totalNDUSD = notasDeb.reduce((acc, r) => acc + r.saldoUSD, 0);

  // RESUMEN POR VENCIMIENTO (IZQUIERDA)
  const leftX = 18;
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(0, 0, 0);
  doc.text("RESUMEN POR VENCIMIENTO", leftX, startSummaryY);

  doc.setFont("helvetica", "bold").setFontSize(7);
  doc.text("Cant Doc.", leftX + 30, startSummaryY + 5.5, { align: "right" });
  doc.text("Total Doc. USD", leftX + 56, startSummaryY + 5.5, { align: "right" });

  let yL = startSummaryY + 10.5;
  doc.setFont("helvetica", "normal").setFontSize(7.5);
  doc.text("Doc. Vencidos", leftX - 8, yL);
  doc.text(":", leftX + 13, yL);

  if (vencidos.length > 0) {
    doc.setFillColor(220, 53, 69);
    doc.rect(leftX + 21, yL - 3.2, 8, 4.3, "F");
    doc.setTextColor(255, 255, 255).setFont("helvetica", "bold");
    doc.text(String(vencidos.length), leftX + 25, yL - 0.2, { align: "center" });
    doc.setTextColor(0, 0, 0).setFont("helvetica", "normal");
  } else {
    doc.text("0", leftX + 25, yL, { align: "center" });
  }
  doc.text(formatCurrencyNum(totalVencidosUSD), leftX + 56, yL, { align: "right" });

  yL += 4.5;
  doc.text("Doc. Vence Hoy", leftX - 8, yL);
  doc.text(":", leftX + 13, yL);
  doc.text("0", leftX + 25, yL, { align: "center" });
  doc.text("0.00", leftX + 56, yL, { align: "right" });

  yL += 4.5;
  doc.text("Doc. por Vencer", leftX - 8, yL);
  doc.text(":", leftX + 13, yL);
  doc.text(String(porVencer.length), leftX + 25, yL, { align: "center" });
  doc.text(formatCurrencyNum(totalPorVencerUSD), leftX + 56, yL, { align: "right" });

  yL += 3.5;
  doc.setLineWidth(0.4).line(leftX + 32, yL, leftX + 56, yL);
  yL += 4.5;
  doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("USD", leftX + 24, yL);
  doc.text(formatCurrencyNum(totalSaldoUSD), leftX + 56, yL, { align: "right" });

  // RESUMEN POR TIPO DE DOCUMENTO (DERECHA)
  const rightX = 86;
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(0, 0, 0);
  doc.text("RESUMEN POR TIPO DE DOCUMENTO", rightX, startSummaryY);

  doc.setFont("helvetica", "bold").setFontSize(7);
  doc.text("Tipo Doc.", rightX, startSummaryY + 5.5);
  doc.text("Total Doc. USD", rightX + 58, startSummaryY + 5.5, { align: "right" });

  let yR = startSummaryY + 10.5;
  doc.setFont("helvetica", "normal").setFontSize(7.5);

  doc.text("Total Factura", rightX, yR);
  doc.text(":", rightX + 20, yR);
  doc.text(formatCurrencyNum(totalFacturasUSD), rightX + 58, yR, { align: "right" });

  yR += 4;
  doc.text("Total Boleta", rightX, yR);
  doc.text(":", rightX + 20, yR);
  doc.text(formatCurrencyNum(totalBoletasUSD), rightX + 58, yR, { align: "right" });

  yR += 4;
  doc.text("Total Nota Cred", rightX, yR);
  doc.text(":", rightX + 20, yR);
  doc.text(formatCurrencyNum(totalNCUSD), rightX + 58, yR, { align: "right" });

  yR += 4;
  doc.text("Total Nota Deb", rightX, yR);
  doc.text(":", rightX + 20, yR);
  doc.text(formatCurrencyNum(totalNDUSD), rightX + 58, yR, { align: "right" });

  yR += 4;
  doc.text("Total Letras", rightX, yR);
  doc.text(":", rightX + 20, yR);
  doc.text(formatCurrencyNum(totalLetrasUSD), rightX + 58, yR, { align: "right" });

  yR += 3.5;
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(60, 60, 60);
  doc.text(`En Cartera : 0.00`, rightX + 16, yR);
  yR += 3.2;
  doc.text(`En el Banco : ${formatCurrencyNum(totalLetrasUSD)}`, rightX + 16, yR);

  yR += 2.5;
  doc.setLineWidth(0.3).line(rightX + 34, yR, rightX + 58, yR);
  doc.line(rightX + 34, yR + 0.5, rightX + 58, yR + 0.5);

  yR += 4.5;
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(0, 0, 0);
  doc.text("USD", rightX + 26, yR);
  doc.text(formatCurrencyNum(totalSaldoUSD), rightX + 58, yR, { align: "right" });

  doc.setLineWidth(0.6).line(77, startSummaryY - 2, 77, yR + 2);

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