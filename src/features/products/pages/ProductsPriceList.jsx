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
import { FiPackage, FiAlertCircle, FiChevronDown, FiSearch } from "react-icons/fi";
import { useProductsPriceList } from "../hooks/queries/productQueries";
import { ProductPriceListSearchheader } from "../components/ProductPriceListSearchheader";
import { ProductPriceListCard } from "../components/ProductPriceListCard";

export function ProductList() {
  const [cardName, setCardName] = useState("");
  const [searchParams, setSearchParams] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState([]);

  // Solo ejecuta la consulta cuando el usuario realmente ha buscado algo
  const isQueryEnabled = Boolean(searchParams && (searchParams.itemName || searchParams.itemCode));

  const { data, isLoading, error, isFetching, refetch } = useProductsPriceList(
    isQueryEnabled ? { ...searchParams, page } : { enabled: false }
  );

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

  // Búsqueda manual activada por Enter o botón "Buscar"
  const handleSearch = () => {
    const trimmed = String(cardName || "").trim();
    if (!trimmed) {
      setSearchParams(null);
      setHasSearched(false);
      setAllProducts([]);
      return;
    }

    setPage(1);
    setHasSearched(true);
    const newParams = {
      itemName: trimmed,
      itemCode: trimmed,
      stock: "N",
    };

    if (
      searchParams &&
      searchParams.itemName === trimmed &&
      searchParams.itemCode === trimmed
    ) {
      refetch();
    } else {
      setSearchParams(newParams);
    }
  };

  // Cambio de texto con limpieza automática
  const handleCardNameChange = (eOrValue) => {
    const value =
      typeof eOrValue === "object" && eOrValue !== null && eOrValue.target
        ? eOrValue.target.value
        : typeof eOrValue === "string"
        ? eOrValue
        : "";
    setCardName(value);

    // Si el usuario borra todo el texto, limpiamos el estado de resultados
    if (!value.trim()) {
      setSearchParams(null);
      setHasSearched(false);
      setAllProducts([]);
    }
  };

  // Paginación
  const totalPages =
    data?.totalPages ||
    data?.total_pages ||
    data?.pagination?.totalPages ||
    data?.pages ||
    0;
  const lastBatchLength = data?.records?.length || data?.items?.length || 0;
  const hasNextPage = totalPages > 0 ? page < totalPages : lastBatchLength >= 4;

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="120px">
      {/* Cabecera con Buscador Simple y Directo */}
      <ProductPriceListSearchheader
        cardName={cardName}
        onCardNameChange={handleCardNameChange}
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      <Box maxW="1200px" mx="auto" px={{ base: 3, md: 6 }}>
        {/* Encabezado de resultados */}
        {hasSearched && allProducts.length > 0 && (
          <Flex
            justify="space-between"
            align="center"
            px={{ base: 3, md: 4 }}
            py={2}
            mb={2}
          >
            <HStack spacing={2}>
              <Text
                fontSize={{ base: "15px", md: "md" }}
                fontWeight="800"
                color="gray.800"
              >
                Resultados de productos
              </Text>
              <Badge
                bg="green.100"
                color="green.800"
                borderRadius="full"
                px={2.5}
                py={0.5}
                fontSize="12px"
                fontWeight="700"
              >
                {allProducts.length} mostrados
              </Badge>
            </HStack>

            <Badge
              colorScheme="gray"
              variant="subtle"
              borderRadius="md"
              px={2}
              py={1}
              fontSize="11px"
            >
              Página {page} {totalPages > 0 ? `de ${totalPages}` : ""}
            </Badge>
          </Flex>
        )}

        <Box px={{ base: 2, md: 4 }}>
          {/* 1. Estado inicial al entrar (Sin búsqueda previa - 0ms carga) */}
          {!hasSearched ? (
            <Center
              py={{ base: 14, md: 24 }}
              bg="white"
              borderRadius="3xl"
              my={4}
              boxShadow="0 4px 20px rgba(0,0,0,0.03)"
              border="1px solid"
              borderColor="gray.100"
            >
              <VStack spacing={4} maxW="450px" textAlign="center" px={4}>
                <Box
                  p={5}
                  borderRadius="full"
                  bg="emerald.50"
                  color="emerald.600"
                  boxShadow="0 8px 24px rgba(16, 185, 129, 0.15)"
                >
                  <Icon as={FiSearch} boxSize={{ base: 8, md: 10 }} />
                </Box>
                <VStack spacing={1.5}>
                  <Text
                    color="gray.800"
                    fontSize={{ base: "lg", md: "xl" }}
                    fontWeight="800"
                  >
                    Consulta de Lista de Precios
                  </Text>
                  <Text
                    color="gray.500"
                    fontSize={{ base: "xs", md: "sm" }}
                    lineHeight="tall"
                  >
                    Escribe un código, sigla o descripción en el buscador superior
                    para consultar stock y tarifas vigentes en tiempo real.
                  </Text>
                </VStack>
              </VStack>
            </Center>
          ) : isLoading && page === 1 ? (
            /* 2. Cargando búsqueda */
            <Center py={16} bg="white" borderRadius="3xl" my={4}>
              <VStack spacing={4}>
                <Spinner size="xl" color="green.500" thickness="4px" />
                <Text color="gray.600" fontSize="md" fontWeight="600">
                  Buscando "{cardName}" en la base de datos...
                </Text>
              </VStack>
            </Center>
          ) : error ? (
            /* 3. Error */
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
            /* 4. No se encontraron resultados */
            <Center py={16} bg="white" borderRadius="3xl" my={4}>
              <VStack spacing={3}>
                <Box bg="gray.100" p={4} borderRadius="full" color="gray.400">
                  <Icon as={FiPackage} boxSize={8} />
                </Box>
                <Text color="gray.700" fontSize="md" fontWeight="700">
                  No se encontraron productos para "{cardName}"
                </Text>
                <Text color="gray.500" fontSize="xs">
                  Verifica el código, sigla o término de búsqueda e intenta nuevamente.
                </Text>
              </VStack>
            </Center>
          ) : (
            /* 5. Resultados encontrados */
            <VStack spacing={3} align="stretch">
              {allProducts.map((product) => (
                <ProductPriceListCard
                  key={product.ITEM_CODE}
                  product={product}
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
                    Mostrando {allProducts.length} productos • Click para cargar más
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
