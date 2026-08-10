import React, { useState, useMemo, useEffect } from "react";
import {
  Box, Grid, GridItem, FormControl, FormLabel, Input, Select as ChakraSelect,
  Text, HStack, VStack, Badge, Divider, Heading, Tooltip, Alert, AlertIcon,
  Tabs, TabList, TabPanels, Tab, TabPanel, Textarea, Button, Flex, Menu,
  MenuButton, MenuList, MenuItem, useToast, Container
} from "@chakra-ui/react";
import {
  FileText, Truck, CreditCard, Paperclip, ChevronDown, CheckCircle2,
  Save, Copy, RefreshCw, Shield, AlertTriangle, Printer
} from "lucide-react";
import ClientAutocomplete from "./ClientAutocomplete";
import SapItemGrid from "./SapItemGrid";
import { NewSellTerms } from "./NewSellTerms";
import { SapQuoteDocumentModal } from "./SapQuoteDocumentModal";
import { useQuoteStore } from "../stores/quoteStore";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useExchangeRate } from "../../dashboard/hooks/queries/dashboardQueries";
import { axiosInstance } from "../../../shared/lib/axiosInstance";
import { useGetTransports, useGetPaymentType, useGetDeliveryForms } from "../hooks/queries/quotesQueries";

const money = (val, currency = "USD") => {
  const num = Number(val || 0);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: currency === "PEN" ? "PEN" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const todayIso = () => new Date().toISOString().split("T")[0];

export default function SapQuotationForm({ sellerName = "Vendedor Autorizado" }) {
  const toast = useToast();
  const { username, userId } = useAuthStore();
  const localSeller = localStorage.getItem("username") || localStorage.getItem("userId");
  const activeSeller = (sellerName && sellerName !== "Vendedor SAP" && sellerName !== "Vendedor Autorizado")
    ? sellerName
    : (username || localSeller || sellerName || "Vendedor Autorizado");

  const [docType, setDocType] = useState("OFERTA_VENTA"); // OFERTA_VENTA o PEDIDO_CLIENTE
  const [docNumber, setDocNumber] = useState(`COT-${Date.now().toString().slice(-6)}`);

  const {
    quoteId, setQuoteId,
    client, setClient,
    products, addProduct, removeProduct, updateProduct, setProducts,
    selectedPoint, setSelectedPoint,
    selectedTransport, setSelectedTransport,
    selectedDeliveryForm, setSelectedDeliveryForm,
    selectedPaymentType, setSelectedPaymentType,
    comment, setComment,
    deliveryDate, setDeliveryDate,
    opNum, setOpNum,
    paymentImg, setPaymentImg,
    whsCode, setWhsCode,
    contactPerson, setContactPerson,
    refNumber, setRefNumber,
    clear
  } = useQuoteStore();

  const [tempImage, setTempImage] = useState(null);
  const [currency] = useState("USD");
  const [docDate, setDocDate] = useState(todayIso());
  const [docDueDate, setDocDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (quoteId) {
      setDocNumber(quoteId);
    }
  }, [quoteId]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data: rateData } = useExchangeRate({
    currency: "USD",
    date: docDate || todayIso(),
  });
  const exchangeRate = rateData?.collectionRate || rateData?.officialRate || 3.76;

  const { dataTransports } = useGetTransports();
  const { dataDeliveryForms } = useGetDeliveryForms();
  const { dataPaymentTypes } = useGetPaymentType();

  const deliveryPoints = useMemo(() => {
    if (!client?.raw) return [];
    const list = client.raw.BPAddresses || client.raw.bpAddresses || client.raw.addresses || [];
    if (Array.isArray(list)) {
      return list.filter(addr => addr.AddressType === "bo_ShipTo" || addr.addressType === "bo_ShipTo" || !addr.AddressType);
    }
    return [];
  }, [client]);

  // Extraer lista de personas de contacto oficiales registradas en SAP para este cliente
  const contactList = useMemo(() => {
    if (!client?.raw) return [];
    const rawList = client.raw.ContactEmployees || client.raw.contactEmployees || [];
    if (Array.isArray(rawList)) {
      return rawList
        .map((c) => ({
          code: c.InternalCode || c.code || c.Name,
          name: c.Name || `${c.FirstName || ""} ${c.LastName || ""}`.trim() || c.name || "",
          position: c.Position || c.title || "",
        }))
        .filter((c) => c.name);
    }
    return [];
  }, [client]);

  // Auto-seleccionar la persona de contacto principal de SAP al elegir un cliente
  useEffect(() => {
    if (client) {
      const defaultContact = client.raw?.ContactPerson || (contactList.length > 0 ? contactList[0].name : "");
      if (defaultContact && setContactPerson) {
        setContactPerson(defaultContact);
      }
    } else if (setContactPerson) {
      setContactPerson("");
    }
  }, [client, contactList, setContactPerson]);

  // Regla de negocio: El almacén es obligatoria y estrictamente el 014
  useEffect(() => {
    if (typeof setWhsCode === "function" && whsCode !== "014") {
      setWhsCode("014");
    }
  }, [whsCode, setWhsCode]);

  // Cálculos de totales estilo SAP B1 — todo en SOLES (SOL) igual que la pantalla nativa de SAP
  // El precio unitario viene en USD, SAP convierte automáticamente con el TC comercial
  const totals = useMemo(() => {
    const tc = Number(exchangeRate) || 3.76;  // TC real desde SAP (sin ajuste manual)
    const tcBase = tc;                         // TC Base = TC oficial SAP

    let subtotalUSD = 0;      // Suma de (qty × price) sin descuento, en USD
    let totalDiscountUSD = 0; // Total descuentos en USD
    let discPct = 0;          // % descuento promedio ponderado (para mostrar)

    (products || []).forEach((p) => {
      const qty   = Number(p.quantity || 1);
      const price = Number(p.price || 0);
      const disc  = Number(p.discount || 0);
      const base  = qty * price;
      subtotalUSD      += base;
      totalDiscountUSD += base * (disc / 100);
    });

    // Porcentaje de descuento global (solo para display, si todos tienen mismo %)
    if (subtotalUSD > 0) {
      discPct = (totalDiscountUSD / subtotalUSD) * 100;
    }

    const netBaseUSD = Math.max(0, subtotalUSD - totalDiscountUSD);
    const igvUSD     = netBaseUSD * 0.18;
    const grandTotalUSD = netBaseUSD + igvUSD;

    // Convertir a SOLES con el TC comercial (como hace SAP)
    const subtotalSOL    = subtotalUSD    * tc;
    const discountSOL    = totalDiscountUSD * tc;
    const netBaseSOL     = netBaseUSD     * tc;
    const igvSOL         = igvUSD         * tc;
    const grandTotalSOL  = grandTotalUSD  * tc;

    // Nota: el margen cambiario lo determina SAP B1 internamente.

    return {
      // USD (referencia interna)
      subtotalUSD, totalDiscountUSD, netBaseUSD, igvUSD, grandTotalUSD,
      // SOL (lo que muestra SAP)
      subtotalSOL, discountSOL, netBaseSOL, igvSOL, grandTotalSOL,
      // Cambiario
      tc, tcBase, marginSOL: 0,
      // Descuento %
      discPct,
    };
  }, [products, exchangeRate]);

  const currentQuoteObj = useMemo(() => ({
    id: docNumber || "COT-017071",
    docNumber: docNumber || "COT-017071",
    client,
    products,
    totals,
    sellerName: activeSeller,
    docDate,
    docDueDate,
    contactPerson,
    refNumber,
    comment,
    selectedDeliveryForm,
    selectedTransport,
    selectedPaymentType,
    whsCode: "014"
  }), [docNumber, client, products, totals, activeSeller, docDate, docDueDate, contactPerson, refNumber, comment, selectedDeliveryForm, selectedTransport, selectedPaymentType]);

  // Manejadores de acciones locales
  const handleSaveDraft = () => {
    if (!client) {
      toast({
        title: "Selecciona un cliente",
        description: "Debes buscar y seleccionar un socio de negocio antes de guardar.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    if (products.length === 0) {
      toast({
        title: "Agrega al menos un artículo",
        description: "La cotización debe tener al menos 1 producto en la grilla.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const activeDocNumber = quoteId || docNumber;
    const finalTotals = {
      ...totals,
      grandTotal: totals.grandTotalUSD,
    };

    // Guardar o actualizar en localStorage sin retroceder de estado
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const existingDoc = saved.find((q) => (q.id || q.docNumber) === activeDocNumber);
    const existingStatus = existingDoc?.approvalStatus || existingDoc?.state;
    const isAdvanced = existingStatus && ["ENVIADO", "EN_PROCESO", "APROBADO", "RECHAZADO"].includes(existingStatus);

    const currentStatus = isAdvanced ? existingStatus : "ENVIADO";
    const nowIso = new Date().toISOString();
    const prevHistory = existingDoc?.historyLog || [];
    const hasSentLog = prevHistory.some(h => h.status === "ENVIADO");
    const updatedHistory = hasSentLog
      ? prevHistory
      : [
          ...prevHistory,
          { status: "ENVIADO", timestamp: nowIso, user: activeSeller, note: "Cotización enviada a validación" }
        ];

    const newDoc = {
      id: activeDocNumber,
      docNumber: activeDocNumber,
      docType,
      client,
      products,
      currency: "USD",
      totals: finalTotals,
      whsCode: "014",
      contactPerson,
      refNumber,
      docDate,
      docDueDate,
      comment,
      selectedDeliveryForm,
      selectedTransport,
      selectedPaymentType,
      sellerName: activeSeller,
      createdByUsername: username || localSeller || "vendedor",
      createdByUserId: userId || null,
      createdAt: existingDoc?.createdAt || nowIso,
      updatedAt: nowIso,
      status: currentStatus,
      state: currentStatus,
      approvalStatus: currentStatus,
      rejectionReason: existingDoc?.rejectionReason || null,
      historyLog: updatedHistory,
      opNum: opNum || existingDoc?.opNum || null
    };

    const isExisting = Boolean(existingDoc);
    const updated = isExisting
      ? saved.map((q) => ((q.id || q.docNumber) === activeDocNumber ? newDoc : q))
      : [newDoc, ...saved.filter((q) => (q.id || q.docNumber) !== activeDocNumber)];

    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
    window.dispatchEvent(new Event("localQuotesUpdated"));
    if (setQuoteId) setQuoteId(activeDocNumber);

    // Emitir notificación hacia Facturación y Cobranza (Admin)
    const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const clientName = client?.CardName || client?.name || "Cliente General";
    const totalUsdStr = finalTotals?.grandTotalUSD ? `$${finalTotals.grandTotalUSD.toFixed(2)}` : "$0.00";
    // El admin de facturación se determina por el config de la organización
    const ADMIN_FACTURACION_USERNAME = "enrique";
    const senderUsername = username || localSeller || "vendedor";
    const notifObj = {
      id: `NOTIF-${Date.now()}`,
      targetRole: "FACTURACION",
      targetUsername: ADMIN_FACTURACION_USERNAME,  // ← a quién va la notificación
      fromUsername: senderUsername,                // ← quién la envió
      fromUserId: userId || null,
      quoteId: activeDocNumber,
      quoteObj: newDoc,
      title: `📩 Nueva Cotización Recibida - ${activeDocNumber}`,
      description: `Enviada por ${activeSeller} • Cliente: ${clientName} (${totalUsdStr}) ${opNum ? `• Váucher BCP: N° ${opNum}` : ''}. Requiere validación de depósito y aprobación.`,
      status: "ENVIADO",
      timestamp: new Date().toISOString(),
      read: false
    };
    localStorage.setItem("grupoLeon_notifications", JSON.stringify([notifObj, ...existingNotifs.filter(n => n.quoteId !== activeDocNumber || n.targetUsername !== ADMIN_FACTURACION_USERNAME)]));
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    toast({
      title: isExisting ? "Cotización Actualizada" : "✅ Cotización Guardada y Enviada a Validación",
      description: `Documento ${activeDocNumber} registrado con éxito. Se envió una notificación a la Asesora de Facturación y Cobranza.`,
      status: "success",
      duration: 5000,
      isClosable: true,
    });
  };

  const [isSubmittingSap, setIsSubmittingSap] = useState(false);

  const handleSaveToSap = async () => {
    if (!client) {
      toast({
        title: "Cliente requerido",
        description: "Debes seleccionar un cliente SAP para registrar la cotización.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (products.length === 0) {
      toast({
        title: "Sin artículos",
        description: "Agrega al menos un artículo antes de enviar la cotización.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // El flujo comercial actual guarda la cotización en el aplicativo y la manda al panel de aprobaciones
    handleSaveDraft();
  };

  const handleCopyToOrder = () => {
    toast({
      title: "🔒 Opción Próximamente (Fase de Validación)",
      description: "La creación directa de Pedidos en SAP está reservada para la Asesora de Facturación desde el Panel de Aprobaciones una vez validada la cotización.",
      status: "info",
      duration: 6000,
      isClosable: true,
    });
  };

  const handleCopyToInvoice = () => {
    toast({
      title: "🔒 Opción Próximamente (Fase de Facturación Directa)",
      description: "La facturación directa a SAP B1 está deshabilitada para vendedores de campo. Toda cotización debe enviarse a validación comercial primero.",
      status: "info",
      duration: 6000,
      isClosable: true,
    });
  };

  const handleCreateOrderInSap = async () => {
    try {
      setIsSubmittingSap(true);
      const payload = { client, products, docDueDate, docDate, comment };
      const res = await axiosInstance.post("/quoteModule/quotes/sap/22/copy-to-order", payload);
      const orderData = res.data?.data || {};
      const newNum = orderData.DocNum ? `OV-${orderData.DocNum}` : `OV-${Date.now().toString().slice(-6)}`;
      setDocNumber(newNum);

      toast({
        title: "✅ Pedido de Cliente Registrado en SAP B1",
        description: `Orden de Venta generada exitosamente en Service Layer (${newNum}) con vínculo BaseType 23 en BD ZZTET_02022025.`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Pedido Guardado Localmente",
        description: "Se guardó el borrador de Pedido de Cliente en el historial.",
        status: "info",
        duration: 4000,
        isClosable: true,
      });
      handleSaveDraft();
    } finally {
      setIsSubmittingSap(false);
    }
  };

  const handleCreateInvoiceInSap = async () => {
    try {
      setIsSubmittingSap(true);
      const payload = { client, products, docDueDate, docDate, comment };
      const res = await axiosInstance.post("/quoteModule/quotes/sap/22/copy-to-invoice", payload);
      const invoiceData = res.data?.data || {};
      const newNum = invoiceData.DocNum ? `FT-${invoiceData.DocNum}` : `FT-${Date.now().toString().slice(-6)}`;
      setDocNumber(newNum);

      toast({
        title: "✅ Factura de Deudores Registrada en SAP B1",
        description: `Factura generada exitosamente en Service Layer (${newNum}) con vínculo BaseType 23 en BD ZZTET_02022025.`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Factura Guardada Localmente",
        description: "Se guardó el borrador de Factura de Deudores en el historial.",
        status: "info",
        duration: 4000,
        isClosable: true,
      });
      handleSaveDraft();
    } finally {
      setIsSubmittingSap(false);
    }
  };

  const handleNewQuote = () => {
    clear();
    if (typeof setWhsCode === "function") setWhsCode("014");
    setDocType("OFERTA_VENTA");
    setDocNumber(`COT-${Date.now().toString().slice(-6)}`);
    toast({
      title: "Formulario Reiniciado",
      description: "Listo para crear una nueva Oferta de Ventas.",
      status: "info",
      duration: 2500,
    });
  };

  return (
    <VStack align="stretch" spacing={5} pb={10} maxW="100%" overflowX="hidden">
      {/* ── BANNER MODO PRUEBAS (SANDBOX) COMPACTO ── */}
      <Alert
        status="info"
        variant="subtle"
        borderRadius="lg"
        py={{ base: 1.5, md: 2 }}
        px={{ base: 2.5, md: 3 }}
        border="1px solid"
        borderColor="blue.200"
        bg="blue.50/80"
        fontSize={{ base: "10px", md: "xs" }}
      >
        <AlertIcon boxSize={{ base: "14px", md: "16px" }} />
        <Box flex="1">
          <Flex align="center" justify="space-between" flexWrap="wrap" gap={1}>
            <HStack spacing={1.5} align="center">
              <Text fontWeight="800" textTransform="uppercase" letterSpacing="tight" color="blue.900" fontSize={{ base: "10px", md: "11px" }}>
                MODO PRUEBAS (SANDBOX)
              </Text>
              <Badge colorScheme="green" fontSize={{ base: "8px", md: "9px" }} px={1.5} py={0.2} borderRadius="full">
                Sin Riesgo en SAP
              </Badge>
            </HStack>
            <Text fontSize={{ base: "10px", md: "xs" }} color="blue.700" fontWeight="500" display={{ base: "none", sm: "block" }}>
              Consultas en tiempo real de SAP. Guardado y conversión operan en memoria local.
            </Text>
          </Flex>
          <Text fontSize="10px" color="blue.700" fontWeight="500" display={{ base: "block", sm: "none" }} mt={0.5}>
            Consultas en tiempo real. Guardado local en memoria.
          </Text>
        </Box>
      </Alert>

      {/* ── CABECERA PRINCIPAL SAP B1 ── */}
      <Box bg="white" p={{ base: 3, md: 6 }} borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
        <Flex
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "start", md: "center" }}
          gap={{ base: 3, md: 4 }}
          mb={4}
          pb={3}
          borderBottom="1px solid"
          borderColor="gray.100"
        >
          <HStack spacing={3} align="center">
            <Flex w="36px" h="36px" minW="36px" borderRadius="lg" bg="emerald.50" align="center" justify="center" color="emerald.700">
              <FileText className="w-5 h-5" />
            </Flex>
            <Box>
              <Heading size="sm" color="emerald.900" fontWeight="800" letterSpacing="tight">
                <Box as="span" display={{ base: "none", md: "inline" }}>
                  {docType === "OFERTA_VENTA" ? "OFERTA DE VENTAS SAP (Cotización)" : "PEDIDO DE CLIENTE SAP (Orden de Venta)"}
                </Box>
                <Box as="span" display={{ base: "inline", md: "none" }}>
                  {docType === "OFERTA_VENTA" ? "Oferta de Ventas SAP" : "Pedido de Cliente SAP"}
                </Box>
              </Heading>
              <Text fontSize="xs" color="gray.500" display={{ base: "none", md: "block" }}>
                Generador oficial alineado a la vista nativa de SAP Business One
              </Text>
            </Box>
          </HStack>

          <Flex wrap="wrap" gap={2} align="center" w={{ base: "full", md: "auto" }}>
            <Badge colorScheme={docType === "OFERTA_VENTA" ? "blue" : "emerald"} px={2.5} py={1} borderRadius="md" fontSize="xs" textTransform="uppercase">
              Nº {docNumber}
            </Badge>
            <Badge colorScheme="orange" px={2.5} py={1} borderRadius="md" fontSize="xs">
              <Box as="span" display={{ base: "none", md: "inline" }}>Estado: Abierto (Borrador)</Box>
              <Box as="span" display={{ base: "inline", md: "none" }}>Abierto (Borrador)</Box>
            </Badge>
          </Flex>
        </Flex>

        <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
          {/* Columna Izquierda: Datos de Cliente y Moneda */}
          <VStack align="stretch" spacing={3}>
            <ClientAutocomplete client={client} setClient={setClient} />

            {/* Persona de contacto y OC Cliente: Solo visibles al pasar a Factura/Pedido */}
            {docType === "PEDIDO_CLIENTE" && (
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
                <FormControl>
                  <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="gray.700" mb={1}>
                    Persona de Contacto
                  </FormLabel>
                  {contactList.length > 0 ? (
                    <ChakraSelect
                      size="sm"
                      borderRadius="md"
                      value={contactPerson || ""}
                      onChange={(e) => setContactPerson(e.target.value)}
                      bg="white"
                      fontWeight="600"
                    >
                      {contactList.map((c, idx) => (
                        <option key={c.code || idx} value={c.name}>
                          {c.name} {c.position ? `(${c.position})` : ""}
                        </option>
                      ))}
                    </ChakraSelect>
                  ) : (
                    <Input
                      size="sm"
                      borderRadius="md"
                      placeholder="Ej. Juan Pérez"
                      value={contactPerson || ""}
                      onChange={(e) => setContactPerson(e.target.value)}
                    />
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="gray.700" mb={1}>
                    Nº Referencia / OC Cliente
                  </FormLabel>
                  <Input
                    size="sm"
                    borderRadius="md"
                    placeholder="Orden de compra del cliente"
                    value={refNumber || ""}
                    onChange={(e) => setRefNumber(e.target.value)}
                  />
                </FormControl>
              </Grid>
            )}

            {/* Campos SAP (Moneda, TC, Almacén 014, Vendedor) preservados internamente y ocultos en UI */}
          </VStack>

          {/* Columna Derecha: Almacén Fijo 014 y Vendedor */}
          <VStack align="stretch" spacing={3}>

            {/* Fechas de contabilización y validez: Visibles solo en Pedido / Factura */}
            {docType === "PEDIDO_CLIENTE" && (
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
                <FormControl>
                  <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="gray.700" mb={1}>
                    Válido Hasta / Entrega
                  </FormLabel>
                  <Input
                    type="date"
                    size="sm"
                    borderRadius="md"
                    value={docDueDate}
                    onChange={(e) => setDocDueDate(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="gray.700" mb={1}>
                    Fecha de Contabilización
                  </FormLabel>
                  <Input
                    type="date"
                    size="sm"
                    borderRadius="md"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                  />
                </FormControl>
              </Grid>
            )}
          </VStack>
        </Grid>
      </Box>

      {/* ── SECCIÓN CENTRAL CON PESTAÑAS SAP ── */}
      <Box bg="white" borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm" overflow="hidden">
        <Tabs colorScheme="emerald" variant="enclosed">
          {/* Las 4 pestañas no caben en un teléfono: se desplazan lateralmente
              dentro de la propia barra, sin arrastrar el ancho de la página. */}
          <TabList
            bg="gray.50"
            px={{ base: 2, md: 4 }}
            pt={3}
            borderColor="gray.200"
            overflowX="auto"
            overflowY="hidden"
            maxW="100%"
            sx={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            <Tab flexShrink={0} whiteSpace="nowrap" minH={{ base: "44px", md: "auto" }} _selected={{ bg: "white", color: "#126C36", fontWeight: "800", borderTop: "3px solid #126C36" }}>
              <HStack spacing={1.5} fontSize="xs">
                <FileText className="w-3.5 h-3.5" />
                <Text>Contenido ({products.length})</Text>
              </HStack>
            </Tab>

            {/* Pestañas Logística y Finanzas/Abonos Bancarios: Disponibles para Cotización y Pedido */}
            <Tab flexShrink={0} whiteSpace="nowrap" minH={{ base: "44px", md: "auto" }} _selected={{ bg: "white", color: "#126C36", fontWeight: "800", borderTop: "3px solid #126C36" }}>
              <HStack spacing={1.5} fontSize="xs">
                <Truck className="w-3.5 h-3.5" />
                <Text>Logística y Agencia</Text>
              </HStack>
            </Tab>

            <Tab flexShrink={0} whiteSpace="nowrap" minH={{ base: "44px", md: "auto" }} _selected={{ bg: "white", color: "#126C36", fontWeight: "800", borderTop: "3px solid #126C36" }}>
              <HStack spacing={1.5} fontSize="xs">
                <CreditCard className="w-3.5 h-3.5" />
                <Text>Finanzas y Abonos</Text>
              </HStack>
            </Tab>

            <Tab flexShrink={0} whiteSpace="nowrap" minH={{ base: "44px", md: "auto" }} _selected={{ bg: "white", color: "#126C36", fontWeight: "800", borderTop: "3px solid #126C36" }}>
              <HStack spacing={1.5} fontSize="xs">
                <Paperclip className="w-3.5 h-3.5" />
                <Text>Anexos</Text>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels p={{ base: 2, md: 4 }}>
            {/* Pestaña 1: Contenido (Grid de productos) */}
            <TabPanel p={0}>
              <SapItemGrid
                products={products}
                onAddProduct={addProduct}
                onRemoveProduct={removeProduct}
                onUpdateProduct={updateProduct}
                currency="USD"
                whsCode="014"
              />
            </TabPanel>

            {/* Pestaña 2: Logística de Campo */}
            <TabPanel p={2}>
              <VStack align="stretch" spacing={3}>
                <Text fontSize="xs" fontWeight="800" color="gray.700" textTransform="uppercase">
                  Punto de Entrega y Agencia de Transporte (Boleta de Campo)
                </Text>
                <NewSellTerms
                  client={client}
                  transports={dataTransports || []}
                  deliveryPoints={deliveryPoints}
                  deliveryForms={dataDeliveryForms || []}
                  paymentTypes={dataPaymentTypes || []}
                  selectedPoint={selectedPoint}
                  setSelectedPoint={setSelectedPoint}
                  selectedTransport={selectedTransport}
                  setSelectedTransport={setSelectedTransport}
                  selectedDeliveryForm={selectedDeliveryForm}
                  setSelectedDeliveryForm={setSelectedDeliveryForm}
                  selectedPaymentType={selectedPaymentType}
                  setSelectedPaymentType={setSelectedPaymentType}
                  deliveryDate={deliveryDate}
                  setDeliveryDate={setDeliveryDate}
                  comment={comment}
                  setComment={setComment}
                  paymentImg={paymentImg}
                  setPaymentImg={setPaymentImg}
                  tempImage={tempImage}
                  setTempImage={setTempImage}
                  opNum={opNum}
                  setOpNum={setOpNum}
                />
              </VStack>
            </TabPanel>

            {/* Pestaña 3: Finanzas y Voucher Bancario */}
            <TabPanel p={2}>
              <Box p={{ base: 3, md: 4 }} bg="gray.50" borderRadius="lg" border="1px solid" borderColor="gray.200">
                <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.800" mb={3} textTransform="uppercase">
                  Condición de Pago y Abono Bancario (Voucher)
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
                  <FormControl>
                    <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700">Forma de Pago</FormLabel>
                    <ChakraSelect size="sm" bg="white" borderRadius="md" value={selectedPaymentType || "CONTADO"} onChange={(e) => setSelectedPaymentType(e.target.value)}>
                      <option value="CONTADO">Contado / Transferencia Inmediata</option>
                      <option value="ANTICIPADO">Anticipado / Depósito Bancario</option>
                      <option value="CRED_30">Crédito 30 días</option>
                    </ChakraSelect>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700">Banco de Abono</FormLabel>
                    <ChakraSelect size="sm" bg="white" borderRadius="md" defaultValue="BCP_SOLES">
                      <option value="BCP_SOLES">BCP (Soles) - 191-0104153-0-60</option>
                      <option value="BBVA_SOLES">BBVA Continental (Soles)</option>
                      <option value="SCOTIA_USD">Scotiabank (USD) - 000-1245211</option>
                    </ChakraSelect>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700">N° Operación / Voucher / Chq</FormLabel>
                    <Input
                      size="sm"
                      bg="white"
                      borderRadius="md"
                      placeholder="Ej: 0169944"
                      value={opNum || ""}
                      onChange={(e) => setOpNum(e.target.value)}
                    />
                  </FormControl>
                </Grid>
              </Box>
            </TabPanel>

            {/* Pestaña final: Anexos */}
            <TabPanel p={2}>
              <Box p={6} border="2px dashed" borderColor="gray.300" borderRadius="lg" textAlign="center">
                <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <Text fontSize="sm" fontWeight="600" color="gray.600">Adjuntar archivos a la cotización</Text>
                <Text fontSize="xs" color="gray.400">PDF, Órdenes de Compra o Comprobantes</Text>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* ── PIE DE PÁGINA Y CUADRO DE TOTALES ESTILO SAP ── */}
      <Grid templateColumns={{ base: "1fr", lg: "1fr 340px" }} gap={6}>
        {/* Comentarios */}
        <VStack align="stretch" spacing={3}>
          <FormControl bg="white" p={{ base: 3, md: 4 }} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
            <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="gray.700" mb={1}>
              Comentarios u Observaciones de Cotización
            </FormLabel>
            <Textarea
              size="sm"
              borderRadius="md"
              rows={4}
              placeholder="Detalla aquí condiciones de entrega, vigencia del precio o garantía..."
              value={comment || ""}
              onChange={(e) => setComment(e.target.value)}
            />
          </FormControl>
        </VStack>

        {/* ── RESUMEN DEL DOCUMENTO — Moneda del documento: USD (igual que SAP B1) ── */}
        <Box
          bg="linear-gradient(135deg, #0e572b 0%, #126C36 100%)"
          color="#ffffff"
          p={5}
          borderRadius="2xl"
          boxShadow="0 10px 25px -5px rgba(18, 108, 54, 0.3)"
          border="1px solid"
          borderColor="rgba(255,255,255,0.2)"
          minW={{ base: "full", lg: "340px" }}
        >
          <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="wider" color="#a7f3d0" mb={3}>
            Resumen del Documento
          </Text>

          <VStack align="stretch" spacing={2} fontSize="xs">

            {/* Total antes del descuento — USD */}
            <Flex justify="space-between" align="center" color="#ecfdf5">
              <Text fontWeight="600">Total antes del descuento</Text>
              <Text fontWeight="800" fontFamily="mono">
                USD {totals.subtotalUSD.toFixed(2)}
              </Text>
            </Flex>

            {/* Descuento (% badge + monto USD) */}
            <Flex justify="space-between" align="center" color="#fca5a5">
              <HStack spacing={1}>
                <Text fontWeight="600">Descuento</Text>
                {totals.discPct > 0 && (
                  <Badge bg="rgba(252,165,165,0.25)" color="#fca5a5" fontSize="0.6rem" px={1} borderRadius="sm">
                    {totals.discPct.toFixed(1)}%
                  </Badge>
                )}
              </HStack>
              <Text fontWeight="700" fontFamily="mono">
                {totals.totalDiscountUSD > 0
                  ? `-USD ${totals.totalDiscountUSD.toFixed(2)}`
                  : "USD 0.00"}
              </Text>
            </Flex>

            <Divider borderColor="rgba(255,255,255,0.2)" />

            {/* Impuesto IGV — USD */}
            <Flex justify="space-between" align="center" color="#a7f3d0">
              <Text fontWeight="600">Impuesto (IGV 18%)</Text>
              <Text fontWeight="700" fontFamily="mono">
                USD {totals.igvUSD.toFixed(2)}
              </Text>
            </Flex>

            <Divider borderColor="rgba(255,255,255,0.3)" my={1} />

            {/* TOTAL DEL DOCUMENTO — USD */}
            <Flex justify="space-between" align="baseline" pt={1}>
              <Text fontSize="xs" fontWeight="900" color="#e6f4ea" textTransform="uppercase" letterSpacing="tight">
                Total del documento
              </Text>
              <Text fontSize="lg" fontWeight="900" color="#fef08a" fontFamily="mono" textShadow="0 2px 4px rgba(0,0,0,0.2)">
                USD {totals.grandTotalUSD.toFixed(2)}
              </Text>
            </Flex>

            {/* Equivalente en Soles (referencia informativa) */}
            <Flex justify="flex-end">
              <Text fontSize="0.65rem" color="rgba(255,255,255,0.5)" fontFamily="mono">
                ≈ SOL {totals.grandTotalSOL.toFixed(2)} (TC {totals.tc.toFixed(2)})
              </Text>
            </Flex>

            {/* ── Desglose del Tipo de Cambio (SAP Base vs Comercial) ── */}
            <Box mt={2} pt={2} borderTop="1px dashed rgba(255,255,255,0.2)">
              <Text fontSize="0.6rem" fontWeight="800" textTransform="uppercase" letterSpacing="wider" color="#86efac" mb={1.5}>
                Tipo de Cambio Aplicado
              </Text>
              <VStack align="stretch" spacing={1} fontSize="0.65rem">
                <Flex justify="space-between" color="rgba(255,255,255,0.65)">
                  <Text>TC Base SAP:</Text>
                  <Text fontFamily="mono">S/ {totals.tcBase.toFixed(2)}</Text>
                </Flex>
                <Flex justify="space-between" color="rgba(255,255,255,0.65)">
                  <Text>Margen comercial:</Text>
                  <Text fontFamily="mono" color="#86efac">+ S/ 0.02</Text>
                </Flex>
                <Flex justify="space-between" color="#ffffff" fontWeight="700">
                  <Text>TC Comercial:</Text>
                  <Text fontFamily="mono">S/ {totals.tc.toFixed(2)}</Text>
                </Flex>
                {totals.marginSOL > 0 && (
                  <Flex justify="space-between" color="#fde68a">
                    <Text fontWeight="700">Ganancia diferencial TC:</Text>
                    <Text fontFamily="mono" fontWeight="800">+ SOL {totals.marginSOL.toFixed(2)}</Text>
                  </Flex>
                )}
              </VStack>
            </Box>
          </VStack>
        </Box>
      </Grid>

      {/* ── BARRA DE ACCIÓN Y MENÚ "COPIAR A" ESTILO SAP NATIVO ── */}
      <Flex
        bg="white"
        p={4}
        borderRadius="xl"
        border="1px solid"
        borderColor="gray.200"
        justify="space-between"
        align={{ base: "stretch", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap={4}
        boxShadow="sm"
      >
        {/* En teléfono las acciones se apilan a ancho completo (44px+ de alto);
            desde sm se reparten en fila como en escritorio. */}
        <Flex
          gap={3}
          direction={{ base: "column", sm: "row" }}
          wrap={{ base: "nowrap", sm: "wrap" }}
          align={{ base: "stretch", sm: "center" }}
          w={{ base: "full", md: "auto" }}
        >
          {docType === "OFERTA_VENTA" && (
            <Button
              bg="#126C36"
              color="white"
              _hover={{ bg: "#0e572b" }}
              size="md"
              w={{ base: "full", sm: "auto" }}
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSaveDraft}
              fontWeight="800"
            >
              Guardar y Enviar a Validación
            </Button>
          )}

          <Button
            colorScheme="emerald"
            variant="solid"
            size="md"
            w={{ base: "full", sm: "auto" }}
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={() => setIsPreviewOpen(true)}
            fontWeight="700"
          >
            Ver Boleta / Comprobante
          </Button>

          <Button
            variant="ghost"
            colorScheme="gray"
            size="md"
            w={{ base: "full", sm: "auto" }}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleNewQuote}
            fontWeight="700"
          >
            Limpiar / Nueva Cotización
          </Button>
        </Flex>

        {/* Menú Dropdown "Copiar a" (Próximamente para Facturación Directa) */}
        <Menu placement="top-end">
          <MenuButton
            as={Button}
            rightIcon={<ChevronDown className="w-4 h-4" />}
            bg="gray.600"
            color="white"
            _hover={{ bg: "gray.700" }}
            size="md"
            w={{ base: "full", md: "auto" }}
            variant="solid"
            fontWeight="700"
          >
            Copiar a {">"}
          </MenuButton>
          <MenuList shadow="xl" borderRadius="lg" p={1} maxW="calc(100vw - 24px)">
            <MenuItem
              icon={<Copy className="w-4 h-4 text-gray-500" />}
              fontWeight="600"
              minH={{ base: "44px", md: "auto" }}
              whiteSpace="normal"
              onClick={handleCopyToOrder}
            >
              Pedido de cliente (🔒 Próximamente)
            </MenuItem>
            <MenuItem
              icon={<FileText className="w-4 h-4 text-gray-500" />}
              fontWeight="600"
              minH={{ base: "44px", md: "auto" }}
              whiteSpace="normal"
              onClick={handleCopyToInvoice}
            >
              Factura de deudores (🔒 Próximamente)
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>

      {/* Modal de Documento Oficial SAP */}
      <SapQuoteDocumentModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        quote={currentQuoteObj}
      />
    </VStack>
  );
}
