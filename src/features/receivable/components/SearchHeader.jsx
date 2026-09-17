import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Icon,
  IconButton
} from "@chakra-ui/react";
import { FiSearch, FiX } from "react-icons/fi";
import { TopHeaderBanner, HEADER_GLASS_PANEL_PROPS } from "../../../components/TopHeaderBanner";

export function SearchHeader({
  title = "Cuentas por cobrar",
  placeholder = "Buscar nombre de cliente...",
  searchValue = "",
  onSearch,
  onSearchInputChange,
  refreshQueries
}) {
  // Estado local para que la escritura sea instantánea (0ms lag) y no bloquee el render del árbol
  const [localValue, setLocalValue] = useState(searchValue || "");
  const debounceTimer = useRef(null);

  // Sincronizar si cambia el valor externo (p. ej. cambio de vendedor o reseteo)
  useEffect(() => {
    setLocalValue(searchValue || "");
  }, [searchValue]);

  const triggerSearch = (val) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const targetVal = val !== undefined ? val : localValue;
    const trimmed = (targetVal || "").trim();
    onSearch?.(trimmed);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val); // Instantáneo en el DOM

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const trimmed = val.trim();
      onSearch?.(trimmed);
      onSearchInputChange?.(val);
    }, 350); // Debounce ágil de 350ms
  };

  const handleClear = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setLocalValue("");
    onSearch?.("");
    onSearchInputChange?.("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      triggerSearch(localValue);
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
      {/* Panel de vidrio: integra la búsqueda al header */}
      <Box p={3} mt={2} {...HEADER_GLASS_PANEL_PROPS}>
        <InputGroup size="md">
          <InputLeftElement
            pointerEvents="auto"
            cursor="pointer"
            h="44px"
            onClick={() => triggerSearch(localValue)}
          >
            <Icon as={FiSearch} color="gray.400" boxSize={4} />
          </InputLeftElement>
          <Input
            value={localValue}
            placeholder={placeholder}
            bg="white"
            color="gray.800"
            borderRadius="full"
            h="44px"
            fontSize="13.5px"
            _placeholder={{ color: "gray.400" }}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
          {localValue && (
            <InputRightElement h="44px">
              <IconButton
                aria-label="Limpiar búsqueda"
                icon={<Icon as={FiX} />}
                size="xs"
                variant="ghost"
                colorScheme="gray"
                borderRadius="full"
                onClick={handleClear}
              />
            </InputRightElement>
          )}
        </InputGroup>
      </Box>
    </TopHeaderBanner>
  );
}