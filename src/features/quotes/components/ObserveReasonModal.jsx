import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormLabel,
  Textarea,
  VStack,
  Text,
  Box,
  Flex,
  HStack,
  Badge,
  useToast,
  Wrap,
  WrapItem
} from "@chakra-ui/react";
import { MessageSquare, AlertCircle, Send } from "lucide-react";

const PREDEFINED_OBSERVATIONS = [
  "⚡ Descuento adicional fuera de margen permitido",
  "📦 Falta de stock parcial / revisar almacén de origen",
  "📝 Corregir datos de transporte, agencia o dirección de entrega",
  "💵 Corregir condición de venta o plazo de crédito",
  "🔍 Comprobante de pago ilegible o falta número de operación",
  "✏️ Otro motivo de observación (especificar abajo)"
];

export function ObserveReasonModal({ isOpen, onClose, quote, onConfirmObserve }) {
  const [selectedPreset, setSelectedPreset] = useState(PREDEFINED_OBSERVATIONS[0]);
  const [customDetail, setCustomDetail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  if (!quote) return null;
  const quoteId = typeof quote === "object" ? (quote.docNumber || quote.id || "COT-000000") : String(quote || "COT-000000");
  const sellerName = typeof quote === "object" ? (quote.sellerName || quote.createdByUsername || "Vendedor") : "Vendedor";

  const handleConfirm = async () => {
    let finalNote = selectedPreset;
    if (selectedPreset.includes("Otro motivo") || customDetail.trim()) {
      finalNote = customDetail.trim() ? `${selectedPreset}: ${customDetail.trim()}` : selectedPreset;
    }

    if (!finalNote || finalNote.trim().length < 5) {
      toast({
        title: "Observación requerida",
        description: "Por favor escribe una indicación clara de al menos 5 caracteres para que el vendedor sepa qué corregir.",
        status: "warning",
        duration: 3500,
        isClosable: true,
        position: "top-right"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmObserve(quote, finalNote.trim());
      onClose();
      setSelectedPreset(PREDEFINED_OBSERVATIONS[0]);
      setCustomDetail("");
    } catch (e) {
      console.error("Error al devolver cotización observada:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "full", md: "lg" }}
      isCentered
      scrollBehavior="inside"
    >
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)" />
      <ModalContent
        borderRadius={{ base: "none", md: "2xl" }}
        overflow="hidden"
        boxShadow="2xl"
        border="1.5px solid"
        borderColor="amber.200"
        maxW={{ base: "100vw", md: "32rem" }}
      >
        {/* Cabecera Cálida y Profesional */}
        <ModalHeader bg="#d97706" color="white" py={3.5} px={{ base: 4, md: 6 }}>
          <HStack spacing={2.5} pr={8} align="center">
            <MessageSquare className="w-5 h-5 text-amber-200 flex-shrink-0" />
            <Box>
              <Text fontSize={{ base: "md", md: "sm" }} fontWeight="900" color="white">
                Devolver Cotización con Observación
              </Text>
              <HStack spacing={2} mt={0.5}>
                <Badge bg="whiteAlpha.300" color="white" fontSize="9px" px={2} py={0.2} borderRadius="md" fontFamily="mono">
                  {quoteId}
                </Badge>
                <Text fontSize="11px" color="amber.100" fontWeight="600">
                  • Vend: {sellerName}
                </Text>
              </HStack>
            </Box>
          </HStack>
          <ModalCloseButton color="white" w={{ base: "44px", md: "32px" }} h={{ base: "44px", md: "32px" }} />
        </ModalHeader>

        <ModalBody p={{ base: 4, md: 5 }}>
          <VStack align="stretch" spacing={4}>
            {/* Banner Informativo */}
            <Box bg="#fffbeb" p={3.5} borderRadius="xl" border="1px solid" borderColor="#fcd34d">
              <HStack spacing={2.5} align="flex-start">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <VStack align="flex-start" spacing={0.5}>
                  <Text fontSize="xs" color="#92400e" fontWeight="800">
                    La cotización cambiará a estado "OBSERVADO"
                  </Text>
                  <Text fontSize="11px" color="#b45309" fontWeight="600">
                    Se notificará de inmediato al vendedor ({sellerName}) con tus comentarios para que corrija el documento y pueda reenviarlo a validación.
                  </Text>
                </VStack>
              </HStack>
            </Box>

            {/* Motivos Rápidos Predefinidos (Chips) */}
            <Box>
              <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={2}>
                Selecciona el Motivo Principal:
              </FormLabel>
              <Wrap spacing={2}>
                {PREDEFINED_OBSERVATIONS.map((preset, idx) => {
                  const isSelected = selectedPreset === preset;
                  return (
                    <WrapItem key={idx}>
                      <Button
                        size="xs"
                        variant={isSelected ? "solid" : "outline"}
                        colorScheme={isSelected ? "amber" : "gray"}
                        bg={isSelected ? "#d97706" : "white"}
                        color={isSelected ? "white" : "#475569"}
                        borderColor={isSelected ? "#d97706" : "#cbd5e1"}
                        _hover={isSelected ? { bg: "#b45309" } : { bg: "#fef3c7", borderColor: "#f59e0b" }}
                        onClick={() => setSelectedPreset(preset)}
                        fontWeight={isSelected ? "800" : "600"}
                        borderRadius="lg"
                        py={2}
                        px={3}
                        h="auto"
                        whiteSpace="normal"
                        textAlign="left"
                      >
                        {preset}
                      </Button>
                    </WrapItem>
                  );
                })}
              </Wrap>
            </Box>

            {/* Cuadro de Texto de Instrucciones Específicas */}
            <Box>
              <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={1}>
                Instrucción o Detalle Adicional para el Vendedor:
              </FormLabel>
              <Textarea
                size="sm"
                borderRadius="xl"
                bg="white"
                borderColor="#cbd5e1"
                _focus={{ borderColor: "#d97706", boxShadow: "0 0 0 1px #d97706" }}
                placeholder="Ejemplo: Por favor solicita váucher con número de operación claro y ajusta el descuento del ítem 2 al 10% máximo..."
                value={customDetail}
                onChange={(e) => setCustomDetail(e.target.value)}
                rows={3}
                fontSize="xs"
              />
              <Text fontSize="10px" color="gray.500" mt={1} textAlign="right">
                {customDetail.length > 0 ? `${customDetail.length} caracteres` : "Opcional si el motivo seleccionado es suficiente"}
              </Text>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter bg="gray.50" borderTop="1px solid" borderColor="gray.200" py={3} px={{ base: 4, md: 6 }}>
          <Flex
            direction={{ base: "column-reverse", sm: "row" }}
            justify="flex-end"
            gap={2.5}
            w="full"
          >
            <Button
              variant="ghost"
              size="sm"
              w={{ base: "full", sm: "auto" }}
              onClick={onClose}
              fontWeight="700"
            >
              Cancelar
            </Button>
            <Button
              bg="#d97706"
              color="white"
              _hover={{ bg: "#b45309" }}
              size="sm"
              w={{ base: "full", sm: "auto" }}
              leftIcon={<Send className="w-3.5 h-3.5" />}
              onClick={handleConfirm}
              isLoading={isSubmitting}
              fontWeight="800"
              borderRadius="lg"
              boxShadow="sm"
            >
              Devolver al Vendedor
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ObserveReasonModal;
