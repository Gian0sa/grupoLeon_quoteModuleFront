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

export function ProductPriceListModal({ product, isOpen, onClose }) {
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
    STOCK_DISPONIBLE
  } = product;

  const hasDiscount = DESCUENTO_PCT > 0;
  const finalPrice = hasDiscount ? PRECIO_DESCUENTO : PRECIO_LISTA;

  const formatNumber = (num, decimals = 0) =>
    num?.toLocaleString("es-PE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }) ?? "0";

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
          {ITEM_NAME}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={4}>
            
            {/* Información del producto */}
            <VStack spacing={0} align="stretch">

              {/* Sigla */}
              {SIGLA && (
                <HStack>
                  <Text fontSize="md" color="green.600" fontWeight="medium" minW="80px">
                    Sigla:
                  </Text>
                  <Text fontSize="md" color="gray.700" fontFamily="mono">
                    {SIGLA}
                  </Text>
                </HStack>
              )}

              {ITEM_CODE && (
                <HStack>
                  <Text fontSize="md" color="green.600" fontWeight="medium" minW="80px">
                    Codigo:
                  </Text>
                  <Text fontSize="md" color="gray.700" fontFamily="mono">
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
              {/* Precio Listado */}
              <Flex align="center" justify="space-between">
                <Box
                  bg="blue.200"
                  fontSize="xs"
                  px={4}
                  py={2}
                  borderRadius="full"
                  fontWeight="medium"
                  color="gray.800"
                >
                  Precio Listado: $ {PRECIO_LISTA?.toFixed(2) || "0.00"}
                </Box>
                {hasDiscount && (
                  <Box
                    bg="red.800"
                    color="white"
                    fontSize="xs"
                    px={4}
                    py={2}
                    borderRadius="full"
                    fontWeight="medium"
                  >
                    Descuento: {DESCUENTO_PCT}%
                  </Box>
                )}
              </Flex>

              {/* Precio Final */}
              <Box
                bg="green.700"
                color="white"
                fontSize="lg"
                fontWeight="bold"
                py={3}
                px={4}
                borderRadius="full"
                textAlign="center"
              >
                Precio Final: $ {finalPrice?.toFixed(2) || "0.00"}
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