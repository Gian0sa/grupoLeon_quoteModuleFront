import jsPDF from "jspdf";
import { format } from "date-fns";

// Hoja "Control de Despacho - Lima" en A4 vertical: un bloque rosado del tamaño del talonario (no toda la
// hoja), dibujado con jsPDF (texto vectorial). Antes se hacía una captura del HTML con html2canvas y el texto
// se desalineaba de los renglones; ahora la lista de bultos va en UN solo bloque y sin renglones.

const LOGO_URL = "/assets/LogoAutopartes.png";

const ROSA_PAPEL = [255, 216, 226];
const VERDE_LINEA = [27, 67, 50];
const VERDE_TEXTO = [17, 63, 40];
const VERDE_MARCA = [14, 107, 56];
const TINTA_AZUL = [0, 86, 179];
const TINTA = [34, 34, 34];
const GRIS = [130, 130, 130];

const MARGEN = 10; // margen de la hoja
const PAD = 6; // relleno dentro del bloque rosado
const PIE = 10; // espacio reservado para el pie de página
const H_ENCABEZADO_TABLA = 8;
const LINEA_ALTO = 5;
const H_TABLA_MIN = 55; // alto mínimo de la lista, como el talonario
const H_BLOQUE_FINAL = 34; // totales + embaladores

async function cargarLogo() {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Texto en una línea: reduce la letra hasta `minSize` y, si aún no entra, lo corta con "…" */
function textoAjustado(doc, texto, x, y, anchoMax, size, minSize = 7.5) {
  let valor = String(texto ?? "").trim();
  if (!valor) return;
  let s = size;
  doc.setFontSize(s);
  while (doc.getTextWidth(valor) > anchoMax && s > minSize) {
    s -= 0.5;
    doc.setFontSize(s);
  }
  if (doc.getTextWidth(valor) > anchoMax) {
    while (valor.length > 1 && doc.getTextWidth(`${valor}…`) > anchoMax) valor = valor.slice(0, -1);
    valor = `${valor}…`;
  }
  doc.text(valor, x, y);
}

/** "ETIQUETA: ........" con el valor escrito sobre la línea punteada */
function campoPunteado(doc, { x, y, w, etiqueta, valor, color = TINTA }) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...VERDE_TEXTO);
  doc.text(etiqueta, x, y);
  const xLinea = x + doc.getTextWidth(etiqueta) + 1.5;
  const wLinea = x + w - xLinea;

  doc.setDrawColor(...VERDE_LINEA);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([0.4, 0.7], 0);
  doc.line(xLinea, y + 0.8, xLinea + wLinea, y + 0.8);
  doc.setLineDashPattern([], 0);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...color);
  textoAjustado(doc, valor, xLinea + 1.5, y - 0.4, wLinea - 2.5, 10);
}

function dibujarCheck(doc, x, y) {
  doc.setDrawColor(...VERDE_MARCA);
  doc.setLineWidth(0.5);
  doc.lines(
    [
      [1.1, 1.2],
      [2.6, -3.2],
    ],
    x,
    y - 1.2
  );
}

/** Bloque rosado con borde, del alto que necesite el contenido */
function bloqueRosado(doc, yTop, yBottom) {
  const w = doc.internal.pageSize.getWidth() - MARGEN * 2;
  doc.setFillColor(...ROSA_PAPEL);
  doc.setDrawColor(...VERDE_LINEA);
  doc.setLineWidth(0.6);
  doc.rect(MARGEN, yTop, w, yBottom - yTop, "FD");
}

function cabecera(doc, x, y, w, logo) {
  const hLogo = 9;
  if (logo) {
    const { width, height } = doc.getImageProperties(logo);
    // "FAST": comprime el PNG (sin esto el PDF pesa ~400 KB solo por el logo)
    doc.addImage(logo, "PNG", x, y, (hLogo * width) / height, hLogo, "logo", "FAST");
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...VERDE_MARCA);
    doc.text("Autopartes s.a.", x, y + 7.5);
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...VERDE_TEXTO);
  doc.setFontSize(12.5);
  doc.text("CONTROL DE DESPACHO - LIMA", x + w * 0.62, y + 6.5, { align: "center" });
  doc.setFontSize(16);
  doc.text("A1", x + w, y + 7, { align: "right" });
}

function encabezadoTabla(doc, x, y, w, wBulto) {
  doc.setDrawColor(...VERDE_LINEA);
  doc.setLineWidth(0.4);
  doc.line(x, y + H_ENCABEZADO_TABLA, x + w, y + H_ENCABEZADO_TABLA);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...VERDE_TEXTO);
  doc.text("BULTO", x + wBulto / 2, y + 5.3, { align: "center" });
  doc.text("CONTENIDO", x + wBulto + 3, y + 5.3);
}

