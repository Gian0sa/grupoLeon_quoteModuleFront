import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Flex,
  Text,
  Badge,
  HStack,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Button,
  Grid,
  GridItem,
  Spinner,
  useToast,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import {
  Download,
  Printer,
  FileText,
  Building,
  User,
  CreditCard,
  Truck,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Phone,
  Clock,
} from "lucide-react";
import { fetchPublicQuoteByCode } from "../utils/quoteTokenUtils";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";
import {
  formatPaymentTerms,
  formatDeliveryForm,
  cleanClientName,
  formatQuoteSellerName,
} from "../../../shared/utils/quoteLogisticsFormatters";
import QuotePdfDocument from "../components/QuotePdfDocument";

const extractProducts = (q) => {
  if (!q) return [];
  if (Array.isArray(q.products) && q.products.length > 0) return q.products;
  if (Array.isArray(q.items) && q.items.length > 0) return q.items;
  if (Array.isArray(q.lines) && q.lines.length > 0) return q.lines;
  if (Array.isArray(q.DocumentLines) && q.DocumentLines.length > 0) return q.DocumentLines;
  if (q.totals && Array.isArray(q.totals.normalizedProducts) && q.totals.normalizedProducts.length > 0) return q.totals.normalizedProducts;
  if (q.totals && Array.isArray(q.totals.products) && q.totals.products.length > 0) return q.totals.products;
  if (typeof q.products === "string") {
    try { const p = JSON.parse(q.products); if (Array.isArray(p)) return p; } catch (e) {}
  }
  if (typeof q.items === "string") {
    try { const p = JSON.parse(q.items); if (Array.isArray(p)) return p; } catch (e) {}
  }
  return [];
};

