import { useState, useMemo } from "react";
import {
    Container, VStack, Flex, Box, Heading, Input, Button, Text, Tabs, TabList,
    TabPanels, Tab, TabPanel, Table, Thead, Tbody, Tr, Th, Td, Divider,
    Spinner, Alert, AlertIcon, AlertTitle, AlertDescription, Badge, HStack
} from "@chakra-ui/react";
import { useClientProductHistory, useClientProductHistoryAdmin, usePriceListByItemCodes } from "../hooks/queries/clientQueries";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { BackButton } from "../../../components/BackButton";

export default function ClienteBusquedaPage() {
    const [search, setSearch] = useState("");
    const [clientQuery, setClientQuery] = useState("");
    const [sortConfigStock, setSortConfigStock] = useState({ key: null, direction: 'asc' });
    const [sortConfigInvoices, setSortConfigInvoices] = useState({ key: 'date', direction: 'desc' });
    
    const salesEmployeeCode = useAuthStore((state) => state.salesEmployeeCode);
    const isAdmin = !salesEmployeeCode || salesEmployeeCode === "0";

    const {
        dataProductHistory,
        isLoadingProductHistory,
        errorProductHistory,
        refetchProductHistory
    } = isAdmin
        ? useClientProductHistoryAdmin(clientQuery)
        : useClientProductHistory(clientQuery, salesEmployeeCode);

    // --- PROCESAMIENTO DE DATOS DE FACTURAS ---
    const processedData = useMemo(() => {
        if (!dataProductHistory || dataProductHistory.length === 0) {
            return { invoices: [], products: [], clientInfo: null };
        }

        const invoices = dataProductHistory;
        const first = invoices[0];
        
        const clientInfo = {
            clientCode: first.client?.code,
            clientName: first.client?.name,
            lastSellerName: first.seller?.name,
            lastSellerCode: first.seller?.code
        };

        // Consolidar productos únicos desde todas las facturas
        const productMap = {};
        invoices.forEach(inv => {
            inv.items.forEach(item => {
                const code = item.productCode;
                if (!productMap[code]) {
                    productMap[code] = {
                        productCode: code,
                        productName: item.productName,
                        historicQuantity: 0,
                        lastPurchaseDate: inv.invoice.date,
                        lastSalePrice: item.unitPrice,
                        invoiceCount: 0
                    };
                }
                productMap[code].historicQuantity += item.quantity;
                productMap[code].invoiceCount += 1;

                // Actualizar si esta factura es más reciente
                if (new Date(inv.invoice.date) >= new Date(productMap[code].lastPurchaseDate)) {
                    productMap[code].lastPurchaseDate = inv.invoice.date;
                    productMap[code].lastSalePrice = item.unitPrice;
                }
            });
        });

        return { 
            invoices, 
            products: Object.values(productMap), 
            clientInfo 
        };
    }, [dataProductHistory]);

    // --- OBTENER CÓDIGOS DE PRODUCTOS PARA CONSULTAR PRECIOS ---
    const itemCodes = useMemo(() => 
        processedData.products.map(p => p.productCode), 
        [processedData.products]
    );

    const { dataPriceList, isLoadingPriceList, errorPriceList } = usePriceListByItemCodes(itemCodes);

    // Crear mapa de precios
    const priceMap = useMemo(() => {
        if (!dataPriceList) return {};
        return dataPriceList.reduce((map, item) => {
            map[item.ITEM_CODE || item.itemCode] = item;
            return map;
        }, {});
    }, [dataPriceList]);

    // Combinar productos con información de precios
    const stockData = useMemo(() => {
        return processedData.products.map(producto => ({
            ...producto,
            priceInfo: priceMap[producto.productCode] || null
        }));
    }, [processedData.products, priceMap]);

    const handleSearch = () => {
        if (!search.trim()) return;
        let q = search.trim();
        if (/^\d+$/.test(q)) q = `CL${q}`;
        setClientQuery(q);
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") handleSearch();
    };

    const isOlderThanOneMonth = (date) => {
        if (!date) return false;
        const limit = new Date();
        limit.setMonth(limit.getMonth() - 1);
        return new Date(date) < limit;
    };

    // --- ORDENAMIENTO STOCK ---
    const handleSortStock = (key) => {
        let direction = 'asc';
        if (sortConfigStock.key === key && sortConfigStock.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfigStock({ key, direction });
    };

    const sortedStockData = useMemo(() => {
        return [...stockData].sort((a, b) => {
            if (!sortConfigStock.key) return 0;

            let aValue, bValue;
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

            return sortConfigStock.direction === 'asc' 
                ? (aValue < bValue ? -1 : 1) 
                : (aValue > bValue ? -1 : 1);
        });
    }, [stockData, sortConfigStock]);

    // --- ORDENAMIENTO FACTURAS ---
    const sortedInvoices = useMemo(() => {
        return [...processedData.invoices].sort((a, b) => {
            const { key, direction } = sortConfigInvoices;
            let valA = key === 'date' ? new Date(a.invoice.date) : a.summary[key];
            let valB = key === 'date' ? new Date(b.invoice.date) : b.summary[key];
            return direction === 'asc' ? valA - valB : valB - valA;
        });
    }, [processedData.invoices, sortConfigInvoices]);

    return (
        <Container maxW="container.xl" py={{ base: 6, md: 10 }}>
            <VStack bg="green.50" p={{ base: 4, md: 8 }} borderRadius="2xl" spacing={8} boxShadow="xl">
                <Flex bg="green.700" color="white" align="center" justify="center" w="100%" p={4} borderRadius="xl" position="relative">
                    <Box position="absolute" left={4}>
                        <BackButton color="white" />
                    </Box>
                    <Heading size={{ base: "md", md: "lg" }} textAlign="center" color="white">
                        Búsqueda de cliente
                    </Heading>
                </Flex>

                <Flex bg="white" p={4} borderRadius="full" w="100%" align="center" gap={4} border="1px solid #dcdcdc" direction={{ base: "column", md: "row" }}>
                    <Input 
                        placeholder="Insertar nombre, apellido o código" 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyPress={handleKeyPress}
                        border="none" _focus={{ outline: "none" }}
                    />
                    <Button 
                        bg="green.600" 
                        color="white"
                        w={{ base: "100%", md: "auto" }}
                        px={8}
                        borderRadius="full" 
                        onClick={handleSearch} 
                        isLoading={isLoadingProductHistory}
                        isDisabled={!search.trim()}
                        _hover={{ bg: "green.500" }}
                    >
                        Buscar cliente
                    </Button>
                </Flex>

                <Divider />

                {isLoadingProductHistory && (
                    <Flex justify="center" w="100%" py={8}>
                        <Spinner size="xl" color="green.600" thickness="4px" />
                    </Flex>
                )}

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

                {processedData.clientInfo && !isLoadingProductHistory && (
                    <Box w="100%">
                        <Text fontWeight="bold" color="gray.600">Resultado de la búsqueda:</Text>
                        <Text fontSize="xl" fontWeight="bold" color="green.700" mb={2}>
                            {processedData.clientInfo.clientName}
                        </Text>
                        <Text fontSize="md" color="gray.600" mb={4}>
                            Código: {processedData.clientInfo.clientCode}
                            <br />
                            Último vendedor que atendió: {processedData.clientInfo.lastSellerName}
                        </Text>

                        {processedData.invoices.length === 0 ? (
                            <Box bg="yellow.50" p={4} borderRadius="md" border="1px solid #E2E8F0">
                                <Text color="yellow.700">
                                    {isAdmin
                                        ? "Este cliente no tiene compras registradas."
                                        : "Este cliente no tiene compras registradas con este vendedor."}
                                </Text>
                            </Box>
                        ) : (
                            <Tabs variant="soft-rounded" colorScheme="green">
                                <TabList gap={4} overflowX="auto" whiteSpace="nowrap" css={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                                    <Tab bg="transparent" color="gray.700" border="1px solid #c3e2cc" borderRadius="full" px={6}
                                        _selected={{ bg: "green.700", color: "white", borderColor: "green.700" }}>
                                        Histórico de Facturas
                                    </Tab>
                                    <Tab bg="transparent" color="gray.700" border="1px solid #c3e2cc" borderRadius="full" px={6}
                                        _selected={{ bg: "green.700", color: "white", borderColor: "green.700" }}>
                                        Stock y Precios
                                    </Tab>
                                    <Tab bg="transparent" color="gray.700" border="1px solid #c3e2cc" borderRadius="full" px={6}
                                        _selected={{ bg: "green.700", color: "white", borderColor: "green.700" }}>
                                        Importaciones
                                    </Tab>
                                </TabList>

                                <TabPanels mt={4}>
                                    {/* TAB 1: HISTÓRICO DE FACTURAS (MAESTRO-DETALLE) */}
                                    <TabPanel overflowX="auto" p={0}>
                                        <VStack spacing={4} align="stretch" bg="gray.50" p={4} borderRadius="lg">
                                            {sortedInvoices.map((inv, i) => (
                                                <Box 
                                                    key={i} 
                                                    bg="white"
                                                    border="1px solid" 
                                                    borderColor="gray.200" 
                                                    borderRadius="lg" 
                                                    overflow="hidden"
                                                    boxShadow="sm"
                                                >
                                                    {/* Cabecera de Factura */}
                                                    <Flex bg="green.50" p={3} justify="space-between" align="center" borderBottom="1px solid" borderColor="green.100">
                                                        <HStack spacing={10}>
                                                            <Box>
                                                                <Text fontSize="xs" color="green.600" fontWeight="bold">N° FACTURA</Text>
                                                                <Text fontWeight="bold" fontSize="md">{inv.invoice.number}</Text>
                                                            </Box>
                                                            <Box>
                                                                <Text fontSize="xs" color="gray.500" fontWeight="bold">FECHA</Text>
                                                                <Text fontSize="sm">{new Date(inv.invoice.date).toLocaleDateString('es-PE')}</Text>
                                                            </Box>
                                                            <Box>
                                                                <Text fontSize="xs" color="gray.500" fontWeight="bold">ITEMS</Text>
                                                                <Text fontSize="sm">{inv.summary.totalItems}</Text>
                                                            </Box>
                                                        </HStack>
                                                        <Box textAlign="right">
                                                            <Text fontSize="xs" color="gray.500" fontWeight="bold">TOTAL PAGADO</Text>
                                                            <Text fontWeight="bold" color="green.600" fontSize="lg">
                                                                $/ {inv.summary.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                            </Text>
                                                        </Box>
                                                    </Flex>

                                                    {/* Detalle de Productos */}
                                                    <Table size="sm" variant="simple">
                                                        <Thead bg="gray.50">
                                                            <Tr>
                                                                <Th fontSize="10px" py={3}>Código</Th>
                                                                <Th fontSize="10px" py={3}>Producto</Th>
                                                                <Th fontSize="10px" py={3} isNumeric>Cant.</Th>
                                                                <Th fontSize="10px" py={3} isNumeric>Precio Unit.</Th>
                                                                <Th fontSize="10px" py={3} isNumeric>Subtotal</Th>
                                                            </Tr>
                                                        </Thead>
                                                        <Tbody>
                                                            {inv.items.map((item, idx) => (
                                                                <Tr key={idx} _hover={{ bg: "gray.50" }}>
                                                                    <Td fontSize="xs" fontWeight="bold" color="gray.700">{item.productCode}</Td>
                                                                    <Td fontSize="xs">{item.productName}</Td>
                                                                    <Td fontSize="xs" isNumeric>{item.quantity}</Td>
                                                                    <Td fontSize="xs" isNumeric>$/ {item.unitPrice.toFixed(2)}</Td>
                                                                    <Td fontSize="xs" isNumeric fontWeight="bold" color="gray.800">
                                                                        $/ {(item.quantity * item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                                    </Td>
                                                                </Tr>
                                                            ))}
                                                        </Tbody>
                                                    </Table>
                                                </Box>
                                            ))}
                                        </VStack>
                                    </TabPanel>

                                    {/* TAB 2: STOCK Y PRECIOS */}
                                    <TabPanel>
                                        {isLoadingPriceList && (
                                            <Flex align="center" gap={2} mb={4}>
                                                <Spinner size="sm" color="blue.500" />
                                                <Text fontSize="sm" color="blue.500">
                                                    Cargando información de stock y precios...
                                                </Text>
                                            </Flex>
                                        )}

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
                                                        <Th color="white" textAlign="center" width="50px">#</Th>
                                                        <Th color="white" cursor="pointer" onClick={() => handleSortStock('productCode')} _hover={{ bg: "blue.600" }}>
                                                            Código {sortConfigStock.key === 'productCode' && (sortConfigStock.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th color="white" cursor="pointer" onClick={() => handleSortStock('productName')} _hover={{ bg: "blue.600" }}>
                                                            Artículo {sortConfigStock.key === 'productName' && (sortConfigStock.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th color="white" isNumeric cursor="pointer" onClick={() => handleSortStock('price_STOCK_DISPONIBLE')} _hover={{ bg: "blue.600" }}>
                                                            Stock {sortConfigStock.key === 'price_STOCK_DISPONIBLE' && (sortConfigStock.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th color="white" isNumeric cursor="pointer" onClick={() => handleSortStock('price_PRECIO_LISTA')} _hover={{ bg: "blue.600" }}>
                                                            Precio Lista {sortConfigStock.key === 'price_PRECIO_LISTA' && (sortConfigStock.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th color="white" isNumeric cursor="pointer" onClick={() => handleSortStock('price_DESCUENTO_PCT')} _hover={{ bg: "blue.600" }}>
                                                            Descuento {sortConfigStock.key === 'price_DESCUENTO_PCT' && (sortConfigStock.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th color="white" isNumeric cursor="pointer" onClick={() => handleSortStock('price_PRECIO_DESCUENTO')} _hover={{ bg: "blue.600" }}>
                                                            Precio Final {sortConfigStock.key === 'price_PRECIO_DESCUENTO' && (sortConfigStock.direction === 'asc' ? '↑' : '↓')}
                                                        </Th>
                                                        <Th color="white">Marca</Th>
                                                    </Tr>
                                                </Thead>
                                                <Tbody>
                                                    {sortedStockData.map((item, i) => {
                                                        const priceInfo = item.priceInfo;
                                                        const isOld = isOlderThanOneMonth(item.lastPurchaseDate);

                                                        return (
                                                            <Tr key={i} bg={isOld ? (i % 2 === 0 ? "orange.100" : "orange.200") : (i % 2 === 0 ? "blue.50" : "blue.100")}
                                                                borderLeft={isOld ? "4px solid" : "none"} borderLeftColor={isOld ? "orange.500" : "transparent"}>
                                                                <Td textAlign="center" fontWeight="bold" color="gray.600" fontSize="sm">{i + 1}</Td>
                                                                <Td fontWeight="medium" fontSize="sm">{item.productCode}</Td>
                                                                <Td fontSize="sm">
                                                                    {item.productName}
                                                                    {isOld && <Badge ml={2} colorScheme="orange" fontSize="xs">+30 días</Badge>}
                                                                </Td>
                                                                <Td isNumeric>
                                                                    {isLoadingPriceList ? <Spinner size="xs" /> : 
                                                                        priceInfo ? (
                                                                            <Badge colorScheme={(priceInfo.STOCK_DISPONIBLE ?? priceInfo.stockDisponible ?? 0) > 0 ? "green" : "red"} fontSize="xs">
                                                                                {priceInfo.STOCK_DISPONIBLE ?? priceInfo.stockDisponible ?? 0}
                                                                            </Badge>
                                                                        ) : <Text fontSize="xs" color="gray.400">Sin info</Text>
                                                                    }
                                                                </Td>
                                                                <Td isNumeric>
                                                                    {isLoadingPriceList ? <Spinner size="xs" /> :
                                                                        priceInfo ? (
                                                                            (() => {
                                                                                const precio = priceInfo.PRECIO_LISTA ?? priceInfo.precioLista;
                                                                                return precio != null ? (
                                                                                    <Text fontSize="sm">$/ {Number(precio).toFixed(2)}</Text>
                                                                                ) : (
                                                                                    <Text fontSize="xs" color="gray.400">-</Text>
                                                                                );
                                                                            })()
                                                                        ) : <Text fontSize="xs" color="gray.400">Sin info</Text>
                                                                    }
                                                                </Td>
                                                                <Td isNumeric>
                                                                    {isLoadingPriceList ? <Spinner size="xs" /> :
                                                                        priceInfo ? (
                                                                            (() => {
                                                                                const descuento = priceInfo.DESCUENTO_PCT ?? priceInfo.descuentoPct ?? 0;
                                                                                return descuento > 0 ? (
                                                                                    <Badge colorScheme="orange" fontSize="xs">{descuento}%</Badge>
                                                                                ) : (
                                                                                    <Text fontSize="xs" color="gray.400">-</Text>
                                                                                );
                                                                            })()
                                                                        ) : <Text fontSize="xs" color="gray.400">Sin info</Text>
                                                                    }
                                                                </Td>
                                                                <Td isNumeric fontWeight="bold" color="blue.700">
                                                                    {isLoadingPriceList ? <Spinner size="xs" /> :
                                                                        priceInfo ? (
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
                                                                        ) : <Text fontSize="xs" color="gray.400">Sin info</Text>
                                                                    }
                                                                </Td>
                                                                <Td fontSize="xs">{priceInfo?.MARCA || priceInfo?.marca || "-"}</Td>
                                                            </Tr>
                                                        );
                                                    })}
                                                </Tbody>
                                            </Table>
                                        </Box>
                                    </TabPanel>

                                    {/* TAB 3: IMPORTACIONES */}
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