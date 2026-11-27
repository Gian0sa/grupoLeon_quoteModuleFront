import React from "react";
import {
  calculateQuoteTotals,
  resolveOfficialDocumentTotals,
  parseCalendarDateParts,
} from "../../../shared/utils/quoteCalculator";
import { reconcileLineTotalsWithSap } from "../utils/sapLineReconciliation";
import {
  formatDeliveryForm,
  formatTransportName,
  formatTransportAddress,
  formatDeliveryPoint,
  formatPaymentTerms,
  isPickupInStoreForm,
  formatCheckBank,
  SALES_PERSONS_MAP
} from "../../../shared/utils/quoteLogisticsFormatters";

const money = (val) => {
  const num = Number(val || 0);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const extractProducts = (q) => {
  if (!q) return [];
  if (Array.isArray(q.products) && q.products.length > 0) return q.products;
  if (Array.isArray(q.items) && q.items.length > 0) return q.items;
  if (Array.isArray(q.lines) && q.lines.length > 0) return q.lines;
  if (Array.isArray(q.DocumentLines) && q.DocumentLines.length > 0) return q.DocumentLines;
  if (q.totals && Array.isArray(q.totals.normalizedProducts) && q.totals.normalizedProducts.length > 0) return q.totals.normalizedProducts;
  if (q.totals && Array.isArray(q.totals.products) && q.totals.products.length > 0) return q.totals.products;
  if (typeof q.products === "string") {
    try { const p = JSON.parse(q.products); if (Array.isArray(p)) return p; } catch (e) {}
  }
  if (typeof q.items === "string") {
    try { const p = JSON.parse(q.items); if (Array.isArray(p)) return p; } catch (e) {}
  }
  return [];
};

const normalizeItem = (item, isSol = false, tc = 1) => {
  if (!item) return null;
  const qty = Math.max(1, Number(item.quantity ?? item.Quantity ?? item.Cant ?? item.cant ?? 1));

  // 1. Total de línea consolidado (si ya viene calculado desde SAP o desde la orden emitida)
  const explicitLineTotal = Number(item.lineTotal ?? item.LineTotal ?? item.totalPrice ?? item.subtotal ?? 0);

  // 2. Descuentos: evitar descuentos negativos en la fórmula de precio unitario
  // (en SAP un descuento negativo es un ajuste contable interno, no debe multiplicar el precio)
  const rawSapDisc = Number(item.discount ?? item.Discount ?? item.sapDiscount ?? 0);
  const rawPromoDisc = Number(item.promoDiscount ?? item.PromoDiscount ?? 0);
  const rawAddDisc = Number(item.lineDiscount ?? item.LineDiscount ?? item.addDiscount ?? 0);
  const sapDisc = Math.max(0, Math.min(100, isNaN(rawSapDisc) ? 0 : rawSapDisc));
  const promoDisc = Math.max(0, Math.min(100, isNaN(rawPromoDisc) ? 0 : rawPromoDisc));
  const addDisc = Math.max(0, Math.min(100, isNaN(rawAddDisc) ? 0 : rawAddDisc));

  const isOutOfStock = Boolean(
    item.isAgotado === true ||
    (item.stockChecked && typeof item.stock === "number" && item.stock <= 0) ||
    (item.stock !== undefined && item.stock !== null && Number(item.stock) === 0)
  );

  let finalUnitPrice = 0;
  let lineTotalNum = 0;

  if (isOutOfStock) {
    finalUnitPrice = 0;
    lineTotalNum = 0;
  } else if (item.discountedUnitPrice && Number(item.discountedUnitPrice) > 0) {
    finalUnitPrice = Number(Number(item.discountedUnitPrice).toFixed(2));
    lineTotalNum = item.lineTotal && Number(item.lineTotal) > 0
      ? Number(Number(item.lineTotal).toFixed(2))
      : Number((qty * finalUnitPrice).toFixed(2));
  } else if (item.lineTotal && Number(item.lineTotal) > 0 && !item.LineTotal && !item.RowTotalFC) {
    lineTotalNum = Number(Number(item.lineTotal).toFixed(2));
    finalUnitPrice = Number((lineTotalNum / qty).toFixed(2));
  } else if (item.RowTotalFC && Number(item.RowTotalFC) > 0) {
    lineTotalNum = Number(Number(item.RowTotalFC).toFixed(2));
    finalUnitPrice = Number((lineTotalNum / qty).toFixed(2));
  } else {
    const listPrice = Number(item.price ?? item.unitPrice ?? item.Price ?? item.UnitPrice ?? item.importe ?? 0);
    const totalDisc = Math.min(100.0, Math.max(0, Number(item.discountPercent ?? (sapDisc + promoDisc + addDisc))));
    finalUnitPrice = Number((listPrice * (1 - totalDisc / 100)).toFixed(2));
    lineTotalNum = Number((qty * finalUnitPrice).toFixed(2));
  }

  // 💱 Si el documento oficial es en Soles (PEN), convertir los montos unitarios y de línea con la tasa de cambio (TC)
  if (isSol && tc > 0 && !isOutOfStock) {
    finalUnitPrice = Number((finalUnitPrice * tc).toFixed(2));
    lineTotalNum = Number((lineTotalNum * tc).toFixed(2));
  }

  const isTaxOnly = !isOutOfStock && Boolean(
    item.isTaxOnly === true ||
    item.taxOnly === true ||
    item.taxOnly === "tYES" ||
    item.TaxOnly === "tYES" ||
    item.taxOnly === "Y" ||
    item.TaxOnly === "Y"
  );
  if (isTaxOnly) {
    lineTotalNum = 0;
  }

  const code = item.code || item.itemCode || item.ItemCode || item.productCode || item.id || "";
  let baseName = item.name || item.productName || item.description || item.Description || item.ItemDescription || item.ItemName || item.Dscription || "";
  if (!baseName) {
    baseName = item.sigla || code || "Artículo";
  }

  // Ocultar porcentajes de descuento en el documento de cara al cliente (solo indicar Transferencia Gratuita si aplica)
  const discTag = isTaxOnly ? " (TRANSFERENCIA GRATUITA - SOLO IGV)" : "";

  return {
    qty: isNaN(qty) || qty < 1 ? 1 : qty,
    code,
    baseName,
    discTag,
    desc: `${baseName}${discTag}`.trim(),
    finalUnitPrice,
    lineTotalNum,
    isOutOfStock,
    isTaxOnly,
  };
};

const getItemDescStyle = (text) => {
  const len = (text || "").length;
  if (len > 55) return { fontSize: "8px", letterSpacing: "normal" };
  if (len > 40) return { fontSize: "8.5px", letterSpacing: "normal" };
  return { fontSize: "9px", letterSpacing: "normal" };
};

const getPriceStyle = (priceStr) => {
  const len = (priceStr || "").length;
  if (len > 9) return { fontSize: "7px", letterSpacing: "-0.3px" };
  if (len > 8) return { fontSize: "7.5px", letterSpacing: "-0.15px" };
  if (len > 7) return { fontSize: "8px" };
  return { fontSize: "8.5px" };
};

const TalonarioCheckBox = ({ checked }) => (
  <span
    style={{
      width: "15px",
      height: "15px",
      border: "1.5px solid #000",
      background: "#ffffff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      boxSizing: "border-box",
      flexShrink: 0,
      padding: 0,
      lineHeight: 0,
    }}
  >
    {checked ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="9"
        height="9"
        viewBox="0 0 10 10"
        style={{ display: "block", width: "9px", height: "9px" }}
      >
        <path
          d="M1.6 1.6L8.4 8.4M8.4 1.6L1.6 8.4"
          stroke="#000000"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </svg>
    ) : null}
  </span>
);

