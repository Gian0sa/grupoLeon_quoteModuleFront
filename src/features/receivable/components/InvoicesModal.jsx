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
  Divider,
} from "@chakra-ui/react";
import { useState, useMemo } from "react";
import { downloadInvoicePDFdirectly } from "../../../features/reports/utils/pdfGenerators";
import { generateAccountStatementPDF } from "../utils/receivablePDF";
import { WhatsAppStatementModal } from "./WhatsAppStatementModal";
import { FileText, Download, Landmark, Calendar, DollarSign, AlertTriangle, CheckCircle2, MessageSquare } from "lucide-react";

export default function InvoicesModal({ isOpen, onClose, cliente = null, documentos = [] }) {
  const [loadingRef, setLoadingRef] = useState(null);
  const [filterType, setFilterType] = useState("all"); // 'all' | 'facturas' | 'letras' | 'vencidos'
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
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
    if (numDoc.startsWith("NC-") || numDoc.startsWith("ABO-") || numDoc.startsWith("AB0-") || tipo.includes("CREDITO") || tipo.includes("ABONO")) {
      return { label: "Nota Crédito / Abono", cuotaLabel: "Abono / Saldo a Favor", color: "cyan", icon: FileText };
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
    const num = Number(saldo ?? doc.totalDocumento ?? 0);
    const prefix = num < 0 ? "-" : "";
    return `${prefix}${symbol} ${Math.abs(num).toFixed(2)}`;
  };

  // Contadores para filtros
  const counts = useMemo(() => {
    let facturas = 0;
    let letras = 0;
    let vencidos = 0;

    docList.forEach((d) => {
      const numDoc = (d.numeroDocumento || d.NRO_DOC || "").toUpperCase();
      const tipo = (d.tipoDocumento || d.TIPO_DOC || "").toUpperCase();
      if (numDoc.startsWith("LC-") || tipo.includes("LETRA") || d.esLetra) {
        letras++;
      } else {
        facturas++;
      }
      if (d.estaVencido) {
        vencidos++;
      }
    });

    return { total: docList.length, facturas, letras, vencidos };
  }, [docList]);

  // Lista filtrada
  const filteredDocs = useMemo(() => {
    if (filterType === "facturas") {
      return docList.filter((d) => {
        const numDoc = (d.numeroDocumento || d.NRO_DOC || "").toUpperCase();
        const tipo = (d.tipoDocumento || d.TIPO_DOC || "").toUpperCase();
        return !d.esLetra && !numDoc.startsWith("LC-") && !tipo.includes("LETRA");
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
      size={{ base: "full", md: "5xl" }}
      isCentered
      scrollBehavior="inside"
    >
      <ModalOverlay backdropFilter="blur(4px)" bg="blackAlpha.600" />
      <ModalContent
        borderRadius={{ base: "none", md: "2xl" }}
        overflow="hidden"
        boxShadow="2xl"
        my={{ base: 0, md: 6 }}
        maxH={{ base: "100vh", md: "90vh" }}
      >
        {/* Cabecera Verde Adaptativa para Móvil y Desktop */}
        <ModalHeader bg="#126C36" color="white" py={{ base: 3, md: 3.5 }} px={{ base: 4, md: 6 }} position="relative">
          <Flex
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            align={{ base: "flex-start", md: "center" }}
            gap={{ base: 2.5, md: 4 }}
            pr={{ base: 8, md: 8 }}
          >
            <VStack align="flex-start" spacing={0.5}>
              <HStack spacing={2}>
                <FileText className="w-5 h-5 text-emerald-200" />
                <Text fontSize={{ base: "15px", sm: "16px", md: "18px" }} fontWeight="800" lineHeight="short">
                  Documentos y Cuotas del Cliente
                </Text>
              </HStack>
              <Text fontSize="xs" opacity={0.9} fontWeight="600" noOfLines={1}>
                {clientName} {clientCode && `• RUC: ${clientCode}`}
              </Text>
            </VStack>

            <HStack spacing={2} wrap="wrap" w={{ base: "full", md: "auto" }}>
              <Button
                size="xs"
                colorScheme="whatsapp"
                bg="#25d366"
                color="white"
                _hover={{ bg: "#22c55e" }}
                leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                onClick={() => setIsWhatsAppOpen(true)}
                fontWeight="800"
                borderRadius="md"
                px={3}
                h="30px"
                boxShadow="sm"
                fontSize="11.5px"
              >
                📲 Enviar WhatsApp / URL
              </Button>
              <Badge
                colorScheme="emerald"
                bg="whiteAlpha.300"
                color="white"
                px={2.5}
                py={1}
                borderRadius="full"
                fontSize="xs"
              >
                {docList.length} {docList.length === 1 ? "doc" : "docs"}
              </Badge>
            </HStack>
          </Flex>
          <ModalCloseButton color="white" top={{ base: 3, md: 3.5 }} right={{ base: 3, md: 4 }} />
        </ModalHeader>

        <ModalBody p={{ base: 3, md: 5 }} bg="gray.50">
          {/* Barra de Filtros por Pestaña con Scroll Suave en Móvil */}
          <HStack spacing={2} mb={3.5} overflowX="auto" pb={1} css={{ "&::-webkit-scrollbar": { display: "none" } }}>
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
              h="26px"
              fontWeight="700"
              flexShrink={0}
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
              h="26px"
              fontWeight="700"
              flexShrink={0}
            >
              📄 Facturas ({counts.facturas})
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
              h="26px"
              fontWeight="700"
              flexShrink={0}
            >
              🏛️ Letras ({counts.letras})
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
                h="26px"
                fontWeight="700"
                flexShrink={0}
              >
                ⚠️ Vencidos ({counts.vencidos})
              </Button>
            )}
          </HStack>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* 📱 VISTA MÓVIL: LISTA DE TARJETAS FLUIDAS (display: base -> md)  */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <Box display={{ base: "flex", md: "none" }} flexDirection="column" gap={3}>
            {filteredDocs.length === 0 ? (
              <Box bg="white" p={6} borderRadius="xl" textAlign="center" color="gray.500" border="1px solid" borderColor="gray.200">
                No hay documentos para el filtro seleccionado.
              </Box>
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
                const isOverdue = Boolean(doc.estaVencido);

                return (
                  <Box
                    key={index}
                    bg="white"
                    borderRadius="xl"
                    p={3.5}
                    boxShadow="sm"
                    border="1px solid"
                    borderColor={isOverdue ? "red.200" : "gray.200"}
                    position="relative"
                    overflow="hidden"
                  >
                    {/* Barra de acento lateral según estado */}
                    <Box
                      position="absolute"
                      left={0}
                      top={0}
                      bottom={0}
                      w="4px"
                      bg={isOverdue ? "red.500" : isLetra ? "purple.500" : "green.500"}
                    />

                    {/* Fila 1: Tipo + Saldo Pendiente */}
                    <Flex justify="space-between" align="center" mb={2}>
                      <HStack spacing={1.5}>
                        <Badge
                          colorScheme={typeInfo.color}
                          variant="subtle"
                          px={2}
                          py={0.5}
                          borderRadius="md"
                          fontSize="11px"
                          fontWeight="800"
                        >
                          {typeInfo.label}
                        </Badge>
                        {isOverdue ? (
                          <Badge colorScheme="red" fontSize="10px" px={1.5} py={0.5} borderRadius="sm" fontWeight="700">
                            Vencido
                          </Badge>
                        ) : (
                          <Badge colorScheme="green" variant="subtle" fontSize="10px" px={1.5} py={0.5} borderRadius="sm">
                            Al día
                          </Badge>
                        )}
                      </HStack>

                      <Text fontWeight="800" fontSize="15px" color={isOverdue ? "red.600" : "gray.900"}>
                        {formatMoney(doc)}
                      </Text>
                    </Flex>

                    {/* Fila 2: N° Documento y Ref Matriz */}
                    <Box mb={2}>
                      <Text fontWeight="800" fontSize="13.5px" color="gray.800">
                        {doc.numeroDocumento || doc.NRO_DOC || "—"}
                      </Text>
                      {doc.facturaOrigen && (
                        <Text fontSize="11px" color="gray.500" fontWeight="600">
                          Ref. Matriz: {normalizeRefCode(doc.facturaOrigen)}
                        </Text>
                      )}
                      {typeInfo.cuotaLabel && (
                        <Text fontSize="11px" color="gray.600" fontWeight="600" mt={0.5}>
                          Condición: {typeInfo.cuotaLabel}
                        </Text>
                      )}
                    </Box>

                    {/* Fila 3: Vencimiento */}
                    <HStack spacing={1.5} fontSize="11.5px" color="gray.600" mb={2.5}>
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <Text fontWeight="600">Vence:</Text>
                      <Text fontWeight="700" color={isOverdue ? "red.600" : "gray.800"}>
                        {doc.fechaContable || doc.fechaDocumento || doc.REFDATE || "—"}
                      </Text>
                    </HStack>

                    <Divider borderColor="gray.100" mb={2.5} />

                    {/* Fila 4: Acciones / Comprobante / N° Único a todo lo ancho */}
                    <Box>
                      {/* Caso Factura/Boleta con PDF descargable */}
                      {!isLetra && validRefs.length > 0 && (
                        <VStack spacing={1.5} align="stretch">
                          {validRefs.map((ref, i) => (
                            <Button
                              key={i}
                              size="sm"
                              colorScheme="green"
                              bg="#126C36"
                              _hover={{ bg: "#0e572b" }}
                              leftIcon={<Download className="w-4 h-4" />}
                              onClick={() => handleDownloadReference(ref)}
                              isLoading={loadingRef === ref}
                              borderRadius="lg"
                              fontSize="12px"
                              fontWeight="700"
                              h="34px"
                              w="full"
                            >
                              Descargar PDF ({ref})
                            </Button>
                          ))}
                        </VStack>
                      )}

                      {/* Caso Letra Pagada con Comprobante */}
                      {isLetra && isPaid && validRefs.length > 0 && (
                        <VStack spacing={1.5} align="stretch">
                          {validRefs.map((ref, i) => (
                            <Button
                              key={i}
                              size="sm"
                              colorScheme="green"
                              bg="#126C36"
                              _hover={{ bg: "#0e572b" }}
                              leftIcon={<Download className="w-4 h-4" />}
                              onClick={() => handleDownloadReference(ref)}
                              isLoading={loadingRef === ref}
                              borderRadius="lg"
                              fontSize="12px"
                              fontWeight="700"
                              h="34px"
                              w="full"
                            >
                              Descargar Boleta ({ref})
                            </Button>
                          ))}
                        </VStack>
                      )}

                      {/* Caso Letra Pendiente con N° Único SAP */}
                      {isLetra && !isPaid && (
                        <Flex justify="space-between" align="center" bg="purple.50" p={2} borderRadius="md" border="1px solid" borderColor="purple.200">
                          <HStack spacing={1.5}>
                            <Landmark className="w-4 h-4 text-purple-700" />
                            <Text fontSize="11.5px" fontWeight="800" color="purple.900">
                              N° Único SAP:
                            </Text>
                          </HStack>
                          <Badge colorScheme="purple" variant="solid" bg="purple.700" color="white" px={2} py={0.5} borderRadius="md" fontSize="11px" fontWeight="800">
                            {numeroUnico || "Registrada SAP"}
                          </Badge>
                        </Flex>
                      )}

                      {/* Caso sin PDF */}
                      {!isLetra && validRefs.length === 0 && (
                        <Text fontSize="11px" color="gray.400" fontStyle="italic" textAlign="center">
                          Comprobante físico / En proceso de sincronización
                        </Text>
                      )}
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* 💻 VISTA DESKTOP: TABLA CLÁSICA DE 5 COLUMNAS (display: md+)     */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <Box display={{ base: "none", md: "block" }} overflowX="auto" bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
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
                          {/* CASO 1: Factura o Boleta directa emitida */}
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

                          {/* CASO 2: Letra de Cambio Pagada con comprobante */}
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

                          {/* CASO 3: Letra de Cambio PENDIENTE -> N° Único SAP */}
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

                          {/* CASO 4: Sin PDF */}
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

    {/* Modal de Envío por WhatsApp y Enlace Web */}
    <WhatsAppStatementModal
      isOpen={isWhatsAppOpen}
      onClose={() => setIsWhatsAppOpen(false)}
      debt={cliente || {
        documents: docList,
        nombre: clientName,
        vendedor: salesperson,
        clientCode,
      }}
    />
  </>
  );
}
