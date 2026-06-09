import {
  Card,
  CardBody,
  Stack,
  Box,
  Badge,
  Text,
  Flex,
  Button,
  SimpleGrid
} from '@chakra-ui/react';
import ProductHeader from './ProductHeader';
import ProductImage from './ProductImage';
import ProductSpecsTable from './ProductSpecsTable';
import ProductApplications from './ProductApplications';
import ProductRelations from './ProductRelations';
import { useNavigate } from 'react-router-dom';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  

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
      <Box cursor="pointer" onClick={() => navigate(`/catalog/${product.idProducto}`)}>
        <ProductHeader product={product} />
      </Box>

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
          <Box px={4} py={2} fontSize="sm" color="gray.600">
            <SimpleGrid columns={2} spacing={2}>
              {product.marca?.nombre && (
                <Box overflowX="auto" whiteSpace="nowrap">
                  <Text as="span" fontWeight="bold">Marca:</Text> {product.marca.nombre}
                </Box>
              )}
              {product.fabricante?.nombre && (
                <Box overflowX="auto" whiteSpace="nowrap">
                  <Text as="span" fontWeight="bold">Fabricante:</Text> {product.fabricante.nombre}
                </Box>
              )}
              {product.categoria?.nombre && (
                <Box overflowX="auto" whiteSpace="nowrap">
                  <Text as="span" fontWeight="bold">Categoría:</Text> {product.categoria.nombre}
                </Box>
              )}
              {product.segmento?.nombre && (
                <Box overflowX="auto" whiteSpace="nowrap">
                  <Text as="span" fontWeight="bold">Segmento:</Text> {product.segmento.nombre}
                </Box>
              )}
            </SimpleGrid>
          </Box>

          <ProductImage product={product} />
          <ProductSpecsTable product={product} />
          <ProductRelations relations={allRelations} />
          <ProductApplications product={product} />

          
        </Stack>
      </CardBody>
    </Card>
  );
}