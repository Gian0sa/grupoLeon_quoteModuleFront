import React, { useState } from "react";
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Circle,
  useColorModeValue,
  Spinner,
  Badge,
  Button,
  useToast,
} from "@chakra-ui/react";
import { Check, Download } from "lucide-react";
import {
  useGetCompareOrderAndDeliveryNote,
  useGetDeliveryNoteByCode,
  useGetInvoiceByCode,
  useGetOrderByCode,
  useGetSeguimientoAlmacen,
} from "../hooks/queries/reportQueries";
import { getInvoiceByCode } from "../services/reportService";
import { downloadInvoicePDFdirectly } from "../utils/pdfGenerators";

// Etapas de la entrega dentro de almacén (las devuelve el módulo de almacén)
const ETAPAS_ALMACEN = {
  SIN_INICIAR: { color: "gray", texto: "Almacén aún no la inicia" },
  EN_PROCESO: { color: "orange", texto: "En proceso (no liberada)" },
  ANULADA: { color: "red", texto: "Anulada" },
  PENDIENTE_PICKING: { color: "yellow", texto: "Pendiente de picking" },
  PICKING_VALIDADO: { color: "teal", texto: "Picking validado" },
  EN_EMBALAJE: { color: "blue", texto: "En embalaje" },
  LISTA_DESPACHO: { color: "purple", texto: "Embalada · lista para salir" },
  DESPACHADA: { color: "green", texto: "Despachada en camión" },
  ENTREGADA_TIENDA: { color: "green", texto: "Entregada en tienda" },
};

const getOrdinalEntregaLabel = (index) => {
  if (index === 1) return "1ra Entrega";
  if (index === 2) return "2da Entrega";
  if (index === 3) return "3ra Entrega";
  return `${index}ta Entrega`;
};

