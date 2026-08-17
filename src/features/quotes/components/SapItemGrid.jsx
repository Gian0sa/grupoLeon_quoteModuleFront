import React, { useState } from "react";
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  IconButton, NumberInput, NumberInputField, Text, Button,
  HStack, Badge, Flex, VStack, Divider, Grid
} from "@chakra-ui/react";
import { Trash2, Package, Sparkles } from "lucide-react";
import ItemAutocomplete from "./ItemAutocomplete";
import { DiscountPopoverModal } from "./DiscountPopoverModal";

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
  client,
  products = [],
  onAddProduct,
  onRemoveProduct,
  onUpdateProduct,
  currency = "USD",
  whsCode = "014",
  isReadOnly = false
}) {
  const [selectedDiscountItem, setSelectedDiscountItem] = useState(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  const handleOpenDiscountModal = (item) => {
    setSelectedDiscountItem(item);
    setIsDiscountModalOpen(true);
  };

  const handleApplyDiscountFromModal = (itemId, newLineDiscount) => {
    onUpdateProduct(itemId, { lineDiscount: newLineDiscount });
  };

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
      {!client ? (
        <Box
          mb={4}
          p={4}
          bg="orange.50"
          border="1.5px solid"
          borderColor="orange.200"
          borderRadius="xl"
          textAlign="center"
          boxShadow="xs"
        >
          <Text fontSize="xs" fontWeight="900" color="orange.800" textTransform="uppercase" letterSpacing="wider" mb={1}>
            ⚠️ Cotización Bloqueada
          </Text>
          <Text fontSize="xs" fontWeight="700" color="gray.700">
            Por favor, seleccione un cliente en el panel superior para poder buscar y agregar artículos.
          </Text>
        </Box>
      ) : (
        <Box mb={4} p={{ base: 2, md: 3 }} bg="#f0fdf4" borderRadius="lg" border="1px solid" borderColor="#bbf7d0">
          <Flex align="center" gap={1.5} mb={1.5}>
            <Package className="w-3.5 h-3.5 text-emerald-700" />
            <Text fontSize={{ base: "0.65rem", md: "xs" }} fontWeight="800" color="#166534" textTransform="uppercase" letterSpacing="wider">
              Buscar Artículo en SAP
            </Text>
          </Flex>
          <ItemAutocomplete 
            onSelect={handleItemSelect} 
            isDisabled={false}
            placeholder="Escribe código o nombre del Artículo" 
          />
        </Box>
      )}

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
            const price = Number(item.price ?? item.unitPrice ?? 0);
            const disc = Number(item.discount || 0);
            const lineTotal = qty * price * (1 - disc / 100);
            const itemName = item.name || item.productName || item.description || item.ItemName || item.ItemDescription || "Artículo General";
            const itemCode = item.code || item.productCode || item.itemCode || "";

            return (
              <Box key={item.id || index} p={3} bg="white" borderRadius="xl" border="1px solid" borderColor="emerald.200" boxShadow="xs">
                <Flex align="start" justify="space-between" gap={2} mb={2}>
                  <Box flex="1" minW={0}>
                    <Flex align="center" wrap="wrap" gap={1.5}>
                      <Text fontSize="xs" fontWeight="900" color="gray.900" lineHeight="tight" title={itemName}>
                        {itemName}
                      </Text>
                      {itemCode && (
                        <Badge colorScheme="gray" fontSize="0.6rem" fontWeight="700" px={1} py={0.2} borderRadius="sm">
                          {itemCode}
                        </Badge>
                      )}
                      <Badge
                        colorScheme={item.stock > 0 ? "green" : "red"}
                        bg={item.stock > 0 ? "#16a34a" : "#dc2626"}
                        color="white"
                        variant="solid"
                        px={2}
                        py={0.5}
                        fontSize="0.65rem"
                        fontWeight="900"
                        borderRadius="md"
                        flexShrink={0}
                      >
                        Stk: {item.stock ?? 0}
                      </Badge>
                    </Flex>
                  </Box>
                  {!isReadOnly && (
                    <IconButton
                      aria-label="Eliminar"
                      icon={<Trash2 className="w-4 h-4 text-red-500" />}
                      size="xs"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => onRemoveProduct(item.id)}
                    />
                  )}
                </Flex>
                <Divider mb={2.5} borderColor="gray.100" />
                <Grid templateColumns="1fr 1.2fr 1fr 1fr" gap={2} align="center" mb={2.5}>
                  <Box>
                    <Text fontSize="0.6rem" color="gray.500" fontWeight="800" mb={0.5} textAlign="center">CANT.</Text>
                    <NumberInput
                      size="xs"
                      min={1}
                      value={item.quantity}
                      isDisabled={isReadOnly}
                      onChange={(valStr) => {
                        if (valStr === "") {
                          onUpdateProduct(item.id, { quantity: "" });
                        } else {
                          const parsed = parseInt(valStr, 10);
                          onUpdateProduct(item.id, { quantity: isNaN(parsed) ? "" : parsed });
                        }
                      }}
                      onBlur={() => {
                        if (!item.quantity || Number(item.quantity) < 1) {
                          onUpdateProduct(item.id, { quantity: 1 });
                        }
                      }}
                    >
                      <NumberInputField textAlign="center" fontWeight="800" bg={qty >= (item.stock || 0) ? "red.50" : "gray.50"} color={qty >= (item.stock || 0) ? "red.600" : "inherit"} px={1} borderRadius="md" />
                    </NumberInput>
                  </Box>
                  <Box>
                    <Text fontSize="0.6rem" color="gray.500" fontWeight="800" mb={0.5} textAlign="right">
                      P. UNIT ({currency === "PEN" ? "S/" : "$"})
                    </Text>
                    <Box
                      bg="gray.100"
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="md"
                      py={0.5}
                      px={1.5}
                      textAlign="right"
                      fontWeight="800"
                      fontSize="xs"
                      color="gray.800"
                      h="24px"
                      display="flex"
                      alignItems="center"
                      justifyContent="flex-end"
                    >
                      {money(item.price, currency)}
                    </Box>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.6rem" color="gray.500" fontWeight="800" mb={0.5}>DESC SAP</Text>
                    <Badge colorScheme="green" fontSize="0.65rem" fontWeight="800" py={0.5} px={1.5} borderRadius="md">
                      {item.discount || 0}%
                    </Badge>
                  </Box>
                  <Box textAlign="center" cursor={isReadOnly ? "default" : "pointer"} onClick={isReadOnly ? undefined : () => handleOpenDiscountModal(item)}>
                    <Text fontSize="0.6rem" color="#1d4ed8" fontWeight="900" mb={0.5}>DESC. ADIC ⚡</Text>
                    <Box
                      bg="#eff6ff"
                      border="1.5px solid"
                      borderColor="#93c5fd"
                      borderRadius="md"
                      py={0.5}
                      px={1.5}
                      textAlign="center"
                      fontWeight="900"
                      fontSize="xs"
                      color="#1e40af"
                      boxShadow="xs"
                      _hover={isReadOnly ? undefined : { bg: "#dbeafe", borderColor: "#2563eb" }}
                    >
                      {item.lineDiscount || 0}% ⚡
                    </Box>
                  </Box>
                </Grid>
                {qty >= (item.stock || 0) && (
                  <Text fontSize="xs" color="red.500" fontWeight="700" textAlign="center" mb={2}>
                    ⚠️ Has seleccionado todo el stock disponible o supera la disponibilidad.
                  </Text>
                )}
                {(item.stock || 0) === 0 && (
                  <Button size="xs" colorScheme="orange" w="full" mb={2} variant="outline" borderStyle="dashed">
                    📦 Agregar a Pedido por Traer
                  </Button>
                )}
                <Flex align="center" justify="space-between" bg="emerald.50" px={3} py={1.5} borderRadius="lg" border="1px solid" borderColor="emerald.100">
                  <Text fontSize="0.65rem" fontWeight="800" color="emerald.900" textTransform="uppercase">Total Fila:</Text>
                  <Text fontSize="xs" fontWeight="900" color="emerald.900">{money(lineTotal * (1 - (item.lineDiscount || 0) / 100), currency)}</Text>
                </Flex>
              </Box>
            );
          })
        )}
      </VStack>

      <Box display={{ base: "none", md: "block" }}>
        <TableContainer borderRadius="lg" border="1px solid" borderColor="gray.200" overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead bg="#0e572b">
              <Tr>
                <Th minW="220px" px={2} textTransform="none" fontSize="xs" color="white" fontWeight="800">Descripción del artículo</Th>
                <Th w="85px" px={2} textAlign="center" textTransform="none" fontSize="xs" color="white" fontWeight="800">Cantidad</Th>
                <Th w="105px" px={2} textAlign="right" textTransform="none" fontSize="xs" color="white" fontWeight="800">Precio unidad</Th>
                <Th w="85px" px={2} textAlign="center" textTransform="none" fontSize="xs" color="white" fontWeight="800">% Desc SAP</Th>
                <Th w="85px" px={2} textAlign="center" textTransform="none" fontSize="xs" color="white" fontWeight="800">% Desc Adic.</Th>
                <Th w="115px" px={2} textAlign="right" textTransform="none" fontSize="xs" color="white" fontWeight="800">Total (doc.)</Th>
                {!isReadOnly && <Th w="50px" px={2} textAlign="center" textTransform="none" fontSize="xs" color="white" fontWeight="800">Acción</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {products.length === 0 ? (
                <Tr>
                  <Td colSpan={isReadOnly ? 6 : 7} textAlign="center" py={10} color="gray.600">
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
                  const price = Number(item.price ?? item.unitPrice ?? 0);
                  const disc = Number(item.discount || 0);
                  const lineTotal = qty * price * (1 - disc / 100);
                  const netTotal = lineTotal * (1 - (item.lineDiscount || 0) / 100);
                  const itemName = item.name || item.productName || item.description || item.ItemName || item.ItemDescription || "Artículo General";
                  const itemCode = item.code || item.productCode || item.itemCode || "";

                  return (
                    <Tr key={item.id || index} _hover={{ bg: "emerald.50/40" }}>
                      <Td px={2} fontSize="xs" color="gray.900" fontWeight="600" maxW="260px">
                        <VStack align="start" spacing={0} maxW="260px">
                          <Text fontSize="xs" color="gray.900" fontWeight="700" isTruncated title={itemName}>
                            {itemName}
                          </Text>
                          {itemCode && (
                            <Text fontSize="0.65rem" color="gray.500" fontWeight="600">
                              {itemCode}
                            </Text>
                          )}
                        </VStack>
                      </Td>
                      <Td px={2} textAlign="center">
                        <NumberInput
                          size="xs"
                          maxW="75px"
                          min={1}
                          value={item.quantity}
                          isDisabled={isReadOnly}
                          onChange={(valStr) => {
                            if (valStr === "") {
                              onUpdateProduct(item.id, { quantity: "" });
                            } else {
                              const parsed = parseInt(valStr, 10);
                              onUpdateProduct(item.id, { quantity: isNaN(parsed) ? "" : parsed });
                            }
                          }}
                          onBlur={() => {
                            if (!item.quantity || Number(item.quantity) < 1) {
                              onUpdateProduct(item.id, { quantity: 1 });
                            }
                          }}
                        >
                          <NumberInputField textAlign="center" fontWeight="700" bg="white" px={1} />
                        </NumberInput>
                      </Td>
                      <Td px={2} textAlign="right" fontWeight="800" fontSize="xs" color="gray.800">
                        {money(item.price, currency)}
                      </Td>
                      <Td px={2} textAlign="center">
                        <Badge colorScheme="green" fontSize="xs" fontWeight="800" px={1.5} py={0.5} borderRadius="md">
                          {item.discount || 0}%
                        </Badge>
                      </Td>
                      <Td px={2} textAlign="center">
                        <Button
                          size="xs"
                          bg="#eff6ff"
                          color="#1e40af"
                          border="1.5px solid"
                          borderColor="#93c5fd"
                          boxShadow="xs"
                          isDisabled={isReadOnly}
                          _hover={isReadOnly ? undefined : { bg: "#dbeafe", borderColor: "#2563eb" }}
                          onClick={() => handleOpenDiscountModal(item)}
                          fontWeight="900"
                          fontSize="xs"
                          px={2.5}
                          py={1}
                          borderRadius="md"
                          title="Toca para desplegar el selector de descuentos"
                        >
                          {item.lineDiscount || 0}% ⚡
                        </Button>
                      </Td>
                      <Td px={2} textAlign="right" fontWeight="800" color="gray.900" fontSize="xs">
                        {money(netTotal, currency)}
                      </Td>
                      {!isReadOnly && (
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
                      )}
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
      {/* Selector de Descuento Adicional Desplegable */}
      <DiscountPopoverModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        item={selectedDiscountItem}
        onApplyDiscount={handleApplyDiscountFromModal}
      />
    </Box>
  );
}
