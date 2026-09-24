import React, { useState, useMemo } from "react";
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
  HStack,
  VStack,
  Text,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  InputGroup,
  InputLeftElement,
  useToast,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
} from "@chakra-ui/react";
import {
  Code2,
  FileJson,
  Copy,
  Check,
  Download,
  Search,
  Info,
  ShieldCheck,
  Building2,
  Package,
  CreditCard,
  Truck,
  UserCheck,
  Layers,
  Terminal,
  ExternalLink,
} from "lucide-react";
import {
  buildCanonicalSapPayload,
  groupPayloadByCategories,
  SAP_FIELD_DICTIONARY,
} from "../utils/sapPayloadGuide";

/**
 * Componente para renderizar JSON con colores de sintaxis (Syntax Highlighting)
 */
function SyntaxHighlightedJson({ jsonString, searchTerm = "" }) {
  const formattedHtml = useMemo(() => {
    if (!jsonString) return "";
    
    // Escapar caracteres html básicos
    let escaped = jsonString
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Expresión regular para colorear tokens JSON
    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "text-purple-300"; // número
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "text-cyan-400 font-bold"; // clave (key)
          } else {
            cls = "text-emerald-300"; // string
          }
        } else if (/true|false/.test(match)) {
          cls = "text-amber-400 font-semibold"; // boolean
        } else if (/null/.test(match)) {
          cls = "text-rose-400 italic"; // null
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }, [jsonString]);

  return (
    <Box
      as="pre"
      p={4}
      bg="#0b1120"
      color="#e2e8f0"
      borderRadius="xl"
      fontSize="12px"
      fontFamily="'Fira Code', 'Consolas', 'Courier New', monospace"
      lineHeight="1.6"
      overflowX="auto"
      border="1px solid rgba(255, 255, 255, 0.1)"
      maxH="550px"
      overflowY="auto"
      sx={{
        "&::-webkit-scrollbar": { width: "8px", height: "8px" },
        "&::-webkit-scrollbar-thumb": { bg: "rgba(255,255,255,0.2)", borderRadius: "4px" },
      }}
      dangerouslySetInnerHTML={{ __html: formattedHtml }}
    />
  );
}

/**
 * Modal exclusivo para Administradores: Inspector Técnico de Trama JSON SAP
 */