export function ClientQuoteSharePage() {
  const { code, token } = useParams();
  const quoteCode = code || token;
  const navigate = useNavigate();
  const toast = useToast();

  const [quote, setQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showTableDetails, setShowTableDetails] = useState(false);

  const pdfRef = useRef(null);

  // Auto-ajuste de escala para pantallas móviles
  const handleAutoFit = () => {
    const availableW = window.innerWidth - 32;
    const fitScale = Math.min(1, Math.max(0.35, availableW / 820));
    setZoomLevel(Number(fitScale.toFixed(2)));
  };

  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 840) {
        handleAutoFit();
      } else {
        setZoomLevel(1);
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Carga de la cotización por su código corto
  useEffect(() => {
    if (!quoteCode) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setHasError(false);

    fetchPublicQuoteByCode(quoteCode)
      .then((data) => {
        if (isMounted) {
          if (data) {
            setQuote(data);
          } else {
            setHasError(true);
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error al cargar cotización:", err);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [quoteCode]);

  // Detección de emisión a SAP
  const isEmittedToSap = useMemo(() => {
    if (!quote) return false;
    return Boolean(
      (quote.sapDocNum && String(quote.sapDocNum).trim() !== "") ||
      (quote.DocNum && !String(quote.DocNum).startsWith("COT-")) ||
      (quote.docNum && !String(quote.docNum).startsWith("COT-")) ||
      quote.status === "EMITIDO" ||
      quote.status === "EMITIDO_SAP" ||
      quote.status === "APROBADO_SAP" ||
      quote.isSyncedToSap === true
    );
  }, [quote]);

  const docTypeName = isEmittedToSap ? "Orden de Venta" : "Cotización";
  const docNumber = useMemo(() => {
    if (!quote) return "COT-PENDIENTE";
    if (isEmittedToSap) {
      return quote.sapDocNum || quote.DocNum || quote.docNum || quote.docNumber || "OV-PENDIENTE";
    }
    return quote.docNumber || (quote.id ? `COT-${String(quote.id).padStart(5, "0")}` : "COT-PENDIENTE");
  }, [quote, isEmittedToSap]);

  const clientName = useMemo(() => {
    if (!quote) return "CLIENTE";
    return cleanClientName(quote) || quote.client?.CardName || quote.client?.name || quote.clientName || "Estimado(a) Cliente";
  }, [quote]);

  const clientDoc = useMemo(() => {
    if (!quote) return "";
    return (
      quote.clientRuc ||
      quote.clientDocument ||
      quote.client?.LicTradNum ||
      quote.client?.CardCode ||
      quote.clientCode ||
      ""
    );
  }, [quote]);

  const sellerName = useMemo(() => {
    if (!quote) return "Autopartes S.A.";
    return (
      quote.sellerName ||
      quote.salesPersonName ||
      quote.totals?.sellerName ||
      formatQuoteSellerName(quote) ||
      "Asesor Comercial"
    );
  }, [quote]);

  const products = useMemo(() => extractProducts(quote), [quote]);
  const tcVal = Number(quote?.totals?.tc || quote?.docRate || quote?.DocRate) || 3.76;
  const calc = useMemo(() => calculateQuoteTotals(products, tcVal), [products, tcVal]);

  const isSol = useMemo(() => {
    if (!quote) return false;
    const rawCur = String(
      quote.DocCurrency ||
      quote.currency ||
      quote.totals?.currency ||
      quote.docCurrency ||
      quote.moneda ||
      ""
    ).toUpperCase();
    return rawCur === "SOL" || rawCur === "PEN" || rawCur === "SOLES" || rawCur === "S/.";
  }, [quote]);

  const totalUSD = useMemo(() => {
    if (!quote) return 0;
    const stored = Number(quote.totals?.grandTotalUSD ?? quote.grandTotalUSD ?? 0);
    if (stored > 0) return stored;
    return calc.grandTotalUSD || Number(quote.DocTotalFc || quote.DocTotalSys || quote.DocTotal || 0);
  }, [quote, calc]);

  const totalPEN = useMemo(() => {
    if (!quote) return 0;
    const storedSol = Number(quote.totals?.grandTotalSOL ?? quote.totals?.grandTotalPEN ?? 0);
    if (storedSol > 0) return storedSol;
    return calc.grandTotalSOL || Number((totalUSD * tcVal).toFixed(2));
  }, [quote, calc, totalUSD, tcVal]);

  const totalFormatted = useMemo(() => {
    if (isSol) {
      return `S/ ${totalPEN.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$ ${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  }, [isSol, totalUSD, totalPEN]);

  const conditionRaw = quote?.saleCondition || quote?.condicionVenta || quote?.condicionPago || quote?.paymentType || quote?.selectedPaymentType || "CONTADO";
  const paymentDesc = formatPaymentTerms(quote?.paymentType || quote?.selectedPaymentType, conditionRaw) || conditionRaw;
  const deliveryDesc = formatDeliveryForm(quote?.selectedDeliveryForm || quote?.deliveryForm) || "Por coordinar con almacén";

  // Fecha de emisión
  const quoteDateFormatted = useMemo(() => {
    if (!quote) return "";
    const rawDate = quote.docDate || quote.createdAt || quote.CreationDate;
    if (!rawDate) return new Date().toLocaleDateString("es-PE");
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate).split("T")[0];
    return d.toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "2-digit" });
  }, [quote]);

  // Manejo de descarga del PDF oficial exacto (A4 300+ DPI idéntico a QuotePdfModal)
  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      setIsPrintMode(true);

      await new Promise((res) => setTimeout(res, 120));

      const element = pdfRef.current;
      if (!element) {
        throw new Error("No se pudo localizar el contenedor del documento oficial");
      }

      const origWidth = element.style.width;
      const origMaxW = element.style.maxWidth;
      const origMinH = element.style.minHeight;
      const origBoxShadow = element.style.boxShadow;
      const wrapperEl = element.parentElement;
      const origTransform = wrapperEl ? wrapperEl.style.transform : "";

      if (wrapperEl) {
        wrapperEl.style.transform = "none";
      }

      element.style.width = "800px";
      element.style.maxWidth = "800px";
      element.style.minHeight = "1130px";
      element.style.boxShadow = "none";

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(element, {
        scale: 3.5, // 300+ DPI Ultra High Definition
        useCORS: true,
        logging: false,
        backgroundColor: "#fffdf7",
        windowWidth: 1200,
      });

      element.style.width = origWidth;
      element.style.maxWidth = origMaxW;
      element.style.minHeight = origMinH;
      element.style.boxShadow = origBoxShadow;
      if (wrapperEl) {
        wrapperEl.style.transform = origTransform;
      }
      setIsPrintMode(false);

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save(`Autopartes_${isEmittedToSap ? "Orden_Venta" : "Cotizacion"}_${docNumber}.pdf`);

      toast({
        title: "📄 PDF Oficial Descargado",
        description: `Se descargó el documento ${docNumber} con el formato oficial impreso.`,
        status: "success",
        duration: 3500,
        isClosable: true,
      });
    } catch (err) {
      console.error("Error al generar PDF:", err);
      toast({
        title: "Error al generar PDF",
        description: "No se pudo compilar el archivo PDF. Intente nuevamente.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsDownloadingPdf(false);
      setIsPrintMode(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Flex w="full" minH="100vh" align="center" justify="center" bg="#f8fafc" direction="column" gap={3}>
        <Spinner size="xl" color="#126C36" thickness="3.5px" speed="0.65s" />
        <Text fontSize="sm" fontWeight="700" color="gray.600">
          Cargando cotización oficial de Autopartes S.A...
        </Text>
      </Flex>
    );
  }

  const isExpired = Boolean(quote?.expired);

  if (hasError || !quote || isExpired) {
    return (
      <Container maxW="container.md" py={12}>
        <Box
          bg="white"
          p={8}
          borderRadius="2xl"
          border="1px solid"
          borderColor={isExpired ? "orange.300" : "red.200"}
          boxShadow="lg"
          textAlign="center"
        >
          <Box
            p={3.5}
            bg={isExpired ? "orange.50" : "red.50"}
            color={isExpired ? "orange.600" : "red.600"}
            borderRadius="full"
            display="inline-flex"
            mb={4}
          >
            {isExpired ? <Clock className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </Box>
          <Text fontSize="xl" fontWeight="900" color="gray.800" mb={2}>
            {isExpired ? "Enlace de Cotización Vencido (7 días)" : "Cotización no disponible o enlace no encontrado"}
          </Text>
          <Text fontSize="sm" color="gray.600" mb={6} maxW="480px" mx="auto" lineHeight="1.6">
            {isExpired
              ? "Este enlace ha cumplido su ciclo de vigencia de 7 días calendario. Para garantizar la precisión de precios, descuentos y stock en almacén, por favor contacte con su asesor comercial o solicite una cotización actualizada."
              : "El enlace consultado no contiene un documento activo o ha caducado. Por favor contacte con su asesor comercial de Autopartes S.A."}
          </Text>
          <HStack justify="center" spacing={3} wrap="wrap">
            <Button
              colorScheme="green"
              bg="#126C36"
              _hover={{ bg: "#0e572b" }}
              fontWeight="800"
              onClick={() => navigate("/")}
            >
              Ir al Inicio
            </Button>
            <Button
              as="a"
              href="tel:013242600"
              variant="outline"
              colorScheme="teal"
              leftIcon={<Phone className="w-4 h-4" />}
              fontWeight="700"
            >
              Central: (01) 324-2600
            </Button>
          </HStack>
        </Box>
      </Container>
    );
  }

  return (
    <Box minH="100vh" bg="#4a5568" pb={16}>
      {/* ─── BARRA SUPERIOR BRANDED AUTOPARTES S.A. ─── */}
      <Box bg="#126C36" color="white" py={3.5} px={{ base: 4, md: 8 }} boxShadow="md" position="sticky" top={0} zIndex={50}>
        <Container maxW="container.xl" px={0}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <HStack spacing={3}>
              <Box bg="whiteAlpha.200" p={2} borderRadius="xl">
                <FileText className="w-6 h-6 text-white" />
              </Box>
              <Box>
                <HStack spacing={2} align="center">
                  <Text fontSize={{ base: "15px", md: "17px" }} fontWeight="900">
                    {docTypeName} Oficial: {docNumber}
                  </Text>
                  <Badge
                    bg={isEmittedToSap ? "#10b981" : "#f59e0b"}
                    color="white"
                    fontSize="10.5px"
                    px={2.5}
                    py={0.5}
                    borderRadius="full"
                    fontWeight="800"
                  >
                    {isEmittedToSap ? "EMITIDA EN SAP" : "COTIZACIÓN VIGENTE"}
                  </Badge>
                </HStack>
                <Text fontSize="11.5px" opacity={0.9} fontWeight="500">
                  Autopartes S.A. • RUC 20100140228 • Emisión: {quoteDateFormatted}
                </Text>
              </Box>
            </HStack>

            <HStack spacing={2}>
              <Button
                size="sm"
                bg="#25d366"
                _hover={{ bg: "#20bd5a" }}
                color="white"
                fontWeight="900"
                leftIcon={isDownloadingPdf ? <Spinner size="xs" /> : <Download className="w-4 h-4" />}
                onClick={handleDownloadPdf}
                isLoading={isDownloadingPdf}
                loadingText="Descargando..."
                boxShadow="0 2px 8px rgba(37, 211, 102, 0.4)"
                fontSize="xs"
                px={4}
              >
                Descargar PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                color="white"
                borderColor="whiteAlpha.400"
                _hover={{ bg: "whiteAlpha.200" }}
                fontWeight="700"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={handlePrint}
                fontSize="xs"
                display={{ base: "none", sm: "inline-flex" }}
              >
                Imprimir
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* ─── BARRA SECUNDARIA DE CONTROLES Y RESUMEN ─── */}
      <Box bg="#2d3748" color="white" py={2.5} px={{ base: 4, md: 8 }} borderBottom="1px solid" borderColor="gray.600">
        <Container maxW="container.xl" px={0}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
            <HStack spacing={4} fontSize="xs" fontWeight="700">
              <Text color="gray.300">
                Cliente: <strong style={{ color: "#ffffff" }}>{clientName}</strong>
              </Text>
              <Text color="gray.300" display={{ base: "none", md: "inline" }}>
                Total: <strong style={{ color: "#38a169", fontSize: "14px" }}>{totalFormatted}</strong>
              </Text>
            </HStack>

            <HStack spacing={1.5}>
              <Tooltip label="Reducir zoom">
                <IconButton
                  size="xs"
                  variant="ghost"
                  color="white"
                  icon={<ZoomOut className="w-3.5 h-3.5" />}
                  onClick={() => setZoomLevel((z) => Math.max(0.35, Number((z - 0.1).toFixed(2))))}
                  aria-label="Zoom out"
                />
              </Tooltip>
              <Text fontSize="xs" fontWeight="700" color="gray.300" minW="45px" textAlign="center">
                {Math.round(zoomLevel * 100)}%
              </Text>
              <Tooltip label="Aumentar zoom">
                <IconButton
                  size="xs"
                  variant="ghost"
                  color="white"
                  icon={<ZoomIn className="w-3.5 h-3.5" />}
                  onClick={() => setZoomLevel((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
                  aria-label="Zoom in"
                />
              </Tooltip>
              <Button
                size="xs"
                variant="outline"
                color="white"
                borderColor="gray.500"
                onClick={handleAutoFit}
                fontSize="10.5px"
                fontWeight="700"
                h="24px"
                leftIcon={<Maximize2 className="w-3 h-3" />}
              >
                Ajustar
              </Button>
              <Button
                size="xs"
                variant={showTableDetails ? "solid" : "ghost"}
                colorScheme="teal"
                color="white"
                onClick={() => setShowTableDetails(!showTableDetails)}
                fontSize="10.5px"
                fontWeight="700"
                h="24px"
              >
                {showTableDetails ? "Ocultar Desglose" : "Ver Desglose"}
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* ─── DESGLOSE OPCIONAL DE ARTÍCULOS ─── */}
      {showTableDetails && (
        <Container maxW="container.xl" pt={4} px={{ base: 4, md: 6 }}>
          <Box bg="white" borderRadius="2xl" border="1px solid" borderColor="gray.300" overflow="hidden" boxShadow="md" mb={4}>
            <Box p={3.5} borderBottom="1px solid" borderColor="gray.100" bg="#f7fafc">
              <Text fontSize="xs" fontWeight="900" color="gray.800">
                📦 Detalle de Artículos ({products.length}) • Total: {totalFormatted}
              </Text>
            </Box>
            <TableContainer maxH="280px" overflowY="auto">
              <Table size="sm" variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th fontSize="10.5px">#</Th>
                    <Th fontSize="10.5px">Cant.</Th>
                    <Th fontSize="10.5px">Código</Th>
                    <Th fontSize="10.5px">Descripción</Th>
                    <Th fontSize="10.5px" isNumeric>P. Unit.</Th>
                    <Th fontSize="10.5px" isNumeric>Total</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {products.map((p, idx) => {
                    const qty = Math.max(1, Number(p.quantity ?? p.Quantity ?? 1));
                    const code = p.productCode || p.itemCode || p.ItemCode || p.code || "—";
                    const name = p.productName || p.name || p.description || p.sigla || "Artículo";
                    const unitPrice = Number(p.unitPrice ?? p.price ?? p.UnitPrice ?? 0);
                    const finalPrice = Number(p.finalPrice ?? p.discountedUnitPrice ?? unitPrice);
                    const lineTotal = Number(p.lineTotal ?? p.totalPrice ?? (qty * finalPrice));
                    return (
                      <Tr key={idx}>
                        <Td fontSize="11px" color="gray.500">{idx + 1}</Td>
                        <Td fontSize="11.5px" fontWeight="800" color="#126C36">{qty}</Td>
                        <Td fontSize="11px" fontWeight="700">{code}</Td>
                        <Td fontSize="11.5px" fontWeight="700">{name}</Td>
                        <Td fontSize="11px" isNumeric>{isSol ? `S/ ${finalPrice.toFixed(2)}` : `$ ${finalPrice.toFixed(2)}`}</Td>
                        <Td fontSize="11.5px" fontWeight="800" color="#126C36" isNumeric>{isSol ? `S/ ${lineTotal.toFixed(2)}` : `$ ${lineTotal.toFixed(2)}`}</Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        </Container>
      )}

      {/* ─── VISOR DEL FORMULARIO OFICIAL IMPRESO A4 (IDÉNTICO AL MODAL) ─── */}
      <Box
        py={6}
        px={{ base: 2, md: 4 }}
        display="flex"
        justifyContent="center"
        alignItems="flex-start"
        overflowX="auto"
      >
        <Box
          transform={`scale(${zoomLevel})`}
          transformOrigin="top center"
          transition="transform 0.15s ease-out"
          style={{
            width: `${800 * zoomLevel}px`,
            minHeight: `${1130 * zoomLevel}px`,
          }}
        >
          <QuotePdfDocument
            quote={quote}
            ref={pdfRef}
            isPrintMode={isPrintMode}
          />
        </Box>
      </Box>

      {/* ─── BARRA FLOTANTE INFERIOR PARA DESCARGA RÁPIDA ─── */}
      <Box
        position="fixed"
        bottom={3}
        left="50%"
        transform="translateX(-50%)"
        zIndex={40}
        bg="rgba(18, 108, 54, 0.95)"
        backdropFilter="blur(8px)"
        py={2}
        px={4}
        borderRadius="full"
        boxShadow="0 6px 20px rgba(0, 0, 0, 0.35)"
      >
        <HStack spacing={3}>
          <Text fontSize="xs" fontWeight="800" color="white" display={{ base: "none", sm: "inline" }}>
            Total: {totalFormatted}
          </Text>
          <Button
            size="sm"
            bg="#25d366"
            _hover={{ bg: "#20bd5a" }}
            color="white"
            fontWeight="900"
            fontSize="xs"
            borderRadius="full"
            leftIcon={isDownloadingPdf ? <Spinner size="xs" /> : <Download className="w-3.5 h-3.5" />}
            onClick={handleDownloadPdf}
            isLoading={isDownloadingPdf}
            loadingText="Descargando..."
            boxShadow="sm"
          >
            Descargar PDF Oficial
          </Button>
        </HStack>
      </Box>
    </Box>
  );
}

export default ClientQuoteSharePage;

