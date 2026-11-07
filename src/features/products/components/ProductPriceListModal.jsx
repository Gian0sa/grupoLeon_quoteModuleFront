import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Badge,
  Flex,
  Box,
  Divider,
  Image
} from "@chakra-ui/react";
import { Star, Check } from "lucide-react";
import { useGetPromotions } from "../../quotes/hooks/queries/quotesQueries";

export function ProductPriceListModal({ product, isOpen, onClose }) {
  if (!isOpen || !product) return null;
  const {
    ITEM_NAME,
    ITEM_CODE,
    MARCA,
    SIGLA,
    TIPO,
    SUBTIPO,
    PRECIO_LISTA,
    DESCUENTO_PCT,
    PRECIO_DESCUENTO,
    PRECIO_LISTA_CON_IGV,
    PRECIO_DESCUENTO_CON_IGV,
    U_TQC_PRVT,
    STOCK_DISPONIBLE,
    ROTACION
  } = product;

  const { promotionsMap = {} } = useGetPromotions();
  const promo = promotionsMap[ITEM_CODE] || promotionsMap[product.productCode] || (product.U_US_PROMO ? {
    promoPriceConIGV: Number(product.U_US_PROMO),
    U_US_PROMO: Number(product.U_US_PROMO),
    promoPriceNeto: Number((Number(product.U_US_PROMO) / 1.18).toFixed(2)),
    promoPrice: Number((Number(product.U_US_PROMO) / 1.18).toFixed(2)),
  } : null);

  // En Lista de Precios de Productos (Catálogo), los precios mostrados incluyen IGV
  const prvtVal = Number(PRECIO_LISTA_CON_IGV ?? U_TQC_PRVT ?? product.U_TQC_PRVT ?? 0);
  const precioListaConIgv = Number(prvtVal > 0 ? prvtVal : (PRECIO_LISTA > 0 ? (PRECIO_LISTA * 1.18).toFixed(2) : 0));
  const prvtDescVal = Number(PRECIO_DESCUENTO_CON_IGV ?? 0);
  const precioDescConIgv = Number(prvtDescVal > 0 ? prvtDescVal : (PRECIO_DESCUENTO > 0 ? (PRECIO_DESCUENTO * 1.18).toFixed(2) : 0));

  const hasDiscount = DESCUENTO_PCT > 0;
  const regularPriceConIgv = hasDiscount ? precioDescConIgv : precioListaConIgv;

  const hasPromo = Boolean(promo && (Number(promo.promoPriceConIGV || promo.promoPrice || promo.U_US_PROMO || 0) > 0));
  // En SAP, U_US_PROMO es el precio final CON IGV
  const promoPriceConIgv = hasPromo
    ? Number(promo.promoPriceConIGV ?? promo.U_US_PROMO ?? (promo.promoPrice ? (promo.promoPrice * 1.18).toFixed(2) : 0))
    : null;

  const totalDiscountPct = hasPromo
    ? Number(promo.totalDiscountPct || (precioListaConIgv > 0 ? (((precioListaConIgv - promoPriceConIgv) / precioListaConIgv) * 100).toFixed(2) : 0))
    : Number(DESCUENTO_PCT || 0);

  // Desglose de Descuentos para productos en Promoción:
  const baseDiscountPct = Number(DESCUENTO_PCT > 0 ? DESCUENTO_PCT : (promo?.discountPct ? (totalDiscountPct - Number(promo.discountPct)).toFixed(2) : 43.3));

  // Precio normal/anterior regular con IGV:
  const anteriorPriceConIgv = Number(PRECIO_DESCUENTO_CON_IGV ?? (precioListaConIgv > 0 ? (precioListaConIgv * (1 - baseDiscountPct / 100)).toFixed(2) : regularPriceConIgv));
  const effectiveRegularPrice = Number(anteriorPriceConIgv || regularPriceConIgv || 0);

  // Descuento total acumulado desde el precio de lista (ej. 59.0% DTO para que refleje el descuento total mayor):
  const displayPromoDiscountPct = (hasPromo && precioListaConIgv > 0 && promoPriceConIgv > 0)
    ? (((precioListaConIgv - promoPriceConIgv) / precioListaConIgv) * 100).toFixed(1)
    : (Number(totalDiscountPct || promo?.totalDiscountPct || 0)).toFixed(1);

  const showDiscountBadge = baseDiscountPct > 0;
  const currencySymbol = product.CURRENCY === "SOL" || product.MONEDA === "SOL" || product.DocCur === "SOL" ? "S/" : "$";

  const formatNumber = (num, decimals = 0) =>
    num?.toLocaleString("es-PE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }) ?? "0";

  const getRotacionColor = (rotacion) => {
    switch (rotacion) {
      case "A":
        return { bg: "#15803d", color: "white" };
      case "B":
        return { bg: "#22c55e", color: "white" };
      case "C":
        return { bg: "#f97316", color: "white" };
      case "D":
        return { bg: "#dc2626", color: "white" };
      case "N":
        return { bg: "#334155", color: "white" };
      default:
        return { bg: "#94a3b8", color: "white" };
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "md", sm: "lg", md: "2xl", lg: "3xl" }} isCentered>
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(3px)" />
      <ModalContent
        w={{ base: "92vw", sm: "88vw", md: "700px" }}
        maxW="700px"
        my="auto"
        mx="auto"
        borderRadius={{ base: "2xl", md: "3xl" }}
        p={{ base: 4, sm: 5, md: 6 }}
        boxShadow="2xl"
        overflow="hidden"
      >
        {/* Cabecera: Sigla + Estrella + Nombre + Cerrar */}
        <ModalHeader p={0} mb={{ base: 3, md: 4 }}>
          <HStack spacing={2} align="center" wrap="wrap" pr={{ base: 8, md: 10 }}>
            {SIGLA && (
              <Badge
                bg="#dcfce7"
                color="#15803d"
                px={2.5}
                py="2px"
                borderRadius="lg"
                fontSize={{ base: "13px", md: "14px" }}
                fontWeight="900"
                letterSpacing="0.3px"
              >
                {SIGLA}
              </Badge>
            )}
            {hasPromo && (
              <Star size={20} fill="#facc15" color="#facc15" stroke="#facc15" />
            )}
            <Text fontSize={{ base: "15px", md: "18px" }} fontWeight="800" color="#0f172a" noOfLines={1} title={ITEM_NAME}>
              {ITEM_NAME || SIGLA || "Producto sin descripción"}
            </Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton top={{ base: 3, md: 4 }} right={{ base: 3, md: 4 }} size="md" borderRadius="full" />

        <ModalBody p={0}>
          <VStack align="stretch" spacing={{ base: 3.5, md: 3 }}>
            {/* Sección superior: En móvil se apila verticalmente con buena altura, en desktop 2 columnas lado a lado */}
            <Flex
              direction={{ base: "column", md: "row" }}
              justify="space-between"
              align={{ base: "stretch", md: "center" }}
              gap={{ base: 3.5, md: 5 }}
            >
              {/* Columna Izquierda: Atributos con líneas divisorias */}
              <VStack spacing={0} align="stretch" flex="1" w="full" minW="0">
                {/* Clasificación */}
                <HStack spacing={3} py={{ base: "6px", md: "7px" }} borderBottom="1px solid #e2e8f0" align="center">
                  <Text fontSize="14px" fontWeight="600" color="#1e293b" minW="105px" whiteSpace="nowrap">
                    Clasificación:
                  </Text>
                  <Badge
                    bg={getRotacionColor(ROTACION || "D").bg}
                    color="white"
                    fontSize="13px"
                    fontWeight="900"
                    px={3.5}
                    py={0.5}
                    borderRadius="full"
                  >
                    {ROTACION || "D"}
                  </Badge>
                </HStack>

                {/* Código */}
                <HStack spacing={3} py={{ base: "6px", md: "7px" }} borderBottom="1px solid #e2e8f0" align="center">
                  <Text fontSize="14px" fontWeight="600" color="#1e293b" minW="105px" whiteSpace="nowrap">
                    Código:
                  </Text>
                  <Text fontSize="14.5px" fontWeight="800" color="#0f172a" whiteSpace="nowrap">
                    {ITEM_CODE || "—"}
                  </Text>
                </HStack>

                {/* Marca */}
                <HStack spacing={3} py={{ base: "6px", md: "7px" }} borderBottom="1px solid #e2e8f0" align="center">
                  <Text fontSize="14px" fontWeight="600" color="#1e293b" minW="105px" whiteSpace="nowrap">
                    Marca:
                  </Text>
                  <Text fontSize="14.5px" fontWeight="800" color="#0f172a" textTransform="uppercase" whiteSpace="nowrap">
                    {MARCA || "Sin marca"}
                  </Text>
                </HStack>

                {/* Tipo */}
                <HStack spacing={3} py={{ base: "6px", md: "7px" }} align="center">
                  <Text fontSize="14px" fontWeight="600" color="#1e293b" minW="105px" whiteSpace="nowrap">
                    Tipo:
                  </Text>
                  <Text fontSize="14.5px" fontWeight="800" color="#0f172a" whiteSpace="nowrap">
                    {TIPO || SUBTIPO || "Bujías"}
                  </Text>
                </HStack>
              </VStack>

              {/* Cartilla Verde con Bujía y Precio */}
              <Box
                position="relative"
                bg="#eaf6ee"
                border="2px solid #14532d"
                borderRadius="2xl"
                pt={{ base: hasPromo ? "18px" : "14px", md: hasPromo ? "20px" : "16px" }}
                pb="12px"
                px="16px"
                w={{ base: "100%", md: "315px" }}
                flexShrink={0}
              >
                {/* Píldora superior centrada: EN PROMOCIÓN */}
                {hasPromo && (
                  <Box
                    position="absolute"
                    top="-12px"
                    left="50%"
                    transform="translateX(-50%)"
                    bg="#14532d"
                    color="white"
                    fontSize="11.5px"
                    fontWeight="900"
                    px={3.5}
                    py="2px"
                    borderRadius="full"
                    letterSpacing="0.4px"
                    whiteSpace="nowrap"
                    boxShadow="sm"
                  >
                    EN PROMOCIÓN
                  </Box>
                )}

                {/* Fila central: Ícono Bujía + Precio + Badge lateral */}
                <HStack spacing={3} justify="center" align="center" wrap="nowrap" mt={hasPromo ? 1 : 0}>
                  <Image
                    src="/assets/spark_plug_icon.png"
                    alt="Bujía y tuerca"
                    w={{ base: "32px", md: "36px" }}
                    h="auto"
                    flexShrink={0}
                  />

                  <Text
                    fontSize={{ base: "32px", md: "38px" }}
                    fontWeight="900"
                    color="#0f291e"
                    lineHeight="1"
                    letterSpacing="-0.02em"
                    whiteSpace="nowrap"
                  >
                    {currencySymbol}&nbsp;{(hasPromo ? promoPriceConIgv : regularPriceConIgv)?.toFixed(2)}
                  </Text>

                  {hasPromo ? (
                    <Badge
                      bg="#eab308"
                      color="white"
                      fontSize="13px"
                      fontWeight="900"
                      px={2.5}
                      py={1}
                      borderRadius="lg"
                      letterSpacing="0.3px"
                      whiteSpace="nowrap"
                      textShadow="0px 1px 2px rgba(0,0,0,0.35)"
                      boxShadow="sm"
                      flexShrink={0}
                    >
                      -{displayPromoDiscountPct}%
                    </Badge>
                  ) : (
                    <VStack
                      spacing={0}
                      bg="#14532d"
                      color="white"
                      px={2.5}
                      py={1}
                      borderRadius="lg"
                      align="center"
                      justify="center"
                      flexShrink={0}
                    >
                      <Text fontSize="9.5px" fontWeight="900" lineHeight="1.1" letterSpacing="0.3px" whiteSpace="nowrap">
                        PRECIO
                      </Text>
                      <Text fontSize="9.5px" fontWeight="900" lineHeight="1.1" letterSpacing="0.3px" whiteSpace="nowrap">
                        FINAL
                      </Text>
                    </VStack>
                  )}
                </HStack>

                {/* Subtexto */}
                <Text
                  fontSize="11.5px"
                  fontWeight="600"
                  color="#1e3a2b"
                  textAlign="center"
                  mt={2}
                  whiteSpace="nowrap"
                >
                  {hasPromo ? "Aplica sobre precio normal (Inc. IGV)" : "Precio normal (Inc. IGV)"}
                </Text>
              </Box>
            </Flex>

            {/* Barra Central: Precios (Sin scroll horizontal, responsivo y ordenado) */}
            <Divider borderColor="#e2e8f0" />

            <Flex
              direction={{ base: "column", md: "row" }}
              align={{ base: "stretch", md: "center" }}
              justify={{ base: "flex-start", md: hasPromo ? "space-between" : "flex-start" }}
              gap={{ base: 2, md: 4 }}
              py={{ base: 1, md: 1 }}
              w="full"
            >
              {/* Precio listado + Descuento lista */}
              <HStack spacing={2} align="center" justify={{ base: "space-between", md: "flex-start" }}>
                <HStack spacing={2} align="center">
                  <Text fontSize={{ base: "13.5px", md: "14px" }} fontWeight="600" color="#334155" whiteSpace="nowrap">
                    Precio de lista:
                  </Text>
                  <Text fontSize={{ base: "14.5px", md: "15px" }} fontWeight="800" color="#0f172a" whiteSpace="nowrap">
                    {currencySymbol}&nbsp;{precioListaConIgv?.toFixed(2) || "0.00"}
                  </Text>
                </HStack>
                {showDiscountBadge && (
                  <Badge
                    bg="#7f1d1d"
                    color="white"
                    fontSize={{ base: "11px", md: "12px" }}
                    fontWeight="800"
                    px={2.5}
                    py="1.5px"
                    borderRadius="full"
                    textTransform="none"
                    whiteSpace="nowrap"
                  >
                    Descuento lista: {baseDiscountPct}%
                  </Badge>
                )}
              </HStack>

              {/* Precio normal (solo si tiene promoción) */}
              {hasPromo && (
                <HStack spacing={2} align="center" justify={{ base: "flex-start", md: "flex-start" }}>
                  <Box h="16px" w="1px" bg="#cbd5e1" display={{ base: "none", md: "block" }} />
                  <Text fontSize={{ base: "13.5px", md: "14px" }} fontWeight="600" color="#334155" whiteSpace="nowrap">
                    Precio normal:
                  </Text>
                  <Text fontSize={{ base: "14.5px", md: "15px" }} fontWeight="800" color="#0f172a" whiteSpace="nowrap">
                    {currencySymbol}&nbsp;{(anteriorPriceConIgv || regularPriceConIgv)?.toFixed(2) || "0.00"}
                  </Text>
                  <Text fontSize={{ base: "12px", md: "13px" }} fontWeight="600" color="#475569" whiteSpace="nowrap">
                    (Inc. IGV)
                  </Text>
                </HStack>
              )}
            </Flex>

            <Divider borderColor="#e2e8f0" />

            {/* Barra Inferior: Stock disponible */}
            <Box
              bg="#eaf6ee"
              borderRadius="xl"
              py={{ base: 2, md: 2.5 }}
              px={3.5}
              border="1px solid #d1fae5"
            >
              <HStack spacing={3} align="center">
                <Flex
                  w="24px"
                  h="24px"
                  borderRadius="full"
                  bg="#15803d"
                  color="white"
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <Check size={15} strokeWidth={3} />
                </Flex>
                <Text fontSize="15px" fontWeight="800" color="#0f291e" whiteSpace="nowrap">
                  Stock disponible:
                </Text>
                <Badge
                  bg="#14532d"
                  color="white"
                  fontSize="13px"
                  fontWeight="900"
                  px={3.5}
                  py={0.5}
                  borderRadius="lg"
                  whiteSpace="nowrap"
                >
                  {formatNumber(STOCK_DISPONIBLE)} UND.
                </Badge>
              </HStack>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default ProductPriceListModal;