export function SapPayloadJsonModal({ isOpen, onClose, quote }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Si la cotización ya contiene la trama que fue enviada o almacenada, se usa directamente
  const effectivePayload = useMemo(() => {
    if (!quote) return {};
    if (quote.sentPayload && typeof quote.sentPayload === "object") return quote.sentPayload;
    if (quote._sentPayload && typeof quote._sentPayload === "object") return quote._sentPayload;
    if (quote.payload && typeof quote.payload === "object") return quote.payload;
    return buildCanonicalSapPayload(quote);
  }, [quote]);

  // Respuesta oficial de SAP si ya fue emitida
  const sapResponse = useMemo(() => {
    if (!quote) return null;
    if (quote.sapData && typeof quote.sapData === "object") return quote.sapData;
    if (quote.DocNum || quote.sapDocNum) {
      return {
        DocNum: quote.DocNum || quote.sapDocNum,
        DocEntry: quote.DocEntry || quote.sapDocEntry,
        CardCode: effectivePayload.CardCode,
        CardName: effectivePayload.CardName,
        DocTotal: quote.totals?.grandTotalUSD || quote.DocTotal,
        DocCurrency: effectivePayload.DocCurrency || "USD",
        SalesPersonCode: effectivePayload.SalesPersonCode,
        Status: "OFFICIAL_SAP_SAVED"
      };
    }
    return null;
  }, [quote, effectivePayload]);

  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(effectivePayload, null, 2);
    } catch (e) {
      return "{}";
    }
  }, [effectivePayload]);

  const sapResponseJsonString = useMemo(() => {
    try {
      return sapResponse ? JSON.stringify(sapResponse, null, 2) : "";
    } catch (e) {
      return "";
    }
  }, [sapResponse]);

  const categories = useMemo(() => {
    return groupPayloadByCategories(effectivePayload);
  }, [effectivePayload]);

  // Copiar al portapapeles
  const handleCopy = (textToCopy = jsonString, label = "Trama JSON") => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast({
      title: "📋 Copiado con Éxito",
      description: `${label} copiada al portapapeles.`,
      status: "success",
      duration: 2500,
      isClosable: true,
      position: "top-right"
    });
    setTimeout(() => setCopied(false), 2500);
  };

  // Descargar archivo .json
  const handleDownload = () => {
    const filename = `sap_order_payload_${effectivePayload.NumAtCard || "quote"}.json`;
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);

    toast({
      title: "⬇️ Archivo Descargado",
      description: `Archivo ${filename} guardado.`,
      status: "info",
      duration: 2500,
      isClosable: true,
      position: "top-right"
    });
  };

  const isEmittedToSap = Boolean(sapResponse?.DocNum || quote?.sapDocNum || quote?.DocNum);
  const docRef = effectivePayload.NumAtCard || quote?.docNumber || quote?.id || "NUEVO";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(5px)" />
      <ModalContent
        borderRadius="2xl"
        overflow="hidden"
        boxShadow="0 25px 60px -15px rgba(0, 0, 0, 0.7)"
        border="1px solid"
        borderColor="purple.300"
      >
        {/* CABECERA MODAL ESTILO DEVTOOLS / ADMIN */}
        <ModalHeader
          bg="linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)"
          color="white"
          py={4}
          px={6}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <HStack spacing={3}>
            <Box p={2.5} bg="purple.500" borderRadius="xl" boxShadow="md">
              <Code2 className="w-6 h-6 text-white stroke-[2.5]" />
            </Box>
            <Box>
              <HStack spacing={2}>
                <Text fontSize="lg" fontWeight="900" color="white" letterSpacing="tight">
                  Inspector Técnico SAP Service Layer
                </Text>
                <Badge
                  colorScheme="purple"
                  bg="purple.800"
                  color="purple.200"
                  border="1px solid"
                  borderColor="purple.400"
                  fontSize="10px"
                  px={2}
                  py={0.5}
                  borderRadius="full"
                  fontWeight="800"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <ShieldCheck className="w-3 h-3 text-purple-300" />
                  SOLO ADMINISTRADOR
                </Badge>
                {isEmittedToSap ? (
                  <Badge colorScheme="green" bg="#059669" color="white" fontSize="10px" px={2} py={0.5} borderRadius="full" fontWeight="800">
                    OFICIAL SAP #{sapResponse.DocNum}
                  </Badge>
                ) : (
                  <Badge colorScheme="amber" bg="#b45309" color="white" fontSize="10px" px={2} py={0.5} borderRadius="full" fontWeight="800">
                    SIMULACIÓN / PRE-ENVÍO
                  </Badge>
                )}
              </HStack>
              <Text fontSize="xs" color="purple.200" mt={0.5}>
                Estructura canónica de integración con SAP Business One HANA (Tabla ORDR & RDR1) • Ref: {docRef}
              </Text>
            </Box>
          </HStack>
          <ModalCloseButton color="white" position="static" />
        </ModalHeader>

        {/* BARRA SUPERIOR DE RESUMEN TÉCNICO Y ACCIONES */}
        <Box bg="#0f172a" px={6} py={3} borderBottom="1px solid rgba(255, 255, 255, 0.1)">
          <Flex direction={{ base: "column", sm: "row" }} justify="space-between" align={{ base: "stretch", sm: "center" }} gap={3}>
            {/* Badges de Claves Clave */}
            <HStack spacing={3} wrap="wrap">
              <HStack spacing={1.5} bg="whiteAlpha.100" px={2.5} py={1} borderRadius="md" border="1px solid rgba(255,255,255,0.1)">
                <Text fontSize="11px" color="gray.400" fontWeight="600">Cliente:</Text>
                <Text fontSize="11px" color="cyan.300" fontWeight="800" fontFamily="mono">
                  {effectivePayload.CardCode || "N/A"}
                </Text>
              </HStack>
              <HStack spacing={1.5} bg="whiteAlpha.100" px={2.5} py={1} borderRadius="md" border="1px solid rgba(255,255,255,0.1)">
                <Text fontSize="11px" color="gray.400" fontWeight="600">Líneas:</Text>
                <Text fontSize="11px" color="emerald.300" fontWeight="800" fontFamily="mono">
                  {effectivePayload.DocumentLines?.length || 0} ítems
                </Text>
              </HStack>
              <HStack spacing={1.5} bg="whiteAlpha.100" px={2.5} py={1} borderRadius="md" border="1px solid rgba(255,255,255,0.1)">
                <Text fontSize="11px" color="gray.400" fontWeight="600">Moneda:</Text>
                <Text fontSize="11px" color="amber.300" fontWeight="800" fontFamily="mono">
                  {effectivePayload.DocCurrency || "USD"}
                </Text>
              </HStack>
              <HStack spacing={1.5} bg="whiteAlpha.100" px={2.5} py={1} borderRadius="md" border="1px solid rgba(255,255,255,0.1)">
                <Text fontSize="11px" color="gray.400" fontWeight="600">Asesor SAP:</Text>
                <Text fontSize="11px" color="purple.300" fontWeight="800" fontFamily="mono">
                  ID {effectivePayload.SalesPersonCode || "20"}
                </Text>
              </HStack>
            </HStack>

            {/* Botones de Acción */}
            <HStack spacing={2}>
              <Button
                size="sm"
                bg="whiteAlpha.200"
                color="white"
                _hover={{ bg: "whiteAlpha.300" }}
                leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                onClick={() => handleCopy(jsonString, "Trama JSON")}
                fontSize="xs"
                fontWeight="700"
              >
                {copied ? "¡Copiado!" : "Copiar JSON"}
              </Button>
              <Button
                size="sm"
                bg="purple.600"
                color="white"
                _hover={{ bg: "purple.500" }}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleDownload}
                fontSize="xs"
                fontWeight="700"
              >
                Descargar .json
              </Button>
            </HStack>
          </Flex>
        </Box>

        {/* CUERPO DEL MODAL CON TABS */}
        <ModalBody p={6} bg="#f8fafc">
          <Tabs colorScheme="purple" variant="enclosed" isLazy>
            <TabList mb={4} borderColor="gray.300">
              <Tab fontWeight="800" fontSize="sm" _selected={{ color: "purple.700", bg: "white", borderColor: "gray.300", borderBottomColor: "white" }}>
                <HStack spacing={2}>
                  <Layers className="w-4 h-4 text-purple-600" />
                  <Text>🧭 Visor Guiado por Secciones</Text>
                </HStack>
              </Tab>
              <Tab fontWeight="800" fontSize="sm" _selected={{ color: "purple.700", bg: "white", borderColor: "gray.300", borderBottomColor: "white" }}>
                <HStack spacing={2}>
                  <Terminal className="w-4 h-4 text-cyan-600" />
                  <Text>💻 JSON Técnico Raw</Text>
                </HStack>
              </Tab>
              <Tab fontWeight="800" fontSize="sm" _selected={{ color: "purple.700", bg: "white", borderColor: "gray.300", borderBottomColor: "white" }}>
                <HStack spacing={2}>
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <Text>🏢 Respuesta Oficial SAP {isEmittedToSap && `(#${sapResponse.DocNum})`}</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* TAB 1: VISOR GUIADO Y ASISTIDO */}
              <TabPanel p={0}>
                {/* BUSCADOR RÁPIDO DE CAMPOS */}
                <Box mb={4}>
                  <InputGroup size="sm">
                    <InputLeftElement pointerEvents="none">
                      <Search className="w-4 h-4 text-gray-400" />
                    </InputLeftElement>
                    <Input
                      bg="white"
                      placeholder="Buscar campo (ej: CardCode, UnitPrice, U_VS_AFEDET, SalesPersonCode)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="gray.300"
                    />
                  </InputGroup>
                </Box>

                <VStack spacing={5} align="stretch">
                  {/* SECCIÓN 1: CABECERA */}
                  <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
                    <Flex align="center" justify="space-between" mb={2}>
                      <HStack spacing={2.5}>
                        <Box p={1.5} bg="purple.50" color="purple.700" borderRadius="md">
                          <Building2 className="w-4 h-4" />
                        </Box>
                        <Box>
                          <Text fontWeight="800" fontSize="sm" color="gray.800">
                            {categories.header.title}
                          </Text>
                          <Text fontSize="11px" color="gray.500">
                            {categories.header.description}
                          </Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme="purple" fontSize="10px">Tabla ORDR</Badge>
                    </Flex>
                    <Divider my={2} />

                    <Table size="sm" variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th fontSize="10px">Campo SAP</Th>
                          <Th fontSize="10px">Valor Generado</Th>
                          <Th fontSize="10px">Función en SAP B1</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {categories.header.fields
                          .filter(f => !searchTerm || f.key.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((f) => {
                            const meta = SAP_FIELD_DICTIONARY[f.key] || {};
                            return (
                              <Tr key={f.key} _hover={{ bg: "purple.50" }}>
                                <Td fontFamily="mono" fontWeight="700" color="purple.800" fontSize="12px">
                                  {f.key}
                                </Td>
                                <Td fontFamily="mono" fontSize="12px" color="gray.900" fontWeight="600">
                                  {String(f.value ?? "-")}
                                </Td>
                                <Td fontSize="11px" color="gray.600">
                                  {meta.description || meta.label || "Campo de cabecera estándar"}
                                </Td>
                              </Tr>
                            );
                          })}
                      </Tbody>
                    </Table>
                  </Box>

                  {/* SECCIÓN 2: LÍNEAS DE ARTÍCULOS */}
                  <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
                    <Flex align="center" justify="space-between" mb={2}>
                      <HStack spacing={2.5}>
                        <Box p={1.5} bg="emerald.50" color="emerald.700" borderRadius="md">
                          <Package className="w-4 h-4" />
                        </Box>
                        <Box>
                          <Text fontWeight="800" fontSize="sm" color="gray.800">
                            {categories.lines.title}
                          </Text>
                          <Text fontSize="11px" color="gray.500">
                            {categories.lines.description}
                          </Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme="green" fontSize="10px">Tabla RDR1</Badge>
                    </Flex>
                    <Divider my={2} />

                    <Box overflowX="auto">
                      <Table size="sm" variant="simple">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th fontSize="10px">#</Th>
                            <Th fontSize="10px">ItemCode</Th>
                            <Th fontSize="10px">Descripción</Th>
                            <Th fontSize="10px" isNumeric>Cant</Th>
                            <Th fontSize="10px" isNumeric>P. Lista (USD)</Th>
                            <Th fontSize="10px" isNumeric>Desc (%)</Th>
                            <Th fontSize="10px" isNumeric>P. Venta (USD)</Th>
                            <Th fontSize="10px">Almacén</Th>
                            <Th fontSize="10px">Impuesto</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {categories.lines.lines
                            .filter(l => !searchTerm || l.ItemCode.toLowerCase().includes(searchTerm.toLowerCase()) || l.ItemDescription.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map((line, idx) => (
                              <Tr key={idx} _hover={{ bg: "emerald.50" }}>
                                <Td fontSize="11px" color="gray.500">{idx + 1}</Td>
                                <Td fontFamily="mono" fontWeight="700" color="emerald.800" fontSize="11px">
                                  {line.ItemCode}
                                </Td>
                                <Td fontSize="11px" maxW="200px" isTruncated title={line.ItemDescription}>
                                  {line.ItemDescription}
                                </Td>
                                <Td fontSize="11px" fontWeight="700" isNumeric>{line.Quantity}</Td>
                                <Td fontSize="11px" fontFamily="mono" isNumeric>${Number(line.UnitPrice).toFixed(2)}</Td>
                                <Td fontSize="11px" fontWeight="800" color={line.DiscountPercent > 0 ? "rose.600" : "gray.600"} isNumeric>
                                  {line.DiscountPercent > 0 ? `${line.DiscountPercent}%` : "0%"}
                                </Td>
                                <Td fontSize="11px" fontFamily="mono" fontWeight="800" color="emerald.700" isNumeric>
                                  ${Number(line.Price).toFixed(2)}
                                </Td>
                                <Td fontSize="11px">
                                  <Badge colorScheme="blue" fontSize="9px">{line.WarehouseCode}</Badge>
                                </Td>
                                <Td fontSize="11px">
                                  <Badge colorScheme="purple" fontSize="9px">{line.TaxCode}</Badge>
                                </Td>
                              </Tr>
                            ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </Box>

                  {/* SECCIÓN 3: FINANZAS Y SUNAT */}
                  <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
                    <Flex align="center" justify="space-between" mb={2}>
                      <HStack spacing={2.5}>
                        <Box p={1.5} bg="amber.50" color="amber.700" borderRadius="md">
                          <CreditCard className="w-4 h-4" />
                        </Box>
                        <Box>
                          <Text fontWeight="800" fontSize="sm" color="gray.800">
                            {categories.financial.title}
                          </Text>
                          <Text fontSize="11px" color="gray.500">
                            {categories.financial.description}
                          </Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme="amber" fontSize="10px">OCTG & SUNAT</Badge>
                    </Flex>
                    <Divider my={2} />

                    <Table size="sm" variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th fontSize="10px">Campo SAP</Th>
                          <Th fontSize="10px">Valor Generado</Th>
                          <Th fontSize="10px">Normativa SUNAT / Regla Comercial</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {categories.financial.fields
                          .filter(f => !searchTerm || f.key.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((f) => {
                            const meta = SAP_FIELD_DICTIONARY[f.key] || {};
                            return (
                              <Tr key={f.key} _hover={{ bg: "amber.50" }}>
                                <Td fontFamily="mono" fontWeight="700" color="amber.900" fontSize="12px">
                                  {f.key}
                                </Td>
                                <Td fontFamily="mono" fontSize="12px" color="gray.900" fontWeight="600">
                                  {String(f.value ?? "-")}
                                </Td>
                                <Td fontSize="11px" color="gray.600">
                                  {meta.description || meta.label || "Parámetro financiero"}
                                </Td>
                              </Tr>
                            );
                          })}
                      </Tbody>
                    </Table>
                  </Box>

                  {/* SECCIÓN 4: LOGÍSTICA Y DESPACHO */}
                  <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
                    <Flex align="center" justify="space-between" mb={2}>
                      <HStack spacing={2.5}>
                        <Box p={1.5} bg="blue.50" color="blue.700" borderRadius="md">
                          <Truck className="w-4 h-4" />
                        </Box>
                        <Box>
                          <Text fontWeight="800" fontSize="sm" color="gray.800">
                            {categories.logistics.title}
                          </Text>
                          <Text fontSize="11px" color="gray.500">
                            {categories.logistics.description}
                          </Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme="blue" fontSize="10px">RDR12 & OSHP</Badge>
                    </Flex>
                    <Divider my={2} />

                    <Table size="sm" variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th fontSize="10px">Campo</Th>
                          <Th fontSize="10px">Valor Generado</Th>
                          <Th fontSize="10px">Uso en Despacho / Guía</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {categories.logistics.fields
                          .filter(f => !searchTerm || f.key.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((f) => {
                            const meta = SAP_FIELD_DICTIONARY[f.key] || {};
                            return (
                              <Tr key={f.key} _hover={{ bg: "blue.50" }}>
                                <Td fontFamily="mono" fontWeight="700" color="blue.800" fontSize="12px">
                                  {f.key}
                                </Td>
                                <Td fontFamily="mono" fontSize="12px" color="gray.900" fontWeight="600">
                                  {String(f.value ?? "-")}
                                </Td>
                                <Td fontSize="11px" color="gray.600">
                                  {meta.description || meta.label || "Configuración de despacho"}
                                </Td>
                              </Tr>
                            );
                          })}
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              </TabPanel>

              {/* TAB 2: JSON RAW */}
              <TabPanel p={0}>
                <Box position="relative">
                  <Flex justify="space-between" align="center" mb={2}>
                    <Text fontSize="xs" fontWeight="700" color="gray.600">
                      Trama enviada vía HTTP POST al endpoint Service Layer: <code>/b1s/v2/Orders</code>
                    </Text>
                    <Button
                      size="xs"
                      colorScheme="cyan"
                      variant="outline"
                      leftIcon={<Copy className="w-3 h-3" />}
                      onClick={() => handleCopy(jsonString, "Trama JSON")}
                    >
                      Copiar Trama Raw
                    </Button>
                  </Flex>
                  <SyntaxHighlightedJson jsonString={jsonString} searchTerm={searchTerm} />
                </Box>
              </TabPanel>

              {/* TAB 3: RESPUESTA OFICIAL DE SAP */}
              <TabPanel p={0}>
                {isEmittedToSap ? (
                  <VStack spacing={4} align="stretch">
                    <Box p={4} bg="emerald.50" borderRadius="xl" border="1.5px solid" borderColor="emerald.300">
                      <Flex align="center" justify="space-between">
                        <HStack spacing={3}>
                          <Box p={2} bg="emerald.500" color="white" borderRadius="lg">
                            <ShieldCheck className="w-6 h-6" />
                          </Box>
                          <Box>
                            <Text fontSize="md" fontWeight="900" color="emerald.900">
                              Documento Registrado Oficialmente en SAP HANA
                            </Text>
                            <Text fontSize="xs" color="emerald.700">
                              Base de Datos: <strong>{sapResponse.CompanyDB || "SBO_AJUSTES_2025"}</strong> • Orden #{sapResponse.DocNum} (DocEntry {sapResponse.DocEntry})
                            </Text>
                          </Box>
                        </HStack>
                        <Button
                          size="sm"
                          colorScheme="green"
                          leftIcon={<Copy className="w-3.5 h-3.5" />}
                          onClick={() => handleCopy(sapResponseJsonString, "Respuesta SAP")}
                        >
                          Copiar Respuesta
                        </Button>
                      </Flex>
                    </Box>

                    <SyntaxHighlightedJson jsonString={sapResponseJsonString} />
                  </VStack>
                ) : (
                  <Box p={8} bg="white" borderRadius="xl" border="1px dashed" borderColor="gray.300" textAlign="center">
                    <Box w={12} h={12} bg="purple.50" color="purple.600" borderRadius="full" display="flex" alignItems="center" justifyContent="center" mx="auto" mb={3}>
                      <Info className="w-6 h-6" />
                    </Box>
                    <Text fontSize="md" fontWeight="800" color="gray.800" mb={1}>
                      Esta cotización aún no ha sido emitida a SAP Business One
                    </Text>
                    <Text fontSize="xs" color="gray.500" maxW="500px" mx="auto" mb={4}>
                      Se encuentra en etapa de validación web o borrador. Al ser aprobada comercialmente y enviada a SAP Service Layer por el Administrador, aquí se reflejará el resultado contable oficial (DocNum, DocEntry y asientos).
                    </Text>
                    <Badge colorScheme="purple" p={2} borderRadius="md" fontSize="xs">
                      Trama técnica lista para emisión con {effectivePayload.DocumentLines?.length || 0} ítems
                    </Badge>
                  </Box>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        {/* PIE DEL MODAL */}
        <ModalFooter bg="white" borderTop="1px solid" borderColor="gray.200" py={3} px={6}>
          <Flex justify="space-between" align="center" w="full">
            <HStack spacing={2}>
              <Code2 className="w-4 h-4 text-purple-600" />
              <Text fontSize="11px" color="gray.500" fontWeight="600">
                Grupo León Microservicios • SAP Business One Service Layer Engine
              </Text>
            </HStack>
            <Button size="sm" onClick={onClose} fontWeight="700">
              Cerrar
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default SapPayloadJsonModal;
