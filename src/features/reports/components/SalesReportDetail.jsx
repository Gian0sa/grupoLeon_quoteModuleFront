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
  Badge
} from "@chakra-ui/react";
import { Check } from "lucide-react";
import { getOrderByCode , getDeliveryNoteByCode , getInvoiceByCode } from "../services/reportService";
import {
  generateOrderPDF,
  generateDeliveryPDF,
  downloadInvoicePDF
} from "../utils/pdfGenerators";

const TrackingPage = ({ orden }) => {
  const productos = orden.productos || [];
  const entregas = orden.entrega || [];
  const facturas = orden.factura || [];

  const orderId = orden?.orden?.id;
  const entregaId = orden?.entrega?.[0]?.id;
  const facturaId = orden?.factura?.[0]?.id;

  
  const [loadingOrden, setLoadingOrden] = useState(false);
  const [loadingEntrega, setLoadingEntrega] = useState(false);
  const [loadingFactura, setLoadingFactura] = useState(false);

  const bgMain = useColorModeValue("white", "gray.800");
  const bgSection = useColorModeValue("gray.50", "gray.700");
  const textMuted = useColorModeValue("gray.600", "gray.400");
  const textBase = useColorModeValue("gray.800", "white");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const steps = [
    { title: "Orden de Venta", status: "complete" },
    {
      title: "Preparando Entrega",
      status: entregas.length > 0 ? "complete" : "pending",
    },
    {
      title: "Entrega",
      status:
        entregas.length > 0
          ? productos.some((p) => p.cantidadPendiente > 0)
            ? "warning"
            : "complete"
          : "pending",
    },
    {
      title: "Facturado",
      status: facturas.length > 0 ? "complete" : "pending",
    },
  ];

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

  return (
    <Box
      bg={bgMain}
      borderRadius="lg"
      boxShadow="xl"
      w="full"
      maxW="md"
      mx="auto"
      overflow="hidden"
      border="1px"
      borderColor={borderColor}
    >
      

      {/* Pedido Info */}
      <Box px={4} py={4}>
        <HStack spacing={3} mb={3}>
          <Box 
            w={10} h={10} 
            bg="green.500" 
            borderRadius="full" 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
          >
            <Check color="white" size={20} />
          </Box>
          <VStack align="start" spacing={0}>
            <Text fontWeight="bold" fontSize="lg" color="green.600">
              Pedido #{orden.orden.numero}
            </Text>
            <Text fontSize="sm" color={textMuted}>
              Cliente {orden.cliente.nombre} ({orden.cliente.codigo})
            </Text>
            <Text fontSize="sm" color={textMuted}>
              Fecha: {orden.orden.fechaCreacion}
            </Text>
          </VStack>
        </HStack>
      </Box>

      {/* Productos Section */}
      <Box bg={bgSection} px={4} py={4}>
        <Text fontWeight="bold" fontSize="md" mb={3} color="green.600">
          Productos
        </Text>
        <Table variant="simple" size="sm">
          <Thead>
            <Tr bg="green.500">
              <Th color="white" fontSize="xs" py={2}>Nombre del producto</Th>
              <Th color="white" fontSize="xs" py={2} textAlign="center">Sol.</Th>
              <Th color="white" fontSize="xs" py={2} textAlign="center">Ent.</Th>
            </Tr>
          </Thead>
          <Tbody>
            {productos.map((prod, idx) => {
              const esPendiente = prod.cantidadPendiente > 0;
              const isMobile = useBreakpointValue({ base: true, md: false });
              const descripcionCorta =
                isMobile && prod.descripcion.length > 20
                  ? prod.descripcion.slice(0, 20) + "..."
                  : prod.descripcion;

               return (
                  <Tr
                    key={idx}
                    bg={esPendiente ? useColorModeValue("yellow.100", "yellow.900") : "transparent"}
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
                    <Td color={textBase}>{prod.cantidadOrdenada}</Td>
                    <Td color={textBase}>{prod.cantidadEntregada}</Td>
                  </Tr>
                );
              })}
          </Tbody>
        </Table>
      </Box>

      <Divider />

      {/* Orden de venta */}
      <Box bg={bgSection} px={4} py={4}>
        <Text fontWeight="bold" fontSize="md" mb={3} color="green.600">
          Orden de venta
        </Text>
        <Box bg="white" p={3} borderRadius="md">
          <HStack justify="space-between" mb={2}>
            <Text fontSize="sm" color={textMuted}>Condición:</Text>
            <Text fontSize="sm" fontWeight="medium">{orden.orden.condicionPago}</Text>
          </HStack>
          <HStack justify="space-between" mb={3}>
            <Text fontSize="sm" color={textMuted}>Monto:</Text>
            <Text fontSize="sm" fontWeight="medium">${orden.orden.montoUsd.toFixed(2)}</Text>
          </HStack>
         <Button 
          size="sm" 
          colorScheme="green" 
          variant="solid"
          w="full"
          onClick={handleVerOrden}
          isLoading={loadingOrden}
          isDisabled={!orderId || loadingOrden}
        >
          Ver detalles
        </Button>
        </Box>
      </Box>

      <Divider />

      {/* Entrega */}
      <Box bg={bgSection} px={4} py={4}>
        <Text fontWeight="bold" fontSize="md" mb={3} color="green.600">
          Entrega
        </Text>
        <Box bg="white" p={3} borderRadius="md">
          {entregas.length > 0 ? (
            entregas.map((e, idx) => (
              <Box key={idx}>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" color={textMuted}>Fecha:</Text>
                  <Text fontSize="sm" fontWeight="medium">{e.fecha}</Text>
                </HStack>
                <Button
                  size="sm"
                  colorScheme="green"
                  variant="solid"
                  w="full"
                  onClick={handleVerEntrega}
                  isLoading={loadingEntrega}
                  isDisabled={!entregaId || loadingEntrega}
                >
                  Ver detalles
                </Button>
              </Box>
            ))
          ) : (
            <Text fontSize="sm" color={textMuted} textAlign="center">
              No se ha realizado entrega
            </Text>
          )}
        </Box>
      </Box>

      <Divider />

      {/* Factura */}
      <Box bg={bgSection} px={4} py={4}>
        <Text fontWeight="bold" fontSize="md" mb={3} color="green.600">
          Factura
        </Text>
        <Box bg="white" p={3} borderRadius="md">
          {facturas.length > 0 ? (
            facturas.map((f, idx) => (
              <Box key={idx}>
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
                  w="full"
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
              No facturado
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TrackingPage;