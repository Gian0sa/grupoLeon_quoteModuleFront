import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const addLogo = async (doc, { x = 170, y = 5, width = 25, height = 25, quality = 0.8 } = {}) => {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout al cargar el logo")), 5000);
      img.onload = () => { clearTimeout(timeout); resolve(); };
      img.onerror = (error) => { clearTimeout(timeout); reject(error); };
      img.src = "/assets/LogoAutopartes.jpg";
    });

    const imageDataURL = await getImageDataURL(img, quality);
    doc.addImage(imageDataURL, "JPEG", x, y, width, height);
  } catch {
    doc.setFont("helvetica", "bold").setFontSize(8).text("LOGO", x + width / 2, y + height / 2, { align: "center" });
  }
};

const safeText = (value, fallback = "-") =>
  value === null || value === undefined || value === "" ? fallback : String(value).trim();

const formatCurrency = (amount, currency = "", decimals = 2) => {
  if (typeof amount !== "number" || isNaN(amount)) return "0.00";
  const formatted = `${currency} ${Math.abs(amount).toFixed(decimals)}`.trim();
  return amount < 0 ? `-${formatted}` : formatted;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  
  let d;
  
  if (dateStr.includes('-') && dateStr.split('-')[0].length <= 2) {
    const [day, month, year] = dateStr.split('-');
    d = new Date(year, month - 1, day);
  }
  else if (dateStr.includes('/') && dateStr.split('/')[0].length <= 2) {
    const [day, month, year] = dateStr.split('/');
    d = new Date(year, month - 1, day);
  }
  else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    d = new Date(year, month - 1, day);
  }
  else {
    d = new Date(dateStr);
  }
  
  return isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Nueva función para verificar si un documento vence hoy
const venceHoy = (doc) => {
  const fechaVencimiento = doc.REFDATE || doc.fechaContable;
  if (!fechaVencimiento) return false;
  
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  let fechaDoc;
  if (fechaVencimiento.includes('-') && fechaVencimiento.split('-')[0].length <= 2) {
    const [day, month, year] = fechaVencimiento.split('-');
    fechaDoc = new Date(year, month - 1, day);
  } else if (fechaVencimiento.includes('/') && fechaVencimiento.split('/')[0].length <= 2) {
    const [day, month, year] = fechaVencimiento.split('/');
    fechaDoc = new Date(year, month - 1, day);
  } else if (fechaVencimiento.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [year, month, day] = fechaVencimiento.split('T')[0].split('-');
    fechaDoc = new Date(year, month - 1, day);
  } else {
    fechaDoc = new Date(fechaVencimiento);
  }
  
  fechaDoc.setHours(0, 0, 0, 0);
  return fechaDoc.getTime() === hoy.getTime();
};

const addHeader = (doc) =>
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(0, 0, 0).text("CUENTA POR COBRAR", 14, 20);

const getEstadoInfo = (estado) => {
  const estados = {
    parcialmente_vencido: { text: "PARCIALMENTE VENCIDO", color: [255, 193, 7] },
    vencido: { text: "VENCIDO", color: [220, 53, 69] },
    al_dia: { text: "AL DÍA", color: [40, 167, 69] },
    por_vencer: { text: "POR VENCER", color: [23, 162, 184] },
  };
  return estados[estado] || { text: estado?.toUpperCase() || "SIN ESTADO", color: [108, 117, 125] };
};

