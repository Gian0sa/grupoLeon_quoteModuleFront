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
  useDisclosure
} from "@chakra-ui/react";
import { FiSearch, FiPackage, FiFilter, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { BackButton } from "../../../components/BackButton";

export function ProductPriceListSearchheader({
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
  soloConStock,
  setSoloConStock,
}) {
  const { isOpen, onToggle } = useDisclosure();

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch();
    }
  };

  const marcas = [
    "DARUMA", "FILPOWER", "AC DELCO", "ALKOTA", "HONDA", "CHAMPION",
    "DONALDSON", "FLEETGUARD", "FRESCO", "ITW", "LUBERFINER", "NANOSKIN",
    "NORTON", "PRESTONE", "SLIME", "SURE FILTER", "TECFIL", "TOLDEX",
    "VERSACHEM", "WAGNER", "WYNNS", "MALCO", "RAINX", "GUMOUT",
    "BLACK MAGIC", "MOTORCRAFT", "PUROLATOR", "QMI", "SUNGREAT",
    "POWERFILM", "PPI", "OTROS"
  ];

  const tipos = [
    { codigo: "01", nombre: "ADITIVOS" },
    { codigo: "02", nombre: "BATERIAS" },
    { codigo: "03", nombre: "BUJIAS" },
    { codigo: "04", nombre: "CUIDADO AUTOMOVIL" },
    { codigo: "05", nombre: "CUIDADO NEUMATICOS" },
    { codigo: "06", nombre: "FAROS" },
    { codigo: "07", nombre: "FILTROS" },
    { codigo: "08", nombre: "FLUIDOS" },
    { codigo: "09", nombre: "LAMINA SEGURIDAD" },
    { codigo: "10", nombre: "PEGAMENTO SILICONA" },
    { codigo: "11", nombre: "SOBRE ASIENTOS" },
    { codigo: "12", nombre: "TOLDOS" },
    { codigo: "13", nombre: "LIQUIDO DE FRENOS" },
    { codigo: "14", nombre: "PASTILLAS DE FRENOS" },
  ];

  const subtipos = [
    { codigo: "0701", nombre: "BASE" },
    { codigo: "0702", nombre: "FILTRO DE ACEITE" },
    { codigo: "0703", nombre: "FILTRO DE ACEITE SET" },
    { codigo: "0704", nombre: "FILTRO DE AGUA" },
    { codigo: "0705", nombre: "FILTRO DE AIRE" },
    { codigo: "0706", nombre: "FILTRO DE AIRE CABINA" },
    { codigo: "0707", nombre: "FILTRO DE AIRE SET" },
    { codigo: "0708", nombre: "FILTRO DE CABINA" },
    { codigo: "0709", nombre: "FILTRO DE GAS" },
    { codigo: "0710", nombre: "FILTRO DE GASOLINA" },
    { codigo: "0711", nombre: "FILTRO DE PETROLEO" },
    { codigo: "0712", nombre: "FILTRO HIDRAULICO" },
    { codigo: "0713", nombre: "FILTRO PARA PETROLEO SEPARADOR" },
    { codigo: "0714", nombre: "FILTRO SECADOR DE AIRE" },
    { codigo: "0715", nombre: "RESTRICTOR PARA FILTRO DE AIRE" },
    { codigo: "0716", nombre: "SECADOR DE AIRE" }
  ];

  // Contar filtros activos
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

        {/* Botón para expandir filtros */}
        <Button
          variant="outline"
          colorScheme="whiteAlpha"
          onClick={onToggle}
          leftIcon={<Icon as={FiFilter} />}
          rightIcon={<Icon as={isOpen ? FiChevronUp : FiChevronDown} />}
          size="sm"
          borderColor="whiteAlpha.400"
          _hover={{ bg: "whiteAlpha.200" }}
        >
          Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Button>

        {/* Filtros desplegables */}
        <Collapse in={isOpen} animateOpacity>
          <VStack spacing={3} align="stretch" pt={2}>
            {/* Primera fila - Marca y Tipo */}
            <HStack spacing={3} w="100%">
              <Select
                placeholder="Marca"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                bg="white"
                color="black"
                borderRadius="md"
                size="sm"
              >
                {marcas.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
              {/* Tipo */}
              <Select
                placeholder="Tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                bg="white"
                color="black"
                borderRadius="md"
                size="sm"
              >
                {tipos.map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.nombre}
                  </option>
                ))}
              </Select>



            </HStack>

            {/* Segunda fila - Subtipo */}
            {/* Subtipo */}
            <Select
              placeholder="Subtipo"
              value={subtipo}
              onChange={(e) => setSubtipo(e.target.value)}
              bg="white"
              color="black"
              borderRadius="md"
              size="sm"
            >
              {subtipos.map((st) => (
                <option key={st.codigo} value={st.codigo}>
                  {st.nombre}
                </option>
              ))}
            </Select>

            {/* Tercera fila - Botón stock y limpiar filtros */}
            <HStack spacing={3} w="100%">
              <Button
                colorScheme={soloConStock === "Y" ? "green" : "gray"}
                onClick={() =>
                  setSoloConStock((prev) => (prev === "Y" ? "N" : "Y"))
                }
                size="sm"
                flex="1"
              >
                {soloConStock === "Y" ? "Solo con stock" : "Todos los productos"}
              </Button>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  colorScheme="whiteAlpha"
                  size="sm"
                  onClick={() => {
                    setMarca("");
                    setTipo("");
                    setSubtipo("");
                    setSoloConStock("N");
                  }}
                >
                  Limpiar
                </Button>
              )}
            </HStack>
          </VStack>
        </Collapse>

        {/* Botón de búsqueda */}
        <Button
          colorScheme="whiteAlpha"
          variant="solid"
          onClick={onSearch}
          isLoading={isLoading}
          loadingText="Buscando..."
          leftIcon={<Icon as={FiSearch} />}
          borderRadius="full"
          size="md"
          bg="whiteAlpha.200"
          _hover={{ bg: "whiteAlpha.300" }}
          _active={{ bg: "whiteAlpha.400" }}
          _disabled={{ opacity: 0.6 }}
        >
          Buscar Productos
        </Button>
      </VStack>
    </Box>
  );
}