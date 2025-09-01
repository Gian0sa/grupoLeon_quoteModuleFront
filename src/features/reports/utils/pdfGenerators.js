// src/utils/pdfGenerators.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Convierte imagen a base64
export const getImageDataURL = (img) => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    resolve(canvas.toDataURL("image/jpeg", 0.8));
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
      img.src = "/assets/LogoAutopartes.jpg";
    });
    const imageDataURL = await getImageDataURL(img);
    doc.addImage(imageDataURL, 'JPEG', 165, 5, 30, 30);
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

export const downloadInvoicePDF = async (invoiceDetalle) => {
  if (!invoiceDetalle?.numAtCard) {
    console.error("❌ No se recibió numAtCard en invoiceDetalle");
    return;
  }

  const url = `${import.meta.env.VITE_API_URL}/reportModule/pdf/${invoiceDetalle.numAtCard}`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/pdf",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const text = await response.text(); 
      throw new Error(`Error ${response.status}: ${text}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `Factura_${invoiceDetalle.numAtCard}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

  } catch (err) {
    console.error("❌ No se pudo descargar el archivo:", err);
    alert(`No se pudo descargar el archivo: ${err.message}`);
  }
};

export const downloadInvoicePDFdirectly = async (referenceCode) => {

  console.log("Descargando PDF directo para referencia:", referenceCode);

  const url = `${import.meta.env.VITE_API_URL}/reportModule/pdf/${referenceCode}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`, 
        "Accept": "application/pdf",
      },
    });

    //DESCOMENTAR EN PRODUCCIÓN
    // const response = await fetch(url, {
    //   method: "GET",
    //   headers: {
    //     "Accept": "application/pdf",
    //   },
    //   credentials: "include", // 👈 Importante: envía cookies
    // });

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `Factura_${referenceCode}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error("No se pudo descargar el archivo:", err);
    alert("No se pudo descargar el archivo.");
  }
};