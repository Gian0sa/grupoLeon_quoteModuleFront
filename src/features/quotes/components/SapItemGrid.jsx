import React, { useState } from "react";
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  IconButton, Input, Text, Button, Select,
  HStack, Badge, Flex, VStack, Divider, Grid
} from "@chakra-ui/react";
import { Trash2, Package, Sparkles, Flame, Building2, Star } from "lucide-react";
import ItemAutocomplete from "./ItemAutocomplete";
import { DiscountPopoverModal } from "./DiscountPopoverModal";
import { ClientSpecialPricesModal } from "./ClientSpecialPricesModal";
import PackagingHelper from "./PackagingHelper";
import { useIsAdmin } from "../../../shared/utils/permissions";
import { formatThousands } from "../../../shared/utils/quoteCalculator";
import { useGetPromotions, useClientSpecialPrices } from "../hooks/queries/quotesQueries";

const money = (val, currency = "USD") => {
  const num = Number(val || 0);
  const isSol = currency === "PEN" || currency === "SOL";
  return num.toLocaleString(isSol ? "es-PE" : "en-US", {
    style: "currency",
    currency: isSol ? "PEN" : "USD",
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
  exchangeRate = 3.43,
  whsCode = "014",
  isReadOnly = false
}) {
  const [selectedDiscountItem, setSelectedDiscountItem] = useState(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isSpecialPricesModalOpen, setIsSpecialPricesModalOpen] = useState(false);

  const isAdmin = useIsAdmin();
  const { promotionsMap = {} } = useGetPromotions();

  const clientCardCode = client?.CardCode || client?.cardCode || client?.sapCode || "";
  const {
    specialPricesList = [],
    specialPricesMap = {},
    specialPricesCount = 0,
  } = useClientSpecialPrices(clientCardCode);

  const inStockProducts = products.filter((p) => !isItemOutOfStock(p));
  const outOfStockProducts = products.filter(isItemOutOfStock);

  const isSol = currency === "SOL" || currency === "PEN";
  const rateMultiplier = isSol ? Number(exchangeRate || 3.43) : 1;

  const handleOpenDiscountModal = (item) => {
    if (!item) return;
    const itemCode = item.code || item.productCode || item.itemCode || item.id;
    const sp = specialPricesMap[itemCode] || null;
    const enriched = sp ? {
      ...item,
      isSpecialPrice: true,
      specialDiscount: Number(sp.discountPercent ?? item.specialDiscount ?? 0),
      specialPrice: Number(sp.specialPrice ?? item.specialPrice ?? 0),
      specialPriceConIGV: Number(sp.specialPriceConIGV ?? item.specialPriceConIGV ?? 0),
      specialPriceNeto: Number(sp.specialPrice ?? item.specialPrice ?? 0),
      campaignName: "Convenio Cliente",
    } : item;
    setSelectedDiscountItem(enriched);
    setIsDiscountModalOpen(true);
  };

  const handleApplyDiscountFromModal = (itemId, newLineDiscount, customPriceConIGV) => {
    onUpdateProduct(itemId, { 
      lineDiscount: Number(Number(newLineDiscount || 0).toFixed(4)),
      customPriceConIGV: customPriceConIGV !== undefined ? customPriceConIGV : null,
    });
  };

  const handleItemSelect = (selectedItem) => {
    if (isReadOnly || !selectedItem) return;
    const itemId = selectedItem.id || selectedItem.code;
    const sp = specialPricesMap[itemId] || specialPricesMap[selectedItem.code] || null;
    const isSpecial = Boolean(selectedItem.isSpecialPrice || sp);

    const rawPrice = isSpecial && sp?.listPrice
      ? Number(sp.listPrice)
      : Number(selectedItem.price || selectedItem.importe || selectedItem.Price || 0);
    const hasSapPrice = rawPrice > 0;
    const effectivePrice = rawPrice;

    const promoInfo = promotionsMap[itemId] || promotionsMap[selectedItem.code] || null;
    const promoDiscount = selectedItem.promoDiscount || promoInfo?.discountPct || 0;
    const promoPrice = selectedItem.promoPrice || promoInfo?.promoPrice || promoInfo?.promoPriceNeto || null;
    const promoPriceConIGV = selectedItem.promoPriceConIGV || promoInfo?.promoPriceConIGV || promoInfo?.U_US_PROMO || (promoPrice ? Number((promoPrice * 1.18).toFixed(2)) : null);
    const campaignName = isSpecial
      ? "Convenio Cliente"
      : (selectedItem.campaignName || promoInfo?.campaignName || (promoDiscount > 0 || promoPriceConIGV > 0 ? "Oferta del Mes" : undefined));

    const specialDiscount = isSpecial ? Number(sp?.discountPercent ?? selectedItem.specialDiscount ?? selectedItem.discount ?? 0) : 0;
    const specialPrice = isSpecial ? Number(sp?.specialPrice ?? selectedItem.specialPrice ?? 0) : null;
    const specialPriceConIGV = isSpecial ? Number(sp?.specialPriceConIGV ?? selectedItem.specialPriceConIGV ?? 0) : null;
    const rawBaseListDiscount = isSpecial
      ? (sp?.baseListDiscount ?? selectedItem.baseListDiscount ?? null)
      : Number(selectedItem.discount || 0);
    const baseListDiscount =
      rawBaseListDiscount !== undefined &&
      rawBaseListDiscount !== null &&
      rawBaseListDiscount !== "" &&
      !isNaN(Number(rawBaseListDiscount))
        ? Number(rawBaseListDiscount)
        : null;

    onAddProduct({
      id: itemId,
      code: itemId,
      name: isSpecial && sp?.itemName ? sp.itemName : selectedItem.name,
      quantity: 1,
      price: effectivePrice,
      unitPrice: effectivePrice,
      isTestFallback: !hasSapPrice,
      isPriceFromSap: hasSapPrice,
      discount: isSpecial ? specialDiscount : (selectedItem.discount || 0),
      baseListDiscount,
      promoDiscount: isSpecial ? 0 : promoDiscount,
      promoPrice: isSpecial ? null : promoPrice,
      promoPriceConIGV: isSpecial ? null : promoPriceConIGV,
      promoPriceNeto: isSpecial ? null : promoPrice,
      totalDiscountPct: isSpecial ? specialDiscount : (selectedItem.totalDiscountPct || promoInfo?.totalDiscountPct || 0),
      U_US_PROMO: isSpecial ? null : (promoPriceConIGV || promoPrice),
      campaignName,
      isSpecialPrice: isSpecial,
      specialDiscount,
      specialPrice,
      specialPriceNeto: specialPrice,
      specialPriceConIGV,
      whsCode: whsCode || "014",
      taxCode: "I18",
      stock: selectedItem.stock ?? (isSpecial && sp?.stock !== undefined ? Number(sp.stock) : null),
      stockChecked: selectedItem.stockChecked ?? (selectedItem.stock !== null && selectedItem.stock !== undefined),
      isAgotado: selectedItem.isAgotado || false,
      marca: selectedItem.marca || "",
      sigla: selectedItem.sigla || sp?.sigla || "",
      importe: effectivePrice,
    });
  };

  const handleAddFromSpecialModal = (sp) => {
    const rawBaseList = sp.baseListDiscount;
    const baseListDiscount =
      rawBaseList !== undefined && rawBaseList !== null && rawBaseList !== "" && !isNaN(Number(rawBaseList))
        ? Number(rawBaseList)
        : null;

    handleItemSelect({
      id: sp.itemCode,
      code: sp.itemCode,
      name: sp.itemName,
      sigla: sp.sigla,
      price: Number(sp.listPrice || 0),
      importe: Number(sp.specialPrice || 0),
      discount: Number(sp.discountPercent || 0),
      baseListDiscount,
      isSpecialPrice: true,
      specialDiscount: Number(sp.discountPercent || 0),
      specialPrice: Number(sp.specialPrice || 0),
      specialPriceNeto: Number(sp.specialPrice || 0),
      specialPriceConIGV: Number(sp.specialPriceConIGV || 0),
      stock: sp.stock !== undefined && sp.stock !== null ? Number(sp.stock) : null,
      stockChecked: sp.stock !== undefined && sp.stock !== null,
      isAgotado: sp.stock !== undefined && sp.stock !== null && Number(sp.stock) === 0,
      campaignName: "Convenio Cliente",
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
        <>
          {specialPricesCount > 0 && (
            <Box
              mb={3.5}
              p={3}
              bgGradient="linear(to-r, teal.50, emerald.50)"
              borderRadius="xl"
              border="1.5px solid"
              borderColor="teal.300"
              boxShadow="xs"
            >
              <Flex
                direction={{ base: "column", sm: "row" }}
                align={{ base: "flex-start", sm: "center" }}
                justify="space-between"
                gap={2.5}
              >
                <HStack spacing={2.5}>
                  <Flex
                    w="34px"
                    h="34px"
                    align="center"
                    justify="center"
                    borderRadius="lg"
                    bg="teal.600"
                    color="yellow.300"
                    flexShrink={0}
                    boxShadow="xs"
                  >
                    <Star size={18} fill="currentColor" />
                  </Flex>
                  <Box>
                    <HStack spacing={2} wrap="wrap">
                      <Text fontSize="xs" fontWeight="900" color="teal.950">
                        Precios Especiales de Convenio Disponibles
                      </Text>
                      <Badge
                        bg="teal.700"
                        color="white"
                        fontSize="10px"
                        fontWeight="900"
                        px={2}
                        py={0.2}
                        borderRadius="full"
                      >
                        ⭐ {specialPricesCount} {specialPricesCount === 1 ? "artículo" : "artículos"}
                      </Badge>
                    </HStack>
                    <Text fontSize="11px" color="teal.800" fontWeight="600">
                      Este cliente cuenta con {specialPricesCount} productos con Precios Especiales de Convenio (tabla OSPP SAP).
                    </Text>
                  </Box>
                </HStack>
                <Button
                  size="xs"
                  h="32px"
                  px={3.5}
                  bg="teal.700"
                  _hover={{ bg: "teal.800" }}
                  _active={{ bg: "teal.900" }}
                  color="white"
                  fontWeight="800"
                  fontSize="xs"
                  borderRadius="lg"
                  leftIcon={<Building2 size={14} />}
                  onClick={() => setIsSpecialPricesModalOpen(true)}
                  flexShrink={0}
                >
                  Ver Catálogo de Convenio
                </Button>
              </Flex>
            </Box>
          )}

          <Box mb={4} p={{ base: 2.5, md: 3.5 }} bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
            <Flex align="center" gap={1.5} mb={2}>
              <Package className="w-4 h-4 text-emerald-800" />
              <Text fontSize="xs" fontWeight="800" color="#166534" textTransform="uppercase" letterSpacing="wider">
                Buscar Artículo
              </Text>
            </Flex>
            <ItemAutocomplete 
              onSelect={handleItemSelect} 
              isDisabled={isReadOnly}
              placeholder="Escribe código o nombre del Artículo" 
              specialPricesMap={specialPricesMap}
            />
          </Box>
        </>
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
            const itemCode = item.code || item.productCode || item.itemCode || item.id || "";
            const spItem = specialPricesMap[itemCode] || null;
            const isSpecial = Boolean(!isOutOfStock && (item.isSpecialPrice || spItem || Number(item.discount || item.sapDiscount || 0) > 55.0));
            const specialDisc = isSpecial ? Number(item.specialDiscount ?? spItem?.discountPercent ?? item.discount ?? item.sapDiscount ?? 0) : 0;
            const targetSpecialPrice = isSpecial ? Number(item.specialPrice ?? spItem?.specialPrice ?? 0) : 0;

            const rawPrice = isSpecial && spItem?.listPrice && Number(item.price ?? item.unitPrice ?? 0) === 0
              ? Number(spItem.listPrice)
              : Number(item.price ?? item.unitPrice ?? 0);
            const price = isOutOfStock ? 0 : rawPrice;

            // Respetar precio de lista y lógica inversa del IGV para artículos de convenio
            const calculatedSpecialPriceConIGV = isSpecial && price > 0 && specialDisc > 0
              ? Number((Number((price * 1.18).toFixed(2)) * (1 - specialDisc / 100)).toFixed(2))
              : null;
            const targetSpecialPriceConIGV = isSpecial
              ? (calculatedSpecialPriceConIGV || Number(item.specialPriceConIGV ?? spItem?.specialPriceConIGV ?? 0))
              : 0;
            const sapDisc = isOutOfStock ? 0 : Number(item.discount || item.sapDiscount || 0);

            const promoInfo = promotionsMap[itemCode] || null;
            const promoDisc = (isOutOfStock || isSpecial) ? 0 : Number(item.promoDiscount || promoInfo?.discountPct || 0);
            const targetPromoPriceConIGV = (!isOutOfStock && !isSpecial) && (
              (item.promoPriceConIGV && Number(item.promoPriceConIGV) > 0) ? Number(item.promoPriceConIGV) :
              (promoInfo?.promoPriceConIGV && Number(promoInfo.promoPriceConIGV) > 0) ? Number(promoInfo.promoPriceConIGV) :
              (item.U_US_PROMO && Number(item.U_US_PROMO) > 0) ? Number(item.U_US_PROMO) :
              (promoInfo?.U_US_PROMO && Number(promoInfo.U_US_PROMO) > 0) ? Number(promoInfo.U_US_PROMO) :
              (item.promoPrice && Number(item.promoPrice) > 0 && !item.promoPriceNeto) ? Number((Number(item.promoPrice) * 1.18).toFixed(2)) :
              (promoInfo?.promoPrice && Number(promoInfo.promoPrice) > 0 && !promoInfo?.promoPriceNeto) ? Number((Number(promoInfo.promoPrice) * 1.18).toFixed(2)) :
              null
            );
            const targetPromoNeto = targetPromoPriceConIGV
              ? Number((targetPromoPriceConIGV / 1.18).toFixed(6))
              : ((!isOutOfStock && !isSpecial) ? (item.promoPriceNeto && Number(item.promoPriceNeto) > 0 ? Number(item.promoPriceNeto) : (promoInfo?.promoPriceNeto && Number(promoInfo.promoPriceNeto) > 0 ? Number(promoInfo.promoPriceNeto) : null)) : null);
            const hasPromoPrice = Boolean(!isOutOfStock && !isSpecial && (targetPromoNeto > 0 || targetPromoPriceConIGV > 0));
            let addDisc = isOutOfStock ? 0 : Number(Number(item.lineDiscount || 0).toFixed(2));
            const hasPromo = Boolean(hasPromoPrice || promoDisc > 0);

            const customPrice = !isOutOfStock && item.customPriceConIGV && Number(item.customPriceConIGV) > 0
              ? Number(item.customPriceConIGV)
              : null;
            let netUnitPrice;
            let unitPriceConIGV;
            let totalDisc;

            if (isSpecial && (targetSpecialPrice > 0 || targetSpecialPriceConIGV > 0 || specialDisc > 0)) {
              const baseSpecialNeto = targetSpecialPrice > 0 
                ? targetSpecialPrice 
                : (price > 0 && specialDisc > 0 ? Number((price * (1 - specialDisc / 100)).toFixed(6)) : Number((targetSpecialPriceConIGV / 1.18).toFixed(6)));
              const baseSpecialConIGV = targetSpecialPriceConIGV > 0
                ? targetSpecialPriceConIGV
                : (price > 0 && specialDisc > 0 ? Number((Number((price * 1.18).toFixed(2)) * (1 - specialDisc / 100)).toFixed(2)) : Number((baseSpecialNeto * 1.18).toFixed(2)));
              const clampedAddDisc = Math.min(0, addDisc);
              if (customPrice && customPrice >= baseSpecialConIGV - 0.02) {
                unitPriceConIGV = Number(customPrice.toFixed(2));
                netUnitPrice = Number((unitPriceConIGV / 1.18).toFixed(6));
                totalDisc = price > 0
                  ? Math.min(specialDisc, Math.max(0, Number((((price - netUnitPrice) / price) * 100).toFixed(2))))
                  : specialDisc;
                addDisc = Number((totalDisc - specialDisc).toFixed(2));
              } else if (clampedAddDisc === 0) {
                unitPriceConIGV = Number(baseSpecialConIGV.toFixed(2));
                netUnitPrice = Number((unitPriceConIGV / 1.18).toFixed(6));
                totalDisc = price > 0
                  ? Math.min(specialDisc, Math.max(0, Number((((price - netUnitPrice) / price) * 100).toFixed(2))))
                  : specialDisc;
              } else {
                netUnitPrice = Number((baseSpecialNeto * (1 - clampedAddDisc / 100)).toFixed(6));
                const finalNet2 = Number(netUnitPrice.toFixed(2));
                unitPriceConIGV = Number((finalNet2 + Number((finalNet2 * 0.18).toFixed(2))).toFixed(2));
                totalDisc = price > 0
                  ? Math.min(specialDisc, Math.max(0, Number((((price - netUnitPrice) / price) * 100).toFixed(2))))
                  : specialDisc;
              }
            } else if (customPrice) {
              unitPriceConIGV = Number(customPrice.toFixed(2));
              netUnitPrice = Number((unitPriceConIGV / 1.18).toFixed(6));
              totalDisc = price > 0 ? Math.min(100, Math.max(0, Number((((price - netUnitPrice) / price) * 100).toFixed(2)))) : 0;
            } else if (hasPromoPrice && targetPromoNeto > 0) {
              netUnitPrice = Number((targetPromoNeto * (1 - addDisc / 100)).toFixed(6));
              const finalNet2 = Number(netUnitPrice.toFixed(2));
              unitPriceConIGV = Number((finalNet2 + Number((finalNet2 * 0.18).toFixed(2))).toFixed(2));
              totalDisc = price > 0
                ? Math.min(100, Math.max(0, Number((((price - netUnitPrice) / price) * 100).toFixed(2))))
                : Number(item.totalDiscountPct || promoInfo?.totalDiscountPct || (sapDisc + promoDisc));
            } else {
              const maxAllowedCeiling = isSpecial
                ? Math.max(specialDisc, 55.0)
                : (hasPromo 
                    ? Math.max(80.0, Number((sapDisc + promoDisc).toFixed(2))) 
                    : Math.max(55.0, sapDisc));
              const effectiveBaseDisc = isSpecial ? specialDisc : (sapDisc + promoDisc);
              const effectiveAddDisc = isSpecial ? Math.min(0, addDisc) : addDisc;
              totalDisc = isOutOfStock ? 0 : Math.min(maxAllowedCeiling, Math.max(0, effectiveBaseDisc + effectiveAddDisc));
              netUnitPrice = Number((price * (1 - totalDisc / 100)).toFixed(6));
              const finalNet2 = Number(netUnitPrice.toFixed(2));
              unitPriceConIGV = Number((finalNet2 + Number((finalNet2 * 0.18).toFixed(2))).toFixed(2));
            }
            const finalUnitPrice = Number(netUnitPrice.toFixed(2));
            const isDirectConIGV = Boolean(customPrice || (isSpecial && targetSpecialPriceConIGV > 0 && addDisc <= 0));
            const lineTotal = Number((qty * finalUnitPrice).toFixed(2));
            const lineTax = isDirectConIGV
              ? Number((unitPriceConIGV * qty - lineTotal).toFixed(2))
              : Number((lineTotal * 0.18).toFixed(2));
            const lineTotalConIGV = isDirectConIGV
              ? Number((unitPriceConIGV * qty).toFixed(2))
              : Number((lineTotal + lineTax).toFixed(2));
            const lineSavings = isOutOfStock ? 0 : Math.max(0, (qty * price) - lineTotal);
            const hasAnyDiscount = !isOutOfStock && totalDisc > 0;
            const itemName = item.name || item.productName || item.description || item.ItemName || item.ItemDescription || "Artículo General";
            const isVolume = !isOutOfStock && qty > 100 && totalDisc > 55;

            const displayPrice = Number((price * rateMultiplier).toFixed(2));
            const displayUnitPriceConIGV = Number((unitPriceConIGV * rateMultiplier).toFixed(2));
            const displayFinalUnitPrice = Number((finalUnitPrice * rateMultiplier).toFixed(2));
            const displayLineTotalConIGV = Number((lineTotalConIGV * rateMultiplier).toFixed(2));
            const displayLineSavings = Number((lineSavings * rateMultiplier).toFixed(2));

            return (
              <Box key={item.id || index} p={3.5} bg="white" borderRadius="xl" border="1px solid" borderColor={isOutOfStock ? "red.300" : isSpecial ? "teal.400" : isVolume ? "orange.300" : promoDisc > 0 ? "amber.300" : "gray.200"} boxShadow="xs">
                <Flex align="start" justify="space-between" gap={2} mb={2}>
                  <Box flex="1" minW={0}>
                    <Flex align="center" wrap="wrap" gap={1.5}>
                      <Text fontSize="xs" fontWeight="900" color="gray.900" lineHeight="tight" title={itemName}>
                        {itemName}
                      </Text>
                      {itemCode && (
                        <Badge colorScheme={isSpecial ? "teal" : "gray"} fontSize="0.6rem" fontWeight="700" px={1.5} py={0.2} borderRadius="sm">
                          {itemCode}
                        </Badge>
                      )}
                      {spItem?.sigla && (
                        <Badge bg="teal.50" color="teal.800" border="1px solid" borderColor="teal.200" fontSize="0.6rem" fontWeight="700" px={1.5} py={0.2} borderRadius="sm">
                          {spItem.sigla}
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
                    {!isOutOfStock && isSpecial && (
                      <Box w="full" bg="#f0fdf4" border="1px dashed #16a34a" p={1.5} borderRadius="md" mt={1.5}>
                        <Flex justify="space-between" align="center" wrap="wrap" gap={1}>
                          <Badge bg="emerald.600" color="white" fontSize="10px" px={1.5} py={0.2} borderRadius="md" fontWeight="900">
                            🏢 CONVENIO CLIENTE (-{totalDisc}%)
                          </Badge>
                          <Text fontSize="10px" color="gray.600">
                            P. Lista: <Text as="s">${formatThousands(price * rateMultiplier)}</Text> ➔ Convenio: <strong style={{ color: "#166534" }}>${formatThousands(displayFinalUnitPrice)} neto</strong> <Text as="span" fontSize="9px" color="gray.500">(${formatThousands(displayUnitPriceConIGV)} c/IGV)</Text>
                          </Text>
                        </Flex>
                      </Box>
                    )}
                    {!isOutOfStock && !isSpecial && hasPromo && (
                      <Box w="full" bg="#fffbeb" border="1px dashed #f59e0b" p={1.5} borderRadius="md" mt={1.5}>
                        <Flex justify="space-between" align="center" wrap="wrap" gap={1}>
                          <Badge bg="amber.400" color="amber.950" fontSize="10px" px={1.5} py={0.2} borderRadius="md" fontWeight="900">
                            🏷️ {(item.campaignName || promoInfo?.campaignName || "OFERTA DEL MES").toUpperCase()}: -{totalDisc}% DTO
                          </Badge>
                          <Text fontSize="10px" color="gray.600">
                            P. Reg: <Text as="s">${formatThousands((sapDisc > 0 ? (price * (1 - sapDisc / 100) * 1.18) : (price * 1.18)) * rateMultiplier)}</Text> ➔ Oferta: <strong style={{ color: "#b45309" }}>${formatThousands(displayUnitPriceConIGV)} c/IGV</strong> <Text as="span" fontSize="9px" color="gray.500">(${formatThousands(displayFinalUnitPrice)} neto)</Text>
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
                        onBlur={() => {
                          if (!item.quantity || Number(item.quantity) < 1) {
                            onUpdateProduct(item.id, { quantity: 1 });
                          }
                        }}
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
                            {money(displayPrice * 1.18, currency)}
                          </Text>
                        </HStack>
                        <Text fontSize={{ base: "11px", sm: "xs" }} fontWeight="950" color="#047857" textAlign="right">
                          {money(displayUnitPriceConIGV, currency)}/u
                        </Text>
                        <Text fontSize="9px" color="gray.400" fontWeight="600">
                          Neto: {money(displayFinalUnitPrice, currency)}
                        </Text>
                      </VStack>
                    ) : (
                      <VStack align="flex-end" spacing={0}>
                        <Text fontSize={{ base: "11px", sm: "xs" }} fontWeight="800" color="gray.900" textAlign="right">
                          {money(displayUnitPriceConIGV, currency)}/u
                        </Text>
                        <Text fontSize="9px" color="gray.400" fontWeight="600">
                          Neto: {money(displayPrice, currency)}
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
                        bg={isSpecial ? "teal.100" : isVolume ? "orange.100" : addDisc > 0 ? "red.100" : addDisc < 0 ? "green.100" : "gray.100"}
                        color={isSpecial ? "teal.900" : isVolume ? "orange.800" : addDisc > 0 ? "red.800" : addDisc < 0 ? "green.800" : "gray.600"}
                        _hover={{
                          bg: isSpecial ? "teal.200" : isVolume ? "orange.200" : addDisc > 0 ? "red.200" : addDisc < 0 ? "green.200" : "gray.200",
                        }}
                        onClick={() => handleOpenDiscountModal(item)}
                        title={isSpecial ? `Convenio Cliente (-${totalDisc}% pactado). Toca para ajustar.` : addDisc > 0 ? `Se bajó de precio (+${addDisc.toFixed(2)}%).` : addDisc < 0 ? `Mayor margen (${addDisc.toFixed(2)}%).` : "Ajuste de precio"}
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
                        <Text fontSize="sm" fontWeight="950" color="#166534">{money(displayLineTotalConIGV, currency)}</Text>
                        <Text fontSize="10px" color="gray.600" fontWeight="700">
                          ({qty > 1 ? `${qty} uds × ${money(displayUnitPriceConIGV, currency)}` : `1 ud × ${money(displayUnitPriceConIGV, currency)}`})
                        </Text>
                      </HStack>
                      {lineSavings > 0.009 && (
                        <Badge colorScheme="red" bg="#fee2e2" color="#b91c1c" fontSize="9px" px={1.5} py={0.2} borderRadius="full" fontWeight="800">
                          Descuento {money(displayLineSavings * 1.18, currency)}
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
                  const itemCode = item.code || item.productCode || item.itemCode || item.id || "";
                  const spItem = specialPricesMap[itemCode] || null;
                  const isSpecial = Boolean(!isOutOfStock && (item.isSpecialPrice || spItem || Number(item.discount || item.sapDiscount || 0) > 55.0));
                  const specialDisc = isSpecial ? Number(item.specialDiscount ?? spItem?.discountPercent ?? item.discount ?? item.sapDiscount ?? 0) : 0;
                  const targetSpecialPrice = isSpecial ? Number(item.specialPrice ?? spItem?.specialPrice ?? 0) : 0;

                  const rawPrice = isSpecial && spItem?.listPrice && Number(item.price ?? item.unitPrice ?? 0) === 0
                    ? Number(spItem.listPrice)
                    : Number(item.price ?? item.unitPrice ?? 0);
                  const price = isOutOfStock ? 0 : rawPrice;

                  // Respetar precio de lista y lógica inversa del IGV para artículos de convenio
                  const calculatedSpecialPriceConIGV = isSpecial && price > 0 && specialDisc > 0
                    ? Number((Number((price * 1.18).toFixed(2)) * (1 - specialDisc / 100)).toFixed(2))
                    : null;
                  const targetSpecialPriceConIGV = isSpecial 
                    ? (calculatedSpecialPriceConIGV || Number(item.specialPriceConIGV ?? spItem?.specialPriceConIGV ?? 0))
                    : 0;
                  const sapDisc = isOutOfStock ? 0 : Number(item.discount || item.sapDiscount || 0);

                  const promoInfo = promotionsMap[itemCode] || null;
                  const promoDisc = (isOutOfStock || isSpecial) ? 0 : Number(item.promoDiscount || promoInfo?.discountPct || 0);
                  const targetPromoPriceConIGV = (!isOutOfStock && !isSpecial) && (
                    (item.promoPriceConIGV && Number(item.promoPriceConIGV) > 0) ? Number(item.promoPriceConIGV) :
                    (promoInfo?.promoPriceConIGV && Number(promoInfo.promoPriceConIGV) > 0) ? Number(promoInfo.promoPriceConIGV) :
                    (item.U_US_PROMO && Number(item.U_US_PROMO) > 0) ? Number(item.U_US_PROMO) :
                    (promoInfo?.U_US_PROMO && Number(promoInfo.U_US_PROMO) > 0) ? Number(promoInfo.U_US_PROMO) :
                    (item.promoPrice && Number(item.promoPrice) > 0 && !item.promoPriceNeto) ? Number((Number(item.promoPrice) * 1.18).toFixed(2)) :
                    (promoInfo?.promoPrice && Number(promoInfo.promoPrice) > 0 && !promoInfo?.promoPriceNeto) ? Number((Number(promoInfo.promoPrice) * 1.18).toFixed(2)) :
                    null
                  );
                  const targetPromoNeto = targetPromoPriceConIGV
                    ? Number((targetPromoPriceConIGV / 1.18).toFixed(6))
                    : ((!isOutOfStock && !isSpecial) ? (item.promoPriceNeto && Number(item.promoPriceNeto) > 0 ? Number(item.promoPriceNeto) : (promoInfo?.promoPriceNeto && Number(promoInfo.promoPriceNeto) > 0 ? Number(promoInfo.promoPriceNeto) : null)) : null);
                  const hasPromoPrice = Boolean(!isOutOfStock && !isSpecial && (targetPromoNeto > 0 || targetPromoPriceConIGV > 0));
                  let addDisc = isOutOfStock ? 0 : Number(Number(item.lineDiscount || 0).toFixed(2));
                  const hasPromo = Boolean(hasPromoPrice || promoDisc > 0);

                  // Si el usuario fijó un precio unitario con IGV exacto (ej. $10.00 exactos), respetarlo fielmente
                  const customPrice = !isOutOfStock && item.customPriceConIGV && Number(item.customPriceConIGV) > 0
                    ? Number(item.customPriceConIGV)
                    : null;
                  let netUnitPrice;
                  let unitPriceConIGV;
                  let totalDisc;

                  if (isSpecial && (targetSpecialPrice > 0 || targetSpecialPriceConIGV > 0 || specialDisc > 0)) {
                    const baseSpecialNeto = targetSpecialPrice > 0 
                      ? targetSpecialPrice 
                      : (price > 0 && specialDisc > 0 ? Number((price * (1 - specialDisc / 100)).toFixed(6)) : Number((targetSpecialPriceConIGV / 1.18).toFixed(6)));
                    const baseSpecialConIGV = targetSpecialPriceConIGV > 0
                      ? targetSpecialPriceConIGV
                      : (price > 0 && specialDisc > 0 ? Number((Number((price * 1.18).toFixed(2)) * (1 - specialDisc / 100)).toFixed(2)) : Number((baseSpecialNeto * 1.18).toFixed(2)));
                    const clampedAddDisc = Math.min(0, addDisc);
                    if (customPrice && customPrice >= baseSpecialConIGV - 0.02) {
                      unitPriceConIGV = Number(customPrice.toFixed(2));
                      netUnitPrice = Number((unitPriceConIGV / 1.18).toFixed(6));
                      totalDisc = price > 0
                        ? Math.min(specialDisc, Math.max(0, Number((((price - netUnitPrice) / price) * 100).toFixed(2))))
                        : specialDisc;
                      addDisc = Number((totalDisc - specialDisc).toFixed(2));
                    } else if (clampedAddDisc === 0) {
                      unitPriceConIGV = Number(baseSpecialConIGV.toFixed(2));
                      netUnitPrice = Number((unitPriceConIGV / 1.18).toFixed(6));
                      totalDisc = price > 0
                        ? Math.min(specialDisc, Math.max(0, Number((((price - netUnitPrice) / price) * 100).toFixed(2))))
                        : specialDisc;
                    } else {
                      netUnitPrice = Number((baseSpecialNeto * (1 - clampedAddDisc / 100)).toFixed(6));
                      const finalNet2 = Number(netUnitPrice.toFixed(2));
                      unitPriceConIGV = Number((finalNet2 + Number((finalNet2 * 0.18).toFixed(2))).toFixed(2));
                      totalDisc = price > 0
                        ? Math.min(specialDisc, Math.max(0, Number((((price - netUnitPrice) / price) * 100).toFixed(2))))
                        : specialDisc;
                    }
                  } else if (customPrice) {
                    unitPriceConIGV = Number(customPrice.toFixed(2));
                    netUnitPrice = Number((unitPriceConIGV / 1.18).toFixed(6));
                    totalDisc = price > 0 ? Math.min(100, Math.max(0, Number((((price - netUnitPrice) / price) * 100).toFixed(2)))) : 0;
                  } else if (hasPromoPrice && targetPromoNeto > 0) {
                    netUnitPrice = Number((targetPromoNeto * (1 - addDisc / 100)).toFixed(6));
                    const finalNet2 = Number(netUnitPrice.toFixed(2));
                    unitPriceConIGV = Number((finalNet2 + Number((finalNet2 * 0.18).toFixed(2))).toFixed(2));
                    totalDisc = price > 0
                      ? Math.min(100, Math.max(0, Number((((price - netUnitPrice) / price) * 100).toFixed(2))))
                      : Number(item.totalDiscountPct || promoInfo?.totalDiscountPct || (sapDisc + promoDisc));
                  } else {
                    const maxAllowedCeiling = isSpecial
                      ? Math.max(specialDisc, 55.0)
                      : (hasPromo 
                          ? Math.max(80.0, Number((sapDisc + promoDisc).toFixed(2))) 
                          : Math.max(55.0, sapDisc));
                    const effectiveBaseDisc = isSpecial ? specialDisc : (sapDisc + promoDisc);
                    const effectiveAddDisc = isSpecial ? Math.min(0, addDisc) : addDisc;
                    totalDisc = isOutOfStock ? 0 : Math.min(maxAllowedCeiling, Math.max(0, effectiveBaseDisc + effectiveAddDisc));
                    netUnitPrice = Number((price * (1 - totalDisc / 100)).toFixed(6));
                    const finalNet2 = Number(netUnitPrice.toFixed(2));
                    unitPriceConIGV = Number((finalNet2 + Number((finalNet2 * 0.18).toFixed(2))).toFixed(2));
                  }
                  const finalUnitPrice = Number(netUnitPrice.toFixed(2));
                  const isDirectConIGV = Boolean(customPrice || (isSpecial && targetSpecialPriceConIGV > 0 && addDisc <= 0));
                  const lineTotal = Number((qty * finalUnitPrice).toFixed(2));
                  const lineTax = isDirectConIGV
                    ? Number((unitPriceConIGV * qty - lineTotal).toFixed(2))
                    : Number((lineTotal * 0.18).toFixed(2));
                  const lineTotalConIGV = isDirectConIGV
                    ? Number((unitPriceConIGV * qty).toFixed(2))
                    : Number((lineTotal + lineTax).toFixed(2));
                  const lineSavings = isOutOfStock ? 0 : Math.max(0, (qty * price) - lineTotal);
                  const hasAnyDiscount = !isOutOfStock && totalDisc > 0;
                  const itemName = item.name || item.productName || item.description || item.ItemName || item.ItemDescription || "Artículo General";
                  const isVolume = !isOutOfStock && qty > 100 && totalDisc > 55;

                  const displayPrice = Number((price * rateMultiplier).toFixed(2));
                  const displayUnitPriceConIGV = Number((unitPriceConIGV * rateMultiplier).toFixed(2));
                  const displayFinalUnitPrice = Number((finalUnitPrice * rateMultiplier).toFixed(2));
                  const displayLineTotalConIGV = Number((lineTotalConIGV * rateMultiplier).toFixed(2));
                  const displayLineSavings = Number((lineSavings * rateMultiplier).toFixed(2));

                  return (
                    <Tr key={item.id || index} bg={isOutOfStock ? "#fff8f8" : isSpecial ? "#f0fdf4" : "transparent"} _hover={{ bg: isOutOfStock ? "#fee2e2" : isSpecial ? "#dcfce7" : "gray.50" }} transition="background 0.2s">
                      <Td px={3} py={2.5}>
                        <VStack align="start" spacing={0.5}>
                          <Text fontWeight="800" fontSize="xs" color="gray.900" lineHeight="short">
                            {itemName}
                          </Text>
                          <HStack spacing={2}>
                            {itemCode && (
                              <Text fontSize="10px" color={isSpecial ? "teal.700" : "gray.500"} fontWeight={isSpecial ? "800" : "600"}>
                                {itemCode}
                              </Text>
                            )}
                            {spItem?.sigla && (
                              <Badge bg="teal.50" color="teal.800" border="1px solid" borderColor="teal.200" fontSize="9px" fontWeight="700" px={1.5} py={0.2} borderRadius="sm">
                                {spItem.sigla}
                              </Badge>
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
                          {!isOutOfStock && isSpecial && (
                            <Box bg="#f0fdf4" border="1.5px solid #16a34a" p={1.5} borderRadius="md" mt={1} maxW="460px" boxShadow="xs">
                              <Flex justify="space-between" align="center" gap={1.5} wrap="wrap">
                                <Badge bg="emerald.600" color="white" fontSize="9px" px={1.5} py={0.2} borderRadius="md" fontWeight="900">
                                  🏢 CONVENIO CLIENTE (-{totalDisc}%)
                                </Badge>
                                <Text fontSize="10px" color="gray.600">
                                  P. Lista: <Text as="s">${formatThousands(price * rateMultiplier)}</Text> ➔ Convenio: <strong style={{ color: "#166534" }}>${formatThousands(displayFinalUnitPrice)} neto</strong> <Text as="span" fontSize="9px" color="gray.500">(${formatThousands(displayUnitPriceConIGV)} c/IGV)</Text>
                                </Text>
                              </Flex>
                            </Box>
                          )}
                          {!isOutOfStock && !isSpecial && hasPromo && (
                            <Box bg="#fffbeb" border="1px dashed #f59e0b" p={1.5} borderRadius="md" mt={1} maxW="440px">
                              <Flex justify="space-between" align="center" gap={1.5}>
                                <Badge bg="amber.400" color="amber.950" fontSize="9px" px={1.5} py={0.2} borderRadius="md" fontWeight="900">
                                  🏷️ {(item.campaignName || promoInfo?.campaignName || "OFERTA DEL MES").toUpperCase()}: -{totalDisc}% DTO
                                </Badge>
                                <Text fontSize="10px" color="gray.600">
                                  P. Reg: <Text as="s">${formatThousands((sapDisc > 0 ? (price * (1 - sapDisc / 100) * 1.18) : (price * 1.18)) * rateMultiplier)}</Text> ➔ Oferta: <strong style={{ color: "#b45309" }}>${formatThousands(displayUnitPriceConIGV)} c/IGV</strong> <Text as="span" fontSize="9px" color="gray.500">(${formatThousands(displayFinalUnitPrice)} neto)</Text>
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
                              onBlur={() => {
                                if (!item.quantity || Number(item.quantity) < 1) {
                                  onUpdateProduct(item.id, { quantity: 1 });
                                }
                              }}
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
                                {money(displayPrice * 1.18, currency)}
                              </Text>
                            </HStack>
                            {/* Precio con descuento con IGV en grande */}
                            <HStack spacing={1} align="baseline">
                              <Text fontWeight="950" fontSize="sm" color="#047857" title="Precio con IGV">
                                {money(displayUnitPriceConIGV, currency)}
                              </Text>
                              <Text fontSize="10px" color="gray.500" fontWeight="700">
                                /u
                              </Text>
                            </HStack>
                            <Text fontSize="9px" color="gray.400" fontWeight="600">
                              Neto: {money(displayFinalUnitPrice, currency)}
                            </Text>
                          </VStack>
                        ) : (
                          <VStack align="flex-end" spacing={0}>
                            <HStack spacing={1} justify="flex-end" align="baseline">
                              <Text fontWeight="800" fontSize="xs" color="gray.800">
                                {money(displayUnitPriceConIGV, currency)}
                              </Text>
                              <Text fontSize="10px" color="gray.500" fontWeight="700">
                                /u
                              </Text>
                            </HStack>
                            <Text fontSize="9px" color="gray.400" fontWeight="600">
                              Neto: {money(displayPrice, currency)}
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
                            bg={isSpecial ? "teal.100" : isVolume ? "orange.100" : totalDisc > 50.009 ? "red.100" : addDisc > 0 ? "emerald.100" : addDisc < 0 ? "green.100" : "gray.100"}
                            color={isSpecial ? "teal.900" : isVolume ? "orange.800" : totalDisc > 50.009 ? "red.800" : addDisc > 0 ? "emerald.800" : addDisc < 0 ? "green.800" : "gray.600"}
                            _hover={{
                              bg: isSpecial ? "teal.200" : isVolume ? "orange.200" : totalDisc > 50.009 ? "red.200" : addDisc > 0 ? "emerald.200" : addDisc < 0 ? "green.200" : "gray.200",
                              transform: "scale(1.05)",
                            }}
                            transition="all 0.15s ease"
                            onClick={() => handleOpenDiscountModal(item)}
                            title={isSpecial ? `Convenio Cliente (${totalDisc}% pactado). Toca para ajustar descuento adicional o precio.` : isVolume ? `Mayoreo (${totalDisc}%). Requiere aprobación gerencial.` : totalDisc > 50.009 ? `Descuento (${totalDisc}%). Requiere aprobación comercial.` : addDisc > 0 ? `Rebaja dentro del margen (${totalDisc}%). Aprobación inmediata.` : addDisc < 0 ? `Mayor margen (${addDisc.toFixed(2)}%).` : "Toca para ajustar precio o descuento"}
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
                              {money(displayLineTotalConIGV, currency)}
                            </Text>
                            {/* Multiplicador claro: cantidad x precio unitario con IGV */}
                            <Text fontSize="10px" color="gray.600" fontWeight="700">
                              {qty > 1 ? `${qty} uds × ${money(displayUnitPriceConIGV, currency)}` : `1 ud × ${money(displayUnitPriceConIGV, currency)}`}
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
                                Descuento {money(displayLineSavings * 1.18, currency)}
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
        specialPricesMap={specialPricesMap}
        client={client}
      />

      {/* Catálogo de Precios Especiales por Convenio */}
      <ClientSpecialPricesModal
        isOpen={isSpecialPricesModalOpen}
        onClose={() => setIsSpecialPricesModalOpen(false)}
        specialPricesList={specialPricesList}
        clientName={client?.CardName || client?.name || ""}
        cardCode={clientCardCode}
        onSelectSpecialItem={handleAddFromSpecialModal}
        currentProducts={products}
        currency={currency}
        rateMultiplier={rateMultiplier}
      />
    </Box>
  );
}
