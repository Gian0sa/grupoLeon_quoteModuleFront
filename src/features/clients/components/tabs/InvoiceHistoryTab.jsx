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

export function InvoiceHistoryTab({ invoices }) {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedItemCode, setSelectedItemCode] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");


  // Hook para obtener detalles del producto
  const { data, isLoading } = useProductsPriceList({
    itemCode: selectedItemCode ?? "",
    page: 1,
    enabled: !!selectedItemCode,
  });

  // Agrupar productos
  const productSummary = useMemo(() => {
    // Validar que invoices exista y sea un array
    if (!invoices || !Array.isArray(invoices)) {
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

  const isOlderThan30Days = (dateString) => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return new Date(dateString) < d;
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
            <Badge colorScheme="orange" px={3} py={1} borderRadius="full">
              {filteredProducts.filter(p => isOlderThan30Days(p.lastPurchaseDate)).length} sin comprar +30d
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
                        +30 días
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

                    {/* Último precio */}
                    <Box>
                      <HStack spacing={1} mb={1}>
                        <Icon as={FiDollarSign} boxSize={3} color="green.500" />
                        <Text fontSize="xs" color="gray.500">Último Precio</Text>
                      </HStack>
                      <Text fontWeight="bold" color="green.600" fontSize="lg">
                        S/ {product.lastPrice.toFixed(2)}
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
                <Th color="green.700" isNumeric>Último Precio</Th>
                <Th color="green.700">Última Compra</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredProducts.map((product, idx) => {
                const isOld = isOlderThan30Days(product.lastPurchaseDate);

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
                    <Td isNumeric fontWeight="bold" color="green.600" fontSize="md">
                      S/ {product.lastPrice.toFixed(2)}
                    </Td>
                    <Td>
                      <VStack align="flex-start" spacing={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          {formatDate(product.lastPurchaseDate)}
                        </Text>
                        {isOld && (
                          <Badge colorScheme="orange" fontSize="xs" borderRadius="full">
                            +30 días
                          </Badge>
                        )}
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
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent mx={4} borderRadius="xl">
          <ModalHeader 
            borderBottom="1px solid" 
            borderColor="gray.100"
            bg="green.700"
            color="white"
            borderTopRadius="xl"
          >
            <HStack spacing={2}>
              <Icon as={FiPackage} />
              <Text>Detalle del producto</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="white" _hover={{ bg: "green.600" }} />

          <ModalBody pb={6} pt={6}>
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
              return (
                <VStack align="stretch" spacing={5}>
                  {/* Header del producto */}
                  <Box 
                    bg="green.50" 
                    p={4} 
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="green.200"
                  >
                    <Text fontWeight="bold" fontSize="lg" mb={1} color="gray.800">
                      {p.ITEM_NAME}
                    </Text>
                    <HStack spacing={2} flexWrap="wrap">
                      <Badge colorScheme="green">{p.ITEM_CODE}</Badge>
                      <Badge 
                        bg="green.700" 
                        color="white"
                      >
                        {p.MARCA}
                      </Badge>
                    </HStack>
                  </Box>

                  {/* Información del producto */}
                  <SimpleGrid columns={2} spacing={4}>
                    <Box 
                      p={3} 
                      bg="gray.50" 
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.200"
                    >
                      <Text fontSize="xs" color="gray.500" mb={1}>Tipo</Text>
                      <Text fontWeight="semibold">{p.TIPO || '-'}</Text>
                    </Box>

                    <Box 
                      p={3} 
                      bg="gray.50" 
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.200"
                    >
                      <Text fontSize="xs" color="gray.500" mb={1}>Subtipo</Text>
                      <Text fontWeight="semibold">{p.SUBTIPO || '-'}</Text>
                    </Box>

                    <Box 
                      p={3} 
                      bg="green.50" 
                      borderRadius="md"
                      border="1px solid"
                      borderColor="green.200"
                    >
                      <Text fontSize="xs" color="green.700" mb={1}>Precio Lista</Text>
                      <Text fontWeight="bold" fontSize="lg">S/ {p.PRECIO_LISTA}</Text>
                    </Box>

                    <Box 
                      p={3} 
                      bg="green.100" 
                      borderRadius="md"
                      border="1px solid"
                      borderColor="green.300"
                    >
                      <Text fontSize="xs" color="green.700" mb={1}>Precio Desc.</Text>
                      <Text fontWeight="bold" fontSize="lg" color="green.700">
                        S/ {p.PRECIO_DESCUENTO}
                      </Text>
                    </Box>

                    <Box 
                      p={3} 
                      bg="orange.50" 
                      borderRadius="md"
                      border="1px solid"
                      borderColor="orange.200"
                    >
                      <Text fontSize="xs" color="orange.600" mb={1}>Descuento</Text>
                      <Text fontWeight="bold" fontSize="lg">{p.DESCUENTO_PCT}%</Text>
                    </Box>

                    <Box 
                      p={3} 
                      bg="gray.50" 
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.200"
                    >
                      <Text fontSize="xs" color="gray.600" mb={1}>Stock Disponible</Text>
                      <Text fontWeight="bold" fontSize="lg">{p.STOCK_DISPONIBLE}</Text>
                    </Box>
                  </SimpleGrid>
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