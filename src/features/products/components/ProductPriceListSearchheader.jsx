import {
  Box,
  Text,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  VStack,
  Button,
  HStack,
  Select,
  Collapse,
  useDisclosure,
  FormControl,
  FormLabel,
  Switch,
  Badge,
  Alert,
  AlertIcon,
  Spinner
} from "@chakra-ui/react";
import { FiSearch, FiPackage, FiFilter, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { BackButton } from "../../../components/BackButton";

export function ProductPriceListSearchheader({
  brandTypeSubtype,
  cardName,
  onCardNameChange,
  onSearch,
  isLoading,
  marca,
  setMarca,
  tipo,
  setTipo,
  subtipo,
  setSubtipo,
  tipoPrecio,
  setTipoPrecio,
  soloConStock,
  setSoloConStock,
  isLoadingBrandTypeSubtype,
  errorBrandTypeSubtype
}) {
  const { isOpen, onToggle } = useDisclosure();

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch();
    }
  };

 const activeFiltersCount = [marca, tipo, subtipo].filter(Boolean).length + (soloConStock === "Y" ? 1 : 0);

  return (
    <Box
      bg="linear-gradient(180deg, rgba(42, 97, 63, 1) 0%, rgba(18, 48, 30, 1) 100%)"
      color="white"
      px={4}
      py={6}
    >
      <Flex align="center" gap={4} mb={6}>
        <BackButton />
        <HStack spacing={2}>
          <Icon as={FiPackage} boxSize={6} />
          <Text fontSize="xl" fontWeight="bold">
            Lista de Productos
          </Text>
        </HStack>
      </Flex>

      <VStack spacing={3} align="stretch">
        {/* Barra de búsqueda principal */}
        <InputGroup size="md">
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            value={cardName}
            placeholder="Buscar por nombre del producto"
            bg="white"
            color="black"
            borderRadius="full"
            _placeholder={{ color: "gray.400" }}
            onChange={(e) => onCardNameChange(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
        </InputGroup>
        <Box w="100%">
        {/* Botón para expandir filtros */}
        <Button
          variant="outline"
          colorScheme="whiteAlpha"
          onClick={onToggle}
          w="100%"
          rightIcon={<Icon as={isOpen ? FiChevronUp : FiChevronDown} />}
          size="sm"
          borderColor="whiteAlpha.300"
          _hover={{ bg: "whiteAlpha.200" }}
          color="white"
          bg="green.600"
        >
          Filtrar por: 
        </Button>

        {/* Error al cargar brandTypeSubtype */}
        {errorBrandTypeSubtype && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            Error al cargar filtros: {errorBrandTypeSubtype.message || 'Error desconocido'}
          </Alert>
        )}

        {/* Filtros desplegables */}
        <Collapse in={isOpen} animateOpacity>
          <VStack spacing={2} align="stretch" p={2} bg="green.700" borderRadius="10px">
            {/* Loading state para filtros */}
            {isLoadingBrandTypeSubtype && (
              <HStack justify="center" p={4}>
                <Spinner size="sm" color="white" />
                <Text fontSize="sm">Cargando filtros...</Text>
              </HStack>
            )}

            {/* Primera fila - Marca y Tipo */}
            <HStack spacing={3} w="100%">
              <Select
                placeholder="Marca"
                value={marca}
                onChange={(e) => {
                  setMarca(e.target.value);
                  setTipo("");     // resetear tipo
                  setSubtipo("");  // resetear subtipo
                }}
                bg="white"
                color="black"
                borderRadius="md"
                size="sm"
                isDisabled={isLoadingBrandTypeSubtype || !brandTypeSubtype || brandTypeSubtype.length === 0}
              >
                {brandTypeSubtype?.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>

              <Select
                placeholder="Tipo"
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value);
                  setSubtipo(""); // resetear subtipo
                }}
                bg="white"
                color="black"
                borderRadius="md"
                size="sm"
                isDisabled={isLoadingBrandTypeSubtype}
              >
                {(
                  marca
                    ? brandTypeSubtype?.find((m) => m.value === marca)?.tipos
                    : Array.from(
                        new Map(
                          brandTypeSubtype
                            ?.flatMap((m) => m.tipos)
                            ?.map((t) => [t.value, t]) // usar value como clave
                        ).values()
                      ) // deduplicados
                )?.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </HStack>

            {/* Segunda fila - Subtipo y Tipo de precio */}
            <HStack spacing={3} w="100%">
              {/* Subtipo */}
              <Select
                placeholder="Subtipo"
                value={subtipo}
                onChange={(e) => setSubtipo(e.target.value)}
                bg="white"
                color="black"
                borderRadius="md"
                size="sm"
                isDisabled={isLoadingBrandTypeSubtype}
              >
                {(
                  tipo
                    ? brandTypeSubtype
                        ?.flatMap((m) => m.tipos)
                        ?.find((t) => t.value === tipo)?.subtipos
                    : Array.from(
                        new Map(
                          brandTypeSubtype
                            ?.flatMap((m) => m.tipos.flatMap((t) => t.subtipos))
                            ?.map((st) => [st.value, st]) // usar value como clave
                        ).values()
                      )
                )?.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </Select>

              
              {/* Tipo de precio */}
             <Select
              value={tipoPrecio}
              onChange={(e) => setTipoPrecio(e.target.value)}
              bg="white"
              color="black"
              borderRadius="md"
              size="sm"
            >
              <option value="FINAL">Precio Final</option>
              <option value="CONTADO">Precio al contado</option>
              <option value="CREDITO">Precio al crédito</option>
            </Select>


            </HStack>

            {/* Tercera fila - Switch stock y limpiar filtros */}
            <HStack w="100%" align="center">
              <FormControl display="flex" alignItems="center" flex="1" h="40px">
                <FormLabel htmlFor="stock-switch" mb="0" fontSize="sm" display="flex" alignItems="center" gap={2}>
                  Mostrar disponibles
                </FormLabel>
                <Switch
                  id="stock-switch"
                  colorScheme="green"
                  size="md"
                  isChecked={soloConStock === "Y"}
                  onChange={(e) => setSoloConStock(e.target.checked ? "Y" : "N")}
                />
              </FormControl>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  colorScheme="whiteAlpha"
                  size="sm"
                  onClick={() => {
                    setMarca("");
                    setTipo("");
                    setSubtipo("");
                    setTipoPrecio("");
                    setSoloConStock("N");
                  }}
                >
                  Borrar todo
                </Button>
              )}
            </HStack>
          </VStack>
        </Collapse>
        </Box>

        {/* Botón de búsqueda */}
        <Button
          colorScheme="whiteAlpha"
          variant="solid"
          onClick={onSearch}
          isLoading={isLoading}
          loadingText="Buscando..."
          leftIcon={<Icon as={FiSearch} />}
          borderRadius="full"
          h={8}
          size="xs"
          bg="whiteAlpha.500"
          _hover={{ bg: "whiteAlpha.300" }}
          _active={{ bg: "whiteAlpha.400" }}
          _disabled={{ opacity: 0.6 }}
        >
          Buscar Producto/s
        </Button>
      </VStack>
    </Box>
  );
}