import { useState } from 'react';
import {
  Box, Flex, HStack, Text, Badge, Select, InputGroup, InputLeftElement, Input, IconButton,
  SimpleGrid, Button, Spinner, useDisclosure
} from '@chakra-ui/react';
import { SearchIcon, CloseIcon, ViewIcon } from '@chakra-ui/icons';
import { useProductEquivalents, useFilterMetadata, useTraceEquivalence } from '../hooks/queries/catalogQueries';
import EquivalenceTraceModal from './EquivalenceTraceModal';
import Pagination from '../../../components/Pagination';

export default function ProductDetailEquivalentsSection({ slug, tipo, onNavigate, searchMode = 'deep' }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);
  const [searchCode, setSearchCode] = useState('');
  const [documentoOrigenId, setDocumentoOrigenId] = useState('');

  const { data: eqRes, isLoading } = useProductEquivalents(
    slug, page, limit, tipo.idTipo,
    documentoOrigenId || null,
    searchCode || null,
    searchMode
  );

  const { data: filterMeta } = useFilterMetadata();
  const documentosOrigen = filterMeta?.data?.documentosOrigen || [];

  const equivalents = eqRes?.data || [];
  const totalPages = eqRes?.meta?.totalPages || 1;
  const total = eqRes?.meta?.total ?? tipo.count;

  const handleClearFilters = () => {
    setSearchCode('');
    setDocumentoOrigenId('');
    setPage(1);
  };

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [traceTargetSlug, setTraceTargetSlug] = useState(null);
  const { data: traceResult, isFetching: traceLoading } = useTraceEquivalence(slug, traceTargetSlug);

  const handleTrace = (targetSlug) => {
    setTraceTargetSlug(targetSlug);
    onOpen();
  };

  const handleCloseTrace = () => {
    onClose();
    setTraceTargetSlug(null);
  };

  return (
    <Box borderWidth="1px" borderRadius="xl" overflow="hidden" bg="white" shadow="sm">
      <Flex bg="gray.50" px={4} py={3} align="center" justify="space-between" borderBottomWidth="1px">
        <HStack>
          <Box w={2.5} h={2.5} borderRadius="full" bg="green.500" />
          <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
            {tipo.nombre}
          </Text>
          <Badge colorScheme="gray" fontSize="xs">{total}</Badge>
        </HStack>
        <Select
          size="xs" w="130px" value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
        >
          <option value={9}>9 por página</option>
          <option value={18}>18 por página</option>
          <option value={27}>27 por página</option>
        </Select>
      </Flex>

      <HStack px={4} py={2} spacing={3} bg="gray.25" borderBottomWidth="1px">
        <InputGroup size="sm" maxW="250px">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" boxSize={3} />
          </InputLeftElement>
          <Input
            placeholder="Buscar por código..." value={searchCode}
            onChange={(e) => { setSearchCode(e.target.value); setPage(1); }} bg="white"
          />
        </InputGroup>
        <Select
          size="sm" maxW="200px" bg="white" value={documentoOrigenId}
          onChange={(e) => { setDocumentoOrigenId(e.target.value); setPage(1); }}
        >
          <option value="">Todos los orígenes</option>
          {documentosOrigen.map(d => (
            <option key={d.idDocument} value={d.idDocument}>{d.nombre}</option>
          ))}
        </Select>
        {(searchCode || documentoOrigenId) && (
          <IconButton
            icon={<CloseIcon />} size="xs" variant="ghost"
            onClick={handleClearFilters} aria-label="Limpiar"
          />
        )}
      </HStack>

      <Box p={4}>
        {isLoading ? (
          <Flex justify="center" py={6}><Spinner /></Flex>
        ) : equivalents.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {equivalents.map((eq) => {
              const prod = eq.productoB || eq;
              const tipoEquivNombre = eq.tipoEquivalencia?.nombre;
              const esPropio = !!prod.esPropio;
              const estado = prod.estado;
              return (
                <Box
                  key={prod.idProducto} borderWidth="1px" borderRadius="lg" p={3}
                  bg={esPropio ? 'green.50' : 'white'}
                  _hover={{ shadow: 'md', borderColor: 'green.400' }}
                  transition="all 0.2s"
                >
                  <Flex align="flex-start" justify="space-between" gap={2} mb={2}>
                    <HStack spacing={1} flexWrap="wrap">
                      {tipoEquivNombre && <Badge colorScheme="gray" fontSize="9px">{tipoEquivNombre}</Badge>}
                      <Badge colorScheme={esPropio ? 'green' : 'orange'} fontSize="9px">
                        {esPropio ? 'Vendemos' : 'Equivalente'}
                      </Badge>
                      {estado && (
                        <Badge colorScheme={estado === 'Activo' ? 'green' : 'red'} fontSize="9px">
                          {estado}
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="10px" color="gray.500" fontFamily="mono" flexShrink={0}>
                      ID: {prod.idProducto}
                    </Text>
                  </Flex>

                  <Text fontSize="sm" fontWeight="bold" color="gray.800" mb={2} noOfLines={1}>
                    {[prod.marca?.nombre, prod.tipo?.nombre, prod.codigo].filter(Boolean).join(' ')}
                  </Text>

                  <SimpleGrid columns={2} spacing={2} fontSize="11px" pt={2} borderTopWidth="1px">
                    <Box>
                      <Text color="gray.500">Código</Text>
                      <Text fontFamily="mono" fontWeight="bold" color="gray.700">{prod.codigo || '-'}</Text>
                    </Box>
                    <Box>
                      <Text color="gray.500">OEM</Text>
                      <Text fontFamily="mono" fontWeight="bold" color="gray.700">{prod.oem || '-'}</Text>
                    </Box>
                    <Box>
                      <Text color="gray.500">Marca</Text>
                      <Text color="gray.700">{prod.marca?.nombre || '-'}</Text>
                    </Box>
                    <Box>
                      <Text color="gray.500">Tipo</Text>
                      <Text color="gray.700">{prod.tipo?.nombre || '-'}</Text>
                    </Box>
                    <Box gridColumn="span 2">
                      <Text color="gray.500">Origen</Text>
                      <Text color="gray.700" fontWeight="medium">{prod.documentoOrigen?.nombre || 'N/A'}</Text>
                    </Box>
                  </SimpleGrid>

                  <HStack mt={3} pt={2} borderTopWidth="1px" justify="space-between">
                    <Button
                      size="xs" bg="green.700" color="white" _hover={{ bg: 'green.600' }}
                      onClick={() => handleTrace(prod.slug)}
                    >
                      ¿Por qué conecta?
                    </Button>
                    <Button
                      size="xs" bg="green.500" color="white" _hover={{ bg: 'green.400' }}
                      leftIcon={<ViewIcon />}
                      onClick={() => onNavigate(prod.slug)}
                    >
                      Ver Más
                    </Button>
                  </HStack>
                </Box>
              );
            })}
          </SimpleGrid>
        ) : (
          <Text color="gray.400" fontSize="sm" textAlign="center" py={4}>Sin resultados para este tipo.</Text>
        )}
      </Box>

      {!isLoading && totalPages > 1 && (
        <Pagination 
          page={page} 
          totalPages={totalPages} 
          onPageChange={setPage} 
        />
      )}

      <EquivalenceTraceModal
        isOpen={isOpen}
        onClose={handleCloseTrace}
        traceLoading={traceLoading}
        traceResult={traceResult}
      />
    </Box>
  );
}
