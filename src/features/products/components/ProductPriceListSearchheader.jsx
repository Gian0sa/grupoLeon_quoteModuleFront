import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Icon,
  Button,
  HStack,
  IconButton
} from "@chakra-ui/react";
import { FiSearch, FiX } from "react-icons/fi";
import { TopHeaderBanner, HEADER_GLASS_PANEL_PROPS } from "../../../components/TopHeaderBanner";

export function ProductPriceListSearchheader({
  cardName,
  onCardNameChange,
  onSearch,
  isLoading
}) {
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch();
    }
  };

  return (
    <TopHeaderBanner
      title="Lista de Precios de Productos"
      subtitle="Consulta de stock en tiempo real y tarifas vigentes"
      showBack={true}
    >
      {/* Panel de búsqueda simplificado sin filtros pesados */}
      <Box {...HEADER_GLASS_PANEL_PROPS} p={{ base: 2, md: 2.5 }} borderRadius={{ base: "xl", md: "2xl" }} position="relative" zIndex={2}>
        <HStack spacing={2} w="full" align="center">
          {/* Input de Búsqueda */}
          <InputGroup size={{ base: "sm", md: "sm" }} flex="1">
            <InputLeftElement pointerEvents="none" h={{ base: "40px", md: "40px" }}>
              <Icon as={FiSearch} color="gray.400" boxSize="15px" />
            </InputLeftElement>
            <Input
              placeholder="Buscar por Código, Sigla o Descripción (ej: TACP125, AS820)..."
              value={cardName}
              onChange={onCardNameChange}
              onKeyPress={handleKeyPress}
              bg="white"
              borderRadius="xl"
              color="gray.800"
              h={{ base: "40px", md: "40px" }}
              fontSize={{ base: "13.5px", md: "14px" }}
              fontWeight="500"
              border="1.5px solid"
              borderColor="gray.200"
              textTransform="uppercase"
              _placeholder={{ color: "gray.400", textTransform: "none" }}
              _focus={{
                borderColor: "emerald.500",
                boxShadow: "0 0 0 1px #10b981",
                bg: "white",
              }}
            />
            {cardName && (
              <InputRightElement h={{ base: "40px", md: "40px" }}>
                <IconButton
                  icon={<Icon as={FiX} />}
                  size="xs"
                  variant="ghost"
                  color="gray.400"
                  _hover={{ color: "gray.600" }}
                  onClick={() => {
                    onCardNameChange({ target: { value: "" } });
                  }}
                  aria-label="Limpiar búsqueda"
                />
              </InputRightElement>
            )}
          </InputGroup>

          {/* Botón Buscar */}
          <Button
            size="sm"
            h={{ base: "40px", md: "40px" }}
            px={{ base: 4.5, md: 6 }}
            bg="white"
            color="#0d522c"
            fontWeight="800"
            fontSize={{ base: "13.5px", md: "13px" }}
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
        </HStack>
      </Box>
    </TopHeaderBanner>
  );
}