import React, { useState, useMemo } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Flex,
  Text,
  Button,
  Input,
  Badge,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useToast,
  Spinner,
  InputGroup,
  InputLeftElement,
  Tooltip,
} from "@chakra-ui/react";
import {
  Tag,
  Search,
  RotateCw,
  Sparkles,
  Package,
  Copy,
  Check,
  CheckCircle2,
} from "lucide-react";
import { useGetPromotions } from "../hooks/queries/quotesQueries";
import { fetchActivePromotions } from "../services/promotionService";
import { formatThousands } from "../../../shared/utils/quoteCalculator";

export function ProductPromotionsModal({ isOpen, onClose }) {
  const toast = useToast();
  const { promotions = [], isLoading, isFetching, refetch } = useGetPromotions();
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Filtrado reactivo en tiempo real
  const filteredPromotions = useMemo(() => {
    if (!searchTerm.trim()) return promotions;
    const cleanTerm = searchTerm.toLowerCase().trim();
    return promotions.filter((p) => {
      const code = String(p.productCode || p.itemCode || "").toLowerCase();
      const sigla = String(p.sigla || "").toLowerCase();
      const name = String(p.productName || "").toLowerCase();
      return code.includes(cleanTerm) || sigla.includes(cleanTerm) || name.includes(cleanTerm);
    });
  }, [promotions, searchTerm]);

  // Recarga forzada desde SAP Service Layer
  const handleRefreshFromSap = async () => {
    try {
      setIsRefreshing(true);
      await fetchActivePromotions(true);
      await refetch();
      toast({
        title: "Sincronizado con SAP",
        description: "Se han actualizado las ofertas y promociones oficiales.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Error al sincronizar",
        description: err.message || "No se pudo conectar con SAP Service Layer",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Código copiado",
      description: `Código SKU ${code} copiado al portapapeles.`,
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  };

  const avgDiscount = useMemo(() => {
    if (promotions.length === 0) return 0;
    const sum = promotions.reduce((acc, p) => acc + Number(p.totalDiscountPct || p.discountPct || 0), 0);
    return (sum / promotions.length).toFixed(1);
  }, [promotions]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" isCentered scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(5px)" />
      <ModalContent
        borderRadius="2xl"
        overflow="hidden"
        border="1px solid"
        borderColor="#cbd5e1"
        maxW={{ base: "96vw", sm: "92vw", md: "900px", lg: "1050px" }}
        mx="auto"
        my="auto"
        boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.35)"
      >
        {/* ── ENCABEZADO ELEGANTE ── */}
        <ModalCloseButton
          color="white"
          zIndex={3}
          top={{ base: 3, md: 4 }}
          right={{ base: 3, md: 4 }}
          _hover={{ bg: "whiteAlpha.300" }}
          borderRadius="full"
          size="md"
        />
        <ModalHeader bg="linear-gradient(135deg, #0e572b 0%, #064e3b 100%)" color="white" py={{ base: 3.5, md: 4 }} px={{ base: 4, md: 6 }}>
          <HStack spacing={{ base: 3, md: 4 }} pr={8}>
            <Flex
              w={{ base: "42px", md: "46px" }}
              h={{ base: "42px", md: "46px" }}
              minW={{ base: "42px", md: "46px" }}
              borderRadius="xl"
              bg="rgba(255, 255, 255, 0.16)"
              align="center"
              justify="center"
              color="#fde047"
            >
              <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
            </Flex>
            <Box minW={0}>
              <HStack spacing={2} align="center" wrap="wrap">
                <Text fontSize={{ base: "md", md: "lg" }} fontWeight="900" lineHeight="1.2">
                  Ofertas del Mes y Promociones SAP
                </Text>
                <Badge bg="#10b981" color="white" fontSize="xs" px={2.5} py={0.5} borderRadius="full" fontWeight="900">
                  🏷️ {promotions.length} {promotions.length === 1 ? "artículo" : "artículos"} en oferta
                </Badge>
              </HStack>
              <Text fontSize={{ base: "xs", md: "sm" }} color="#a7f3d0" fontWeight="600" mt={0.5}>
                Consulta oficial de artículos con precio especial de promoción activo en SAP
              </Text>
            </Box>
          </HStack>
        </ModalHeader>

        {/* ── CUERPO DEL MODAL ── */}
        <ModalBody p={{ base: 3.5, sm: 4, md: 5 }} bg="#f8fafc" maxH="82vh" overflowY="auto">
          <VStack align="stretch" spacing={4}>

            {/* ── BARRA SUPERIOR: KPI + BUSCADOR + BOTÓN SINCRONIZAR ── */}
            <Box
              bg="white"
              p={{ base: 3.5, sm: 4 }}
              borderRadius="xl"
              border="1.5px solid"
              borderColor="#e2e8f0"
              boxShadow="0 1px 3px rgba(0,0,0,0.03)"
            >
              <Flex direction={{ base: "column", md: "row" }} justify="space-between" align={{ base: "stretch", md: "center" }} gap={3}>
                <InputGroup maxW={{ base: "full", md: "420px" }}>
                  <InputLeftElement pointerEvents="none">
                    <Search className="w-4 h-4 text-gray-400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Buscar por código, sigla o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    borderRadius="xl"
                    fontSize="sm"
                    borderColor="#cbd5e1"
                    _hover={{ borderColor: "#94a3b8" }}
                    _focus={{ borderColor: "#0e572b", boxShadow: "0 0 0 1px #0e572b" }}
                  />
                </InputGroup>

                <HStack spacing={2} justify="flex-end">
                  <Badge bg="#ecfdf5" color="#047857" border="1px solid #a7f3d0" px={3} py={1.5} borderRadius="lg" fontSize="xs" fontWeight="800">
                    Ahorro promedio: {avgDiscount}%
                  </Badge>

                  <Button
                    leftIcon={<RotateCw className={`w-4 h-4 ${isRefreshing || isFetching ? "animate-spin" : ""}`} />}
                    bg="#0e572b"
                    color="white"
                    _hover={{ bg: "#064e3b" }}
                    _active={{ bg: "#043327" }}
                    size="sm"
                    h="38px"
                    borderRadius="xl"
                    fontWeight="800"
                    fontSize="xs"
                    onClick={handleRefreshFromSap}
                    isLoading={isRefreshing || isFetching}
                    loadingText="Sincronizando..."
                  >
                    Sincronizar SAP
                  </Button>
                </HStack>
              </Flex>
            </Box>

            {/* ── LISTADO DE ARTÍCULOS EN PROMOCIÓN ── */}
            <Box
              bg="white"
              borderRadius="xl"
              border="1.5px solid"
              borderColor="#e2e8f0"
              boxShadow="0 1px 3px rgba(0,0,0,0.03)"
              overflow="hidden"
            >
              {isLoading ? (
                <Flex justify="center" align="center" py={12} direction="column" gap={3}>
                  <Spinner size="lg" color="#0e572b" thickness="3px" />
                  <Text fontSize="sm" fontWeight="700" color="gray.500">
                    Cargando ofertas oficiales desde SAP...
                  </Text>
                </Flex>
              ) : filteredPromotions.length === 0 ? (
                <Box p={10} textAlign="center">
                  <Package className="w-10 h-10 opacity-30 text-gray-400 mx-auto mb-3" />
                  <Text fontSize="md" fontWeight="800" color="#334155">
                    {searchTerm ? "No se encontraron ofertas coincidentes" : "No hay artículos en oferta en este momento"}
                  </Text>
                  <Text fontSize="xs" color="#64748b" mt={1}>
                    {searchTerm
                      ? `No hay resultados para "${searchTerm}". Prueba con otro término.`
                      : "Los artículos con precio promocional vigente aparecerán automáticamente aquí."}
                  </Text>
                </Box>
              ) : (
                <>
                  {/* Vista Desktop (md+) */}
                  <Box display={{ base: "none", md: "block" }}>
                    <TableContainer>
                      <Table variant="simple" size="sm">
                        <Thead bg="#f8fafc">
                          <Tr>
                            <Th py={3} fontSize="xs" fontWeight="900" color="#475569">Artículo / Sigla</Th>
                            <Th py={3} fontSize="xs" fontWeight="900" color="#475569" textAlign="right">P. Lista SAP</Th>
                            <Th py={3} fontSize="xs" fontWeight="900" color="#0e572b" textAlign="right">Precio Oferta</Th>
                            <Th py={3} fontSize="xs" fontWeight="900" color="#475569" textAlign="center">Descuento</Th>
                            <Th py={3} fontSize="xs" fontWeight="900" color="#475569" textAlign="center">Stock</Th>
                            <Th py={3} fontSize="xs" fontWeight="900" color="#475569" textAlign="center">Acción</Th>
                          </Tr>
                        </Thead>
                        <Tbody fontSize="xs">
                          {filteredPromotions.map((p) => {
                            const pLista = Number(p.listPrice || 0);
                            const pPromo = Number(p.promoPrice || 0);
                            const pListaConIgv = Number(p.listPriceConIGV || (pLista * 1.18).toFixed(2));
                            const pPromoConIgv = Number(p.promoPriceConIGV || (pPromo * 1.18).toFixed(2));
                            const totalDisc = Number(p.totalDiscountPct || 0);
                            const extraDisc = Number(p.discountPct || 0);
                            const stock = Number(p.stock || 0);

                            return (
                              <Tr key={p.productCode} _hover={{ bg: "#f8fafc" }} transition="background 0.15s ease">
                                <Td py={3}>
                                  <VStack align="start" spacing={0.5}>
                                    <HStack spacing={1.5}>
                                      {p.sigla && (
                                        <Badge bg="#ecfdf5" color="#065f46" border="1px solid #a7f3d0" fontSize="10px" px={1.5} py={0.2} borderRadius="md" fontWeight="900">
                                          {p.sigla}
                                        </Badge>
                                      )}
                                      <Text fontWeight="800" fontSize="xs" color="#0f172a">
                                        {p.productCode}
                                      </Text>
                                    </HStack>
                                    <Text fontSize="11px" color="gray.600" fontWeight="600" noOfLines={1} title={p.productName}>
                                      {p.productName}
                                    </Text>
                                  </VStack>
                                </Td>
                                <Td py={3} textAlign="right">
                                  <VStack align="flex-end" spacing={0}>
                                    <Text fontWeight="800" color="gray.700" fontFamily="mono">
                                      ${formatThousands(pLista)}
                                    </Text>
                                    <Text fontSize="10px" color="gray.400" fontWeight="600">
                                      ${formatThousands(pListaConIgv)} c/IGV
                                    </Text>
                                  </VStack>
                                </Td>
                                <Td py={3} textAlign="right">
                                  <VStack align="flex-end" spacing={0}>
                                    <HStack spacing={1} align="baseline">
                                      <Text fontSize="sm" fontWeight="950" color="#047857" fontFamily="mono">
                                        ${formatThousands(pPromoConIgv)}
                                      </Text>
                                      <Text fontSize="10px" color="#059669" fontWeight="800">c/IGV</Text>
                                    </HStack>
                                    <Text fontSize="10px" color="gray.500" fontWeight="600">
                                      ${formatThousands(pPromo)} neto
                                    </Text>
                                  </VStack>
                                </Td>
                                <Td py={3} textAlign="center">
                                  <VStack spacing={0.5}>
                                    <Badge bg="#fee2e2" color="#b91c1c" border="1px solid #fca5a5" fontSize="11px" px={2} py={0.5} borderRadius="md" fontWeight="900">
                                      -{totalDisc}%
                                    </Badge>
                                    {extraDisc > 0 && (
                                      <Text fontSize="9px" color="gray.500" fontWeight="700">
                                        (+{extraDisc}% extra)
                                      </Text>
                                    )}
                                  </VStack>
                                </Td>
                                <Td py={3} textAlign="center">
                                  <Badge
                                    colorScheme={stock > 0 ? "green" : "red"}
                                    bg={stock > 0 ? "#dcfce7" : "#fee2e2"}
                                    color={stock > 0 ? "#15803d" : "#b91c1c"}
                                    border="1px solid"
                                    borderColor={stock > 0 ? "#86efac" : "#fca5a5"}
                                    fontSize="10px"
                                    px={2}
                                    py={0.5}
                                    borderRadius="md"
                                    fontWeight="800"
                                  >
                                    {stock > 0 ? `${stock} und.` : "Sin stock"}
                                  </Badge>
                                </Td>
                                <Td py={3} textAlign="center">
                                  <Tooltip label={copiedCode === p.productCode ? "¡Copiado!" : "Copiar SKU para cotizar"} placement="top">
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      leftIcon={copiedCode === p.productCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                                      onClick={() => handleCopyCode(p.productCode)}
                                      borderRadius="lg"
                                      fontSize="11px"
                                      fontWeight="700"
                                      color={copiedCode === p.productCode ? "emerald.700" : "gray.600"}
                                    >
                                      {copiedCode === p.productCode ? "Copiado" : "Copiar"}
                                    </Button>
                                  </Tooltip>
                                </Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </Box>

                  {/* Vista Móvil (< md) */}
                  <VStack spacing={3} align="stretch" display={{ base: "flex", md: "none" }} p={3}>
                    {filteredPromotions.map((p) => {
                      const pLista = Number(p.listPrice || 0);
                      const pPromo = Number(p.promoPrice || 0);
                      const pListaConIgv = Number(p.listPriceConIGV || (pLista * 1.18).toFixed(2));
                      const pPromoConIgv = Number(p.promoPriceConIGV || (pPromo * 1.18).toFixed(2));
                      const totalDisc = Number(p.totalDiscountPct || 0);

                      return (
                        <Box key={p.productCode} p={3.5} bg="white" borderRadius="xl" border="1.5px solid #e2e8f0" boxShadow="xs">
                          <Flex justify="space-between" align="start" gap={2}>
                            <Box flex="1" minW={0}>
                              <HStack spacing={1.5} mb={1}>
                                {p.sigla && (
                                  <Badge bg="#ecfdf5" color="#065f46" fontSize="10px" px={1.5} py={0.2} borderRadius="md" fontWeight="900">
                                    {p.sigla}
                                  </Badge>
                                )}
                                <Text fontSize="xs" fontWeight="800" fontFamily="mono" color="#0f172a">
                                  {p.productCode}
                                </Text>
                              </HStack>
                              <Text fontSize="xs" fontWeight="700" color="gray.800" lineHeight="1.3">
                                {p.productName}
                              </Text>
                            </Box>
                            <Badge bg="#fee2e2" color="#b91c1c" fontSize="xs" px={2} py={0.5} borderRadius="md" fontWeight="900">
                              -{totalDisc}%
                            </Badge>
                          </Flex>

                          <Flex justify="space-between" align="center" mt={3} pt={2.5} borderTop="1px dashed #e2e8f0">
                            <Box>
                              <Text fontSize="10px" color="gray.400" fontWeight="600">P. Lista: ${formatThousands(pListaConIgv)} c/IGV</Text>
                              <Text fontSize="sm" fontWeight="950" color="#047857">
                                Promo: ${formatThousands(pPromoConIgv)} c/IGV <Text as="span" fontSize="10px" color="gray.500">(${formatThousands(pPromo)} neto)</Text>
                              </Text>
                            </Box>
                            <Button
                              size="xs"
                              variant="outline"
                              leftIcon={<Copy className="w-3 h-3" />}
                              onClick={() => handleCopyCode(p.productCode)}
                              borderRadius="md"
                              fontSize="10px"
                              fontWeight="800"
                            >
                              Copiar
                            </Button>
                          </Flex>
                        </Box>
                      );
                    })}
                  </VStack>
                </>
              )}
            </Box>

          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default ProductPromotionsModal;
