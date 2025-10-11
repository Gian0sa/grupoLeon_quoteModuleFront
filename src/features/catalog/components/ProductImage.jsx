import { Box, Image, Text, IconButton, VStack } from '@chakra-ui/react';
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { useDeleteProduct } from '../hooks/mutations/catalogMutations';
import { Link } from 'react-router-dom';

export default function ProductImage({ product }) {
  const { mutate: deleteProduct, isLoading: isDeleting } = useDeleteProduct();
  console.log('Product imageUrl:', product.imageUrl);

  const handleDelete = () => {
    if (window.confirm("¿Estás seguro de eliminar este producto?")) {
      deleteProduct(product.id);
    }
  };

  return (
    <Box 
      bg="gray.50" 
      p={6} 
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      minH="200px"
      position="relative"
    >
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.itemName}
          maxH="180px"
          objectFit="contain"
          onError={(e) => {
            console.error('Error loading image:', product.imageUrl);
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <Box textAlign="center" color="gray.400">
          <Text fontSize="4xl">📦</Text>
          <Text fontSize="sm">Sin imagen</Text>
        </Box>
      )}
      
      {/* Botones flotantes en la esquina superior derecha */}
      <VStack 
        position="absolute" 
        top={4} 
        right={4} 
        spacing={2}
      >
        <Link to={`/catalog/edit/${product.id}`}>
          <IconButton
            icon={<EditIcon />}
            colorScheme="green"
            size="md"
            aria-label="Editar producto"
            bg="green.700"
            _hover={{ bg: "green.600" }}
          />
        </Link>
        
        <IconButton
          icon={<DeleteIcon />}
          colorScheme="green"
          size="md"
          aria-label="Eliminar producto"
          onClick={handleDelete}
          isLoading={isDeleting}
          bg="green.700"
          _hover={{ bg: "green.600" }}
        />
      </VStack>
    </Box>
  );
}