/** Marco de la lista: borde + separación BULTO | CONTENIDO, sin renglones horizontales */
function marcoTabla(doc, x, yInicio, yFin, w, wBulto) {
  doc.setDrawColor(...VERDE_LINEA);
  doc.setLineWidth(0.4);
  doc.rect(x, yInicio, w, yFin - yInicio);
  doc.line(x + wBulto, yInicio, x + wBulto, yFin);
}

function pieDePagina(doc, docNum) {
  const total = doc.getNumberOfPages();
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const generado = format(new Date(), "dd/MM/yyyy HH:mm");
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRIS);
    doc.text(`Entrega SAP #${docNum} · Generado el ${generado}`, MARGEN, alto - 5);
    doc.text(`Página ${i} de ${total}`, ancho - MARGEN, alto - 5, { align: "right" });
  }
}

/**
 * Genera el PDF de Control de Despacho y lo descarga.
 * @param {object} p
 * @param {object} p.deliveryData Guía de salida
 * @param {string} [p.numerosGuia] Guías del packing ("00021535, 00021536"); por defecto la de deliveryData
 * @param {Array}  p.cajas        Bultos con sus ítems ({ bultoNumero, pesoKg, items: [{ codigoArticulo, cantidad }] })
 * @param {string} [p.logoDataUrl] Logo ya cargado (si no se pasa, se descarga de /assets)
 */
