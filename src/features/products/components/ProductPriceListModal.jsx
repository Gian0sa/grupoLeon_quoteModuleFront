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
  const displayDiscount = baseDiscountPct;
  const showDiscountBadge = displayDiscount > 0;

  const currencySymbol = product.CURRENCY === "SOL" || product.MONEDA === "SOL" || product.DocCur === "SOL" ? "S/" : "$";
  const priceDisplayStr = `${currencySymbol} ${promoPriceConIgv?.toFixed(2) || "0.00"}`;
  const priceFontSize = priceDisplayStr.length > 9 ? 102 : priceDisplayStr.length > 7 ? 116 : 130;

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
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", sm: "xl", md: "2xl" }} isCentered>
      <ModalOverlay />
      <ModalContent maxW={{ base: "95vw", sm: "600px", md: "660px" }} borderRadius="2xl">
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

            {/* Información del producto + Cartilla En Promoción al lado derecho */}
            <Flex
              direction={{ base: "column", sm: "row" }}
              justify="space-between"
              align="center"
              gap={{ base: 5, sm: 4 }}
            >
              {/* Atributos del producto con letras más grandes (16px), negrita y alineación perfecta */}
              <VStack spacing={2.5} align="stretch" flex="1" minW={{ sm: "185px" }}>
                {/* Rotacion */}
                {ROTACION && (
                  <HStack align="center" spacing={2.5}>
                    <Text
                      fontSize="16px"
                      color="green.800"
                      fontWeight="800"
                      minW="80px"
                    >
                      Clasif:
                    </Text>

                    <Badge
                      bg={getRotacionColor(ROTACION).bg}
                      color={getRotacionColor(ROTACION).color}
                      fontSize="13px"
                      px={3.5}
                      py={0.8}
                      borderRadius="full"
                      fontWeight="800"
                    >
                      {ROTACION}
                    </Badge>
                  </HStack>
                )}

                {/* Sigla */}
                {SIGLA && (
                  <HStack align="center" spacing={2.5}>
                    <Text fontSize="16px" color="green.800" fontWeight="800" minW="80px">
                      Sigla:
                    </Text>
                    <Text fontSize="16px" color="gray.900" fontWeight="700">
                      {SIGLA}
                    </Text>
                  </HStack>
                )}

                {ITEM_CODE && (
                  <HStack align="center" spacing={2.5}>
                    <Text fontSize="16px" color="green.800" fontWeight="800" minW="80px">
                      Codigo:
                    </Text>
                    <Text fontSize="16px" color="gray.900" fontWeight="700">
                      {ITEM_CODE}
                    </Text>
                  </HStack>
                )}

                {/* Marca */}
                <HStack align="center" spacing={2.5}>
                  <Text fontSize="16px" color="green.800" fontWeight="800" minW="80px">
                    Marca:
                  </Text>
                  <Text fontSize="16px" color="gray.900" fontWeight="700">
                    {MARCA || "Sin marca"}
                  </Text>
                </HStack>

                {/* Tipo */}
                {TIPO && (
                  <HStack align="center" spacing={2.5}>
                    <Text fontSize="16px" color="green.800" fontWeight="800" minW="80px">
                      Tipo:
                    </Text>
                    <Text fontSize="16px" color="gray.900" fontWeight="700">
                      {TIPO}
                    </Text>
                  </HStack>
                )}

                {/* Subtipo */}
                {SUBTIPO && (
                  <HStack align="center" spacing={2.5}>
                    <Text fontSize="16px" color="green.800" fontWeight="800" minW="80px">
                      Subtipo:
                    </Text>
                    <Text fontSize="16px" color="gray.900" fontWeight="700">
                      {SUBTIPO}
                    </Text>
                  </HStack>
                )}
              </VStack>

              {/* Cartilla de Promoción estilo limpio con bujía, precio grande y tag PRECIO FINAL */}
              {hasPromo && promoPriceConIgv && (
                <Box
                  position="relative"
                  bg="#eaf6ee"
                  border="2.5px solid #235d43"
                  borderRadius="24px"
                  pt={5}
                  pb={3}
                  px={3.5}
                  w={{ base: "100%", sm: "275px", md: "295px" }}
                  boxShadow="0 4px 14px rgba(35, 93, 67, 0.12)"
                  transition="transform 0.2s ease"
                  _hover={{ transform: "scale(1.02)" }}
                  flexShrink={0}
                  mt={{ base: 3, sm: 0 }}
                >
                  {/* Píldora superior centrada: EN PROMOCIÓN */}
                  <Box
                    position="absolute"
                    top="-13px"
                    left="50%"
                    transform="translateX(-50%)"
                    bg="#235d43"
                    color="white"
                    fontSize="11.5px"
                    fontWeight="800"
                    px={4}
                    py="2px"
                    borderRadius="full"
                    letterSpacing="0.5px"
                    boxShadow="0 2px 4px rgba(0,0,0,0.15)"
                    whiteSpace="nowrap"
                  >
                    EN PROMOCIÓN
                  </Box>

                  {/* Fila central: Ícono Bujía + Precio Gigante + Tag PRECIO FINAL */}
                  <Flex justify="center" align="center" gap={2.5} mt={1}>
                    {/* Ícono bujía + tuerca */}
                    <Image
                      src="/assets/spark_plug_icon.png"
                      alt="Bujía y tuerca"
                      w="38px"
                      h="auto"
                      flexShrink={0}
                    />

                    {/* Precio destacado */}
                    <Text
                      fontSize={{ base: "30px", sm: "34px" }}
                      fontWeight="900"
                      color="#192e24"
                      lineHeight="1"
                      letterSpacing="-0.03em"
                    >
                      $ {promoPriceConIgv?.toFixed(2)}
                    </Text>

                    {/* Tag PRECIO FINAL con flecha izquierda */}
                    <Box
                      position="relative"
                      bg="#2d8557"
                      color="white"
                      fontSize="10px"
                      fontWeight="800"
                      letterSpacing="0.4px"
                      px={2}
                      py="3px"
                      borderRadius="md"
                      display="inline-flex"
                      alignItems="center"
                      flexShrink={0}
                      boxShadow="0 1px 3px rgba(0,0,0,0.12)"
                    >
                      {/* Flecha triangular apuntando hacia el precio */}
                      <Box
                        position="absolute"
                        left="-5px"
                        top="50%"
                        transform="translateY(-50%)"
                        w="0"
                        h="0"
                        borderTop="5px solid transparent"
                        borderBottom="5px solid transparent"
                        borderRight="6px solid #2d8557"
                      />
                      PRECIO FINAL
                    </Box>
                  </Flex>

                  {/* Texto inferior explicativo */}
                  <Text
                    fontSize="10.5px"
                    fontWeight="600"
                    color="#4b6d5b"
                    textAlign="center"
                    mt={2}
                  >
                    Aplica sobre precio regular (Inc. IGV)
                  </Text>
                </Box>
              )}
            </Flex>

            <Divider />

            {/* Precios */}
            <VStack spacing={2} align="stretch">
              {/* Precio Listado y Descuento */}
              <Flex align="center" justify="space-between" gap={2}>
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
                    Descuento: {baseDiscountPct}%
                  </Box>
                )}
              </Flex>

              {/* Precio Normal / Final (Diseño original completo) */}
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
                {hasPromo ? "Precio Normal" : "Precio Final"}: $ {(anteriorPriceConIgv || regularPriceConIgv)?.toFixed(2) || "0.00"} (Inc. IGV)
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