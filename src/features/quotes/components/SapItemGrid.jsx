import React, { useState } from "react";
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  IconButton, Input, Text, Button,
  HStack, Badge, Flex, VStack, Divider, Grid
} from "@chakra-ui/react";
import { Trash2, Package, Sparkles } from "lucide-react";
import ItemAutocomplete from "./ItemAutocomplete";
import { DiscountPopoverModal } from "./DiscountPopoverModal";
import PackagingHelper from "./PackagingHelper";

const money = (val, currency = "USD") => {
  const num = Number(val || 0);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: currency === "PEN" ? "PEN" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const isItemOutOfStock = (item) => Boolean(item && (item.isAgotado || (item.stockChecked && typeof item.stock === "number" && item.stock === 0)));
const isQtyExceedingStock = (item, qty) => Boolean(item && item.stockChecked && typeof item.stock === "number" && item.stock > 0 && Number(qty) > item.stock);

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
    if (isReadOnly || !selectedItem) return;
    onAddProduct({
      id: selectedItem.id,
      code: selectedItem.id,
      name: selectedItem.name,
      quantity: 1,
      price: selectedItem.price || selectedItem.importe || 0,
      discount: selectedItem.discount || 0,
      whsCode: whsCode || "014",
      taxCode: "I18",
      stock: selectedItem.stock,
      stockChecked: selectedItem.stockChecked ?? (selectedItem.stock !== null && selectedItem.stock !== undefined),
      isAgotado: selectedItem.isAgotado || false,
      marca: selectedItem.marca || "",
      sigla: selectedItem.sigla || "",
      importe: selectedItem.importe || selectedItem.price || 0,
    });
  };

  return (
    <Box bg="white" p={{ base: 2, md: 4 }} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
      {isReadOnly ? (
        <Box mb={4} p={3.5} bg="gray.50" borderRadius="xl" border="1.5px solid" borderColor="gray.200">
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Package className="w-4 h-4 text-emerald-800" />
              <Text fontSize="xs" fontWeight="800" color="gray.800" textTransform="uppercase">
                📦 Artículos Cotizados ({products.length})
              </Text>
            </HStack>
            <Badge colorScheme="gray" fontSize="10px" px={2.5} py={0.5} borderRadius="md" fontWeight="800">
              🔒 Grilla Bloqueada (Solo Lectura)
            </Badge>
          </HStack>
        </Box>
      ) : !client ? (
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
            isDisabled={isReadOnly}
            placeholder="Escribe código o nombre del Artículo" 
          />
        </Box>
      )}

      <VStack display={{ base: "flex", md: "none" }} spacing={3} align="stretch">
        {products.length === 0 ? (
          <VStack py={8} spacing={2} color="gray.500" bg="gray.50" borderRadius="lg" border="1px dashed" borderColor="gray.300">
            <Package className="w-8 h-8 opacity-40 text-gray-400" />
            <Text fontSize="xs" fontWeight="700">No hay artículos agregados</Text>
            <Text fontSize="10px" color="gray.400">Busca artículos en la barra superior para agregarlos</Text>
          </VStack>
        ) : (
          products.map((item, index) => {
            const qty = Number(item.quantity || 1);
            const price = Number(item.price ?? item.unitPrice ?? 0);
            const sapDisc = Number(item.discount || 0);
            const addDisc = Number(item.lineDiscount || 0);
            const priceAfterSap = price * (1 - sapDisc / 100);
            const finalUnitPrice = priceAfterSap * (1 - addDisc / 100);
            const lineTotal = qty * finalUnitPrice;
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
                      {item.stock !== null && item.stock !== undefined && (
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
                          Stk: {item.stock}
                        </Badge>
                      )}
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
                    <Input
                      size="xs"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      textAlign="center"
                      fontWeight="800"
                      fontSize="xs"
                      value={item.quantity ?? ""}
                      isDisabled={isReadOnly}
                      bg={isQtyExceedingStock(item, qty) ? "orange.50" : isItemOutOfStock(item) ? "red.50" : "gray.50"}
                      color={isQtyExceedingStock(item, qty) ? "orange.800" : isItemOutOfStock(item) ? "red.600" : "inherit"}
                      borderColor="gray.300"
                      borderRadius="md"
                      px={1}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val === "") {
                          onUpdateProduct(item.id, { quantity: "" });
                        } else {
                          const parsed = parseInt(val, 10);
                          onUpdateProduct(item.id, { quantity: parsed > 0 ? parsed : "" });
                        }
                      }}
                    />
                    <Flex justify="center" mt={1}>
                      <PackagingHelper
                        itemName={itemName}
                        sigla={item.sigla}
                        raw={item.raw || item}
                        currentQuantity={qty}
                        onQuantityChange={(units) => onUpdateProduct(item.id, { quantity: units })}
                        isReadOnly={isReadOnly}
                      />
                    </Flex>
                  </Box>
                  <Box>
                    <Text fontSize="0.6rem" color="gray.500" fontWeight="800" mb={0.5} textAlign="right">PRECIO U.</Text>
                    <Text fontSize="xs" fontWeight="800" color="gray.900" textAlign="right">{money(price, currency)}</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.6rem" color="gray.500" fontWeight="800" mb={0.5}>DESC.</Text>
                    <Badge colorScheme="green" fontSize="0.65rem" fontWeight="800" px={1.5} py={0.5} borderRadius="md">
                      {sapDisc}%
                    </Badge>
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.6rem" color="gray.500" fontWeight="800" mb={0.5}>D. ADIC.</Text>
                    <Button
                      size="xs"
                      h="22px"
                      bg="#eff6ff"
                      color="#1e40af"
                      border="1px solid"
                      borderColor="#93c5fd"
                      isDisabled={isReadOnly}
                      onClick={() => handleOpenDiscountModal(item)}
                      fontWeight="900"
                      fontSize="0.65rem"
                      px={1.5}
                      borderRadius="md"
                    >
                      {addDisc}% ⚡
                    </Button>
                  </Box>
                </Grid>
                <Flex justify="space-between" align="center" bg="gray.50" p={2} borderRadius="lg" border="1px solid" borderColor="gray.100">
                  <Text fontSize="0.65rem" fontWeight="800" color="gray.600">TOTAL LÍNEA:</Text>
                  <HStack spacing={1.5}>
                    <Text fontSize="xs" fontWeight="900" color="emerald.700">{money(lineTotal, currency)}</Text>
                    {(sapDisc > 0 || addDisc > 0) && (
                      <Text fontSize="10px" color="gray.500" fontWeight="700">
                        ({money(finalUnitPrice, currency)}/u)
                      </Text>
                    )}
                  </HStack>
                </Flex>
              </Box>
            );
          })
        )}
      </VStack>

      <Box display={{ base: "none", md: "block" }}>
        <TableContainer borderRadius="lg" border="1px solid" borderColor="emerald.100">
          <Table size="sm" variant="simple">
            <Thead bg="#166534">
              <Tr>
                <Th color="white" py={3} fontSize="xs" fontWeight="800" textTransform="none" letterSpacing="normal">
                  Descripción del artículo
                </Th>
                <Th color="white" py={3} textAlign="center" fontSize="xs" fontWeight="800" textTransform="none" letterSpacing="normal">
                  Cantidad
                </Th>
                <Th color="white" py={3} textAlign="right" fontSize="xs" fontWeight="800" textTransform="none" letterSpacing="normal">
                  Precio unidad
                </Th>
                <Th color="white" py={3} textAlign="center" fontSize="xs" fontWeight="800" textTransform="none" letterSpacing="normal">
                  % Desc SAP
                </Th>
                <Th color="white" py={3} textAlign="center" fontSize="xs" fontWeight="800" textTransform="none" letterSpacing="normal">
                  % Desc Adic.
                </Th>
                <Th color="white" py={3} textAlign="right" fontSize="xs" fontWeight="800" textTransform="none" letterSpacing="normal">
                  Total (doc.)
                </Th>
                {!isReadOnly && (
                  <Th color="white" py={3} textAlign="center" fontSize="xs" fontWeight="800" textTransform="none" letterSpacing="normal">
                    Acción
                  </Th>
                )}
              </Tr>
            </Thead>
            <Tbody>
              {products.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8} color="gray.500">
                    <VStack spacing={2}>
                      <Package className="w-8 h-8 opacity-40 text-gray-400" />
                      <Text fontSize="xs" fontWeight="700">No hay artículos agregados en la grilla</Text>
                      <Text fontSize="xs" color="gray.400">Busca artículos en la barra superior para agregarlos a la cotización</Text>
                    </VStack>
                  </Td>
                </Tr>
              ) : (
                products.map((item, index) => {
                  const qty = Number(item.quantity || 1);
                  const price = Number(item.price ?? item.unitPrice ?? 0);
                  const sapDisc = Number(item.discount || 0);
                  const addDisc = Number(item.lineDiscount || 0);
                  const priceAfterSap = price * (1 - sapDisc / 100);
                  const finalUnitPrice = priceAfterSap * (1 - addDisc / 100);
                  const lineTotal = qty * finalUnitPrice;
                  const itemName = item.name || item.productName || item.description || item.ItemName || item.ItemDescription || "Artículo General";
                  const itemCode = item.code || item.productCode || item.itemCode || "";

                  return (
                    <Tr key={item.id || index} _hover={{ bg: "gray.50" }} transition="background 0.2s">
                      <Td px={3} py={2.5}>
                        <VStack align="start" spacing={0.5}>
                          <Text fontWeight="800" fontSize="xs" color="gray.900" lineHeight="short">
                            {itemName}
                          </Text>
                          <HStack spacing={2}>
                            {itemCode && (
                              <Text fontSize="10px" color="gray.500" fontWeight="600">
                                {itemCode}
                              </Text>
                            )}
                            {item.stock !== null && item.stock !== undefined && (
                              <Badge
                                colorScheme={item.stock > 0 ? "green" : "red"}
                                bg={item.stock > 0 ? "#16a34a" : "#dc2626"}
                                color="white"
                                variant="solid"
                                px={1.5}
                                py={0.2}
                                fontSize="10px"
                                fontWeight="800"
                                borderRadius="sm"
                              >
                                Stock: {item.stock}
                              </Badge>
                            )}
                          </HStack>
                        </VStack>
                      </Td>
                      <Td px={2} textAlign="center">
                        <VStack spacing={1} align="center">
                          <Input
                            size="xs"
                            maxW="75px"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            textAlign="center"
                            fontWeight="700"
                            value={item.quantity ?? ""}
                            isDisabled={isReadOnly}
                            bg={isQtyExceedingStock(item, qty) ? "orange.50" : isItemOutOfStock(item) ? "red.50" : "white"}
                            borderColor="gray.300"
                            borderRadius="md"
                            px={1}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              if (val === "") {
                                onUpdateProduct(item.id, { quantity: "" });
                              } else {
                                const parsed = parseInt(val, 10);
                                onUpdateProduct(item.id, { quantity: parsed > 0 ? parsed : "" });
                              }
                            }}
                          />
                          <PackagingHelper
                            itemName={itemName}
                            sigla={item.sigla}
                            raw={item.raw || item}
                            currentQuantity={qty}
                            onQuantityChange={(units) => onUpdateProduct(item.id, { quantity: units })}
                            isReadOnly={isReadOnly}
                          />
                        </VStack>
                      </Td>
                      <Td px={3} textAlign="right" fontWeight="800" fontSize="xs" color="gray.800">
                        {money(price, currency)}
                      </Td>
                      <Td px={2} textAlign="center">
                        <Badge colorScheme="green" fontSize="xs" fontWeight="800" px={1.5} py={0.5} borderRadius="md">
                          {sapDisc}%
                        </Badge>
                      </Td>
                      <Td px={2} textAlign="center">
                        <Button
                          size="xs"
                          bg="#eff6ff"
                          color="#1e40af"
                          border="1px solid"
                          borderColor="#93c5fd"
                          isDisabled={isReadOnly}
                          onClick={() => handleOpenDiscountModal(item)}
                          fontWeight="900"
                          fontSize="xs"
                          px={2.5}
                          py={1}
                          borderRadius="md"
                          title="Toca para desplegar el selector de descuentos"
                        >
                          {addDisc}% ⚡
                        </Button>
                      </Td>
                      <Td px={3} textAlign="right" fontWeight="900" fontSize="xs" color="emerald.700">
                        <Text fontWeight="900">{money(lineTotal, currency)}</Text>
                        {(sapDisc > 0 || addDisc > 0) && (
                          <Text fontSize="10px" color="gray.500" fontWeight="700">
                            ({money(finalUnitPrice, currency)}/u)
                          </Text>
                        )}
                      </Td>
                      {!isReadOnly && (
                        <Td px={2} textAlign="center">
                          <IconButton
                            aria-label="Eliminar artículo"
                            icon={<Trash2 className="w-4 h-4" />}
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

      {/* ── SECCIÓN "CÓDIGOS AGOTADOS" (SOLO SI EXISTEN PRODUCTOS CON CONFIRMACIÓN DE CERO STOCK) ── */}
      {products.some(isItemOutOfStock) && (
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
              .filter(isItemOutOfStock)
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
