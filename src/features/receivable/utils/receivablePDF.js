import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "../../../assets/LogoAutopartes.jpg";

/**
 * Convierte una imagen a Data URL para uso en PDF
 * @param {HTMLImageElement} img - Elemento de imagen
 * @param {number} quality - Calidad de compresión (0-1)
 * @returns {Promise<string>} Data URL de la imagen
 */
const getImageDataURL = (img, quality = 0.8) => {
  return new Promise((resolve, reject) => {
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
};

// Función para truncar texto a N líneas con sí­mbolo de continuación
function splitAndTruncate(text, maxWidth, maxLines = 2, doc) {
  const lines = doc.splitTextToSize(text, maxWidth);
  if (lines.length <= maxLines) return lines;
  // Tomar las primeras maxLines líneas
  const truncated = lines.slice(0, maxLines);
  // Añadir "..." al final de la última línea (ajustándolo si está muy larga)
  let last = truncated[maxLines - 1];
  const ellipsis = '...';
  while (doc.getTextWidth(last + ellipsis) > maxWidth && last.length > 0) {
    last = last.slice(0, -1);
  }
  truncated[maxLines - 1] = last + ellipsis;
  return truncated;
}


/**
 * Añade el logo al documento PDF
 * @param {jsPDF} doc - Instancia del documento PDF
 * @param {Object} options - Opciones para el logo
 * @returns {Promise<void>}
 */
const addLogo = async (doc, options = {}) => {
  const {
    x = 165,
    y = 5,
    width = 30,
    height = 30,
    quality = 0.8
  } = options;

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout al cargar el logo"));
      }, 5000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      
      img.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
      
      img.src = logoImage;
    });

    const imageDataURL = await getImageDataURL(img, quality);
    doc.addImage(imageDataURL, 'JPEG', x, y, width, height);
  } catch (error) {
    console.warn("No se pudo cargar el logo:", error.message);
    // Opcional: agregar un placeholder de texto
    doc.setFont("helvetica", "bold")
       .setFontSize(8)
       .text("LOGO", x + width/2, y + height/2, { align: 'center' });
  }
};

/**
 * Convierte un valor a texto seguro para PDF
 * @param {any} value - Valor a convertir
 * @param {string} fallback - Valor por defecto
 * @returns {string}
 */
const safeText = (value, fallback = "-") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value).trim();
};

/**
 * Formatea un número como moneda
 * @param {number} amount - Cantidad a formatear
 * @param {string} currency - Código de moneda
 * @param {number} decimals - Número de decimales
 * @returns {string}
 */
const formatCurrency = (amount, currency = "", decimals = 2) => {
  if (typeof amount !== 'number' || isNaN(amount)) return "0.00";
  return `${currency} ${amount.toFixed(decimals)}`.trim();
};

/**
 * Formatea una fecha para mostrar en el PDF
 * @param {string|Date} date - Fecha a formatear
 * @returns {string}
 */
const formatDate = (date) => {
  if (!date) return "-";
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "-";
    return dateObj.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return "-";
  }
};

/**
 * Añade el encabezado del documento
 * @param {jsPDF} doc - Instancia del documento PDF
 * @param {Object} debt - Datos de la deuda
 */
const addHeader = (doc, debt) => {
  // Título principal
  doc.setFont("helvetica", "bold")
     .setFontSize(20)
     .setTextColor(0, 0, 0)
     .text("CUENTA POR COBRAR", 14, 25);
};

/**
 * Obtiene el color y estado basado en el estado de la deuda
 * @param {string} estado - Estado de la deuda
 * @param {string} colorEstado - Color del estado
 * @returns {Object}
 */
const getEstadoInfo = (estado, colorEstado) => {
  const estados = {
    'parcialmente_vencido': { text: 'PARCIALMENTE VENCIDO', color: [23, 162, 184] }, // Azul
    'vencido': { text: 'VENCIDO', color: [220, 53, 69] }, // Rojo
    'al_dia': { text: 'AL DÍA', color: [40, 167, 69] }, // Verde
    'por_vencer': { text: 'POR VENCER', color: [23, 162, 184] } // Azul
  };
  
  return estados[estado] || { text: estado?.toUpperCase() || 'SIN ESTADO', color: [108, 117, 125] };
};

