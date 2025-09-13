import {
  Box,
  Text,
  HStack,
  VStack,
  Badge,
  Button,
  Flex
} from "@chakra-ui/react";

export function ProductPriceListCard({ product }) {
  const {
    ITEM_NAME,
    ITEM_CODE,
    MARCA,
    SIGLA,
    PRECIO_LISTA,
    DESCUENTO_PCT,
    PRECIO_DESCUENTO,
    STOCK_DISPONIBLE
  } = product;

  const hasDiscount = DESCUENTO_PCT > 0;
  const finalPrice = hasDiscount ? PRECIO_DESCUENTO : PRECIO_LISTA;

  return (
    <Box
      bg="white"
      borderRadius="lg"
      p={4}
      shadow="sm"
      borderWidth="1px"
      borderColor="gray.200"
      mb={3}
      _hover={{ 
        shadow: "md", 
        borderColor: "green.400",
        transition: "all 0.2s"
      }}
      transition="all 0.2s"
    >
      {/* Título del producto */}
      <Text 
        fontWeight="bold" 
        fontSize="sm" 
        color="gray.800" 
        mb={3}
        lineHeight="1.2"
      >
        {ITEM_NAME}
      </Text>

      {/* Información del producto en grid */}
      <VStack spacing={2} align="stretch" mb={4}>
        {/* Código */}
        <HStack>
          <Text fontSize="xs" color="green.600" fontWeight="medium" minW="80px">
            Código:
          </Text>
          <Text fontSize="xs" color="gray.700" fontFamily="mono">
            {ITEM_CODE}
          </Text>
        </HStack>

        {/* Marca */}
        <HStack>
          <Text fontSize="xs" color="green.600" fontWeight="medium" minW="80px">
            Marca:
          </Text>
          <Text fontSize="xs" color="gray.700">
            {MARCA || "Sin marca"}
          </Text>
        </HStack>

        {/* Código Honda */}
        {SIGLA && (
          <HStack>
            <Text fontSize="xs" color="green.600" fontWeight="medium" minW="80px">
              Código Honda:
            </Text>
            <Text fontSize="xs" color="gray.700" fontFamily="mono">
              {SIGLA}
            </Text>
          </HStack>
        )}
      </VStack>

      {/* Precios */}
      <VStack spacing={2} align="stretch" mb={4}>
        {/* Precio Listado */}
        <Flex align="center" justify="space-between">
          <Button
            size="sm"
            bg="blue.200"
            variant="solid"
            fontSize="xs"
            px={4}
            py={2}
            borderRadius="full"
          >
            Precio Listado: S/. {PRECIO_LISTA?.toFixed(2) || "0.00"}
          </Button>
          {hasDiscount && (
            <Button
              size="sm"
              bg="red.800"
              color="white"
              variant="solid"
              fontSize="xs"
              px={4}
              py={2}
              borderRadius="full"
            >
              Descuento: {DESCUENTO_PCT}%
            </Button>
          )}
        </Flex>

        {/* Precio Final */}
        <Button
          size="md"
          bg="green.700"
          color="white"
          variant="solid"
          fontSize="sm"
          fontWeight="bold"
          py={3}
          borderRadius="full"
        >
          Precio Final: S/. {finalPrice?.toFixed(2) || "0.00"}
        </Button>
      </VStack>

      {/* Stock */}
      <Box
        bg="gray.50"
        p={2}
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
            {STOCK_DISPONIBLE ?? 0} unid.
          </Badge>
        </HStack>
      </Box>
    </Box>
  );
}