import React, { useState, useMemo, useEffect, useRef } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { createQuote, updateQuote } from "../services/quoteService";
import { useQuoteStore, normalizeQuoteClient } from "../stores/quoteStore";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useExchangeRate } from "../../dashboard/hooks/queries/dashboardQueries";
import { axiosInstance } from "../../../shared/lib/axiosInstance";
import { useGetTransports, useGetPaymentType, useGetDeliveryForms } from "../hooks/queries/quotesQueries";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";
import { useNavigate } from "react-router-dom";
import QuoteSubmitConfirmModal from "./QuoteSubmitConfirmModal";

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

export default function SapQuotationForm({ sellerName = "Vendedor Autorizado", isTracking = false }) {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { username, userId } = useAuthStore();
  const localSeller = localStorage.getItem("username") || localStorage.getItem("userId");
  const activeSeller = (sellerName && sellerName !== "Vendedor SAP" && sellerName !== "Vendedor Autorizado")
    ? sellerName
    : (username || localSeller || sellerName || "Vendedor Autorizado");

  const [docType, setDocType] = useState("OFERTA_VENTA"); // OFERTA_VENTA o PEDIDO_CLIENTE
  const [docNumber, setDocNumber] = useState(`COT-${Date.now().toString().slice(-6)}`);
  const isExplicitlySubmittingRef = useRef(false);

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
    approvalStatus, setApprovalStatus,
    rejectionReason, observations,
    clear
  } = useQuoteStore();

  const isObservedOrInCorrection = approvalStatus === "OBSERVADO" || approvalStatus === "EN_EDICION";

  const [tempImage, setTempImage] = useState(null);
  const [currency] = useState("USD");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [docDate, setDocDate] = useState(todayIso());
  const [docDueDate, setDocDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });

  const isReadOnly = approvalStatus === "APROBADO_COMERCIAL";
  const revealTabs = isTracking || approvalStatus === "APROBADO_COMERCIAL";

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

  // Cálculos de totales estilo SAP B1 — unificados con la calculadora global
  const totals = useMemo(() => {
    return calculateQuoteTotals(products, exchangeRate);
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
  const handleSaveAction = (targetStatus = "BORRADOR", { silent = false } = {}) => {
    if (!client || !products || products.length === 0) {
      if (!silent) {
        if (!client) {
          toast({
            title: "Selecciona un cliente",
            description: "Debes buscar y seleccionar un socio de negocio antes de guardar.",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
        } else {
          toast({
            title: "Agrega al menos un artículo",
            description: "La cotización debe tener al menos 1 producto en la grilla antes de guardar como borrador.",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
        }
      }
      return false;
    }

    const activeDocNumber = quoteId || docNumber;
    const finalTotals = {
      ...totals,
      grandTotal: totals?.grandTotalUSD || 0,
    };

    // Guardar o actualizar en localStorage sin retroceder de estado
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const isMatchingDoc = (q) => {
      if (!q) return false;
      const activeStr = String(activeDocNumber);
      const qDocNum = q.docNumber ? String(q.docNumber) : "";
      const qId = q.id !== undefined && q.id !== null ? String(q.id) : "";
      return (qDocNum && qDocNum === activeStr) || (qId && qId === activeStr);
    };

    const existingDoc = saved.find(isMatchingDoc);
    const existingStatus = existingDoc?.approvalStatus || existingDoc?.state;

    // Si la cotización está observada o en corrección, no permitir guardarla como BORRADOR
    if (targetStatus === "BORRADOR" && (isObservedOrInCorrection || existingStatus === "OBSERVADO" || existingStatus === "EN_EDICION")) {
      return { activeDocNumber, success: true };
    }

    // Si ya existe y no es borrador, nunca degradar a BORRADOR en autoguardado
    if (targetStatus === "BORRADOR" && existingStatus && !["BORRADOR", "GENERADO", "DRAFT", "draft"].includes(existingStatus)) {
      return { activeDocNumber };
    }

    const isAdvanced = existingStatus && ["ENVIADO", "EN_PROCESO", "APROBADO_COMERCIAL", "PENDIENTE_FACTURACION", "APROBADO", "RECHAZADO"].includes(existingStatus);

    // Si ya está avanzada, no retrocede de estado, a menos que estemos enviando formalmente
    const currentStatus = targetStatus === "ENVIADO" ? "ENVIADO" : (isAdvanced ? existingStatus : targetStatus);
    const nowIso = new Date().toISOString();
    const prevHistory = existingDoc?.historyLog || [];
    
    let updatedHistory = [...prevHistory];
    
    if (targetStatus === "ENVIADO" && !prevHistory.some(h => h.status === "ENVIADO")) {
      updatedHistory.push({ status: "ENVIADO", timestamp: nowIso, user: activeSeller, note: "Cotización enviada a validación" });
    } else if (targetStatus === "BORRADOR" && prevHistory.length === 0) {
      updatedHistory.push({ status: "BORRADOR", timestamp: nowIso, user: activeSeller, note: "Borrador guardado" });
    }

    const normalizedClient = normalizeQuoteClient(client) || client;
    const clientCardCodeVal = normalizedClient?.CardCode || "";
    const clientRucVal = normalizedClient?.LicTradNum || normalizedClient?.clientRuc || normalizedClient?.clientDocument || clientCardCodeVal;
    const clientAddressVal = normalizedClient?.Address || normalizedClient?.address || "";
    const clientNameVal = normalizedClient?.CardName || normalizedClient?.name || "CLIENTE GENERAL";

    const newDoc = {
      id: existingDoc?.id || activeDocNumber,
      docNumber: activeDocNumber,
      docType,
      client,
      clientName: clientNameVal,
      clientRuc: clientRucVal,
      clientAddress: clientAddressVal,
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
      selectedPoint,
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
      ? saved.map((q) => (isMatchingDoc(q) ? newDoc : q))
      : [newDoc, ...saved.filter((q) => !isMatchingDoc(q))];

    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
    window.dispatchEvent(new Event("localQuotesUpdated"));
    if (setQuoteId) setQuoteId(activeDocNumber);

    // Persistencia centralizada en MySQL vía Backend
    createQuote(newDoc).then(() => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }).catch(err => {
      console.error("Error persistiendo cotización en base de datos:", err);
    });

    // Si se ENVIÓ a validación, generar la notificación para Facturación
    if (targetStatus === "ENVIADO") {
      const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
      const clientName = client?.CardName || client?.name || "Cliente General";
      const totalUsdStr = finalTotals?.grandTotalUSD ? `$${finalTotals.grandTotalUSD.toFixed(2)}` : "$0.00";
      const ADMIN_FACTURACION_USERNAME = "enrique";
      const senderUsername = username || localSeller || "vendedor";
      const notifObj = {
        id: `NOTIF-${Date.now()}`,
        targetRole: "FACTURACION",
        targetUsername: ADMIN_FACTURACION_USERNAME,
        fromUsername: senderUsername,
        fromUserId: userId || null,
        quoteId: activeDocNumber,
        quoteObj: newDoc,
        title: `📩 Nueva Cotización Recibida - ${activeDocNumber}`,
        description: `Enviada por ${activeSeller} • Cliente: ${clientName} (${totalUsdStr}) ${opNum ? `• Váucher BCP: N° ${opNum}` : ''}. Requiere validación.`,
        status: "ENVIADO",
        timestamp: new Date().toISOString(),
        read: false
      };
      localStorage.setItem("grupoLeon_notifications", JSON.stringify([notifObj, ...existingNotifs.filter(n => n.quoteId !== activeDocNumber || n.targetUsername !== ADMIN_FACTURACION_USERNAME)]));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
    }

    return { success: true, activeDocNumber, currentStatus };
  };

  // Autoguardado preventivo (Exit-Safe & Crash-Safe)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isExplicitlySubmittingRef.current && client && products && products.length > 0) {
        handleSaveAction("BORRADOR", { silent: true });
      }
    };

    const handleVisibilityChange = () => {
      if (!isExplicitlySubmittingRef.current && document.visibilityState === "hidden" && client && products && products.length > 0) {
        handleSaveAction("BORRADOR", { silent: true });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Guardar automáticamente al salir de la pantalla solo si no se envió explícitamente y hay datos completos
      if (!isExplicitlySubmittingRef.current && client && products && products.length > 0) {
        handleSaveAction("BORRADOR", { silent: true });
      }
    };
  }, [client, products, totals, docNumber, quoteId, comment, selectedDeliveryForm, selectedTransport, selectedPaymentType, opNum]);

  const handleSaveDraft = () => {
    const result = handleSaveAction("BORRADOR");
    if (result && result.success) {
      isExplicitlySubmittingRef.current = true;
      toast({
        title: "📝 Borrador Guardado",
        description: `Documento ${result.activeDocNumber} guardado exitosamente. Redirigiendo a Gestión de Cotizaciones...`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      clear();
      navigate("/historyquotes");
    }
  };

  const handleSaveAndSend = () => {
    // Validaciones previas antes de abrir el modal de confirmación
    if (!client) {
      toast({
        title: "Selecciona un cliente",
        description: "Debes buscar y seleccionar un socio de negocio antes de enviar.",
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
    // Abrir modal de confirmación pre-envío
    setShowConfirmModal(true);
  };

  const handleConfirmedSend = () => {
    isExplicitlySubmittingRef.current = true;
    setShowConfirmModal(false);
    const result = handleSaveAction("ENVIADO");
    if (result) {
      toast({
        title: "✅ Cotización Enviada a Validación",
        description: `Documento ${result.activeDocNumber} registrado y enviado en tiempo real a la Asesora de Facturación.`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      clear();
      navigate("/historyquotes");
    }
  };

  const handleSendToBillingValidation = () => {
    // Validar campos obligatorios de logística y pagos
    if (!selectedDeliveryForm) {
      toast({
        title: "Forma de entrega requerida",
        description: "Debe seleccionar una forma de entrega para el despacho.",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }
    if (!selectedPaymentType) {
      toast({
        title: "Condición de pago requerida",
        description: "Debe seleccionar la condición de pago.",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }
    const isPickup = Number(selectedDeliveryForm?.TrnspCode) === 1 || String(selectedDeliveryForm?.TrnspName || '').toLowerCase().includes("recojo");
    if (!isPickup && !selectedPoint) {
      toast({
        title: "Punto de llegada requerido",
        description: "Debe seleccionar o escribir la dirección de despacho.",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }
    if (!isPickup && !selectedTransport) {
      toast({
        title: "Agencia de transporte requerida",
        description: "Debe seleccionar o escribir la agencia de transporte.",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }
    if (!opNum) {
      toast({
        title: "N° Operación / Voucher requerido",
        description: "Debe ingresar el número de operación bancaria de abono.",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    const activeDocNumber = quoteId || docNumber;
    const nowIso = new Date().toISOString();
    
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const existingDoc = saved.find((q) => (q.id || q.docNumber) === activeDocNumber);
    const prevHistory = existingDoc?.historyLog || [];
    
    const updatedHistory = [
      { status: "PENDIENTE_FACTURACION", timestamp: nowIso, user: activeSeller, note: `Datos logísticos y de pago cargados (N° Op: ${opNum}). Enviado a validación definitiva de Facturación.` },
      ...prevHistory
    ];

    const finalTotals = {
      ...totals,
      grandTotal: totals.grandTotalUSD,
    };

    const newDoc = {
      ...(existingDoc || {}),
      id: activeDocNumber,
      docNumber: activeDocNumber,
      selectedDeliveryForm,
      selectedTransport,
      selectedPaymentType,
      selectedPoint,
      opNum,
      paymentImg,
      totals: finalTotals,
      updatedAt: nowIso,
      status: "PENDIENTE_FACTURACION",
      state: "PENDIENTE_FACTURACION",
      approvalStatus: "PENDIENTE_FACTURACION",
      historyLog: updatedHistory
    };

    const updated = saved.map((q) => ((q.id || q.docNumber) === activeDocNumber ? newDoc : q));
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
    window.dispatchEvent(new Event("localQuotesUpdated"));

    // Persistir actualización en MySQL
    updateQuote(newDoc).then(() => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }).catch(err => {
      console.error("Error actualizando cotización a PENDIENTE_FACTURACION:", err);
    });

    // Enviar notificación a Facturación (Enrique)
    const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const clientName = client?.CardName || client?.name || "Cliente General";
    const totalUsdStr = finalTotals?.grandTotalUSD ? `$${finalTotals.grandTotalUSD.toFixed(2)}` : "$0.00";
    const ADMIN_FACTURACION_USERNAME = "enrique";
    
    const notifObj = {
      id: `NOTIF-${Date.now()}`,
      targetRole: "FACTURACION",
      targetUsername: ADMIN_FACTURACION_USERNAME,
      fromUsername: activeSeller,
      fromUserId: userId || null,
      quoteId: activeDocNumber,
      quoteObj: newDoc,
      title: `💳 Cotización con Abono Listo - ${activeDocNumber}`,
      description: `El vendedor ${activeSeller} adjuntó abono para ${clientName} (${totalUsdStr}) • N° Op: ${opNum}. Listo para emitir en SAP.`,
      status: "PENDIENTE_FACTURACION",
      timestamp: new Date().toISOString(),
      read: false
    };
    
    localStorage.setItem("grupoLeon_notifications", JSON.stringify([notifObj, ...existingNotifs.filter(n => n.quoteId !== activeDocNumber)]));
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    toast({
      title: "📩 Enviado a Facturación",
      description: `Los datos logísticos y el abono N° ${opNum} fueron enviados a la Asesora de Facturación para su emisión en SAP.`,
      status: "success",
      duration: 5000,
      isClosable: true
    });

    handleNewQuote();
    navigate("/historyquotes");
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

      {/* ── BANNER COTIZACIÓN OBSERVADA / EN CORRECCIÓN ── */}
      {isObservedOrInCorrection && (
        <Alert
          status="warning"
          variant="left-accent"
          borderRadius="xl"
          p={3.5}
          bg="#fffbeb"
          borderColor="#f59e0b"
          boxShadow="sm"
        >
          <AlertIcon color="#d97706" />
          <Box flex="1">
            <HStack spacing={2} align="center" mb={0.5}>
              <Badge colorScheme="orange" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="900">
                💬 COTIZACIÓN OBSERVADA / EN REVISIÓN
              </Badge>
              <Text fontWeight="900" color="#92400e" fontSize="xs">
                Requiere Corrección y Reenvío
              </Text>
            </HStack>
            <Text fontSize="xs" color="#b45309" fontWeight="600">
              {rejectionReason || observations || "Esta cotización fue devuelta por el Administrador para corrección. Realice los cambios necesarios y presione 'Guardar y Reenviar a Validación'."}
            </Text>
          </Box>
        </Alert>
      )}

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
            <Badge
              bg={
                approvalStatus === "APROBADO_COMERCIAL"
                  ? "#fef9c3"
                  : approvalStatus === "PENDIENTE_FACTURACION"
                  ? "#f5f3ff"
                  : "orange.100"
              }
              color={
                approvalStatus === "APROBADO_COMERCIAL"
                  ? "#854d0e"
                  : approvalStatus === "PENDIENTE_FACTURACION"
                  ? "#5b21b6"
                  : "orange.800"
              }
              border="1px solid"
              borderColor={
                approvalStatus === "APROBADO_COMERCIAL"
                  ? "#fef08a"
                  : approvalStatus === "PENDIENTE_FACTURACION"
                  ? "#ddd6fe"
                  : "orange.200"
              }
              px={2.5}
              py={1}
              borderRadius="md"
              fontSize="xs"
              fontWeight="900"
            >
              <Box as="span">
                Estado: {approvalStatus || "Borrador (Abierto)"}
              </Box>
            </Badge>
            <Badge
              bg="#f5f3ff"
              color="#6b21a8"
              border="1px solid"
              borderColor="#ddd6fe"
              px={2.5}
              py={1}
              borderRadius="md"
              fontSize="xs"
              fontWeight="800"
            >
              💾 Autoguardado Activo
            </Badge>
          </Flex>
        </Flex>

        {/* ── BÚSQUEDA DE CLIENTE Y CAMPOS PROGRESIVOS NATIVOS ── */}
        {revealTabs ? (
          <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
            {/* Columna Izquierda: Datos de Cliente y Moneda */}
            <VStack align="stretch" spacing={3}>
              {isReadOnly ? (
                <Box p={3.5} bg="#f0fdf4" borderRadius="xl" border="1.5px solid" borderColor="#bbf7d0" boxShadow="xs">
                  <Text fontSize="10px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider" mb={1.5}>
                    🤝 Cliente SAP (Seleccionado y Bloqueado)
                  </Text>
                  <Text fontSize="xs" color="gray.800" fontWeight="700">
                    {client?.CardName || client?.name || "Cliente General"}
                  </Text>
                  <Text fontSize="0.75rem" color="gray.500" fontWeight="600" mt={0.5}>
                    Documento: {client?.CardCode || client?.id || "N/A"}
                  </Text>
                </Box>
              ) : (
                <ClientAutocomplete client={client} setClient={setClient} />
              )}

              {/* Persona de contacto y OC Cliente (Fase Pedido) */}
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
            </VStack>

            {/* Columna Derecha: Fechas de Contabilización y Vencimiento */}
            <VStack align="stretch" spacing={3}>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
                <FormControl>
                  <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="gray.700" mb={1}>
                    Válido Hasta / Vencimiento
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
            </VStack>
          </Grid>
        ) : (
          /* FASE 1: Cotización Inicial limpia — Buscador compacto de 560px */
          <Box w="full" maxW={{ base: "full", md: "560px" }}>
            {isReadOnly ? (
              <Box p={3.5} bg="#f0fdf4" borderRadius="xl" border="1.5px solid" borderColor="#bbf7d0" boxShadow="xs">
                <Text fontSize="10px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider" mb={1.5}>
                  🤝 Cliente SAP (Seleccionado y Bloqueado)
                </Text>
                <Text fontSize="xs" color="gray.800" fontWeight="700">
                  {client?.CardName || client?.name || "Cliente General"}
                </Text>
                <Text fontSize="0.75rem" color="gray.500" fontWeight="600" mt={0.5}>
                  Documento: {client?.CardCode || client?.id || "N/A"}
                </Text>
              </Box>
            ) : (
              <ClientAutocomplete client={client} setClient={setClient} />
            )}
          </Box>
        )}
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

            {revealTabs && (
              <Tab flexShrink={0} whiteSpace="nowrap" minH={{ base: "44px", md: "auto" }} _selected={{ bg: "white", color: "#126C36", fontWeight: "800", borderTop: "3px solid #126C36" }}>
                <HStack spacing={1.5} fontSize="xs">
                  <Truck className="w-3.5 h-3.5" />
                  <Text>Logística, Pagos y Anexos</Text>
                </HStack>
              </Tab>
            )}
          </TabList>

          <TabPanels p={{ base: 2, md: 4 }}>
            {/* Pestaña 1: Contenido (Grid de productos) */}
            <TabPanel p={0}>
              <SapItemGrid
                client={client}
                products={products}
                onAddProduct={addProduct}
                onRemoveProduct={removeProduct}
                onUpdateProduct={updateProduct}
                currency="USD"
                whsCode="014"
                isReadOnly={isReadOnly}
              />
            </TabPanel>

            {/* Pestaña 2: Logística, Pagos y Anexos Unificados */}
            {revealTabs && (
              <TabPanel p={2}>
                <VStack align="stretch" spacing={3}>
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
            )}
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
          w={{ base: "full", md: "full" }}
        >
          {approvalStatus === "APROBADO_COMERCIAL" ? (
            <>
              <Button
                bg="#16a34a"
                color="white"
                _hover={{ bg: "#15803d" }}
                size="md"
                w={{ base: "full", sm: "auto" }}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleSendToBillingValidation}
                fontWeight="850"
                boxShadow="0 4px 12px rgba(22,163,74,0.3)"
              >
                ⚡ Enviar a Validación de Facturación
              </Button>
              <Button
                colorScheme="red"
                variant="outline"
                size="md"
                w={{ base: "full", sm: "auto" }}
                onClick={() => {
                  clear();
                  navigate("/historyquotes");
                }}
                fontWeight="700"
              >
                Cancelar
              </Button>
            </>
          ) : (
            docType === "OFERTA_VENTA" && (
              <>
                <Button
                  bg="#126C36"
                  color="white"
                  _hover={{ bg: "#0e572b" }}
                  size="md"
                  w={{ base: "full", sm: "auto" }}
                  leftIcon={<Save className="w-4 h-4" />}
                  onClick={handleSaveAndSend}
                  fontWeight="800"
                >
                  {isObservedOrInCorrection
                    ? "Guardar y Reenviar a Validación"
                    : "Guardar y Enviar a Validación"}
                </Button>
                {!isObservedOrInCorrection && (
                  <Button
                    colorScheme="gray"
                    size="md"
                    w={{ base: "full", sm: "auto" }}
                    leftIcon={<Save className="w-4 h-4 text-gray-500" />}
                    onClick={handleSaveDraft}
                    fontWeight="700"
                  >
                    Guardar como Borrador
                  </Button>
                )}
              </>
            )
          )}

          <Button
            colorScheme="teal"
            variant="outline"
            borderColor="#0d9488"
            color="#0f766e"
            bg="#f0fdfa"
            _hover={{ bg: "#ccfbf1", borderColor: "#0f766e" }}
            size="md"
            w={{ base: "full", sm: "auto" }}
            leftIcon={<Printer className="w-4 h-4 text-teal-600" />}
            onClick={() => setIsPreviewOpen(true)}
            fontWeight="800"
            borderRadius="md"
          >
            Ver Boleta
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
            Limpiar
          </Button>
        </Flex>
      </Flex>

      {/* Modal de Documento Oficial SAP */}
      <SapQuoteDocumentModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        quote={currentQuoteObj}
      />

      {/* Modal de Confirmación Pre-Envío (Checklist de Seguridad) */}
      <QuoteSubmitConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedSend}
        quote={currentQuoteObj}
      />
    </VStack>
  );
}
