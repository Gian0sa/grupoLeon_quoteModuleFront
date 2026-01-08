import {
  Box, Table, Thead, Tbody, Tr, Th, Td,
  Spinner, Badge, Text
} from "@chakra-ui/react";

export function StockPricesTab({
  data,
  isLoading,
  onSort,
  sortConfig,
  isOlderThanOneMonth
}) {
  return (
    <Box overflowX="auto">
      <Table size="sm">
        <Thead bg="blue.700">
          <Tr>
            <Th color="white">#</Th>
            <Th color="white" onClick={() => onSort("productCode")}>
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
                  {isLoading ? <Spinner size="xs" /> :
                    item.priceInfo?.STOCK_DISPONIBLE ?? "-"}
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
