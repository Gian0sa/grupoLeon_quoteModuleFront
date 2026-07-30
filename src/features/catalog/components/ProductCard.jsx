import {
  Card,
  CardBody,
  Stack,
  Box,
  Badge,
  Text,
  SimpleGrid
} from '@chakra-ui/react';
import ProductHeader from './ProductHeader';
import ProductImage from './ProductImage';
import ProductSpecsTable from './ProductSpecsTable';
import ProductApplications from './ProductApplications';
import ProductRelations from './ProductRelations';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const MotionCard = motion(Card);

export default function ProductCard({ product, onlyVendemos = false }) {
  const navigate = useNavigate();

  const isValidValue = (val) => val && String(val).trim() !== '' && String(val).toLowerCase() !== 'no especificado';

  let allRelations = [
    // Equivalencias Directas/Cruces
    ...(product.compatibilitiesA || []).map(c => {
      const isProp = !!c.productB?.esPropio;
      return {
        id: c.id,
        code: c.productB?.itemCode,
        name: c.productB?.itemName,
        type: isProp ? "internal" : "external",
        label: isProp ? "Vendemos" : "Equivalente",
        esPropio: isProp
      };
    }),
    ...(product.compatibilitiesB || []).map(c => {
      const isProp = !!c.productA?.esPropio;
      return {
        id: c.id,
        code: c.productA?.itemCode,
        name: c.productA?.itemName,
        type: isProp ? "internal" : "external",
        label: isProp ? "Vendemos" : "Equivalente",
        esPropio: isProp
      };
    }),
    // Equivalencias Externas
    ...(product.crossReferences || []).map((ref, idx) => ({
      id: `cross-${idx}`,
      code: ref.referenceCode,
      name: ref.referenceBrand,
      type: "external",
      label: "Equivalente",
      esPropio: false
    }))
  ];

  if (onlyVendemos) {
    allRelations = allRelations.filter(r => r.esPropio || r.type === "internal");
  }

  return (
    <MotionCard
      whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)' }}
      whileTap={{ scale: 0.995 }}
      overflow="hidden"
      borderWidth="1.5px"
      borderColor="gray.200"
      borderRadius="2xl"
      bg="white"
      boxShadow="0 4px 15px rgba(0, 0, 0, 0.03)"
      transition="all 0.25s ease"
    >
      <Box cursor="pointer" onClick={() => navigate(`/catalog/product/${product.slug || product.id || product.idProducto}`)}>
        <ProductHeader product={product} />
      </Box>

      <CardBody p={0}>
        <Stack spacing={0}>
          {/* Banner de Tipo de Producto */}
          <Box bg="emerald.50" px={4} py={2} borderBottom="1px solid" borderColor="green.100">
            <Text 
              fontSize="13px" 
              fontWeight="800" 
              color="green.800"
              textAlign="center"
              letterSpacing="wide"
            >
              {product.tipo?.nombre || 'Producto'}
            </Text>
          </Box>

          {/* Rejilla de metadatos */}
          <Box px={4} py={3} fontSize="13px" color="gray.700" bg="white">
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
              {isValidValue(product.marca?.nombre) && (
                <Box overflowX="auto" whiteSpace="nowrap">
                  <Text as="span" fontWeight="800" color="gray.500">Marca: </Text>
                  <Text as="span" fontWeight="700" color="gray.800">{product.marca.nombre}</Text>
                </Box>
              )}
              {isValidValue(product.categoria?.nombre) && (
                <Box overflowX="auto" whiteSpace="nowrap">
                  <Text as="span" fontWeight="800" color="gray.500">Categoría: </Text>
                  <Text as="span" fontWeight="700" color="gray.800">{product.categoria.nombre}</Text>
                </Box>
              )}
              {isValidValue(product.fabricante?.nombre) && (
                <Box overflowX="auto" whiteSpace="nowrap">
                  <Text as="span" fontWeight="800" color="gray.500">Fabricante: </Text>
                  <Text as="span" fontWeight="700" color="gray.800">{product.fabricante.nombre}</Text>
                </Box>
              )}
              {isValidValue(product.segmento?.nombre) && (
                <Box overflowX="auto" whiteSpace="nowrap">
                  <Text as="span" fontWeight="800" color="gray.500">Segmento: </Text>
                  <Text as="span" fontWeight="700" color="gray.800">{product.segmento.nombre}</Text>
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
    </MotionCard>
  );
}