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

import { TopHeaderBanner, HEADER_GLASS_PANEL_PROPS } from "../../../components/TopHeaderBanner";

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

  const activeFiltersCount = [marca, tipo, subtipo].filter(Boolean).length;

  return (
    <TopHeaderBanner
      title="Lista de Precios de Productos"
      subtitle="Consulta de stock en tiempo real y tarifas vigentes"
      showBack={true}
      mb={6}
    >
      <VStack spacing={3.5} align="stretch" position="relative" zIndex={2}>

        {/* Panel de vidrio: integra la búsqueda + filtros al header en 1 sola fila compacta en PC */}
        <Box p={2.5} {...HEADER_GLASS_PANEL_PROPS}>
          <Flex direction={{ base: "column", md: "row" }} gap={2} align="center">
            {/* Barra de búsqueda principal */}
            <InputGroup size="md" flex="1">
              <InputLeftElement pointerEvents="none" h="40px">
                <Icon as={FiSearch} color="gray.400" boxSize={4} />
              </InputLeftElement>
              <Input
                value={cardName}
                placeholder="Buscar por código u OEM..."
                bg="white"
                color="gray.800"
                borderRadius="full"
                h="40px"
                fontSize="13px"
                fontWeight="500"
                _placeholder={{ color: "gray.400" }}
                onChange={(e) => onCardNameChange(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                boxShadow="0 4px 15px rgba(0,0,0,0.05)"
              />
              {cardName && (
                <InputRightElement h="40px">
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
            <Flex gap={2} align="center" w={{ base: "full", md: "auto" }}>
              <Button
                variant="outline"
                onClick={onToggle}
                w={{ base: "full", md: "auto" }}
                rightIcon={<Icon as={isOpen ? FiChevronUp : FiChevronDown} />}
                h="40px"
                fontSize="12.5px"
                fontWeight="700"
                borderRadius="full"
                borderColor="whiteAlpha.400"
                _hover={{ bg: "whiteAlpha.200" }}
                color="white"
                bg="whiteAlpha.100"
                backdropFilter="blur(8px)"
                px={4}
              >
                <HStack spacing={2}>
                  <Icon as={FiFilter} boxSize={3.5} />
                  <Text whiteSpace="nowrap">Filtros</Text>
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
                w={{ base: "full", md: "auto" }}
                px={5}
                h="40px"
                fontSize="12.5px"
                fontWeight="700"
                colorScheme="green"
                bg="white"
                color="green.800"
                borderRadius="full"
                boxShadow="0 4px 15px rgba(0,0,0,0.15)"
                _hover={{ bg: "gray.100", transform: "translateY(-1px)" }}
              >
                Buscar
              </Button>
            </Flex>
          </Flex>
        </Box>

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

            {/* Fila 3 - Limpiar filtros */}
            <Flex justify="flex-end" align="center" pt={1}>
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
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </Flex>
          </VStack>
        </Collapse>
      </VStack>
    </TopHeaderBanner>
  );
}