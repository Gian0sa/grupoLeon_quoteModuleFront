import { useState } from 'react';
import { 
  Container, VStack, Heading, Text, SimpleGrid, Spinner,
  Alert, AlertIcon, AlertTitle, AlertDescription, Flex, Box, Button, HStack
} from '@chakra-ui/react';
import { useProducts } from "../hooks/queries/catalogQueries";
import CatalogSearchBar from "../components/CatalogSearchBar";
import ProductCard from "../components/ProductCard";
import EmptyState from "../components/EmptyState";
import { Link, useNavigate } from "react-router-dom";
import { BackButton } from '../../../components/BackButton';
import ProductCardSkeleton from '../components/skeletons/ProductCardSkeleton';

// Adaptador para transformar el nuevo modelo de base de datos al formato esperado por los componentes UI
const adaptProductToOldFormat = (apiBaseUrl, p) => {
  return {
    id: p.idProducto,
    slug: p.slug,
    itemCode: p.codigo || p.codigoLimpio || p.oem,
    itemName: p.oem || p.marca?.nombre || p.fabricante?.nombre || 'Producto',
    isActive: !p.delete,
    imageUrl: p.multimedia?.[0]?.urlArchivo ? `${apiBaseUrl}/${p.multimedia[0].urlArchivo}` : null,
    weight: null,
    unit: null,
    packageQty: null,
    specifications: p.medidas?.map(m => ({
      name: m.labelCaracteristica?.nombre,
      value: `${m.value} ${m.unidadMedida?.nombre || ''}`.trim()
    })) || [],
    compatibilitiesA: p.equivalenciasComoA?.map(e => ({
      id: e.idEquivalencia,
      productB: {
        itemCode: e.productoB?.codigo || e.productoB?.codigoLimpio,
        itemName: e.productoB?.marca?.nombre || e.tipoEquivalencia?.nombre
      }
    })) || [],
    compatibilitiesB: p.equivalenciasComoB?.map(e => ({
      id: e.idEquivalencia,
      productA: {
        itemCode: e.productoA?.codigo || e.productoA?.codigoLimpio,
        itemName: e.productoA?.marca?.nombre || e.tipoEquivalencia?.nombre
      }
    })) || [],
    crossReferences: [], // Podríamos separar las cruzadas si quisiéramos
    applications: [], // Ahora se cargan aparte en el detalle
    marca: p.marca,
    fabricante: p.fabricante,
    categoria: p.categoria,
    segmento: p.segmento
  };
};

export default function CatalogPage() {
  const [filters, setFilters] = useState({
    fabricanteId: '',
    marcaId: '',
    tipoId: '',
    segmentoId: '',
    documentoOrigenId: '',
    code: '',
    medidas: {}
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);
  const navigate = useNavigate();

  const { data: response, isLoading, error } = useProducts(page, limit, filters);
  
  const handleSearch = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleClear = () => {
    setFilters({
      fabricanteId: '',
      marcaId: '',
      tipoId: '',
      segmentoId: '',
      documentoOrigenId: '',
      code: '',
      medidas: {}
    });
    setPage(1);
  };

  const hasActiveSearch = Object.values(filters).some(v => typeof v === 'object' ? Object.values(v).some(x => x) : v);

  if (isLoading && !response) {
    return (
      <Container maxW="container.xl" py={0}>
        <Flex bg="green.800" color="white" align="center" p={4} borderBottomRadius="2xl" justify="center" position="relative" boxShadow="lg" mb={6}>
          <Box position="absolute" left="4"><BackButton color="white" /></Box>
          <Heading size={{ base: "sm", md: "md" }}>📦 Catálogo de Productos</Heading>
        </Flex>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} py={6}>
          {[...Array(6)].map((_, i) => <ProductCardSkeleton key={i} />)}
        </SimpleGrid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertTitle>Error al cargar productos</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </Container>
    );
  }

  const rawProducts = response?.data || [];
  const totalPages = response?.meta?.totalPages || 1;
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
  
  const products = rawProducts.map(p => adaptProductToOldFormat(apiBaseUrl, p));

  return (
    <Container maxW="container.xl" py={0}>

      {/* === HEADER CON BACK BUTTON === */}
      <Flex
        bg="green.800"
        color="white"
        align="center"
        p={4}
        borderBottomRadius="2xl"
        justify="center"
        position="relative"
        boxShadow="lg"
        mb={6}
      >
        <Box position="absolute" left="4">
          <BackButton color="white" />
        </Box>
        <Heading size={{ base: "sm", md: "md" }}>📦 Catálogo de Productos</Heading>
      </Flex>

      <VStack spacing={6} align="stretch" py={6}>
        
        {/* Botón nuevo producto */}
        <Flex justify="flex-end">
          <Link to="/catalog/create">
            <Button bg="green.700" _hover={{ bg: "green.600" }} borderRadius="full" color="white">
              + Nuevo producto
            </Button>
          </Link>
        </Flex>

        {/* Cantidad */}
        <Text color="gray.600">
          {response?.meta?.total || 0} producto{(response?.meta?.total !== 1) ? 's' : ''} 
          {hasActiveSearch ? ' encontrado' : ' disponible'}{(response?.meta?.total !== 1) ? 's' : ''}
        </Text>

        {/* Barra de búsqueda */}
        <CatalogSearchBar 
          filters={filters}
          onSearch={handleSearch} 
          onClear={handleClear}
          isLoading={isLoading} 
        />

        {/* Lista */}
        {products.length > 0 ? (
          <>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {products.map((product) => (
                <Box key={product.id} onClick={() => navigate(`/catalog/product/${product.slug || product.id}`)} cursor="pointer">
                  <ProductCard product={product} />
                </Box>
              ))}
            </SimpleGrid>
            
            {/* Paginación simple */}
            {totalPages > 1 && (
              <HStack justify="center" mt={6} spacing={4}>
                <Button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  isDisabled={page === 1}
                >
                  Anterior
                </Button>
                <Text>Página {page} de {totalPages}</Text>
                <Button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  isDisabled={page === totalPages}
                >
                  Siguiente
                </Button>
              </HStack>
            )}
          </>
        ) : (
          <EmptyState hasActiveSearch={hasActiveSearch} />
        )}
      </VStack>
    </Container>
  );
}
