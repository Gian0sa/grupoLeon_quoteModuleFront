import {
  Box,
  Text,
  HStack,
  VStack,
  Badge,
  useDisclosure,
  Icon,
  Flex
} from "@chakra-ui/react";
import { ProductPriceListModal } from "./ProductPriceListModal";
import { FiPackage, FiChevronRight } from "react-icons/fi";
import { motion } from "framer-motion";
import { useGetPromotions } from "../../quotes/hooks/queries/quotesQueries";

const MotionBox = motion(Box);

export function ProductPriceListCard({ product, tipoPrecio }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { promotionsMap = {} } = useGetPromotions();

  const {
    SIGLA,
    ITEM_CODE,
    ITEM_NAME,
    MARCA,
    PRECIO_LISTA,
    PRECIO_DESCUENTO,
    PRECIO_LISTA_CON_IGV,
    PRECIO_DESCUENTO_CON_IGV,
    DESCUENTO_PCT,
    STOCK_DISPONIBLE,
    PRECIO_CONTADO,
    PRECIO_CREDITO
  } = product;

  const promo = promotionsMap[ITEM_CODE] || promotionsMap[product.productCode] || (product.U_US_PROMO ? { promoPrice: Number(product.U_US_PROMO) } : null);

  // En la Lista de Precios de Productos (Catálogo), los precios mostrados al asesor/cliente incluyen IGV
  const precioListaConIgv = Number(PRECIO_LISTA_CON_IGV ?? (PRECIO_LISTA > 0 ? (PRECIO_LISTA * 1.18).toFixed(2) : 0));
  const precioDescConIgv = Number(PRECIO_DESCUENTO_CON_IGV ?? (PRECIO_DESCUENTO > 0 ? (PRECIO_DESCUENTO * 1.18).toFixed(2) : 0));

  const hasDiscount = DESCUENTO_PCT > 0;
  const regularPriceConIgv = hasDiscount ? precioDescConIgv : precioListaConIgv;
  const promoPriceConIgv = promo && (Number(promo.promoPriceConIGV || promo.U_US_PROMO || 0) > 0)
    ? Number(promo.promoPriceConIGV ?? promo.U_US_PROMO)
    : null;
  const finalPriceConIgv = promoPriceConIgv ?? regularPriceConIgv;
  const totalDiscountPct = promo
    ? Number(promo.totalDiscountPct || (precioListaConIgv > 0 && promoPriceConIgv ? (((precioListaConIgv - promoPriceConIgv) / precioListaConIgv) * 100).toFixed(2) : DESCUENTO_PCT))
    : Number(DESCUENTO_PCT || 0);
  const displayDiscount = promo ? totalDiscountPct : Number(DESCUENTO_PCT || 0);
  const showDiscountBadge = displayDiscount > 0;

  const priceColorMap = {
    CONTADO: { bg: "blue.50", color: "blue.700", borderColor: "blue.200", label: "Precio contado" },
    CREDITO: { bg: "red.50", color: "red.700", borderColor: "red.200", label: "Precio crédito" },
    FINAL: { bg: "green.50", color: "green.700", borderColor: "green.200", label: "Precio final" },
  };

  const { bg, color, borderColor } = priceColorMap[tipoPrecio] || priceColorMap.FINAL;

  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined || num === "") return "0.00";
    const n = Number(num);
    return isNaN(n)
      ? "0.00"
      : n.toLocaleString("es-PE", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
  };

  // Selección de precio según tipoPrecio (con IGV para el catálogo)
  const getPriceByType = () => {
    switch (tipoPrecio) {
      case "CONTADO": {
        const pCont = product.PRECIO_CONTADO_CON_IGV ?? (PRECIO_CONTADO ? Number((PRECIO_CONTADO * 1.18).toFixed(2)) : null);
        return pCont ?? finalPriceConIgv;
      }
      case "CREDITO": {
        const pCred = product.PRECIO_CREDITO_CON_IGV ?? (PRECIO_CREDITO ? Number((PRECIO_CREDITO * 1.18).toFixed(2)) : null);
        return pCred ?? finalPriceConIgv;
      }
      default:
        return finalPriceConIgv;
    }
  };

  const selectedPrice = getPriceByType();
  const isAvailable = Number(STOCK_DISPONIBLE || 0) > 0;

  return (
    <>
      <MotionBox
        whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0, 0, 0, 0.06)" }}
        whileTap={{ scale: 0.99 }}
        bg="white"
        borderRadius="2xl"
        border="1.5px solid"
        borderColor="gray.100"
        p={{ base: 3, sm: 4 }}
        mb={2}
        cursor="pointer"
        onClick={onOpen}
        transition="all 0.2s"
        position="relative"
        overflow="hidden"
      >
        <Flex direction={{ base: "column", sm: "row" }} justify="space-between" align={{ base: "stretch", sm: "center" }} gap={3}>
          {/* IZQUIERDA: Sigla + Nombre Completo + Código + Marca */}
          <VStack align="start" spacing={1} flex="1" minW={0} overflow="hidden">
            <HStack spacing={2} align="center" w="full" flexWrap="wrap">
              <Text textStyle="cardTitle" color="gray.800" lineHeight="1.2">
                {SIGLA || ITEM_CODE || "Producto sin código"}
              </Text>
              {MARCA && (
                <Badge colorScheme="purple" variant="subtle" px={2} py={0.5} borderRadius="md" fontSize="11px" fontWeight="700">
                  {MARCA}
                </Badge>
              )}
            </HStack>

            {/* Nombre Completo / Descripción del producto */}
            {ITEM_NAME && (
              <Text fontSize={{ base: "13px", md: "14px" }} color="gray.600" fontWeight="500" lineHeight="1.3" noOfLines={2} w="full">
                {ITEM_NAME}
              </Text>
            )}

            <HStack spacing={2} pt={0.5} flexWrap="wrap">
              <Badge bg="gray.100" color="gray.700" px={2} py={0.5} borderRadius="md" fontSize="11px" fontWeight="700">
                #{ITEM_CODE}
              </Badge>
              {showDiscountBadge && (
                <Badge colorScheme="orange" fontSize="10px" fontWeight="800">
                  -{displayDiscount}% DESC
                </Badge>
              )}
            </HStack>
          </VStack>

          {/* DERECHA: Precio + Stock Badge */}
          <HStack spacing={3} justify={{ base: "space-between", sm: "flex-end" }} align="center" flexShrink={0}>
            {/* Precio */}
            <VStack spacing={0} align="center">
              <Box
                bg={bg}
                color={color}
                border="1px solid"
                borderColor={borderColor}
                py={1.5}
                px={3.5}
                borderRadius="xl"
                fontWeight="800"
                fontSize={{ base: "13px", md: "14px" }}
                textAlign="center"
                boxShadow="sm"
              >
                $ {formatNumber(selectedPrice)}
              </Box>
              <Text fontSize="9px" color="emerald.700" fontWeight="800" mt={0.5}>
                (Inc. IGV)
              </Text>
            </VStack>

            {/* Stock Badge */}
            <Badge
              bg={isAvailable ? "green.600" : "red.500"}
              color="white"
              fontSize="11px"
              px={3}
              py={1.5}
              borderRadius="xl"
              fontWeight="800"
              display="flex"
              alignItems="center"
              gap={1.5}
              boxShadow="sm"
            >
              <Icon as={FiPackage} boxSize={3.5} />
              <Text>{formatNumber(STOCK_DISPONIBLE, 0)} UNID.</Text>
            </Badge>

            <Icon as={FiChevronRight} color="gray.400" boxSize={5} display={{ base: "none", sm: "block" }} />
          </HStack>
        </Flex>
      </MotionBox>

      <ProductPriceListModal product={product} isOpen={isOpen} onClose={onClose} />
    </>
  );
}
