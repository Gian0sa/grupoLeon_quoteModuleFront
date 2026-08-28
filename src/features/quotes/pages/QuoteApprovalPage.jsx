import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Flex,
  Grid,
  Text,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  HStack,
  VStack,
  Tabs,
  TabList,
  Tab,
  useToast,
  IconButton,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter
} from "@chakra-ui/react";
import {
  Search,
  CheckCircle2,
  Send,
  Clock,
  Eye,
  RefreshCw,
  XCircle,
  FileCheck2,
  Check,
  Trash2,
  Edit3,
  Download,
  Undo2,
  MessageSquareWarning,
  FileText,
  MessageSquare,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuoteStore } from "../stores/quoteStore";
import { useHasAccess } from "../../../shared/utils/permissions";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import { QuoteStepper, getStageIndex } from "../components/QuoteStepper";
import { QuoteDetailDrawer } from "../components/QuoteDetailDrawer";
import QuotePdfModal from "../components/QuotePdfModal";
import { ObserveReasonModal } from "../components/ObserveReasonModal";
import { calculateQuoteTotals, getQuoteTotalUSD } from "../../../shared/utils/quoteCalculator";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useQueryClient } from "@tanstack/react-query";
import { useGetQuotes } from "../hooks/queries/quotesQueries";
import { updateQuote, deleteQuote, createQuote } from "../services/quoteService";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const isDraftState = (status) => {
  if (!status) return true;
  const s = String(status).toUpperCase().trim();
  return ["BORRADOR", "DRAFT", "GENERADO"].includes(s);
};

export const isCancelledState = (status) => {
  if (!status) return false;
  const s = String(status).toUpperCase().trim();
  return (
    s === "ANULADO" ||
    s === "CANCELADO" ||
    s === "RECHAZADO" ||
    s === "ANULADO (APLICATIVO)" ||
    s === "CANCELADO EN SAP" ||
    s.includes("ANULADO") ||
    s.includes("CANCELADO") ||
    s.includes("RECHAZADO")
  );
};

const isDraftOwnedByCurrentUser = (q, currentUsername, currentUserId) => {
  if (!q) return false;
  const st = q.approvalStatus || q.state || q.status;
  if (!isDraftState(st)) {
    // Si la cotización ya fue enviada o procesada (ENVIADO, EN_PROCESO, APROBADO, etc.),
    // es parte del flujo de pedidos de la empresa y debe ser visible según permisos.
    return true;
  }

  // REGLA ESTRICTA DE PRIVACIDAD: Si es un BORRADOR no enviado,
  // SOLO el usuario que lo creó puede verlo en su sesión.
  const qCreator = String(q.createdByUsername || "").toLowerCase().trim();
  const qSeller = String(q.sellerName || "").toLowerCase().trim();
  const qUser = String(q.user || "").toLowerCase().trim();
  const qCreatorId = q.createdByUserId !== undefined && q.createdByUserId !== null ? String(q.createdByUserId) : "";
  const currentIdStr = currentUserId !== undefined && currentUserId !== null ? String(currentUserId) : "";
  const currentUsernameClean = String(currentUsername || "").toLowerCase().trim();

  if (currentUsernameClean) {
    if (qCreator && qCreator === currentUsernameClean) return true;
    if (qSeller && qSeller === currentUsernameClean) return true;
    if (qUser && qUser === currentUsernameClean) return true;
  }

  if (currentIdStr && qCreatorId && qCreatorId === currentIdStr) {
    return true;
  }

  return false;
};

export const isQuoteFromSap = (q) => {
  if (!q) return false;
  const status = String(q.approvalStatus || q.state || q.status || "").toUpperCase().trim();
  const sapDocNum = q.sapDocNum || q.DocNum || q.totals?.DocNum || q.totals?.sapDocNum;
  
  if (q.isSapDirect || q.isSap || q.totals?.isSapDirect) return true;
  if (sapDocNum && Number(sapDocNum) > 0) return true;
  if (status === "CANCELADO" || status === "COMPLETADO" || status.includes("CANCELADO EN SAP")) return true;
  if (Array.isArray(q.historyLog)) {
    const hasSapLog = q.historyLog.some(h => h.note && (h.note.includes("SAP Service Layer") || h.note.includes("DocNum: #") || h.note.includes("Emitida en SAP")));
    if (hasSapLog) return true;
  }
  return false;
};

export const isMatchingDoc = (q, docIdentifier) => {
  if (!q || !docIdentifier) return false;
  const idStr = String(
    typeof docIdentifier === "object"
      ? (docIdentifier.docNumber || docIdentifier.id || "")
      : docIdentifier
  ).trim();
  if (!idStr) return false;

  const qDocNum = String(q.docNumber || "").trim();
  const qId = String(q.id !== undefined && q.id !== null ? q.id : "").trim();

  if (qDocNum && qDocNum.toLowerCase() === idStr.toLowerCase()) return true;
  if (qId && qId.toLowerCase() === idStr.toLowerCase()) return true;

  const cleanIdStr = idStr.replace(/^COT-0*/i, "");
  const cleanQDocNum = qDocNum.replace(/^COT-0*/i, "");
  const cleanQId = qId.replace(/^COT-0*/i, "");

  if (cleanIdStr && (cleanIdStr === cleanQDocNum || cleanIdStr === cleanQId)) {
    return true;
  }
  return false;
};