/**
 * Añade la información del cliente
 * @param {jsPDF} doc - Instancia del documento PDF
 * @param {Object} debt - Datos de la deuda
 */
const addClientInfo = (doc, debt) => {
  const startY = 40;
  const leftColumnX = 14;
  const rightColumnX = 110;
  const labelWidth = 25;
  
  doc.setFontSize(10);

  // Información del estado con color
  const estadoInfo = getEstadoInfo(debt.estado, debt.colorEstado);
  doc.setFont("helvetica", "bold")
     .setFillColor(...estadoInfo.color)
     .setTextColor(255, 255, 255)
     .rect(leftColumnX, startY - 4, 60, 8, 'F')
     .text(estadoInfo.text, leftColumnX + 2, startY + 1);

  // Resetear color de texto
  doc.setTextColor(0, 0, 0);

  // Columna izquierda
  const leftData = [
    { label: "Cliente:", value: safeText(debt.nombre) },
    { label: "RUC:", value: safeText(debt.ruc) },
    { label: "Código:", value: safeText(debt.clienteCodigo) },
    { label: "Vendedor:", value: safeText(debt.vendedor) }
  ];

  // Columna derecha - Información financiera
  const saldoTotal = (debt.saldoPEN || 0) + (debt.saldoUSD || 0);
  const montoVencido = (debt.saldoVencidoPEN || 0) + (debt.saldoVencidoUSD || 0);
  
  const rightData = [
    { label: "Total Documentos:", value: safeText(debt.totalDocumentos, "0") },
    { label: "Docs. Vencidos:", value: safeText(debt.documentosVencidos, "0") },
    { label: "% Vencidos:", value: `${debt.porcentajeVencidos || 0}%` },
    { label: "Antigüedad Prom.:", value: `${debt.antiguedadPromedio || 0} días` }
  ];

  // Renderizar columna izquierda (empezar más abajo por el estado)
  leftData.forEach((item, index) => {
  const y = startY + 12 + (index * 8);
  doc.setFont("helvetica", "bold").text(item.label, leftColumnX, y);
  doc.setFont("helvetica", "normal");

  const maxWidth = rightColumnX - (leftColumnX + labelWidth) - 10;
  const lines = splitAndTruncate(item.value, maxWidth, 2, doc);
  doc.text(lines, leftColumnX + labelWidth, y);
});


  // Renderizar columna derecha
  rightData.forEach((item, index) => {
    const y = startY + 12 + (index * 6);
    doc.setFont("helvetica", "bold").text(item.label, rightColumnX, y);
    doc.setFont("helvetica", "normal").text(item.value, rightColumnX + 35, y);
  });

  // Sección de montos (abajo de todo)
  const montosY = startY + 44;
  
  // Línea separadora
  doc.setDrawColor(200, 200, 200)
     .setLineWidth(0.3)
     .line(leftColumnX, montosY, rightColumnX + 80, montosY);

  // Montos en PEN y USD
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text("SALDOS:", leftColumnX, montosY + 8);
  
  doc.setFont("helvetica", "normal");
  doc.text(`PEN: ${formatCurrency(debt.saldoPEN || 0, "PEN")}`, leftColumnX, montosY + 14);
  doc.text(`USD: ${formatCurrency(debt.saldoUSD || 0, "USD")}`, leftColumnX, montosY + 20);
  
  doc.setFont("helvetica", "bold");
  doc.text("VENCIDOS:", rightColumnX, montosY + 8);
  
  doc.setFont("helvetica", "normal");
  doc.text(`PEN: ${formatCurrency(debt.saldoVencidoPEN || 0, "PEN")}`, rightColumnX, montosY + 14);
  doc.text(`USD: ${formatCurrency(debt.saldoVencidoUSD || 0, "USD")}`, rightColumnX, montosY + 20);
};

