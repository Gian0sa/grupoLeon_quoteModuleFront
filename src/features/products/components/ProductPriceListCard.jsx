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

  const { SIGLA, PRECIO_LISTA, PRECIO_DESCUENTO, DESCUENTO_PCT, STOCK_DISPONIBLE, PRECIO_CONTADO, PRECIO_CREDITO } = product;

  const hasDiscount = DESCUENTO_PCT > 0;
  const finalPrice = hasDiscount ? PRECIO_DESCUENTO : PRECIO_LISTA;

  const priceColorMap = {
    CONTADO: { bg: "blue.100", color: "blue.800" , label : "Precio al contado"},
    CREDITO: { bg: "red.100", color: "red.800" , label : "Precio a credito"},
    FINAL: { bg: "green.100", color: "green.800" , label : "Precio final" },
  };

  const { bg, color , label } = priceColorMap[tipoPrecio] || priceColorMap.FINAL;


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
        mb={3}
        cursor="pointer"
        _hover={{ shadow: "md", borderColor: "green.400" }}
        transition="all 0.2s"
        onClick={onOpen}
      >
        <HStack justify="space-between" align="center">
          <Text fontWeight="bold" color="gray.800" fontSize="md" flex="1" noOfLines={1}>
            {SIGLA}
          </Text>

          <HStack spacing={2} align="center">
            <Text fontSize="2xs" color="gray.500" fontWeight="bold">
              {label}
            </Text>
           <Text
            fontSize="2xs"
            color={color}
            bg={bg}
            py={1}
            px={3}
            borderRadius="full"
            width="75px"
            fontWeight="bold"
            display="flex"
            justifyContent="center"
          >
            {`S/ ${formatNumber(selectedPrice)}`}
          </Text>


            {/* Stock */}
            <Badge
              colorScheme={STOCK_DISPONIBLE === 0 ? "red" : "green"}
              width="90px"
              alignItems="center"
              variant="solid"
              fontSize="2xs"
              px={1}
              py={1}
              borderRadius="full"
              fontWeight="bold"
              display="flex"
              justifyContent="center"
              textTransform="none" 
            >
              <Icon as={FiPackage} boxSize={4} color="white.500" mr={1}/>
              {formatNumber(STOCK_DISPONIBLE, 0)} unid.
            </Badge>
          </HStack>
        </HStack>
      </Box>

      <ProductPriceListModal product={product} isOpen={isOpen} onClose={onClose} />
    </>
  );
}
