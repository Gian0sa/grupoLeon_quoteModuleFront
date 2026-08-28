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

  const safeBrandList = Array.isArray(brandTypeSubtype) ? brandTypeSubtype : [];

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
          <HStack spacing={2} w="full" align="center">
            {/* Input de Búsqueda */}
            <InputGroup size="sm" flex="1">
              <InputLeftElement pointerEvents="none">
                <Icon as={FiSearch} color="gray.400" boxSize="15px" />
              </InputLeftElement>
              <Input
                placeholder="Buscar por Código, OEM o Descripción..."
                value={cardName}
                onChange={onCardNameChange}
                onKeyPress={handleKeyPress}
                bg="white"
                borderRadius="xl"
                color="gray.800"
                h="38px"
                fontSize={{ base: "13px", md: "13px" }}
                fontWeight="500"
                border="1.5px solid"
                borderColor="gray.200"
                _placeholder={{ color: "gray.400" }}
                _focus={{
                  borderColor: "emerald.500",
                  boxShadow: "0 0 0 1px #10b981",
                  bg: "white",
                }}
              />
              {cardName && (
                <InputRightElement>
                  <IconButton
                    icon={<Icon as={FiX} />}
                    size="xs"
                    variant="ghost"
                    color="gray.400"
                    _hover={{ color: "gray.600" }}
                    onClick={() => {
                      onCardNameChange({ target: { value: "" } });
                      onSearch();
                    }}
                    aria-label="Limpiar búsqueda"
                  />
                </InputRightElement>
              )}
            </InputGroup>

            {/* Botón Buscar */}
            <Button
              size="sm"
              h="38px"
              px={{ base: 3.5, md: 5 }}
              bg="white"
              color="#0d522c"
              fontWeight="800"
              fontSize="13px"
              borderRadius="xl"
              boxShadow="0 2px 8px rgba(0,0,0,0.15)"
              _hover={{ bg: "emerald.50", transform: "translateY(-1px)" }}
              _active={{ transform: "translateY(0)" }}
              onClick={onSearch}
              isLoading={isLoading}
              flexShrink={0}
            >
              Buscar
            </Button>

            {/* Botón Filtros Avanzados (Toggle) */}
            <Button
              size="sm"
              h="38px"
              px={{ base: 2.5, md: 3.5 }}
              variant="outline"
              borderColor="whiteAlpha.400"
              bg="whiteAlpha.150"
              color="white"
              fontWeight="700"
              fontSize="12.5px"
              borderRadius="xl"
              _hover={{ bg: "whiteAlpha.300", borderColor: "whiteAlpha.600" }}
              _active={{ bg: "whiteAlpha.400" }}
              onClick={onToggle}
              leftIcon={<Icon as={FiFilter} boxSize="13px" />}
              rightIcon={
                <Icon
                  as={isOpen ? FiChevronUp : FiChevronDown}
                  boxSize="13px"
                  transition="transform 0.2s"
                />
              }
              flexShrink={0}
              position="relative"
            >
              <Text display={{ base: "none", sm: "inline" }}>Filtros</Text>
              {activeFiltersCount > 0 && (
                <Badge
                  ml={1.5}
                  colorScheme="green"
                  bg="#10b981"
                  color="white"
                  borderRadius="full"
                  fontSize="10px"
                  px={1.5}
                  py={0.2}
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </HStack>

          {/* Panel Desplegable de Filtros Avanzados */}
          <Collapse in={isOpen} animateOpacity>
            <VStack
              spacing={3}
              align="stretch"
              pt={3}
              mt={2.5}
              borderTop="1px solid"
              borderColor="whiteAlpha.200"
            >
              {/* Spinner de carga de filtros */}
              {isLoadingBrandTypeSubtype && (
                <HStack spacing={2} justify="center" py={1}>
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
                  isDisabled={isLoadingBrandTypeSubtype || safeBrandList.length === 0}
                >
                  {safeBrandList.map((m) => (
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
                      ? safeBrandList.find((m) => m.value === marca)?.tipos || []
                      : Array.from(
                          new Map(
                            safeBrandList
                              .flatMap((m) => m.tipos || [])
                              .map((t) => [t.value, t])
                          ).values()
                        )
                  ).map((t) => (
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
                      ? safeBrandList
                          .flatMap((m) => m.tipos || [])
                          .find((t) => t.value === tipo)?.subtipos || []
                      : Array.from(
                          new Map(
                            safeBrandList
                              .flatMap((m) => (m.tipos || []).flatMap((t) => t.subtipos || []))
                              .map((st) => [st.value, st])
                          ).values()
                        )
                  ).map((st) => (
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
        </Box>

        {/* Mensaje de Error si falla la carga de marcas/tipos */}
        {errorBrandTypeSubtype && (
          <Alert status="error" borderRadius="xl" bg="red.500" color="white" py={2} px={3} fontSize="12px">
            <AlertIcon color="white" />
            Error al cargar filtros: {errorBrandTypeSubtype.message || 'Error desconocido'}
          </Alert>
        )}
      </VStack>
    </TopHeaderBanner>
  );
}