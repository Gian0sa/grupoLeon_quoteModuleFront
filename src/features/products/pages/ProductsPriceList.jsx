import { useState, useEffect } from "react";
import {
  Box,
  Text,
  Spinner,
  VStack,
  Center,
  Icon,
  Button,
  Flex,
  HStack,
  Badge
} from "@chakra-ui/react";
import { FiPackage, FiAlertCircle, FiSearch } from "react-icons/fi";
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
  const [tipoPrecio, setTipoPrecio] = useState("FINAL");
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

  const { brandTypeSubtype, isLoadingBrandTypeSubtype, errorBrandTypeSubtype } = useBrandTypeSubtype();

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
      if (page === 1) {
        setAllProducts(data.records);
      } else {
        setAllProducts((prev) => {
          const existingCodes = new Set(prev.map((p) => p.ITEM_CODE));
          const newRecords = data.records.filter((p) => !existingCodes.has(p.ITEM_CODE));
          return [...prev, ...newRecords];
        });
      }
    }
  }, [data, page]);

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
    <Box maxW="1200px" mx="auto" w="full" fontFamily="'InterVariable', sans-serif" pb="120px">
      {/* Cabecera con Buscador y Filtros */}
      <ProductPriceListSearchheader
        brandTypeSubtype={brandTypeSubtype}
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

      {/* Resultados Header */}
      {allProducts.length > 0 && (
        <Flex justify="space-between" align="center" px={{ base: 3, md: 4 }} py={2} mb={2}>
          <HStack spacing={2}>
            <Text fontSize={{ base: "15px", md: "md" }} fontWeight="800" color="gray.800">
              Resultados de productos
            </Text>
            <Badge bg="green.100" color="green.800" borderRadius="full" px={2.5} py={0.5} fontSize="12px" fontWeight="700">
              {allProducts.length} mostrados
            </Badge>
          </HStack>
        </Flex>
      )}

      <Box px={{ base: 2, md: 4 }}>
        {!searchParams ? (
          <Center py={16} bg="white" borderRadius="3xl" border="1px dashed" borderColor="gray.200" my={4}>
            <VStack spacing={3}>
              <Box bg="green.50" p={5} borderRadius="full" color="green.600">
                <Icon as={FiSearch} boxSize={8} />
              </Box>
              <Text color="gray.700" fontSize="md" fontWeight="700" textAlign="center">
                Usa el buscador o los filtros y presiona "Buscar Productos"
              </Text>
              <Text color="gray.400" fontSize="xs" textAlign="center">
                Ingresa un código, marca o tipo para ver la lista de precios vigentes
              </Text>
            </VStack>
          </Center>
        ) : isLoading && page === 1 ? (
          <Center py={16} bg="white" borderRadius="3xl" my={4}>
            <VStack spacing={4}>
              <Spinner size="xl" color="green.500" thickness="4px" />
              <Text color="gray.600" fontSize="md" fontWeight="600">
                Buscando productos en la base de datos...
              </Text>
            </VStack>
          </Center>
        ) : error ? (
          <Center py={16} bg="white" borderRadius="3xl" my={4}>
            <VStack spacing={3}>
              <Box bg="red.50" p={4} borderRadius="full" color="red.500">
                <Icon as={FiAlertCircle} boxSize={8} />
              </Box>
              <Text color="red.600" fontSize="md" fontWeight="700">
                Error al cargar la lista de precios
              </Text>
              <Text color="gray.500" fontSize="xs" textAlign="center">
                Verifica tu conexión a internet o intenta nuevamente
              </Text>
            </VStack>
          </Center>
        ) : allProducts.length === 0 ? (
          <Center py={16} bg="white" borderRadius="3xl" my={4}>
            <VStack spacing={3}>
              <Box bg="gray.100" p={4} borderRadius="full" color="gray.500">
                <Icon as={FiPackage} boxSize={8} />
              </Box>
              <Text color="gray.700" fontSize="md" fontWeight="700">
                No se encontraron productos
              </Text>
              <Text color="gray.400" fontSize="xs" textAlign="center">
                Intenta buscar con otros términos o removiendo filtros
              </Text>
            </VStack>
          </Center>
        ) : (
          <VStack spacing={2} align="stretch">
            {allProducts.map((product, idx) => (
              <ProductPriceListCard
                key={`${product.ITEM_CODE || "product"}-${idx}`}
                product={product}
                tipoPrecio={tipoPrecio}
              />
            ))}

            {/* Botón de paginación Cargar más */}
            {data?.nextLink && (
              <Center pt={4}>
                <Button
                  px={6}
                  h="40px"
                  fontSize="13px"
                  fontWeight="800"
                  color="white"
                  bg="linear-gradient(135deg, #15803d 0%, #166534 100%)"
                  _hover={{
                    bg: "linear-gradient(135deg, #166534 0%, #14532d 100%)",
                    transform: "translateY(-1px)",
                  }}
                  borderRadius="full"
                  boxShadow="0 4px 15px rgba(21, 128, 61, 0.25)"
                  onClick={() => setPage((p) => p + 1)}
                  isLoading={isFetching && page > 1}
                  loadingText="Cargando más..."
                >
                  Cargar más productos
                </Button>
              </Center>
            )}
          </VStack>
        )}
      </Box>
    </Box>
  );
}