const addClientInfo = (doc, debt) => {
  const startY = 30, leftX = 14, rightX = 110;
  doc.setFontSize(9);

  const estadoInfo = getEstadoInfo(debt.estado);
  doc.setFont("helvetica", "bold")
    .setFillColor(...estadoInfo.color)
    .setTextColor(255, 255, 255)
    .rect(leftX, startY - 3, 55, 7, "F")
    .text(estadoInfo.text, leftX + 2, startY + 1);

  doc.setTextColor(0, 0, 0);

  const docs = debt.documents || [];
  const docsConVencimiento = docs.filter(d => d.diasVencimiento && d.diasVencimiento > 0);
  const antiguedadPromedio = docsConVencimiento.length > 0
    ? Math.round(docsConVencimiento.reduce((sum, d) => sum + d.diasVencimiento, 0) / docsConVencimiento.length)
    : 0;

  const leftData = [
    { label: "Cliente:", value: safeText(debt.nombre || debt.clientName) },
    { label: "RUC:", value: safeText(debt.ruc || debt.clientCode) },
    { label: "Código:", value: safeText(debt.clientCode || debt.ruc) },
    { label: "Vendedor:", value: safeText(debt.vendedor) },
  ];

  const rightData = [
    { label: "Total Docs:", value: safeText(debt.totalDocumentos || debt.totalDocuments, "0") },
    { label: "Vencidos:", value: safeText(debt.documentosVencidos || debt.overdueDocumentsCount, "0") },
    { label: "% Vencidos:", value: `${debt.porcentajeVencidos || 0}%` },
    { label: "Antigüedad:", value: `${antiguedadPromedio}d` },
  ];

  leftData.forEach((item, i) => {
    const y = startY + 9 + i * 6;
    doc.setFont("helvetica", "bold").text(item.label, leftX, y);
    doc.setFont("helvetica", "normal").text(item.value, leftX + 23, y);
  });

  rightData.forEach((item, i) => {
    const y = startY + 9 + i * 6;
    doc.setFont("helvetica", "bold").text(item.label, rightX, y);
    doc.setFont("helvetica", "normal").text(item.value, rightX + 28, y);
  });

  const montosY = startY + 35;
  doc.setDrawColor(200).setLineWidth(0.3).line(leftX, montosY, rightX + 85, montosY);

  const saldoPEN = debt.pendingAmount?.PEN || 0;
  const saldoUSD = debt.pendingAmount?.USD || 0;
  const saldoVencidoPEN = debt.overdueAmount?.PEN || 0;
  const saldoVencidoUSD = debt.overdueAmount?.USD || 0;

  doc.setFont("helvetica", "bold").setFontSize(8).text("SALDOS:", leftX, montosY + 5);
  doc.setFont("helvetica", "normal")
    .text(`PEN: ${formatCurrency(saldoPEN, "PEN")}`, leftX, montosY + 10)
    .text(`USD: ${formatCurrency(saldoUSD, "USD")}`, leftX, montosY + 15);

  doc.setFont("helvetica", "bold").text("VENCIDOS:", rightX, montosY + 5);
  doc.setFont("helvetica", "normal")
    .text(`PEN: ${formatCurrency(saldoVencidoPEN, "PEN")}`, rightX, montosY + 10)
    .text(`USD: ${formatCurrency(saldoVencidoUSD, "USD")}`, rightX, montosY + 15);
};

