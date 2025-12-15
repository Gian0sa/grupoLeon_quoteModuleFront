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

export default function ClienteBusquedaPage() {
    const [search, setSearch] = useState("");
    const [clientQuery, setClientQuery] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
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
            map[item.ITEM_CODE] = item;
            return map;
        }, {});
    }, [dataPriceList]);

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

    // Función para ordenar
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Datos
    const productos = dataProductHistory || [];
    const clienteInfo = productos[0];

    // Aplicar ordenamiento
    const sortedProductos = [...productos].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Manejar valores nulos
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // Convertir fechas
        if (sortConfig.key === 'lastPurchaseDate') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        }

        // Comparar
        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // Validar si hay histórico real
    const tieneHistorico = productos.some((p) => p.productCode !== null);

    console.log("clienteInfo", clienteInfo);
    console.log("productos", productos);
    console.log("isAdmin", isAdmin);
    console.log("itemCodes", itemCodes);
    console.log("dataPriceList", dataPriceList);
    console.log("priceMap", priceMap);

    return (
        <Container maxW="container.xl" py={10}>
            <VStack bg="#E0F1E6" p={8} borderRadius="2xl" spacing={8}>

                {/* Título */}
                <Heading color="green.700">Búsqueda de cliente</Heading>

                {/* Barra de búsqueda */}
                <Flex
                    bg="white"
                    p={4}
                    borderRadius="full"
                    w="100%"
                    align="center"
                    gap={4}
                    border="1px solid #dcdcdc"
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

                        {/* Indicador de carga de precios */}
                        {isLoadingPriceList && (
                            <Flex align="center" gap={2} mb={4}>
                                <Spinner size="sm" color="blue.500" />
                                <Text fontSize="sm" color="blue.500">
                                    Cargando precios actuales...
                                </Text>
                            </Flex>
                        )}

                        {/* Error al cargar precios */}
                        {errorPriceList && (
                            <Alert status="warning" borderRadius="md" mb={4}>
                                <AlertIcon />
                                <Text fontSize="sm">
                                    No se pudieron cargar los precios actuales
                                </Text>
                            </Alert>
                        )}

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
                                <TabList gap={4}>
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
                                        Stock
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
                                                            Cant. Total {sortConfig.key === 'historicQuantity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                                                        <Th color="white" isNumeric>
                                                            Stock
                                                        </Th>
                                                        <Th color="white" isNumeric>
                                                            Precio Lista
                                                        </Th>
                                                        <Th color="white" isNumeric>
                                                            Dto. %
                                                        </Th>
                                                        <Th color="white" isNumeric>
                                                            Precio Final
                                                        </Th>
                                                    </Tr>
                                                </Thead>

                                                <Tbody>
                                                    {sortedProductos.map((producto, i) => {
                                                        const priceInfo = priceMap[producto.productCode];
                                                        
                                                        return (
                                                            <Tr
                                                                key={i}
                                                                bg={i % 2 === 0 ? "green.50" : "green.100"}
                                                            >
                                                                <Td fontWeight="medium">
                                                                    {producto.productCode}
                                                                </Td>
                                                                <Td>{producto.productName}</Td>
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
                                                                        ? `S/ ${producto.lastSalePrice.toFixed(2)}`
                                                                        : "-"}
                                                                </Td>
                                                                
                                                                {/* Columnas de Price List */}
                                                                <Td isNumeric>
                                                                    {isLoadingPriceList ? (
                                                                        <Spinner size="xs" />
                                                                    ) : priceInfo ? (
                                                                        <Badge 
                                                                            colorScheme={priceInfo.STOCK_DISPONIBLE > 0 ? "green" : "red"}
                                                                        >
                                                                            {priceInfo.STOCK_DISPONIBLE}
                                                                        </Badge>
                                                                    ) : (
                                                                        "-"
                                                                    )}
                                                                </Td>
                                                                <Td isNumeric>
                                                                    {isLoadingPriceList ? (
                                                                        <Spinner size="xs" />
                                                                    ) : priceInfo ? (
                                                                        `S/ ${priceInfo.PRECIO_LISTA.toFixed(2)}`
                                                                    ) : (
                                                                        "-"
                                                                    )}
                                                                </Td>
                                                                <Td isNumeric>
                                                                    {isLoadingPriceList ? (
                                                                        <Spinner size="xs" />
                                                                    ) : priceInfo ? (
                                                                        priceInfo.DESCUENTO_PCT > 0 ? (
                                                                            <Badge colorScheme="orange">
                                                                                {priceInfo.DESCUENTO_PCT}%
                                                                            </Badge>
                                                                        ) : (
                                                                            "-"
                                                                        )
                                                                    ) : (
                                                                        "-"
                                                                    )}
                                                                </Td>
                                                                <Td isNumeric fontWeight="bold" color="green.700">
                                                                    {isLoadingPriceList ? (
                                                                        <Spinner size="xs" />
                                                                    ) : priceInfo ? (
                                                                        priceInfo.PRECIO_DESCUENTO > 0 ? (
                                                                            `S/ ${priceInfo.PRECIO_DESCUENTO.toFixed(2)}`
                                                                        ) : (
                                                                            `S/ ${priceInfo.PRECIO_LISTA.toFixed(2)}`
                                                                        )
                                                                    ) : (
                                                                        "-"
                                                                    )}
                                                                </Td>
                                                            </Tr>
                                                        );
                                                    })}
                                                </Tbody>
                                            </Table>
                                        </Box>
                                    </TabPanel>

                                    {/* Panel Stock */}
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