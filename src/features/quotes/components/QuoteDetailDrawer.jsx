import React, { useState } from "react";
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  DrawerFooter,
  Box,
  Flex,
  Text,
  Heading,
  Badge,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Divider,
  Button,
  Grid,
  GridItem,
  Icon as ChakraIcon,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  FormHelperText,
  Textarea,
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import {
  FileText,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Info,
  Check,
  Circle,
  ShieldCheck,
  Lock,
  Send,
  RotateCcw,
  Download,
  Edit3,
  Trash2,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuoteStore } from "../stores/quoteStore";
import { RejectReasonModal } from "./RejectReasonModal";
import { ObserveReasonModal } from "./ObserveReasonModal";
import QuotePdfModal from "./QuotePdfModal";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";
import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import { useGetQuoteById } from "../hooks/queries/quotesQueries";
import { useQueryClient } from "@tanstack/react-query";

export function QuoteDetailDrawer({ isOpen, onClose, quote, onUpdateStatus }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { username: authUsername, role: authRole } = useAuthStore();
  const isAdminUser = authRole === "ADMIN" || authUsername?.toLowerCase() === "enrique";
  const activeRole = isAdminUser ? "ADMIN" : "SELLER";
  const adminUsername = isAdminUser ? (authUsername || "Enrique") : "Enrique";

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isObserveModalOpen, setIsObserveModalOpen] = useState(false);
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [resubmitNote, setResubmitNote] = useState("");
  const [pdfQuote, setPdfQuote] = useState(null);
  const toast = useToast();

  const quoteId = quote?.docNumber || quote?.id;
  const { data: serverQuote } = useGetQuoteById(quoteId);

  // Extractor exhaustivo de ítems desde cualquier estructura
  const extractItems = (doc) => {
    if (!doc) return [];
    if (Array.isArray(doc.products) && doc.products.length > 0) return doc.products;
    if (Array.isArray(doc.items) && doc.items.length > 0) return doc.items;
    if (Array.isArray(doc.lines) && doc.lines.length > 0) return doc.lines;
    if (Array.isArray(doc.DocumentLines) && doc.DocumentLines.length > 0) return doc.DocumentLines;
    if (doc.totals && Array.isArray(doc.totals.normalizedProducts) && doc.totals.normalizedProducts.length > 0) return doc.totals.normalizedProducts;
    if (doc.totals && Array.isArray(doc.totals.products) && doc.totals.products.length > 0) return doc.totals.products;
    return [];
  };

  // Unificación inteligente de la cotización (Prioriza datos completos de servidor/local/caché)
  const effectiveQuote = React.useMemo(() => {
    if (!quote) return null;
    let full = { ...quote };

    if (serverQuote) {
      full = { ...serverQuote, ...full };
      const serverItems = extractItems(serverQuote);
      if (serverItems.length > 0) {
        full.products = serverItems;
      }
      if (serverQuote.client && (!full.client || Object.keys(full.client).length === 0)) {
        full.client = serverQuote.client;
      }
      if (serverQuote.clientName && (!full.clientName || full.clientName === "—")) {
        full.clientName = serverQuote.clientName;
      }
      if (serverQuote.clientRuc && (!full.clientRuc || full.clientRuc === "—")) {
        full.clientRuc = serverQuote.clientRuc;
      }
      if (serverQuote.clientAddress && (!full.clientAddress || full.clientAddress === "—")) {
        full.clientAddress = serverQuote.clientAddress;
      }
      if (serverQuote.totals && (!full.totals || !full.totals.grandTotalUSD)) {
        full.totals = serverQuote.totals;
      }
      if (serverQuote.sellerName && (!full.sellerName || full.sellerName === "—")) {
        full.sellerName = serverQuote.sellerName;
      }
      if (serverQuote.historyLog && serverQuote.historyLog.length > 0) {
        full.historyLog = serverQuote.historyLog;
      }
      if (serverQuote.opNum && !full.opNum) {
        full.opNum = serverQuote.opNum;
      }
    }

    // Si aún no tiene productos, buscar en caché de React Query
    let currentItems = extractItems(full);
    if (currentItems.length === 0 && quoteId) {
      try {
        const cachedQuotes = queryClient.getQueryData(["quotes"]);
        if (Array.isArray(cachedQuotes)) {
          const foundInCache = cachedQuotes.find(q => String(q.id || q.docNumber) === String(quoteId));
          if (foundInCache) {
            full = { ...foundInCache, ...full };
            currentItems = extractItems(foundInCache);
          }
        }
      } catch {}
    }

    // Si aún no tiene productos, buscar en localStorage
    if (currentItems.length === 0 && quoteId) {
      try {
        const localQuotes = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
        const found = localQuotes.find(q => String(q.id || q.docNumber) === String(quoteId));
        if (found) {
          full = { ...found, ...full };
          currentItems = extractItems(found);
          if (found.client && (!full.client || Object.keys(full.client).length === 0)) {
            full.client = found.client;
          }
          if (found.clientName && (!full.clientName || full.clientName === "—")) {
            full.clientName = found.clientName;
          }
          if (found.clientRuc && (!full.clientRuc || full.clientRuc === "—")) {
            full.clientRuc = found.clientRuc;
          }
          if (found.totals && (!full.totals || !full.totals.grandTotalUSD)) {
            full.totals = found.totals;
          }
        }
      } catch {}
    }

    full.products = currentItems;
    return full;
  }, [quote, serverQuote, quoteId, queryClient]);

  if (!effectiveQuote) return null;

  const client = effectiveQuote.client || {};
  const clientName = effectiveQuote.clientName || client.CardName || client.name || "—";
  const clientRuc = effectiveQuote.clientRuc || client.LicTradNum || client.FederalTaxID || client.clientRuc || "—";
  const clientAddress = effectiveQuote.clientAddress || client.Address || client.address || "—";
  const sellerName = effectiveQuote.sellerName || effectiveQuote.createdByUsername || "—";
  const products = effectiveQuote.products || effectiveQuote.items || [];
  const status = effectiveQuote.approvalStatus || effectiveQuote.state || effectiveQuote.status || "GENERADO";
  
  // Mapear historial
  const historyLog = effectiveQuote.historyLog || [
    { status: "GENERADO", timestamp: effectiveQuote.createdAt || new Date().toISOString(), user: sellerName, note: "Cotización creada en aplicativo" }
  ];

  // Calcular Totales unificados con calculadora global
  const tcVal = Number(effectiveQuote.totals?.tc) || 3.76;
  const calcRes = calculateQuoteTotals(products, tcVal);
  const displayProducts = calcRes.normalizedProducts;
  const subtotalUSD = calcRes.subtotalUSD;
  const igvUSD = calcRes.igvUSD;
  const grandTotalUSD = calcRes.grandTotalUSD;
  const grandTotalSOL = calcRes.grandTotalSOL;

  // Formateadores y cálculos de marca de tiempo en vivo
  const formatTimeStr = (isoStr) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return "—";
    }
  };

  const findLogIso = (targetStatuses) => {
    const entry = historyLog.find(h => targetStatuses.includes(h.status));
    return entry ? entry.timestamp : null;
  };

  const calculateDurationStr = (startIso, endIso) => {
    if (!startIso || !endIso) return "—";
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    if (isNaN(startMs) || isNaN(endMs) || endMs < startMs) return "—";
    const diffMins = Math.round((endMs - startMs) / 60000);
    if (diffMins < 1) return "< 1 min";
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const createdIso = effectiveQuote.createdAt || historyLog[0]?.timestamp || new Date().toISOString();
  const solicitudIso = findLogIso(["ENVIADO", "EN_PROCESO", "PENDIENTE_FACTURACION", "APROBADO", "APROBADO_COMERCIAL", "RECHAZADO", "OBSERVADO", "EN_EDICION"]);
  const revisionIso = findLogIso(["EN_PROCESO", "PENDIENTE_FACTURACION", "APROBADO", "APROBADO_COMERCIAL", "RECHAZADO", "OBSERVADO", "EN_EDICION", "VISTO"]);
  const finalIso = findLogIso(["APROBADO", "APROBADO_COMERCIAL", "RECHAZADO", "OBSERVADO", "FACTURADO"]);
  const observedIso = effectiveQuote.observedAt || findLogIso(["OBSERVADO", "EN_EDICION"]);

  // Estados de etapas del Stepper con colores vibrantes
  const isSolSent = ["ENVIADO", "EN_PROCESO", "PENDIENTE_FACTURACION", "APROBADO", "APROBADO_COMERCIAL", "RECHAZADO", "OBSERVADO", "EN_EDICION"].includes(status);
  const isObserved = status === "OBSERVADO" || status === "EN_EDICION";
  const isFinalApproved = status === "APROBADO" || status === "APROBADO_COMERCIAL" || status === "FACTURADO";
  const isFinalRejected = status === "RECHAZADO" || status === "ANULADO";
  const isFinalDone = isFinalApproved || isFinalRejected || isObserved;
  const isInReview = ["ENVIADO", "EN_PROCESO", "PENDIENTE_FACTURACION"].includes(status);

  const stepCotizado = {
    state: "completed",
    time: formatTimeStr(createdIso)
  };

  const stepSolicitud = {
    state: isSolSent ? "completed" : "pending",
    time: solicitudIso ? formatTimeStr(solicitudIso) : "—"
  };

  const stepRevision = {
    state: isFinalDone ? (isFinalRejected ? "rejected" : isObserved ? "observed" : "completed") : (isInReview ? "active" : "pending"),
    time: (isObserved && observedIso) ? formatTimeStr(observedIso) : (revisionIso ? formatTimeStr(revisionIso) : (isInReview ? "En curso" : "—"))
  };

  const stepFinal = {
    state: isFinalApproved ? "completed" : (isObserved ? "observed" : isFinalRejected ? "rejected" : "pending"),
    time: (isObserved && observedIso) ? formatTimeStr(observedIso) : (finalIso ? formatTimeStr(finalIso) : "—"),
    isApproved: isFinalApproved,
    isRejected: isFinalRejected,
    isObserved: isObserved
  };

  const dur1To2 = calculateDurationStr(createdIso, solicitudIso);
  const dur2To3 = calculateDurationStr(solicitudIso, revisionIso || observedIso);
  const dur3To4 = calculateDurationStr(revisionIso || solicitudIso, finalIso || observedIso);
  const totalCiclo = calculateDurationStr(createdIso, finalIso || observedIso || new Date().toISOString());

  // Definición del banner de alerta de estado
  const getStatusAlert = () => {
    switch (status) {
      case "OBSERVADO":
      case "EN_EDICION":
        return {
          bg: "amber.50",
          border: "amber.300",
          color: "amber.900",
          titleColor: "amber.900",
          iconColor: "amber.600",
          icon: MessageSquare,
          title: "Cotización Devuelta con Observación",
          subtitle: "FASE 3: DEVUELTO AL VENDEDOR PARA CORRECCIÓN",
          desc: effectiveQuote.observationReason || effectiveQuote.rejectionReason || "La cotización fue observada por el Administrador/Facturación y devuelta al vendedor para corrección de datos.",
          subdesc: "El vendedor debe realizar las correcciones indicadas y reenviarla a validación.",
          timeInStage: "Observado"
        };
      case "RECHAZADO":
        return {
          bg: "red.50",
          border: "red.200",
          color: "red.800",
          titleColor: "red.900",
          iconColor: "red.600",
          icon: XCircle,
          title: "Cotización Rechazada",
          subtitle: "ETAPA FINAL: RECHAZADA POR FACTURACIÓN",
          desc: quote.rejectionReason || "La solicitud fue rechazada durante la evaluación comercial.",
          subdesc: "Notificación emitida al vendedor de campo con la observación correspondiente.",
          timeInStage: "Evaluado"
        };
      case "APROBADO":
        return {
          bg: "emerald.50",
          border: "emerald.200",
          color: "emerald.800",
          titleColor: "emerald.900",
          iconColor: "emerald.600",
          icon: CheckCircle2,
          title: "Cotización Aprobada",
          subtitle: "ETAPA FINAL: LISTO PARA FACTURAR",
          desc: "Cotización aprobada exitosamente por la Asesora de Facturación (Enrique). Stock en Almacén 014 y depósito validados.",
          subdesc: "Aprobada en el flujo de pruebas comerciales de la aplicación.",
          timeInStage: "Aprobado"
        };
      case "EN_PROCESO":
        return {
          bg: "orange.50",
          border: "orange.200",
          color: "orange.800",
          titleColor: "orange.900",
          iconColor: "orange.600",
          icon: Clock,
          title: "Cotización En Revisión",
          subtitle: "FASE 3: EVALUACIÓN POR ASESORA DE FACTURACIÓN",
          desc: `La cotización está siendo evaluada por ${adminUsername || "Enrique"} para verificar la coincidencia del depósito.`,
          subdesc: "Esperando confirmación final de inventarios.",
          timeInStage: "En evaluación"
        };
      case "ENVIADO":
        return {
          bg: "blue.50",
          border: "blue.200",
          color: "blue.800",
          titleColor: "blue.900",
          iconColor: "blue.600",
          icon: Info,
          title: "Cotización Enviada a Validación",
          subtitle: "FASE 2: PENDIENTE DE REVISIÓN",
          desc: `El documento ha sido enviado por ${quote.sellerName || "el vendedor"}. Pendiente de evaluación y firma por Facturación.`,
          subdesc: "Esperando acción del perfil Administrador.",
          timeInStage: "Pendiente"
        };
      default:
        return {
          bg: "gray.50",
          border: "gray.200",
          color: "gray.800",
          titleColor: "gray.900",
          iconColor: "gray.600",
          icon: Info,
          title: "Borrador Generado",
          subtitle: "FASE 1: BORRADOR LOCAL",
          desc: `Documento registrado en la aplicación por ${quote.sellerName || "el vendedor"}.`,
          subdesc: "Presiona 'Guardar y Enviar a Validación' para remitirlo al Administrador.",
          timeInStage: "Reciente"
        };
    }
  };

  const alertDetails = getStatusAlert();

  // Función para aprobar por Admin (Enrique)
  const handleApproveByAdmin = () => {
    const isCommercial = status === "ENVIADO" || status === "EN_PROCESO";
    const nextStatus = isCommercial ? "APROBADO_COMERCIAL" : "APROBADO";
    const note = isCommercial 
      ? `Aprobado Comercial por ${adminUsername || "Admin"}` 
      : `Pedido Emitido Oficialmente en SAP por ${adminUsername || "Facturación"}`;

    if (onUpdateStatus) {
      onUpdateStatus(quote.id || quote.docNumber, nextStatus, note);
    }

    // Notificación dirigida al vendedor que creó la cotización
    const notifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const sellerUsername = quote.createdByUsername || quote.sellerName || null;
    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      targetRole: "VENDEDOR",
      targetUsername: sellerUsername,           // ← al vendedor que la creó
      fromUsername: adminUsername || "enrique", // ← del admin logueado
      quoteId: quote.docNumber || quote.id,
      quoteObj: { ...quote, approvalStatus: nextStatus, status: nextStatus },
      title: isCommercial ? `📢 Cotización Aprobada por Administrador` : `✓ Pedido SAP Emitido`,
      description: isCommercial 
        ? `Cotización ${quote.docNumber || quote.id} aprobada y validada por el administrador. Lista para atención.`
        : `El pedido ${quote.docNumber || quote.id} fue emitido y registrado oficialmente en SAP Business One.`,
      status: nextStatus,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      read: false
    };
    localStorage.setItem("grupoLeon_notifications", JSON.stringify([newNotif, ...notifs]));
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    toast({
      title: isCommercial ? "✅ Cotización Aprobada" : "⚡ Pedido Emitido SAP",
      description: isCommercial 
        ? `Se validó y aprobó la cotización del vendedor ${sellerUsername || ""}.`
        : `Cotización convertida en pedido registrado en SAP.`,
      status: "success",
      duration: 4000,
      isClosable: true,
    });
  };

  // Función para Subsanar y Reenviar cotización rechazada (RN-01 a RN-10)
  const handleResubmit = () => {
    if (resubmitNote.trim().length < 10) {
      toast({
        title: "Nota obligatoria",
        description: "Debes explicar qué corregiste (mínimo 10 caracteres).",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const quoteId = quote.id || quote.docNumber;
    const sellerUsername = quote.createdByUsername || quote.sellerName || null;
    const nowIso = new Date().toISOString();
    const prevRejectionReason = quote.rejectionReason || "Sin motivo registrado";

    // Actualizar cotización en localStorage → estado ENVIADO, limpiar rechazo
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const updatedQuotes = saved.map((q) => {
      if ((q.id || q.docNumber) !== quoteId) return q;
      const prevHistory = q.historyLog || [];
      const newEntry = {
        status: "SUBSANADO",
        timestamp: nowIso,
        user: sellerUsername || "vendedor",
        note: `SUBSANACIÓN: ${resubmitNote.trim()} [Rechazo previo: "${prevRejectionReason}"]`
      };
      const reenviado = {
        status: "ENVIADO",
        timestamp: new Date(Date.now() + 1000).toISOString(),
        user: sellerUsername || "vendedor",
        note: "Cotización reenviada a validación tras subsanación"
      };
      return {
        ...q,
        status: "ENVIADO",
        state: "ENVIADO",
        approvalStatus: "ENVIADO",
        rejectionReason: null,
        updatedAt: nowIso,
        historyLog: [...prevHistory, newEntry, reenviado]
      };
    });
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updatedQuotes));
    window.dispatchEvent(new Event("localQuotesUpdated"));

    // Notificación al Admin (Enrique) — nueva revisión requerida
    const ADMIN_FACTURACION_USERNAME = "enrique";
    const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const adminNotif = {
      id: `NOTIF-${Date.now()}`,
      targetRole: "FACTURACION",
      targetUsername: ADMIN_FACTURACION_USERNAME,
      fromUsername: sellerUsername || "vendedor",
      quoteId: quoteId,
      quoteObj: quote,
      title: `🔄 Cotización ${quoteId} Subsanada y Reenviada`,
      description: `${sellerUsername || "El vendedor"} ha subsanado la cotización y la reenvía para nueva revisión. Nota: "${resubmitNote.trim()}".`,
      status: "ENVIADO",
      createdAt: nowIso,
      timestamp: nowIso,
      read: false
    };
    // Notificación de confirmación al Vendedor
    const sellerConfirmNotif = {
      id: `NOTIF-${Date.now() + 1}`,
      targetRole: "VENDEDOR",
      targetUsername: sellerUsername,
      fromUsername: "Sistema",
      quoteId: quoteId,
      quoteObj: quote,
      title: `📤 Reenvío Registrado — ${quoteId}`,
      description: `Tu cotización fue subsanada y reenviada exitosamente. Facturación (${ADMIN_FACTURACION_USERNAME}) revisará nuevamente.`,
      status: "ENVIADO",
      createdAt: nowIso,
      timestamp: nowIso,
      read: false
    };
    localStorage.setItem(
      "grupoLeon_notifications",
      JSON.stringify([adminNotif, sellerConfirmNotif, ...existingNotifs])
    );
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    // Llamar onUpdateStatus para sincronizar estado en el componente padre
    if (onUpdateStatus) {
      onUpdateStatus(quoteId, "ENVIADO", `Subsanado y reenviado por ${sellerUsername || "vendedor"}`);
    }

    setResubmitNote("");
    setIsResubmitModalOpen(false);

    toast({
      title: "✅ Reenvío Exitoso",
      description: `Cotización ${quoteId} reenviada a validación. Enrique recibirá la notificación.`,
      status: "success",
      duration: 5000,
      isClosable: true,
    });
  };

  // Función para confirmar Rechazo desde Modal
  const handleConfirmReject = (quoteId, reasonText) => {
    if (onUpdateStatus) {
      onUpdateStatus(quoteId, "RECHAZADO", `Rechazado por ${adminUsername || "Admin Facturación"}: ${reasonText}`);
    }

    // Notificación dirigida al vendedor que creó la cotización
    const notifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const sellerUsername = quote.createdByUsername || quote.sellerName || null;
    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      targetRole: "VENDEDOR",
      targetUsername: sellerUsername,           // ← al vendedor que la creó
      fromUsername: adminUsername || "enrique", // ← del admin logueado
      quoteId: quoteId,
      quoteObj: quote,
      title: `❌ Cotización ${quote.docNumber || quote.id} Rechazada`,
      description: `Rechazada por ${adminUsername || "Administrador"}. Motivo: "${reasonText}"`,
      status: "RECHAZADO",
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      read: false
    };
    localStorage.setItem("grupoLeon_notifications", JSON.stringify([newNotif, ...notifs]));
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    toast({
      title: "❌ Cotización Rechazada",
      description: `Se registró el motivo de rechazo y se notificó al vendedor ${sellerUsername || ""}.`,
      status: "info",
      duration: 5000,
      isClosable: true,
    });
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        placement="right"
        size={{ base: "full", md: "xl" }}
        scrollBehavior="inside"
        blockScrollOnMount={false}
        preserveScrollBarGap={false}
        autoFocus={false}
      >
        <DrawerOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <DrawerContent
          borderLeftRadius={{ base: "none", md: "2xl" }}
          w="full"
          maxW={{ base: "100vw", md: "960px", lg: "1160px", xl: "1240px" }}
          display="flex"
          flexDirection="column"
          h={{ base: "100%", md: "100vh" }}
          maxH={{ base: "100dvh", md: "100vh" }}
        >
          <DrawerHeader bg="#126C36" color="white" py={3} px={{ base: 4, md: 6 }} flexShrink={0}>
            <Flex align="center" justify="space-between" gap={2}>
              <HStack spacing={3} minW={0}>
                <FileText className="w-5.5 h-5.5 text-emerald-300 flex-shrink-0" />
                <Box minW={0}>
                  <Heading size="sm" color="white" fontWeight="800" isTruncated>
                    {effectiveQuote.docNumber || effectiveQuote.id || "COT-017071"}
                  </Heading>
                  <Text fontSize={{ base: "11px", md: "xs" }} color="emerald.100" fontWeight="500">
                    Seguimiento Comercial y Control de Calidad
                  </Text>
                </Box>
              </HStack>
              <DrawerCloseButton
                color="white"
                position="static"
                flexShrink={0}
                w={{ base: "44px", md: "32px" }}
                h={{ base: "44px", md: "32px" }}
              />
            </Flex>
          </DrawerHeader>

          <DrawerBody
            p={{ base: 3, md: 5 }}
            pb={{ base: 24, md: 16 }}
            bg="slate.50"
            flex="1 1 auto"
            minH="0"
            overflowY="auto"
            overflowX="hidden"
            overscrollBehaviorY="contain"
            sx={{
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
              scrollbarWidth: "thin",
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-thumb": { bg: "gray.300", borderRadius: "full" }
            }}
          >
            {/* PANEL DE ACCIONES SEGÚN EL ROL AUTENTICADO Y ESTADO DE LA COTIZACIÓN */}
            {activeRole === "SELLER" ? (
              status === "RECHAZADO" ? (
                /* ── Panel Unificado de Subsanación (Vendedor + Rechazo) ── */
                <Box bg="red.50" p={4} borderRadius="xl" border="2px solid" borderColor="red.300" boxShadow="sm" mb={5}>
                  <VStack align="stretch" spacing={3}>
                    <Flex justify="space-between" align={{ base: "flex-start", sm: "center" }} wrap="wrap" gap={2}>
                      <HStack spacing={2.5}>
                        <Flex w="36px" h="36px" borderRadius="full" bg="red.500" align="center" justify="center" color="white" flexShrink={0}>
                          <XCircle className="w-5 h-5 stroke-[2.5]" />
                        </Flex>
                        <Box minW={0}>
                          <Text fontSize={{ base: "14px", md: "sm" }} fontWeight="900" color="red.900" textTransform="uppercase" letterSpacing="wide">
                            Cotización Rechazada por Facturación
                          </Text>
                          <Text fontSize={{ base: "12px", md: "xs" }} color="red.800" fontWeight="600">
                            Evaluada por {adminUsername || "Enrique"} • Acción requerida para subsanar
                          </Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme="red" variant="solid" px={3} py={1} borderRadius="full" fontSize="xs">
                        PENDIENTE DE SUBSANACIÓN
                      </Badge>
                    </Flex>

                    {/* Motivo del rechazo */}
                    <Box bg="white" border="1px solid" borderColor="red.200" p={3} borderRadius="lg">
                      <Text fontSize="10px" fontWeight="800" color="red.700" textTransform="uppercase" mb={1}>
                        💬 Motivo del Rechazo:
                      </Text>
                      <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="red.900" fontStyle="italic" overflowWrap="anywhere">
                        "{effectiveQuote.rejectionReason || "No se especificó motivo de rechazo."}"
                      </Text>
                    </Box>

                    <Button
                      size={{ base: "md", md: "sm" }}
                      w={{ base: "full", sm: "auto" }}
                      alignSelf={{ base: "stretch", sm: "flex-start" }}
                      colorScheme="orange"
                      leftIcon={<RotateCcw className="w-4 h-4" />}
                      onClick={() => { setResubmitNote(""); setIsResubmitModalOpen(true); }}
                      fontWeight="800"
                      boxShadow="sm"
                    >
                      Subsanar y Reenviar a Validación
                    </Button>
                  </VStack>
                </Box>
              ) : (status === "OBSERVADO" || status === "EN_EDICION") ? (
                /* ── Panel de Observación (Vendedor + Observado) ── */
                <Box bg="#fffbeb" p={4} borderRadius="xl" border="2px solid" borderColor="#f59e0b" boxShadow="sm" mb={5}>
                  <VStack align="stretch" spacing={3}>
                    <Flex justify="space-between" align={{ base: "flex-start", sm: "center" }} wrap="wrap" gap={2}>
                      <HStack spacing={2.5}>
                        <Flex w="36px" h="36px" borderRadius="full" bg="#d97706" align="center" justify="center" color="white" flexShrink={0}>
                          <MessageSquare className="w-5 h-5 stroke-[2.5]" />
                        </Flex>
                        <Box minW={0}>
                          <Text fontSize={{ base: "14px", md: "sm" }} fontWeight="900" color="#92400e" textTransform="uppercase" letterSpacing="wide">
                            💬 Cotización Devuelta con Observaciones
                          </Text>
                          <Text fontSize={{ base: "12px", md: "xs" }} color="#b45309" fontWeight="600">
                            Evaluada por {adminUsername || "Enrique"} • Requiere corrección y reenvío
                          </Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme="orange" variant="solid" px={3} py={1} borderRadius="full" fontSize="xs">
                        OBSERVADO / EN CORRECCIÓN
                      </Badge>
                    </Flex>

                    {/* Motivo de la observación */}
                    <Box bg="white" border="1px solid" borderColor="#fcd34d" p={3} borderRadius="lg">
                      <Text fontSize="10px" fontWeight="800" color="#92400e" textTransform="uppercase" mb={1}>
                        Indicación de Facturación / Administración:
                      </Text>
                      <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="#78350f" fontStyle="italic" overflowWrap="anywhere">
                        "{effectiveQuote.observationReason || effectiveQuote.rejectionReason || "Por favor revisa y corrige los datos observados antes de reenviar."}"
                      </Text>
                    </Box>

                    <Button
                      size={{ base: "md", md: "sm" }}
                      w={{ base: "full", sm: "auto" }}
                      alignSelf={{ base: "stretch", sm: "flex-start" }}
                      colorScheme="orange"
                      bg="#ea580c"
                      _hover={{ bg: "#c2410c" }}
                      leftIcon={<Edit3 className="w-4 h-4" />}
                      onClick={() => {
                        onClose();
                        if (typeof useQuoteStore.getState().setQuoteData === "function") {
                          useQuoteStore.getState().setQuoteData(effectiveQuote);
                        }
                        navigate("/newquotes");
                      }}
                      fontWeight="800"
                      boxShadow="sm"
                    >
                      ✏️ Abrir y Corregir en Formulario
                    </Button>
                  </VStack>
                </Box>
              ) : (
                /* ── Panel estático para otros estados en modo SELLER ── */
                <Box p={3.5} bg="blue.50" borderRadius="xl" border="1px solid" borderColor="blue.200" mb={5}>
                  <HStack spacing={2.5}>
                    <Lock className="w-4 h-4 text-blue-700 flex-shrink-0" />
                    <Text fontSize="xs" color="blue.900" fontWeight="700">
                      🔒 Modo Vendedor ({sellerName || "Manuel Zapata"}): Esta cotización está en proceso comercial. La evaluación está a cargo de Enrique (Admin / Facturación).
                    </Text>
                  </HStack>
                </Box>
              )
            ) : status === "APROBADO" ? (
              <Box bg="emerald.50" p={4} borderRadius="xl" border="2px solid" borderColor="emerald.500" boxShadow="sm" mb={5}>
                <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
                  <HStack spacing={3}>
                    <Flex w="36px" h="36px" borderRadius="full" bg="emerald.500" align="center" justify="center" color="white">
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    </Flex>
                    <Box>
                      <Text fontSize="xs" fontWeight="900" color="emerald.900" textTransform="uppercase">
                        ✅ Cotización Aprobada en SAP
                      </Text>
                      <Text fontSize="11px" color="emerald.800" fontWeight="600">
                        La cotización fue validada por {adminUsername || "Enrique"}. Lista para emisión oficial de orden.
                      </Text>
                    </Box>
                  </HStack>
                  <Badge colorScheme="green" variant="solid" px={3} py={1} borderRadius="full" fontSize="xs">
                    CONCLUIDO (APROBADO)
                  </Badge>
                </Flex>
              </Box>
            ) : status === "RECHAZADO" ? (
              <Box bg="red.50" p={4} borderRadius="xl" border="2px solid" borderColor="red.500" boxShadow="sm" mb={5}>
                <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
                  <HStack spacing={3}>
                    <Flex w="36px" h="36px" borderRadius="full" bg="red.500" align="center" justify="center" color="white">
                      <XCircle className="w-5 h-5 stroke-[2.5]" />
                    </Flex>
                    <Box>
                      <Text fontSize="xs" fontWeight="900" color="red.900" textTransform="uppercase">
                        ❌ Cotización Rechazada
                      </Text>
                      <Text fontSize="11px" color="red.800" fontWeight="600">
                        Motivo: "{effectiveQuote.rejectionReason || "No cumple con las políticas comerciales."}"
                      </Text>
                    </Box>
                  </HStack>
                  <Badge colorScheme="red" variant="solid" px={3} py={1} borderRadius="full" fontSize="xs">
                    CONCLUIDO (RECHAZADO)
                  </Badge>
                </Flex>
              </Box>
            ) : status === "APROBADO_COMERCIAL" ? (
              <Box bg="amber.50" p={4} borderRadius="xl" border="1.5px solid" borderColor="amber.300" mb={4}>
                <HStack spacing={3}>
                  <Flex w="36px" h="36px" borderRadius="full" bg="amber.500" align="center" justify="center" color="white" flexShrink={0}>
                    <Clock className="w-5 h-5" />
                  </Flex>
                  <Box>
                    <Text fontSize="xs" fontWeight="900" color="amber.900" textTransform="uppercase">
                      📢 Aprobación Comercial Completada
                    </Text>
                    <Text fontSize="11px" color="amber.800" fontWeight="600">
                      Esperando que el vendedor ({sellerName}) complete la información de pago (depósito) y despacho.
                    </Text>
                  </Box>
                </HStack>
              </Box>
            ) : (!status || ["GENERADO", "BORRADOR", "DRAFT", "draft"].includes(status)) ? (
              <Box bg="#eff6ff" p={{ base: 3.5, md: 4 }} borderRadius="xl" border="1.5px solid" borderColor="#bfdbfe" boxShadow="sm" mb={4}>
                <Flex direction={{ base: "column", sm: "row" }} align={{ base: "flex-start", sm: "center" }} justify="space-between" gap={3}>
                  <HStack spacing={3} align="center">
                    <Flex w="36px" h="36px" borderRadius="full" bg="#2563eb" align="center" justify="center" color="white" flexShrink={0}>
                      <Edit3 className="w-5 h-5 stroke-[2.5]" />
                    </Flex>
                    <Box>
                      <Text fontSize="xs" fontWeight="900" color="#1e3a8a" textTransform="uppercase" letterSpacing="wide">
                        📝 Cotización en Modo Borrador
                      </Text>
                      <Text fontSize="11px" color="#1e40af" fontWeight="600" mt={0.5}>
                        Este documento es un borrador interno y aún no ha sido enviado a validación comercial.
                      </Text>
                    </Box>
                  </HStack>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    bg="#2563eb"
                    _hover={{ bg: "#1d4ed8" }}
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={() => {
                      onClose();
                      if (typeof useQuoteStore.getState().setQuoteData === "function") {
                        useQuoteStore.getState().setQuoteData(effectiveQuote);
                      }
                      navigate("/newquotes");
                    }}
                    fontWeight="800"
                    borderRadius="lg"
                    px={3}
                  >
                    Abrir y Editar en Formulario
                  </Button>
                </Flex>
              </Box>
            ) : ((status === "ENVIADO" || status === "EN_PROCESO" || status === "PENDIENTE_FACTURACION") && isAdminUser) ? (
              <Box bg="#f0fdf4" p={{ base: 3.5, md: 4 }} borderRadius="xl" border="1.5px solid" borderColor="#86efac" boxShadow="sm" mb={4}>
                <Flex direction={{ base: "column", sm: "row" }} align={{ base: "flex-start", sm: "center" }} justify="space-between" gap={3}>
                  <HStack spacing={3} align="center">
                    <Flex w="36px" h="36px" borderRadius="full" bg="#16a34a" align="center" justify="center" color="white" flexShrink={0}>
                      <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                    </Flex>
                    <Box>
                      <Text fontSize="xs" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wide">
                        🔍 Verificación Comercial y Control de Calidad
                      </Text>
                      <Text fontSize="11px" color="gray.700" fontWeight="600" mt={0.5}>
                        {status === "PENDIENTE_FACTURACION"
                          ? `Valida el voucher y depósito ingresados por ${sellerName} antes de emitir en SAP.`
                          : `Cotización enviada por ${sellerName}. Puedes aprobarla, devolverla con observaciones o rechazarla.`}
                      </Text>
                    </Box>
                  </HStack>
                  <HStack spacing={2} wrap="wrap">
                    <Button
                      size="sm"
                      colorScheme="amber"
                      bg="#d97706"
                      _hover={{ bg: "#b45309" }}
                      color="white"
                      leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                      onClick={() => setIsObserveModalOpen(true)}
                      fontWeight="800"
                      borderRadius="lg"
                      px={3}
                    >
                      Observar
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="teal"
                      bg="#0f766e"
                      _hover={{ bg: "#115e59" }}
                      leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                      onClick={() => {
                        onClose();
                        if (typeof useQuoteStore.getState().setQuoteData === "function") {
                          useQuoteStore.getState().setQuoteData(effectiveQuote);
                        }
                        navigate("/newquotes");
                      }}
                      fontWeight="800"
                      borderRadius="lg"
                      px={3}
                    >
                      Revisar Formulario
                    </Button>
                  </HStack>
                </Flex>
              </Box>
            ) : null}

            {/* FICHA TÉCNICA RÁPIDA (Optimizada para Celular y PC) */}
            <Grid
              templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
              gap={{ base: 2.5, md: 3 }}
              mb={4}
              bg="white"
              p={{ base: 3, md: 4 }}
              borderRadius="xl"
              border="1.5px solid"
              borderColor="gray.200"
              boxShadow="xs"
            >
              <GridItem colSpan={{ base: 2, md: 1 }} minW={0}>
                <Text fontSize="10px" fontWeight="700" color="gray.500" textTransform="uppercase">Razón Social</Text>
                <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="900" color="gray.900" isTruncated title={clientName}>
                  {clientName}
                </Text>
              </GridItem>
              <GridItem minW={0}>
                <Text fontSize="10px" fontWeight="700" color="gray.500" textTransform="uppercase">RUC / Documento</Text>
                <Text fontSize={{ base: "12px", md: "xs" }} fontWeight="800" color="gray.800" fontFamily="mono" isTruncated>
                  {clientRuc}
                </Text>
              </GridItem>
              <GridItem minW={0}>
                <Text fontSize="10px" fontWeight="700" color="gray.500" textTransform="uppercase">Vendedor Asignado</Text>
                <Text fontSize={{ base: "12px", md: "xs" }} fontWeight="800" color="gray.800" isTruncated>
                  {sellerName}
                </Text>
              </GridItem>
              <GridItem minW={0}>
                <Text fontSize="10px" fontWeight="700" color="gray.500" textTransform="uppercase">Fecha Registro</Text>
                <Text fontSize={{ base: "12px", md: "xs" }} fontWeight="800" color="gray.800" isTruncated>
                  {effectiveQuote.docDate ? new Date(effectiveQuote.docDate).toLocaleDateString() : new Date(createdIso).toLocaleDateString()}
                </Text>
              </GridItem>
            </Grid>

            {/* SECCIÓN 📍 RUTA / SEGUIMIENTO DE LA COTIZACIÓN (CON COLORES VIBRANTES EN VIVO) */}
            <Box bg="white" p={{ base: 3, md: 5 }} borderRadius="2xl" border="1.5px solid" borderColor="gray.200" boxShadow="sm" mb={5} overflow="hidden">
              <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
                <HStack spacing={2} wrap="wrap">
                  <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="900" color="gray.900" textTransform="uppercase" letterSpacing="wider">
                    📍 Ruta / Seguimiento de la Cotización
                  </Text>
                  <Badge colorScheme={status === "RECHAZADO" ? "red" : "green"} variant="solid" fontSize="9px" px={2} borderRadius="full">
                    Tiempo Real
                  </Badge>
                </HStack>
                <HStack spacing={2} fontSize={{ base: "11px", md: "xs" }}>
                  <Text color="gray.600" fontWeight="700">Ciclo Total:</Text>
                  <Badge colorScheme={status === "RECHAZADO" ? "red" : "blue"} fontSize="xs" px={2.5} py={0.5} borderRadius="full" fontWeight="800">
                    {totalCiclo}
                  </Badge>
                  <Badge bg={status === "RECHAZADO" ? "red.600" : isFinalApproved ? "emerald.700" : isInReview ? "blue.600" : "gray.600"} color="white" fontSize="xs" px={2.5} py={0.5} borderRadius="full" fontWeight="900">
                    {isFinalDone ? "100%" : isInReview ? "66%" : "33%"}
                  </Badge>
                </HStack>
              </Flex>

              {/* VISTA MÓVIL: LÍNEA DE TIEMPO VERTICAL ELEGANTE */}
              <Box display={{ base: "block", md: "none" }} py={2} px={1}>
                <VStack align="stretch" spacing={3} position="relative" pl={2}>
                  <Box position="absolute" top="15px" bottom="25px" left="17px" w="3px" bg="gray.200" borderRadius="full" zIndex={0} />

                  {/* Paso 1: Cotizado */}
                  <Flex align="start" gap={3} zIndex={1} position="relative">
                    <Flex w="30px" h="30px" borderRadius="full" bg="#059669" align="center" justify="center" color="white" boxShadow="0 2px 8px rgba(5,150,105,0.4)" flexShrink={0}>
                      <Check className="w-4 h-4 stroke-[3]" />
                    </Flex>
                    <Box bg="emerald.50" p={2.5} borderRadius="xl" border="1.5px solid" borderColor="emerald.300" flex="1">
                      <Flex justify="space-between" align="center">
                        <Text fontSize="11px" fontWeight="900" color="emerald.900">1. COTIZADO</Text>
                        <Badge colorScheme="green" variant="solid" fontSize="9px">{stepCotizado.time}</Badge>
                      </Flex>
                      <Text fontSize="10px" color="emerald.800" mt={0.5} fontWeight="600">Documento registrado por {sellerName}</Text>
                    </Box>
                  </Flex>

                  {dur1To2 !== "—" && (
                    <Text fontSize="9px" fontWeight="800" color="gray.500" pl={9} my={-1}>
                      ⏱️ {dur1To2}
                    </Text>
                  )}

                  {/* Paso 2: Solicitud */}
                  <Flex align="start" gap={3} zIndex={1} position="relative">
                    <Flex
                      w="30px"
                      h="30px"
                      borderRadius="full"
                      bg={isSolSent ? "#059669" : "#e2e8f0"}
                      align="center"
                      justify="center"
                      color={isSolSent ? "white" : "#64748b"}
                      boxShadow={isSolSent ? "0 2px 8px rgba(5,150,105,0.4)" : "none"}
                      flexShrink={0}
                    >
                      {isSolSent ? <Check className="w-4 h-4 stroke-[3]" /> : <Circle className="w-3.5 h-3.5" />}
                    </Flex>
                    <Box bg={isSolSent ? "emerald.50" : "white"} p={2.5} borderRadius="xl" border="1.5px solid" borderColor={isSolSent ? "emerald.300" : "gray.200"} flex="1">
                      <Flex justify="space-between" align="center">
                        <Text fontSize="11px" fontWeight="900" color={isSolSent ? "emerald.900" : "gray.500"}>2. SOLICITUD ENVIADA</Text>
                        <Badge colorScheme={isSolSent ? "green" : "gray"} variant="solid" fontSize="9px">{stepSolicitud.time}</Badge>
                      </Flex>
                      <Text fontSize="10px" color="gray.600" mt={0.5}>Enviada a Facturación para control</Text>
                    </Box>
                  </Flex>

                  {dur2To3 !== "—" && (
                    <Text fontSize="9px" fontWeight="800" color="gray.500" pl={9} my={-1}>
                      ⏱️ {dur2To3}
                    </Text>
                  )}

                  {/* Paso 3: Revisión */}
                  <Flex align="start" gap={3} zIndex={1} position="relative">
                    <Flex
                      w="30px"
                      h="30px"
                      borderRadius="full"
                      bg={isFinalDone ? (isFinalRejected ? "#dc2626" : isObserved ? "#d97706" : "#059669") : (isInReview ? "#2563eb" : "#e2e8f0")}
                      align="center"
                      justify="center"
                      color="white"
                      boxShadow={isInReview ? "0 0 0 4px rgba(37,99,235,0.3)" : isObserved ? "0 2px 8px rgba(217,119,6,0.4)" : (isFinalDone ? "0 2px 8px rgba(5,150,105,0.4)" : "none")}
                      flexShrink={0}
                    >
                      {isFinalDone ? (
                        isFinalRejected ? <XCircle className="w-4 h-4 stroke-[3]" /> : isObserved ? <MessageSquare className="w-4 h-4 stroke-[2.5]" /> : <Check className="w-4 h-4 stroke-[3]" />
                      ) : isInReview ? (
                        <Clock className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </Flex>
                    <Box
                      bg={isFinalDone ? (isFinalRejected ? "red.50" : isObserved ? "amber.50" : "emerald.50") : (isInReview ? "blue.50" : "white")}
                      p={2.5}
                      borderRadius="xl"
                      border="1.5px solid"
                      borderColor={isFinalDone ? (isFinalRejected ? "red.300" : isObserved ? "amber.300" : "emerald.300") : (isInReview ? "blue.300" : "gray.200")}
                      flex="1"
                    >
                      <Flex justify="space-between" align="center">
                        <Text fontSize="11px" fontWeight="900" color={isFinalDone ? (isFinalRejected ? "red.900" : isObserved ? "amber.900" : "emerald.900") : (isInReview ? "blue.900" : "gray.500")}>
                          3. {isObserved ? "OBSERVADO" : "EN REVISIÓN"}
                        </Text>
                        <Badge colorScheme={isFinalDone ? (isFinalRejected ? "red" : isObserved ? "orange" : "green") : (isInReview ? "blue" : "gray")} variant="solid" fontSize="9px">
                          {stepRevision.time}
                        </Badge>
                      </Flex>
                      <Text fontSize="10px" color="gray.600" mt={0.5}>
                        {isObserved ? "Devuelto con observaciones al vendedor" : "Evaluación por Asesora de Facturación"}
                      </Text>
                    </Box>
                  </Flex>

                  {dur3To4 !== "—" && (
                    <Text fontSize="9px" fontWeight="800" color="gray.500" pl={9} my={-1}>
                      ⏱️ {dur3To4}
                    </Text>
                  )}

                  {/* Paso 4: Final */}
                  <Flex align="start" gap={3} zIndex={1} position="relative">
                    <Flex
                      w="30px"
                      h="30px"
                      borderRadius="full"
                      bg={isFinalApproved ? "#059669" : isObserved ? "#d97706" : isFinalRejected ? "#dc2626" : "#e2e8f0"}
                      align="center"
                      justify="center"
                      color="white"
                      boxShadow={isFinalApproved ? "0 2px 8px rgba(5,150,105,0.4)" : isObserved ? "0 2px 8px rgba(217,119,6,0.4)" : (isFinalRejected ? "0 2px 8px rgba(220,38,38,0.4)" : "none")}
                      flexShrink={0}
                    >
                      {isFinalApproved ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : isObserved ? (
                        <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                      ) : isFinalRejected ? (
                        <XCircle className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </Flex>
                    <Box
                      bg={isFinalApproved ? "emerald.50" : isObserved ? "amber.50" : isFinalRejected ? "red.50" : "white"}
                      p={2.5}
                      borderRadius="xl"
                      border="1.5px solid"
                      borderColor={isFinalApproved ? "emerald.300" : isObserved ? "amber.300" : isFinalRejected ? "red.300" : "gray.200"}
                      flex="1"
                    >
                      <Flex justify="space-between" align="center">
                        <Text fontSize="11px" fontWeight="900" color={isFinalApproved ? "emerald.900" : isObserved ? "amber.900" : isFinalRejected ? "red.900" : "gray.500"}>
                          4. RESULTADO: {isFinalApproved ? "APROBADO" : isObserved ? "OBSERVADO" : isFinalRejected ? "RECHAZADO" : "PENDIENTE"}
                        </Text>
                        <Badge colorScheme={isFinalApproved ? "green" : isObserved ? "orange" : isFinalRejected ? "red" : "gray"} variant="solid" fontSize="9px">
                          {stepFinal.time}
                        </Badge>
                      </Flex>
                      <Text fontSize="10px" color="gray.600" mt={0.5}>
                        {isFinalApproved ? "Cotización lista para emitir en SAP" : isObserved ? "Documento devuelto para corrección" : isFinalRejected ? "Documento rechazado" : "Esperando resolución final"}
                      </Text>
                    </Box>
                  </Flex>
                </VStack>
              </Box>

              {/* VISTA ESCRITORIO (PC): LÍNEA HORIZONTAL CON ALTO CONTRASTE */}
              <Box display={{ base: "none", md: "block" }} w="full" maxW="100%" overflow="hidden" pb={1}>
                <Box position="relative" py={4} px={8} bg="#f8fafc" borderRadius="xl" border="1px solid" borderColor="#e2e8f0" w="full">
                  {/* Línea base gris de fondo */}
                  <Box position="absolute" top="37px" left="65px" right="65px" h="4px" bg="#e2e8f0" borderRadius="full" zIndex={0} />
                  
                  {/* Línea de progreso con color dinámico */}
                  <Box
                    position="absolute"
                    top="37px"
                    left="65px"
                    h="4px"
                    bg={isFinalRejected ? "#dc2626" : isObserved ? "#d97706" : isFinalApproved ? "#059669" : isInReview ? "#2563eb" : "#059669"}
                    borderRadius="full"
                    zIndex={0}
                    transition="all 0.5s ease"
                    style={{
                      width: (!isSolSent) ? "0%" : (!isInReview && !isFinalDone) ? "33%" : (isInReview) ? "66%" : "100%"
                    }}
                  />

                  <Flex justify="space-between" align="flex-start" position="relative" zIndex={1} w="full">
                    {/* Paso 1: COTIZADO */}
                    <VStack spacing={1.5} align="center" minW="0" flex="1">
                      <Text fontSize="11px" fontWeight="900" color="#065f46" isTruncated>COTIZADO</Text>
                      <Flex w="38px" h="38px" borderRadius="full" bg="#059669" align="center" justify="center" color="white" boxShadow="0 2px 10px rgba(5,150,105,0.4)">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </Flex>
                      <Badge colorScheme="green" variant="solid" fontSize="10px" borderRadius="full" px={2}>
                        {stepCotizado.time}
                      </Badge>
                    </VStack>

                    {/* Tiempo 1 a 2 */}
                    <Flex align="center" justify="center" h="76px">
                      <Badge variant="solid" bg="white" color="#065f46" border="1.5px solid #a7f3d0" fontSize="10px" px={2.5} py={0.5} borderRadius="full" boxShadow="xs" fontWeight="800">
                        {dur1To2 !== "—" ? `⏱️ ${dur1To2}` : "—"}
                      </Badge>
                    </Flex>

                    {/* Paso 2: SOLICITUD */}
                    <VStack spacing={1.5} align="center" minW="0" flex="1">
                      <Text fontSize="11px" fontWeight="900" color={isSolSent ? "#065f46" : "#64748b"} isTruncated>SOLICITUD</Text>
                      <Flex
                        w="38px"
                        h="38px"
                        borderRadius="full"
                        bg={isSolSent ? "#059669" : "#e2e8f0"}
                        align="center"
                        justify="center"
                        color={isSolSent ? "white" : "#64748b"}
                        boxShadow={isSolSent ? "0 2px 10px rgba(5,150,105,0.4)" : "none"}
                        border={isSolSent ? "none" : "2px solid #cbd5e1"}
                      >
                        {isSolSent ? <Check className="w-4 h-4 stroke-[3]" /> : <Circle className="w-4 h-4" />}
                      </Flex>
                      <Badge colorScheme={isSolSent ? "green" : "gray"} variant={isSolSent ? "solid" : "subtle"} fontSize="10px" borderRadius="full" px={2}>
                        {stepSolicitud.time}
                      </Badge>
                    </VStack>

                    {/* Tiempo 2 a 3 */}
                    <Flex align="center" justify="center" h="76px">
                      <Badge variant="solid" bg="white" color={isObserved ? "#b45309" : isInReview ? "#1e40af" : "#065f46"} border={isObserved ? "1.5px solid #fcd34d" : isInReview ? "1.5px solid #93c5fd" : "1.5px solid #a7f3d0"} fontSize="10px" px={2.5} py={0.5} borderRadius="full" boxShadow="xs" fontWeight="800">
                        {dur2To3 !== "—" ? `⏱️ ${dur2To3}` : (isInReview ? "En Proceso" : isObserved ? "Observado" : "—")}
                      </Badge>
                    </Flex>

                    {/* Paso 3: REVISIÓN */}
                    <VStack spacing={1.5} align="center" minW="0" flex="1">
                      <Text fontSize="11px" fontWeight="900" color={isFinalDone ? (isFinalRejected ? "#991b1b" : isObserved ? "#b45309" : "#065f46") : (isInReview ? "#1e40af" : "#64748b")} isTruncated>
                        {isObserved ? "OBSERVADO" : "REVISIÓN"}
                      </Text>
                      <Flex
                        w="38px"
                        h="38px"
                        borderRadius="full"
                        bg={isFinalDone ? (isFinalRejected ? "#dc2626" : isObserved ? "#d97706" : "#059669") : (isInReview ? "#2563eb" : "#e2e8f0")}
                        align="center"
                        justify="center"
                        color="white"
                        boxShadow={isInReview ? "0 0 0 5px rgba(37,99,235,0.25)" : isObserved ? "0 2px 10px rgba(217,119,6,0.4)" : (isFinalDone ? (isFinalRejected ? "0 2px 10px rgba(220,38,38,0.4)" : "0 2px 10px rgba(5,150,105,0.4)") : "none")}
                        border={isFinalDone || isInReview ? "none" : "2px solid #cbd5e1"}
                      >
                        {isFinalDone ? (
                          isFinalRejected ? <XCircle className="w-4 h-4 stroke-[3]" /> : isObserved ? <MessageSquare className="w-4 h-4 stroke-[2.5]" /> : <Check className="w-4 h-4 stroke-[3]" />
                        ) : isInReview ? (
                          <Clock className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400" />
                        )}
                      </Flex>
                      <Badge colorScheme={isFinalDone ? (isFinalRejected ? "red" : isObserved ? "orange" : "green") : (isInReview ? "blue" : "gray")} variant={isFinalDone || isInReview ? "solid" : "subtle"} fontSize="10px" borderRadius="full" px={2}>
                        {stepRevision.time}
                      </Badge>
                    </VStack>

                    {/* Tiempo 3 a 4 */}
                    <Flex align="center" justify="center" h="76px">
                      <Badge variant="solid" bg="white" color={isFinalRejected ? "#991b1b" : isObserved ? "#b45309" : "#065f46"} border={isFinalRejected ? "1.5px solid #fca5a5" : isObserved ? "1.5px solid #fcd34d" : "1.5px solid #a7f3d0"} fontSize="10px" px={2.5} py={0.5} borderRadius="full" boxShadow="xs" fontWeight="800">
                        {dur3To4 !== "—" ? `⏱️ ${dur3To4}` : (isObserved ? "Devuelto" : isFinalDone ? "Finalizado" : "—")}
                      </Badge>
                    </Flex>

                    {/* Paso 4: FINAL */}
                    <VStack spacing={1.5} align="center" minW="0" flex="1">
                      <Text fontSize="11px" fontWeight="900" color={isFinalApproved ? "#065f46" : isObserved ? "#b45309" : isFinalRejected ? "#991b1b" : "#64748b"} isTruncated>
                        {isFinalApproved ? "APROBADO" : isObserved ? "OBSERVADO" : isFinalRejected ? "RECHAZADO" : "FINAL"}
                      </Text>
                      <Flex
                        w="38px"
                        h="38px"
                        borderRadius="full"
                        bg={isFinalApproved ? "#059669" : isObserved ? "#d97706" : isFinalRejected ? "#dc2626" : "#e2e8f0"}
                        align="center"
                        justify="center"
                        color="white"
                        boxShadow={isFinalApproved ? "0 2px 10px rgba(5,150,105,0.4)" : isObserved ? "0 2px 10px rgba(217,119,6,0.4)" : (isFinalRejected ? "0 2px 10px rgba(220,38,38,0.4)" : "none")}
                        border={isFinalDone ? "none" : "2px dashed #94a3b8"}
                      >
                        {isFinalApproved ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : isObserved ? (
                          <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                        ) : isFinalRejected ? (
                          <XCircle className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400" />
                        )}
                      </Flex>
                      <Badge colorScheme={isFinalApproved ? "green" : isObserved ? "orange" : isFinalRejected ? "red" : "gray"} variant={isFinalDone ? "solid" : "subtle"} fontSize="10px" borderRadius="full" px={2}>
                        {stepFinal.time}
                      </Badge>
                    </VStack>
                  </Flex>
                </Box>
              </Box>

              {/* DETALLE PANEL ALERTA DE ESTADO */}
              {status !== "RECHAZADO" && (
                <Grid templateColumns={{ base: "1fr", md: "1fr 220px" }} gap={4} p={4} bg={alertDetails.bg} border="1.5px solid" borderColor={alertDetails.border} borderRadius="xl" mt={3.5}>
                  <HStack spacing={3.5} align="flex-start">
                    <Box mt={0.5}>
                      <ChakraIcon as={alertDetails.icon} w={5} h={5} color={alertDetails.iconColor} />
                    </Box>
                    <VStack align="stretch" spacing={1}>
                      <Heading fontSize="xs" fontWeight="900" color={alertDetails.titleColor} textTransform="uppercase">
                        {alertDetails.title} <Badge ml={2} colorScheme={status === "RECHAZADO" ? "red" : "emerald"} variant="solid" fontSize="8px">{alertDetails.subtitle}</Badge>
                      </Heading>
                      <Text fontSize="xs" color="gray.700" fontWeight="600">
                        {alertDetails.desc}
                      </Text>
                      <Text fontSize="xs" color="gray.600" fontStyle="italic" bg="white" p={2} borderRadius="md" border="1px solid" borderColor="gray.200" mt={1}>
                        💡 {alertDetails.subdesc}
                      </Text>
                    </VStack>
                  </HStack>

                  <VStack align="stretch" spacing={2} fontSize="xs" borderLeft={{ md: "1px solid" }} borderColor="gray.200" pl={{ md: 4 }} justify="center">
                    <Box>
                      <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Evaluado Por</Text>
                      <Text fontWeight="900" color="gray.900">👑 {adminUsername || "Enrique"} (Admin Facturación)</Text>
                    </Box>
                    <Box>
                      <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Estado Comercial</Text>
                      <Badge
                        colorScheme={
                          status === "APROBADO"
                            ? "green"
                            : status === "APROBADO_COMERCIAL"
                            ? "amber"
                            : status === "PENDIENTE_FACTURACION"
                            ? "purple"
                            : status === "RECHAZADO"
                            ? "red"
                            : "blue"
                        }
                        fontSize="xs"
                        fontWeight="900"
                        variant="solid"
                        px={2}
                      >
                        {status}
                      </Badge>
                    </Box>
                    <Box>
                      <Text fontSize="9px" fontWeight="700" color="gray.500" textTransform="uppercase">Última Actualización</Text>
                      <Text fontWeight="700" color="gray.700" fontSize="10px">{new Date().toLocaleString()}</Text>
                    </Box>
                  </VStack>
                </Grid>
              )}
            </Box>

            {/* PARTE INFERIOR: ARTÍCULOS COTIZADOS (IZQ) E HISTORIAL DE ACTIVIDAD (DER) */}
            {(() => {
              const quoteProducts = quote?.products || quote?.items || quote?.totals?.products || quote?.totals?.normalizedProducts || [];
              const maxAdicDiscount = quoteProducts.reduce((max, it) => {
                const adic = Number(it.lineDiscount ?? it.LineDiscount ?? 0);
                return Math.max(max, adic);
              }, Number(quote?.totals?.maxDiscount || 0));
              const hasAdditionalDiscount = maxAdicDiscount > 0 || Boolean(quote?.totals?.hasDiscount);

              if (!hasAdditionalDiscount) return null;

              return (
                <Box
                  p={4}
                  bg="purple.50"
                  border="2px solid"
                  borderColor="purple.300"
                  borderRadius="2xl"
                  boxShadow="sm"
                  mb={2}
                >
                  <HStack spacing={3.5} align="flex-start">
                    <Box fontSize="24px" lineHeight="1">⚡</Box>
                    <VStack align="stretch" spacing={1}>
                      <HStack spacing={2} wrap="wrap">
                        <Text fontSize="13px" fontWeight="900" color="purple.900" textTransform="uppercase">
                          Cotización con Descuento Adicional Aplicado
                        </Text>
                        <Badge colorScheme="purple" variant="solid" fontSize="10px" px={2.5} py={0.5} borderRadius="full">
                          ⚠️ Requiere Aprobación Comercial
                        </Badge>
                      </HStack>
                      <Text fontSize="12px" color="purple.800" fontWeight="600">
                        El asesor de ventas aplicó descuentos especiales por encima de la tarifa de lista SAP. Revise los porcentajes individuales por artículo en la grilla inferior antes de emitir la aprobación en SAP.
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              );
            })()}

            <Grid templateColumns={{ base: "1fr", lg: "1.2fr 1fr" }} gap={5}>
              {/* Columna Izquierda: Artículos Cotizados */}
              <GridItem>
                <VStack align="stretch" spacing={4}>
                  <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm" overflow="hidden">
                    <Flex justify="space-between" align="center" mb={3} gap={2}>
                      <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.800" textTransform="uppercase">
                        Artículos Cotizados
                      </Text>
                      <Badge colorScheme="teal" variant="solid" borderRadius="full" fontSize="10px" px={2.5} flexShrink={0}>
                        {products.length} Items
                      </Badge>
                    </Flex>

                    {/* VISTA MÓVIL DE PRODUCTOS (TARJETAS) */}
                    <Box display={{ base: "block", md: "none" }}>
                      <VStack align="stretch" spacing={3}>
                        {displayProducts.map((item, idx) => {
                          const sapDisc = Number(item.sapDiscount ?? item.discount ?? 0);
                          const addDisc = Number(item.lineDiscount ?? 0);
                          const totalDisc = Number(item.discountPercent ?? sapDisc);
                          const reqAppr = addDisc > 0;

                          return (
                            <Box
                              key={idx}
                              p={3}
                              bg="gray.50"
                              borderRadius="xl"
                              border="1px solid"
                              borderColor="gray.200"
                            >
                              <Flex justify="space-between" align="start" gap={2} mb={1}>
                                <Badge colorScheme="blue" variant="solid" fontSize="10px" borderRadius="md" px={1.5} fontFamily="mono">
                                  {item.itemCode || item.code || item.id || "ART"}
                                </Badge>
                                <Text fontSize="xs" fontWeight="900" color="emerald.900" fontFamily="mono">
                                  ${item.lineTotal.toFixed(2)}
                                </Text>
                              </Flex>
                              <Text fontSize="12px" fontWeight="700" color="gray.900" mb={1.5}>
                                {item.description || item.ItemDescription || item.name || "Artículo"}
                              </Text>

                              <Grid templateColumns="repeat(3, 1fr)" gap={1.5} fontSize="10px" bg="white" p={2} borderRadius="lg" border="1px solid" borderColor="gray.200" mb={1.5}>
                                <Box textAlign="center">
                                  <Text color="gray.500" fontWeight="700">Desc. SAP</Text>
                                  <Badge colorScheme="green" fontSize="9px">{sapDisc}%</Badge>
                                </Box>
                                <Box textAlign="center" borderLeft="1px solid" borderRight="1px solid" borderColor="gray.200">
                                  <Text color="gray.500" fontWeight="700">Desc. Adic.</Text>
                                  <Badge colorScheme={addDisc > 0 ? "purple" : "gray"} fontSize="9px">
                                    {addDisc > 0 ? `+${addDisc}%` : "0%"}
                                  </Badge>
                                </Box>
                                <Box textAlign="center">
                                  <Text color="gray.500" fontWeight="700">Desc. Total</Text>
                                  <Badge colorScheme="blue" fontSize="9px" fontWeight="900">{totalDisc}%</Badge>
                                </Box>
                              </Grid>

                              <Flex justify="space-between" align="center" fontSize="11px" color="gray.600" pt={1.5} borderTop="1px dashed" borderColor="gray.200">
                                <Text>Cant: <Text as="span" fontWeight="800" color="gray.900">{item.quantity} uds</Text></Text>
                                <Text>P. Lista: <Text as="span" fontWeight="800" color="gray.900">${item.price.toFixed(2)}</Text></Text>
                                <Badge colorScheme={reqAppr ? "orange" : "green"} fontSize="9px" px={1.5}>
                                  {reqAppr ? "⚠️ Req. Aprobación" : "🟢 Estándar"}
                                </Badge>
                              </Flex>
                            </Box>
                          );
                        })}
                      </VStack>
                    </Box>

                    {/* VISTA ESCRITORIO DE PRODUCTOS (TABLA CLÁSICA CON DESCUENTOS AUDITABLES) */}
                    <Box display={{ base: "none", md: "block" }}>
                      <TableContainer border="1px solid" borderColor="gray.200" borderRadius="lg" overflowX="auto">
                        <Table variant="simple" size="sm">
                          <Thead bg="gray.50">
                            <Tr>
                              <Th fontSize="10px" color="gray.600" px={2.5}>Código</Th>
                              <Th fontSize="10px" color="gray.600" px={2.5}>Descripción</Th>
                              <Th fontSize="10px" textAlign="right" color="gray.600" px={2}>Cant.</Th>
                              <Th fontSize="10px" textAlign="right" color="gray.600" px={2}>P. Lista</Th>
                              <Th fontSize="10px" textAlign="center" color="gray.600" px={2}>Desc. SAP</Th>
                              <Th fontSize="10px" textAlign="center" color="gray.600" px={2}>Desc. Adic.</Th>
                              <Th fontSize="10px" textAlign="center" color="gray.600" px={2}>Desc. Total</Th>
                              <Th fontSize="10px" textAlign="center" color="gray.600" px={2}>¿Aprobación?</Th>
                              <Th fontSize="10px" textAlign="right" color="gray.600" px={2.5}>Total (USD)</Th>
                            </Tr>
                          </Thead>
                          <Tbody fontSize="xs">
                            {displayProducts.map((item, idx) => {
                              const sapDisc = Number(item.sapDiscount ?? item.discount ?? 0);
                              const addDisc = Number(item.lineDiscount ?? 0);
                              const totalDisc = Number(item.discountPercent ?? sapDisc);
                              const reqAppr = addDisc > 0;

                              return (
                                <Tr key={idx} _hover={{ bg: "gray.50" }}>
                                  <Td fontWeight="800" color="gray.700" fontFamily="mono" px={2.5}>{item.itemCode || item.code || item.id || "ART"}</Td>
                                  <Td fontWeight="600" color="gray.900" px={2.5} minW="130px" whiteSpace="normal">{item.description || item.ItemDescription || item.name || "Artículo"}</Td>
                                  <Td textAlign="right" fontWeight="800" px={2}>{item.quantity}</Td>
                                  <Td textAlign="right" fontWeight="600" px={2}>${item.price.toFixed(2)}</Td>
                                  <Td textAlign="center" px={2}>
                                    <Badge colorScheme="green" fontSize="10px" px={1.5}>{sapDisc}%</Badge>
                                  </Td>
                                  <Td textAlign="center" px={2}>
                                    <Badge colorScheme={addDisc > 0 ? "purple" : "gray"} fontSize="10px" px={1.5}>
                                      {addDisc > 0 ? `+${addDisc}%` : "0%"}
                                    </Badge>
                                  </Td>
                                  <Td textAlign="center" fontWeight="900" px={2}>
                                    <Badge colorScheme="blue" fontSize="10px" px={1.5} fontWeight="900">
                                      {totalDisc}%
                                    </Badge>
                                  </Td>
                                  <Td textAlign="center" px={2}>
                                    <Badge
                                      colorScheme={reqAppr ? "orange" : "green"}
                                      fontSize="10px"
                                      px={2}
                                      py={0.5}
                                      borderRadius="full"
                                      fontWeight="800"
                                    >
                                      {reqAppr ? "⚠️ Requiere" : "🟢 No"}
                                    </Badge>
                                  </Td>
                                  <Td textAlign="right" fontWeight="850" color="emerald.900" fontFamily="mono" px={2.5}>${item.lineTotal.toFixed(2)}</Td>
                                </Tr>
                              );
                            })}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    </Box>

                    {/* Totales integrados al pie de artículos */}
                    <Box bg="#0f2e22" color="white" p={4} borderRadius="xl" mt={4} boxShadow="sm">
                      <VStack align="stretch" spacing={2} fontSize="xs">
                        <Flex justify="space-between" color="emerald.100">
                          <Text>Subtotal Neto:</Text>
                          <Text fontFamily="mono" fontWeight="700">${subtotalUSD.toFixed(2)}</Text>
                        </Flex>
                        <Flex justify="space-between" color="emerald.100">
                          <Text>I.G.V. (18%):</Text>
                          <Text fontFamily="mono" fontWeight="700">${igvUSD.toFixed(2)}</Text>
                        </Flex>
                        <Divider borderColor="whiteAlpha.300" my={1} />
                        <Flex justify="space-between" align="center">
                          <Text fontWeight="900" fontSize="xs">TOTAL COTIZACIÓN (USD):</Text>
                          <Text fontFamily="mono" fontWeight="950" fontSize="md" color="#6ee7b7">${grandTotalUSD.toFixed(2)}</Text>
                        </Flex>
                      </VStack>
                    </Box>
                  </Box>
                </VStack>
              </GridItem>

              {/* Columna Derecha: Historial de Actividad */}
              <GridItem>
                <Box bg="white" p={4} borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm" h="full">
                  <Flex justify="space-between" align="center" mb={4}>
                    <HStack spacing={2}>
                      <History className="w-4 h-4 text-emerald-800" />
                      <Text fontSize="xs" fontWeight="800" color="gray.800" textTransform="uppercase">
                        Historial de Actividad
                      </Text>
                    </HStack>
                    <Badge colorScheme="gray" fontSize="xs" px={2} borderRadius="full">{historyLog.length} Registros</Badge>
                  </Flex>

                  <VStack align="stretch" spacing={4} position="relative" pl={2}>
                    <Box position="absolute" top="10px" bottom="20px" left="17px" w="2px" bg="gray.100" />

                    {historyLog.map((log, idx) => {
                      let dotColor = "orange.500";
                      let bgCircle = "orange.50";
                      let tagText = log.status || "EVENTO";
                      let tagScheme = "orange";
                      
                      if (log.status === "APROBADO") {
                        dotColor = "emerald.600";
                        bgCircle = "emerald.50";
                        tagScheme = "green";
                      } else if (log.status === "RECHAZADO") {
                        dotColor = "red.500";
                        bgCircle = "red.50";
                        tagScheme = "red";
                      } else if (log.status === "VISTO") {
                        dotColor = "purple.500";
                        bgCircle = "purple.50";
                        tagScheme = "purple";
                      } else if (log.status === "ENVIADO") {
                        dotColor = "blue.500";
                        bgCircle = "blue.50";
                        tagScheme = "blue";
                      } else if (log.status === "GENERADO") {
                        dotColor = "gray.500";
                        bgCircle = "gray.100";
                        tagScheme = "gray";
                      }

                      return (
                        <Flex key={idx} align="flex-start" gap={3.5} zIndex={1} position="relative">
                          <Flex
                            w="20px"
                            h="20px"
                            borderRadius="full"
                            bg={bgCircle}
                            border="2px solid"
                            borderColor={dotColor}
                            align="center"
                            justify="center"
                            flexShrink={0}
                            mt={0.5}
                          >
                            <Box w="6px" h="6px" borderRadius="full" bg={dotColor} />
                          </Flex>

                          <Box flex="1" minW={0} bg="gray.50" p={3} borderRadius="lg" border="1px solid" borderColor="gray.150">
                            <Flex align="center" justify="space-between" mb={1} wrap="wrap" gap={1}>
                              <Badge colorScheme={tagScheme} fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                                {tagText}
                              </Badge>
                              <Text fontSize={{ base: "10px", md: "9px" }} color="gray.500" fontWeight="600">
                                ⏰ {new Date(log.timestamp).toLocaleString()}
                              </Text>
                            </Flex>
                            <Text fontWeight="800" color="gray.800" fontSize={{ base: "13px", md: "xs" }} mt={0.5} overflowWrap="anywhere">
                              {log.note || "Cambio de estado comercial"}
                            </Text>
                            <Text fontSize={{ base: "11px", md: "10px" }} color="gray.600" mt={1.5} fontWeight="600" overflowWrap="anywhere">
                              👤 Registrado por: {log.user || "Usuario Sistema"}
                            </Text>
                          </Box>
                        </Flex>
                      );
                    })}
                  </VStack>
                </Box>
              </GridItem>
            </Grid>
          </DrawerBody>
          <DrawerFooter bg="gray.50" borderTop="1px solid" borderColor="gray.200" py={3} px={{ base: 4, md: 6 }}>
            <HStack justify="space-between" w="100%">
              <Button
                colorScheme="teal"
                variant="outline"
                size="sm"
                leftIcon={<Download className="w-4 h-4 text-teal-600" />}
                onClick={() => setPdfQuote(effectiveQuote)}
                fontWeight="800"
              >
                Descargar Documento PDF
              </Button>
              <Button size="sm" onClick={onClose} fontWeight="700">
                Cerrar
              </Button>
            </HStack>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <QuotePdfModal
        isOpen={!!pdfQuote}
        onClose={() => setPdfQuote(null)}
        quote={pdfQuote}
      />

      {/* Modal Obligatorio de Motivo de Rechazo */}
      <RejectReasonModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        quoteId={quote.docNumber || quote.id}
        onConfirmReject={handleConfirmReject}
      />

      {/* Modal de Devolución con Observación */}
      <ObserveReasonModal
        isOpen={isObserveModalOpen}
        onClose={() => setIsObserveModalOpen(false)}
        quote={effectiveQuote}
        onConfirmObserve={(targetQuote, reason) => {
          if (onUpdateStatus) {
            onUpdateStatus(effectiveQuote, "OBSERVADO", reason);
          }
          toast({
            title: "💬 Cotización Devuelta con Observación",
            description: `Se notificó al vendedor para que corrija: ${reason}`,
            status: "warning",
            duration: 5000,
            isClosable: true,
            position: "top-right"
          });
          onClose();
        }}
      />

      {/* Modal de Subsanación y Reenvío (RN-03: nota obligatoria mín 10 chars) */}
      <Modal
        isOpen={isResubmitModalOpen}
        onClose={() => setIsResubmitModalOpen(false)}
        isCentered
        size={{ base: "full", md: "md" }}
        scrollBehavior="inside"
      >
        <ModalOverlay backdropFilter="blur(4px)" bg="blackAlpha.600" />
        <ModalContent
          borderRadius={{ base: "none", md: "2xl" }}
          overflow="hidden"
          mx={{ base: 0, md: 3 }}
          maxW={{ base: "100vw", md: "28rem" }}
        >
          <ModalHeader
            bg="orange.500"
            color="white"
            fontSize={{ base: "md", md: "sm" }}
            fontWeight="900"
            py={3}
            px={{ base: 4, md: 6 }}
          >
            <HStack spacing={2}>
              <RotateCcw className="w-4 h-4" />
              <Text>Subsanar y Reenviar Cotización</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="white" mt={1} w={{ base: "44px", md: "32px" }} h={{ base: "44px", md: "32px" }} />

          <ModalBody py={5} px={{ base: 4, md: 5 }}>
            <VStack spacing={4} align="stretch">
              <Alert status="warning" borderRadius="lg" fontSize={{ base: "13px", md: "xs" }}>
                <AlertIcon />
                Explica detalladamente qué corregiste para subsanar el rechazo.
                El administrador recibirá una notificación con tu nota.
              </Alert>

              {/* Recordatorio del motivo de rechazo original */}
              <Box bg="red.50" border="1px solid" borderColor="red.200" p={3} borderRadius="lg">
                <Text fontSize={{ base: "11px", md: "10px" }} fontWeight="800" color="red.700" textTransform="uppercase" mb={1}>
                  Motivo de Rechazo Original:
                </Text>
                <Text fontSize={{ base: "13px", md: "xs" }} color="red.800" fontStyle="italic" fontWeight="600" overflowWrap="anywhere">
                  "{quote.rejectionReason || "No especificado"}"
                </Text>
              </Box>

              <FormControl isRequired>
                <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.700">
                  ¿Qué corregiste? (obligatorio)
                </FormLabel>
                <Textarea
                  value={resubmitNote}
                  onChange={(e) => setResubmitNote(e.target.value)}
                  placeholder="Ej: Se adjuntó el nuevo voucher BCP N° 1234567 por el monto correcto de S/180.00. Se actualizó la cantidad del producto X de 2 a 3 unidades..."
                  minH={{ base: "140px", md: "110px" }}
                  fontSize={{ base: "md", md: "xs" }}
                  borderColor={resubmitNote.trim().length > 0 && resubmitNote.trim().length < 10 ? "red.400" : "gray.300"}
                  focusBorderColor="orange.400"
                  resize="vertical"
                />
                <FormHelperText
                  fontSize={{ base: "12px", md: "10px" }}
                  color={resubmitNote.trim().length < 10 ? "red.600" : "green.700"}
                  fontWeight="700"
                >
                  {resubmitNote.trim().length < 10
                    ? `Mínimo 10 caracteres. (${resubmitNote.trim().length}/10)`
                    : `✓ Nota válida (${resubmitNote.trim().length} caracteres)`
                  }
                </FormHelperText>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter
            borderTop="1px solid"
            borderColor="gray.100"
            gap={3}
            px={{ base: 4, md: 6 }}
            flexDirection={{ base: "column-reverse", sm: "row" }}
          >
            <Button
              variant="ghost"
              size={{ base: "md", md: "sm" }}
              w={{ base: "full", sm: "auto" }}
              onClick={() => setIsResubmitModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              colorScheme="orange"
              size={{ base: "md", md: "sm" }}
              w={{ base: "full", sm: "auto" }}
              fontWeight="800"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleResubmit}
              isDisabled={resubmitNote.trim().length < 10}
            >
              ✅ Confirmar Reenvío
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default QuoteDetailDrawer;