const resolveSellerCode = (q) => {
  if (!q) return "";
  const direct =
    q.SlpCode ||
    q.salesPersonCode ||
    q.SalesPersonCode ||
    q.SalesEmployeeCode ||
    q.totals?.SlpCode ||
    q.totals?.salesPersonCode ||
    q.totals?.salesEmployeeCode ||
    q.sellerCode ||
    q.slpCode;

  if (direct !== undefined && direct !== null && String(direct).trim() !== "" && String(direct) !== "null" && String(direct) !== "-1") {
    return String(direct).trim();
  }

  const nameToSearch = String(q.sellerName || q.createdByUsername || q.SlpName || q.salesPersonName || "").trim();
  if (nameToSearch) {
    const prefixMatch = nameToSearch.match(/^(\d{2,3})\./);
    if (prefixMatch) return prefixMatch[1];

    const clean = nameToSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const [id, info] of Object.entries(SALES_PERSONS_MAP)) {
      const cleanInfoName = info.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (clean.includes(cleanInfoName) || cleanInfoName.includes(clean)) {
        return id;
      }
    }
  }

  if (q.userId && Number(q.userId) > 0) {
    return String(q.userId);
  }

  return "";
};

const resolveSellerFullName = (q) => {
  if (!q) return "";
  let name =
    q.sellerName ||
    q.salesPersonName ||
    q.SlpName ||
    q.SalesPersonName ||
    q.totals?.sellerName ||
    q.seller?.name ||
    (typeof q.seller === "string" ? q.seller : "") ||
    "";

  if (name && typeof name === "string") {
    const sName = name.trim();
    const upper = sName.toUpperCase();
    const isGeneric =
      upper.includes("NINGÚN EMPLEADO") ||
      upper.includes("NINGUN EMPLEADO") ||
      upper.includes("NO ASIGNADO") ||
      upper === "-1" ||
      upper === "0" ||
      upper === "NULL" ||
      upper === "UNDEFINED" ||
      upper === "VENDEDOR AUTORIZADO" ||
      upper === "VENDEDOR" ||
      upper === "VENDEDOR SAP" ||
      upper === "SIN VENDEDOR";

    if (!isGeneric) {
      const cleanName = sName.replace(/^\d{1,4}\s*[\.\-]?\s*/, "").trim();
      if (cleanName.length >= 2 && isNaN(Number(cleanName))) return cleanName;
      if (sName.length >= 2 && isNaN(Number(sName))) return sName;
    }
  }

  const code = resolveSellerCode(q);
  if (code) {
    if (SALES_PERSONS_MAP[code]) {
      return SALES_PERSONS_MAP[code].name;
    }
    const cleanCode = String(code).replace(/^0+/, "");
    const byPrefix = Object.values(SALES_PERSONS_MAP).find(
      (sp) => sp.prefix && String(sp.prefix).replace(/^0+/, "") === cleanCode
    );
    if (byPrefix) {
      return byPrefix.name;
    }
  }

  if (q.createdByUsername) {
    return q.createdByUsername;
  }
  return (code && isNaN(Number(code)) ? code : "") || "Asesor Comercial";
};

