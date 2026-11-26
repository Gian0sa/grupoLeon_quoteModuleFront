// src/utils/pdfGenerators.js
import { getInvoiceByCode } from "../services/reportService";

// jspdf + autotable pesan ~600 KB: se cargan solo al generar un PDF, no al abrir la app.
let jsPDF = null;
let autoTable = null;
const loadPdfLibs = async () => {
  if (jsPDF) return;
  const [jspdfModule, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  jsPDF = jspdfModule.default;
  autoTable = autoTableModule.default;
};

// Convierte imagen a base64 con transparencia PNG
export const getImageDataURL = (img) => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.naturalWidth || img.width || 300;
    canvas.height = img.naturalHeight || img.height || 300;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    resolve(canvas.toDataURL("image/png"));
  });
};

const safeText = (value, fallback = "-") => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const addLogo = async (doc) => {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = "/assets/LogoAutopartes.png";
    });
    const imageDataURL = await getImageDataURL(img);
    doc.addImage(imageDataURL, 'PNG', 165, 5, 30, 30, undefined, 'FAST');
  } catch (error) {
    console.warn("No se pudo cargar el logo:", error);
    doc.setLineWidth(1);
    doc.circle(180, 20, 15);
    doc.setFontSize(10);
    doc.text("LOGO", 175, 22);
  }
};

export const generateOrderPDF = async (ordenDetalle) => {
  if (!ordenDetalle) return;
  await loadPdfLibs();
  const doc = new jsPDF();
  doc.setFont("helvetica", "normal");

  doc.setLineWidth(0.5);
  for (let i = 0; i < 15; i++) doc.line(14 + (i * 2), 8, 14 + (i * 2), 12);

  doc.setFont("helvetica", "bold").setFontSize(24).text("ORDEN DE VENTA", 14, 25);

  await addLogo(doc);

  doc.setFont("helvetica", "bold").setFontSize(10).text("DE", 14, 45);
  doc.setFont("helvetica", "normal").setFontSize(9).text("Autopartes SA", 14, 52);

  doc.text("N° DE ORDEN", 140, 45);
  doc.text("FECHA", 140, 52);
  doc.text("HORA", 140, 59);
  doc.text(safeText(ordenDetalle.docNum), 180, 45);
  doc.text(safeText(ordenDetalle.docDate?.slice(0, 10)), 180, 52);
  doc.text(safeText(ordenDetalle.time), 180, 59);

  doc.setFont("helvetica", "bold").setFontSize(10).text("DATOS DEL CLIENTE", 14, 80);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(safeText(ordenDetalle.cardName), 14, 87);
  doc.text(safeText(ordenDetalle.cardCode), 14, 92);
  doc.text(safeText(ordenDetalle.address), 14, 97);

  const tableData = ordenDetalle.lines.map((line, index) => [
    `${index + 1}`,
    line.itemCode || "-",
    line.description || "-",
    `${line.quantity || 1}`,
    parseFloat(line.unitPrice || 0).toFixed(2),
    parseFloat(line.lineTotal || 0).toFixed(2),
  ]);

  autoTable(doc, {
    startY: 110,
    head: [["#", "CÓDIGO", "DESCRIPCIÓN", "CANT.", "PRECIO", "TOTAL"]],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineWidth: 0.3,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    margin: { left: 14 },
  });

  const finalY = doc.lastAutoTable.finalY;
  const subtotal = ordenDetalle.lines.reduce((acc, item) => acc + parseFloat(item.lineTotal || 0), 0);
  const igv = subtotal * 0.18;
  const total = parseFloat(ordenDetalle.total || 0);

  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text("Subtotal", 155, finalY + 15);
  doc.text(subtotal.toFixed(2), 185, finalY + 15);
  doc.text("IGV 18.0%", 155, finalY + 22);
  doc.text(igv.toFixed(2), 185, finalY + 22);

  doc.setLineWidth(1).rect(145, finalY + 30, 50, 12);
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("TOTAL", 148, finalY + 38);
  doc.text(`${total.toFixed(2)} $/`, 170, finalY + 38);

  doc.save(`Orden-Venta-${ordenDetalle.docNum}.pdf`);
};

