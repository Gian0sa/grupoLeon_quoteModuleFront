import {
  VStack,
  Box,
  Flex,
  Text,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
  useBreakpointValue
} from "@chakra-ui/react";

export function InvoiceHistoryTab({ invoices }) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <VStack spacing={4} align="stretch">
      {invoices.map((inv, i) => (
        <Box
          key={i}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          boxShadow="sm"
          overflow="hidden"
        >
          {/* HEADER */}
          <Box bg="green.50" p={3} borderBottom="1px solid" borderColor="green.100">
            <VStack align="stretch" spacing={2}>
              <Flex justify="space-between">
                <Info label="FACTURA" value={inv.invoice.number} />
                <Info
                  label="FECHA"
                  value={new Date(inv.invoice.date).toLocaleDateString("es-PE")}
                  align="end"
                />
              </Flex>

              <Flex justify="space-between" align="center">
                <Info label="ITEMS" value={inv.summary.totalItems} />

                <Box textAlign="right">
                  <Text fontSize="xs" color="gray.500" fontWeight="bold">
                    TOTAL PAGADO
                  </Text>
                  <Text fontWeight="bold" color="green.600" fontSize="lg">
                    $/ {inv.summary.totalAmount.toFixed(2)}
                  </Text>
                </Box>
              </Flex>
            </VStack>
          </Box>

          {/* MOBILE VIEW */}
          {isMobile && (
            <VStack align="stretch" spacing={3} p={3}>
              {inv.items.map((item, idx) => (
                <Box
                  key={idx}
                  border="1px solid"
                  borderColor="gray.100"
                  borderRadius="md"
                  p={2}
                >
                  <Text fontSize="xs" fontWeight="bold">
                    {item.productCode}
                  </Text>

                  <Text fontSize="sm" noOfLines={2}>
                    {item.productName}
                  </Text>

                  <Divider my={2} />

                  <Flex justify="space-between">
                    <Text fontSize="xs" color="gray.500">
                      Cant.
                    </Text>
                    <Text fontSize="sm" fontWeight="bold">
                      {item.quantity}
                    </Text>
                  </Flex>

                  <Flex justify="space-between">
                    <Text fontSize="xs" color="gray.500">
                      Precio
                    </Text>
                    <Text fontSize="sm">
                      $/ {item.unitPrice.toFixed(2)}
                    </Text>
                  </Flex>

                  <Flex justify="space-between">
                    <Text fontSize="xs" color="gray.500">
                      Subtotal
                    </Text>
                    <Text fontSize="sm" fontWeight="bold">
                      $/ {(item.quantity * item.unitPrice).toFixed(2)}
                    </Text>
                  </Flex>
                </Box>
              ))}
            </VStack>
          )}

          {/* DESKTOP VIEW */}
          {!isMobile && (
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
          )}
        </Box>
      ))}
    </VStack>
  );
}

function Info({ label, value, align = "start" }) {
  return (
    <Box textAlign={align}>
      <Text fontSize="xs" color="gray.500" fontWeight="bold">
        {label}
      </Text>
      <Text fontWeight="bold" fontSize="sm">
        {value}
      </Text>
    </Box>
  );
}
