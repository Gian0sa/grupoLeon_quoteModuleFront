import {
  VStack,
  Box,
  Flex,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useBreakpointValue,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Spinner,
  useDisclosure,
  SimpleGrid,
  Icon,
  Divider,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { useProductsPriceList } from "../../../products/hooks/queries/productQueries";
import { FiPackage, FiCalendar, FiDollarSign, FiHash, FiSearch, FiX } from "react-icons/fi";

export function InvoiceHistoryTab({ invoices = [] }) {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedItemCode, setSelectedItemCode] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Debug: ver qué está llegando
  console.log("InvoiceHistoryTab - invoices recibidas:", invoices);

  // Hook para obtener detalles del producto
  const { data, isLoading } = useProductsPriceList({
    itemCode: selectedItemCode ?? "",
    page: 1,
    enabled: !!selectedItemCode,
  });

  // Agrupar productos
  const productSummary = useMemo(() => {
    try {
      // Validar que invoices exista y sea un array
      if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
        console.log("No hay invoices válidas");
        return [];
      }

      const productMap = new Map();

      invoices.forEach((inv) => {
        // Validar que la factura tenga items
        if (!inv || !inv.items || !Array.isArray(inv.items)) {
          return;
        }

        inv.items.forEach((item) => {
          // Validar que el item tenga las propiedades necesarias
          if (!item || !item.productCode || !item.productName) {
            return;
          }

          const code = item.productCode;
          const invDate = inv.invoice?.date ? new Date(inv.invoice.date) : new Date();

          if (!productMap.has(code)) {
            productMap.set(code, {
              productCode: code,
              productName: item.productName,
              totalQuantity: item.quantity || 0,
              lastPrice: item.unitPrice || 0,
              lastPurchaseDate: inv.invoice?.date || new Date().toISOString(),
              purchaseCount: 1,
            });
          } else {
            const existing = productMap.get(code);
            existing.totalQuantity += item.quantity || 0;
            existing.purchaseCount += 1;

            if (invDate > new Date(existing.lastPurchaseDate)) {
              existing.lastPurchaseDate = inv.invoice?.date || existing.lastPurchaseDate;
              existing.lastPrice = item.unitPrice || existing.lastPrice;
            }
          }
        });
      });

      return Array.from(productMap.values()).sort(
        (a, b) => new Date(b.lastPurchaseDate) - new Date(a.lastPurchaseDate)
      );
    } catch (error) {
      console.error("Error procesando invoices:", error);
      return [];
    }
  }, [invoices]);

  // Filtrar productos por búsqueda
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return productSummary;
    
    const term = searchTerm.toLowerCase();
    return productSummary.filter(
      (product) =>
        product.productCode.toLowerCase().includes(term) ||
        product.productName.toLowerCase().includes(term)
    );
  }, [productSummary, searchTerm]);

  const getDaysSinceLastPurchase = (dateString) => {
    const purchaseDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - purchaseDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOlderThan30Days = (dateString) => {
    return getDaysSinceLastPurchase(dateString) > 30;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Ayer";
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    
    return date.toLocaleDateString("es-PE", { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  const handleOpenProduct = (code) => {
    setSelectedItemCode(code);
    onOpen();
  };

  const handleClose = () => {
    setSelectedItemCode(null);
    onClose();
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Barra de búsqueda y estadísticas - solo mostrar si hay invoices */}
      {invoices && invoices.length > 0 && (
        <Box>
          <InputGroup size={isMobile ? "md" : "lg"}>
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              bg="white"
              borderColor="gray.300"
              _hover={{ borderColor: "green.500" }}
              _focus={{ borderColor: "green.600", boxShadow: "0 0 0 1px #38A169" }}
            />
            {searchTerm && (
              <IconButton
                position="absolute"
                right={2}
                top="50%"
                transform="translateY(-50%)"
                size="sm"
                variant="ghost"
                icon={<FiX />}
                onClick={clearSearch}
                aria-label="Limpiar búsqueda"
                _hover={{ bg: "green.50" }}
              />
            )}
          </InputGroup>

          {/* Resumen de estadísticas */}
          <Flex 
            mt={3} 
            gap={3} 
            flexWrap="wrap"
            fontSize="sm"
          >
            <Badge colorScheme="green" px={3} py={1} borderRadius="full">
              {filteredProducts.length} productos
            </Badge>
            <Badge 
              bg="green.700" 
              color="white" 
              px={3} 
              py={1} 
              borderRadius="full"
            >
              {filteredProducts.reduce((sum, p) => sum + p.totalQuantity, 0)} unidades
            </Badge>
          </Flex>
        </Box>
      )}

      {/* Contenedor principal - solo mostrar si hay productos */}
      {filteredProducts.length > 0 && (
        <Box
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="xl"
          boxShadow="sm"
          overflow="hidden"
        >
        {/* ================= MOBILE ================= */}
        {isMobile && (
          <VStack align="stretch" spacing={0} divider={<Divider />}>
            {filteredProducts.map((product, idx) => {
              const isOld = isOlderThan30Days(product.lastPurchaseDate);

              return (
                <Box
                  key={idx}
                  cursor="pointer"
                  onClick={() => handleOpenProduct(product.productCode)}
                  bg={isOld ? "orange.50" : "white"}
                  p={4}
                  _active={{ bg: isOld ? "orange.100" : "gray.100" }}
                  transition="all 0.2s"
                >
                  {/* Header con código y badge */}
                  <Flex justify="space-between" align="start" mb={3}>
                    <HStack spacing={2} flex={1}>
                      <Icon as={FiPackage} color="green.600" boxSize={4} />
                      <Text fontSize="xs" fontWeight="bold" color="green.700">
                        {product.productCode}
                      </Text>
                    </HStack>
                    {isOld && (
                      <Badge 
                        colorScheme="orange" 
                        fontSize="xs"
                        borderRadius="full"
                      >
                        {getDaysSinceLastPurchase(product.lastPurchaseDate)} días
                      </Badge>
                    )}
                  </Flex>

                  {/* Nombre del producto */}
                  <Text 
                    fontSize="md" 
                    fontWeight="semibold" 
                    mb={3}
                    noOfLines={2}
                    color="gray.800"
                  >
                    {product.productName}
                  </Text>

                  {/* Grid de información */}
                  <SimpleGrid columns={2} spacing={3}>
                    {/* Cantidad total */}
                    <Box>
                      <HStack spacing={1} mb={1}>
                        <Icon as={FiHash} boxSize={3} color="gray.500" />
                        <Text fontSize="xs" color="gray.500">Cantidad</Text>
                      </HStack>
                      <Text fontWeight="bold" fontSize="lg">
                        {product.totalQuantity}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {product.purchaseCount} {product.purchaseCount === 1 ? 'compra' : 'compras'}
                      </Text>
                    </Box>

                    {/* Días sin comprar */}
                    <Box>
                      <HStack spacing={1} mb={1}>
                        <Icon as={FiCalendar} boxSize={3} color={isOld ? "orange.500" : "gray.500"} />
                        <Text fontSize="xs" color="gray.500">Sin comprar</Text>
                      </HStack>
                      <Text 
                        fontWeight="bold" 
                        fontSize="lg"
                        color={isOld ? "orange.600" : "gray.700"}
                      >
                        {getDaysSinceLastPurchase(product.lastPurchaseDate)} días
                      </Text>
                    </Box>
                  </SimpleGrid>

                  {/* Fecha de última compra */}
                  <Box mt={3} pt={3} borderTop="1px solid" borderColor="gray.100">
                    <HStack spacing={1}>
                      <Icon as={FiCalendar} boxSize={3} color="gray.500" />
                      <Text fontSize="xs" color="gray.500">
                        Última compra:
                      </Text>
                      <Text fontSize="xs" fontWeight="medium" color={isOld ? "orange.600" : "gray.700"}>
                        {formatDate(product.lastPurchaseDate)}
                      </Text>
                    </HStack>
                  </Box>
                </Box>
              );
            })}
          </VStack>
        )}

        {/* ================= DESKTOP ================= */}
        {!isMobile && (
          <Table size="sm" variant="simple">
            <Thead bg="green.50">
              <Tr>
                <Th color="green.700">Código</Th>
                <Th color="green.700">Producto</Th>
                <Th color="green.700" isNumeric>Cant. Total</Th>
                <Th color="green.700" isNumeric>Compras</Th>
                <Th color="green.700">Última Compra</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredProducts.map((product, idx) => {
                const isOld = isOlderThan30Days(product.lastPurchaseDate);
                const daysSince = getDaysSinceLastPurchase(product.lastPurchaseDate);

                return (
                  <Tr
                    key={idx}
                    cursor="pointer"
                    onClick={() => handleOpenProduct(product.productCode)}
                    bg={isOld ? "orange.50" : "white"}
                    _hover={{ bg: isOld ? "orange.100" : "green.50" }}
                    transition="all 0.2s"
                  >
                    <Td fontWeight="bold" color="green.700">
                      <HStack spacing={2}>
                        <Icon as={FiPackage} color="green.600" boxSize={4} />
                        <Text>{product.productCode}</Text>
                      </HStack>
                    </Td>
                    <Td maxW="350px">
                      <Text noOfLines={2} fontWeight="medium">
                        {product.productName}
                      </Text>
                    </Td>
                    <Td isNumeric fontWeight="bold" fontSize="md">
                      {product.totalQuantity}
                    </Td>
                    <Td isNumeric>
                      <Badge colorScheme="green" borderRadius="full">
                        {product.purchaseCount}
                      </Badge>
                    </Td>
                    <Td>
                      <VStack align="flex-start" spacing={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          {formatDate(product.lastPurchaseDate)}
                        </Text>
                        <Badge 
                          colorScheme={isOld ? "orange" : "gray"} 
                          fontSize="xs" 
                          borderRadius="full"
                        >
                          {daysSince} {daysSince === 1 ? 'día' : 'días'}
                        </Badge>
                      </VStack>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Box>
      )}

      {/* Mensaje cuando no hay resultados */}
      {filteredProducts.length === 0 && (
        <Box 
          textAlign="center" 
          py={12} 
          bg="white"
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.200"
        >
          <Icon as={FiPackage} boxSize={12} color="gray.300" mb={3} />
          <Text color="gray.600" fontWeight="medium" mb={1}>
            {!invoices || invoices.length === 0 
              ? "No hay facturas en el historial" 
              : searchTerm 
                ? "No se encontraron productos" 
                : "No hay productos en el historial"}
          </Text>
          {searchTerm && invoices && invoices.length > 0 && (
            <Text color="gray.500" fontSize="sm">
              Intenta con otro término de búsqueda
            </Text>
          )}
        </Box>
      )}

      {/* ================= MODAL ================= */}
      <Modal isOpen={isOpen} onClose={handleClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader 
            fontWeight="bold" 
            fontSize="lg" 
            color="gray.800" 
            lineHeight="1.2"
            pb={2}
            width="95%"
          >
            {data?.records?.[0]?.ITEM_NAME || "Cargando..."}
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody pb={6}>
            {isLoading && (
              <Flex justify="center" align="center" py={12}>
                <VStack spacing={3}>
                  <Spinner size="xl" color="green.600" thickness="3px" />
                  <Text color="gray.500">Cargando información...</Text>
                </VStack>
              </Flex>
            )}

            {!isLoading && data?.records?.[0] && (() => {
              const p = data.records[0];
              const hasDiscount = (p.DESCUENTO_PCT || 0) > 0;
              const finalPrice = hasDiscount ? p.PRECIO_DESCUENTO : p.PRECIO_LISTA;

              const formatNumber = (num, decimals = 0) =>
                num?.toLocaleString("es-PE", {
                  minimumFractionDigits: decimals,
                  maximumFractionDigits: decimals
                }) ?? "0";

              return (
                <VStack align="stretch" spacing={4}>
                  
                  {/* Información del producto */}
                  <VStack spacing={0} align="stretch">

                    {/* Sigla */}
                    {p.SIGLA && (
                      <HStack>
                        <Text fontSize="md" color="green.600" fontWeight="medium" minW="80px">
                          Sigla:
                        </Text>
                        <Text fontSize="md" color="gray.700" fontFamily="mono">
                          {p.SIGLA}
                        </Text>
                      </HStack>
                    )}

                    {/* Código */}
                    {p.ITEM_CODE && (
                      <HStack>
                        <Text fontSize="md" color="green.600" fontWeight="medium" minW="80px">
                          Código:
                        </Text>
                        <Text fontSize="md" color="gray.700" fontFamily="mono">
                          {p.ITEM_CODE}
                        </Text>
                      </HStack>
                    )}

                    {/* Marca */}
                    <HStack>
                      <Text fontSize="xs" color="green.600" fontWeight="medium" minW="80px">
                        Marca:
                      </Text>
                      <Text fontSize="xs" color="gray.700">
                        {p.MARCA || "Sin marca"}
                      </Text>
                    </HStack>

                    {/* Tipo */}
                    {p.TIPO && (
                      <HStack>
                        <Text fontSize="xs" color="green.600" fontWeight="medium" minW="80px">
                          Tipo:
                        </Text>
                        <Text fontSize="xs" color="gray.700">
                          {p.TIPO}
                        </Text>
                      </HStack>
                    )}

                    {/* Subtipo */}
                    {p.SUBTIPO && (
                      <HStack>
                        <Text fontSize="xs" color="green.600" fontWeight="medium" minW="80px">
                          Subtipo:
                        </Text>
                        <Text fontSize="xs" color="gray.700">
                          {p.SUBTIPO}
                        </Text>
                      </HStack>
                    )}
                  </VStack>

                  <Divider />

                  {/* Precios */}
                  <VStack spacing={1} align="stretch">
                    {/* Precio Listado */}
                    <Flex align="center" justify="space-between">
                      <Box
                        bg="blue.200"
                        fontSize="xs"
                        px={4}
                        py={2}
                        borderRadius="full"
                        fontWeight="medium"
                        color="gray.800"
                      >
                        Precio Listado: $ {p.PRECIO_LISTA?.toFixed(2) || "0.00"}
                      </Box>
                      {hasDiscount && (
                        <Box
                          bg="red.800"
                          color="white"
                          fontSize="xs"
                          px={4}
                          py={2}
                          borderRadius="full"
                          fontWeight="medium"
                        >
                          Descuento: {p.DESCUENTO_PCT}%
                        </Box>
                      )}
                    </Flex>

                    {/* Precio Final */}
                    <Box
                      bg="green.700"
                      color="white"
                      fontSize="lg"
                      fontWeight="bold"
                      py={3}
                      px={4}
                      borderRadius="full"
                      textAlign="center"
                    >
                      Precio Final: $ {finalPrice?.toFixed(2) || "0.00"}
                    </Box>
                  </VStack>

                  {/* Stock */}
                  <Box
                    bg="gray.50"
                    px={2}
                    py={2}
                    borderRadius="md"
                    border="1px"
                    borderColor="gray.200"
                  >
                    <HStack justify="space-between" align="center">
                      <Text fontSize="xs" color="green.600" fontWeight="bold">
                        Stock:
                      </Text>
                      <Badge
                        colorScheme={p.STOCK_DISPONIBLE === 0 ? "red" : p.STOCK_DISPONIBLE <= 5 ? "yellow" : "green"}
                        variant="solid"
                        fontSize="xs"
                        px={2}
                        py={1}
                        borderRadius="md"
                        fontWeight="bold"
                      >
                        {formatNumber(p.STOCK_DISPONIBLE)} und.
                      </Badge>
                    </HStack>
                  </Box>
                </VStack>
              );
            })()}

            {!isLoading && !data?.records?.[0] && (
              <Box textAlign="center" py={8}>
                <Icon as={FiPackage} boxSize={12} color="gray.300" mb={3} />
                <Text color="gray.500">
                  No se encontró información adicional del producto
                </Text>
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}