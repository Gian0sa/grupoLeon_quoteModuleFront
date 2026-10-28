import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Input,
  FormControl,
  FormLabel,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Flex,
  RadioGroup,
  Radio,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import {
  MessageSquare,
  Copy,
  Check,
  Send,
  Phone,
  Lock,
  RotateCcw,
  Save,
  Loader2,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";
import { fetchClientByCode } from "../../clients/services/clientService";
import {
  getClientPhone,
  saveClientPhone,
  normalizeClientKey,
} from "../../receivable/utils/clientPhoneDirectory";
import {
  formatPaymentTerms,
  formatDeliveryForm,
  cleanClientName,
  formatQuoteSellerName,
} from "../../../shared/utils/quoteLogisticsFormatters";
import QuotePdfModal from "./QuotePdfModal";

const extractProducts = (q) => {
  if (!q) return [];
  if (Array.isArray(q.products) && q.products.length > 0) return q.products;
  if (Array.isArray(q.items) && q.items.length > 0) return q.items;
  if (Array.isArray(q.lines) && q.lines.length > 0) return q.lines;
  if (Array.isArray(q.DocumentLines) && q.DocumentLines.length > 0) return q.DocumentLines;
  if (q.totals && Array.isArray(q.totals.normalizedProducts) && q.totals.normalizedProducts.length > 0) return q.totals.normalizedProducts;
  if (q.totals && Array.isArray(q.totals.products) && q.totals.products.length > 0) return q.totals.products;
  if (typeof q.products === "string") {
    try { const p = JSON.parse(q.products); if (Array.isArray(p)) return p; } catch (e) {}
  }
  if (typeof q.items === "string") {
    try { const p = JSON.parse(q.items); if (Array.isArray(p)) return p; } catch (e) {}
  }
  return [];
};

export function WhatsAppQuoteModal({ isOpen, onClose, quote }) {
  const toast = useToast();
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Detección dinámica de documento emitido a SAP
  const isEmittedToSap = useMemo(() => {
    if (!quote) return false;
    return Boolean(
      (quote.sapDocNum && String(quote.sapDocNum).trim() !== "") ||
      (quote.DocNum && !String(quote.DocNum).startsWith("COT-")) ||
      (quote.docNum && !String(quote.docNum).startsWith("COT-")) ||
      quote.status === "EMITIDO" ||
      quote.status === "EMITIDO_SAP" ||
      quote.status === "APROBADO_SAP" ||
      quote.isSyncedToSap === true
    );
  }, [quote]);

  const docTypeName = isEmittedToSap ? "Orden de Venta" : "Cotización";
  const docNumber = useMemo(() => {
    if (!quote) return "COT-PENDIENTE";
    if (isEmittedToSap) {
      return quote.sapDocNum || quote.DocNum || quote.docNum || quote.docNumber || "OV-PENDIENTE";
    }
    return quote.docNumber || (quote.id ? `COT-${String(quote.id).padStart(5, "0")}` : "COT-PENDIENTE");
  }, [quote, isEmittedToSap]);

  const clientKey = useMemo(() => {
    if (!quote) return "";
    const rawCode =
      quote.clientDocument ||
      quote.clientRuc ||
      quote.client?.CardCode ||
      quote.client?.LicTradNum ||
      quote.clientCode ||
      "";
    return normalizeClientKey(rawCode);
  }, [quote]);

  // Datos normalizados del cliente y vendedor
  const clientName = useMemo(() => {
    if (!quote) return "Estimado(a) Cliente";
    return cleanClientName(quote) || quote.client?.CardName || quote.client?.name || "Estimado(a) Cliente";
  }, [quote]);

  const clientCode = useMemo(() => {
    if (!quote) return "";
    return (
      quote.clientRuc ||
      quote.clientDocument ||
      quote.client?.LicTradNum ||
      quote.client?.CardCode ||
      ""
    );
  }, [quote]);

  const sellerName = useMemo(() => {
    if (!quote) return "Autopartes S.A.";
    return (
      quote.sellerName ||
      quote.salesPersonName ||
      quote.totals?.sellerName ||
      formatQuoteSellerName(quote) ||
      "Asesor Comercial"
    );
  }, [quote]);

  // Totales y productos
  const products = useMemo(() => extractProducts(quote), [quote]);
  const tcVal = Number(quote?.totals?.tc || quote?.docRate || quote?.DocRate) || 3.76;
  const calc = useMemo(() => calculateQuoteTotals(products, tcVal), [products, tcVal]);

  const totalUSD = useMemo(() => {
    if (!quote) return 0;
    const stored = Number(quote.totals?.grandTotalUSD ?? quote.grandTotalUSD ?? 0);
    if (stored > 0) return stored;
    return calc.grandTotalUSD || Number(quote.DocTotalFc || quote.DocTotalSys || quote.DocTotal || 0);
  }, [quote, calc]);

  const totalPEN = useMemo(() => {
    if (!quote) return 0;
    const storedSol = Number(quote.totals?.grandTotalSOL ?? quote.totals?.grandTotalPEN ?? 0);
    if (storedSol > 0) return storedSol;
    return calc.grandTotalSOL || Number((totalUSD * tcVal).toFixed(2));
  }, [quote, calc, totalUSD, tcVal]);

  // Estado del teléfono y origen
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sapOfficialPhone, setSapOfficialPhone] = useState("");
  const [hasSapPhone, setHasSapPhone] = useState(false);
  const [isUsingAlternativePhone, setIsUsingAlternativePhone] = useState(false);
  const [isLoadingSapPhone, setIsLoadingSapPhone] = useState(false);
  const [countryCode, setCountryCode] = useState("51");
  const [messageTone, setMessageTone] = useState("friendly"); // friendly | formal | urgent
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isSavedPhone, setIsSavedPhone] = useState(false);

  // Consulta inteligente del teléfono del cliente
  useEffect(() => {
    if (!isOpen || !quote) return;

    setIsUsingAlternativePhone(false);
    setIsSavedPhone(false);

    // 1. Revisar si ya viene con número directo en la cotización o en el objeto client
    const directCandidate =
      quote.clientPhone ||
      quote.client?.Cellular ||
      quote.client?.cellular ||
      quote.client?.Phone1 ||
      quote.client?.Phone2 ||
      quote.client?.telefono ||
      quote.phone ||
      quote.cellular ||
      quote.totals?.clientPhone ||
      "";

    const cleanDirect = String(directCandidate).replace(/\D/g, "");
    if (cleanDirect && cleanDirect.length >= 7) {
      const formattedDirect = cleanDirect.startsWith("51") && cleanDirect.length === 11
        ? cleanDirect.slice(2)
        : cleanDirect;
      setSapOfficialPhone(formattedDirect);
      setPhoneNumber(formattedDirect);
      setHasSapPhone(true);
      return;
    }

    // 2. Consulta con try/catch a SAP B1 mediante API
    const querySap = async () => {
      if (!clientKey) return;
      setIsLoadingSapPhone(true);
      try {
        let sapClient = null;
        try {
          sapClient = await fetchClientByCode(`CL${clientKey}`);
        } catch {
          try {
            sapClient = await fetchClientByCode(clientKey);
          } catch {}
        }

        if (sapClient) {
          const rawFound =
            sapClient.Cellular ||
            sapClient.Phone1 ||
            sapClient.Phone2 ||
            sapClient.ContactEmployees?.[0]?.MobilePhone ||
            sapClient.ContactEmployees?.[0]?.Phone1 ||
            "";
          const cleanSap = String(rawFound).replace(/\D/g, "");
          if (cleanSap && cleanSap.length >= 7) {
            const formattedSap = cleanSap.startsWith("51") && cleanSap.length === 11
              ? cleanSap.slice(2)
              : cleanSap;
            setSapOfficialPhone(formattedSap);
            setPhoneNumber(formattedSap);
            setHasSapPhone(true);
            return;
          }
        }

        // 3. Revisar en directorio local si no tiene teléfono en SAP
        const savedInDirectory = getClientPhone(clientKey);
        if (savedInDirectory) {
          setPhoneNumber(savedInDirectory);
          setHasSapPhone(false);
        } else {
          setPhoneNumber("");
          setHasSapPhone(false);
        }
      } catch (err) {
        console.warn("No se pudo obtener teléfono de cliente:", err);
        setHasSapPhone(false);
      } finally {
        setIsLoadingSapPhone(false);
      }
    };

    querySap();
  }, [isOpen, quote, clientKey]);

  // Guardar teléfono manualmente en el directorio local
  const handleSavePhoneManually = () => {
    const cleanNum = phoneNumber.replace(/\D/g, "");
    if (!cleanNum || cleanNum.length < 7) {
      toast({
        title: "Número inválido",
        description: "Por favor, ingresa un número de al menos 7 dígitos.",
        status: "warning",
        duration: 2500,
      });
      return;
    }
    const success = saveClientPhone(clientKey, cleanNum, clientName);
    if (success) {
      setIsSavedPhone(true);
      setTimeout(() => setIsSavedPhone(false), 3000);
      toast({
        title: "💾 Teléfono Guardado",
        description: `El número +${countryCode} ${cleanNum} quedó registrado para ${clientName}.`,
        status: "success",
        duration: 3000,
      });
    }
  };

  // Generación del mensaje de WhatsApp según el tono seleccionado
  const generatedMessage = useMemo(() => {
    if (!quote) return "";

    const conditionRaw = quote.saleCondition || quote.condicionVenta || quote.condicionPago || quote.paymentType || quote.selectedPaymentType || "CONTADO";
    const paymentDesc = formatPaymentTerms(quote.paymentType || quote.selectedPaymentType, conditionRaw) || conditionRaw;
    const deliveryDesc = formatDeliveryForm(quote.selectedDeliveryForm || quote.deliveryForm) || "Por coordinar con almacén";

    // Resumen de productos (hasta los primeros 4 ítems)
    const itemCount = products.length;
    let itemsText = "";
    if (itemCount > 0) {
      const topItems = products.slice(0, 4);
      const lines = topItems.map((p) => {
        const qty = Math.max(1, Number(p.quantity ?? p.Quantity ?? 1));
        const name = p.productName || p.name || p.description || p.sigla || p.itemCode || "Artículo";
        return `• ${qty}x ${name}`;
      });
      if (itemCount > 4) {
        lines.push(`• ... y ${itemCount - 4} artículo(s) adicional(es)`);
      }
      itemsText = `\n📦 *Detalle de Artículos:*\n${lines.join("\n")}\n`;
    }

    const totalUsdFormatted = `$ ${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    const totalPenFormatted = `S/ ${totalPEN.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (messageTone === "formal") {
      return (
`Estimado(a) *${clientName}*,

Por medio de la presente, *Autopartes S.A.* y su asesor comercial *${sellerName}* le remiten su *${docTypeName} Oficial Nº ${docNumber}*.
${itemsText}
💰 *Monto Total:* *${totalUsdFormatted}* (Equivalente referencial: ${totalPenFormatted})
💳 *Condición Comercial:* ${paymentDesc}
🚚 *Modalidad de Entrega:* ${deliveryDesc}

Adjuntamos el documento oficial en formato PDF para su revisión y conformidad comercial. Quedamos atentos a sus gentiles indicaciones.

Atentamente,
*${sellerName}*
*Autopartes S.A.*
Central: (01) 324-2600 | ventas@autopartes.pe`
      );
    } else if (messageTone === "urgent") {
      return (
`⚠️ *AVISO PRIORITARIO: Disponibilidad y Precios de Stock*

Estimado(a) *${clientName}*, le saluda *${sellerName}* de *Autopartes S.A.*

Le compartimos su *${docTypeName} Nº ${docNumber}* con confirmación de stock:
${itemsText}
💰 *Importe Total:* *${totalUsdFormatted}* (${totalPenFormatted})
⏰ *Validez de Precios y Stock:* Sujeto a rotación y disponibilidad inmediata en almacén.
💳 *Condición de Pago:* ${paymentDesc}

Le recomendamos confirmar su pedido y emitir su conformidad a la brevedad para asegurar la reserva inmediata de su mercadería.

Quedo a su disposición para coordinar el despacho.`
      );
    } else {
      // Friendly (Amable y Cercano) por defecto
      return (
`¡Hola *${clientName}*! 👋 Le saluda *${sellerName}* de *Autopartes S.A.*

Le compartimos el detalle de su *${docTypeName} Nº ${docNumber}*:
${itemsText}
💰 *Total:* *${totalUsdFormatted}* (Aprox. ${totalPenFormatted})
💳 *Forma de Pago:* ${paymentDesc}
🚚 *Entrega:* ${deliveryDesc}

Le adjuntamos el archivo PDF con las especificaciones completas. Cualquier duda o consulta con el pedido, estoy a su completa disposición. ¡Que tenga un excelente día!`
      );
    }
  }, [quote, products, totalUSD, totalPEN, docTypeName, docNumber, clientName, sellerName, messageTone]);

  // Manejar apertura de WhatsApp
  const handleOpenWhatsApp = () => {
    const cleanNum = phoneNumber.replace(/\D/g, "");
    if (!cleanNum || cleanNum.length < 7) {
      toast({
        title: "Número de teléfono no válido",
        description: "Por favor, ingresa un número de WhatsApp válido (ej. 987654321).",
        status: "warning",
        duration: 3500,
        isClosable: true,
      });
      return;
    }

    // Persistir en el directorio local para futuras consultas si es un número válido
    if (clientKey && cleanNum) {
      saveClientPhone(clientKey, cleanNum, clientName);
    }

    const fullPhone = cleanNum.startsWith("51") && cleanNum.length > 9
      ? cleanNum
      : `${countryCode}${cleanNum.replace(/^0+/, "")}`;

    const encodedText = encodeURIComponent(generatedMessage);
    const waUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");
    toast({
      title: "📲 Abriendo WhatsApp",
      description: `Redirigiendo chat con ${clientName}...`,
      status: "success",
      duration: 3000,
    });
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
      toast({
        title: "📋 Mensaje copiado",
        description: "El texto formateado para WhatsApp se copió al portapapeles.",
        status: "info",
        duration: 2500,
      });
    } catch {}
  };

  if (!quote) return null;

  const currentStatus = String(quote.approvalStatus || quote.state || quote.status || "PENDIENTE").toUpperCase();

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size={{ base: "full", md: "xl" }}
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay backdropFilter="blur(4px)" bg="blackAlpha.600" />
        <ModalContent borderRadius={{ base: "none", md: "2xl" }} overflow="hidden" boxShadow="2xl">
          {/* Cabecera Verde Corporativa */}
          <ModalHeader bg="#126C36" color="white" py={3.5} px={{ base: 4, md: 6 }}>
            <Flex justify="space-between" align="center">
              <HStack spacing={2.5}>
                <Box p={1.5} bg="whiteAlpha.200" borderRadius="lg">
                  <MessageSquare className="w-5 h-5 text-emerald-200" />
                </Box>
                <Box>
                  <Text fontSize={{ base: "14px", md: "16px" }} fontWeight="800">
                    Enviar {docTypeName} por WhatsApp
                  </Text>
                  <Text fontSize="11px" opacity={0.85} fontWeight="500">
                    {clientName} {clientCode && `• ${clientCode}`}
                  </Text>
                </Box>
              </HStack>
            </Flex>
            <ModalCloseButton color="white" top={3.5} right={4} />
          </ModalHeader>

          <ModalBody p={{ base: 4, md: 5 }} bg="#f8fafc">
            <VStack spacing={4} align="stretch">
              {/* Tarjeta de Resumen Rápido */}
              <Box bg="white" p={3.5} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
                <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                  <HStack spacing={2}>
                    <Badge
                      colorScheme={
                        isEmittedToSap
                          ? "green"
                          : currentStatus.includes("APROBADO")
                          ? "teal"
                          : currentStatus.includes("OBSERVADO")
                          ? "orange"
                          : currentStatus.includes("RECHAZADO")
                          ? "red"
                          : "blue"
                      }
                      fontSize="11px"
                      px={2.5}
                      py={0.8}
                      borderRadius="full"
                      fontWeight="800"
                    >
                      {isEmittedToSap
                        ? `✅ Orden Emitida (Doc #${docNumber})`
                        : currentStatus.includes("APROBADO")
                        ? "🟢 Aprobado Comercial"
                        : currentStatus.includes("OBSERVADO")
                        ? "⚠️ Observado"
                        : currentStatus.includes("RECHAZADO")
                        ? "❌ Rechazado"
                        : `📋 ${docTypeName} (${docNumber})`}
                    </Badge>
                    <Text fontSize="xs" fontWeight="700" color="gray.600">
                      Vendedor: <strong>{sellerName}</strong>
                    </Text>
                  </HStack>
                  <VStack align={{ base: "flex-start", sm: "flex-end" }} spacing={0}>
                    <Text fontSize="sm" fontWeight="900" color="emerald.700">
                      Total: $ {totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </Text>
                    <Text fontSize="11px" color="gray.500" fontWeight="600">
                      (~ S/ {totalPEN.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </Text>
                  </VStack>
                </Flex>
              </Box>

              {/* Configuración de Teléfono */}
              <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
                <FormControl>
                  <Flex justify="space-between" align="center" mb={2} wrap="wrap" gap={2}>
                    <FormLabel fontSize="xs" fontWeight="800" color="gray.700" display="flex" alignItems="center" gap={1.5} mb={0}>
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {hasSapPhone && !isUsingAlternativePhone
                        ? "Número Oficial Registrado:"
                        : isUsingAlternativePhone
                        ? "Número Alternativo para este Envío:"
                        : "Número de WhatsApp del Cliente:"}
                    </FormLabel>

                    {hasSapPhone && !isUsingAlternativePhone ? (
                      <Badge colorScheme="green" fontSize="10px" px={2} py={0.5} borderRadius="full" display="flex" alignItems="center" gap={1}>
                        <Lock className="w-2.5 h-2.5" /> Oficial
                      </Badge>
                    ) : isUsingAlternativePhone ? (
                      <Button
                        size="xs"
                        variant="ghost"
                        colorScheme="teal"
                        leftIcon={<RotateCcw className="w-3 h-3" />}
                        onClick={() => {
                          setIsUsingAlternativePhone(false);
                          setPhoneNumber(sapOfficialPhone);
                        }}
                        fontSize="10.5px"
                        fontWeight="700"
                        h="24px"
                      >
                        Restaurar oficial ({sapOfficialPhone})
                      </Button>
                    ) : (
                      <Button
                        size="xs"
                        colorScheme={isSavedPhone ? "green" : "teal"}
                        variant={isSavedPhone ? "solid" : "ghost"}
                        leftIcon={isSavedPhone ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                        onClick={handleSavePhoneManually}
                        fontSize="10.5px"
                        fontWeight="700"
                        h="24px"
                        isDisabled={!phoneNumber || phoneNumber.length < 7}
                      >
                        {isSavedPhone ? "Guardado" : "Guardar Teléfono"}
                      </Button>
                    )}
                  </Flex>

                  <HStack spacing={2}>
                    <Box minW="75px" maxW="80px">
                      <Input
                        size="sm"
                        fontWeight="700"
                        textAlign="center"
                        value={`+${countryCode}`}
                        onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ""))}
                        borderRadius="lg"
                        isReadOnly={hasSapPhone && !isUsingAlternativePhone}
                        bg={hasSapPhone && !isUsingAlternativePhone ? "gray.50" : "white"}
                      />
                    </Box>
                    <Input
                      size="sm"
                      fontWeight="800"
                      placeholder={hasSapPhone ? sapOfficialPhone : "Ej. 987654321"}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      borderRadius="lg"
                      borderColor={hasSapPhone && !isUsingAlternativePhone ? "gray.300" : phoneNumber ? "emerald.400" : "gray.300"}
                      focusBorderColor={hasSapPhone && !isUsingAlternativePhone ? "gray.400" : "emerald.500"}
                      isReadOnly={hasSapPhone && !isUsingAlternativePhone}
                      bg={hasSapPhone && !isUsingAlternativePhone ? "#f8fafc" : "white"}
                      cursor={hasSapPhone && !isUsingAlternativePhone ? "default" : "text"}
                    />
                    {hasSapPhone && !isUsingAlternativePhone ? (
                      <Tooltip label="Teléfono oficial registrado en el sistema">
                        <Box p={1.5} color="emerald.600">
                          <Lock className="w-4 h-4" />
                        </Box>
                      </Tooltip>
                    ) : null}
                  </HStack>

                  {/* Mensaje de estado y botón para número alternativo */}
                  <Box mt={2}>
                    {isLoadingSapPhone ? (
                      <HStack spacing={1.5} color="emerald.600" fontSize="10.5px">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <Text>Consultando teléfono del cliente...</Text>
                      </HStack>
                    ) : hasSapPhone && !isUsingAlternativePhone ? (
                      <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                        <HStack spacing={1.5} color="emerald.700" fontSize="10.5px" fontWeight="600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <Text>Teléfono oficial verificado (+51 {phoneNumber}).</Text>
                        </HStack>
                        <Button
                          size="xs"
                          variant="link"
                          colorScheme="blue"
                          onClick={() => {
                            setIsUsingAlternativePhone(true);
                            setPhoneNumber("");
                          }}
                          fontSize="10.5px"
                          fontWeight="700"
                        >
                          + Enviar a otro número temporal
                        </Button>
                      </Flex>
                    ) : isUsingAlternativePhone ? (
                      <Text fontSize="10.5px" color="orange.700" fontWeight="600">
                        ℹ️ Modo número alternativo: Solo se usará para abrir el chat de este envío.
                      </Text>
                    ) : (
                      <Text fontSize="10.5px" color="gray.500">
                        ℹ️ Cliente sin teléfono registrado. Ingresa el número para contactar por WhatsApp.
                      </Text>
                    )}
                  </Box>
                </FormControl>
              </Box>

              {/* Selector de Tono del Mensaje */}
              <Box bg="white" p={3.5} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
                <Text fontSize="xs" fontWeight="800" color="gray.700" mb={2}>
                  Tono del Mensaje:
                </Text>
                <RadioGroup value={messageTone} onChange={setMessageTone}>
                  <HStack spacing={4} wrap="wrap">
                    <Radio value="friendly" colorScheme="green" size="sm">
                      <Text fontSize="xs" fontWeight="700">Amable y Cercano</Text>
                    </Radio>
                    <Radio value="formal" colorScheme="green" size="sm">
                      <Text fontSize="xs" fontWeight="700">Formal Corporativo</Text>
                    </Radio>
                    <Radio value="urgent" colorScheme="orange" size="sm">
                      <Text fontSize="xs" fontWeight="700" color="orange.800">
                        ⚡ Prioritario (Stock y Precios)
                      </Text>
                    </Radio>
                  </HStack>
                </RadioGroup>
              </Box>

              {/* Vista Previa Estilo Burbuja de WhatsApp */}
              <Box>
                <Flex justify="space-between" align="center" mb={1.5}>
                  <Text fontSize="xs" fontWeight="800" color="gray.600" textTransform="uppercase">
                    Vista Previa en WhatsApp:
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    leftIcon={copiedMessage ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    onClick={handleCopyMessage}
                    fontSize="11px"
                    fontWeight="700"
                  >
                    {copiedMessage ? "Copiado" : "Copiar Texto"}
                  </Button>
                </Flex>

                <Box
                  bg="#e7f5e8"
                  p={4}
                  borderRadius="2xl"
                  border="1px solid"
                  borderColor="#bbf7d0"
                  boxShadow="xs"
                  position="relative"
                >
                  <Text
                    fontSize={{ base: "12px", md: "12.5px" }}
                    color="gray.900"
                    whiteSpace="pre-wrap"
                    lineHeight="1.6"
                    fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
                  >
                    {generatedMessage}
                  </Text>
                </Box>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter
            bg="gray.50"
            borderTop="1px solid"
            borderColor="gray.200"
            py={3}
            px={{ base: 4, md: 6 }}
            gap={2.5}
            flexDirection={{ base: "column-reverse", sm: "row" }}
            justifyContent="space-between"
          >
            <Button
              size="sm"
              variant="outline"
              colorScheme="teal"
              leftIcon={<FileText className="w-3.5 h-3.5 text-teal-700" />}
              onClick={() => setIsPdfModalOpen(true)}
              fontWeight="700"
              fontSize="xs"
              w={{ base: "full", sm: "auto" }}
            >
              Descargar PDF
            </Button>

            <Button
              size="md"
              minH="42px"
              colorScheme="whatsapp"
              bg="#25d366"
              _hover={{ bg: "#20bd5a" }}
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleOpenWhatsApp}
              fontWeight="800"
              fontSize="sm"
              px={6}
              w={{ base: "full", sm: "auto" }}
              boxShadow="0 4px 14px 0 rgba(37, 211, 102, 0.39)"
            >
              📲 Enviar por WhatsApp
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal visor de PDF embebido para cuando el usuario hace clic en "Descargar PDF" */}
      {isPdfModalOpen && (
        <QuotePdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          quote={quote}
        />
      )}
    </>
  );
}

export default WhatsAppQuoteModal;
