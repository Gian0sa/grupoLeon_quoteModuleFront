import { Table, Thead, Tbody, Tr, Th, Td, TableContainer, Text } from "@chakra-ui/react";

export default function OrdersMotive({ ordersMotive }) {
  // Ejemplo de estructura esperada:
  // ordersMotive = [
  //   { motivo: "Falta de stock", cantidad: 12 },
  //   { motivo: "Anulación por cliente", cantidad: 8 },
  //   { motivo: "Error de digitación", cantidad: 3 },
  //   { motivo: "Otros", cantidad: 2 },
  // ];

  return (
    <TableContainer borderWidth="1px" borderRadius="lg" p={4} bg="white" shadow="sm">
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Motivos de No Atención
      </Text>
      <Table variant="simple">
        <Thead bg="gray.100">
          <Tr>
            <Th>Motivo</Th>
            <Th isNumeric>Cantidad</Th>
          </Tr>
        </Thead>
        <Tbody>
          {ordersMotive && ordersMotive.length > 0 ? (
            ordersMotive.map((item, index) => (
              <Tr key={index}>
                <Td>{item.motivo}</Td>
                <Td isNumeric>{item.cantidad}</Td>
              </Tr>
            ))
          ) : (
            <Tr>
              <Td colSpan={2} textAlign="center" py={4} color="gray.500">
                No hay datos disponibles
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
