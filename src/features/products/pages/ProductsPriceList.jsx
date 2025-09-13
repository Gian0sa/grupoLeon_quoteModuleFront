import { useState } from "react";
import {
  Box,
  Text,
  Spinner,
  VStack,
  Center,
  Icon
} from "@chakra-ui/react";
import { FiPackage, FiAlertCircle } from "react-icons/fi";
import { useProductsPriceList } from "../hooks/queries/productQueries";
import { ProductPriceListSearchheader } from "../components/ProductPriceListSearchheader";
import { ProductPriceListCard } from "../components/ProductPriceListCard";

export function ProductList() {
  const [cardName, setCardName] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // Estado para el término de búsqueda activo
  const [hasSearched, setHasSearched] = useState(false);

  // Usar el searchTerm para la query, no el cardName directamente
  const { data, isLoading, error } = useProductsPriceList({
    cardCode: "", // Siempre vacío por ahora
    itemName: searchTerm, // Usar el término de búsqueda confirmado
    marca: "",
    tipo: "",
    enabled: hasSearched && searchTerm.trim() !== "", // Solo hacer query si se ha buscado y hay término
  });

  const handleSearch = () => {
    const trimmedCardName = cardName.trim();
    
    if (trimmedCardName === "") {
      // Si está vacío, resetear búsqueda
      setSearchTerm("");
      setHasSearched(false);
      return;
    }

    // Actualizar el término de búsqueda activo
    setSearchTerm(trimmedCardName);
    setHasSearched(true);
  };

  const products = Array.isArray(data) ? data : data?.value || [];

  if (isLoading) {
    return (
      <Box>
        <ProductPriceListSearchheader
          cardName={cardName}
          onCardNameChange={setCardName}
          onSearch={handleSearch}
          isLoading={true}
        />
        <Center py={20}>
          <VStack spacing={4}>
            <Spinner 
              size="xl" 
              color="green.500"
              thickness="4px"
            />
            <Text color="gray.600" fontSize="lg">
              Buscando productos...
            </Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <ProductPriceListSearchheader
          cardName={cardName}
          onCardNameChange={setCardName}
          onSearch={handleSearch}
          isLoading={false}
        />
        <Center py={20}>
          <VStack spacing={4}>
            <Box
              bg="red.50"
              p={4}
              borderRadius="full"
              color="red.500"
            >
              <Icon as={FiAlertCircle} boxSize={8} />
            </Box>
            <Text color="red.500" fontSize="lg" fontWeight="medium">
              Error al cargar la lista de productos
            </Text>
            <Text color="gray.500" fontSize="sm" textAlign="center">
              Verifica tu conexión e intenta nuevamente
            </Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh">
      <ProductPriceListSearchheader
        cardName={cardName}
        onCardNameChange={setCardName}
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      <Box p={4}>
        {!hasSearched ? (
          <Center py={20}>
            <VStack spacing={4}>
              <Box
                bg="green.50"
                p={4}
                borderRadius="full"
                color="green.600"
              >
                <Icon as={FiPackage} boxSize={8} />
              </Box>
              <Text color="gray.500" fontSize="lg" textAlign="center">
                Ingresa el nombre del producto para buscar
              </Text>
              <Text color="gray.400" fontSize="sm" textAlign="center">
                Usa el campo de búsqueda de arriba para encontrar productos
              </Text>
            </VStack>
          </Center>
        ) : products.length === 0 ? (
          <Center py={20}>
            <VStack spacing={4}>
              <Box
                bg="green.50"
                p={4}
                borderRadius="full"
                color="green.500"
              >
                <Icon as={FiPackage} boxSize={8} />
              </Box>
              <Text color="gray.600" fontSize="lg" fontWeight="medium">
                No se encontraron productos
              </Text>
              <Text color="gray.500" fontSize="sm" textAlign="center">
                Intenta con otros términos de búsqueda
              </Text>
            </VStack>
          </Center>
        ) : (
          <VStack spacing={3} align="stretch">

            {/* Lista de productos */}
            {products.map((product, idx) => (
              <ProductPriceListCard
                key={product.ITEM_CODE || idx}
                product={product}
              />
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
}