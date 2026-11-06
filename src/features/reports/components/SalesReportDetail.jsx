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
  useBreakpointValue,
} from "@chakra-ui/react";
import { Check, Download, FileText } from "lucide-react";
import {
  useGetCompareOrderAndDeliveryNote,
  useGetDeliveryNoteByCode,
  useGetInvoiceByCode,
  useGetOrderByCode,
  useGetSeguimientoAlmacen,
} from "../hooks/queries/reportQueries";
import {
  getOrderByCode,
  getDeliveryNoteByCode,
  getInvoiceByCode,
} from "../services/reportService";
import {
  generateOrderPDF,
  generateDeliveryPDF,
  downloadInvoicePDF,
  downloadInvoicePDFdirectly,
} from "../utils/pdfGenerators";

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

export default function TrackingPage({ orden, data }) {
  const [loadingOrden, setLoadingOrden] = useState(false);
  const [loadingEntrega, setLoadingEntrega] = useState(false);
  const [loadingFactura, setLoadingFactura] = useState(false);

  const handleDownloadDelivery = async (eId) => {
    if (!eId) return;
    setLoadingEntrega(true);
    try {
      const deliveryData = await getDeliveryNoteByCode(eId);
      if (deliveryData) {
        await generateDeliveryPDF(deliveryData);
      }
    } catch (err) {
      console.error("Error al generar PDF de entrega:", err);
      alert("No se pudo generar la guía de entrega.");
    } finally {
      setLoadingEntrega(false);
    }
  };

  const handleDownloadInvoice = async (facturaId) => {
    if (!facturaId) return;
    setLoadingFactura(true);
    try {
      let referenceCode =
        facturaDetalle?.numAtCard ||
        facturaDetalle?.NumAtCard ||
        facturas[0]?.numAtCard;
      if (!referenceCode) {
        const invoiceData = await getInvoiceByCode(facturaId);
        referenceCode = invoiceData?.numAtCard || invoiceData?.NumAtCard;
      }
      if (referenceCode) {
        await downloadInvoicePDFdirectly(referenceCode);
      } else {
        await downloadInvoicePDFdirectly(facturaId);
      }
    } catch (err) {
      console.error("Error al descargar factura:", err);
      alert(`No se pudo descargar la factura: ${err.message || "Error desconocido"}`);
    } finally {
      setLoadingFactura(false);
    }
  };

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

  // Buscar el primer registro que tenga entrega o factura
  const seguimientoData =
    data?.find(
      (item) => item.DELIVERY_DATE !== null || item.INVOICE_DATE !== null
    ) || {};

  const entregas = seguimientoData.DELIVERY_DATE
    ? [
        {
          id: seguimientoData.DELIVERY_ENTRY,
          docNum: seguimientoData.DELIVERY_DOC_NUM,
          currency: seguimientoData.DELIVERY_CURRENCY,
          fecha: new Date(seguimientoData.DELIVERY_DATE).toLocaleDateString(
            "es-ES"
          ),
          monto: seguimientoData.MONTO_DELIVERYNOTE || 0,
          montoUsd: seguimientoData.MONTO_DELIVERYNOTE_USD,
        },
      ]
    : [];

  const facturas = seguimientoData.INVOICE_DATE
    ? [
        {
          id: seguimientoData.INVOICE_ENTRY,
          numAtCard: seguimientoData.INVOICE_NUM_AT_CARD,
          docNum: seguimientoData.INVOICE_DOC_NUM,
          currency: seguimientoData.INVOICE_CURRENCY,
          fecha: new Date(seguimientoData.INVOICE_DATE).toLocaleDateString(
            "es-ES"
          ),
          monto: seguimientoData.MONTO_INVOICE || 0,
          montoUsd: seguimientoData.MONTO_INVOICE_USD,
        },
      ]
    : [];

  // IDs para los servicios
  const orderId = ordenData.id;
  const entregaId = entregas[0]?.id;
  const facturaId = facturas[0]?.id;

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
    useGetCompareOrderAndDeliveryNote(orderId, entregaId, {
      enabled: Boolean(orderId),
    });

  const { data: entregaDetalle, isLoading: loadingEntregaDetalle } =
    useGetDeliveryNoteByCode(entregaId, Boolean(entregaId));

  const { data: facturaDetalle, isLoading: loadingFacturaDetalle } =
    useGetInvoiceByCode(facturaId, Boolean(facturaId));

  // Paso 4: salida física desde almacén (SAP no la registra; la registra el WMS)
  const { data: almacen, isLoading: cargandoAlmacen } =
    useGetSeguimientoAlmacen(entregaId, Boolean(entregaId));
  const etapa = ETAPAS_ALMACEN[almacen?.etapa] || null;
  const salioAlmacen = almacen?.etapa === "DESPACHADA" || almacen?.etapa === "ENTREGADA_TIENDA";

  // Mapear productos comparados
  const productosComparados = (comparisonData || []).map((item) => ({
    codigo: item.ItemCode,
    descripcion: item.Description,
    cantidadOrdenada: item.RequestedQty,
    cantidadEntregada: item.DeliveredQty,
    cantidadPendiente: Math.max(item.RequestedQty - item.DeliveredQty, 0),
    tieneDiferencia: item.hasDifference,
  }));

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
              <Text fontWeight="800" fontSize={{ base: "15px", md: "lg" }} color="green.600">
                Pedido #{ordenData?.numero || orden?.DocEntry}
              </Text>

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
            <Box mb={4} w="full">
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
            <Text fontWeight="800" fontSize="13px" mb={2} color="green.700" textTransform="uppercase" letterSpacing="wide">
              Entrega SAP (documento)
            </Text>
            <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="gray.100">
              {entregas.length > 0 ? (
                entregas.map((e, idx) => (
                  <VStack key={idx} align="stretch" spacing={2}>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="13px" color="gray.600">N° de Entrega (Guía):</Text>
                      <Badge colorScheme="green" fontSize="12.5px" px={2.5} py={0.5} borderRadius="md" fontWeight="800">
                        {entregaDetalle?.docNum 
                          ? `#${entregaDetalle.docNum}` 
                          : e.docNum 
                          ? `#${e.docNum}` 
                          : loadingEntregaDetalle 
                          ? <Spinner size="xs" color="green.600" /> 
                          : `#${e.id}`}
                      </Badge>
                    </Flex>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="13px" color="gray.600">Fecha del documento:</Text>
                      <Text fontSize="13px" fontWeight="700" color="gray.800">{e.fecha}</Text>
                    </Flex>
                    {(entregaDetalle?.total !== undefined || entregaDetalle?.totalUsd !== undefined || e.monto !== undefined) && (() => {
                      const entregaCurrency = entregaDetalle?.currency || e.currency || resolvedCurrency;
                      const isEntregaUSD = String(entregaCurrency || "").toUpperCase().trim() === "USD" || String(entregaCurrency || "").includes("$");

                      let entregaMonto = 0;
                      if (isEntregaUSD) {
                        if (entregaDetalle?.totalUsd != null && Number(entregaDetalle.totalUsd) > 0) {
                          entregaMonto = Number(entregaDetalle.totalUsd);
                        } else if (entregaDetalle?.totalFc != null && Number(entregaDetalle.totalFc) > 0) {
                          entregaMonto = Number(entregaDetalle.totalFc);
                        } else if (entregaDetalle?.total != null) {
                          const rawTot = Number(entregaDetalle.total);
                          entregaMonto = (rawTot > 0 && docRate > 1.2 && rawTot > (ordenData?.montoUsd || 0) * 1.5)
                            ? Number((rawTot / docRate).toFixed(2))
                            : rawTot;
                        } else if (e.montoUsd != null && Number(e.montoUsd) > 0) {
                          entregaMonto = Number(e.montoUsd);
                        } else if (e.monto != null) {
                          const rawM = Number(e.monto);
                          entregaMonto = (rawM > 0 && docRate > 1.2 && rawM > (ordenData?.montoUsd || 0) * 1.5)
                            ? Number((rawM / docRate).toFixed(2))
                            : rawM;
                        } else {
                          entregaMonto = Number(ordenData?.montoUsd || 0);
                        }
                      } else {
                        entregaMonto = Number(entregaDetalle?.total ?? entregaDetalle?.totalLocal ?? e.monto ?? 0);
                      }

                      return (
                        <Flex justify="space-between" align="center">
                          <Text fontSize="13px" color="gray.600">Monto entregado:</Text>
                          <Text fontSize="13px" fontWeight="800" color="green.600">
                            {formatDocumentMoney(entregaMonto, entregaCurrency)}
                          </Text>
                        </Flex>
                      );
                    })()}
                  </VStack>
                ))
              ) : (
                <Text fontSize="12.5px" color="gray.400" textAlign="center">
                  No se ha realizado entrega
                </Text>
              )}
            </Box>
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
            <Text fontWeight="800" fontSize="13px" mb={2} color="green.700" textTransform="uppercase" letterSpacing="wide">
              Facturación
            </Text>
            <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="gray.100">
              {facturas.length > 0 ? (
                facturas.map((f, idx) => (
                  <VStack key={idx} align="stretch" spacing={2}>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="13px" color="gray.600">N° Factura:</Text>
                      <Badge colorScheme="purple" fontSize="12.5px" px={2.5} py={0.5} borderRadius="md" fontWeight="800">
                        {facturaDetalle?.numAtCard 
                          ? facturaDetalle.numAtCard 
                          : f.numAtCard 
                          ? f.numAtCard 
                          : (facturaDetalle?.docNum ? `#${facturaDetalle.docNum}` : f.docNum ? `#${f.docNum}` : null) 
                          || (loadingFacturaDetalle ? <Spinner size="xs" color="purple.600" /> : `#${f.id}`)}
                      </Badge>
                    </Flex>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="13px" color="gray.600">Fecha factura:</Text>
                      <Text fontSize="13px" fontWeight="700" color="gray.800">{f.fecha}</Text>
                    </Flex>
                    {(() => {
                      const facturaCurrency = facturaDetalle?.currency || f.currency || resolvedCurrency;
                      const isFacturaUSD = String(facturaCurrency || "").toUpperCase().trim() === "USD" || String(facturaCurrency || "").includes("$");

                      let facturaMonto = 0;
                      if (isFacturaUSD) {
                        if (facturaDetalle?.totalUsd != null && Number(facturaDetalle.totalUsd) > 0) {
                          facturaMonto = Number(facturaDetalle.totalUsd);
                        } else if (facturaDetalle?.totalFc != null && Number(facturaDetalle.totalFc) > 0) {
                          facturaMonto = Number(facturaDetalle.totalFc);
                        } else if (facturaDetalle?.total != null) {
                          const rawTot = Number(facturaDetalle.total);
                          facturaMonto = (rawTot > 0 && docRate > 1.2 && rawTot > (ordenData?.montoUsd || 0) * 1.5)
                            ? Number((rawTot / docRate).toFixed(2))
                            : rawTot;
                        } else if (f.montoUsd != null && Number(f.montoUsd) > 0) {
                          facturaMonto = Number(f.montoUsd);
                        } else if (f.monto != null) {
                          const rawM = Number(f.monto);
                          facturaMonto = (rawM > 0 && docRate > 1.2 && rawM > (ordenData?.montoUsd || 0) * 1.5)
                            ? Number((rawM / docRate).toFixed(2))
                            : rawM;
                        } else {
                          facturaMonto = Number(ordenData?.montoUsd || 0);
                        }
                      } else {
                        facturaMonto = Number(facturaDetalle?.total ?? facturaDetalle?.totalLocal ?? f.monto ?? 0);
                      }

                      return (
                        <Flex justify="space-between" align="center">
                          <Text fontSize="13px" color="gray.600">Monto facturado:</Text>
                          <Text fontSize="13px" fontWeight="800" color="green.600">
                            {formatDocumentMoney(facturaMonto, facturaCurrency)}
                          </Text>
                        </Flex>
                      );
                    })()}
                    <Button
                      size="sm"
                      colorScheme="green"
                      bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                      color="white"
                      leftIcon={<Download size={14} />}
                      isLoading={loadingFactura}
                      loadingText="Descargando Factura..."
                      onClick={() => handleDownloadInvoice(f.id)}
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
                ))
              ) : (
                <Text fontSize="12.5px" color="gray.400" textAlign="center">
                  No se ha emitido factura
                </Text>
              )}
            </Box>
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
            <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="gray.100">
              {!entregaId ? (
                <Text fontSize="12.5px" color="gray.400" textAlign="center">
                  Aún no hay entrega para almacén
                </Text>
              ) : cargandoAlmacen ? (
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
                  {almacen.bultos ? (
                    <Flex justify="space-between" align="center">
                      <Text fontSize="13px" color="gray.600">Bultos:</Text>
                      <Text fontSize="13px" fontWeight="700" color="gray.800">
                        {almacen.bultos}{almacen.pesoKg ? ` · ${almacen.pesoKg} Kg` : ""}
                      </Text>
                    </Flex>
                  ) : null}
                  {salioAlmacen && almacen.salida && (
                    <>
                      <Flex justify="space-between" align="center">
                        <Text fontSize="13px" color="gray.600">
                          {almacen.etapa === "ENTREGADA_TIENDA" ? "Fecha de recojo:" : "Fecha de salida:"}
                        </Text>
                        <Text fontSize="13px" fontWeight="700" color="gray.800">
                          {almacen.salida.fecha ? new Date(almacen.salida.fecha).toLocaleString("es-PE") : "--"}
                        </Text>
                      </Flex>
                      <Flex justify="space-between" align="center" gap={2}>
                        <Text fontSize="13px" color="gray.600">
                          {almacen.etapa === "ENTREGADA_TIENDA" ? "Recogió:" : "Vehículo / chofer:"}
                        </Text>
                        <Text fontSize="13px" fontWeight="700" color="gray.800" textAlign="right">
                          {almacen.etapa === "ENTREGADA_TIENDA"
                            ? `${almacen.salida.recibidoPorNombre || "--"}${almacen.salida.recibidoPorDni ? ` (DNI ${almacen.salida.recibidoPorDni})` : ""}`
                            : `${almacen.salida.vehiculoPlaca || "--"} · ${almacen.salida.choferNombre || "--"}`}
                        </Text>
                      </Flex>
                    </>
                  )}
                  {almacen.guiasJuntas?.length > 0 && (
                    <Text fontSize="11.5px" color="gray.500">
                      Sale junto con la(s) guía(s): {almacen.guiasJuntas.join(", ")}
                    </Text>
                  )}
                </VStack>
              )}
            </Box>
          </Box>
        </Flex>
      </VStack>
    </Box>
  );
}
