import { Box, Table, Tbody, Tr, Td, Text, Badge } from '@chakra-ui/react';

export default function ProductRelations({ relations }) {
  if (!relations?.length) return null;

  console.log(relations)

  return (
    <Box bg="white" mt={2}>
      <Box bg="green.600" color="white" px={4} py={1}>
        <Text fontWeight="bold" fontSize="sm">RELACIONES DE PRODUCTO</Text>
      </Box>

      <Box maxHeight="120px" overflowY="auto">
        <Table size="sm" variant="simple">
          <Tbody>
          {relations.map((rel, index) => (
            <Tr key={rel.id || index}>
              <Td fontWeight="medium" bg="gray.50">{rel.name}</Td>
              <Td>{rel.code}</Td>
              <Td>
                <Badge colorScheme={rel.type === "internal" ? "blue" : "green"}>
                  {rel.type === "internal" ? "Interno" : "Externo"}
                </Badge>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      </Box>
    </Box>
  );
}
