import {
  Box,
  Text,
  HStack,
  VStack,
  Badge,
  useDisclosure,
  Icon
} from "@chakra-ui/react";
import { ProductPriceListModal } from "./ProductPriceListModal";
import { FiPackage } from "react-icons/fi";

export function ProductPriceListCard({ product, tipoPrecio }) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { SIGLA, ITEM_CODE, PRECIO_LISTA, PRECIO_DESCUENTO, DESCUENTO_PCT, STOCK_DISPONIBLE, PRECIO_CONTADO, PRECIO_CREDITO , ROTACION } = product;

  const hasDiscount = DESCUENTO_PCT > 0;
  const finalPrice = hasDiscount ? PRECIO_DESCUENTO : PRECIO_LISTA;

  const priceColorMap = {
    CONTADO: { bg: "blue.100", color: "blue.800", label: "Precio al contado" },
    CREDITO: { bg: "red.100", color: "red.800", label: "Precio a credito" },
    FINAL: { bg: "green.100", color: "green.800", label: "Precio final" },
  };

  const { bg, color, label } = priceColorMap[tipoPrecio] || priceColorMap.FINAL;


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

  return (
    <>
      <Box
        bg="white"
        borderRadius="md"
        shadow="sm"
        borderWidth="1px"
        p={1}
        mb={0}
        cursor="pointer"
        _hover={{ shadow: "md", borderColor: "green.400" }}
        transition="all 0.2s"
        onClick={onOpen}
      >
        <HStack justify="space-between" align="center">
          <HStack justify="space-between" align="center" width="100%">
            {/* IZQUIERDA */}
            <VStack align="start" spacing={0} flex="1">
              <Text fontWeight="500" color="gray.800" fontSize="sm" noOfLines={1}>
                {SIGLA}
              </Text>

              {/* ITEM CODE destacado */}
              <Text fontSize="xs" color="gray.500" fontWeight="bold">
                {ITEM_CODE}
              </Text>
            </VStack>

            {/* DERECHA */}
            <HStack spacing={1} align="center">
              ...
            </HStack>
          </HStack>


          <HStack spacing={1} align="center">
            <Text
              fontSize="sm"
              color={color}
              bg={bg}
              py={1}
              px={3}
              borderRadius="full"
              width="100px"
              fontWeight="bold"
              display="flex"
              justifyContent="center"
            >
              {`$ ${formatNumber(selectedPrice)}`}
            </Text>


            {/* Stock */}
            <Badge
              bg={STOCK_DISPONIBLE === 0 ? "#ff4c4cfa" : "#157f3d"}
              color="white"
              width="100px"
              alignItems="center"
              fontSize="xs"
              px={1}
              py={1}
              borderRadius="full"
              fontWeight="bold"
              display="flex"
              justifyContent="center"
              textTransform="none"
            >
              <Icon as={FiPackage} boxSize={4} color="white" mr={1} />
              {formatNumber(STOCK_DISPONIBLE, 0)} unid.
            </Badge>

          </HStack>
        </HStack>
      </Box>

      <ProductPriceListModal product={product} isOpen={isOpen} onClose={onClose} />
    </>
  );
}