/**
 * Obtiene información de categoría de vencimiento
 * @param {string} categoria - Categoría de vencimiento
 * @param {boolean} estaVencido - Si está vencido
 * @returns {Object}
 */
const getCategoriaVencimientoInfo = (categoria, estaVencido) => {
  if (estaVencido) {
    return { text: 'VENCIDO', color: [255, 235, 238] }; // Rojo claro
  }
  
  const categorias = {
    'por_vencer_0_30': { text: '0-30 días', color: [232, 245, 233] }, // Verde claro
    'por_vencer_31_60': { text: '31-60 días', color: [255, 248, 225] }, // Amarillo claro
    'por_vencer_61_90': { text: '61-90 días', color: [255, 243, 224] }, // Naranja claro
    'ya_vencidos': { text: 'VENCIDO', color: [255, 235, 238] } // Rojo claro
  };
  
  return categorias[categoria] || { text: '-', color: [248, 249, 250] };
};

/**
 * Añade la tabla de documentos con ancho completo optimizado
 * @param {jsPDF} doc - Instancia del documento PDF
 * @param {Object} debt - Datos de la deuda
 */
const addDocumentsTable = (doc, debt) => {
  const documents = debt.documentos || [];
  
  if (documents.length === 0) {
    doc.setFont("helvetica", "italic")
       .setFontSize(10)
       .text("No hay documentos registrados", 14, 95);
    return;
  }

  const tableData = documents.map((document, index) => {
    return [
      `${index + 1}`,
      safeText(document.numeroDocumento),
      safeText(document.tipoDocumento),
      formatDate(document.fechaDocumento),
      formatDate(document.fechaContable),
      safeText(document.condicionPago),
      document.estaVencido ? `${document.diasVencimiento || 0}` : '-',
      formatCurrency(document.totalDocumento),
      safeText(document.moneda)
    ];
  });

  // Calcular el ancho disponible total (A4 = 210mm, márgenes 14mm cada lado)
  const pageWidth = 210;
  const leftMargin = 14;
  const rightMargin = 14;
  const availableWidth = pageWidth - leftMargin - rightMargin; // 182mm

  autoTable(doc, {
    startY: 85,
    head: [["#", "N° Documento", "Tipo", "F. Documento", "F. Contable", "Condición Pago", "Días Venc.", "Total", "Mon."]],
    body: tableData,
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
      halign: 'left',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [52, 58, 64],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: 'center',
      fontSize: 7
    },
    // Distribución optimizada de columnas para usar todo el ancho sin la columna Estado
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },      // # - 12mm
      1: { cellWidth: 32 },                        // N° Documento - 32mm
      2: { cellWidth: 24 },                        // Tipo - 24mm  
      3: { halign: 'center', cellWidth: 22 },      // F. Documento - 22mm
      4: { halign: 'center', cellWidth: 22 },      // F. Contable - 22mm
      5: { cellWidth: 38 },                        // Condición Pago - 38mm
      6: { halign: 'center', cellWidth: 16 },      // Días Venc. - 16mm
      7: { halign: 'right', cellWidth: 28 },       // Total - 28mm
      8: { halign: 'center', cellWidth: 14 }       // Moneda - 14mm
    },
    // Total: 12+32+24+22+22+38+16+28+14 = 208mm (se distribuye automáticamente)
    
    margin: { left: leftMargin, right: rightMargin },
    tableWidth: 'auto', // Usa todo el ancho disponible
    showHead: 'everyPage',
    
    // Mejorar la apariencia visual
    alternateRowStyles: {
      fillColor: [248, 249, 250] // Filas alternas con color suave
    },
    
    didParseCell: function(data) {
      const document = documents[data.row.index];
      
      // Sombrear toda la fila en rojo si el documento está vencido
      if (document && document.estaVencido) {
        data.cell.styles.fillColor = [255, 235, 238]; // Fondo rojo claro para toda la fila
        data.cell.styles.textColor = [139, 0, 0]; // Texto rojo oscuro
        
        // Resaltar especialmente los días de vencimiento
        if (data.column.index === 6) { // Columna Días Venc.
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 53, 69]; // Rojo más intenso
          data.cell.styles.textColor = [255, 255, 255]; // Texto blanco
        }
      }
      
      // Resaltar montos altos (opcional)
      if (data.column.index === 7) { // Columna Total
        if (document && document.totalDocumento > 10000) { // Umbral personalizable
          data.cell.styles.fontStyle = 'bold';
          if (!document.estaVencido) {
            data.cell.styles.textColor = [0, 123, 255]; // Azul para montos altos solo si no está vencido
          }
        }
      }
    }
  });
};

