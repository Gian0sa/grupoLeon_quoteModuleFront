import {
  VStack, Box, Flex, Text, HStack,
  Table, Thead, Tbody, Tr, Th, Td
} from "@chakra-ui/react";

export function InvoiceHistoryTab({ invoices }) {
  return (
    <VStack spacing={4} align="stretch" bg="gray.50" p={4} borderRadius="lg">
      {invoices.map((inv, i) => (
        <Box
          key={i}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          overflow="hidden"
          boxShadow="sm"
        >
          {/* Cabecera */}
          <Flex
            bg="green.50"
            p={3}
            justify="space-between"
            align="center"
            borderBottom="1px solid"
            borderColor="green.100"
          >
            <HStack spacing={10}>
              <Info label="N° FACTURA" value={inv.invoice.number} />
              <Info
                label="FECHA"
                value={new Date(inv.invoice.date).toLocaleDateString("es-PE")}
              />
              <Info label="ITEMS" value={inv.summary.totalItems} />
            </HStack>

            <Box textAlign="right">
              <Text fontSize="xs" color="gray.500" fontWeight="bold">
                TOTAL PAGADO
              </Text>
              <Text fontWeight="bold" color="green.600" fontSize="lg">
                $/ {inv.summary.totalAmount.toFixed(2)}
              </Text>
            </Box>
          </Flex>

          {/* Detalle */}
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Código</Th>
                <Th>Producto</Th>
                <Th isNumeric>Cant.</Th>
                <Th isNumeric>Precio</Th>
                <Th isNumeric>Subtotal</Th>
              </Tr>
            </Thead>
            <Tbody>
              {inv.items.map((item, idx) => (
                <Tr key={idx}>
                  <Td fontWeight="bold">{item.productCode}</Td>
                  <Td>{item.productName}</Td>
                  <Td isNumeric>{item.quantity}</Td>
                  <Td isNumeric>$/ {item.unitPrice.toFixed(2)}</Td>
                  <Td isNumeric fontWeight="bold">
                    $/ {(item.quantity * item.unitPrice).toFixed(2)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      ))}
    </VStack>
  );
}

function Info({ label, value }) {
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" fontWeight="bold">
        {label}
      </Text>
      <Text fontWeight="bold">{value}</Text>
    </Box>
  );
}