export const QuotePdfDocument = React.forwardRef(({ quote, isPrintMode = false }, ref) => {
  if (!quote) return null;

  const isEmittedToSap = Boolean(
    (quote.sapDocNum && String(quote.sapDocNum).trim() !== "") ||
    (quote.DocNum && !String(quote.DocNum).startsWith("COT-")) ||
    (quote.docNum && !String(quote.docNum).startsWith("COT-")) ||
    quote.status === "EMITIDO" ||
    quote.status === "EMITIDO_SAP" ||
    quote.status === "APROBADO_SAP" ||
    quote.isSyncedToSap === true
  );

  const documentTitle = isEmittedToSap ? "ORDEN DE VENTA" : "COTIZACIÓN";

  const docNumberDisplay = isEmittedToSap
    ? (quote.sapDocNum || quote.DocNum || quote.docNum || quote.docNumber || "OV-PENDIENTE")
    : (quote.docNumber || (quote.id ? `COT-${String(quote.id).padStart(5, "0")}` : "COT-PENDIENTE"));

  const client = quote.client || {};
  const products = extractProducts(quote);
  const tcVal = Number(quote.totals?.tc) || 3.76;

  // Cliente y Despacho
  const clientCardCode = client.CardCode || quote.clientDocument || quote.clientRuc || "CL000000";
  const clientName = client.CardName || client.name || quote.clientName || "CLIENTE NO REGISTRADO";
  const clientDocDigits = String(client.LicTradNum || client.FederalTaxID || quote.clientRuc || quote.clientDocument || clientCardCode || "").replace(/\D/g, "");
  const isJuridicaClient = clientDocDigits.startsWith("20") || /\b(E\.?I\.?R\.?L\.?|S\.?A\.?C\.?|S\.?R\.?L\.?|S\.?A\.?|S\.?C\.?R\.?L\.?)\b/i.test(clientName);
  const clientRuc = clientDocDigits || (client.LicTradNum || client.FederalTaxID || quote.clientRuc || quote.clientDocument || "-").replace(/^CL/i, '');
  const clientAddress = client.Address || client.address || quote.clientAddress || "-";

  // Condiciones Comerciales Normalizadas
  const rawDocType = String(quote.documentType || quote.tipoComprobante || quote.docTypeVenta || "").toUpperCase().trim();
  const docType = rawDocType || (isJuridicaClient ? "FACTURA" : "BOLETA");
  const saleCond = String(quote.saleCondition || quote.condicionVenta || quote.condicionPago || "CONTADO").toUpperCase();
  const isLetraDoc = Boolean(quote.isLetra || quote.hasLetra || quote.letra);
  const creditTermDoc = quote.creditTerm || quote.plazo || "";

  const isContado = saleCond === "CONTADO";
  const isCredito = saleCond === "CREDITO";
  const isBoleta = docType === "BOLETA" && !isJuridicaClient;
  const isFactura = docType === "FACTURA" || isJuridicaClient;

  // Fecha (sin desfase UTC-5 en Perú)
  const { day, monthName, fullYear, shortYear } = parseCalendarDateParts(quote.docDate || quote.DocDate);

  // Parseo y formateo inteligente de Transporte y Forma de Entrega
  const rawDelivForm = quote.selectedDeliveryForm || quote.deliveryForm || quote.totals?.deliveryForm || quote.totals?.selectedDeliveryForm;
  const rawTransport = quote.selectedTransport || quote.transport || quote.U_TQC_TRANSPOR || quote.totals?.transport || quote.totals?.selectedTransport;
  const transportName = formatTransportName(rawTransport, rawDelivForm, { includeAddress: false });
  const rawTransportDir = quote.transportDirection || quote.totals?.transportDirection;
  const transportAddress = formatTransportAddress(rawTransport, rawDelivForm, rawTransportDir);

  // Punto de Llegada
  const rawPoint = quote.selectedPoint || quote.deliveryPoint;
  const pointOfArrival = formatDeliveryPoint(rawPoint, clientAddress);

  const opNumberVal = quote.opNum || quote.operationNumber || "";
  // BCQ: Banco del Cheque (aplica únicamente si se paga con cheque; las cuentas de recaudo van en facturación/SAP posterior)
  const bcqVal = formatCheckBank(quote.checkBank || quote.bancoCheque);
  const sellerDisplayName = quote.sellerName || quote.salesPersonName || "Asesor Comercial";

  // Moneda del Documento (Soles o Dólares)
  const rawDocCur = String(
    quote.DocCurrency ||
    quote.currency ||
    quote.totals?.currency ||
    quote.docCurrency ||
    ""
  ).toUpperCase();

  const isSol = rawDocCur === "SOL" || rawDocCur === "PEN" || rawDocCur === "SOLES" || rawDocCur === "S/.";
  const currencySymbol = isSol ? "S/ " : "$";

  // Totales y Normalización usando calculadora unificada (sincronizada 100% con la vista y SAP)
  const calcRes = calculateQuoteTotals(products, tcVal);
  const normalizedList = calcRes.normalizedProducts && calcRes.normalizedProducts.length > 0
    ? calcRes.normalizedProducts
    : products;

  const {
    subtotalDocNum,
    igvDocNum,
    documentTotalNum,
    hasTaxOnly,
  } = resolveOfficialDocumentTotals(quote, calcRes, {
    isSol,
    tc: tcVal,
    isEmittedToSap,
  });

  // Grilla Doble de 30 renglones normalizados y reconciliados al centavo contra subtotalDocNum
  const normalizedPdfItems = normalizedList.map((raw) => normalizeItem(raw, isSol, tcVal));
  const billableIndices = [];
  const billableEntries = [];
  normalizedPdfItems.forEach((it, idx) => {
    if (it && !it.isOutOfStock && !it.isTaxOnly) {
      billableIndices.push(idx);
      billableEntries.push({ rawLineTotal: it.lineTotalNum });
    }
  });
  if (billableEntries.length > 0 && subtotalDocNum > 0 && !hasTaxOnly) {
    const rawSum = billableEntries.reduce((acc, e) => acc + e.rawLineTotal, 0);
    if (Math.abs(rawSum - subtotalDocNum) <= 0.15) {
      const reconciled = reconcileLineTotalsWithSap(billableEntries, subtotalDocNum);
      billableIndices.forEach((origIdx, rIdx) => {
        if (typeof reconciled[rIdx] === "number" && !isNaN(reconciled[rIdx])) {
          normalizedPdfItems[origIdx] = {
            ...normalizedPdfItems[origIdx],
            lineTotalNum: reconciled[rIdx],
          };
        }
      });
    }
  }

  const col1Items = [];
  const col2Items = [];
  for (let i = 0; i < 15; i++) {
    col1Items.push(normalizedPdfItems[i] || null);
  }
  for (let i = 15; i < 30; i++) {
    col2Items.push(normalizedPdfItems[i] || null);
  }

  return (
    <div
      ref={ref}
      id="printable-autopartes-document"
      style={{
        width: "800px",
        minWidth: "800px",
        maxWidth: "800px",
        minHeight: "1120px",
        backgroundColor: "#ffffff",
        padding: "24px 28px",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#000000",
        boxSizing: "border-box",
        margin: "0 auto",
      }}
    >
      {/* 1. CABECERA: MEMBRETE AUTOPARTES S.A. (IZQUIERDA) + MARCAS DISTRIBUIDAS (DERECHA) */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px" }}>
        <tbody>
          <tr>
            <td style={{ width: "230px", verticalAlign: "top" }}>
              <img
                src="/assets/logo.svg"
                alt="Autopartes S.A."
                style={{ height: "24px", objectFit: "contain", marginBottom: "4px", display: "block" }}
              />
              <div style={{ fontSize: "7px", color: "#166534", fontWeight: "bold", lineHeight: "1.25" }}>
                <div>Av. De las Torres Nº 261, Urb. Ind. La Aurora,</div>
                <div>Ate - Lima - Perú</div>
                <div>Central: (01) 324-2600</div>
                <div>ventas@autopartes.pe</div>
                <div>www.autopartes.pe</div>
              </div>
            </td>
            <td style={{ textAlign: "right", verticalAlign: "middle" }}>
              <img
                src="/assets/talonario_logos_oficial.png"
                alt="Marcas Distribuidas"
                style={{ maxHeight: "78px", maxWidth: "100%", display: "inline-block", objectFit: "contain" }}
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* 2. TÍTULO Y NUMERACIÓN (ORDEN DE VENTA / COTIZACIÓN) */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", marginTop: "2px" }}>
        <tbody>
          <tr>
            <td style={{ width: "130px" }}></td>
            <td
              style={{
                textAlign: "center",
                color: "#0f5132",
                fontSize: "20px",
                fontWeight: "900",
                fontFamily: "Georgia, 'Times New Roman', serif",
                letterSpacing: "3px",
                textTransform: "uppercase",
              }}
            >
              {documentTitle}
            </td>
            <td
              style={{
                width: "150px",
                textAlign: "right",
                color: "#b91c1c",
                fontWeight: "900",
                fontSize: "14px",
                fontFamily: "'Courier New', Courier, monospace",
              }}
            >
              Nº {docNumberDisplay}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 3. FECHA Y CÓDIGO DE CLIENTE */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px", fontSize: "10px", fontWeight: "bold" }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "middle" }}>
              <span style={{ borderBottom: "1px dotted #000", padding: "0 6px", display: "inline-block", minWidth: "22px", textAlign: "center", fontWeight: "900" }}>{day}</span> de{" "}
              <span style={{ borderBottom: "1px dotted #000", padding: "0 12px", display: "inline-block", minWidth: "80px", textAlign: "center", fontWeight: "900" }}>{monthName}</span> del 20{" "}
              <span style={{ borderBottom: "1px dotted #000", padding: "0 6px", display: "inline-block", minWidth: "22px", textAlign: "center", fontWeight: "900" }}>{shortYear}</span>
            </td>
            <td style={{ textAlign: "right", verticalAlign: "middle" }}>
              <span style={{ marginRight: "8px" }}>CODIGO CLIENTE</span>
              <span
                style={{
                  display: "inline-block",
                  border: "1.5px solid #000",
                  backgroundColor: "#ffffff",
                  padding: "2px 12px",
                  minWidth: "120px",
                  textAlign: "center",
                  fontFamily: "monospace",
                  fontWeight: "900",
                  fontSize: "11px",
                }}
              >
                {clientCardCode}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 4. DATOS DEL CLIENTE Y DESPACHO (LÍNEAS DE FORMULARIO CON LÍNEA PUNTEADA CONTINUA) */}
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, marginBottom: "6px", fontSize: "10px", fontWeight: "bold" }}>
        <tbody>
          <tr>
            <td style={{ width: "50px", padding: "3px 4px 3px 0", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>Sr.(es):</td>
            <td style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000", fontWeight: "900", fontSize: "10.5px" }}>
              <div style={{ borderBottom: "1px dotted #1f2937", padding: "0 4px 2px 4px", width: "100%" }}>{clientName}</div>
            </td>
            <td style={{ width: "95px", padding: "3px 6px 3px 12px", textAlign: "right", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>RUC CLIENTE:</td>
            <td style={{ width: "140px", padding: "3px 0", verticalAlign: "bottom", color: "#000", fontWeight: "900", fontFamily: "monospace", fontSize: "10.5px" }}>
              <div style={{ borderBottom: "1px dotted #1f2937", padding: "0 4px 2px 4px", width: "100%" }}>{clientRuc}</div>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 4px 3px 0", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>Dirección:</td>
            <td colSpan={3} style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
              <div style={{ borderBottom: "1px dotted #1f2937", padding: "0 4px 2px 4px", width: "100%" }}>{clientAddress}</div>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 4px 3px 0", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>Punto de Llegada:</td>
            <td colSpan={3} style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
              <div style={{ borderBottom: "1px dotted #1f2937", padding: "0 4px 2px 4px", width: "100%" }}>{pointOfArrival}</div>
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 4px 3px 0", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>Ag. Transportes:</td>
            <td style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
              <div style={{ borderBottom: "1px dotted #1f2937", padding: "0 4px 2px 4px", width: "100%" }}>{transportName}</div>
            </td>
            <td style={{ padding: "3px 6px 3px 12px", textAlign: "right", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>Dirección:</td>
            <td style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
              <div style={{ borderBottom: "1px dotted #1f2937", padding: "0 4px 2px 4px", width: "100%" }}>{transportAddress}</div>
            </td>
          </tr>
          {(quote.contactPerson || quote.totals?.contactPerson || quote.refNumber || quote.totals?.refNumber) && (
            <tr>
              <td style={{ padding: "3px 4px 3px 0", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>Contacto:</td>
              <td style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
                <div style={{ borderBottom: "1px dotted #1f2937", padding: "0 4px 2px 4px", width: "100%" }}>
                  {quote.contactPerson || quote.totals?.contactPerson || quote.ContactPerson || "—"}
                </div>
              </td>
              <td style={{ padding: "3px 6px 3px 12px", textAlign: "right", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>OC / Ref:</td>
              <td style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
                <div style={{ borderBottom: "1px dotted #1f2937", padding: "0 4px 2px 4px", width: "100%" }}>
                  {quote.refNumber || quote.totals?.refNumber || quote.NumAtCard || quote.numAtCard || "—"}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 5. CASILLAS COMERCIALES (TALONARIO SEGÚN DISEÑO DEL CENTRO) */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000", background: "#ffffff", marginBottom: "6px", fontSize: "10px", fontWeight: "bold" }}>
        <tbody>
          <tr>
            {/* Columna 1: CONTADO / CREDITO */}
            <td style={{ padding: "4px 8px", width: "20%", verticalAlign: "middle", borderRight: "1px solid #000" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "9.5px", fontWeight: "900", lineHeight: "1.15" }}>CONTADO</span>
                <TalonarioCheckBox checked={isContado} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "9.5px", fontWeight: "900", lineHeight: "1.15" }}>CREDITO</span>
                <TalonarioCheckBox checked={isCredito} />
              </div>
            </td>

            {/* Columna 2: BOLETA / FACTURA */}
            <td style={{ padding: "4px 8px", width: "20%", verticalAlign: "middle", borderRight: "1px solid #000" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "9.5px", fontWeight: "900", lineHeight: "1.15" }}>BOLETA</span>
                <TalonarioCheckBox checked={isBoleta} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "9.5px", fontWeight: "900", lineHeight: "1.15" }}>FACTURA</span>
                <TalonarioCheckBox checked={isFactura} />
              </div>
            </td>

            {/* Columna 3: LETRA / PLAZO */}
            <td style={{ padding: "4px 8px", width: "22%", verticalAlign: "middle", borderRight: "1px solid #000" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "9.5px", fontWeight: "900", lineHeight: "1.15" }}>LETRA</span>
                <TalonarioCheckBox checked={isLetraDoc} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "9.5px", fontWeight: "900", lineHeight: "1.15" }}>PLAZO</span>
                <span style={{ border: "1.5px solid #000", background: "#ffffff", padding: "1px 6px", minWidth: "55px", minHeight: "15px", display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "9px", fontWeight: "900", lineHeight: "1.1" }}>
                  {creditTermDoc || (isCredito ? "30 DÍAS" : "—")}
                </span>
              </div>
            </td>

            {/* Columna 4: ABONO / BANCO */}
            <td style={{ padding: "4px 8px", width: "38%", verticalAlign: "middle" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "8.5px", fontWeight: "900", whiteSpace: "nowrap", marginRight: "6px", lineHeight: "1.15" }}>ABONO / TRANSF.</span>
                <span style={{ flex: 1, border: "1px solid #000", background: "#fef08a", padding: "1px 6px", minHeight: "15px", display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "9px", fontFamily: "monospace", fontWeight: "900", lineHeight: "1.1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {opNumberVal || "—"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: "8.5px", fontWeight: "900", marginRight: "6px", lineHeight: "1.15" }}>BCQ</span>
                <span style={{ flex: 1, border: "1px solid #000", background: "#fef08a", padding: "1px 6px", minHeight: "15px", display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "8.5px", fontWeight: "900", lineHeight: "1.1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {bcqVal}
                </span>
                <span style={{ fontSize: "8.5px", fontWeight: "900", margin: "0 6px", lineHeight: "1.15" }}>CH/</span>
                <span style={{ width: "32px", border: "1px solid #000", background: "#fef08a", padding: "1px 2px", minHeight: "15px", display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "8.5px", fontWeight: "900", lineHeight: "1.1" }}>
                  —
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 6. TABLA DOBLE DE 30 ARTÍCULOS (UNIFICADA SIN LÍNEAS VERTICALES INTERNAS) */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000", marginBottom: "6px", background: "#ffffff", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "30px" }} />
          <col style={{ width: "34px" }} />
          <col style={{ width: "auto" }} />
          <col style={{ width: "48px" }} />
          <col style={{ width: "52px" }} />
          <col style={{ width: "30px" }} />
          <col style={{ width: "34px" }} />
          <col style={{ width: "auto" }} />
          <col style={{ width: "48px" }} />
          <col style={{ width: "52px" }} />
        </colgroup>
        <thead>
          <tr style={{ height: "20px" }}>
            <th colSpan={5} style={{ background: "#e5e7eb", borderBottom: "1.5px solid #000", borderRight: "1.5px solid #000", textAlign: "center", padding: "2px 0", fontSize: "10px", fontWeight: "900", letterSpacing: "2px" }}>
              ARTICULO
            </th>
            <th colSpan={5} style={{ background: "#e5e7eb", borderBottom: "1.5px solid #000", textAlign: "center", padding: "2px 0", fontSize: "10px", fontWeight: "900", letterSpacing: "2px" }}>
              ARTICULO
            </th>
          </tr>
          <tr style={{ background: "#f3f4f6", borderBottom: "1.5px solid #000", fontSize: "7.5px", fontWeight: "900", height: "19px" }}>
            <th style={{ textAlign: "center", padding: "0 3px", whiteSpace: "nowrap" }}>ITEM</th>
            <th style={{ textAlign: "center", padding: "0 3px", whiteSpace: "nowrap" }}>CANT.</th>
            <th style={{ textAlign: "left", padding: "0 6px", whiteSpace: "nowrap" }}>DESCRIPCION</th>
            <th style={{ textAlign: "right", padding: "0 4px", whiteSpace: "nowrap" }}>P. UNIT.</th>
            <th style={{ textAlign: "right", borderRight: "1.5px solid #000", padding: "0 6px 0 4px", whiteSpace: "nowrap" }}>P. TOTAL</th>
            <th style={{ textAlign: "center", padding: "0 3px 0 5px", whiteSpace: "nowrap" }}>ITEM</th>
            <th style={{ textAlign: "center", padding: "0 3px", whiteSpace: "nowrap" }}>CANT.</th>
            <th style={{ textAlign: "left", padding: "0 6px", whiteSpace: "nowrap" }}>DESCRIPCION</th>
            <th style={{ textAlign: "right", padding: "0 4px", whiteSpace: "nowrap" }}>P. UNIT.</th>
            <th style={{ textAlign: "right", padding: "0 6px 0 4px", whiteSpace: "nowrap" }}>P. TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {col1Items.map((leftItem, idx) => {
            const rightItem = col2Items[idx] || null;
            const leftNum = idx + 1;
            const rightNum = idx + 16;

            const leftQty = leftItem ? leftItem.qty : "";
            const leftName = leftItem ? leftItem.desc : "";
            const leftPrice = leftItem && leftItem.isOutOfStock ? "Sin Stock" : (leftItem && leftItem.finalUnitPrice ? `${currencySymbol.trim()}${money(leftItem.finalUnitPrice)}` : "");
            const leftLineTotal = leftItem && leftItem.isOutOfStock ? "Back Order" : (leftItem && leftItem.lineTotalNum ? `${currencySymbol.trim()}${money(leftItem.lineTotalNum)}` : "");

            const rightQty = rightItem ? rightItem.qty : "";
            const rightName = rightItem ? rightItem.desc : "";
            const rightPrice = rightItem && rightItem.isOutOfStock ? "Sin Stock" : (rightItem && rightItem.finalUnitPrice ? `${currencySymbol.trim()}${money(rightItem.finalUnitPrice)}` : "");
            const rightLineTotal = rightItem && rightItem.isOutOfStock ? "Back Order" : (rightItem && rightItem.lineTotalNum ? `${currencySymbol.trim()}${money(rightItem.lineTotalNum)}` : "");

            const hasAnyItem = Boolean(leftItem || rightItem);

            return (
              <tr
                key={idx}
                style={{
                  minHeight: "19px",
                  height: hasAnyItem ? "auto" : "19px",
                  borderBottom: idx === 14 ? "none" : "1px solid #9ca3af",
                  fontSize: "9px",
                  boxSizing: "border-box",
                }}
              >
                {/* Mitad Izquierda (1..15) */}
                <td style={{ textAlign: "center", fontWeight: "bold", color: leftItem ? "#000000" : "#4b5563", padding: "2px 3px", verticalAlign: "middle", whiteSpace: "nowrap", fontSize: "8.5px" }}>{leftNum}</td>
                <td style={{ textAlign: "center", fontWeight: "bold", color: "#000000", padding: "2px 3px", verticalAlign: "middle", whiteSpace: "nowrap", fontSize: "9px" }}>{leftQty}</td>
                <td
                  style={{
                    fontWeight: "bold",
                    padding: "2px 6px",
                    color: "#000000",
                    verticalAlign: "middle",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    lineHeight: "1.18",
                    ...getItemDescStyle(leftName),
                  }}
                  title={leftName}
                >
                  {leftItem ? (
                    <div>
                      <span>{leftItem.baseName || leftItem.desc}</span>
                      {leftItem.discTag && (
                        <span style={{ color: "#166534", fontSize: "8px", fontWeight: "800", marginLeft: "4px", whiteSpace: "nowrap" }}>
                          {leftItem.discTag}
                        </span>
                      )}
                    </div>
                  ) : ""}
                </td>
                <td style={{ textAlign: "right", fontFamily: "monospace", padding: "2px 4px", whiteSpace: "nowrap", fontWeight: "bold", color: "#000000", verticalAlign: "middle", ...getPriceStyle(leftPrice) }}>{leftPrice}</td>
                <td style={{ textAlign: "right", borderRight: "1.5px solid #000", fontWeight: "bold", fontFamily: "monospace", padding: "2px 6px 2px 4px", whiteSpace: "nowrap", color: "#000000", verticalAlign: "middle", ...getPriceStyle(leftLineTotal) }}>{leftLineTotal}</td>

                {/* Mitad Derecha (16..30) */}
                <td style={{ textAlign: "center", fontWeight: "bold", color: rightItem ? "#000000" : "#4b5563", padding: "2px 3px 2px 5px", verticalAlign: "middle", whiteSpace: "nowrap", fontSize: "8.5px" }}>{rightNum}</td>
                <td style={{ textAlign: "center", fontWeight: "bold", color: "#000000", padding: "2px 3px", verticalAlign: "middle", whiteSpace: "nowrap", fontSize: "9px" }}>{rightQty}</td>
                <td
                  style={{
                    fontWeight: "bold",
                    padding: "2px 6px",
                    color: "#000000",
                    verticalAlign: "middle",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    lineHeight: "1.18",
                    ...getItemDescStyle(rightName),
                  }}
                  title={rightName}
                >
                  {rightItem ? (
                    <div>
                      <span>{rightItem.baseName || rightItem.desc}</span>
                      {rightItem.discTag && (
                        <span style={{ color: "#166534", fontSize: "8px", fontWeight: "800", marginLeft: "4px", whiteSpace: "nowrap" }}>
                          {rightItem.discTag}
                        </span>
                      )}
                    </div>
                  ) : ""}
                </td>
                <td style={{ textAlign: "right", fontFamily: "monospace", padding: "2px 4px", whiteSpace: "nowrap", fontWeight: "bold", color: "#000000", verticalAlign: "middle", ...getPriceStyle(rightPrice) }}>{rightPrice}</td>
                <td style={{ textAlign: "right", fontWeight: "bold", fontFamily: "monospace", padding: "2px 6px 2px 4px", whiteSpace: "nowrap", color: "#000000", verticalAlign: "middle", ...getPriceStyle(rightLineTotal) }}>{rightLineTotal}</td>
              </tr>
            );
          })}
          {/* Fila de Totales Unificada (Subtotal/IGV izquierda + Total amarillo derecha) */}
          <tr style={{ height: "26px", maxHeight: "26px" }}>
            <td colSpan={5} style={{ borderTop: "1.5px solid #000", borderRight: "1.5px solid #000", background: "#f8fafc", textAlign: "right", padding: "0 10px", verticalAlign: "middle", whiteSpace: "nowrap", fontSize: "8px", fontWeight: "bold", color: "#374151" }}>
              SUBTOTAL: {currencySymbol.trim()} {money(subtotalDocNum)} &nbsp;|&nbsp; I.G.V. (18%): {currencySymbol.trim()} {money(igvDocNum)}
            </td>
            <td colSpan={5} style={{ borderTop: "1.5px solid #000", background: "#fef08a", textAlign: "right", padding: "0 12px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: "8px", fontWeight: "bold", color: "#4b5563", marginRight: "6px" }}>
                (Inc. 18% IGV)
              </span>
              <span style={{ fontWeight: "900", fontSize: "12px", letterSpacing: "0.5px", color: "#000000" }}>
                TOTAL {currencySymbol.trim()} {money(documentTotalNum)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 7. ADVERTENCIA LEGAL Y FIRMAS */}
      <div style={{ fontSize: "8px", fontWeight: "900", textAlign: "center", margin: "4px 0", letterSpacing: "1px" }}>
        ANTES DE FIRMAR LEER CONDICIONES AL DORSO
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", textAlign: "center" }}>
        <tbody>
          <tr>
            {/* Vendedor */}
            <td style={{ width: "30%", verticalAlign: "bottom", padding: "0 8px" }}>
              <div
                style={{
                  minWidth: "110px",
                  maxWidth: "140px",
                  minHeight: "22px",
                  border: "1.5px solid #000",
                  margin: "0 auto 3px auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "900",
                  lineHeight: "1.2",
                  textAlign: "center",
                  textTransform: "uppercase",
                  padding: "3px 6px",
                  background: "#ffffff",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                }}
              >
                {resolveSellerFullName(quote)}
              </div>
              <div style={{ borderBottom: "1.5px solid #000", width: "130px", margin: "0 auto 3px auto" }}></div>
              <div style={{ fontSize: "9px", fontWeight: "bold", letterSpacing: "1px" }}>VENDEDOR</div>
            </td>

            {/* Cliente */}
            <td style={{ width: "40%", verticalAlign: "bottom", padding: "0 12px" }}>
              <div style={{ borderBottom: "1px solid #000", width: "180px", margin: "21px auto 3px auto" }}></div>
              <div style={{ fontSize: "9px", fontWeight: "bold" }}>CLIENTE</div>
              <div style={{ fontSize: "7.5px", color: "#333333" }}>(Firma y Sello)</div>
            </td>

            {/* Emisor F/N */}
            <td style={{ width: "30%", verticalAlign: "bottom", padding: "0 8px" }}>
              <div style={{ border: "1.5px solid #000", width: "130px", height: "24px", margin: "0 auto 3px auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", background: "#ffffff" }}>
                <span style={{ fontWeight: "900", fontSize: "12px" }}>F/N</span>
                <span style={{ fontWeight: "bold", fontSize: "9.5px" }}>{docType}</span>
              </div>
              <div style={{ fontSize: "9px", fontWeight: "bold" }}>EMISOR</div>
            </td>
          </tr>
        </tbody>
      </table>


      <div style={{ textAlign: "center", fontSize: "8px", color: "#000000", fontWeight: "bold", marginTop: "4px" }}>
        1/1
      </div>
    </div>
  );
});

let cachedPdfLibsPromise = null;

/**
 * Precarga html2canvas y jspdf apenas se abre el visor para que al pulsar
 * "Descargar PDF" en teléfonos móviles la generación sea inmediata (< 0.4s)
 * sin perder el permiso táctil (Transient User Activation).
 */
export function preloadQuotePdfLibs() {
  if (!cachedPdfLibsPromise) {
    cachedPdfLibsPromise = Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]).catch((err) => {
      cachedPdfLibsPromise = null;
      throw err;
    });
  }
  return cachedPdfLibsPromise;
}

const blobToDataUrl = (blob, mimeOverride = "application/octet-stream") =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = String(reader.result || "");
      if (!res) {
        reject(new Error("No se pudo codificar el PDF para descarga móvil."));
        return;
      }
      const normalized = mimeOverride
        ? res.replace(/^data:[^;]+;/, `data:${mimeOverride};`)
        : res;
      resolve(normalized);
    };
    reader.onerror = () => reject(new Error("Error leyendo el archivo PDF generado."));
    reader.readAsDataURL(blob);
  });

/**
 * Renderiza el documento en un clon A4 limpio fuera de pantalla (sin recortes de scroll
 * ni transform scale móvil) y ejecuta una descarga universal compatible con Android,
 * Samsung Internet, Xiaomi/MIUI, iOS Safari/Chrome y WebViews (WhatsApp).
 */
export async function downloadQuoteElementAsPdf(element, rawFileName = "Autopartes_Cotizacion.pdf") {
  if (!element) {
    throw new Error("No se encontró el documento para generar el PDF.");
  }

  const [{ default: html2canvas }, { default: jsPDF }] = await preloadQuotePdfLibs();

  const safeFileName =
    String(rawFileName || "Autopartes_Cotizacion.pdf")
      .trim()
      .replace(/[\/\\:*?"<>|\s]+/g, "_")
      .replace(/\.pdf$/i, "") + ".pdf";

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isIOSAltBrowser = isIOS && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  const isInAppWebView = /FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)|\bwv\b/i.test(ua);
  const isMobileDevice =
    isIOS ||
    isInAppWebView ||
    /Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|SamsungBrowser|MiuiBrowser|HuaweiBrowser/i.test(ua) ||
    (typeof window !== "undefined" && window.innerWidth < 820);

  // Clonar documento fuera del modal para evitar recortes por overflow/scale en pantallas móviles
  const sandbox = document.createElement("div");
  sandbox.style.position = "fixed";
  sandbox.style.left = "-10000px";
  sandbox.style.top = "0";
  sandbox.style.width = "800px";
  sandbox.style.minWidth = "800px";
  sandbox.style.maxWidth = "800px";
  sandbox.style.background = "#fffdf7";
  sandbox.style.zIndex = "-9999";
  sandbox.style.pointerEvents = "none";
  sandbox.style.overflow = "visible";
  sandbox.style.transform = "none";

  const cloned = element.cloneNode(true);
  cloned.style.width = "800px";
  cloned.style.minWidth = "800px";
  cloned.style.maxWidth = "800px";
  cloned.style.minHeight = "1130px";
  cloned.style.margin = "0";
  cloned.style.boxShadow = "none";
  cloned.style.transform = "none";

  // Corregir bug de html2canvas@1.4.1 con resets globales (`img { display: block }`):
  // FontMetrics.parseMetrics(document) inserta un <img> sonda 1x1 para medir el baseline;
  // si hereda `display: block`, salta de línea y desplaza todos los textos ~4px hacia abajo.
  const H2C_BASELINE_CSS =
    'img[src^="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP"]{display:inline!important;width:1px!important;height:1px!important;max-width:none!important;vertical-align:baseline!important;}';
  const baselineFixStyle = document.createElement("style");
  baselineFixStyle.setAttribute("data-h2c-baseline-fix", "true");
  baselineFixStyle.textContent = H2C_BASELINE_CSS;
  if (document.head) {
    document.head.appendChild(baselineFixStyle);
  }

  sandbox.appendChild(cloned);
  document.body.appendChild(sandbox);

  let imgData = "";
  try {
    const imgs = Array.from(cloned.querySelectorAll("img"));
    const pendingImgs = imgs.filter((img) => !img.complete);
    if (pendingImgs.length > 0) {
      await Promise.race([
        Promise.all(
          pendingImgs.map(
            (img) =>
              new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              })
          )
        ),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
    }

    const scalesToTry = isMobileDevice ? [2.2, 1.6] : [3.0, 2.0];
    for (const scale of scalesToTry) {
      try {
        const canvas = await html2canvas(cloned, {
          scale,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: "#fffdf7",
          width: 800,
          windowWidth: 1200,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            if (clonedDoc?.head) {
              const cloneStyle = clonedDoc.createElement("style");
              cloneStyle.textContent = H2C_BASELINE_CSS;
              clonedDoc.head.appendChild(cloneStyle);
            }
          },
        });
        if (canvas && canvas.width > 100 && canvas.height > 100) {
          const candidate = canvas.toDataURL("image/jpeg", 0.95);
          if (candidate && candidate.startsWith("data:image/") && candidate.length > 2000) {
            imgData = candidate;
            break;
          }
        }
      } catch (_) {}
    }
  } finally {
    try {
      if (sandbox.parentNode) {
        sandbox.parentNode.removeChild(sandbox);
      }
    } catch (_) {}
    try {
      if (baselineFixStyle.parentNode) {
        baselineFixStyle.parentNode.removeChild(baselineFixStyle);
      }
    } catch (_) {}
  }

  if (!imgData) {
    throw new Error("No se pudo renderizar el documento en la memoria del dispositivo.");
  }

  const pdf = new jsPDF("p", "mm", "a4");
  pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
  const rawBlob = pdf.output("blob");
  if (!rawBlob || rawBlob.size < 1000) {
    throw new Error("El archivo PDF generado está incompleto o vacío.");
  }

  const pdfBlob = new Blob([rawBlob], { type: "application/pdf" });

  // 1. Navegadores internos (WhatsApp / Instagram / Android WebView) o Chrome en iOS (CriOS):
  //    blob: download suele ser bloqueado; priorizar Web Share nativo de archivos o Data URL.
  if (isInAppWebView || isIOSAltBrowser) {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof File !== "undefined") {
      try {
        const pdfFile = new File([pdfBlob], safeFileName, { type: "application/pdf" });
        if (!navigator.canShare || navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: safeFileName,
          });
          return { fileName: safeFileName, method: "share" };
        }
      } catch (shareErr) {
        if (shareErr?.name === "AbortError") {
          return { fileName: safeFileName, cancelled: true };
        }
      }
    }

    const dataUrl = await blobToDataUrl(pdfBlob, "application/octet-stream");
    const dlLink = document.createElement("a");
    dlLink.style.display = "none";
    dlLink.href = dataUrl;
    dlLink.download = safeFileName;
    document.body.appendChild(dlLink);
    dlLink.click();
    setTimeout(() => {
      try {
        if (dlLink.parentNode) dlLink.parentNode.removeChild(dlLink);
      } catch (_) {}
    }, 4000);
    return { fileName: safeFileName, method: "data-url" };
  }

  // 2. Android Chrome, Samsung Internet, Xiaomi/MIUI, iOS Safari 15+ y Escritorio:
  //    Anclar <a> real al DOM y ejecutar .click() SÍNCRONO (sin el setTimeout de jsPDF que pierde el permiso móvil)
  const blobUrl = window.URL.createObjectURL(pdfBlob);
  if ("download" in HTMLAnchorElement.prototype) {
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = blobUrl;
    link.download = safeFileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        if (link.parentNode) link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (_) {}
    }, 60000);
  } else {
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => {
      try {
        window.URL.revokeObjectURL(blobUrl);
      } catch (_) {}
    }, 60000);
  }

  return { fileName: safeFileName, method: "blob" };
}

export default QuotePdfDocument;

