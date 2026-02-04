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
  Badge
} from "@chakra-ui/react";
import { useMemo } from "react";

export function InvoiceHistoryTab({ invoices }) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Agrupar productos y calcular totales
  const productSummary = useMemo(() => {
    const productMap = new Map();

    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const code = item.productCode;
        const invDate = new Date(inv.invoice.date);

        if (!productMap.has(code)) {
          productMap.set(code, {
            productCode: code,
            productName: item.productName,
            totalQuantity: item.quantity,
            lastPrice: item.unitPrice,
            lastPurchaseDate: inv.invoice.date,
            invoiceCount: 1
          });
        } else {
          const existing = productMap.get(code);
          existing.totalQuantity += item.quantity;
          existing.invoiceCount++;

          // Actualizar si esta factura es más reciente
          if (invDate > new Date(existing.lastPurchaseDate)) {
            existing.lastPurchaseDate = inv.invoice.date;
            existing.lastPrice = item.unitPrice;
          }
        }
      });
    });

    // Convertir a array y ordenar por fecha más reciente
    return Array.from(productMap.values()).sort(
      (a, b) => new Date(b.lastPurchaseDate) - new Date(a.lastPurchaseDate)
    );
  }, [invoices]);

  const isOlderThan30Days = (dateString) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(dateString) < thirtyDaysAgo;
  };

  return (
    <VStack spacing={4} align="stretch">
      <Box
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="lg"
        boxShadow="sm"
        overflow="hidden"
      >
        {/* MOBILE VIEW */}
        {isMobile && (
          <VStack align="stretch" spacing={3} p={3}>
            {productSummary.map((product, idx) => {
              const isOld = isOlderThan30Days(product.lastPurchaseDate);
              
              return (
                <Box
                  key={idx}
                  border="1px solid"
                  borderColor={isOld ? "orange.300" : "gray.100"}
                  bg={isOld ? "orange.50" : "white"}
                  borderRadius="md"
                  p={3}
                >
                  <Flex justify="space-between" align="start" mb={2}>
                    <Box flex={1}>
                      <Text fontSize="xs" fontWeight="bold" color="gray.600">
                        {product.productCode}
                      </Text>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
                        {product.productName}
                      </Text>
                    </Box>
                    {isOld && (
                      <Badge colorScheme="orange" fontSize="xs" ml={2}>
                        +30 días
                      </Badge>
                    )}
                  </Flex>

                  <VStack align="stretch" spacing={1}>
                    <Flex justify="space-between">
                      <Text fontSize="xs" color="gray.500">
                        Cantidad Total:
                      </Text>
                      <Text fontSize="sm" fontWeight="bold">
                        {product.totalQuantity}
                      </Text>
                    </Flex>

                    <Flex justify="space-between">
                      <Text fontSize="xs" color="gray.500">
                        Último Precio:
                      </Text>
                      <Text fontSize="sm" fontWeight="bold" color="green.600">
                        $/ {product.lastPrice.toFixed(2)}
                      </Text>
                    </Flex>

                    <Flex justify="space-between">
                      <Text fontSize="xs" color="gray.500">
                        Última Compra:
                      </Text>
                      <Text fontSize="sm" fontWeight="medium">
                        {new Date(product.lastPurchaseDate).toLocaleDateString("es-PE")}
                      </Text>
                    </Flex>
                  </VStack>
                </Box>
              );
            })}
          </VStack>
        )}

        {/* DESKTOP VIEW */}
        {!isMobile && (
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Código</Th>
                <Th>Producto</Th>
                <Th isNumeric>Cant. Total</Th>
                <Th isNumeric>Último Precio</Th>
                <Th>Última Compra</Th>
              </Tr>
            </Thead>
            <Tbody>
              {productSummary.map((product, idx) => {
                const isOld = isOlderThan30Days(product.lastPurchaseDate);
                
                return (
                  <Tr
                    key={idx}
                    bg={isOld ? "orange.50" : "white"}
                    _hover={{ bg: isOld ? "orange.100" : "gray.50" }}
                  >
                    <Td fontWeight="bold">{product.productCode}</Td>
                    <Td maxW="300px">
                      <Text noOfLines={2}>{product.productName}</Text>
                    </Td>
                    <Td isNumeric fontWeight="bold">{product.totalQuantity}</Td>
                    <Td isNumeric fontWeight="bold" color="green.600">
                      $/ {product.lastPrice.toFixed(2)}
                    </Td>
                    <Td>
                      <Flex align="center" gap={2}>
                        <Text fontSize="sm">
                          {new Date(product.lastPurchaseDate).toLocaleDateString("es-PE")}
                        </Text>
                        {isOld && (
                          <Badge colorScheme="orange" fontSize="xs">
                            +30 días
                          </Badge>
                        )}
                      </Flex>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Box>

      {productSummary.length === 0 && (
        <Box textAlign="center" py={8} color="gray.500">
          <Text>No hay productos en el historial</Text>
        </Box>
      )}
    </VStack>
  );
}