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

const MotionBox = motion(Box);

export function ProductPriceListCard({ product, tipoPrecio }) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { SIGLA, ITEM_CODE, PRECIO_LISTA, PRECIO_DESCUENTO, DESCUENTO_PCT, STOCK_DISPONIBLE, PRECIO_CONTADO, PRECIO_CREDITO } = product;

  const hasDiscount = DESCUENTO_PCT > 0;
  const finalPrice = hasDiscount ? PRECIO_DESCUENTO : PRECIO_LISTA;

  const priceColorMap = {
    CONTADO: { bg: "blue.50", color: "blue.700", borderColor: "blue.200", label: "Precio contado" },
    CREDITO: { bg: "red.50", color: "red.700", borderColor: "red.200", label: "Precio crédito" },
    FINAL: { bg: "green.50", color: "green.700", borderColor: "green.200", label: "Precio final" },
  };

  const { bg, color, borderColor } = priceColorMap[tipoPrecio] || priceColorMap.FINAL;

  const formatNumber = (num, decimals = 2) =>
    num?.toLocaleString("es-PE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) ?? "0.00";

  // Selección de precio según tipoPrecio
  const getPriceByType = () => {
    switch (tipoPrecio) {
      case "CONTADO":
        return PRECIO_CONTADO ?? finalPrice;
      case "CREDITO":
        return PRECIO_CREDITO ?? finalPrice;
      default:
        return finalPrice;
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
          {/* IZQUIERDA: Nombre + Código */}
          <VStack align="start" spacing={1} flex="1" minW={0} overflow="hidden">
            <Text textStyle="cardTitle" color="gray.800" lineHeight="1.2" w="full">
              {SIGLA || "Producto sin descripción"}
            </Text>

            <HStack spacing={2}>
              <Badge bg="gray.100" color="gray.700" px={2} py={0.5} borderRadius="md" fontSize="11px" fontWeight="700">
                #{ITEM_CODE}
              </Badge>
              {hasDiscount && (
                <Badge colorScheme="orange" fontSize="10px" fontWeight="800">
                  -{DESCUENTO_PCT}% DESC
                </Badge>
              )}
            </HStack>
          </VStack>

          {/* DERECHA: Precio + Stock Badge */}
          <HStack spacing={3} justify={{ base: "space-between", sm: "flex-end" }} align="center" flexShrink={0}>
            {/* Precio */}
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
