import {
  Box,
  Text,
  HStack,
  VStack,
  Badge,
  useDisclosure
} from "@chakra-ui/react";
import { ProductPriceListModal } from "./ProductPriceListModal";

export function ProductPriceListCard({ product }) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { SIGLA, PRECIO_LISTA, PRECIO_DESCUENTO, DESCUENTO_PCT, STOCK_DISPONIBLE } = product;

  const hasDiscount = DESCUENTO_PCT > 0;
  const finalPrice = hasDiscount ? PRECIO_DESCUENTO : PRECIO_LISTA;

  const formatNumber = (num, decimals = 0) =>
    num?.toLocaleString("es-PE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }) ?? "0";

  return (
    <>
      <Box
        bg="white"
        borderRadius="md"
        p={2}
        shadow="sm"
        borderWidth="1px"
        borderColor="gray.400"
        mb={0}
        cursor="pointer"
        _hover={{ shadow: "md", borderColor: "green.400" }}
        transition="all 0.2s"
        onClick={onOpen}
      >
        <HStack justify="space-between" align="center">
          {/* Sigla - Lado izquierdo */}
          <Text 
            fontWeight="bold" 
            color="gray.800"
            fontSize="md"
            flex="1"
            noOfLines={1}
          >
            {SIGLA}
          </Text>

          <HStack spacing={2} align="center">
    
              <Text 
                fontSize="sm" 
                color="green.700" 
                fontWeight="bold"
              >
                S/ {finalPrice?.toFixed(2) || "0.00"}
              </Text>

            {/* Stock */}
            <Badge
              colorScheme={
                STOCK_DISPONIBLE === 0
                  ? "red"
                  : STOCK_DISPONIBLE <= 5
                  ? "yellow"
                  : "green"
              }
              variant="solid"
              fontSize="xs"
              px={2}
              py={1}
              borderRadius="md"
              fontWeight="bold"
            >
              {formatNumber(STOCK_DISPONIBLE)} UND.
            </Badge>
          </HStack>
        </HStack>
      </Box>

      {/* Modal con más info */}
      <ProductPriceListModal product={product} isOpen={isOpen} onClose={onClose} />
    </>
  );
}