/**
 * Versión alternativa con tabla más compacta (menos columnas)
 * @param {jsPDF} doc - Instancia del documento PDF
 * @param {Object} debt - Datos de la deuda
 */
const addCompactDocumentsTable = (doc, debt) => {
  const documents = debt.documentos || [];
  
  if (documents.length === 0) {
    doc.setFont("helvetica", "italic")
       .setFontSize(10)
       .text("No hay documentos registrados", 14, 95);
    return;
  }

  // Tabla más compacta con menos columnas
  const tableData = documents.map((document, index) => {
    return [
      `${index + 1}`,
      safeText(document.numeroDocumento),
      `${safeText(document.tipoDocumento)} - ${formatDate(document.fechaDocumento)}`,
      safeText(document.condicionPago),
      document.estaVencido ? `${document.diasVencimiento || 0} días` : 'Al día',
      `${formatCurrency(document.totalDocumento)} ${safeText(document.moneda)}`
    ];
  });

  autoTable(doc, {
    startY: 85,
    head: [["#", "N° Documento", "Tipo - Fecha", "Condición Pago", "Vencimiento", "Total"]],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'left',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [52, 58, 64],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: 'center',
      fontSize: 8
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },       // # 
      1: { cellWidth: 40 },                         // N° Documento
      2: { cellWidth: 50 },                         // Tipo - Fecha
      3: { cellWidth: 40 },                         // Condición Pago
      4: { halign: 'center', cellWidth: 30 },       // Vencimiento
      5: { halign: 'right', cellWidth: 37 }         // Total
    },
    
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
    showHead: 'everyPage',
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    },
    
    didParseCell: function(data) {
      const document = documents[data.row.index];
      
      // Sombrear toda la fila en rojo si el documento está vencido
      if (document && document.estaVencido) {
        data.cell.styles.fillColor = [255, 235, 238]; // Fondo rojo claro para toda la fila
        data.cell.styles.textColor = [139, 0, 0]; // Texto rojo oscuro
        
        // Resaltar especialmente el vencimiento
        if (data.column.index === 4) { // Columna Vencimiento
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 53, 69]; // Rojo más intenso
          data.cell.styles.textColor = [255, 255, 255]; // Texto blanco
        }
      }
    }
  });
};

/**
 * Añade un resumen estadístico al final del documento
 * @param {jsPDF} doc - Instancia del documento PDF
 * @param {Object} debt - Datos de la deuda
 */
