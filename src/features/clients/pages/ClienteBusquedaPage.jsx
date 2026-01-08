import { useState, useMemo } from "react";
import {
    Container, VStack, Flex, Box, Heading, Input, Button, Text, TabPanel,
    Divider, Spinner, Alert, AlertIcon, AlertTitle, AlertDescription
} from "@chakra-ui/react";
import { 
    useClientProductHistory, 
    useClientProductHistoryAdmin, 
    usePriceListByItemCodes ,
    usePurchaseOrdersImportacion
} from "../hooks/queries/clientQueries";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { BackButton } from "../../../components/BackButton";
import { ClientTabs } from "../components/ClientTabs";
import { InvoiceHistoryTab } from "../components/tabs/InvoiceHistoryTab";
import { StockPricesTab } from "../components/tabs/StockPricesTab";
import { ImportationsTab } from "../components/tabs/ImportationsTab";

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

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

    const {
        dataPurchaseOrdersImportacion,
        isLoadingPurchaseOrdersImportacion,
        errorPurchaseOrdersImportacion,
        refetchPurchaseOrdersImportacion,
    } = usePurchaseOrdersImportacion();


    // Procesamiento de datos de facturas
    const processedData = useMemo(() => {
        if (!dataProductHistory?.length) {
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

        const productMap = new Map();
        
        invoices.forEach(inv => {
            const invDate = new Date(inv.invoice.date);
            
            inv.items.forEach(item => {
                const code = item.productCode;
                const existing = productMap.get(code);
                
                if (!existing) {
                    productMap.set(code, {
                        productCode: code,
                        productName: item.productName,
                        historicQuantity: item.quantity,
                        lastPurchaseDate: inv.invoice.date,
                        lastSalePrice: item.unitPrice,
                        invoiceCount: 1
                    });
                } else {
                    existing.historicQuantity += item.quantity;
                    existing.invoiceCount++;
                    
                    if (invDate >= new Date(existing.lastPurchaseDate)) {
                        existing.lastPurchaseDate = inv.invoice.date;
                        existing.lastSalePrice = item.unitPrice;
                    }
                }
            });
        });

        return { 
            invoices, 
            products: Array.from(productMap.values()), 
            clientInfo 
        };
    }, [dataProductHistory]);

    // Obtener códigos de productos para consultar precios
    const itemCodes = useMemo(() => 
        processedData.products.map(p => p.productCode), 
        [processedData.products]
    );

    const { dataPriceList, isLoadingPriceList } = usePriceListByItemCodes(itemCodes);

    // Combinar productos con información de precios
    const stockData = useMemo(() => {
        const priceMap = dataPriceList?.reduce((map, item) => {
            map[item.ITEM_CODE || item.itemCode] = item;
            return map;
        }, {}) || {};
        
        return processedData.products.map(producto => ({
            ...producto,
            priceInfo: priceMap[producto.productCode] || null
        }));
    }, [processedData.products, dataPriceList]);

    const handleSearch = () => {
        const trimmed = search.trim();
        if (!trimmed) return;
        setClientQuery(/^\d+$/.test(trimmed) ? `CL${trimmed}` : trimmed);
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") handleSearch();
    };

    const isOlderThanOneMonth = (date) => {
        return date && (Date.now() - new Date(date).getTime() > ONE_MONTH_MS);
    };

    // Ordenamiento de stock
    const handleSortStock = (key) => {
        setSortConfigStock(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedStockData = useMemo(() => {
        if (!sortConfigStock.key) return stockData;

        return [...stockData].sort((a, b) => {
            let aValue, bValue;
            
            if (sortConfigStock.key.startsWith('price_')) {
                const field = sortConfigStock.key.replace('price_', '');
                aValue = a.priceInfo?.[field] ?? null;
                bValue = b.priceInfo?.[field] ?? null;
            } else {
                aValue = a[sortConfigStock.key];
                bValue = b[sortConfigStock.key];
            }

            if (aValue == null) return 1;
            if (bValue == null) return -1;

            const comparison = aValue < bValue ? -1 : 1;
            return sortConfigStock.direction === 'asc' ? comparison : -comparison;
        });
    }, [stockData, sortConfigStock]);

    // Ordenamiento de facturas
    const sortedInvoices = useMemo(() => {
        const { key, direction } = sortConfigInvoices;
        
        return [...processedData.invoices].sort((a, b) => {
            const valA = key === 'date' ? new Date(a.invoice.date) : a.summary[key];
            const valB = key === 'date' ? new Date(b.invoice.date) : b.summary[key];
            return direction === 'asc' ? valA - valB : valB - valA;
        });
    }, [processedData.invoices, sortConfigInvoices]);

    const errorMessage = errorProductHistory?.response?.status === 504
        ? "El servidor tardó demasiado en responder. Intenta una búsqueda más específica o intenta nuevamente."
        : errorProductHistory?.message || "Ocurrió un error al buscar el cliente";

    return (
        <Container maxW="container.xl" py={{ base: 6, md: 10 }}>
            <VStack bg="green.50" p={{ base: 4, md: 8 }} borderRadius="2xl" spacing={8} boxShadow="xl">
                <Flex 
                    bg="green.700" 
                    color="white" 
                    align="center" 
                    justify="center" 
                    w="100%" 
                    p={4} 
                    borderRadius="xl" 
                    position="relative"
                >
                    <Box position="absolute" left={4}>
                        <BackButton color="white" />
                    </Box>
                    <Heading size={{ base: "md", md: "lg" }} textAlign="center">
                        Búsqueda de cliente
                    </Heading>
                </Flex>

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
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Box>
                        <Button
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            onClick={refetchProductHistory}
                        >
                            Reintentar
                        </Button>
                    </Alert>
                )}

                {processedData.clientInfo && !isLoadingProductHistory && (
                    <Box w="100%">
                        <Text fontWeight="bold" color="gray.600">
                            Resultado de la búsqueda:
                        </Text>
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
                            <ClientTabs>
                                <TabPanel p={0}>
                                    <InvoiceHistoryTab invoices={sortedInvoices} />
                                </TabPanel>

                                <TabPanel>
                                    <StockPricesTab
                                        data={sortedStockData}
                                        isLoading={isLoadingPriceList}
                                        onSort={handleSortStock}
                                        sortConfig={sortConfigStock}
                                        isOlderThanOneMonth={isOlderThanOneMonth}
                                    />
                                </TabPanel>

                                <TabPanel>
                                    <ImportationsTab
                                        data={dataPurchaseOrdersImportacion}
                                        isLoading={isLoadingPurchaseOrdersImportacion}
                                        error={errorPurchaseOrdersImportacion}
                                        onRetry={refetchPurchaseOrdersImportacion}
                                    />
                                </TabPanel>
                            </ClientTabs>
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