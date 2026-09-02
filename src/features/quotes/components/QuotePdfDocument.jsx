import React from "react";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";
import {
  formatDeliveryForm,
  formatTransportName,
  formatDeliveryPoint,
  formatPaymentTerms,
  formatBankAccount,
  isPickupInStoreForm
} from "../../../shared/utils/quoteLogisticsFormatters";

const money = (val) => {
  const num = Number(val || 0);
  return num.toFixed(2);
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

const normalizeItem = (item) => {
  if (!item) return null;
  const qty = Math.max(1, Number(item.quantity ?? item.Quantity ?? item.Cant ?? item.cant ?? 1));

  // 1. Total de línea consolidado (si ya viene calculado desde SAP o desde la orden emitida)
  const explicitLineTotal = Number(item.lineTotal ?? item.LineTotal ?? item.totalPrice ?? item.subtotal ?? 0);

  // 2. Descuentos: evitar descuentos negativos en la fórmula de precio unitario
  // (en SAP un descuento negativo es un ajuste contable interno, no debe multiplicar el precio)
  const rawSapDisc = Number(item.discount ?? item.Discount ?? item.sapDiscount ?? item.DiscountPercent ?? 0);
  const rawAddDisc = Number(item.lineDiscount ?? item.LineDiscount ?? item.addDiscount ?? 0);
  const sapDisc = Math.max(0, Math.min(100, isNaN(rawSapDisc) ? 0 : rawSapDisc));
  const addDisc = Math.max(0, Math.min(100, isNaN(rawAddDisc) ? 0 : rawAddDisc));

  let finalUnitPrice = 0;
  let lineTotalNum = 0;

  if (item.discountedUnitPrice && Number(item.discountedUnitPrice) > 0) {
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
    const priceAfterSap = listPrice * (1 - sapDisc / 100);
    finalUnitPrice = Number((priceAfterSap * (1 - addDisc / 100)).toFixed(2));
    lineTotalNum = Number((qty * finalUnitPrice).toFixed(2));
  }

  const code = item.code || item.itemCode || item.ItemCode || item.productCode || item.id || "";
  let baseName = item.name || item.productName || item.description || item.Description || item.ItemDescription || item.ItemName || item.Dscription || "";
  if (!baseName) {
    baseName = item.sigla || code || "Artículo";
  }

  let discTag = "";
  if (sapDisc > 0 && addDisc > 0) {
    discTag = ` (-${sapDisc}% -${addDisc}%)`;
  } else if (sapDisc > 0) {
    discTag = ` (-${sapDisc}%)`;
  } else if (addDisc > 0) {
    discTag = ` (-${addDisc}%)`;
  }

  return {
    qty: isNaN(qty) || qty < 1 ? 1 : qty,
    code,
    desc: `${baseName}${discTag}`.trim(),
    finalUnitPrice,
    lineTotalNum,
  };
};

const getItemDescStyle = (text) => {
  const len = (text || "").length;
  if (len > 55) return { fontSize: "5.8px", letterSpacing: "-0.35px" };
  if (len > 42) return { fontSize: "6.5px", letterSpacing: "-0.3px" };
  if (len > 32) return { fontSize: "7.2px", letterSpacing: "-0.2px" };
  if (len > 22) return { fontSize: "7.8px", letterSpacing: "-0.1px" };
  return { fontSize: "8.5px", letterSpacing: "normal" };
};

const getPriceStyle = (priceStr) => {
  const len = (priceStr || "").length;
  if (len > 9) return { fontSize: "7px", letterSpacing: "-0.3px" };
  if (len > 8) return { fontSize: "7.5px", letterSpacing: "-0.15px" };
  if (len > 7) return { fontSize: "8px" };
  return { fontSize: "8.5px" };
};

const SALES_PERSONS_MAP = {
  1: { code: 1, prefix: "062", name: "Gerardo Phun" },
  2: { code: 2, prefix: "432", name: "Carlos Paz" },
  3: { code: 3, prefix: "535", name: "Wilson Ramirez" },
  4: { code: 4, prefix: "005", name: "Guillermo Alcas" },
  5: { code: 5, prefix: "439", name: "Rene Villanueva" },
  6: { code: 6, prefix: "552", name: "Richard Talavera" },
  7: { code: 7, prefix: "541", name: "Manuel Zapata" },
  8: { code: 8, prefix: "520", name: "Benny Borja" },
  9: { code: 9, prefix: "540", name: "Eric Acuña" },
  10: { code: 10, prefix: "032", name: "Alberto Chamorro" },
  11: { code: 11, prefix: "548", name: "Daniel Capuñay" },
  12: { code: 12, prefix: "711", name: "Manuel Villalta" },
  13: { code: 13, prefix: "727", name: "Pedro Pazos" },
  14: { code: 14, prefix: "417", name: "Gleen Rodriguez" },
  15: { code: 15, prefix: "723", name: "Arturo Jeri" },
  16: { code: 16, prefix: "725", name: "Luis Perez" },
  19: { code: 19, prefix: "719", name: "Rafael Nolasco" },
  20: { code: 20, prefix: "001", name: "Ofic Administración" },
  21: { code: 21, prefix: "551", name: "León Autos" },
};

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

export const QuotePdfDocument = React.forwardRef(({ quote, isPrintMode = false }, ref) => {
  if (!quote) return null;

  const client = quote.client || {};
  const products = extractProducts(quote);
  const tcVal = Number(quote.totals?.tc) || 3.76;

  // Condiciones Comerciales Normalizadas
  const docType = String(quote.documentType || quote.tipoComprobante || quote.docTypeVenta || "FACTURA").toUpperCase();
  const saleCond = String(quote.saleCondition || quote.condicionVenta || quote.condicionPago || "CONTADO").toUpperCase();
  const isLetraDoc = Boolean(quote.isLetra || quote.hasLetra || quote.letra);
  const creditTermDoc = quote.creditTerm || quote.plazo || "";

  const isContado = saleCond === "CONTADO";
  const isCredito = saleCond === "CREDITO";
  const isBoleta = docType === "BOLETA";
  const isFactura = docType === "FACTURA";

  // Fecha
  const dateObj = quote.docDate ? new Date(quote.docDate) : new Date();
  const day = !isNaN(dateObj.getDate()) ? String(dateObj.getDate()).padStart(2, "0") : String(new Date().getDate()).padStart(2, "0");
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];
  const monthName = !isNaN(dateObj.getMonth()) ? months[dateObj.getMonth()] : months[new Date().getMonth()];
  const fullYear = !isNaN(dateObj.getFullYear()) ? String(dateObj.getFullYear()) : String(new Date().getFullYear());
  const shortYear = fullYear.slice(-2);

  // Cliente y Despacho
  const clientCardCode = client.CardCode || quote.clientDocument || quote.clientRuc || "CL000000";
  const clientName = client.CardName || client.name || quote.clientName || "CLIENTE NO REGISTRADO";
  const clientRuc = client.LicTradNum || client.FederalTaxID || quote.clientRuc || quote.clientDocument || "-";
  const clientAddress = client.Address || client.address || quote.clientAddress || "-";

  // Parseo y formateo inteligente de Transporte y Forma de Entrega
  const rawDelivForm = quote.selectedDeliveryForm || quote.deliveryForm;
  const rawTransport = quote.selectedTransport || quote.transport;
  const transportName = formatTransportName(rawTransport, rawDelivForm);

  let parsedTransport = rawTransport;
  if (typeof parsedTransport === "string" && parsedTransport.trim().startsWith("{")) {
    try { parsedTransport = JSON.parse(parsedTransport); } catch (e) {}
  }
  const transportAddress = typeof parsedTransport === "object" && parsedTransport !== null
    ? (parsedTransport.U_TQC_DIREC || parsedTransport.address || quote.transportDirection || "-")
    : (quote.transportDirection || "-");

  // Punto de Llegada
  const rawPoint = quote.selectedPoint || quote.deliveryPoint;
  const pointOfArrival = formatDeliveryPoint(rawPoint, clientAddress);

  const opNumberVal = quote.opNum || quote.operationNumber || "";

  // Parseo inteligente de Pago
  const rawPayment = quote.selectedPaymentType || quote.paymentType;
  const rawBank = quote.bankAccount || (typeof rawPayment === "object" ? rawPayment?.bankAccount : rawPayment);
  const bankVal = (isCredito || saleCond === "CREDITO")
    ? "Línea de Crédito Comercial"
    : formatBankAccount(rawBank);

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

  // Totales y Normalización usando calculadora unificada (sincronizada 100% con la vista)
  const calcRes = calculateQuoteTotals(products, tcVal);
  const normalizedList = calcRes.normalizedProducts && calcRes.normalizedProducts.length > 0
    ? calcRes.normalizedProducts
    : products;

  const grandTotalUSD = calcRes.grandTotalUSD || Number(quote.totals?.grandTotalUSD || 0) || Number(quote.DocTotalSys || 0);

  // Monto total del documento oficial (prioriza total unificado exacto)
  const documentTotalNum = isSol
    ? Number(quote.totals?.grandTotalPEN || quote.totals?.grandTotalSOL || calcRes.grandTotalSOL || quote.DocTotal || (grandTotalUSD * tcVal))
    : Number(quote.totals?.grandTotalUSD || grandTotalUSD || quote.DocTotalSys || quote.DocTotalFc);

  const subtotalDocNum = isSol
    ? Number(quote.totals?.subtotalSOL || calcRes.subtotalSOL || (documentTotalNum / 1.18))
    : Number(quote.totals?.subtotalUSD || calcRes.subtotalUSD || (documentTotalNum / 1.18));

  const igvDocNum = isSol
    ? Number(quote.totals?.igvSOL || calcRes.igvSOL || (documentTotalNum - subtotalDocNum))
    : Number(quote.totals?.igvUSD || calcRes.igvUSD || (documentTotalNum - subtotalDocNum));

  // Grilla Doble de 30 renglones normalizados (alineados con la vista del drawer)
  const col1Items = [];
  const col2Items = [];
  for (let i = 0; i < 15; i++) {
    col1Items.push(normalizedList[i] ? normalizeItem(normalizedList[i]) : null);
  }
  for (let i = 15; i < 30; i++) {
    col2Items.push(normalizedList[i] ? normalizeItem(normalizedList[i]) : null);
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

      {/* 2. TÍTULO Y NUMERACIÓN (ORDEN DE PEDIDO) */}
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
              ORDEN DE PEDIDO
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
              Nº {quote.docNumber || quote.id || "065026"}
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

      {/* 4. DATOS DEL CLIENTE Y DESPACHO (LÍNEAS DE FORMULARIO CON LÍNEA PUNTEADA) */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px", fontSize: "10px", fontWeight: "bold" }}>
        <tbody>
          <tr>
            <td style={{ width: "50px", padding: "3px 0", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>Sr.(es):</td>
            <td style={{ borderBottom: "1px dotted #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "900", fontSize: "10.5px" }}>
              {clientName}
            </td>
            <td style={{ width: "95px", padding: "3px 4px 3px 12px", textAlign: "right", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>RUC CLIENTE:</td>
            <td style={{ width: "140px", borderBottom: "1px dotted #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "900", fontFamily: "monospace", fontSize: "10.5px" }}>
              {clientRuc}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>Dirección:</td>
            <td colSpan={3} style={{ borderBottom: "1px dotted #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
              {clientAddress}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>Punto de Llegada:</td>
            <td colSpan={3} style={{ borderBottom: "1px dotted #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
              {pointOfArrival}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>Ag. Transportes:</td>
            <td style={{ borderBottom: "1px dotted #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
              {transportName}
            </td>
            <td style={{ padding: "3px 4px 3px 12px", textAlign: "right", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>Dirección:</td>
            <td style={{ borderBottom: "1px dotted #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
              {transportAddress}
            </td>
          </tr>
          {(quote.contactPerson || quote.totals?.contactPerson || quote.refNumber || quote.totals?.refNumber) && (
            <tr>
              <td style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>Contacto:</td>
              <td style={{ borderBottom: "1px dotted #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
                {quote.contactPerson || quote.totals?.contactPerson || quote.ContactPerson || "—"}
              </td>
              <td style={{ padding: "3px 4px 3px 12px", textAlign: "right", verticalAlign: "bottom", color: "#000", whiteSpace: "nowrap" }}>OC / Ref:</td>
              <td style={{ borderBottom: "1px dotted #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
                {quote.refNumber || quote.totals?.refNumber || quote.NumAtCard || quote.numAtCard || "—"}
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
                <span style={{ fontSize: "9.5px", fontWeight: "900" }}>CONTADO</span>
                <span style={{ width: "14px", height: "14px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "900" }}>
                  {isContado ? "X" : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "9.5px", fontWeight: "900" }}>CREDITO</span>
                <span style={{ width: "14px", height: "14px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "900" }}>
                  {isCredito ? "X" : ""}
                </span>
              </div>
            </td>

            {/* Columna 2: BOLETA / FACTURA */}
            <td style={{ padding: "4px 8px", width: "20%", verticalAlign: "middle", borderRight: "1px solid #000" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "9.5px", fontWeight: "900" }}>BOLETA</span>
                <span style={{ width: "14px", height: "14px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "900" }}>
                  {isBoleta ? "X" : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "9.5px", fontWeight: "900" }}>FACTURA</span>
                <span style={{ width: "14px", height: "14px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "900" }}>
                  {isFactura ? "X" : ""}
                </span>
              </div>
            </td>

            {/* Columna 3: LETRA / PLAZO */}
            <td style={{ padding: "4px 8px", width: "22%", verticalAlign: "middle", borderRight: "1px solid #000" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "9.5px", fontWeight: "900" }}>LETRA</span>
                <span style={{ width: "14px", height: "14px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "900" }}>
                  {isLetraDoc ? "X" : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "9.5px", fontWeight: "900" }}>PLAZO</span>
                <span style={{ border: "1.5px solid #000", background: "#ffffff", padding: "1px 6px", minWidth: "55px", textAlign: "center", fontSize: "9px", fontWeight: "900" }}>
                  {creditTermDoc || (isCredito ? "30 DÍAS" : "—")}
                </span>
              </div>
            </td>

            {/* Columna 4: ABONO / BANCO */}
            <td style={{ padding: "4px 8px", width: "38%", verticalAlign: "middle" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "8.5px", fontWeight: "900", whiteSpace: "nowrap", marginRight: "6px" }}>ABONO / TRANSF.</span>
                <span style={{ flex: 1, border: "1px solid #000", background: "#fef08a", padding: "1px 6px", textAlign: "center", fontSize: "9px", fontFamily: "monospace", fontWeight: "900", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {opNumberVal || "—"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: "8.5px", fontWeight: "900", marginRight: "6px" }}>BCQ</span>
                <span style={{ flex: 1, border: "1px solid #000", background: "#fef08a", padding: "1px 6px", textAlign: "center", fontSize: "8.5px", fontWeight: "900", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {bankVal || "Pendiente de Selección"}
                </span>
                <span style={{ fontSize: "8.5px", fontWeight: "900", margin: "0 6px" }}>CH/</span>
                <span style={{ width: "32px", border: "1px solid #000", background: "#fef08a", padding: "1px 2px", textAlign: "center", fontSize: "8.5px", fontWeight: "900" }}>
                  —
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 6. TABLA DOBLE DE 30 ARTÍCULOS (GRILLA COMPACTA TOTALMENTE CUADRADA) */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000", marginBottom: "6px", background: "#ffffff", tableLayout: "fixed" }}>
        <tbody>
          <tr>
            {/* Mitad Izquierda: Renglones 1 al 15 */}
            <td style={{ width: "50%", verticalAlign: "top", borderRight: "1.5px solid #000", padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "20px" }} />
                  <col style={{ width: "24px" }} />
                  <col style={{ width: "auto" }} />
                  <col style={{ width: "42px" }} />
                  <col style={{ width: "46px" }} />
                </colgroup>
                <thead>
                  <tr style={{ height: "20px" }}>
                    <th colSpan={5} style={{ background: "#e5e7eb", borderBottom: "1.5px solid #000", textAlign: "center", padding: "2px 0", fontSize: "10px", fontWeight: "900", letterSpacing: "2px" }}>
                      ARTICULO
                    </th>
                  </tr>
                  <tr style={{ background: "#f3f4f6", borderBottom: "1.5px solid #000", fontSize: "8px", fontWeight: "900", height: "18px" }}>
                    <th style={{ textAlign: "center", borderRight: "1px solid #000", padding: 0, whiteSpace: "nowrap" }}>ITEM</th>
                    <th style={{ textAlign: "center", borderRight: "1px solid #000", padding: 0, whiteSpace: "nowrap" }}>CANT.</th>
                    <th style={{ textAlign: "center", borderRight: "1px solid #000", padding: "0 4px", whiteSpace: "nowrap" }}>DESCRIPCION</th>
                    <th style={{ textAlign: "center", borderRight: "1px solid #000", padding: 0, whiteSpace: "nowrap" }}>P. UNIT.</th>
                    <th style={{ textAlign: "center", padding: 0, whiteSpace: "nowrap" }}>P. TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {col1Items.map((item, idx) => {
                    const itemNum = idx + 1;
                    const qty = item ? item.qty : "";
                    const name = item ? item.desc : "";
                    const price = item && item.finalUnitPrice ? `${currencySymbol.trim()}${money(item.finalUnitPrice)}` : "";
                    const lineTotal = item && item.lineTotalNum ? `${currencySymbol.trim()}${money(item.lineTotalNum)}` : "";
                    const descStyle = getItemDescStyle(name);
                    const priceStyle = getPriceStyle(price);
                    const lineTotalStyle = getPriceStyle(lineTotal);

                    return (
                      <tr key={idx} style={{ height: "19px", maxHeight: "19px", minHeight: "19px", borderBottom: "1px solid #000", fontSize: "8.5px", boxSizing: "border-box", lineHeight: "19px" }}>
                        <td style={{ textAlign: "center", borderRight: "1px solid #000", fontWeight: "bold", color: "#000", padding: "0 2px", whiteSpace: "nowrap" }}>{itemNum}</td>
                        <td style={{ textAlign: "center", borderRight: "1px solid #000", fontWeight: "bold", color: "#000", padding: "0 2px", whiteSpace: "nowrap" }}>{qty}</td>
                        <td style={{ borderRight: "1px solid #000", fontWeight: "bold", padding: "0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#000000", lineHeight: "19px", ...descStyle }} title={name}>{name}</td>
                        <td style={{ textAlign: "right", borderRight: "1px solid #000", fontFamily: "monospace", padding: "0 3px", whiteSpace: "nowrap", overflow: "hidden", fontWeight: "bold", color: "#000000", lineHeight: "19px", ...priceStyle }}>{price}</td>
                        <td style={{ textAlign: "right", fontWeight: "bold", fontFamily: "monospace", padding: "0 3px", whiteSpace: "nowrap", overflow: "hidden", color: "#000000", lineHeight: "19px", ...lineTotalStyle }}>{lineTotal}</td>
                      </tr>
                    );
                  })}
                  {/* Fila de Subtotal e IGV en el extremo inferior izquierdo */}
                  <tr style={{ height: "26px", maxHeight: "26px" }}>
                    <td colSpan={5} style={{ borderTop: "1.5px solid #000", background: "#f8fafc", textAlign: "right", padding: "0 10px", verticalAlign: "middle", whiteSpace: "nowrap", fontSize: "8px", fontWeight: "bold", color: "#374151" }}>
                      SUBTOTAL: {currencySymbol.trim()} {money(subtotalDocNum)} &nbsp;|&nbsp; I.G.V. (18%): {currencySymbol.trim()} {money(igvDocNum)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>

            {/* Mitad Derecha: Renglones 16 al 30 */}
            <td style={{ width: "50%", verticalAlign: "top", padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "20px" }} />
                  <col style={{ width: "24px" }} />
                  <col style={{ width: "auto" }} />
                  <col style={{ width: "42px" }} />
                  <col style={{ width: "46px" }} />
                </colgroup>
                <thead>
                  <tr style={{ height: "20px" }}>
                    <th colSpan={5} style={{ background: "#e5e7eb", borderBottom: "1.5px solid #000", textAlign: "center", padding: "2px 0", fontSize: "10px", fontWeight: "900", letterSpacing: "2px" }}>
                      ARTICULO
                    </th>
                  </tr>
                  <tr style={{ background: "#f3f4f6", borderBottom: "1.5px solid #000", fontSize: "8px", fontWeight: "900", height: "18px" }}>
                    <th style={{ textAlign: "center", borderRight: "1px solid #000", padding: 0, whiteSpace: "nowrap" }}>ITEM</th>
                    <th style={{ textAlign: "center", borderRight: "1px solid #000", padding: 0, whiteSpace: "nowrap" }}>CANT.</th>
                    <th style={{ textAlign: "center", borderRight: "1px solid #000", padding: "0 4px", whiteSpace: "nowrap" }}>DESCRIPCION</th>
                    <th style={{ textAlign: "center", borderRight: "1px solid #000", padding: 0, whiteSpace: "nowrap" }}>P. UNIT.</th>
                    <th style={{ textAlign: "center", padding: 0, whiteSpace: "nowrap" }}>P. TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {col2Items.map((item, idx) => {
                    const itemNum = idx + 16;
                    const qty = item ? item.qty : "";
                    const name = item ? item.desc : "";
                    const price = item && item.finalUnitPrice ? `${currencySymbol.trim()}${money(item.finalUnitPrice)}` : "";
                    const lineTotal = item && item.lineTotalNum ? `${currencySymbol.trim()}${money(item.lineTotalNum)}` : "";
                    const descStyle = getItemDescStyle(name);
                    const priceStyle = getPriceStyle(price);
                    const lineTotalStyle = getPriceStyle(lineTotal);

                    return (
                      <tr key={idx} style={{ height: "19px", maxHeight: "19px", minHeight: "19px", borderBottom: "1px solid #000", fontSize: "8.5px", boxSizing: "border-box", lineHeight: "19px" }}>
                        <td style={{ textAlign: "center", borderRight: "1px solid #000", fontWeight: "bold", color: "#000", padding: "0 2px", whiteSpace: "nowrap" }}>{itemNum}</td>
                        <td style={{ textAlign: "center", borderRight: "1px solid #000", fontWeight: "bold", color: "#000", padding: "0 2px", whiteSpace: "nowrap" }}>{qty}</td>
                        <td style={{ borderRight: "1px solid #000", fontWeight: "bold", padding: "0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#000000", lineHeight: "19px", ...descStyle }} title={name}>{name}</td>
                        <td style={{ textAlign: "right", borderRight: "1px solid #000", fontFamily: "monospace", padding: "0 3px", whiteSpace: "nowrap", overflow: "hidden", fontWeight: "bold", color: "#000000", lineHeight: "19px", ...priceStyle }}>{price}</td>
                        <td style={{ textAlign: "right", fontWeight: "bold", fontFamily: "monospace", padding: "0 3px", whiteSpace: "nowrap", overflow: "hidden", color: "#000000", lineHeight: "19px", ...lineTotalStyle }}>{lineTotal}</td>
                      </tr>
                    );
                  })}
                  {/* Fila del Total Documento en el extremo inferior derecho con fondo amarillo */}
                  <tr style={{ height: "26px", maxHeight: "26px" }}>
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
              <div style={{ width: "65px", height: "18px", border: "1px solid #000", margin: "0 auto 3px auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8.5px", fontWeight: "bold", background: "#ffffff" }}>
                {resolveSellerCode(quote)}
              </div>
              <div style={{ borderBottom: "1px solid #000", width: "130px", margin: "0 auto 3px auto" }}></div>
              <div style={{ fontSize: "9px", fontWeight: "bold" }}>VENDEDOR</div>
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

      {/* 8. CUENTAS BANCARIAS OFICIALES */}
      <div style={{ border: "1px solid #000", padding: "4px 6px", fontSize: "7px", lineHeight: "1.25", background: "#ffffff" }}>
        <div style={{ fontWeight: "900", textDecoration: "underline", textTransform: "uppercase", marginBottom: "2px" }}>
          CUENTAS PARA DEPOSITOS BANCARIOS:
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "6.5px", fontWeight: "600", color: "#000" }}>
          <tbody>
            <tr>
              <td style={{ width: "36%", verticalAlign: "top" }}>
                <div style={{ fontWeight: "900" }}>Banco de Crédito:</div>
                <div>MN: 191-0104153-0-50</div>
                <div>CCI: 002-191-000104153050-50</div>
                <div>ME: 191-0845766-1-99</div>
                <div>CCI: 002-191-000845766199-52</div>
              </td>
              <td style={{ width: "38%", verticalAlign: "top" }}>
                <div style={{ fontWeight: "900" }}>Banco Continental:</div>
                <div>MN: 0011-0136-0100000938-99</div>
                <div>CCI: 011-136-000100000938-89</div>
                <div>ME: 0011-0136-0100005190-92</div>
                <div>CCI: 011-136-000100005190-92</div>
              </td>
              <td style={{ width: "26%", verticalAlign: "top" }}>
                <div style={{ fontWeight: "900" }}>Scotiabank:</div>
                <div>ME: 000-1245211</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: "center", fontSize: "8px", color: "#000000", fontWeight: "bold", marginTop: "4px" }}>
        1/1
      </div>
    </div>
  );
});

export default QuotePdfDocument;

