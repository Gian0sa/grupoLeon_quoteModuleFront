import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Badge,
  Text,
  VStack,
  Flex,
  useBreakpointValue
} from "@chakra-ui/react";

export function StockPricesTab({
  data = [],
  isLoading,
  onSort,
  sortConfig,
  isOlderThanOneMonth
}) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  /* ================= MOBILE VIEW ================= */
  if (isMobile) {
    return (
      <VStack spacing={2} align="stretch">
        {data.map((item, i) => {
          const isOld = isOlderThanOneMonth(item.lastPurchaseDate);

          return (
            <Box
              key={i}
              p={3}
              border="1px solid"
              borderColor="gray.200"
              borderRadius="lg"
              bg={isOld ? "orange.50" : "blue.50"}
            >
              <Flex justify="space-between" align="start" gap={3}>

                {/* LEFT */}
                <VStack align="start" spacing={1} flex="1">
                  <Text fontSize="xs" color="gray.500">
                    #{i + 1} · {item.productCode}
                  </Text>

                  <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
                    {item.productName}
                  </Text>

                  {isOld && (
                    <Badge colorScheme="orange" fontSize="2xs">
                      +30 días
                    </Badge>
                  )}

                  <Text fontSize="xs" color="gray.500">
                    Marca: {item.priceInfo?.MARCA || "-"}
                  </Text>
                </VStack>

                {/* RIGHT */}
                <VStack align="end" spacing={1} minW="70px">
                  <Text fontSize="xs" color="gray.500">
                    Stock
                  </Text>
                  <Text fontWeight="bold">
                    {isLoading
                      ? <Spinner size="xs" />
                      : item.priceInfo?.STOCK_DISPONIBLE ?? "-"}
                  </Text>

                  <Text fontSize="xs" color="gray.500">
                    Precio
                  </Text>
                  <Text fontWeight="bold" color="green.600">
                    {item.priceInfo?.PRECIO_LISTA
                      ? `$/ ${item.priceInfo.PRECIO_LISTA.toFixed(2)}`
                      : "-"}
                  </Text>
                </VStack>

              </Flex>
            </Box>
          );
        })}
      </VStack>
    );
  }

  /* ================= DESKTOP VIEW ================= */
  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead bg="blue.700">
          <Tr>
            <Th color="white">#</Th>
            <Th
              color="white"
              cursor="pointer"
              onClick={() => onSort("productCode")}
            >
              Código
            </Th>
            <Th color="white">Producto</Th>
            <Th color="white" isNumeric>Stock</Th>
            <Th color="white" isNumeric>Precio</Th>
            <Th color="white">Marca</Th>
          </Tr>
        </Thead>

        <Tbody>
          {data.map((item, i) => {
            const isOld = isOlderThanOneMonth(item.lastPurchaseDate);

            return (
              <Tr key={i} bg={isOld ? "orange.50" : "blue.50"}>
                <Td>{i + 1}</Td>
                <Td>{item.productCode}</Td>
                <Td>
                  {item.productName}
                  {isOld && (
                    <Badge ml={2} colorScheme="orange">
                      +30 días
                    </Badge>
                  )}
                </Td>
                <Td isNumeric>
                  {isLoading
                    ? <Spinner size="xs" />
                    : item.priceInfo?.STOCK_DISPONIBLE ?? "-"}
                </Td>
                <Td isNumeric>
                  {item.priceInfo?.PRECIO_LISTA
                    ? `$/ ${item.priceInfo.PRECIO_LISTA.toFixed(2)}`
                    : "-"}
                </Td>
                <Td>{item.priceInfo?.MARCA || "-"}</Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}
