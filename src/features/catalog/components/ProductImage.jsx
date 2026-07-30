import { Box, Image, Text } from '@chakra-ui/react';
import { useState } from 'react';

export default function ProductImage({ product }) {
  const [imgError, setImgError] = useState(false);

  const hasImage = product.imageUrl && !imgError;

  return (
    <Box 
      bg="gray.50" 
      p={3} 
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      minH="130px"
      position="relative"
    >
      {hasImage ? (
        <Image
          src={product.imageUrl}
          alt={product.itemCode || product.itemName || 'Producto'}
          maxH="180px"
          objectFit="contain"
          borderRadius="md"
          loading="lazy"
          onError={(e) => {
            console.warn('Error loading image:', product.imageUrl);
            setImgError(true);
          }}
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