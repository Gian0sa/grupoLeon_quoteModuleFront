import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Center,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";

export default function OrdersCancelatedTable({ data, isLoading, isError }) {
  const tableBg = useColorModeValue("white", "gray.800");

  console.log("la data para la tabla de ordenes canceladas", data);

  if (isLoading) {
    return (
      <Center my={6}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center my={6}>
        <Text color="red.500">Error al cargar los pedidos cancelados.</Text>
      </Center>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Center my={6}>
        <Text>No hay pedidos cancelados para los filtros seleccionados.</Text>
      </Center>
    );
  }

  return (
    <Box mt={8} bg={tableBg} p={4} rounded="lg" shadow="md">
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Pedidos Cancelados
      </Text>
      <Table variant="simple" size="md">
        <Thead>
          <Tr>
            <Th>Código Vendedor</Th>
            <Th>Nombre Vendedor</Th>
            <Th>Número Pedido</Th>
            <Th>Cliente</Th>
            <Th>Motivo Cancelación</Th>
            <Th isNumeric>Unidades Canceladas</Th>
            <Th>Fecha</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.map((item, index) => (
            <Tr key={index}>
              <Td>{item.sellerCode}</Td>
              <Td>{item.sellerName}</Td>
              <Td>{item.orderNumber}</Td>
              <Td>{item.clientName}</Td>
              <Td>{item.cancellationReason}</Td>
              <Td isNumeric>{item.totalUnits}</Td>
              <Td>{item.orderDate}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
