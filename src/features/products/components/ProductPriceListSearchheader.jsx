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
  HStack
} from "@chakra-ui/react";
import { FiSearch, FiPackage } from "react-icons/fi";
import { BackButton } from "../../../components/BackButton";

export function ProductPriceListSearchheader({
  cardName,
  onCardNameChange,
  onSearch,
  isLoading
}) {
  // Manejar Enter en los inputs
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevenir comportamiento por defecto
      onSearch();
    }
  };

  // Manejar click en el botón
  const handleButtonClick = () => {
    onSearch();
  };

  return (
    <Box bg="linear-gradient(180deg, rgba(42, 97, 63, 1) 0%, rgba(18, 48, 30, 1) 100%)" color="white" px={4} py={6}>
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

        <Button
          colorScheme="whiteAlpha"
          variant="solid"
          onClick={handleButtonClick}
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