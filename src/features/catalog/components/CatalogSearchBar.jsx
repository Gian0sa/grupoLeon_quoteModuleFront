import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  HStack,
  Button,
  Text,
  useColorModeValue,
  Tooltip,
  SimpleGrid,
  Collapse,
  VStack,
  Badge,
  Divider
} from '@chakra-ui/react';
import { SearchIcon, CloseIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { useFilterMetadata } from '../hooks/queries/catalogQueries';
import ReactSelect from 'react-select';

export default function CatalogSearchBar({ filters, onSearch, onClear, isLoading }) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [isAttributesExpanded, setIsAttributesExpanded] = useState(false);

  const { data: filterMeta } = useFilterMetadata();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const fabricantesMarcas = filterMeta?.data?.fabricantesMarcas || [];

  useEffect(() => {
    if (localFilters.fabricanteId && localFilters.marcaId) {
      const isValid = fabricantesMarcas.some(
        fm => fm.idFabricante === parseInt(localFilters.fabricanteId) && fm.idMarca === parseInt(localFilters.marcaId)
      );
      if (!isValid) {
        setLocalFilters(prev => ({ ...prev, marcaId: '' }));
      }
    }
  }, [localFilters.fabricanteId, localFilters.marcaId, fabricantesMarcas]);

  const {
    fabricantes = [],
    marcas = [],
    tipos = [],
    segmentos = [],
    labels = [],
    documentosOrigen = []
  } = filterMeta?.data || {};

  const filteredMarcas = localFilters.fabricanteId 
    ? marcas.filter(m => fabricantesMarcas.some(fm => fm.idFabricante === parseInt(localFilters.fabricanteId) && fm.idMarca === m.idMarca)) 
    : marcas;

  const handleSearch = () => {
    onSearch(localFilters);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleMedidaChange = (idLabel, val) => {
    setLocalFilters(prev => ({
      ...prev,
      medidas: {
        ...prev.medidas,
        [idLabel]: val
      }
    }));
  };

  const hasActiveFilters = Object.values(filters).some(v => typeof v === 'object' ? Object.values(v).some(x => x) : v);
  const activeMedidasCount = Object.values(localFilters.medidas || {}).filter(v => v).length;

  const groupedLabels = useMemo(() => {
    const groups = {};
    labels.forEach(l => {
      const firstWord = l.nombre.split(' ')[0].toUpperCase();
      if (!groups[firstWord]) groups[firstWord] = [];
      groups[firstWord].push(l);
    });
    return groups;
  }, [labels]);

  return (
    <Box
      bg={bgColor}
      p={4}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      shadow="sm"
    >
      <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={3} mb={4}>
        <Box gridColumn={{ md: "span 2", lg: "span 2" }}>
          <Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">Código / OEM</Text>
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Buscar por código..."
              value={localFilters.code || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, code: e.target.value }))}
              onKeyPress={handleKeyPress}
              bg="white"
            />
            {localFilters.code && (
              <InputRightElement>
                <IconButton
                  size="sm"
                  icon={<CloseIcon />}
                  variant="ghost"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setLocalFilters(prev => ({ ...prev, code: '' }))}
                />
              </InputRightElement>
            )}
          </InputGroup>
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">Fabricante</Text>
          <ReactSelect
            placeholder="Todos"
            isClearable
            options={fabricantes.map(f => ({ value: f.idFabricante, label: f.nombre }))}
            value={localFilters.fabricanteId ? { value: localFilters.fabricanteId, label: fabricantes.find(f => f.idFabricante == localFilters.fabricanteId)?.nombre } : null}
            onChange={(selected) => setLocalFilters(prev => ({ ...prev, fabricanteId: selected ? selected.value : '' }))}
            styles={{ control: (base) => ({ ...base, minHeight: '40px', borderColor: '#E2E8F0' }) }}
          />
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">Marca</Text>
          <ReactSelect
            placeholder="Todas"
            isClearable
            options={filteredMarcas.map(m => ({ value: m.idMarca, label: m.nombre }))}
            value={localFilters.marcaId ? { value: localFilters.marcaId, label: marcas.find(m => m.idMarca == localFilters.marcaId)?.nombre } : null}
            onChange={(selected) => setLocalFilters(prev => ({ ...prev, marcaId: selected ? selected.value : '' }))}
            styles={{ control: (base) => ({ ...base, minHeight: '40px', borderColor: '#E2E8F0' }) }}
          />
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">Tipo</Text>
          <ReactSelect
            placeholder="Todos"
            isClearable
            options={tipos.map(t => ({ value: t.idTipo, label: t.nombre }))}
            value={localFilters.tipoId ? { value: localFilters.tipoId, label: tipos.find(t => t.idTipo == localFilters.tipoId)?.nombre } : null}
            onChange={(selected) => setLocalFilters(prev => ({ ...prev, tipoId: selected ? selected.value : '' }))}
            styles={{ control: (base) => ({ ...base, minHeight: '40px', borderColor: '#E2E8F0' }) }}
          />
        </Box>
      </SimpleGrid>

      <HStack justify="space-between" align="center" borderTopWidth={1} borderColor={borderColor} pt={3}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAttributesExpanded(!isAttributesExpanded)}
          rightIcon={isAttributesExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        >
          Filtros por Atributo
          {activeMedidasCount > 0 && (
            <Badge ml={2} colorScheme="purple">{activeMedidasCount}</Badge>
          )}
        </Button>

        <HStack>
          <Button
            bg="green.700" color="white" _hover={{ bg: "green.600" }} px={6}
            onClick={handleSearch}
            isLoading={isLoading}
            leftIcon={<SearchIcon />}
          >
            Buscar
          </Button>

          {hasActiveFilters && (
            <Tooltip label="Limpiar filtros" placement="top">
              <IconButton
                icon={<CloseIcon />}
                variant="outline"
                colorScheme="gray"
                onClick={onClear}
              />
            </Tooltip>
          )}
        </HStack>
      </HStack>

      <Collapse in={isAttributesExpanded} animateOpacity>
        <Box mt={4} p={4} bg="gray.50" borderRadius="md" borderWidth="1px">
          <Text fontSize="xs" fontWeight="bold" mb={3} color="gray.500">
            ATRIBUTOS AGRUPADOS
          </Text>
          {Object.entries(groupedLabels).map(([group, items], idx) => (
            <Box key={group} mb={4}>
              {idx > 0 && <Divider mb={4} borderColor="gray.300" />}
              {items.length > 1 && <Text fontSize="sm" fontWeight="bold" color="green.700" mb={2}>{group}</Text>}
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                {items.map(l => (
                  <Box key={l.idLabel}>
                    <Text fontSize="xs" mb={1}>{l.nombre}</Text>
                    <Input
                      size="sm"
                      bg="white"
                      placeholder="Cualquiera"
                      value={localFilters.medidas?.[l.idLabel] || ''}
                      onChange={(e) => handleMedidaChange(l.idLabel, e.target.value)}
                      onKeyPress={handleKeyPress}
                    />
                  </Box>
                ))}
              </SimpleGrid>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}