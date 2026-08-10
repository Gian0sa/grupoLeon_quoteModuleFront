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
  Select as ChakraSelect,
  VStack,
  Text,
  Box,
  Flex,
  HStack,
  Badge,
  useToast
} from "@chakra-ui/react";
import { AlertTriangle, XCircle, Send } from "lucide-react";

const PREDEFINED_REASONS = [
  "Condiciones de pago o plazos no autorizados por gerencia",
  "Falta de stock parcial en Almacén 014",
  "Váucher de abono no coincide con el monto o número de operación",
  "Margen comercial por debajo del límite mínimo permitido",
  "Cliente registra deuda vencida pendiente de cancelación",
  "Otro motivo personalizado (especificar a continuación)"
];

export function RejectReasonModal({ isOpen, onClose, quoteId, onConfirmReject }) {
  const [selectedReason, setSelectedReason] = useState(PREDEFINED_REASONS[0]);
  const [customDetail, setCustomDetail] = useState("");
  const toast = useToast();

  const handleConfirm = () => {
    let finalNote = selectedReason;
    if (selectedReason.includes("Otro motivo") || customDetail.trim()) {
      finalNote = customDetail.trim() ? `${selectedReason}: ${customDetail.trim()}` : selectedReason;
    }

    if (!finalNote || finalNote.length < 5) {
      toast({
        title: "Motivo requerido",
        description: "Por favor especifica una razón válida para el rechazo de la cotización.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onConfirmReject(quoteId, finalNote);
    onClose();
    setSelectedReason(PREDEFINED_REASONS[0]);
    setCustomDetail("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", md: "md" }} isCentered scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
      <ModalContent
        borderRadius={{ base: "none", md: "2xl" }}
        overflow="hidden"
        boxShadow="2xl"
        mx={{ base: 0, md: 3 }}
        maxW={{ base: "100vw", md: "28rem" }}
      >
        <ModalHeader bg="red.600" color="white" py={3.5} px={{ base: 4, md: 6 }}>
          <HStack spacing={2.5} pr={8}>
            <XCircle className="w-5 h-5 text-red-200 flex-shrink-0" />
            <Text fontSize={{ base: "md", md: "sm" }} fontWeight="800" color="white">
              Rechazar Cotización {quoteId}
            </Text>
          </HStack>
          <ModalCloseButton color="white" w={{ base: "44px", md: "32px" }} h={{ base: "44px", md: "32px" }} />
        </ModalHeader>

        <ModalBody p={{ base: 4, md: 5 }}>
          <VStack align="stretch" spacing={4}>
            <Box bg="red.50" p={3} borderRadius="xl" border="1px solid" borderColor="red.200">
              <HStack spacing={2} align="flex-start">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <Text fontSize={{ base: "13px", md: "xs" }} color="red.800" fontWeight="600">
                  El rechazo notificará de inmediato al vendedor en su panel. Por favor registra la causa comercial exacta.
                </Text>
              </HStack>
            </Box>

            <Box>
              <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.700">
                Motivo Principal de Rechazo
              </FormLabel>
              <ChakraSelect
                size={{ base: "md", md: "sm" }}
                borderRadius="md"
                bg="white"
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
              >
                {PREDEFINED_REASONS.map((r, idx) => (
                  <option key={idx} value={r}>
                    {r}
                  </option>
                ))}
              </ChakraSelect>
            </Box>

            <Box>
              <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.700">
                Detalle u Observación Adicional (Obligatorio)
              </FormLabel>
              <Textarea
                size={{ base: "md", md: "sm" }}
                borderRadius="md"
                placeholder="Escribe observaciones específicas sobre por qué no fue factible autorizar esta cotización..."
                value={customDetail}
                onChange={(e) => setCustomDetail(e.target.value)}
                rows={3}
              />
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter bg="gray.50" borderTop="1px solid" borderColor="gray.200" py={3} px={{ base: 4, md: 6 }}>
          <Flex
            direction={{ base: "column-reverse", sm: "row" }}
            gap={3}
            w={{ base: "full", sm: "auto" }}
          >
            <Button
              variant="ghost"
              size={{ base: "md", md: "sm" }}
              w={{ base: "full", sm: "auto" }}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              colorScheme="red"
              size={{ base: "md", md: "sm" }}
              w={{ base: "full", sm: "auto" }}
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleConfirm}
              fontWeight="800"
            >
              Confirmar y Notificar Rechazo
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default RejectReasonModal;
