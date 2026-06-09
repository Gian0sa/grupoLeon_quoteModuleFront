import { Box, Table, Tbody, Tr, Td, Text } from '@chakra-ui/react';

export default function ProductSpecsTable({ product }) {
  if (!product.weight && !product.specifications?.length && !product.packageQty) {
    return null;
  }

  return (
    <Box bg="white">
      <Box bg="green.600" color="white" px={4} py={1}>
        <Text fontWeight="bold" fontSize="sm">MEDIDAS</Text>
      </Box>
      <Box maxHeight="100px" overflowY="auto">
        <Table size="sm" variant="simple">
          <Tbody>
          {product.weight && (
            <Tr display={{ base: "block", md: "table-row" }}>
              <Td display={{ base: "block", md: "table-cell" }} fontWeight="medium" bg="gray.50">Peso</Td>
              <Td display={{ base: "block", md: "table-cell" }}>{product.weight} {product.unit || 'kg'}</Td>
            </Tr>
          )}
          {product.specifications?.map((spec, index) => (
            <Tr key={index} display={{ base: "block", md: "table-row" }}>
              <Td display={{ base: "block", md: "table-cell" }} fontWeight="medium" bg="gray.50">{spec.name}</Td>
              <Td display={{ base: "block", md: "table-cell" }}>{spec.value}</Td>
            </Tr>
          ))}
          {product.packageQty && (
            <Tr display={{ base: "block", md: "table-row" }}>
              <Td display={{ base: "block", md: "table-cell" }} fontWeight="medium" bg="gray.50">Unidades</Td>
              <Td display={{ base: "block", md: "table-cell" }}>{product.packageQty}</Td>
            </Tr>
          )}
        </Tbody>
      </Table>
      </Box>
    </Box>
  );
}
