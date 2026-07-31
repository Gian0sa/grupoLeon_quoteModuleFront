import React, { useState } from "react";
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  Icon,
  Spinner,
  useToast,
  Tooltip
} from "@chakra-ui/react";
import {
  FiTrendingUp,
  FiArrowRight,
  FiPackage,
  FiCopy,
  FiCheck
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useProductsPriceList } from "../../products/hooks/queries/productQueries";

export function TopProductsCard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [copiedCode, setCopiedCode] = useState(null);

  // Consultar productos reales con STOCK disponible ("Y")
  const { data, isLoading } = useProductsPriceList({
    page: 1,
    stock: "Y",
  });

  // Extraer registros devueltos por el microservicio SAP /reportModule/priceList
  const productsList = data?.records || data?.items || data?.products || data?.data || [];
  const displayProducts = productsList.slice(0, 4);

  const handleCopyCode = (code, e) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "¡Código copiado!",
      description: `Código ${code} listo para buscar en la Lista de Precios.`,
      status: "success",
      duration: 2500,
      isClosable: true,
      position: "bottom-right",
    });

    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  return (
    <Box
      bg="white"
      borderRadius="3xl"
      p={{ base: 4, sm: 5, md: 6 }}
      boxShadow="0 10px 30px rgba(0,0,0,0.04)"
      transition="transform 0.2s, box-shadow 0.2s"
      _hover={{ boxShadow: "0 12px 35px rgba(0,0,0,0.07)" }}
    >
      {/* Header Tarjeta */}
      <Flex align="center" justify="space-between" mb={5} gap={2}>
        <HStack spacing={{ base: 2, sm: 3 }} minW={0} flex={1}>
          <Flex
            w={{ base: "38px", sm: "42px" }}
            h={{ base: "38px", sm: "42px" }}
            borderRadius="2xl"
            bg="green.50"
            align="center"
            justify="center"
            color="green.600"
            flexShrink={0}
          >
            <Icon as={FiTrendingUp} boxSize={5} />
          </Flex>
          <Box minW={0}>
            <HStack spacing={1.5} flexWrap="wrap">
              <Text
                fontSize={{ base: "sm", sm: "md", md: "lg" }}
                fontWeight="800"
                color="gray.800"
                letterSpacing="tight"
                lineHeight="shorter"
              >
                Top Productos y Stock
              </Text>
              <Badge colorScheme="green" borderRadius="full" px={2} py={0.5} fontSize="10px">
                Destacados
              </Badge>
            </HStack>
            <Text fontSize="xs" color="gray.500" display={{ base: "none", sm: "block" }}>
              Haz clic en el código para copiar y buscar de inmediato
            </Text>
          </Box>
        </HStack>

        <Button
          variant="ghost"
          size="xs"
          colorScheme="green"
          rightIcon={<FiArrowRight />}
          onClick={() => navigate("/productsPriceList")}
          flexShrink={0}
          px={1.5}
        >
          Ver Lista
        </Button>
      </Flex>

      {/* Lista de Productos con Nombre Completo ITEM_NAME y Botón de Copiar Código */}
      {isLoading ? (
        <Flex justify="center" align="center" py={8}>
          <Spinner color="green.600" size="md" />
        </Flex>
      ) : displayProducts.length > 0 ? (
        <VStack spacing={3} align="stretch" w="100%">
          {displayProducts.map((prod, idx) => {
            const itemCode = prod.ITEM_CODE || prod.itemCode || `ITEM-${idx + 1}`;
            const sigla = prod.SIGLA || "";
            const fullName = prod.ITEM_NAME || prod.itemName || prod.SIGLA || "Producto sin descripción";
            const marca = prod.MARCA || prod.marca || "";
            const stockQty = Number(prod.STOCK_DISPONIBLE ?? prod.onHand ?? prod.stock ?? 0);
            const hasDiscount = Number(prod.DESCUENTO_PCT || 0) > 0;
            const priceVal = Number(hasDiscount ? prod.PRECIO_DESCUENTO : (prod.PRECIO_LISTA || prod.price || 0));

            const searchCode = sigla || itemCode;
            const isCopied = copiedCode === searchCode;

            return (
              <Box
                key={itemCode}
                p={{ base: 3, sm: 3.5 }}
                borderRadius="2xl"
                bg="gray.50"
                transition="all 0.2s"
                _hover={{ bg: "white", boxShadow: "0 6px 20px rgba(0,0,0,0.06)" }}
              >
                <Flex direction="column" gap={1.5} w="100%">
                  {/* Fila 1: Badges Informativos (Código SAP + Marca) */}
                  <Flex align="center" justify="space-between" flexWrap="wrap" gap={2}>
                    <Badge colorScheme="gray" variant="subtle" borderRadius="md" px={2} py={0.5} fontSize="11px" fontWeight="700">
                      #{itemCode}
                    </Badge>

                    {marca && (
                      <Badge colorScheme="blue" variant="subtle" borderRadius="md" px={2} fontSize="10px">
                        {marca}
                      </Badge>
                    )}
                  </Flex>

                  {/* Fila 2: Nombre Completo y Descripción Comercial del Producto (ITEM_NAME) */}
                  <Text
                    fontWeight="800"
                    fontSize={{ base: "xs", sm: "sm" }}
                    color="gray.800"
                    lineHeight="snug"
                    noOfLines={2}
                  >
                    {fullName}
                  </Text>

                  {/* Fila 3: Botón Ceñido de Copia del Código de Búsqueda */}
                  <Flex align="center" gap={2}>
                    <Tooltip label="Clic para copiar código de búsqueda" hasArrow placement="top-start">
                      <Button
                        size="xs"
                        variant="subtle"
                        colorScheme={isCopied ? "green" : "gray"}
                        bg={isCopied ? "green.100" : "white"}
                        border="1px solid"
                        borderColor={isCopied ? "green.300" : "gray.300"}
                        color={isCopied ? "green.800" : "gray.700"}
                        borderRadius="xl"
                        fontWeight="800"
                        fontSize="11.5px"
                        leftIcon={<Icon as={isCopied ? FiCheck : FiCopy} color={isCopied ? "green.600" : "gray.500"} boxSize={3.5} />}
                        onClick={(e) => handleCopyCode(searchCode, e)}
                        _hover={{ bg: isCopied ? "green.200" : "gray.100", transform: "scale(1.02)" }}
                        px={2.5}
                        h="26px"
                        w="fit-content"
                      >
                        Código: {searchCode}
                      </Button>
                    </Tooltip>
                  </Flex>

                  {/* Fila 4: Stock Disponible real y Precio en DÓLARES ($) */}
                  <HStack spacing={3} fontSize="xs" justify="space-between" pt={0.5}>
                    <HStack spacing={1.5}>
                      <Text color="gray.500" fontWeight="medium">
                        Stock disponible:
                      </Text>
                      <Badge
                        colorScheme={stockQty > 20 ? "green" : "orange"}
                        variant="solid"
                        borderRadius="full"
                        px={2}
                        fontSize="10px"
                        fontWeight="700"
                      >
                        {stockQty} unid.
                      </Badge>
                    </HStack>

                    <Text color="gray.800" fontWeight="800" fontSize="sm">
                      $ {priceVal.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </HStack>
                </Flex>
              </Box>
            );
          })}
        </VStack>
      ) : (
        <Flex
          direction="column"
          align="center"
          justify="center"
          py={6}
          px={4}
          bg="gray.50"
          borderRadius="2xl"
          textAlign="center"
        >
          <Icon as={FiPackage} boxSize={6} color="gray.400" mb={2} />
          <Text fontSize="xs" color="gray.500" fontWeight="medium">
            No hay productos destacados con stock en este momento.
          </Text>
        </Flex>
      )}
    </Box>
  );
}