export const generateDeliveryPDF = async (entregaDetalle) => {
  if (!entregaDetalle) {
    console.error("No se encontraron datos de la entrega");
    return;
  }
  await loadPdfLibs();
  const doc = new jsPDF();
  doc.setFont("helvetica", "normal");

  doc.setLineWidth(0.5);
  for (let i = 0; i < 15; i++) doc.line(14 + (i * 2), 8, 14 + (i * 2), 12);

  doc.setFont("helvetica", "bold").setFontSize(24).text("GUÍA DE SALIDA", 14, 25);
  await addLogo(doc);

  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text("N° DE GUÍA:", 14, 45);
  doc.text("FECHA:", 14, 52);
  doc.text("CLIENTE:", 14, 59);
  doc.text("DIRECCIÓN:", 14, 66);

  doc.setFont("helvetica", "normal");
  doc.text(safeText(entregaDetalle.docNum), 40, 45);
  doc.text(safeText(entregaDetalle.docDate?.slice(0, 10)), 40, 52);
  doc.text(safeText(entregaDetalle.cardName), 40, 59);
  doc.text(safeText(entregaDetalle.address), 40, 66);

  doc.setFont("helvetica", "bold");
  doc.text("MONEDA:", 140, 45);
  doc.text("TOTAL:", 140, 52);
  doc.setFont("helvetica", "normal");
  doc.text(safeText(entregaDetalle.currency), 180, 45);
  doc.text(safeText(entregaDetalle.total), 180, 52);

  const tableData = entregaDetalle.lines.map((line, index) => [
    `${index + 1}`,
    line.itemCode || "-",
    line.description || "-",
    `${line.quantity || 1}`,
    parseFloat(line.unitPrice || 0).toFixed(2),
    parseFloat(line.lineTotal || 0).toFixed(2),
  ]);

  autoTable(doc, {
    startY: 80,
    head: [["#", "CÓDIGO", "DESCRIPCIÓN", "CANT.", "PRECIO", "TOTAL"]],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineWidth: 0.3,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 25 },
      2: { cellWidth: "wrap" },
      3: { cellWidth: 15, halign: "right" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 25, halign: "right" },
    },
    margin: { left: 14 },
  });

  doc.save(`Guia-Salida-${entregaDetalle.docNum}.pdf`);
};

export const normalizeInvoiceRefCode = (code) => {
  if (!code) return "";
  const cleaned = String(code).trim().replace(/[\/\s]/g, "");
  // Formato completo con o sin guión: 01-F003-00037204, 01F003-00037204, 01-F003-37204
  const matchFull = cleaned.match(/^(\d{2})-?([A-Z0-9]{4})-?(\d+)$/i);
  if (matchFull) {
    return `${matchFull[1]}${matchFull[2].toUpperCase()}-${matchFull[3].padStart(8, "0")}`;
  }
  // Formato sin tipo: F003-00037204, B003-00037204, FC03-00001234
  const matchShort = cleaned.match(/^([A-Z0-9]{4})-?(\d+)$/i);
  if (matchShort) {
    const serie = matchShort[1].toUpperCase();
    let tipo = "01";
    if (/^[FB]C/i.test(serie)) tipo = "07";
    else if (/^[FB]D/i.test(serie)) tipo = "08";
    else if (serie.startsWith("B")) tipo = "03";
    return `${tipo}${serie}-${matchShort[2].padStart(8, "0")}`;
  }
  return cleaned;
};

