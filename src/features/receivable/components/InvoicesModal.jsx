import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Box,
  Button,
  Badge,
  HStack,
  VStack,
  Text,
  useToast,
  Flex,
} from "@chakra-ui/react";
import { useState, useMemo } from "react";
import { downloadInvoicePDFdirectly } from "../../../features/reports/utils/pdfGenerators";
import { generateAccountStatementPDF } from "../utils/receivablePDF";
import { FileText, Download, Landmark } from "lucide-react";

export default function InvoicesModal({ isOpen, onClose, cliente = null, documentos = [] }) {
  const [loadingRef, setLoadingRef] = useState(null);
  const [filterType, setFilterType] = useState("all"); // 'all' | 'facturas' | 'letras' | 'vencidos'
  const toast = useToast();

  const docList = Array.isArray(documentos) ? documentos : (cliente?.documents || []);

  const normalizeRefCode = (code) => {
    if (!code) return "";
    const cleaned = String(code).replace(/[\/\s]/g, "");
    const match = cleaned.match(/^(\d{2})-?([A-Z0-9]{4})-?(\d+)$/i);
    if (match) {
      return `${match[1]}${match[2].toUpperCase()}-${match[3].padStart(8, "0")}`;
    }
    return cleaned;
  };

  const handleDownloadReference = async (referenceCode) => {
    const normalized = normalizeRefCode(referenceCode);
    if (!normalized) return;

    setLoadingRef(normalized);
    try {
      await downloadInvoicePDFdirectly(normalized);
      toast({
        title: "📄 Descarga iniciada",
        description: `Descargando comprobante ${normalized}.pdf`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error al descargar el PDF de la referencia:", error);
      toast({
        title: "No se pudo descargar el comprobante",
        description: error.message || "El comprobante no está disponible en TeFacturo o es un documento físico antiguo.",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
    } finally {
      setLoadingRef(null);
    }
  };

  const formatDocType = (doc) => {
    const numDoc = (doc.numeroDocumento || doc.NRO_DOC || "").toUpperCase();
    const tipo = (doc.tipoDocumento || doc.TIPO_DOC || "").toUpperCase();
    const condicion = doc.condicionPago || doc.CONDICION || "";
    const cuota = doc.cuotaTexto || "";

    if (numDoc.startsWith("LC-") || tipo.includes("LETRA") || doc.esLetra) {
      let cuotaBadge = cuota ? (condicion ? `${cuota} (${condicion})` : cuota) : (condicion || "Letra a Plazos");
      return {
        label: "Letra de Cambio",
        cuotaLabel: cuotaBadge,
        color: "purple",
        icon: Landmark,
      };
    }
    if (numDoc.startsWith("FAC-") || tipo.includes("FACTURA")) {
      return { label: "Factura", cuotaLabel: "Contado / Crédito", color: "green", icon: FileText };
    }
    if (numDoc.startsWith("BOL-") || tipo.includes("BOLETA")) {
      return { label: "Boleta", cuotaLabel: "Venta Directa", color: "blue", icon: FileText };
    }
    if (numDoc.startsWith("NC-") || tipo.includes("CREDITO")) {
      return { label: "Nota Crédito", cuotaLabel: "Abono / Devolución", color: "cyan", icon: FileText };
    }
    if (numDoc.startsWith("ND-") || tipo.includes("DEBITO")) {
      return { label: "Nota Débito", cuotaLabel: "Cargo Adicional", color: "orange", icon: FileText };
    }
    return { label: doc.tipoDocumento || "Comprobante", cuotaLabel: condicion, color: "gray", icon: FileText };
  };

  const formatMoney = (doc) => {
    const currency = doc.moneda || doc.tipoCambio || doc.TIPOCAMBIO || "USD";
    const symbol = currency === "PEN" || currency === "SOL" ? "S/" : "$";
    const saldo = doc.saldoPendiente
      ? (currency === "PEN" || currency === "SOL" ? doc.saldoPendiente.PEN : doc.saldoPendiente.USD)
      : doc.totalDocumento;
    const num = Number(saldo || doc.totalDocumento || 0);
    return `${symbol} ${Math.abs(num).toFixed(2)}`;
  };

  // Contadores para filtros
  const counts = useMemo(() => {
    let facturas = 0;
    let letras = 0;
    let vencidos = 0;

    docList.forEach((d) => {
      const numDoc = (d.numeroDocumento || d.NRO_DOC || "").toUpperCase();
      const isLtr = d.esLetra || numDoc.startsWith("LC-") || (d.tipoDocumento || "").toLowerCase().includes("letra");
      if (isLtr) letras++;
      else facturas++;

      if (d.estaVencido) vencidos++;
    });

    return { total: docList.length, facturas, letras, vencidos };
  }, [docList]);

  // Lista filtrada según pestaña activa
  const filteredDocs = useMemo(() => {
    if (filterType === "facturas") {
      return docList.filter((d) => {
        const numDoc = (d.numeroDocumento || d.NRO_DOC || "").toUpperCase();
        return !d.esLetra && !numDoc.startsWith("LC-") && !(d.tipoDocumento || "").toLowerCase().includes("letra");
      });
    }
    if (filterType === "letras") {
      return docList.filter((d) => {
        const numDoc = (d.numeroDocumento || d.NRO_DOC || "").toUpperCase();
        return d.esLetra || numDoc.startsWith("LC-") || (d.tipoDocumento || "").toLowerCase().includes("letra");
      });
    }
    if (filterType === "vencidos") {
      return docList.filter((d) => Boolean(d.estaVencido));
    }
    return docList;
  }, [docList, filterType]);

  const clientName = cliente?.nombre || cliente?.clientName || docList[0]?.CARDNAME || "Cliente";
  const clientCode = cliente?.clientCode || cliente?.ruc || docList[0]?.CARDCODE || "";
  const salesperson = cliente?.vendedor || docList[0]?.NOMBVENDEDOR || "No asignado";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" isCentered scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent borderRadius="2xl" overflow="hidden" boxShadow="2xl">
        <ModalHeader bg="#126C36" color="white" py={3.5} px={6}>
          <Flex justify="space-between" align="center" pr={6}>
            <HStack spacing={3}>
              <FileText className="w-5 h-5 text-emerald-200" />
              <Text fontSize="lg" fontWeight="800">
                Documentos y Cuotas del Cliente
              </Text>
            </HStack>
            <HStack spacing={2.5}>
              <Button
                size="xs"
                colorScheme="green"
                bg="white"
                color="#126C36"
                _hover={{ bg: "green.50", transform: "scale(1.02)" }}
                _active={{ transform: "scale(0.98)" }}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={() =>
                  generateAccountStatementPDF(
                    cliente || {
                      documents: docList,
                      nombre: clientName,
                      vendedor: salesperson,
                      clientCode,
                    }
                  )
                }
                fontWeight="800"
                borderRadius="md"
                px={3}
                h="28px"
                boxShadow="sm"
              >
                📄 Descargar Estado de Cuenta (PDF)
              </Button>
              <Badge colorScheme="emerald" bg="whiteAlpha.300" color="white" px={3} py={1} borderRadius="full" fontSize="xs">
                {docList.length} {docList.length === 1 ? "documento" : "documentos"}
              </Badge>
            </HStack>
          </Flex>
        </ModalHeader>
        <ModalCloseButton color="white" mt={1.5} />

        <ModalBody p={5} bg="gray.50">
          {/* Barra de Filtros por Pestaña */}
          <HStack spacing={2} mb={4} wrap="wrap">
            <Button
              size="xs"
              variant={filterType === "all" ? "solid" : "outline"}
              colorScheme="green"
              bg={filterType === "all" ? "#126C36" : "white"}
              color={filterType === "all" ? "white" : "gray.700"}
              borderColor="gray.300"
              onClick={() => setFilterType("all")}
              borderRadius="full"
              px={3}
              fontWeight="700"
            >
              Todos ({counts.total})
            </Button>
            <Button
              size="xs"
              variant={filterType === "facturas" ? "solid" : "outline"}
              colorScheme="green"
              bg={filterType === "facturas" ? "#126C36" : "white"}
              color={filterType === "facturas" ? "white" : "gray.700"}
              borderColor="gray.300"
              onClick={() => setFilterType("facturas")}
              borderRadius="full"
              px={3}
              fontWeight="700"
            >
              📄 Facturas / Boletas ({counts.facturas})
            </Button>
            <Button
              size="xs"
              variant={filterType === "letras" ? "solid" : "outline"}
              colorScheme="purple"
              bg={filterType === "letras" ? "purple.600" : "white"}
              color={filterType === "letras" ? "white" : "gray.700"}
              borderColor="gray.300"
              onClick={() => setFilterType("letras")}
              borderRadius="full"
              px={3}
              fontWeight="700"
            >
              🏛️ Letras de Cambio ({counts.letras})
            </Button>
            {counts.vencidos > 0 && (
              <Button
                size="xs"
                variant={filterType === "vencidos" ? "solid" : "outline"}
                colorScheme="red"
                bg={filterType === "vencidos" ? "red.600" : "white"}
                color={filterType === "vencidos" ? "white" : "gray.700"}
                borderColor="gray.300"
                onClick={() => setFilterType("vencidos")}
                borderRadius="full"
                px={3}
                fontWeight="700"
              >
                ⚠️ Solo Vencidos ({counts.vencidos})
              </Button>
            )}
          </HStack>

          <Box overflowX="auto" bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
            <Table variant="simple" size="sm">
              <Thead bg="gray.100">
                <Tr>
                  <Th color="gray.700" fontWeight="700">Tipo / Cuota</Th>
                  <Th color="gray.700" fontWeight="700">N° Documento</Th>
                  <Th color="gray.700" fontWeight="700">Vencimiento</Th>
                  <Th color="gray.700" fontWeight="700" isNumeric>Saldo Pendiente</Th>
                  <Th color="gray.700" fontWeight="700">Comprobante / N° Único SAP</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredDocs.length === 0 ? (
                  <Tr>
                    <Td colSpan={5} textAlign="center" py={6} color="gray.500">
                      No hay documentos para el filtro seleccionado.
                    </Td>
                  </Tr>
                ) : (
                  filteredDocs.map((doc, index) => {
                    const typeInfo = formatDocType(doc);
                    const isLetra = typeInfo.label === "Letra de Cambio";
                    const isPaid = Boolean(doc.estaPagado);
                    const rawRefs = Array.isArray(doc.referencia) ? doc.referencia : [];
                    const validRefs = rawRefs
                      .map(normalizeRefCode)
                      .filter((r) => Boolean(r) && !r.includes("0002-"));
                    const numeroUnico = doc.idUnico || doc.ID_UNICO || doc.letraSAP || "";

                    return (
                      <Tr key={index} _hover={{ bg: "gray.50" }} transition="background 0.15s">
                        <Td>
                          <VStack align="start" spacing={0.5}>
                            <Badge colorScheme={typeInfo.color} variant="subtle" px={2} py={0.5} borderRadius="md" fontSize="10.5px" fontWeight="700">
                              {typeInfo.label}
                            </Badge>
                            {typeInfo.cuotaLabel && (
                              <Text fontSize="10px" color="gray.600" fontWeight="700">
                                {typeInfo.cuotaLabel}
                              </Text>
                            )}
                          </VStack>
                        </Td>
                        <Td fontWeight="700" color="gray.800" fontSize="xs">
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="800" color="gray.900">
                              {doc.numeroDocumento || doc.NRO_DOC || "—"}
                            </Text>
                            {doc.facturaOrigen && (
                              <Text fontSize="10px" color="gray.400" fontWeight="600">
                                Ref: {normalizeRefCode(doc.facturaOrigen)}
                              </Text>
                            )}
                          </VStack>
                        </Td>
                        <Td fontSize="xs" color={doc.estaVencido ? "red.600" : "gray.600"} fontWeight={doc.estaVencido ? "700" : "500"}>
                          {doc.fechaContable || doc.fechaDocumento || doc.REFDATE || "—"}
                          {doc.estaVencido && (
                            <Badge ml={1} colorScheme="red" fontSize="9px" px={1} borderRadius="sm">
                              Vencido
                            </Badge>
                          )}
                        </Td>
                        <Td isNumeric fontWeight="800" color={doc.estaVencido ? "red.600" : "gray.800"} fontSize="xs">
                          {formatMoney(doc)}
                        </Td>
                        <Td>
                          {/* CASO 1: Es una Factura o Boleta directa emitida */}
                          {!isLetra && validRefs.length > 0 && (
                            <VStack align="start" spacing={1}>
                              {validRefs.map((ref, i) => (
                                <Button
                                  key={i}
                                  size="xs"
                                  colorScheme="green"
                                  variant="solid"
                                  bg="#126C36"
                                  _hover={{ bg: "#0e572b" }}
                                  leftIcon={<Download className="w-3 h-3" />}
                                  onClick={() => handleDownloadReference(ref)}
                                  isLoading={loadingRef === ref}
                                  borderRadius="md"
                                  fontSize="11px"
                                  fontWeight="700"
                                  h="26px"
                                >
                                  PDF ({ref})
                                </Button>
                              ))}
                            </VStack>
                          )}

                          {/* CASO 2: Es Letra de Cambio pero ya está PAGADA con comprobante emitido */}
                          {isLetra && isPaid && validRefs.length > 0 && (
                            <VStack align="start" spacing={1}>
                              {validRefs.map((ref, i) => (
                                <Button
                                  key={i}
                                  size="xs"
                                  colorScheme="green"
                                  variant="solid"
                                  bg="#126C36"
                                  _hover={{ bg: "#0e572b" }}
                                  leftIcon={<Download className="w-3 h-3" />}
                                  onClick={() => handleDownloadReference(ref)}
                                  isLoading={loadingRef === ref}
                                  borderRadius="md"
                                  fontSize="11px"
                                  fontWeight="700"
                                  h="26px"
                                >
                                  Boleta ({ref})
                                </Button>
                              ))}
                            </VStack>
                          )}

                          {/* CASO 3: Es Letra de Cambio PENDIENTE de pago -> MOSTRAR N° ÚNICO SAP / BANCARIO LIMPIO */}
                          {isLetra && !isPaid && (
                            <HStack spacing={1.5}>
                              <Badge
                                colorScheme="purple"
                                variant="solid"
                                bg="purple.700"
                                color="white"
                                px={2}
                                py={0.5}
                                borderRadius="md"
                                fontSize="10.5px"
                                fontWeight="700"
                              >
                                🏛️ N° Único: {numeroUnico || "Registrada SAP"}
                              </Badge>
                              {(doc.ubicacion || doc.UBICACION) && (
                                <Badge colorScheme="blue" variant="subtle" fontSize="9px" px={1.5} borderRadius="sm">
                                  {doc.ubicacion || doc.UBICACION}
                                </Badge>
                              )}
                            </HStack>
                          )}

                          {/* CASO 4: Documento sin PDF ni comprobante */}
                          {!isLetra && validRefs.length === 0 && (
                            <Text fontSize="xs" color="gray.400" fontStyle="italic">
                              Sin PDF disponible
                            </Text>
                          )}
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </Tbody>
            </Table>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
