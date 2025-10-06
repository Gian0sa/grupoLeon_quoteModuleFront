import { Box, Image, Text } from '@chakra-ui/react';

export default function ProductImage({ product }) {
  return (
    <Box bg="gray.50" p={6} display="flex" alignItems="center" justifyContent="center" minH="200px">
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.itemName}
          maxH="180px"
          objectFit="contain"
        />
      ) : (
        <Box textAlign="center" color="gray.400">
          <Text fontSize="4xl">📦</Text>
          <Text fontSize="sm">Sin imagen</Text>
        </Box>
      )}
    </Box>
  );
}