const resolveComprobanteDisplayMeta = (cleanCode, fallbackNumAtCard = "") => {
  const ref = normalizeInvoiceRefCode(cleanCode || fallbackNumAtCard);
  const match = ref.match(/^(\d{2})([A-Z0-9]{4})-(\d+)$/i);
  const tipo = match ? match[1] : ref.startsWith("03") ? "03" : "01";
  const serieNumero = match ? `${match[2].toUpperCase()}-${match[3]}` : (ref || "S/N");

  if (tipo === "03") {
    return { tipo, docTitle: "BOLETA DE VENTA", filePrefix: "Boleta", serieNumero };
  }
  if (tipo === "07") {
    return { tipo, docTitle: "NOTA DE CRÉDITO", filePrefix: "NotaCredito", serieNumero };
  }
  if (tipo === "08") {
    return { tipo, docTitle: "NOTA DE DÉBITO", filePrefix: "NotaDebito", serieNumero };
  }
  return { tipo, docTitle: "FACTURA ELECTRÓNICA", filePrefix: "Factura", serieNumero };
};

export const generateSapInvoiceFallbackPDF = async (invoiceDetalle, referenceCode = "") => {
  if (!invoiceDetalle) return null;
  await loadPdfLibs();

  const doc = new jsPDF();
  const { docTitle, filePrefix, serieNumero } = resolveComprobanteDisplayMeta(
    referenceCode,
    invoiceDetalle.numAtCard || invoiceDetalle.NumAtCard || ""
  );

  const rawCurrency = String(invoiceDetalle.currency || "SOL").toUpperCase().trim();
  const isUSD = rawCurrency === "USD" || rawCurrency.includes("$") || Number(invoiceDetalle.totalUsd) > 0 && rawCurrency !== "SOL" && rawCurrency !== "PEN";
  const currencySymbol = isUSD ? "USD $" : "S/";
  const docRate = Number(invoiceDetalle.docRate || 1);

  await addLogo(doc);

  // Cabecera Empresa
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(13, 92, 62);
  doc.text("AUTOPARTES S.A.", 14, 16);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60, 60, 60);
  doc.text("R.U.C.: 20144640269", 14, 21.5);
  doc.text("Av. De las Torres N° 281, Urb. Ind. La Aurora, Ate - Lima", 14, 26.5);
  doc.text("Central: (01) 324-2800  |  www.autopartes.pe", 14, 31.5);

  // Recuadro Comprobante
  doc.setDrawColor(13, 92, 62).setLineWidth(0.5);
  doc.roundedRect(118, 10, 44, 25, 2, 2);
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(13, 92, 62);
  doc.text(docTitle, 140, 17, { align: "center" });
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(15, 23, 42);
  doc.text(serieNumero, 140, 24, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(100, 116, 139);
  doc.text(`SAP #${safeText(invoiceDetalle.docNum || invoiceDetalle.docEntry)}`, 140, 30.5, {
    align: "center",
  });

  // Banda informativa estado SUNAT
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 39, 182, 8, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(146, 64, 14);
  doc.text(
    "PRELIMINAR CONTABLE SAP B1  •  PDF oficial SUNAT / TeFacturo en proceso de sincronización",
    105,
    44.2,
    { align: "center" }
  );

  // Datos del cliente y comprobante
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold").setFontSize(8.5);
  doc.text("CLIENTE:", 14, 55);
  doc.text("RUC / DOC.:", 14, 61);
  doc.text("DIRECCIÓN:", 14, 67);

  doc.setFont("helvetica", "normal").setFontSize(8.5);
  const clientNameLines = doc.splitTextToSize(safeText(invoiceDetalle.cardName), 92);
  doc.text(clientNameLines[0] || "-", 36, 55);
  const rucDisplay =
    invoiceDetalle.federalTaxId ||
    String(invoiceDetalle.cardCode || "-").replace(/^CL/i, "");
  doc.text(safeText(rucDisplay), 36, 61);
  const addressLines = doc.splitTextToSize(safeText(invoiceDetalle.address), 92);
  doc.text(addressLines.slice(0, 2), 36, 67);

  doc.setFont("helvetica", "bold").setFontSize(8.5);
  doc.text("FECHA EMISIÓN:", 132, 55);
  doc.text("VENCIMIENTO:", 132, 61);
  doc.text("MONEDA:", 132, 67);

  doc.setFont("helvetica", "normal").setFontSize(8.5);
  doc.text(safeText(invoiceDetalle.docDate?.slice(0, 10)), 165, 55);
  doc.text(safeText(invoiceDetalle.docDueDate?.slice(0, 10)), 165, 61);
  doc.text(isUSD ? "DÓLARES (USD)" : "SOLES (PEN)", 165, 67);

  const rawLines = Array.isArray(invoiceDetalle.lines) ? invoiceDetalle.lines : [];
  const normalizedLines = rawLines.map((line, index) => {
    const qty = Number(line.quantity || 0);
    const unitPrice = Number(line.unitPrice || 0);
    let lineTotal = Number(line.lineTotal || 0);
    const expectedNet = Number((qty * unitPrice).toFixed(2));

    // Protección ante respuestas cacheadas antiguas donde lineTotal venía en PEN para facturas USD
    if (isUSD && docRate > 1.2 && expectedNet > 0 && lineTotal > expectedNet * 1.8) {
      lineTotal = expectedNet;
    }

    return {
      idx: `${index + 1}`,
      itemCode: line.itemCode || "-",
      description: line.description || "-",
      unit: line.unit || "NIU",
      qty: `${qty}`,
      unitPrice,
      lineTotal,
    };
  });

  const tableData = normalizedLines.map((item) => [
    item.idx,
    item.itemCode,
    item.description,
    item.unit,
    item.qty,
    item.unitPrice.toFixed(2),
    item.lineTotal.toFixed(2),
  ]);

  autoTable(doc, {
    startY: 77,
    head: [["#", "CÓDIGO", "DESCRIPCIÓN", "UND.", "CANT.", "V. UNIT.", "SUBTOTAL"]],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: {
      fillColor: [13, 92, 62],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 9, halign: "center" },
      1: { cellWidth: 26 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 14, halign: "center" },
      4: { cellWidth: 15, halign: "right" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 24, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = Math.min((doc.lastAutoTable?.finalY || 120) + 8, 245);
  const linesNetSum = Number(
    normalizedLines.reduce((acc, item) => acc + item.lineTotal, 0).toFixed(2)
  );
  const totalDoc = Number(
    isUSD && Number(invoiceDetalle.totalUsd) > 0
      ? invoiceDetalle.totalUsd
      : invoiceDetalle.total || linesNetSum * 1.18
  );
  const igvDoc =
    invoiceDetalle.igv != null
      ? Number(invoiceDetalle.igv)
      : Math.max(0, Number((totalDoc - linesNetSum).toFixed(2)));
  const subtotalDoc =
    invoiceDetalle.subtotal != null
      ? Number(invoiceDetalle.subtotal)
      : Number((totalDoc - igvDoc).toFixed(2));

  doc.setDrawColor(203, 213, 225).setLineWidth(0.3);
  doc.roundedRect(124, finalY, 72, 26, 2, 2);

  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(51, 65, 85);
  doc.text("Op. Gravada:", 128, finalY + 6.5);
  doc.text(`${currencySymbol} ${subtotalDoc.toFixed(2)}`, 192, finalY + 6.5, { align: "right" });

  doc.text("I.G.V. (18%):", 128, finalY + 13);
  doc.text(`${currencySymbol} ${igvDoc.toFixed(2)}`, 192, finalY + 13, { align: "right" });

  doc.setLineWidth(0.3).line(128, finalY + 16, 192, finalY + 16);
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(13, 92, 62);
  doc.text("IMPORTE TOTAL:", 128, finalY + 22.5);
  doc.text(`${currencySymbol} ${totalDoc.toFixed(2)}`, 192, finalY + 22.5, { align: "right" });

  doc.setFont("helvetica", "italic").setFontSize(7.5).setTextColor(100, 116, 139);
  doc.text(
    "Documento generado con los datos oficiales contabilizados en SAP Business One mientras culmina el envío electrónico OSE/SUNAT.",
    14,
    Math.min(finalY + 34, 285)
  );

  const fileName = `${filePrefix}_${serieNumero}_SAP.pdf`;
  doc.save(fileName);
  return fileName;
};

const triggerBrowserPdfDownload = (rawBlob, fileName) => {
  const pdfBlob = new Blob([rawBlob], { type: "application/pdf" });
  const blobUrl = window.URL.createObjectURL(pdfBlob);

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(blobUrl);
    } catch (_) {}
  }, 10000);
};

