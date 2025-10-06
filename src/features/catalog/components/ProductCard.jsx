import {
  Card,
  CardBody,
  Stack,
  Box,
  Badge,
  Text,
  Flex,
  Button
} from '@chakra-ui/react';
import ProductHeader from './ProductHeader';
import ProductImage from './ProductImage';
import ProductSpecsTable from './ProductSpecsTable';
import ProductApplications from './ProductApplications';
import ProductRelations from './ProductRelations';
import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const allRelations = [
    // Internos
    ...(product.compatibilitiesA || []).map(c => ({
      id: c.id,
      code: c.productB?.itemCode,
      name: c.productB?.itemName,
      type: "internal"
    })),
    ...(product.compatibilitiesB || []).map(c => ({
      id: c.id,
      code: c.productA?.itemCode,
      name: c.productA?.itemName,
      type: "internal"
    })),
    // Externos
    ...(product.crossReferences || []).map((ref, idx) => ({
      id: `cross-${idx}`,
      code: ref.referenceCode,
      name: ref.referenceBrand,
      type: "external"
    }))
  ];

  return (
    <Card
      overflow="hidden"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      _hover={{ 
        shadow: 'xl', 
        borderColor: 'green.500', 
        transform: 'translateY(-4px)', 
        transition: 'all 0.3s' 
      }}
    >
      <ProductHeader product={product} />

      <CardBody p={0}>
        <Stack spacing={0}>
          {/* Etiqueta Filtro */}
          <Box bg="green.100" px={4} py={2}>
            <Text 
              fontSize="sm" 
              fontWeight="semibold" 
              color="green.900"
              textAlign="center"
            >
              Filtro
            </Text>
          </Box>

          <ProductImage product={product} />
          <ProductSpecsTable product={product} />
          <ProductRelations relations={allRelations} />
          <ProductApplications product={product} />

          {/* Botón editar */}
          <Box px={4} py={3} bg="gray.50" borderTopWidth="1px">
            <Link to={`/catalog/edit/${product.id}`}>
              <Button size="sm" colorScheme="yellow" width="full">
                Editar
              </Button>
            </Link>
          </Box>
        </Stack>
      </CardBody>
    </Card>
  );
}