const addDocumentsTable = (doc, debt) => {
  const documents = debt.documents || debt.documentos || [];
  
  if (!documents.length) {
    doc.setFont("helvetica", "italic").setFontSize(9).text("No hay documentos registrados", 14, 78);
    return;
  }

  const tableData = documents.map((d) => {
    const esNotaCredito = d.tipoDocumento === "Nota de Crédito" || d.TIPO_DOC === "Nota de Crédito";
    const moneda = d.moneda || d.TIPOCAMBIO || "PEN";
    const venceHoyDoc = venceHoy(d);
    
    let monto = 0;
    if (moneda === "USD") {
      monto = d.SALDO_USD || d.saldoPendiente?.USD || d.totalDocumento || d.TOTAL_DOC || 0;
    } else {
      monto = d.SALDO_PEN || d.saldoPendiente?.PEN || d.totalDocumento || d.TOTAL_DOC || 0;
    }
    
    if (esNotaCredito && monto > 0) {
      monto = -monto;
    }
    
    // Mostrar días de vencimiento o "HOY" si vence hoy
    let diasTexto = "-";
    if (venceHoyDoc && !esNotaCredito) {
      diasTexto = "HOY";
    } else if (d.estaVencido && !esNotaCredito) {
      diasTexto = `${d.diasVencimiento || 0}`;
    }
    
    return [
      safeText(d.numeroDocumento || d.NRO_DOC),
      safeText(d.tipoDocumento || d.TIPO_DOC),
      formatDate(d.TAXDATE || d.fechaDocumento || d.FECHA_DOC),
      formatDate(d.REFDATE || d.fechaContable),
      safeText(d.CONDICION || d.condicionPago),
      diasTexto,
      formatCurrency(monto, moneda),
    ];
  });

  autoTable(doc, {
    startY: 70,
    head: [["N° Doc", "Tipo", "F. Doc", "F. Cont", "Cond", "Días", "Total"]],
    body: tableData,
    styles: { fontSize: 6.5, cellPadding: 1.5, valign: "middle" },
    headStyles: { fillColor: [52, 58, 64], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 6.5 },
    columnStyles: { 
      6: { halign: "right" }
    },
    margin: { left: 14, right: 14 },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    didParseCell: (data) => {
      if (data.section === 'body') {
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
        }
        // Nuevo estilo para documentos que vencen HOY
        else if (venceHoyDoc) {
          data.cell.styles.fillColor = [255, 243, 224];
          data.cell.styles.textColor = [230, 81, 0];
          if (data.column.index === 5) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [255, 152, 0];
            data.cell.styles.textColor = [255, 255, 255];
          }
          if (data.column.index === 6) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [255, 152, 0];
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
        else if (docu?.estaVencido) {
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
    arr.filter((d) => (d.moneda || d.TIPOCAMBIO) === moneda)
      .reduce((s, d) => {
        const monto = moneda === "USD" 
          ? (d.SALDO_USD || d.saldoPendiente?.USD || d.totalDocumento || d.TOTAL_DOC || 0)
          : (d.SALDO_PEN || d.saldoPendiente?.PEN || d.totalDocumento || d.TOTAL_DOC || 0);
        return s + monto;
      }, 0);

  const docsReales = docs;
  // Excluir documentos que vencen hoy de los vencidos
  const vencidosTotal = docsReales.filter((d) => d.estaVencido && !venceHoy(d));
  const porVencerTotal = docsReales.filter((d) => !d.estaVencido && !venceHoy(d));
  const vencenHoyTotal = docsReales.filter((d) => venceHoy(d));

  // SECCIÓN IZQUIERDA - Resumen Ejecutivo
  doc.setFont("helvetica", "bold").setFontSize(10).text("RESUMEN EJECUTIVO", leftX, startY);
  doc.setDrawColor(52, 58, 64).setLineWidth(0.4).line(leftX, startY + 1.5, leftX + 60, startY + 1.5);

   const leftData = [
    { label: "Docs Vencidos:", value: `${vencidosTotal.length} de ${debt.totalDocumentos}` },
    { label: "Monto Venc PEN:", value: formatCurrency(sum(vencidosTotal, "PEN"), "PEN") },
    { label: "Monto Venc USD:", value: formatCurrency(sum(vencidosTotal, "USD"), "USD") },
    { label: "Vencen Hoy:", value: `${vencenHoyTotal.length}`, highlight: vencenHoyTotal.length > 0 },
    { label: "Monto Hoy PEN:", value: formatCurrency(sum(vencenHoyTotal, "PEN"), "PEN"), highlight: vencenHoyTotal.length > 0 },
    { label: "Monto Hoy USD:", value: formatCurrency(sum(vencenHoyTotal, "USD"), "USD"), highlight: vencenHoyTotal.length > 0 },
    { label: "Estado General:", value: getEstadoInfo(debt.estado).text },
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

  const facturas = docs.filter(d => (d.tipoDocumento || d.TIPO_DOC) === "Factura de Cliente");
  const boletas = docs.filter(d => (d.tipoDocumento || d.TIPO_DOC) === "Boleta");
  const notasCredito = docs.filter(d => (d.tipoDocumento || d.TIPO_DOC) === "Nota de Crédito");
  const notasDebito = docs.filter(d => (d.tipoDocumento || d.TIPO_DOC) === "Nota de Débito");
  const letras = docs.filter(d => (d.tipoDocumento || d.TIPO_DOC)?.includes("Letra"));

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

  // Calcular total general
  const allUSD = sum(docs, "USD");
  const allPEN = sum(docs, "PEN");
  const monedaGeneral = allUSD !== 0 ? "USD" : "PEN";
  const montoGeneral = allUSD !== 0 ? allUSD : allPEN;

  yPos += 2;
  doc.setDrawColor(0).setLineWidth(0.4).line(rightX + 40, yPos, rightX + 85, yPos);
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

export const generateReceivablePDF = async (debt, { filename, logoOptions = {}, autoDownload = true } = {}) => {
  if (!debt) return;
  
  const defaultFilename = `Cuenta-Por-Cobrar-${safeText(debt?.ruc || debt?.clientCode, "Sin-RUC")}.pdf`;
  
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await addLogo(doc, logoOptions);
  addHeader(doc, debt);
  addClientInfo(doc, debt);
  addDocumentsTable(doc, debt);
  addSummary(doc, debt);
  addFooter(doc);
  
  if (autoDownload) doc.save(filename || defaultFilename);
  else return doc;
};

export const previewReceivablePDF = async (debt, options = {}) => {
  const doc = await generateReceivablePDF(debt, { ...options, autoDownload: false });
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const previewWindow = window.open(pdfUrl, "_blank");
  if (!previewWindow) {
    const defaultFilename = `Cuenta-Por-Cobrar-${safeText(debt?.ruc || debt?.clientCode, "Sin-RUC")}.pdf`;
    doc.save(options.filename || defaultFilename);
  }
};