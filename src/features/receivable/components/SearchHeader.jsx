import {
  Box,
  Text,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  IconButton
} from "@chakra-ui/react";
import { FiSearch } from "react-icons/fi";
import { BackButton } from "../../../components/BackButton";
import styles from "./SearchHeader.module.css";
import { RefreshButton } from "../../../components/RefreshButton";


export function SearchHeader({
  title,
  placeholder,
  searchValue,
  onSearch,
  onSearchInputChange,
  refreshQueries
}) {

  // ✅ Función para manejar Enter o click en buscar
  const handleSearch = () => {
    const trimmedValue = searchValue?.trim() || '';
    console.log("🔍 Ejecutando búsqueda manual:", trimmedValue);
    onSearch?.(trimmedValue);
  };

  // ✅ Manejar Enter en el input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Box color="white" px={4}>
      <Flex justifyContent="space-around" align="center" gap={4}>
        <BackButton />
        <Text fontSize="xl" fontWeight="bold">
          {title}
        </Text>
        <Box display="flex" justifyContent="flex-end" p={2}>
          <RefreshButton
            queries={refreshQueries}
            showToast={true}
            size="sm"
            variant="ghost"
            mode="invalidateAndRefetch"
          />
        </Box>
      </Flex>

      <InputGroup mt={4} size="md">
        <InputLeftElement
          pointerEvents="auto"
          cursor="pointer"
          onClick={handleSearch} // ✅ Permitir click en el ícono para buscar
        >
          <Icon as={FiSearch} color="gray.400" />
        </InputLeftElement>
        <Input
          value={searchValue || ''}
          placeholder={placeholder}
          bg="white"
          color="black"
          borderRadius="full"
          _placeholder={{ color: "gray.400" }}
          onChange={(e) => onSearchInputChange?.(e.target.value)}
          onKeyPress={handleKeyPress} // ✅ Buscar al presionar Enter
        />
      </InputGroup>
    </Box>
  );
}