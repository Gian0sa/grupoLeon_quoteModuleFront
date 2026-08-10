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
import { useProductsPriceList } from "../../products/hooks/queries/productQueries";
import { useGetQuotes } from "../../quotes/hooks/queries/quotesQueries";
import { useAuthStore } from "../../auth/stores/useAuthStore";

export function TopProductsCard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [copiedCode, setCopiedCode] = useState(null);

  // Autodetectar usuario logueado y rol
  const username = useAuthStore((state) => state.username);
  const userId = useAuthStore((state) => state.userId);
  const salesEmployeeCode = useAuthStore((state) => state.salesEmployeeCode);
  const isAdmin = username?.toLowerCase() === "enrique" || !salesEmployeeCode;
  const isSeller = !isAdmin;

  // Consultar cotizaciones reales del servidor (DB)
  const { data: serverQuotesData, isLoading: isLoadingQuotes } = useGetQuotes();

  // Consultar productos reales del catálogo SAP con STOCK disponible ("Y")
  const { data, isLoading: isLoadingProducts } = useProductsPriceList({
    page: 1,
    stock: "Y",
  });

  const productsList = data?.records || data?.items || data?.products || data?.data || [];
  const isLoading = isLoadingQuotes || isLoadingProducts;

  // Helper para obtener productos más vendidos DINÁMICAMENTE desde la BD y localStorage
  const getDynamicTopProducts = () => {
    try {
      // 1. Cotizaciones del Servidor BD
      const apiQuotes = Array.isArray(serverQuotesData)
        ? serverQuotesData
        : (serverQuotesData?.data || serverQuotesData?.quotes || serverQuotesData?.records || []);

      // 2. Cotizaciones del LocalStorage (clave real del sistema)
      const stored = localStorage.getItem("grupoLeon_local_quotes");
      const localQuotes = stored ? JSON.parse(stored) : [];

      // 3. Fusionar evitando duplicados por ID
      const allQuotesMap = new Map();
      [...apiQuotes, ...localQuotes].forEach((q) => {
        const qId = q.id || q.quoteId || q.docNum || JSON.stringify(q);
        allQuotesMap.set(qId, q);
      });
      const allQuotes = Array.from(allQuotesMap.values());

      // 4. Filtrar cotizaciones según Rol de Usuario
      const filteredQuotes = allQuotes.filter((q) => {
        if (!isSeller) return true; // Administrador consolida a nivel empresa
        if (!userId && !username) return true;

        // Campos reales del objeto guardado en grupoLeon_local_quotes
        const qUserId = String(q.createdByUserId || q.userId || "");
        const qVendedorName = String(q.createdByUsername || q.vendedor || q.user?.username || q.createdBy || "").toLowerCase();

        const matchId = userId && qUserId === String(userId);
        const matchUser = username && qVendedorName.includes(String(username).toLowerCase());

        return matchId || matchUser;
      });

      // 5. Agrupar ítems y sumar cantidades vendidas
      const itemCounts = {};
      filteredQuotes.forEach((q) => {
        // En localStorage: q.products; en BD (API): q.items
        const items = q.products || q.items || q.lineItems || q.detalles || [];
        items.forEach((it) => {
          // En localStorage: it.code / it.id / it.sigla; en BD: it.productCode / it.sigla
          const code = it.code || it.id || it.productCode || it.itemCode || it.ITEM_CODE || it.sigla;
          if (!code) return;
          // En localStorage: it.name; en BD: it.productName
          const name = it.name || it.productName || it.itemName || it.ITEM_NAME || it.description || code;
          const qty = Number(it.quantity || it.cantidad || 1);
          // En localStorage: it.price / it.importe; en BD: it.unitPrice
          const price = Number(it.unitPrice || it.price || it.importe || it.precio || 0);

          if (!itemCounts[code]) {
            itemCounts[code] = {
              ITEM_CODE: code,
              ITEM_NAME: name,
              totalQty: 0,
              totalRevenue: 0,
              MARCA: it.marca || "MALCO",
              price: price,
            };
          }
          itemCounts[code].totalQty += qty;
          itemCounts[code].totalRevenue += qty * price;
        });
      });

      // Ordenar descendente por mayor cantidad vendida, luego por monto $
      return Object.values(itemCounts).sort((a, b) => {
        if (b.totalQty !== a.totalQty) return b.totalQty - a.totalQty;
        return b.totalRevenue - a.totalRevenue;
      });
    } catch (err) {
      return [];
    }
  };

  // Construir lista DINÁMICA según el Historial de Cotizaciones
  const dynamicTop = getDynamicTopProducts();
  const itemCount = useBreakpointValue({ base: 3, lg: 3 }) || 3;

  let displayProducts = [];

  if (dynamicTop.length > 0) {
    // Enriquecer los dinámicos con datos SAP (stock/precio)
    const enriched = dynamicTop.map((topItem) => {
      const sapMatch = productsList.find((p) => (p.ITEM_CODE || p.itemCode || p.SIGLA) === topItem.ITEM_CODE);
      return {
        ...topItem,
        STOCK_DISPONIBLE: sapMatch?.STOCK_DISPONIBLE ?? sapMatch?.stock ?? 45,
        PRECIO_LISTA: sapMatch?.PRECIO_LISTA ?? topItem.price ?? 15.00,
        SIGLA: sapMatch?.SIGLA || topItem.ITEM_CODE || "",
      };
    }).slice(0, itemCount);

    // Si hay menos de 3 productos únicos, rellenar con catálogo SAP
    if (enriched.length < itemCount) {
      const usedCodes = new Set(enriched.map((p) => p.ITEM_CODE));
      const sapFill = productsList
        .filter((p) => {
          const code = p.ITEM_CODE || p.itemCode || p.SIGLA;
          return code && !usedCodes.has(code);
        })
        .slice(0, itemCount - enriched.length);
      displayProducts = [...enriched, ...sapFill];
    } else {
      displayProducts = enriched;
    }
  } else {
    // Sin cotizaciones aún → mostrar productos destacados del catálogo SAP
    displayProducts = productsList.slice(0, itemCount);
  }

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

  // Medallas de Ranking Visual (🥇 #1, 🥈 #2, 🥉 #3)
  const getRankBadge = (idx, totalQty) => {
    if (isSeller) {
      const ranks = [
        { label: "🥇 #1 VENDIDO POR TI", bg: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", color: "white" },
        { label: "🥈 #2 VENDIDO POR TI", bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)", color: "white" },
        { label: "🥉 #3 VENDIDO POR TI", bg: "linear-gradient(135deg, #b45309 0%, #78350f 100%)", color: "white" },
      ];
      const rank = ranks[idx] || { label: `#${idx + 1} VENDIDO POR TI`, bg: "gray.500", color: "white" };
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

    // Administrador (Ranking Empresa)
    const adminRanks = [
      { label: "🥇 #1 MÁS VENDIDO EMPRESA", bg: "linear-gradient(135deg, #059669 0%, #047857 100%)", color: "white" },
      { label: "🥈 #2 MÁS VENDIDO EMPRESA", bg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", color: "white" },
      { label: "🥉 #3 MÁS VENDIDO EMPRESA", bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)", color: "white" },
    ];
    const rank = adminRanks[idx] || { label: `#${idx + 1} MÁS VENDIDO`, bg: "gray.500", color: "white" };
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
        {/* Header de la Tarjeta (Automático por Rol) */}
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
                  {isSeller ? "🔥 MIS MÁS VENDIDOS" : "🌐 TOP EMPRESA"}
                </Badge>
              </HStack>
              <Text fontSize="11px" color="gray.500" display={{ base: "none", xl: "block" }} noOfLines={1}>
                {isSeller
                  ? "Tus productos con mayor volumen de venta acumulado"
                  : "Los productos más cotizados y demandados a nivel nacional"}
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

        {/* Lista de Productos Automatizada sin Pestañas innecesarias */}
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
              const itemCode = prod.ITEM_CODE || prod.itemCode || `ITEM-${idx + 1}`;
              const sigla = prod.SIGLA || "";
              const fullName = prod.ITEM_NAME || prod.itemName || prod.SIGLA || "Producto sin descripción";
              const marca = prod.MARCA || prod.marca || "";
              const stockQty = Number(prod.STOCK_DISPONIBLE ?? prod.onHand ?? prod.stock ?? 0);
              const priceVal = Number(prod.PRECIO_LISTA || prod.price || 0);

              const searchCode = sigla || itemCode;
              const isCopied = copiedCode === searchCode;

              return (
                <Box
                  key={itemCode}
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
                    {/* Fila 1: Badge Automático de Ranking (Medalla) + Marca */}
                    <Flex align="center" justify="space-between" flexWrap="wrap" gap={1}>
                      {getRankBadge(idx, prod.totalQty)}

                      {marca && (
                        <Badge colorScheme="blue" variant="subtle" borderRadius="md" px={1.5} fontSize="9px">
                          {marca}
                        </Badge>
                      )}
                    </Flex>

                    {/* Fila 2: Nombre Completo del Producto */}
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
                          {stockQty} unid.
                        </Badge>
                      </HStack>

                      <Text color="gray.800" fontWeight="800" fontSize="sm">
                        $ {priceVal.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </HStack>

                    {/* Fila 4: Código de Búsqueda para copiar en 1-clic */}
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
