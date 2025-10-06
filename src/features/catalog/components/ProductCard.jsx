import { Card, CardBody, Stack, Box, Badge, HStack, Heading, Flex, VStack, Text , Button } from '@chakra-ui/react';
import ProductHeader from './ProductHeader';
import ProductImage from './ProductImage';
import ProductSpecsTable from './ProductSpecsTable';
import ProductCrossReferences from './ProductCrossReferences';
import ProductApplications from './ProductApplications';
import ProductCompatibilities from './ProductCompatibilities';
import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const allCompatibilities = [
    ...(product.compatibilitiesA || []).map(c => ({ id: c.id, compatibleProduct: c.productB })),
    ...(product.compatibilitiesB || []).map(c => ({ id: c.id, compatibleProduct: c.productA }))
  ];

  return (
    <Card
      key={product.id}
      overflow="hidden"
      borderWidth="2px"
      borderColor="gray.200"
      _hover={{ shadow: 'xl', borderColor: 'red.500', transform: 'translateY(-4px)', transition: 'all 0.3s' }}
    >
        <Link to={`/catalog/edit/${product.id}`}>
  <Button size="sm" colorScheme="yellow">Editar</Button>
</Link>
      <ProductHeader product={product} />

      <CardBody p={0}>
        <Stack spacing={0}>
          <ProductImage product={product} />
          <ProductSpecsTable product={product} />
          <ProductCrossReferences product={product} />
          <ProductApplications product={product} />
          <ProductCompatibilities compatibilities={allCompatibilities} />

          {/* Info extra */}
          <Box px={4} py={3} bg="gray.50">
            <VStack align="stretch" spacing={2}>
              <Text fontWeight="bold" fontSize="sm" color="red.600">{product.itemName || 'Sin nombre'}</Text>
              {product.brand && <Text fontSize="xs" color="gray.600">Marca: {product.brand}</Text>}
              {product.description && <Text fontSize="xs" color="gray.700" noOfLines={3}>{product.description}</Text>}
            </VStack>
          </Box>

          {/* Badge cantidad */}
          <Flex justify="flex-start" px={4} py={2} bg="white">
            <Badge colorScheme="red" fontSize="sm" px={3} py={1} borderRadius="full">
              📦 {product.packageQty || 24} UND.
            </Badge>
          </Flex>
        </Stack>
      </CardBody>
    </Card>
  );
}
