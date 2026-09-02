import React, { useState, useMemo } from "react";
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  Icon,
  Skeleton,
  useToast,
  useBreakpointValue,
} from "@chakra-ui/react";
import {
  FiTrendingUp,
  FiArrowRight,
  FiPackage,
  FiCopy,
  FiCheck,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useTopSelledProducts } from "../hooks/queries/dashboardQueries";
import { useAuthStore } from "../../auth/stores/useAuthStore";

export function TopProductsCard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [copiedCode, setCopiedCode] = useState(null);

  // Autodetectar usuario logueado, código de vendedor SAP y rol
  const username = useAuthStore((state) => state.username);
  const role = useAuthStore((state) => state.role);
  const salesEmployeeCode = useAuthStore((state) => state.salesEmployeeCode);

  const isAdmin = role === "ADMIN" || username?.toLowerCase() === "enrique" || role === "FACTURACION";
  const isSeller = !isAdmin;

  // Venta Mensual (Mes actual en curso)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 a 12

  // 1. Consultar Reporte de Órdenes SAP para el mes actual (Carga ultra rápida en ~100ms)
  const { data: topSelledData, isLoading } = useTopSelledProducts({
    yearFrom: currentYear,
    monthFrom: currentMonth,
    monthTo: currentMonth,
    slpCode: isSeller && salesEmployeeCode ? salesEmployeeCode : undefined,
  });

  // Extractor inteligente de marca
  const extractBrand = (prod) => {
    if (!prod) return "GENÉRICO";
    const rawMarca = prod.Marca || prod.MARCA || prod.marca || prod.brand || prod.BrandName;
    if (rawMarca && typeof rawMarca === "string") {
      const clean = rawMarca.trim();
      if (clean && !["S/N", "N/A", "NA", "NULL", "UNDEFINED"].includes(clean.toUpperCase())) {
        return clean;
      }
    }

    const fullName = String(prod.Descripcion_Producto || prod.Nombre_Producto || prod.ITEM_NAME || prod.itemName || prod.name || prod.productName || prod.Descripcion || "").toUpperCase();
    const codeStr = String(prod.Codigo_Producto || prod.ITEM_CODE || prod.itemCode || prod.code || prod.SIGLA || "").toUpperCase();

    const knownBrands = ["WYNNNS", "DARUMA", "MALCO", "BOSCH", "DENSO", "NGK", "MOBIL", "SHELL", "TOTAL", "CASTROL", "MOTUL", "VALVOLINE", "MAHLE", "MANN", "PRESTONE", "WAGNER"];
    for (const b of knownBrands) {
      if (fullName.includes(b) || codeStr.includes(b)) return b;
    }

    const words = fullName.split(/\s+/).filter(w => w.length >= 3 && !/^\d+$/.test(w));
    if (words.length > 0) return words[words.length - 1];
    return "GENÉRICO";
  };

  const itemCount = useBreakpointValue({ base: 3, lg: 3 }) || 3;

  // 2. Construir lista final con Nombres y Métricas Reales directo de SAP
  const displayProducts = useMemo(() => {
    const rawList = Array.isArray(topSelledData)
      ? topSelledData
      : (topSelledData?.data || topSelledData?.records || []);

    const mapped = rawList.map((topItem) => {
      const code = String(topItem.Codigo_Producto || topItem.ITEM_CODE || topItem.itemCode || topItem.code || "").trim().toUpperCase();
      const rawName = topItem.Descripcion_Producto || topItem.Nombre_Producto || topItem.ITEM_NAME || topItem.itemName;
      const cleanName = rawName || `Producto ${code}`;
      const brand = extractBrand(topItem);
      const stock = Number(topItem.Stock_Actual_Almacen_014 ?? topItem.STOCK_DISPONIBLE ?? 0);
      const qty = Number(topItem.Cantidad_Total_Pedida || topItem.totalQty || 1);
      const totalAmount = Number(topItem.Monto_Total_Vendido || 0);
      const unitPrice = qty > 0 && totalAmount > 0 ? (totalAmount / qty) : Number(topItem.Precio_Unidad || topItem.PRECIO_LISTA || 0);

      return {
        ITEM_CODE: code,
        ITEM_NAME: cleanName,
        SIGLA: code,
        MARCA: brand,
        STOCK_DISPONIBLE: stock,
        PRECIO_LISTA: unitPrice,
        totalQty: qty,
      };
    }).filter(p => p.ITEM_CODE);

    return mapped.slice(0, itemCount);
  }, [topSelledData, itemCount]);

  const handleCopyCode = (code, e) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "¡Código copiado!",
      description: `Código ${code} listo para buscar en el Cotizador.`,
      status: "success",
      duration: 2500,
      isClosable: true,
      position: "bottom-right",
    });

    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  // Medallas de Ranking Visual
  const getRankBadge = (idx) => {
    if (isSeller) {
      const ranks = [
        { label: "🥇 #1 MÁS VENDIDO MES", bg: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", color: "white" },
        { label: "🥈 #2 MÁS VENDIDO MES", bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)", color: "white" },
        { label: "🥉 #3 MÁS VENDIDO MES", bg: "linear-gradient(135deg, #b45309 0%, #78350f 100%)", color: "white" },
      ];
      const rank = ranks[idx] || { label: `#${idx + 1} MÁS VENDIDO`, bg: "gray.500", color: "white" };
      return (
        <Badge
          style={{ background: rank.bg, color: rank.color }}
          borderRadius="full"
          px={2.5}
          py={0.5}
          fontSize="9.5px"
          fontWeight="800"
        >
          {rank.label}
        </Badge>
      );
    }

    const adminRanks = [
      { label: "🥇 #1 MÁS VENDIDO EMPRESA", bg: "linear-gradient(135deg, #059669 0%, #047857 100%)", color: "white" },
      { label: "🥈 #2 MÁS VENDIDO EMPRESA", bg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", color: "white" },
      { label: "🥉 #3 MÁS VENDIDO EMPRESA", bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)", color: "white" },
    ];
    const rank = adminRanks[idx] || { label: `#${idx + 1} MÁS VENDIDO EMPRESA`, bg: "gray.500", color: "white" };
    return (
      <Badge
        style={{ background: rank.bg, color: rank.color }}
        borderRadius="full"
        px={2.5}
        py={0.5}
        fontSize="9.5px"
        fontWeight="800"
      >
        {rank.label}
      </Badge>
    );
  };

  return (
    <Box
      w="full"
      h="100%"
      bg="white"
      borderRadius="3xl"
      p={{ base: 3, sm: 3.5, lg: 4 }}
      boxShadow="0 10px 30px rgba(0,0,0,0.04)"
      transition="transform 0.2s, box-shadow 0.2s"
      _hover={{ boxShadow: "0 12px 35px rgba(0,0,0,0.07)" }}
      flex={1}
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      overflow="hidden"
    >
      <Box flex={1} display="flex" flexDirection="column" justify="space-between">
        {/* Header de la Tarjeta (Automático por Rol y Periodo Mensual) */}
        <Flex align="center" justify="space-between" mb={2.5} gap={2}>
          <HStack spacing={{ base: 2, sm: 2.5 }} minW={0} flex={1}>
            <Flex
              w={{ base: "34px", sm: "38px" }}
              h={{ base: "34px", sm: "38px" }}
              borderRadius="xl"
              bg="green.50"
              align="center"
              justify="center"
              color="green.600"
              flexShrink={0}
            >
              <Icon as={FiTrendingUp} boxSize={4} />
            </Flex>
            <Box minW={0}>
              <HStack spacing={1.5} flexWrap="nowrap" align="center">
                <Text
                  fontSize={{ base: "xs", sm: "sm" }}
                  fontWeight="800"
                  color="gray.800"
                  letterSpacing="tight"
                  lineHeight="shorter"
                  whiteSpace="nowrap"
                >
                  Top Productos
                </Text>
                <Badge
                  colorScheme={isSeller ? "green" : "blue"}
                  borderRadius="full"
                  px={2}
                  py={0.2}
                  fontSize="9px"
                  fontWeight="800"
                  flexShrink={0}
                >
                  {isSeller ? "🔥 MIS MÁS VENDIDOS (MES)" : "🌐 TOP EMPRESA (MES)"}
                </Badge>
              </HStack>
              <Text fontSize="11px" color="gray.500" display={{ base: "none", xl: "block" }} noOfLines={1}>
                {isSeller
                  ? "Tus productos con mayor récord de ventas este mes"
                  : "Los productos más vendidos a nivel empresa este mes"}
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
            px={1}
            fontSize="11px"
          >
            Ver Lista
          </Button>
        </Flex>

        {/* Lista de Productos Automatizada */}
        {isLoading ? (
          <VStack spacing={2} align="stretch" w="100%">
            {[...Array(3)].map((_, i) => (
              <Box
                key={i}
                p={2}
                borderRadius="xl"
                border="1px solid"
                borderColor="gray.100"
                bg="white"
              >
                <Skeleton height="12px" width="80%" mb={1.5} borderRadius="md" />
                <Skeleton height="22px" width="38%" mb={1.5} borderRadius="lg" />
              </Box>
            ))}
          </VStack>
        ) : displayProducts.length > 0 ? (
          <VStack spacing={2} align="stretch" w="100%">
            {displayProducts.map((prod, idx) => {
              const itemCode = prod.ITEM_CODE || `ITEM-${idx + 1}`;
              const sigla = prod.SIGLA || itemCode;
              const fullName = prod.ITEM_NAME || "Producto sin descripción";
              const marca = prod.MARCA || "GENÉRICO";
              const stockQty = Number(prod.STOCK_DISPONIBLE ?? 0);
              const priceVal = Number(prod.PRECIO_LISTA ?? 0);

              const searchCode = sigla || itemCode;
              const isCopied = copiedCode === searchCode;

              return (
                <Box
                  key={`${itemCode}-${idx}`}
                  py={1.5}
                  px={2.5}
                  borderRadius="xl"
                  bg="gray.50"
                  border="1px solid"
                  borderColor="gray.100"
                  transition="all 0.2s"
                  _hover={{ bg: "white", boxShadow: "0 4px 14px rgba(0,0,0,0.05)", borderColor: "green.300" }}
                >
                  <Flex direction="column" gap={1.5} w="100%">
                    {/* Fila 1: Badge Automático de Ranking (Medalla) + Marca Real SAP */}
                    <Flex align="center" justify="space-between" flexWrap="wrap" gap={1}>
                      {getRankBadge(idx)}

                      {marca && (
                        <Badge colorScheme="blue" variant="subtle" borderRadius="md" px={1.5} fontSize="9px">
                          {marca}
                        </Badge>
                      )}
                    </Flex>

                    {/* Fila 2: Nombre Completo del Producto (NUNCA el código numérico) */}
                    <Text
                      fontWeight="850"
                      fontSize="xs"
                      color="gray.850"
                      lineHeight="shorter"
                      noOfLines={1}
                      title={fullName}
                    >
                      {fullName}
                    </Text>

                    {/* Fila 3: Stock Disponible + Precio en Dólares ($) */}
                    <HStack spacing={3} fontSize="xs" justify="space-between" pt={0.5}>
                      <HStack spacing={1.5}>
                        <Text color="gray.500" fontWeight="medium">
                          Stock:
                        </Text>
                        <Badge
                          colorScheme={stockQty > 20 ? "green" : stockQty > 0 ? "orange" : "red"}
                          variant="solid"
                          borderRadius="full"
                          px={2}
                          fontSize="10px"
                          fontWeight="700"
                        >
                          {stockQty.toLocaleString("es-PE")} unid.
                        </Badge>
                      </HStack>

                      <Text color="gray.800" fontWeight="800" fontSize="sm">
                        $ {priceVal.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </HStack>

                    {/* Fila 4: Código o Sigla de Búsqueda para copiar en 1-clic */}
                    <Flex align="center" justify="flex-start" gap={2} pt={1}>
                      <Button
                        size="xs"
                        variant="subtle"
                        colorScheme={isCopied ? "green" : "gray"}
                        bg={isCopied ? "green.100" : "white"}
                        border="1px solid"
                        borderColor={isCopied ? "green.300" : "gray.300"}
                        color={isCopied ? "green.800" : "gray.700"}
                        borderRadius="lg"
                        fontWeight="700"
                        fontSize="10px"
                        leftIcon={<Icon as={isCopied ? FiCheck : FiCopy} color={isCopied ? "green.600" : "gray.500"} boxSize={3} />}
                        onClick={(e) => handleCopyCode(searchCode, e)}
                        _hover={{ bg: isCopied ? "green.200" : "gray.100" }}
                        h="24px"
                      >
                        Código: {searchCode}
                      </Button>
                    </Flex>
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
            py={5}
            px={4}
            bg="gray.50"
            borderRadius="2xl"
            textAlign="center"
          >
            <Icon as={FiPackage} boxSize={7} color="gray.400" mb={2} />
            <Text fontSize="xs" color="gray.700" fontWeight="bold">
              Cargando catálogo destacado...
            </Text>
          </Flex>
        )}
      </Box>

      {/* Footer de la Tarjeta */}
      <Box pt={3} mt="auto" borderTop="1px solid" borderColor="gray.100">
        <Button
          size="xs"
          variant="ghost"
          colorScheme="green"
          rightIcon={<FiArrowRight />}
          onClick={() => navigate("/productsPriceList")}
          w="100%"
          fontWeight="700"
        >
          Ver catálogo completo de productos
        </Button>
      </Box>
    </Box>
  );
}