export default function TrackingPage({ orden, data }) {
  const [loadingFacturaId, setLoadingFacturaId] = useState(null);
  const toast = useToast();

  // Responsive values
  const bgMain = useColorModeValue("white", "gray.800");
  const bgSection = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textMuted = useColorModeValue("gray.600", "gray.400");
  const textBase = useColorModeValue("gray.800", "white");
  const pendingRowBg = useColorModeValue("amber.50", "orange.950");

  // Extraer moneda y tipo de cambio oficial
  const rawOrderCurrency =
    orden?.currency ||
    orden?.MoneyDocument ||
    orden?.DocCurrency;
  const orderCurrency = String(
    rawOrderCurrency ||
    (orden?.totals?.grandTotalUSD && !orden?.totals?.grandTotalSOL ? "USD" : "SOL")
  ).toUpperCase();
  const isUSD = orderCurrency === "USD" || orderCurrency === "$" || orderCurrency === "US$";
  const docRate = Number(orden?.DocRate || orden?.totals?.tc || 3.49);

  // Extraer monto USD asegurando que traiga con prioridad absoluta el monto oficial registrado en SAP
  const extractUsdAmount = () => {
    if (orden?.DocTotalFc && Number(orden.DocTotalFc) > 0) {
      return Number(orden.DocTotalFc);
    }
    if (orden?.DocTotalSys && Number(orden.DocTotalSys) > 0) {
      return Number(orden.DocTotalSys);
    }
    if (orden?.DocTotalUSD && Number(orden.DocTotalUSD) > 0) {
      return Number(orden.DocTotalUSD);
    }
    if (orden?.totals?.grandTotalUSD && Number(orden.totals.grandTotalUSD) > 0) {
      return Number(orden.totals.grandTotalUSD);
    }
    const rawTotal = Number(orden?.DocTotal || orden?.OrderAmount || 0);
    if (isUSD && rawTotal > 0) {
      if (docRate > 1.2) {
        return Number((rawTotal / docRate).toFixed(2));
      }
      return rawTotal;
    }
    return 0;
  };

  const calculatedUsd = extractUsdAmount();

  // Mapear datos de la orden
  const ordenData = {
    id: orden?.DocEntry || orden?.orden?.id || orden?.sapDocNum || orden?.DocNum,
    numero: orden?.DocNum || orden?.orden?.numero || orden?.sapDocNum || orden?.docNumber,
    fechaCreacion: orden?.DocDate
      ? new Date(orden.DocDate + "T00:00:00").toLocaleDateString("es-ES")
      : (orden?.docDate ? String(orden.docDate).split("T")[0] : ""),
    montoUsd: calculatedUsd,
  };

  const clienteData = {
    nombre: orden?.CardName || "",
    codigo: orden?.CardCode || "",
  };

  // Extraer todas las entregas únicas ordenadas cronológicamente
  const entregasMap = new Map();
  (Array.isArray(data) ? data : []).forEach((item) => {
    if (item?.DELIVERY_ENTRY) {
      const key = String(item.DELIVERY_ENTRY);
      if (!entregasMap.has(key)) {
        entregasMap.set(key, {
          id: item.DELIVERY_ENTRY,
          docNum: item.DELIVERY_DOC_NUM,
          currency: item.DELIVERY_CURRENCY,
          rawDate: item.DELIVERY_DATE,
          fecha: item.DELIVERY_DATE
            ? new Date(
                String(item.DELIVERY_DATE).includes("T")
                  ? item.DELIVERY_DATE
                  : `${item.DELIVERY_DATE}T00:00:00`
              ).toLocaleDateString("es-ES")
            : "--",
          monto: item.MONTO_DELIVERYNOTE || 0,
          montoUsd: item.MONTO_DELIVERYNOTE_USD,
          lines: Array.isArray(item.DELIVERY_LINES) ? item.DELIVERY_LINES : [],
          almacen: item.ALMACEN_TRACKING || null,
          facturaId: item.INVOICE_ENTRY || null,
          facturaNumAtCard: item.INVOICE_NUM_AT_CARD || null,
          facturaDocNum: item.INVOICE_DOC_NUM || null,
        });
      } else {
        const existing = entregasMap.get(key);
        if (!existing.facturaId && item.INVOICE_ENTRY) {
          existing.facturaId = item.INVOICE_ENTRY;
          existing.facturaNumAtCard = item.INVOICE_NUM_AT_CARD || existing.facturaNumAtCard;
          existing.facturaDocNum = item.INVOICE_DOC_NUM || existing.facturaDocNum;
        }
        if (!existing.almacen && item.ALMACEN_TRACKING) {
          existing.almacen = item.ALMACEN_TRACKING;
        }
        if ((!existing.lines || existing.lines.length === 0) && Array.isArray(item.DELIVERY_LINES) && item.DELIVERY_LINES.length > 0) {
          existing.lines = item.DELIVERY_LINES;
        }
      }
    }
  });
  const entregas = Array.from(entregasMap.values())
    .sort((a, b) => {
      const da = a.rawDate ? new Date(a.rawDate).getTime() : 0;
      const db = b.rawDate ? new Date(b.rawDate).getTime() : 0;
      if (da !== db) return da - db;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    })
    .map((e, idx) => ({ ...e, deliveryIndex: idx + 1 }));

  // Extraer todas las facturas únicas ordenadas cronológicamente y vinculadas a su entrega
  const facturasMap = new Map();
  (Array.isArray(data) ? data : []).forEach((item) => {
    if (item?.INVOICE_ENTRY) {
      const key = String(item.INVOICE_ENTRY);
      if (!facturasMap.has(key)) {
        const matchedDelivery = entregas.find(
          (e) => String(e.id) === String(item.DELIVERY_ENTRY)
        );
        facturasMap.set(key, {
          id: item.INVOICE_ENTRY,
          numAtCard: item.INVOICE_NUM_AT_CARD,
          docNum: item.INVOICE_DOC_NUM,
          currency: item.INVOICE_CURRENCY,
          rawDate: item.INVOICE_DATE,
          fecha: item.INVOICE_DATE
            ? new Date(
                String(item.INVOICE_DATE).includes("T")
                  ? item.INVOICE_DATE
                  : `${item.INVOICE_DATE}T00:00:00`
              ).toLocaleDateString("es-ES")
            : "--",
          monto: item.MONTO_INVOICE || 0,
          montoUsd: item.MONTO_INVOICE_USD,
          deliveryId: item.DELIVERY_ENTRY || null,
          deliveryDocNum: matchedDelivery?.docNum || item.DELIVERY_DOC_NUM || null,
          deliveryIndex: matchedDelivery?.deliveryIndex || null,
        });
      }
    }
  });
  const facturas = Array.from(facturasMap.values())
    .sort((a, b) => {
      const da = a.rawDate ? new Date(a.rawDate).getTime() : 0;
      const db = b.rawDate ? new Date(b.rawDate).getTime() : 0;
      if (da !== db) return da - db;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    })
    .map((f, idx) => ({
      ...f,
      invoiceIndex: idx + 1,
    }));

  // IDs para los servicios
  const orderId = ordenData.id;
  const entregaId = entregas[0]?.id;
  const facturaId = facturas[0]?.id;
  const deliveryIdsParam = entregas.map((e) => e.id).join(",");

  const { data: orderDetail } = useGetOrderByCode(orderId, Boolean(orderId));

  const resolvedCurrency = String(orderDetail?.currency || orderCurrency || "SOL").toUpperCase().trim();
  const resolvedIsUSD = resolvedCurrency === "USD" || resolvedCurrency === "$" || resolvedCurrency === "US$";

  // Formateador universal respetando la moneda real de cada documento (SOL o USD)
  const formatDocumentMoney = (amount, curr = resolvedCurrency) => {
    const num = Number(amount || 0);
    const cleanCurr = String(curr || "").toUpperCase().trim();
    const currIsUSD = cleanCurr === "USD" || cleanCurr === "$" || cleanCurr === "US$";

    if (currIsUSD) {
      return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    }
    return `S/ ${num.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SOL`;
  };

  const resolvedOrderTotal = orderDetail?.total != null
    ? Number(orderDetail.total)
    : (resolvedIsUSD
        ? (calculatedUsd > 0
            ? calculatedUsd
            : Number(orden?.totals?.grandTotalUSD || orden?.DocTotalFc || (docRate > 1.2 && Number(orden?.DocTotal) > 0 ? Number(orden.DocTotal) / docRate : orden?.DocTotalUSD) || 0))
        : Number(orden?.totals?.grandTotalSOL || orden?.DocTotal || orden?.OrderAmount || 0));

  const displayOrderTotal = resolvedOrderTotal > 0
    ? formatDocumentMoney(resolvedOrderTotal, resolvedCurrency)
    : (orden?.DocTotal
        ? formatDocumentMoney(orden.DocTotal, resolvedCurrency)
        : "--");

  const { data: comparisonData, isLoading } =
    useGetCompareOrderAndDeliveryNote(orderId, deliveryIdsParam || undefined, Boolean(orderId));

  const { data: entregaDetalle, isLoading: loadingEntregaDetalle } =
    useGetDeliveryNoteByCode(entregaId, Boolean(entregaId));

  const { data: facturaDetalle, isLoading: loadingFacturaDetalle } =
    useGetInvoiceByCode(facturaId, Boolean(facturaId));

  // Paso 4: salida física desde almacén (SAP no la registra; la registra el WMS)
  const { data: almacen, isLoading: cargandoAlmacen } =
    useGetSeguimientoAlmacen(entregaId, Boolean(entregaId));

  const handleDownloadInvoice = async (targetFacturaId, explicitNumAtCard) => {
    if (!targetFacturaId && !explicitNumAtCard) return;
    setLoadingFacturaId(targetFacturaId || explicitNumAtCard);
    try {
      const matchedFactura = facturas.find(
        (f) => String(f.id) === String(targetFacturaId)
      );
      const preloadedInvoice =
        String(targetFacturaId) === String(facturaId) ? facturaDetalle : null;

      let fetchedInvoiceData = preloadedInvoice;
      let referenceCode =
        explicitNumAtCard ||
        matchedFactura?.numAtCard ||
        preloadedInvoice?.numAtCard ||
        preloadedInvoice?.NumAtCard;

      if (!referenceCode && targetFacturaId) {
        fetchedInvoiceData = await getInvoiceByCode(targetFacturaId);
        referenceCode =
          fetchedInvoiceData?.numAtCard || fetchedInvoiceData?.NumAtCard;
      }

      const dlResult = await downloadInvoicePDFdirectly(
        referenceCode || targetFacturaId,
        {
          invoiceId: targetFacturaId,
          invoiceData: fetchedInvoiceData,
        }
      );

      if (dlResult?.fallbackSap) {
        toast({
          title: "📄 Preliminar SAP descargado",
          description:
            "El comprobante electrónico aún está sincronizándose con SUNAT/TeFacturo. Se descargó el comprobante registrado en SAP.",
          status: "info",
          duration: 5500,
          isClosable: true,
        });
      } else {
        toast({
          title: "📄 Comprobante descargado",
          description: `Se descargó ${dlResult?.fileName || "el comprobante PDF"}.`,
          status: "success",
          duration: 2800,
          isClosable: true,
        });
      }
    } catch (err) {
      console.error("Error al descargar factura:", err);
      toast({
        title: "No se pudo descargar el comprobante",
        description:
          err.message ||
          "El comprobante aún no se encuentra disponible en SUNAT/TeFacturo.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingFacturaId(null);
    }
  };

  // Mapear productos comparados incluyendo el desglose por entrega
  const productosComparados = (comparisonData || []).map((item) => ({
    codigo: item.ItemCode,
    descripcion: item.Description,
    cantidadOrdenada: item.RequestedQty,
    cantidadEntregada: item.DeliveredQty,
    cantidadPendiente: Math.max(item.RequestedQty - item.DeliveredQty, 0),
    tieneDiferencia: item.hasDifference,
    deliveriesBreakdown: Array.isArray(item.deliveriesBreakdown)
      ? item.deliveriesBreakdown
      : [],
  }));

  const tieneMultiplesEntregas = entregas.length > 1;
  const totalPendientes = productosComparados.reduce(
    (acc, p) => acc + p.cantidadPendiente,
    0
  );
  const esEntregaParcialIncompleta = entregas.length > 0 && totalPendientes > 0;

  // Helper para calcular monto y moneda de cada guía de entrega
  const resolveEntregaMonetary = (e, idx) => {
    const detail = idx === 0 ? entregaDetalle : null;
    const entregaCurrency = detail?.currency || e.currency || resolvedCurrency;
    const isEntregaUSD =
      String(entregaCurrency || "").toUpperCase().trim() === "USD" ||
      String(entregaCurrency || "").includes("$");

    let entregaMonto = 0;
    if (isEntregaUSD) {
      if (detail?.totalUsd != null && Number(detail.totalUsd) > 0) {
        entregaMonto = Number(detail.totalUsd);
      } else if (detail?.totalFc != null && Number(detail.totalFc) > 0) {
        entregaMonto = Number(detail.totalFc);
      } else if (detail?.total != null) {
        const rawTot = Number(detail.total);
        entregaMonto =
          rawTot > 0 && docRate > 1.2 && rawTot > (ordenData?.montoUsd || 0) * 1.5
            ? Number((rawTot / docRate).toFixed(2))
            : rawTot;
      } else if (e.montoUsd != null && Number(e.montoUsd) > 0) {
        entregaMonto = Number(e.montoUsd);
      } else if (e.monto != null) {
        const rawM = Number(e.monto);
        entregaMonto =
          rawM > 0 && docRate > 1.2 && rawM > (ordenData?.montoUsd || 0) * 1.5
            ? Number((rawM / docRate).toFixed(2))
            : rawM;
      } else {
        entregaMonto = Number(ordenData?.montoUsd || 0);
      }
    } else {
      entregaMonto = Number(detail?.total ?? detail?.totalLocal ?? e.monto ?? 0);
    }

    return { entregaMonto, entregaCurrency };
  };

  // Helper para obtener las líneas de productos entregados en una guía específica
  const getDeliveryItemsForGuide = (e) => {
    if (Array.isArray(e.lines) && e.lines.length > 0) {
      return e.lines.map((line) => ({
        itemCode: line.itemCode || line.ItemCode || "",
        description: line.description || line.Description || line.itemCode || "",
        quantity: Number(line.quantity ?? line.Quantity ?? 0),
      }));
    }
    const fromBreakdown = [];
    productosComparados.forEach((prod) => {
      const matched = prod.deliveriesBreakdown.find(
        (bd) => String(bd.deliveryEntry) === String(e.id)
      );
      if (matched && Number(matched.quantity) > 0) {
        fromBreakdown.push({
          itemCode: prod.codigo,
          description: prod.descripcion,
          quantity: Number(matched.quantity),
        });
      }
    });
    return fromBreakdown;
  };

  // Estado general de salida de almacén (soporta 1 o múltiples entregas)
  const almacenPrimario = entregas[0]?.almacen || almacen;
  const etapa = ETAPAS_ALMACEN[almacenPrimario?.etapa] || null;
  const salioAlmacen = tieneMultiplesEntregas
    ? entregas.some((e, idx) => {
        const alm = e.almacen || (idx === 0 ? almacen : null);
        return alm?.etapa === "DESPACHADA" || alm?.etapa === "ENTREGADA_TIENDA";
      })
    : almacenPrimario?.etapa === "DESPACHADA" ||
      almacenPrimario?.etapa === "ENTREGADA_TIENDA";

  return (
    <Box
      bg={bgMain}
      borderRadius="xl"
      w="full"
      maxW="2xl"
      mx="auto"
      overflow="hidden"
      p={{ base: 1, sm: 2, md: 4 }}
    >
      <VStack spacing={4} align="stretch" w="full">
        {/* Step 1: Orden de venta */}
        <Flex gap={{ base: 2, sm: 3, md: 4 }} align="stretch" w="full">
          {/* Progress Indicator Symmetrical */}
          <Flex direction="column" align="center" minW={{ base: "20px", sm: "28px", md: "40px" }} pt={1}>
            <Circle
              size={{ base: "20px", sm: "24px", md: "32px" }}
              bg="green.500"
              color="white"
              flexShrink={0}
            >
              <Check size={12} />
            </Circle>
            <Box w="2px" flex={1} bg="green.500" my={1} />
          </Flex>

          {/* Content Box */}
          <Box flex={1} minW={0} bg={bgSection} p={{ base: 2.5, sm: 3, md: 4 }} borderRadius="xl" border="1px solid" borderColor={borderColor}>
            {/* Pedido Header */}
            <VStack align="start" spacing={1} w="full" mb={3}>
              <Flex justify="space-between" align="center" wrap="wrap" gap={2} w="full">
                <Text fontWeight="800" fontSize={{ base: "15px", md: "lg" }} color="green.600">
                  Pedido #{ordenData?.numero || orden?.DocEntry}
                </Text>
                {tieneMultiplesEntregas && totalPendientes === 0 && (
                  <Badge
                    colorScheme="teal"
                    fontSize="10.5px"
                    px={2.5}
                    py={0.5}
                    borderRadius="full"
                    fontWeight="800"
                  >
                    ✅ Completado en {entregas.length} entregas
                  </Badge>
                )}
                {esEntregaParcialIncompleta && (
                  <Badge
                    colorScheme="orange"
                    fontSize="10.5px"
                    px={2.5}
                    py={0.5}
                    borderRadius="full"
                    fontWeight="800"
                  >
                    📦 Entrega Parcial ({totalPendientes} uds. pendientes)
                  </Badge>
                )}
              </Flex>

              <Box w="full">
                <Text fontSize="11px" fontWeight="700" color="gray.500" textTransform="uppercase">
                  Cliente:
                </Text>
                <Text fontSize={{ base: "12px", sm: "13px", md: "14px" }} fontWeight="700" color="gray.800" lineHeight="1.3">
                  {clienteData?.nombre
                    ? `${clienteData.nombre} (${clienteData.codigo})`
                    : `${orden?.clienteData?.nombre || ''} (${orden?.clienteData?.codigo || ''})`}
                </Text>
              </Box>

              <HStack spacing={1} pt={0.5}>
                <Text fontSize="12px" color={textMuted}>Fecha:</Text>
                <Text fontSize="12px" fontWeight="600" color="gray.700">
                  {ordenData?.fechaCreacion || orden?.ordenData?.fechaCreacion}
                </Text>
              </HStack>
            </VStack>

            {/* Productos Section */}
            <Box mb={3} w="full">
              <Text fontWeight="800" fontSize="13px" mb={2} color="green.700" textTransform="uppercase" letterSpacing="wide">
                Productos
              </Text>

              {isLoading ? (
                <Flex justify="center" align="center" py={6}>
                  <Spinner size="md" color="green.500" thickness="3px" />
                </Flex>
              ) : (
                <Box overflowX="auto" w="full" borderRadius="lg" border="1px solid" borderColor="gray.200">
                  <Table variant="simple" size="sm" bg="white" w="full" layout="fixed">
                    <Thead>
                      <Tr bg="green.600">
                        <Th color="white" fontSize="10px" py={2} px={{ base: 2, md: 3 }} w={{ base: "65%", md: "70%" }}>PRODUCTO</Th>
                        <Th color="white" fontSize="10px" py={2} px={1} textAlign="center" w="17.5%">SOL.</Th>
                        <Th color="white" fontSize="10px" py={2} px={1} textAlign="center" w="17.5%">ENT.</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {productosComparados.map((prod, idx) => {
                        const esPendiente = prod.cantidadPendiente > 0;
                        const mostrarPillsDesglose =
                          prod.deliveriesBreakdown.length > 1 ||
                          (tieneMultiplesEntregas && prod.deliveriesBreakdown.length > 0);

                        return (
                          <Tr
                            key={idx}
                            bg={esPendiente ? pendingRowBg : "transparent"}
                            borderLeft={esPendiente ? "3px solid" : "none"}
                            borderLeftColor="orange.400"
                          >
                            <Td color={textBase} py={2} px={{ base: 2, md: 3 }}>
                              <VStack align="start" spacing={1} w="full">
                                {esPendiente && (
                                  <Badge
                                    bg="orange.500"
                                    color="white"
                                    fontSize="9.5px"
                                    fontWeight="800"
                                    px={1.5}
                                    py={0.5}
                                    borderRadius="md"
                                    boxShadow="sm"
                                    flexShrink={0}
                                    whiteSpace="normal"
                                  >
                                    ⚠️ PENDIENTE ({prod.cantidadPendiente} por entregar)
                                  </Badge>
                                )}
                                <Text
                                  fontSize={{ base: "11px", md: "12.5px" }}
                                  fontWeight="600"
                                  color="gray.800"
                                  lineHeight="1.25"
                                  wordBreak="break-word"
                                >
                                  {prod.descripcion}
                                </Text>
                                {mostrarPillsDesglose && (
                                  <Flex wrap="wrap" gap={1} pt={0.5}>
                                    {prod.deliveriesBreakdown.map((bd, bdIdx) => {
                                      const matchedEntrega = entregas.find(
                                        (e) => String(e.id) === String(bd.deliveryEntry)
                                      );
                                      const resolvedIndex =
                                        bd.deliveryIndex ||
                                        matchedEntrega?.deliveryIndex ||
                                        bdIdx + 1;
                                      const resolvedDocNum =
                                        bd.deliveryDocNum ||
                                        bd.docNum ||
                                        matchedEntrega?.docNum ||
                                        bd.deliveryEntry;

                                      return (
                                        <Badge
                                          key={bdIdx}
                                          colorScheme={resolvedIndex === 1 ? "green" : "teal"}
                                          variant="subtle"
                                          fontSize="9.5px"
                                          px={1.5}
                                          py={0.5}
                                          borderRadius="md"
                                          fontWeight="700"
                                        >
                                          {getOrdinalEntregaLabel(resolvedIndex)} (#{resolvedDocNum}): {bd.quantity} uds.
                                        </Badge>
                                      );
                                    })}
                                  </Flex>
                                )}
                              </VStack>
                            </Td>
                            <Td color={textBase} textAlign="center" fontWeight="700" fontSize="12px" px={1}>
                              {prod.cantidadOrdenada}
                            </Td>
                            <Td
                              color={esPendiente ? "orange.600" : "green.600"}
                              textAlign="center"
                              fontWeight="800"
                              fontSize="12px"
                              px={1}
                            >
                              {prod.cantidadEntregada}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </Box>

            {/* Desglose de Entregas Parciales / Múltiples */}
            {(tieneMultiplesEntregas || esEntregaParcialIncompleta) && (
              <Box
                bg="white"
                border="1px solid"
                borderColor="green.200"
                borderRadius="lg"
                p={3}
                mb={3}
              >
                <Text
                  fontWeight="800"
                  fontSize="11.5px"
                  color="green.700"
                  textTransform="uppercase"
                  letterSpacing="wide"
                  mb={2.5}
                >
                  DESGLOSE DE ENTREGAS DEL PEDIDO
                </Text>

                <VStack align="stretch" spacing={2.5}>
                  {entregas.map((e, idx) => {
                    const { entregaMonto, entregaCurrency } = resolveEntregaMonetary(e, idx);
                    const guideItems = getDeliveryItemsForGuide(e);
                    const totalUnidadesGuia = guideItems.reduce(
                      (acc, item) => acc + Number(item.quantity || 0),
                      0
                    );
                    const isLastAndCompleted =
                      tieneMultiplesEntregas &&
                      totalPendientes === 0 &&
                      idx === entregas.length - 1;
                    const badgeLabel = isLastAndCompleted
                      ? `${getOrdinalEntregaLabel(e.deliveryIndex)} (Completado)`
                      : getOrdinalEntregaLabel(e.deliveryIndex);
                    const docNumLabel =
                      idx === 0 && entregaDetalle?.docNum
                        ? entregaDetalle.docNum
                        : e.docNum || e.id;

                    return (
                      <Box
                        key={e.id || idx}
                        p={2.5}
                        bg="gray.50"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.200"
                      >
                        <Flex
                          justify="space-between"
                          align="center"
                          wrap="wrap"
                          gap={1.5}
                          mb={guideItems.length > 0 ? 1.5 : 0}
                        >
                          <HStack spacing={1.5} wrap="wrap">
                            <Badge
                              colorScheme={isLastAndCompleted ? "teal" : "green"}
                              fontSize="10px"
                              px={2}
                              py={0.5}
                              borderRadius="md"
                              fontWeight="800"
                            >
                              {badgeLabel}
                            </Badge>
                            <Text fontSize="12px" fontWeight="700" color="gray.800">
                              Guía #{docNumLabel}
                            </Text>
                            <Text fontSize="11.5px" color="gray.500">
                              · {e.fecha}
                            </Text>
                          </HStack>
                          <Text fontSize="12px" fontWeight="800" color="green.700">
                            {formatDocumentMoney(entregaMonto, entregaCurrency)}
                          </Text>
                        </Flex>

                        {guideItems.length > 0 && (
                          <Box>
                            <Text fontSize="11px" color="gray.600" mb={1} fontWeight="600">
                              En la {getOrdinalEntregaLabel(e.deliveryIndex).toLowerCase()} se dio ({totalUnidadesGuia} uds.):
                            </Text>
                            <Flex wrap="wrap" gap={1}>
                              {guideItems.map((item, iIdx) => (
                                <Badge
                                  key={iIdx}
                                  bg="white"
                                  color="gray.700"
                                  border="1px solid"
                                  borderColor="gray.300"
                                  fontSize="10px"
                                  fontWeight="600"
                                  px={1.5}
                                  py={0.5}
                                  borderRadius="md"
                                  whiteSpace="normal"
                                >
                                  {item.quantity}x {item.description}
                                </Badge>
                              ))}
                            </Flex>
                          </Box>
                        )}
                      </Box>
                    );
                  })}

                  {esEntregaParcialIncompleta && (
                    <Box
                      p={2.5}
                      bg="orange.50"
                      border="1px solid"
                      borderColor="orange.200"
                      borderRadius="md"
                    >
                      <Text fontSize="11.5px" fontWeight="700" color="orange.800" lineHeight="1.35">
                        ⏳ Saldo pendiente por completar en próxima entrega: {totalPendientes} unidades (
                        {productosComparados
                          .filter((p) => p.cantidadPendiente > 0)
                          .map((p) => `${p.cantidadPendiente}x ${p.descripcion}`)
                          .join(", ")}
                        )
                      </Text>
                    </Box>
                  )}
                </VStack>
              </Box>
            )}

            {/* Orden de venta monto */}
            <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="gray.100">
              <Flex justify="space-between" align="center">
                <Text fontSize="13px" fontWeight="600" color="gray.600">
                  Monto total de orden:
                </Text>
                <Text fontSize="14px" fontWeight="800" color="gray.800">
                  {displayOrderTotal}
                </Text>
              </Flex>
            </Box>
          </Box>
        </Flex>

        {/* Step 2: Picking / Entrega */}
        <Flex gap={{ base: 2, sm: 3, md: 4 }} align="stretch" w="full">
          <Flex direction="column" align="center" minW={{ base: "20px", sm: "28px", md: "40px" }} pt={1}>
            <Circle
              size={{ base: "20px", sm: "24px", md: "32px" }}
              bg={entregas.length > 0 ? "green.500" : "gray.300"}
              color="white"
              flexShrink={0}
            >
              {entregas.length > 0 ? <Check size={12} /> : <Circle size="6px" bg="white" />}
            </Circle>
            <Box w="2px" flex={1} bg={facturas.length > 0 ? "green.500" : "gray.300"} my={1} />
          </Flex>

          <Box flex={1} minW={0} bg={bgSection} p={{ base: 2.5, sm: 3, md: 4 }} borderRadius="xl" border="1px solid" borderColor={borderColor}>
            <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={2}>
              <Text fontWeight="800" fontSize="13px" color="green.700" textTransform="uppercase" letterSpacing="wide">
                Entrega SAP (documento)
              </Text>
              {tieneMultiplesEntregas && (
                <Badge colorScheme="green" variant="subtle" fontSize="10.5px" px={2} py={0.5} borderRadius="full" fontWeight="800">
                  ({entregas.length} guías emitidas)
                </Badge>
              )}
            </Flex>

            {entregas.length > 0 ? (
              <VStack align="stretch" spacing={3}>
                {entregas.map((e, idx) => {
                  const detail = idx === 0 ? entregaDetalle : null;
                  const { entregaMonto, entregaCurrency } = resolveEntregaMonetary(e, idx);
                  const guideItems = getDeliveryItemsForGuide(e);

                  const headerLabel =
                    idx === 0
                      ? "1ra Entrega (Parcial Inicial)"
                      : totalPendientes === 0 && idx === entregas.length - 1
                      ? `${getOrdinalEntregaLabel(e.deliveryIndex)} (Completado)`
                      : getOrdinalEntregaLabel(e.deliveryIndex);

                  return (
                    <Box
                      key={e.id || idx}
                      bg="white"
                      p={3}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={tieneMultiplesEntregas ? "green.200" : "gray.100"}
                    >
                      <VStack align="stretch" spacing={2}>
                        {tieneMultiplesEntregas && (
                          <Flex justify="space-between" align="center" pb={1} borderBottom="1px dashed" borderColor="gray.200">
                            <Badge
                              colorScheme={idx === 0 ? "green" : "teal"}
                              fontSize="10.5px"
                              px={2}
                              py={0.5}
                              borderRadius="md"
                              fontWeight="800"
                            >
                              {headerLabel}
                            </Badge>
                          </Flex>
                        )}
                        <Flex justify="space-between" align="center">
                          <Text fontSize="13px" color="gray.600">N° de Entrega (Guía):</Text>
                          <Badge colorScheme="green" fontSize="12.5px" px={2.5} py={0.5} borderRadius="md" fontWeight="800">
                            {detail?.docNum
                              ? `#${detail.docNum}`
                              : e.docNum
                              ? `#${e.docNum}`
                              : idx === 0 && loadingEntregaDetalle
                              ? <Spinner size="xs" color="green.600" />
                              : `#${e.id}`}
                          </Badge>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="13px" color="gray.600">Fecha del documento:</Text>
                          <Text fontSize="13px" fontWeight="700" color="gray.800">{e.fecha}</Text>
                        </Flex>
                        {(detail?.total !== undefined || detail?.totalUsd !== undefined || e.monto !== undefined) && (
                          <Flex justify="space-between" align="center">
                            <Text fontSize="13px" color="gray.600">Monto entregado:</Text>
                            <Text fontSize="13px" fontWeight="800" color="green.600">
                              {formatDocumentMoney(entregaMonto, entregaCurrency)}
                            </Text>
                          </Flex>
                        )}
                        {tieneMultiplesEntregas && guideItems.length > 0 && (
                          <Box pt={1.5} borderTop="1px solid" borderColor="gray.100">
                            <Text fontSize="11px" fontWeight="700" color="gray.500" mb={1}>
                              Ítems entregados en esta guía:
                            </Text>
                            <VStack align="stretch" spacing={1}>
                              {guideItems.map((line, lIdx) => (
                                <Text key={lIdx} fontSize="11.5px" color="gray.700" fontWeight="600">
                                  • {line.quantity} uds. · {line.description}
                                </Text>
                              ))}
                            </VStack>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  );
                })}
              </VStack>
            ) : (
              <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="gray.100">
                <Text fontSize="12.5px" color="gray.400" textAlign="center">
                  No se ha realizado entrega
                </Text>
              </Box>
            )}
          </Box>
        </Flex>

        {/* Step 3: Factura */}
        <Flex gap={{ base: 2, sm: 3, md: 4 }} align="stretch" w="full">
          <Flex direction="column" align="center" minW={{ base: "20px", sm: "28px", md: "40px" }} pt={1}>
            <Circle
              size={{ base: "20px", sm: "24px", md: "32px" }}
              bg={facturas.length > 0 ? "green.500" : "gray.300"}
              color="white"
              flexShrink={0}
            >
              {facturas.length > 0 ? <Check size={12} /> : <Circle size="6px" bg="white" />}
            </Circle>
            <Box w="2px" flex={1} bg={salioAlmacen ? "green.500" : "gray.300"} my={1} />
          </Flex>

          <Box flex={1} minW={0} bg={bgSection} p={{ base: 2.5, sm: 3, md: 4 }} borderRadius="xl" border="1px solid" borderColor={borderColor}>
            <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={2}>
              <Text fontWeight="800" fontSize="13px" color="green.700" textTransform="uppercase" letterSpacing="wide">
                Facturación
              </Text>
              {facturas.length > 1 && (
                <Badge colorScheme="purple" variant="subtle" fontSize="10.5px" px={2} py={0.5} borderRadius="full" fontWeight="800">
                  ({facturas.length} facturas emitidas)
                </Badge>
              )}
            </Flex>

            {facturas.length > 0 ? (
              <VStack align="stretch" spacing={3}>
                {facturas.map((f, idx) => {
                  const detail = idx === 0 ? facturaDetalle : null;
                  const facturaCurrency = detail?.currency || f.currency || resolvedCurrency;
                  const isFacturaUSD =
                    String(facturaCurrency || "").toUpperCase().trim() === "USD" ||
                    String(facturaCurrency || "").includes("$");

                  let facturaMonto = 0;
                  if (isFacturaUSD) {
                    if (detail?.totalUsd != null && Number(detail.totalUsd) > 0) {
                      facturaMonto = Number(detail.totalUsd);
                    } else if (detail?.totalFc != null && Number(detail.totalFc) > 0) {
                      facturaMonto = Number(detail.totalFc);
                    } else if (detail?.total != null) {
                      const rawTot = Number(detail.total);
                      facturaMonto =
                        rawTot > 0 && docRate > 1.2 && rawTot > (ordenData?.montoUsd || 0) * 1.5
                          ? Number((rawTot / docRate).toFixed(2))
                          : rawTot;
                    } else if (f.montoUsd != null && Number(f.montoUsd) > 0) {
                      facturaMonto = Number(f.montoUsd);
                    } else if (f.monto != null) {
                      const rawM = Number(f.monto);
                      facturaMonto =
                        rawM > 0 && docRate > 1.2 && rawM > (ordenData?.montoUsd || 0) * 1.5
                          ? Number((rawM / docRate).toFixed(2))
                          : rawM;
                    } else {
                      facturaMonto = Number(ordenData?.montoUsd || 0);
                    }
                  } else {
                    facturaMonto = Number(detail?.total ?? detail?.totalLocal ?? f.monto ?? 0);
                  }

                  const deliveryOrdinal = getOrdinalEntregaLabel(f.deliveryIndex || idx + 1);
                  const headerBadgeText = f.deliveryDocNum
                    ? `Factura de ${deliveryOrdinal} (Guía #${f.deliveryDocNum})`
                    : `Factura de ${deliveryOrdinal}`;

                  return (
                    <Box
                      key={f.id || idx}
                      bg="white"
                      p={3}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={facturas.length > 1 ? "purple.200" : "gray.100"}
                    >
                      <VStack align="stretch" spacing={2}>
                        {facturas.length > 1 && (
                          <Flex justify="space-between" align="center" pb={1} borderBottom="1px dashed" borderColor="gray.200">
                            <Badge
                              colorScheme="purple"
                              variant="subtle"
                              fontSize="10.5px"
                              px={2}
                              py={0.5}
                              borderRadius="md"
                              fontWeight="800"
                            >
                              {headerBadgeText}
                            </Badge>
                          </Flex>
                        )}
                        <Flex justify="space-between" align="center">
                          <Text fontSize="13px" color="gray.600">N° Factura:</Text>
                          <Badge colorScheme="purple" fontSize="12.5px" px={2.5} py={0.5} borderRadius="md" fontWeight="800">
                            {detail?.numAtCard
                              ? detail.numAtCard
                              : f.numAtCard
                              ? f.numAtCard
                              : (detail?.docNum ? `#${detail.docNum}` : f.docNum ? `#${f.docNum}` : null) ||
                                (idx === 0 && loadingFacturaDetalle ? (
                                  <Spinner size="xs" color="purple.600" />
                                ) : (
                                  `#${f.id}`
                                ))}
                          </Badge>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="13px" color="gray.600">Fecha factura:</Text>
                          <Text fontSize="13px" fontWeight="700" color="gray.800">{f.fecha}</Text>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="13px" color="gray.600">Monto facturado:</Text>
                          <Text fontSize="13px" fontWeight="800" color="green.600">
                            {formatDocumentMoney(facturaMonto, facturaCurrency)}
                          </Text>
                        </Flex>
                        <Button
                          size="sm"
                          colorScheme="green"
                          bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                          color="white"
                          leftIcon={<Download size={14} />}
                          isLoading={loadingFacturaId === f.id}
                          loadingText="Descargando Factura..."
                          onClick={() => handleDownloadInvoice(f.id, f.numAtCard || detail?.numAtCard)}
                          borderRadius="xl"
                          mt={1.5}
                          w="full"
                          fontWeight="700"
                          fontSize="12px"
                          boxShadow="0 4px 12px rgba(22, 101, 52, 0.2)"
                          _hover={{
                            bg: "linear-gradient(135deg, #0f3d21 0%, #14532d 50%, #166534 100%)",
                            transform: "translateY(-1px)",
                          }}
                          transition="all 0.2s"
                        >
                          Descargar Factura PDF
                        </Button>
                      </VStack>
                    </Box>
                  );
                })}
              </VStack>
            ) : (
              <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="gray.100">
                <Text fontSize="12.5px" color="gray.400" textAlign="center">
                  No se ha emitido factura
                </Text>
              </Box>
            )}
          </Box>
        </Flex>

        {/* Step 4: Despacho Almacén (salida física) */}
        <Flex gap={{ base: 2, sm: 3, md: 4 }} align="stretch" w="full">
          <Flex direction="column" align="center" minW={{ base: "20px", sm: "28px", md: "40px" }} pt={1}>
            <Circle
              size={{ base: "20px", sm: "24px", md: "32px" }}
              bg={salioAlmacen ? "green.500" : etapa?.color === "red" ? "red.400" : "gray.300"}
              color="white"
              flexShrink={0}
            >
              {salioAlmacen ? <Check size={12} /> : <Circle size="6px" bg="white" />}
            </Circle>
          </Flex>

          <Box flex={1} minW={0} bg={bgSection} p={{ base: 2.5, sm: 3, md: 4 }} borderRadius="xl" border="1px solid" borderColor={borderColor}>
            <Text fontWeight="800" fontSize="13px" mb={2} color="green.700" textTransform="uppercase" letterSpacing="wide">
              Despacho Almacén
            </Text>

            {tieneMultiplesEntregas ? (
              <VStack align="stretch" spacing={3}>
                {entregas.map((e, idx) => {
                  const alm = e.almacen || (idx === 0 ? almacen : null);
                  const etapaGuia = ETAPAS_ALMACEN[alm?.etapa] || null;
                  const salioGuia =
                    alm?.etapa === "DESPACHADA" || alm?.etapa === "ENTREGADA_TIENDA";
                  const docNumGuia =
                    idx === 0 && entregaDetalle?.docNum
                      ? entregaDetalle.docNum
                      : e.docNum || e.id;

                  return (
                    <Box
                      key={e.id || idx}
                      bg="white"
                      p={3}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="gray.200"
                    >
                      <Flex
                        justify="space-between"
                        align="center"
                        pb={2}
                        mb={2}
                        borderBottom="1px dashed"
                        borderColor="gray.200"
                      >
                        <Text fontSize="12px" fontWeight="800" color="gray.700">
                          Guía #{docNumGuia} ({getOrdinalEntregaLabel(e.deliveryIndex)})
                        </Text>
                      </Flex>

                      {idx === 0 && cargandoAlmacen && !alm ? (
                        <Flex justify="center" py={1}>
                          <Spinner size="sm" color="green.500" />
                        </Flex>
                      ) : !etapaGuia ? (
                        <Text fontSize="12.5px" color="gray.400" textAlign="center">
                          No se pudo consultar almacén
                        </Text>
                      ) : (
                        <VStack align="stretch" spacing={2}>
                          <Flex justify="space-between" align="center" gap={2}>
                            <Text fontSize="13px" color="gray.600">Estado:</Text>
                            <Badge
                              colorScheme={etapaGuia.color}
                              fontSize="11.5px"
                              px={2.5}
                              py={0.5}
                              borderRadius="md"
                              fontWeight="800"
                            >
                              {etapaGuia.texto}
                            </Badge>
                          </Flex>
                          {alm.bultos ? (
                            <Flex justify="space-between" align="center">
                              <Text fontSize="13px" color="gray.600">Bultos:</Text>
                              <Text fontSize="13px" fontWeight="700" color="gray.800">
                                {alm.bultos}{alm.pesoKg ? ` · ${alm.pesoKg} Kg` : ""}
                              </Text>
                            </Flex>
                          ) : null}
                          {salioGuia && alm.salida && (
                            <>
                              <Flex justify="space-between" align="center">
                                <Text fontSize="13px" color="gray.600">
                                  {alm.etapa === "ENTREGADA_TIENDA" ? "Fecha de recojo:" : "Fecha de salida:"}
                                </Text>
                                <Text fontSize="13px" fontWeight="700" color="gray.800">
                                  {alm.salida.fecha ? new Date(alm.salida.fecha).toLocaleString("es-PE") : "--"}
                                </Text>
                              </Flex>
                              <Flex justify="space-between" align="center" gap={2}>
                                <Text fontSize="13px" color="gray.600">
                                  {alm.etapa === "ENTREGADA_TIENDA" ? "Recogió:" : "Vehículo / chofer:"}
                                </Text>
                                <Text fontSize="13px" fontWeight="700" color="gray.800" textAlign="right">
                                  {alm.etapa === "ENTREGADA_TIENDA"
                                    ? `${alm.salida.recibidoPorNombre || "--"}${alm.salida.recibidoPorDni ? ` (DNI ${alm.salida.recibidoPorDni})` : ""}`
                                    : `${alm.salida.vehiculoPlaca || "--"} · ${alm.salida.choferNombre || "--"}`}
                                </Text>
                              </Flex>
                            </>
                          )}
                          {alm.guiasJuntas?.length > 0 && (
                            <Text fontSize="11.5px" color="gray.500">
                              Sale junto con la(s) guía(s): {alm.guiasJuntas.join(", ")}
                            </Text>
                          )}
                        </VStack>
                      )}
                    </Box>
                  );
                })}
              </VStack>
            ) : (
              <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="gray.100">
                {!entregaId ? (
                  <Text fontSize="12.5px" color="gray.400" textAlign="center">
                    Aún no hay entrega para almacén
                  </Text>
                ) : cargandoAlmacen && !almacenPrimario ? (
                  <Flex justify="center" py={1}><Spinner size="sm" color="green.500" /></Flex>
                ) : !etapa ? (
                  <Text fontSize="12.5px" color="gray.400" textAlign="center">
                    No se pudo consultar almacén
                  </Text>
                ) : (
                  <VStack align="stretch" spacing={2}>
                    <Flex justify="space-between" align="center" gap={2}>
                      <Text fontSize="13px" color="gray.600">Estado:</Text>
                      <Badge colorScheme={etapa.color} fontSize="11.5px" px={2.5} py={0.5} borderRadius="md" fontWeight="800">
                        {etapa.texto}
                      </Badge>
                    </Flex>
                    {almacenPrimario.bultos ? (
                      <Flex justify="space-between" align="center">
                        <Text fontSize="13px" color="gray.600">Bultos:</Text>
                        <Text fontSize="13px" fontWeight="700" color="gray.800">
                          {almacenPrimario.bultos}{almacenPrimario.pesoKg ? ` · ${almacenPrimario.pesoKg} Kg` : ""}
                        </Text>
                      </Flex>
                    ) : null}
                    {salioAlmacen && almacenPrimario.salida && (
                      <>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="13px" color="gray.600">
                            {almacenPrimario.etapa === "ENTREGADA_TIENDA" ? "Fecha de recojo:" : "Fecha de salida:"}
                          </Text>
                          <Text fontSize="13px" fontWeight="700" color="gray.800">
                            {almacenPrimario.salida.fecha ? new Date(almacenPrimario.salida.fecha).toLocaleString("es-PE") : "--"}
                          </Text>
                        </Flex>
                        <Flex justify="space-between" align="center" gap={2}>
                          <Text fontSize="13px" color="gray.600">
                            {almacenPrimario.etapa === "ENTREGADA_TIENDA" ? "Recogió:" : "Vehículo / chofer:"}
                          </Text>
                          <Text fontSize="13px" fontWeight="700" color="gray.800" textAlign="right">
                            {almacenPrimario.etapa === "ENTREGADA_TIENDA"
                              ? `${almacenPrimario.salida.recibidoPorNombre || "--"}${almacenPrimario.salida.recibidoPorDni ? ` (DNI ${almacenPrimario.salida.recibidoPorDni})` : ""}`
                              : `${almacenPrimario.salida.vehiculoPlaca || "--"} · ${almacenPrimario.salida.choferNombre || "--"}`}
                          </Text>
                        </Flex>
                      </>
                    )}
                    {almacenPrimario.guiasJuntas?.length > 0 && (
                      <Text fontSize="11.5px" color="gray.500">
                        Sale junto con la(s) guía(s): {almacenPrimario.guiasJuntas.join(", ")}
                      </Text>
                    )}
                  </VStack>
                )}
              </Box>
            )}
          </Box>
        </Flex>
      </VStack>
    </Box>
  );
}
