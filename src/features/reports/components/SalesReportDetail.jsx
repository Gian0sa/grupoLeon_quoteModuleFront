import { useState } from "react";
import {
  Box,
  Flex,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Button,
  useBreakpointValue,
  VStack,
  HStack,
  Divider,
  Badge,
  Circle,
  Spinner
} from "@chakra-ui/react";
import { Check, X } from "lucide-react";
import { getOrderByCode , getDeliveryNoteByCode , getInvoiceByCode } from "../services/reportService";
import { useGetCompareOrderAndDeliveryNote } from "../hooks/queries/reportQueries";
import {
  generateOrderPDF,
  generateDeliveryPDF,
  downloadInvoicePDF
} from "../utils/pdfGenerators";

const TrackingPage = ({ orden, data }) => {

  const [loadingOrden, setLoadingOrden] = useState(false);
  const [loadingEntrega, setLoadingEntrega] = useState(false);
  const [loadingFactura, setLoadingFactura] = useState(false);

  const bgMain = useColorModeValue("white", "gray.800");
  const bgSection = useColorModeValue("gray.50", "gray.700");
  const textMuted = useColorModeValue("gray.600", "gray.400");
  const textBase = useColorModeValue("gray.800", "white");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const isMobile = useBreakpointValue({ base: true, md: false }); 

  // Mapear datos de la orden (del prop orden)
  const ordenData = {
    id: orden?.DocEntry,
    numero: orden?.DocNum,
    fechaCreacion: orden?.DocDate 
  ? new Date(orden.DocDate + "T00:00:00").toLocaleDateString("es-ES") 
  : '',
    montoUsd: orden?.DocTotalUSD || orden?.DocTotalUSD || 0
  };

  const clienteData = {
    nombre: orden?.CardName || '',
    codigo: orden?.CardCode || ''
  };

  // Mapear datos de seguimiento (del prop data)
  const seguimientoData = data?.[0] || {};
  
  const entregas = seguimientoData.DELIVERY_DATE ? [{
    id: seguimientoData.DELIVERY_ENTRY,
    fecha: new Date(seguimientoData.DELIVERY_DATE).toLocaleDateString('es-ES')
  }] : [];

  const facturas = seguimientoData.INVOICE_DATE ? [{
    id: seguimientoData.INVOICE_ENTRY,
    fecha: new Date(seguimientoData.INVOICE_DATE).toLocaleDateString('es-ES'),
    montoUsd: seguimientoData.MONTO_INVOICE || 0
  }] : [];

  // IDs para los servicios
  const orderId = ordenData.id;
  const entregaId = entregas[0]?.id;
  const facturaId = facturas[0]?.id;

  const { data: comparisonData, isLoading, error } = useGetCompareOrderAndDeliveryNote(
    orderId, 
    entregaId, 
    {
      enabled: Boolean(orderId)
    }
  );

  const handleVerOrden = async () => {
    if (!orderId) return;
    setLoadingOrden(true);
    try {
      const ordenDetalle = await getOrderByCode(orderId);
      await generateOrderPDF(ordenDetalle);
    } catch (error) {
      console.error("Error al obtener orden:", error);
    } finally {
      setLoadingOrden(false);
    }
  };

  const handleVerEntrega = async () => {
    if (!entregaId) return;
    setLoadingEntrega(true);
    try {
      const entregaDetalle = await getDeliveryNoteByCode(entregaId);
      await generateDeliveryPDF(entregaDetalle);
    } catch (error) {
      console.error("Error al obtener entrega:", error);
    } finally {
      setLoadingEntrega(false);
    }
  };

  const handleVerFactura = async () => {
    if (!facturaId) return;
    setLoadingFactura(true);
    try {
      const invoiceDetalle = await getInvoiceByCode(facturaId);
      await downloadInvoicePDF(invoiceDetalle);
    } catch (error) {
      console.error("Error al obtener factura:", error);
    } finally {
      setLoadingFactura(false);
    }
  };

  // Mapear productos comparados
  const productosComparados = (comparisonData || []).map(item => ({
    codigo: item.ItemCode,
    descripcion: item.Description,
    cantidadOrdenada: item.RequestedQty,
    cantidadEntregada: item.DeliveredQty,
    cantidadPendiente: Math.max(item.RequestedQty - item.DeliveredQty, 0),
    tieneDiferencia: item.hasDifference
  }));

  return (
    <Box
      bg={bgMain}
      borderRadius="lg"
      boxShadow="xl"
      w="full"
      maxW="2xl"
      mx="auto"
      overflow="hidden"
      border="1px"
      borderColor={borderColor}
    >
      {/* Main Content */}
      <Box>
        {/* Step 1: Orden de venta */}
        <Flex mb={6}>
          {/* Progress Indicator */}
          <Flex direction="column" align="center" minW="60px">
            <Circle
              size="32px"
              bg="green.500"
              color="white"
              mb={2}
            >
              <Check size={16} />
            </Circle>
            <Box
              w="2px"
              flex={1}
              bg="green.500"
              minH="80px"
            />
          </Flex>

          {/* Content */}
          <Box flex={1}>
            <Box bg={bgSection} borderRadius="md">
              {/* Pedido Header */}
              <HStack spacing={3} mb={6}>
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold" fontSize="lg" color="green.600">
                    Pedido #{ordenData.numero}
                  </Text>
                  <HStack>
                    <Text justifyContent="start" alignItems="start">Cliente:</Text>
                    <Text fontSize="sm" fontWeight="bold" color={textMuted}>
                      {clienteData.nombre} ({clienteData.codigo})
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontSize="sm" color={textMuted}>Fecha:</Text>
                    <Text fontSize="sm" color={textMuted}>
                      {ordenData.fechaCreacion}
                    </Text>
                  </HStack>
                </VStack>
              </HStack>

              {/* Productos Section */}
              <Box bg={bgSection} borderRadius="md" mb={6}>
                <Text fontWeight="bold" fontSize="md" mb={3} color="green.600">
                  Productos
                </Text>

                {isLoading ? (
                  <Flex justify="center" align="center" py={10}>
                    <Spinner size="lg" color="green.500" thickness="4px" />
                  </Flex>
                ) : (
                  <Table variant="simple" size="sm" bg="white" borderRadius="md">
                    <Thead>
                      <Tr bg="green.500">
                        <Th color="white" fontSize="xs" py={2}>NOMBRE DEL PRODUCTO</Th>
                        <Th color="white" fontSize="xs" py={2} textAlign="center">SOL.</Th>
                        <Th color="white" fontSize="xs" py={2} textAlign="center">ENT.</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {productosComparados.map((prod, idx) => {
                        const esPendiente = prod.cantidadPendiente > 0;
                        const descripcionCorta =
                          isMobile && prod.descripcion.length > 30
                            ? prod.descripcion.slice(0, 30) + "..."
                            : prod.descripcion;

                        return (
                          <Tr
                            key={idx}
                            bg={esPendiente ? useColorModeValue("green.100", "green.900") : "transparent"}
                          >
                            <Td color={textBase}>
                              <Text noOfLines={1}>
                                {descripcionCorta}
                                {esPendiente && (
                                  <Text as="span" ml={1} fontSize="xs" color="orange.400">
                                    (Pend.)
                                  </Text>
                                )}
                              </Text>
                            </Td>
                            <Td color={textBase} textAlign="center">{prod.cantidadOrdenada}</Td>
                            <Td color={textBase} textAlign="center">{prod.cantidadEntregada}</Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                )}
              </Box>
              
              <Text fontWeight="bold" fontSize="md" mb={3} color="green.600">
                Orden de venta
              </Text>
              <Box bg="white" p={3} borderRadius="md">
                <HStack justify="space-between" mb={3}>
                  <Text fontSize="sm" color={textMuted}>Monto:</Text>
                  <Text fontSize="sm" fontWeight="medium">${ordenData.montoUsd.toFixed(2)}</Text>
                </HStack>
                {/* <Button 
                  size="sm" 
                  colorScheme="green" 
                  variant="solid"
                  w="50%"
                  position="relative"
                  right="0px"
                  onClick={handleVerOrden}
                  isLoading={loadingOrden}
                  isDisabled={!orderId || loadingOrden}
                >
                  Ver detalles
                </Button> */}
              </Box>
            </Box>
          </Box>
        </Flex>

        {/* Step 2: Entrega */}
        <Flex mb={facturas.length > 0 ? 6 : 0}>
          {/* Progress Indicator */}
          <Flex direction="column" align="center" minW="60px">
            <Circle
              size="32px"
              bg={entregas.length > 0 ? "green.500" : "gray.400"}
              color="white"
              mb={2}
            >
              {entregas.length > 0 ? <Check size={16} /> : <Circle size="8px" bg="white" />}
            </Circle>
            
            <Box
              w="2px"
              flex={1}
              bg={facturas.length > 0 ? "green.500" : "gray.400"}
              minH="80px"
            />
          </Flex>

          {/* Content */}
          <Box flex={1}>
            <Box bg={bgSection} p={4} borderRadius="md">
              <Text fontWeight="bold" fontSize="md" mb={3} color="green.600">
                Picking
              </Text>
              <Box bg="white" p={3} borderRadius="md">
                {entregas.length > 0 ? (
                  entregas.map((e, idx) => (
                    <Box key={idx}>
                      <HStack justify="space-between" mb={3}>
                        <Text fontSize="sm" color={textMuted}>Fecha:</Text>
                        <Text fontSize="sm" fontWeight="medium">{e.fecha}</Text>
                      </HStack>
                      {/* <Button
                        size="sm" 
                        colorScheme="green" 
                        variant="solid"
                        w="50%"
                        position="relative"
                        right="0px"
                        onClick={handleVerEntrega}
                        isLoading={loadingEntrega}
                        isDisabled={!entregaId || loadingEntrega}
                      >
                        Ver detalles
                      </Button> */}
                    </Box>
                  ))
                ) : (
                  <Text fontSize="sm" color={textMuted} textAlign="center">
                    No se ha realizado entrega
                  </Text>
                )}
              </Box>
            </Box>
          </Box>
        </Flex>

        {/* Step 3: Factura */}
        <Flex>
          {/* Progress Indicator */}
          <Flex direction="column" align="center" minW="60px">
            <Circle
              size="32px"
              bg={facturas.length > 0 ? "green.500" : "gray.400"}
              color="white"
            >
              {facturas.length > 0 ? <Check size={16} /> : <Circle size="8px" bg="white" />}
            </Circle>
          </Flex>

          {/* Content */}
          <Box flex={1}>
            <Box bg={bgSection} p={4} borderRadius="md">
              <Text fontWeight="bold" fontSize="md" mb={3} color="green.600">
                Factura
              </Text>
              <Box bg="white" p={3} borderRadius="md">
                {facturas.length > 0 ? (
                  facturas.map((f, idx) => (
                    <Box key={idx} mb={4}>
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" color={textMuted}>Fecha:</Text>
                        <Text fontSize="sm" fontWeight="medium">{f.fecha}</Text>
                      </HStack>
                      <HStack justify="space-between" mb={3}>
                        <Text fontSize="sm" color={textMuted}>Monto:</Text>
                        <Text fontSize="sm" fontWeight="medium">${f.montoUsd.toFixed(2)}</Text>
                      </HStack>
                      <Button
                        size="sm" 
                        colorScheme="green" 
                        variant="solid"
                        w="50%"
                        position="relative"
                        right="0px"
                        onClick={handleVerFactura}
                        isLoading={loadingFactura}
                        isDisabled={!facturaId || loadingFactura}
                      >
                        Ver detalles
                      </Button>
                    </Box>
                  ))
                ) : (
                  <Text fontSize="sm" color={textMuted} textAlign="center">
                    No se ha realizado factura
                  </Text>
                )}
              </Box>
            </Box>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
};

export default TrackingPage;