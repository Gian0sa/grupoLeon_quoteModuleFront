import React, { useRef } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Box,
  Flex,
  Text,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  HStack,
  VStack,
  Divider,
  Badge,
  Grid,
  Image
} from "@chakra-ui/react";
import { Printer, Download, Eye, CheckCircle2, FileText, Share2, Edit3 } from "lucide-react";

const money = (val, currency = "USD") => {
  const num = Number(val || 0);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: currency === "PEN" ? "PEN" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export function SapQuoteDocumentModal({ isOpen, onClose, quote, onLoadToForm }) {
  const printRef = useRef(null);

  if (!quote) return null;

  const client = quote.client || {};
  const products = quote.products || quote.items || [];
  const tc = quote.totals?.tc || 3.43;

  // Totales
  const subtotalUSD = quote.totals?.subtotalUSD || products.reduce((acc, p) => acc + (Number(p.price || p.unitPrice || 0) * Number(p.quantity || 1)), 0);
  const discountUSD = quote.totals?.totalDiscountUSD || products.reduce((acc, p) => {
    const base = Number(p.price || p.unitPrice || 0) * Number(p.quantity || 1);
    return acc + (base * (Number(p.discount || 0) / 100));
  }, 0);
  const netUSD = Math.max(0, subtotalUSD - discountUSD);
  const igvUSD = quote.totals?.igvUSD || (netUSD * 0.18);
  const grandTotalUSD = quote.totals?.grandTotalUSD || quote.totals?.grandTotal || (netUSD + igvUSD);
  const grandTotalSOL = quote.totals?.grandTotalSOL || (grandTotalUSD * tc);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)" />
      <ModalContent borderRadius="2xl" overflow="hidden" boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.35)">
        <ModalHeader bg="#126C36" color="white" py={4} px={6} display="flex" alignItems="center" justifyContent="space-between">
          <HStack spacing={3}>
            <FileText className="w-6 h-6 text-emerald-300" />
            <Box>
              <Heading size="sm" color="white" fontWeight="800">
                Vista Previa de Documento SAP — Oferta de Ventas
              </Heading>
              <Text fontSize="xs" color="emerald.100">
                Formato Oficial de Cotización Alineado a SAP Business One
              </Text>
            </Box>
          </HStack>
          <ModalCloseButton color="white" position="static" />
        </ModalHeader>

        <ModalBody p={6} bg="gray.50" id="sap-print-area" ref={printRef}>
          {/* Estilos específicos para impresión directa en PDF o Impresora */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #sap-print-area, #sap-print-area * {
                visibility: visible;
              }
              #sap-print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                padding: 20px !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          {/* CONTENEDOR TIPO HOJA DE PAPEL SAP */}
          <Box
            bg="white"
            p={{ base: 6, md: 8 }}
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.300"
            boxShadow="sm"
            position="relative"
          >
            {/* 1. ENCABEZADO EMPRESA Y CAJA RUC */}
            <Flex justify="space-between" align="flex-start" mb={6} pb={6} borderBottom="2px solid" borderColor="emerald.800">
              <HStack spacing={4} align="flex-start">
                <Box
                  w="55px"
                  h="55px"
                  bg="emerald.900"
                  borderRadius="xl"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  fontWeight="900"
                  fontSize="xl"
                  boxShadow="md"
                >
                  GL
                </Box>
                <VStack align="flex-start" spacing={0.5}>
                  <Heading size="md" color="emerald.950" fontWeight="900" letterSpacing="tight">
                    AUTOPARTES S.A.
                  </Heading>
                  <Text fontSize="xs" fontWeight="700" color="gray.700">
                    GRUPO LEÓN — IMPORTACIONES Y DISTRIBUCIÓN
                  </Text>
                  <Text fontSize="0.7rem" color="gray.500">
                    Av. Nicolás Arriola N° 2146, La Victoria — Lima, Perú
                  </Text>
                  <Text fontSize="0.7rem" color="gray.500">
                    Teléf: (01) 619-3800 | Email: ventas@autopartes.pe
                  </Text>
                </VStack>
              </HStack>

              {/* CAJA COMPROBANTE SAP */}
              <Box
                border="2px solid"
                borderColor="emerald.800"
                borderRadius="lg"
                p={3}
                textAlign="center"
                minW="220px"
                bg="emerald.50/30"
              >
                <Text fontSize="xs" fontWeight="800" color="emerald.950" letterSpacing="wider">
                  R.U.C. N° 20144640269
                </Text>
                <Heading size="xs" color="emerald.800" my={1} fontWeight="900">
                  OFERTA DE VENTAS
                </Heading>
                <Text fontSize="sm" fontWeight="900" color="gray.900" fontFamily="mono">
                  {quote.docNumber || quote.id || "COT-017071"}
                </Text>
              </Box>
            </Flex>

            {/* 2. DATOS DEL CLIENTE Y DOCUMENTO (GRILLA ESTILO NATIVO SAP B1) */}
            <Grid templateColumns={{ base: "1fr", md: "1.3fr 1fr" }} gap={4} mb={6} bg="gray.50" p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
              {/* Columna Izquierda: Cliente */}
              <VStack align="stretch" spacing={1.5} fontSize="xs">
                <Flex>
                  <Text w="120px" fontWeight="700" color="gray.600">Cliente (Código):</Text>
                  <Text fontWeight="800" color="gray.900">{client.CardCode || "CL-88392"}</Text>
                </Flex>
                <Flex>
                  <Text w="120px" fontWeight="700" color="gray.600">Razón Social:</Text>
                  <Text fontWeight="800" color="emerald.900">{client.CardName || client.name || "CLIENTE NO REGISTRADO"}</Text>
                </Flex>
                <Flex>
                  <Text w="120px" fontWeight="700" color="gray.600">Dirección Fiscal:</Text>
                  <Text color="gray.800">{client.Address || client.address || "Dirección Principal Registrada"}</Text>
                </Flex>
                <Flex>
                  <Text w="120px" fontWeight="700" color="gray.600">Contacto SAP:</Text>
                  <Text color="gray.800">{quote.contactPerson || "Contacto Principal"}</Text>
                </Flex>
                {quote.refNumber && (
                  <Flex>
                    <Text w="120px" fontWeight="700" color="gray.600">Nº Ref. Cliente:</Text>
                    <Text color="gray.800" fontWeight="600">{quote.refNumber}</Text>
                  </Flex>
                )}
              </VStack>

              {/* Columna Derecha: Detalles del Documento */}
              <VStack align="stretch" spacing={1.5} fontSize="xs" borderLeft={{ md: "1px solid" }} borderColor={{ md: "gray.300" }} pl={{ md: 4 }}>
                <Flex justify="space-between">
                  <Text fontWeight="700" color="gray.600">Fecha Emisión:</Text>
                  <Text fontWeight="800" color="gray.900">{quote.docDate || new Date().toLocaleDateString()}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text fontWeight="700" color="gray.600">Fecha Vencimiento:</Text>
                  <Text fontWeight="700" color="gray.800">{quote.docDueDate || "15 días posteriores"}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text fontWeight="700" color="gray.600">Moneda Documento:</Text>
                  <Badge colorScheme="green" fontSize="0.65rem">USD ($) - Dólares</Badge>
                </Flex>
                <Flex justify="space-between">
                  <Text fontWeight="700" color="gray.600">Almacén Origen:</Text>
                  <Text fontWeight="800" color="emerald.800">014 — Almacén Principal</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text fontWeight="700" color="gray.600">Vendedor Asignado:</Text>
                  <Text fontWeight="700" color="gray.900">{quote.sellerName || "Vendedor Autorizado"}</Text>
                </Flex>
              </VStack>
            </Grid>

            {/* 3. TABLA DE ARTÍCULOS Y CONTENIDO */}
            <TableContainer mb={6} border="1px solid" borderColor="gray.300" borderRadius="lg">
              <Table variant="simple" size="sm">
                <Thead bg="emerald.900">
                  <Tr>
                    <Th color="white" fontSize="0.65rem" w="40px">#</Th>
                    <Th color="white" fontSize="0.65rem" w="120px">Código SAP</Th>
                    <Th color="white" fontSize="0.65rem">Descripción del Artículo</Th>
                    <Th color="white" fontSize="0.65rem" textAlign="center" w="60px">Alm.</Th>
                    <Th color="white" fontSize="0.65rem" textAlign="right" w="60px">Cant.</Th>
                    <Th color="white" fontSize="0.65rem" textAlign="right" w="90px">P. Unit (USD)</Th>
                    <Th color="white" fontSize="0.65rem" textAlign="right" w="70px">Desc %</Th>
                    <Th color="white" fontSize="0.65rem" textAlign="right" w="100px">Importe (USD)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {products.length === 0 ? (
                    <Tr>
                      <Td colSpan={8} textAlign="center" py={6} color="gray.400" fontSize="xs">
                        No hay productos registrados en esta cotización
                      </Td>
                    </Tr>
                  ) : (
                    products.map((item, idx) => {
                      const qty = Number(item.quantity || 1);
                      const price = Number(item.price || item.unitPrice || 0);
                      const disc = Number(item.discount || 0);
                      const base = qty * price;
                      const lineTotal = base - (base * (disc / 100));

                      return (
                        <Tr key={idx} _hover={{ bg: "gray.50" }}>
                          <Td fontSize="xs" color="gray.500" fontWeight="600">{idx + 1}</Td>
                          <Td fontSize="xs" fontWeight="800" color="gray.800" fontFamily="mono">{item.id || item.productCode || item.code || "ART-00"}</Td>
                          <Td fontSize="xs" fontWeight="700" color="gray.900">{item.name || item.productName || "Artículo Genérico"}</Td>
                          <Td fontSize="xs" textAlign="center" fontWeight="700" color="emerald.800">014</Td>
                          <Td fontSize="xs" textAlign="right" fontWeight="800">{qty}</Td>
                          <Td fontSize="xs" textAlign="right" fontFamily="mono">{money(price)}</Td>
                          <Td fontSize="xs" textAlign="right" color={disc > 0 ? "red.600" : "gray.500"} fontWeight={disc > 0 ? "700" : "normal"}>
                            {disc > 0 ? `${disc}%` : "—"}
                          </Td>
                          <Td fontSize="xs" textAlign="right" fontWeight="800" fontFamily="mono" color="emerald.900">
                            {money(lineTotal)}
                          </Td>
                        </Tr>
                      );
                    })
                  )}
                </Tbody>
              </Table>
            </TableContainer>

            {/* 4. PIE DE PÁGINA Y RESUMEN FINANCIERO */}
            <Grid templateColumns={{ base: "1fr", md: "1.2fr 1fr" }} gap={6} align="flex-start">
              {/* Observaciones y Términos */}
              <VStack align="stretch" spacing={3} fontSize="xs">
                <Box bg="#f8fafc" p={4} borderRadius="xl" border="1px solid" borderColor="#cbd5e1">
                  <Text fontWeight="800" color="#0f172a" mb={1.5} fontSize="0.75rem" textTransform="uppercase" letterSpacing="wide">
                    Condiciones Comerciales
                  </Text>
                  <Text color="#334155" fontSize="0.75rem" mb={1}>
                    • <strong style={{ color: '#0f172a' }}>Forma de Entrega:</strong> {quote.selectedDeliveryForm?.TrnspName || quote.deliveryForm || "Despacho en Lima Metropolitana"}
                  </Text>
                  <Text color="#334155" fontSize="0.75rem" mb={1}>
                    • <strong style={{ color: '#0f172a' }}>Agencia Transporte:</strong> {quote.selectedTransport?.Name || quote.transport || "Transporte Directo"}
                  </Text>
                  <Text color="#334155" fontSize="0.75rem">
                    • <strong style={{ color: '#0f172a' }}>Condición de Pago:</strong> {quote.selectedPaymentType?.PymntGroup || quote.selectedPaymentType?.label || quote.selectedPaymentType || "Contado / Transferencia"}
                  </Text>
                </Box>

                {quote.comment && (
                  <Box bg="#fffbeb" p={3.5} borderRadius="xl" border="1px solid" borderColor="#fde68a">
                    <Text fontWeight="800" color="#78350f" mb={0.5} fontSize="0.75rem" textTransform="uppercase">
                      Comentarios del Vendedor
                    </Text>
                    <Text color="#451a03" fontSize="0.75rem" fontStyle="italic">
                      "{quote.comment}"
                    </Text>
                  </Box>
                )}
              </VStack>

              {/* Cuadro de Totales Estilo SAP — Alto Contraste con Hex Codes */}
              <Box bg="#064e3b" color="#ffffff" p={5} borderRadius="xl" boxShadow="0 10px 20px -5px rgba(6, 78, 59, 0.4)">
                <VStack align="stretch" spacing={2.5} fontSize="xs">
                  <Flex justify="space-between" align="center" color="#e2e8f0">
                    <Text fontWeight="600">Subtotal Neto:</Text>
                    <Text fontFamily="mono" fontWeight="800" fontSize="sm" color="#ffffff">{money(netUSD)}</Text>
                  </Flex>
                  <Flex justify="space-between" align="center" color="#e2e8f0">
                    <Text fontWeight="600">I.G.V. (18%):</Text>
                    <Text fontFamily="mono" fontWeight="800" fontSize="sm" color="#ffffff">{money(igvUSD)}</Text>
                  </Flex>
                  <Divider borderColor="rgba(255, 255, 255, 0.25)" my={1} />
                  <Flex justify="space-between" align="center" color="#ffffff">
                    <Text fontWeight="900" fontSize="xs" letterSpacing="tight">TOTAL DOCUMENTO (USD):</Text>
                    <Text fontFamily="mono" fontWeight="900" fontSize="lg" color="#6ee7b7">
                      {money(grandTotalUSD)}
                    </Text>
                  </Flex>
                  <Flex
                    justify="space-between"
                    align="center"
                    pt={2}
                    mt={1}
                    borderTop="1px dashed"
                    borderColor="rgba(255, 255, 255, 0.2)"
                    bg="rgba(0, 0, 0, 0.2)"
                    p={2.5}
                    borderRadius="lg"
                  >
                    <Text fontSize="0.7rem" color="#cbd5e1" fontWeight="600">Equivalente en Soles (TC S/ {tc.toFixed(2)}):</Text>
                    <Text fontFamily="mono" fontWeight="900" fontSize="sm" color="#facc15">
                      S/ {grandTotalSOL.toFixed(2)}
                    </Text>
                  </Flex>
                </VStack>
              </Box>
            </Grid>

            {/* 5. SECCIÓN DE FIRMAS Y VALIDEZ LEGAL */}
            <Flex justify="space-between" align="flex-end" mt={10} pt={6} borderTop="1px solid" borderColor="#cbd5e1">
              <VStack spacing={1} align="center" w="220px">
                <Box borderBottom="2px solid" borderColor="#64748b" w="full" mb={1.5} />
                <Text fontSize="0.7rem" fontWeight="800" color="#1e293b">Firma / Sello Vendedor</Text>
                <Text fontSize="0.7rem" fontWeight="700" color="#475569">{quote.sellerName || "Vendedor Autorizado"}</Text>
              </VStack>

              <VStack spacing={1} align="center" w="220px">
                <Box borderBottom="2px solid" borderColor="#64748b" w="full" mb={1.5} />
                <Text fontSize="0.7rem" fontWeight="800" color="#1e293b">Conformidad Cliente</Text>
                <Text fontSize="0.7rem" fontWeight="700" color="#475569">Firma / Sello Recepción</Text>
              </VStack>
            </Flex>
          </Box>
        </ModalBody>

        <ModalFooter bg="white" borderTop="1px solid" borderColor="gray.200" py={3} px={6} display="flex" justify="space-between">
          <HStack spacing={2}>
            {onLoadToForm && (
              <Button
                colorScheme="blue"
                variant="outline"
                size="sm"
                leftIcon={<Edit3 className="w-4 h-4" />}
                onClick={() => {
                  onLoadToForm(quote);
                  onClose();
                }}
              >
                Cargar en Formulario
              </Button>
            )}
          </HStack>

          <HStack spacing={3}>
            <Button
              colorScheme="teal"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              Imprimir / Guardar PDF SAP
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default SapQuoteDocumentModal;
