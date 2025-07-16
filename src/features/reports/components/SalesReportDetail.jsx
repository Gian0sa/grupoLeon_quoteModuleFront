import React from "react";
import {
  Box,
  Flex,
  Text,
  Heading,
  Grid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Button,
  useBreakpointValue
} from "@chakra-ui/react";
import { Check, AlertTriangle } from "lucide-react";

const Step = ({ title, status }) => {
  const icon = {
    complete: <Check color="green" size={20} />,
    warning: <AlertTriangle color="orange" size={20} />,
    pending: <Box w={3} h={3} bg="gray.400" borderRadius="full" />,
  }[status];

  const color = {
    complete: "green.400",
    warning: "orange.300",
    pending: "gray.400",
  }[status];

  return (
    <Flex direction="column" align="center" gap={1} flex={1}>
      {icon}
      <Text fontSize="xs" fontWeight="semibold" color={color} textAlign="center">
        {title}
      </Text>
    </Flex>
  );
};

const TrackingPage = ({ orden }) => {
  const productos = orden.productos || [];
  const entregas = orden.entrega || [];
  const facturas = orden.factura || [];

  const bgMain = useColorModeValue("gray.50", "gray.900");
  const bgCard = useColorModeValue("white", "gray.800");
  const textMuted = useColorModeValue("gray.600", "gray.400");
  const textBase = useColorModeValue("gray.800", "white");

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

  const handleVerOrden = () => {
    console.log("Detalles de orden:", orden.orden);
  };

  const handleVerEntrega = (entrega) => {
    console.log("Detalles de entrega:", entrega);
  };

  const handleVerFactura = (factura) => {
    console.log("Detalles de factura:", factura);
  };

  return (
    <Box
      bg={bgMain}
      p={{ base: 4, md: 6 }}
      borderRadius="xl"
      boxShadow="xl"
      w="full"
      maxW="6xl"
    >
      <Heading size="lg" mb={2} color={textBase}>
        Pedido #{orden.orden.numero}
      </Heading>
      <Text fontSize="sm" color={textMuted} mb={4}>
        Cliente: {orden.cliente.nombre} ({orden.cliente.codigo}) - {orden.orden.fechaCreacion}
      </Text>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} mt={6}>
        {/* Productos */}
        <Box bg={bgCard} p={3} borderRadius="md" shadow="sm">
          <Heading size="sm" mb={2} color={textBase}>Productos</Heading>
          <Table variant="simple" size="sm" fontSize="xs">
            <Thead>
              <Tr>
                <Th color={textMuted}>Prod.</Th>
                <Th color={textMuted}>Sol.</Th>
                <Th color={textMuted}>Ent.</Th>
              </Tr>
            </Thead>
            <Tbody>
              {productos.map((prod, idx) => {
                const esPendiente = prod.cantidadPendiente > 0;

                // Solo mostrar los primeros 10 caracteres en pantallas pequeñas
                const isMobile = useBreakpointValue({ base: true, md: false });
                const descripcionCorta =
                  isMobile && prod.descripcion.length > 10
                    ? prod.descripcion.slice(0, 10) + "..."
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

        {/* Extra Info: Orden, Entrega, Factura */}
        <Flex direction="column" gap={4}>
          <Box bg={bgCard} p={4} borderRadius="md" shadow="md">
            <Heading size="sm" mb={1} color={textBase}>Orden de Venta</Heading>
            <Text color={textBase}>Condición: {orden.orden.condicionPago}</Text>
            <Text color={textBase}>Monto Orden: ${orden.orden.montoUsd.toFixed(2)}</Text>
            <Button mt={2} size="sm" onClick={handleVerOrden}>
              Ver detalles
            </Button>
          </Box>

          <Box bg={bgCard} p={4} borderRadius="md" shadow="md">
            <Heading size="sm" mb={1} color={textBase}>Entrega</Heading>
            {entregas.length > 0 ? (
              entregas.map((e, idx) => (
                <Flex key={idx} justify="space-between" align="center" mb={1}>
                  <Text color={textBase}>Fecha: {e.fecha}</Text>
                  <Button size="xs" onClick={() => handleVerEntrega(e)}>
                    Ver detalles
                  </Button>
                </Flex>
              ))
            ) : (
              <Text color={textMuted}>No se ha realizado entrega</Text>
            )}
          </Box>

          <Box bg={bgCard} p={4} borderRadius="md" shadow="md">
            <Heading size="sm" mb={1} color={textBase}>Factura</Heading>
            {facturas.length > 0 ? (
              facturas.map((f, idx) => (
                <Flex key={idx} justify="space-between" align="center" mb={1}>
                  <Text color={textBase}>Fecha: {f.fecha} - ${f.montoUsd.toFixed(2)}</Text>
                  <Button size="xs" onClick={() => handleVerFactura(f)}>
                    Ver detalles
                  </Button>
                </Flex>
              ))
            ) : (
              <Text color={textMuted}>No facturado</Text>
            )}
          </Box>
        </Flex>
      </Grid>
    </Box>
  );
};

export default TrackingPage;