export const downloadInvoicePDF = async (invoiceDetalle) => {
  if (!invoiceDetalle?.numAtCard && !invoiceDetalle?.docEntry) {
    console.error("No se encontró el número de referencia para descargar la factura");
    throw new Error("No se encontró el número de referencia para descargar el comprobante.");
  }

  return downloadInvoicePDFdirectly(
    invoiceDetalle.numAtCard || invoiceDetalle.docEntry,
    {
      invoiceId: invoiceDetalle.docEntry,
      invoiceData: invoiceDetalle,
    }
  );
};

export const downloadInvoicePDFdirectly = async (referenceCode, options = {}) => {
  if (!referenceCode && !options?.invoiceId) {
    throw new Error("No se proporcionó un código de referencia válido.");
  }

  const cleanCode = normalizeInvoiceRefCode(referenceCode || options?.invoiceId);
  const { filePrefix } = resolveComprobanteDisplayMeta(cleanCode);
  const url = `${import.meta.env.VITE_API_URL}/reportModule/pdf/${cleanCode}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/pdf, application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    let errJson = null;
    let errorMsg = `Error ${response.status}: No se pudo obtener el PDF del comprobante ${referenceCode}.`;
    try {
      errJson = await response.json();
      if (errJson?.message) errorMsg = errJson.message;
    } catch (_) {
      try {
        const errText = await response.text();
        if (errText) errorMsg = errText;
      } catch (__) {}
    }

    const canTrySapFallback =
      options?.allowSapFallback !== false &&
      (response.status === 404 ||
        response.status === 502 ||
        errJson?.pendingSunat === true ||
        /no se encontr|cola de|sincronizaci|obtener el pdf|consultar pdf/i.test(
          `${errorMsg} ${errJson?.error || ""}`
        ));

    if (canTrySapFallback) {
      let sapInvoice = options?.invoiceData || null;
      if (!sapInvoice?.lines?.length && options?.invoiceId) {
        sapInvoice = await getInvoiceByCode(options.invoiceId);
      }
      if (!sapInvoice?.lines?.length && cleanCode && String(cleanCode) !== String(options?.invoiceId || "")) {
        sapInvoice = await getInvoiceByCode(cleanCode);
      }

      if (sapInvoice && Array.isArray(sapInvoice.lines) && sapInvoice.lines.length > 0) {
        const fileName = await generateSapInvoiceFallbackPDF(sapInvoice, cleanCode);
        return {
          source: "sap_fallback",
          fallbackSap: true,
          cleanCode,
          fileName,
          message: errorMsg,
        };
      }
    }

    if (response.status === 404 || errJson?.pendingSunat) {
      throw new Error(
        errJson?.message ||
          `El comprobante ${cleanCode} aún está en cola de envío electrónico a SUNAT/TeFacturo. Intenta nuevamente en unos minutos.`
      );
    }

    throw new Error(errorMsg);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.includes("application/pdf") && !contentType.includes("octet-stream")) {
    throw new Error("La respuesta del servidor no corresponde a un documento PDF válido.");
  }

  const rawBlob = await response.blob();
  if (!rawBlob || rawBlob.size === 0) {
    throw new Error("El documento PDF recibido está vacío o no contiene datos.");
  }

  const fileName = `${filePrefix}_${cleanCode}.pdf`;
  triggerBrowserPdfDownload(rawBlob, fileName);

  return {
    source: "tefacturo",
    fallbackSap: false,
    cleanCode,
    fileName,
  };
};