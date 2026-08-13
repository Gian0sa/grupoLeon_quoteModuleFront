import React from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Box, Text, Flex, VStack, HStack, Badge, Button, Divider, Alert, AlertIcon
} from "@chakra-ui/react";
import { CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";

function formatRucOrDni(val) {
  if (!val) return "S/R";
  const str = String(val).trim();
  const digitsOnly = str.replace(/\D/g, "");
  if (digitsOnly.length === 11) return digitsOnly;
  if (digitsOnly.length === 8) return digitsOnly;
  const clean = str.replace(/^[A-Za-z]+/, "").trim();
  return clean || str;
}

export default function QuoteSubmitConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  quote
}) {
  if (!quote) return null;

  const { client, products = [], selectedPaymentType, selectedTransport, selectedDeliveryForm, comment, docDate, docDueDate, sellerName, docNumber } = quote;

  const clientName = client?.CardName || client?.name || "CLIENTE GENERAL";
  const rawRuc = client?.LicTradNum || client?.raw?.LicTradNum || client?.FederalTaxID || client?.raw?.FederalTaxID || client?.CardCode || client?.cardCode || "";
  const cleanRuc = formatRucOrDni(rawRuc);
  const rucLabel = cleanRuc.length === 8 ? "DNI" : "RUC";
  const address = client?.Address || client?.raw?.Address || client?.address || "-";

  const paymentLabel = typeof selectedPaymentType === "object"
    ? (selectedPaymentType?.PymntGroup || selectedPaymentType?.PaymentTermsGroupName || "Sin definir")
    : (selectedPaymentType || "Sin definir");

  const transportLabel = typeof selectedTransport === "object"
    ? (selectedTransport?.Name || selectedTransport?.name || "-")
    : (selectedTransport || "-");

  const totals = calculateQuoteTotals(products, 3.76);
  const itemCount = products.length;
  const totalQty = products.reduce((s, p) => s + Number(p.quantity || p.Quantity || 1), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered motionPreset="slideInBottom">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent borderRadius="2xl" border="2px solid #16a34a" overflow="hidden">
        {/* Header */}
        <ModalHeader bg="#0d6334" color="white" py={4}>
          <HStack spacing={3}>
            <AlertTriangle className="w-5 h-5 text-yellow-300" />
            <VStack align="flex-start" spacing={0}>
              <Text fontSize="md" fontWeight="900">Confirmar Envío de Cotización</Text>
              <Text fontSize="xs" fontWeight="600" opacity={0.85}>Verifica que todos los datos sean correctos antes de enviar a validación</Text>
            </VStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="white" />

        <ModalBody py={5}>
          <VStack align="stretch" spacing={4}>
            {/* Sección: Datos del Cliente */}
            <Box bg="#f0fdf4" border="1px solid #bbf7d0" borderRadius="lg" p={3}>
              <Text fontSize="xs" fontWeight="900" color="#166534" textTransform="uppercase" mb={2}>📌 Datos del Cliente</Text>
              <VStack align="flex-start" spacing={1} fontSize="sm">
                <HStack><Text fontWeight="700" color="#475569">Razón Social:</Text><Text fontWeight="800">{clientName}</Text></HStack>
                <HStack><Text fontWeight="700" color="#475569">{rucLabel}:</Text><Badge colorScheme="green" fontSize="sm" px={2}>{cleanRuc}</Badge></HStack>
                <HStack align="flex-start"><Text fontWeight="700" color="#475569" whiteSpace="nowrap">Dirección:</Text><Text fontSize="xs" color="#64748b">{address}</Text></HStack>
              </VStack>
            </Box>

            {/* Sección: Resumen de Productos */}
            <Box bg="#eff6ff" border="1px solid #bfdbfe" borderRadius="lg" p={3}>
              <Text fontSize="xs" fontWeight="900" color="#1e40af" textTransform="uppercase" mb={2}>📦 Resumen de Productos</Text>
              <HStack spacing={6} fontSize="sm">
                <HStack><Text fontWeight="700" color="#475569">Ítems:</Text><Badge colorScheme="blue">{itemCount}</Badge></HStack>
                <HStack><Text fontWeight="700" color="#475569">Cant. Total:</Text><Badge colorScheme="blue">{totalQty}</Badge></HStack>
              </HStack>
              {products.length > 0 && (
                <Box mt={2} maxH="120px" overflowY="auto" fontSize="xs" color="#334155">
                  {products.map((p, i) => (
                    <Flex key={i} justify="space-between" py={0.5} borderBottom="1px solid #e2e8f0">
                      <Text fontWeight="700" isTruncated maxW="60%">{p.itemCode || p.ItemCode || ""} {p.description || p.ItemDescription || p.name || "Producto"}</Text>
                      <Text fontWeight="800">{Number(p.quantity || p.Quantity || 1)} x ${Number(p.price || p.Price || 0).toFixed(2)}</Text>
                    </Flex>
                  ))}
                </Box>
              )}
            </Box>

            {/* Sección: Totales */}
            <Box bg="#fefce8" border="1px solid #fde68a" borderRadius="lg" p={3}>
              <Text fontSize="xs" fontWeight="900" color="#92400e" textTransform="uppercase" mb={2}>💰 Totales de la Cotización</Text>
              <VStack align="stretch" spacing={1} fontSize="sm">
                <Flex justify="space-between"><Text fontWeight="700" color="#475569">Total Venta Gravada:</Text><Text fontWeight="800">${totals.subtotalUSD.toFixed(2)}</Text></Flex>
                <Flex justify="space-between"><Text fontWeight="700" color="#475569">IGV (18%):</Text><Text fontWeight="800">${totals.igvUSD.toFixed(2)}</Text></Flex>
                <Divider borderColor="#fde68a" />
                <Flex justify="space-between"><Text fontWeight="900" color="#0d6334">Importe Total:</Text><Text fontWeight="900" color="#0d6334" fontSize="md">${totals.grandTotalUSD.toFixed(2)}</Text></Flex>
              </VStack>
            </Box>

            {/* Sección: Condiciones */}
            <Box bg="#f8fafc" border="1px solid #e2e8f0" borderRadius="lg" p={3}>
              <Text fontSize="xs" fontWeight="900" color="#475569" textTransform="uppercase" mb={2}>💳 Condiciones Comerciales</Text>
              <VStack align="flex-start" spacing={1} fontSize="sm">
                <HStack><Text fontWeight="700" color="#475569">Forma de Pago:</Text><Text fontWeight="800">{paymentLabel}</Text></HStack>
                <HStack><Text fontWeight="700" color="#475569">Transporte:</Text><Text fontWeight="800">{transportLabel}</Text></HStack>
                <HStack><Text fontWeight="700" color="#475569">Vendedor:</Text><Text fontWeight="800">{sellerName}</Text></HStack>
                {comment && <HStack align="flex-start"><Text fontWeight="700" color="#475569">Nota:</Text><Text fontSize="xs" color="#64748b">{comment}</Text></HStack>}
              </VStack>
            </Box>

            {/* Alerta Preventiva */}
            <Alert status="warning" borderRadius="lg" fontSize="xs" fontWeight="700">
              <AlertIcon />
              Al confirmar, Enrique (Asesora de Facturación) recibirá una notificación para la aprobación comercial. Podrás retirar la solicitud mientras Enrique no la haya abierto.
            </Alert>
          </VStack>
        </ModalBody>

        <ModalFooter bg="#f8fafc" borderTop="1px solid #e2e8f0" gap={3}>
          <Button
            variant="outline"
            onClick={onClose}
            fontWeight="800"
            borderRadius="xl"
            borderColor="#cbd5e1"
          >
            Volver y Revisar
          </Button>
          <Button
            colorScheme="green"
            bg="#0d6334"
            _hover={{ bg: "#166534" }}
            leftIcon={<Send className="w-4 h-4" />}
            onClick={onConfirm}
            fontWeight="900"
            borderRadius="xl"
            px={6}
          >
            ✅ Confirmar y Enviar a Validación
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
