import React, { useState } from "react";
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  IconButton, Input, Text, Button, Select,
  HStack, Badge, Flex, VStack, Divider, Grid
} from "@chakra-ui/react";
import { Trash2, Package, Sparkles, Flame } from "lucide-react";
import ItemAutocomplete from "./ItemAutocomplete";
import { DiscountPopoverModal } from "./DiscountPopoverModal";
import PackagingHelper from "./PackagingHelper";
import { useIsAdmin } from "../../../shared/utils/permissions";
import { formatThousands } from "../../../shared/utils/quoteCalculator";
import { useGetPromotions } from "../hooks/queries/quotesQueries";

const money = (val, currency = "USD") => {
  const num = Number(val || 0);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: currency === "PEN" ? "PEN" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const isItemOutOfStock = (item) => Boolean(
  item && (
    item.isAgotado === true ||
    (item.stockChecked && typeof item.stock === "number" && item.stock <= 0) ||
    (item.stock !== undefined && item.stock !== null && Number(item.stock) === 0)
  )
);
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

  const isAdmin = useIsAdmin();
  const { promotionsMap = {} } = useGetPromotions();
  const inStockProducts = products.filter((p) => !isItemOutOfStock(p));
  const outOfStockProducts = products.filter(isItemOutOfStock);

  const handleOpenDiscountModal = (item) => {
    setSelectedDiscountItem(item);
    setIsDiscountModalOpen(true);
  };

  const handleApplyDiscountFromModal = (itemId, newLineDiscount, customPriceConIGV) => {
    onUpdateProduct(itemId, { 
      lineDiscount: Number(Number(newLineDiscount || 0).toFixed(2)),
      customPriceConIGV: customPriceConIGV !== undefined ? customPriceConIGV : null,
    });
  };

  const handleItemSelect = (selectedItem) => {
    if (isReadOnly || !selectedItem) return;
    const rawPrice = Number(selectedItem.price || selectedItem.importe || selectedItem.Price || 0);
    const hasSapPrice = rawPrice > 0;
    const effectivePrice = rawPrice;

    const promoInfo = promotionsMap[selectedItem.id] || promotionsMap[selectedItem.code] || null;
    const promoDiscount = selectedItem.promoDiscount || promoInfo?.discountPct || 0;
    const promoPrice = selectedItem.promoPrice || promoInfo?.promoPrice || null;
    const campaignName = selectedItem.campaignName || promoInfo?.campaignName || (promoDiscount > 0 ? "Oferta del Mes" : undefined);

    onAddProduct({
      id: selectedItem.id,
      code: selectedItem.id,
      name: selectedItem.name,
      quantity: 1,
      price: effectivePrice,
      unitPrice: effectivePrice,
      isTestFallback: !hasSapPrice,
      isPriceFromSap: hasSapPrice,
      discount: selectedItem.discount || 0,
      promoDiscount,
      promoPrice,
      U_US_PROMO: promoPrice,
      campaignName,
      whsCode: whsCode || "014",
      taxCode: "I18",
      stock: selectedItem.stock,
      stockChecked: selectedItem.stockChecked ?? (selectedItem.stock !== null && selectedItem.stock !== undefined),
      isAgotado: selectedItem.isAgotado || false,
      marca: selectedItem.marca || "",
      sigla: selectedItem.sigla || "",
      importe: effectivePrice,
    });
  };

  return (
    <Box bg="white" p={{ base: 2, sm: 3, md: 4 }} borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
      {isReadOnly ? (
        <Box mb={4} p={3.5} bg="#f8fafc" borderRadius="xl" border="1px solid" borderColor="gray.200">
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Package className="w-4 h-4 text-emerald-800" />
              <HStack spacing={2}>
                <Text fontSize="xs" fontWeight="800" color="gray.800" textTransform="uppercase">
                  📦 Artículos Cotizados con Stock ({inStockProducts.length})
                </Text>
                {outOfStockProducts.length > 0 && (
                  <Badge colorScheme="red" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                    ⚠️ {outOfStockProducts.length} en Back Order (ver abajo)
                  </Badge>
                )}
              </HStack>
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
          border="1px solid"
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
        <Box mb={4} p={{ base: 2.5, md: 3.5 }} bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
          <Flex align="center" gap={1.5} mb={2}>
            <Package className="w-4 h-4 text-emerald-800" />
            <Text fontSize="xs" fontWeight="800" color="#166534" textTransform="uppercase" letterSpacing="wider">
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
        {inStockProducts.length === 0 ? (
          <VStack py={8} spacing={2} color="gray.500" bg="gray.50" borderRadius="lg" border="1px dashed" borderColor="gray.300">
            <Package className="w-8 h-8 opacity-40 text-gray-400" />
            <Text fontSize="xs" fontWeight="700">No hay artículos con stock disponibles en el listado</Text>
            <Text fontSize="10px" color="gray.400">
              {outOfStockProducts.length > 0
                ? "Los artículos sin stock se muestran abajo en Demanda Back Order."
                : "Busca artículos en la barra superior para agregarlos"}
            </Text>
          </VStack>
        ) : (
          inStockProducts.map((item, index) => {
            const isOutOfStock = isItemOutOfStock(item);
            const qty = Number(item.quantity || 1);
            const price = isOutOfStock ? 0 : Number(item.price ?? item.unitPrice ?? 0);
            const sapDisc = isOutOfStock ? 0 : Number(item.discount || item.sapDiscount || 0);
            const itemCode = item.code || item.productCode || item.itemCode || item.id || "";
            const promoInfo = promotionsMap[itemCode] || null;
            const promoDisc = isOutOfStock ? 0 : Number(item.promoDiscount || promoInfo?.discountPct || 0);
            const promoPrice = item.promoPrice || promoInfo?.promoPrice || null;
            const addDisc = isOutOfStock ? 0 : Number(Number(item.lineDiscount || 0).toFixed(2));
            const maxAllowedCeiling = qty > 100 ? 65 : 60;
            const totalDisc = isOutOfStock ? 0 : Math.min(maxAllowedCeiling, Math.max(0, sapDisc + promoDisc + addDisc));
            const customPrice = !isOutOfStock && item.customPriceConIGV && Number(item.customPriceConIGV) > 0
              ? Number(item.customPriceConIGV)
              : null;
            let finalUnitPrice;
            let unitPriceConIGV;
            if (customPrice) {
              finalUnitPrice = Number((customPrice / 1.18).toFixed(2));
              unitPriceConIGV = Number((finalUnitPrice + Number((finalUnitPrice * 0.18).toFixed(2))).toFixed(2));
            } else {
              finalUnitPrice = Number((price * (1 - totalDisc / 100)).toFixed(2));
              unitPriceConIGV = Number((finalUnitPrice + Number((finalUnitPrice * 0.18).toFixed(2))).toFixed(2));
            }
            const lineTotal = Number((qty * finalUnitPrice).toFixed(2));
            const lineTax = Number((lineTotal * 0.18).toFixed(2));
            const lineTotalConIGV = Number((lineTotal + lineTax).toFixed(2));
            const lineSavings = isOutOfStock ? 0 : Math.max(0, (qty * price) - lineTotal);
            const hasAnyDiscount = !isOutOfStock && totalDisc > 0;
            const itemName = item.name || item.productName || item.description || item.ItemName || item.ItemDescription || "Artículo General";
            const isVolume = !isOutOfStock && qty > 100 && totalDisc > 55;

            return (
              <Box key={item.id || index} p={3.5} bg="white" borderRadius="xl" border="1px solid" borderColor={isOutOfStock ? "red.300" : isVolume ? "orange.300" : promoDisc > 0 ? "amber.300" : "gray.200"} boxShadow="xs">
                <Flex align="start" justify="space-between" gap={2} mb={2}>
                  <Box flex="1" minW={0}>
                    <Flex align="center" wrap="wrap" gap={1.5}>
                      <Text fontSize="xs" fontWeight="900" color="gray.900" lineHeight="tight" title={itemName}>
                        {itemName}
                      </Text>
                      {itemCode && (
                        <Badge colorScheme="gray" fontSize="0.6rem" fontWeight="700" px={1.5} py={0.2} borderRadius="sm">
                          {itemCode}
                        </Badge>
                      )}
                      {item.stock !== null && item.stock !== undefined && (
                        <Badge
                          bg={item.stock > 0 ? "#166534" : "#dc2626"}
                          color="white"
                          variant="solid"
                          px={2}
                          py={0.5}
                          fontSize="0.65rem"
                          fontWeight="800"
                          borderRadius="md"
                          flexShrink={0}
                        >
                          {item.stock > 0 ? `Stk: ${item.stock}` : "STK: 0 (Pendiente Importación)"}
                        </Badge>
                      )}
                    </Flex>
                    {!isOutOfStock && promoDisc > 0 && (
                      <Box w="full" bg="#fffbeb" border="1px dashed #f59e0b" p={1.5} borderRadius="md" mt={1.5}>
                        <Flex justify="space-between" align="center" wrap="wrap" gap={1}>
                          <Badge bg="amber.400" color="amber.950" fontSize="10px" px={1.5} py={0.2} borderRadius="md" fontWeight="900">
                            🏷️ {(item.campaignName || promoInfo?.campaignName || "OFERTA DEL MES").toUpperCase()}: -{promoDisc}% EXTRA
                          </Badge>
                          <Text fontSize="10px" color="gray.600">
                            P. Reg: <Text as="s">${formatThousands(sapDisc > 0 ? (price * (1 - sapDisc / 100) * 1.18) : (price * 1.18))}</Text> ➔ Oferta: <strong style={{ color: "#b45309" }}>${formatThousands(promoInfo?.promoPriceConIGV || (unitPriceConIGV))} c/IGV</strong> <Text as="span" fontSize="9px" color="gray.500">(${formatThousands(finalUnitPrice)} neto)</Text>
                          </Text>
                        </Flex>
                      </Box>
                    )}
                    {!isOutOfStock && isVolume && (
                      <Badge bg="#ea580c" color="white" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="900" mt={1}>
                        🔥 MAYOREO ({totalDisc}%)
                      </Badge>
                    )}
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
                <Grid templateColumns="1fr 1.3fr 1fr" gap={2} align="center" mb={2.5}>
                  <Box>
                    <Text fontSize="0.6rem" color="gray.500" fontWeight="800" mb={0.5} textAlign="center">CANT.</Text>
                    {isReadOnly ? (
                      <Flex
                        h="32px"
                        align="center"
                        justify="center"
                        bg="gray.100"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.300"
                        fontWeight="800"
                        fontSize="xs"
                        color="gray.800"
                        userSelect="none"
                        cursor="not-allowed"
                        title="Artículos bloqueados en modo revisión"
                      >
                        {qty}
                      </Flex>
                    ) : (
                      <Input
                        size="xs"
                        h="32px"
                        type="text"
                        maxLength={6}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        textAlign="center"
                        fontWeight="800"
                        fontSize="xs"
                        value={item.quantity ?? ""}
                        bg={isQtyExceedingStock(item, qty) ? "orange.50" : isItemOutOfStock(item) ? "red.50" : "gray.50"}
                        color={isQtyExceedingStock(item, qty) ? "orange.800" : isItemOutOfStock(item) ? "red.600" : "inherit"}
                        borderColor="gray.300"
                        borderRadius="md"
                        px={1}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                          if (val === "") {
                            onUpdateProduct(item.id, { quantity: "" });
                          } else {
                            const parsed = Math.min(999999, parseInt(val, 10));
                            onUpdateProduct(item.id, { quantity: parsed > 0 ? parsed : "" });
                          }
                        }}
                      />
                    )}
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
                    <Text fontSize="0.6rem" color="gray.500" fontWeight="800" mb={0.5} textAlign="right">PRECIO (C/IGV)</Text>
                    {isOutOfStock ? (
                      <Flex justify="flex-end">
                        <Badge colorScheme="red" variant="subtle" fontSize="9px" fontWeight="800" px={1.5} py={0.5}>
                          Sin Stock
                        </Badge>
                      </Flex>
                    ) : hasAnyDiscount ? (
                      <VStack align="flex-end" spacing={0}>
                        <HStack spacing={1}>
                          <Text fontSize="9px" color="gray.400" fontWeight="600">Antes:</Text>
                          <Text as="s" fontSize="10px" color="gray.400" fontWeight="600">
                            {money(price * 1.18, currency)}
                          </Text>
                        </HStack>
                        <Text fontSize={{ base: "11px", sm: "xs" }} fontWeight="950" color="#047857" textAlign="right">
                          {money(unitPriceConIGV, currency)}/u
                        </Text>
                        <Text fontSize="9px" color="gray.400" fontWeight="600">
                          Neto: {money(finalUnitPrice, currency)}
                        </Text>
                      </VStack>
                    ) : (
                      <VStack align="flex-end" spacing={0}>
                        <Text fontSize={{ base: "11px", sm: "xs" }} fontWeight="800" color="gray.900" textAlign="right">
                          {money(unitPriceConIGV, currency)}/u
                        </Text>
                        <Text fontSize="9px" color="gray.400" fontWeight="600">
                          Neto: {money(price, currency)}
                        </Text>
                      </VStack>
                    )}
                  </Box>
                  <Box textAlign="center">
                    <Text fontSize="0.6rem" color="gray.500" fontWeight="800" mb={0.5}>AJUSTE</Text>
                    {isOutOfStock ? (
                      <Text fontSize="xs" color="gray.400" fontWeight="700">—</Text>
                    ) : isReadOnly ? (
                      <Badge
                        fontSize="0.65rem"
                        fontWeight="800"
                        px={1.5}
                        py={0.5}
                        borderRadius="md"
                        colorScheme={isVolume ? "orange" : addDisc > 0 ? "red" : addDisc < 0 ? "green" : "gray"}
                        cursor="not-allowed"
                        title="Descuento bloqueado en modo revisión"
                      >
                        {addDisc > 0 ? `+${addDisc.toFixed(2)}%` : addDisc < 0 ? `${addDisc.toFixed(2)}%` : "0%"}
                      </Badge>
                    ) : (
                      <Button
                        size="xs"
                        h="auto"
                        minW="unset"
                        px={1.5}
                        py={0.5}
                        borderRadius="md"
                        fontWeight="800"
                        fontSize="0.65rem"
                        bg={isVolume ? "orange.100" : addDisc > 0 ? "red.100" : addDisc < 0 ? "green.100" : "gray.100"}
                        color={isVolume ? "orange.800" : addDisc > 0 ? "red.800" : addDisc < 0 ? "green.800" : "gray.600"}
                        _hover={{
                          bg: isVolume ? "orange.200" : addDisc > 0 ? "red.200" : addDisc < 0 ? "green.200" : "gray.200",
                        }}
                        onClick={() => handleOpenDiscountModal(item)}
                        title={addDisc > 0 ? `Se bajó de precio (+${addDisc.toFixed(2)}%).` : addDisc < 0 ? `Mayor margen (${addDisc.toFixed(2)}%).` : "Ajuste de precio"}
                      >
                        {addDisc > 0 ? `+${addDisc.toFixed(2)}%` : addDisc < 0 ? `${addDisc.toFixed(2)}%` : "0%"}
                      </Button>
                    )}
                  </Box>
                </Grid>
                <Flex justify="space-between" align="center" bg={isOutOfStock ? "#fef2f2" : "#f8fafc"} p={2.5} borderRadius="lg" border="1px solid" borderColor={isOutOfStock ? "#fee2e2" : "gray.100"}>
                  <Text fontSize="0.65rem" fontWeight="800" color={isOutOfStock ? "red.700" : "gray.600"}>TOTAL (C/IGV):</Text>
                  {isOutOfStock ? (
                    <Badge colorScheme="red" variant="solid" bg="#dc2626" color="white" fontSize="10px" fontWeight="800" px={2} py={0.5} borderRadius="md">
                      Demanda Back Order
                    </Badge>
                  ) : (
                    <VStack align="flex-end" spacing={0.5}>
                      <HStack spacing={1.5}>
                        <Text fontSize="sm" fontWeight="950" color="#166534">{money(lineTotalConIGV, currency)}</Text>
                        <Text fontSize="10px" color="gray.600" fontWeight="700">
                          ({qty > 1 ? `${qty} uds × ${money(unitPriceConIGV, currency)}` : `1 ud × ${money(unitPriceConIGV, currency)}`})
                        </Text>
                      </HStack>
                      {lineSavings > 0.009 && (
                        <Badge colorScheme="red" bg="#fee2e2" color="#b91c1c" fontSize="9px" px={1.5} py={0.2} borderRadius="full" fontWeight="800">
                          Descuento {money(lineSavings * 1.18, currency)}
                        </Badge>
                      )}
                    </VStack>
                  )}
                </Flex>
              </Box>
            );
          })
        )}
      </VStack>

      <Box display={{ base: "none", md: "block" }}>
        <TableContainer borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
          <Table size="sm" variant="simple">
            <Thead bg="#0f5132">
              <Tr>
                <Th color="white" py={3} fontSize="xs" fontWeight="800" textTransform="none" letterSpacing="normal">
                  Descripción del artículo
                </Th>
                <Th color="white" py={3} textAlign="center" fontSize="xs" fontWeight="800" textTransform="none" letterSpacing="normal">
                  Cantidad
                </Th>
                <Th color="white" py={3} textAlign="right" fontSize="xs" fontWeight="800" textTransform="none" letterSpacing="normal">
                  Precio unitario (c/IGV)
                </Th>
                <Th color="white" py={3} textAlign="center" fontSize="xs" fontWeight="800" textTransform="none" letterSpacing="normal">
                  Ajuste Precio
                </Th>
                <Th color="white" py={3} textAlign="right" fontSize="xs" fontWeight="800" textTransform="none" letterSpacing="normal">
                  Total doc. (c/IGV)
                </Th>
                {!isReadOnly && (
                  <Th color="white" py={3} textAlign="center" fontSize="xs" fontWeight="800" textTransform="none" letterSpacing="normal">
                    Acción
                  </Th>
                )}
              </Tr>
            </Thead>
            <Tbody>
              {inStockProducts.length === 0 ? (
                <Tr>
                  <Td colSpan={isReadOnly ? 5 : 6} textAlign="center" py={8} color="gray.500">
                    <VStack spacing={2}>
                      <Package className="w-8 h-8 opacity-40 text-gray-400" />
                      <Text fontSize="xs" fontWeight="700">No hay artículos con stock disponibles en la grilla principal</Text>
                      <Text fontSize="xs" color="gray.400">
                        {outOfStockProducts.length > 0
                          ? `Los artículos sin stock (${outOfStockProducts.length}) se encuentran en la sección inferior de Demanda Back Order.`
                          : "Busca artículos en la barra superior para agregarlos a la cotización"}
                      </Text>
                    </VStack>
                  </Td>
                </Tr>
              ) : (
                inStockProducts.map((item, index) => {
                  const isOutOfStock = isItemOutOfStock(item);
                  const qty = Number(item.quantity || 1);
                  const price = isOutOfStock ? 0 : Number(item.price ?? item.unitPrice ?? 0);
                  const sapDisc = isOutOfStock ? 0 : Number(item.discount || item.sapDiscount || 0);
                  const itemCode = item.code || item.productCode || item.itemCode || item.id || "";
                  const promoInfo = promotionsMap[itemCode] || null;
                  const promoDisc = isOutOfStock ? 0 : Number(item.promoDiscount || promoInfo?.discountPct || 0);
                  const promoPrice = item.promoPrice || promoInfo?.promoPrice || null;
                  const addDisc = isOutOfStock ? 0 : Number(Number(item.lineDiscount || 0).toFixed(2));
                  const maxAllowedCeiling = qty > 100 ? 65 : 60;
                  const totalDisc = isOutOfStock ? 0 : Math.min(maxAllowedCeiling, Math.max(0, sapDisc + promoDisc + addDisc));

                  // Si el usuario fijó un precio unitario con IGV exacto (ej. $10.00 exactos), respetarlo fielmente
                  const customPrice = !isOutOfStock && item.customPriceConIGV && Number(item.customPriceConIGV) > 0
                    ? Number(item.customPriceConIGV)
                    : null;
                  let finalUnitPrice;
                  let unitPriceConIGV;
                  if (customPrice) {
                    finalUnitPrice = Number((customPrice / 1.18).toFixed(2));
                    unitPriceConIGV = Number((finalUnitPrice + Number((finalUnitPrice * 0.18).toFixed(2))).toFixed(2));
                  } else {
                    finalUnitPrice = Number((price * (1 - totalDisc / 100)).toFixed(2));
                    unitPriceConIGV = Number((finalUnitPrice + Number((finalUnitPrice * 0.18).toFixed(2))).toFixed(2));
                  }
                  const lineTotal = Number((qty * finalUnitPrice).toFixed(2));
                  const lineTax = Number((lineTotal * 0.18).toFixed(2));
                  const lineTotalConIGV = Number((lineTotal + lineTax).toFixed(2));
                  const lineSavings = isOutOfStock ? 0 : Math.max(0, (qty * price) - lineTotal);
                  const hasAnyDiscount = !isOutOfStock && totalDisc > 0;
                  const itemName = item.name || item.productName || item.description || item.ItemName || item.ItemDescription || "Artículo General";
                  const isVolume = !isOutOfStock && qty > 100 && totalDisc > 55;

                  return (
                    <Tr key={item.id || index} bg={isOutOfStock ? "#fff8f8" : "transparent"} _hover={{ bg: isOutOfStock ? "#fee2e2" : "gray.50" }} transition="background 0.2s">
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
                                {item.stock > 0 ? `Stock: ${item.stock}` : "STK: 0 (Pendiente Importación)"}
                              </Badge>
                            )}
                          </HStack>
                          {!isOutOfStock && promoDisc > 0 && (
                            <Box bg="#fffbeb" border="1px dashed #f59e0b" p={1.5} borderRadius="md" mt={1} maxW="420px">
                              <Flex justify="space-between" align="center" gap={1.5}>
                                <Badge bg="amber.400" color="amber.950" fontSize="9px" px={1.5} py={0.2} borderRadius="md" fontWeight="900">
                                  🏷️ {(item.campaignName || promoInfo?.campaignName || "OFERTA DEL MES").toUpperCase()}: -{promoDisc}% EXTRA
                                </Badge>
                                <Text fontSize="10px" color="gray.600">
                                  P. Reg: <Text as="s">${formatThousands(sapDisc > 0 ? (price * (1 - sapDisc / 100) * 1.18) : (price * 1.18))}</Text> ➔ Oferta: <strong style={{ color: "#b45309" }}>${formatThousands(promoInfo?.promoPriceConIGV || (unitPriceConIGV))} c/IGV</strong> <Text as="span" fontSize="9px" color="gray.500">(${formatThousands(finalUnitPrice)} neto)</Text>
                                </Text>
                              </Flex>
                            </Box>
                          )}
                          {!isOutOfStock && isVolume && (
                            <Badge bg="#ea580c" color="white" fontSize="9px" px={1.5} py={0.2} borderRadius="md" fontWeight="900" mt={0.5}>
                              🔥 MAYOREO ({totalDisc}%)
                            </Badge>
                          )}
                        </VStack>
                      </Td>
                      <Td px={2} textAlign="center">
                        <VStack spacing={1} align="center">
                          {isReadOnly ? (
                            <Flex
                              h="26px"
                              minW="45px"
                              px={2}
                              align="center"
                              justify="center"
                              bg="gray.100"
                              borderRadius="md"
                              border="1px solid"
                              borderColor="gray.300"
                              fontWeight="800"
                              fontSize="xs"
                              color="gray.800"
                              userSelect="none"
                              cursor="not-allowed"
                              title="Artículos bloqueados en modo revisión"
                            >
                              {qty}
                            </Flex>
                          ) : (
                            <Input
                              size="xs"
                              maxW="75px"
                              type="text"
                              maxLength={6}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              textAlign="center"
                              fontWeight="700"
                              value={item.quantity ?? ""}
                              bg={isQtyExceedingStock(item, qty) ? "orange.50" : isItemOutOfStock(item) ? "red.50" : "white"}
                              borderColor="gray.300"
                              borderRadius="md"
                              px={1}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                                if (val === "") {
                                  onUpdateProduct(item.id, { quantity: "" });
                                } else {
                                  const parsed = Math.min(999999, parseInt(val, 10));
                                  onUpdateProduct(item.id, { quantity: parsed > 0 ? parsed : "" });
                                }
                              }}
                            />
                          )}
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
                      <Td px={3} textAlign="right" fontSize="xs">
                        {isOutOfStock ? (
                          <Badge colorScheme="red" variant="subtle" fontSize="10px" fontWeight="800" px={1.5} py={0.5}>
                            Sin Stock
                          </Badge>
                        ) : hasAnyDiscount ? (
                          <VStack align="flex-end" spacing={0}>
                            {/* Precio original tachado estilo supermercado con IGV */}
                            <HStack spacing={1}>
                              <Text fontSize="10px" color="gray.400" fontWeight="600">Antes:</Text>
                              <Text as="s" fontSize="11px" color="gray.400" fontWeight="600" title="Precio original de lista con IGV">
                                {money(price * 1.18, currency)}
                              </Text>
                            </HStack>
                            {/* Precio con descuento con IGV en grande */}
                            <HStack spacing={1} align="baseline">
                              <Text fontWeight="950" fontSize="sm" color="#047857" title="Precio con IGV">
                                {money(unitPriceConIGV, currency)}
                              </Text>
                              <Text fontSize="10px" color="gray.500" fontWeight="700">
                                /u
                              </Text>
                            </HStack>
                            <Text fontSize="9px" color="gray.400" fontWeight="600">
                              Neto: {money(finalUnitPrice, currency)}
                            </Text>
                          </VStack>
                        ) : (
                          <VStack align="flex-end" spacing={0}>
                            <HStack spacing={1} justify="flex-end" align="baseline">
                              <Text fontWeight="800" fontSize="xs" color="gray.800">
                                {money(unitPriceConIGV, currency)}
                              </Text>
                              <Text fontSize="10px" color="gray.500" fontWeight="700">
                                /u
                              </Text>
                            </HStack>
                            <Text fontSize="9px" color="gray.400" fontWeight="600">
                              Neto: {money(price, currency)}
                            </Text>
                          </VStack>
                        )}
                      </Td>
                      <Td px={2} textAlign="center">
                        {isOutOfStock ? (
                          <Text color="gray.400" fontSize="xs" fontWeight="700">—</Text>
                        ) : isReadOnly ? (
                          <Badge
                            colorScheme={isVolume ? "orange" : totalDisc > 50.009 ? "red" : addDisc > 0 ? "green" : addDisc < 0 ? "green" : "gray"}
                            fontSize="xs"
                            fontWeight="800"
                            px={2}
                            py={0.5}
                            borderRadius="md"
                            cursor="not-allowed"
                            title="Descuento bloqueado en modo revisión"
                          >
                            {addDisc > 0 ? `+${addDisc.toFixed(2)}%` : addDisc < 0 ? `${addDisc.toFixed(2)}%` : "0%"}
                          </Badge>
                        ) : (
                          <Button
                            size="xs"
                            h="auto"
                            minW="unset"
                            px={2}
                            py={0.5}
                            borderRadius="md"
                            fontWeight="800"
                            fontSize="xs"
                            bg={isVolume ? "orange.100" : totalDisc > 50.009 ? "red.100" : addDisc > 0 ? "emerald.100" : addDisc < 0 ? "green.100" : "gray.100"}
                            color={isVolume ? "orange.800" : totalDisc > 50.009 ? "red.800" : addDisc > 0 ? "emerald.800" : addDisc < 0 ? "green.800" : "gray.600"}
                            _hover={{
                              bg: isVolume ? "orange.200" : totalDisc > 50.009 ? "red.200" : addDisc > 0 ? "emerald.200" : addDisc < 0 ? "green.200" : "gray.200",
                              transform: "scale(1.05)",
                            }}
                            transition="all 0.15s ease"
                            onClick={() => handleOpenDiscountModal(item)}
                            title={isVolume ? `Mayoreo (${totalDisc}%). Requiere aprobación gerencial.` : totalDisc > 50.009 ? `Descuento (${totalDisc}%). Requiere aprobación comercial.` : addDisc > 0 ? `Rebaja dentro del margen (${totalDisc}%). Aprobación inmediata.` : addDisc < 0 ? `Mayor margen (${addDisc.toFixed(2)}%).` : "Toca para ajustar precio o descuento"}
                          >
                            {addDisc > 0 ? `+${addDisc.toFixed(2)}%` : addDisc < 0 ? `${addDisc.toFixed(2)}%` : "0%"}
                          </Button>
                        )}
                      </Td>
                      <Td px={3} textAlign="right" fontSize="xs">
                        {isOutOfStock ? (
                          <Badge colorScheme="red" variant="solid" bg="#dc2626" color="white" fontSize="10px" fontWeight="800" px={2} py={0.5} borderRadius="md">
                            Back Order
                          </Badge>
                        ) : (
                          <VStack align="flex-end" spacing={0.5}>
                            {/* Total final a pagar con IGV */}
                            <Text fontWeight="950" fontSize="sm" color="#166534" lineHeight="1" title="Total de línea con IGV incluido">
                              {money(lineTotalConIGV, currency)}
                            </Text>
                            {/* Multiplicador claro: cantidad x precio unitario con IGV */}
                            <Text fontSize="10px" color="gray.600" fontWeight="700">
                              {qty > 1 ? `${qty} uds × ${money(unitPriceConIGV, currency)}` : `1 ud × ${money(unitPriceConIGV, currency)}`}
                            </Text>
                            {/* Descuento estilo supermercado */}
                            {lineSavings > 0.009 && (
                              <Badge
                                colorScheme="red"
                                bg="#fee2e2"
                                color="#b91c1c"
                                border="1px solid #fca5a5"
                                fontSize="9px"
                                px={1.5}
                                py={0.2}
                                borderRadius="full"
                                fontWeight="800"
                              >
                                Descuento {money(lineSavings * 1.18, currency)}
                              </Badge>
                            )}
                          </VStack>
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

      {/* ── SECCIÓN "CÓDIGOS AGOTADOS / DEMANDA BACK ORDER" (SOLO ARTÍCULOS SIN STOCK) ── */}
      {outOfStockProducts.length > 0 && (
        <Box mt={4} p={4} bg="#fef2f2" borderRadius="xl" border="1.5px solid" borderColor="#fca5a5" boxShadow="xs">
          <Flex align="center" justify="space-between" mb={3} wrap="wrap" gap={2}>
            <HStack spacing={2}>
              <Badge colorScheme="red" variant="solid" px={3} py={1} borderRadius="full" fontSize="11px" fontWeight="900" letterSpacing="wider">
                ⚠️ CÓDIGOS AGOTADOS (DEMANDA BACK ORDER)
              </Badge>
              <Badge colorScheme="red" variant="subtle" fontSize="11px" fontWeight="800" px={2} py={0.5} borderRadius="md">
                {outOfStockProducts.length} {outOfStockProducts.length === 1 ? "artículo" : "artículos"}
              </Badge>
            </HStack>
            <Text fontSize="xs" fontWeight="700" color="#991b1b">
              Almacén 014 (Sin Stock Físico) • Pendiente a Importación
            </Text>
          </Flex>

          <Text fontSize="xs" color="gray.700" mb={3} fontWeight="500">
            Los siguientes artículos <strong>no tienen stock disponible en Almacén 014</strong>. Quedan registrados para la <strong>Demanda Back Order de Importaciones</strong> (no se enviarán a SAP ni se facturarán en este pedido):
          </Text>

          <VStack align="stretch" spacing={2.5}>
            {outOfStockProducts.map((p, i) => {
              const qty = Number(p.quantity || 1);
              const pCode = p.code || p.id || p.productCode || "";
              const pName = p.name || p.productName || p.description || "Artículo Sin Stock";
              const pSigla = p.sigla || p.Sigla || p.marca || "";

              return (
                <Box
                  key={p.id || i}
                  bg="white"
                  p={3}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="#fecaca"
                  boxShadow="xs"
                >
                  <Flex
                    direction={{ base: "column", md: "row" }}
                    align={{ base: "stretch", md: "center" }}
                    justify="space-between"
                    gap={3}
                  >
                    {/* Info del Producto */}
                    <Box flex="1" minW={0}>
                      <Flex align="center" wrap="wrap" gap={2} mb={1}>
                        <Badge
                          fontFamily="mono"
                          fontSize="xs"
                          fontWeight="900"
                          bg="#fee2e2"
                          color="#991b1b"
                          border="1px solid"
                          borderColor="#fca5a5"
                          px={2}
                          py={0.5}
                          borderRadius="md"
                        >
                          {pCode}
                        </Badge>
                        {pSigla && (
                          <Badge colorScheme="blue" variant="subtle" fontSize="10px" fontWeight="800" px={1.5} py={0.5} borderRadius="md">
                            {pSigla}
                          </Badge>
                        )}
                        <Badge colorScheme="red" variant="solid" bg="#dc2626" color="white" fontSize="10px" fontWeight="800" px={2} py={0.5} borderRadius="md">
                          STK: 0 (PENDIENTE IMPORTACIÓN)
                        </Badge>
                      </Flex>
                      <Text fontSize="xs" fontWeight="800" color="gray.900" lineHeight="short">
                        {pName}
                      </Text>
                    </Box>

                    {/* Controles de Cantidad y Acción */}
                    <HStack spacing={3} justify={{ base: "space-between", md: "flex-end" }} align="center">
                      <HStack spacing={2} align="center">
                        <Text fontSize="xs" fontWeight="800" color="gray.600">Cant. Solicitada:</Text>
                        {isReadOnly ? (
                          <Flex
                            h="30px"
                            px={3}
                            align="center"
                            justify="center"
                            bg="gray.100"
                            borderRadius="md"
                            border="1px solid"
                            borderColor="gray.300"
                            fontWeight="800"
                            fontSize="xs"
                            color="gray.800"
                          >
                            {qty}
                          </Flex>
                        ) : (
                          <Input
                            size="xs"
                            h="30px"
                            w="65px"
                            type="text"
                            maxLength={6}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            textAlign="center"
                            fontWeight="800"
                            fontSize="xs"
                            value={p.quantity ?? ""}
                            bg="white"
                            borderColor="#fca5a5"
                            _focus={{ borderColor: "red.500", boxShadow: "0 0 0 1px #ef4444" }}
                            borderRadius="md"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                              if (val === "") {
                                onUpdateProduct(p.id, { quantity: "" });
                              } else {
                                const parsed = Math.min(999999, parseInt(val, 10));
                                onUpdateProduct(p.id, { quantity: parsed > 0 ? parsed : "" });
                              }
                            }}
                          />
                        )}
                        <PackagingHelper
                          itemName={pName}
                          sigla={pSigla}
                          raw={p.raw || p}
                          currentQuantity={qty}
                          onQuantityChange={(units) => onUpdateProduct(p.id, { quantity: units })}
                          isReadOnly={isReadOnly}
                        />
                      </HStack>

                      <Badge
                        colorScheme="red"
                        variant="solid"
                        bg="#b91c1c"
                        color="white"
                        fontSize="10px"
                        fontWeight="800"
                        px={2.5}
                        py={1}
                        borderRadius="md"
                      >
                        BACK ORDER
                      </Badge>

                      {!isReadOnly && (
                        <IconButton
                          aria-label="Quitar de Back Order"
                          icon={<Trash2 className="w-4 h-4 text-red-600" />}
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          title="Eliminar artículo de Back Order"
                          onClick={() => onRemoveProduct(p.id)}
                        />
                      )}
                    </HStack>
                  </Flex>

                  {/* ── APARTADO DE PRIORIZACIÓN DE IMPORTACIÓN (ADMINISTRADOR / COTIZADOR) ── */}
                  <Box mt={2.5} pt={2} borderTop="1px dashed" borderColor="#fecaca">
                    <Flex align="center" justify="space-between" wrap="wrap" gap={2}>
                      <HStack spacing={2}>
                        <Text fontSize="10px" fontWeight="800" color="gray.600" textTransform="uppercase">
                          Priorización Importación:
                        </Text>
                        {p.importPriority === "ALTA" ? (
                          <Badge colorScheme="red" variant="solid" bg="#dc2626" fontSize="10px" fontWeight="900" px={2} py={0.5} borderRadius="md">
                            🔴 CON PRIORIZACIÓN (PEDIR SÍ O SÍ)
                          </Badge>
                        ) : p.importPriority === "PROXIMO" ? (
                          <Badge colorScheme="orange" variant="solid" bg="#ea580c" fontSize="10px" fontWeight="900" px={2} py={0.5} borderRadius="md">
                            🟡 PRÓXIMO EN EMBARQUE
                          </Badge>
                        ) : p.importPriority === "NO_PRIORITARIO" ? (
                          <Badge colorScheme="gray" variant="subtle" fontSize="10px" fontWeight="800" px={2} py={0.5} borderRadius="md">
                            ⚪ NO PRIORITARIO
                          </Badge>
                        ) : (
                          <Badge colorScheme="blue" variant="subtle" fontSize="10px" fontWeight="800" px={2} py={0.5} borderRadius="md">
                            🔵 EN EVALUACIÓN
                          </Badge>
                        )}
                      </HStack>

                      {isAdmin && (
                        <HStack spacing={1.5}>
                          <Text fontSize="10px" fontWeight="800" color="#991b1b">
                            Asignar Prioridad (Admin):
                          </Text>
                          <Select
                            size="xs"
                            h="26px"
                            w="210px"
                            borderRadius="md"
                            fontWeight="800"
                            fontSize="10px"
                            bg="white"
                            borderColor="#fca5a5"
                            value={p.importPriority || "EVALUACION"}
                            onChange={(e) => onUpdateProduct(p.id, { importPriority: e.target.value })}
                          >
                            <option value="ALTA">🔴 CON PRIORIZACIÓN (Pedir Sí o Sí)</option>
                            <option value="PROXIMO">🟡 Próximo en Embarque</option>
                            <option value="EVALUACION">🔵 En Evaluación</option>
                            <option value="NO_PRIORITARIO">⚪ No Prioritario</option>
                          </Select>
                        </HStack>
                      )}
                    </Flex>
                  </Box>
                </Box>
              );
            })}
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
