import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Box,
  useToast,
  HStack,
  Text,
  Badge,
  Flex,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import { Download, Printer, FileText, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import QuotePdfDocument, {
  preloadQuotePdfLibs,
  downloadQuoteElementAsPdf,
} from "./QuotePdfDocument";

const DOC_BASE_WIDTH = 800;
const DOC_DEFAULT_HEIGHT = 1132;

export default function QuotePdfModal({ isOpen, onClose, quote }) {
  const pdfRef = useRef(null);
  const stageRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [zoomMode, setZoomMode] = useState(() =>
    typeof window !== "undefined" && window.innerWidth >= 820 ? "manual" : "fit"
  ); // "fit" | "manual"
  const [zoomLevel, setZoomLevel] = useState(() =>
    typeof window !== "undefined" && window.innerWidth >= 820 ? 0.97 : 0.5
  );
  const [docNaturalHeight, setDocNaturalHeight] = useState(DOC_DEFAULT_HEIGHT);
  const toast = useToast();

  const computeFitScale = useCallback((stageEl, naturalH = DOC_DEFAULT_HEIGHT) => {
    if (!stageEl) {
      const vw = typeof window !== "undefined" ? window.innerWidth : 390;
      const vh = typeof window !== "undefined" ? window.innerHeight : 760;
      const scaleW = (vw - 20) / DOC_BASE_WIDTH;
      const scaleH = (vh - 150) / naturalH;
      return Number(Math.min(1, Math.max(0.32, Math.min(scaleW, scaleH))).toFixed(3));
    }
    const isMobile = stageEl.clientWidth < 768;
    const padX = isMobile ? 16 : 32;
    const padY = isMobile ? 16 : 24;
    const availW = Math.max(240, stageEl.clientWidth - padX);
    const availH = Math.max(240, stageEl.clientHeight - padY);
    const scaleW = availW / DOC_BASE_WIDTH;
    const scaleH = availH < 380 ? scaleW : availH / naturalH;
    const fit = Math.min(1, Math.max(0.3, Math.min(scaleW, scaleH)));
    return Number(fit.toFixed(3));
  }, []);

  const handleAutoFit = useCallback(() => {
    setZoomMode("fit");
    setZoomLevel(computeFitScale(stageRef.current, docNaturalHeight));
  }, [computeFitScale, docNaturalHeight]);

  const handleSetZoomManual = useCallback((nextZoom) => {
    const clamped = Number(Math.min(2.0, Math.max(0.3, nextZoom)).toFixed(2));
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

  useEffect(() => {
    if (!isOpen) return;
    preloadQuotePdfLibs().catch(() => {});
    if (typeof window !== "undefined" && window.innerWidth >= 820) {
      setZoomMode("manual");
      setZoomLevel(0.97);
    } else {
      setZoomMode("fit");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !quote) return;
    let rafId = null;
    let ro = null;

    const syncDimensions = () => {
      const stageEl = stageRef.current;
      const docEl = pdfRef.current;
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

    rafId = requestAnimationFrame(syncDimensions);

    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => syncDimensions());
      if (stageRef.current) ro.observe(stageRef.current);
      if (pdfRef.current) ro.observe(pdfRef.current);
    }
    window.addEventListener("resize", syncDimensions);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", syncDimensions);
    };
  }, [isOpen, quote, zoomMode, docNaturalHeight, computeFitScale]);

  const lastQuoteRef = useRef(null);
  if (quote) {
    lastQuoteRef.current = quote;
  }
  const activeQuote = quote || lastQuoteRef.current;
  if (!activeQuote) return null;

  const isEmittedToSap = Boolean(
    (activeQuote.sapDocNum && String(activeQuote.sapDocNum).trim() !== "") ||
    (activeQuote.DocNum && !String(activeQuote.DocNum).startsWith("COT-")) ||
    (activeQuote.docNum && !String(activeQuote.docNum).startsWith("COT-")) ||
    activeQuote.status === "EMITIDO" ||
    activeQuote.status === "EMITIDO_SAP" ||
    activeQuote.status === "APROBADO_SAP" ||
    activeQuote.isSyncedToSap === true
  );

  const documentTitle = isEmittedToSap ? "Orden_de_Venta" : "Cotizacion";
  const docTitleDisplay = isEmittedToSap ? "Orden de Venta" : "Cotización";
  const docNumber = isEmittedToSap
    ? (activeQuote.sapDocNum || activeQuote.DocNum || activeQuote.docNum || activeQuote.docNumber || "OV-PENDIENTE")
    : (activeQuote.docNumber || (activeQuote.id ? `COT-${String(activeQuote.id).padStart(5, "0")}` : "COT-PENDIENTE"));

  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      const element = pdfRef.current;
      if (!element) {
        throw new Error("No se encontró la vista previa del documento.");
      }

      const targetFileName = `Autopartes_${documentTitle}_${docNumber}.pdf`;
      const result = await downloadQuoteElementAsPdf(element, targetFileName);
      if (result?.cancelled) return;

      toast({
        title: "✅ PDF Descargado en Alta Calidad",
        description: `Se ha guardado ${result?.fileName || targetFileName} en tus descargas.`,
        status: "success",
        duration: 3500,
        isClosable: true,
      });
    } catch (err) {
      console.error("Error al generar PDF:", err);
      setIsPrintMode(false);
      toast({
        title: "Error al generar PDF",
        description: err.message || "Ocurrió un inconveniente al generar el documento impreso.",
        status: "error",
        duration: 4000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const scaledWidth = Math.round(DOC_BASE_WIDTH * zoomLevel);
  const scaledHeight = Math.round(docNaturalHeight * zoomLevel);

  return (
    <Modal
      isOpen={Boolean(isOpen && quote)}
      onClose={onClose}
      size={{ base: "full", sm: "4xl", md: "5xl" }}
      scrollBehavior="inside"
      motionPreset="slideInBottom"
      blockScrollOnMount={false}
      trapFocus={false}
    >
      <ModalOverlay bg="blackAlpha.750" backdropFilter="blur(3px)" className="no-print" />
      <ModalContent
        borderRadius={{ base: "none", sm: "2xl" }}
        overflow="hidden"
        h={{ base: "100vh", sm: "92vh" }}
        maxH={{ base: "100vh", sm: "92vh" }}
        my={{ base: 0, sm: "auto" }}
        display="flex"
        flexDirection="column"
        bg="#0f172a"
        style={{ height: typeof window !== "undefined" && window.innerWidth < 480 ? "100dvh" : undefined }}
      >
        {/* Estilos de Impresión A4 Profesionales */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 4mm 5mm;
            }
            html, body {
              height: auto !important;
              min-height: 100% !important;
              overflow: visible !important;
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body > *:not(.chakra-portal),
            .chakra-modal__overlay,
            .chakra-modal__header,
            .chakra-modal__footer,
            .chakra-modal__close-btn,
            .no-print {
              display: none !important;
            }
            .chakra-portal,
            .chakra-portal > *,
            .chakra-modal__content-container,
            .chakra-modal__content,
            .chakra-modal__body,
            .pdf-modal-footprint,
            .pdf-modal-scaler {
              position: static !important;
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              max-height: none !important;
              min-height: 0 !important;
              overflow: visible !important;
              transform: none !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
              background: transparent !important;
            }
            #printable-autopartes-document {
              width: 100% !important;
              max-width: 100% !important;
              min-height: 0 !important;
              margin: 0 auto !important;
              padding: 6mm 6mm !important;
              box-shadow: none !important;
              border: 1.5px solid #000 !important;
              background: #fffdf7 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              page-break-inside: avoid !important;
            }
          }
        `}</style>

        {/* CABECERA COMPACTA */}
        <ModalHeader
          color="white"
          py={{ base: 2.5, md: 3 }}
          px={{ base: 3.5, md: 5 }}
          flexShrink={0}
          className="no-print"
          borderBottom="1px solid rgba(255,255,255,0.12)"
          style={{
            background: "linear-gradient(135deg, #0b4622 0%, #126C36 60%, #15803d 100%)",
          }}
        >
          <Flex justify="space-between" align="center" pr={8} gap={2}>
            <HStack spacing={2.5} minW={0}>
              <FileText className="w-4 h-4 md:w-5 md:h-5 text-emerald-300 shrink-0" />
              <Text fontSize={{ base: "13px", sm: "sm", md: "md" }} fontWeight="800" isTruncated>
                Vista Previa de {docTitleDisplay}
              </Text>
              <Badge
                bg="whiteAlpha.250"
                color="white"
                fontSize={{ base: "10px", sm: "xs" }}
                px={2.5}
                py={0.5}
                borderRadius="full"
                fontWeight="800"
                flexShrink={0}
              >
                {docNumber}
              </Badge>
            </HStack>

            {/* Controles de Zoom y Acciones en Escritorio */}
            <HStack spacing={2} display={{ base: "none", sm: "flex" }}>
              <HStack
                spacing={0.5}
                bg="blackAlpha.400"
                border="1px solid rgba(255,255,255,0.16)"
                borderRadius="full"
                px={1.5}
                py="2px"
              >
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
                <Badge
                  cursor="pointer"
                  onClick={handleToggleQuickZoom}
                  bg="transparent"
                  color="white"
                  px={2}
                  fontSize="11px"
                  fontWeight="800"
                  title="Alternar Encajar / 100%"
                >
                  {Math.round(zoomLevel * 100)}%
                </Badge>
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
                <Button
                  size="xs"
                  variant={zoomMode === "fit" ? "solid" : "ghost"}
                  bg={zoomMode === "fit" ? "whiteAlpha.300" : "transparent"}
                  color="white"
                  _hover={{ bg: "whiteAlpha.300" }}
                  borderRadius="full"
                  h="22px"
                  px={2}
                  fontSize="10.5px"
                  fontWeight="700"
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
                  h="22px"
                  px={2}
                  fontSize="10.5px"
                  fontWeight="700"
                  onClick={() => handleSetZoomManual(1)}
                >
                  100%
                </Button>
              </HStack>

              <Button
                size="xs"
                variant="outline"
                color="white"
                borderColor="whiteAlpha.400"
                _hover={{ bg: "whiteAlpha.200" }}
                borderRadius="full"
                h="28px"
                px={3}
                leftIcon={<Printer className="w-3.5 h-3.5" />}
                onClick={handlePrint}
                fontWeight="700"
              >
                Imprimir
              </Button>

              <Button
                size="xs"
                bg="#22c55e"
                _hover={{ bg: "#16a34a" }}
                color="white"
                borderRadius="full"
                h="28px"
                px={3.5}
                fontWeight="800"
                leftIcon={isGenerating ? <Spinner size="xs" /> : <Download className="w-3.5 h-3.5" />}
                onClick={handleDownloadPdf}
                isLoading={isGenerating}
                loadingText="PDF..."
                boxShadow="0 2px 8px rgba(34,197,94,0.4)"
              >
                Descargar PDF
              </Button>
            </HStack>
          </Flex>
        </ModalHeader>
        <ModalCloseButton color="white" top={{ base: 2, md: 2.5 }} right={2.5} className="no-print" />

        {/* LIENZO CENTRAL DEL DOCUMENTO (Huella escalada exacta, 0 scroll fantasma) */}
        <ModalBody
          ref={stageRef}
          flex={1}
          minH={0}
          p={{ base: "8px", sm: "16px" }}
          overflow="auto"
          display="flex"
          sx={{
            WebkitOverflowScrolling: "touch",
            background: "radial-gradient(circle at 50% 18%, #28364a 0%, #172133 65%, #0f172a 100%)",
          }}
        >
          <div
            className="pdf-modal-footprint"
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
              className="pdf-modal-scaler"
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
              <QuotePdfDocument ref={pdfRef} quote={activeQuote} isPrintMode={isPrintMode} />
            </div>
          </div>
        </ModalBody>

        {/* DOCK INFERIOR SOLO EN MÓVIL (Zoom + Descarga sin tapar jamás el PDF) */}
        <ModalFooter
          display={{ base: "block", sm: "none" }}
          flexShrink={0}
          bg="#0b1322"
          borderTop="1px solid rgba(255, 255, 255, 0.12)"
          px={3}
          pt={2}
          className="no-print"
          style={{
            paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <Flex align="center" justify="space-between" gap={2.5} w="full">
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
                borderRadius="lg"
                h="32px"
                w="30px"
                icon={<ZoomOut className="w-3.5 h-3.5" />}
                onClick={() => handleSetZoomManual(zoomLevel - 0.12)}
                aria-label="Alejar"
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
              >
                {Math.round(zoomLevel * 100)}%
              </Box>
              <IconButton
                size="xs"
                variant="ghost"
                color="white"
                borderRadius="lg"
                h="32px"
                w="30px"
                icon={<ZoomIn className="w-3.5 h-3.5" />}
                onClick={() => handleSetZoomManual(zoomLevel + 0.12)}
                aria-label="Acercar"
              />
              <IconButton
                size="xs"
                variant={zoomMode === "fit" ? "solid" : "ghost"}
                bg={zoomMode === "fit" ? "#10b981" : "transparent"}
                color="white"
                borderRadius="lg"
                h="32px"
                w="32px"
                icon={<Maximize2 className="w-3.5 h-3.5" />}
                onClick={handleAutoFit}
                aria-label="Encajar página"
              />
            </HStack>

            <Button
              flex={1}
              h="38px"
              borderRadius="xl"
              color="white"
              fontWeight="900"
              fontSize="13px"
              leftIcon={isGenerating ? <Spinner size="xs" /> : <Download className="w-4 h-4" />}
              onClick={handleDownloadPdf}
              isLoading={isGenerating}
              loadingText="Generando..."
              style={{
                background: "linear-gradient(135deg, #16a34a 0%, #10b981 100%)",
                boxShadow: "0 4px 16px rgba(16, 185, 129, 0.38)",
              }}
            >
              Descargar PDF
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
