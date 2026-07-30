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
  SimpleGrid,
  Collapse,
  Badge,
  Divider,
  FormControl,
  FormLabel,
  Switch
} from '@chakra-ui/react';
import { SearchIcon, CloseIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { RotateCcw } from 'lucide-react';
import { useFilterMetadata } from '../hooks/queries/catalogQueries';
import ReactSelect from 'react-select';

export default function CatalogSearchBar({ filters, onSearch, onClear, isLoading }) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [isAttributesExpanded, setIsAttributesExpanded] = useState(false);

  const { data: filterMeta } = useFilterMetadata();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const metaObj = filterMeta?.data?.data || filterMeta?.data || filterMeta || {};
  const marcas = Array.isArray(metaObj.marcas) ? metaObj.marcas : [];
  const tipos = Array.isArray(metaObj.tipos) ? metaObj.tipos : [];
  const labels = Array.isArray(metaObj.labels) ? metaObj.labels : [];
  const marcaTipos = metaObj.marcaTipos || {};

  const getTiposForMarca = (mId) => {
    if (!mId) return [];
    const arr = marcaTipos[mId] || marcaTipos[String(mId)] || marcaTipos[Number(mId)] || [];
    return arr.map(Number);
  };

  useEffect(() => {
    if (localFilters.marcaId && localFilters.tipoId) {
      const validTiposForMarca = getTiposForMarca(localFilters.marcaId);
      if (validTiposForMarca.length > 0 && !validTiposForMarca.includes(Number(localFilters.tipoId))) {
        setLocalFilters(prev => ({ ...prev, tipoId: '' }));
      }
    }
  }, [localFilters.marcaId, localFilters.tipoId, marcaTipos]);

  const filteredMarcas = useMemo(() => {
    if (!localFilters.tipoId) return marcas;
    const tId = Number(localFilters.tipoId);
    return marcas.filter(m => {
      const validTipos = getTiposForMarca(m.idMarca);
      return validTipos.length === 0 || validTipos.includes(tId);
    });
  }, [marcas, localFilters.tipoId, marcaTipos]);

  const filteredTipos = useMemo(() => {
    if (!localFilters.marcaId) return tipos;
    const validTipos = getTiposForMarca(localFilters.marcaId);
    if (validTipos.length === 0) return tipos;
    return tipos.filter(t => validTipos.includes(Number(t.idTipo)));
  }, [tipos, localFilters.marcaId, marcaTipos]);

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

  const isEquivalenciasActive = localFilters.esPropio !== 'true';

  const hasActiveFilters = Boolean(
    localFilters.code ||
    localFilters.marcaId ||
    localFilters.tipoId ||
    isEquivalenciasActive ||
    Object.values(localFilters.medidas || {}).some(v => v)
  );

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

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      minHeight: '42px',
      borderRadius: '12px',
      borderColor: '#e5e7eb',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#10b981'
      }
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#15803d' : state.isFocused ? '#ecfdf5' : 'white',
      color: state.isSelected ? 'white' : '#1f2937',
      fontSize: '13px'
    })
  };

  return (
    <Box
      bg={bgColor}
      p={{ base: 4, md: 5 }}
      borderRadius="2xl"
      borderWidth="1.5px"
      borderColor={borderColor}
      boxShadow="0 4px 20px rgba(0, 0, 0, 0.04)"
    >
      {/* Grid simplificado: Código/OEM (2 col), Marca (1 col), Tipo (1 col) */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={{ base: 3, md: 4 }} mb={4}>
        {/* Código / OEM */}
        <Box gridColumn={{ md: "span 2", lg: "span 2" }}>
          <Text fontSize="12px" fontWeight="800" mb={1.5} color="gray.600" textTransform="uppercase" letterSpacing="wide">
            Código / OEM
          </Text>
          <InputGroup size="md">
            <InputLeftElement pointerEvents="none" h="42px">
              <SearchIcon color="gray.400" boxSize={3.5} />
            </InputLeftElement>
            <Input
              placeholder="Buscar por código u OEM..."
              value={localFilters.code || ''}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, code: e.target.value }))}
              onKeyPress={handleKeyPress}
              bg="white"
              borderRadius="xl"
              h="42px"
              fontSize="13px"
              borderColor="gray.200"
              _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px #10b981" }}
            />
            {localFilters.code && (
              <InputRightElement h="42px">
                <IconButton
                  size="xs"
                  icon={<CloseIcon />}
                  variant="ghost"
                  aria-label="Limpiar código"
                  onClick={() => setLocalFilters(prev => ({ ...prev, code: '' }))}
                />
              </InputRightElement>
            )}
          </InputGroup>
        </Box>

        {/* Marca */}
        <Box>
          <Text fontSize="12px" fontWeight="800" mb={1.5} color="gray.600" textTransform="uppercase" letterSpacing="wide">
            Marca
          </Text>
          <ReactSelect
            placeholder="Todas"
            isClearable
            options={filteredMarcas.map(m => ({ value: m.idMarca, label: m.nombre }))}
            value={localFilters.marcaId ? (filteredMarcas.find(m => m.idMarca == localFilters.marcaId) || marcas.find(m => m.idMarca == localFilters.marcaId) ? { value: localFilters.marcaId, label: (filteredMarcas.find(m => m.idMarca == localFilters.marcaId) || marcas.find(m => m.idMarca == localFilters.marcaId))?.nombre } : { value: localFilters.marcaId, label: String(localFilters.marcaId) }) : null}
            onChange={(selected) => setLocalFilters(prev => ({ ...prev, marcaId: selected ? selected.value : '' }))}
            styles={customSelectStyles}
          />
        </Box>

        {/* Tipo */}
        <Box>
          <Text fontSize="12px" fontWeight="800" mb={1.5} color="gray.600" textTransform="uppercase" letterSpacing="wide">
            Tipo
          </Text>
          <ReactSelect
            placeholder="Todos"
            isClearable
            options={filteredTipos.map(t => ({ value: t.idTipo, label: t.nombre }))}
            value={localFilters.tipoId ? (filteredTipos.find(t => t.idTipo == localFilters.tipoId) || tipos.find(t => t.idTipo == localFilters.tipoId) ? { value: localFilters.tipoId, label: (filteredTipos.find(t => t.idTipo == localFilters.tipoId) || tipos.find(t => t.idTipo == localFilters.tipoId))?.nombre } : { value: localFilters.tipoId, label: String(localFilters.tipoId) }) : null}
            onChange={(selected) => setLocalFilters(prev => ({ ...prev, tipoId: selected ? selected.value : '' }))}
            styles={customSelectStyles}
          />
        </Box>
      </SimpleGrid>

      {/* Fila inferior de acciones: Filtros atributo + Toggle Vendemos + Botones Limpiar/Buscar */}
      <HStack justify="space-between" align="center" borderTopWidth={1} borderColor="gray.100" pt={3} flexWrap="wrap" gap={3}>
        <HStack spacing={4} flexWrap="wrap">
          <Button
            variant="ghost"
            size="sm"
            borderRadius="lg"
            fontWeight="700"
            fontSize="12.5px"
            color="gray.600"
            _hover={{ bg: "gray.100" }}
            onClick={() => setIsAttributesExpanded(!isAttributesExpanded)}
            rightIcon={isAttributesExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          >
            Filtros por Atributo
            {activeMedidasCount > 0 && (
              <Badge ml={2} colorScheme="green" borderRadius="full" px={2}>{activeMedidasCount}</Badge>
            )}
          </Button>

          {/* Switch: Incluir Equivalencias */}
          <FormControl display="flex" alignItems="center" w="auto" cursor="pointer" bg={isEquivalenciasActive ? "orange.50" : "transparent"} px={3} py={1.5} borderRadius="xl" border="1px solid" borderColor={isEquivalenciasActive ? "orange.200" : "transparent"} transition="all 0.2s">
            <FormLabel htmlFor="equiv-toggle" mb="0" fontSize="12.5px" fontWeight="800" color={isEquivalenciasActive ? "orange.700" : "gray.700"} cursor="pointer" display="flex" alignItems="center" gap={1.5}>
              🔄 Incluir Equivalencias
            </FormLabel>
            <Switch
              id="equiv-toggle"
              colorScheme="orange"
              size="sm"
              isChecked={isEquivalenciasActive}
              onChange={(e) => {
                const newEsPropio = e.target.checked ? '' : 'true';
                const newFilters = { ...localFilters, esPropio: newEsPropio };
                setLocalFilters(newFilters);
                onSearch(newFilters);
              }}
            />
          </FormControl>
        </HStack>

        <HStack spacing={2.5}>
          {/* BOTÓN DESTACADO LIMPIAR FILTROS */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              colorScheme="red"
              size="sm"
              h="40px"
              px={4}
              borderRadius="xl"
              fontWeight="700"
              fontSize="12.5px"
              leftIcon={<RotateCcw size={14} />}
              onClick={() => {
                setLocalFilters({
                  fabricanteId: '',
                  marcaId: '',
                  tipoId: '',
                  segmentoId: '',
                  documentoOrigenId: '',
                  code: '',
                  esPropio: 'true',
                  medidas: {}
                });
                onClear();
              }}
            >
              Limpiar Filtros
            </Button>
          )}

          {/* BOTÓN DE BÚSQUEDA */}
          <Button
            bg="linear-gradient(135deg, #15803d 0%, #166534 100%)"
            color="white"
            _hover={{ bg: "linear-gradient(135deg, #166534 0%, #14532d 100%)", transform: "translateY(-1px)" }}
            px={6}
            h="40px"
            borderRadius="xl"
            fontWeight="700"
            fontSize="13px"
            boxShadow="0 4px 12px rgba(21, 128, 61, 0.25)"
            onClick={handleSearch}
            isLoading={isLoading}
            leftIcon={<SearchIcon />}
          >
            Buscar
          </Button>
        </HStack>
      </HStack>

      <Collapse in={isAttributesExpanded} animateOpacity>
        <Box mt={4} p={4} bg="gray.50" borderRadius="xl" borderWidth="1px" borderColor="gray.200">
          <Text fontSize="11px" fontWeight="800" mb={3} color="gray.500" letterSpacing="widest" textTransform="uppercase">
            Atributos Agrupados
          </Text>
          {Object.entries(groupedLabels).map(([group, items], idx) => (
            <Box key={group} mb={4}>
              {idx > 0 && <Divider mb={4} borderColor="gray.200" />}
              {items.length > 1 && <Text fontSize="12px" fontWeight="800" color="green.700" mb={2}>{group}</Text>}
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={3}>
                {items.map(l => (
                  <Box key={l.idLabel}>
                    <Text fontSize="11px" fontWeight="700" color="gray.600" mb={1}>{l.nombre}</Text>
                    <Input
                      size="sm"
                      bg="white"
                      borderRadius="lg"
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