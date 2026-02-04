import { useState, useMemo } from "react";
import {
    Container, VStack, Flex, Box, Heading, Input, Button, Text, TabPanel,
    Divider, Spinner, Alert, AlertIcon, AlertTitle, AlertDescription
} from "@chakra-ui/react";
import { 
    useClientProductHistory, 
    useClientProductHistoryAdmin, 
    usePriceListByItemCodes,
    usePurchaseOrdersImportacion
} from "../hooks/queries/clientQueries";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { BackButton } from "../../../components/BackButton";
import { ClientTabs } from "../components/ClientTabs";
import { InvoiceHistoryTab } from "../components/tabs/InvoiceHistoryTab";
import { StockPricesTab } from "../components/tabs/StockPricesTab";
import { ImportationsTab } from "../components/tabs/ImportationsTab";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";


const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export default function ClienteBusquedaPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const storeNameFromUrl = searchParams.get("storeName");
    const [search, setSearch] = useState("");
    const [clientQuery, setClientQuery] = useState("");
    const [sortConfigStock, setSortConfigStock] = useState({ key: null, direction: 'asc' });
    const [sortConfigInvoices, setSortConfigInvoices] = useState({ key: 'date', direction: 'desc' });
    const [isLockedFromUrl, setIsLockedFromUrl] = useState(false);

    const salesEmployeeCode = useAuthStore((state) => state.salesEmployeeCode);
    const isAdmin = !salesEmployeeCode || salesEmployeeCode === "0";

    useEffect(() => {
        if (storeNameFromUrl) {
            setSearch(storeNameFromUrl);
            setClientQuery(storeNameFromUrl);
            setIsLockedFromUrl(true);
        }
    }, [storeNameFromUrl]);

    const {
        dataProductHistory,
        isLoadingProductHistory,
        errorProductHistory,
        refetchProductHistory
    } = isAdmin
        ? useClientProductHistoryAdmin(clientQuery)
        : useClientProductHistory(clientQuery, salesEmployeeCode);

    console.log("dataProductHistory : ", dataProductHistory);

    const {
        dataPurchaseOrdersImportacion,
        isLoadingPurchaseOrdersImportacion,
        errorPurchaseOrdersImportacion,
        refetchPurchaseOrdersImportacion,
    } = usePurchaseOrdersImportacion();

    const processedData = useMemo(() => {
  if (!dataProductHistory?.length) {
    return { invoices: [], products: [], clientInfo: null, isBasicOnly: false };
  }

  const first = dataProductHistory[0];

  const isBasicOnly =
    !first.invoiceDate &&
    !first.invoiceNumber &&
    !first.invoice?.date &&
    !first.invoice?.number;

  const clientInfo = {
    clientCode: first.client?.code,
    clientName: first.client?.name,
    lastSellerName: first.seller?.name,
    lastSellerCode: first.seller?.code
  };

  if (isBasicOnly) {
    return {
      invoices: [],
      products: [],
      clientInfo,
      isBasicOnly: true
    };
  }

  const productMap = new Map();

  dataProductHistory.forEach(inv => {
    if (!inv.invoice?.date) return;

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
    invoices: dataProductHistory,
    products: Array.from(productMap.values()),
    clientInfo,
    isBasicOnly: false
  };
}, [dataProductHistory]);

    const historyProductCodesSet = useMemo(() => {
        return new Set(
            processedData.products.map(p => p.productCode)
        );
    }, [processedData.products]);

    const filteredImportations = useMemo(() => {
        if (!dataPurchaseOrdersImportacion?.length) return [];

        return dataPurchaseOrdersImportacion.filter(importItem =>
            historyProductCodesSet.has(importItem.itemCode)
        );
    }, [dataPurchaseOrdersImportacion, historyProductCodesSet]);

    const itemCodes = useMemo(
        () => processedData.products.map(p => p.productCode),
        [processedData.products]
    );

    const { dataPriceList, isLoadingPriceList } = usePriceListByItemCodes(itemCodes);

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

    const isOlderThanOneMonth = (date) =>
        date && (Date.now() - new Date(date).getTime() > ONE_MONTH_MS);

    const errorMessage = errorProductHistory?.response?.status === 504
        ? "El servidor tardó demasiado en responder."
        : errorProductHistory?.message || "Ocurrió un error";

    return (
        <Container
  maxW="container.xl"
  py={{ base: 3, md: 10 }}
  px={{ base: 2, sm: 3, md: 6 }}
>
  <VStack
    bg="green.50"
    p={{ base: 3, sm: 4, md: 8 }}
    borderRadius={{ base: "lg", md: "2xl" }}
    spacing={{ base: 4, md: 8 }}
    boxShadow="xl"
    w="100%"
  >
    {/* HEADER */}
    <Flex
      bg="green.700"
      color="white"
      align="center"
      justify="center"
      w="100%"
      minH={{ base: "44px", md: "56px" }}
      px={{ base: 2, md: 4 }}
      borderRadius={{ base: "md", md: "xl" }}
      position="relative"
    >
      <Box position="absolute" left={2}>
        <BackButton color="white" />
      </Box>

      <Heading
        textAlign="center"
        fontSize={{ base: "md", sm: "lg", md: "xl" }}
        noOfLines={1}
      >
        Búsqueda de cliente
      </Heading>
    </Flex>

    {/* SEARCH */}
    <Flex
      bg="white"
      p={{ base: 2, md: 4 }}
      borderRadius={{ base: "lg", md: "full" }}
      w="100%"
      gap={2}
      direction={{ base: "column", md: "row" }}
    >
      <Input
        placeholder="Nombre, apellido o código"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyPress={handleKeyPress}
        fontSize={{ base: "sm", md: "md" }}
        isReadOnly={isLockedFromUrl}
        isDisabled={isLockedFromUrl}
        bg={isLockedFromUrl ? "gray.100" : "white"}
        cursor={isLockedFromUrl ? "not-allowed" : "text"}
      />

      <Button
        bg="green.600"
        color="white"
        px={{ base: 4, md: 8 }}
        borderRadius="md"
        onClick={handleSearch}
        isLoading={isLoadingProductHistory}
        isDisabled={!search.trim() || isLockedFromUrl}
        w="100%"
        fontSize={{ base: "sm", md: "md" }}
      >
        Buscar cliente
      </Button>
    </Flex>

    <Divider />

    {/* LOADING */}
    {isLoadingProductHistory && (
      <Flex py={6}>
        <Spinner size="lg" />
      </Flex>
    )}

    {/* ERROR */}
    {errorProductHistory && (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle fontSize="sm">Error</AlertTitle>
          <AlertDescription fontSize="xs">
            {errorMessage}
          </AlertDescription>
        </Box>
      </Alert>
    )}

    {/* CONTENT */}
    {processedData.clientInfo && (
      <>
        {processedData.isBasicOnly ? (
          <VStack spacing={3} w="100%" align="stretch">
            {/* Info del cliente */}
            <Box
              bg="white"
              p={{ base: 3, md: 4 }}
              borderRadius="lg"
              boxShadow="sm"
              border="1px solid"
              borderColor="gray.200"
            >
              <VStack align="stretch" spacing={2}>
                <Heading size="sm" color="green.700">
                  Información del Cliente
                </Heading>
                <Divider />
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" color="gray.500" fontWeight="bold">
                    CÓDIGO
                  </Text>
                  <Text fontSize="sm" fontWeight="bold">
                    {processedData.clientInfo.clientCode}
                  </Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" color="gray.500" fontWeight="bold">
                    NOMBRE
                  </Text>
                  <Text fontSize="sm" fontWeight="bold" textAlign="right">
                    {processedData.clientInfo.clientName}
                  </Text>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" color="gray.500" fontWeight="bold">
                    VENDEDOR ASIGNADO
                  </Text>
                  <Text fontSize="sm" fontWeight="bold" color="green.600" textAlign="right">
                    {processedData.clientInfo.lastSellerName}
                  </Text>
                </Flex>
              </VStack>
            </Box>

            {/* Alert de sin historial */}
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle fontSize="sm">
                  Sin historial de compras
                </AlertTitle>
                <AlertDescription fontSize="xs">
                  Este cliente no tiene facturas registradas en el sistema.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        ) : (
          <Box w="100%" overflow="hidden">
            <ClientTabs>
              <TabPanel p={{ base: 0, md: 4 }}>
                <InvoiceHistoryTab invoices={processedData.invoices} />
              </TabPanel>

              <TabPanel p={{ base: 0, md: 4 }}>
                <StockPricesTab
                  data={stockData}
                  isLoading={isLoadingPriceList}
                  isOlderThanOneMonth={isOlderThanOneMonth}
                />
              </TabPanel>

              <TabPanel p={{ base: 0, md: 4 }}>
                <ImportationsTab
                  data={filteredImportations}
                  isLoading={isLoadingPurchaseOrdersImportacion}
                  error={errorPurchaseOrdersImportacion}
                  onRetry={refetchPurchaseOrdersImportacion}
                />
              </TabPanel>
            </ClientTabs>
          </Box>
        )}
      </>
    )}
  </VStack>
</Container>

    );
}