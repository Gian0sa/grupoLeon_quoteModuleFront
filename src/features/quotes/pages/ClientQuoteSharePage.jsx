import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Flex,
  Text,
  Badge,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Button,
  Spinner,
  useToast,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import {
  Download,
  Printer,
  FileText,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Phone,
  Clock,
  List,
  X,
} from "lucide-react";
import { fetchPublicQuoteByCode } from "../utils/quoteTokenUtils";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";
import {
  formatPaymentTerms,
  formatDeliveryForm,
  cleanClientName,
  formatQuoteSellerName,
} from "../../../shared/utils/quoteLogisticsFormatters";
import QuotePdfDocument, {
  preloadQuotePdfLibs,
  downloadQuoteElementAsPdf,
} from "../components/QuotePdfDocument";

const DOC_BASE_WIDTH = 800;
const DOC_DEFAULT_HEIGHT = 1132;

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
  const [zoomMode, setZoomMode] = useState(() =>
    typeof window !== "undefined" && window.innerWidth >= 820 ? "manual" : "fit"
  ); // "fit" | "manual"
  const [zoomLevel, setZoomLevel] = useState(() =>
    typeof window !== "undefined" && window.innerWidth >= 820 ? 0.97 : 0.5
  );
  const [docNaturalHeight, setDocNaturalHeight] = useState(DOC_DEFAULT_HEIGHT);
  const [showTableDetails, setShowTableDetails] = useState(false);

  const pdfRef = useRef(null);
  const stageRef = useRef(null);

  const computeFitScale = useCallback((stageEl, naturalH = DOC_DEFAULT_HEIGHT) => {
    if (!stageEl) {
      const vw = typeof window !== "undefined" ? window.innerWidth : 390;
      const vh = typeof window !== "undefined" ? window.innerHeight : 760;
      const wScale = (vw - 20) / DOC_BASE_WIDTH;
      const hScale = (vh - 140) / naturalH;
      return Number(Math.min(1, Math.max(0.32, Math.min(wScale, hScale))).toFixed(3));
    }
    const isMobile = stageEl.clientWidth < 768;
    const padX = isMobile ? 16 : 36;
    const padY = isMobile ? 16 : 28;
    const availW = Math.max(240, stageEl.clientWidth - padX);
    const availH = Math.max(240, stageEl.clientHeight - padY);
    const scaleW = availW / DOC_BASE_WIDTH;
    // En modo retrato o escritorio, encajar hoja completa sin barras de scroll;
    // en móvil horizontal muy bajo (< 380px alto), priorizar ancho legible.
    const scaleH = availH < 380 ? scaleW : availH / naturalH;
    const fit = Math.min(1, Math.max(0.3, Math.min(scaleW, scaleH)));
    return Number(fit.toFixed(3));
  }, []);

  const handleAutoFit = useCallback(() => {
    setZoomMode("fit");
    setZoomLevel(computeFitScale(stageRef.current, docNaturalHeight));
  }, [computeFitScale, docNaturalHeight]);

  const handleSetZoomManual = useCallback((nextZoom) => {
    const clamped = Number(Math.min(1.8, Math.max(0.3, nextZoom)).toFixed(2));
    setZoomMode("manual");
    setZoomLevel(clamped);
  }, []);

  const handleToggleQuickZoom = useCallback(() => {
    if (zoomMode === "fit" || zoomLevel < 0.85) {
      handleSetZoomManual(1);
    } else {
      handleAutoFit();
    }
  }, [zoomMode, zoomLevel, handleSetZoomManual, handleAutoFit]);

  // Medir altura real del documento A4 y tamaño disponible del visor en tiempo real
  useEffect(() => {
    if (!quote) return;
    const stageEl = stageRef.current;
    const docEl = pdfRef.current;

    const syncDimensions = () => {
      let measuredH = docNaturalHeight;
      if (docEl && docEl.offsetHeight > 400) {
        measuredH = docEl.offsetHeight;
        if (Math.abs(measuredH - docNaturalHeight) > 2) {
          setDocNaturalHeight(measuredH);
        }
      }
      if (zoomMode === "fit") {
        setZoomLevel(computeFitScale(stageEl, measuredH));
      }
    };

    syncDimensions();

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => syncDimensions());
      if (stageEl) ro.observe(stageEl);
      if (docEl) ro.observe(docEl);
    }
    window.addEventListener("resize", syncDimensions);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", syncDimensions);
    };
  }, [quote, zoomMode, docNaturalHeight, computeFitScale]);

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

  const quoteDateFormatted = useMemo(() => {
    if (!quote) return "";
    const rawDate = quote.docDate || quote.createdAt || quote.CreationDate;
    if (!rawDate) return new Date().toLocaleDateString("es-PE");
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate).split("T")[0];
    return d.toLocaleDateString("es-PE", { year: "numeric", month: "short", day: "2-digit" });
  }, [quote]);

  useEffect(() => {
    if (quote) {
      preloadQuotePdfLibs().catch(() => {});
    }
  }, [quote]);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const element = pdfRef.current;
      if (!element) {
        throw new Error("No se pudo localizar el contenedor del documento oficial");
      }

      const targetFileName = `Autopartes_${isEmittedToSap ? "Orden_Venta" : "Cotizacion"}_${docNumber}.pdf`;
      const result = await downloadQuoteElementAsPdf(element, targetFileName);
      if (result?.cancelled) return;

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
        description: err?.message || "No se pudo compilar el archivo PDF. Intente nuevamente.",
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
      <Flex w="full" minH="100vh" align="center" justify="center" bg="#0f172a" direction="column" gap={3}>
        <Spinner size="xl" color="#10b981" thickness="3.5px" speed="0.65s" />
        <Text fontSize="sm" fontWeight="700" color="gray.300">
          Cargando documento oficial de Autopartes S.A...
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

  const scaledWidth = Math.round(DOC_BASE_WIDTH * zoomLevel);
  const scaledHeight = Math.round(docNaturalHeight * zoomLevel);

  return (
    <Flex
      direction="column"
      w="full"
      h="100vh"
      overflow="hidden"
      bg="#0f172a"
      style={{ height: "100dvh" }}
    >
      {/* Estilos limpios para impresión directa A4 */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 5mm;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .share-print-shell,
          .share-print-stage,
          .share-print-footprint,
          .share-print-scaler {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            transform: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          #printable-autopartes-document {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            margin: 0 auto !important;
            padding: 6mm !important;
            box-shadow: none !important;
            border: 1.5px solid #000 !important;
            background: #fffdf7 !important;
          }
        }
      `}</style>

      {/* ─── CABECERA COMPACTA EJECUTIVA (Fija arriba, sin ocupar media pantalla en móvil) ─── */}
      <Box
        as="header"
        flexShrink={0}
        className="no-print"
        px={{ base: 3, md: 6 }}
        py={{ base: 2, md: 2.5 }}
        color="white"
        borderBottom="1px solid rgba(255, 255, 255, 0.14)"
        boxShadow="0 4px 20px rgba(0, 0, 0, 0.3)"
        style={{
          background: "linear-gradient(135deg, #0b4622 0%, #126C36 55%, #15803d 100%)",
        }}
        zIndex={30}
      >
        <Flex justify="space-between" align="center" gap={2} maxW="1440px" mx="auto">
          {/* Identidad del Documento y Cliente */}
          <HStack spacing={{ base: 2.5, md: 3 }} minW={0} flex={1}>
            <Flex
              w={{ base: "34px", md: "38px" }}
              h={{ base: "34px", md: "38px" }}
              bg="whiteAlpha.200"
              border="1px solid rgba(255,255,255,0.22)"
              borderRadius="xl"
              align="center"
              justify="center"
              flexShrink={0}
            >
              <FileText className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </Flex>
            <Box minW={0} flex={1}>
              <HStack spacing={2} align="center">
                <Text
                  fontSize={{ base: "13.5px", sm: "15px", md: "16px" }}
                  fontWeight="900"
                  letterSpacing="-0.01em"
                  isTruncated
                >
                  {docTypeName} #{docNumber}
                </Text>
                <Badge
                  bg={isEmittedToSap ? "rgba(16, 185, 129, 0.95)" : "rgba(245, 158, 11, 0.95)"}
                  color="white"
                  fontSize={{ base: "9px", md: "10px" }}
                  px={2}
                  py="1px"
                  borderRadius="full"
                  fontWeight="800"
                  flexShrink={0}
                  boxShadow="0 1px 4px rgba(0,0,0,0.2)"
                >
                  {isEmittedToSap ? "EMITIDA EN SAP" : "VIGENTE"}
                </Badge>
              </HStack>
              <HStack spacing={1.5} fontSize={{ base: "11px", md: "11.5px" }} color="whiteAlpha.900" minW={0}>
                <Text isTruncated fontWeight="600" maxW={{ base: "170px", sm: "280px", md: "360px" }}>
                  {clientName}
                </Text>
                <Text opacity={0.6}>•</Text>
                <Text fontWeight="800" color="#bbf7d0" flexShrink={0}>
                  {totalFormatted}
                </Text>
                <Text opacity={0.6} display={{ base: "none", lg: "inline" }}>•</Text>
                <Text opacity={0.85} display={{ base: "none", lg: "inline" }} flexShrink={0}>
                  Emisión: {quoteDateFormatted}
                </Text>
              </HStack>
            </Box>
          </HStack>

          {/* Barra Central de Zoom en Escritorio */}
          <HStack
            spacing={1}
            display={{ base: "none", md: "flex" }}
            bg="blackAlpha.400"
            border="1px solid rgba(255,255,255,0.16)"
            borderRadius="full"
            px={2}
            py={1}
          >
            <Tooltip label="Alejar (-)">
              <IconButton
                size="xs"
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
                borderRadius="full"
                icon={<ZoomOut className="w-3.5 h-3.5" />}
                onClick={() => handleSetZoomManual(zoomLevel - 0.12)}
                aria-label="Alejar"
              />
            </Tooltip>
            <Badge
              cursor="pointer"
              onClick={handleToggleQuickZoom}
              bg="whiteAlpha.200"
              color="white"
              px={2.5}
              py={0.5}
              borderRadius="full"
              fontSize="11px"
              fontWeight="800"
              minW="48px"
              textAlign="center"
              title="Clic para alternar entre Encajar y 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </Badge>
            <Tooltip label="Acercar (+)">
              <IconButton
                size="xs"
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
                borderRadius="full"
                icon={<ZoomIn className="w-3.5 h-3.5" />}
                onClick={() => handleSetZoomManual(zoomLevel + 0.12)}
                aria-label="Acercar"
              />
            </Tooltip>
            <Button
              size="xs"
              variant={zoomMode === "fit" ? "solid" : "ghost"}
              bg={zoomMode === "fit" ? "whiteAlpha.300" : "transparent"}
              color="white"
              _hover={{ bg: "whiteAlpha.300" }}
              borderRadius="full"
              h="24px"
              px={2.5}
              fontSize="11px"
              fontWeight="700"
              leftIcon={<Maximize2 className="w-3 h-3" />}
              onClick={handleAutoFit}
            >
              Encajar
            </Button>
            <Button
              size="xs"
              variant={zoomMode === "manual" && Math.abs(zoomLevel - 1) < 0.03 ? "solid" : "ghost"}
              bg={zoomMode === "manual" && Math.abs(zoomLevel - 1) < 0.03 ? "whiteAlpha.300" : "transparent"}
              color="white"
              _hover={{ bg: "whiteAlpha.300" }}
              borderRadius="full"
              h="24px"
              px={2.5}
              fontSize="11px"
              fontWeight="700"
              onClick={() => handleSetZoomManual(1)}
            >
              100%
            </Button>
          </HStack>

          {/* Acciones Derecha */}
          <HStack spacing={2} flexShrink={0}>
            <Button
              size="xs"
              variant={showTableDetails ? "solid" : "outline"}
              bg={showTableDetails ? "white" : "whiteAlpha.100"}
              color={showTableDetails ? "#0b4622" : "white"}
              borderColor="whiteAlpha.400"
              _hover={{ bg: showTableDetails ? "gray.100" : "whiteAlpha.250" }}
              borderRadius="full"
              h={{ base: "30px", md: "32px" }}
              px={{ base: 2.5, md: 3 }}
              fontSize="11px"
              fontWeight="800"
              leftIcon={<List className="w-3.5 h-3.5" />}
              onClick={() => setShowTableDetails((v) => !v)}
            >
              {showTableDetails ? "Cerrar" : `Ítems (${products.length})`}
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
              h="32px"
              borderRadius="full"
              display={{ base: "none", lg: "inline-flex" }}
            >
              Imprimir
            </Button>

            {/* En escritorio el botón principal vive en la cabecera; en móvil vive en el dock inferior */}
            <Button
              size="sm"
              bg="#22c55e"
              _hover={{ bg: "#16a34a" }}
              color="white"
              fontWeight="900"
              leftIcon={isDownloadingPdf ? <Spinner size="xs" /> : <Download className="w-4 h-4" />}
              onClick={handleDownloadPdf}
              isLoading={isDownloadingPdf}
              loadingText="Generando..."
              boxShadow="0 2px 10px rgba(34, 197, 94, 0.45)"
              fontSize="xs"
              h="34px"
              px={4}
              borderRadius="full"
              display={{ base: "none", md: "inline-flex" }}
            >
              Descargar PDF
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* ─── ÁREA CENTRAL DEL VISOR A4 (Encaje Exacto sin Scroll Fantasma) ─── */}
      <Box
        ref={stageRef}
        flex={1}
        minH={0}
        w="full"
        position="relative"
        overflow="auto"
        display="flex"
        p={{ base: "8px", md: "16px" }}
        className="share-print-stage"
        sx={{
          WebkitOverflowScrolling: "touch",
          background: "radial-gradient(circle at 50% 18%, #28364a 0%, #172133 65%, #0f172a 100%)",
        }}
      >
        {/* Panel flotante de desglose rápido (no empuja ni deforma el documento) */}
        {showTableDetails && (
          <Box
            position="fixed"
            top={{ base: "58px", md: "64px" }}
            left="50%"
            transform="translateX(-50%)"
            w={{ base: "calc(100% - 20px)", md: "760px" }}
            maxW="96vw"
            bg="white"
            borderRadius="2xl"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.55)"
            zIndex={45}
            overflow="hidden"
            className="no-print"
          >
            <Flex
              px={4}
              py={3}
              bg="#f8fafc"
              borderBottom="1px solid"
              borderColor="gray.200"
              justify="space-between"
              align="center"
            >
              <Box>
                <Text fontSize="xs" fontWeight="900" color="gray.800">
                  Detalle de Artículos ({products.length}) • {totalFormatted}
                </Text>
                <Text fontSize="11px" color="gray.500" fontWeight="600">
                  Condición: {paymentDesc} • Entrega: {deliveryDesc} • Asesor: {sellerName}
                </Text>
              </Box>
              <IconButton
                size="xs"
                variant="ghost"
                icon={<X className="w-4 h-4" />}
                onClick={() => setShowTableDetails(false)}
                aria-label="Cerrar desglose"
              />
            </Flex>
            <TableContainer maxH={{ base: "52vh", md: "340px" }} overflowY="auto">
              <Table size="sm" variant="simple">
                <Thead bg="gray.50" position="sticky" top={0} zIndex={1}>
                  <Tr>
                    <Th fontSize="10px">#</Th>
                    <Th fontSize="10px">Cant.</Th>
                    <Th fontSize="10px">Código</Th>
                    <Th fontSize="10px">Descripción</Th>
                    <Th fontSize="10px" isNumeric>P. Unit.</Th>
                    <Th fontSize="10px" isNumeric>Total</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {products.map((p, idx) => {
                    const qty = Math.max(1, Number(p.quantity ?? p.Quantity ?? 1));
                    const pCode = p.productCode || p.itemCode || p.ItemCode || p.code || "—";
                    const name = p.productName || p.name || p.description || p.sigla || "Artículo";
                    const unitPrice = Number(p.unitPrice ?? p.price ?? p.UnitPrice ?? 0);
                    const finalPrice = Number(p.finalPrice ?? p.discountedUnitPrice ?? unitPrice);
                    const lineTotal = Number(p.lineTotal ?? p.totalPrice ?? qty * finalPrice);
                    return (
                      <Tr key={idx}>
                        <Td fontSize="11px" color="gray.500">{idx + 1}</Td>
                        <Td fontSize="11.5px" fontWeight="800" color="#126C36">{qty}</Td>
                        <Td fontSize="11px" fontWeight="700">{pCode}</Td>
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
        )}

        {/* Contenedor con Huella Exacta Escalada (Elimina recortes derechos y espacios vacíos inferiores) */}
        <div
          className="share-print-footprint"
          onDoubleClick={handleToggleQuickZoom}
          title="Doble toque / clic para acercar o encajar hoja completa"
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            position: "relative",
            margin: "auto",
            flexShrink: 0,
          }}
        >
          <div
            className="share-print-scaler"
            style={{
              width: `${DOC_BASE_WIDTH}px`,
              minWidth: `${DOC_BASE_WIDTH}px`,
              maxWidth: `${DOC_BASE_WIDTH}px`,
              position: "absolute",
              top: 0,
              left: 0,
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top left",
              boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              overflow: "hidden",
              background: "#fffdf7",
            }}
          >
            <QuotePdfDocument
              quote={quote}
              ref={pdfRef}
              isPrintMode={isPrintMode}
            />
          </div>
        </div>
      </Box>

      {/* ─── DOCK INFERIOR NATIVO MÓVIL (Nunca tapa el PDF, combina Zoom + Descarga Directa) ─── */}
      <Box
        as="footer"
        display={{ base: "block", md: "none" }}
        flexShrink={0}
        className="no-print"
        bg="#0b1322"
        borderTop="1px solid rgba(255, 255, 255, 0.12)"
        px={3}
        pt={2}
        style={{
          paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
          boxShadow: "0 -6px 24px rgba(0, 0, 0, 0.35)",
        }}
        zIndex={30}
      >
        <Flex align="center" justify="space-between" gap={2.5}>
          {/* Cluster compacto de Zoom */}
          <HStack
            spacing={0.5}
            bg="whiteAlpha.100"
            border="1px solid rgba(255,255,255,0.14)"
            borderRadius="xl"
            p="3px"
            flexShrink={0}
          >
            <IconButton
              size="xs"
              variant="ghost"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
              borderRadius="lg"
              h="32px"
              w="30px"
              icon={<ZoomOut className="w-3.5 h-3.5" />}
              onClick={() => handleSetZoomManual(zoomLevel - 0.12)}
              aria-label="Alejar documento"
            />
            <Box
              as="button"
              type="button"
              onClick={handleToggleQuickZoom}
              px={1.5}
              h="32px"
              minW="42px"
              fontSize="11px"
              fontWeight="800"
              color="white"
              textAlign="center"
            >
              {Math.round(zoomLevel * 100)}%
            </Box>
            <IconButton
              size="xs"
              variant="ghost"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
              borderRadius="lg"
              h="32px"
              w="30px"
              icon={<ZoomIn className="w-3.5 h-3.5" />}
              onClick={() => handleSetZoomManual(zoomLevel + 0.12)}
              aria-label="Acercar documento"
            />
            <IconButton
              size="xs"
              variant={zoomMode === "fit" ? "solid" : "ghost"}
              bg={zoomMode === "fit" ? "#10b981" : "transparent"}
              color="white"
              _hover={{ bg: zoomMode === "fit" ? "#059669" : "whiteAlpha.200" }}
              borderRadius="lg"
              h="32px"
              w="32px"
              icon={<Maximize2 className="w-3.5 h-3.5" />}
              onClick={handleAutoFit}
              aria-label="Encajar página completa"
              title="Encajar hoja completa"
            />
          </HStack>

          {/* Botón Primario Único de Descarga Móvil */}
          <Button
            flex={1}
            h="38px"
            borderRadius="xl"
            color="white"
            fontWeight="900"
            fontSize="13px"
            letterSpacing="0.01em"
            leftIcon={isDownloadingPdf ? <Spinner size="xs" /> : <Download className="w-4 h-4" />}
            onClick={handleDownloadPdf}
            isLoading={isDownloadingPdf}
            loadingText="Descargando..."
            style={{
              background: "linear-gradient(135deg, #16a34a 0%, #10b981 100%)",
              boxShadow: "0 4px 16px rgba(16, 185, 129, 0.38)",
            }}
            _active={{ transform: "scale(0.98)" }}
          >
            Descargar PDF
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
}

export default ClientQuoteSharePage;
