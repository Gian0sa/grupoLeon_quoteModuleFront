import React from "react";
import { Box, Text, Flex, Grid, Table, Thead, Tbody, Tr, Th, Td, HStack, VStack, TableContainer, useBreakpointValue } from "@chakra-ui/react";
import { numberToWords } from "../../../shared/utils/numberToWords";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";

function formatRucOrDni(val) {
  if (!val) return "S/R";
  const str = String(val).trim();
  const digitsOnly = str.replace(/\D/g, "");
  if (digitsOnly.length === 11) return digitsOnly;
  if (digitsOnly.length === 8) return digitsOnly;
  const clean = str.replace(/^[A-Za-z]+/, "").trim();
  return clean || str;
}

export const QuotePdfDocument = React.forwardRef(({ quote, isPrintMode = false }, ref) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const showMobileCards = isMobile && !isPrintMode;

  if (!quote) return null;

  const docNumber = quote.docNumber || quote.id || quote.docNum || quote.opNum || "COT-000000";
  const clientName = quote.clientName || quote.client?.CardName || quote.client?.name || quote.cardName || "CLIENTE GENERAL";
  const clientAddress = quote.clientAddress || quote.client?.Address || quote.client?.address || quote.client?.raw?.Address || quote.address || "CAR.IQUITOS - NAUTA KM. 1 MZA. B LOTE. 9 A.H. INCA MANCO KALI SAN JUAN BAUTISTA MAYNAS - PERU";
  
  const rawRuc = quote.clientRuc || quote.client?.LicTradNum || quote.client?.raw?.LicTradNum || quote.client?.FederalTaxID || quote.client?.raw?.FederalTaxID || quote.client?.CardCode || quote.client?.cardCode || quote.cardCode || quote.federalTaxID || "";
  const cleanRucDni = formatRucOrDni(rawRuc);
  const rucLabel = cleanRucDni.length === 8 ? "DNI:" : "RUC:";

  const sellerName = quote.sellerName || quote.salesPersonName || quote.createdByUsername || quote.createdByName || quote.user || "Manuel Zapata";
  const docDate = quote.docDate ? String(quote.docDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const docDueDate = quote.docDueDate ? String(quote.docDueDate).slice(0, 10) : docDate;
  const currency = quote.docCurrency || quote.currency || "USD";
  const currencySymbol = currency === "PEN" || currency === "SOLES" ? "S/" : "$";
  const paymentGroup = typeof quote.selectedPaymentType === 'object' 
    ? (quote.selectedPaymentType?.PymntGroup || quote.selectedPaymentType?.PaymentTermsGroupName || "CONTADO")
    : (quote.selectedPaymentType || "CONTADO");
  const refNumber = quote.refNumber || quote.numAtCard || quote.ocNumber || "-";
  const transportName = typeof quote.selectedTransport === 'object' ? (quote.selectedTransport?.Name || quote.selectedTransport?.name || "") : (quote.selectedTransport || "");
  const deliveryFormName = typeof quote.selectedDeliveryForm === 'object' ? (quote.selectedDeliveryForm?.TrnspName || quote.selectedDeliveryForm?.name || "") : (quote.selectedDeliveryForm || "");
  const guiaRemision = transportName || deliveryFormName || "-";

  // Productos y Totales unificados con calculadora global
  const items = quote.products || quote.lines || quote.items || [];
  const tcVal = Number(quote.totals?.tc) || 3.76;
  const calcRes = calculateQuoteTotals(items, tcVal);
  const pdfProducts = calcRes.normalizedProducts;
  const subtotal = calcRes.subtotalUSD;
  const igv = calcRes.igvUSD;
  const total = calcRes.grandTotalUSD;
  const totalInWords = numberToWords(total, currency);

  return (
    <Box
      ref={ref}
      w="100%"
      maxW="210mm"
      minH={{ base: "auto", md: "297mm" }}
      bg="white"
      p={{ base: 2.5, sm: 4, md: "12mm" }}
      fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
      color="#1e293b"
      boxSizing="border-box"
      id="printable-autopartes-document"
    >
      {/* ── ENCABEZADO PRINCIPAL (LOGO Y RUC) ── */}
      <Flex direction={{ base: "column", sm: "row" }} justify="space-between" align={{ base: "stretch", sm: "flex-start" }} gap={{ base: 2, sm: 3 }} mb={2.5}>
        {/* Izquierda: Logo y datos de Autopartes S.A. */}
        <HStack spacing={2.5} align="flex-start">
          <VStack align="center" spacing={0} w={{ base: "65px", sm: "90px" }}>
            <Box textStyle="none">
              <svg width="55" height="40" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M40 10L10 70H30L40 50H60L40 10Z" fill="#0d6334" />
                <path d="M50 30L80 70H60L50 50L50 30Z" fill="#16a34a" />
              </svg>
            </Box>
            <Text fontSize={{ base: "8.5px", sm: "10px" }} fontWeight="900" color="#0d6334" letterSpacing="tight" mt={-1}>
              Autopartes s.a.
            </Text>
          </VStack>

          <VStack align="flex-start" spacing={0.5} pt={0.5}>
            <Text fontSize={{ base: "11px", sm: "14px" }} fontWeight="900" color="#0d6334" letterSpacing="wide">
              AUTOPARTES S.A.
            </Text>
            <Text fontSize={{ base: "8px", sm: "9px" }} color="#475569" fontWeight="600">
              AV. LAS TORRES No 261 URB. INDUSTRIAL LA AURORA - ATE
            </Text>
            <Text fontSize={{ base: "8px", sm: "9px" }} color="#475569" fontWeight="600">
              Teléfono: 324-2600 | E-Mail: ventas@autopartes.pe
            </Text>
          </VStack>
        </HStack>

        {/* Derecha: RUC y Tipo de Documento */}
        <Box
          border="1.5px solid #0d6334"
          borderRadius="md"
          px={{ base: 3, sm: 5 }}
          py={{ base: 1.5, sm: 2 }}
          textAlign="center"
          minW={{ base: "100%", sm: "200px" }}
          bg="#f0fdf4"
        >
          <Text fontSize={{ base: "10.5px", sm: "12px" }} fontWeight="900" color="#1e293b">
            RUC: 20144640269
          </Text>
          <Text fontSize={{ base: "10.5px", sm: "12px" }} fontWeight="900" color="#0d6334" my={0.5} textTransform="uppercase">
            COTIZACIÓN ELECTRÓNICA
          </Text>
          <Text fontSize={{ base: "11.5px", sm: "13px" }} fontWeight="900" color="#1e293b">
            N° {docNumber}
          </Text>
        </Box>
      </Flex>

      {/* ── DATOS DEL CLIENTE Y FECHAS ── */}
      <Box borderTop="1.5px solid #0d6334" borderBottom="1.5px solid #0d6334" py={2} my={2}>
        <Grid templateColumns={{ base: "1fr", sm: "1.2fr 1fr" }} gap={{ base: 1, sm: 2 }} fontSize={{ base: "8.5px", sm: "10px" }} color="#1e293b">
          <VStack align="flex-start" spacing={0.5}>
            <Text><strong>Señores:</strong> {clientName}</Text>
            <Text><strong>Dirección:</strong> {clientAddress}</Text>
            <Text><strong>{rucLabel}</strong> {cleanRucDni}</Text>
            <Text><strong>Forma de Pago:</strong> {paymentGroup}</Text>
            <Text><strong>Vendedor:</strong> {sellerName}</Text>
          </VStack>

          <VStack align="flex-start" spacing={0.5}>
            <Text><strong>Fecha emisión:</strong> {docDate}</Text>
            <Text><strong>Fecha Vencimiento:</strong> {docDueDate}</Text>
            <Text><strong>Moneda:</strong> {currency === "USD" ? "DÓLARES AMERICANOS" : "SOLES"}</Text>
            <Text><strong>O/C:</strong> {refNumber}</Text>
            <Text><strong>Guía de Remisión:</strong> {guiaRemision}</Text>
          </VStack>
        </Grid>
      </Box>

      {/* LEMA OFICIAL */}
      <Text fontSize={{ base: "7px", sm: "8px" }} fontWeight="800" textAlign="center" color="#64748b" textTransform="uppercase" mb={2}>
        AÑO DE LA LUCHA CONTRA LA CORRUPCIÓN Y LA IMPUNIDAD
      </Text>

      {/* ── SECCIÓN DE PRODUCTOS Y VALORES ── */}
      <Box mb={3}>
        {showMobileCards ? (
          /* Vista Móvil: Tarjetas compactas de artículos (Fits 100% on ANY smartphone screen size!) */
          <VStack align="stretch" spacing={1.5}>
            <Flex justify="space-between" bg="#0d6334" color="white" px={2.5} py={1} borderRadius="xs" fontSize="8.5px" fontWeight="800">
              <Text>DESCRIPCIÓN DE PRODUCTOS</Text>
              <Text>VALOR VENTA</Text>
            </Flex>
            {pdfProducts.length > 0 ? (
              pdfProducts.map((it, idx) => {
                const qty = it.quantity;
                const price = it.price;
                const discPercent = it.discountPercent;
                const discVal = it.discountAmount;
                const valVenta = it.lineTotal;

                return (
                  <Box key={idx} p={2} bg="#f8fafc" border="1px solid #cbd5e1" borderRadius="xs" fontSize="8.5px">
                    <Flex justify="space-between" align="flex-start" mb={1}>
                      <Text fontWeight="800" color="#0d6334" maxW="72%" leading="tight">
                        #{idx + 1} {it.itemCode || it.code ? `${it.itemCode || it.code} ` : ''}{it.description || it.ItemDescription || it.name || "PRODUCTO AUTOPARTES"}
                      </Text>
                      <Text fontWeight="900" fontSize="9.5px" color="#0d6334">
                        {currencySymbol} {valVenta.toFixed(2)}
                      </Text>
                    </Flex>
                    <Grid templateColumns="1fr 1.1fr 1.2fr" gap={1} fontSize="7.5px" color="#475569" borderTop="1px dashed #e2e8f0" pt={1}>
                      <Text><strong>Cant:</strong> {qty.toFixed(2)} NIU</Text>
                      <Text><strong>P. Unit:</strong> {currencySymbol}{price.toFixed(2)}</Text>
                      <Text color={discVal > 0 ? "#dc2626" : "inherit"}>
                        <strong>Desc:</strong> {discVal > 0 ? `${discVal.toFixed(2)} (${discPercent}%)` : "0.00"}
                      </Text>
                    </Grid>
                  </Box>
                );
              })
            ) : (
              <Box p={3} textAlign="center" color="#94a3b8" fontSize="8.5px" fontStyle="italic">
                Sin ítems registrados en el documento.
              </Box>
            )}
          </VStack>
        ) : (
          /* Vista Desktop / Impresión PDF: Tabla Oficial A4 de 7 Columnas */
          <TableContainer overflowX="auto" w="100%">
            <Table size="xs" variant="simple" style={{ width: "100%" }}>
              <Thead bg="#0d6334">
                <Tr>
                  <Th color="white" fontSize="9px" fontWeight="800" w="5%">ID</Th>
                  <Th color="white" fontSize="9px" fontWeight="800" w="8%" isNumeric>Cant.</Th>
                  <Th color="white" fontSize="9px" fontWeight="800" w="10%">Unidad Medida</Th>
                  <Th color="white" fontSize="9px" fontWeight="800" w="40%">Descripción</Th>
                  <Th color="white" fontSize="9px" fontWeight="800" w="12%" isNumeric>Valor Unitario</Th>
                  <Th color="white" fontSize="9px" fontWeight="800" w="12%" isNumeric>Descuento</Th>
                  <Th color="white" fontSize="9px" fontWeight="800" w="13%" isNumeric>Valor Venta</Th>
                </Tr>
              </Thead>
              <Tbody fontSize="9px">
                {pdfProducts.length > 0 ? (
                  pdfProducts.map((it, idx) => {
                    const qty = it.quantity;
                    const price = it.price;
                    const discPercent = it.discountPercent;
                    const discVal = it.discountAmount;
                    const valVenta = it.lineTotal;

                    return (
                      <Tr key={idx} _hover={{ bg: "#f8fafc" }}>
                        <Td py={1.5} color="#475569">{idx + 1}</Td>
                        <Td py={1.5} isNumeric fontWeight="700">{qty.toFixed(2)}</Td>
                        <Td py={1.5} color="#475569">NIU</Td>
                        <Td py={1.5} fontWeight="700">{it.itemCode || it.code ? `${it.itemCode || it.code} ` : ''}{it.description || it.ItemDescription || it.name || "PRODUCTO AUTOPARTES"}</Td>
                        <Td py={1.5} isNumeric>{price.toFixed(2)}</Td>
                        <Td py={1.5} isNumeric color="#dc2626">{discVal > 0 ? `${discVal.toFixed(2)} (${discPercent}%)` : "0.00"}</Td>
                        <Td py={1.5} isNumeric fontWeight="800">{valVenta.toFixed(2)}</Td>
                      </Tr>
                    );
                  })
                ) : (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={4} color="#94a3b8" fontStyle="italic">
                      Sin ítems registrados en el documento.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* ── CUADRO MONTO EN LETRAS, OBSERVACIONES Y TOTALES ── */}
      <Grid templateColumns={{ base: "1fr", md: "1fr 230px" }} gap={{ base: 2, md: 3 }} mb={2.5} align="flex-start">
        {/* Izquierda: Letras + Observación */}
        <VStack align="stretch" spacing={1.5}>
          <Box border="1.5px solid #0d6334" borderRadius="md" p={{ base: 1.5, sm: 2.5 }} bg="#f0fdf4">
            <Text fontSize={{ base: "8.5px", sm: "10px" }} fontWeight="900" color="#0d6334" textTransform="uppercase">
              {totalInWords}
            </Text>
          </Box>

          <Text fontSize={{ base: "8px", sm: "9px" }} color="#334155">
            <strong>Observación:</strong> {quote.comment || quote.comments || `02) ${paymentGroup} / Anticipado`}
          </Text>
        </VStack>

        {/* Derecha: Resumen de Totales */}
        <VStack align="stretch" spacing={0.5} fontSize={{ base: "8.5px", sm: "10px" }} bg="#f8fafc" p={{ base: 2, sm: 3 }} borderRadius="md" border="1px solid #e2e8f0">
          <Flex justify="space-between">
            <Text color="#475569" fontWeight="700">Total Venta Gravada</Text>
            <Text fontWeight="800">{currencySymbol} {subtotal.toFixed(2)}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text color="#475569" fontWeight="700">Total IGV (18%)</Text>
            <Text fontWeight="800">{currencySymbol} {igv.toFixed(2)}</Text>
          </Flex>
          <Box borderBottom="1.5px solid #0d6334" my={0.5} />
          <Flex justify="space-between" fontSize={{ base: "9.5px", sm: "11px" }} color="#0d6334">
            <Text fontWeight="900">Importe Total de la Venta</Text>
            <Text fontWeight="900">{currencySymbol} {total.toFixed(2)}</Text>
          </Flex>
        </VStack>
      </Grid>

      {/* ── PIE DE PÁGINA DOCUMENTO INFORMATIVO PROFORMA ── */}
      <Box borderTop="1.5px solid #0d6334" pt={2} mt="auto">
        <Text fontSize={{ base: "7px", sm: "8px" }} color="#475569" textAlign="center" fontWeight="700" mb={1.5}>
          Documento Informativo — Cotización de Venta previa a la Emisión de Orden de Pedido / Comprobante en SAP B1
        </Text>

        <Flex direction={{ base: "column", sm: "row" }} justify="space-between" align="center" gap={1.5}>
          {/* Logos de Marcas Representadas */}
          <HStack spacing={1.5} flexWrap="wrap" justify="center">
            <Box px={1.5} py={0.5} bg="#dcfce7" border="1px solid #86efac" borderRadius="xs">
              <Text fontSize="7px" fontWeight="900" color="#166534">DARUMA FILTROS</Text>
            </Box>
            <Box px={1.5} py={0.5} bg="#dbeafe" border="1px solid #93c5fd" borderRadius="xs">
              <Text fontSize="7px" fontWeight="900" color="#1e40af">FilPower</Text>
            </Box>
            <Box px={1.5} py={0.5} bg="#ffe4e6" border="1px solid #fecdd3" borderRadius="xs">
              <Text fontSize="7px" fontWeight="900" color="#9f1239">WYNN'S</Text>
            </Box>
            <Box px={1.5} py={0.5} bg="#ccfbf1" border="1px solid #99f6e4" borderRadius="xs">
              <Text fontSize="7px" fontWeight="900" color="#115e59">SF SURE FILTER</Text>
            </Box>
          </HStack>

          {/* Sello Corporativo Proforma */}
          <Box border="1.5px solid #0d6334" px={2.5} py={0.5} borderRadius="xs" bg="#f0fdf4" textAlign="center">
            <Text fontSize="7.5px" fontWeight="900" color="#0d6334">AUTOPARTES S.A.</Text>
            <Text fontSize="6.5px" color="#166534" fontWeight="800">COTIZACIÓN / PROFORMA</Text>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
});

export default QuotePdfDocument;
