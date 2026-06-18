import { useState } from 'react';
import {
  Box, Flex, HStack, Text, Badge, Select, InputGroup, InputLeftElement, Input, IconButton,
  SimpleGrid, Image, Button, Spinner
} from '@chakra-ui/react';
import { SearchIcon, CloseIcon } from '@chakra-ui/icons';
import { useProductEquivalents, useFilterMetadata } from '../hooks/queries/catalogQueries';

export default function ProductDetailEquivalentsSection({ slug, tipo, apiBaseUrl, onNavigate }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);
  const [searchCode, setSearchCode] = useState('');
  const [documentoOrigenId, setDocumentoOrigenId] = useState('');

  const { data: eqRes, isLoading } = useProductEquivalents(
    slug, page, limit, tipo.idTipo,
    documentoOrigenId || null,
    searchCode || null
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
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {equivalents.map((eq) => {
              const prod = eq.productoB || eq;
              const imgUrl = prod.multimedia?.[0]?.urlArchivo ? `${apiBaseUrl}/${prod.multimedia[0].urlArchivo}` : null;
              return (
                <Box
                  key={prod.idProducto} borderWidth="1px" borderRadius="lg" overflow="hidden"
                  _hover={{ shadow: 'md', borderColor: 'green.400', transform: 'translateY(-2px)' }}
                  transition="all 0.2s" cursor="pointer" onClick={() => onNavigate(prod.slug)}
                >
                  <Box bg="green.700" px={3} py={1}>
                    <Text color="white" fontWeight="bold" fontSize="sm" isTruncated>
                      {prod.codigo || prod.codigoLimpio || 'S/C'}
                    </Text>
                  </Box>
                  <Flex p={3} gap={3}>
                    <Box
                      w="60px" h="60px" bg="gray.50" borderRadius="md" display="flex"
                      alignItems="center" justifyContent="center" flexShrink={0}
                    >
                      {imgUrl ? <Image src={imgUrl} alt={prod.codigo} maxH="55px" objectFit="contain" /> : <Text fontSize="2xl">📦</Text>}
                    </Box>
                    <Box flex="1" overflow="hidden">
                      <Text fontSize="xs" fontWeight="bold" isTruncated>{prod.marca?.nombre || '-'}</Text>
                      <Text fontSize="xs" color="gray.500" isTruncated>{prod.tipo?.nombre || '-'}</Text>
                      {eq.tipoEquivalencia && <Badge colorScheme="purple" fontSize="2xs" mt={1}>{eq.tipoEquivalencia.nombre}</Badge>}
                    </Box>
                  </Flex>
                </Box>
              );
            })}
          </SimpleGrid>
        ) : (
          <Text color="gray.400" fontSize="sm" textAlign="center" py={4}>Sin resultados para este tipo.</Text>
        )}
      </Box>

      {!isLoading && totalPages > 1 && (
        <HStack justify="center" py={3} borderTopWidth="1px" spacing={3}>
          <Button size="xs" onClick={() => setPage(p => Math.max(1, p - 1))} isDisabled={page === 1}>Anterior</Button>
          <Text fontSize="xs">{page} / {totalPages}</Text>
          <Button size="xs" onClick={() => setPage(p => Math.min(totalPages, p + 1))} isDisabled={page === totalPages}>Siguiente</Button>
        </HStack>
      )}
    </Box>
  );
}
