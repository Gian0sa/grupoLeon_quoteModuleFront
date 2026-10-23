import React, { useState, useMemo } from "react";
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
  Eye,
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
  Code2,
  RefreshCw,
  ArrowRight,
  Truck,
  Receipt,
  Package,
  Unlock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuoteStore } from "../stores/quoteStore";
import { RejectReasonModal } from "./RejectReasonModal";
import { ObserveReasonModal } from "./ObserveReasonModal";
import QuotePdfModal from "./QuotePdfModal";
import { SapPayloadJsonModal } from "./SapPayloadJsonModal";
import { resolveUserProfileTitle, acquireQuoteLock, releaseQuoteLock, checkQuoteLock, forceUnlockQuote } from "../services/quoteLockService";
import { calculateQuoteTotals, formatThousands } from "../../../shared/utils/quoteCalculator";
import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import { useGetQuoteById } from "../hooks/queries/quotesQueries";
import { useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../../shared/lib/axiosInstance";
import { useIsAdmin, useHasAccess, checkIsAdmin } from "../../../shared/utils/permissions";
import {
  formatDeliveryForm,
  formatTransportName,
  formatTransportAddress,
  formatDeliveryPoint,
  formatPaymentTerms,
  formatSunatOp,
  cleanSellerName,
  formatQuoteSellerName,
  cleanClientName
} from "../../../shared/utils/quoteLogisticsFormatters";
import { useSellersData } from "../../auth/hooks/queries/authQueries";
import { updateQuote } from "../services/quoteService";

export function QuoteDetailDrawer({ isOpen, onClose, quote, onUpdateStatus, onDeleteQuote }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sellersResponse } = useSellersData();
  const sellersList = useMemo(() => {
    if (!sellersResponse) return [];
    if (Array.isArray(sellersResponse)) return sellersResponse;
    if (Array.isArray(sellersResponse.sellers)) return sellersResponse.sellers;
    if (Array.isArray(sellersResponse.data)) return sellersResponse.data;
    return [];
  }, [sellersResponse]);
  const { username: authUsername, role: authRole, salesEmployeeCode: authSalesCode } = useAuthStore();
  const isAdminHook = useIsAdmin();
  const hasAccess = useHasAccess();
  const roleUpper = String(authRole || localStorage.getItem("role") || "").toUpperCase();
  const isRoleAdmin =
    roleUpper === "ADMIN" ||
    roleUpper === "ADMINISTRADOR" ||
    roleUpper.startsWith("ADMIN") ||
    isAdminHook ||
    checkIsAdmin(useAuthStore.getState().endpoints, authUsername);

  const isSellerUser = !isRoleAdmin && Boolean(authSalesCode && Number(authSalesCode) > 0 && Number(authSalesCode) !== 20);
  const isAdminUser =
    isRoleAdmin ||
    (!isSellerUser && (
      roleUpper === "FACTURACION" ||
      roleUpper === "SUPERVISOR" ||
      roleUpper === "DIGITACION" ||
      hasAccess("POST /quotes/approval") ||
      hasAccess("POST /quotations/approve")
    ));
  const isRealAdmin = Boolean(isRoleAdmin || (!isSellerUser && roleUpper.startsWith("ADMIN")));
  const activeRole = isAdminUser ? "ADMIN" : "SELLER";
  const adminUsername = authUsername || "Administrador";

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
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const toast = useToast();

  const quoteId = quote?.docNumber || quote?.id;
  const { data: serverQuote } = useGetQuoteById(quoteId, { enabled: isOpen });

  // Resetear cualquier resultado de sincronización de SAP previo al cambiar de cotización o cerrar
  React.useEffect(() => {
    if (!isOpen) {
      setSapSyncResult(null);
    }
  }, [isOpen]);

  React.useEffect(() => {
    setSapSyncResult(null);
  }, [quoteId]);

  // Lista de estados no aprobados / pendientes: NUNCA deben asociarse ni mostrar insignias de SAP
  const UNAPPROVED_STATUSES = React.useMemo(() => [
    "ENVIADO",
    "PENDIENTE_APROBACION",
    "EN_PROCESO",
    "PENDIENTE_FACTURACION",
    "BORRADOR",
    "GENERADO",
    "DRAFT",
    "draft",
    "OBSERVADO",
    "EN_EDICION",
    "RECHAZADO"
  ], []);

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

  // Unificación inteligente de la cotización (Prioriza siempre el estado más actualizado)
  const effectiveQuote = React.useMemo(() => {
    if (!quote) return null;
    let full = { ...quote };

    const quoteIdentifier = String(quote.docNumber || quote.id || "");
    const isSameQuote = (candidate) => {
      if (!candidate) return false;
      const sourceDoc = quote.docNumber != null ? String(quote.docNumber) : "";
      const candidateDoc = candidate.docNumber != null ? String(candidate.docNumber) : "";
      if (sourceDoc && candidateDoc && sourceDoc === candidateDoc) return true;

      const sourceId = quote.id != null ? String(quote.id) : "";
      const candidateId = candidate.id != null ? String(candidate.id) : "";
      if (sourceId && candidateId && sourceId === candidateId) return true;

      const sourceSap = quote.sapDocNum ?? quote.DocNum ?? quote.totals?.sapDocNum;
      const candidateSap = candidate.sapDocNum ?? candidate.DocNum ?? candidate.totals?.sapDocNum;
      return sourceSap != null && candidateSap != null && String(sourceSap) === String(candidateSap);
    };
    const initialRawStatus = String(full.approvalStatus || full.status || full.state || "GENERADO").toUpperCase().trim();
    const isInitialUnapproved = UNAPPROVED_STATUSES.includes(initialRawStatus);

    let freshestStatus = full.approvalStatus || full.status || full.state || "GENERADO";
    let freshestHistory = Array.isArray(full.historyLog) && full.historyLog.length > 0 ? full.historyLog : null;
    let freshestTotals = full.totals || null;
    
    // Solo leer sapDocNum legítimo si NO es un estado pendiente/borrador y si coincide el sync
    const currentSyncResult = (sapSyncResult?.quoteId && String(sapSyncResult.quoteId) === quoteIdentifier) ? sapSyncResult : null;
    const quoteDirectDocNum = (quote?.sapDocNum && !isNaN(Number(quote.sapDocNum)) ? Number(quote.sapDocNum) : null)
      || (quote?.totals?.sapDocNum && !isNaN(Number(quote.totals.sapDocNum)) ? Number(quote.totals.sapDocNum) : null)
      || (quote?.DocNum && !String(quote.DocNum).startsWith("COT-") && !isNaN(Number(quote.DocNum)) ? Number(quote.DocNum) : null);

    let freshestSapDocNum = !isInitialUnapproved
      ? (quoteDirectDocNum || currentSyncResult?.docNum || null)
      : null;

    // 1. Buscar en la caché de React Query (['quotes'])
    try {
      const cachedQuotes = queryClient
        .getQueriesData({ queryKey: ["quotes"] })
        .flatMap(([, data]) => Array.isArray(data) ? data : (Array.isArray(data?.quotes) ? data.quotes : []));
      if (cachedQuotes.length > 0) {
        const foundInCache = cachedQuotes.find(isSameQuote);
        if (foundInCache) {
          full = { ...foundInCache, ...full };
          const cacheStatus = String(foundInCache.approvalStatus || foundInCache.status || "").toUpperCase().trim();
          if (foundInCache.approvalStatus || foundInCache.status) {
            if (!isInitialUnapproved || UNAPPROVED_STATUSES.includes(cacheStatus)) {
              freshestStatus = foundInCache.approvalStatus || foundInCache.status;
            }
          }
          if (Array.isArray(foundInCache.historyLog) && foundInCache.historyLog.length > (freshestHistory?.length || 0)) {
            freshestHistory = foundInCache.historyLog;
          }
          if (foundInCache.totals) freshestTotals = { ...foundInCache.totals, ...(freshestTotals || {}) };
          const cacheSapNum = (foundInCache.sapDocNum && !isNaN(Number(foundInCache.sapDocNum)) ? Number(foundInCache.sapDocNum) : null)
            || (foundInCache.DocNum && !String(foundInCache.DocNum).startsWith("COT-") && !isNaN(Number(foundInCache.DocNum)) ? Number(foundInCache.DocNum) : null);
          if (!isInitialUnapproved && cacheSapNum) {
            freshestSapDocNum = cacheSapNum;
          }
        }
      }
    } catch {}

    // 2. Buscar en localStorage
    try {
      const localQuotes = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
      const foundInLocal = localQuotes.find(isSameQuote);
      if (foundInLocal) {
        full = { ...foundInLocal, ...full };
        const localStatus = String(foundInLocal.approvalStatus || foundInLocal.status || "").toUpperCase().trim();
        if (foundInLocal.approvalStatus || foundInLocal.status) {
          if (!isInitialUnapproved || UNAPPROVED_STATUSES.includes(localStatus)) {
            freshestStatus = foundInLocal.approvalStatus || foundInLocal.status;
          }
        }
        if (Array.isArray(foundInLocal.historyLog) && foundInLocal.historyLog.length > (freshestHistory?.length || 0)) {
          freshestHistory = foundInLocal.historyLog;
        }
        if (foundInLocal.totals) freshestTotals = { ...foundInLocal.totals, ...(freshestTotals || {}) };
        const localSapNum = (foundInLocal.sapDocNum && !isNaN(Number(foundInLocal.sapDocNum)) ? Number(foundInLocal.sapDocNum) : null)
          || (foundInLocal.DocNum && !String(foundInLocal.DocNum).startsWith("COT-") && !isNaN(Number(foundInLocal.DocNum)) ? Number(foundInLocal.DocNum) : null);
        if (!isInitialUnapproved && localSapNum) {
          freshestSapDocNum = localSapNum;
        }
      }
    } catch {}

    // 3. Enriquecer con serverQuote SOLO para productos o datos faltantes, SIN degradar el estado
    if (serverQuote) {
      const serverStatus = serverQuote.approvalStatus || serverQuote.status;
      const upperServerStatus = String(serverStatus || "").toUpperCase().trim();
      // Solo actualizar estado si el servidor tiene un avance real posterior (ej. SAP emitido)
      if (serverStatus && ["APROBADO", "APROBADO_COMERCIAL", "EMITIDO", "EMITIDO_SAP", "COMPLETADO", "FACTURADO"].includes(serverStatus)) {
        freshestStatus = serverStatus;
      } else if (UNAPPROVED_STATUSES.includes(upperServerStatus)) {
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
      if (serverQuote.refNumber && !full.refNumber) full.refNumber = serverQuote.refNumber;
      if (serverQuote.contactPerson && !full.contactPerson) full.contactPerson = serverQuote.contactPerson;
      if (serverQuote.opNum && !full.opNum) full.opNum = serverQuote.opNum;
      if (serverQuote.paymentMethod && !full.paymentMethod) full.paymentMethod = serverQuote.paymentMethod;
      if (serverQuote.bankAccount && !full.bankAccount) full.bankAccount = serverQuote.bankAccount;
      if (serverQuote.sunatOpType && !full.sunatOpType) full.sunatOpType = serverQuote.sunatOpType;
      if (serverQuote.observations && !full.observations) full.observations = serverQuote.observations;
      if (serverQuote.whsCode && !full.whsCode) full.whsCode = serverQuote.whsCode;

      // También extraer desde totals si vinieron encapsulados en JSON
      const sTotals = serverQuote.totals || {};
      if (sTotals.refNumber && !full.refNumber) full.refNumber = sTotals.refNumber;
      if (sTotals.contactPerson && !full.contactPerson) full.contactPerson = sTotals.contactPerson;
      if (sTotals.opNum && !full.opNum) full.opNum = sTotals.opNum;
      if (sTotals.paymentMethod && !full.paymentMethod) full.paymentMethod = sTotals.paymentMethod;
      if (sTotals.bankAccount && !full.bankAccount) full.bankAccount = sTotals.bankAccount;
      if (sTotals.sunatOpType && !full.sunatOpType) full.sunatOpType = sTotals.sunatOpType;
      if (sTotals.saleCondition && !full.saleCondition) full.saleCondition = sTotals.saleCondition;
      if (sTotals.documentType && !full.documentType) full.documentType = sTotals.documentType;
      if (sTotals.creditTerm && !full.creditTerm) full.creditTerm = sTotals.creditTerm;
      if (sTotals.isLetra !== undefined && full.isLetra === undefined) full.isLetra = sTotals.isLetra;
      if (sTotals.whsCode && !full.whsCode) full.whsCode = sTotals.whsCode;
      if (sTotals.comment && !full.comment) full.comment = sTotals.comment;
      if (sTotals.observations && !full.observations) full.observations = sTotals.observations;

      if (serverQuote.sapDocNum && !UNAPPROVED_STATUSES.includes(upperServerStatus)) {
        freshestSapDocNum = serverQuote.sapDocNum;
      }
      if (Array.isArray(serverQuote.historyLog) && serverQuote.historyLog.length > (freshestHistory?.length || 0)) {
        freshestHistory = serverQuote.historyLog;
      }
    }

    // 4. Si se acaba de sincronizar con SAP en esta sesión ESPECÍFICAMENTE para esta cotización
    if (currentSyncResult?.docNum) {
      freshestSapDocNum = currentSyncResult.docNum;
      freshestStatus = "APROBADO";
    }

    // Si el estado final es no aprobado (ENVIADO, BORRADOR, etc.), NUNCA debe tener SAP DocNum
    const isFinalUnapproved = UNAPPROVED_STATUSES.includes(String(freshestStatus).toUpperCase().trim());
    if (isFinalUnapproved) {
      freshestSapDocNum = null;
    }

    // 5. Aplicar campos consolidados
    full.status = freshestStatus;
    full.approvalStatus = freshestStatus;
    full.state = freshestStatus;
    if (freshestHistory) full.historyLog = freshestHistory;
    // Nunca modificar totals del prop ni de la caché durante el render.
    if (freshestTotals) full.totals = { ...freshestTotals };
    if (freshestSapDocNum && !isFinalUnapproved) {
      full.sapDocNum = freshestSapDocNum;
      full.DocNum = freshestSapDocNum;
      full.isSapDirect = true;
      if (!full.totals) full.totals = {};
      full.totals.sapDocNum = freshestSapDocNum;
      full.totals.DocNum = freshestSapDocNum;
      full.totals.isSapDirect = true;
    } else if (isFinalUnapproved) {
      full.sapDocNum = null;
      full.DocNum = null;
      full.isSapDirect = false;
      if (full.totals) {
        full.totals.sapDocNum = null;
        full.totals.DocNum = null;
        full.totals.isSapDirect = false;
      }
    }

    full.products = extractItems(full);
    return full;
  }, [quote, serverQuote, quoteId, queryClient, sapSyncResult, UNAPPROVED_STATUSES]);

  const stockCodesKey = React.useMemo(() => {
    const rawItems = effectiveQuote?.products || effectiveQuote?.items || [];
    return [...new Set(rawItems
      .map((p) => p.itemCode || p.code || p.productCode || p.id)
      .filter(Boolean)
      .map((code) => String(code).trim()))]
      .sort()
      .join(",");
  }, [effectiveQuote?.products, effectiveQuote?.items]);

  // Consulta de Stock en tiempo real directamente a SAP al abrir la cotización
  React.useEffect(() => {
    if (!isOpen || !stockCodesKey) return;

    let isMounted = true;
    const controller = new AbortController();
    const fetchLiveStock = async () => {
      try {
        const url = `/reportModule/priceListByItemCodes?itemCodes=${encodeURIComponent(stockCodesKey)}`;
        const res = await axiosInstance.get(url, { signal: controller.signal });
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
        if (err?.code !== "ERR_CANCELED") {
          console.warn("⚠️ Error obteniendo stock en vivo para detalle de cotización:", err);
        }
      }
    };

    fetchLiveStock();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isOpen, stockCodesKey]);

  const status = effectiveQuote?.approvalStatus || effectiveQuote?.state || effectiveQuote?.status || quote?.approvalStatus || quote?.status || "GENERADO";
  const products = effectiveQuote?.products || effectiveQuote?.items || [];

  const lockedQuoteIdRef = React.useRef(null);
  const [drawerLockCheck, setDrawerLockCheck] = React.useState(() =>
    checkQuoteLock(quoteId, useAuthStore.getState().userId, authUsername)
  );

  React.useEffect(() => {
    const updateLock = () => {
      setDrawerLockCheck(checkQuoteLock(quoteId, useAuthStore.getState().userId, authUsername));
    };
    updateLock();
    window.addEventListener("quoteLocksUpdated", updateLock);
    return () => window.removeEventListener("quoteLocksUpdated", updateLock);
  }, [quoteId, authUsername]);

  // Concurrencia de Digitación: Adquirir candado de revisión activa SOLO si quien lo abre es evaluador administrativo
  React.useEffect(() => {
    const isPendingDoc = status === "ENVIADO" || status === "EN_PROCESO" || status === "PENDIENTE_APROBACION" || status === "PENDIENTE_FACTURACION";
    const secId = quote?.id && String(quote.id) !== String(quoteId) ? quote.id : null;

    if (isOpen && quoteId && isAdminUser && isPendingDoc) {
      if (lockedQuoteIdRef.current !== quoteId) {
        acquireQuoteLock(quoteId, {
          id: useAuthStore.getState().userId,
          username: authUsername,
          role: authRole,
          endpoints: useAuthStore.getState().endpoints,
          salesEmployeeCode: authSalesCode,
          isAdmin: isAdminUser
        }, secId);
        lockedQuoteIdRef.current = quoteId;
        setDrawerLockCheck(checkQuoteLock(quoteId, useAuthStore.getState().userId, authUsername));
      }

      const handleBeforeUnload = () => {
        if (lockedQuoteIdRef.current) {
          releaseQuoteLock(lockedQuoteIdRef.current, useAuthStore.getState().userId, secId);
          lockedQuoteIdRef.current = null;
        }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        if (lockedQuoteIdRef.current) {
          releaseQuoteLock(lockedQuoteIdRef.current, useAuthStore.getState().userId, secId);
          lockedQuoteIdRef.current = null;
        }
      };
    } else if (!isOpen && lockedQuoteIdRef.current) {
      releaseQuoteLock(lockedQuoteIdRef.current, useAuthStore.getState().userId, secId);
      lockedQuoteIdRef.current = null;
    }
  }, [isOpen, quoteId, isAdminUser, status, authUsername, authRole, authSalesCode]);

  // Registro de primera visualización por parte de Administración
  const hasMarkedViewRef = React.useRef(false);
  React.useEffect(() => {
    if (!isOpen) {
      hasMarkedViewRef.current = false;
      return;
    }
    if (isAdminUser && quoteId && !hasMarkedViewRef.current && effectiveQuote && !effectiveQuote.viewedByAdmin && !effectiveQuote.totals?.viewedByAdmin) {
      hasMarkedViewRef.current = true;
      const nowIso = new Date().toISOString();
      const viewer = authUsername || "Administrador";
      const docKey = effectiveQuote.docNumber || quoteId;
      const currentLogs = Array.isArray(effectiveQuote.historyLog) ? effectiveQuote.historyLog : [];
      const newLog = { status: "VISTO", timestamp: nowIso, user: viewer, note: `👁️ Solicitud abierta y leída por ${viewer}` };

      axiosInstance.put(`/quoteModule/quotes/${docKey}`, {
        id: effectiveQuote.id,
        docNumber: effectiveQuote.docNumber || quoteId,
        viewedByAdmin: true,
        viewedAt: nowIso,
        historyLog: [newLog, ...currentLogs]
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["quotes"] });
      }).catch(() => {});
    }
  }, [isOpen, quoteId, isAdminUser, effectiveQuote, authUsername, queryClient]);

  if (!effectiveQuote) return null;

  const client = effectiveQuote.client || {};
  const clientName = cleanClientName(effectiveQuote);
  const clientRuc = effectiveQuote.clientRuc || effectiveQuote.clientDocument || client.LicTradNum || client.FederalTaxID || client.clientRuc || client.CardCode || "—";
  const clientAddress = effectiveQuote.clientAddress || client.Address || client.address || "—";
  const sellerName = formatQuoteSellerName(effectiveQuote, sellersList);
  const isApprovedQuote = ["APROBADO", "APROBADO_COMERCIAL", "EMITIDO", "EMITIDO_SAP", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO"].includes(String(status).toUpperCase());
  const isPendingQuote = ["ENVIADO", "PENDIENTE_APROBACION", "EN_PROCESO", "PENDIENTE_FACTURACION"].includes(String(status).toUpperCase());
  const isDrawerLockedByOther = Boolean(drawerLockCheck.isLocked);

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
  
  // Helper seguro para formatear fechas de auditoría/logs
  const formatLogTime = React.useCallback((ts) => {
    if (!ts) return "—";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);
      return d.toLocaleString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return String(ts);
    }
  }, []);

  // Mapear historial y asegurar que siempre exista una línea de tiempo visible
  const historyLog = React.useMemo(() => {
    let raw = effectiveQuote.historyLog;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = [];
      }
    }

    let logs = Array.isArray(raw) ? [...raw] : [];

    // Si no existen logs en BD (ej. cotizaciones históricas o sincronizadas directas de SAP),
    // reconstruir el ciclo de vida del documento a partir de los datos registrados
    if (logs.length === 0) {
      const createdTime = effectiveQuote.createdAt || (effectiveQuote.docDate ? `${effectiveQuote.docDate}T09:00:00.000Z` : new Date().toISOString());
      logs.push({
        status: "GENERADO",
        timestamp: createdTime,
        user: sellerName || "Vendedor",
        note: "Cotización registrada en aplicativo"
      });

      const currentRawStatus = String(effectiveQuote.approvalStatus || effectiveQuote.status || effectiveQuote.state || "").toUpperCase().trim();

      if (currentRawStatus !== "BORRADOR" && currentRawStatus !== "DRAFT") {
        logs.push({
          status: "ENVIADO",
          timestamp: effectiveQuote.sentAt || createdTime,
          user: sellerName || "Vendedor",
          note: "Cotización enviada a evaluación comercial"
        });
      }

      if (effectiveQuote.viewedByAdmin || effectiveQuote.viewedAt || effectiveQuote.totals?.viewedByAdmin) {
        logs.push({
          status: "VISTO",
          timestamp: effectiveQuote.viewedAt || effectiveQuote.lastViewedAt || createdTime,
          user: effectiveQuote.evaluatedBy || "Administración",
          note: "👁️ Solicitud abierta y leída por Administración"
        });
      }

      if (effectiveQuote.rejectionReason || currentRawStatus === "OBSERVADO" || currentRawStatus === "RECHAZADO" || currentRawStatus === "EN_EDICION") {
        logs.push({
          status: currentRawStatus === "RECHAZADO" ? "RECHAZADO" : "OBSERVADO",
          timestamp: effectiveQuote.observedAt || effectiveQuote.evaluatedAt || effectiveQuote.updatedAt || createdTime,
          user: effectiveQuote.evaluatedBy || "Administrador",
          note: effectiveQuote.rejectionReason
            ? `⚠️ Observación: ${effectiveQuote.rejectionReason}`
            : "Cotización observada para corrección"
        });
      }

      if (["APROBADO", "APROBADO_COMERCIAL", "EMITIDO", "EMITIDO_SAP", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO"].includes(currentRawStatus) || effectiveQuote.approvedBy || effectiveQuote.sapDocNum || effectiveQuote.DocNum) {
        logs.push({
          status: "APROBADO",
          timestamp: effectiveQuote.approvedAt || effectiveQuote.evaluatedAt || effectiveQuote.updatedAt || createdTime,
          user: effectiveQuote.approvedBy || effectiveQuote.evaluatedBy || "Administración",
          note: "Aprobada por administración"
        });
      }

      const sapNum = effectiveQuote.sapDocNum || (effectiveQuote.isSapDirect ? (effectiveQuote.DocNum || effectiveQuote.docNumber) : null);
      if (sapNum && !["BORRADOR", "ENVIADO", "OBSERVADO", "RECHAZADO"].includes(currentRawStatus)) {
        logs.push({
          status: "EMITIDO",
          timestamp: effectiveQuote.sapSyncDate || effectiveQuote.updatedAt || createdTime,
          user: "SAP Service Layer",
          note: `✅ Emitida en SAP Business One (DocNum: #${sapNum})`
        });
      }
    }

    return logs.map((item, index) => {
      let ts = item.timestamp || item.date || item.createdAt;
      return {
        id: item.id || index,
        status: String(item.status || "EVENTO").toUpperCase(),
        timestamp: ts,
        user: item.user || item.username || item.author || "Sistema",
        note: item.note || item.comment || item.message || item.description || "Actualización de cotización"
      };
    });
  }, [
    effectiveQuote.historyLog,
    effectiveQuote.createdAt,
    effectiveQuote.sentAt,
    effectiveQuote.viewedByAdmin,
    effectiveQuote.viewedAt,
    effectiveQuote.lastViewedAt,
    effectiveQuote.approvalStatus,
    effectiveQuote.status,
    effectiveQuote.state,
    effectiveQuote.rejectionReason,
    effectiveQuote.observedAt,
    effectiveQuote.evaluatedAt,
    effectiveQuote.approvedAt,
    effectiveQuote.approvedBy,
    effectiveQuote.evaluatedBy,
    effectiveQuote.updatedAt,
    effectiveQuote.sapDocNum,
    effectiveQuote.DocNum,
    effectiveQuote.docDate,
    effectiveQuote.isSapDirect,
    effectiveQuote.docNumber,
    sellerName
  ]);

  // Calcular Totales unificados con calculadora global
  const tcVal = Number(effectiveQuote.totals?.tc || effectiveQuote.totals?.exchangeRate || effectiveQuote.exchangeRate) || 3.76;
  const isSapDirect = Boolean(effectiveQuote.isSapDirect || effectiveQuote.sapDocNum || effectiveQuote.DocNum);
  const calcRes = calculateQuoteTotals(products, tcVal, { isSapDirect });
  const displayProducts = calcRes.normalizedProducts && calcRes.normalizedProducts.length > 0 ? calcRes.normalizedProducts : products;
  const fallbackUSD = effectiveQuote.DocTotalSys
    ? Number(effectiveQuote.DocTotalSys)
    : (effectiveQuote.DocTotalFc
        ? Number(effectiveQuote.DocTotalFc)
        : (effectiveQuote.DocTotal && effectiveQuote.DocRate
            ? Number((effectiveQuote.DocTotal / effectiveQuote.DocRate).toFixed(2))
            : Number(effectiveQuote.DocTotal || 0)));

  // Totales normalizados y matemáticamente exactos (Subtotal + IGV = Total)
  const subtotalUSD = calcRes.subtotalUSD > 0
    ? calcRes.subtotalUSD
    : Number(effectiveQuote.totals?.subtotalUSD || effectiveQuote.totals?.subTotalUSD || 0);
  const igvUSD = calcRes.igvUSD > 0
    ? calcRes.igvUSD
    : Number(effectiveQuote.totals?.igvUSD || Number((subtotalUSD * 0.18).toFixed(2)));
  const grandTotalUSD = Number((subtotalUSD + igvUSD).toFixed(2));
  const grandTotalSOL = isSapDirect && effectiveQuote.DocTotal && (effectiveQuote.DocCurrency === "PEN" || effectiveQuote.DocCurrency === "SOL")
    ? Number(effectiveQuote.DocTotal)
    : (calcRes.grandTotalSOL || Number((grandTotalUSD * tcVal).toFixed(2)));

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

  const isUnapprovedDoc = UNAPPROVED_STATUSES.includes(String(status).toUpperCase().trim());

  const currentScopedSyncDocNum = (sapSyncResult?.quoteId && String(sapSyncResult.quoteId) === String(effectiveQuote?.docNumber || quoteId))
    ? sapSyncResult.docNum
    : null;

  const syncedDocNum = isUnapprovedDoc
    ? null
    : (
        currentScopedSyncDocNum
        || effectiveQuote.sapDocNum
        || effectiveQuote.totals?.sapDocNum
        || (effectiveQuote.isSapDirect ? (effectiveQuote.DocNum || effectiveQuote.docNumber) : null)
        || (effectiveQuote.DocNum && !String(effectiveQuote.DocNum).startsWith("COT-") && !isNaN(Number(effectiveQuote.DocNum)) ? Number(effectiveQuote.DocNum) : null)
      );

  const isAlreadySyncedToSap = !isUnapprovedDoc && Boolean(
    syncedDocNum ||
    effectiveQuote.isSapDirect ||
    effectiveQuote.totals?.isSapDirect ||
    effectiveQuote.sapDocNum ||
    effectiveQuote.totals?.sapDocNum ||
    currentScopedSyncDocNum
  );

  const isDirectSap = !isUnapprovedDoc && Boolean(
    effectiveQuote.isSapDirect ||
    effectiveQuote.totals?.isSapDirect ||
    isAlreadySyncedToSap
  );

  const createdIso = effectiveQuote.createdAt || historyLog[0]?.timestamp || (effectiveQuote.docDate ? `${effectiveQuote.docDate}T00:00:00.000Z` : null);
  const solicitudIso = findLogIso(["ENVIADO", "EN_PROCESO", "PENDIENTE_FACTURACION", "APROBADO", "APROBADO_COMERCIAL", "RECHAZADO", "OBSERVADO", "EN_EDICION", "EMITIDO", "EMITIDO_SAP", "COMPLETADO", "PEDIDO_EMITIDO"]) || (isDirectSap ? createdIso : null);
  const revisionIso = findLogIso(["EN_PROCESO", "PENDIENTE_FACTURACION", "APROBADO", "APROBADO_COMERCIAL", "RECHAZADO", "OBSERVADO", "EN_EDICION", "VISTO", "EMITIDO", "EMITIDO_SAP", "COMPLETADO", "PEDIDO_EMITIDO"]) || (isDirectSap ? createdIso : null);
  const finalIso = findLogIso(["APROBADO", "APROBADO_COMERCIAL", "RECHAZADO", "OBSERVADO", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO", "EMITIDO", "EMITIDO_SAP"]) || (isDirectSap ? createdIso : null);
  const observedIso = effectiveQuote.observedAt || findLogIso(["OBSERVADO", "EN_EDICION"]);

  // Estados de etapas del Stepper con colores vibrantes
  const isSolSent = ["ENVIADO", "EN_PROCESO", "PENDIENTE_FACTURACION", "APROBADO", "APROBADO_COMERCIAL", "RECHAZADO", "OBSERVADO", "EN_EDICION", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO", "EMITIDO", "EMITIDO_SAP"].includes(status) || isApprovedQuote || isDirectSap;
  const isObserved = status === "OBSERVADO" || status === "EN_EDICION";
  const isFinalApproved = ["APROBADO", "APROBADO_COMERCIAL", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO", "EMITIDO", "EMITIDO_SAP"].includes(status);
  const isFinalRejected = ["RECHAZADO", "ANULADO", "CANCELADO"].includes(status);
  const isFinalDone = isFinalApproved || isFinalRejected || isObserved;
  const isInReview = ["ENVIADO", "EN_PROCESO", "PENDIENTE_FACTURACION"].includes(status) && !isFinalDone;
  const isQuoteApproved = Boolean(
    isApprovedQuote ||
    isFinalApproved ||
    isAlreadySyncedToSap ||
    syncedDocNum ||
    effectiveQuote.sapDocNum ||
    effectiveQuote.totals?.sapDocNum
  );

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
          title: "Orden de Venta Emitida en SAP ✓",
          subtitle: "ETAPA FINAL: ORDEN DE VENTA EMITIDA EN SAP B1",
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
          desc: "Cotización aprobada exitosamente por Facturación / Administración. Stock en Almacén 014 y depósito validados.",
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
          desc: `La cotización está siendo evaluada por ${adminUsername || "Administración"} para verificar la coincidencia del depósito.`,
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
      : `Orden de Venta Aprobada y Concluida por ${adminUsername || "Facturación"}`;

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
      fromUsername: adminUsername || "admin", // ← del admin logueado
      quoteId: quote.docNumber || quote.id,
      quoteObj: { ...quote, approvalStatus: nextStatus, status: nextStatus },
      title: isCommercial ? `📢 Cotización Aprobada por Administrador` : `✅ Orden Aprobada (Aplicativo)`,
      description: isCommercial 
        ? `Cotización ${quote.docNumber || quote.id} aprobada y validada por el administrador. Lista para atención.`
        : `La orden ${quote.docNumber || quote.id} fue aprobada y concluida exitosamente en el aplicativo. Lista para sincronizar con SAP.`,
      status: nextStatus,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      read: false
    };
    localStorage.setItem("grupoLeon_notifications", JSON.stringify([newNotif, ...notifs]));
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    toast({
      title: isCommercial ? "✅ Cotización Aprobada" : "✅ Orden Aprobada",
      description: isCommercial 
        ? `Se validó y aprobó la cotización del vendedor ${sellerUsername || ""}.`
        : `Cotización aprobada y concluida como orden con éxito. Lista para enviar a SAP cuando desees.`,
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

    // Notificación al Administrador / Facturación — nueva revisión requerida
    const ADMIN_FACTURACION_USERNAME = "admin";
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
      description: `Cotización ${quoteId} reenviada a validación. El área de Facturación recibirá la notificación.`,
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
      fromUsername: adminUsername || "admin", // ← del admin logueado
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
        description: "Por motivos de seguridad, la carga automática a SAP está desactivada temporalmente. Por favor contacte al Administrador del sistema.",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "top-right"
      });
      return;
    }
    if (!effectiveQuote) return;

    // ─── Validación anti-duplicado en cliente: si ya cuenta con sapDocNum, no re-emitir ───
    if (isAlreadySyncedToSap || syncedDocNum) {
      toast({
        title: "✅ Ya Sincronizado en SAP B1",
        description: `Esta cotización ya cuenta con la Orden Oficial #${syncedDocNum || effectiveQuote.sapDocNum} en SAP. No es necesario re-emitirla.`,
        status: "info",
        duration: 5000,
        isClosable: true,
        position: "top-right"
      });
      return;
    }

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

      // 1. Extraer el SlpCode específico de la cotización
      const quoteOriginalSlp = Number(
        effectiveQuote.SlpCode
        ?? effectiveQuote.slpCode
        ?? effectiveQuote.salesPersonCode
        ?? effectiveQuote.salesEmployeeCode
        ?? effectiveQuote.totals?.SlpCode
        ?? effectiveQuote.totals?.slpCode
        ?? effectiveQuote.totals?.salesPersonCode
        ?? effectiveQuote.totals?.salesEmployeeCode
      );

      const originalSeller = effectiveQuote.sellerName 
        || effectiveQuote.totals?.sellerName 
        || effectiveQuote.createdByUsername 
        || effectiveQuote.totals?.createdByUsername;
        
      const originalCreatedBy = effectiveQuote.createdByUsername 
        || effectiveQuote.totals?.createdByUsername 
        || effectiveQuote.sellerName 
        || effectiveQuote.totals?.sellerName;

      // Si la cotización tiene un vendedor asignado propio (> 0 y != 20), ESE MANDA.
      let resolvedSlp = (!isNaN(quoteOriginalSlp) && quoteOriginalSlp > 0 && quoteOriginalSlp !== 20)
        ? quoteOriginalSlp
        : undefined;

      let resolvedSellerLabel = null;
      // Si no tenemos código numérico específico pero tenemos el nombre del vendedor, buscar en caché de vendedores de SAP:
      if (originalSeller && !originalSeller.toLowerCase().includes("ofic administración")) {
        try {
          const cachedSellers = JSON.parse(localStorage.getItem("cached_sap_sellers") || "[]");
          const cleanTarget = originalSeller.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const found = cachedSellers.find(s => {
            const cleanL = String(s.label || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return cleanL.includes(cleanTarget) || cleanTarget.includes(cleanL.replace(/^\d+\./, "").trim());
          });
          if (found && Number(found.value) > 0) {
            if (!resolvedSlp) resolvedSlp = Number(found.value);
            resolvedSellerLabel = found.label;
          }
        } catch (e) {}
      }

      // Si sigue sin resolverse, usar el de la cotización (aunque sea 20) o sesión
      if (!resolvedSlp) {
        resolvedSlp = (!isNaN(quoteOriginalSlp) && quoteOriginalSlp > 0)
          ? quoteOriginalSlp
          : ((authSalesCode && !isNaN(Number(authSalesCode)) && Number(authSalesCode) > 0) ? Number(authSalesCode) : (isAdminUser ? 20 : 20));
      }

      const sanitizedProducts = (displayProducts || []).map((p) => {
        const itemCode = p.productCode || p.itemCode || p.ItemCode || p.code || (typeof p.id === "string" && isNaN(Number(p.id)) ? p.id : undefined);
        const sigla = p.sigla || p.Sigla || p.U_TQC_SIGLA;
        const rawPrice = Number(p.unitPrice ?? p.price ?? p.Price ?? 0);
        const sapDisc = Number(p.sapDiscount ?? p.discount ?? p.Discount ?? 0);
        const promoDisc = Number(p.promoDiscount ?? p.PromoDiscount ?? 0);
        const addDisc = Number(p.lineDiscount ?? p.LineDiscount ?? 0);
        const totalDisc = Number(p.discountPercent ?? (sapDisc + promoDisc + addDisc));
        const valorDescLista = Number((rawPrice * (1 - sapDisc / 100)).toFixed(2));
        const descVenta = Number(Math.max(0, totalDisc - sapDisc).toFixed(2));

        return {
          ...p,
          productCode: itemCode || sigla,
          itemCode: itemCode || sigla,
          ItemCode: itemCode || sigla,
          code: itemCode || sigla,
          sigla: sigla || undefined,
          U_TQC_SIGLA: sigla || undefined,
          productName: p.productName || p.description || p.name || p.ItemDescription,
          description: p.productName || p.description || p.name || p.ItemDescription,
          unitPrice: rawPrice,
          price: rawPrice,
          sapDiscount: sapDisc,
          promoDiscount: promoDisc,
          lineDiscount: addDisc,
          discountPercent: totalDisc,
          DiscountPercent: totalDisc,
          U_TQC_DESL: sapDisc,
          U_TQC_DELP: valorDescLista,
          U_TQC_DESV: descVenta,
        };
      });

      const quotePayload = {
        ...effectiveQuote,
        sapDocNum: null,
        DocNum: null,
        forceEmit: true,
        clientDocument: effectiveQuote.clientDocument || effectiveQuote.clientRuc || effectiveQuote.client?.CardCode,
        clientName: effectiveQuote.clientName || effectiveQuote.client?.CardName,
        sellerName: resolvedSellerLabel || originalSeller || "Vendedor Autorizado",
        createdByUsername: originalCreatedBy || "vendedor",
        SlpCode: resolvedSlp,
        slpCode: resolvedSlp,
        salesPersonCode: resolvedSlp,
        salesEmployeeCode: resolvedSlp,
        deliveryForm: effectiveQuote.deliveryForm || effectiveQuote.selectedDeliveryForm,
        deliveryPoint: effectiveQuote.deliveryPoint || effectiveQuote.selectedPoint,
        shipToCode: effectiveQuote.deliveryPoint?.AddressName || effectiveQuote.selectedPoint?.AddressName || effectiveQuote.shipToCode || effectiveQuote.ShipToCode || undefined,
        transport: effectiveQuote.transport || effectiveQuote.selectedTransport || effectiveQuote.U_TQC_TRANSPOR,
        deliveryDate: effectiveQuote.deliveryDate || effectiveQuote.docDueDate,
        paymentType: effectiveQuote.paymentType || effectiveQuote.selectedPaymentType,
        paymentMethod: effectiveQuote.paymentMethod || effectiveQuote.PaymentMethod || null,
        bankAccount: effectiveQuote.bankAccount || effectiveQuote.U_VS_BANCO || null,
        sunatOpType: effectiveQuote.sunatOpType || effectiveQuote.U_VS_TIPO_FACT || "0101",
        U_VS_TIPOPER: effectiveQuote.U_VS_TIPOPER || "01",
        U_VS_TIPO_FACT: effectiveQuote.sunatOpType || effectiveQuote.U_VS_TIPO_FACT || "0101",
        U_VS_AFEDET: effectiveQuote.U_VS_AFEDET || "N",
        U_VS_BANCO: effectiveQuote.bankAccount || effectiveQuote.U_VS_BANCO || null,
        saleCondition: effectiveQuote.saleCondition || effectiveQuote.totals?.saleCondition,
        documentType: effectiveQuote.documentType || effectiveQuote.totals?.documentType || (String(effectiveQuote.clientDocument || effectiveQuote.clientRuc || effectiveQuote.client?.LicTradNum || "").replace(/\D/g, "").length === 11 ? "FACTURA" : "BOLETA"),
        creditTerm: effectiveQuote.creditTerm || effectiveQuote.totals?.creditTerm,
        isLetra: effectiveQuote.isLetra !== undefined ? effectiveQuote.isLetra : effectiveQuote.totals?.isLetra,
        opNum: effectiveQuote.opNum || effectiveQuote.totals?.opNum,
        refNumber: effectiveQuote.refNumber || effectiveQuote.totals?.refNumber || effectiveQuote.NumAtCard || null,
        contactPerson: effectiveQuote.contactPerson || effectiveQuote.totals?.contactPerson || effectiveQuote.ContactPerson || null,
        whsCode: effectiveQuote.whsCode || effectiveQuote.totals?.whsCode || "014",
        observations: effectiveQuote.observations || effectiveQuote.totals?.observations || null,
        products: sanitizedProducts.filter(p => {
          const isAgotado = p.isAgotado === true || p.isAgotado === 1 || p.isAgotado === "true" || p.isAgotado === "Y";
          const stk = p.stock !== undefined && p.stock !== null ? Number(p.stock) : (p.stockChecked ? 0 : 1);
          return !isAgotado && stk > 0;
        }),
        backOrderProducts: sanitizedProducts.filter(p => {
          const isAgotado = p.isAgotado === true || p.isAgotado === 1 || p.isAgotado === "true" || p.isAgotado === "Y";
          const stk = p.stock !== undefined && p.stock !== null ? Number(p.stock) : (p.stockChecked ? 0 : 1);
          return isAgotado || stk <= 0;
        }),
        comment: (() => {
          const raw = [
            effectiveQuote.comment,
            effectiveQuote.observations,
            effectiveQuote.totals?.comment,
            effectiveQuote.totals?.observations
          ].filter(Boolean)
           .map(s => String(s).trim())
           .filter(s => s && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined" && !s.toLowerCase().includes("cotización web null"))
           .filter((v, i, a) => a.indexOf(v) === i)
           .join(" | ");
          return raw || "";
        })(),
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
        database: sapData.CompanyDB || "SBO_AJUSTES_2025"
      });
      console.groupEnd();

      // Guardar detalle para el modal de éxito visual
      setSapSyncResult({
        quoteId: effectiveQuote.docNumber || effectiveQuote.id || quoteId,
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
        companyDB: sapData.CompanyDB || "SBO_AJUSTES_2025",
      });
      setIsSapSuccessModalOpen(true);

      // ─── Post-Emisión Oficial a SAP: Purgar de localStorage y sincronizar estado oficial en backend ───
      if (sapDocNum) {
        const targetDocNum = String(quotePayload.docNumber || effectiveQuote.docNumber || "");
        const targetId = String(quotePayload.id || effectiveQuote.id || "");
        const officialDocNumber = `COT-${String(sapDocNum).padStart(6, "0")}`;

        try {
          const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
          const updatedSaved = saved.filter(q => {
            const qDoc = String(q.docNumber || "");
            const qId = String(q.id || "");
            return qDoc !== targetDocNum && qId !== targetId && qDoc !== targetId && qId !== targetDocNum && qDoc !== officialDocNumber && qId !== officialDocNumber;
          });
          localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updatedSaved));
          window.dispatchEvent(new Event("localQuotesUpdated"));
        } catch (e) {}

        // Sincronizar en Backend con estado oficial EMITIDO y sapDocNum
        try {
          await updateQuote({
            ...effectiveQuote,
            ...quotePayload,
            id: officialDocNumber,
            docNumber: officialDocNumber,
            originalDocNumber: (targetDocNum && targetDocNum !== officialDocNumber) ? targetDocNum : undefined,
            state: "EMITIDO",
            status: "EMITIDO",
            approvalStatus: "EMITIDO",
            sapDocNum: Number(sapDocNum),
            DocNum: Number(sapDocNum),
            DocEntry: Number(sapDocEntry),
            isSapDirect: true,
          });
        } catch (e) {
          console.warn("⚠️ Aviso sincronizando estado emitido en servidor:", e.message);
        }

        // Notificar en tiempo real al Asesor de Ventas
        try {
          const sellerUsername = quotePayload.sellerName || quotePayload.createdByUsername || effectiveQuote.sellerName;
          const nowIso = new Date().toISOString();
          const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
          const newNotif = {
            id: `NOTIF-${Date.now()}`,
            targetRole: "VENDEDOR",
            targetUsername: sellerUsername,
            fromUsername: adminUsername || "Administrador",
            quoteId: officialDocNumber,
            quoteObj: {
              ...effectiveQuote,
              ...quotePayload,
              docNumber: officialDocNumber,
              state: "EMITIDO",
              status: "EMITIDO",
              approvalStatus: "EMITIDO",
              sapDocNum: Number(sapDocNum),
              isSapDirect: true,
            },
            title: `🎉 ¡Cotización ${officialDocNumber} Aprobada y Emitida a SAP!`,
            description: `Tu cotización fue aprobada directamente por ${adminUsername || "Administración"} y se generó la Orden Oficial SAP #${sapDocNum}.`,
            status: "EMITIDO",
            createdAt: nowIso,
            timestamp: nowIso,
            read: false
          };
          const cleanedNotifs = existingNotifs.filter(n => 
            String(n.quoteId || n.id) !== targetDocNum && 
            String(n.quoteId || n.id) !== targetId && 
            String(n.quoteId || n.id) !== officialDocNumber
          );
          cleanedNotifs.unshift(newNotif);
          localStorage.setItem("grupoLeon_notifications", JSON.stringify(cleanedNotifs));
          window.dispatchEvent(new Event("localNotificationsUpdated"));
        } catch (notifErr) {
          console.error("Error actualizando notificaciones locales:", notifErr);
        }

        // Notificar al componente padre para que la elimine de la pantalla de cotizaciones pendientes
        if (onDeleteQuote) {
          onDeleteQuote(targetDocNum || targetId, "EMITIDO");
        }

        // Limpiar React Query Cache para que desaparezca de la cola de pendientes inmediatamente
        queryClient.setQueriesData({ queryKey: ["quotes"] }, (old) => {
          if (!Array.isArray(old)) return [];
          return old.filter(q => {
            const qDoc = String(q.docNumber || "");
            const qId = String(q.id || "");
            return qDoc !== targetDocNum && qId !== targetId && qDoc !== targetId && qId !== targetDocNum;
          });
        });
        queryClient.invalidateQueries({ queryKey: ["quotes"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }

      const isAlreadySynced = Boolean(res.data?.alreadySynced || sapData.alreadySynced);
      if (isAlreadySynced) {
        toast({
          title: "ℹ️ Orden Existente en SAP B1",
          description: `La cotización ya se encontraba emitida oficialmente como Orden #${sapDocNum} en SAP B1.`,
          status: "info",
          duration: 6000,
          isClosable: true,
          position: "top-right"
        });
      } else {
        toast({
          title: "⚡ Orden de Venta Sincronizada con Éxito en SAP B1",
          description: `Se registró como Orden de Venta Oficial en SAP (DocNum: #${sapDocNum}, DocEntry: ${sapDocEntry}) en BD ${sapData.CompanyDB || "SBO_AJUSTES_2025"}.`,
          status: "success",
          duration: 7000,
          isClosable: true,
          position: "top-right",
        });
      }
    } catch (err) {
      console.error("Error sincronizando con SAP:", err);
      const sapErrMsg = err.response?.data?.error?.message?.value 
        || err.response?.data?.error?.message 
        || err.response?.data?.message 
        || (typeof err.response?.data === "string" ? err.response?.data : null)
        || err.message 
        || "No se pudo registrar la cotización en SAP.";

      const isRateError = typeof sapErrMsg === "string" && (
        sapErrMsg.toLowerCase().includes("tipo de cambio") || 
        sapErrMsg.toLowerCase().includes("exchange rate")
      );

      toast({
        title: isRateError ? "⚠️ Tipo de Cambio Requerido en SAP" : "Error al sincronizar con SAP",
        description: typeof sapErrMsg === "string" ? sapErrMsg : JSON.stringify(sapErrMsg),
        status: isRateError ? "warning" : "error",
        duration: 9000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsSyncingSap(false);
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
        <DrawerOverlay bg="blackAlpha.600" />
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
                      {Boolean(syncedDocNum || (effectiveQuote.sapDocNum && Number(effectiveQuote.sapDocNum) > 0) || (status === "EMITIDO" && effectiveQuote.docNumber && !String(effectiveQuote.docNumber).includes("WEB") && !String(effectiveQuote.docNumber).includes("PENDIENTE")))
                        ? (effectiveQuote.docNumber && String(effectiveQuote.docNumber).startsWith("COT-") && !String(effectiveQuote.docNumber).includes("WEB")
                            ? effectiveQuote.docNumber
                            : `COT-${String(syncedDocNum || effectiveQuote.sapDocNum).padStart(6, "0")}`)
                        : "COT-PENDIENTE (Al emitir a SAP)"}
                    </Heading>
                    {syncedDocNum && (
                      <Badge bg="emerald.900" color="emerald.100" border="1px solid" borderColor="emerald.300" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="900">
                        🏛️ SAP DocNum: #{syncedDocNum}
                      </Badge>
                    )}
                    {drawerLockCheck.hasActiveLock && (
                      <Badge
                        bg={drawerLockCheck.isOwnLock ? "#dcfce7" : "#fef3c7"}
                        color={drawerLockCheck.isOwnLock ? "#166534" : "#92400e"}
                        border="1.5px solid"
                        borderColor={drawerLockCheck.isOwnLock ? "#86efac" : "#fcd34d"}
                        fontSize="10.5px"
                        px={2.5}
                        py={0.5}
                        borderRadius="full"
                        fontWeight="900"
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                        boxShadow="xs"
                      >
                        <Lock className="w-3 h-3 flex-shrink-0" />
                        <Text as="span">
                          {drawerLockCheck.isOwnLock
                            ? "EN REVISIÓN (POR TI) 🔒"
                            : `EN REVISIÓN (${(drawerLockCheck.lockInfo?.lockedByUsername || "FACTURACIÓN").toUpperCase()}) 🔒`}
                        </Text>
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
            {/* 🔒 BANNER DE CONTROL DE CONCURRENCIA / LLAVECITA ACTIVA (SOLO LECTURA SI OTRO USUARIO LO TIENE BLOQUEADO) */}
            {drawerLockCheck.hasActiveLock && !drawerLockCheck.isOwnLock && (status === "ENVIADO" || status === "EN_PROCESO" || status === "PENDIENTE_APROBACION" || status === "PENDIENTE_FACTURACION") && (
              <Box bg="#fffbeb" p={3.5} borderRadius="xl" border="1.5px solid #fcd34d" boxShadow="xs" mb={4}>
                <Flex align="center" justify="space-between" wrap="wrap" gap={2}>
                  <HStack spacing={3}>
                    <Flex w="34px" h="34px" borderRadius="full" bg="#d97706" align="center" justify="center" color="white" flexShrink={0}>
                      <Lock className="w-4 h-4" />
                    </Flex>
                    <Box>
                      <HStack spacing={2} align="center">
                        <Text fontSize="xs" fontWeight="900" color="#92400e" textTransform="uppercase" letterSpacing="wide">
                          🔒 Cotización en Revisión por {drawerLockCheck.lockInfo?.lockedByUsername || "Facturación"}
                        </Text>
                        <Badge colorScheme="amber" variant="solid" fontSize="10px" borderRadius="full" px={2}>
                          Solo Lectura
                        </Badge>
                      </HStack>
                      <Text fontSize="11px" color="#78350f" fontWeight="600" mt={0.5}>
                        Facturación está revisando esta cotización en este momento. Los botones de modificación están temporalmente deshabilitados.
                      </Text>
                    </Box>
                  </HStack>
                  {isAdminUser && (
                    <Button
                      size="xs"
                      colorScheme="amber"
                      variant="outline"
                      leftIcon={<Unlock className="w-3.5 h-3.5" />}
                      onClick={() => {
                        forceUnlockQuote(quoteId);
                        acquireQuoteLock(quoteId, {
                          id: useAuthStore.getState().userId,
                          username: authUsername,
                          role: authRole,
                          endpoints: useAuthStore.getState().endpoints,
                          salesEmployeeCode: authSalesCode,
                          isAdmin: true
                        }, quote?.id && String(quote.id) !== String(quoteId) ? quote.id : null);
                        toast({
                          title: "🔓 Control Tomado",
                          description: "Has tomado el control exclusivo de la cotización.",
                          status: "info",
                          duration: 3000
                        });
                      }}
                      fontWeight="800"
                    >
                      Tomar Control
                    </Button>
                  )}
                </Flex>
              </Box>
            )}

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
                          Evaluada por {effectiveQuote.observedBy || adminUsername || "Administrador"} • Requiere corrección y reenvío
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

                  {!isAdminUser ? (
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
                  ) : (
                    <HStack justify="space-between" align="center" wrap="wrap" gap={2} pt={1}>
                      <Text fontSize="xs" color="#92400e" fontWeight="600">
                        ⏳ En espera de que el vendedor ({sellerName || "asignado"}) realice la corrección y reenvíe a validación.
                      </Text>
                      <Button
                        size="xs"
                        variant="outline"
                        colorScheme="orange"
                        borderColor="#f59e0b"
                        color="#b45309"
                        _hover={{ bg: "#fef3c7" }}
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
                        fontWeight="700"
                      >
                        Editar como Administrador
                      </Button>
                    </HStack>
                  )}
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
                            Evaluada por {adminUsername || "Administrador"} • Acción requerida para subsanar
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
                      🔒 Modo Vendedor ({sellerName || "Vendedor"}): Esta cotización está en proceso comercial. La evaluación está a cargo de Administración / Facturación.
                    </Text>
                  </HStack>
                </Box>
              )
            ) : status === "APROBADO" ? (
              (() => {
                const sapDoc = (isAlreadySyncedToSap && syncedDocNum) ? syncedDocNum : null;
                return (
                  <Box bg={sapDoc ? "teal.50" : "emerald.50"} p={4} borderRadius="xl" border="2px solid" borderColor={sapDoc ? "teal.500" : "emerald.500"} boxShadow="sm" mb={5}>
                    <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
                      <HStack spacing={3}>
                        <Flex w="36px" h="36px" borderRadius="full" bg={sapDoc ? "teal.500" : "emerald.500"} align="center" justify="center" color="white" flexShrink={0}>
                          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        </Flex>
                        <Box>
                          <Text fontSize="xs" fontWeight="900" color={sapDoc ? "teal.900" : "emerald.900"} textTransform="uppercase">
                            {sapDoc ? `🔒 4. Orden de Venta SAP Registrada (DocNum: #${syncedDocNum || ""})` : "✅ 4. Orden Aprobada (Interna)"}
                          </Text>
                          <Text fontSize="11px" color={sapDoc ? "teal.800" : "emerald.800"} fontWeight="600">
                            {sapDoc
                              ? `Registrado y sincronizado oficialmente en SAP Service Layer.`
                              : `Aprobado internamente por ${adminUsername || "Administrador"}. Si fue un error o prueba, puedes anularlo o devolverlo a borrador.`}
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
                          {sapDoc ? "ORDEN DE VENTA EMITIDA EN SAP" : "ORDEN APROBADA"}
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
                <Flex direction={{ base: "column", md: "row" }} align={{ base: "stretch", md: "center" }} justify="space-between" gap={3}>
                  <HStack spacing={3} align="flex-start" flex="1" minW="0">
                    <Flex w="36px" h="36px" borderRadius="full" bg="#2563eb" align="center" justify="center" color="white" flexShrink={0} mt={0.5}>
                      <Edit3 className="w-5 h-5 stroke-[2.5]" />
                    </Flex>
                    <Box flex="1" minW="0">
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
                    flexShrink={0}
                    whiteSpace="nowrap"
                    alignSelf={{ base: "stretch", md: "center" }}
                    onClick={() => {
                      onClose();
                      const quoteToLoad = effectiveQuote || quote;
                      if (typeof useQuoteStore.getState().loadQuote === "function") {
                        useQuoteStore.getState().loadQuote(quoteToLoad);
                      } else if (typeof useQuoteStore.getState().setQuoteData === "function") {
                        useQuoteStore.getState().setQuoteData(quoteToLoad);
                      }
                      sessionStorage.removeItem("admin_force_edit");
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
            ) : ((status === "ENVIADO" || status === "EN_PROCESO" || status === "PENDIENTE_APROBACION" || status === "PENDIENTE_FACTURACION") && isAdminUser) ? (
              <Box bg="#f0fdf4" p={{ base: 3.5, md: 4 }} borderRadius="xl" border="1.5px solid" borderColor="#86efac" boxShadow="sm" mb={4}>
                <Flex direction={{ base: "column", md: "row" }} align={{ base: "stretch", md: "center" }} justify="space-between" gap={3}>
                  <HStack spacing={3} align="flex-start" flex="1" minW="0">
                    <Flex w="36px" h="36px" borderRadius="full" bg="#16a34a" align="center" justify="center" color="white" flexShrink={0} mt={0.5}>
                      <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                    </Flex>
                    <Box flex="1" minW="0">
                      <Text fontSize="xs" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wide">
                        🔍 Verificación Comercial y Control de Calidad
                      </Text>
                      <Text fontSize="11px" color="gray.700" fontWeight="600" mt={0.5}>
                        {status === "PENDIENTE_FACTURACION"
                          ? `Valida el voucher y depósito ingresados por ${sellerName} antes de emitir en SAP.`
                          : `Cotización enviada por ${sellerName}. Abre el formulario para revisarla, aprobar y emitir a SAP o devolver con observaciones.`}
                      </Text>
                      {drawerLockCheck.hasActiveLock && (
                        <Badge
                          bg={drawerLockCheck.isOwnLock ? "#dcfce7" : "#fef3c7"}
                          color={drawerLockCheck.isOwnLock ? "#166534" : "#92400e"}
                          border="1px solid"
                          borderColor={drawerLockCheck.isOwnLock ? "#86efac" : "#fcd34d"}
                          mt={1.5}
                          fontSize="10px"
                          px={2}
                          py={0.5}
                          borderRadius="md"
                          fontWeight="800"
                          display="inline-flex"
                          alignItems="center"
                          gap={1}
                        >
                          <Lock className="w-3 h-3 flex-shrink-0" />
                          <Text as="span">
                            {drawerLockCheck.isOwnLock
                              ? "Tienes el candado activo de revisión de esta cotización"
                              : `En revisión por ${drawerLockCheck.lockInfo?.lockedByUsername} (${drawerLockCheck.lockInfo?.lockedByProfile || "Facturación"})`}
                          </Text>
                        </Badge>
                      )}
                    </Box>
                  </HStack>
                  <HStack spacing={2} flexShrink={0} alignSelf={{ base: "stretch", md: "center" }} wrap="wrap">
                    <Button
                      size="sm"
                      colorScheme="orange"
                      bg="#ea580c"
                      _hover={{ bg: "#c2410c" }}
                      leftIcon={<MessageSquare className="w-4 h-4" />}
                      whiteSpace="nowrap"
                      onClick={() => setIsObserveModalOpen(true)}
                      fontWeight="800"
                      borderRadius="lg"
                      px={3.5}
                      h="38px"
                      boxShadow="xs"
                    >
                      💬 Devolver con Observación
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="teal"
                      bg="#0f766e"
                      _hover={{ bg: "#115e59" }}
                      leftIcon={<Edit3 className="w-4 h-4" />}
                      whiteSpace="nowrap"
                      isDisabled={isDrawerLockedByOther && !isAdminUser}
                      onClick={() => {
                        onClose();
                        const quoteToLoad = effectiveQuote || quote;
                        if (typeof useQuoteStore.getState().loadQuote === "function") {
                          useQuoteStore.getState().loadQuote(quoteToLoad);
                        } else if (typeof useQuoteStore.getState().setQuoteData === "function") {
                          useQuoteStore.getState().setQuoteData(quoteToLoad);
                        }
                        sessionStorage.removeItem("admin_force_edit");
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
                  </HStack>
                </Flex>
              </Box>
            ) : (status === "EMITIDO" || status === "EMITIDO_SAP" || isAlreadySyncedToSap) ? (
              <Box bg="teal.50" p={4} borderRadius="xl" border="2px solid" borderColor="teal.500" boxShadow="sm" mb={5}>
                <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
                  <HStack spacing={3} flex="1" minW="0">
                    <Flex w="36px" h="36px" borderRadius="full" bg="teal.500" align="center" justify="center" color="white" flexShrink={0}>
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    </Flex>
                    <Box minW="0">
                      <Text fontSize="xs" fontWeight="900" color="teal.900" textTransform="uppercase">
                        🔒 4. Oferta / Pedido SAP Registrado{syncedDocNum ? ` (DocNum: #${syncedDocNum})` : ""}
                      </Text>
                      <Text fontSize="11px" color="teal.800" fontWeight="600">
                        Registrado y sincronizado oficialmente en SAP Service Layer.
                      </Text>
                    </Box>
                  </HStack>
                  <Badge colorScheme="teal" variant="solid" px={3} py={1} borderRadius="full" fontSize="xs">
                    EMITIDO EN SAP
                  </Badge>
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
                        const approvalLog = Array.isArray(historyLog)
                          ? historyLog.find(l => ["APROBADO", "APROBADO_COMERCIAL", "EMITIDO", "RECHAZADO", "OBSERVADO"].includes(l.status))
                          : null;
                        const name = effectiveQuote.approvedBy || effectiveQuote.evaluatedBy || approvalLog?.user || (Array.isArray(historyLog) && historyLog[0]?.user) || adminUsername || "Administrador";
                        const profile = effectiveQuote.approvedByRole || effectiveQuote.evaluatedByRole || approvalLog?.role || approvalLog?.userProfile || resolveUserProfileTitle(authRole, useAuthStore.getState().endpoints, name);
                        return `${name} (${profile})`;
                      })()}</Text>
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
              const cleanDigits = String(currentQuote.clientDocument || currentQuote.clientRuc || currentQuote.client?.FederalTaxID || currentQuote.client?.LicTradNum || "").replace(/\D/g, "");
              const isJuridica = cleanDigits.startsWith("20") || /\b(S\.?A\.?C\.?|S\.?R\.?L\.?|E\.?I\.?R\.?L\.?|S\.?A\.?|S\.?A\.?A\.?|SOCIEDAD|CONSORCIO|EMPRESA|CORPORACION|DISTRIBUIDORA)\b/i.test(currentQuote.clientName || currentQuote.client?.CardName || "");
              const docTypeVal = currentQuote.documentType || currentQuote.totals?.documentType || currentQuote.U_VS_COMPROBANTE || (isJuridica || cleanDigits.length === 11 ? "FACTURA" : "BOLETA");
              const sunatType = formatSunatOp(currentQuote.sunatOpType || currentQuote.U_VS_TIPO_FACT || currentQuote.U_VS_TIPOPER);

              // 3. Váucher / Operación (Si se adjuntó comprobante prepago)
              const opNumber = currentQuote.opNum || currentQuote.U_VS_OPNUM || currentQuote.voucherNumber || null;
              const voucherImage = currentQuote.pathImg || currentQuote.paymentImg || currentQuote.voucherUrl;

              // 4. Logística y Despacho
              const rawDelivForm = currentQuote.selectedDeliveryForm || currentQuote.deliveryForm;
              const delivForm = formatDeliveryForm(rawDelivForm);
              const rawTransport = currentQuote.selectedTransport || currentQuote.transport || currentQuote.U_TQC_TRANSPOR;
              const transportName = formatTransportName(rawTransport, rawDelivForm);
              const rawTransportDir = currentQuote.transportDirection || (typeof rawTransport === "object" ? rawTransport?.U_TQC_DIREC : null);
              const transportDir = formatTransportAddress(rawTransport, rawDelivForm, rawTransportDir);
              const rawPoint = currentQuote.selectedPoint || currentQuote.deliveryPoint;
              const delivAddress = formatDeliveryPoint(rawPoint, currentQuote.clientAddress || (currentQuote.client?.Address || currentQuote.client?.address));

              const quoteAttachments = currentQuote.attachments || [];

              return (
                <>
                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={3.5} mb={3.5}>
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

                        {Boolean(opNumber) && (
                          <Flex justify="space-between">
                            <Text color="gray.500" fontWeight="700">Operación:</Text>
                            <Text fontWeight="800" color="purple.600" fontFamily="mono" textAlign="right" isTruncated maxW="190px">
                              {opNumber}
                            </Text>
                          </Flex>
                        )}
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
                      {transportDir && transportDir !== "-" && (
                        <Flex justify="space-between">
                          <Text color="gray.500" fontWeight="700">Dir. Agencia:</Text>
                          <Text fontWeight="800" color="gray.700" textAlign="right" isTruncated maxW="190px" title={transportDir}>{transportDir}</Text>
                        </Flex>
                      )}
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
                </Grid>
              </>
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
              const targetDoc = effectiveQuote || quote;
              const quoteProducts = targetDoc?.products || targetDoc?.items || targetDoc?.totals?.products || targetDoc?.totals?.normalizedProducts || [];
              const maxAdicDiscount = quoteProducts.reduce((max, it) => {
                const adic = Number(it.lineDiscount ?? it.LineDiscount ?? it.additionalDiscount ?? it.U_TQC_DESV ?? 0);
                return Math.max(max, adic);
              }, Number(targetDoc?.maxDiscount || targetDoc?.totals?.maxDiscount || 0));
              const hasAdditionalDiscount = 
                maxAdicDiscount > 0 || 
                Boolean(targetDoc?.hasAdditionalDiscount) || 
                Boolean(targetDoc?.totals?.hasAdditionalDiscount) || 
                Boolean(targetDoc?.totals?.hasDiscount) || 
                Boolean(targetDoc?.totals?.requiresDiscountApproval) ||
                Number(targetDoc?.headerDiscount || targetDoc?.DiscountPercent || targetDoc?.discountPercent || 0) > 0;

              if (!hasAdditionalDiscount) return null;

              return (
                <Box
                  p={4}
                  bg={isQuoteApproved ? "emerald.50" : "purple.50"}
                  border="2px solid"
                  borderColor={isQuoteApproved ? "emerald.300" : "purple.300"}
                  borderRadius="2xl"
                  boxShadow="sm"
                  mb={2}
                >
                  <HStack spacing={3.5} align="flex-start">
                    <Box fontSize="24px" lineHeight="1">{isQuoteApproved ? "✅" : "⚡"}</Box>
                    <VStack align="stretch" spacing={1}>
                      <HStack spacing={2} wrap="wrap">
                        <Text fontSize="13px" fontWeight="900" color={isQuoteApproved ? "emerald.900" : "purple.900"} textTransform="uppercase">
                          Cotización con Descuento Adicional Aplicado
                        </Text>
                        <Badge
                          colorScheme={isQuoteApproved ? "green" : "purple"}
                          variant="solid"
                          fontSize="10px"
                          px={2.5}
                          py={0.5}
                          borderRadius="full"
                        >
                          {isQuoteApproved ? "✅ Aprobación Comercial Otorgada" : "⚠️ Requiere Aprobación Comercial"}
                        </Badge>
                      </HStack>
                      <Text fontSize="12px" color={isQuoteApproved ? "emerald.800" : "purple.800"} fontWeight="600">
                        {isQuoteApproved
                          ? "El asesor de ventas aplicó descuentos especiales que fueron aprobados comercialmente y consolidados en el documento oficial."
                          : "El asesor de ventas aplicó descuentos especiales por encima de la tarifa de lista SAP. Revise los porcentajes individuales por artículo en la grilla inferior antes de emitir la aprobación en SAP."
                        }
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              );
            })()}

            {/* CARD DE ALERTA FINANCIERA: CLIENTE CON DEUDA REGISTRADA */}
            {(() => {
              const targetDoc = effectiveQuote || quote;
              const hasDebt = Boolean(targetDoc?.hasDebt || targetDoc?.hasOverdueDebt || targetDoc?.totals?.hasDebt || targetDoc?.totals?.hasOverdueDebt);
              const debtSummary = targetDoc?.debtSummary || targetDoc?.totals?.debtSummary;
              if (!hasDebt && !debtSummary) return null;

              return (
                <Box
                  p={4}
                  bg="red.50"
                  border="2px solid"
                  borderColor="red.300"
                  borderRadius="2xl"
                  boxShadow="sm"
                  mb={3.5}
                >
                  <HStack spacing={3.5} align="flex-start">
                    <Box fontSize="24px" lineHeight="1">⚠️</Box>
                    <VStack align="stretch" spacing={1}>
                      <HStack spacing={2} wrap="wrap">
                        <Text fontSize="13px" fontWeight="900" color="red.900" textTransform="uppercase">
                          Observación Financiera: Cliente con Deuda
                        </Text>
                        <Badge colorScheme="red" variant="solid" bg="#dc2626" color="white" fontSize="10px" px={2.5} py={0.5} borderRadius="full">
                          {targetDoc?.hasOverdueDebt || targetDoc?.totals?.hasOverdueDebt ? "DEUDA VENCIDA" : "SALDO PENDIENTE"}
                        </Badge>
                      </HStack>
                      <Text fontSize="12px" color="red.800" fontWeight="700">
                        {debtSummary || "El cliente registra saldos pendientes o cuotas vencidas en SAP / Cobranzas."}
                      </Text>
                      <Text fontSize="11px" color="red.700" fontWeight="500">
                        Verifique el estado financiero del cliente y sus acuerdos de pago antes de autorizar el pedido en SAP.
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              );
            })()}

            {/* SECCIÓN 1: ARTÍCULOS COTIZADOS (DOS TABLAS SEPARADAS: CON STOCK Y DEMANDA BACK ORDER DEBAJO) */}
            {(() => {
              const inStockProducts = displayProducts.filter(it => !getItemStockInfo(it).isOutOfStock);
              const outOfStockProducts = displayProducts.filter(it => getItemStockInfo(it).isOutOfStock);

              return (
                <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm" overflow="hidden" mb={5}>
                  {/* CABECERA GENERAL */}
                  <Flex justify="space-between" align="center" mb={3} gap={2} wrap="wrap">
                    <HStack spacing={2}>
                      <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="900" color="gray.800" textTransform="uppercase" letterSpacing="wide">
                        ARTÍCULOS COTIZADOS
                      </Text>
                      <Badge colorScheme="blue" variant="solid" borderRadius="full" fontSize="10px" px={2.5}>
                        {displayProducts.length} {displayProducts.length === 1 ? "Item" : "Items"}
                      </Badge>
                      {outOfStockProducts.length > 0 && (
                        <Badge colorScheme="red" bg="#fee2e2" color="#991b1b" border="1px solid #fca5a5" borderRadius="full" fontSize="10px" px={2.5} py={0.5} fontWeight="900">
                          ⚠️ {outOfStockProducts.length} Sin Stock (Back Order)
                        </Badge>
                      )}
                    </HStack>
                  </Flex>

                  {/* TABLA 1: ARTÍCULOS COTIZADOS CON STOCK DISPONIBLE */}
                  {inStockProducts.length === 0 ? (
                    <Box p={4} textAlign="center" bg="gray.50" borderRadius="xl" border="1px dashed" borderColor="gray.300" mb={3}>
                      <Text fontSize="xs" color="gray.500" fontWeight="700">
                        Esta cotización no contiene artículos con stock físico disponible para facturación inmediata.
                      </Text>
                    </Box>
                  ) : (
                    <Box mb={outOfStockProducts.length > 0 ? 3 : 0}>
                      {/* Vista Móvil Tabla 1 */}
                      <Box display={{ base: "block", md: "none" }}>
                        <VStack align="stretch" spacing={3}>
                          {inStockProducts.map((item, idx) => {
                            const qty = Number(item.quantity ?? 1);
                            const sapDisc = Number(item.sapDiscount ?? item.discount ?? 0);
                            const promoDisc = Number(item.promoDiscount ?? 0);
                            let addDisc = Number(item.lineDiscount ?? 0);
                            const maxAllowedCeiling = qty > 100 ? 65 : 55;
                            const totalDisc = Number(item.discountPercent ?? Math.min(maxAllowedCeiling, Math.max(0, sapDisc + promoDisc + addDisc)));
                            if (addDisc === 0 && (sapDisc + promoDisc) > 0 && Math.abs(totalDisc - (sapDisc + promoDisc)) > 0.01) {
                              addDisc = Number((totalDisc - (sapDisc + promoDisc)).toFixed(2));
                            }
                            const isVolume = qty > 100 && totalDisc > 55;
                            const reqAppr = totalDisc > 50.009 || isVolume;
                            const isHigherMargin = addDisc < 0;

                            return (
                              <Box
                                key={`m-in-${idx}`}
                                p={3}
                                bg="gray.50"
                                borderRadius="xl"
                                border="1px solid"
                                borderColor={isVolume ? "orange.300" : promoDisc > 0 ? "amber.300" : "gray.200"}
                              >
                                <Flex justify="space-between" align="start" gap={2} mb={1}>
                                  <Badge colorScheme="blue" variant="solid" fontSize="10px" borderRadius="md" px={1.5} fontFamily="mono">
                                    {item.itemCode || item.code || item.id || "ART"}
                                  </Badge>
                                  <Text fontSize="xs" fontWeight="900" color="emerald.900" fontFamily="mono">
                                    ${formatThousands(item.lineTotal)}
                                  </Text>
                                </Flex>
                                <VStack align="start" spacing={1} mb={1.5}>
                                  <Text fontSize="12px" fontWeight="700" color="gray.900">
                                    {item.description || item.ItemDescription || item.name || "Artículo"}
                                  </Text>
                                  {promoDisc > 0 && (
                                    <Badge bg="amber.400" color="amber.950" fontSize="9px" px={1.5} py={0.2} borderRadius="md" fontWeight="900">
                                      🏷️ {(item.campaignName || "OFERTA DEL MES").toUpperCase()}: -{promoDisc}% EXTRA
                                    </Badge>
                                  )}
                                  {isVolume && (
                                    <Badge bg="#ea580c" color="white" fontSize="9px" px={1.5} py={0.2} borderRadius="md" fontWeight="900">
                                      🔥 MAYOREO ESPECIAL ({totalDisc}%)
                                    </Badge>
                                  )}
                                </VStack>

                                <Grid templateColumns={promoDisc > 0 ? "repeat(4, 1fr)" : "repeat(3, 1fr)"} gap={1} fontSize="10px" bg="white" p={2} borderRadius="lg" border="1px solid" borderColor="gray.200" mb={1.5}>
                                  <Box textAlign="center">
                                    <Text color="gray.500" fontWeight="700">Desc. SAP</Text>
                                    <Badge colorScheme="green" fontSize="9px">{sapDisc}%</Badge>
                                  </Box>
                                  {promoDisc > 0 && (
                                    <Box textAlign="center" borderLeft="1px solid" borderColor="gray.200">
                                      <Text color="gray.500" fontWeight="700">Promo</Text>
                                      <Badge colorScheme="amber" bg="amber.100" color="amber.900" fontSize="9px">-{promoDisc}%</Badge>
                                    </Box>
                                  )}
                                  <Box textAlign="center" borderLeft="1px solid" borderRight="1px solid" borderColor="gray.200">
                                    <Text color="gray.500" fontWeight="700">
                                      {addDisc < 0 ? "Margen" : "Desc. Adic."}
                                    </Text>
                                    <Badge
                                      colorScheme={addDisc > 0 ? "purple" : addDisc < 0 ? "green" : "gray"}
                                      bg={addDisc < 0 ? "emerald.100" : undefined}
                                      color={addDisc < 0 ? "emerald.900" : undefined}
                                      fontSize="9px"
                                    >
                                      {addDisc > 0 ? `+${addDisc}%` : addDisc < 0 ? `${addDisc}%` : "0%"}
                                    </Badge>
                                  </Box>
                                  <Box textAlign="center">
                                    <Text color="gray.500" fontWeight="700">Desc. Total</Text>
                                    <Badge colorScheme={isVolume ? "orange" : "blue"} fontSize="9px" fontWeight="900">{totalDisc}%</Badge>
                                  </Box>
                                </Grid>

                                <Flex justify="space-between" align="center" fontSize="11px" color="gray.600" pt={1.5} borderTop="1px dashed" borderColor="gray.200" wrap="wrap" gap={1}>
                                  <Text>Cant: <Text as="span" fontWeight="800" color="gray.900">{item.quantity} uds</Text></Text>
                                  <Text>
                                    P. Unit:{" "}
                                    {totalDisc > 0 ? (
                                      <Text as="span">
                                        <Text as="s" color="gray.400" fontSize="10px" mr={1}>${formatThousands(item.price)}</Text>
                                        <Text as="span" fontWeight="950" color="#047857">
                                          ${formatThousands(Number(item.discountedUnitPrice ?? (item.price * (1 - totalDisc / 100))))}
                                        </Text>
                                        <Text as="span" fontSize="9px" color="gray.500" fontWeight="700"> /u</Text>
                                      </Text>
                                    ) : (
                                      <Text as="span" fontWeight="800" color="gray.900">${formatThousands(item.price)} /u</Text>
                                    )}
                                  </Text>
                                  <Badge
                                    colorScheme={
                                      isQuoteApproved
                                        ? "green"
                                        : isFinalRejected
                                        ? (reqAppr ? "red" : "gray")
                                        : isObserved
                                        ? (reqAppr ? "yellow" : "gray")
                                        : isVolume
                                        ? "orange"
                                        : reqAppr
                                        ? "orange"
                                        : "green"
                                    }
                                    fontSize="9px"
                                    px={1.5}
                                    borderRadius="md"
                                    fontWeight="800"
                                  >
                                    {isQuoteApproved
                                      ? (reqAppr ? "✅ Aprobado" : "🟢 Estándar")
                                      : isFinalRejected
                                      ? (reqAppr ? "❌ Rechazado" : "⚪ Estándar")
                                      : isObserved
                                      ? (reqAppr ? "⚠️ Observado" : "🟢 Estándar")
                                      : isVolume
                                      ? "🔥 Mayoreo"
                                      : reqAppr
                                      ? "⚠️ Req. Aprobación"
                                      : isHigherMargin
                                      ? "✨ Mayor Margen"
                                      : "🟢 Estándar"}
                                  </Badge>
                                </Flex>
                              </Box>
                            );
                          })}
                        </VStack>
                      </Box>

                      {/* Vista Escritorio Tabla 1 */}
                      <Box display={{ base: "none", md: "block" }}>
                        <TableContainer border="1px solid" borderColor="gray.200" borderRadius="lg" overflowX="auto">
                          <Table variant="simple" size="sm">
                            <Thead bg="gray.50">
                              <Tr>
                                <Th fontSize="10px" color="gray.600" px={2.5}>Código</Th>
                                <Th fontSize="10px" color="gray.600" px={2.5}>Descripción</Th>
                                <Th fontSize="10px" textAlign="right" color="gray.600" px={2}>Cant.</Th>
                                <Th fontSize="10px" textAlign="right" color="gray.600" px={2}>Precio Unitario</Th>
                                <Th fontSize="10px" textAlign="center" color="gray.600" px={2}>Desc. SAP</Th>
                                <Th fontSize="10px" textAlign="center" color="gray.600" px={2}>Desc. Adic.</Th>
                                <Th fontSize="10px" textAlign="center" color="gray.600" px={2}>Desc. Total</Th>
                                <Th fontSize="10px" textAlign="center" color="gray.600" px={2}>¿Aprobación?</Th>
                                <Th fontSize="10px" textAlign="right" color="gray.600" px={2.5}>Total (USD)</Th>
                              </Tr>
                            </Thead>
                            <Tbody fontSize="xs">
                              {inStockProducts.map((item, idx) => {
                                const qty = Number(item.quantity ?? 1);
                                const sapDisc = Number(item.sapDiscount ?? item.discount ?? 0);
                                const promoDisc = Number(item.promoDiscount ?? 0);
                                let addDisc = Number(item.lineDiscount ?? 0);
                                const maxAllowedCeiling = qty > 100 ? 65 : 55;
                                const totalDisc = Number(item.discountPercent ?? Math.min(maxAllowedCeiling, Math.max(0, sapDisc + promoDisc + addDisc)));
                                if (addDisc === 0 && (sapDisc + promoDisc) > 0 && Math.abs(totalDisc - (sapDisc + promoDisc)) > 0.01) {
                                  addDisc = Number((totalDisc - (sapDisc + promoDisc)).toFixed(2));
                                }
                                const isVolume = qty > 100 && totalDisc > 55;
                                const reqAppr = totalDisc > 50.009 || isVolume;
                                const isHigherMargin = addDisc < 0;

                                return (
                                  <Tr key={`in-${idx}`} _hover={{ bg: "gray.50" }}>
                                    <Td fontWeight="800" color="gray.700" fontFamily="mono" px={2.5}>{item.itemCode || item.code || item.id || "ART"}</Td>
                                    <Td fontWeight="600" color="gray.900" px={2.5} minW="160px" whiteSpace="normal">
                                      <VStack align="start" spacing={1}>
                                        <Text>{item.description || item.ItemDescription || item.name || "Artículo"}</Text>
                                        {promoDisc > 0 && (
                                          <Badge bg="amber.400" color="amber.950" fontSize="9px" px={1.5} py={0.2} borderRadius="md" fontWeight="900">
                                            🏷️ {(item.campaignName || "OFERTA DEL MES").toUpperCase()}: -{promoDisc}% EXTRA
                                          </Badge>
                                        )}
                                        {isVolume && (
                                          <Badge bg="#ea580c" color="white" fontSize="9px" px={1.5} py={0.2} borderRadius="md" fontWeight="900">
                                            🔥 MAYOREO ESPECIAL ({totalDisc}%)
                                          </Badge>
                                        )}
                                      </VStack>
                                    </Td>
                                    <Td textAlign="right" fontWeight="800" px={2}>{item.quantity}</Td>
                                    <Td textAlign="right" px={2}>
                                      {totalDisc > 0 ? (
                                        <VStack align="flex-end" spacing={0}>
                                          <HStack spacing={1} justify="flex-end">
                                            <Text fontSize="9px" color="gray.400" fontWeight="600">Antes:</Text>
                                            <Text as="s" fontSize="10px" color="gray.400" fontWeight="600" title="Precio original de lista SAP">
                                              ${formatThousands(item.price)}
                                            </Text>
                                          </HStack>
                                          <HStack spacing={0.5} align="baseline" justify="flex-end">
                                            <Text fontWeight="950" fontSize="12px" color="#047857" title="Precio neto unitario con descuento">
                                              ${formatThousands(Number(item.discountedUnitPrice ?? (item.price * (1 - totalDisc / 100))))}
                                            </Text>
                                            <Text fontSize="9px" color="gray.500" fontWeight="700">
                                              /u
                                            </Text>
                                          </HStack>
                                        </VStack>
                                      ) : (
                                        <HStack spacing={0.5} justify="flex-end" align="baseline">
                                          <Text fontWeight="800" fontSize="xs" color="gray.800">
                                            ${formatThousands(item.price)}
                                          </Text>
                                          <Text fontSize="9px" color="gray.500" fontWeight="700">
                                            /u
                                          </Text>
                                        </HStack>
                                      )}
                                    </Td>
                                    <Td textAlign="center" px={2}>
                                      <Badge colorScheme="green" fontSize="10px" px={1.5}>{sapDisc}%</Badge>
                                    </Td>
                                    <Td textAlign="center" px={2}>
                                      <VStack spacing={0.5}>
                                        {promoDisc > 0 && (
                                          <Badge colorScheme="amber" bg="amber.100" color="amber.900" fontSize="9px" px={1.5}>
                                            Promo -{promoDisc}%
                                          </Badge>
                                        )}
                                        <Badge
                                          colorScheme={addDisc > 0 ? "purple" : addDisc < 0 ? "green" : "gray"}
                                          fontSize="10px"
                                          px={1.5}
                                          py={0.5}
                                          borderRadius="md"
                                          title={addDisc < 0 ? `Mayor margen comercial (${addDisc}%).` : undefined}
                                        >
                                          {addDisc > 0 ? `+${addDisc}%` : addDisc < 0 ? `${addDisc}%` : "0%"}
                                        </Badge>
                                      </VStack>
                                    </Td>
                                    <Td textAlign="center" fontWeight="900" px={2}>
                                      <Badge colorScheme={isVolume ? "orange" : "blue"} fontSize="10px" px={1.5} fontWeight="900">
                                        {totalDisc}%
                                      </Badge>
                                    </Td>
                                    <Td textAlign="center" px={2}>
                                      <Badge
                                        colorScheme={
                                          isQuoteApproved
                                            ? "green"
                                            : isFinalRejected
                                            ? (reqAppr ? "red" : "gray")
                                            : isObserved
                                            ? (reqAppr ? "yellow" : "gray")
                                            : isVolume
                                            ? "orange"
                                            : reqAppr
                                            ? "orange"
                                            : "green"
                                        }
                                        fontSize="10px"
                                        px={2}
                                        py={0.5}
                                        borderRadius="full"
                                        fontWeight="800"
                                      >
                                        {isQuoteApproved
                                          ? (reqAppr ? "✅ APROBADO" : "🟢 NO")
                                          : isFinalRejected
                                          ? (reqAppr ? "❌ RECHAZADO" : "⚪ NO")
                                          : isObserved
                                          ? (reqAppr ? "⚠️ OBSERVADO" : "🟢 NO")
                                          : isVolume
                                          ? "🔥 MAYOREO (HASTA 65%)"
                                          : reqAppr
                                          ? "⚠️ REQUIERE"
                                          : "🟢 NO"}
                                      </Badge>
                                    </Td>
                                    <Td textAlign="right" fontWeight="850" color="emerald.900" fontFamily="mono" px={2.5}>
                                      ${formatThousands(item.lineTotal)}
                                    </Td>
                                  </Tr>
                                );
                              })}
                            </Tbody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </Box>
                  )}

                  {/* TABLA 2: ARTÍCULOS SIN STOCK (DEMANDA BACK ORDER) - SEPARADA DEBAJO NOMÁS */}
                  {outOfStockProducts.length > 0 && (
                    <Box mt={4} pt={1}>
                      {/* CABECERA DE DEMANDA BACK ORDER (Diseño Responsivo Antidesbordamiento) */}
                      <Box mb={2} p={{ base: 2.5, md: 2 }} bg="#fff5f5" borderRadius="lg" border="1px solid #fecaca">
                        <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={1}>
                          <Badge colorScheme="red" variant="solid" bg="#dc2626" color="white" fontSize="10px" px={2.5} py={0.5} borderRadius="full" fontWeight="900">
                            ⚠️ CÓDIGOS SIN STOCK (DEMANDA BACK ORDER)
                          </Badge>
                          <Badge colorScheme="red" bg="#fee2e2" color="#991b1b" border="1px solid #fca5a5" fontSize="10px" fontWeight="900" px={2.5} py={0.5} borderRadius="full">
                            {outOfStockProducts.length} {outOfStockProducts.length === 1 ? "artículo" : "artículos"}
                          </Badge>
                        </Flex>
                        <Text fontSize={{ base: "11px", md: "11.5px" }} color="#991b1b" fontWeight="600" lineHeight="1.4">
                          Almacén 014 • Registrados para Importaciones (no se facturan ni suman al total de la cotización)
                        </Text>
                      </Box>

                      {/* Vista Móvil Tabla 2 */}
                      <Box display={{ base: "block", md: "none" }}>
                        <VStack align="stretch" spacing={2.5}>
                          {outOfStockProducts.map((p, idx) => {
                            const pCode = p.itemCode || p.code || p.id || p.productCode || "ART";
                            const pName = p.description || p.ItemDescription || p.name || p.productName || "Artículo Sin Stock";
                            const qty = Number(p.quantity ?? 1);

                            return (
                              <Box key={`m-out-${idx}`} p={3} bg="#fff5f5" borderRadius="xl" border="1px solid #fecaca" boxShadow="xs">
                                <Flex justify="space-between" align="center" mb={1}>
                                  <Badge fontFamily="mono" fontSize="10px" fontWeight="900" colorScheme="red">
                                    {pCode}
                                  </Badge>
                                  <Badge colorScheme="red" variant="solid" bg="#dc2626" fontSize="9px" px={2} py={0.5} borderRadius="md">
                                    BACK ORDER
                                  </Badge>
                                </Flex>
                                <Text fontSize="xs" fontWeight="800" color="gray.900" mb={2}>
                                  {pName}
                                </Text>
                                <Flex justify="space-between" align="center" pt={1.5} borderTop="1px dashed #fecaca" fontSize="11px">
                                  <Text color="gray.600">Cant: <Text as="span" fontWeight="900" color="gray.900">{qty} uds</Text></Text>
                                  <Badge colorScheme="red" bg="#fee2e2" color="#991b1b" fontSize="9px">
                                    Sin Stock (Alm. 014)
                                  </Badge>
                                </Flex>
                              </Box>
                            );
                          })}
                        </VStack>
                      </Box>

                      {/* Vista Escritorio Tabla 2 */}
                      <Box display={{ base: "none", md: "block" }}>
                        <TableContainer border="1.5px solid" borderColor="#fecaca" borderRadius="lg" bg="white" overflowX="auto">
                          <Table variant="simple" size="sm">
                            <Thead bg="#fee2e2">
                              <Tr>
                                <Th fontSize="10px" color="#991b1b" fontWeight="900" px={2.5}>Código</Th>
                                <Th fontSize="10px" color="#991b1b" fontWeight="900" px={2.5}>Descripción</Th>
                                <Th fontSize="10px" color="#991b1b" fontWeight="900" textAlign="center" px={2}>Cant. Solicitada</Th>
                                <Th fontSize="10px" color="#991b1b" fontWeight="900" textAlign="center" px={2}>Estado Almacén</Th>
                                <Th fontSize="10px" color="#991b1b" fontWeight="900" textAlign="right" px={2.5}>Destino Operativo</Th>
                              </Tr>
                            </Thead>
                            <Tbody fontSize="xs">
                              {outOfStockProducts.map((p, idx) => {
                                const pCode = p.itemCode || p.code || p.id || p.productCode || "ART";
                                const pName = p.description || p.ItemDescription || p.name || p.productName || "Artículo Sin Stock";
                                const qty = Number(p.quantity ?? 1);
                                const pSigla = p.sigla || p.Sigla || p.marca || "";

                                return (
                                  <Tr key={`backorder-t2-${idx}`} _hover={{ bg: "#fff5f5" }} borderBottom="1px solid #fee2e2">
                                    <Td fontWeight="900" color="#991b1b" fontFamily="mono" px={2.5}>
                                      {pCode}
                                    </Td>
                                    <Td fontWeight="600" color="gray.900" px={2.5} minW="160px" whiteSpace="normal">
                                      <VStack align="start" spacing={1}>
                                        <Text>{pName}</Text>
                                        <HStack spacing={1} wrap="wrap">
                                          <Badge colorScheme="red" bg="#fee2e2" color="#991b1b" border="1px solid #fca5a5" fontSize="9px" px={1.5} py={0.2} borderRadius="md" fontWeight="800">
                                            ⚠️ SIN STOCK DISPONIBLE (PENDIENTE A IMPORTACIÓN)
                                          </Badge>
                                          {pSigla && (
                                            <Badge colorScheme="blue" variant="subtle" fontSize="9px" px={1.5} py={0.2} borderRadius="md" fontWeight="800">
                                              {pSigla}
                                            </Badge>
                                          )}
                                        </HStack>
                                      </VStack>
                                    </Td>
                                    <Td textAlign="center" fontWeight="900" px={2}>
                                      <Badge colorScheme="gray" bg="gray.100" color="gray.800" fontSize="11px" px={2} py={0.5} borderRadius="md" fontWeight="900">
                                        {qty} {qty === 1 ? "ud" : "uds"}
                                      </Badge>
                                    </Td>
                                    <Td textAlign="center" px={2}>
                                      <Badge colorScheme="red" variant="solid" bg="#dc2626" color="white" fontSize="10px" fontWeight="900" px={2} py={0.5} borderRadius="md">
                                        ⚠️ STK: 0 (Sin Stock)
                                      </Badge>
                                    </Td>
                                    <Td textAlign="right" px={2.5}>
                                      <Badge colorScheme="red" bg="#fee2e2" color="#991b1b" border="1px solid #fca5a5" fontSize="10px" fontWeight="900" px={2.5} py={0.5} borderRadius="full">
                                        📦 Demanda Back Order (Importaciones)
                                      </Badge>
                                    </Td>
                                  </Tr>
                                );
                              })}
                            </Tbody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </Box>
                  )}

                  {/* BLOQUE INFERIOR: HISTORIAL DE ACTIVIDAD (A SU COSTADO EN DESKTOP) Y RESUMEN DEL DOCUMENTO */}
                  {(() => {
                    const computedGrossUSD = inStockProducts.reduce((acc, it) => acc + (Number(it.quantity || 1) * Number(it.price || 0)), 0);
                    const computedNetUSD = inStockProducts.reduce((acc, it) => acc + (Number(it.lineTotal || 0)), 0);
                    const grossUSD = computedGrossUSD > 0 ? computedGrossUSD : (calcRes.grossSubtotalUSD || subtotalUSD);
                    const netUSD = computedNetUSD > 0 ? computedNetUSD : subtotalUSD;
                    const discountUSD = Math.max(0, Number((grossUSD - netUSD).toFixed(2)));
                    const discountPct = grossUSD > 0 ? Number(((discountUSD / grossUSD) * 100).toFixed(1)) : 0;

                    const currentQuote = effectiveQuote || quote || {};
                    const hasVoucherData = Boolean(
                      currentQuote?.opNum || currentQuote?.U_VS_OPNUM || currentQuote?.pathImg || currentQuote?.paymentImg || currentQuote?.voucherUrl ||
                      (currentQuote?.attachments && currentQuote?.attachments.length > 0)
                    );

                    return (
                      <Grid
                        templateColumns={{ base: "1fr", lg: "1fr 380px" }}
                        gap={4}
                        mt={5}
                        alignItems="start"
                      >
                        {/* COLUMNA IZQUIERDA: Comprobante de pago (si existe) + Historial de Actividad */}
                        <GridItem order={{ base: 2, lg: 1 }} minW="0">
                          <VStack align="stretch" spacing={3.5}>
                            {/* Comprobante de Pago y Anexos (si existe) */}
                            {hasVoucherData && (
                              <Box p={3.5} borderRadius="xl" border="1.5px solid" borderColor="purple.200" bg="purple.50" boxShadow="xs">
                                <Flex justify="space-between" align="center" mb={2}>
                                  <HStack spacing={2}>
                                    <Text fontSize="15px">💳</Text>
                                    <Text fontSize="xs" fontWeight="900" color="purple.900" textTransform="uppercase">
                                      Comprobante / Constancia de Pago
                                    </Text>
                                  </HStack>
                                  {(currentQuote?.opNum || currentQuote?.U_VS_OPNUM) && (
                                    <Badge colorScheme="purple" variant="solid" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="900">
                                      OP: {currentQuote?.opNum || currentQuote?.U_VS_OPNUM}
                                    </Badge>
                                  )}
                                </Flex>

                                {(currentQuote?.pathImg || currentQuote?.paymentImg || currentQuote?.voucherUrl) && (
                                  <Box mt={1.5} p={2} bg="white" borderRadius="lg" border="1px solid" borderColor="purple.200">
                                    <img
                                      src={
                                        typeof (currentQuote.pathImg || currentQuote.paymentImg || currentQuote.voucherUrl) === 'string' && (currentQuote.pathImg || currentQuote.paymentImg || currentQuote.voucherUrl).startsWith('blob:')
                                          ? (currentQuote.pathImg || currentQuote.paymentImg || currentQuote.voucherUrl)
                                          : `${import.meta.env.VITE_API_URL || ''}/quoteModule/${currentQuote.pathImg || currentQuote.paymentImg || currentQuote.voucherUrl}`
                                      }
                                      alt="Comprobante de pago"
                                      style={{ maxHeight: "160px", width: "100%", objectFit: "contain", borderRadius: "6px" }}
                                    />
                                  </Box>
                                )}

                                {currentQuote?.attachments && currentQuote?.attachments.length > 0 && (
                                  <Box mt={2}>
                                    <Text fontSize="10px" fontWeight="800" color="purple.800" textTransform="uppercase" mb={1}>
                                      📎 Anexos de Resguardo ({currentQuote.attachments.length}):
                                    </Text>
                                    <VStack align="stretch" spacing={1}>
                                      {currentQuote.attachments.map((att, aIdx) => (
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

                            {/* Historial de Actividad Comercial */}
                            <Box bg="white" p={{ base: 3, md: 3.5 }} borderRadius="xl" border="1.5px solid" borderColor="gray.200" boxShadow="xs">
                              <Flex justify="space-between" align="center" mb={2} pb={2} borderBottom="1px solid" borderColor="gray.100" wrap="wrap" gap={2}>
                                <HStack spacing={2}>
                                  <Flex w="24px" h="24px" borderRadius="md" bg="emerald.50" color="#126C36" align="center" justify="center" flexShrink={0}>
                                    <History className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </Flex>
                                  <Text fontSize="11px" fontWeight="900" color="gray.700" textTransform="uppercase" letterSpacing="wider">
                                    Historial de Actividad
                                  </Text>
                                  <Badge colorScheme="emerald" variant="subtle" fontSize="10px" px={2} py={0.2} borderRadius="full" fontWeight="800">
                                    {historyLog.length} {historyLog.length === 1 ? "registro" : "registros"}
                                  </Badge>
                                </HStack>
                              </Flex>

                              <Box
                                maxH="220px"
                                overflowY="auto"
                                pr={1}
                                sx={{
                                  scrollbarWidth: "thin",
                                  "&::-webkit-scrollbar": { width: "4px" },
                                  "&::-webkit-scrollbar-thumb": { bg: "gray.300", borderRadius: "full" }
                                }}
                              >
                                {historyLog.length === 0 ? (
                                  <Box p={3} textAlign="center" bg="gray.50" borderRadius="lg" border="1px dashed" borderColor="gray.200">
                                    <Text fontSize="xs" color="gray.500" fontWeight="600">
                                      No hay registros de actividad disponibles.
                                    </Text>
                                  </Box>
                                ) : (
                                  <VStack align="stretch" spacing={1} position="relative" pl={1}>
                                    <Box position="absolute" top="10px" bottom="10px" left="13px" w="1.5px" bg="gray.200" zIndex={0} />

                                    {historyLog.map((log, idx) => {
                                      let dotColor = "#ea580c";
                                      let bgCircle = "#fff7ed";
                                      let tagText = log.status || "EVENTO";
                                      let tagScheme = "orange";
                                      let NodeIconComponent = Clock;

                                      if (log.status === "APROBADO" || log.status === "APROBADO_COMERCIAL") {
                                        dotColor = "#059669";
                                        bgCircle = "#ecfdf5";
                                        tagScheme = "green";
                                        tagText = "APROBADO";
                                        NodeIconComponent = CheckCircle2;
                                      } else if (log.status === "EMITIDO" || log.status === "EMITIDO_SAP" || log.status === "FACTURADO" || log.status === "PEDIDO_EMITIDO") {
                                        dotColor = "#0284c7";
                                        bgCircle = "#f0f9ff";
                                        tagScheme = "blue";
                                        tagText = "EMITIDO SAP";
                                        NodeIconComponent = Zap;
                                      } else if (log.status === "RECHAZADO") {
                                        dotColor = "#dc2626";
                                        bgCircle = "#fef2f2";
                                        tagScheme = "red";
                                        tagText = "RECHAZADO";
                                        NodeIconComponent = XCircle;
                                      } else if (log.status === "OBSERVADO" || log.status === "EN_EDICION") {
                                        dotColor = "#d97706";
                                        bgCircle = "#fffbeb";
                                        tagScheme = "orange";
                                        tagText = "OBSERVADO";
                                        NodeIconComponent = AlertTriangle;
                                      } else if (log.status === "VISTO") {
                                        dotColor = "#7c3aed";
                                        bgCircle = "#f5f3ff";
                                        tagScheme = "purple";
                                        tagText = "VISTO";
                                        NodeIconComponent = Eye;
                                      } else if (log.status === "ENVIADO") {
                                        dotColor = "#2563eb";
                                        bgCircle = "#eff6ff";
                                        tagScheme = "blue";
                                        tagText = "ENVIADO";
                                        NodeIconComponent = Send;
                                      } else if (log.status === "GENERADO" || log.status === "BORRADOR" || log.status === "DRAFT") {
                                        dotColor = "#64748b";
                                        bgCircle = "#f8fafc";
                                        tagScheme = "gray";
                                        tagText = "BORRADOR";
                                        NodeIconComponent = FileText;
                                      }

                                      const rawNote = String(log.note || "Cambio de estado comercial");
                                      let cleanNote = rawNote.replace(/^[👁️⚠️✅❌📝⚡🚀🏛️]\s*/u, "").trim();
                                      let detailNote = null;

                                      if (cleanNote.startsWith("Observación:")) {
                                        detailNote = cleanNote.replace(/^Observación:\s*/, "").trim();
                                        cleanNote = "Cotización devuelta con observación";
                                      } else if (cleanNote.startsWith("Rechazo:")) {
                                        detailNote = cleanNote.replace(/^Rechazo:\s*/, "").trim();
                                        cleanNote = "Cotización rechazada";
                                      }

                                      return (
                                        <Flex
                                          key={idx}
                                          align="start"
                                          gap={2.5}
                                          zIndex={1}
                                          position="relative"
                                          py={1.5}
                                          px={2}
                                          borderRadius="md"
                                          _hover={{ bg: "gray.50" }}
                                          transition="background 0.15s ease"
                                        >
                                          <Flex
                                            w="18px"
                                            h="18px"
                                            borderRadius="full"
                                            bg={bgCircle}
                                            border="1.5px solid"
                                            borderColor={dotColor}
                                            color={dotColor}
                                            align="center"
                                            justify="center"
                                            flexShrink={0}
                                            boxShadow="xs"
                                            mt={0.5}
                                          >
                                            <NodeIconComponent className="w-2.5 h-2.5" />
                                          </Flex>

                                          <Box flex="1" minW="0">
                                            <Flex align="center" justify="space-between" wrap="wrap" gap={1.5}>
                                              <HStack spacing={2} minW="0" flex="1" wrap="wrap">
                                                <Badge
                                                  colorScheme={tagScheme}
                                                  fontSize="9.5px"
                                                  px={1.5}
                                                  py={0.2}
                                                  borderRadius="md"
                                                  fontWeight="800"
                                                  flexShrink={0}
                                                >
                                                  {tagText}
                                                </Badge>
                                                <Text fontSize="12px" fontWeight="700" color="gray.800" isTruncated title={cleanNote}>
                                                  {cleanNote}
                                                </Text>
                                                {log.user && (
                                                  <Text as="span" fontSize="11px" color="gray.500" fontWeight="500" flexShrink={0}>
                                                    • {log.user}
                                                  </Text>
                                                )}
                                              </HStack>

                                              <HStack spacing={1} color="gray.400" fontSize="10.5px" fontWeight="600" flexShrink={0}>
                                                <Clock className="w-3 h-3 text-gray-400" />
                                                <Text whiteSpace="nowrap">{formatLogTime(log.timestamp)}</Text>
                                              </HStack>
                                            </Flex>

                                            {detailNote && (
                                              <Box mt={1} p={1.5} px={2} bg="#fffbeb" borderLeft="2.5px solid #f59e0b" borderRadius="sm">
                                                <Text fontSize="11px" color="#92400e" fontWeight="600">
                                                  {detailNote}
                                                </Text>
                                              </Box>
                                            )}
                                          </Box>
                                        </Flex>
                                      );
                                    })}
                                  </VStack>
                                )}
                              </Box>
                            </Box>
                          </VStack>
                        </GridItem>

                        {/* COLUMNA DERECHA: RESUMEN DEL DOCUMENTO (Exacto a SapQuotationForm) */}
                        <GridItem order={{ base: 1, lg: 2 }} minW="0">
                          <Box
                            bg="linear-gradient(135deg, #064e3b 0%, #0f5132 100%)"
                            color="#ffffff"
                            p={{ base: 4, sm: 5 }}
                            borderRadius="xl"
                            boxShadow="0 4px 20px -2px rgba(15, 81, 50, 0.35)"
                            border="1px solid"
                            borderColor="rgba(255,255,255,0.15)"
                            w="100%"
                            alignSelf="start"
                          >
                            <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="wider" color="#a7f3d0" mb={3}>
                              RESUMEN DEL DOCUMENTO
                            </Text>

                            <VStack align="stretch" spacing={2} fontSize="xs">
                              {/* Subtotal Productos (Suma de precios de lista con stock) */}
                              <Flex justify="space-between" align="center" color="#ecfdf5">
                                <Text fontWeight="600">
                                  Subtotal ({inStockProducts.length} {inStockProducts.length === 1 ? 'ítem con stock' : 'ítems con stock'})
                                </Text>
                                <Text fontWeight="800" fontFamily="mono">
                                  USD {formatThousands(grossUSD)}
                                </Text>
                              </Flex>

                              {/* Back Order row */}
                              {outOfStockProducts.length > 0 && (
                                <Flex justify="space-between" align="center" bg="rgba(239, 68, 68, 0.25)" px={2} py={1} borderRadius="md" border="1px solid rgba(248, 113, 113, 0.4)">
                                  <Text fontSize="10px" fontWeight="700" color="#fecaca">
                                    📦 Sin Stock ({outOfStockProducts.length} {outOfStockProducts.length === 1 ? 'ítem' : 'ítems'}):
                                  </Text>
                                  <Badge colorScheme="red" bg="#dc2626" color="white" fontSize="9px" px={1.5} py={0.2} borderRadius="sm" fontWeight="800">
                                    BACK ORDER
                                  </Badge>
                                </Flex>
                              )}

                              {/* Descuento si aplica */}
                              {discountUSD > 0 && (
                                <Flex justify="space-between" align="center" color="#fca5a5">
                                  <Text fontWeight="600">Descuento ({discountPct}%)</Text>
                                  <Text fontWeight="700" fontFamily="mono">
                                    -USD {formatThousands(discountUSD)}
                                  </Text>
                                </Flex>
                              )}

                              {/* Valor Venta Neto tras descuento */}
                              {discountUSD > 0 && (
                                <Flex justify="space-between" align="center" color="#ecfdf5">
                                  <Text fontWeight="600">Valor Venta Neto</Text>
                                  <Text fontWeight="700" fontFamily="mono">
                                    USD {formatThousands(netUSD)}
                                  </Text>
                                </Flex>
                              )}

                              {/* I.G.V. 18% oficial */}
                              <Flex justify="space-between" align="center" color="#a7f3d0">
                                <Text fontWeight="700">I.G.V. (18%)</Text>
                                <Text fontWeight="800" fontFamily="mono">
                                  +USD {formatThousands(igvUSD)}
                                </Text>
                              </Flex>

                              <Divider borderColor="rgba(255,255,255,0.25)" my={0.5} />

                              {/* TOTAL A PAGAR */}
                              <Flex justify="space-between" align="center" pt={1.5} gap={2} wrap="nowrap">
                                <Text
                                  fontSize={{ base: "xs", sm: "sm" }}
                                  fontWeight="900"
                                  color="#e6f4ea"
                                  textTransform="uppercase"
                                  letterSpacing="tight"
                                  whiteSpace="nowrap"
                                  flexShrink={0}
                                >
                                  TOTAL A PAGAR
                                </Text>
                                <Text
                                  fontSize={{ base: "xl", sm: "2xl" }}
                                  fontWeight="950"
                                  color="#fef08a"
                                  fontFamily="mono"
                                  textShadow="0 2px 8px rgba(0,0,0,0.3)"
                                  whiteSpace="nowrap"
                                  textAlign="right"
                                >
                                  USD {formatThousands(grandTotalUSD)}
                                </Text>
                              </Flex>
                            </VStack>
                          </Box>
                        </GridItem>
                      </Grid>
                    );
                  })()}
                </Box>
              );
            })()}
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
                    loadingText="Emitiendo a SAP..."
                    onClick={handleSyncToSap}
                    fontWeight="800"
                    boxShadow="0 2px 6px rgba(18,108,54,0.3)"
                  >
                    ⚡ Aprobar y Sincronizar con SAP
                  </Button>
                )}

                {isAdminUser && isApprovedQuote && isAlreadySyncedToSap && (
                  <Button
                    size="sm"
                    colorScheme="green"
                    variant="outline"
                    borderColor="green.500"
                    color="green.700"
                    bg="green.50"
                    leftIcon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
                    isDisabled={true}
                    _disabled={{ opacity: 0.95, cursor: "default" }}
                    fontWeight="800"
                  >
                    ✅ Emitido en SAP (Doc #{syncedDocNum || effectiveQuote.sapDocNum || "OK"})
                  </Button>
                )}


                {/* Botón para Descargar PDF: SOLO SI YA ESTÁ APROBADO */}
                {!isUnapprovedDoc && (isFinalApproved || Boolean(syncedDocNum) || Boolean(effectiveQuote.sapDocNum) || Boolean(effectiveQuote.DocNum && !String(effectiveQuote.DocNum).startsWith("COT-"))) && (
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
                )}

                {/* Botón exclusivo para Administrador: Ver Trama JSON SAP */}
                {isRealAdmin && (
                  <Button
                    colorScheme="purple"
                    variant="outline"
                    size="sm"
                    leftIcon={<Code2 className="w-4 h-4 text-purple-600" />}
                    onClick={() => setIsJsonModalOpen(true)}
                    fontWeight="800"
                    title="Inspector Técnico: Ver Trama JSON para SAP Service Layer (Solo Administrador)"
                  >
                    Ver JSON SAP
                  </Button>
                )}
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

      {/* Modal Inspector Técnico JSON SAP (Solo Administrador) */}
      {isRealAdmin && (
        <SapPayloadJsonModal
          isOpen={isJsonModalOpen}
          onClose={() => setIsJsonModalOpen(false)}
          quote={{
            ...effectiveQuote,
            products: displayProducts,
            totals: { ...effectiveQuote.totals, ...calcRes },
            DocNum: sapSyncResult?.docNum || effectiveQuote.DocNum,
            sapDocNum: sapSyncResult?.docNum || effectiveQuote.sapDocNum,
            sapData: sapSyncResult || effectiveQuote.sapData
          }}
        />
      )}

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
        onConfirmObserve={(targetQuoteOrReason, maybeReason) => {
          const reasonText = typeof maybeReason === "string" ? maybeReason.trim() : (typeof targetQuoteOrReason === "string" ? targetQuoteOrReason.trim() : "Cotización observada para corrección");
          if (onUpdateStatus) {
            onUpdateStatus(effectiveQuote, "OBSERVADO", reasonText);
          }
          toast({
            title: "💬 Cotización Devuelta con Observación",
            description: `Se notificó al vendedor para que corrija: ${reasonText}`,
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
        <ModalOverlay bg="blackAlpha.600" />
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
                  placeholder="Ej: Se adjuntó el nuevo comprobante de pago N° 1234567 por el monto correcto de S/180.00. Se actualizó la cantidad del producto X de 2 a 3 unidades..."
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
        <ModalOverlay bg="blackAlpha.500" />
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
        <ModalOverlay bg="blackAlpha.700" />
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
                    Transacción Oficial en BD {sapSyncResult?.companyDB || "SBO_AJUSTES_2025"}
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
                      ${formatThousands(Number(sapSyncResult?.docTotalUSD ?? sapSyncResult?.docTotal ?? effectiveQuote?.totals?.grandTotalUSD ?? 0))} USD
                    </Text>
                  </Box>

                  <Box p={2.5} bg="purple.50" borderRadius="lg" border="1px solid" borderColor="purple.200">
                    <Text fontSize="10.5px" fontWeight="700" color="purple.800" textTransform="uppercase">Condición Comercial</Text>
                    <Text fontSize="xs" fontWeight="900" color="purple.900">
                      {effectiveQuote?.saleCondition || "CONTADO"}
                    </Text>
                    <Text fontSize="10px" fontWeight="700" color="purple.700">
                      {formatPaymentTerms(effectiveQuote?.paymentType || effectiveQuote?.selectedPaymentType, effectiveQuote?.saleCondition) || "Estándar SAP B1"}
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
              <HStack spacing={2.5}>
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
                {isRealAdmin && (
                  <Button
                    variant="outline"
                    colorScheme="purple"
                    size="md"
                    fontWeight="800"
                    leftIcon={<ChakraIcon as={Code2} />}
                    onClick={() => setIsJsonModalOpen(true)}
                  >
                    Ver JSON SAP
                  </Button>
                )}
              </HStack>
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
