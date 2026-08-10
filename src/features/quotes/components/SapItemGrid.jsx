import React from "react";
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  IconButton, NumberInput, NumberInputField, Text, Button,
  HStack, Badge, Flex, VStack, Divider, Grid
} from "@chakra-ui/react";
import { Trash2, Package } from "lucide-react";
import ItemAutocomplete from "./ItemAutocomplete";

const money = (val, currency = "USD") => {
  const num = Number(val || 0);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: currency === "PEN" ? "PEN" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function SapItemGrid({
  products = [],
  onAddProduct,
  onRemoveProduct,
  onUpdateProduct,
  currency = "USD",
  whsCode = "014"
}) {
  const handleItemSelect = (selectedItem) => {
    if (!selectedItem) return;
    onAddProduct({
      id: selectedItem.id,
      code: selectedItem.id,
      name: selectedItem.name,
      quantity: 1,
      price: selectedItem.price || selectedItem.importe || 0,
      discount: selectedItem.discount || 0,
      whsCode: whsCode || "014",
      taxCode: "I18",
      stock: selectedItem.stock || 0,
      marca: selectedItem.marca || "",
      sigla: selectedItem.sigla || "",
      importe: selectedItem.importe || selectedItem.price || 0,
    });
  };

  return (
    <Box bg="white" p={{ base: 2, md: 4 }} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
      {/* Buscador de artículos por Código o Nombre */}
      <Box mb={4} p={{ base: 2, md: 3 }} bg="#f0fdf4" borderRadius="lg" border="1px solid" borderColor="#bbf7d0">
        <Flex align="center" gap={1.5} mb={1.5}>
          <Package className="w-3.5 h-3.5 text-emerald-700" />
          <Text fontSize={{ base: "0.65rem", md: "xs" }} fontWeight="800" color="#166534" textTransform="uppercase" letterSpacing="wider">
            Buscar Artículo en SAP
          </Text>
        </Flex>
        <ItemAutocomplete onSelect={handleItemSelect} placeholder="Escribe código o nombre del Artículo" />
      </Box>

      {/* ── VISTA MÓVIL: TARJETAS COMPACTAS (100% AJUSTABLE A PANTALLA DE TELÉFONO) ── */}
      <VStack display={{ base: "flex", md: "none" }} spacing={3} align="stretch">
        {products.length === 0 ? (
          <VStack py={8} spacing={2} color="gray.500" bg="gray.50" borderRadius="lg" border="1px dashed" borderColor="gray.300">
            <Package className="w-8 h-8 text-emerald-600" />
            <Text fontSize="xs" fontWeight="700" color="gray.700">Sin artículos agregados</Text>
            <Text fontSize="0.65rem" color="gray.500">Busca e incorpora productos arriba</Text>
          </VStack>
        ) : (
          products.map((item, index) => {
            const qty = Number(item.quantity || 1);
            const price = Number(item.price || 0);
            const disc = Number(item.discount || 0);
            const lineTotal = qty * price * (1 - disc / 100);

            return (
              <Box
                key={item.id || index}
                p={3}
                bg="white"
                borderRadius="xl"
                border="1px solid"
                borderColor="emerald.200"
                boxShadow="xs"
              >
                {/* Cabecera Tarjeta: Número + Nombre + Eliminar */}
                <Flex align="start" justify="space-between" gap={2} mb={2}>
                  <HStack spacing={2} flex="1">
                    <Badge colorScheme="emerald" variant="solid" borderRadius="full" px={2} py={0.5} fontSize="0.65rem" fontWeight="900">
                      #{index + 1}
                    </Badge>
                    <Text fontSize="xs" fontWeight="800" color="gray.900" lineHeight="tight">
                      {item.name}
                    </Text>
                  </HStack>
                  <IconButton
                    aria-label="Eliminar"
                    icon={<Trash2 className="w-4 h-4" />}
                    size="xs"
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => onRemoveProduct(item.id)}
                  />
                </Flex>

                <Divider mb={2.5} borderColor="gray.100" />

                {/* Grilla de Controles: Cantidad | Precio Unit. | %Desc | Alm/Stock */}
                <Grid templateColumns="1fr 1.2fr 1fr 1fr" gap={2} align="center" mb={2.5}>
                  <Box>
                    <Text fontSize="0.6rem" color="gray.500" fontWeight="800" mb={0.5} textAlign="center">CANT.</Text>
                    <NumberInput
                      size="xs"
                      min={1}
                      value={item.quantity}
                      onChange={(valStr, valNum) => onUpdateProduct(item.id, { quantity: valNum > 0 ? valNum : 1 })}
                    >
                      <NumberInputField textAlign="center" fontWeight="800" bg="gray.50" px={1} borderRadius="md" />
                    </NumberInput>
                  </Box>

                  <Box>
                    <Text fontSize="0.6rem" color="gray.500" fontWeight="800" mb={0.5} textAlign="right">P. UNIT ($)</Text>
                    <NumberInput
                      size="xs"
                      min={0}
                      precision={2}
                      value={item.price}
                      onChange={(valStr, valNum) => onUpdateProduct(item.id, { price: valNum >= 0 ? valNum : 0 })}
                    >
                      <NumberInputField textAlign="right" fontWeight="700" bg="gray.50" px={1} borderRadius="md" />
                    </NumberInput>
                  </Box>

                  <Box textAlign="center">
                    <Text fontSize="0.6rem" color="gray.500" fontWeight="800" mb={0.5}>% DESC</Text>
                    <Badge colorScheme="green" fontSize="0.65rem" fontWeight="800" py={0.5} px={1.5} borderRadius="md">
                      {item.discount || 0}%
                    </Badge>
                  </Box>

                  <Box textAlign="center">
                    <Text fontSize="0.6rem" color="gray.500" fontWeight="800" mb={0.5}>ALM. / STK</Text>
                    <VStack spacing={0} align="center">
                      <Badge colorScheme="amber" variant="solid" fontSize="0.6rem" fontWeight="800">
                        {item.whsCode || whsCode || "014"}
                      </Badge>
                      {item.stock !== undefined && (
                        <Text fontSize="0.55rem" fontWeight="800" color={item.stock > 0 ? "emerald.700" : "red.600"}>
                          Stk: {item.stock}
                        </Text>
                      )}
                    </VStack>
                  </Box>
                </Grid>

                {/* Subtotal del Producto */}
                <Flex align="center" justify="space-between" bg="emerald.50" px={3} py={1.5} borderRadius="lg" border="1px solid" borderColor="emerald.100">
                  <Text fontSize="0.65rem" fontWeight="800" color="emerald.900" textTransform="uppercase">
                    Total Fila:
                  </Text>
                  <Text fontSize="xs" fontWeight="900" color="emerald.900">
                    {money(lineTotal, currency)}
                  </Text>
                </Flex>
              </Box>
            );
          })
        )}
      </VStack>

      {/* ── VISTA ESCRITORIO: TABLA COMPLETA (ORDENADOR) ── */}
      <Box display={{ base: "none", md: "block" }}>
        <TableContainer borderRadius="lg" border="1px solid" borderColor="gray.200" overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead bg="#0e572b">
              <Tr>
                <Th w="40px" px={2} textTransform="none" fontSize="xs" color="white" fontWeight="800">#</Th>
                <Th w="120px" px={2} textTransform="none" fontSize="xs" color="white" fontWeight="800">Código</Th>
                <Th minW="220px" px={2} textTransform="none" fontSize="xs" color="white" fontWeight="800">Descripción del artículo</Th>
                <Th w="85px" px={2} textAlign="center" textTransform="none" fontSize="xs" color="white" fontWeight="800">Cantidad</Th>
                <Th w="105px" px={2} textAlign="right" textTransform="none" fontSize="xs" color="white" fontWeight="800">Precio unidad</Th>
                <Th w="85px" px={2} textAlign="center" textTransform="none" fontSize="xs" color="white" fontWeight="800">% Desc.</Th>
                <Th w="95px" px={2} textAlign="center" textTransform="none" fontSize="xs" color="white" fontWeight="800">Almacén</Th>
                <Th w="115px" px={2} textAlign="right" textTransform="none" fontSize="xs" color="white" fontWeight="800">Total (doc.)</Th>
                <Th w="50px" px={2} textAlign="center" textTransform="none" fontSize="xs" color="white" fontWeight="800">Acción</Th>
              </Tr>
            </Thead>
            <Tbody>
              {products.length === 0 ? (
                <Tr>
                  <Td colSpan={9} textAlign="center" py={10} color="gray.600">
                    <VStack spacing={2}>
                      <Package className="w-10 h-10 text-emerald-600" />
                      <Text fontSize="sm" fontWeight="700" color="gray.700">Sin artículos agregados a la cotización</Text>
                      <Text fontSize="xs" color="gray.500">Utiliza el buscador superior para añadir ítems con precios y stock en tiempo real de SAP</Text>
                    </VStack>
                  </Td>
                </Tr>
              ) : (
                products.map((item, index) => {
                  const qty = Number(item.quantity || 1);
                  const price = Number(item.price || 0);
                  const disc = Number(item.discount || 0);
                  const lineTotal = qty * price * (1 - disc / 100);

                  return (
                    <Tr key={item.id || index} _hover={{ bg: "emerald.50/40" }}>
                      <Td px={2} fontWeight="700" color="gray.600" fontSize="xs">{index + 1}</Td>
                      <Td px={2} fontWeight="800" color="#126C36" fontSize="xs">
                        <Text fontFamily="mono" fontSize="xs">{item.code || item.id}</Text>
                      </Td>
                      <Td px={2} fontSize="xs" color="gray.900" fontWeight="600" maxW="260px" isTruncated title={item.name}>
                        {item.name}
                      </Td>
                      <Td px={2} textAlign="center">
                        <NumberInput
                          size="xs"
                          maxW="75px"
                          min={1}
                          value={item.quantity}
                          onChange={(valStr, valNum) => onUpdateProduct(item.id, { quantity: valNum > 0 ? valNum : 1 })}
                        >
                          <NumberInputField textAlign="center" fontWeight="700" bg="white" px={1} />
                        </NumberInput>
                      </Td>
                      <Td px={2} textAlign="right">
                        <NumberInput
                          size="xs"
                          maxW="90px"
                          min={0}
                          precision={2}
                          value={item.price}
                          onChange={(valStr, valNum) => onUpdateProduct(item.id, { price: valNum >= 0 ? valNum : 0 })}
                        >
                          <NumberInputField textAlign="right" fontWeight="600" bg="white" px={1} />
                        </NumberInput>
                      </Td>
                      <Td px={2} textAlign="center">
                        <NumberInput
                          size="xs"
                          maxW="65px"
                          isReadOnly
                          value={item.discount || 0}
                        >
                          <NumberInputField
                            textAlign="center"
                            color="#126C36"
                            fontWeight="800"
                            bg="gray.50"
                            cursor="not-allowed"
                            px={1}
                            title="Descuento fijado por regla de negocio / SAP"
                          />
                        </NumberInput>
                      </Td>
                      <Td px={2} textAlign="center">
                        <VStack spacing={0.5} align="center">
                          <Badge colorScheme="amber" variant="solid" fontSize="0.65rem" fontWeight="800">
                            {item.whsCode || whsCode || "014"}
                          </Badge>
                          {item.stock !== undefined && (
                            <Badge colorScheme={item.stock > 0 ? "green" : "red"} fontSize="0.55rem" fontWeight="800" px={1}>
                              Stk: {item.stock}
                            </Badge>
                          )}
                        </VStack>
                      </Td>
                      <Td px={2} textAlign="right" fontWeight="800" color="gray.900" fontSize="xs">
                        {money(lineTotal, currency)}
                      </Td>
                      <Td px={2} textAlign="center">
                        <IconButton
                          aria-label="Eliminar fila"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => onRemoveProduct(item.id)}
                        />
                      </Td>
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Box>

      {/* ── SECCIÓN "CÓDIGOS AGOTADOS" (SI EXISTEN PRODUCTOS SIN STOCK) ── */}
      {products.some((p) => p.stock === 0 || p.isAgotado) && (
        <Box mt={4} p={4} bg="#fef2f2" borderRadius="xl" border="1px solid" borderColor="#fecaca">
          <Flex align="center" justify="space-between" mb={2}>
            <HStack spacing={2}>
              <Badge colorScheme="red" variant="solid" px={2.5} py={0.5} borderRadius="full" fontSize="10px" fontWeight="900">
                ⚠️ CÓDIGOS AGOTADOS
              </Badge>
              <Text fontSize="xs" fontWeight="800" color="#991b1b">
                Los siguientes artículos no tienen stock disponible en Almacén 014:
              </Text>
            </HStack>
          </Flex>

          <VStack align="stretch" spacing={1.5} pl={2}>
            {products
              .filter((p) => p.stock === 0 || p.isAgotado)
              .map((p, i) => (
                <Flex key={p.id || i} justify="space-between" align="center" bg="white" p={2} borderRadius="lg" border="1px solid" borderColor="#fee2e2">
                  <HStack spacing={3}>
                    <Text fontFamily="mono" fontSize="xs" fontWeight="800" color="#991b1b">{p.code || p.id}</Text>
                    <Text fontSize="xs" color="gray.800" fontWeight="600">{p.name}</Text>
                  </HStack>
                  <HStack spacing={3}>
                    <Text fontSize="xs" color="gray.600" fontWeight="700">Cant. Solicitada: {p.quantity || 1}</Text>
                    <Badge colorScheme="red" fontSize="9px">SIN STOCK EN 014</Badge>
                  </HStack>
                </Flex>
              ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
}
