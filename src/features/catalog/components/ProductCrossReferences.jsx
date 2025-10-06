import { Box, Table, Tbody, Tr, Td, Text } from '@chakra-ui/react';

export default function ProductCrossReferences({ product }) {
  if (!product.crossReferences?.length) return null;

  return (
    <Box bg="white" mt={2}>
      <Box bg="red.600" color="white" px={4} py={1}>
        <Text fontWeight="bold" fontSize="sm">EQUIVALENCIA</Text>
      </Box>
      <Table size="sm" variant="simple">
        <Tbody>
          {product.crossReferences.map((ref, index) => (
            <Tr key={index}>
              <Td fontWeight="medium" bg="gray.50">{ref.referenceBrand}</Td>
              <Td>{ref.referenceCode}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
