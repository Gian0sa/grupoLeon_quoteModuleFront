import {
  Box,
  Text,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
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
  Spinner,
  IconButton
} from "@chakra-ui/react";
import { FiSearch, FiPackage, FiFilter, FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
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
      bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
      borderRadius={{ base: "2xl", md: "3xl" }}
      color="white"
      p={{ base: 4, md: 5 }}
      mb={5}
      boxShadow="0 12px 35px rgba(20, 83, 45, 0.2)"
      position="relative"
      overflow="hidden"
    >
      {/* Decoración gráfica sutil */}
      <Box
        position="absolute"
        top="-40px"
        right="-40px"
        w="160px"
        h="160px"
        borderRadius="full"
        bg="whiteAlpha.100"
        pointerEvents="none"
      />

      <VStack spacing={3.5} align="stretch" position="relative" zIndex={2}>
        {/* Cabecera superior con BackButton y Título */}
        <Flex align="center" justify="space-between" w="full" gap={2}>
          <HStack spacing={3}>
            <BackButton color="white" />
            <VStack align="start" spacing={0}>
              <HStack spacing={2}>
                <Text fontSize={{ base: "16px", sm: "18px", md: "xl" }} fontWeight="800" color="white" letterSpacing="tight">
                  Lista de Precios de Productos
                </Text>
              </HStack>
              <Text fontSize={{ base: "11px", md: "xs" }} color="whiteAlpha.800" fontWeight="500">
                Consulta de stock en tiempo real y tarifas vigentes
              </Text>
            </VStack>
          </HStack>
        </Flex>

        {/* Barra de búsqueda principal de Cristal */}
        <InputGroup size="md">
          <InputLeftElement pointerEvents="none" h="42px">
            <Icon as={FiSearch} color="gray.400" boxSize={4} />
          </InputLeftElement>
          <Input
            value={cardName}
            placeholder="Buscar por código u OEM..."
            bg="white"
            color="gray.800"
            borderRadius="2xl"
            h="42px"
            fontSize="13px"
            fontWeight="500"
            _placeholder={{ color: "gray.400" }}
            onChange={(e) => onCardNameChange(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            boxShadow="0 4px 15px rgba(0,0,0,0.05)"
          />
          {cardName && (
            <InputRightElement h="42px">
              <IconButton
                size="xs"
                icon={<FiX />}
                variant="ghost"
                aria-label="Limpiar búsqueda"
                onClick={() => onCardNameChange("")}
              />
            </InputRightElement>
          )}
        </InputGroup>

        {/* Botón de Colapso de Filtros + Botón de Búsqueda */}
        <Flex gap={2} align="center" direction={{ base: "column", sm: "row" }}>
          <Button
            variant="outline"
            onClick={onToggle}
            w="full"
            rightIcon={<Icon as={isOpen ? FiChevronUp : FiChevronDown} />}
            h="38px"
            fontSize="12.5px"
            fontWeight="700"
            borderRadius="xl"
            borderColor="whiteAlpha.400"
            _hover={{ bg: "whiteAlpha.200" }}
            color="white"
            bg="whiteAlpha.100"
            backdropFilter="blur(8px)"
            justifyContent="space-between"
            px={4}
          >
            <HStack spacing={2}>
              <Icon as={FiFilter} boxSize={3.5} />
              <Text>Filtros avanzados</Text>
              {activeFiltersCount > 0 && (
                <Badge colorScheme="green" bg="green.400" color="white" borderRadius="full" px={2} fontSize="10px">
                  {activeFiltersCount}
                </Badge>
              )}
            </HStack>
          </Button>

          <Button
            onClick={onSearch}
            isLoading={isLoading}
            loadingText="Buscando..."
            leftIcon={<Icon as={FiSearch} boxSize={4} />}
            w={{ base: "full", sm: "auto" }}
            minW="160px"
            h="38px"
            fontSize="13px"
            fontWeight="800"
            bg="white"
            color="green.800"
            borderRadius="xl"
            boxShadow="0 4px 15px rgba(0,0,0,0.15)"
            _hover={{ bg: "green.50", transform: "translateY(-1px)" }}
            _active={{ bg: "green.100" }}
          >
            Buscar Productos
          </Button>
        </Flex>

        {/* Mensaje de Error si falla la carga de marcas/tipos */}
        {errorBrandTypeSubtype && (
          <Alert status="error" borderRadius="xl" bg="red.500" color="white" py={2} px={3} fontSize="12px">
            <AlertIcon color="white" />
            Error al cargar filtros: {errorBrandTypeSubtype.message || 'Error desconocido'}
          </Alert>
        )}

        {/* Panel Desplegable de Filtros */}
        <Collapse in={isOpen} animateOpacity>
          <VStack spacing={3} align="stretch" p={4} bg="blackAlpha.300" borderRadius="2xl" backdropFilter="blur(10px)" border="1px solid rgba(255,255,255,0.15)" mt={1}>
            {isLoadingBrandTypeSubtype && (
              <HStack justify="center" p={2}>
                <Spinner size="sm" color="white" />
                <Text fontSize="12px" color="whiteAlpha.800">Cargando filtros...</Text>
              </HStack>
            )}

            {/* Fila 1 - Marca y Tipo */}
            <HStack spacing={3} w="full">
              <Select
                placeholder="Marca"
                value={marca}
                onChange={(e) => {
                  setMarca(e.target.value);
                  setTipo("");
                  setSubtipo("");
                }}
                bg="white"
                color="gray.800"
                borderRadius="xl"
                size="sm"
                h="36px"
                fontSize="12.5px"
                fontWeight="600"
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
                  setSubtipo("");
                }}
                bg="white"
                color="gray.800"
                borderRadius="xl"
                size="sm"
                h="36px"
                fontSize="12.5px"
                fontWeight="600"
                isDisabled={isLoadingBrandTypeSubtype}
              >
                {(
                  marca
                    ? brandTypeSubtype?.find((m) => m.value === marca)?.tipos
                    : Array.from(
                        new Map(
                          brandTypeSubtype
                            ?.flatMap((m) => m.tipos)
                            ?.map((t) => [t.value, t])
                        ).values()
                      )
                )?.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </HStack>

            {/* Fila 2 - Subtipo y Tipo de precio */}
            <HStack spacing={3} w="full">
              <Select
                placeholder="Subtipo"
                value={subtipo}
                onChange={(e) => setSubtipo(e.target.value)}
                bg="white"
                color="gray.800"
                borderRadius="xl"
                size="sm"
                h="36px"
                fontSize="12.5px"
                fontWeight="600"
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
                            ?.map((st) => [st.value, st])
                        ).values()
                      )
                )?.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </Select>

              <Select
                value={tipoPrecio}
                onChange={(e) => setTipoPrecio(e.target.value)}
                bg="white"
                color="gray.800"
                borderRadius="xl"
                size="sm"
                h="36px"
                fontSize="12.5px"
                fontWeight="600"
              >
                <option value="FINAL">Precio Final</option>
                <option value="CONTADO">Precio al contado</option>
                <option value="CREDITO">Precio al crédito</option>
              </Select>
            </HStack>

            {/* Fila 3 - Switch stock y limpiar filtros */}
            <Flex justify="space-between" align="center" pt={1}>
              <FormControl display="flex" alignItems="center" w="auto">
                <FormLabel htmlFor="stock-switch" mb="0" fontSize="12px" fontWeight="700" color="whiteAlpha.900">
                  Solo disponibles con stock
                </FormLabel>
                <Switch
                  id="stock-switch"
                  colorScheme="green"
                  size="sm"
                  isChecked={soloConStock === "Y"}
                  onChange={(e) => setSoloConStock(e.target.checked ? "Y" : "N")}
                />
              </FormControl>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  colorScheme="whiteAlpha"
                  size="xs"
                  fontWeight="700"
                  onClick={() => {
                    setMarca("");
                    setTipo("");
                    setSubtipo("");
                    setTipoPrecio("FINAL");
                    setSoloConStock("N");
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </Flex>
          </VStack>
        </Collapse>
      </VStack>
    </Box>
  );
}