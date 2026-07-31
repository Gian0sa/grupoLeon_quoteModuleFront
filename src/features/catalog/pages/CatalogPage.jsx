import { useState } from 'react';
import { 
  Box, VStack, Heading, Text, SimpleGrid, Spinner,
  Alert, AlertIcon, AlertTitle, AlertDescription, Flex, Button, HStack, Badge
} from '@chakra-ui/react';
import { useProducts, useProductEquivalents } from "../hooks/queries/catalogQueries";
import CatalogSearchBar from "../components/CatalogSearchBar";
import ProductCard from "../components/ProductCard";
import EmptyState from "../components/EmptyState";
import { Link, useNavigate } from "react-router-dom";
import { BackButton } from '../../../components/BackButton';
import ProductCardSkeleton from "../components/skeletons/ProductCardSkeleton";
import ProductDetailEquivalentsSection from "../components/ProductDetailEquivalentsSection";
import Pagination from "../../../components/Pagination";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import { Package, Plus } from "lucide-react";

// Adaptador para transformar el nuevo modelo de base de datos al formato esperado por los componentes UI
const adaptProductToOldFormat = (apiBaseUrl, p) => {
  return {
    id: p.idProducto,
    slug: p.slug,
    itemCode: p.codigo || p.codigoLimpio || p.oem,
    itemName: p.oem || p.marca?.nombre || p.fabricante?.nombre || 'Producto',
    isActive: !p.delete,
    imageUrl: (() => {
      const media = p.multimedia?.find(m => m.tipo === 'foto') || p.multimedia?.[0];
      if (!media) return null;
      // Backend returns presigned S3 URLs (url, url_p, url_m, url_g) which are already absolute
      const src = media.url_m || media.url || media.url_g || media.url_p || media.urlArchivo;
      if (!src) return null;
      // If already absolute URL, use directly; otherwise prefix with apiBaseUrl
      return src.startsWith('http') ? src : `${apiBaseUrl}/${src}`;
    })(),
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
        itemName: e.productoB?.marca?.nombre || e.tipoEquivalencia?.nombre,
        esPropio: !!e.productoB?.esPropio
      }
    })) || [],
    compatibilitiesB: p.equivalenciasComoB?.map(e => ({
      id: e.idEquivalencia,
      productA: {
        itemCode: e.productoA?.codigo || e.productoA?.codigoLimpio,
        itemName: e.productoA?.marca?.nombre || e.tipoEquivalencia?.nombre,
        esPropio: !!e.productoA?.esPropio
      }
    })) || [],
    crossReferences: [],
    applications: [],
    marca: p.marca,
    fabricante: p.fabricante,
    categoria: p.categoria,
    segmento: p.segmento,
    tipo: p.tipo
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
    esPropio: 'true',
    medidas: {}
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const navigate = useNavigate();

  const { data: response, isLoading, error } = useProducts(page, limit, filters);

  const exactMatchSlug = response?.meta?.exactMatchSlug || null;
  const exactMatchCodigo = response?.meta?.codigoProducto ?? response?.meta?.codigo ?? '';
  const exactMatchOem = response?.meta?.oem ?? '';
  const { data: tiposRes, isLoading: tiposLoading } = useProductEquivalents(
    exactMatchSlug, 1, 9, null, null, null, 'simple'
  );
  const tipos = tiposRes?.tipos || tiposRes?.data?.tipos || (Array.isArray(tiposRes?.data) ? tiposRes.data : []);

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
      esPropio: 'true',
      medidas: {}
    });
    setPage(1);
  };

  const hasActiveSearch = Object.values(filters).some(v => typeof v === 'object' ? Object.values(v).some(x => x) : v);

  if (isLoading && !response) {
    return (
      <Box maxW="1200px" mx="auto" px={{ base: 3, md: 6 }} py={2} pb="100px">
        <Box height="100px" width="100%" mb={6} borderRadius="3xl" bg="green.800" />
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} py={4}>
          {[...Array(6)].map((_, i) => <ProductCardSkeleton key={i} />)}
        </SimpleGrid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box maxW="1200px" mx="auto" px={4} py={8}>
        <Alert status="error" borderRadius="2xl">
          <AlertIcon />
          <AlertTitle>Error al cargar productos</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </Box>
    );
  }

  const rawProducts = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.products)
      ? response.products
      : Array.isArray(response)
        ? response
        : [];

  const totalPages = response?.meta?.totalPages || 1;
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
  
  const products = rawProducts.map(p => adaptProductToOldFormat(apiBaseUrl, p));
  const totalCount = response?.meta?.total ?? products.length;

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="120px">
      
      {/* === HEADER PRINCIPAL UNIFICADO === */}
      {/* === HEADER PRINCIPAL UNIFICADO CON BUSCADOR === */}
      <TopHeaderBanner
        title="Catálogo de Productos"
        subtitle="Exploración de ítems, cruces y equivalencias"
        showBack={true}
        mb={6}
      >
        <VStack spacing={4} align="stretch">
          <Flex justify="flex-end" w="full">
            <Link to="/catalog/create">
              <Button
                leftIcon={<Plus size={16} />}
                bg="whiteAlpha.200"
                color="white"
                _hover={{ bg: "whiteAlpha.300", transform: "translateY(-1px)" }}
                borderRadius="full"
                size="sm"
                px={4}
                fontWeight="700"
                backdropFilter="blur(8px)"
                border="1px solid rgba(255,255,255,0.2)"
                boxShadow="sm"
              >
                + Nuevo producto
              </Button>
            </Link>
          </Flex>

          {/* Barra de búsqueda y filtros integrada */}
          <CatalogSearchBar 
            filters={filters}
            onSearch={handleSearch} 
            onClear={handleClear}
            isLoading={isLoading} 
          />
        </VStack>
      </TopHeaderBanner>

      {/* === CONTENIDO PRINCIPAL === */}
      <Box maxW="1200px" mx="auto" px={{ base: 3, md: 6 }}>
        <VStack spacing={5} align="stretch">

        {/* Contador de resultados */}
        <Flex justify="space-between" align="center" py={1}>
          <HStack spacing={2}>
            <Box color="green.600">
              <Package size={18} />
            </Box>
            <Text fontWeight="800" fontSize={{ base: "sm", md: "md" }} color="gray.800">
              {totalCount} producto{totalCount !== 1 ? 's' : ''} {hasActiveSearch ? 'encontrados' : 'disponibles'}
            </Text>
          </HStack>
        </Flex>

        {/* Lista de Productos */}
        {exactMatchSlug && (
          <HStack borderBottomWidth="2px" borderColor="green.600" pb={2} spacing={3}>
            <Box w="8px" h="24px" bg="green.600" borderRadius="full" />
            <Heading size="sm" textTransform="uppercase" letterSpacing="wide" color="gray.700">
              Similitud Código / OEM
            </Heading>
          </HStack>
        )}

        {products.length > 0 ? (
          <>
            {exactMatchSlug ? (
              <Box maxW={{ base: "full", md: "480px" }}>
                {products.map((product) => (
                  <Box key={product.id} onClick={() => navigate(`/catalog/product/${product.slug || product.id}`)} cursor="pointer">
                    <ProductCard product={product} onlyVendemos={filters.esPropio === 'true'} />
                  </Box>
                ))}
              </Box>
            ) : (
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 4, md: 5 }}>
                {products.map((product) => (
                  <Box key={product.id} onClick={() => navigate(`/catalog/product/${product.slug || product.id}`)} cursor="pointer">
                    <ProductCard product={product} onlyVendemos={filters.esPropio === 'true'} />
                  </Box>
                ))}
              </SimpleGrid>
            )}

            {/* Paginación */}
            <Box mt={4}>
              <Pagination 
                page={page} 
                totalPages={totalPages} 
                onPageChange={setPage} 
              />
            </Box>
          </>
        ) : (
          !isLoading && <EmptyState hasActiveSearch={hasActiveSearch} />
        )}

        {/* Equivalencias exactas */}
        {exactMatchSlug && (
          <VStack spacing={4} align="stretch" pt={4}>
            <HStack borderBottomWidth="2px" borderColor="yellow.500" pb={2} spacing={3}>
              <Box w="8px" h="24px" bg="yellow.500" borderRadius="full" />
              <Heading size="sm" textTransform="uppercase" letterSpacing="wide" color="gray.700">
                Equivalencias - {exactMatchCodigo} | {exactMatchOem}
              </Heading>
            </HStack>
            {tiposLoading ? (
              <Flex justify="center" py={6}><Spinner size="lg" color="green.500" /></Flex>
            ) : tipos.length > 0 ? (
              <VStack spacing={6} align="stretch">
                {tipos.map((tipo) => (
                  <ProductDetailEquivalentsSection
                    key={tipo.idTipo}
                    slug={exactMatchSlug}
                    tipo={tipo}
                    searchMode="simple"
                    onNavigate={(s) => navigate(`/catalog/product/${s}`)}
                  />
                ))}
              </VStack>
            ) : (
              <Text color="gray.400" fontSize="sm" textAlign="center" py={4}>
                No se encontraron productos equivalentes.
              </Text>
            )}
          </VStack>
        )}
      </VStack>
      </Box>
    </Box>
  );
}
