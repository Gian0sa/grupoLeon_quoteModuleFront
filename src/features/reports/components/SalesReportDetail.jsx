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
import { useGetCompareOrderAndDeliveryNote } from "../hooks/queries/reportQueries";
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

export default function TrackingPage({ orden, data }) {
  const [loadingOrden, setLoadingOrden] = useState(false);
  const [loadingEntrega, setLoadingEntrega] = useState(false);
  const [loadingFactura, setLoadingFactura] = useState(false);

  const handleDownloadInvoice = async (facturaId) => {
    if (!facturaId) return;
    setLoadingFactura(true);
    try {
      const invoiceData = await getInvoiceByCode(facturaId);
      const referenceCode = invoiceData?.numAtCard || invoiceData?.NumAtCard;
      if (referenceCode) {
        await downloadInvoicePDFdirectly(referenceCode);
      } else {
        await downloadInvoicePDFdirectly(facturaId);
      }
    } catch (err) {
      console.error("Error al descargar factura:", err);
      alert("No se pudo descargar la factura.");
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

  // Mapear datos de la orden
  const ordenData = {
    id: orden?.DocEntry || orden?.orden?.id,
    numero: orden?.DocNum || orden?.orden?.numero,
    fechaCreacion: orden?.DocDate
      ? new Date(orden.DocDate + "T00:00:00").toLocaleDateString("es-ES")
      : "",
    montoUsd: orden?.DocTotalUSD || orden?.DocTotalUSD || 0,
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
          fecha: new Date(seguimientoData.DELIVERY_DATE).toLocaleDateString(
            "es-ES"
          ),
        },
      ]
    : [];

  const facturas = seguimientoData.INVOICE_DATE
    ? [
        {
          id: seguimientoData.INVOICE_ENTRY,
          fecha: new Date(seguimientoData.INVOICE_DATE).toLocaleDateString(
            "es-ES"
          ),
          montoUsd: seguimientoData.MONTO_INVOICE || 0,
        },
      ]
    : [];

  // IDs para los servicios
  const orderId = ordenData.id;
  const entregaId = entregas[0]?.id;
  const facturaId = facturas[0]?.id;

  const { data: comparisonData, isLoading } =
    useGetCompareOrderAndDeliveryNote(orderId, entregaId, {
      enabled: Boolean(orderId),
    });

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
                            bg={esPendiente ? useColorModeValue("amber.50", "orange.950") : "transparent"}
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
                  {ordenData?.montoUsd
                    ? `$${Number(ordenData.montoUsd).toFixed(2)} USD`
                    : orden?.ordenData?.total
                    ? `$${Number(orden.ordenData.total).toFixed(2)} USD`
                    : "--"}
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
              Picking / Entrega
            </Text>
            <Box bg="white" p={3} borderRadius="lg" border="1px solid" borderColor="gray.100">
              {entregas.length > 0 ? (
                entregas.map((e, idx) => (
                  <Flex key={idx} justify="space-between" align="center">
                    <Text fontSize="13px" color="gray.600">Fecha de entrega:</Text>
                    <Text fontSize="13px" fontWeight="700" color="gray.800">{e.fecha}</Text>
                  </Flex>
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
                      <Text fontSize="13px" color="gray.600">Fecha factura:</Text>
                      <Text fontSize="13px" fontWeight="700" color="gray.800">{f.fecha}</Text>
                    </Flex>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="13px" color="gray.600">Monto facturado:</Text>
                      <Text fontSize="13px" fontWeight="800" color="green.600">${Number(f.montoUsd).toFixed(2)} USD</Text>
                    </Flex>
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
      </VStack>
    </Box>
  );
}