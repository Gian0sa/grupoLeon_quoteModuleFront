import { useState, useEffect } from "react";
import {
  Box,
  Text,
  Spinner,
  VStack,
  Center,
  Icon,
  Button,
  Flex
} from "@chakra-ui/react";
import { FiPackage, FiAlertCircle } from "react-icons/fi";
import { useProductsPriceList } from "../hooks/queries/productQueries";
import { ProductPriceListSearchheader } from "../components/ProductPriceListSearchheader";
import { ProductPriceListCard } from "../components/ProductPriceListCard";
import { useBrandTypeSubtype } from "../hooks/queries/productQueries";

export function ProductList() {
  const [cardName, setCardName] = useState("");

  // Filtros en edición
  const [marca, setMarca] = useState("");
  const [tipo, setTipo] = useState("");
  const [subtipo, setSubtipo] = useState("");
  const [tipoPrecio , setTipoPrecio] = useState("final");
  const [soloConStock, setSoloConStock] = useState("N");
  const [lastSearch, setLastSearch] = useState(null);

  // Estado de búsqueda confirmada
  const [searchParams, setSearchParams] = useState(null);

  // Estado de paginación
  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState([]);

  // Hook de React Query
  const { data, isLoading, error, isFetching } = useProductsPriceList(
    searchParams ? { ...searchParams, page } : { enabled: false }
  );

  const { brandTypeSubtype , isLoadingBrandTypeSubtype , errorBrandTypeSubtype } = useBrandTypeSubtype();
  
  // Cada vez que cambian searchParams (nueva búsqueda), reseteamos productos acumulados y página
  useEffect(() => {
    if (searchParams) {
      setAllProducts([]);
      setPage(1);
    }
  }, [searchParams]);

  // Acumular productos cuando llega data nueva
  useEffect(() => {
    if (data?.records) {
      setAllProducts((prev) => [...prev, ...data.records]);
    }
  }, [data]);

  const handleSearch = () => {
    const newParams = {
      itemName: cardName.trim(),
      marca,
      tipo,
      subtipo,
      stock: soloConStock,
    };

    if (JSON.stringify(newParams) === JSON.stringify(lastSearch)) {
      return; 
    }

    setLastSearch(newParams);
    setSearchParams(newParams);
  };


  return (
    <Box bg="gray.50" minH="100vh">
      <ProductPriceListSearchheader
        brandTypeSubtype = { brandTypeSubtype}
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
        tipoPrecio={tipoPrecio}
        setTipoPrecio={setTipoPrecio}
        soloConStock={soloConStock}
        setSoloConStock={setSoloConStock}
        isLoadingBrandTypeSubtype={isLoadingBrandTypeSubtype}
        errorBrandTypeSubtype={errorBrandTypeSubtype}
      />
        {allProducts.length > 0 && (
          <Flex mt={3} pl={3}>
            <Text fontSize="lg" color="black" fontWeight="600">
              Resultados - {allProducts.length} resultados
            </Text>
          </Flex>
        )}

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
        ) : isLoading && page === 1 ? (
          // loading inicial
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
        ) : allProducts.length === 0 ? (
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
            {allProducts.map((product, idx) => (
              <ProductPriceListCard
                key={product.ITEM_CODE || idx}
                product={product}
                tipoPrecio={tipoPrecio}
              />
            ))}

            
            {/* Botón de paginación */}
            {data?.nextLink && (
              <Center>
                <Button
                  mt={1}
                  px={3}
                  py={1}
                  fontSize="md"
                  fontWeight="bold"
                  color="white"
                  bgGradient="linear(to-r, green.400, green.600)"
                  _hover={{
                    bgGradient: "linear(to-r, green.500, green.700)",
                    transform: "scale(1.05)",
                  }}
                  _active={{
                    transform: "scale(0.98)",
                  }}
                  borderRadius="full"
                  shadow="md"
                  onClick={() => setPage((p) => p + 1)}
                  isLoading={isFetching && page > 1}
                  loadingText="Cargando..."
                >
                  Cargar más
                </Button>
              </Center>
            )}

          </VStack>
        )}
      </Box>
    </Box>
  );
}
