import {
  Box,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  TableContainer,
  Text,
} from "@chakra-ui/react";

export function RequestQuoteProductSection({ products }) {
  if (!products || products.length === 0) {
    return <Text>No hay productos en esta cotización.</Text>;
  }

  return (
    <Box mt={6}>
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Productos de la cotización
      </Text>
      <TableContainer>
        <Table variant="striped" colorScheme="gray">
          <Thead>
            <Tr>
              <Th>Detalle</Th>
              <Th isNumeric>Cantidad</Th>
              <Th isNumeric>Precio $</Th>
              <Th isNumeric>Total $</Th>
            </Tr>
          </Thead>
          <Tbody>
            {products.map((product) => (
              <Tr key={product.id}>
                <Td>
                  <Text fontWeight="medium">{product.name}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {product.productName}
                  </Text>
                </Td>
                <Td isNumeric>{product.quantity}</Td>
                <Td isNumeric>{Number(product.importe).toFixed(2)}</Td>
                <Td isNumeric>
                  {(product.quantity * product.importe).toFixed(2)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}
