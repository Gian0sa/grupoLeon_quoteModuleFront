import React from "react";
import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  Icon
} from "@chakra-ui/react";
import { FiSearch } from "react-icons/fi";
import { TopHeaderBanner, HEADER_GLASS_PANEL_PROPS } from "../../../components/TopHeaderBanner";

export function SearchHeader({
  title = "Cuentas por cobrar",
  placeholder = "Buscar nombre de cliente...",
  searchValue,
  onSearch,
  onSearchInputChange,
  refreshQueries
}) {
  const handleSearch = () => {
    const trimmedValue = searchValue?.trim() || '';
    onSearch?.(trimmedValue);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <TopHeaderBanner
      title={title}
      subtitle="Consulta de saldos, clientes y comprobantes vigentes"
      showBack={true}
      refreshQueries={refreshQueries}
      mb={6}
    >
      {/* Panel de vidrio: integra la búsqueda al header, igual que los pills de QuickActions */}
      <Box p={3} mt={2} {...HEADER_GLASS_PANEL_PROPS}>
        <InputGroup size="md">
          <InputLeftElement
            pointerEvents="auto"
            cursor="pointer"
            h="44px"
            onClick={handleSearch}
          >
            <Icon as={FiSearch} color="gray.400" boxSize={4} />
          </InputLeftElement>
          <Input
            value={searchValue || ''}
            placeholder={placeholder}
            bg="white"
            color="gray.800"
            borderRadius="full"
            h="44px"
            fontSize="13.5px"
            _placeholder={{ color: "gray.400" }}
            onChange={(e) => onSearchInputChange?.(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </InputGroup>
      </Box>
    </TopHeaderBanner>
  );
}