export function QuoteApprovalPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });

  const { username: authUsername, userId: authUserId, role: authRole } = useAuthStore();
  const localUser = (localStorage.getItem("username") || localStorage.getItem("userId") || "").toLowerCase();
  const localRole = (localStorage.getItem("role") || "").toUpperCase();
  const hasAccess = useHasAccess();
  const isAdminUser = authRole === "ADMIN" || localRole === "ADMIN" || authUsername?.toLowerCase() === "enrique" || localUser === "enrique" || hasAccess("POST /quotes/approval") || hasAccess("POST /quotations/approve");
  const activeCurrentUsername = (authUsername || localStorage.getItem("username") || "").toLowerCase().trim();
  const activeCurrentUserId = authUserId || localStorage.getItem("userId");

  const { data: serverQuotes, isLoading: isServerLoading, refetch: refetchServerQuotes } = useGetQuotes();

  const handleLoadQuote = (q) => {
    if (typeof useQuoteStore.getState().loadQuote === "function") {
      useQuoteStore.getState().loadQuote(q);
    } else if (typeof useQuoteStore.getState().setQuoteData === "function") {
      useQuoteStore.getState().setQuoteData(q);
    } else {
      if (q.client) useQuoteStore.getState().setClient(q.client);
      if (q.products) useQuoteStore.getState().setProducts(q.products);
      if (q.comment || q.comments || q.Comments) useQuoteStore.getState().setComment(q.comment || q.comments || q.Comments);
    }
    navigate("/newquotes");
  };

  const [quotes, setQuotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("ALL");
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [pdfQuote, setPdfQuote] = useState(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState(null);
  const [observeQuoteTarget, setObserveQuoteTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Jerarquía de estados: el mayor índice tiene mayor prioridad (más avanzado en el flujo)
  const STATUS_PRIORITY = [
    "BORRADOR", "GENERADO", "ENVIADO", "EN_PROCESO", "EN_EDICION",
    "OBSERVADO", "RECHAZADO", "APROBADO_COMERCIAL", "EN_FACTURACION", "ANULADO", "FACTURADO", "APROBADO"
  ];
  const getStatusPriority = (s) => STATUS_PRIORITY.indexOf(String(s || "BORRADOR").toUpperCase());

  const syncQuotes = () => {
    try {
      const stored = localStorage.getItem("grupoLeon_local_quotes");
      const local = stored ? JSON.parse(stored) : [];

      // Limpiar documentos fantasma vacíos (COT-000000 o sin items ni cliente)
      const cleanLocal = local.filter(q => {
        const isPhantom = String(q.docNumber || "").trim() === "COT-000000" && (!q.products || q.products.length === 0) && Number(q.totals?.grandTotalUSD || 0) === 0;
        return !isPhantom;
      });

      if (cleanLocal.length !== local.length) {
        localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(cleanLocal));
      }

      if (serverQuotes && Array.isArray(serverQuotes)) {
        const validServerQuotes = serverQuotes.filter(q => {
          const isPhantom = String(q.docNumber || "").trim() === "COT-000000" && (!q.products || q.products.length === 0) && Number(q.totals?.grandTotalUSD || 0) === 0;
          return !isPhantom;
        });

        // Solo preservar borradores locales legítimos QUE PERTENEZCAN AL USUARIO ACTUAL
        const localDraftsOnly = cleanLocal.filter(q => {
          const isDraft = isDraftState(q.approvalStatus || q.state || q.status);
          if (!isDraft) return false;
          const notInServer = !validServerQuotes.some(sq => isMatchingDoc(sq, q));
          return notInServer && !String(q.docNumber || "").startsWith("TEST-") && isDraftOwnedByCurrentUser(q, activeCurrentUsername, activeCurrentUserId);
        });

        // Enriquecer cotizaciones del servidor con datos locales
        // REGLA DE PRIORIDAD DE ESTADO: si el localStorage tiene un estado más reciente
        // (por updatedAt) o más avanzado (por jerarquía de estados), el local prevalece.
        // Esto protege actualizaciones optimistas (OBSERVADO, RECHAZADO, etc.) del refresco del servidor.
        const enrichedServerQuotes = validServerQuotes.map(sq => {
          const matchedLocal = cleanLocal.find(lq => isMatchingDoc(lq, sq));
          if (matchedLocal) {
            const sqItems = (sq.products && sq.products.length > 0) ? sq.products : (sq.items || []);
            const lqItems = (matchedLocal.products && matchedLocal.products.length > 0) ? matchedLocal.products : (matchedLocal.items || []);

            const sqStatus = sq.approvalStatus || sq.state || sq.status || "BORRADOR";
            const lqStatus = matchedLocal.approvalStatus || matchedLocal.state || matchedLocal.status || "BORRADOR";
            const sqUpdatedAt = sq.updatedAt ? new Date(sq.updatedAt).getTime() : 0;
            const lqUpdatedAt = matchedLocal.updatedAt ? new Date(matchedLocal.updatedAt).getTime() : 0;

            // REGLA DE MEZCLA DE ESTADO REALTIME:
            // 1. Si el servidor indica ENVIADO/APROBADO/RECHAZADO/etc. y el local tenía OBSERVADO,
            //    significa que la observación fue corregida y se envió a validación. Prevalece la versión del servidor.
            // 2. Si el servidor indica CANCELADO, ANULADO o COMPLETADO, SIEMPRE prevalece el servidor (estado oficial en SAP/BD).
            // 3. Solo usar estado local si fue actualizado optimistamente en la sesión actual de forma muy reciente (>3s) y no fue cancelado.
            const isCancelledOrClosedInServer = sqStatus === "CANCELADO" || sqStatus === "COMPLETADO" || sqStatus === "ANULADO" || sq.isCancelled;
            const isObservationCorrected = lqStatus === "OBSERVADO" && (sqStatus === "ENVIADO" || sqStatus === "APROBADO_COMERCIAL" || sqStatus === "APROBADO");
            const localIsMoreRecent = lqUpdatedAt > (sqUpdatedAt + 3000);
            
            const useLocalStatus = localIsMoreRecent && !isObservationCorrected && !isCancelledOrClosedInServer;
            const finalStatus = isCancelledOrClosedInServer ? sqStatus : (useLocalStatus ? lqStatus : sqStatus);

            return {
              ...matchedLocal,
              ...sq,
              // Estado: usa la fuente más reciente/confiable
              status: finalStatus,
              state: finalStatus,
              approvalStatus: finalStatus,
              isCancelled: sq.isCancelled || finalStatus === "CANCELADO" || finalStatus === "ANULADO",
              isSapDirect: Boolean(sq.isSapDirect || matchedLocal.isSapDirect || sq.sapDocNum || matchedLocal.sapDocNum),
              sapDocNum: sq.sapDocNum || matchedLocal.sapDocNum || sq.DocNum || matchedLocal.DocNum,
              DocNum: sq.DocNum || matchedLocal.DocNum || sq.sapDocNum || matchedLocal.sapDocNum,
              // Campos de observación: si ya fue levantada (ENVIADO), limpiar la razón de observación antigua
              observationReason: (finalStatus === "ENVIADO" || finalStatus === "APROBADO_COMERCIAL" || finalStatus === "APROBADO" || finalStatus === "CANCELADO")
                ? null
                : (matchedLocal.observationReason || sq.observationReason || sq.rejectionReason),
              rejectionReason: (finalStatus === "ENVIADO" || finalStatus === "APROBADO_COMERCIAL" || finalStatus === "APROBADO" || finalStatus === "CANCELADO")
                ? null
                : (matchedLocal.rejectionReason || sq.rejectionReason),
              observedAt: (finalStatus === "ENVIADO" || finalStatus === "APROBADO_COMERCIAL" || finalStatus === "APROBADO" || finalStatus === "CANCELADO")
                ? null
                : (matchedLocal.observedAt || sq.observedAt),
              observedBy: (finalStatus === "ENVIADO" || finalStatus === "APROBADO_COMERCIAL" || finalStatus === "APROBADO" || finalStatus === "CANCELADO")
                ? null
                : (matchedLocal.observedBy || sq.observedBy),
              // Historial: combinar o usar el del servidor si trae registros nuevos
              historyLog: (sq.historyLog && sq.historyLog.length >= (matchedLocal.historyLog?.length || 0))
                ? sq.historyLog
                : (matchedLocal.historyLog && matchedLocal.historyLog.length > 0 ? matchedLocal.historyLog : (sq.historyLog || [])),
              products: sqItems.length > 0 ? sqItems : lqItems,
              client: sq.client || matchedLocal.client,
              clientName: sq.clientName || matchedLocal.clientName,
              totals: (sq.totals && sq.totals.grandTotalUSD) ? sq.totals : matchedLocal.totals,
            };
          }
          return sq;
        });

        const seen = new Set();
        const merged = [];
        for (const item of [...enrichedServerQuotes, ...localDraftsOnly]) {
          if (!isDraftOwnedByCurrentUser(item, activeCurrentUsername, activeCurrentUserId)) {
            continue;
          }
          const key = String(item.docNumber || item.id || "");
          if (key && !seen.has(key)) {
            seen.add(key);
            merged.push(item);
          }
        }
        setQuotes(merged);
        localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(merged));
      } else if (cleanLocal.length > 0) {
        const validLocal = cleanLocal.filter(q => {
          const notTest = !String(q.docNumber || "").startsWith("TEST-");
          return notTest && isDraftOwnedByCurrentUser(q, activeCurrentUsername, activeCurrentUserId);
        });
        setQuotes(validLocal);
        localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(validLocal));
      } else {
        setQuotes([]);
      }
    } catch (err) {
      console.error("Error sincronizando cotizaciones:", err);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["quotes"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      const refetchResult = await refetchServerQuotes();
      const freshQuotes = refetchResult?.data || serverQuotes;
      if (freshQuotes && Array.isArray(freshQuotes)) {
        const stored = localStorage.getItem("grupoLeon_local_quotes");
        const local = stored ? JSON.parse(stored) : [];
        const serverDocIds = new Set();
        freshQuotes.forEach(q => {
          if (q.docNumber) serverDocIds.add(String(q.docNumber));
          if (q.id !== undefined && q.id !== null) serverDocIds.add(String(q.id));
        });

        const unsyncedLocal = local.filter(q => {
          const docNum = q.docNumber ? String(q.docNumber) : "";
          const idVal = q.id !== undefined && q.id !== null ? String(q.id) : "";
          return (!docNum || !serverDocIds.has(docNum)) && (!idVal || !serverDocIds.has(idVal)) && isDraftOwnedByCurrentUser(q, activeCurrentUsername, activeCurrentUserId);
        });

        const seen = new Set();
        const merged = [];
        for (const item of [...freshQuotes, ...unsyncedLocal]) {
          if (!isDraftOwnedByCurrentUser(item, activeCurrentUsername, activeCurrentUserId)) {
            continue;
          }
          const key = String(item.docNumber || item.id || "");
          if (key && !seen.has(key)) {
            seen.add(key);
            merged.push(item);
          }
        }
        setQuotes(merged);
        localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(merged));
      }
      toast({
        title: "Cotizaciones actualizadas",
        description: "Se han sincronizado las cotizaciones más recientes del servidor.",
        status: "success",
        duration: 2500,
        isClosable: true,
        position: "top-right",
      });
    } catch (err) {
      console.error("Error al refrescar cotizaciones:", err);
      toast({
        title: "Error al actualizar",
        description: "No se pudo sincronizar con el servidor.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadQuotes = handleRefresh;

  useEffect(() => {
    syncQuotes();
  }, [serverQuotes]);

  // Escuchar eventos en vivo de actualización local (CERO necesidad de recargar / F5)
  useEffect(() => {
    const handleLocalUpdate = () => {
      try {
        const stored = localStorage.getItem("grupoLeon_local_quotes");
        const local = stored ? JSON.parse(stored) : [];

        if (serverQuotes && Array.isArray(serverQuotes)) {
          // CORRECCIÓN CRÍTICA: Cuando el localStorage se actualiza optimistamente,
          // el estado local DEBE prevalecer sobre el caché viejo del servidor.
          // Construir un mapa de datos locales para hacer el merge.
          const localMap = new Map();
          local.forEach(q => {
            if (q.docNumber) localMap.set(String(q.docNumber), q);
            if (q.id !== undefined && q.id !== null) localMap.set(String(q.id), q);
          });

          // Combinar: para cada cotización del servidor, si existe localmente, usar estado local (actualizado)
          const mergedWithLocal = serverQuotes.map(sq => {
            const localMatch = localMap.get(String(sq.docNumber || "")) || localMap.get(String(sq.id ?? ""));
            if (localMatch) {
              const isCancelledInServer = sq.approvalStatus === "CANCELADO" || sq.state === "CANCELADO" || sq.status === "CANCELADO" || sq.isCancelled;
              const finalStatus = isCancelledInServer ? "CANCELADO" : (localMatch.approvalStatus || localMatch.state || localMatch.status || sq.approvalStatus);
              return {
                ...sq,
                ...localMatch,
                status: finalStatus,
                state: finalStatus,
                approvalStatus: finalStatus,
                isCancelled: isCancelledInServer || Boolean(localMatch.isCancelled),
                // Mantener datos ricos del servidor que no estén en local
                products: (localMatch.products && localMatch.products.length > 0) ? localMatch.products : (sq.products || sq.items || []),
                client: localMatch.client || sq.client,
                clientName: localMatch.clientName || sq.clientName,
                totals: (localMatch.totals && localMatch.totals.grandTotalUSD) ? localMatch.totals : sq.totals,
              };
            }
            return sq;
          });

          // Agregar docs locales que no estén en servidor (borradores nuevos)
          const serverDocIds = new Set();
          serverQuotes.forEach(q => {
            if (q.docNumber) serverDocIds.add(String(q.docNumber));
            if (q.id !== undefined && q.id !== null) serverDocIds.add(String(q.id));
          });
          const unsyncedLocal = local.filter(q => {
            const docNum = q.docNumber ? String(q.docNumber) : "";
            const idVal = q.id !== undefined && q.id !== null ? String(q.id) : "";
            return (!docNum || !serverDocIds.has(docNum)) && (!idVal || !serverDocIds.has(idVal)) && isDraftOwnedByCurrentUser(q, activeCurrentUsername, activeCurrentUserId);
          });

          const seen = new Set();
          const merged = [];
          for (const item of [...mergedWithLocal, ...unsyncedLocal]) {
            if (!isDraftOwnedByCurrentUser(item, activeCurrentUsername, activeCurrentUserId)) {
              continue;
            }
            const key = String(item.docNumber || item.id || "");
            if (key && !seen.has(key)) {
              seen.add(key);
              merged.push(item);
            }
          }
          setQuotes(merged);
        } else {
          const validLocal = local.filter(q => isDraftOwnedByCurrentUser(q, activeCurrentUsername, activeCurrentUserId));
          setQuotes(validLocal);
        }
      } catch (err) {
        console.error("Error en listener localQuotesUpdated:", err);
      }
    };

    window.addEventListener("localQuotesUpdated", handleLocalUpdate);
    return () => window.removeEventListener("localQuotesUpdated", handleLocalUpdate);
  }, [serverQuotes, activeCurrentUsername, activeCurrentUserId]);

  const DRAFT_STATUSES = ["BORRADOR", "GENERADO"];

  const handleDeleteQuote = async (id, currentStatus) => {
    const idStr = String(id);
    const isMatchingItem = (q) => {
      const qDocNum = q.docNumber ? String(q.docNumber) : "";
      const qId = q.id !== undefined && q.id !== null ? String(q.id) : "";
      return qDocNum === idStr || qId === idStr || isMatchingDoc(q, idStr);
    };

    // Bloqueo de seguridad: No se permite eliminar ni anular cotizaciones originadas o sincronizadas con SAP
    const targetQuote = quotes.find(isMatchingItem);
    const stUpper = String(currentStatus || targetQuote?.approvalStatus || targetQuote?.state || targetQuote?.status || "").toUpperCase();
    if (isQuoteFromSap(targetQuote)) {
      toast({
        title: "⚠️ Acción no permitida",
        description: "Las cotizaciones de SAP Business One pertenecen a su propia base de datos y no pueden ser anuladas ni eliminadas desde el aplicativo.",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
      return;
    }

    const isAlreadyAnulado = stUpper === "ANULADO" || stUpper === "RECHAZADO" || stUpper.includes("ANULADO");
    const isDraft = !currentStatus || DRAFT_STATUSES.includes(currentStatus);
    // Solo se borra físicamente (Hard Delete) si ya es borrador o si ya estaba anulada/rechazada previamente
    const isHardDelete = isDraft || isAlreadyAnulado;

    // 1. ACTUALIZACIÓN OPTIMISTA INMEDIATA EN PANTALLA (CERO F5)
    if (isHardDelete) {
      setQuotes((prev) => prev.filter((q) => !isMatchingItem(q)));
      queryClient.setQueryData(["quotes"], (old) => {
        if (!Array.isArray(old)) return [];
        return old.filter((q) => !isMatchingItem(q));
      });
    } else {
      const nowIso = new Date().toISOString();
      const adminName = authUsername || "Enrique";
      setQuotes((prev) =>
        prev.map((q) => {
          if (!isMatchingItem(q)) return q;
          const prevLogs = q.historyLog || [];
          return {
            ...q,
            status: "ANULADO",
            state: "ANULADO",
            approvalStatus: "ANULADO",
            cancelledAt: nowIso,
            cancelledBy: adminName,
            historyLog: [
              { status: "ANULADO", timestamp: nowIso, user: adminName, note: `❌ Cotización anulada por Administrador ${adminName}` },
              ...prevLogs,
            ],
          };
        })
      );
    }

    // 2. Persistir en localStorage
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    if (isHardDelete) {
      const updated = saved.filter((q) => !isMatchingItem(q));
      localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
      window.dispatchEvent(new Event("localQuotesUpdated"));
      toast({
        title: "🗑️ Cotización Eliminada",
        description: `La cotización ${id} fue eliminada permanentemente del sistema al instante.`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    } else {
      const nowIso = new Date().toISOString();
      const adminName = authUsername || "Enrique";
      const updated = saved.map((q) => {
        if (!isMatchingItem(q)) return q;
        const prevLogs = q.historyLog || [];
        return {
          ...q,
          status: "ANULADO",
          state: "ANULADO",
          approvalStatus: "ANULADO",
          cancelledAt: nowIso,
          cancelledBy: adminName,
          historyLog: [
            { status: "ANULADO", timestamp: nowIso, user: adminName, note: `❌ Cotización anulada por Administrador ${adminName}` },
            ...prevLogs,
          ],
        };
      });
      localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
      window.dispatchEvent(new Event("localQuotesUpdated"));
      toast({
        title: "❌ Cotización Anulada",
        description: `La cotización ${id} cambió su estado a ANULADO (APLICATIVO).`,
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
    }

    // 2.5 Limpiar notificaciones asociadas a esta cotización en almacenamiento local
    try {
      const rawNotifs = localStorage.getItem("grupoLeon_notifications");
      const allNotifs = rawNotifs ? JSON.parse(rawNotifs) : [];
      const remainingNotifs = allNotifs.filter(n => {
        const nQuoteId = String(n.quoteId || "").trim().toUpperCase();
        const nId = String(n.id || "").trim().toUpperCase();
        return nQuoteId !== idStr.toUpperCase() && nId !== idStr.toUpperCase();
      });
      localStorage.setItem("grupoLeon_notifications", JSON.stringify(remainingNotifs));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
    } catch (notifErr) {
      console.error("Error limpiando notificaciones locales:", notifErr);
    }

    // 3. Sincronizar en Backend
    try {
      await deleteQuote(id, isHardDelete);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      console.error("Error eliminando cotización en el servidor:", e);
    }
  };

  const handleClearAll = () => {
    localStorage.setItem("grupoLeon_local_quotes", "[]");
    localStorage.setItem("grupoLeon_notifications", "[]");
    setQuotes([]);
    window.dispatchEvent(new Event("localQuotesUpdated"));
    window.dispatchEvent(new Event("localNotificationsUpdated"));
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
    toast({
      title: "🧹 Historial Limpiado",
      description: "Se han eliminado todas las cotizaciones de prueba.",
      status: "info",
      duration: 3000,
      isClosable: true
    });
  };

  // ── RECALL: Vendedor retira solicitud que aún no fue abierta por Enrique ──
  const handleRecallQuote = async (quote) => {
    const docId = quote?.docNumber || quote?.id;
    if (!docId) return;

    const idStr = String(docId);
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const nowIso = new Date().toISOString();
    const recallUser = authUsername || "vendedor";
    const target = quote || quotes.find(q => isMatchingDoc(q, docId)) || saved.find(q => isMatchingDoc(q, docId));
    const prevLogs = target?.historyLog || [];
    const version = (target?.quoteVersion || 1);
    const newLog = { status: "EN_EDICION", timestamp: nowIso, user: recallUser, note: `↩️ Solicitud retirada por el vendedor para corrección (v${version})` };
    const updatedHistory = [newLog, ...prevLogs];

    const recallFields = {
      status: "EN_EDICION",
      state: "EN_EDICION",
      approvalStatus: "EN_EDICION",
      quoteVersion: version,
      recalledAt: nowIso,
      recalledBy: recallUser,
      historyLog: updatedHistory
    };

    const fullRecallDoc = {
      ...(target || {}),
      id: target?.id || docId,
      docNumber: target?.docNumber || (String(docId).startsWith("COT-") ? docId : `COT-${String(docId).padStart(6, '0')}`),
      ...recallFields
    };

    try {
      await updateQuote(fullRecallDoc);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    } catch (e) {
      console.error("Error retirando cotización:", e);
    }

    const updated = saved.some(q => isMatchingDoc(q, docId))
      ? saved.map(q => (isMatchingDoc(q, docId) && !q.viewedByAdmin ? { ...q, ...recallFields } : q))
      : [fullRecallDoc, ...saved];

    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
    window.dispatchEvent(new Event("localQuotesUpdated"));

    const recalledDoc = updated.find(q => isMatchingDoc(q, docId)) || fullRecallDoc;
    const tieneLineas = Boolean(recalledDoc?.products?.length || recalledDoc?.items?.length);

    if (!recalledDoc || !tieneLineas) {
      toast({
        title: "No se pudo cargar la cotización",
        description: `${idStr} quedó marcada como retirada, pero no se encontraron sus artículos para editar. Ábrela desde el historial.`,
        status: "warning",
        duration: 6000,
        isClosable: true
      });
      return;
    }

    useQuoteStore.getState().setQuoteData(recalledDoc);

    toast({
      title: "↩️ Cotización Retirada para Corrección",
      description: `La solicitud ${idStr} fue retirada antes de que Enrique la abriera. Se cargó en tu formulario para corregir.`,
      status: "info",
      duration: 5000,
      isClosable: true
    });
    navigate("/newquotes");
  };

  // ── OBSERVE: Enrique abre modal para devolver con observación al vendedor ──
  const handleObserveQuote = (quoteOrDocId) => {
    let quoteObj = quoteOrDocId;
    if (typeof quoteOrDocId === "string") {
      const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
      quoteObj = quotes.find(q => isMatchingDoc(q, quoteOrDocId)) ||
        saved.find(q => isMatchingDoc(q, quoteOrDocId)) ||
        (selectedQuote && isMatchingDoc(selectedQuote, quoteOrDocId) ? selectedQuote : null) ||
        { id: quoteOrDocId, docNumber: quoteOrDocId };
    }
    setObserveQuoteTarget(quoteObj);
  };

  const handleConfirmObserve = async (docIdOrQuote, reason) => {
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const nowIso = new Date().toISOString();
    const adminName = authUsername || "Enrique";
    
    const docId = typeof docIdOrQuote === "object" ? (docIdOrQuote.docNumber || docIdOrQuote.id) : docIdOrQuote;

    // Buscar la cotización completa objetivo en quotes, en saved o en observeQuoteTarget
    const target =
      (typeof docIdOrQuote === "object" && docIdOrQuote ? docIdOrQuote : null) ||
      (observeQuoteTarget && isMatchingDoc(observeQuoteTarget, docId) ? observeQuoteTarget : null) ||
      quotes.find(q => isMatchingDoc(q, docId)) ||
      saved.find(q => isMatchingDoc(q, docId)) ||
      (selectedQuote && isMatchingDoc(selectedQuote, docId) ? selectedQuote : null) ||
      observeQuoteTarget;

    const prevLogs = target?.historyLog || [];
    const newLog = {
      status: "OBSERVADO",
      timestamp: nowIso,
      user: adminName,
      note: `💬 Devuelto por ${adminName}: ${reason}`
    };
    const updatedHistory = [newLog, ...prevLogs];

    const finalDocNumber = target?.docNumber || (String(docId).startsWith("COT-") ? docId : `COT-${String(docId).padStart(6, '0')}`);

    const fullObservedDoc = {
      ...(target || {}),
      id: target?.id || docId,
      docNumber: finalDocNumber,
      status: "OBSERVADO",
      state: "OBSERVADO",
      approvalStatus: "OBSERVADO",
      updatedAt: nowIso,
      observedAt: nowIso,
      observedBy: adminName,
      observationReason: reason,
      rejectionReason: reason,
      historyLog: updatedHistory
    };

    // 1. Actualizar estado reactivo local de React inmediatamente (actualización optimista)
    setQuotes(prev => prev.map(q => isMatchingDoc(q, docId) ? fullObservedDoc : q));
    if (selectedQuote && isMatchingDoc(selectedQuote, docId)) {
      setSelectedQuote(fullObservedDoc);
    }

    // 2. Persistir en localStorage ANTES del backend (para que el listener local no sobrescriba)
    const updatedSaved = saved.some(q => isMatchingDoc(q, docId))
      ? saved.map(q => (isMatchingDoc(q, docId) ? fullObservedDoc : q))
      : [fullObservedDoc, ...saved];
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updatedSaved));
    // Notificar a otros listeners locales (sin relanzar syncQuotes)
    window.dispatchEvent(new Event("localQuotesUpdated"));

    // 3. Notificación para el vendedor
    const sellerUser = fullObservedDoc.createdByUsername || fullObservedDoc.sellerName || "vendedor";
    const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const notifObj = {
      id: `NOTIF-OBS-${Date.now()}`,
      targetRole: "VENDEDOR",
      targetUsername: sellerUser,
      fromUsername: adminName,
      quoteId: finalDocNumber,
      quoteObj: fullObservedDoc,
      title: `💬 Cotización Observada - ${finalDocNumber}`,
      description: `${adminName} solicita corrección: ${reason}`,
      status: "OBSERVADO",
      createdAt: nowIso,
      timestamp: nowIso,
      read: false
    };
    localStorage.setItem(
      "grupoLeon_notifications",
      JSON.stringify([
        notifObj,
        ...existingNotifs.filter(n => !isMatchingDoc({ docNumber: n.quoteId, id: n.quoteId }, docId) || n.status !== "OBSERVADO")
      ])
    );
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    setObserveQuoteTarget(null);

    // 4. Persistir en Backend + actualizar caché de React Query optimistamente
    // CLAVE: actualizar setQueriesData ANTES de invalidar para que todas las variantes de queryKey (ej. ["quotes", {}]) tengan el estado OBSERVADO
    queryClient.setQueriesData({ queryKey: ["quotes"] }, (old) => {
      if (!Array.isArray(old)) return old;
      return old.map(q => isMatchingDoc(q, docId) ? { ...q, ...fullObservedDoc } : q);
    });

    try {
      await updateQuote(fullObservedDoc);
      // La invalidación traerá los datos frescos del servidor (ya OBSERVADO)
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      console.error("Error observando cotización en servidor:", e);
    }

    toast({
      title: "💬 Cotización Devuelta con Observación",
      description: `Se notificó al vendedor (${sellerUser}) para que corrija: ${reason}`,
      status: "warning",
      duration: 5000,
      isClosable: true,
      position: "top-right"
    });
  };

  const handleConfirmReject = async (docId, reason) => {
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const nowIso = new Date().toISOString();
    const adminName = authUsername || "Enrique";
    const target =
      quotes.find(q => isMatchingDoc(q, docId)) ||
      saved.find(q => isMatchingDoc(q, docId));

    const prevLogs = target?.historyLog || [];
    const newLog = {
      status: "RECHAZADO",
      timestamp: nowIso,
      user: adminName,
      note: `❌ Rechazado por ${adminName}: ${reason}`
    };
    const updatedHistory = [newLog, ...prevLogs];

    const finalDocNumber = target?.docNumber || (String(docId).startsWith("COT-") ? docId : `COT-${String(docId).padStart(6, '0')}`);

    const fullRejectedDoc = {
      ...(target || {}),
      id: target?.id || docId,
      docNumber: finalDocNumber,
      status: "RECHAZADO",
      state: "RECHAZADO",
      approvalStatus: "RECHAZADO",
      updatedAt: nowIso,
      rejectedAt: nowIso,
      rejectedBy: adminName,
      rejectionReason: reason,
      historyLog: updatedHistory
    };

    // Persistir en localStorage ANTES del backend
    const updatedSaved = saved.some(q => isMatchingDoc(q, docId))
      ? saved.map(q => (isMatchingDoc(q, docId) ? fullRejectedDoc : q))
      : [fullRejectedDoc, ...saved];
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updatedSaved));
    // Notificar a otros listeners locales
    window.dispatchEvent(new Event("localQuotesUpdated"));

    const sellerUser = fullRejectedDoc.createdByUsername || fullRejectedDoc.sellerName || "vendedor";
    const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const notifObj = {
      id: `NOTIF-REJ-${Date.now()}`,
      targetRole: "VENDEDOR",
      targetUsername: sellerUser,
      fromUsername: adminName,
      quoteId: finalDocNumber,
      quoteObj: fullRejectedDoc,
      title: `❌ Cotización Rechazada - ${finalDocNumber}`,
      description: `Rechazada por ${adminName}: ${reason}`,
      status: "RECHAZADO",
      createdAt: nowIso,
      timestamp: nowIso,
      read: false
    };
    localStorage.setItem(
      "grupoLeon_notifications",
      JSON.stringify([
        notifObj,
        ...existingNotifs.filter(n => !isMatchingDoc({ docNumber: n.quoteId, id: n.quoteId }, docId) || n.status !== "RECHAZADO")
      ])
    );
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    // Actualizar caché de React Query optimistamente (antes de invalidar)
    queryClient.setQueriesData({ queryKey: ["quotes"] }, (old) => {
      if (!Array.isArray(old)) return old;
      return old.map(q => isMatchingDoc(q, docId) ? { ...q, ...fullRejectedDoc } : q);
    });

    // Persistir en Backend (NO llamar syncQuotes() — sobreescribiría el estado optimista)
    try {
      await updateQuote(fullRejectedDoc);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      console.error("Error rechazando cotización en servidor:", e);
    }

    toast({
      title: "❌ Cotización Rechazada",
      description: `Se registró el rechazo y se notificó al vendedor (${sellerUser}).`,
      status: "info",
      duration: 5000,
      isClosable: true,
      position: "top-right"
    });
  };

  const handleUpdateStatus = async (docIdOrQuote, nextStatus, note = "") => {
    // Normalizar: el Drawer puede pasar el objeto completo o un ID string
    const docId = typeof docIdOrQuote === "object" && docIdOrQuote !== null
      ? (docIdOrQuote.docNumber || docIdOrQuote.id)
      : docIdOrQuote;

    if (nextStatus === "OBSERVADO") {
      await handleConfirmObserve(docIdOrQuote, note);
      return;
    }
    if (nextStatus === "RECHAZADO") {
      await handleConfirmReject(docId, note);
      return;
    }
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const nowIso = new Date().toISOString();
    const adminName = authUsername || "Enrique";
    const target =
      (typeof docIdOrQuote === "object" && docIdOrQuote ? docIdOrQuote : null) ||
      quotes.find(q => isMatchingDoc(q, docId)) ||
      saved.find(q => isMatchingDoc(q, docId));
    const prevLogs = target?.historyLog || [];
    const newLog = {
      status: nextStatus,
      timestamp: nowIso,
      user: adminName,
      note: note || `Estado actualizado a ${nextStatus}`
    };
    const updatedHistory = [newLog, ...prevLogs];
    const finalDocNumber = target?.docNumber || (String(docId).startsWith("COT-") ? docId : `COT-${String(docId).padStart(6, '0')}`);
    const fullDoc = {
      ...(target || {}),
      id: target?.id || docId,
      docNumber: finalDocNumber,
      status: nextStatus,
      state: nextStatus,
      approvalStatus: nextStatus,
      updatedAt: nowIso,
      historyLog: updatedHistory
    };

    // Actualizar estado reactivo optimistamente
    setQuotes(prev => prev.map(q => isMatchingDoc(q, docId) ? fullDoc : q));
    if (selectedQuote && isMatchingDoc(selectedQuote, docId)) {
      setSelectedQuote(fullDoc);
    }

    // Persistir en localStorage ANTES del backend
    const updatedSaved = saved.some(q => isMatchingDoc(q, docId))
      ? saved.map(q => (isMatchingDoc(q, docId) ? fullDoc : q))
      : [fullDoc, ...saved];
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updatedSaved));
    // Notificar a otros listeners locales
    window.dispatchEvent(new Event("localQuotesUpdated"));

    // Actualizar caché de React Query optimistamente ANTES de invalidar
    // Esto garantiza que syncQuotes() vea el estado correcto cuando serverQuotes cambie
    queryClient.setQueriesData({ queryKey: ["quotes"] }, (old) => {
      if (!Array.isArray(old)) return old;
      return old.map(q => isMatchingDoc(q, docId) ? { ...q, ...fullDoc } : q);
    });

    // Persistir en Backend (NO llamar syncQuotes() — sobreescribiría el estado optimista)
    try {
      await updateQuote(fullDoc);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      console.error("Error actualizando cotización:", e);
    }
  };

  const markAsViewedByAdmin = (q) => {
    if (!isAdminUser || !q) return;
    const docId = q.docNumber || q.id;
    const nowIso = new Date().toISOString();
    
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    let needsUpdate = false;

    const updated = saved.map(item => {
      if ((item.docNumber || item.id) === docId) {
        const isFirstView = !item.viewedByAdmin;
        const currentCount = item.adminViewCount || 0;
        const currentLogs = item.historyLog || [];
        
        needsUpdate = true;
        const newLog = isFirstView
          ? { status: "VISTO", timestamp: nowIso, user: authUsername || "Enrique", note: "👁️ Solicitud abierta y leída por Enrique" }
          : null;
          
        return {
          ...item,
          viewedByAdmin: true,
          viewedAt: item.viewedAt || nowIso,
          lastViewedAt: nowIso,
          adminViewCount: currentCount + 1,
          historyLog: newLog ? [newLog, ...currentLogs] : currentLogs
        };
      }
      return item;
    });

    if (needsUpdate) {
      localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
      window.dispatchEvent(new Event("localQuotesUpdated"));
      setQuotes(updated);
      const targetQuote = updated.find(i => (i.docNumber || i.id) === docId);
      if (targetQuote) setSelectedQuote(targetQuote);
    }
  };

  useEffect(() => {
    loadQuotes();
    
    const handleSync = () => {
      // Direct load to state
      const stored = localStorage.getItem("grupoLeon_local_quotes");
      if (stored) {
        setQuotes(JSON.parse(stored));
      } else {
        setQuotes([]);
      }
    };
    window.addEventListener("localQuotesUpdated", handleSync);
    return () => {
      window.removeEventListener("localQuotesUpdated", handleSync);
    };
  }, []);


  const isQuoteOwnedByCurrentUser = (q) => {
    if (!q) return false;
    const qUser = String(q.createdByUsername || q.username || "").toLowerCase().trim();
    const qSeller = String(q.sellerName || "").toLowerCase().trim();
    const qUserId = q.userId || q.createdByUserId;

    if (activeCurrentUsername) {
      if (qUser === activeCurrentUsername || qSeller === activeCurrentUsername) return true;
      if (qSeller && (qSeller.includes(activeCurrentUsername) || activeCurrentUsername.includes(qSeller))) return true;
    }
    if (activeCurrentUserId && qUserId && String(qUserId) === String(activeCurrentUserId)) {
      return true;
    }
    return false;
  };

  // Resetear a página 1 cuando cambia la pestaña, la búsqueda o el tamaño de página
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTab, searchQuery, pageSize]);

  // Filtrado de la lista por Pestañas y Buscador con REGLA ESTRICTA DE PRIVACIDAD POR ROL
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const currentStatus = q.approvalStatus || q.state || q.status || "GENERADO";
      const isDraft = isDraftState(currentStatus);
      const isCancelled = isCancelledState(currentStatus);

      // ── CONTROL DE ACCESO POR ROL ──
      // Si el usuario NO es Administrador (es Vendedor / Asesor):
      // SOLO puede ver SUS PROPIAS cotizaciones
      if (!isAdminUser) {
        if (!isQuoteOwnedByCurrentUser(q)) {
          return false;
        }
      } else {
        // Si ES Administrador: ve todas las cotizaciones del flujo, pero los borradores ajenos son privados
        if (isDraft && !isDraftOwnedByCurrentUser(q, activeCurrentUsername, activeCurrentUserId)) {
          return false;
        }
      }

      // Filtro por pestaña:
      // En "TODAS" (ALL) solo van cotizaciones vigentes que pasaron el flujo (no canceladas ni borradores)
      if (selectedTab === "ALL") {
        if (isDraft || isCancelled) return false;
      } else if (selectedTab === "GENERADO") {
        if (!isDraft) return false;
      } else if (selectedTab === "ENVIADO") {
        if (!["ENVIADO", "EN_PROCESO", "PENDIENTE_APROBACION"].includes(currentStatus)) return false;
      } else if (selectedTab === "APROBADO_COMERCIAL") {
        if (!["APROBADO_COMERCIAL", "APROBADO_CREDITOS"].includes(currentStatus)) return false;
      } else if (selectedTab === "PENDIENTE_FACTURACION") {
        if (!["PENDIENTE_FACTURACION", "EN_FACTURACION"].includes(currentStatus)) return false;
      } else if (selectedTab === "APROBADO") {
        if (!["APROBADO", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO"].includes(currentStatus) || isCancelled) return false;
      } else if (selectedTab === "ANULADO" || selectedTab === "RECHAZADO") {
        if (!isCancelled) return false;
      }

      // Filtro por búsqueda ultra rápido y flexible (soporta código COT, SAP #ID, cliente, RUC, vendedor, váucher)
      if (!searchQuery.trim()) return true;
      const rawQuery = searchQuery.trim().toLowerCase();
      const cleanNumericQuery = rawQuery.replace(/[^0-9]/g, ""); // Extraer dígitos ej: "#8", "#14", "14", "COT-8"
      
      const docNum = String(q.docNumber || q.id || "").toLowerCase();
      const sapDocNum = String(q.sapDocNum || q.DocNum || q.totals?.DocNum || q.totals?.sapDocNum || "").toLowerCase();
      const clientName = String(q.clientName || q.client?.CardName || "").toLowerCase();
      const clientDoc = String(q.clientDocument || q.client?.CardCode || "").toLowerCase();
      const sellerStr = String(q.sellerName || q.createdByUsername || "").toLowerCase();
      const opNum = String(q.opNum || "").toLowerCase();

      // Búsqueda por texto directo en todos los campos principales
      if (
        docNum.includes(rawQuery) ||
        clientName.includes(rawQuery) ||
        clientDoc.includes(rawQuery) ||
        sellerStr.includes(rawQuery) ||
        opNum.includes(rawQuery)
      ) {
        return true;
      }

      // Búsqueda por SAP DocNum (ej: "#8", "#14", "SAP #14", "14")
      if (sapDocNum && (sapDocNum === rawQuery || `#${sapDocNum}` === rawQuery || `sap #${sapDocNum}`.includes(rawQuery))) {
        return true;
      }

      // Si el usuario escribió un número simple o con # (ej: "8", "#8", "14", "#14"), buscar coincidencia numérica
      if (cleanNumericQuery) {
        if (sapDocNum === cleanNumericQuery) return true;
        if (docNum.replace(/[^0-9]/g, "").endsWith(cleanNumericQuery) || docNum.includes(cleanNumericQuery)) return true;
      }

      return false;
    });
  }, [quotes, isAdminUser, selectedTab, searchQuery, activeCurrentUsername, activeCurrentUserId]);

  const totalItems = filteredQuotes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedQuotes = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredQuotes.slice(start, start + pageSize);
  }, [filteredQuotes, validCurrentPage, pageSize]);

  // Contadores por Estado (Filtrados por rol)
  const counts = useMemo(() => {
    const res = { ALL: 0, GENERADO: 0, ENVIADO: 0, APROBADO_COMERCIAL: 0, PENDIENTE_FACTURACION: 0, APROBADO: 0, ANULADO: 0, RECHAZADO: 0 };
    quotes.forEach((q) => {
      const st = q.approvalStatus || q.state || q.status || "GENERADO";
      const isDraft = isDraftState(st);
      const isCancelled = isCancelledState(st);

      // Si es Vendedor, solo computar sus propias cotizaciones
      if (!isAdminUser) {
        if (!isQuoteOwnedByCurrentUser(q)) {
          return;
        }
      } else {
        if (isDraft && !isDraftOwnedByCurrentUser(q, activeCurrentUsername, activeCurrentUserId)) {
          return;
        }
      }
      
      if (isDraft) {
        res.GENERADO++;
      } else if (isCancelled) {
        res.ANULADO++;
        res.RECHAZADO++;
      } else {
        res.ALL++;
        if (["ENVIADO", "EN_PROCESO", "PENDIENTE_APROBACION"].includes(st)) res.ENVIADO++;
        else if (["APROBADO_COMERCIAL", "APROBADO_CREDITOS"].includes(st)) res.APROBADO_COMERCIAL++;
        else if (["PENDIENTE_FACTURACION", "EN_FACTURACION"].includes(st)) res.PENDIENTE_FACTURACION++;
        else if (["APROBADO", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO"].includes(st)) res.APROBADO++;
      }
    });
    return res;
  }, [quotes, isAdminUser, activeCurrentUsername, activeCurrentUserId]);

  const renderStatusBadge = (status, q = null) => {
    switch (status) {
      case "GENERADO":
      case "DRAFT":
      case "draft":
      case "BORRADOR":
      case "borrador":
        return (
          <Badge bg="#eff6ff" color="#1e40af" border="1.5px solid #bfdbfe" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            1. Borrador 📝
          </Badge>
        );
      case "PENDIENTE_APROBACION":
      case "ENVIADO":
        return (
          <Badge bg="#e0f2fe" color="#0369a1" border="1.5px solid #bae6fd" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            1. Pend. Aprobación ⏳
          </Badge>
        );
      case "EN_PROCESO":
        return (
          <Badge bg="#f3e8ff" color="#6b21a8" border="1.5px solid #e9d5ff" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            En Revisión 🔍
          </Badge>
        );
      case "APROBADO_COMERCIAL":
        return (
          <Badge bg="#fef9c3" color="#854d0e" border="1.5px solid #fef08a" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            2. Aprob. Comercial 📢
          </Badge>
        );
      case "EN_FACTURACION":
      case "PENDIENTE_FACTURACION":
        return (
          <Badge bg="#f5f3ff" color="#5b21b6" border="1.5px solid #ddd6fe" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            3. Pnd. Facturación 💳
          </Badge>
        );
      case "FACTURADO":
      case "PEDIDO_EMITIDO":
      case "COMPLETADO":
      case "APROBADO": {
        const hasSap = Boolean(q?.isSapDirect || q?.sapDocNum || q?.DocNum || q?.totals?.DocNum || q?.totals?.sapDocNum);
        if (hasSap) {
          return (
            <Badge bg="#dcfce7" color="#166534" border="1.5px solid #bbf7d0" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
              🔒 4. Pedido Emitido SAP ✓
            </Badge>
          );
        }
        return (
          <Badge bg="#dcfce7" color="#15803d" border="1.5px solid #86efac" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            ✅ 4. Pedido Aprobado
          </Badge>
        );
      }
      case "ANULADO":
        return (
          <Badge bg="#fef2f2" color="#b91c1c" border="1.5px solid #fca5a5" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            ❌ Anulado (Aplicativo)
          </Badge>
        );
      case "CANCELADO":
        return (
          <Badge bg="#fee2e2" color="#991b1b" border="1.5px solid #f87171" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            🚫 Cancelado en SAP
          </Badge>
        );
      case "RECHAZADO":
        return (
          <Badge bg="#fee2e2" color="#991b1b" border="1.5px solid #fecaca" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            Rechazado ❌
          </Badge>
        );
      case "OBSERVADO":
        return (
          <Badge bg="#fef3c7" color="#d97706" border="1.5px solid #fcd34d" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            Observado 💬
          </Badge>
        );
      case "EN_EDICION":
        return (
          <Badge bg="#ffedd5" color="#ea580c" border="1.5px solid #fdba74" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            En Corrección ↩️
          </Badge>
        );
      default:
        return <Badge px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="800">{status}</Badge>;
    }
  };
  // Botones de acción por fila, con diseño ultra elegante y optimizado para móvil y escritorio
  const renderRowActions = (q, docId, status, { stack = false } = {}) => {
    const isDraft = !status || isDraftState(status);
    const isPendingApproval = status === "ENVIADO" || status === "EN_PROCESO" || status === "PENDIENTE_APROBACION";
    const isPendingBilling = status === "PENDIENTE_FACTURACION";
    const isSap = isQuoteFromSap(q);
    const isAlreadyAnulado = isCancelledState(status);
    const isApprovedOrder = status === "APROBADO" || status === "FACTURADO" || status === "PEDIDO_EMITIDO" || status === "COMPLETADO";
    const canShowTrashIcon = isAdminUser && !isSap && !isApprovedOrder;

    // ─────────────────────────────────────────────────────────────
    // VISTA ESCRITORIO (Fila de Tabla compacta, ordenada y elegante)
    // ─────────────────────────────────────────────────────────────
    if (!stack) {
      return (
        <Flex gap={1.5} justify="flex-end" align="center" wrap="nowrap">
          {/* Si es Borrador: Editar y Borrar */}
          {isDraft ? (
            <>
              <Button
                size="xs"
                h="32px"
                bg="#2563eb"
                color="white"
                _hover={{ bg: "#1d4ed8", transform: "translateY(-1px)", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}
                _active={{ bg: "#1e40af" }}
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                onClick={() => handleLoadQuote(q)}
                fontWeight="700"
                borderRadius="lg"
                px={3}
                boxShadow="xs"
              >
                Editar
              </Button>
              <IconButton
                size="xs"
                h="32px"
                w="32px"
                variant="ghost"
                colorScheme="red"
                color="#dc2626"
                _hover={{ bg: "#fee2e2" }}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setDeleteConfirmDoc({ docId, status, isDraft: true, isAlreadyAnulado: false })}
                aria-label="Borrar borrador"
                title="Eliminar borrador"
                borderRadius="lg"
              />
            </>
          ) : (
            <>
              {/* Botón Principal: Verificar / Ver Detalle */}
              <Button
                size="xs"
                h="32px"
                bg={isAdminUser && (isPendingApproval || isPendingBilling) ? "#0f766e" : "white"}
                color={isAdminUser && (isPendingApproval || isPendingBilling) ? "white" : "#334155"}
                variant={isAdminUser && (isPendingApproval || isPendingBilling) ? "solid" : "outline"}
                borderColor="#cbd5e1"
                _hover={
                  isAdminUser && (isPendingApproval || isPendingBilling)
                    ? { bg: "#115e59", transform: "translateY(-1px)", boxShadow: "0 4px 12px rgba(15,118,110,0.3)" }
                    : { bg: "#f8fafc", borderColor: "#94a3b8", transform: "translateY(-1px)" }
                }
                _active={{ bg: isAdminUser ? "#134e4a" : "#f1f5f9" }}
                leftIcon={<Eye className="w-3.5 h-3.5" />}
                onClick={() => {
                  markAsViewedByAdmin(q);
                  setSelectedQuote(q);
                  setIsDetailOpen(true);
                }}
                fontWeight="700"
                borderRadius="lg"
                px={3}
                boxShadow="xs"
              >
                {isAdminUser && (isPendingApproval || isPendingBilling) ? "Verificar" : "Vista"}
              </Button>

              {/* Botón PDF */}
              <Button
                size="xs"
                h="32px"
                variant="outline"
                borderColor="#e2e8f0"
                color="#0f766e"
                bg="#f0fdfa"
                _hover={{ bg: "#ccfbf1", borderColor: "#5eead4", transform: "translateY(-1px)" }}
                leftIcon={<FileText className="w-3.5 h-3.5 text-teal-600" />}
                onClick={() => {
                  markAsViewedByAdmin(q);
                  setPdfQuote(q);
                }}
                fontWeight="700"
                borderRadius="lg"
                px={2.5}
              >
                PDF
              </Button>

              {/* Vendedor: Botón Retirar si aún no fue abierta por el admin */}
              {!isAdminUser && isPendingApproval && !q.viewedByAdmin && (
                <Button
                  size="xs"
                  h="32px"
                  variant="outline"
                  borderColor="#fdba74"
                  color="#c2410c"
                  bg="#fff7ed"
                  _hover={{ bg: "#ffedd5", borderColor: "#fb923c" }}
                  leftIcon={<Undo2 className="w-3.5 h-3.5" />}
                  onClick={() => handleRecallQuote(q)}
                  fontWeight="700"
                  borderRadius="lg"
                  px={2.5}
                >
                  Retirar
                </Button>
              )}

              {/* Administrador: Solo cotizaciones del aplicativo en validación o anuladas se pueden anular o eliminar */}
              {canShowTrashIcon && (
                <IconButton
                  size="xs"
                  h="32px"
                  w="32px"
                  variant="ghost"
                  colorScheme="red"
                  color="#dc2626"
                  _hover={{ bg: "#fee2e2" }}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => setDeleteConfirmDoc({ docId, status, isDraft: false, isAlreadyAnulado })}
                  aria-label={isAlreadyAnulado ? "Eliminar definitivamente" : "Anular cotización"}
                  title={isAlreadyAnulado ? "Eliminar cotización definitivamente del sistema" : "Anular cotización del aplicativo"}
                  borderRadius="lg"
                />
              )}
            </>
          )}
        </Flex>
      );
    }

    // ─────────────────────────────────────────────────────────────
    // VISTA MÓVIL (Tarjeta con botones de toque amplio)
    // ─────────────────────────────────────────────────────────────
    return (
      <VStack spacing={2} align="stretch" w="full">
        {isDraft ? (
          <Grid templateColumns="1fr auto" gap={2} w="full">
            <Button
              size="sm"
              h="40px"
              bg="#2563eb"
              color="white"
              _hover={{ bg: "#1d4ed8" }}
              leftIcon={<Edit3 className="w-4 h-4" />}
              onClick={() => handleLoadQuote(q)}
              fontWeight="900"
              borderRadius="xl"
            >
              Editar Borrador
            </Button>
            <IconButton
              size="sm"
              h="40px"
              w="40px"
              variant="outline"
              borderColor="#fca5a5"
              color="#dc2626"
              bg="#fef2f2"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setDeleteConfirmDoc({ docId, status, isDraft: true, isAlreadyAnulado: false })}
              aria-label="Borrar borrador"
              borderRadius="xl"
            />
          </Grid>
        ) : (
          <Grid templateColumns={canShowTrashIcon ? "1fr 1fr auto" : "1fr 1fr"} gap={2} w="full">
            <Button
              size="sm"
              h="40px"
              bg={isAdminUser && (isPendingApproval || isPendingBilling) ? "#0f766e" : "white"}
              color={isAdminUser && (isPendingApproval || isPendingBilling) ? "white" : "#334155"}
              variant={isAdminUser && (isPendingApproval || isPendingBilling) ? "solid" : "outline"}
              borderColor="#cbd5e1"
              leftIcon={<Eye className="w-4 h-4" />}
              onClick={() => {
                markAsViewedByAdmin(q);
                setSelectedQuote(q);
                setIsDetailOpen(true);
              }}
              fontWeight="800"
              borderRadius="xl"
              boxShadow="xs"
            >
              {isAdminUser && (isPendingApproval || isPendingBilling) ? "Verificar" : "Vista"}
            </Button>

            <Button
              size="sm"
              h="40px"
              variant="outline"
              borderColor="#e2e8f0"
              color="#0f766e"
              bg="#f0fdfa"
              _hover={{ bg: "#ccfbf1" }}
              leftIcon={<FileText className="w-4 h-4 text-teal-600" />}
              onClick={() => {
                markAsViewedByAdmin(q);
                setPdfQuote(q);
              }}
              fontWeight="800"
              borderRadius="xl"
            >
              PDF
            </Button>

            {canShowTrashIcon && (
              <IconButton
                size="sm"
                h="40px"
                w="40px"
                variant="outline"
                borderColor="#fca5a5"
                color="#dc2626"
                bg="#fef2f2"
                _hover={{ bg: "#fee2e2" }}
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => setDeleteConfirmDoc({ docId, status, isDraft: false, isAlreadyAnulado })}
                aria-label={isAlreadyAnulado ? "Eliminar definitivamente" : "Anular cotización"}
                title={isAlreadyAnulado ? "Eliminar cotización definitivamente del sistema" : "Anular cotización del aplicativo"}
                borderRadius="xl"
              />
            )}
          </Grid>
        )}

        {/* Móvil: Vendedor Retirar Solicitud */}
        {isPendingApproval && !isAdminUser && !q.viewedByAdmin && (
          <Button
            size="sm"
            h="38px"
            variant="outline"
            borderColor="#fdba74"
            color="#c2410c"
            bg="#fff7ed"
            _hover={{ bg: "#ffedd5" }}
            leftIcon={<Undo2 className="w-4 h-4" />}
            onClick={() => handleRecallQuote(q)}
            fontWeight="800"
            borderRadius="xl"
            w="full"
          >
            Retirar y Corregir Cotización
          </Button>
        )}
      </VStack>
    );
  };

  return (
    <Box w="full" py={2}>
      <VStack align="stretch" spacing={5}>
        {/* KPI CARDS: BOTONES GRANDES DE FILTRADO TÁCTIL */}
        <Box bg="#f8fafc" p={4} borderRadius="2xl" border="1px solid" borderColor="#e2e8f0" boxShadow="xs">
          <Text fontSize="xs" fontWeight="900" color="#475569" mb={3} textTransform="uppercase" letterSpacing="wider">
            Filtrar Cotizaciones por Fase Comercial (Toca para seleccionar):
          </Text>
          <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(7, 1fr)" }} gap={3}>
            {[
              { id: "ALL", label: "Todas", count: counts.ALL, color: "#475569", bgSelected: "#475569", bgGlow: "#f1f5f9" },
              { id: "ENVIADO", label: "1. Pend. Aprobación", count: counts.ENVIADO, color: "#0284c7", bgSelected: "#0284c7", bgGlow: "#e0f2fe" },
              { id: "APROBADO_COMERCIAL", label: "2. Cotizaciones Aprobadas", count: counts.APROBADO_COMERCIAL, color: "#16a34a", bgSelected: "#16a34a", bgGlow: "#dcfce7" },
              { id: "PENDIENTE_FACTURACION", label: "3. Pnd. Facturación", count: counts.PENDIENTE_FACTURACION, color: "#7c3aed", bgSelected: "#7c3aed", bgGlow: "#f3e8ff" },
              { id: "APROBADO", label: "4. Pedidos Aprobados", count: counts.APROBADO, color: "#16a34a", bgSelected: "#16a34a", bgGlow: "#dcfce7" },
              { id: "ANULADO", label: "Anuladas / Canceladas", count: counts.ANULADO, color: "#dc2626", bgSelected: "#dc2626", bgGlow: "#fee2e2" },
              { id: "GENERADO", label: "Borradores", isTrash: true, count: counts.GENERADO, color: "#dc2626", bgSelected: "#dc2626", bgGlow: "#fef2f2" }
            ].map((card) => {
              const isSelected = selectedTab === card.id;
              return (
                <Box
                  key={card.id}
                  onClick={() => setSelectedTab(card.id)}
                  cursor="pointer"
                  bg={isSelected ? card.bgSelected : "white"}
                  color={isSelected ? "white" : card.color}
                  p={3.5}
                  borderRadius="xl"
                  border="2.5px solid"
                  borderColor={isSelected ? card.bgSelected : "#cbd5e1"}
                  boxShadow={isSelected ? "md" : "sm"}
                  transition="all 0.15s ease-in-out"
                  textAlign="center"
                  userSelect="none"
                  _hover={{ transform: "translateY(-2px)", borderColor: card.color }}
                  _active={{ transform: "scale(0.97)" }}
                >
                  {card.isTrash ? (
                    <Flex align="center" justify="center" h="32px">
                      <Trash2 className="w-7 h-7 stroke-[2.5]" />
                    </Flex>
                  ) : (
                    <Text fontSize="2xl" fontWeight="900" lineHeight="1">{card.count}</Text>
                  )}
                  <Text fontSize="11px" fontWeight="800" mt={1.5} textTransform="uppercase" letterSpacing="tight">
                    {card.label} {card.isTrash && `(${card.count})`}
                  </Text>
                </Box>
              );
            })}
          </Grid>
        </Box>

        {/* BUSCADOR DE COTIZACIONES RÁPIDO */}
        <Flex direction={{ base: "column", md: "row" }} justify="space-between" align={{ base: "stretch", md: "center" }} gap={3} bg="white" p={4} borderRadius="2xl" border="1px solid" borderColor="#e2e8f0">
          <Box>
            <Heading size="xs" color="emerald.900" fontWeight="950" textTransform="uppercase" letterSpacing="wide">
              Listado del Seguimiento Comercial
            </Heading>
            <Text fontSize="11px" color="gray.600" fontWeight="600">
              Usa la barra de búsqueda para encontrar clientes por nombre o RUC
            </Text>
          </Box>
          <HStack spacing={3}>
            <InputGroup size="md" maxW={{ base: "full", md: "380px" }}>
              <InputLeftElement pointerEvents="none">
                <Search className="w-4 h-4 text-gray-500" />
              </InputLeftElement>
              <Input
                placeholder="Buscar cliente, RUC, N° cotización o SAP (#...)"
                borderRadius="xl"
                fontSize="sm"
                fontWeight="700"
                borderColor="#cbd5e1"
                _placeholder={{ color: 'gray.400' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <Tooltip label="Actualizar cotizaciones del servidor">
              <IconButton
                icon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />}
                size="md"
                variant="outline"
                borderRadius="xl"
                isLoading={isRefreshing || isServerLoading}
                onClick={handleRefresh}
                aria-label="Actualizar"
                _hover={{ bg: "emerald.50", borderColor: "emerald.300" }}
              />
            </Tooltip>
          </HStack>
        </Flex>

        {/* TABLA PRINCIPAL OPTIMIZADA CON ALTO CONTRASTE (solo escritorio) */}
        <Box display={{ base: "none", lg: "block" }} bg="white" borderRadius="2xl" border="1.5px solid" borderColor="#cbd5e1" boxShadow="sm" overflow="hidden" width="100%">
          <Table variant="simple" size="md" style={{ tableLayout: "fixed", width: "100%" }}>
            <Thead bg="#0e572b">
              <Tr>
                <Th py={4} fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" width="26%">DOCUMENTO Y CLIENTE</Th>
                <Th fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" width="11%">FECHA</Th>
                <Th fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" textAlign="right" width="11%">TOTAL (USD)</Th>
                <Th fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" textAlign="center" width="16%">ESTADO DE APROBACIÓN</Th>
                <Th fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" textAlign="right" width="36%">ACCIONES DISPONIBLES</Th>
              </Tr>
            </Thead>
            <Tbody>
              {paginatedQuotes.length === 0 ? (
                <Tr>
                  <Td colSpan={5} textAlign="center" py={12} color="gray.500" fontWeight="700" fontSize="sm">
                    No se encontraron cotizaciones en este estado.
                  </Td>
                </Tr>
              ) : (
                paginatedQuotes.map((q) => {
                  const docId = q.docNumber || q.id;
                  const status = q.approvalStatus || q.state || "GENERADO";
                  const clientName = q.clientName || q.client?.CardName || "Cliente No Registrado";
                  const grandTotalUSD = getQuoteTotalUSD(q);

                  const quoteProducts = q.products || q.items || q.totals?.products || q.totals?.normalizedProducts || [];
                  const maxAdicDiscount = quoteProducts.reduce((max, it) => {
                    const adic = Number(it.lineDiscount ?? it.LineDiscount ?? 0);
                    return Math.max(max, adic);
                  }, Number(q.totals?.maxDiscount || 0));
                  const hasAdditionalDiscount = maxAdicDiscount > 0 || Boolean(q.totals?.hasDiscount);
                  const sapDocNum = q.sapDocNum || q.DocNum || q.totals?.DocNum || q.totals?.sapDocNum || (Array.isArray(q.historyLog) ? q.historyLog.find(h => h.note && (h.note.includes("DocNum") || h.note.includes("SAP")))?.note?.match(/DocNum:?\s*#?(\d+)/i)?.[1] : null);

                  return (
                    <Tr key={docId} _hover={{ bg: "#f8fafc" }} borderBottom="1px solid" borderColor="#e2e8f0">
                      {/* Documento, Cliente y Vendedor consolidado */}
                      <Td py={3}>
                        <VStack align="flex-start" spacing={1}>
                          <HStack spacing={2} align="center" wrap="wrap">
                            <Text fontSize="sm" fontWeight="950" color="#0e572b" fontFamily="mono">{docId}</Text>
                            {sapDocNum && (
                              <Badge colorScheme="green" variant="solid" bg="#15803d" color="white" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="900" boxShadow="xs">
                                🏛️ Oferta SAP: #{sapDocNum}
                              </Badge>
                            )}
                            {q.opNum && (
                              <Badge colorScheme="purple" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                                VOUCHER: {q.opNum}
                              </Badge>
                            )}
                            {hasAdditionalDiscount && (
                              <Badge colorScheme="purple" variant="solid" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="900" boxShadow="xs">
                                ⚡ DESCUENTO ADICIONAL APLICADO
                              </Badge>
                            )}
                          </HStack>
                          <Text fontWeight="900" color="#0f172a" fontSize="sm" lineHeight="tight" isTruncated maxW="380px">
                            {clientName}
                          </Text>
                          <HStack spacing={2} wrap="wrap">
                            <Badge bg="#f1f5f9" color="#475569" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="700">
                              Vend: {q.sellerName || "Vendedor Autorizado"}
                            </Badge>
                            {q.items?.some(i => i.stock === 0) && (
                              <Badge colorScheme="red" variant="solid" fontSize="9px" px={1.5} py={0.5} borderRadius="md" fontWeight="900">
                                ⚠️ AGOTADOS
                              </Badge>
                            )}
                          </HStack>
                        </VStack>
                      </Td>

                      {/* Fecha */}
                      <Td fontSize="sm" color="gray.850" fontWeight="800" py={3}>
                        {q.docDate || new Date().toLocaleDateString()}
                      </Td>

                      {/* Total */}
                      <Td textAlign="right" fontWeight="900" color="#0f172a" fontFamily="mono" fontSize="sm" py={3}>
                        ${grandTotalUSD.toFixed(2)}
                      </Td>

                      {/* Píldora de Estado */}
                      <Td textAlign="center" py={3}>
                        <Flex justify="center">
                          {renderStatusBadge(status, q)}
                        </Flex>
                      </Td>

                      {/* Acciones */}
                      <Td textAlign="right" py={3}>
                        <HStack justify="flex-end" spacing={2.5}>
                          {renderRowActions(q, docId, status)}
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </Box>

        {/* VISTA DE TARJETAS (solo móvil / tablet <lg) */}
        <VStack display={{ base: "flex", lg: "none" }} align="stretch" spacing={3}>
          {paginatedQuotes.length === 0 ? (
            <Box bg="white" borderRadius="2xl" border="1.5px solid" borderColor="#cbd5e1" p={8} textAlign="center" color="gray.500" fontWeight="700" fontSize="sm">
              No se encontraron cotizaciones en este estado.
            </Box>
          ) : (
            paginatedQuotes.map((q) => {
              const docId = q.docNumber || q.id;
              const status = q.approvalStatus || q.state || "GENERADO";
              const clientName = q.clientName || q.client?.CardName || "Cliente No Registrado";
              const grandTotalUSD = getQuoteTotalUSD(q);

              const quoteProducts = q.products || q.items || q.totals?.products || q.totals?.normalizedProducts || [];
              const maxAdicDiscount = quoteProducts.reduce((max, it) => {
                const adic = Number(it.lineDiscount ?? it.LineDiscount ?? 0);
                return Math.max(max, adic);
              }, Number(q.totals?.maxDiscount || 0));
              const hasAdditionalDiscount = maxAdicDiscount > 0 || Boolean(q.totals?.hasDiscount);
              const sapDocNum = q.sapDocNum || q.DocNum || q.totals?.DocNum || q.totals?.sapDocNum || (Array.isArray(q.historyLog) ? q.historyLog.find(h => h.note && (h.note.includes("DocNum") || h.note.includes("SAP")))?.note?.match(/DocNum:?\s*#?(\d+)/i)?.[1] : null);

              return (
                <Box key={docId} bg="white" borderRadius="2xl" border="1.5px solid" borderColor="#cbd5e1" boxShadow="sm" p={4}>
                  <VStack align="stretch" spacing={3}>
                    <Flex justify="space-between" align="flex-start" gap={2} wrap="wrap">
                      <HStack spacing={1.5} align="center" wrap="wrap">
                        <Text fontSize="sm" fontWeight="950" color="#0e572b" fontFamily="mono">{docId}</Text>
                        {sapDocNum && (
                          <Badge colorScheme="green" variant="solid" bg="#15803d" color="white" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="900" boxShadow="xs">
                            🏛️ Oferta SAP: #{sapDocNum}
                          </Badge>
                        )}
                      </HStack>
                      {renderStatusBadge(status, q)}
                    </Flex>
                    <Text fontWeight="900" color="#0f172a" fontSize="md">{clientName}</Text>
                    <HStack spacing={2} wrap="wrap">
                      <Badge bg="#f1f5f9" color="#475569" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="700">
                        Vend: {q.sellerName || "Vendedor Autorizado"}
                      </Badge>
                      {q.opNum && (
                        <Badge colorScheme="purple" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                          VOUCHER: {q.opNum}
                        </Badge>
                      )}
                      {hasAdditionalDiscount && (
                        <Badge colorScheme="purple" variant="solid" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="900" boxShadow="xs">
                          ⚡ DESCUENTO ADICIONAL
                        </Badge>
                      )}
                      {q.items?.some(i => i.stock === 0) && (
                        <Badge colorScheme="red" variant="solid" fontSize="9px" px={1.5} py={0.5} borderRadius="md" fontWeight="900">
                          ⚠️ AGOTADOS
                        </Badge>
                      )}
                    </HStack>
                    <Flex justify="space-between" align="center" bg="#f8fafc" borderRadius="lg" px={3} py={2} border="1px solid" borderColor="#e2e8f0">
                      <Box>
                        <Text fontSize="10px" fontWeight="700" color="gray.500" textTransform="uppercase">Fecha</Text>
                        <Text fontSize="sm" color="gray.800" fontWeight="800">{q.docDate || new Date().toLocaleDateString()}</Text>
                      </Box>
                      <Box textAlign="right">
                        <Text fontSize="10px" fontWeight="700" color="gray.500" textTransform="uppercase">Total (USD)</Text>
                        <Text fontSize="md" color="#0f172a" fontWeight="900" fontFamily="mono">${grandTotalUSD.toFixed(2)}</Text>
                      </Box>
                    </Flex>
                    <Flex gap={2} wrap="wrap" align="center">
                      {renderRowActions(q, docId, status, { stack: true })}
                    </Flex>
                  </VStack>
                </Box>
              );
            })
          )}
        </VStack>

        {/* BARRA DE PAGINACIÓN Y CONTROL DE VISTA */}
        {filteredQuotes.length > 0 && (
          <Flex
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            align="center"
            gap={3}
            bg="white"
            p={3.5}
            borderRadius="2xl"
            border="1.5px solid"
            borderColor="#cbd5e1"
            boxShadow="xs"
            w="full"
          >
            {/* Información del rango mostrado */}
            <HStack spacing={2} align="center" wrap="wrap">
              <Text fontSize="xs" fontWeight="700" color="gray.600">
                Mostrando <Text as="span" fontWeight="900" color="gray.900">{(validCurrentPage - 1) * pageSize + 1}</Text> -{" "}
                <Text as="span" fontWeight="900" color="gray.900">{Math.min(validCurrentPage * pageSize, totalItems)}</Text> de{" "}
                <Text as="span" fontWeight="900" color="#0e572b">{totalItems}</Text> cotizaciones
              </Text>

              {/* Selector de tamaño de página */}
              <HStack spacing={1} ml={{ base: 0, md: 3 }}>
                <Text fontSize="11px" fontWeight="800" color="gray.500" textTransform="uppercase">
                  Por pág:
                </Text>
                {[10, 20, 50].map((size) => (
                  <Button
                    key={size}
                    size="xs"
                    h="26px"
                    minW="32px"
                    variant={pageSize === size ? "solid" : "outline"}
                    colorScheme={pageSize === size ? "whatsapp" : "gray"}
                    bg={pageSize === size ? "#0e572b" : "white"}
                    color={pageSize === size ? "white" : "gray.700"}
                    borderColor={pageSize === size ? "#0e572b" : "gray.300"}
                    _hover={{ bg: pageSize === size ? "#0b4623" : "gray.50" }}
                    onClick={() => setPageSize(size)}
                    fontWeight="800"
                    borderRadius="md"
                  >
                    {size}
                  </Button>
                ))}
              </HStack>
            </HStack>

            {/* Botones de navegación de página */}
            <HStack spacing={1.5} align="center">
              <IconButton
                icon={<ChevronsLeft className="w-4 h-4" />}
                size="sm"
                variant="outline"
                borderColor="gray.300"
                isDisabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage(1)}
                aria-label="Primera página"
                borderRadius="lg"
                _hover={{ bg: "gray.50" }}
              />
              <IconButton
                icon={<ChevronLeft className="w-4 h-4" />}
                size="sm"
                variant="outline"
                borderColor="gray.300"
                isDisabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
                borderRadius="lg"
                _hover={{ bg: "gray.50" }}
              />

              <Box px={3} py={1} bg="#f1f5f9" borderRadius="lg" border="1px solid" borderColor="#cbd5e1">
                <Text fontSize="xs" fontWeight="900" color="gray.800">
                  Página {validCurrentPage} de {totalPages}
                </Text>
              </Box>

              <IconButton
                icon={<ChevronRight className="w-4 h-4" />}
                size="sm"
                variant="outline"
                borderColor="gray.300"
                isDisabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Página siguiente"
                borderRadius="lg"
                _hover={{ bg: "gray.50" }}
              />
              <IconButton
                icon={<ChevronsRight className="w-4 h-4" />}
                size="sm"
                variant="outline"
                borderColor="gray.300"
                isDisabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                aria-label="Última página"
                borderRadius="lg"
                _hover={{ bg: "gray.50" }}
              />
            </HStack>
          </Flex>
        )}
      </VStack>

      <QuoteDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        quote={selectedQuote}
        onUpdateStatus={handleUpdateStatus}
      />

      <QuotePdfModal
        isOpen={!!pdfQuote}
        onClose={() => setPdfQuote(null)}
        quote={pdfQuote}
      />

      <ObserveReasonModal
        isOpen={!!observeQuoteTarget}
        onClose={() => setObserveQuoteTarget(null)}
        quote={observeQuoteTarget}
        onConfirmObserve={handleConfirmObserve}
      />

      {/* MODAL DE CONFIRMACIÓN DE ANULACIÓN / ELIMINACIÓN */}
      <Modal isOpen={!!deleteConfirmDoc} onClose={() => setDeleteConfirmDoc(null)} isCentered size="sm">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(3px)" />
        <ModalContent borderRadius="2xl" p={2}>
          <ModalHeader fontSize="md" fontWeight="900" color="red.700" display="flex" alignItems="center" gap={2}>
            <Trash2 className="w-5 h-5 text-red-600" />
            {deleteConfirmDoc?.isDraft
              ? "Confirmar Borrado de Borrador"
              : deleteConfirmDoc?.isAlreadyAnulado
              ? "Confirmar Eliminación Permanente"
              : "Confirmar Anulación de Cotización"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody fontSize="xs" color="gray.600" fontWeight="600">
            {deleteConfirmDoc?.isDraft ? (
              <>
                ¿Estás seguro de que deseas eliminar permanentemente el borrador{" "}
                <Text as="span" fontWeight="900" color="gray.800">{deleteConfirmDoc?.docId}</Text>? Esta acción no se puede deshacer.
              </>
            ) : deleteConfirmDoc?.isAlreadyAnulado ? (
              <>
                ¿Estás seguro de que deseas eliminar definitivamente la cotización anulada{" "}
                <Text as="span" fontWeight="900" color="gray.800">{deleteConfirmDoc?.docId}</Text> del sistema? Esta acción no se puede deshacer.
              </>
            ) : (
              <>
                ¿Estás seguro de que deseas anular la cotización{" "}
                <Text as="span" fontWeight="900" color="gray.800">{deleteConfirmDoc?.docId}</Text>? Cambiará su estado a ANULADO en el aplicativo.
              </>
            )}
          </ModalBody>
          <ModalFooter gap={2} pt={3}>
            <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmDoc(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              colorScheme="red"
              bg="#dc2626"
              _hover={{ bg: "#b91c1c" }}
              fontWeight="800"
              onClick={() => {
                if (deleteConfirmDoc) {
                  handleDeleteQuote(deleteConfirmDoc.docId, deleteConfirmDoc.status);
                  setDeleteConfirmDoc(null);
                }
              }}
            >
              {deleteConfirmDoc?.isDraft
                ? "🗑️ Sí, Eliminar Borrador"
                : deleteConfirmDoc?.isAlreadyAnulado
                ? "🗑️ Sí, Eliminar Definitivamente"
                : "❌ Sí, Anular Cotización"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default QuoteApprovalPage;
