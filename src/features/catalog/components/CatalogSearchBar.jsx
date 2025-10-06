import { useState } from 'react';
import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  HStack,
  Select,
  Button,
  Text,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react';
import { SearchIcon, CloseIcon } from '@chakra-ui/icons';

export default function CatalogSearchBar({ onSearch, isLoading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Generar años para el select (últimos 50 años)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  const handleSearch = () => {
    onSearch({
      query: searchQuery.trim(),
      year: yearFilter,
    });
  };

  const handleClear = () => {
    setSearchQuery('');
    setYearFilter('');
    onSearch({ query: '', year: '' });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const hasActiveFilters = searchQuery.trim() || yearFilter;

  return (
    <Box
      bg={bgColor}
      p={4}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      shadow="sm"
    >
      <HStack spacing={3} align="flex-end">
        {/* Input de búsqueda */}
        <Box flex="1">
          <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.600">
            Buscar producto
          </Text>
          <InputGroup size="lg">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Código, nombre, marca, tipo, referencia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              bg="white"
              borderColor={borderColor}
              _focus={{
                borderColor: 'red.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
              }}
            />
            {searchQuery && (
              <InputRightElement>
                <IconButton
                  size="sm"
                  icon={<CloseIcon />}
                  variant="ghost"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setSearchQuery('')}
                />
              </InputRightElement>
            )}
          </InputGroup>
        </Box>

        {/* Select de año */}
        <Box w="200px">
          <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.600">
            Año del vehículo
          </Text>
          <Select
            placeholder="Todos los años"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            size="lg"
            bg="white"
            borderColor={borderColor}
            _focus={{
              borderColor: 'red.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
            }}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </Box>

        {/* Botones de acción */}
        <HStack spacing={2}>
          <Button
            colorScheme="red"
            size="lg"
            onClick={handleSearch}
            isLoading={isLoading}
            loadingText="Buscando"
            leftIcon={<SearchIcon />}
          >
            Buscar
          </Button>

          {hasActiveFilters && (
            <Tooltip label="Limpiar filtros" placement="top">
              <IconButton
                size="lg"
                icon={<CloseIcon />}
                variant="outline"
                colorScheme="gray"
                aria-label="Limpiar filtros"
                onClick={handleClear}
              />
            </Tooltip>
          )}
        </HStack>
      </HStack>

      {/* Indicador de filtros activos */}
      {hasActiveFilters && (
        <HStack mt={3} spacing={2} flexWrap="wrap">
          <Text fontSize="xs" color="gray.500">
            Filtros activos:
          </Text>
          {searchQuery.trim() && (
            <Box
              px={2}
              py={1}
              bg="red.50"
              borderRadius="md"
              fontSize="xs"
              fontWeight="medium"
              color="red.700"
            >
              Búsqueda: "{searchQuery.trim()}"
            </Box>
          )}
          {yearFilter && (
            <Box
              px={2}
              py={1}
              bg="blue.50"
              borderRadius="md"
              fontSize="xs"
              fontWeight="medium"
              color="blue.700"
            >
              Año: {yearFilter}
            </Box>
          )}
        </HStack>
      )}
    </Box>
  );
}