export async function descargarControlDespachoPdf({
  deliveryData,
  numerosGuia,
  cajas = [],
  pesoKg,
  responsablePacking,
  vehiculoPlaca,
  choferNombre,
  codigoFactura,
  logoDataUrl,
}) {
  const logo = logoDataUrl ?? (await cargarLogo());
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const alto = doc.internal.pageSize.getHeight();
  const x = MARGEN + PAD;
  const w = doc.internal.pageSize.getWidth() - (MARGEN + PAD) * 2;
  const docNum = deliveryData.docNumEntrega;
  const wBulto = 16;
  const xContenido = x + wBulto + 3;
  const wContenido = w - wBulto - 12; // deja sitio para el ✓
  const yFondoPagina = alto - PIE - 2; // hasta dónde puede llegar el bloque rosado

  // 1) Medir las filas de bultos para saber qué alto tendrá cada bloque
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  const filas = (cajas.length ? cajas : [null]).map((caja, idx) => {
    const contenido = caja
      ? (caja.items?.length
          ? caja.items.map((it) => `${it.codigoArticulo} (${it.cantidad})`).join(" - ")
          : "Bulto sin ítems") + (caja.pesoKg ? `  [${caja.pesoKg} Kg]` : "")
      : "No hay bultos registrados";
    const lineas = doc.splitTextToSize(contenido, wContenido);
    return { caja, numero: caja ? String(caja.bultoNumero || idx + 1) : "", lineas, h: lineas.length * LINEA_ALTO + 2 };
  });

  // 2) Página 1: cabecera + datos generales
  const yTop = MARGEN;
  const yTabla1 = yTop + PAD + 38;
  const paginas = [{ yTop, yTabla: yTabla1, filas: [] }];
  let yFila = yTabla1 + H_ENCABEZADO_TABLA + 6;
  for (const fila of filas) {
    if (yFila + fila.h > yFondoPagina - PAD) {
      const yTablaN = MARGEN + PAD;
      paginas.push({ yTop: MARGEN, yTabla: yTablaN, filas: [] });
      yFila = yTablaN + H_ENCABEZADO_TABLA + 6;
    }
    paginas[paginas.length - 1].filas.push({ ...fila, y: yFila });
    yFila += fila.h;
  }

  // Alto de la lista en la última página (mínimo como el talonario) y espacio para totales/embaladores
  const ultima = paginas[paginas.length - 1];
  let yFinTablaUltima = Math.max(yFila, ultima.yTabla + H_TABLA_MIN);
  let paginaTotales = ultima;
  if (yFinTablaUltima + 4 + H_BLOQUE_FINAL + PAD > yFondoPagina) {
    yFinTablaUltima = Math.min(yFila + 2, yFondoPagina - PAD);
    paginaTotales = { yTop: MARGEN, soloTotales: true };
    paginas.push(paginaTotales);
  }

  // 3) Dibujar
  paginas.forEach((pag, i) => {
    if (i > 0) doc.addPage();
    const esUltimaTabla = pag === ultima;
    const yFinTabla = pag.soloTotales ? null : esUltimaTabla ? yFinTablaUltima : yFondoPagina - PAD;
    const yTotales = pag === paginaTotales ? (pag.soloTotales ? MARGEN + PAD : yFinTabla + 4) : null;
    const yBottom = yTotales !== null ? yTotales + H_BLOQUE_FINAL : yFondoPagina;
    bloqueRosado(doc, pag.yTop, Math.min(yBottom + (yTotales !== null ? PAD - 4 : 0), yFondoPagina));

    if (i === 0) {
      cabecera(doc, x, yTop + PAD, w, logo);
      const fecha = deliveryData.fechaEmision ? format(new Date(deliveryData.fechaEmision), "dd / MM / yy") : "";
      const w1 = w * 0.44;
      const w2 = w * 0.24;
      const x2 = x + w1 + 4;
      const x3 = x2 + w2 + 4;
      const w3 = x + w - x3;
      let yc = yTop + PAD + 18;
      campoPunteado(doc, { etiqueta: "GUIA Nº:", valor: numerosGuia || deliveryData.numeroGuiaInterna || docNum, x, y: yc, w: w1, color: TINTA_AZUL });
      campoPunteado(doc, { etiqueta: "FECHA:", valor: fecha, x: x2, y: yc, w: w2 });
      campoPunteado(doc, { etiqueta: "PLACA:", valor: vehiculoPlaca, x: x3, y: yc, w: w3, color: TINTA_AZUL });
      yc += 7.5;
      campoPunteado(doc, { etiqueta: "FACTURA Nº:", valor: codigoFactura, x, y: yc, w: w1 });
      campoPunteado(doc, { etiqueta: "B/V Nº:", valor: "", x: x2, y: yc, w: w2 });
      campoPunteado(doc, { etiqueta: "CONDUCTOR:", valor: choferNombre, x: x3, y: yc, w: w3 });
      yc += 7.5;
      const wCliente = w * 0.55;
      campoPunteado(doc, { etiqueta: "CLIENTE:", valor: deliveryData.clienteNombre, x, y: yc, w: wCliente });
      campoPunteado(doc, {
        etiqueta: "AG. TRANSPORTE:",
        valor: deliveryData.transportistaNombre || "AUTOPARTES S.A.",
        x: x + wCliente + 4,
        y: yc,
        w: w - wCliente - 4,
      });
    }

    if (!pag.soloTotales) {
      encabezadoTabla(doc, x, pag.yTabla, w, wBulto);
      for (const fila of pag.filas) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...VERDE_TEXTO);
        doc.text(fila.numero, x + wBulto / 2, fila.y, { align: "center" });
        doc.setTextColor(...TINTA);
        doc.text(fila.lineas, xContenido, fila.y, { lineHeightFactor: LINEA_ALTO / (9.5 * 0.3528) });
        if (fila.caja?.items?.length) {
          const ultimaLinea = fila.lineas[fila.lineas.length - 1];
          dibujarCheck(doc, xContenido + doc.getTextWidth(ultimaLinea) + 3, fila.y + (fila.lineas.length - 1) * LINEA_ALTO);
        }
      }
      marcoTabla(doc, x, pag.yTabla, yFinTabla, w, wBulto);
    }

    if (yTotales !== null) {
      // Totales (izquierda) y recuadro EMBALADORES (derecha)
      const wTotales = w * 0.52;
      campoPunteado(doc, { etiqueta: "TOTAL Nº BULTOS", valor: String(cajas.length).padStart(2, "0"), x, y: yTotales + 12, w: wTotales });
      campoPunteado(doc, { etiqueta: "KILOS", valor: pesoKg ? `${pesoKg} Kg` : "", x, y: yTotales + 22, w: wTotales });

      const wEmb = w * 0.38;
      const xEmb = x + w - wEmb;
      const hEmb = 24;
      const yEmb = yTotales + 2;
      doc.setDrawColor(...VERDE_LINEA);
      doc.setLineWidth(0.4);
      doc.rect(xEmb, yEmb, wEmb, hEmb);
      doc.line(xEmb, yEmb + 6.5, xEmb + wEmb, yEmb + 6.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...VERDE_TEXTO);
      doc.text("EMBALADORES", xEmb + wEmb / 2, yEmb + 4.6, { align: "center" });
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(9.5);
      doc.setTextColor(...VERDE_MARCA);
      const lineasEmb = doc.splitTextToSize(responsablePacking || "CONTROL ALMACÉN", wEmb - 6).slice(0, 3);
      doc.text(lineasEmb, xEmb + wEmb / 2, yEmb + 6.5 + (hEmb - 6.5) / 2 + 1.3 - (lineasEmb.length - 1) * 2, {
        align: "center",
      });
    }
  });

  pieDePagina(doc, docNum);

  const numDoc = deliveryData.numeroGuiaInterna || docNum || "despacho";
  doc.save(`Control_Despacho_${numDoc}.pdf`);
}
