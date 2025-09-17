import { useState } from "react";
import {
  Box,
  Text,
  Spinner,
  VStack,
  Center,
  Icon,
} from "@chakra-ui/react";
import { FiPackage, FiAlertCircle } from "react-icons/fi";
import { useProductsPriceList } from "../hooks/queries/productQueries";
import { ProductPriceListSearchheader } from "../components/ProductPriceListSearchheader";
import { ProductPriceListCard } from "../components/ProductPriceListCard";

export function ProductList() {
  const [cardName, setCardName] = useState("");

  // Filtros en edición
  const [marca, setMarca] = useState("");
  const [tipo, setTipo] = useState("");
  const [subtipo, setSubtipo] = useState("");
  const [soloConStock, setSoloConStock] = useState("N");

  // Estado de búsqueda confirmada
  const [searchParams, setSearchParams] = useState(null);

  // Hook solo corre cuando hay searchParams
  const { data, isLoading, error } = useProductsPriceList(
    searchParams ?? { enabled: false }
  );

  const handleSearch = () => {
    setSearchParams({
      cardCode: "",
      itemName: cardName.trim(),
      marca,
      tipo,
      subtipo,
      stock: soloConStock,
    });
  };

  const products = Array.isArray(data) ? data : data?.value || [];

  return (
    <Box bg="gray.50" minH="100vh">
      <ProductPriceListSearchheader
        cardName={cardName}
        onCardNameChange={setCardName}
        onSearch={handleSearch}
        isLoading={isLoading}
        marca={marca}
        setMarca={setMarca}
        tipo={tipo}
        setTipo={setTipo}
        subtipo={subtipo}
        setSubtipo={setSubtipo}
        soloConStock={soloConStock}
        setSoloConStock={setSoloConStock}
      />

      <Box p={4}>
        {!searchParams ? (
          <Center py={20}>
            <VStack spacing={4}>
              <Box bg="green.50" p={4} borderRadius="full" color="green.600">
                <Icon as={FiPackage} boxSize={8} />
              </Box>
              <Text color="gray.500" fontSize="lg" textAlign="center">
                Usa el buscador o los filtros y presiona "Buscar"
              </Text>
              <Text color="gray.400" fontSize="sm" textAlign="center">
                Todavía no has realizado una búsqueda
              </Text>
            </VStack>
          </Center>
        ) : isLoading ? (
          <Center py={20}>
            <VStack spacing={4}>
              <Spinner size="xl" color="green.500" thickness="4px" />
              <Text color="gray.600" fontSize="lg">
                Buscando productos...
              </Text>
            </VStack>
          </Center>
        ) : error ? (
          <Center py={20}>
            <VStack spacing={4}>
              <Box bg="red.50" p={4} borderRadius="full" color="red.500">
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
        ) : products.length === 0 ? (
          <Center py={20}>
            <VStack spacing={4}>
              <Box bg="green.50" p={4} borderRadius="full" color="green.500">
                <Icon as={FiPackage} boxSize={8} />
              </Box>
              <Text color="gray.600" fontSize="lg" fontWeight="medium">
                No se encontraron productos
              </Text>
              <Text color="gray.500" fontSize="sm" textAlign="center">
                Intenta con otros términos o filtros
              </Text>
            </VStack>
          </Center>
        ) : (
          <VStack spacing={3} align="stretch">
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
