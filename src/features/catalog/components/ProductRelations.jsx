import { Box, Table, Tbody, Tr, Td, Text, Badge, HStack, Flex } from '@chakra-ui/react';
import { ArrowRightLeft } from 'lucide-react';

export default function ProductRelations({ relations }) {
  if (!relations?.length) return null;

  return (
    <Box bg="white" mt={2} borderRadius="xl" overflow="hidden" border="1px solid" borderColor="gray.100">
      <Flex bg="emerald.50" color="green.800" px={3.5} py={2} align="center" gap={2} borderBottom="1px solid" borderColor="green.100">
        <ArrowRightLeft size={14} color="#15803d" />
        <Text fontWeight="800" fontSize="11px" letterSpacing="wider" textTransform="uppercase" color="green.800">
          Relaciones de Producto ({relations.length})
        </Text>
      </Flex>

      <Box maxH="220px" overflowY="auto">
        <Table size="sm" variant="simple">
          <Tbody>
            {relations.map((rel, index) => {
              const isInternal = rel.type === "internal" || rel.esPropio;

              return (
                <Tr key={rel.id || index} _hover={{ bg: "gray.50" }}>
                  <Td fontWeight="700" color="gray.700" py={2} fontSize="11.5px">
                    {rel.name || "-"}
                  </Td>
                  <Td py={2} fontSize="11.5px" color="gray.600" fontWeight="600">
                    {rel.code || "-"}
                  </Td>
                  <Td py={2} textAlign="right">
                    <HStack spacing={1} justify="flex-end">
                      <Badge
                        bg="green.100"
                        color="green.700"
                        fontSize="9.5px"
                        fontWeight="700"
                        px={1.5}
                        py={0.5}
                        borderRadius="md"
                      >
                        CRUCE
                      </Badge>
                      <Badge
                        bg={isInternal ? "emerald.100" : "orange.100"}
                        color={isInternal ? "emerald.800" : "orange.800"}
                        fontSize="9.5px"
                        fontWeight="800"
                        px={1.5}
                        py={0.5}
                        borderRadius="md"
                      >
                        {rel.label || (isInternal ? "VENDEMOS" : "EQUIVALENTE")}
                      </Badge>
                    </HStack>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}
