import React, { useRef, useState } from "react";
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
import { Download, Printer, FileText } from "lucide-react";
import QuotePdfDocument from "./QuotePdfDocument";

export default function QuotePdfModal({ isOpen, onClose, quote }) {
  const pdfRef = useRef();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const toast = useToast();

  if (!quote) return null;

  const docNumber = quote.opNum || quote.docNum || quote.id || quote.docNumber || "COT-000000";

  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      setIsPrintMode(true); // Activa la tabla oficial A4 de 7 columnas para la captura
      
      // Esperar pequeño tick para que React renderice el estado A4
      await new Promise((res) => setTimeout(res, 80));

      const element = pdfRef.current;
      if (!element) return;

      // Guardar estilos responsivos de pantalla
      const origWidth = element.style.width;
      const origMaxW = element.style.maxWidth;
      const origMinH = element.style.minHeight;

      // Forzar dimensiones A4 impresas exactas para la captura en HD 2k
      element.style.width = "794px";
      element.style.maxWidth = "794px";
      element.style.minHeight = "1122px";

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Restaurar inmediatamente la maquetación responsiva de pantalla
      element.style.width = origWidth;
      element.style.maxWidth = origMaxW;
      element.style.minHeight = origMinH;
      setIsPrintMode(false);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Autopartes_Cotizacion_${docNumber}.pdf`);

      toast({
        title: "✅ PDF Descargado Exitosamente",
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
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <ModalContent borderRadius={{ base: "none", sm: "2xl" }} overflow="hidden" maxH={{ base: "100vh", md: "92vh" }}>
        <ModalHeader bg="emerald.900" color="white" py={{ base: 3, md: 3.5 }} px={{ base: 3, md: 6 }}>
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

        <ModalBody p={{ base: 2, sm: 4, md: 6 }} bg="#334155" overflowY="auto">
          <Box
            w="full"
            display="flex"
            justifyContent="center"
            alignItems="flex-start"
          >
            <Box
              w="full"
              maxW="210mm"
              boxShadow="2xl"
              borderRadius={{ base: "sm", sm: "md" }}
              overflow="hidden"
              bg="white"
            >
              <QuotePdfDocument ref={pdfRef} quote={quote} isPrintMode={isPrintMode} />
            </Box>
          </Box>
        </ModalBody>

        <ModalFooter bg="gray.50" borderTop="1px solid" borderColor="gray.200" py={{ base: 3, md: 3.5 }} px={{ base: 3, md: 6 }}>
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
