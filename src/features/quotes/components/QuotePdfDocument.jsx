import React from "react";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";

const money = (val) => {
  const num = Number(val || 0);
  return num.toFixed(2);
};

export const QuotePdfDocument = React.forwardRef(({ quote, isPrintMode = false }, ref) => {
  if (!quote) return null;

  const client = quote.client || {};
  const products = quote.products || quote.lines || quote.items || [];
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
  const clientCardCode = client.CardCode || quote.clientDocument || quote.clientRuc || "CL72435405";
  const clientName = client.CardName || client.name || quote.clientName || "CLIENTE NO REGISTRADO";
  const clientRuc = client.LicTradNum || client.FederalTaxID || quote.clientRuc || quote.clientDocument || "10724354051";
  const clientAddress = client.Address || client.address || quote.clientAddress || "LA VICTORIA - LIMA";

  // Parseo inteligente de Transporte
  let parsedTransport = quote.selectedTransport || quote.transport;
  if (typeof parsedTransport === "string" && parsedTransport.trim().startsWith("{")) {
    try {
      parsedTransport = JSON.parse(parsedTransport);
    } catch (e) {}
  }

  const transportName = typeof parsedTransport === "object" && parsedTransport !== null
    ? (parsedTransport.Name || parsedTransport.name || parsedTransport.label || "")
    : (parsedTransport || "Cód. 103 - ETTUSA");

  const transportAddress = typeof parsedTransport === "object" && parsedTransport !== null
    ? (parsedTransport.U_TQC_DIREC || parsedTransport.address || quote.transportDirection || "")
    : (quote.transportDirection || "San Vicente de Cañete / Provincia");

  // Parseo inteligente de Punto de Llegada
  let parsedPoint = quote.selectedPoint || quote.deliveryPoint;
  if (typeof parsedPoint === "string" && parsedPoint.trim().startsWith("{")) {
    try {
      parsedPoint = JSON.parse(parsedPoint);
    } catch (e) {}
  }

  const pointOfArrival = typeof parsedPoint === "object" && parsedPoint !== null
    ? (parsedPoint.AddressName || parsedPoint.Street || parsedPoint.label || clientAddress || "")
    : (parsedPoint || clientAddress || "LIMA - SAN VICENTE");

  const opNumberVal = quote.opNum || quote.operationNumber || "";

  // Parseo inteligente de Pago
  let parsedPayment = quote.selectedPaymentType || quote.paymentType;
  if (typeof parsedPayment === "string" && parsedPayment.trim().startsWith("{")) {
    try {
      parsedPayment = JSON.parse(parsedPayment);
    } catch (e) {}
  }

  const bankVal = typeof parsedPayment === "object" && parsedPayment !== null
    ? (parsedPayment.PymntGroup || parsedPayment.PaymentTermsGroupName || parsedPayment.label || "")
    : (parsedPayment || (isContado ? "BCP SOLES" : ""));

  const sellerDisplayName = quote.sellerName || quote.salesPersonName || "540";

  // Totales
  const calcRes = calculateQuoteTotals(products, tcVal);
  const grandTotalUSD = calcRes.grandTotalUSD;

  // Grilla Doble de 30 renglones
  const col1Items = [];
  const col2Items = [];
  for (let i = 0; i < 15; i++) {
    col1Items.push(products[i] || null);
  }
  for (let i = 15; i < 30; i++) {
    col2Items.push(products[i] || null);
  }

  return (
    <div
      ref={ref}
      id="printable-autopartes-document"
      style={{
        width: "100%",
        maxWidth: "800px",
        minHeight: "1120px",
        backgroundColor: "#fffdf7",
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
                style={{ maxHeight: "82px", maxWidth: "100%", display: "inline-block", objectFit: "contain" }}
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* 2. TÍTULO Y NUMERACIÓN (ORDEN DE PEDIDO) */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", marginTop: "2px" }}>
        <tbody>
          <tr>
            <td style={{ width: "120px" }}></td>
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
                color: "#dc2626",
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
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", fontSize: "10px", fontWeight: "bold" }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "middle" }}>
              <span style={{ textDecoration: "underline", padding: "0 4px", fontWeight: "900" }}>{day}</span> de{" "}
              <span style={{ textDecoration: "underline", padding: "0 4px", fontWeight: "900" }}>{monthName}</span> del 20
              <span style={{ textDecoration: "underline", padding: "0 4px", fontWeight: "900" }}>{shortYear}</span>
            </td>
            <td style={{ textAlign: "right", verticalAlign: "middle" }}>
              <span style={{ marginRight: "6px" }}>CODIGO CLIENTE</span>
              <span
                style={{
                  display: "inline-block",
                  border: "1.5px solid #000",
                  backgroundColor: "#ffffff",
                  padding: "2px 10px",
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

      {/* 4. DATOS DEL CLIENTE Y DESPACHO (LÍNEAS DE FORMULARIO SIN TACHADOS) */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", fontSize: "10px", fontWeight: "bold" }}>
        <tbody>
          <tr>
            <td style={{ width: "50px", padding: "3px 0", verticalAlign: "bottom", color: "#000" }}>Sr.(es):</td>
            <td style={{ borderBottom: "1px solid #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "900", fontSize: "10.5px" }}>
              {clientName}
            </td>
            <td style={{ width: "95px", padding: "3px 4px 3px 12px", textAlign: "right", verticalAlign: "bottom", color: "#000" }}>RUC CLIENTE:</td>
            <td style={{ width: "130px", borderBottom: "1px solid #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "900", fontFamily: "monospace", fontSize: "10.5px" }}>
              {clientRuc}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000" }}>Dirección:</td>
            <td colSpan={3} style={{ borderBottom: "1px solid #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
              {clientAddress}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000" }}>Punto de Llegada:</td>
            <td colSpan={3} style={{ borderBottom: "1px solid #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
              {pointOfArrival}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000" }}>Ag. Transportes:</td>
            <td style={{ borderBottom: "1px solid #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
              {transportName}
            </td>
            <td style={{ padding: "3px 4px 3px 12px", textAlign: "right", verticalAlign: "bottom", color: "#000" }}>Dirección:</td>
            <td style={{ borderBottom: "1px solid #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
              {transportAddress}
            </td>
          </tr>
          {(quote.contactPerson || quote.totals?.contactPerson || quote.refNumber || quote.totals?.refNumber) && (
            <tr>
              <td style={{ padding: "3px 0", verticalAlign: "bottom", color: "#000" }}>Contacto:</td>
              <td style={{ borderBottom: "1px solid #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
                {quote.contactPerson || quote.totals?.contactPerson || quote.ContactPerson || "—"}
              </td>
              <td style={{ padding: "3px 4px 3px 12px", textAlign: "right", verticalAlign: "bottom", color: "#000" }}>OC / Ref:</td>
              <td style={{ borderBottom: "1px solid #000", padding: "3px 4px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
                {quote.refNumber || quote.totals?.refNumber || quote.NumAtCard || quote.numAtCard || "—"}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 5. CASILLAS COMERCIALES (TALONARIO) */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000", background: "#fefce8", marginBottom: "8px", fontSize: "9.5px", fontWeight: "bold" }}>
        <tbody>
          <tr>
            {/* Columna 1: CONTADO / CREDITO */}
            <td style={{ padding: "5px 8px", width: "22%", verticalAlign: "middle", borderRight: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ width: "60px" }}>CONTADO</span>
                <span style={{ width: "14px", height: "14px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "900" }}>
                  {isContado ? "X" : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ width: "60px" }}>CREDITO</span>
                <span style={{ width: "14px", height: "14px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "900" }}>
                  {isCredito ? "X" : ""}
                </span>
              </div>
            </td>

            {/* Columna 2: BOLETA / FACTURA */}
            <td style={{ padding: "5px 8px", width: "22%", verticalAlign: "middle", borderRight: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ width: "60px" }}>BOLETA</span>
                <span style={{ width: "14px", height: "14px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "900" }}>
                  {isBoleta ? "X" : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ width: "60px" }}>FACTURA</span>
                <span style={{ width: "14px", height: "14px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "900" }}>
                  {isFactura ? "X" : ""}
                </span>
              </div>
            </td>

            {/* Columna 3: LETRA / PLAZO */}
            <td style={{ padding: "5px 8px", width: "22%", verticalAlign: "middle", borderRight: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ width: "45px" }}>LETRA</span>
                <span style={{ width: "14px", height: "14px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "900" }}>
                  {isLetraDoc ? "X" : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ width: "45px" }}>PLAZO</span>
                <span style={{ border: "1px solid #000", background: "#ffffff", padding: "1px 4px", minWidth: "55px", textAlign: "center", fontSize: "8.5px" }}>
                  {creditTermDoc || (isCredito ? "30 DÍAS" : "—")}
                </span>
              </div>
            </td>

            {/* Columna 4: ABONO / BANCO */}
            <td style={{ padding: "5px 8px", width: "34%", verticalAlign: "middle" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "8px", whiteSpace: "nowrap", marginRight: "4px" }}>ABONO / TRANSF.</span>
                <span style={{ flex: 1, border: "1px solid #000", background: "#fef08a", padding: "1px 4px", textAlign: "center", fontSize: "8.5px", fontFamily: "monospace", fontWeight: "900" }}>
                  {opNumberVal || "—"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: "8px", marginRight: "4px" }}>BCQ</span>
                <span style={{ flex: 1, border: "1px solid #000", background: "#fef08a", padding: "1px 4px", textAlign: "center", fontSize: "8px", fontWeight: "900", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {bankVal || "—"}
                </span>
                <span style={{ fontSize: "8px", margin: "0 4px" }}>CH/</span>
                <span style={{ width: "30px", border: "1px solid #000", background: "#fef08a", padding: "1px 2px", textAlign: "center", fontSize: "8px" }}>
                  —
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 6. TABLA DOBLE DE 30 ARTÍCULOS (HTML TABLE PURA PARA CERO DESCUADRES) */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000", marginBottom: "6px", background: "#ffffff" }}>
        <tbody>
          <tr>
            {/* Mitad Izquierda: Renglones 1 al 15 */}
            <td style={{ width: "50%", verticalAlign: "top", borderRight: "1.5px solid #000", padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th colSpan={5} style={{ background: "#e5e7eb", borderBottom: "1.5px solid #000", textAlign: "center", padding: "2px 0", fontSize: "9.5px", fontWeight: "900", letterSpacing: "1px" }}>
                      ARTICULO
                    </th>
                  </tr>
                  <tr style={{ background: "#f3f4f6", borderBottom: "1.5px solid #000", fontSize: "8px", fontWeight: "900" }}>
                    <th style={{ width: "24px", textAlign: "center", borderRight: "1px solid #000", padding: "2px 0" }}>ITEM</th>
                    <th style={{ width: "30px", textAlign: "center", borderRight: "1px solid #000", padding: "2px 0" }}>CANT.</th>
                    <th style={{ textAlign: "center", borderRight: "1px solid #000", padding: "2px 4px" }}>DESCRIPCION</th>
                    <th style={{ width: "42px", textAlign: "center", borderRight: "1px solid #000", padding: "2px 0" }}>P. UNIT.</th>
                    <th style={{ width: "46px", textAlign: "center", padding: "2px 0" }}>P. TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {col1Items.map((item, idx) => {
                    const itemNum = idx + 1;
                    const qty = item ? Number(item.quantity || 1) : "";
                    const listPrice = item ? Number(item.price || item.unitPrice || 0) : 0;
                    const sapDisc = item ? Number(item.discount || item.sapDiscount || 0) : 0;
                    const addDisc = item ? Number(item.lineDiscount || 0) : 0;
                    const priceAfterSap = listPrice * (1 - sapDisc / 100);
                    const finalUnitPrice = priceAfterSap * (1 - addDisc / 100);
                    const lineTotalNum = item ? (Number(item.quantity || 1) * finalUnitPrice) : 0;

                    const rawName = item ? (item.name || item.productName || item.code || "") : "";
                    let discTag = "";
                    if (sapDisc > 0 && addDisc > 0) {
                      discTag = ` (-${sapDisc}% -${addDisc}%)`;
                    } else if (sapDisc > 0) {
                      discTag = ` (-${sapDisc}%)`;
                    } else if (addDisc > 0) {
                      discTag = ` (-${addDisc}% adic.)`;
                    }
                    const name = rawName ? `${rawName}${discTag}` : "";
                    const price = item ? money(finalUnitPrice) : "";
                    const lineTotal = item ? money(lineTotalNum) : "";

                    return (
                      <tr key={idx} style={{ height: "17px", borderBottom: "1px solid #000", fontSize: "8.5px", background: item ? (idx % 2 === 0 ? "#ffffff" : "#fafaf9") : "transparent" }}>
                        <td style={{ textAlign: "center", borderRight: "1px solid #000", fontWeight: "bold", color: "#000", padding: "0 2px" }}>{itemNum}</td>
                        <td style={{ textAlign: "center", borderRight: "1px solid #000", fontWeight: "bold", color: "#000", padding: "0 2px" }}>{qty}</td>
                        <td style={{ borderRight: "1px solid #000", fontWeight: "bold", padding: "0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px", fontSize: "7.5px" }} title={name}>{name}</td>
                        <td style={{ textAlign: "right", borderRight: "1px solid #000", fontFamily: "monospace", padding: "0 3px" }}>{price ? `$${price}` : ""}</td>
                        <td style={{ textAlign: "right", fontWeight: "bold", fontFamily: "monospace", padding: "0 3px" }}>{lineTotal ? `$${lineTotal}` : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </td>

            {/* Mitad Derecha: Renglones 16 al 30 */}
            <td style={{ width: "50%", verticalAlign: "top", padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th colSpan={5} style={{ background: "#e5e7eb", borderBottom: "1.5px solid #000", textAlign: "center", padding: "2px 0", fontSize: "9.5px", fontWeight: "900", letterSpacing: "1px" }}>
                      ARTICULO
                    </th>
                  </tr>
                  <tr style={{ background: "#f3f4f6", borderBottom: "1.5px solid #000", fontSize: "8px", fontWeight: "900" }}>
                    <th style={{ width: "24px", textAlign: "center", borderRight: "1px solid #000", padding: "2px 0" }}>ITEM</th>
                    <th style={{ width: "30px", textAlign: "center", borderRight: "1px solid #000", padding: "2px 0" }}>CANT.</th>
                    <th style={{ textAlign: "center", borderRight: "1px solid #000", padding: "2px 4px" }}>DESCRIPCION</th>
                    <th style={{ width: "42px", textAlign: "center", borderRight: "1px solid #000", padding: "2px 0" }}>P. UNIT.</th>
                    <th style={{ width: "46px", textAlign: "center", padding: "2px 0" }}>P. TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {col2Items.map((item, idx) => {
                    const itemNum = idx + 16;
                    const qty = item ? Number(item.quantity || 1) : "";
                    const listPrice = item ? Number(item.price || item.unitPrice || 0) : 0;
                    const sapDisc = item ? Number(item.discount || item.sapDiscount || 0) : 0;
                    const addDisc = item ? Number(item.lineDiscount || 0) : 0;
                    const priceAfterSap = listPrice * (1 - sapDisc / 100);
                    const finalUnitPrice = priceAfterSap * (1 - addDisc / 100);
                    const lineTotalNum = item ? (Number(item.quantity || 1) * finalUnitPrice) : 0;

                    const rawName = item ? (item.name || item.productName || item.code || "") : "";
                    let discTag = "";
                    if (sapDisc > 0 && addDisc > 0) {
                      discTag = ` (-${sapDisc}% -${addDisc}%)`;
                    } else if (sapDisc > 0) {
                      discTag = ` (-${sapDisc}%)`;
                    } else if (addDisc > 0) {
                      discTag = ` (-${addDisc}% adic.)`;
                    }
                    const name = rawName ? `${rawName}${discTag}` : "";
                    const price = item ? money(finalUnitPrice) : "";
                    const lineTotal = item ? money(lineTotalNum) : "";

                    return (
                      <tr key={idx} style={{ height: "17px", borderBottom: "1px solid #000", fontSize: "8.5px", background: item ? (idx % 2 === 0 ? "#ffffff" : "#fafaf9") : "transparent" }}>
                        <td style={{ textAlign: "center", borderRight: "1px solid #000", fontWeight: "bold", color: "#000", padding: "0 2px" }}>{itemNum}</td>
                        <td style={{ textAlign: "center", borderRight: "1px solid #000", fontWeight: "bold", color: "#000", padding: "0 2px" }}>{qty}</td>
                        <td style={{ borderRight: "1px solid #000", fontWeight: "bold", padding: "0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px", fontSize: "7.5px" }} title={name}>{name}</td>
                        <td style={{ textAlign: "right", borderRight: "1px solid #000", fontFamily: "monospace", padding: "0 3px" }}>{price ? `$${price}` : ""}</td>
                        <td style={{ textAlign: "right", fontWeight: "bold", fontFamily: "monospace", padding: "0 3px" }}>{lineTotal ? `$${lineTotal}` : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </td>
          </tr>

          {/* Fila del Total Documento en el extremo inferior derecho */}
          <tr>
            <td style={{ borderRight: "1.5px solid #000", background: "#fffdf7" }}></td>
            <td style={{ background: "#fef08a", textAlign: "right", padding: "3px 10px", borderTop: "1.5px solid #000" }}>
              <span style={{ fontWeight: "900", fontSize: "10px", marginRight: "8px" }}>TOTAL $</span>
              <span style={{ fontWeight: "900", fontSize: "13px", fontFamily: "monospace", color: "#000" }}>
                {money(grandTotalUSD)}
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
            <td style={{ width: "30%", verticalAlign: "bottom", padding: "0 8px" }}>
              <div style={{ border: "1.5px solid #000", background: "#ffffff", padding: "2px 8px", fontWeight: "900", fontSize: "11px", marginBottom: "2px" }}>
                {sellerDisplayName}
              </div>
              <div style={{ fontSize: "9px", fontWeight: "900" }}>VENDEDOR</div>
            </td>

            <td style={{ width: "40%", verticalAlign: "bottom", padding: "0 12px" }}>
              <div style={{ borderBottom: "1px solid #000", width: "100%", marginBottom: "2px", height: "16px" }}></div>
              <div style={{ fontSize: "9px", fontWeight: "900" }}>CLIENTE</div>
              <div style={{ fontSize: "8px", color: "#4b5563" }}>(Firma y Sello)</div>
            </td>

            <td style={{ width: "30%", verticalAlign: "bottom", padding: "0 8px" }}>
              <div style={{ border: "1.5px solid #000", background: "#ffffff", padding: "2px 8px", fontWeight: "900", fontSize: "10px", marginBottom: "2px" }}>
                F/N: {docType}
              </div>
              <div style={{ fontSize: "9px", fontWeight: "900" }}>EMISOR</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 8. CUENTAS BANCARIAS OFICIALES */}
      <div style={{ border: "1px solid #000", padding: "4px 6px", fontSize: "7px", lineHeight: "1.25" }}>
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

      <div style={{ textAlign: "center", fontSize: "8px", color: "#6b7280", fontWeight: "bold", marginTop: "4px" }}>
        1/1
      </div>
    </div>
  );
});

export default QuotePdfDocument;

