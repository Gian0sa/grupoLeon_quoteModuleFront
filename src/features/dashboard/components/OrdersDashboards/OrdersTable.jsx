import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, useColorModeValue } from "@chakra-ui/react";

export default function OrdersTable() {
  const cardBg = useColorModeValue("white", "gray.800");

  const tableData = [
    {
      id: 1,
      cliente: "Empresa A",
      fecha: "12/09/2025",
      total: "1,000",
      estado: "Falta de stock",
      diasPendiente: 1,
      vendedor: "Jorge",
      almacen: "Almacén 1",
    },
    {
      id: 2,
      cliente: "Empresa C",
      fecha: "12/09/2025",
      total: "3,300",
      estado: "Pendiente",
      diasPendiente: 28,
      vendedor: "Ana",
      almacen: "Almacén 2",
    },
  ];

  return (
    <Box bg={cardBg} p={4} rounded="2xl" shadow="md">
      <Heading size="sm" mb={4}>
        Detallada de Órdenes Pendientes
      </Heading>
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Cliente</Th>
            <Th>Fecha</Th>
            <Th>Total</Th>
            <Th>Estado</Th>
            <Th>Días Pendiente</Th>
            <Th>Vendedor</Th>
            <Th>Almacén</Th>
          </Tr>
        </Thead>
        <Tbody>
          {tableData.map((row) => (
            <Tr key={row.id}>
              <Td>{row.id}</Td>
              <Td>{row.cliente}</Td>
              <Td>{row.fecha}</Td>
              <Td>{row.total}</Td>
              <Td>{row.estado}</Td>
              <Td>{row.diasPendiente}</Td>
              <Td>{row.vendedor}</Td>
              <Td>{row.almacen}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