const addSummary = (doc, debt) => {
  const finalY = doc.lastAutoTable?.finalY || 150;
  const startY = finalY + 15;
  
  // Título del resumen
  doc.setFont("helvetica", "bold")
     .setFontSize(12)
     .text("RESUMEN EJECUTIVO", 14, startY);

  // Línea separadora
  doc.setDrawColor(52, 58, 64)
     .setLineWidth(0.5)
     .line(14, startY + 3, 80, startY + 3);

  const summaryY = startY + 10;
  doc.setFontSize(9);

  // Calcular estadísticas
  const documents = debt.documentos || [];
  const vencidos = documents.filter(doc => doc.estaVencido);
  const porVencer = documents.filter(doc => !doc.estaVencido);
  
  const totalVencido = vencidos.reduce((sum, doc) => sum + (doc.totalDocumento || 0), 0);
  const totalPorVencer = porVencer.reduce((sum, doc) => sum + (doc.totalDocumento || 0), 0);

  // Información del resumen en dos columnas
  const leftSummary = [
    { label: "Documentos Vencidos:", value: `${vencidos.length} de ${documents.length}` },
    { label: "Monto Vencido:", value: formatCurrency(totalVencido, debt.monedaPrincipal) }
  ];

  const rightSummary = [
    { label: "Estado General:", value: getEstadoInfo(debt.estado).text },
    { label: "Documentos por Vencer:", value: `${porVencer.length}` },
    { label: "Monto por Vencer:", value: formatCurrency(totalPorVencer, debt.monedaPrincipal) }
  ];

  // Renderizar resumen izquierdo
  leftSummary.forEach((item, index) => {
    const y = summaryY + (index * 6);
    doc.setFont("helvetica", "bold").text(item.label, 14, y);
    doc.setFont("helvetica", "normal").text(item.value, 55, y);
  });

  // Renderizar resumen derecho
  rightSummary.forEach((item, index) => {
    const y = summaryY + (index * 6);
    doc.setFont("helvetica", "bold").text(item.label, 110, y);
    doc.setFont("helvetica", "normal").text(item.value, 150, y);
  });
};

/**
 * Añade el pie de página
 * @param {jsPDF} doc - Instancia del documento PDF
 */
const addFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Línea separadora
    doc.setDrawColor(200, 200, 200)
       .setLineWidth(0.3)
       .line(14, 280, 196, 280);
    
    // Información del pie
    doc.setFont("helvetica", "normal")
       .setFontSize(8)
       .setTextColor(100, 100, 100)
       .text(`Generado el: ${new Date().toLocaleString('es-PE')}`, 14, 285)
       .text(`Página ${i} de ${pageCount}`, 196, 285, { align: 'right' });
  }
};

/**
 * Función mejorada para generar el PDF con opciones de tabla
 * @param {Object} debt - Datos de la deuda
 * @param {Object} options - Opciones adicionales
 */
export const generateReceivablePDF = async (debt, options = {}) => {
  // Validación de datos
  if (!debt) {
    console.error("No se proporcionaron datos para generar el PDF");
    return;
  }

  const {
    filename = `Cuenta-Por-Cobrar-${safeText(debt.ruc, "Sin-RUC")}.pdf`,
    logoOptions = {},   
    autoDownload = true,
    compactTable = false // Nueva opción para tabla compacta
  } = options;

  try {
    // Crear documento PDF
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    });

    // Añadir elementos al PDF
    await addLogo(doc, logoOptions);
    addHeader(doc, debt);
    addClientInfo(doc, debt);
    
    // Usar tabla compacta o completa según la opción
    if (compactTable) {
      addCompactDocumentsTable(doc, debt);
    } else {
      addDocumentsTable(doc, debt);
    }
    
    addSummary(doc, debt);
    addFooter(doc);

    // Descargar o devolver el PDF
    if (autoDownload) {
      doc.save(filename);
    } else {
      return doc;
    }

  } catch (error) {
    console.error("Error al generar el PDF:", error);
    throw new Error(`Error al generar el PDF: ${error.message}`);
  }
};

/**
 * Previsualiza el PDF en una nueva ventana
 * @param {Object} debt - Datos de la deuda
 * @param {Object} options - Opciones adicionales
 */
export const previewReceivablePDF = async (debt, options = {}) => {
  try {
    const doc = await generateReceivablePDF(debt, { ...options, autoDownload: false });
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const previewWindow = window.open(pdfUrl, '_blank');
    if (!previewWindow) {
      console.warn("No se pudo abrir la ventana de previsualización");
      // Fallback: descargar el archivo
      doc.save(options.filename || `Cuenta-Por-Cobrar-${safeText(debt.ruc, "Sin-RUC")}.pdf`);
    }
  } catch (error) {
    console.error("Error al previsualizar el PDF:", error);
    throw error;
  }
};