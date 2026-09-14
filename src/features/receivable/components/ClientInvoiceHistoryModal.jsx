import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Button,
  Badge,
  HStack,
  VStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Spinner,
  useToast,
  Flex,
  Divider,
  Tooltip,
} from "@chakra-ui/react";
import {
  History,
  Download,
  CheckCircle2,
  Clock,
  Search,
  FileText,
  AlertCircle,
  Calendar,
  DollarSign,
  Copy,
  Check,
  Building2,
  RefreshCw,
} from "lucide-react";
import { getClientInvoicesHistory } from "../services/receivableService";
import { downloadInvoicePDFdirectly } from "../../../features/reports/utils/pdfGenerators";

export function ClientInvoiceHistoryModal({
  isOpen,
  onClose,
  clientDocOrCode = null,
  clientName = null,
}) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all' | 'paid' | 'open'
  const [downloadingRef, setDownloadingRef] = useState(null);
  const [copiedRef, setCopiedRef] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && clientDocOrCode) {
      fetchHistory(clientDocOrCode, 0, false);
    } else {
      setData(null);
      setError(null);
      setSearchTerm("");
      setFilterType("all");
    }
  }, [isOpen, clientDocOrCode]);

  const fetchHistory = async (doc, newSkip = 0, isAppend = false) => {
    if (isAppend) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await getClientInvoicesHistory(doc, { top: 20, skip: newSkip });
      setData((prev) => {
        if (!isAppend || !prev) return res;
        return {
          ...res,
          invoices: [...(prev.invoices || []), ...(res.invoices || [])],
        };
      });
    } catch (err) {
      console.error("Error cargando historial de facturas:", err);
      if (!isAppend) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "No se pudo consultar el historial de facturas en SAP."
        );
      } else {
        toast({
          title: "Error al cargar más facturas",
          description: err.response?.data?.message || err.message,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleDownloadPdf = async (referenceCode) => {
    if (!referenceCode) return;
    setDownloadingRef(referenceCode);
    try {
      await downloadInvoicePDFdirectly(referenceCode);
      toast({
        title: "📄 Descarga iniciada",
        description: `Descargando comprobante ${referenceCode}.pdf`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error("Error al descargar PDF:", err);
      toast({
        title: "No se pudo descargar el comprobante",
        description:
          err.message ||
          "El comprobante no está disponible en TeFacturo o es un documento físico antiguo.",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
    } finally {
      setDownloadingRef(null);
    }
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Filtrado reactivo en memoria
  const filteredInvoices = useMemo(() => {
    if (!data?.invoices) return [];
    let list = data.invoices;

    if (filterType === "paid") {
      list = list.filter((inv) => inv.isPaid);
    } else if (filterType === "open") {
      list = list.filter((inv) => !inv.isPaid);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (inv) =>
          inv.displayDocNumber?.toLowerCase().includes(term) ||
          inv.numAtCard?.toLowerCase().includes(term) ||
          inv.reference?.toLowerCase().includes(term) ||
          inv.docDate?.includes(term) ||
          inv.condition?.toLowerCase().includes(term)
      );
    }

    return list;
  }, [data?.invoices, filterType, searchTerm]);

  const counts = useMemo(() => {
    const invoices = data?.invoices || [];
    return {
      all: invoices.length,
      paid: invoices.filter((i) => i.isPaid).length,
      open: invoices.filter((i) => !i.isPaid).length,
    };
  }, [data?.invoices]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "full", md: "3xl" }}
      isCentered
      scrollBehavior="inside"
    >
      <ModalOverlay bg="rgba(15, 23, 42, 0.65)" backdropFilter="blur(4px)" />
      <ModalContent
        borderRadius={{ base: "none", md: "24px" }}
        overflow="hidden"
        boxShadow={{ base: "none", md: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
        my={{ base: 0, md: 6 }}
        maxH={{ base: "100vh", md: "90vh" }}
        h={{ base: "100vh", md: "auto" }}
        display="flex"
        flexDirection="column"
        bg="#ffffff"
      >
        {/* Cabecera Premium Responsive */}
        <ModalHeader
          bg="linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
          color="#ffffff"
          py={{ base: 3.5, md: 4.5 }}
          px={{ base: 4, md: 6 }}
          borderBottom="1px solid #334155"
          flexShrink={0}
        >
          <Flex align="center" justify="space-between" pr={{ base: 8, md: 8 }}>
            <HStack spacing={3} minW={0} flex={1}>
              <Box
                p={{ base: 2, md: 2.5 }}
                borderRadius="12px"
                bg="rgba(56, 189, 248, 0.15)"
                color="#38bdf8"
                flexShrink={0}
              >
                <History size={20} />
              </Box>
              <Box minW={0} flex={1}>
                <HStack spacing={2} align="center" wrap="wrap">
                  <Text
                    fontSize={{ base: "15px", sm: "16px", md: "18px" }}
                    fontWeight="800"
                    letterSpacing="-0.02em"
                    lineHeight="short"
                  >
                    Historial de Facturación SAP
                  </Text>
                  {data?.totalCount !== undefined && (
                    <Badge
                      bg="rgba(56, 189, 248, 0.15)"
                      color="#7dd3fc"
                      border="1px solid rgba(56, 189, 248, 0.3)"
                      borderRadius="full"
                      px={2}
                      py={0.5}
                      fontSize="11px"
                      fontWeight="800"
                      flexShrink={0}
                    >
                      {data.totalCount} docs
                    </Badge>
                  )}
                </HStack>
                <HStack
                  spacing={1.5}
                  mt={0.5}
                  color="#94a3b8"
                  fontSize={{ base: "12px", md: "13px" }}
                  fontWeight="500"
                  wrap="wrap"
                >
                  <Building2 size={13} />
                  <Text
                    fontWeight="700"
                    color="#f1f5f9"
                    isTruncated
                    maxW={{ base: "170px", sm: "260px", md: "360px" }}
                  >
                    {data?.client?.cardName || clientName || "Cliente"}
                  </Text>
                  <Text>•</Text>
                  <Text flexShrink={0}>
                    {data?.client?.ruc ? `RUC: ${data.client.ruc}` : clientDocOrCode}
                  </Text>
                </HStack>
              </Box>
            </HStack>

            <Tooltip label="Actualizar desde SAP" placement="left">
              <Button
                size="sm"
                variant="ghost"
                color="#94a3b8"
                _hover={{ color: "#ffffff", bg: "rgba(255,255,255,0.1)" }}
                onClick={() => fetchHistory(clientDocOrCode)}
                isLoading={loading}
                borderRadius="full"
                p={2}
                flexShrink={0}
              >
                <RefreshCw size={16} />
              </Button>
            </Tooltip>
          </Flex>
        </ModalHeader>
        <ModalCloseButton color="#ffffff" top={{ base: 3, md: 4 }} right={{ base: 3, md: 4 }} />

        {/* ModalBody con scroll táctil garantizado y flex: 1 */}
        <ModalBody
          p={{ base: 3, md: 6 }}
          bg="#f8fafc"
          overflowY="auto"
          flex="1"
          minH={0}
          overscrollBehavior="contain"
          sx={{
            WebkitOverflowScrolling: "touch",
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: "#f1f5f9",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "#cbd5e1",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "#94a3b8",
            },
          }}
        >
          {/* Barra de Filtros y Búsqueda */}
          <VStack spacing={{ base: 2.5, md: 4 }} align="stretch" mb={{ base: 3, md: 5 }} flexShrink={0}>
            <Flex
              direction={{ base: "column", md: "row" }}
              gap={2.5}
              justify="space-between"
              align={{ base: "stretch", md: "center" }}
            >
              {/* Pestañas de estado con scroll horizontal */}
              <HStack
                spacing={2}
                overflowX="auto"
                py={1}
                px={0.5}
                w={{ base: "full", md: "auto" }}
                flexShrink={0}
                css={{
                  "&::-webkit-scrollbar": { display: "none" },
                  scrollbarWidth: "none",
                }}
              >
                <Button
                  size="sm"
                  borderRadius="full"
                  px={3.5}
                  h="32px"
                  fontWeight="700"
                  fontSize="12px"
                  flexShrink={0}
                  whiteSpace="nowrap"
                  bg={filterType === "all" ? "#0f172a" : "#ffffff"}
                  color={filterType === "all" ? "#ffffff" : "#64748b"}
                  border="1px solid"
                  borderColor={filterType === "all" ? "#0f172a" : "#e2e8f0"}
                  _hover={{ bg: filterType === "all" ? "#1e293b" : "#f1f5f9" }}
                  onClick={() => setFilterType("all")}
                >
                  Todas ({counts.all})
                </Button>

                <Button
                  size="sm"
                  borderRadius="full"
                  px={3.5}
                  h="32px"
                  fontWeight="700"
                  fontSize="12px"
                  flexShrink={0}
                  whiteSpace="nowrap"
                  bg={filterType === "paid" ? "#15803d" : "#ffffff"}
                  color={filterType === "paid" ? "#ffffff" : "#15803d"}
                  border="1px solid"
                  borderColor={filterType === "paid" ? "#15803d" : "#bbf7d0"}
                  _hover={{ bg: filterType === "paid" ? "#166534" : "#f0fdf4" }}
                  onClick={() => setFilterType("paid")}
                >
                  Pagadas ({counts.paid})
                </Button>

                <Button
                  size="sm"
                  borderRadius="full"
                  px={3.5}
                  h="32px"
                  fontWeight="700"
                  fontSize="12px"
                  flexShrink={0}
                  whiteSpace="nowrap"
                  bg={filterType === "open" ? "#ea580c" : "#ffffff"}
                  color={filterType === "open" ? "#ffffff" : "#ea580c"}
                  border="1px solid"
                  borderColor={filterType === "open" ? "#ea580c" : "#fed7aa"}
                  _hover={{ bg: filterType === "open" ? "#c2410c" : "#fff7ed" }}
                  onClick={() => setFilterType("open")}
                >
                  Pendientes ({counts.open})
                </Button>
              </HStack>

              {/* Input buscador rápido */}
              <InputGroup size="sm" w={{ base: "full", md: "260px" }}>
                <InputLeftElement pointerEvents="none" color="#94a3b8">
                  <Search size={14} />
                </InputLeftElement>
                <Input
                  placeholder="Buscar N° factura o fecha..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  borderRadius="full"
                  bg="#ffffff"
                  borderColor="#cbd5e1"
                  _focus={{ borderColor: "#0284c7", boxShadow: "0 0 0 1px #0284c7" }}
                  fontSize="12px"
                  h="32px"
                />
              </InputGroup>
            </Flex>
          </VStack>

          {/* Contenido Principal */}
          {loading ? (
            <Flex direction="column" align="center" justify="center" py={16} gap={4}>
              <Spinner size="xl" thickness="3px" color="#0284c7" />
              <VStack spacing={1}>
                <Text fontWeight="700" color="#334155" fontSize="15px">
                  Consultando facturas en SAP Business One...
                </Text>
                <Text fontSize="13px" color="#64748b">
                  Extrayendo historial comercial y referencias de TeFacturo
                </Text>
              </VStack>
            </Flex>
          ) : error ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              p={8}
              bg="#fef2f2"
              borderRadius="16px"
              border="1px dashed #f87171"
              gap={3}
            >
              <AlertCircle size={32} color="#dc2626" />
              <Text fontWeight="700" color="#991b1b" fontSize="14px">
                {error}
              </Text>
              <Button
                size="sm"
                colorScheme="red"
                onClick={() => fetchHistory(clientDocOrCode)}
                leftIcon={<RefreshCw size={14} />}
                borderRadius="full"
              >
                Reintentar
              </Button>
            </Flex>
          ) : filteredInvoices.length === 0 ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py={14}
              bg="#ffffff"
              borderRadius="18px"
              border="1px dashed #cbd5e1"
              gap={2}
            >
              <FileText size={36} color="#94a3b8" />
              <Text fontWeight="700" color="#475569" fontSize="15px">
                No se encontraron comprobantes
              </Text>
              <Text fontSize="13px" color="#94a3b8">
                {searchTerm
                  ? `No hay facturas que coincidan con "${searchTerm}"`
                  : "No hay registros registrados en SAP para los filtros seleccionados."}
              </Text>
            </Flex>
          ) : (
            <VStack spacing={3} align="stretch">
              {filteredInvoices.map((inv, idx) => {
                const isPaid = inv.isPaid;
                const isDownloading = downloadingRef === inv.reference;
                const isCopied = copiedRef === inv.reference;

                return (
                  <Box
                    key={inv.docEntry || idx}
                    p={{ base: 3.5, sm: 4 }}
                    bg="#ffffff"
                    borderRadius={{ base: "14px", sm: "18px" }}
                    border="1px solid"
                    borderColor={isPaid ? "#e2e8f0" : "#fed7aa"}
                    boxShadow="0 2px 6px rgba(0,0,0,0.03)"
                    transition="all 0.2s ease"
                    _hover={{
                      transform: "translateY(-1px)",
                      boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
                      borderColor: isPaid ? "#cbd5e1" : "#f97316",
                    }}
                  >
                    {/* Fila 1: Badges y Monto */}
                    <Flex justify="space-between" align="center" mb={2} wrap="wrap" gap={1}>
                      <HStack spacing={1.5} wrap="wrap">
                        <Badge
                          bg="#f1f5f9"
                          color="#334155"
                          px={2.5}
                          py={0.5}
                          borderRadius="md"
                          fontSize="11px"
                          fontWeight="700"
                        >
                          {inv.displayDocNumber?.startsWith("BOL")
                            ? "BOLETA"
                            : inv.displayDocNumber?.startsWith("NC")
                            ? "NOTA CRÉDITO"
                            : "FACTURA"}
                        </Badge>

                        {isPaid ? (
                          <Badge
                            bg="#dcfce7"
                            color="#15803d"
                            px={2.5}
                            py={0.5}
                            borderRadius="md"
                            fontSize="11px"
                            fontWeight="800"
                            display="flex"
                            alignItems="center"
                            gap={1}
                          >
                            <CheckCircle2 size={12} /> PAGADO
                          </Badge>
                        ) : (
                          <Badge
                            bg="#fee2e2"
                            color="#b91c1c"
                            px={2.5}
                            py={0.5}
                            borderRadius="md"
                            fontSize="11px"
                            fontWeight="800"
                            display="flex"
                            alignItems="center"
                            gap={1}
                          >
                            <Clock size={12} /> PENDIENTE
                          </Badge>
                        )}
                      </HStack>

                      {/* Monto prominente */}
                      <Text
                        fontSize={{ base: "16px", sm: "17px" }}
                        fontWeight="800"
                        color={isPaid ? "#0f172a" : "#dc2626"}
                        letterSpacing="-0.02em"
                      >
                        {inv.currency === "USD"
                          ? `$ ${Number(inv.totalFc || inv.total).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : `S/ ${Number(inv.total).toLocaleString("es-PE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`}
                      </Text>
                    </Flex>

                    {/* Fila 2: N° Documento y Detalles */}
                    <Flex
                      direction={{ base: "column", sm: "row" }}
                      justify="space-between"
                      align={{ base: "flex-start", sm: "center" }}
                      gap={1}
                      mb={2.5}
                    >
                      <HStack spacing={2} align="center">
                        <Text fontSize={{ base: "14px", sm: "15px" }} fontWeight="800" color="#0f172a">
                          {inv.displayDocNumber || inv.numAtCard}
                        </Text>
                        {inv.reference && (
                          <Tooltip label={isCopied ? "¡Copiado!" : "Copiar referencia"} placement="top">
                            <Button
                              size="xs"
                              variant="ghost"
                              p={1}
                              h="24px"
                              minW="24px"
                              color="#64748b"
                              _hover={{ bg: "#f1f5f9", color: "#0f172a" }}
                              onClick={() => handleCopy(inv.reference)}
                            >
                              {isCopied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                            </Button>
                          </Tooltip>
                        )}
                      </HStack>

                      <Text fontSize="11.5px" color="#64748b" fontWeight="600">
                        {inv.condition}
                      </Text>
                    </Flex>

                    {/* Fila 3: Fechas y N° SAP */}
                    <Flex
                      wrap="wrap"
                      gap={{ base: 2, sm: 4 }}
                      align="center"
                      fontSize={{ base: "11px", sm: "12px" }}
                      color="#64748b"
                      py={2}
                      px={3}
                      bg="#f8fafc"
                      borderRadius="10px"
                      mb={3}
                    >
                      <HStack spacing={1}>
                        <Calendar size={13} color="#94a3b8" />
                        <Text>Emisión:</Text>
                        <Text fontWeight="700" color="#334155">
                          {inv.docDate || "—"}
                        </Text>
                      </HStack>

                      <HStack spacing={1}>
                        <Clock size={13} color="#94a3b8" />
                        <Text>Vence:</Text>
                        <Text fontWeight="700" color="#334155">
                          {inv.docDueDate || "—"}
                        </Text>
                      </HStack>

                      <HStack spacing={1}>
                        <Text color="#94a3b8">DocNum SAP:</Text>
                        <Text fontWeight="700" color="#334155">
                          {inv.docNum}
                        </Text>
                      </HStack>
                    </Flex>

                    {/* Fila 4: Botón de Descarga PDF TeFacturo */}
                    {inv.reference ? (
                      <Button
                        w="full"
                        size="sm"
                        variant="outline"
                        bg="#ffffff"
                        borderColor="#cbd5e1"
                        color="#0f172a"
                        _hover={{ bg: "#f0fdf4", borderColor: "#16a34a", color: "#16a34a" }}
                        borderRadius="12px"
                        h="36px"
                        fontWeight="700"
                        fontSize={{ base: "11.5px", sm: "12.5px" }}
                        leftIcon={<Download size={14} color="#16a34a" />}
                        onClick={() => handleDownloadPdf(inv.reference)}
                        isLoading={isDownloading}
                        loadingText="Generando comprobante..."
                      >
                        <Text isTruncated>Descargar PDF ({inv.reference})</Text>
                      </Button>
                    ) : (
                      <Button
                        w="full"
                        size="sm"
                        variant="ghost"
                        isDisabled
                        borderRadius="12px"
                        h="36px"
                        fontSize="11.5px"
                        color="#94a3b8"
                        bg="#f8fafc"
                      >
                        PDF no disponible en emisor
                      </Button>
                    )}
                  </Box>
                );
              })}

              {/* Botón de Cargar Más Facturas (Paginación OData SAP) */}
              {data?.hasMore && (
                <Box textAlign="center" pt={3} pb={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="blue"
                    borderColor="#38bdf8"
                    color="#0284c7"
                    _hover={{ bg: "#f0f9ff" }}
                    borderRadius="full"
                    px={6}
                    h="38px"
                    fontWeight="700"
                    fontSize="13px"
                    isLoading={loadingMore}
                    loadingText="Consultando más facturas en SAP..."
                    onClick={() =>
                      fetchHistory(
                        clientDocOrCode,
                        data.nextSkip || data.invoices?.length || 0,
                        true
                      )
                    }
                    leftIcon={<RefreshCw size={14} />}
                  >
                    Cargar más facturas ({data.invoices?.length || 0} cargadas)
                  </Button>
                </Box>
              )}

              {/* Espaciador inferior para garantizar scroll completo en teléfonos */}
              <Box pb={{ base: 8, md: 4 }} />
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default ClientInvoiceHistoryModal;
