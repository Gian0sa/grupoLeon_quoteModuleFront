import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Flex, Heading, Text, Image, Button, HStack,
  Spinner, VStack, Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton,
  useDisclosure, Alert, AlertIcon
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { useProducts, useProductEquivalents, useProductApplications } from '../hooks/queries/catalogQueries';
import { BackButton } from '../../../components/BackButton';

import ProductDetailInfo from '../components/ProductDetailInfo';
import ProductDetailApplications from '../components/ProductDetailApplications';
import ProductDetailEquivalentsSection from '../components/ProductDetailEquivalentsSection';
import ProductDetailSkeleton from '../components/skeletons/ProductDetailSkeleton';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchMode, setSearchMode] = useState('simple');

  const { data: productRes, isLoading, error } = useProducts(1, 1, { slug });
  const { data: tiposRes, isLoading: tiposLoading } = useProductEquivalents(slug, 1, 9, null, null, null, searchMode);
  const { data: appsRes, isLoading: appsLoading } = useProductApplications(slug, 1, 50);

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
  const product = productRes?.data?.[0] || null;

  const handleImageClick = (src) => {
    setSelectedImage(src);
    onOpen();
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={0}>
        <Flex bg="green.800" color="white" align="center" p={4} borderBottomRadius="2xl" justify="center" position="relative" boxShadow="lg" mb={6}>
          <Box position="absolute" left="4"><BackButton color="white" /></Box>
          <Heading size={{ base: "sm", md: "md" }}>📦 Detalle de Producto</Heading>
        </Flex>
        <VStack spacing={8} align="stretch" px={4} pb={8}>
          <ProductDetailSkeleton />
        </VStack>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon /> No se pudo cargar la información del producto.
        </Alert>
        <Button mt={4} onClick={() => navigate('/catalog')} leftIcon={<ArrowBackIcon />}>Regresar</Button>
      </Container>
    );
  }

  const imageUrl = (() => {
    const media = product.multimedia?.find(m => m.tipo === 'foto') || product.multimedia?.[0];
    if (!media) return null;
    const src = media.url_g || media.url || media.url_m || media.url_p || media.urlArchivo;
    if (!src) return null;
    return src.startsWith('http') ? src : `${apiBaseUrl}/${src}`;
  })();
  const tipos = tiposRes?.tipos || tiposRes?.data?.tipos || (Array.isArray(tiposRes?.data) ? tiposRes.data : []);

  return (
    <Container maxW="container.xl" py={0}>
      <Flex bg="green.800" color="white" align="center" p={4} borderBottomRadius="2xl" justify="center" position="relative" boxShadow="lg" mb={6}>
        <Box position="absolute" left="4"><BackButton color="white" /></Box>
        <Heading size={{ base: "sm", md: "md" }}>📦 Detalle de Producto</Heading>
      </Flex>

      <VStack spacing={8} align="stretch" px={4} pb={8}>

        <ProductDetailInfo product={product} imageUrl={imageUrl} onImageClick={handleImageClick} />
        <ProductDetailApplications appsRes={appsRes} appsLoading={appsLoading} />

        <Box>
          <Flex justify="space-between" align={{ base: "start", sm: "center" }} flexDir={{ base: "column", sm: "row" }} gap={3} mb={4}>
            <Box>
              <Heading size="md" mb={1}>Productos Equivalentes</Heading>
              <Text fontSize="xs" color="gray.500">Paginación y filtros independientes por cada tipo de producto</Text>
            </Box>
            <HStack spacing={1} bg="gray.100" p={1} borderRadius="lg" border="1px solid" borderColor="gray.200">
              <Button
                size="xs"
                colorScheme={searchMode === 'simple' ? 'green' : 'gray'}
                variant={searchMode === 'simple' ? 'solid' : 'ghost'}
                onClick={() => setSearchMode('simple')}
                borderRadius="md"
              >
                Búsqueda Simple
              </Button>
              <Button
                size="xs"
                colorScheme={searchMode === 'deep' ? 'green' : 'gray'}
                variant={searchMode === 'deep' ? 'solid' : 'ghost'}
                onClick={() => setSearchMode('deep')}
                borderRadius="md"
              >
                Búsqueda Profunda
              </Button>
            </HStack>
          </Flex>

          {tiposLoading ? (
            <Spinner size="lg" />
          ) : tipos.length > 0 ? (
            <VStack spacing={8} align="stretch">
              {tipos.map((tipo) => (
                <ProductDetailEquivalentsSection
                  key={tipo.idTipo} slug={slug} tipo={tipo} searchMode={searchMode}
                  onNavigate={(s) => navigate(`/catalog/product/${s}`)}
                />
              ))}
            </VStack>
          ) : (
            <Text color="gray.400" fontSize="sm" textAlign="center" py={8}>No se encontraron productos equivalentes para este artículo.</Text>
          )}
        </Box>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent bg="transparent" shadow="none">
          <ModalCloseButton color="white" />
          <ModalBody p={2} display="flex" alignItems="center" justifyContent="center">
            <Image src={selectedImage} alt="Detalle" maxH="70vh" objectFit="contain" borderRadius="lg" />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
}
