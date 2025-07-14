import React from "react";
import {
  Box,
  Flex,
  Text,
  Heading,
  Button,
  Grid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
} from "@chakra-ui/react";
import { Check, AlertTriangle } from "lucide-react";

const Step = ({ title, status }) => {
  const icon = {
    complete: <Check color="green" />,
    warning: <AlertTriangle color="orange" />,
    pending: <Box w={3} h={3} bg="gray.400" borderRadius="full" />,
  }[status];

  const color = {
    complete: "green.400",
    warning: "orange.300",
    pending: "gray.400",
  }[status];

  return (
    <Flex direction="column" align="center">
      {icon}
      <Text fontSize="sm" color={color}>
        {title}
      </Text>
    </Flex>
  );
};
const TrackingPage = ({ orden }) => {
  const productos = orden.productos || [];
  const entregas = orden.entrega || [];
  const facturas = orden.factura || [];

  const bgMain = useColorModeValue("gray.100", "#0B0B1C");
  const bgCard = useColorModeValue("white", "#13132A");
  const textMuted = useColorModeValue("gray.600", "gray.400");

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
            ? "warning" // Hay entrega pero no completa
            : "complete" // Entrega completa
          : "pending", // Aún no hay entrega
    },
    {
      title: "Facturado",
      status: facturas.length > 0 ? "complete" : "pending",
    },
  ];


  return (
    <Box bg={bgMain} p={6} borderRadius="xl" boxShadow="xl">
      <Heading size="lg" color="white">Pedido #{orden.orden.numero}</Heading>
      <Text fontSize="sm" color={textMuted}>
        Cliente: {orden.cliente.nombre} ({orden.cliente.codigo}) - {orden.orden.fechaCreacion}
      </Text>

      {/* Tracker */}
      <Flex justify="space-between" borderTop="1px" borderBottom="1px" borderColor="gray.600" py={4} gap={4}>
        {steps.map((step, i) => (
          <Step key={i} title={step.title} status={step.status} />
        ))}
      </Flex>

      {/* Productos */}
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} mt={6}>
        <Box bg={bgCard} p={4} borderRadius="md" shadow="md">
          <Heading size="md" mb={3} color="white">Resumen del Pedido</Heading>
          <Table variant="simple" size="sm" colorScheme="whiteAlpha">
            <Thead>
              <Tr>
                <Th color={textMuted}>Producto</Th>
                <Th color={textMuted}>Solicitada</Th>
                <Th color={textMuted}>Entregada</Th>
              </Tr>
            </Thead>
            <Tbody>
              {productos.map((prod, idx) => {
                const esPendiente = prod.cantidadPendiente > 0;

                return (
                  <Tr
                    key={idx}
                    bg={esPendiente ? "orange.100" : "transparent"}
                    _dark={{ bg: esPendiente ? "orange.900" : "transparent" }}
                  >
                    <Td color="white">
                      {prod.descripcion}
                      {esPendiente && (
                        <Text as="span" ml={2} fontSize="xs" color="orange.300">
                          (Pendiente)
                        </Text>
                      )}
                    </Td>
                    <Td color="white">{prod.cantidadOrdenada}</Td>
                    <Td color="white">{prod.cantidadEntregada}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>

        {/* Información extra */}
        <Flex direction="column" gap={4}>
          <Box bg={bgCard} p={4} borderRadius="md" shadow="md">
            <Heading size="sm" mb={1} color="white">Orden de Venta</Heading>
            <Text color="white">Condición: {orden.orden.condicionPago}</Text>
          </Box>

          <Box bg={bgCard} p={4} borderRadius="md" shadow="md">
            <Heading size="sm" mb={1} color="white">Entrega</Heading>
            {entregas.map((e, idx) => (
              <Text key={idx} color="white">Fecha: {e.fecha} - ${e.montoUsd}</Text>
            ))}
          </Box>

          <Box bg={bgCard} p={4} borderRadius="md" shadow="md">
            <Heading size="sm" mb={1} color="white">Factura</Heading>
            {facturas.map((f, idx) => (
              <Text key={idx} color="white">Fecha: {f.fecha} - ${f.montoUsd}</Text>
            ))}
          </Box>
        </Flex>
      </Grid>
    </Box>
  );
};

export default TrackingPage;
