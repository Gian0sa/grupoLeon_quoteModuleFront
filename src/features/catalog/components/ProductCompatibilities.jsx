import { Box, VStack, Text } from '@chakra-ui/react';

export default function ProductCompatibilities({ compatibilities }) {
  if (!compatibilities?.length) return null;

  return (
    <Box bg="blue.50" borderTopWidth="1px" px={4} py={2}>
      <Box bg="red.600" color="white" px={4} py={1} mx={-4} mb={2}>
        <Text fontWeight="bold" fontSize="sm">COMPATIBLE INTERNO</Text>
      </Box>
      <VStack align="stretch" spacing={1}>
        {compatibilities.map((compat, index) => (
          <Text key={compat.id || index} fontSize="xs" color="gray.700">
            • {compat.compatibleProduct?.itemCode || compat.compatibleProduct?.itemName}
          </Text>
        ))}
      </VStack>
    </Box>
  );
}
