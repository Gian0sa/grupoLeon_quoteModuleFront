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
  Divider
} from "@chakra-ui/react";
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
    STOCK_DISPONIBLE,
    ROTACION
  } = product;

  const { promotionsMap = {} } = useGetPromotions();
  const promo = promotionsMap[ITEM_CODE] || promotionsMap[product.productCode] || (product.U_US_PROMO ? { promoPrice: Number(product.U_US_PROMO) } : null);

  // En Lista de Precios de Productos (Catálogo), los precios mostrados incluyen IGV
  const precioListaConIgv = Number(PRECIO_LISTA_CON_IGV ?? (PRECIO_LISTA > 0 ? (PRECIO_LISTA * 1.18).toFixed(2) : 0));
  const precioDescConIgv = Number(PRECIO_DESCUENTO_CON_IGV ?? (PRECIO_DESCUENTO > 0 ? (PRECIO_DESCUENTO * 1.18).toFixed(2) : 0));

  const hasDiscount = DESCUENTO_PCT > 0;
  const regularPriceConIgv = hasDiscount ? precioDescConIgv : precioListaConIgv;

  const hasPromo = Boolean(promo && (Number(promo.promoPriceConIGV || promo.promoPrice || promo.U_US_PROMO || 0) > 0));
  // En SAP, U_US_PROMO es el precio final CON IGV (ej. $51.79 USD)
  const promoPriceConIgv = hasPromo
    ? Number(promo.promoPriceConIGV ?? promo.U_US_PROMO ?? (promo.promoPrice ? (promo.promoPrice * 1.18).toFixed(2) : 0))
    : null;
  const promoPriceNeto = hasPromo
    ? Number(promo.promoPriceNeto ?? promo.promoPrice ?? (promoPriceConIgv ? (promoPriceConIgv / 1.18).toFixed(2) : 0))
    : null;
  const totalDiscountPct = hasPromo
    ? Number(promo.totalDiscountPct || (precioListaConIgv > 0 ? (((precioListaConIgv - promoPriceConIgv) / precioListaConIgv) * 100).toFixed(2) : 0))
    : Number(DESCUENTO_PCT || 0);

  // Desglose de Descuentos para productos en Promoción:
  const baseDiscountPct = Number(DESCUENTO_PCT > 0 ? DESCUENTO_PCT : (promo?.discountPct ? (totalDiscountPct - Number(promo.discountPct)).toFixed(2) : 43.3));
  const extraDiscountPct = hasPromo
    ? Number(promo?.discountPct || (totalDiscountPct > baseDiscountPct ? (totalDiscountPct - baseDiscountPct).toFixed(2) : 0))
    : 0;

  // Precio anterior regular con IGV (ej. $70.47):
  const anteriorPriceConIgv = Number(PRECIO_DESCUENTO_CON_IGV ?? (precioListaConIgv > 0 ? (precioListaConIgv * (1 - baseDiscountPct / 100)).toFixed(2) : regularPriceConIgv));

  // El Precio Final a cobrar es el de Oferta ($51.79 con IGV) si existe, sino el regular ($70.47 con IGV):
  const finalPriceConIgv = hasPromo ? promoPriceConIgv : regularPriceConIgv;
  const displayDiscount = hasPromo ? totalDiscountPct : Number(DESCUENTO_PCT || 0);
  const showDiscountBadge = displayDiscount > 0;

  const formatNumber = (num, decimals = 0) =>
    num?.toLocaleString("es-PE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }) ?? "0";

  const getRotacionColor = (rotacion) => {
    switch (rotacion) {
      case "A":
        return { bg: "green.800", color: "white" }; // Verde oscuro
      case "B":
        return { bg: "green.400", color: "white" }; // Verde claro
      case "C":
        return { bg: "orange.400", color: "white" }; // Naranja
      case "D":
        return { bg: "red.600", color: "white" }; // Rojo
      case "N":
        return { bg: "gray.700", color: "white" }; // Gris oscuro
      default:
        return { bg: "gray.400", color: "white" };
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader
          fontWeight="bold"
          fontSize="lg"
          color="gray.800"
          lineHeight="1.2"
          pb={2}
          width="95%"
        >
          {SIGLA && (
            <Badge colorScheme="teal" variant="subtle" px={2} py={0.5} borderRadius="md" fontSize="12px" fontWeight="800" mr={2} verticalAlign="middle">
              {SIGLA}
            </Badge>
          )}
          {promo && (
            <Text as="span" fontSize="14px" mr={1.5} title="Artículo en oferta">
              ⭐
            </Text>
          )}
          {ITEM_NAME || SIGLA || "Producto sin descripción"}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={4}>

            {/* Información del producto */}
            <VStack spacing={0} align="stretch">

              {/* Rotacion */}
              {ROTACION && (
                <HStack align="center">
                  <Text
                    fontSize="md"
                    color="green.600"
                    fontWeight="medium"
                    minW="80px"
                  >
                    Clasif:
                  </Text>

                  <Badge
                    bg={getRotacionColor(ROTACION).bg}
                    color={getRotacionColor(ROTACION).color}
                    fontSize="sm"
                    px={4}
                    py={1}
                    borderRadius="full"
                    fontWeight="bold"
                  >
                    {ROTACION}
                  </Badge>
                </HStack>
              )}

              {/* Sigla */}
              {SIGLA && (
                <HStack>
                  <Text fontSize="md" color="green.600" fontWeight="medium" minW="80px">
                    Sigla:
                  </Text>
                  <Text fontSize="md" color="gray.700" fontWeight="600">
                    {SIGLA}
                  </Text>
                </HStack>
              )}

              {ITEM_CODE && (
                <HStack>
                  <Text fontSize="md" color="green.600" fontWeight="medium" minW="80px">
                    Codigo:
                  </Text>
                  <Text fontSize="md" color="gray.700" fontWeight="600">
                    {ITEM_CODE}
                  </Text>
                </HStack>
              )}

              {/* Marca */}
              <HStack>
                <Text fontSize="xs" color="green.600" fontWeight="medium" minW="80px">
                  Marca:
                </Text>
                <Text fontSize="xs" color="gray.700">
                  {MARCA || "Sin marca"}
                </Text>
              </HStack>

              {/* Tipo */}
              {TIPO && (
                <HStack>
                  <Text fontSize="xs" color="green.600" fontWeight="medium" minW="80px">
                    Tipo:
                  </Text>
                  <Text fontSize="xs" color="gray.700">
                    {TIPO}
                  </Text>
                </HStack>
              )}

              {/* Subtipo */}
              {SUBTIPO && (
                <HStack>
                  <Text fontSize="xs" color="green.600" fontWeight="medium" minW="80px">
                    Subtipo:
                  </Text>
                  <Text fontSize="xs" color="gray.700">
                    {SUBTIPO}
                  </Text>
                </HStack>
              )}
            </VStack>

            <Divider />

            {/* Precios */}
            <VStack spacing={1} align="stretch">
              {/* Precio Listado y Descuento */}
              <Flex align="center" justify="space-between">
                <Box
                  bg="blue.200"
                  fontSize="xs"
                  px={4}
                  py={2}
                  borderRadius="full"
                  fontWeight="bold"
                  color="gray.900"
                >
                  Precio Listado: $ {precioListaConIgv?.toFixed(2) || "0.00"}
                </Box>
                {showDiscountBadge && (
                  <Box
                    bg="red.800"
                    color="white"
                    fontSize="xs"
                    px={4}
                    py={2}
                    borderRadius="full"
                    fontWeight="bold"
                  >
                    {hasPromo && extraDiscountPct > 0
                      ? `Descuento: ${baseDiscountPct}% + ${extraDiscountPct}% (${totalDiscountPct}%)`
                      : `Descuento: ${displayDiscount}%`}
                  </Box>
                )}
              </Flex>

              {/* Precio Final (Con IGV) */}
              <Box
                bg="green.700"
                color="white"
                fontSize="lg"
                fontWeight="extrabold"
                py={3}
                px={4}
                borderRadius="full"
                textAlign="center"
                boxShadow="sm"
              >
                {hasPromo && anteriorPriceConIgv ? (
                  <Flex justify="center" align="center" gap={2} wrap="wrap">
                    <Text fontSize="sm" fontWeight="700" opacity={0.85}>
                      Antes: <Text as="s" fontWeight="800">$ {anteriorPriceConIgv?.toFixed(2)}</Text>
                    </Text>
                    <Text fontSize="lg" fontWeight="black">
                      ➔ Precio Final: $ {finalPriceConIgv?.toFixed(2)} (Inc. IGV)
                    </Text>
                  </Flex>
                ) : (
                  `Precio Final: $ ${finalPriceConIgv?.toFixed(2) || "0.00"} (Inc. IGV)`
                )}
              </Box>
            </VStack>

            {/* Stock */}
            <Box
              bg="gray.50"
              px={2}
              py={2}
              borderRadius="md"
              border="1px"
              borderColor="gray.200"
            >
              <HStack justify="space-between" align="center">
                <Text fontSize="xs" color="green.600" fontWeight="bold">
                  Stock:
                </Text>
                <Badge
                  colorScheme={STOCK_DISPONIBLE === 0 ? "red" : STOCK_DISPONIBLE <= 5 ? "yellow" : "green"}
                  variant="solid"
                  fontSize="xs"
                  px={2}
                  py={1}
                  borderRadius="md"
                  fontWeight="bold"
                >
                  {formatNumber(STOCK_DISPONIBLE)} und.
                </Badge>
              </HStack>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}