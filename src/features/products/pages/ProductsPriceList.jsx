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
import { FiPackage, FiAlertCircle, FiChevronDown } from "react-icons/fi";
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
  const [soloConStock, setSoloConStock] = useState("Y");

  // Estado inicial de búsqueda: Al cargar inicialmente muestra solo productos con stock ("Y")
  const initialParams = {
    itemName: "",
    itemCode: "",
    marca: "",
    tipo: "",
    subtipo: "",
    stock: "Y",
  };

  const [searchParams, setSearchParams] = useState(initialParams);
  const [lastSearch, setLastSearch] = useState(initialParams);

  // Estado de paginación
  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState([]);

  // Hook de React Query
  const { data, isLoading, error, isFetching, refetch } = useProductsPriceList(
    searchParams ? { ...searchParams, page } : { enabled: false }
  );

  const { brandTypeSubtype, isLoadingBrandTypeSubtype, errorBrandTypeSubtype } = useBrandTypeSubtype();

  // Reseteamos productos acumulados y página en cada cambio de búsqueda
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

  // Búsqueda simultánea por Código, OEM y Nombre de producto
  const handleSearch = () => {
    const trimmed = cardName.trim();
    const newStock = trimmed ? "N" : "Y";

    const isDifferent =
      trimmed !== searchParams.itemName ||
      marca !== searchParams.marca ||
      tipo !== searchParams.tipo ||
      subtipo !== searchParams.subtipo ||
      newStock !== searchParams.stock;

    if (isDifferent) {
      const newParams = {
        itemName: trimmed,
        itemCode: trimmed,
        marca,
        tipo,
        subtipo,
        stock: newStock,
      };
      setLastSearch(newParams);
      setSearchParams(newParams);
    } else {
      // Si la búsqueda es idéntica, forzamos un refetch manual de React Query para actualizar la data sin vaciar la pantalla
      refetch();
    }
  };

  // Cambio de texto con limpieza automática
  const handleCardNameChange = (value) => {
    setCardName(value);
    if (!value) {
      const newParams = {
        itemName: "",
        itemCode: "",
        marca,
        tipo,
        subtipo,
        stock: "Y", // Al vaciar el buscador, volvemos a mostrar solo productos con stock
      };
      setLastSearch(newParams);
      setSearchParams(newParams);
    }
  };

  // Paginación robusta: evalúa totalPages o registros de la última tanda devuelta por la API
  const totalPages = data?.totalPages || data?.total_pages || data?.pagination?.totalPages || data?.pages || 0;
  const lastBatchLength = data?.records?.length || data?.items?.length || 0;
  const hasNextPage = totalPages > 0 ? page < totalPages : lastBatchLength >= 4;

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="120px">
      {/* Cabecera con Buscador y Filtros */}
      <ProductPriceListSearchheader
        brandTypeSubtype={brandTypeSubtype}
        cardName={cardName}
        onCardNameChange={handleCardNameChange}
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
        setSoloConStock={() => {}}
        isLoadingBrandTypeSubtype={isLoadingBrandTypeSubtype}
        errorBrandTypeSubtype={errorBrandTypeSubtype}
      />

      <Box maxW="1200px" mx="auto" px={{ base: 3, md: 6 }}>
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

            <Badge colorScheme="gray" variant="subtle" borderRadius="md" px={2} py={1} fontSize="11px">
              Página {page} {totalPages > 0 ? `de ${totalPages}` : ""}
            </Badge>
          </Flex>
        )}

        <Box px={{ base: 2, md: 4 }}>
          {isLoading && page === 1 ? (
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
                <Text color="gray.800" fontSize="md" fontWeight="700">
                  Ocurrió un error al consultar productos
                </Text>
                <Text color="gray.500" fontSize="xs">
                  {error.message || "Por favor, reintenta más tarde."}
                </Text>
                <Button colorScheme="green" size="sm" onClick={handleSearch}>
                  Reintentar
                </Button>
              </VStack>
            </Center>
          ) : allProducts.length === 0 ? (
            <Center py={16} bg="white" borderRadius="3xl" my={4}>
              <VStack spacing={3}>
                <Box bg="gray.100" p={4} borderRadius="full" color="gray.400">
                  <Icon as={FiPackage} boxSize={8} />
                </Box>
                <Text color="gray.700" fontSize="md" fontWeight="700">
                  No se encontraron productos
                </Text>
                <Text color="gray.500" fontSize="xs">
                  Intenta buscar con otros términos o removiendo filtros
                </Text>
              </VStack>
            </Center>
          ) : (
            <VStack spacing={3} align="stretch">
              {allProducts.map((product) => (
                <ProductPriceListCard
                  key={product.ITEM_CODE}
                  product={product}
                  tipoPrecio={tipoPrecio}
                />
              ))}

              {/* Paginación / Cargar más */}
              {hasNextPage && (
                <VStack pt={6} spacing={2}>
                  <Button
                    onClick={() => setPage((p) => p + 1)}
                    isLoading={isFetching}
                    loadingText="Cargando más productos..."
                    rightIcon={<Icon as={FiChevronDown} />}
                    colorScheme="green"
                    variant="solid"
                    bgGradient="linear(to-r, #126C36, #166534)"
                    _hover={{ bgGradient: "linear(to-r, #0e572b, #126C36)" }}
                    borderRadius="full"
                    px={8}
                    py={6}
                    fontWeight="700"
                    boxShadow="0 4px 15px rgba(18, 108, 54, 0.25)"
                  >
                    Cargar más productos
                  </Button>
                  <Text fontSize="xs" color="gray.400" fontWeight="medium">
                    Mostrando {allProducts.length} productos • Click para cargar la siguiente página
                  </Text>
                </VStack>
              )}
            </VStack>
          )}
        </Box>
      </Box>
    </Box>
  );
}
