import React, { useRef } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Box,
  Flex,
  Text,
  Heading,
  HStack,
  VStack,
  Divider,
  Badge,
  Grid,
  Image
} from "@chakra-ui/react";
import { Printer, Download, Eye, CheckCircle2, FileText, Share2, Edit3, Check } from "lucide-react";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";

const money = (val) => {
  const num = Number(val || 0);
  return num.toFixed(2);
};

export function SapQuoteDocumentModal({ isOpen, onClose, quote, onLoadToForm }) {
  const printRef = useRef(null);

  if (!quote) return null;

  const client = quote.client || {};
  const products = quote.products || quote.items || [];
  const tc = Number(quote.totals?.tc || 3.76);
  const calcTotals = calculateQuoteTotals(products, tc);

  // Datos Comerciales Normalizados
  const docType = String(quote.documentType || quote.tipoComprobante || quote.docTypeVenta || "FACTURA").toUpperCase();
  const saleCond = String(quote.saleCondition || quote.condicionVenta || quote.condicionPago || "CONTADO").toUpperCase();
  const isLetraDoc = Boolean(quote.isLetra || quote.hasLetra || quote.letra);
  const creditTermDoc = quote.creditTerm || quote.plazo || "";

  const isContado = saleCond === "CONTADO";
  const isCredito = saleCond === "CREDITO";
  const isBoleta = docType === "BOLETA";
  const isFactura = docType === "FACTURA";

  // Fecha desglosada
  const dateObj = quote.docDate ? new Date(quote.docDate) : new Date();
  const day = !isNaN(dateObj.getDate()) ? String(dateObj.getDate()).padStart(2, "0") : String(new Date().getDate()).padStart(2, "0");
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];
  const monthName = !isNaN(dateObj.getMonth()) ? months[dateObj.getMonth()] : months[new Date().getMonth()];
  const fullYear = !isNaN(dateObj.getFullYear()) ? String(dateObj.getFullYear()) : String(new Date().getFullYear());
  const shortYear = fullYear.slice(-2);

  // Datos del Cliente y Despacho
  const clientCardCode = client.CardCode || quote.clientDocument || quote.clientRuc || "CL72435405";
  const clientName = client.CardName || client.name || quote.clientName || "CLIENTE NO REGISTRADO";
  const clientRuc = client.LicTradNum || client.FederalTaxID || quote.clientRuc || quote.clientDocument || "10724354051";
  const clientAddress = client.Address || client.address || quote.clientAddress || "LA VICTORIA - LIMA";

  // Parseo inteligente y seguro de Transporte (objeto, JSON string o texto plano)
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

  // Parseo inteligente de Término / Medio de Pago
  let parsedPayment = quote.selectedPaymentType || quote.paymentType;
  if (typeof parsedPayment === "string" && parsedPayment.trim().startsWith("{")) {
    try {
      parsedPayment = JSON.parse(parsedPayment);
    } catch (e) {}
  }

  const bankVal = typeof parsedPayment === "object" && parsedPayment !== null
    ? (parsedPayment.PymntGroup || parsedPayment.PaymentTermsGroupName || parsedPayment.label || "")
    : (parsedPayment || (isContado ? "BCP SOLES" : ""));

  // Totales precisos
  const grandTotalUSD = quote.totals?.grandTotalUSD || quote.totals?.grandTotal || calcTotals.grandTotalUSD;
  const grandTotalSOL = quote.totals?.grandTotalSOL || calcTotals.grandTotalSOL;

  // División de ítems para Grilla Doble de 30 renglones (1-15 y 16-30)
  const col1Items = [];
  const col2Items = [];
  for (let i = 0; i < 15; i++) {
    col1Items.push(products[i] || null);
  }
  for (let i = 15; i < 30; i++) {
    col2Items.push(products[i] || null);
  }

  const handlePrint = () => {
    window.print();
  };

  const sellerDisplayName = quote.sellerName || quote.salesPersonName || "540";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)" />
      <ModalContent borderRadius="2xl" overflow="hidden" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.35)">
        <ModalHeader bg="#0f4c28" color="white" py={3.5} px={6} display="flex" alignItems="center" justifyContent="space-between">
          <HStack spacing={3}>
            <FileText className="w-6 h-6 text-emerald-300" />
            <Box>
              <Heading size="sm" color="white" fontWeight="800">
                Talonario Oficial — ORDEN DE PEDIDO
              </Heading>
              <Text fontSize="xs" color="emerald.100">
                Formato Canónico Autopartes S.A. / Grupo León (Boleta / Factura de Venta)
              </Text>
            </Box>
          </HStack>
          <ModalCloseButton color="white" position="static" />
        </ModalHeader>

        <ModalBody p={{ base: 2, md: 6 }} bg="gray.100" id="sap-print-area" ref={printRef}>
          {/* Estilos de Impresión A4 Profesionales */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 4mm 5mm 4mm 5mm;
              }
              html, body {
                height: auto !important;
                min-height: 100% !important;
                overflow: visible !important;
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              /* Ocultar elementos ajenos al modal */
              body > *:not(.chakra-portal),
              .chakra-modal__overlay,
              .chakra-modal__header,
              .chakra-modal__footer,
              .chakra-modal__close-btn,
              .no-print {
                display: none !important;
              }
              .chakra-portal,
              .chakra-portal > * {
                display: block !important;
                position: static !important;
                overflow: visible !important;
                height: auto !important;
                width: 100% !important;
              }
              .chakra-modal__content-container {
                position: static !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .chakra-modal__content {
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
                background: transparent !important;
              }
              .chakra-modal__body,
              #sap-print-area {
                position: static !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
                background: transparent !important;
              }
              #sap-talonario-container {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 10px !important;
                box-shadow: none !important;
                border: 1.5px solid #000 !important;
                background: #fffdf7 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                page-break-inside: avoid !important;
              }
            }
          `}</style>

          {/* CONTENEDOR TALONARIO FÍSICO AMARILLO / PARCHMENT */}
          <Box
            id="sap-talonario-container"
            bg="#fffdf7"
            p={{ base: 4, md: 5 }}
            borderRadius="lg"
            border="2px solid"
            borderColor="#d4c5a9"
            boxShadow="md"
            fontFamily="'Arial', 'Helvetica', sans-serif"
            color="#111827"
            maxW="900px"
            mx="auto"
          >
            {/* 1. CABECERA: MEMBRETE AUTOPARTES S.A. (IZQUIERDA) + MARCAS DISTRIBUIDAS (DERECHA) */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
              <tbody>
                <tr>
                  <td style={{ width: "240px", verticalAlign: "top" }}>
                    <img
                      src="/assets/logo.svg"
                      alt="Autopartes S.A."
                      style={{ height: "26px", objectFit: "contain", marginBottom: "4px", display: "block" }}
                    />
                    <div style={{ fontSize: "8px", color: "#166534", fontWeight: "bold", lineHeight: "1.25" }}>
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
                      style={{ maxHeight: "86px", maxWidth: "100%", display: "inline-block", objectFit: "contain" }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2. TÍTULO Y NUMERACIÓN (ORDEN DE PEDIDO) */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px", marginTop: "2px" }}>
              <tbody>
                <tr>
                  <td style={{ width: "120px" }}></td>
                  <td
                    style={{
                      textAlign: "center",
                      color: "#0f5132",
                      fontSize: "22px",
                      fontWeight: "900",
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      letterSpacing: "4px",
                      textTransform: "uppercase",
                    }}
                  >
                    ORDEN DE PEDIDO
                  </td>
                  <td
                    style={{
                      width: "160px",
                      textAlign: "right",
                      color: "#dc2626",
                      fontWeight: "900",
                      fontSize: "16px",
                      fontFamily: "'Courier New', Courier, monospace",
                    }}
                  >
                    Nº {quote.docNumber || quote.id || "065026"}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 3. FECHA Y CÓDIGO DE CLIENTE */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px", fontSize: "11px", fontWeight: "bold" }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "middle" }}>
                    <span style={{ textDecoration: "underline", padding: "0 4px", fontWeight: "900" }}>{day}</span> de{" "}
                    <span style={{ textDecoration: "underline", padding: "0 4px", fontWeight: "900" }}>{monthName}</span> del 20
                    <span style={{ textDecoration: "underline", padding: "0 4px", fontWeight: "900" }}>{shortYear}</span>
                  </td>
                  <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                    <span style={{ marginRight: "8px" }}>CODIGO CLIENTE</span>
                    <span
                      style={{
                        display: "inline-block",
                        border: "1.5px solid #000",
                        backgroundColor: "#ffffff",
                        padding: "3px 12px",
                        minWidth: "140px",
                        textAlign: "center",
                        fontFamily: "monospace",
                        fontWeight: "900",
                        fontSize: "12px",
                      }}
                    >
                      {clientCardCode}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 4. DATOS DEL CLIENTE Y DESPACHO (LÍNEAS DE FORMULARIO SIN TACHADOS) */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px", fontSize: "11px", fontWeight: "bold" }}>
              <tbody>
                <tr>
                  <td style={{ width: "55px", padding: "4px 0", verticalAlign: "bottom", color: "#000" }}>Sr.(es):</td>
                  <td style={{ borderBottom: "1px solid #000", padding: "4px 6px", verticalAlign: "bottom", color: "#000", fontWeight: "900", fontSize: "11.5px" }}>
                    {clientName}
                  </td>
                  <td style={{ width: "105px", padding: "4px 6px 4px 16px", textAlign: "right", verticalAlign: "bottom", color: "#000" }}>RUC CLIENTE:</td>
                  <td style={{ width: "140px", borderBottom: "1px solid #000", padding: "4px 6px", verticalAlign: "bottom", color: "#000", fontWeight: "900", fontFamily: "monospace", fontSize: "11.5px" }}>
                    {clientRuc}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0", verticalAlign: "bottom", color: "#000" }}>Dirección:</td>
                  <td colSpan={3} style={{ borderBottom: "1px solid #000", padding: "4px 6px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
                    {clientAddress}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0", verticalAlign: "bottom", color: "#000" }}>Punto de Llegada:</td>
                  <td colSpan={3} style={{ borderBottom: "1px solid #000", padding: "4px 6px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
                    {pointOfArrival}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0", verticalAlign: "bottom", color: "#000" }}>Ag. Transportes:</td>
                  <td style={{ borderBottom: "1px solid #000", padding: "4px 6px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
                    {transportName}
                  </td>
                  <td style={{ padding: "4px 6px 4px 16px", textAlign: "right", verticalAlign: "bottom", color: "#000" }}>Dirección:</td>
                  <td style={{ borderBottom: "1px solid #000", padding: "4px 6px", verticalAlign: "bottom", color: "#000", fontWeight: "600" }}>
                    {transportAddress}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 5. CASILLAS COMERCIALES (TALONARIO) */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000", background: "#fefce8", marginBottom: "10px", fontSize: "10.5px", fontWeight: "bold" }}>
              <tbody>
                <tr>
                  {/* Columna 1: CONTADO / CREDITO */}
                  <td style={{ padding: "6px 10px", width: "22%", verticalAlign: "middle", borderRight: "1px solid #e5e7eb" }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ width: "65px" }}>CONTADO</span>
                      <span style={{ width: "16px", height: "16px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>
                        {isContado ? "X" : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ width: "65px" }}>CREDITO</span>
                      <span style={{ width: "16px", height: "16px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>
                        {isCredito ? "X" : ""}
                      </span>
                    </div>
                  </td>

                  {/* Columna 2: BOLETA / FACTURA */}
                  <td style={{ padding: "6px 10px", width: "22%", verticalAlign: "middle", borderRight: "1px solid #e5e7eb" }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ width: "65px" }}>BOLETA</span>
                      <span style={{ width: "16px", height: "16px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>
                        {isBoleta ? "X" : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ width: "65px" }}>FACTURA</span>
                      <span style={{ width: "16px", height: "16px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>
                        {isFactura ? "X" : ""}
                      </span>
                    </div>
                  </td>

                  {/* Columna 3: LETRA / PLAZO */}
                  <td style={{ padding: "6px 10px", width: "22%", verticalAlign: "middle", borderRight: "1px solid #e5e7eb" }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ width: "50px" }}>LETRA</span>
                      <span style={{ width: "16px", height: "16px", border: "1.5px solid #000", background: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "900" }}>
                        {isLetraDoc ? "X" : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ width: "50px" }}>PLAZO</span>
                      <span style={{ border: "1px solid #000", background: "#ffffff", padding: "1px 6px", minWidth: "65px", textAlign: "center", fontSize: "9.5px" }}>
                        {creditTermDoc || (isCredito ? "30 DÍAS" : "—")}
                      </span>
                    </div>
                  </td>

                  {/* Columna 4: ABONO / BANCO */}
                  <td style={{ padding: "6px 10px", width: "34%", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "9px", whiteSpace: "nowrap", marginRight: "6px" }}>ABONO / TRANSF.</span>
                      <span style={{ flex: 1, border: "1px solid #000", background: "#fef08a", padding: "1px 6px", textAlign: "center", fontSize: "9.5px", fontFamily: "monospace", fontWeight: "900" }}>
                        {opNumberVal || "—"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: "9px", marginRight: "6px" }}>BCQ</span>
                      <span style={{ flex: 1, border: "1px solid #000", background: "#fef08a", padding: "1px 6px", textAlign: "center", fontSize: "8.5px", fontWeight: "900", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {bankVal || "—"}
                      </span>
                      <span style={{ fontSize: "9px", margin: "0 6px" }}>CH/</span>
                      <span style={{ width: "35px", border: "1px solid #000", background: "#fef08a", padding: "1px 2px", textAlign: "center", fontSize: "9px" }}>
                        —
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 6. TABLA DOBLE DE 30 ARTÍCULOS (HTML TABLE PURA PARA CERO DESCUADRES) */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000", marginBottom: "8px", background: "#ffffff" }}>
              <tbody>
                <tr>
                  {/* Mitad Izquierda: Renglones 1 al 15 */}
                  <td style={{ width: "50%", verticalAlign: "top", borderRight: "1.5px solid #000", padding: 0 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th colSpan={5} style={{ background: "#e5e7eb", borderBottom: "1.5px solid #000", textAlign: "center", padding: "3px 0", fontSize: "10.5px", fontWeight: "900", letterSpacing: "1px" }}>
                            ARTICULO
                          </th>
                        </tr>
                        <tr style={{ background: "#f3f4f6", borderBottom: "1.5px solid #000", fontSize: "9px", fontWeight: "900" }}>
                          <th style={{ width: "26px", textAlign: "center", borderRight: "1px solid #000", padding: "2px 0" }}>ITEM</th>
                          <th style={{ width: "32px", textAlign: "center", borderRight: "1px solid #000", padding: "2px 0" }}>CANT.</th>
                          <th style={{ textAlign: "center", borderRight: "1px solid #000", padding: "2px 4px" }}>DESCRIPCION</th>
                          <th style={{ width: "46px", textAlign: "center", borderRight: "1px solid #000", padding: "2px 0" }}>P. UNIT.</th>
                          <th style={{ width: "50px", textAlign: "center", padding: "2px 0" }}>P. TOTAL</th>
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
                            <tr key={idx} style={{ height: "18px", borderBottom: "1px solid #000", fontSize: "9px", background: item ? (idx % 2 === 0 ? "#ffffff" : "#fafaf9") : "transparent" }}>
                              <td style={{ textAlign: "center", borderRight: "1px solid #000", fontWeight: "bold", color: "#000", padding: "0 2px" }}>{itemNum}</td>
                              <td style={{ textAlign: "center", borderRight: "1px solid #000", fontWeight: "bold", color: "#000", padding: "0 2px" }}>{qty}</td>
                              <td style={{ borderRight: "1px solid #000", fontWeight: "bold", padding: "0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "170px", fontSize: "8px" }} title={name}>{name}</td>
                              <td style={{ textAlign: "right", borderRight: "1px solid #000", fontFamily: "monospace", padding: "0 4px" }}>{price ? `$${price}` : ""}</td>
                              <td style={{ textAlign: "right", fontWeight: "bold", fontFamily: "monospace", padding: "0 4px" }}>{lineTotal ? `$${lineTotal}` : ""}</td>
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
                          <th colSpan={5} style={{ background: "#e5e7eb", borderBottom: "1.5px solid #000", textAlign: "center", padding: "3px 0", fontSize: "10.5px", fontWeight: "900", letterSpacing: "1px" }}>
                            ARTICULO
                          </th>
                        </tr>
                        <tr style={{ background: "#f3f4f6", borderBottom: "1.5px solid #000", fontSize: "9px", fontWeight: "900" }}>
                          <th style={{ width: "26px", textAlign: "center", borderRight: "1px solid #000", padding: "2px 0" }}>ITEM</th>
                          <th style={{ width: "32px", textAlign: "center", borderRight: "1px solid #000", padding: "2px 0" }}>CANT.</th>
                          <th style={{ textAlign: "center", borderRight: "1px solid #000", padding: "2px 4px" }}>DESCRIPCION</th>
                          <th style={{ width: "46px", textAlign: "center", borderRight: "1px solid #000", padding: "2px 0" }}>P. UNIT.</th>
                          <th style={{ width: "50px", textAlign: "center", padding: "2px 0" }}>P. TOTAL</th>
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
                            <tr key={idx} style={{ height: "18px", borderBottom: "1px solid #000", fontSize: "9px", background: item ? (idx % 2 === 0 ? "#ffffff" : "#fafaf9") : "transparent" }}>
                              <td style={{ textAlign: "center", borderRight: "1px solid #000", fontWeight: "bold", color: "#000", padding: "0 2px" }}>{itemNum}</td>
                              <td style={{ textAlign: "center", borderRight: "1px solid #000", fontWeight: "bold", color: "#000", padding: "0 2px" }}>{qty}</td>
                              <td style={{ borderRight: "1px solid #000", fontWeight: "bold", padding: "0 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "170px", fontSize: "8px" }} title={name}>{name}</td>
                              <td style={{ textAlign: "right", borderRight: "1px solid #000", fontFamily: "monospace", padding: "0 4px" }}>{price ? `$${price}` : ""}</td>
                              <td style={{ textAlign: "right", fontWeight: "bold", fontFamily: "monospace", padding: "0 4px" }}>{lineTotal ? `$${lineTotal}` : ""}</td>
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
                  <td style={{ background: "#fef08a", textAlign: "right", padding: "4px 12px", borderTop: "1.5px solid #000" }}>
                    <span style={{ fontWeight: "900", fontSize: "11px", marginRight: "10px" }}>TOTAL $</span>
                    <span style={{ fontWeight: "900", fontSize: "14px", fontFamily: "monospace", color: "#000" }}>
                      {money(grandTotalUSD)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 7. ADVERTENCIA LEGAL Y FIRMAS */}
            <div style={{ fontSize: "9px", fontWeight: "900", textAlign: "center", margin: "6px 0", letterSpacing: "1px" }}>
              ANTES DE FIRMAR LEER CONDICIONES AL DORSO
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px", textAlign: "center" }}>
              <tbody>
                <tr>
                  <td style={{ width: "30%", verticalAlign: "bottom", padding: "0 10px" }}>
                    <div style={{ border: "1.5px solid #000", background: "#ffffff", padding: "3px 10px", fontWeight: "900", fontSize: "12px", marginBottom: "2px" }}>
                      {sellerDisplayName}
                    </div>
                    <div style={{ fontSize: "10px", fontWeight: "900" }}>VENDEDOR</div>
                  </td>

                  <td style={{ width: "40%", verticalAlign: "bottom", padding: "0 16px" }}>
                    <div style={{ borderBottom: "1px solid #000", width: "100%", marginBottom: "2px", height: "18px" }}></div>
                    <div style={{ fontSize: "10px", fontWeight: "900" }}>CLIENTE</div>
                    <div style={{ fontSize: "8.5px", color: "#4b5563" }}>(Firma y Sello)</div>
                  </td>

                  <td style={{ width: "30%", verticalAlign: "bottom", padding: "0 10px" }}>
                    <div style={{ border: "1.5px solid #000", background: "#ffffff", padding: "3px 10px", fontWeight: "900", fontSize: "11px", marginBottom: "2px" }}>
                      F/N: {docType}
                    </div>
                    <div style={{ fontSize: "10px", fontWeight: "900" }}>EMISOR</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 8. CUENTAS BANCARIAS OFICIALES */}
            <div style={{ border: "1px solid #000", padding: "6px 8px", fontSize: "8px", lineHeight: "1.3" }}>
              <div style={{ fontWeight: "900", textDecoration: "underline", textTransform: "uppercase", marginBottom: "3px" }}>
                CUENTAS PARA DEPOSITOS BANCARIOS:
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7.5px", fontWeight: "600", color: "#000" }}>
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

            <div style={{ textAlign: "center", fontSize: "9px", color: "#6b7280", fontWeight: "bold", marginTop: "6px" }}>
              1/1
            </div>
          </Box>
        </ModalBody>

        <ModalFooter bg="white" borderTop="1px solid" borderColor="gray.200" py={3} px={6} display="flex" justify="space-between">
          <HStack spacing={2}>
            {onLoadToForm && (
              <Button
                colorScheme="blue"
                variant="outline"
                size="sm"
                leftIcon={<Edit3 className="w-4 h-4" />}
                onClick={() => {
                  onLoadToForm(quote);
                  onClose();
                }}
              >
                Cargar en Formulario
              </Button>
            )}
          </HStack>

          <HStack spacing={3}>
            <Button
              colorScheme="teal"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              Imprimir / Guardar PDF (Talonario)
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default SapQuoteDocumentModal;
