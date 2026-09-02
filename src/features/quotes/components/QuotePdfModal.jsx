import React, { useRef, useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  Stack,
  Flex,
} from "@chakra-ui/react";
import { Download, Printer, FileText, ZoomIn, ZoomOut } from "lucide-react";
import QuotePdfDocument from "./QuotePdfDocument";

export default function QuotePdfModal({ isOpen, onClose, quote }) {
  const pdfRef = useRef();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const toast = useToast();

  const handleAutoFit = () => {
    const availableW = window.innerWidth - 32;
    const fitScale = Math.min(1, Math.max(0.38, availableW / 800));
    setZoomLevel(Number(fitScale.toFixed(2)));
  };

  useEffect(() => {
    if (isOpen) {
      if (window.innerWidth < 800) {
        handleAutoFit();
      } else {
        setZoomLevel(1);
      }
    }
  }, [isOpen]);

  if (!quote) return null;

  const docNumber = quote.opNum || quote.docNum || quote.id || quote.docNumber || "COT-000000";

  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      setIsPrintMode(true);
      
      await new Promise((res) => setTimeout(res, 100));

      const element = pdfRef.current;
      if (!element) return;

      const origWidth = element.style.width;
      const origMaxW = element.style.maxWidth;
      const origMinH = element.style.minHeight;
      const origBoxShadow = element.style.boxShadow;
      const wrapperEl = element.parentElement;
      const origTransform = wrapperEl ? wrapperEl.style.transform : "";

      if (wrapperEl) {
        wrapperEl.style.transform = "none";
      }

      // Dimensiones A4 fijas y ultra nítidas
      element.style.width = "800px";
      element.style.maxWidth = "800px";
      element.style.minHeight = "1130px";
      element.style.boxShadow = "none";

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
      
      // Ajustar perfectamente a 1 página A4 estándar (210mm x 297mm)
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save(`Autopartes_Cotizacion_${docNumber}.pdf`);

      toast({
        title: "✅ PDF Descargado en Alta Calidad",
        description: `Se ha guardado Autopartes_Cotizacion_${docNumber}.pdf en tus descargas.`,
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "full", sm: "4xl", md: "5xl" }}
      scrollBehavior="inside"
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" className="no-print" />
      <ModalContent borderRadius={{ base: "none", sm: "2xl" }} overflow="hidden" maxH={{ base: "100vh", md: "92vh" }}>
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
            .chakra-portal > * {
              display: block !important;
              position: static !important;
              overflow: visible !important;
              height: auto !important;
              width: 100% !important;
            }
            .chakra-modal__content-container {
              position: static !important;
              display: block !important;
              width: 100% !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .chakra-modal__content {
              position: static !important;
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
              background: transparent !important;
            }
            .chakra-modal__body {
              position: static !important;
              display: block !important;
              width: 100% !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              padding: 0 !important;
              margin: 0 !important;
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

        <ModalHeader bg="emerald.900" color="white" py={{ base: 3, md: 3.5 }} px={{ base: 3, md: 6 }} className="no-print">
          <Flex justify="space-between" align="center" pr={8}>
            <HStack spacing={2}>
              <FileText className="w-5 h-5 text-emerald-400" />
              <Text fontSize={{ base: "xs", sm: "sm", md: "md" }} fontWeight="800" isTruncated maxW={{ base: "190px", sm: "350px", md: "full" }}>
                Vista Previa de Cotización Electrónica
              </Text>
            </HStack>
            <Badge colorScheme="green" fontSize={{ base: "2xs", sm: "xs" }} px={2.5} py={0.5} borderRadius="full">
              {docNumber}
            </Badge>
          </Flex>
        </ModalHeader>
        <ModalCloseButton color="white" top={3} right={3} />

        {/* BARRA SUPERIOR DE HERRAMIENTAS: ZOOM Y DESCARGA (Fija y siempre visible en Móvil y PC) */}
        <Box
          bg="#0f172a"
          px={{ base: 3, md: 5 }}
          py={2}
          borderBottom="1px solid rgba(255, 255, 255, 0.12)"
          className="no-print"
        >
          <Flex justify="space-between" align="center" gap={2}>
            {/* Controles de Zoom */}
            <HStack spacing={1.5}>
              <Button
                size="xs"
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.300" }}
                onClick={() => setZoomLevel((z) => Math.max(0.35, Number((z - 0.15).toFixed(2))))}
                title="Alejar (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <Badge
                cursor="pointer"
                onClick={() => setZoomLevel(1)}
                bg="emerald.500"
                color="white"
                px={2}
                py={0.5}
                borderRadius="full"
                fontSize="xs"
                fontWeight="800"
                title="Restablecer 100%"
              >
                {Math.round(zoomLevel * 100)}%
              </Badge>
              <Button
                size="xs"
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.300" }}
                onClick={() => setZoomLevel((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))))}
                title="Acercar (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="xs"
                variant="outline"
                colorScheme="teal"
                color="emerald.200"
                borderColor="emerald.500"
                px={2}
                h="24px"
                fontSize="11px"
                fontWeight="700"
                _hover={{ bg: "emerald.900" }}
                onClick={handleAutoFit}
              >
                Ajustar
              </Button>
              <Button
                size="xs"
                variant="outline"
                colorScheme="teal"
                color="emerald.200"
                borderColor="emerald.500"
                px={2}
                h="24px"
                fontSize="11px"
                fontWeight="700"
                _hover={{ bg: "emerald.900" }}
                onClick={() => setZoomLevel(1)}
              >
                100%
              </Button>
            </HStack>

            {/* Botón de Descarga Directa */}
            <Button
              size="xs"
              colorScheme="green"
              bg="#10b981"
              _hover={{ bg: "#059669" }}
              color="white"
              fontWeight="800"
              px={3}
              h="26px"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleDownloadPdf}
              isLoading={isGenerating}
              loadingText="..."
            >
              Descargar PDF
            </Button>
          </Flex>
        </Box>

        <ModalBody p={{ base: 2, sm: 4, md: 6 }} bg="#1e293b" overflowY="auto" overflowX="auto" sx={{ WebkitOverflowScrolling: "touch" }}>
          {/* Lienzo del Documento con Zoom y Ancho Fijo de PC (Nunca comprimido en móvil) */}
          <Box
            w="full"
            display="flex"
            justifyContent="center"
            alignItems="flex-start"
            minW="800px"
          >
            <Box
              w="800px"
              minW="800px"
              maxW="800px"
              boxShadow="2xl"
              borderRadius="md"
              overflow="hidden"
              bg="white"
              style={{
                transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
                transformOrigin: "top center",
                transition: "transform 0.12s ease-out",
                marginBottom: zoomLevel > 1 ? `${(zoomLevel - 1) * 1150}px` : "0px",
              }}
            >
              <QuotePdfDocument ref={pdfRef} quote={quote} isPrintMode={isPrintMode} />
            </Box>
          </Box>
        </ModalBody>

        <ModalFooter bg="gray.50" borderTop="1px solid" borderColor="gray.200" py={{ base: 3, md: 3.5 }} px={{ base: 3, md: 6 }} className="no-print">
          <Stack
            direction={{ base: "column", sm: "row" }}
            justify="space-between"
            align={{ base: "stretch", sm: "center" }}
            spacing={{ base: 3, sm: 4 }}
            w="100%"
          >
            <Text fontSize="2xs" color="gray.500" fontWeight="600" textAlign={{ base: "center", sm: "left" }}>
              💡 Documento formateado con el diseño impreso oficial de Autopartes S.A.
            </Text>
            <HStack spacing={2.5} w={{ base: "full", sm: "auto" }}>
              <Button
                variant="outline"
                size={{ base: "md", sm: "sm" }}
                flex={{ base: 1, sm: "initial" }}
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={handlePrint}
                fontWeight="700"
              >
                Imprimir
              </Button>
              <Button
                colorScheme="green"
                bg="#126C36"
                _hover={{ bg: "#0d5228" }}
                size={{ base: "md", sm: "sm" }}
                flex={{ base: 1, sm: "initial" }}
                leftIcon={<Download className="w-4 h-4" />}
                onClick={handleDownloadPdf}
                isLoading={isGenerating}
                loadingText="Generando..."
                fontWeight="800"
              >
                Descargar PDF
              </Button>
            </HStack>
          </Stack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
