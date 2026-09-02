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
  AlertIcon,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Code,
  Spinner,
  Progress,
  Tooltip,
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
  MessageSquare,
  Zap,
  Sparkles,
  Copy,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useQuoteStore } from "../stores/quoteStore";
import { RejectReasonModal } from "./RejectReasonModal";
import { ObserveReasonModal } from "./ObserveReasonModal";
import QuotePdfModal from "./QuotePdfModal";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";
import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import { useGetQuoteById } from "../hooks/queries/quotesQueries";
import { useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../../shared/lib/axiosInstance";
import {
  formatDeliveryForm,
  formatTransportName,
  formatDeliveryPoint,
  formatPaymentTerms,
  formatBankAccount,
  formatSunatOp,
  cleanSellerName,
  cleanClientName
} from "../../../shared/utils/quoteLogisticsFormatters";

export function QuoteDetailDrawer({ isOpen, onClose, quote, onUpdateStatus, onDeleteQuote }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { username: authUsername, role: authRole, salesEmployeeCode: authSalesCode } = useAuthStore();
  const isAdminUser = authRole === "ADMIN" || authRole === "FACTURACION" || authRole === "SUPERVISOR" || authUsername?.toLowerCase() === "enrique";
  const activeRole = isAdminUser ? "ADMIN" : "SELLER";
  const adminUsername = isAdminUser ? (authUsername || "Enrique") : "Enrique";

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isObserveModalOpen, setIsObserveModalOpen] = useState(false);
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [resubmitNote, setResubmitNote] = useState("");
  const [pdfQuote, setPdfQuote] = useState(null);
  const [liveStockMap, setLiveStockMap] = useState({});
  const [isSyncingSap, setIsSyncingSap] = useState(false);
  const [sapSyncResult, setSapSyncResult] = useState(null);
  const [isSapSuccessModalOpen, setIsSapSuccessModalOpen] = useState(false);
  const [hasCopiedDocNum, setHasCopiedDocNum] = useState(false);
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

  // Refrescar consulta de cotización cuando el drawer se abre
  React.useEffect(() => {
    if (isOpen && quoteId) {
      queryClient.invalidateQueries({ queryKey: ["quoteById", quoteId] });
    }
  }, [isOpen, quoteId, queryClient]);

  // Unificación inteligente de la cotización (Prioriza siempre el estado más actualizado)
  const effectiveQuote = React.useMemo(() => {
    if (!quote) return null;
    let full = { ...quote };

    const quoteIdentifier = String(quote.docNumber || quote.id || "");
    let freshestStatus = full.approvalStatus || full.status || full.state || "GENERADO";
    let freshestHistory = Array.isArray(full.historyLog) && full.historyLog.length > 0 ? full.historyLog : null;
    let freshestTotals = full.totals || null;
    // Solo leer sapDocNum legítimo del objeto original si es directo o si viene del sync
    let freshestSapDocNum = (quote?.isSapDirect ? (quote.sapDocNum || quote.DocNum || quote.totals?.sapDocNum) : null) || sapSyncResult?.docNum || null;

    // 1. Buscar en la caché de React Query (['quotes'])
    try {
      const cachedQuotes = queryClient.getQueryData(["quotes"]);
      if (Array.isArray(cachedQuotes)) {
        const foundInCache = cachedQuotes.find(q => String(q.id || q.docNumber) === quoteIdentifier);
        if (foundInCache) {
          full = { ...foundInCache, ...full };
          if (foundInCache.approvalStatus || foundInCache.status) {
            freshestStatus = foundInCache.approvalStatus || foundInCache.status;
          }
          if (Array.isArray(foundInCache.historyLog) && foundInCache.historyLog.length > (freshestHistory?.length || 0)) {
            freshestHistory = foundInCache.historyLog;
          }
          if (foundInCache.totals) freshestTotals = { ...foundInCache.totals, ...(freshestTotals || {}) };
          if (foundInCache.isSapDirect && foundInCache.sapDocNum) freshestSapDocNum = foundInCache.sapDocNum;
        }
      }
    } catch {}

    // 2. Buscar en localStorage
    try {
      const localQuotes = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
      const foundInLocal = localQuotes.find(q => String(q.id || q.docNumber) === quoteIdentifier);
      if (foundInLocal) {
        full = { ...foundInLocal, ...full };
        if (foundInLocal.approvalStatus || foundInLocal.status) {
          freshestStatus = foundInLocal.approvalStatus || foundInLocal.status;
        }
        if (Array.isArray(foundInLocal.historyLog) && foundInLocal.historyLog.length > (freshestHistory?.length || 0)) {
          freshestHistory = foundInLocal.historyLog;
        }
        if (foundInLocal.totals) freshestTotals = { ...foundInLocal.totals, ...(freshestTotals || {}) };
        if (foundInLocal.isSapDirect && foundInLocal.sapDocNum) freshestSapDocNum = foundInLocal.sapDocNum;
      }
    } catch {}

    // 3. Enriquecer con serverQuote SOLO para productos o datos faltantes, SIN degradar el estado
    if (serverQuote) {
      const serverStatus = serverQuote.approvalStatus || serverQuote.status;
      // Solo actualizar estado si el servidor tiene un avance real posterior (ej. SAP emitido)
      if (serverStatus && ["APROBADO", "APROBADO_COMERCIAL", "EMITIDO_SAP", "COMPLETADO", "FACTURADO"].includes(serverStatus)) {
        freshestStatus = serverStatus;
      }
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
      if (serverQuote.sellerName && (!full.sellerName || full.sellerName === "—")) {
        full.sellerName = serverQuote.sellerName;
      }
      if (serverQuote.opNum && !full.opNum) {
        full.opNum = serverQuote.opNum;
      }
      if (serverQuote.deliveryForm && !full.deliveryForm) {
        full.deliveryForm = serverQuote.deliveryForm;
        full.selectedDeliveryForm = full.selectedDeliveryForm || serverQuote.deliveryForm;
      }
      if (serverQuote.selectedDeliveryForm && !full.selectedDeliveryForm) {
        full.selectedDeliveryForm = serverQuote.selectedDeliveryForm;
        full.deliveryForm = full.deliveryForm || serverQuote.selectedDeliveryForm;
      }
      if (serverQuote.transport && !full.transport) {
        full.transport = serverQuote.transport;
        full.selectedTransport = full.selectedTransport || serverQuote.transport;
      }
      if (serverQuote.selectedTransport && !full.selectedTransport) {
        full.selectedTransport = serverQuote.selectedTransport;
        full.transport = full.transport || serverQuote.selectedTransport;
      }
      if (serverQuote.deliveryPoint && !full.deliveryPoint) {
        full.deliveryPoint = serverQuote.deliveryPoint;
        full.selectedPoint = full.selectedPoint || serverQuote.deliveryPoint;
      }
      if (serverQuote.selectedPoint && !full.selectedPoint) {
        full.selectedPoint = serverQuote.selectedPoint;
        full.deliveryPoint = full.deliveryPoint || serverQuote.selectedPoint;
      }
      if (serverQuote.paymentType && !full.paymentType) {
        full.paymentType = serverQuote.paymentType;
        full.selectedPaymentType = full.selectedPaymentType || serverQuote.paymentType;
      }
      if (serverQuote.selectedPaymentType && !full.selectedPaymentType) {
        full.selectedPaymentType = serverQuote.selectedPaymentType;
        full.paymentType = full.paymentType || serverQuote.selectedPaymentType;
      }
      if (serverQuote.saleCondition && !full.saleCondition) full.saleCondition = serverQuote.saleCondition;
      if (serverQuote.documentType && !full.documentType) full.documentType = serverQuote.documentType;
      if (serverQuote.creditTerm && !full.creditTerm) full.creditTerm = serverQuote.creditTerm;
      if (serverQuote.isLetra !== undefined && full.isLetra === undefined) full.isLetra = serverQuote.isLetra;
      if (serverQuote.comment && !full.comment) full.comment = serverQuote.comment;
      if (serverQuote.deliveryDate && !full.deliveryDate) full.deliveryDate = serverQuote.deliveryDate;
      if (serverQuote.sapDocNum) {
        freshestSapDocNum = serverQuote.sapDocNum;
      }
      if (Array.isArray(serverQuote.historyLog) && serverQuote.historyLog.length > (freshestHistory?.length || 0)) {
        freshestHistory = serverQuote.historyLog;
      }
    }

    // 4. Si se acaba de sincronizar con SAP en esta sesión
    if (sapSyncResult?.docNum) {
      freshestSapDocNum = sapSyncResult.docNum;
      freshestStatus = "APROBADO";
    }

    // 5. Aplicar campos consolidados
    full.status = freshestStatus;
    full.approvalStatus = freshestStatus;
    full.state = freshestStatus;
    if (freshestHistory) full.historyLog = freshestHistory;
    if (freshestTotals) full.totals = freshestTotals;
    if (freshestSapDocNum) {
      full.sapDocNum = freshestSapDocNum;
      full.DocNum = freshestSapDocNum;
      full.isSapDirect = true;
      if (!full.totals) full.totals = {};
      full.totals.sapDocNum = freshestSapDocNum;
      full.totals.DocNum = freshestSapDocNum;
      full.totals.isSapDirect = true;
    }

    full.products = extractItems(full);
    return full;
  }, [quote, serverQuote, quoteId, queryClient, sapSyncResult]);

  // Consulta de Stock en tiempo real directamente a SAP al abrir la cotización
  React.useEffect(() => {
    if (!isOpen || !effectiveQuote) return;

    const rawItems = effectiveQuote.products || effectiveQuote.items || [];
    const codes = rawItems
      .map((p) => p.itemCode || p.code || p.productCode || p.id)
      .filter(Boolean);

    if (codes.length === 0) return;

    let isMounted = true;
    const fetchLiveStock = async () => {
      try {
        const url = `/reportModule/priceListByItemCodes?itemCodes=${encodeURIComponent(codes.join(","))}`;
        const res = await axiosInstance.get(url);
        const sapRecords = Array.isArray(res.data) ? res.data : (res.data?.records || []);

        if (Array.isArray(sapRecords) && isMounted) {
          const map = {};
          sapRecords.forEach((r) => {
            const codeKey = String(r.ITEM_CODE || r.itemCode || "").trim().toUpperCase();
            const rawStk = r.STOCK_DISPONIBLE ?? r.Stock ?? r.OnHand;
            if (codeKey && rawStk !== undefined && rawStk !== null) {
              map[codeKey] = {
                stock: Number(rawStk),
                isAgotado: Number(rawStk) === 0,
              };
            }
          });
          setLiveStockMap(map);
        }
      } catch (err) {
        console.warn("⚠️ Error obteniendo stock en vivo para detalle de cotización:", err);
      }
    };

    fetchLiveStock();

    return () => { isMounted = false; };
  }, [isOpen, effectiveQuote]);

  if (!effectiveQuote) return null;

  const client = effectiveQuote.client || {};
  const clientName = cleanClientName(effectiveQuote);
  const clientRuc = effectiveQuote.clientRuc || effectiveQuote.clientDocument || client.LicTradNum || client.FederalTaxID || client.clientRuc || client.CardCode || "—";
  const clientAddress = effectiveQuote.clientAddress || client.Address || client.address || "—";
  const sellerName = cleanSellerName(effectiveQuote.sellerName || effectiveQuote.SlpName || effectiveQuote.createdByUsername);
  const products = effectiveQuote.products || effectiveQuote.items || [];
  const status = effectiveQuote.approvalStatus || effectiveQuote.state || effectiveQuote.status || "GENERADO";
  const isApprovedQuote = ["APROBADO", "APROBADO_COMERCIAL", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO"].includes(String(status).toUpperCase());

  const getItemStockInfo = (item) => {
    const codeKey = String(item.itemCode || item.code || item.productCode || item.id || "").trim().toUpperCase();
    const liveInfo = liveStockMap[codeKey];
    if (liveInfo) {
      return {
        stock: liveInfo.stock,
        isOutOfStock: liveInfo.isAgotado
      };
    }
    const rawStk = item.stock ?? item.Stock ?? item.OnHand ?? item.STOCK_DISPONIBLE ?? item.raw?.STOCK_DISPONIBLE;
    const isOutOfStock = Boolean(item.isAgotado || (rawStk !== undefined && rawStk !== null && Number(rawStk) === 0));
    return {
      stock: rawStk !== undefined && rawStk !== null ? Number(rawStk) : null,
      isOutOfStock
    };
  };
  
  // Mapear historial
  const historyLog = effectiveQuote.historyLog || [
    { status: "GENERADO", timestamp: effectiveQuote.createdAt || new Date().toISOString(), user: sellerName, note: "Cotización creada en aplicativo" }
  ];

  // Calcular Totales unificados con calculadora global
  const tcVal = Number(effectiveQuote.totals?.tc || effectiveQuote.totals?.exchangeRate || effectiveQuote.exchangeRate) || 3.76;
  const calcRes = calculateQuoteTotals(products, tcVal);
  const displayProducts = calcRes.normalizedProducts && calcRes.normalizedProducts.length > 0 ? calcRes.normalizedProducts : products;
  const fallbackUSD = effectiveQuote.DocTotalSys
    ? Number(effectiveQuote.DocTotalSys)
    : (effectiveQuote.DocTotalFc
        ? Number(effectiveQuote.DocTotalFc)
        : (effectiveQuote.DocTotal && effectiveQuote.DocRate
            ? Number((effectiveQuote.DocTotal / effectiveQuote.DocRate).toFixed(2))
            : Number(effectiveQuote.DocTotal || 0)));

  const grandTotalUSD = calcRes.grandTotalUSD || Number(effectiveQuote.totals?.grandTotalUSD || 0) || fallbackUSD;
  const subtotalUSD = calcRes.subtotalUSD || Number(effectiveQuote.totals?.subTotalUSD || 0) || Number((grandTotalUSD / 1.18).toFixed(2));
  const igvUSD = calcRes.igvUSD || Number(effectiveQuote.totals?.igvUSD || 0) || Number((grandTotalUSD - subtotalUSD).toFixed(2));
  const grandTotalSOL = calcRes.grandTotalSOL || Number(effectiveQuote.totals?.grandTotalPEN || (effectiveQuote.DocTotal && (effectiveQuote.DocCurrency === "USD" || !effectiveQuote.DocCurrency) ? effectiveQuote.DocTotal : (grandTotalUSD * tcVal).toFixed(2)));

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

  const syncedDocNum = effectiveQuote.sapDocNum
    || effectiveQuote.totals?.sapDocNum
    || sapSyncResult?.docNum
    || (effectiveQuote.isSapDirect ? (effectiveQuote.DocNum || effectiveQuote.docNumber) : null)
    || (effectiveQuote.DocNum && !String(effectiveQuote.DocNum).startsWith("COT-") ? effectiveQuote.DocNum : null)
    || (effectiveQuote.docNumber && !String(effectiveQuote.docNumber).startsWith("COT-") && !isNaN(Number(effectiveQuote.docNumber)) ? effectiveQuote.docNumber : null);

  const isAlreadySyncedToSap = Boolean(
    syncedDocNum ||
    effectiveQuote.isSapDirect ||
    effectiveQuote.totals?.isSapDirect ||
    effectiveQuote.sapDocNum ||
    effectiveQuote.totals?.sapDocNum ||
    sapSyncResult?.docNum
  );

  const isDirectSap = Boolean(
    effectiveQuote.isSapDirect ||
    effectiveQuote.totals?.isSapDirect ||
    isAlreadySyncedToSap
  );

  const createdIso = effectiveQuote.createdAt || historyLog[0]?.timestamp || (effectiveQuote.docDate ? `${effectiveQuote.docDate}T00:00:00.000Z` : null);
  const solicitudIso = findLogIso(["ENVIADO", "EN_PROCESO", "PENDIENTE_FACTURACION", "APROBADO", "APROBADO_COMERCIAL", "RECHAZADO", "OBSERVADO", "EN_EDICION", "EMITIDO_SAP", "COMPLETADO", "PEDIDO_EMITIDO"]) || (isDirectSap ? createdIso : null);
  const revisionIso = findLogIso(["EN_PROCESO", "PENDIENTE_FACTURACION", "APROBADO", "APROBADO_COMERCIAL", "RECHAZADO", "OBSERVADO", "EN_EDICION", "VISTO", "EMITIDO_SAP", "COMPLETADO", "PEDIDO_EMITIDO"]) || (isDirectSap ? createdIso : null);
  const finalIso = findLogIso(["APROBADO", "APROBADO_COMERCIAL", "RECHAZADO", "OBSERVADO", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO", "EMITIDO_SAP"]) || (isDirectSap ? createdIso : null);
  const observedIso = effectiveQuote.observedAt || findLogIso(["OBSERVADO", "EN_EDICION"]);

  // Estados de etapas del Stepper con colores vibrantes
  const isSolSent = ["ENVIADO", "EN_PROCESO", "PENDIENTE_FACTURACION", "APROBADO", "APROBADO_COMERCIAL", "RECHAZADO", "OBSERVADO", "EN_EDICION", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO"].includes(status) || isApprovedQuote || isDirectSap;
  const isObserved = status === "OBSERVADO" || status === "EN_EDICION";
  const isFinalApproved = ["APROBADO", "APROBADO_COMERCIAL", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO"].includes(status);
  const isFinalRejected = ["RECHAZADO", "ANULADO", "CANCELADO"].includes(status);
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
  const totalCiclo = calculateDurationStr(createdIso, finalIso || observedIso || (isFinalDone ? (effectiveQuote.updatedAt || effectiveQuote.createdAt) : null));

  // Definición del banner de alerta de estado
  const getStatusAlert = () => {
    switch (status) {
      case "COMPLETADO":
      case "PEDIDO_EMITIDO":
      case "FACTURADO":
        return {
          bg: "emerald.50",
          border: "emerald.200",
          color: "emerald.800",
          titleColor: "emerald.900",
          iconColor: "emerald.600",
          icon: CheckCircle2,
          title: "Pedido Emitido Oficial en SAP ✓",
          subtitle: "ETAPA FINAL: PEDIDO EMITIDO EN SAP B1",
          desc: `Orden de venta procesada y registrada en SAP Business One con DocNum: #${effectiveQuote.sapDocNum || effectiveQuote.DocNum || "—"}.`,
          subdesc: "Documento oficial generado exitosamente en el sistema central.",
          timeInStage: "Emitido en SAP"
        };
      case "APROBADO_COMERCIAL":
        return {
          bg: "emerald.50",
          border: "emerald.200",
          color: "emerald.800",
          titleColor: "emerald.900",
          iconColor: "emerald.600",
          icon: CheckCircle2,
          title: "Cotización Aprobada Comercialmente",
          subtitle: "FASE 2: APROBADO POR ADMINISTRACIÓN",
          desc: "La cotización fue aprobada comercialmente y está lista para proceder al pago o facturación.",
          subdesc: "Esperando comprobante de pago o confirmación de crédito.",
          timeInStage: "Aprobado Comercial"
        };
      case "PENDIENTE_FACTURACION":
        return {
          bg: "purple.50",
          border: "purple.200",
          color: "purple.800",
          titleColor: "purple.900",
          iconColor: "purple.600",
          icon: Clock,
          title: "Pendiente de Facturación",
          subtitle: "FASE 3: PENDIENTE DE EMISIÓN EN SAP",
          desc: "Váucher adjuntado y validado. Listo para generar el pedido oficial en SAP Business One.",
          subdesc: "Acción requerida: Emitir pedido en SAP.",
          timeInStage: "Pnd. Facturación"
        };
      case "CANCELADO":
      case "ANULADO":
        return {
          bg: "red.50",
          border: "red.200",
          color: "red.800",
          titleColor: "red.900",
          iconColor: "red.600",
          icon: XCircle,
          title: status === "CANCELADO" ? "Cotización Cancelada en SAP" : "Cotización Anulada",
          subtitle: "ETAPA FINAL: DOCUMENTO CANCELADO",
          desc: status === "CANCELADO" ? "Esta oferta fue cancelada directamente en SAP Business One." : "Esta cotización fue anulada en el aplicativo.",
          subdesc: "No se realizarán más acciones sobre este documento.",
          timeInStage: "Cancelado"
        };
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
      : `Pedido Aprobado y Concluido por ${adminUsername || "Facturación"}`;

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
      title: isCommercial ? `📢 Cotización Aprobada por Administrador` : `✅ Pedido Aprobado (Aplicativo)`,
      description: isCommercial 
        ? `Cotización ${quote.docNumber || quote.id} aprobada y validada por el administrador. Lista para atención.`
        : `El pedido ${quote.docNumber || quote.id} fue aprobado y concluido exitosamente en el aplicativo. Listo para sincronizar con SAP.`,
      status: nextStatus,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      read: false
    };
    localStorage.setItem("grupoLeon_notifications", JSON.stringify([newNotif, ...notifs]));
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    toast({
      title: isCommercial ? "✅ Cotización Aprobada" : "✅ Pedido Aprobado",
      description: isCommercial 
        ? `Se validó y aprobó la cotización del vendedor ${sellerUsername || ""}.`
        : `Cotización aprobada y concluida con éxito. Lista para enviar a SAP cuando desees.`,
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

  // Sincronización directa con SAP Business One (Habilitada para pruebas y pase a SAP)
  const IS_SAP_DIRECT_SYNC_ENABLED = true;

  // Función para Sincronizar / Enviar Cotización Directamente a SAP
  const handleSyncToSap = async () => {
    if (!IS_SAP_DIRECT_SYNC_ENABLED) {
      toast({
        title: "🔒 Sincronización SAP en Pausa",
        description: "Por motivos de seguridad, la carga automática a SAP está desactivada temporalmente. Por favor utilice 'Descargar Excel' para la importación o registro.",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "top-right"
      });
      return;
    }
    if (!effectiveQuote) return;

    // ─── Validación: la logística debe estar completa antes de enviar a SAP ───
    const delivFormCheck = effectiveQuote.deliveryForm || effectiveQuote.selectedDeliveryForm;
    if (!delivFormCheck) {
      toast({
        title: "⚠️ Logística incompleta",
        description: "Esta cotización no tiene Forma de Entrega registrada. Debe abrirla en el formulario (botón 'Abrir y Completar'), completar la sección de Logística y volver a enviarla a validación antes de sincronizar a SAP.",
        status: "warning",
        duration: 8000,
        isClosable: true,
        position: "top-right"
      });
      return;
    }

    try {
      setIsSyncingSap(true);


      const rawSlp = effectiveQuote.SlpCode
        ?? effectiveQuote.slpCode
        ?? effectiveQuote.salesPersonCode
        ?? effectiveQuote.salesEmployeeCode
        ?? effectiveQuote.totals?.SlpCode
        ?? effectiveQuote.totals?.salesEmployeeCode
        ?? (!isAdminUser ? (authSalesCode ?? localStorage.getItem("salesEmployeeCode")) : undefined);

      const resolvedSlp = (rawSlp && !isNaN(Number(rawSlp))) ? Number(rawSlp) : undefined;

      const originalSeller = effectiveQuote.sellerName || effectiveQuote.createdByUsername;
      const originalCreatedBy = effectiveQuote.createdByUsername || effectiveQuote.sellerName;

      const sanitizedProducts = (displayProducts || []).map((p) => {
        const itemCode = p.productCode || p.itemCode || p.ItemCode || p.code || (typeof p.id === "string" && isNaN(Number(p.id)) ? p.id : undefined);
        return {
          ...p,
          productCode: itemCode,
          itemCode: itemCode,
          ItemCode: itemCode,
          code: itemCode,
          productName: p.productName || p.description || p.name || p.ItemDescription,
          description: p.productName || p.description || p.name || p.ItemDescription,
        };
      });

      const quotePayload = {
        ...effectiveQuote,
        clientDocument: effectiveQuote.clientDocument || effectiveQuote.clientRuc || effectiveQuote.client?.CardCode,
        clientName: effectiveQuote.clientName || effectiveQuote.client?.CardName,
        sellerName: originalSeller || "Vendedor Autorizado",
        createdByUsername: originalCreatedBy || "vendedor",
        SlpCode: resolvedSlp,
        slpCode: resolvedSlp,
        salesPersonCode: resolvedSlp,
        salesEmployeeCode: resolvedSlp,
        deliveryForm: effectiveQuote.deliveryForm || effectiveQuote.selectedDeliveryForm,
        deliveryPoint: effectiveQuote.deliveryPoint || effectiveQuote.selectedPoint,
        transport: effectiveQuote.transport || effectiveQuote.selectedTransport || effectiveQuote.U_TQC_TRANSPOR,
        deliveryDate: effectiveQuote.deliveryDate || effectiveQuote.docDueDate,
        paymentType: effectiveQuote.paymentType || effectiveQuote.selectedPaymentType,
        paymentMethod: effectiveQuote.paymentMethod || effectiveQuote.PaymentMethod || "DEPOSITO_BANCARIO",
        bankAccount: effectiveQuote.bankAccount || effectiveQuote.U_VS_BANCO || "BCP_SOLES",
        sunatOpType: effectiveQuote.sunatOpType || effectiveQuote.U_VS_TIPO_FACT || "0101",
        U_VS_TIPOPER: effectiveQuote.U_VS_TIPOPER || "01",
        U_VS_TIPO_FACT: effectiveQuote.sunatOpType || effectiveQuote.U_VS_TIPO_FACT || "0101",
        U_VS_AFEDET: effectiveQuote.U_VS_AFEDET || "N",
        U_VS_BANCO: effectiveQuote.bankAccount || effectiveQuote.U_VS_BANCO || "BCP_SOLES",
        saleCondition: effectiveQuote.saleCondition,
        documentType: effectiveQuote.documentType,
        creditTerm: effectiveQuote.creditTerm,
        isLetra: effectiveQuote.isLetra,
        opNum: effectiveQuote.opNum,
        products: sanitizedProducts,
        comment: effectiveQuote.observations || effectiveQuote.comment || `Cotización Web ${effectiveQuote.docNumber}`,
      };

      const res = await axiosInstance.post("/quoteModule/quotes/sap/order", quotePayload);
      const sapData = res.data?.data || res.data || {};
      const sentPayload = res.data?.sentPayload || sapData._sentPayload || quotePayload;
      const sapDocNum = sapData.DocNum || sapData.docNum;
      const sapDocEntry = sapData.DocEntry || sapData.docEntry;

      // Imprimir la trama JSON técnica y la respuesta oficial de SAP de forma limpia y estilizada en la consola
      console.groupCollapsed(
        `%c⚡ [SAP SERVICE LAYER] Orden de Venta #${sapDocNum || "EMITIDA"} Registrada Oficialmente`,
        "background: #059669; color: white; font-weight: bold; font-size: 13px; padding: 4px 10px; border-radius: 4px;"
      );
      console.log("%c📤 TRAMA ENVIADA (Payload Web -> Service Layer):", "color: #0284c7; font-weight: bold;", sentPayload);
      console.log("%c📥 RESPUESTA OFICIAL RECIBIDA DE SAP SERVICE LAYER:", "color: #10b981; font-weight: bold;", sapData);
      // En SAP Service Layer:
      // DocTotal se almacena y devuelve en Moneda Local (Soles PEN, ej: 7.33).
      // Si la cotización u orden es en USD, el total en dólares está en DocTotalFc / DocTotalSys (USD 2.18),
      // o se calcula de forma exacta como DocTotal / DocRate (7.33 / 3.356 = 2.18).
      const docRate = Number(sapData.DocRate || effectiveQuote?.totals?.tc || 3.356);
      const isUsdDoc = (sapData.DocCurrency === "USD" || !sapData.DocCurrency);
      const rawDocTotal = Number(sapData.DocTotal || 0);
      const rawDocTotalFc = Number(sapData.DocTotalFc || sapData.DocTotalSys || 0);

      const calculatedUSD = rawDocTotalFc > 0
        ? rawDocTotalFc
        : (isUsdDoc && docRate > 0 && rawDocTotal > 0
            ? Number((rawDocTotal / docRate).toFixed(2))
            : Number(effectiveQuote?.totals?.grandTotalUSD || rawDocTotal));

      const calculatedSOL = (isUsdDoc && rawDocTotal > 0)
        ? rawDocTotal
        : Number((calculatedUSD * docRate).toFixed(2));

      console.log("%c📊 RESUMEN CONTABLE SAP:", "font-weight: bold;", {
        sapDocNum,
        sapDocEntry,
        cardCode: sapData.CardCode || quotePayload.clientDocument,
        cardName: sapData.CardName || quotePayload.clientName,
        salesPersonCode: sapData.SalesPersonCode,
        docTotalUSD: calculatedUSD,
        docTotalSOL: calculatedSOL,
        docRate,
        database: "ZZTET_02022025"
      });
      console.groupEnd();

      // Guardar detalle para el modal de éxito visual
      setSapSyncResult({
        docNum: sapDocNum,
        docEntry: sapDocEntry,
        cardCode: sapData.CardCode || quotePayload.clientDocument,
        cardName: sapData.CardName || quotePayload.clientName,
        salesPersonCode: sapData.SalesPersonCode,
        docTotal: calculatedUSD,
        docTotalUSD: calculatedUSD,
        docTotalSOL: calculatedSOL,
        docCurrency: sapData.DocCurrency || "USD",
        docRate: docRate,
      });
      setIsSapSuccessModalOpen(true);

      // Actualizar localStorage y caché local con los identificadores oficiales de SAP
      if (sapDocNum) {
        try {
          const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
          const updatedSaved = saved.map((q) => {
            if (String(q.id || q.docNumber) === String(quotePayload.id || quotePayload.docNumber)) {
              return {
                ...q,
                sapDocNum,
                DocNum: sapDocNum,
                sapDocEntry,
                isSapDirect: true,
                status: "APROBADO",
                approvalStatus: "APROBADO",
                totals: {
                  ...(q.totals || {}),
                  sapDocNum,
                  DocNum: sapDocNum,
                  sapDocEntry,
                  isSapDirect: true,
                },
              };
            }
            return q;
          });
          localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updatedSaved));
        } catch (e) {}
      }

      // Notificar al componente padre para que actualice la lista de cotizaciones inmediatamente
      if (onUpdateStatus) {
        onUpdateStatus(
          {
            ...effectiveQuote,
            sapDocNum,
            DocNum: sapDocNum,
            sapDocEntry,
            isSapDirect: true,
            status: "APROBADO",
            approvalStatus: "APROBADO",
            totals: {
              ...(effectiveQuote.totals || {}),
              sapDocNum,
              DocNum: sapDocNum,
              sapDocEntry,
              isSapDirect: true,
            },
          },
          "APROBADO",
          `Orden de Venta Oficial #${sapDocNum} registrada en SAP B1`
        );
      }

      // Invalidar consultas del servidor
      queryClient.invalidateQueries(["quotes"]);

      toast({
        title: "⚡ Orden de Venta Sincronizada con Éxito en SAP B1",
        description: `Se registró como Orden de Venta Oficial en SAP (DocNum: #${sapDocNum}, DocEntry: ${sapDocEntry}) en BD ZZTET_02022025.`,
        status: "success",
        duration: 7000,
        isClosable: true,
        position: "top-right",
      });
    } catch (err) {
      console.error("Error sincronizando con SAP:", err);
      const sapErrMsg = err.response?.data?.error?.message?.value 
        || err.response?.data?.error?.message 
        || err.response?.data?.message 
        || (typeof err.response?.data === "string" ? err.response?.data : null)
        || err.message 
        || "No se pudo registrar la cotización en SAP.";

      toast({
        title: "Error al sincronizar con SAP",
        description: typeof sapErrMsg === "string" ? sapErrMsg : JSON.stringify(sapErrMsg),
        status: "error",
        duration: 8000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsSyncingSap(false);
    }
  };

  // Función para Descargar Cotización completa en formato Excel (.xlsx)
  const handleExportExcel = () => {
    if (!effectiveQuote) return;
    try {
      // 1. Datos Generales de la Cotización
      const quoteNum = effectiveQuote.docNumber || effectiveQuote.DocNum || effectiveQuote.id || "COT-000000";
      
      const formatDisplayDate = (d) => {
        if (!d || d === "—") return "—";
        try {
          const parsed = new Date(d);
          if (!isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString("es-PE", { year: "numeric", month: "2-digit", day: "2-digit" });
          }
        } catch (e) {}
        return String(d).split("T")[0];
      };

      const formatSapDate = (d) => {
        if (!d || d === "—") return new Date().toISOString().split("T")[0];
        try {
          const parsed = new Date(d);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split("T")[0];
          }
        } catch (e) {}
        return String(d).split("T")[0];
      };

      const rawFecha = effectiveQuote.createdAt || effectiveQuote.DocDate || effectiveQuote.date || new Date();
      const fecha = formatDisplayDate(rawFecha);
      const sapFecha = formatSapDate(rawFecha);

      const clienteNombre = effectiveQuote.clientName || effectiveQuote.client?.CardName || effectiveQuote.CardName || "Cliente Varios";
      const clienteRuc = effectiveQuote.clientRuc || effectiveQuote.client?.CardCode || effectiveQuote.CardCode || effectiveQuote.client?.FederalTaxId || "—";
      const clienteDireccion = effectiveQuote.clientAddress || effectiveQuote.client?.Address || effectiveQuote.client?.address || "—";
      const vendedor = effectiveQuote.sellerName || effectiveQuote.user || effectiveQuote.seller || authUsername || "—";
      const estado = effectiveQuote.approvalStatus || effectiveQuote.status || "BORRADOR";
      const moneda = effectiveQuote.currency || effectiveQuote.DocCurrency || "USD";
      const tc = tcVal || 3.76;

      const formaPago = formatPaymentTerms(effectiveQuote.paymentType || effectiveQuote.PaymentGroupCode || effectiveQuote.selectedPaymentType) || "Contado";
      const condicionVenta = effectiveQuote.saleCondition || effectiveQuote.U_VS_CONDICION || "CONTADO";
      const tipoComprobante = effectiveQuote.documentType || effectiveQuote.U_VS_COMPROBANTE || "FACTURA";
      const aplicaLetra = (effectiveQuote.isLetra === "S" || effectiveQuote.isLetra === true || effectiveQuote.U_VS_LETRA === "S") ? "SÍ" : "NO";
      const plazoCredito = effectiveQuote.creditTerm || effectiveQuote.U_VS_PLAZO || "—";
      const medioPago = effectiveQuote.paymentMethod || effectiveQuote.U_VS_MEDIOPAGO || "DEPOSITO_BANCARIO";
      const banco = formatBankAccount(effectiveQuote.bankAccount || effectiveQuote.U_VS_BANCO) || "—";
      const numOperacion = effectiveQuote.opNum || effectiveQuote.U_VS_OPNUM || "—";
      const tipoOpSunat = formatSunatOp(effectiveQuote.sunatOpType || effectiveQuote.U_VS_TIPO_FACT) || "Venta Interna (0101)";
      const transporte = formatTransportName(effectiveQuote.transport || effectiveQuote.selectedTransport || effectiveQuote.TransportationCode) || "—";
      const formaEntrega = formatDeliveryForm(effectiveQuote.deliveryForm || effectiveQuote.selectedDeliveryForm) || "—";
      const puntoLlegada = formatDeliveryPoint(effectiveQuote.point || effectiveQuote.selectedPoint) || "—";
      const rawFechaEntrega = effectiveQuote.deliveryDate || effectiveQuote.DocDueDate || "—";
      const fechaEntrega = formatDisplayDate(rawFechaEntrega);
      const sapFechaEntrega = formatSapDate(rawFechaEntrega !== "—" ? rawFechaEntrega : rawFecha);
      const observaciones = effectiveQuote.comment || effectiveQuote.observations || effectiveQuote.Comments || "Sin observaciones";

      // 2. Extraer productos / items unificados
      const items = (displayProducts && displayProducts.length > 0)
        ? displayProducts
        : ((effectiveQuote.products && effectiveQuote.products.length > 0)
          ? effectiveQuote.products
          : extractItems(effectiveQuote));

      // 3. Estructurar filas de Excel (Hoja 1: Cotización Comercial)
      const excelRows = [
        ["GRUPO LEON - REPORTE DE COTIZACIÓN COMERCIAL"],
        [`Generado el: ${new Date().toLocaleString("es-PE")}`],
        [],
        ["", "--- INFORMACIÓN DE LA COTIZACIÓN ---", "", "--- DATOS DEL CLIENTE ---", ""],
        ["", "N° Cotización:", quoteNum, "Cliente / Razón Social:", clienteNombre],
        ["", "Fecha Emisión:", fecha, "RUC / DNI / Código SAP:", clienteRuc],
        ["", "Estado:", estado, "Dirección Fiscal:", clienteDireccion],
        ["", "Vendedor / Asesor:", vendedor, "Condición de Venta:", condicionVenta],
        ["", "Moneda Principal:", moneda, "Forma de Pago:", formaPago],
        ["", "Tipo de Cambio Ref.:", `S/. ${tc.toFixed(3)}`, "Tipo de Comprobante:", tipoComprobante],
        ["", "Aplica Letra:", aplicaLetra, "Plazo de Crédito:", plazoCredito],
        ["", "Medio de Pago:", medioPago, "Banco / N° Cuenta:", banco],
        ["", "N° Operación / Voucher:", numOperacion, "Tipo Operación SUNAT:", tipoOpSunat],
        ["", "Transporte:", transporte, "Forma de Entrega:", formaEntrega],
        ["", "Punto de Llegada:", puntoLlegada, "Fecha Estimada Entrega:", fechaEntrega],
        ["", "Observaciones:", observaciones, "", ""],
        [],
        ["--- DETALLE DE PRODUCTOS / SERVICIOS ---"],
        [
          "Item",
          "Código SAP",
          "Descripción del Producto",
          "Marca / Línea",
          "U.M.",
          "Cantidad",
          "Precio Lista (USD)",
          "Desc. %",
          "Precio Unit. (USD)",
          "Subtotal (USD)",
          "Total Línea (USD)",
          "Total Línea (PEN / S/.)"
        ]
      ];

      let sumSubtotal = 0;
      let sumTotal = 0;

      items.forEach((p, idx) => {
        const itemCode = p.ItemCode || p.codigo || p.code || p.itemCode || p.productCode || p.id || "—";
        const itemDesc = p.ItemDescription || p.ItemName || p.descripcion || p.name || p.productName || "Producto";
        const itemBrand = p.brand || p.U_VS_MARCA || p.marca || "—";
        const unitMsr = p.SalesUnit || p.SalUnitMsr || p.unit || p.medida || "UND";
        const quantity = Number(p.quantity || p.Quantity || p.cant || 1);
        const listPrice = Number(p.basePrice || p.listPrice || p.UnitPrice || p.price || 0);
        const discountPercent = Number(p.discount || p.DiscountPercent || p.desc || 0);
        const unitPrice = Number(p.unitPrice || p.price || p.UnitPrice || (listPrice * (1 - discountPercent / 100)) || 0);
        const lineSubtotal = Number(p.subtotal || (quantity * unitPrice) || 0);
        const lineTotal = Number(p.total || lineSubtotal || 0);
        const lineTotalPEN = lineTotal * tc;

        sumSubtotal += lineSubtotal;
        sumTotal += lineTotal;

        excelRows.push([
          idx + 1,
          itemCode,
          itemDesc,
          itemBrand,
          unitMsr,
          quantity,
          Number(listPrice.toFixed(2)),
          `${discountPercent.toFixed(1)}%`,
          Number(unitPrice.toFixed(2)),
          Number(lineSubtotal.toFixed(2)),
          Number(lineTotal.toFixed(2)),
          Number(lineTotalPEN.toFixed(2))
        ]);
      });

      // Totales
      const finalSubtotalUSD = subtotalUSD || sumSubtotal;
      const finalIgvUSD = igvUSD || (grandTotalUSD - finalSubtotalUSD);
      const finalTotalUSD = grandTotalUSD || sumTotal;
      const finalTotalPEN = grandTotalSOL || (finalTotalUSD * tc);

      excelRows.push([]);
      excelRows.push(["", "", "", "", "", "", "", "", "", "SUBTOTAL (USD):", `$ ${finalSubtotalUSD.toFixed(2)}`, `S/. ${(finalSubtotalUSD * tc).toFixed(2)}`]);
      excelRows.push(["", "", "", "", "", "", "", "", "", "I.G.V. 18% (USD):", `$ ${finalIgvUSD.toFixed(2)}`, `S/. ${(finalIgvUSD * tc).toFixed(2)}`]);
      excelRows.push(["", "", "", "", "", "", "", "", "", "TOTAL GENERAL:", `$ ${finalTotalUSD.toFixed(2)}`, `S/. ${finalTotalPEN.toFixed(2)}`]);

      // 4. Crear Hoja 1: Cotización Comercial Visual
      const ws = XLSX.utils.aoa_to_sheet(excelRows);

      // Anchos de columna automáticos y legibles
      ws["!cols"] = [
        { wch: 8 },  // Item
        { wch: 22 }, // Código SAP / Label
        { wch: 45 }, // Descripción / Valor
        { wch: 26 }, // Marca / Label 2
        { wch: 35 }, // U.M. / Valor 2
        { wch: 12 }, // Cantidad
        { wch: 16 }, // Precio Lista
        { wch: 10 }, // Desc %
        { wch: 16 }, // Precio Unit
        { wch: 16 }, // Subtotal
        { wch: 18 }, // Total USD
        { wch: 20 }, // Total PEN
      ];

      // 5. Crear Hoja 2: Plantilla Plana para Importación en SAP (Data Transfer / Carga Masiva)
      const sapImportRows = [
        [
          "DocNum",
          "CardCode",
          "CardName",
          "DocDate",
          "DocDueDate",
          "DocCur",
          "ItemCode",
          "Dscription",
          "Quantity",
          "Price",
          "DiscountPercent",
          "Currency",
          "TaxCode",
          "SlpCode",
          "Comments",
          "U_VS_CONDICION",
          "U_VS_COMPROBANTE",
          "U_VS_MEDIOPAGO",
          "U_VS_BANCO",
          "U_VS_OPNUM",
          "U_VS_TIPO_FACT",
          "TransportationCode"
        ]
      ];

      const rawSlpCode = effectiveQuote.SlpCode || effectiveQuote.slpCode || effectiveQuote.salesPersonCode || 1;
      const rawTrnspCode = effectiveQuote.transport || effectiveQuote.selectedTransport || effectiveQuote.TransportationCode || 7;

      items.forEach((p) => {
        const itemCode = p.ItemCode || p.codigo || p.code || p.itemCode || p.productCode || p.id || "";
        const itemDesc = p.ItemDescription || p.ItemName || p.descripcion || p.name || p.productName || "";
        const quantity = Number(p.quantity || p.Quantity || p.cant || 1);
        const listPrice = Number(p.basePrice || p.listPrice || p.UnitPrice || p.price || 0);
        const discountPercent = Number(p.discount || p.DiscountPercent || p.desc || 0);
        const unitPrice = Number(p.unitPrice || p.price || p.UnitPrice || (listPrice * (1 - discountPercent / 100)) || 0);

        sapImportRows.push([
          quoteNum,
          clienteRuc,
          clienteNombre,
          sapFecha,
          sapFechaEntrega,
          moneda,
          itemCode,
          itemDesc,
          quantity,
          Number(unitPrice.toFixed(2)),
          discountPercent,
          moneda,
          "IGV",
          rawSlpCode,
          observaciones,
          condicionVenta,
          tipoComprobante,
          medioPago,
          effectiveQuote.bankAccount || effectiveQuote.U_VS_BANCO || "",
          numOperacion !== "—" ? numOperacion : "",
          effectiveQuote.sunatOpType || effectiveQuote.U_VS_TIPO_FACT || "0101",
          rawTrnspCode
        ]);
      });

      const wsSap = XLSX.utils.aoa_to_sheet(sapImportRows);
      wsSap["!cols"] = [
        { wch: 14 }, // DocNum
        { wch: 16 }, // CardCode
        { wch: 35 }, // CardName
        { wch: 12 }, // DocDate
        { wch: 12 }, // DocDueDate
        { wch: 8 },  // DocCur
        { wch: 18 }, // ItemCode
        { wch: 40 }, // Dscription
        { wch: 10 }, // Quantity
        { wch: 12 }, // Price
        { wch: 14 }, // DiscountPercent
        { wch: 10 }, // Currency
        { wch: 10 }, // TaxCode
        { wch: 10 }, // SlpCode
        { wch: 30 }, // Comments
        { wch: 16 }, // U_VS_CONDICION
        { wch: 16 }, // U_VS_COMPROBANTE
        { wch: 18 }, // U_VS_MEDIOPAGO
        { wch: 16 }, // U_VS_BANCO
        { wch: 16 }, // U_VS_OPNUM
        { wch: 16 }, // U_VS_TIPO_FACT
        { wch: 18 }  // TransportationCode
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cotización");
      XLSX.utils.book_append_sheet(wb, wsSap, "Plantilla_Import_SAP");

      const cleanFileName = `Cotizacion_${String(quoteNum).replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`;
      XLSX.writeFile(wb, cleanFileName);

      toast({
        title: "Excel Generado Exitosamente",
        description: `Se descargó la cotización ${quoteNum} con el detalle comercial y la plantilla de importación SAP.`,
        status: "success",
        duration: 4500,
        isClosable: true,
        position: "top-right"
      });
    } catch (err) {
      console.error("Error al exportar Excel:", err);
      toast({
        title: "Error al generar Excel",
        description: "Ocurrió un inconveniente al crear el archivo Excel.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top-right"
      });
    }
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
                  <HStack spacing={2} align="center" wrap="wrap">
                    <Heading size="sm" color="white" fontWeight="800" isTruncated>
                      {effectiveQuote.docNumber || effectiveQuote.id || "COT-017071"}
                    </Heading>
                    {syncedDocNum && (
                      <Badge bg="emerald.900" color="emerald.100" border="1px solid" borderColor="emerald.300" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="900">
                        🏛️ SAP DocNum: #{syncedDocNum}
                      </Badge>
                    )}
                  </HStack>
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
            {(status === "OBSERVADO" || status === "EN_EDICION") ? (
              /* ── Panel de Observación (Vendedor + Administrador + Observado) ── */
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
                          Evaluada por {effectiveQuote.observedBy || adminUsername || "Enrique"} • Requiere corrección y reenvío
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
                      const quoteToLoad = effectiveQuote || quote;
                      if (typeof useQuoteStore.getState().loadQuote === "function") {
                        useQuoteStore.getState().loadQuote(quoteToLoad);
                      } else if (typeof useQuoteStore.getState().setQuoteData === "function") {
                        useQuoteStore.getState().setQuoteData(quoteToLoad);
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
            ) : activeRole === "SELLER" ? (
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
              (() => {
                const sapDoc = isAlreadySyncedToSap ? (syncedDocNum || true) : null;
                return (
                  <Box bg={sapDoc ? "teal.50" : "emerald.50"} p={4} borderRadius="xl" border="2px solid" borderColor={sapDoc ? "teal.500" : "emerald.500"} boxShadow="sm" mb={5}>
                    <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
                      <HStack spacing={3}>
                        <Flex w="36px" h="36px" borderRadius="full" bg={sapDoc ? "teal.500" : "emerald.500"} align="center" justify="center" color="white" flexShrink={0}>
                          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        </Flex>
                        <Box>
                          <Text fontSize="xs" fontWeight="900" color={sapDoc ? "teal.900" : "emerald.900"} textTransform="uppercase">
                            {sapDoc ? `🔒 4. Oferta / Pedido SAP Registrado (DocNum: #${syncedDocNum || ""})` : "✅ 4. Pedido Aprobado (Interno)"}
                          </Text>
                          <Text fontSize="11px" color={sapDoc ? "teal.800" : "emerald.800"} fontWeight="600">
                            {sapDoc
                              ? `Registrado y sincronizado oficialmente en SAP Service Layer.`
                              : `Aprobado internamente por ${adminUsername || "Enrique"}. Si fue un error o prueba, puedes anularlo o devolverlo a borrador.`}
                          </Text>
                        </Box>
                      </HStack>
                      <HStack spacing={2} wrap="wrap">
                        {!sapDoc && isAdminUser && (
                          <>
                            <Button
                              size="sm"
                              colorScheme="emerald"
                              bg="#126C36"
                              color="white"
                              _hover={{ bg: "#0e572b" }}
                              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                              onClick={() => {
                                const docId = quote.id || quote.docNumber;
                                onUpdateStatus && onUpdateStatus(docId, "ENVIADO", `Reabierta para completar y corregir en formulario por ${adminUsername}`);
                                const quoteToLoad = { ...(effectiveQuote || quote), approvalStatus: "ENVIADO", status: "ENVIADO", state: "ENVIADO" };
                                if (typeof useQuoteStore.getState().loadQuote === "function") {
                                  useQuoteStore.getState().loadQuote(quoteToLoad);
                                } else if (typeof useQuoteStore.getState().setQuoteData === "function") {
                                  useQuoteStore.getState().setQuoteData(quoteToLoad);
                                }
                                toast({
                                  title: "✏️ Reabierta en Formulario",
                                  description: `La cotización ${docId} se abrió para completar y corregir datos.`,
                                  status: "info",
                                  duration: 4000,
                                  isClosable: true
                                });
                                onClose();
                                navigate("/newquotes");
                              }}
                              fontWeight="800"
                              borderRadius="lg"
                              boxShadow="xs"
                            >
                              ✏️ Abrir y Completar en Formulario
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="orange"
                              variant="outline"
                              borderColor="orange.300"
                              bg="white"
                              color="orange.800"
                              _hover={{ bg: "orange.50" }}
                              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                              onClick={() => {
                                const docId = quote.id || quote.docNumber;
                                onUpdateStatus && onUpdateStatus(docId, "ENVIADO", `Devuelta a cola de validación por ${adminUsername}`);
                                toast({
                                  title: "🔄 Devuelta a Validación",
                                  description: `La cotización ${docId} volvió a la pestaña de pendientes de validación comercial.`,
                                  status: "info",
                                  duration: 4000,
                                  isClosable: true
                                });
                                onClose();
                              }}
                              fontWeight="800"
                              borderRadius="lg"
                            >
                              Devolver a Validación
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="red"
                              variant="outline"
                              borderColor="red.300"
                              bg="white"
                              color="red.700"
                              _hover={{ bg: "red.50" }}
                              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                              onClick={() => {
                                const docId = quote.id || quote.docNumber;
                                // Si no tiene sapDocNum, es safe hacer hard delete (nunca llegó a SAP)
                                if (onDeleteQuote) {
                                  onDeleteQuote(docId, "APROBADO");
                                } else {
                                  onUpdateStatus && onUpdateStatus(docId, "ANULADO", `Anulada por ${adminUsername}`);
                                }
                                toast({
                                  title: "🗑️ Cotización Eliminada de BD",
                                  description: `La cotización ${quote.docNumber || docId} fue eliminada permanentemente (no estaba en SAP).`,
                                  status: "error",
                                  duration: 4000,
                                  isClosable: true
                                });
                                onClose();
                              }}
                              fontWeight="800"
                              borderRadius="lg"
                            >
                              Eliminar de BD
                            </Button>
                          </>
                        )}
                        <Badge colorScheme={sapDoc ? "teal" : "green"} variant="solid" px={3} py={1} borderRadius="full" fontSize="xs">
                          {sapDoc ? "EMITIDO EN SAP" : "PEDIDO APROBADO"}
                        </Badge>
                      </HStack>
                    </Flex>
                  </Box>
                );
              })()
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
                      const quoteToLoad = effectiveQuote || quote;
                      if (typeof useQuoteStore.getState().loadQuote === "function") {
                        useQuoteStore.getState().loadQuote(quoteToLoad);
                      } else if (typeof useQuoteStore.getState().setQuoteData === "function") {
                        useQuoteStore.getState().setQuoteData(quoteToLoad);
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
                  <Box>
                    <Button
                      size="sm"
                      colorScheme="teal"
                      bg="#0f766e"
                      _hover={{ bg: "#115e59" }}
                      leftIcon={<Edit3 className="w-4 h-4" />}
                      onClick={() => {
                        onClose();
                        const quoteToLoad = effectiveQuote || quote;
                        if (typeof useQuoteStore.getState().loadQuote === "function") {
                          useQuoteStore.getState().loadQuote(quoteToLoad);
                        } else if (typeof useQuoteStore.getState().setQuoteData === "function") {
                          useQuoteStore.getState().setQuoteData(quoteToLoad);
                        }
                        navigate("/newquotes");
                      }}
                      fontWeight="900"
                      borderRadius="lg"
                      px={4}
                      h="38px"
                      boxShadow="xs"
                    >
                      ✏️ Revisar Formulario
                    </Button>
                  </Box>
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
                      <Text fontWeight="900" color="gray.900">👑 {(() => {
                        const lastLog = Array.isArray(historyLog) && historyLog.length > 0 ? historyLog[historyLog.length - 1] : null;
                        return lastLog?.user || effectiveQuote.approvedBy || adminUsername || "Enrique";
                      })()} (Admin Facturación)</Text>
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
                      <Text fontWeight="700" color="gray.700" fontSize="10px">
                        {(() => {
                          const lastLog = Array.isArray(historyLog) && historyLog.length > 0 ? historyLog[historyLog.length - 1] : null;
                          const rawIso = lastLog?.timestamp || effectiveQuote.updatedAt || effectiveQuote.createdAt || (effectiveQuote.docDate ? `${effectiveQuote.docDate}T00:00:00.000Z` : null);
                          if (!rawIso) return "—";
                          try {
                            const d = new Date(rawIso);
                            if (isNaN(d.getTime())) return "—";
                            return d.toLocaleString("es-PE", {
                              day: "numeric",
                              month: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: true,
                            });
                          } catch {
                            return "—";
                          }
                        })()}
                      </Text>
                    </Box>
                  </VStack>
                </Grid>
              )}
            </Box>

            {/* CUADRILLA DE CONDICIONES COMERCIALES, FINANZAS, VÁUCHER Y DESPACHO */}
            {(() => {
              const currentQuote = effectiveQuote || quote || {};
              
              // 1. Condición comercial / pago
              const paymentObj = currentQuote.paymentType || currentQuote.selectedPaymentType || currentQuote.totals?.paymentType || currentQuote.PaymentGroupCode || currentQuote.GroupNum || {};
              let paymentLabel = formatPaymentTerms(paymentObj, currentQuote.saleCondition || currentQuote.U_VS_CONDICION || currentQuote.totals?.saleCondition);
              if (!paymentLabel || paymentLabel === "[object Object]" || paymentLabel === "undefined" || paymentLabel === "null") {
                paymentLabel = currentQuote.saleCondition === "CREDITO" || String(currentQuote.saleCondition).toLowerCase().includes("credit")
                  ? "Línea de Crédito Comercial"
                  : "Contado / Entrega";
              }
              const isCredit = paymentLabel.toLowerCase().includes("credit") || 
                               paymentLabel.toLowerCase().includes("crédito") || 
                               paymentLabel.toLowerCase().includes("dias") || 
                               paymentLabel.toLowerCase().includes("días") || 
                               paymentLabel.toLowerCase().includes("letra") || 
                               currentQuote.saleCondition === "CREDITO";

              // 2. Comprobante & SUNAT
              const docTypeVal = currentQuote.documentType || currentQuote.U_VS_COMPROBANTE || (String(currentQuote.clientDocument || currentQuote.clientRuc || "").length === 11 ? "FACTURA" : "BOLETA");
              const sunatType = formatSunatOp(currentQuote.sunatOpType || currentQuote.U_VS_TIPO_FACT || currentQuote.U_VS_TIPOPER);

              // 3. Banco y Operación
              const rawBank = currentQuote.bankAccount || currentQuote.U_VS_BANCO || (typeof paymentObj === "object" ? paymentObj.bankAccount : null);
              const bank = isCredit ? "Línea de Crédito Comercial" : formatBankAccount(rawBank);
              const opNumber = currentQuote.opNum || currentQuote.U_VS_OPNUM || currentQuote.voucherNumber || null;
              const voucherImage = currentQuote.pathImg || currentQuote.paymentImg || currentQuote.voucherUrl;

              // 4. Logística y Despacho
              const rawDelivForm = currentQuote.selectedDeliveryForm || currentQuote.deliveryForm;
              const delivForm = formatDeliveryForm(rawDelivForm);
              const rawTransport = currentQuote.selectedTransport || currentQuote.transport || currentQuote.U_TQC_TRANSPOR;
              const transportName = formatTransportName(rawTransport, rawDelivForm);
              const rawPoint = currentQuote.selectedPoint || currentQuote.deliveryPoint;
              const delivAddress = formatDeliveryPoint(rawPoint, currentQuote.clientAddress || (currentQuote.client?.Address || currentQuote.client?.address));

              const quoteAttachments = currentQuote.attachments || [];

              return (
                <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={3.5} mb={3.5}>
                  {/* CUADRILLA 1: FINANZAS Y CONDICIONES */}
                  <Box p={3.5} bg="white" borderRadius="2xl" border="1.5px solid" borderColor="#e2e8f0" boxShadow="xs">
                    <Flex align="center" justify="space-between" mb={2}>
                      <HStack spacing={2}>
                        <Text fontSize="15px">💳</Text>
                        <Text fontSize="11px" fontWeight="900" color="gray.800" textTransform="uppercase">
                          Condición Financiera
                        </Text>
                      </HStack>
                      <Badge colorScheme={isCredit ? "purple" : "green"} variant="solid" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="900">
                        {isCredit ? "CRÉDITO" : "CONTADO"}
                      </Badge>
                    </Flex>
                    <VStack align="stretch" spacing={1.5} fontSize="xs">
                      <Flex justify="space-between">
                        <Text color="gray.500" fontWeight="700">Término:</Text>
                        <Text fontWeight="800" color="gray.800" textAlign="right" isTruncated maxW="190px" title={paymentLabel}>{paymentLabel}</Text>
                      </Flex>
                      <Flex justify="space-between" align="center">
                        <Text color="gray.500" fontWeight="700">Comprobante:</Text>
                        <Badge colorScheme="blue" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                          {typeof docTypeVal === "object" ? (docTypeVal?.name || docTypeVal?.label || "BOLETA") : String(docTypeVal || "BOLETA").toUpperCase()}
                        </Badge>
                      </Flex>
                      <Flex justify="space-between">
                        <Text color="gray.500" fontWeight="700">Banco Oficial:</Text>
                        <Text fontWeight="800" color="gray.800" textAlign="right" isTruncated maxW="190px" title={bank}>{bank}</Text>
                      </Flex>
                      <Flex justify="space-between" align="center">
                        <Text color="gray.500" fontWeight="700">N° Operación:</Text>
                        {opNumber ? (
                          <Badge colorScheme="purple" variant="solid" fontSize="10px" px={2} borderRadius="md">{opNumber}</Badge>
                        ) : (
                          <Text fontSize="11px" color="gray.400" fontStyle="italic">{isCredit ? "Sin váucher (Crédito)" : "Sin Registrar"}</Text>
                        )}
                      </Flex>
                    </VStack>
                  </Box>

                  {/* CUADRILLA 2: LOGÍSTICA Y DESPACHO */}
                  <Box p={3.5} bg={!delivForm || delivForm === "—" ? "orange.50" : "white"} borderRadius="2xl" border="1.5px solid" borderColor={!delivForm || delivForm === "—" ? "orange.300" : "#e2e8f0"} boxShadow="xs">
                    <Flex align="center" justify="space-between" mb={2}>
                      <HStack spacing={2}>
                        <Text fontSize="15px">🚚</Text>
                        <Text fontSize="11px" fontWeight="900" color={!delivForm || delivForm === "—" ? "orange.700" : "gray.800"} textTransform="uppercase">
                          Logística y Despacho
                        </Text>
                      </HStack>
                      {!delivForm || delivForm === "—" ? (
                        <Badge colorScheme="orange" variant="solid" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="900">
                          ⚠️ INCOMPLETO
                        </Badge>
                      ) : (
                      <Badge colorScheme="teal" variant="subtle" fontSize="9px" px={2} py={0.5} borderRadius="md">
                        Almacén 014
                      </Badge>
                      )}
                    </Flex>
                    {(!delivForm || delivForm === "—") && (
                      <Box bg="orange.100" border="1px solid" borderColor="orange.400" borderRadius="lg" p={2.5} mb={2.5}>
                        <Text fontSize="11px" fontWeight="800" color="orange.800">
                          ⚠️ El vendedor no completó los datos de logística (Forma de Entrega, Transporte, Destino). Debe abrirse el formulario y completar la sección antes de sincronizar a SAP.
                        </Text>
                      </Box>
                    )}
                    <VStack align="stretch" spacing={1.5} fontSize="xs">
                      <Flex justify="space-between">
                        <Text color={!delivForm || delivForm === "—" ? "orange.500" : "gray.500"} fontWeight="700">Forma:</Text>
                        <Text fontWeight="800" color={!delivForm || delivForm === "—" ? "orange.600" : "gray.800"} textAlign="right" isTruncated maxW="190px" title={delivForm}>{delivForm || "Sin especificar"}</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text color="gray.500" fontWeight="700">Transporte:</Text>
                        <Text fontWeight="800" color="gray.800" textAlign="right" isTruncated maxW="190px" title={transportName}>{transportName}</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text color="gray.500" fontWeight="700">Destino:</Text>
                        <Text fontWeight="800" color="gray.800" textAlign="right" isTruncated maxW="190px" title={delivAddress}>{delivAddress}</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text color="gray.500" fontWeight="700">Op. SUNAT:</Text>
                        <Text fontWeight="800" color="emerald.700" fontSize="10px" textAlign="right" isTruncated maxW="190px" title={sunatType}>{sunatType}</Text>
                      </Flex>
                    </VStack>
                  </Box>

                  {/* CUADRILLA 3: COMPROBANTE DE PAGO / VÁUCHER / ANEXOS */}
                  <Box p={3.5} bg={voucherImage ? "emerald.50/40" : "gray.50"} borderRadius="2xl" border="1.5px solid" borderColor={voucherImage ? "emerald.200" : "#e2e8f0"} boxShadow="xs">
                    <Flex align="center" justify="space-between" mb={2}>
                      <HStack spacing={2}>
                        <Text fontSize="15px">{voucherImage ? "📸" : isCredit ? "📑" : "📎"}</Text>
                        <Text fontSize="11px" fontWeight="900" color="gray.800" textTransform="uppercase">
                          {voucherImage ? "Váucher Bancario" : isCredit ? "Resguardo Crédito" : "Comprobante / Anexo"}
                        </Text>
                      </HStack>
                      {voucherImage && (
                        <Badge colorScheme="green" variant="solid" fontSize="8px">ADJUNTADO</Badge>
                      )}
                    </Flex>

                    {voucherImage ? (
                      <HStack spacing={3} align="center">
                        <Box w="60px" h="60px" borderRadius="lg" overflow="hidden" border="1px solid #cbd5e1" flexShrink={0} bg="white">
                          <img
                            src={
                              typeof voucherImage === 'string' && voucherImage.startsWith('blob:')
                                ? voucherImage
                                : `${import.meta.env.VITE_API_URL || ''}/quoteModule/${voucherImage}`
                            }
                            alt="Váucher"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </Box>
                        <VStack align="flex-start" spacing={1} flex="1" minW="0">
                          <Text fontSize="10px" fontWeight="800" color="emerald.900" isTruncated>
                            Comprobante de Depósito
                          </Text>
                          {opNumber && (
                            <Text fontSize="9px" fontWeight="700" color="gray.600">
                              Op: {opNumber}
                            </Text>
                          )}
                          <Button
                            size="xs"
                            colorScheme="teal"
                            variant="outline"
                            fontSize="9px"
                            h="22px"
                            onClick={() => {
                              const url = typeof voucherImage === 'string' && voucherImage.startsWith('blob:')
                                ? voucherImage
                                : `${import.meta.env.VITE_API_URL || ''}/quoteModule/${voucherImage}`;
                              window.open(url, "_blank");
                            }}
                          >
                            🔍 Ver Foto Completa
                          </Button>
                        </VStack>
                      </HStack>
                    ) : isCredit ? (
                      <VStack align="flex-start" spacing={1} fontSize="xs">
                        <Text fontSize="10px" fontWeight="800" color="purple.900">
                          🛡️ Resguardo a Plazo Comercial
                        </Text>
                        <Text fontSize="10px" color="gray.600">
                          {quoteAttachments.length > 0 ? `${quoteAttachments.length} Anexo(s) OC cargados` : "Sin OC adjunta. Venta autorizada por línea de crédito."}
                        </Text>
                      </VStack>
                    ) : (
                      <VStack align="flex-start" spacing={1} fontSize="xs">
                        <Text fontSize="10px" fontWeight="700" color="gray.500" fontStyle="italic">
                          No se adjuntó váucher de abono para esta cotización.
                        </Text>
                      </VStack>
                    )}
                  </Box>
                </Grid>
              );
            })()}

            {/* CARD DE COMENTARIOS U OBSERVACIONES DEL PEDIDO (REFERENCIAL PARA ADMINISTRACIÓN Y SAP) */}
            {(() => {
              const currentQuote = effectiveQuote || quote || {};
              const quoteComment = currentQuote.comment || currentQuote.comments || currentQuote.Comments || currentQuote.observations || null;
              if (!quoteComment || !String(quoteComment).trim()) return null;

              return (
                <Box
                  p={3.5}
                  bg="linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"
                  borderRadius="2xl"
                  border="1.5px solid"
                  borderColor="#cbd5e1"
                  boxShadow="xs"
                  mb={3.5}
                >
                  <Flex align="center" justify="space-between" mb={2}>
                    <HStack spacing={2}>
                      <Text fontSize="16px">💬</Text>
                      <Text fontSize="11px" fontWeight="900" color="gray.800" textTransform="uppercase" letterSpacing="wide">
                        Comentarios u Observaciones del Pedido (`Comments`)
                      </Text>
                    </HStack>
                    <Badge colorScheme="blue" variant="subtle" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                      REFERENCIAL SAP / ASESOR
                    </Badge>
                  </Flex>
                  <Box bg="white" p={3} borderRadius="xl" border="1px solid" borderColor="#e2e8f0" boxShadow="xs">
                    <Text fontSize="xs" fontWeight="700" color="gray.800" whiteSpace="pre-wrap" lineHeight="tall">
                      {quoteComment}
                    </Text>
                  </Box>
                </Box>
              );
            })()}

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

                    {displayProducts.some(it => getItemStockInfo(it).isOutOfStock) && (
                      <Box p={2.5} bg="red.50" border="1px solid" borderColor="red.200" borderRadius="xl" mb={3}>
                        <HStack spacing={2}>
                          <Badge colorScheme="red" variant="solid" fontSize="10px" px={2} py={0.5} borderRadius="full">
                            ⚠️ CÓDIGOS SIN STOCK
                          </Badge>
                          <Text fontSize="11px" fontWeight="700" color="red.800">
                            Contiene artículos sin stock disponible en SAP (Pendientes a Importación).
                          </Text>
                        </HStack>
                      </Box>
                    )}

                    {/* VISTA MÓVIL DE PRODUCTOS (TARJETAS) */}
                    <Box display={{ base: "block", md: "none" }}>
                      <VStack align="stretch" spacing={3}>
                        {displayProducts.map((item, idx) => {
                          const sapDisc = Number(item.sapDiscount ?? item.discount ?? 0);
                          const addDisc = Number(item.lineDiscount ?? 0);
                          const totalDisc = Number(item.discountPercent ?? sapDisc);
                          const reqAppr = addDisc > 0;
                          const { isOutOfStock } = getItemStockInfo(item);

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
                              <VStack align="start" spacing={1} mb={1.5}>
                                <Text fontSize="12px" fontWeight="700" color="gray.900">
                                  {item.description || item.ItemDescription || item.name || "Artículo"}
                                </Text>
                                {isOutOfStock && (
                                  <Badge colorScheme="red" bg="#fee2e2" color="#991b1b" border="1px solid" borderColor="#fca5a5" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                                    ⚠️ SIN STOCK DISPONIBLE (Pendiente a Importación)
                                  </Badge>
                                )}
                              </VStack>

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
                              const { isOutOfStock } = getItemStockInfo(item);

                              return (
                                <Tr key={idx} _hover={{ bg: "gray.50" }}>
                                  <Td fontWeight="800" color="gray.700" fontFamily="mono" px={2.5}>{item.itemCode || item.code || item.id || "ART"}</Td>
                                  <Td fontWeight="600" color="gray.900" px={2.5} minW="160px" whiteSpace="normal">
                                    <VStack align="start" spacing={1}>
                                      <Text>{item.description || item.ItemDescription || item.name || "Artículo"}</Text>
                                      {isOutOfStock && (
                                        <Badge colorScheme="red" bg="#fee2e2" color="#991b1b" border="1px solid" borderColor="#fca5a5" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                                          ⚠️ SIN STOCK DISPONIBLE (Pendiente a Importación)
                                        </Badge>
                                      )}
                                    </VStack>
                                  </Td>
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

              {/* Columna Derecha: Historial de Actividad y Comprobantes */}
              <GridItem>
                <VStack align="stretch" spacing={4}>
                  {/* Comprobante de Abono Bancario y Anexos */}
                  {Boolean(quote?.opNum || quote?.U_VS_OPNUM || quote?.pathImg || quote?.paymentImg || quote?.voucherUrl || (quote?.attachments && quote?.attachments.length > 0)) && (
                    <Box p={4} borderRadius="2xl" border="1.5px solid" borderColor="purple.200" bg="purple.50" boxShadow="xs">
                      <Flex justify="space-between" align="center" mb={2.5}>
                        <HStack spacing={2}>
                          <Text fontSize="16px">💳</Text>
                          <Text fontSize="xs" fontWeight="900" color="purple.900" textTransform="uppercase">
                            Comprobante / Váucher Bancario
                          </Text>
                        </HStack>
                        {(quote?.opNum || quote?.U_VS_OPNUM) && (
                          <Badge colorScheme="purple" variant="solid" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="900">
                            OP: {quote?.opNum || quote?.U_VS_OPNUM}
                          </Badge>
                        )}
                      </Flex>

                      {(quote?.pathImg || quote?.paymentImg || quote?.voucherUrl) && (
                        <Box mt={2} p={2} bg="white" borderRadius="xl" border="1px solid" borderColor="purple.200">
                          <img
                            src={
                              typeof (quote.pathImg || quote.paymentImg || quote.voucherUrl) === 'string' && (quote.pathImg || quote.paymentImg || quote.voucherUrl).startsWith('blob:')
                                ? (quote.pathImg || quote.paymentImg || quote.voucherUrl)
                                : `${import.meta.env.VITE_API_URL || ''}/quoteModule/${quote.pathImg || quote.paymentImg || quote.voucherUrl}`
                            }
                            alt="Váucher de pago"
                            style={{ maxHeight: "180px", width: "100%", objectFit: "contain", borderRadius: "8px" }}
                          />
                        </Box>
                      )}

                      {quote?.attachments && quote?.attachments.length > 0 && (
                        <Box mt={3}>
                          <Text fontSize="10px" fontWeight="800" color="purple.800" textTransform="uppercase" mb={1.5}>
                            📎 Anexos de Resguardo ({quote.attachments.length}):
                          </Text>
                          <VStack align="stretch" spacing={1}>
                            {quote.attachments.map((att, aIdx) => (
                              <HStack key={aIdx} p={1.5} bg="white" borderRadius="md" border="1px solid" borderColor="purple.200" justify="space-between">
                                <Text fontSize="xs" fontWeight="600" color="gray.700" isTruncated>{att.name}</Text>
                                {att.size && <Badge fontSize="9px">{att.size}</Badge>}
                              </HStack>
                            ))}
                          </VStack>
                        </Box>
                      )}
                    </Box>
                  )}

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
                </VStack>
              </GridItem>
            </Grid>
          </DrawerBody>
          <DrawerFooter bg="gray.50" borderTop="1px solid" borderColor="gray.200" py={3} px={{ base: 4, md: 6 }}>
            <Flex justify="space-between" align="center" w="100%" flexWrap="wrap" gap={3}>
              <HStack spacing={2.5} wrap="wrap" align="center">
                {/* 
                  ========================================================================
                  ⚠️ RECORDATORIO / COMENTARIO PARA REACTIVAR LA SUBIDA DIRECTA A SAP:
                  ========================================================================
                  Actualmente se encuentra bloqueado el envío directo a SAP por temas de
                  seguridad y control operativo (se utiliza exportación a Excel para importación).
                  
                  PARA VOLVER A ACTIVAR ESTE BOTÓN:
                  1. Cambiar `isDisabled={true}` por `isDisabled={false}` (o quitar la propiedad).
                  2. Restaurar el diseño visual verde:
                     colorScheme="whatsapp"
                     bg="#126C36"
                     _hover={{ bg: "#0e572b" }}
                     color="white"
                     leftIcon={<Zap className="w-4 h-4" />}
                  3. En `handleSyncToSap()`, cambiar `IS_SAP_DIRECT_SYNC_ENABLED = true`.
                  ========================================================================
                */}
                {isAdminUser && isApprovedQuote && !isAlreadySyncedToSap && (
                  <Button
                    size="sm"
                    colorScheme="whatsapp"
                    bg="#126C36"
                    _hover={{ bg: "#0e572b" }}
                    color="white"
                    leftIcon={<Zap className="w-4 h-4" />}
                    isLoading={isSyncingSap}
                    loadingText="Sincronizando con SAP..."
                    onClick={handleSyncToSap}
                    fontWeight="800"
                    boxShadow="0 2px 6px rgba(18,108,54,0.3)"
                  >
                    ⚡ Enviar / Sincronizar con SAP
                  </Button>
                )}

                {/* Botón para Descargar Excel con toda la información comercial y de importación */}
                <Button
                  colorScheme="green"
                  bg="#107c41"
                  _hover={{ bg: "#0c5e31" }}
                  color="white"
                  size="sm"
                  leftIcon={<FileSpreadsheet className="w-4 h-4" />}
                  onClick={handleExportExcel}
                  fontWeight="800"
                  boxShadow="0 2px 6px rgba(16,124,65,0.25)"
                >
                  Descargar Excel (.xlsx)
                </Button>

                {/* Botón para Descargar PDF */}
                <Button
                  colorScheme="teal"
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4 text-teal-600" />}
                  onClick={() =>
                    setPdfQuote({
                      ...effectiveQuote,
                      products: displayProducts,
                      totals: { ...effectiveQuote.totals, ...calcRes },
                    })
                  }
                  fontWeight="800"
                >
                  Descargar PDF
                </Button>
              </HStack>
              <Button size="sm" onClick={onClose} fontWeight="700">
                Cerrar
              </Button>
            </Flex>
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

      {/* MODAL DE ANIMACIÓN / PROCESO DE SINCRONIZACIÓN CON SAP (MINIATURA) */}
      <Modal
        isOpen={isSyncingSap}
        onClose={() => {}}
        isCentered
        closeOnOverlayClick={false}
        closeOnEsc={false}
        size="xs"
      >
        <ModalOverlay bg="blackAlpha.500" backdropFilter="blur(4px)" />
        <ModalContent
          borderRadius="2xl"
          overflow="hidden"
          boxShadow="0 20px 40px -5px rgba(0, 0, 0, 0.3)"
          border="1.5px solid"
          borderColor="emerald.400"
          maxW="290px"
          mx="auto"
          bg="white"
        >
          <Box
            h="4px"
            w="full"
            bg="linear-gradient(90deg, #10b981, #06b6d4, #10b981)"
          />
          <ModalBody py={5} px={4} textAlign="center">
            <VStack spacing={3.5}>
              <Flex
                w="46px"
                h="46px"
                borderRadius="xl"
                bg="linear-gradient(135deg, #059669 0%, #0d9488 100%)"
                color="white"
                align="center"
                justify="center"
                boxShadow="0 8px 18px -3px rgba(5, 150, 105, 0.45)"
              >
                <ChakraIcon as={Zap} boxSize="22px" />
              </Flex>

              <VStack spacing={0.5}>
                <Text fontSize="sm" fontWeight="900" color="gray.800" letterSpacing="-0.01em">
                  Sincronizando con SAP...
                </Text>
                <Text fontSize="10.5px" fontWeight="600" color="gray.500" isTruncated maxW="240px">
                  Emitiendo Orden de Venta oficial
                </Text>
              </VStack>

              <Progress
                size="xs"
                isIndeterminate
                colorScheme="emerald"
                borderRadius="full"
                w="85%"
                bg="emerald.50"
                h="3px"
              />

              <HStack spacing={1.5} bg="gray.50" px={2.5} py={1} borderRadius="full" border="1px solid" borderColor="gray.200">
                <Spinner size="xs" color="emerald.500" speed="0.8s" />
                <Text fontSize="10px" fontWeight="700" color="gray.600" isTruncated maxW="220px">
                  Validando datos fiscales SUNAT...
                </Text>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN EXITOSA DE EMISIÓN A SAP B1 (SIN BLOQUES DE JSON BRUTO) */}
      <Modal
        isOpen={isSapSuccessModalOpen}
        onClose={() => setIsSapSuccessModalOpen(false)}
        size="lg"
        isCentered
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.750" backdropFilter="blur(8px)" />
        <ModalContent borderRadius="3xl" overflow="hidden" boxShadow="0 25px 50px -12px rgba(5, 150, 105, 0.35)" border="1px solid" borderColor="#a7f3d0">
          {/* Header Superior con Gradiente Esmeralda */}
          <ModalHeader bg="linear-gradient(135deg, #059669 0%, #047857 50%, #0f766e 100%)" color="white" py={5} px={6}>
            <HStack justify="space-between" align="center">
              <HStack spacing={3}>
                <Flex
                  w="36px"
                  h="36px"
                  borderRadius="xl"
                  bg="whiteAlpha.200"
                  align="center"
                  justify="center"
                  border="1px solid"
                  borderColor="whiteAlpha.400"
                >
                  <ChakraIcon as={Sparkles} boxSize="20px" color="yellow.300" />
                </Flex>
                <Box>
                  <Text fontSize="md" fontWeight="900" letterSpacing="-0.02em" color="white">
                    ¡Orden de Venta Emitida en SAP B1!
                  </Text>
                  <Text fontSize="11px" fontWeight="600" color="#d1fae5">
                    Transacción Oficial en BD ZZTET_02022025
                  </Text>
                </Box>
              </HStack>
              <Badge bg="white" color="#047857" fontSize="12px" px={3} py={1} borderRadius="full" fontWeight="900" boxShadow="sm">
                SAP B1 OFICIAL
              </Badge>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="white" mt={2} _hover={{ bg: "whiteAlpha.300" }} />

          <ModalBody p={6} bg="gray.50">
            <VStack spacing={5} align="stretch">
              {/* Tarjeta Hero del Número de Orden SAP */}
              <Box
                bg="white"
                p={5}
                borderRadius="2xl"
                border="2px solid"
                borderColor="#6ee7b7"
                boxShadow="0 4px 15px rgba(5, 150, 105, 0.08)"
                textAlign="center"
                position="relative"
                overflow="hidden"
              >
                <Box
                  position="absolute"
                  top="-20px"
                  right="-20px"
                  w="100px"
                  h="100px"
                  borderRadius="full"
                  bg="#ecfdf5"
                  zIndex={0}
                />

                <VStack spacing={2} position="relative" zIndex={1}>
                  <HStack justify="center" spacing={2}>
                    <Flex
                      w="44px"
                      h="44px"
                      borderRadius="full"
                      bg="#d1fae5"
                      color="#047857"
                      align="center"
                      justify="center"
                    >
                      <ChakraIcon as={CheckCircle2} boxSize="28px" />
                    </Flex>
                  </HStack>

                  <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="wider">
                    Número Oficial de Orden SAP (DocNum)
                  </Text>

                  <HStack justify="center" spacing={3}>
                    <Text fontSize="3xl" fontWeight="900" color="#065f46" fontFamily="mono" letterSpacing="-0.03em">
                      #{sapSyncResult?.docNum || "—"}
                    </Text>
                    <Button
                      size="xs"
                      colorScheme="teal"
                      variant="outline"
                      leftIcon={<ChakraIcon as={hasCopiedDocNum ? Check : Copy} />}
                      onClick={() => {
                        if (sapSyncResult?.docNum) {
                          navigator.clipboard.writeText(String(sapSyncResult.docNum));
                          setHasCopiedDocNum(true);
                          setTimeout(() => setHasCopiedDocNum(false), 2000);
                          toast({
                            title: "N° SAP Copiado",
                            description: `DocNum #${sapSyncResult.docNum} copiado al portapapeles.`,
                            status: "info",
                            duration: 2000,
                          });
                        }
                      }}
                      fontWeight="800"
                      borderRadius="lg"
                    >
                      {hasCopiedDocNum ? "Copiado" : "Copiar"}
                    </Button>
                  </HStack>

                  <HStack spacing={2} justify="center">
                    <Badge colorScheme="teal" variant="subtle" fontSize="11px" px={2.5} py={0.5} borderRadius="md" fontWeight="800">
                      DocEntry Interno: {sapSyncResult?.docEntry || "—"}
                    </Badge>
                    <Badge colorScheme="purple" variant="subtle" fontSize="11px" px={2.5} py={0.5} borderRadius="md" fontWeight="800">
                      Vendedor ID: {sapSyncResult?.salesPersonCode ?? (effectiveQuote?.SlpCode || "9")}
                    </Badge>
                  </HStack>
                </VStack>
              </Box>

              {/* Grid de Datos Resumidos */}
              <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                  <Box p={2.5} bg="gray.50" borderRadius="lg">
                    <HStack spacing={1.5} mb={0.5}>
                      <ChakraIcon as={Building2} boxSize="13px" color="gray.500" />
                      <Text fontSize="10.5px" fontWeight="700" color="gray.500" textTransform="uppercase">Cliente</Text>
                    </HStack>
                    <Text fontSize="xs" fontWeight="900" color="gray.800" isTruncated maxW="200px">
                      {sapSyncResult?.cardName || effectiveQuote?.clientName || "—"}
                    </Text>
                    <Text fontSize="10px" fontWeight="700" color="gray.500">
                      RUC/DNI: {sapSyncResult?.cardCode || effectiveQuote?.clientDocument || "—"}
                    </Text>
                  </Box>

                  <Box p={2.5} bg="gray.50" borderRadius="lg">
                    <HStack spacing={1.5} mb={0.5}>
                      <ChakraIcon as={User} boxSize="13px" color="gray.500" />
                      <Text fontSize="10.5px" fontWeight="700" color="gray.500" textTransform="uppercase">Vendedor Asignado</Text>
                    </HStack>
                    <Text fontSize="xs" fontWeight="900" color="blue.800" isTruncated maxW="200px">
                      {effectiveQuote?.sellerName || "Vendedor Autorizado"}
                    </Text>
                    <Text fontSize="10px" fontWeight="700" color="gray.500">
                      Código SAP: ID {sapSyncResult?.salesPersonCode ?? (effectiveQuote?.SlpCode || "—")}
                    </Text>
                  </Box>

                  <Box p={2.5} bg="#ecfdf5" borderRadius="lg" border="1px solid" borderColor="#a7f3d0">
                    <Text fontSize="10.5px" fontWeight="700" color="#065f46" textTransform="uppercase">Importe Total SAP</Text>
                    <Text fontSize="md" fontWeight="900" color="#064e3b" fontFamily="mono">
                      ${Number(sapSyncResult?.docTotalUSD ?? sapSyncResult?.docTotal ?? effectiveQuote?.totals?.grandTotalUSD ?? 0).toFixed(2)} USD
                    </Text>
                  </Box>

                  <Box p={2.5} bg="purple.50" borderRadius="lg" border="1px solid" borderColor="purple.200">
                    <Text fontSize="10.5px" fontWeight="700" color="purple.800" textTransform="uppercase">Váucher / Depósito</Text>
                    <Text fontSize="xs" fontWeight="900" color="purple.900">
                      {effectiveQuote?.opNum ? `N° ${effectiveQuote.opNum}` : "Validado Contado"}
                    </Text>
                    <Text fontSize="10px" fontWeight="700" color="purple.700">
                      {effectiveQuote?.bankAccount || "BCP_SOLES"}
                    </Text>
                  </Box>
                </Grid>
              </Box>

              {/* Nota Informativa de Consola */}
              <Alert status="info" variant="subtle" borderRadius="xl" p={3} bg="blue.50" border="1px solid" borderColor="blue.200">
                <AlertIcon color="blue.500" boxSize="15px" />
                <Text fontSize="11px" color="blue.900" fontWeight="600">
                  <Text as="span" fontWeight="800">💡 Auditoría Técnica:</Text> La trama completa JSON enviada y la respuesta oficial de SAP Service Layer fueron registradas en la consola del navegador (F12).
                </Text>
              </Alert>
            </VStack>
          </ModalBody>

          <ModalFooter bg="white" borderTop="1px solid" borderColor="gray.200" py={4} px={6}>
            <HStack spacing={3} w="full" justify="space-between">
              <Button
                variant="outline"
                colorScheme="gray"
                size="md"
                fontWeight="700"
                leftIcon={<ChakraIcon as={FileText} />}
                onClick={() => {
                  setPdfQuote({
                    ...effectiveQuote,
                    products: displayProducts,
                    totals: { ...effectiveQuote.totals, ...calcRes },
                    DocNum: sapSyncResult?.docNum || effectiveQuote.DocNum,
                    sapDocNum: sapSyncResult?.docNum || effectiveQuote.sapDocNum,
                    docNumber: effectiveQuote.docNumber || `COT-${sapSyncResult?.docNum}`
                  });
                }}
              >
                Ver Comprobante PDF
              </Button>
              <Button
                bg="linear-gradient(135deg, #059669 0%, #047857 100%)"
                color="white"
                _hover={{ bg: "linear-gradient(135deg, #047857 0%, #065f46 100%)" }}
                _active={{ bg: "#064e3b" }}
                size="md"
                fontWeight="900"
                px={6}
                boxShadow="0 4px 14px rgba(5, 150, 105, 0.4)"
                onClick={() => {
                  setIsSapSuccessModalOpen(false);
                  onClose();
                }}
              >
                ✓ Aceptar y Cerrar
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default QuoteDetailDrawer;
