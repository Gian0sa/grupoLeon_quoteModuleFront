import { Box, HStack, Heading, Badge } from '@chakra-ui/react';

export default function ProductHeader({ product }) {
  return (
    <Box bg="green.700" color="white" px={4} py={2}>
      <HStack justify="space-between">
        <Heading size="md" fontWeight="bold">
          {product.itemCode || product.id}
        </Heading>
        {product.isActive && (
          <Badge colorScheme="green" borderRadius="full" px={4} py={1} fontSize="xs">Activo</Badge>
        )}
      </HStack>
    </Box>
  );
}
