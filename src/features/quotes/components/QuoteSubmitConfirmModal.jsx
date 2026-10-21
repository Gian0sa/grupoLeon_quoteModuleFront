import React from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Box, Text, Flex, VStack, HStack, Badge, Button, Divider, Alert, AlertIcon
} from "@chakra-ui/react";
import { CheckCircle2, AlertTriangle, Send, Zap } from "lucide-react";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";
import {
  formatDeliveryForm,
  formatTransportName,
  formatPaymentTerms
} from "../../../shared/utils/quoteLogisticsFormatters";

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
  quote,
  isAdminApproval = false,
  isLoading = false
}) {
  if (!quote) return null;

  const { client, products = [], selectedPaymentType, selectedTransport, selectedDeliveryForm, comment, docDate, docDueDate, sellerName, docNumber } = quote;

  const clientName = client?.CardName || client?.name || "CLIENTE GENERAL";
  const rawRuc = client?.LicTradNum || client?.raw?.LicTradNum || client?.FederalTaxID || client?.raw?.FederalTaxID || client?.CardCode || client?.cardCode || "";
  const cleanRuc = formatRucOrDni(rawRuc);
  const rucLabel = cleanRuc.length === 8 ? "DNI" : "RUC";
  const address = client?.Address || client?.raw?.Address || client?.address || "-";

  const totals = quote.totals || calculateQuoteTotals(products, 3.76);
  const itemCount = products.length;
  const totalQty = products.reduce((s, p) => s + Number(p.quantity || p.Quantity || 1), 0);

  const inStockItems = products.filter(p => {
    const isAgotado = p.isAgotado === true || p.isAgotado === 1 || p.isAgotado === "true" || p.isAgotado === "Y";
    const stk = p.stock !== undefined && p.stock !== null ? Number(p.stock) : (p.stockChecked ? 0 : 1);
    return !isAgotado && stk > 0;
  });
  const backOrderItems = products.filter(p => {
    const isAgotado = p.isAgotado === true || p.isAgotado === 1 || p.isAgotado === "true" || p.isAgotado === "Y";
    const stk = p.stock !== undefined && p.stock !== null ? Number(p.stock) : (p.stockChecked ? 0 : 1);
    return isAgotado || stk <= 0;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered motionPreset="slideInBottom">
      <ModalOverlay bg="blackAlpha.700" />
      <ModalContent borderRadius="2xl" border={isAdminApproval ? "2px solid #0f5132" : "2px solid #16a34a"} overflow="hidden" boxShadow="0 20px 40px rgba(0,0,0,0.35)">
        {/* Header */}
        <ModalHeader
          bg={isAdminApproval ? "linear-gradient(135deg, #064e3b 0%, #0f5132 100%)" : "#0d6334"}
          color="white"
          py={4}
        >
          <HStack spacing={3} justify="space-between">
            <HStack spacing={3}>
              {isAdminApproval ? (
                <Zap className="w-6 h-6 text-yellow-300" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-300" />
              )}
              <VStack align="flex-start" spacing={0}>
                <Text fontSize="md" fontWeight="900">
                  {isAdminApproval ? "Confirmar Aprobación y Emisión a SAP B1" : "Confirmar Envío de Cotización"}
                </Text>
                <Text fontSize="xs" fontWeight="600" opacity={0.88}>
                  {isAdminApproval
                    ? "Verifica los datos del pedido antes de generar la Orden Oficial en SAP"
                    : "Verifica que todos los datos sean correctos antes de enviar a validación"}
                </Text>
              </VStack>
            </HStack>
            {isAdminApproval && (
              <Badge bg="whiteAlpha.300" color="yellow.300" fontSize="10px" px={2.5} py={0.5} borderRadius="md" fontWeight="800" border="1px solid rgba(255,255,255,0.3)">
                SAP B1 OFICIAL
              </Badge>
            )}
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="white" />

        <ModalBody py={5} maxH="70vh" overflowY="auto">
          <VStack align="stretch" spacing={4}>
            {/* Sección: Datos del Cliente */}
            <Box bg="#f0fdf4" border="1px solid #bbf7d0" borderRadius="lg" p={3}>
              <Text fontSize="xs" fontWeight="900" color="#166534" textTransform="uppercase" mb={2}>📌 Datos del Cliente</Text>
              <VStack align="flex-start" spacing={1} fontSize="sm">
                <HStack><Text fontWeight="700" color="#475569">Razón Social:</Text><Text fontWeight="800" color="gray.800">{clientName}</Text></HStack>
                <HStack><Text fontWeight="700" color="#475569">{rucLabel}:</Text><Badge colorScheme="green" fontSize="sm" px={2}>{cleanRuc}</Badge></HStack>
                <HStack align="flex-start"><Text fontWeight="700" color="#475569" whiteSpace="nowrap">Dirección:</Text><Text fontSize="xs" color="#64748b">{address}</Text></HStack>
              </VStack>
            </Box>

            {/* Sección: Resumen de Productos */}
            <Box bg="#eff6ff" border="1px solid #bfdbfe" borderRadius="lg" p={3}>
              <Flex justify="space-between" align="center" mb={2}>
                <Text fontSize="xs" fontWeight="900" color="#1e40af" textTransform="uppercase">📦 Resumen de Productos</Text>
                <HStack spacing={3}>
                  <Badge colorScheme="blue" fontSize="11px">Total Ítems: {itemCount}</Badge>
                  <Badge colorScheme="teal" fontSize="11px">Cant. Total: {totalQty}</Badge>
                </HStack>
              </Flex>

              {isAdminApproval && backOrderItems.length > 0 && (
                <Alert status="warning" py={1.5} px={3} borderRadius="md" mb={2} fontSize="xs">
                  <AlertIcon boxSize="14px" />
                  <Text fontWeight="700">
                    {backOrderItems.length} ítem(s) sin stock se registrarán como Demanda Back Order (solo {inStockItems.length} irán a SAP).
                  </Text>
                </Alert>
              )}

              {products.length > 0 && (
                <Box maxH="140px" overflowY="auto" fontSize="xs" color="#334155" pr={1}>
                  {products.map((p, i) => {
                    const isOutOfStock = backOrderItems.some(bo => bo.id === p.id || bo.code === p.code || bo.productCode === p.productCode);
                    return (
                      <Flex key={i} justify="space-between" align="center" py={1} borderBottom="1px solid #e2e8f0" gap={2}>
                        <HStack spacing={2} minW={0} flex={1}>
                          {isOutOfStock ? (
                            <Badge colorScheme="red" fontSize="9px" px={1}>SIN STOCK</Badge>
                          ) : (
                            <Badge colorScheme="green" fontSize="9px" px={1}>EN STOCK</Badge>
                          )}
                          <Text fontWeight="700" isTruncated>
                            {p.itemCode || p.ItemCode || ""} - {p.description || p.ItemDescription || p.name || p.productName || "Producto"}
                          </Text>
                        </HStack>
                        <Text fontWeight="800" whiteSpace="nowrap">
                          {Number(p.quantity || p.Quantity || 1)} x ${Number(p.unitPrice ?? p.price ?? p.Price ?? 0).toFixed(2)}
                        </Text>
                      </Flex>
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* Sección: Totales */}
            <Box bg="#fefce8" border="1px solid #fde68a" borderRadius="lg" p={3}>
              <Text fontSize="xs" fontWeight="900" color="#92400e" textTransform="uppercase" mb={2}>💰 Totales del Documento</Text>
              <VStack align="stretch" spacing={1} fontSize="sm">
                <Flex justify="space-between">
                  <Text fontWeight="700" color="#475569">Subtotal Gravado:</Text>
                  <Text fontWeight="800">${Number(totals.grossSubtotalUSD ?? totals.subtotalUSD ?? 0).toFixed(2)}</Text>
                </Flex>
                {Number(totals.totalDiscountUSD || 0) > 0 && (
                  <Flex justify="space-between" color="red.600">
                    <Text fontWeight="700">Descuento Aplicado ({totals.discPct || 0}%):</Text>
                    <Text fontWeight="800">-${Number(totals.totalDiscountUSD).toFixed(2)}</Text>
                  </Flex>
                )}
                <Flex justify="space-between">
                  <Text fontWeight="700" color="#475569">I.G.V. (18%):</Text>
                  <Text fontWeight="800">+${Number(totals.igvUSD || 0).toFixed(2)}</Text>
                </Flex>
                <Divider borderColor="#fde68a" />
                <Flex justify="space-between">
                  <Text fontWeight="900" color="#0d6334" fontSize="md">Importe Total Oficial:</Text>
                  <Text fontWeight="900" color="#0d6334" fontSize="lg">${Number(totals.grandTotalUSD || 0).toFixed(2)} USD</Text>
                </Flex>
              </VStack>
            </Box>

            {/* Sección: Condiciones Comerciales y Logística */}
            <Box bg="#f8fafc" border="1px solid #e2e8f0" borderRadius="lg" p={3}>
              <Text fontSize="xs" fontWeight="900" color="#475569" textTransform="uppercase" mb={2}>🚚 Logística & Términos</Text>
              <VStack align="flex-start" spacing={1} fontSize="xs">
                <HStack><Text fontWeight="700" color="#475569">Condición Comercial:</Text><Text fontWeight="800">{formatPaymentTerms(selectedPaymentType, quote.saleCondition) || quote.saleCondition || "CONTADO"}</Text></HStack>
                <HStack><Text fontWeight="700" color="#475569">Modalidad de Entrega:</Text><Text fontWeight="800">{formatDeliveryForm(selectedDeliveryForm)}</Text></HStack>
                <HStack><Text fontWeight="700" color="#475569">Transporte:</Text><Text fontWeight="800">{formatTransportName(selectedTransport, selectedDeliveryForm)}</Text></HStack>
              </VStack>
            </Box>

            {/* Sección: Responsable Comercial */}
            <Box bg="#f8fafc" border="1px solid #e2e8f0" borderRadius="lg" p={3}>
              <Text fontSize="xs" fontWeight="900" color="#475569" textTransform="uppercase" mb={2}>👤 Responsable Comercial</Text>
              <VStack align="flex-start" spacing={1} fontSize="sm">
                <HStack><Text fontWeight="700" color="#475569">Vendedor Asignado:</Text><Text fontWeight="800">{sellerName || "Vendedor Autorizado"}</Text></HStack>
                {comment && (
                  <HStack align="flex-start">
                    <Text fontWeight="700" color="#475569" whiteSpace="nowrap">Observación / Nota:</Text>
                    <Text fontSize="xs" color="#64748b">{comment}</Text>
                  </HStack>
                )}
              </VStack>
            </Box>

            {/* Alerta Preventiva */}
            {isAdminApproval ? (
              <Alert status="info" borderRadius="lg" fontSize="xs" fontWeight="700" bg="#eff6ff" border="1px solid #93c5fd" color="#1e3a8a">
                <AlertIcon color="#2563eb" />
                ⚡ Al confirmar, se emitirá la Orden de Venta Oficial directamente en SAP Business One. Esta acción creará un registro definitivo en el ERP.
              </Alert>
            ) : (
              <Alert status="warning" borderRadius="lg" fontSize="xs" fontWeight="700">
                <AlertIcon />
                Al confirmar, el equipo de Facturación recibirá la solicitud para validación comercial.
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter bg="#f8fafc" borderTop="1px solid #e2e8f0" gap={3}>
          <Button
            variant="outline"
            onClick={onClose}
            fontWeight="800"
            borderRadius="xl"
            borderColor="#cbd5e1"
            isDisabled={isLoading}
          >
            Volver y Revisar
          </Button>
          <Button
            colorScheme={isAdminApproval ? "teal" : "green"}
            bg={isAdminApproval ? "#0f5132" : "#0d6334"}
            _hover={{ bg: isAdminApproval ? "#093822" : "#166534" }}
            leftIcon={isAdminApproval ? <Zap className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            onClick={onConfirm}
            fontWeight="900"
            borderRadius="xl"
            px={6}
            isLoading={isLoading}
            isDisabled={isLoading}
          >
            {isAdminApproval ? "⚡ Aprobar y Emitir a SAP" : "✅ Confirmar y Enviar a Validación"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
