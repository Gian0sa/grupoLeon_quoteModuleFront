import { useState, useMemo } from "react";
import {
    Container,
    VStack,
    Flex,
    Box,
    Heading,
    Input,
    Button,
    Text,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Divider,
    Spinner,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Badge,
} from "@chakra-ui/react";
import { useClientProductHistory, useClientProductHistoryAdmin, usePriceListByItemCodes } from "../hooks/queries/clientQueries";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { BackButton } from "../../../components/BackButton";

export default function ClienteBusquedaPage() {
    const [search, setSearch] = useState("");
    const [clientQuery, setClientQuery] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [sortConfigStock, setSortConfigStock] = useState({ key: null, direction: 'asc' });
    const salesEmployeeCode = useAuthStore((state) => state.salesEmployeeCode);

    // Determinar si es admin
    const isAdmin = !salesEmployeeCode || salesEmployeeCode === "0";

    // Usar solo el hook correspondiente según el rol
    const {
        dataProductHistory,
        isLoadingProductHistory,
        errorProductHistory,
        refetchProductHistory
    } = isAdmin
            ? useClientProductHistoryAdmin(clientQuery)
            : useClientProductHistory(clientQuery, salesEmployeeCode);

    // Extraer códigos de productos del histórico
    const itemCodes = useMemo(() => {
        if (!dataProductHistory || dataProductHistory.length === 0) return [];

        return dataProductHistory
            .filter(p => p.productCode !== null)
            .map(p => p.productCode);
    }, [dataProductHistory]);

    // Llamar al query de price list con los códigos extraídos
    const {
        dataPriceList,
        isLoadingPriceList,
        errorPriceList,
    } = usePriceListByItemCodes(itemCodes);

    // Crear un mapa de precios para acceso rápido
    const priceMap = useMemo(() => {
        if (!dataPriceList) return {};

        return dataPriceList.reduce((map, item) => {
            const itemCode = item.ITEM_CODE || item.itemCode;
            map[itemCode] = item;
            return map;
        }, {});
    }, [dataPriceList]);

    // Combinar datos históricos con precios actuales para el tab Stock
    const stockData = useMemo(() => {
        if (!dataProductHistory || dataProductHistory.length === 0) return [];

        return dataProductHistory
            .filter(p => p.productCode !== null)
            .map(producto => ({
                ...producto,
                priceInfo: priceMap[producto.productCode] || null
            }));
    }, [dataProductHistory, priceMap]);

    // Función para verificar si un producto no se ha pedido hace más de un mes
    const isOlderThanOneMonth = (lastPurchaseDate) => {
        if (!lastPurchaseDate) return true;
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return new Date(lastPurchaseDate) < oneMonthAgo;
    };

    const handleSearch = () => {
        if (!search.trim()) return;

        let searchQuery = search.trim();

        // Si el usuario ingresó solo números, añadir el prefijo "CL"
        if (/^\d+$/.test(searchQuery)) {
            searchQuery = `CL${searchQuery}`;
        }

        setClientQuery(searchQuery);
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") handleSearch();
    };

    // Función para ordenar histórico
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Función para ordenar stock
    const handleSortStock = (key) => {
        let direction = 'asc';
        if (sortConfigStock.key === key && sortConfigStock.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfigStock({ key, direction });
    };

    // Datos
    const productos = dataProductHistory || [];
    const clienteInfo = productos[0];

    // Aplicar ordenamiento a histórico
    const sortedProductos = [...productos].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (sortConfig.key === 'lastPurchaseDate') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        }

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // Aplicar ordenamiento a stock
    const sortedStockData = [...stockData].sort((a, b) => {
        if (!sortConfigStock.key) return 0;

        let aValue, bValue;

        // Manejar campos de priceInfo
        if (sortConfigStock.key.startsWith('price_')) {
            const field = sortConfigStock.key.replace('price_', '');
            aValue = a.priceInfo?.[field] ?? null;
            bValue = b.priceInfo?.[field] ?? null;
        } else {
            aValue = a[sortConfigStock.key];
            bValue = b[sortConfigStock.key];
        }

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (aValue < bValue) {
            return sortConfigStock.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfigStock.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // Validar si hay histórico real
    const tieneHistorico = productos.some((p) => p.productCode !== null);

    return (
        <Container maxW="container.xl" py={{ base: 6, md: 10 }}>
  <VStack
    bg="green.50"
    p={{ base: 4, md: 8 }}
    borderRadius="2xl"
    spacing={8}
    boxShadow="xl"
  >
    <Flex
      bg="green.700"
      color="white"
      align="center"
      justify="center"
      position="relative"
      w="100%"
      p={4}
      borderRadius="xl"
    >
      <Box position="absolute" left={4}>
        <BackButton color="white" />
      </Box>

      <Heading
        size={{ base: "md", md: "lg" }}
        textAlign="center"
        color="white"
      >
        Búsqueda de cliente
      </Heading>
    </Flex>

                {/* Barra de búsqueda */}
                <Flex
                    bg="white"
                    p={4}
                    borderRadius="full"
                    w="100%"
                    align="center"
                    gap={4}
                    border="1px solid #dcdcdc"
                    direction={{ base: "column", md: "row" }}
                >

                    <Input
                        placeholder="Insertar nombre, apellido o código"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyPress={handleKeyPress}
                        border="none"
                        _focus={{ outline: "none" }}
                    />

                    <Button
                        bg="green.600"
                        color="white"
                        w={{ base: "100%", md: "auto" }}
                        px={8}
                        borderRadius="full"
                        _hover={{ bg: "green.500" }}
                        onClick={handleSearch}
                        isLoading={isLoadingProductHistory}
                        isDisabled={!search.trim()}
                    >
                        Buscar cliente
                    </Button>

                </Flex>

                <Divider />

                {/* Loading */}
                {isLoadingProductHistory && (
                    <Flex justify="center" w="100%" py={8}>
                        <Spinner size="xl" color="green.600" thickness="4px" />
                    </Flex>
                )}

                {/* Error */}
                {errorProductHistory && (
                    <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        <Box flex="1">
                            <AlertTitle>Error al buscar cliente</AlertTitle>
                            <AlertDescription>
                                {errorProductHistory.response?.status === 504
                                    ? "El servidor tardó demasiado en responder. Intenta una búsqueda más específica o intenta nuevamente."
                                    : errorProductHistory.message ||
                                    "Ocurrió un error al buscar el cliente"}
                            </AlertDescription>
                        </Box>
                        <Button
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            onClick={() => refetchProductHistory()}
                        >
                            Reintentar
                        </Button>
                    </Alert>
                )}

                {/* Resultado */}
                {clienteInfo && !isLoadingProductHistory && (
                    <Box w="100%">
                        <Text fontWeight="bold" color="gray.600">
                            Resultado de la búsqueda:
                        </Text>

                        <Text fontSize="xl" fontWeight="bold" color="green.700" mb={2}>
                            {clienteInfo.clientName}
                        </Text>

                        <Text fontSize="md" color="gray.600" mb={4}>
                            Código: {clienteInfo.clientCode}
                            <br />
                            Último vendedor que atendió: {clienteInfo.lastSellerName}
                        </Text>

                        {/* Si no hay histórico */}
                        {!tieneHistorico ? (
                            <Box
                                bg="yellow.50"
                                p={4}
                                borderRadius="md"
                                border="1px solid #E2E8F0"
                            >
                                <Text color="yellow.700">
                                    {isAdmin
                                        ? "Este cliente no tiene compras registradas."
                                        : "Este cliente no tiene compras registradas con este vendedor."}
                                </Text>
                            </Box>
                        ) : (
                            <Tabs variant="soft-rounded" colorScheme="green">
                                <TabList
                                    gap={4}
                                    overflowX="auto"
                                    whiteSpace="nowrap"
                                    css={{
                                        scrollbarWidth: "none",
                                        "&::-webkit-scrollbar": { display: "none" },
                                    }}
                                >

                                    <Tab
                                        bg="transparent"
                                        color="gray.700"
                                        border="1px solid #c3e2cc"
                                        borderRadius="full"
                                        px={6}
                                        _selected={{
                                            bg: "green.700",
                                            color: "white",
                                            borderColor: "green.700",
                                        }}
                                    >
                                        Histórico
                                    </Tab>

                                    <Tab
                                        bg="transparent"
                                        color="gray.700"
                                        border="1px solid #c3e2cc"
                                        borderRadius="full"
                                        px={6}
                                        _selected={{
                                            bg: "green.700",
                                            color: "white",
                                            borderColor: "green.700",
                                        }}
                                    >
                                        Stock y Precios
                                    </Tab>

                                    <Tab
                                        bg="transparent"
                                        color="gray.700"
                                        border="1px solid #c3e2cc"
                                        borderRadius="full"
                                        px={6}
                                        _selected={{
                                            bg: "green.700",
                                            color: "white",
                                            borderColor: "green.700",
                                        }}
                                    >
                                        Importaciones
                                    </Tab>
                                </TabList>

                                <TabPanels mt={4}>
                                    {/* Panel Histórico */}
                                    <TabPanel>
                                        <Box overflowX="auto">
                                            <Table variant="simple" bg="white" borderRadius="md">
                                                <Thead bg="green.700">
                                                    <Tr>
                                                        <Th color="white" textAlign="center" width="50px">
                                                            #
                                                        </Th>
                                                        <Th
                                                            color="white"
                                                            cursor="pointer"
                                                            onClick={() => handleSort('productCode')}
                                                            _hover={{ bg: "green.600" }}
                                                        >
                                                            Código {sortConfig.key === 'productCode' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th
                                                            color="white"
                                                            cursor="pointer"
                                                            onClick={() => handleSort('productName')}
                                                            _hover={{ bg: "green.600" }}
                                                        >
                                                            Artículo {sortConfig.key === 'productName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th
                                                            color="white"
                                                            isNumeric
                                                            cursor="pointer"
                                                            onClick={() => handleSort('historicQuantity')}
                                                            _hover={{ bg: "green.600" }}
                                                        >
                                                            Cantidad Total {sortConfig.key === 'historicQuantity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th
                                                            color="white"
                                                            cursor="pointer"
                                                            onClick={() => handleSort('lastPurchaseDate')}
                                                            _hover={{ bg: "green.600" }}
                                                        >
                                                            Última Compra {sortConfig.key === 'lastPurchaseDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th
                                                            color="white"
                                                            isNumeric
                                                            cursor="pointer"
                                                            onClick={() => handleSort('lastSalePrice')}
                                                            _hover={{ bg: "green.600" }}
                                                        >
                                                            Último Precio {sortConfig.key === 'lastSalePrice' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                    </Tr>
                                                </Thead>

                                                <Tbody>
                                                    {sortedProductos.map((producto, i) => {
                                                        const isOld = isOlderThanOneMonth(producto.lastPurchaseDate);

                                                        return (
                                                            <Tr
                                                                key={i}
                                                                bg={isOld
                                                                    ? (i % 2 === 0 ? "orange.100" : "orange.200")
                                                                    : (i % 2 === 0 ? "green.50" : "green.100")
                                                                }
                                                                borderLeft={isOld ? "4px solid" : "none"}
                                                                borderLeftColor={isOld ? "orange.500" : "transparent"}
                                                            >
                                                                <Td
                                                                    textAlign="center"
                                                                    fontWeight="bold"
                                                                    color="gray.600"
                                                                    fontSize="sm"
                                                                >
                                                                    {i + 1}
                                                                </Td>
                                                                <Td fontWeight="medium">
                                                                    {producto.productCode}
                                                                </Td>
                                                                <Td>
                                                                    {producto.productName}
                                                                    {isOld && (
                                                                        <Badge ml={2} colorScheme="orange" fontSize="xs">
                                                                            +30 días
                                                                        </Badge>
                                                                    )}
                                                                </Td>
                                                                <Td isNumeric>
                                                                    {producto.historicQuantity}
                                                                </Td>
                                                                <Td>
                                                                    {producto.lastPurchaseDate
                                                                        ? new Date(
                                                                            producto.lastPurchaseDate
                                                                        ).toLocaleDateString("es-PE")
                                                                        : "-"}
                                                                </Td>
                                                                <Td isNumeric>
                                                                    {producto.lastSalePrice
                                                                        ? `$/ ${producto.lastSalePrice.toFixed(2)}`
                                                                        : "-"}
                                                                </Td>
                                                            </Tr>
                                                        );
                                                    })}
                                                </Tbody>
                                            </Table>
                                        </Box>
                                    </TabPanel>

                                    {/* Panel Stock y Precios */}
                                    <TabPanel>
                                        {/* Indicador de carga de precios */}
                                        {isLoadingPriceList && (
                                            <Flex align="center" gap={2} mb={4}>
                                                <Spinner size="sm" color="blue.500" />
                                                <Text fontSize="sm" color="blue.500">
                                                    Cargando información de stock y precios...
                                                </Text>
                                            </Flex>
                                        )}

                                        {/* Error al cargar precios */}
                                        {errorPriceList && (
                                            <Alert status="warning" borderRadius="md" mb={4}>
                                                <AlertIcon />
                                                <Text fontSize="sm">
                                                    No se pudieron cargar los precios actuales. Mostrando solo datos históricos.
                                                </Text>
                                            </Alert>
                                        )}

                                        <Box overflowX="auto">
                                            <Table variant="simple" bg="white" borderRadius="md" size="sm">
                                                <Thead bg="blue.700">
                                                    <Tr>
                                                        <Th color="white" textAlign="center" width="50px">
                                                            #
                                                        </Th>
                                                        <Th
                                                            color="white"
                                                            cursor="pointer"
                                                            onClick={() => handleSortStock('productCode')}
                                                            _hover={{ bg: "blue.600" }}
                                                        >
                                                            Código {sortConfigStock.key === 'productCode' && (sortConfigStock.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th
                                                            color="white"
                                                            cursor="pointer"
                                                            onClick={() => handleSortStock('productName')}
                                                            _hover={{ bg: "blue.600" }}
                                                        >
                                                            Artículo {sortConfigStock.key === 'productName' && (sortConfigStock.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th
                                                            color="white"
                                                            isNumeric
                                                            cursor="pointer"
                                                            onClick={() => handleSortStock('price_STOCK_DISPONIBLE')}
                                                            _hover={{ bg: "blue.600" }}
                                                        >
                                                            Stock {sortConfigStock.key === 'price_STOCK_DISPONIBLE' && (sortConfigStock.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th
                                                            color="white"
                                                            isNumeric
                                                            cursor="pointer"
                                                            onClick={() => handleSortStock('price_PRECIO_LISTA')}
                                                            _hover={{ bg: "blue.600" }}
                                                        >
                                                            Precio Lista {sortConfigStock.key === 'price_PRECIO_LISTA' && (sortConfigStock.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th
                                                            color="white"
                                                            isNumeric
                                                            cursor="pointer"
                                                            onClick={() => handleSortStock('price_DESCUENTO_PCT')}
                                                            _hover={{ bg: "blue.600" }}
                                                        >
                                                            Descuento {sortConfigStock.key === 'price_DESCUENTO_PCT' && (sortConfigStock.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th
                                                            color="white"
                                                            isNumeric
                                                            cursor="pointer"
                                                            onClick={() => handleSortStock('price_PRECIO_DESCUENTO')}
                                                            _hover={{ bg: "blue.600" }}
                                                        >
                                                            Precio Final {sortConfigStock.key === 'price_PRECIO_DESCUENTO' && (sortConfigStock.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th color="white">
                                                            Marca
                                                        </Th>
                                                    </Tr>
                                                </Thead>

                                                <Tbody>
                                                    {sortedStockData.map((item, i) => {
                                                        const priceInfo = item.priceInfo;
                                                        const isOld = isOlderThanOneMonth(item.lastPurchaseDate);

                                                        return (
                                                            <Tr
                                                                key={i}
                                                                bg={isOld
                                                                    ? (i % 2 === 0 ? "orange.100" : "orange.200")
                                                                    : (i % 2 === 0 ? "blue.50" : "blue.100")
                                                                }
                                                                borderLeft={isOld ? "4px solid" : "none"}
                                                                borderLeftColor={isOld ? "orange.500" : "transparent"}
                                                            >
                                                                <Td
                                                                    textAlign="center"
                                                                    fontWeight="bold"
                                                                    color="gray.600"
                                                                    fontSize="sm"
                                                                >
                                                                    {i + 1}
                                                                </Td>
                                                                <Td fontWeight="medium" fontSize="sm">
                                                                    {item.productCode}
                                                                </Td>
                                                                <Td fontSize="sm">
                                                                    {item.productName}
                                                                    {isOld && (
                                                                        <Badge ml={2} colorScheme="orange" fontSize="xs">
                                                                            +30 días
                                                                        </Badge>
                                                                    )}
                                                                </Td>

                                                                {/* Stock */}
                                                                <Td isNumeric>
                                                                    {isLoadingPriceList ? (
                                                                        <Spinner size="xs" />
                                                                    ) : priceInfo ? (
                                                                        (() => {
                                                                            const stock = priceInfo.STOCK_DISPONIBLE ?? priceInfo.stockDisponible ?? 0;
                                                                            return (
                                                                                <Badge
                                                                                    colorScheme={stock > 0 ? "green" : "red"}
                                                                                    fontSize="xs"
                                                                                >
                                                                                    {stock}
                                                                                </Badge>
                                                                            );
                                                                        })()
                                                                    ) : (
                                                                        <Text fontSize="xs" color="gray.400">Sin info</Text>
                                                                    )}
                                                                </Td>

                                                                {/* Precio Lista */}
                                                                <Td isNumeric>
                                                                    {isLoadingPriceList ? (
                                                                        <Spinner size="xs" />
                                                                    ) : priceInfo ? (
                                                                        (() => {
                                                                            const precio = priceInfo.PRECIO_LISTA ?? priceInfo.precioLista;
                                                                            return precio != null ? (
                                                                                <Text fontSize="sm">$/ {Number(precio).toFixed(2)}</Text>
                                                                            ) : (
                                                                                <Text fontSize="xs" color="gray.400">-</Text>
                                                                            );
                                                                        })()
                                                                    ) : (
                                                                        <Text fontSize="xs" color="gray.400">Sin info</Text>
                                                                    )}
                                                                </Td>

                                                                {/* Descuento */}
                                                                <Td isNumeric>
                                                                    {isLoadingPriceList ? (
                                                                        <Spinner size="xs" />
                                                                    ) : priceInfo ? (
                                                                        (() => {
                                                                            const descuento = priceInfo.DESCUENTO_PCT ?? priceInfo.descuentoPct ?? 0;
                                                                            return descuento > 0 ? (
                                                                                <Badge colorScheme="orange" fontSize="xs">
                                                                                    {descuento}%
                                                                                </Badge>
                                                                            ) : (
                                                                                <Text fontSize="xs" color="gray.400">-</Text>
                                                                            );
                                                                        })()
                                                                    ) : (
                                                                        <Text fontSize="xs" color="gray.400">Sin info</Text>
                                                                    )}
                                                                </Td>

                                                                {/* Precio Final */}
                                                                <Td isNumeric fontWeight="bold" color="blue.700">
                                                                    {isLoadingPriceList ? (
                                                                        <Spinner size="xs" />
                                                                    ) : priceInfo ? (
                                                                        (() => {
                                                                            const precioDesc = priceInfo.PRECIO_DESCUENTO ?? priceInfo.precioDescuento;
                                                                            const precioLista = priceInfo.PRECIO_LISTA ?? priceInfo.precioLista;

                                                                            if (precioDesc != null && precioDesc > 0) {
                                                                                return <Text fontSize="sm">$/ {Number(precioDesc).toFixed(2)}</Text>;
                                                                            } else if (precioLista != null) {
                                                                                return <Text fontSize="sm">$/ {Number(precioLista).toFixed(2)}</Text>;
                                                                            }
                                                                            return <Text fontSize="xs" color="gray.400">-</Text>;
                                                                        })()
                                                                    ) : (
                                                                        <Text fontSize="xs" color="gray.400">Sin info</Text>
                                                                    )}
                                                                </Td>

                                                                {/* Marca */}
                                                                <Td fontSize="xs">
                                                                    {priceInfo?.MARCA || priceInfo?.marca || "-"}
                                                                </Td>
                                                            </Tr>
                                                        );
                                                    })}
                                                </Tbody>
                                            </Table>
                                        </Box>
                                    </TabPanel>

                                    {/* Panel Importaciones */}
                                    <TabPanel>
                                        <Table variant="simple" bg="white" borderRadius="md">
                                            <Thead bg="green.700">
                                                <Tr>
                                                    <Th color="white">Item</Th>
                                                    <Th color="white">Cantidad</Th>
                                                    <Th color="white">Fecha</Th>
                                                </Tr>
                                            </Thead>

                                            <Tbody>
                                                <Tr bg="green.50">
                                                    <Td colSpan={3} textAlign="center" py={8}>
                                                        Función en desarrollo
                                                    </Td>
                                                </Tr>
                                            </Tbody>
                                        </Table>
                                    </TabPanel>
                                </TabPanels>
                            </Tabs>
                        )}
                    </Box>
                )}

                {/* Estado inicial */}
                {!clientQuery && !isLoadingProductHistory && (
                    <Box textAlign="center">
                        <Text color="gray.500" fontSize="lg">
                            Ingrese un nombre, apellido o código para buscar un cliente
                        </Text>
                        {isAdmin && (
                            <Text color="blue.500" fontSize="sm" mt={2}>
                                ℹ️ Búsqueda como administrador (mostrando todos los vendedores)
                            </Text>
                        )}
                    </Box>
                )}
            </VStack>
        </Container>
    );
}