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
  InputRightElement,
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
  ModalFooter,
  Skeleton,
  Progress,
  Spinner,
  Select,
  Alert,
  AlertIcon,
  Icon as ChakraIcon
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
  ChevronsRight,
  Zap,
  Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuoteStore } from "../stores/quoteStore";
import { useHasAccess, useIsAdmin } from "../../../shared/utils/permissions";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import { QuoteStepper, getStageIndex } from "../components/QuoteStepper";
import { QuoteDetailDrawer } from "../components/QuoteDetailDrawer";
import QuotePdfModal from "../components/QuotePdfModal";
import { ObserveReasonModal } from "../components/ObserveReasonModal";
import { checkQuoteLock, acquireQuoteLock, releaseQuoteLock, forceUnlockQuote, getActiveQuoteLocks, syncActiveLocksFromRest } from "../services/quoteLockService";
import { calculateQuoteTotals, getQuoteTotalUSD, formatThousands } from "../../../shared/utils/quoteCalculator";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useQueryClient } from "@tanstack/react-query";
import { useGetQuotes } from "../hooks/queries/quotesQueries";
import { updateQuote, deleteQuote, createQuote, getQuotes } from "../services/quoteService";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cleanSellerName, cleanClientName, formatQuoteSellerName } from "../../../shared/utils/quoteLogisticsFormatters";
import { useSellersData } from "../../auth/hooks/queries/authQueries";

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

export const checkHasAdditionalDiscount = (q) => {
  if (!q) return false;
  if (q.hasAdditionalDiscount || q.totals?.hasAdditionalDiscount || q.totals?.hasDiscount || q.totals?.requiresDiscountApproval) {
    return true;
  }
  if (Number(q.maxDiscount || q.totals?.maxDiscount || 0) > 0) {
    return true;
  }
  if (Number(q.headerDiscount || q.DiscountPercent || q.discountPercent || q.totals?.headerDiscount || 0) > 0) {
    return true;
  }
  const quoteProducts = q.products || q.items || q.totals?.products || q.totals?.normalizedProducts || [];
  return quoteProducts.some((it) => {
    const adic = Number(it.lineDiscount ?? it.LineDiscount ?? it.additionalDiscount ?? it.U_TQC_DESV ?? 0);
    return adic > 0;
  });
};

const cleanDeliveryForm = (df) => {
  if (!df) return null;
  const str = typeof df === "object"
    ? String(df.TrnspName || df.label || df.name || df.TrnspCode || "")
    : String(df);
  if (/cotizaci[oó]n|oferta|pedido|boleta|factura/i.test(str.trim())) {
    return null;
  }
  return df;
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
  if (["ENVIADO", "PENDIENTE_APROBACION", "EN_PROCESO", "PENDIENTE_FACTURACION", "BORRADOR", "GENERADO", "DRAFT", "draft", "OBSERVADO", "EN_EDICION", "RECHAZADO"].includes(status)) {
    return false;
  }
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

/**
 * Determina si una cotización ya fue emitida a SAP o aprobada formalmente
 */
export const isQuoteEmittedToSap = (q) => {
  if (!q) return false;
  const status = String(q.approvalStatus || q.state || q.status || "").toUpperCase().trim();
  if (["PENDIENTE", "ENVIADO", "PENDIENTE_APROBACION", "EN_PROCESO", "PENDIENTE_FACTURACION", "BORRADOR", "GENERADO", "DRAFT", "draft", "OBSERVADO", "EN_EDICION"].includes(status)) {
    return false;
  }
  const rawSap = q.sapDocNum || q.totals?.sapDocNum || (q.DocNum && !String(q.DocNum).startsWith("COT-") ? q.DocNum : null);
  if (rawSap && !isNaN(Number(rawSap)) && Number(rawSap) > 0) return true;
  if (["EMITIDO", "EMITIDO_SAP", "PEDIDO_EMITIDO", "FACTURADO", "COMPLETADO"].includes(status)) return true;
  if (q.isSapDirect || q.totals?.isSapDirect) return true;
  return false;
};

/**
 * Determina si una cotización se encuentra pendiente de aprobación / verificación por administración
 */
export const isQuotePendingApproval = (q) => {
  if (!q) return false;
  const status = String(q.approvalStatus || q.state || q.status || "GENERADO").toUpperCase().trim();
  if (isCancelledState(status)) return false;
  if (isDraftState(status)) return false;
  if (isQuoteEmittedToSap(q) || Boolean(q.sapDocNum || q.totals?.sapDocNum || q.isSapDirect || q.totals?.isSapDirect || status === "EMITIDO" || status === "EMITIDO_SAP" || status === "PEDIDO_EMITIDO")) return false;
  if (["PENDIENTE", "PENDIENTE_APROBACION", "ENVIADO", "EN_PROCESO", "PENDIENTE_FACTURACION", "EN_FACTURACION", "OBSERVADO", "EN_EDICION"].includes(status)) {
    return true;
  }
  if (String(q.docNumber || "").toUpperCase().includes("PENDIENTE")) {
    return false;
  }
  return !["APROBADO", "APROBADO_COMERCIAL", "APROBADO_CREDITOS", "EMITIDO", "EMITIDO_SAP"].includes(status);
};

/**
 * Obtiene la fecha actual en la zona horaria oficial del negocio (Perú: America/Lima, UTC-5)
 * en formato YYYY-MM-DD.
 */
export const getTodayPeruDateString = () => {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

/**
 * Obtiene la fecha representativa de una cotización en formato YYYY-MM-DD
 * respetando la zona horaria de Perú si viene como ISO timestamp.
 */
export const getQuoteDateString = (q) => {
  if (!q) return "";
  const rawDate = q.docDate || q.DocDate || q.createdAt || q.updatedAt || "";
  if (!rawDate) return "";
  const str = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    }
  } catch {}
  return str.split("T")[0] || "";
};

/**
 * Suma o resta días a una fecha en formato YYYY-MM-DD de forma exacta,
 * manejando automáticamente meses de 31, 30, 28/29 días y años bisiestos.
 */
export const addDaysToDateString = (dateStr, days) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Calcula la diferencia en días enteros entre dos fechas YYYY-MM-DD (end - start).
 */
export const diffDaysBetweenDateStrings = (startStr, endStr) => {
  if (!startStr || !endStr || !/^\d{4}-\d{2}-\d{2}$/.test(startStr) || !/^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
    return 0;
  }
  const [y1, m1, d1] = startStr.split("-").map(Number);
  const [y2, m2, d2] = endStr.split("-").map(Number);
  const dt1 = new Date(Date.UTC(y1, m1 - 1, d1, 12, 0, 0));
  const dt2 = new Date(Date.UTC(y2, m2 - 1, d2, 12, 0, 0));
  return Math.round((dt2 - dt1) / (1000 * 60 * 60 * 24));
};

/**
 * Obtiene la fecha en que una cotización fue aprobada o emitida a SAP en formato YYYY-MM-DD (hora Perú).
 * Revisa el historial de aprobaciones/emisiones, campos de timestamp y updatedAt.
 */
export const getQuoteApprovalOrUpdatedDateString = (q) => {
  if (!q) return "";

  const today = getTodayPeruDateString();
  const currentStatus = String(q.approvalStatus || q.state || q.status || "").toUpperCase().trim();
  const isEmittedOrApproved = isQuoteEmittedToSap(q) || Boolean(q.sapDocNum || q.DocNum || q.isSapDirect || ["EMITIDO", "EMITIDO_SAP", "APROBADO", "APROBADO_COMERCIAL", "APROBADO_CREDITOS", "PEDIDO_EMITIDO", "FACTURADO", "COMPLETADO"].includes(currentStatus));

  // 1. Si la cotización fue actualizada/aprobada hoy según su timestamp en base de datos
  let updatedAtStr = "";
  if (isEmittedOrApproved && q.updatedAt) {
    const str = String(q.updatedAt).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      updatedAtStr = str;
    } else {
      try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          updatedAtStr = d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
        }
      } catch {}
    }
  }

  // Si su updatedAt en base de datos es de hoy, pertenece indudablemente al flujo operativo de hoy
  if (updatedAtStr && updatedAtStr === today) {
    return today;
  }

  // 2. Revisar campos específicos de aprobación/emisión si existen en el modelo
  const rawApproval = q.approvedAt || q.emittedAt || q.sapEmittedAt || q.totals?.emittedAt || q.totals?.approvedAt;
  if (rawApproval) {
    const str = String(rawApproval).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
      }
    } catch {}
    return str.split("T")[0] || "";
  }

  // 3. Buscar en el historial de eventos la última fecha de emisión o aprobación formal
  const historyList = Array.isArray(q.history)
    ? q.history
    : (typeof q.history === "string" ? (() => { try { return JSON.parse(q.history); } catch { return []; } })() : (Array.isArray(q.historyLog) ? q.historyLog : []));

  if (Array.isArray(historyList) && historyList.length > 0) {
    for (let i = historyList.length - 1; i >= 0; i--) {
      const h = historyList[i];
      const hStatus = String(h?.status || h?.state || "").toUpperCase();
      const hNote = String(h?.note || h?.comment || "").toUpperCase();
      if (
        ["EMITIDO", "EMITIDO_SAP", "APROBADO", "APROBADO_COMERCIAL", "APROBADO_CREDITOS", "PEDIDO_EMITIDO", "FACTURADO"].includes(hStatus) ||
        hNote.includes("APROBADA") ||
        hNote.includes("EMITIDA") ||
        hNote.includes("ORDEN DE VENTA")
      ) {
        const rawTs = h.timestamp || h.date || h.createdAt;
        if (rawTs) {
          const str = String(rawTs).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
          try {
            const d = new Date(str);
            if (!isNaN(d.getTime())) {
              return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
            }
          } catch {}
          return str.split("T")[0] || "";
        }
      }
    }
  }

  // Si no se encontró en historial pero tenemos updatedAt, retornarlo
  if (updatedAtStr) return updatedAtStr;

  return "";
};

/**
 * Determina si una cotización cumple la regla operativa de visualización diaria:
 * 1. Cotizaciones Pendientes de Aprobación: SIEMPRE se muestran (sin importar antigüedad) hasta que sean formalmente aprobadas o canceladas.
 * 2. Cotizaciones Emitidas a SAP o Aprobadas: Se muestran durante todo el día en que fueron aprobadas/emitidas (o creadas si fue hoy).
 *    Al pasar la medianoche (11:59:59 PM PET) del día de su aprobación, pasan a consultarse en Histórico.
 */
export const isQuoteOperationalDaily = (q, todayDateStr) => {
  if (!q) return false;
  // 1. Las pendientes de aprobación NUNCA se ocultan ni se borran por fecha
  if (isQuotePendingApproval(q)) {
    return true;
  }

  // 2. Si ya fue emitida a SAP o aprobada formalmente
  const currentStatus = String(q.approvalStatus || q.state || q.status || "").toUpperCase().trim();
  const isEmitted = isQuoteEmittedToSap(q) || Boolean(q.sapDocNum || q.DocNum || q.isSapDirect || ["EMITIDO", "EMITIDO_SAP", "APROBADO", "APROBADO_COMERCIAL", "APROBADO_CREDITOS", "PEDIDO_EMITIDO", "FACTURADO", "COMPLETADO"].includes(currentStatus));

  if (isEmitted) {
    const today = todayDateStr || getTodayPeruDateString();

    // Regla operativa diaria: si fue aprobada/emitida/actualizada hoy, pertenece a los pedidos aprobados del día
    const approvalDate = getQuoteApprovalOrUpdatedDateString(q);
    if (approvalDate && approvalDate === today) {
      return true;
    }

    // Si fue actualizada/aprobada hoy según updatedAt en base de datos
    if (q.updatedAt) {
      try {
        const d = new Date(q.updatedAt);
        if (!isNaN(d.getTime())) {
          const updDate = d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
          if (updDate === today) return true;
        }
      } catch {}
    }

    // O si su fecha de creación/documento es de hoy
    const qDate = getQuoteDateString(q);
    if (qDate === today) {
      return true;
    }

    return false;
  }

  // Borradores u otros estados intermedios siguen las reglas de su pestaña respectiva
  return true;
};


/**
 * Retorna el puntaje de prioridad para ordenamiento:
 * 1 = PENDIENTES POR APROBAR (MÁXIMA PRIORIDAD - PRIMERO EN LA LISTA)
 * 2 = BORRADORES
 * 3 = EMITIDOS A SAP / APROBADOS (LUEGO DE LOS PENDIENTES)
 * 4 = CANCELADOS / RECHAZADOS / ANULADOS
 */
export const getQuotePriorityScore = (q) => {
  if (!q) return 99;
  const status = String(q.approvalStatus || q.state || q.status || "GENERADO").toUpperCase().trim();
  if (isCancelledState(status)) return 4;
  if (isQuotePendingApproval(q)) return 1;
  if (isDraftState(status)) return 2;
  if (isQuoteEmittedToSap(q) || ["APROBADO", "APROBADO_COMERCIAL", "APROBADO_CREDITOS"].includes(status)) return 3;
  return 2;
};

/**
 * Obtiene el valor numérico del documento o identificador para desempate
 */
export const getQuoteNumericIdentifier = (q) => {
  if (!q) return 0;
  const docDigits = String(q.docNumber || "").replace(/[^0-9]/g, "");
  if (docDigits && docDigits.length > 0) return parseInt(docDigits, 10);
  const sapDigits = String(q.sapDocNum || q.DocNum || "").replace(/[^0-9]/g, "");
  if (sapDigits && sapDigits.length > 0) return parseInt(sapDigits, 10);
  const idDigits = String(q.id || q._id || "").replace(/[^0-9]/g, "");
  if (idDigits && idDigits.length > 0) return parseInt(idDigits, 10);
  return 0;
};

/**
 * Obtiene la marca de tiempo (timestamp) más representativa para desempate cronológico
 */
export const getQuoteTimestamp = (q) => {
  if (!q) return 0;
  const rawDate = q.createdAt || q.docDate || q.updatedAt || q.DocDate || 0;
  if (!rawDate) return 0;
  const t = new Date(rawDate).getTime();
  return isNaN(t) ? 0 : t;
};

/**
 * Comparador de ordenamiento con PRIORIDAD:
 * 1° Pendientes de Aprobación
 * 2° Emitidos a SAP / Aprobados
 * Dentro de cada grupo: fecha más reciente primero (descendente) y número de documento descendente
 */
export const sortQuotesByPriority = (a, b) => {
  const scoreA = getQuotePriorityScore(a);
  const scoreB = getQuotePriorityScore(b);
  if (scoreA !== scoreB) {
    return scoreA - scoreB;
  }

  // Desempate 1: Fecha más reciente primero (descendente)
  const timeA = getQuoteTimestamp(a);
  const timeB = getQuoteTimestamp(b);
  if (timeA !== timeB) {
    return timeB - timeA;
  }

  // Desempate 2: Número de documento descendente
  const numA = getQuoteNumericIdentifier(a);
  const numB = getQuoteNumericIdentifier(b);
  return numB - numA;
};

export const isMatchingDoc = (a, b) => {
  if (!a || !b) return false;

  // Si ambos son objetos y comparten el mismo ID numérico de BD o web
  if (typeof a === "object" && typeof b === "object") {
    const aId = a.id !== undefined && a.id !== null ? String(a.id).trim() : "";
    const bId = b.id !== undefined && b.id !== null ? String(b.id).trim() : "";
    if (aId && bId && aId.toLowerCase() === bId.toLowerCase()) return true;

    const aDoc = a.docNumber ? String(a.docNumber).trim() : "";
    const bDoc = b.docNumber ? String(b.docNumber).trim() : "";
    if (aDoc && bDoc && aDoc.toLowerCase() === bDoc.toLowerCase()) return true;
  }

  // Extraer todos los identificadores posibles de cualquier entidad
  const getIdentifiers = (item) => {
    if (!item) return [];
    if (typeof item !== "object") {
      const s = String(item).trim();
      return s ? [s] : [];
    }
    const ids = [];
    if (item.docNumber) ids.push(String(item.docNumber).trim());
    if (item.id !== undefined && item.id !== null) ids.push(String(item.id).trim());
    if (item.sapDocNum) ids.push(String(item.sapDocNum).trim());
    if (item.DocNum) ids.push(String(item.DocNum).trim());
    return ids;
  };

  const aList = getIdentifiers(a);
  const bList = getIdentifiers(b);

  if (aList.length === 0 || bList.length === 0) return false;

  // Coincidencia directa insensible a mayúsculas
  for (const aVal of aList) {
    for (const bVal of bList) {
      if (aVal.toLowerCase() === bVal.toLowerCase()) return true;
    }
  }

  // Normalización de números quitando prefijos ("COT-", "COT-WEB-", ceros a la izquierda)
  const cleanNum = (str) => {
    if (!str) return "";
    return String(str)
      .replace(/^COT-(?:WEB-)?0*/i, "")
      .replace(/^0+/, "")
      .trim();
  };

  for (const aVal of aList) {
    const cleanA = cleanNum(aVal);
    if (!cleanA) continue;
    for (const bVal of bList) {
      const cleanB = cleanNum(bVal);
      if (cleanB && cleanA.toLowerCase() === cleanB.toLowerCase()) {
        return true;
      }
    }
  }

  return false;
};

export const safeSetLocalQuotes = (quotesList) => {
  try {
    if (!quotesList) {
      localStorage.setItem("grupoLeon_local_quotes", "[]");
      return;
    }
    if (typeof quotesList === "string") {
      localStorage.setItem("grupoLeon_local_quotes", quotesList);
      return;
    }
    const trimmed = Array.isArray(quotesList) ? quotesList.slice(0, 80) : [];
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(trimmed));
  } catch (err) {
    console.warn("⚠️ [localStorage] No se pudo persistir cotizaciones locales:", err?.message);
  }
};

export function QuoteApprovalPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });

  const { username: authUsername, userId: authUserId, role: authRole, salesEmployeeCode: authSalesCode } = useAuthStore();
  const localUser = (localStorage.getItem("username") || localStorage.getItem("userId") || "").toLowerCase();
  const localRole = (localStorage.getItem("role") || "").toUpperCase();
  const hasAccess = useHasAccess();
  const isAdmin = useIsAdmin();
  const isRoleAdmin =
    authRole === "ADMIN" ||
    authRole === "ADMINISTRADOR" ||
    localRole === "ADMIN" ||
    localRole === "ADMINISTRADOR" ||
    String(authRole || "").toUpperCase().startsWith("ADMIN") ||
    String(localRole || "").toUpperCase().startsWith("ADMIN") ||
    isAdmin;

  const isSellerUser = !isRoleAdmin && Boolean(authSalesCode && Number(authSalesCode) > 0 && Number(authSalesCode) !== 20);
  const isAdminUser =
    isRoleAdmin ||
    (!isSellerUser && (
      authRole === "FACTURACION" ||
      authRole === "SUPERVISOR" ||
      hasAccess("POST /quotes/approval") ||
      hasAccess("POST /quotations/approve")
    ));
  const activeCurrentUsername = (authUsername || localStorage.getItem("username") || "").toLowerCase().trim();
  const activeCurrentUserId = authUserId || localStorage.getItem("userId");

  const { data: serverQuotes, isLoading: isServerLoading, refetch: refetchServerQuotes } = useGetQuotes({
    limit: 50
  });

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

  const [quotes, setQuotes] = useState(() => {
    try {
      const stored = localStorage.getItem("grupoLeon_local_quotes");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeepSearching, setIsDeepSearching] = useState(false);
  const [selectedTab, setSelectedTab] = useState("ALL");
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [pdfQuote, setPdfQuote] = useState(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState(null);
  const [observeQuoteTarget, setObserveQuoteTarget] = useState(null);
  const [quoteLocks, setQuoteLocks] = useState(() => getActiveQuoteLocks());
  const [lockAlertTarget, setLockAlertTarget] = useState(null);

  useEffect(() => {
    syncActiveLocksFromRest();
    const handleLocksUpdate = () => {
      setQuoteLocks(getActiveQuoteLocks());
    };
    window.addEventListener("quoteLocksUpdated", handleLocksUpdate);
    return () => window.removeEventListener("quoteLocksUpdated", handleLocksUpdate);
  }, []);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(isAdminUser ? 10 : 10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [highlightedDocId, setHighlightedDocId] = useState(null);
  const { data: sellersResponse } = useSellersData();
  const sellersList = useMemo(() => {
    if (!sellersResponse) return [];
    if (Array.isArray(sellersResponse)) return sellersResponse;
    if (Array.isArray(sellersResponse.sellers)) return sellersResponse.sellers;
    if (Array.isArray(sellersResponse.data)) return sellersResponse.data;
    return [];
  }, [sellersResponse]);
  
  // Sincronización automática de fecha diaria oficial de Perú (cambio de medianoche 11:59:59 PM -> 00:00:00 AM)
  const [currentPeruDate, setCurrentPeruDate] = useState(() => getTodayPeruDateString());

  useEffect(() => {
    const interval = setInterval(() => {
      const today = getTodayPeruDateString();
      if (today !== currentPeruDate) {
        setCurrentPeruDate(today);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentPeruDate]);

  const [processModal, setProcessModal] = useState({
    isOpen: false,
    title: "",
    sub: "",
    step: "",
    icon: Zap,
  });

  useEffect(() => {
    const handleHighlight = (e) => {
      const id = e?.detail?.docId || e?.detail?.id;
      if (id) {
        setHighlightedDocId(String(id));
        setTimeout(() => setHighlightedDocId(null), 4500);
      }
    };
    window.addEventListener("quoteHighlight", handleHighlight);
    return () => window.removeEventListener("quoteHighlight", handleHighlight);
  }, []);

  // Búsqueda profunda en servidor/SAP cuando se especifique un término relevante (mínimo 3 letras o número específico)
  useEffect(() => {
    const queryTerm = searchQuery.trim();
    const cleanDigits = queryTerm.replace(/[^0-9]/g, "");
    // Si la búsqueda está vacía o es muy corta (<3 letras) y no es numérica, la búsqueda instantánea en memoria local es inmediata y suficiente
    if (!queryTerm || (queryTerm.length < 3 && cleanDigits.length < 3 && !queryTerm.startsWith("#"))) {
      setIsDeepSearching(false);
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(async () => {
      try {
        if (isCurrent) setIsDeepSearching(true);
        const results = await getQuotes({ search: queryTerm });
        if (isCurrent && Array.isArray(results) && results.length > 0) {
          setQuotes(prev => {
            const seen = new Set(prev.map(q => String(q.docNumber || q.id)));
            const added = [];
            for (const r of results) {
              const k = String(r.docNumber || r.id);
              if (!seen.has(k)) {
                added.push(r);
                seen.add(k);
              }
            }
            if (added.length > 0) {
              return [...added, ...prev];
            }
            return prev;
          });
        }
      } catch (e) {
      } finally {
        if (isCurrent) setIsDeepSearching(false);
      }
    }, 550);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleRefresh = async (showToast = false) => {
    setIsRefreshing(true);
    try {
      await refetchServerQuotes();
      syncQuotes();
      if (showToast === true) {
        const toastId = "sync-quotes-toast";
        if (!toast.isActive(toastId)) {
          toast({
            id: toastId,
            title: "🔄 Sincronizado",
            description: "Lista de cotizaciones actualizada con el servidor y SAP.",
            status: "success",
            duration: 2000,
            isClosable: true,
            position: "top-right",
          });
        }
      }
    } catch (e) {
      syncQuotes();
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 400);
    }
  };

  // Jerarquía de estados: el mayor índice tiene mayor prioridad (más avanzado en el flujo)
  const STATUS_PRIORITY = [
    "BORRADOR", "GENERADO", "ENVIADO", "EN_PROCESO", "EN_EDICION",
    "OBSERVADO", "RECHAZADO", "APROBADO_COMERCIAL", "EN_FACTURACION", "ANULADO", "FACTURADO", "APROBADO", "EMITIDO", "EMITIDO_SAP", "PEDIDO_EMITIDO"
  ];
  const getStatusPriority = (s) => STATUS_PRIORITY.indexOf(String(s || "BORRADOR").toUpperCase());

  const syncQuotes = () => {
    try {
      const stored = localStorage.getItem("grupoLeon_local_quotes");
      const local = stored ? JSON.parse(stored) : [];

      // Limpiar documentos fantasma vacíos (COT-000000 o sin items ni cliente)
      // y sanear cotizaciones no aprobadas que hayan arrastrado por error atributos de SAP
      // Limpiar documentos fantasma vacíos y cotizaciones ya emitidas a SAP de la memoria local
      let hadChanges = false;
      const cleanLocal = local.filter(q => {
        const isPhantom = String(q.docNumber || "").trim() === "COT-000000" && (!q.products || q.products.length === 0) && Number(q.totals?.grandTotalUSD || 0) === 0;
        if (isPhantom) return false;
        const qStatus = String(q.approvalStatus || q.state || q.status || "").toUpperCase().trim();
        const isEmitted = Boolean(q.sapDocNum || q.DocNum || q.isSapDirect || q.totals?.sapDocNum || q.totals?.DocNum || q.totals?.isSapDirect || qStatus === "EMITIDO" || qStatus === "PEDIDO_EMITIDO");
        // Purgar borradores locales viejos cuyos números ya hayan sido tomados oficialmente en SAP por otros clientes
        const isTakenInServer = Array.isArray(serverQuotes) && serverQuotes.some(sq => {
          const sqDoc = String(sq.docNumber || sq.id || "").toUpperCase().trim();
          const qDoc = String(q.docNumber || q.id || "").toUpperCase().trim();
          const sqIsOfficial = sq.isSapDirect || Boolean(sq.sapDocNum && Number(sq.sapDocNum) > 0) || sq.approvalStatus === "APROBADO" || sq.approvalStatus === "EMITIDO";
          if (!sqIsOfficial || sqDoc !== qDoc) return false;

          const sqClient = String(sq.clientDocument || sq.clientRuc || sq.clientName || "").toUpperCase().trim();
          const qClient = String(q.clientDocument || q.clientRuc || q.clientName || "").toUpperCase().trim();
          return sqClient && qClient && !sqClient.includes(qClient) && !qClient.includes(sqClient);
        });

        if (isEmitted || isTakenInServer) {
          hadChanges = true;
          return false;
        }
        return true;
      });

      if (cleanLocal.length !== local.length || hadChanges) {
        safeSetLocalQuotes(cleanLocal);
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
              docNumber: sq.docNumber || matchedLocal.docNumber || (sq.id ? `COT-WEB-${String(sq.id).padStart(6, '0')}` : null),
              // Estado: usa la fuente más reciente/confiable
              status: finalStatus,
              state: finalStatus,
              approvalStatus: finalStatus,
              isCancelled: sq.isCancelled || finalStatus === "CANCELADO" || finalStatus === "ANULADO",
              isSapDirect: (finalStatus === "ENVIADO" || finalStatus === "PENDIENTE_APROBACION" || finalStatus === "BORRADOR" || finalStatus === "OBSERVADO" || finalStatus === "RECHAZADO")
                ? false
                : Boolean(sq.isSapDirect || sq.totals?.isSapDirect || matchedLocal.isSapDirect || matchedLocal.totals?.isSapDirect || sq.sapDocNum || matchedLocal.sapDocNum || finalStatus === "EMITIDO" || finalStatus === "EMITIDO_SAP"),
              sapDocNum: (finalStatus === "ENVIADO" || finalStatus === "PENDIENTE_APROBACION" || finalStatus === "BORRADOR" || finalStatus === "OBSERVADO" || finalStatus === "RECHAZADO")
                ? null
                : (sq.sapDocNum || sq.totals?.sapDocNum || matchedLocal.sapDocNum || matchedLocal.totals?.sapDocNum || (sq.isSapDirect ? (sq.DocNum || sq.totals?.DocNum) : null)),
              DocNum: (finalStatus === "ENVIADO" || finalStatus === "PENDIENTE_APROBACION" || finalStatus === "BORRADOR" || finalStatus === "OBSERVADO" || finalStatus === "RECHAZADO")
                ? null
                : ((sq.isSapDirect || sq.totals?.isSapDirect || matchedLocal.isSapDirect) ? (sq.DocNum || sq.totals?.DocNum || sq.sapDocNum || matchedLocal.DocNum || matchedLocal.sapDocNum) : (sq.DocNum || matchedLocal.DocNum || null)),
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
              deliveryForm: cleanDeliveryForm(sq.deliveryForm || matchedLocal.deliveryForm || sq.selectedDeliveryForm || matchedLocal.selectedDeliveryForm || null),
              selectedDeliveryForm: cleanDeliveryForm(sq.selectedDeliveryForm || matchedLocal.selectedDeliveryForm || sq.deliveryForm || matchedLocal.deliveryForm || null),
              transport: sq.transport || matchedLocal.transport || sq.selectedTransport || matchedLocal.selectedTransport || null,
              selectedTransport: sq.selectedTransport || matchedLocal.selectedTransport || sq.transport || matchedLocal.transport || null,
              transportDirection: sq.transportDirection || matchedLocal.transportDirection || null,
              deliveryPoint: sq.deliveryPoint || matchedLocal.deliveryPoint || sq.selectedPoint || matchedLocal.selectedPoint || null,
              selectedPoint: sq.selectedPoint || matchedLocal.selectedPoint || sq.deliveryPoint || matchedLocal.deliveryPoint || null,
              paymentType: sq.paymentType || matchedLocal.paymentType || sq.selectedPaymentType || matchedLocal.selectedPaymentType || null,
              selectedPaymentType: sq.selectedPaymentType || matchedLocal.selectedPaymentType || sq.paymentType || matchedLocal.paymentType || null,
              saleCondition: sq.saleCondition || matchedLocal.saleCondition || sq.totals?.saleCondition || matchedLocal.totals?.saleCondition || null,
              documentType: sq.documentType || matchedLocal.documentType || sq.totals?.documentType || matchedLocal.totals?.documentType || null,
              isLetra: Boolean(sq.isLetra ?? matchedLocal.isLetra ?? sq.totals?.isLetra ?? matchedLocal.totals?.isLetra),
              creditTerm: sq.creditTerm || matchedLocal.creditTerm || sq.totals?.creditTerm || matchedLocal.totals?.creditTerm || null,
              comment: sq.comment || matchedLocal.comment || sq.comments || matchedLocal.comments || null,
              deliveryDate: sq.deliveryDate || matchedLocal.deliveryDate || null,
              opNum: sq.opNum || matchedLocal.opNum || sq.totals?.opNum || matchedLocal.totals?.opNum || null,
            };
          }
          return sq;
        });

        const merged = [];
        for (const item of [...enrichedServerQuotes, ...localDraftsOnly]) {
          // Admins can see ALL server quotes (including drafts of other users).
          // Non-admins can only see drafts they own; non-drafts are always visible.
          if (!isAdminUser && !isDraftOwnedByCurrentUser(item, activeCurrentUsername, activeCurrentUserId)) {
            continue;
          }
          const hasDuplicate = merged.some(m => isMatchingDoc(m, item));
          if (!hasDuplicate) {
            merged.push(item);
          }
        }
        setQuotes(merged);
        safeSetLocalQuotes(merged);
      } else if (cleanLocal.length > 0) {
        const validLocal = cleanLocal.filter(q => {
          const notTest = !String(q.docNumber || "").startsWith("TEST-");
          // Admins see all local quotes too; non-admins only see their own drafts
          return notTest && (isAdminUser || isDraftOwnedByCurrentUser(q, activeCurrentUsername, activeCurrentUserId));
        });
        setQuotes(validLocal);
        safeSetLocalQuotes(validLocal);
      } else {
        setQuotes([]);
      }
    } catch (err) {
      console.error("Error sincronizando cotizaciones:", err);
    }
  };

  const loadQuotes = () => handleRefresh(false);

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
                ...localMatch,
                ...sq,
                docNumber: sq.docNumber || localMatch.docNumber || (sq.id ? `COT-WEB-${String(sq.id).padStart(6, '0')}` : null),
                status: finalStatus,
                state: finalStatus,
                approvalStatus: finalStatus,
                isCancelled: isCancelledInServer || Boolean(localMatch.isCancelled),
                isSapDirect: (finalStatus === "ENVIADO" || finalStatus === "PENDIENTE_APROBACION" || finalStatus === "BORRADOR" || finalStatus === "OBSERVADO" || finalStatus === "RECHAZADO")
                  ? false
                  : Boolean(sq.isSapDirect || sq.totals?.isSapDirect),
                sapDocNum: (finalStatus === "ENVIADO" || finalStatus === "PENDIENTE_APROBACION" || finalStatus === "BORRADOR" || finalStatus === "OBSERVADO" || finalStatus === "RECHAZADO")
                  ? null
                  : (sq.sapDocNum || sq.totals?.sapDocNum || (sq.isSapDirect ? (sq.DocNum || sq.totals?.DocNum) : null)),
                DocNum: (finalStatus === "ENVIADO" || finalStatus === "PENDIENTE_APROBACION" || finalStatus === "BORRADOR" || finalStatus === "OBSERVADO" || finalStatus === "RECHAZADO")
                  ? null
                  : ((sq.isSapDirect || sq.totals?.isSapDirect) ? (sq.DocNum || sq.totals?.DocNum || sq.sapDocNum || sq.totals?.sapDocNum) : null),
                // Mantener datos ricos del servidor que no estén en local
                products: (sq.products && sq.products.length > 0) ? sq.products : (localMatch.products || localMatch.items || []),
                client: sq.client || localMatch.client,
                clientName: sq.clientName || localMatch.clientName,
                totals: (sq.totals && sq.totals.grandTotalUSD) ? sq.totals : localMatch.totals,
                deliveryForm: cleanDeliveryForm(sq.deliveryForm || localMatch.deliveryForm || sq.selectedDeliveryForm || localMatch.selectedDeliveryForm || null),
                selectedDeliveryForm: cleanDeliveryForm(sq.selectedDeliveryForm || localMatch.selectedDeliveryForm || sq.deliveryForm || localMatch.deliveryForm || null),
                transport: sq.transport || localMatch.transport || sq.selectedTransport || localMatch.selectedTransport || null,
                selectedTransport: sq.selectedTransport || localMatch.selectedTransport || sq.transport || localMatch.transport || null,
                transportDirection: sq.transportDirection || localMatch.transportDirection || null,
                deliveryPoint: sq.deliveryPoint || localMatch.deliveryPoint || sq.selectedPoint || localMatch.selectedPoint || null,
                selectedPoint: sq.selectedPoint || localMatch.selectedPoint || sq.deliveryPoint || localMatch.deliveryPoint || null,
                paymentType: sq.paymentType || localMatch.paymentType || sq.selectedPaymentType || localMatch.selectedPaymentType || null,
                selectedPaymentType: sq.selectedPaymentType || localMatch.selectedPaymentType || sq.paymentType || localMatch.paymentType || null,
                saleCondition: sq.saleCondition || localMatch.saleCondition || sq.totals?.saleCondition || localMatch.totals?.saleCondition || null,
                documentType: sq.documentType || localMatch.documentType || sq.totals?.documentType || localMatch.totals?.documentType || null,
                isLetra: Boolean(sq.isLetra ?? localMatch.isLetra ?? sq.totals?.isLetra ?? localMatch.totals?.isLetra),
                creditTerm: sq.creditTerm || localMatch.creditTerm || sq.totals?.creditTerm || localMatch.totals?.creditTerm || null,
                comment: sq.comment || localMatch.comment || sq.comments || localMatch.comments || null,
                deliveryDate: sq.deliveryDate || localMatch.deliveryDate || null,
                opNum: sq.opNum || localMatch.opNum || sq.totals?.opNum || localMatch.totals?.opNum || null,
              };
            }
            return sq;
          });

          // Agregar docs locales que no estén en servidor (borradores nuevos)
          const unsyncedLocal = local.filter(q => {
            const notInServer = !serverQuotes.some(sq => isMatchingDoc(sq, q));
            return notInServer && isDraftOwnedByCurrentUser(q, activeCurrentUsername, activeCurrentUserId);
          });

          const merged = [];
          for (const item of [...mergedWithLocal, ...unsyncedLocal]) {
            if (!isDraftOwnedByCurrentUser(item, activeCurrentUsername, activeCurrentUserId)) {
              continue;
            }
            const hasDuplicate = merged.some(m => isMatchingDoc(m, item));
            if (!hasDuplicate) {
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

    // Si la cotización fue emitida a SAP, se retira de inmediato de la vista y almacenamiento local
    const targetQuote = quotes.find(isMatchingItem);
    const stUpper = String(currentStatus || targetQuote?.approvalStatus || targetQuote?.state || targetQuote?.status || "").toUpperCase();

    if (stUpper === "EMITIDO" || currentStatus === "EMITIDO") {
      setQuotes((prev) => prev.filter((q) => !isMatchingItem(q)));
      queryClient.setQueryData(["quotes"], (old) => (Array.isArray(old) ? old.filter((q) => !isMatchingItem(q)) : []));
      const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
      const updated = saved.filter((q) => !isMatchingItem(q));
      localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
      window.dispatchEvent(new Event("localQuotesUpdated"));
      return;
    }

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

    if (stUpper === "EMITIDO") {
      // ✅ Si la cotización fue EMITIDA a SAP, solo removerla de la vista de aprobaciones pendientes
      // SIN borrarla de la base de datos ni eliminar sus notificaciones
      setQuotes((prev) => prev.filter((q) => !isMatchingItem(q)));
      queryClient.setQueryData(["quotes"], (old) => {
        if (!Array.isArray(old)) return [];
        return old.filter((q) => !isMatchingItem(q));
      });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      return;
    }

    const isAlreadyAnulado = stUpper === "ANULADO" || stUpper === "RECHAZADO" || stUpper.includes("ANULADO");
    const isDraft = !currentStatus || DRAFT_STATUSES.includes(currentStatus);
    // Si está APROBADO pero sin sapDocNum (nunca llegó a SAP), también es hard delete
    const isApprovedButNotInSap = (stUpper === "APROBADO" || stUpper === "APROBADO_COMERCIAL") && !targetQuote?.sapDocNum && !isQuoteFromSap(targetQuote);
    // Se borra físicamente si: era borrador, ya estaba anulada/rechazada, o está aprobada pero no emitida a SAP
    const isHardDelete = isDraft || isAlreadyAnulado || isApprovedButNotInSap;

    // Activar modal de carga miniatura
    setProcessModal({
      isOpen: true,
      title: isHardDelete ? "Eliminando Cotización..." : "Anulando Cotización...",
      sub: `Documento ${id}`,
      step: isHardDelete ? "Eliminando registro permanentemente..." : "Cambiando a ANULADO en aplicativo...",
      icon: Trash2,
    });

    // 1. ACTUALIZACIÓN OPTIMISTA INMEDIATA EN PANTALLA (CERO F5)
    if (isHardDelete) {
      setQuotes((prev) => prev.filter((q) => !isMatchingItem(q)));
      queryClient.setQueryData(["quotes"], (old) => {
        if (!Array.isArray(old)) return [];
        return old.filter((q) => !isMatchingItem(q));
      });
    } else {
      const nowIso = new Date().toISOString();
      const adminName = authUsername || "Administrador";
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
      const adminName = authUsername || "Administrador";
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

    // 2.5 Actualizar notificaciones asociadas a esta cotización en almacenamiento local
    try {
      const targetClient = (targetQuote?.clientName || "").trim().toUpperCase();
      const rawNotifs = localStorage.getItem("grupoLeon_notifications");
      const allNotifs = rawNotifs ? JSON.parse(rawNotifs) : [];
      const remainingNotifs = allNotifs.filter(n => {
        const nQuoteId = String(n.quoteId || "").trim().toUpperCase();
        const nId = String(n.id || "").trim().toUpperCase();
        const nTitle = String(n.title || "").toUpperCase();
        const nDesc = String(n.description || "").toUpperCase();
        const isMatchQuote = nQuoteId === idStr.toUpperCase() || nId === idStr.toUpperCase() || (idStr && nQuoteId.includes(idStr.toUpperCase()));
        const isMatchClient = targetClient && targetClient.length > 3 && (nDesc.includes(targetClient) || nTitle.includes(targetClient));
        const isInvalidOrNull = !n.quoteId || n.quoteId === "null" || nTitle.includes("- NULL");
        return !isMatchQuote && !isMatchClient && !isInvalidOrNull;
      });

      // Si es anulación, registrar la notificación para el vendedor
      if (!isHardDelete && targetQuote) {
        const sellerUser = targetQuote.createdByUsername || targetQuote.sellerName;
        const displayDocNumber = targetQuote.docNumber || `COT-WEB-${String(targetQuote.id).padStart(6, "0")}`;
        const nowIso = new Date().toISOString();
        const notifSellerObj = {
          id: `NOTIF-ANUL-${Date.now()}`,
          targetRole: "VENDEDOR",
          targetUsername: sellerUser,
          fromUsername: authUsername || "Administración / Facturación",
          fromUserId: null,
          quoteId: String(targetQuote.docNumber || targetQuote.id),
          title: `🚫 Cotización Anulada - ${displayDocNumber}`,
          description: `Tu cotización ${displayDocNumber} (${targetQuote.clientName || 'Cliente'}) fue anulada por ${authUsername || 'Administración'}.`,
          status: "ANULADO",
          read: false,
          createdAt: nowIso,
          timestamp: nowIso
        };
        remainingNotifs.unshift(notifSellerObj);
      }

      localStorage.setItem("grupoLeon_notifications", JSON.stringify(remainingNotifs));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
    } catch (notifErr) {
      console.error("Error actualizando notificaciones locales:", notifErr);
    }

    // 3. Sincronizar en Backend
    try {
      await deleteQuote(id, isHardDelete);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      console.error("Error eliminando cotización en el servidor:", e);
    } finally {
      setTimeout(() => setProcessModal(prev => ({ ...prev, isOpen: false })), 450);
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

  // ── RECALL: Vendedor retira solicitud que aún no fue abierta por administración ──
  const handleRecallQuote = async (quote) => {
    const docId = quote?.docNumber || quote?.id;
    if (!docId) return;

    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const target = quote || quotes.find(q => isMatchingDoc(q, docId)) || saved.find(q => isMatchingDoc(q, docId));

    // Regla Estricta: Si ya fue abierta por administración o está en revisión, el vendedor NO puede retirarla
    const lockCheck = checkQuoteLock(docId, authUserId, authUsername) || (target?.id ? checkQuoteLock(target.id, authUserId, authUsername) : { isLocked: false, isOwnLock: false, hasActiveLock: false });
    const isUnderReview = Boolean(lockCheck.isLocked) || Boolean(quoteLocks[String(docId)]) || Boolean(target?.id && quoteLocks[String(target.id)]);
    const hasAdminViewHistory = Array.isArray(target?.historyLog) && target.historyLog.some(h => 
      h.status === "VISTO" || (h.note && (h.note.includes("abierta y leída") || h.note.includes("👁️")))
    );
    const isViewed = Boolean(
      target?.viewedByAdmin ||
      target?.totals?.viewedByAdmin ||
      (target?.adminViewCount && Number(target.adminViewCount) > 0) ||
      (target?.totals?.adminViewCount && Number(target.totals.adminViewCount) > 0) ||
      target?.viewedAt ||
      target?.totals?.viewedAt ||
      hasAdminViewHistory
    );

    if (isUnderReview || isViewed) {
      toast({
        title: "No se puede retirar la cotización",
        description: "Esta cotización ya fue abierta o está en revisión por administración. Solo podrá editarse si recibe una observación.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    const idStr = String(docId);
    setProcessModal({
      isOpen: true,
      title: "Retirando Solicitud...",
      sub: `Cotización ${idStr}`,
      step: "Abriendo editor comercial...",
      icon: Undo2,
    });

    const nowIso = new Date().toISOString();
    const recallUser = authUsername || "vendedor";
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

    const isEmittedToSap = Boolean(target?.sapDocNum || target?.approvalStatus === "EMITIDO" || target?.state === "EMITIDO");
    const fallbackDocNum = isEmittedToSap
      ? (target?.docNumber && !String(target.docNumber).includes("WEB") && !String(target.docNumber).includes("PENDIENTE") ? target.docNumber : `COT-${String(target?.sapDocNum || docId).padStart(6, '0')}`)
      : (target?.docNumber && !String(target.docNumber).match(/^COT-0+\d+$/i) ? target.docNumber : (target?.id ? `COT-WEB-${String(target.id).padStart(6, '0')}` : null));

    const fullRecallDoc = {
      ...(target || {}),
      id: target?.id || docId,
      docNumber: fallbackDocNum,
      ...recallFields
    };

    try {
      await updateQuote(fullRecallDoc);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    } catch (e) {
      console.error("Error retirando cotización:", e);
    } finally {
      setTimeout(() => setProcessModal(prev => ({ ...prev, isOpen: false })), 450);
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
      description: `La solicitud ${idStr} fue retirada antes de que el Administrador la abriera. Se cargó en tu formulario para corregir.`,
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
    const adminName = authUsername || "Administrador";
    const reasonText = typeof reason === "string" && reason.trim() ? reason.trim() : (typeof docIdOrQuote === "string" && docIdOrQuote.trim() ? docIdOrQuote.trim() : "Cotización observada para corrección");
    
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
      note: `💬 Devuelto por ${adminName}: ${reasonText}`
    };
    const updatedHistory = [newLog, ...prevLogs];

    const isEmittedToSap = Boolean(target?.sapDocNum || target?.approvalStatus === "EMITIDO" || target?.state === "EMITIDO");
    const finalDocNumber = isEmittedToSap
      ? (target?.docNumber && !String(target.docNumber).includes("WEB") && !String(target.docNumber).includes("PENDIENTE") ? target.docNumber : `COT-${String(target?.sapDocNum || docId).padStart(6, '0')}`)
      : (target?.docNumber && !String(target.docNumber).match(/^COT-0+\d+$/i) ? target.docNumber : (target?.id ? `COT-WEB-${String(target.id).padStart(6, '0')}` : "COT-PENDIENTE"));

    setProcessModal({
      isOpen: true,
      title: "Devolviendo con Observación...",
      sub: `Cotización ${finalDocNumber}`,
      step: "Notificando al vendedor en tiempo real...",
      icon: MessageSquareWarning,
    });

    const fullObservedDoc = {
      ...(target || {}),
      id: target?.id || docId,
      docNumber: isEmittedToSap ? finalDocNumber : (finalDocNumber.startsWith("COT-WEB-") ? finalDocNumber : null),
      status: "OBSERVADO",
      state: "OBSERVADO",
      approvalStatus: "OBSERVADO",
      updatedAt: nowIso,
      observedAt: nowIso,
      observedBy: adminName,
      observationReason: reasonText,
      rejectionReason: reasonText,
      observations: reasonText,
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
    setObserveQuoteTarget(null);
    forceUnlockQuote(docId);
    if (target?.id) forceUnlockQuote(target.id);

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
    } finally {
      setTimeout(() => setProcessModal(prev => ({ ...prev, isOpen: false })), 450);
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
    const adminName = authUsername || "Administrador";
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

    const isEmittedToSap = Boolean(target?.sapDocNum || target?.approvalStatus === "EMITIDO" || target?.state === "EMITIDO");
    const finalDocNumber = isEmittedToSap
      ? (target?.docNumber && !String(target.docNumber).includes("WEB") && !String(target.docNumber).includes("PENDIENTE") ? target.docNumber : `COT-${String(target?.sapDocNum || docId).padStart(6, '0')}`)
      : (target?.docNumber && !String(target.docNumber).match(/^COT-0+\d+$/i) ? target.docNumber : (target?.id ? `COT-WEB-${String(target.id).padStart(6, '0')}` : "COT-PENDIENTE"));

    setProcessModal({
      isOpen: true,
      title: "Registrando Rechazo...",
      sub: `Cotización ${finalDocNumber}`,
      step: "Actualizando estado en el sistema...",
      icon: XCircle,
    });

    const fullRejectedDoc = {
      ...(target || {}),
      id: target?.id || docId,
      docNumber: isEmittedToSap ? finalDocNumber : (finalDocNumber.startsWith("COT-WEB-") ? finalDocNumber : null),
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
    forceUnlockQuote(docId);
    if (target?.id) forceUnlockQuote(target.id);

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
    } finally {
      setTimeout(() => setProcessModal(prev => ({ ...prev, isOpen: false })), 450);
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
    const adminName = authUsername || "Administrador";
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
    const isEmittedToSap = Boolean(target?.sapDocNum || target?.approvalStatus === "EMITIDO" || target?.state === "EMITIDO" || nextStatus === "EMITIDO");
    const finalDocNumber = isEmittedToSap
      ? (target?.docNumber && !String(target.docNumber).includes("WEB") && !String(target.docNumber).includes("PENDIENTE") ? target.docNumber : `COT-${String(target?.sapDocNum || docId).padStart(6, '0')}`)
      : (target?.docNumber && !String(target.docNumber).match(/^COT-0+\d+$/i) ? target.docNumber : (target?.id ? `COT-WEB-${String(target.id).padStart(6, '0')}` : "COT-PENDIENTE"));

    const isApproval = nextStatus === "APROBADO_COMERCIAL" || nextStatus === "APROBADO" || nextStatus === "EN_FACTURACION";
    setProcessModal({
      isOpen: true,
      title: isApproval ? "Procesando Aprobación..." : "Actualizando Estado...",
      sub: `Cotización ${finalDocNumber}`,
      step: `Transición a ${nextStatus}...`,
      icon: isApproval ? CheckCircle2 : Zap,
    });

    const fullDoc = {
      ...(target || {}),
      id: target?.id || docId,
      docNumber: isEmittedToSap ? finalDocNumber : (finalDocNumber.startsWith("COT-WEB-") ? finalDocNumber : null),
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
    } finally {
      setTimeout(() => setProcessModal(prev => ({ ...prev, isOpen: false })), 450);
    }
  };

  const markAsViewedByAdmin = (q) => {
    if (!isAdminUser || !q) return;
    const docId = q.docNumber || q.id;
    const nowIso = new Date().toISOString();
    const viewerName = authUsername || "Administrador";

    const isFirstView = !q.viewedByAdmin && !q.totals?.viewedByAdmin;
    const currentCount = Number(q.adminViewCount || q.totals?.adminViewCount || 0);
    const currentLogs = Array.isArray(q.historyLog) ? q.historyLog : [];
    const newLog = isFirstView
      ? { status: "VISTO", timestamp: nowIso, user: viewerName, note: `👁️ Solicitud abierta y leída por ${viewerName}` }
      : null;
    const updatedHistory = newLog ? [newLog, ...currentLogs] : currentLogs;

    const viewFields = {
      viewedByAdmin: true,
      viewedAt: q.viewedAt || q.totals?.viewedAt || nowIso,
      lastViewedAt: nowIso,
      adminViewCount: currentCount + 1,
      historyLog: updatedHistory,
    };

    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const updated = saved.map(item => {
      if (isMatchingDoc(item, docId) || (q.id && item.id === q.id)) {
        return {
          ...item,
          ...viewFields,
          totals: {
            ...(item.totals || {}),
            ...viewFields
          }
        };
      }
      return item;
    });

    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
    window.dispatchEvent(new Event("localQuotesUpdated"));

    // Actualizar estado local y caché de React Query optimistamente
    setQuotes(prev => prev.map(item => isMatchingDoc(item, docId) ? { ...item, ...viewFields, totals: { ...(item.totals || {}), ...viewFields } } : item));
    queryClient.setQueriesData({ queryKey: ["quotes"] }, (old) => {
      if (!Array.isArray(old)) return old;
      return old.map(item => isMatchingDoc(item, docId) ? { ...item, ...viewFields, totals: { ...(item.totals || {}), ...viewFields } } : item);
    });

    const targetQuote = updated.find(i => isMatchingDoc(i, docId));
    if (targetQuote) setSelectedQuote(targetQuote);

    // Persistir en backend API para sincronización multiusuario (WebSocket broadcast a vendedores)
    updateQuote({
      id: q.id,
      docNumber: q.docNumber,
      ...viewFields
    }).catch(err => {
      console.warn("⚠️ Aviso sincronizando estado de vista con backend:", err.message);
    });
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
    const qSlp = q.salesEmployeeCode || q.SlpCode || q.totals?.salesEmployeeCode;

    if (authSalesCode && qSlp && Number(authSalesCode) === Number(qSlp)) {
      return true;
    }

    if (activeCurrentUsername) {
      if (qUser === activeCurrentUsername || qSeller === activeCurrentUsername) return true;
      if (qSeller && (qSeller.includes(activeCurrentUsername) || activeCurrentUsername.includes(qSeller))) return true;
      if (qUser && (qUser.includes(activeCurrentUsername) || activeCurrentUsername.includes(qUser))) return true;
    }

    if (authSalesCode && sellersResponse) {
      const list = Array.isArray(sellersResponse) ? sellersResponse : (sellersResponse?.sellers || []);
      const mySapSeller = list.find(s => Number(s.SalesEmployeeCode ?? s.value) === Number(authSalesCode));
      if (mySapSeller?.label || mySapSeller?.SalesEmployeeName) {
        const fullLabel = String(mySapSeller.label || mySapSeller.SalesEmployeeName).toLowerCase();
        const tokens = fullLabel.split(/\s+/).filter(t => t.length >= 3 && !/^\d+$/.test(t) && !t.includes("."));
        if (tokens.some(t => qSeller.includes(t) || qUser.includes(t))) {
          return true;
        }
      }
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

  // Proteger pestañas exclusivas de administrador: Vendedores solo ven flujo operativo estándar
  useEffect(() => {
    if (!isAdminUser && selectedTab === "ANULADO") {
      setSelectedTab("ALL");
    }
  }, [isAdminUser, selectedTab]);

  // Filtrado de la lista por Pestañas, Buscador y Filtros Avanzados de Histórico
  const filteredQuotes = useMemo(() => {
    // 1. Filtrar por rol y acceso
    const visibleQuotes = quotes.filter((q) => {
      if (!isAdminUser && !isQuoteOwnedByCurrentUser(q)) {
        return false;
      }
      return true;
    });

    const isSearching = searchQuery.trim().length > 0;
    const rawQuery = searchQuery.trim().toLowerCase();
    const cleanNumericQuery = rawQuery.replace(/[^0-9]/g, "");

    const matchesSearch = (q) => {
      if (!isSearching) return true;
      const docNum = String(q.docNumber || q.id || "").toLowerCase();
      const sapDocNum = String(q.sapDocNum || q.DocNum || q.totals?.DocNum || q.totals?.sapDocNum || "").toLowerCase();
      const clientName = String(q.clientName || q.client?.CardName || q.CardName || "").toLowerCase();
      const clientDoc = String(q.clientDocument || q.client?.CardCode || q.CardCode || "").toLowerCase();
      const sellerStr = String(q.sellerName || q.createdByUsername || "").toLowerCase();
      const opNum = String(q.opNum || "").toLowerCase();

      const cleanRawQuery = rawQuery.replace(/[^a-z0-9]/g, "");
      const cleanDocNum = docNum.replace(/[^a-z0-9]/g, "");
      const cleanClientDoc = clientDoc.replace(/[^a-z0-9]/g, "");
      const cleanClientName = clientName.replace(/[^a-z0-9]/g, "");

      if (
        docNum.includes(rawQuery) ||
        clientName.includes(rawQuery) ||
        clientDoc.includes(rawQuery) ||
        sellerStr.includes(rawQuery) ||
        opNum.includes(rawQuery)
      ) {
        return true;
      }
      if (sapDocNum && (sapDocNum === rawQuery || `#${sapDocNum}` === rawQuery || `sap #${sapDocNum}`.includes(rawQuery))) {
        return true;
      }

      // Coincidencia normalizada sin símbolos (ej: "COT019830" <-> "COT-019830", "DL1A" <-> "DL-1A")
      if (cleanRawQuery && cleanRawQuery.length >= 2) {
        if (cleanDocNum.includes(cleanRawQuery)) return true;
        if (cleanClientDoc.includes(cleanRawQuery)) return true;
        if (cleanClientName.includes(cleanRawQuery)) return true;
        if (sapDocNum && String(sapDocNum).includes(cleanRawQuery)) return true;
      }

      if (cleanNumericQuery) {
        if (cleanClientDoc && (cleanClientDoc === cleanNumericQuery || cleanClientDoc.includes(cleanNumericQuery))) return true;
        if (sapDocNum === cleanNumericQuery) return true;
        if (docNum.replace(/[^0-9]/g, "").endsWith(cleanNumericQuery) || docNum.includes(cleanNumericQuery)) return true;
      }

      // Buscar por código o nombre de producto dentro de los ítems de la cotización
      const items = q.products || q.items || [];
      if (items.length > 0) {
        const matchesProduct = items.some((item) => {
          const pCode = String(item.productCode || item.itemCode || item.ItemCode || item.code || item.id || "").toLowerCase();
          const pName = String(item.productName || item.description || item.name || item.ItemDescription || "").toLowerCase();
          const cleanPCode = pCode.replace(/[^a-z0-9]/g, "");
          const cleanPName = pName.replace(/[^a-z0-9]/g, "");

          if (pCode.includes(rawQuery) || pName.includes(rawQuery)) return true;
          if (cleanRawQuery && cleanRawQuery.length >= 2) {
            if (cleanPCode.includes(cleanRawQuery) || cleanPName.includes(cleanRawQuery)) return true;
          }
          return false;
        });
        if (matchesProduct) return true;
      }

      return false;
    };

    // Si el usuario está buscando algo específico en la barra de búsqueda (sin restringir por fecha):
    if (isSearching) {
      return visibleQuotes
        .filter((q) => matchesSearch(q))
        .sort(sortQuotesByPriority);
    }

    // Pestañas Operativas del Día a Día (Carga Rápida)
    const result = visibleQuotes.filter((q) => {
      // Regla de optimización operativa: solo cotizaciones de todo el día de hoy si ya están emitidas en SAP.
      // Las pendientes de aprobación NUNCA se ocultan ni se borran por fecha; permanecen hasta ser aprobadas.
      if (!isQuoteOperationalDaily(q, currentPeruDate)) {
        return false;
      }

      const currentStatus = q.approvalStatus || q.state || q.status || "GENERADO";
      const isDraft = isDraftState(currentStatus);
      const isCancelled = isCancelledState(currentStatus);

      // Filtro por pestaña operativa:
      if (selectedTab === "ALL") {
        if (isDraft || isCancelled) return false;
      } else if (selectedTab === "GENERADO") {
        if (!isDraft) return false;
      } else if (selectedTab === "ENVIADO") {
        if (!["ENVIADO", "EN_PROCESO", "PENDIENTE_APROBACION", "OBSERVADO", "EN_EDICION", "PENDIENTE_FACTURACION", "EN_FACTURACION"].includes(currentStatus)) return false;
      } else if (selectedTab === "APROBADO" || selectedTab === "APROBADO_COMERCIAL") {
        if (!["APROBADO", "APROBADO_COMERCIAL", "APROBADO_CREDITOS", "EMITIDO", "EMITIDO_SAP", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO"].includes(currentStatus) || isCancelled) return false;
      } else if (selectedTab === "ANULADO" || selectedTab === "RECHAZADO") {
        if (!isCancelled) return false;
      }

      return true;
    });

    // Ordenamiento por prioridad: Pendientes por aprobar primero, luego emitidos a SAP
    return result.sort(sortQuotesByPriority);
  }, [
    quotes,
    selectedTab,
    searchQuery,
    isAdminUser,
    activeCurrentUsername,
    activeCurrentUserId,
    currentPeruDate
  ]);

  const effectivePageSize = pageSize;
  const totalItems = filteredQuotes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedQuotes = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredQuotes.slice(start, start + pageSize);
  }, [filteredQuotes, validCurrentPage, pageSize]);

  const handlePageChange = (newPageOrFn) => {
    setCurrentPage(newPageOrFn);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Contadores por Estado (Filtrados por rol y regla diaria operativa)
  const counts = useMemo(() => {
    const res = { ALL: 0, GENERADO: 0, ENVIADO: 0, APROBADO_COMERCIAL: 0, PENDIENTE_FACTURACION: 0, APROBADO: 0, ANULADO: 0, RECHAZADO: 0 };
    quotes.forEach((q) => {
      const st = q.approvalStatus || q.state || q.status || "GENERADO";
      const isDraft = isDraftState(st);
      const isCancelled = isCancelledState(st);

      // Si es Vendedor, solo computar sus propias cotizaciones (incluyendo borradores)
      if (!isAdminUser) {
        if (!isQuoteOwnedByCurrentUser(q)) {
          return;
        }
      }

      // Pestañas operativas: solo computan si cumplen la regla diaria operativa
      if (!isQuoteOperationalDaily(q, currentPeruDate)) {
        return;
      }

      if (isDraft) {
        res.GENERADO++;
      } else if (isCancelled) {
        res.ANULADO++;
        res.RECHAZADO++;
      } else {
        res.ALL++;
        if (["ENVIADO", "EN_PROCESO", "PENDIENTE_APROBACION", "OBSERVADO", "EN_EDICION", "PENDIENTE_FACTURACION", "EN_FACTURACION"].includes(st)) res.ENVIADO++;
        else if (["APROBADO", "APROBADO_COMERCIAL", "APROBADO_CREDITOS", "EMITIDO", "EMITIDO_SAP", "FACTURADO", "PEDIDO_EMITIDO", "COMPLETADO"].includes(st)) res.APROBADO++;
      }
    });
    return res;
  }, [quotes, isAdminUser, activeCurrentUsername, activeCurrentUserId, currentPeruDate]);

  const renderStatusBadge = (status, q = null) => {
    const getMainBadge = () => {
      switch (status) {
        case "GENERADO":
        case "DRAFT":
        case "draft":
        case "BORRADOR":
        case "borrador":
          return (
            <Badge bg="#eff6ff" color="#1e40af" border="1.5px solid #bfdbfe" px={2.5} py={0.5} borderRadius="full" fontSize="11px" fontWeight="800" textTransform="none" letterSpacing="normal" fontFamily="Arial, sans-serif" whiteSpace="nowrap">
              1. Borrador 📝
            </Badge>
          );
        case "PENDIENTE_APROBACION":
        case "ENVIADO":
        case "EN_PROCESO":
        case "EN_FACTURACION":
        case "PENDIENTE_FACTURACION": {
          const docKey = q?.docNumber || q?.id;
          const lockCheck = docKey ? (checkQuoteLock(docKey, authUserId, authUsername) || (q?.id ? checkQuoteLock(q.id, authUserId, authUsername) : { isLocked: false, isOwnLock: false, hasActiveLock: false })) : { isLocked: false, isOwnLock: false, hasActiveLock: false };
          if (lockCheck.hasActiveLock) {
            return (
              <Badge
                bg={lockCheck.isOwnLock ? "#dcfce7" : "#fef3c7"}
                color={lockCheck.isOwnLock ? "#166534" : "#92400e"}
                border="1.5px solid"
                borderColor={lockCheck.isOwnLock ? "#86efac" : "#fcd34d"}
                px={2.5}
                py={0.5}
                borderRadius="full"
                fontSize="11px"
                fontWeight="800"
                textTransform="none"
                letterSpacing="normal"
                fontFamily="Arial, sans-serif"
                whiteSpace="nowrap"
                display="inline-flex"
                alignItems="center"
                gap={1}
                boxShadow="xs"
                title={`En revisión por ${lockCheck.lockInfo?.lockedByUsername || "Usuario"} (${lockCheck.lockInfo?.lockedByProfile || "Facturación"})`}
              >
                <Lock className="w-3 h-3 flex-shrink-0" />
                <Text as="span">{lockCheck.isOwnLock ? "1. En Revisión (Tú)" : "1. En Revisión"}</Text>
              </Badge>
            );
          }
          return (
            <Badge bg="#e0f2fe" color="#0369a1" border="1.5px solid #bae6fd" px={2.5} py={0.5} borderRadius="full" fontSize="11px" fontWeight="800" textTransform="none" letterSpacing="normal" fontFamily="Arial, sans-serif" whiteSpace="nowrap">
              1. Pend. Aprobación ⏳
            </Badge>
          );
        }
        case "APROBADO_COMERCIAL":
        case "EMITIDO":
        case "EMITIDO_SAP":
        case "PEDIDO_EMITIDO":
        case "ORDEN_EMITIDA":
        case "FACTURADO":
        case "COMPLETADO":
        case "APROBADO": {
          const hasSap = Boolean(q?.isSapDirect || q?.totals?.isSapDirect || q?.sapDocNum || q?.totals?.sapDocNum || status === "EMITIDO" || status === "EMITIDO_SAP" || status === "PEDIDO_EMITIDO" || status === "ORDEN_EMITIDA");
          if (hasSap) {
            return (
              <Badge bg="#dcfce7" color="#166534" border="1.5px solid #bbf7d0" px={2.5} py={0.5} borderRadius="full" fontSize="11px" fontWeight="800" textTransform="none" letterSpacing="normal" fontFamily="Arial, sans-serif" whiteSpace="nowrap">
                🔒 2. Orden de Venta Emitida SAP ✓
              </Badge>
            );
          }
          return (
            <Badge bg="#dcfce7" color="#15803d" border="1.5px solid #86efac" px={2.5} py={0.5} borderRadius="full" fontSize="11px" fontWeight="800" textTransform="none" letterSpacing="normal" fontFamily="Arial, sans-serif" whiteSpace="nowrap">
              ✅ 2. Orden Aprobada
            </Badge>
          );
        }
        case "ANULADO":
          return (
            <Badge bg="#fef2f2" color="#b91c1c" border="1.5px solid #fca5a5" px={2.5} py={0.5} borderRadius="full" fontSize="11px" fontWeight="800" textTransform="none" letterSpacing="normal" fontFamily="Arial, sans-serif" whiteSpace="nowrap">
              ❌ Anulado (Aplicativo)
            </Badge>
          );
        case "CANCELADO":
          return (
            <Badge bg="#fee2e2" color="#991b1b" border="1.5px solid #f87171" px={2.5} py={0.5} borderRadius="full" fontSize="11px" fontWeight="800" textTransform="none" letterSpacing="normal" fontFamily="Arial, sans-serif" whiteSpace="nowrap">
              🚫 Cancelado en SAP
            </Badge>
          );
        case "RECHAZADO":
          return (
            <Badge bg="#fee2e2" color="#991b1b" border="1.5px solid #fecaca" px={2.5} py={0.5} borderRadius="full" fontSize="11px" fontWeight="800" textTransform="none" letterSpacing="normal" fontFamily="Arial, sans-serif" whiteSpace="nowrap">
              Rechazado ❌
            </Badge>
          );
        case "OBSERVADO":
          return (
            <Badge bg="#fff7ed" color="#c2410c" border="1.5px solid #fdba74" px={2.5} py={0.5} borderRadius="full" fontSize="11px" fontWeight="800" textTransform="none" letterSpacing="normal" fontFamily="Arial, sans-serif" whiteSpace="nowrap" display="inline-flex" alignItems="center" gap={1}>
              <MessageSquare className="w-3 h-3 text-orange-600" />
              <Text as="span">1. Observado para Corrección 💬</Text>
            </Badge>
          );
        case "EN_EDICION":
          return (
            <Badge bg="#ffedd5" color="#ea580c" border="1.5px solid #fdba74" px={2.5} py={0.5} borderRadius="full" fontSize="11px" fontWeight="800" textTransform="none" letterSpacing="normal" fontFamily="Arial, sans-serif" whiteSpace="nowrap">
              En Corrección ↩️
            </Badge>
          );
        default:
          return <Badge px={2.5} py={0.5} borderRadius="full" fontSize="11px" fontWeight="800" textTransform="none" letterSpacing="normal" fontFamily="Arial, sans-serif" whiteSpace="nowrap">{status}</Badge>;
      }
    };

    const mainBadge = getMainBadge();
    const hasVolume = Boolean(
      q?.hasVolumeDiscount ||
      q?.totals?.hasVolumeDiscount ||
      (Array.isArray(q?.products || q?.items) && (q?.products || q?.items).some(p => {
        const qty = Number(p.quantity || p.Quantity || 0);
        const s = Number(p.discount || p.sapDiscount || 0);
        const pr = Number(p.promoDiscount || 0);
        const a = Number(p.lineDiscount || 0);
        return qty > 100 && (s + pr + a) > 55.01;
      }))
    );

    if (!hasVolume) return mainBadge;

    return (
      <VStack spacing={1} align="start">
        {mainBadge}
        <Badge
          bg="#fff7ed"
          color="#c2410c"
          border="1.5px solid #fdba74"
          px={2.5}
          py={0.5}
          borderRadius="full"
          fontSize="9.5px"
          fontWeight="900"
          textTransform="uppercase"
          letterSpacing="wider"
          boxShadow="xs"
        >
          🔥 Mayoreo (&gt;55% a 65%)
        </Badge>
      </VStack>
    );
  };
  // Botones de acción por fila, con diseño ultra elegante y optimizado para móvil y escritorio
  const renderRowActions = (q, docId, status, { stack = false } = {}) => {
    const isDraft = !status || isDraftState(status);
    const isPendingApproval = status === "ENVIADO" || status === "EN_PROCESO" || status === "PENDIENTE_APROBACION";
    const isPendingBilling = status === "PENDIENTE_FACTURACION";
    const isSap = isQuoteFromSap(q);
    const isAlreadyAnulado = isCancelledState(status);
    const isApprovedOrder = status === "APROBADO" || status === "APROBADO_COMERCIAL" || status === "FACTURADO" || status === "PEDIDO_EMITIDO" || status === "EMITIDO" || status === "EMITIDO_SAP" || status === "COMPLETADO" || Boolean(q.sapDocNum);
    const canShowTrashIcon = false; // 🚫 SOLO BORRADORES PUEDEN ELIMINARSE (manejado arriba en isDraft)

    const lockCheck = checkQuoteLock(docId, authUserId, authUsername) || (q?.id ? checkQuoteLock(q.id, authUserId, authUsername) : { isLocked: false, isOwnLock: false, hasActiveLock: false });
    const isLockedByOther = Boolean(lockCheck.isLocked);
    const hasAdminViewHistory = Array.isArray(q?.historyLog) && q.historyLog.some(h => 
      h.status === "VISTO" || (h.note && (h.note.includes("abierta y leída") || h.note.includes("👁️")))
    );
    const isViewedByAdmin = Boolean(
      q?.viewedByAdmin ||
      q?.totals?.viewedByAdmin ||
      (q?.adminViewCount && Number(q.adminViewCount) > 0) ||
      (q?.totals?.adminViewCount && Number(q.totals.adminViewCount) > 0) ||
      q?.viewedAt ||
      q?.totals?.viewedAt ||
      hasAdminViewHistory
    );
    const isUnderReview = isLockedByOther || Boolean(quoteLocks[String(docId)]) || Boolean(q?.id && quoteLocks[String(q.id)]);
    const isViewedOrUnderReview = isUnderReview || isViewedByAdmin;

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
              {/* Botón Principal: Verificar / Ver Detalle con Control de Concurrencia */}
              {(() => {
                const lockCheck = checkQuoteLock(docId, authUserId, authUsername) || (q?.id ? checkQuoteLock(q.id, authUserId, authUsername) : { isLocked: false, isOwnLock: false, hasActiveLock: false });
                const isLockedByOther = Boolean(lockCheck.isLocked);
                const isLockedBySelf = Boolean(lockCheck.isOwnLock);

                // 🛡️ Si la cotización está siendo revisada por Facturación / Administración por otra persona:
                if (isLockedByOther && (isPendingApproval || isPendingBilling)) {
                  return (
                    <Button
                      size="xs"
                      h="32px"
                      bg="#fef3c7"
                      color="#92400e"
                      variant="outline"
                      borderColor="#fcd34d"
                      _hover={{ bg: "#fde68a", borderColor: "#f59e0b" }}
                      leftIcon={<Lock className="w-3.5 h-3.5 text-amber-700" />}
                      onClick={() => setLockAlertTarget({ quote: q, lockInfo: lockCheck.lockInfo })}
                      fontWeight="800"
                      borderRadius="lg"
                      px={2.5}
                      title={`En revisión por ${lockCheck.lockInfo?.lockedByUsername} (${lockCheck.lockInfo?.lockedByProfile})`}
                    >
                      En Revisión 🔒
                    </Button>
                  );
                }

                // 🛡️ Si la cotización está siendo revisada por el usuario actual:
                if (isLockedBySelf && (isPendingApproval || isPendingBilling)) {
                  return (
                    <Button
                      size="xs"
                      h="32px"
                      bg="#0f766e"
                      color="white"
                      _hover={{ bg: "#115e59", transform: "translateY(-1px)", boxShadow: "0 4px 12px rgba(15,118,110,0.3)" }}
                      _active={{ bg: "#134e4a" }}
                      leftIcon={<Lock className="w-3.5 h-3.5 text-emerald-200" />}
                      onClick={() => {
                        markAsViewedByAdmin(q);
                        const freshDoc = quotes.find(item => isMatchingDoc(item, q.docNumber || q.id)) || q;
                        setSelectedQuote({ ...freshDoc });
                        setIsDetailOpen(true);
                      }}
                      fontWeight="800"
                      borderRadius="lg"
                      px={3}
                      boxShadow="xs"
                      title="Estás verificando esta cotización con candado activo"
                    >
                      Verificando 🔒
                    </Button>
                  );
                }

                return (
                  <>
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
                        const freshDoc = quotes.find(item => isMatchingDoc(item, q.docNumber || q.id)) || q;
                        setSelectedQuote({ ...freshDoc });
                        setIsDetailOpen(true);
                      }}
                      fontWeight="700"
                      borderRadius="lg"
                      px={3}
                      boxShadow="xs"
                    >
                      {isAdminUser && (isPendingApproval || isPendingBilling) ? "Verificar" : "Vista"}
                    </Button>
                    {isAdminUser && (isPendingApproval || isPendingBilling) && (
                      <Button
                        size="xs"
                        h="32px"
                        colorScheme="orange"
                        bg="#fff7ed"
                        color="#c2410c"
                        border="1px solid #fdba74"
                        _hover={{ bg: "#ffedd5", borderColor: "#ea580c" }}
                        leftIcon={<MessageSquare className="w-3.5 h-3.5 text-orange-600" />}
                        onClick={() => handleObserveQuote(q)}
                        fontWeight="700"
                        borderRadius="lg"
                        px={2.5}
                        title="Devolver al vendedor con observación para corrección"
                      >
                        Observar
                      </Button>
                    )}
                  </>
                );
              })()}

              {/* Botón PDF: SOLO SI YA ESTÁ APROBADO */}
              {isApprovedOrder && (
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
              )}

              {/* Botón Corregir para cotizaciones observadas (SOLO PARA VENDEDOR) */}
              {!isAdminUser && (status === "OBSERVADO" || status === "EN_EDICION") && (
                <Button
                  size="xs"
                  h="32px"
                  bg="#ea580c"
                  color="white"
                  _hover={{ bg: "#c2410c", transform: "translateY(-1px)", boxShadow: "0 2px 8px rgba(234,88,12,0.3)" }}
                  _active={{ bg: "#9a3412" }}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                  onClick={() => handleLoadQuote(q)}
                  fontWeight="700"
                  borderRadius="lg"
                  px={3}
                  boxShadow="xs"
                >
                  Corregir
                </Button>
              )}

              {/* Vendedor: Botón Retirar si aún no fue abierta por el admin ni está en revisión */}
              {!isAdminUser && isPendingApproval && !isViewedOrUnderReview && (
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
            {(() => {
              const lockCheck = checkQuoteLock(docId, authUserId, authUsername) || (q?.id ? checkQuoteLock(q.id, authUserId, authUsername) : { isLocked: false, isOwnLock: false, hasActiveLock: false });
              const isLockedByOther = Boolean(lockCheck.isLocked);
              const isLockedBySelf = Boolean(lockCheck.isOwnLock);

              if (isLockedByOther && (isPendingApproval || isPendingBilling)) {
                return (
                  <Button
                    size="sm"
                    h="40px"
                    bg="#fef3c7"
                    color="#92400e"
                    variant="outline"
                    borderColor="#fcd34d"
                    _hover={{ bg: "#fde68a" }}
                    leftIcon={<Lock className="w-4 h-4 text-amber-700" />}
                    onClick={() => setLockAlertTarget({ quote: q, lockInfo: lockCheck.lockInfo })}
                    fontWeight="800"
                    borderRadius="xl"
                    title={`En revisión por ${lockCheck.lockInfo?.lockedByUsername} (${lockCheck.lockInfo?.lockedByProfile})`}
                  >
                    En Revisión 🔒
                  </Button>
                );
              }

              if (isLockedBySelf && (isPendingApproval || isPendingBilling)) {
                return (
                  <Button
                    size="sm"
                    h="40px"
                    bg="#0f766e"
                    color="white"
                    _hover={{ bg: "#115e59" }}
                    _active={{ bg: "#134e4a" }}
                    leftIcon={<Lock className="w-4 h-4 text-emerald-200" />}
                    onClick={() => {
                      markAsViewedByAdmin(q);
                      const freshDoc = quotes.find(item => isMatchingDoc(item, q.docNumber || q.id)) || q;
                      setSelectedQuote({ ...freshDoc });
                      setIsDetailOpen(true);
                    }}
                    fontWeight="900"
                    borderRadius="xl"
                    boxShadow="xs"
                    title="Estás verificando esta cotización con candado activo"
                  >
                    Verificando 🔒
                  </Button>
                );
              }

              return (
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
                    const freshDoc = quotes.find(item => isMatchingDoc(item, q.docNumber || q.id)) || q;
                    setSelectedQuote({ ...freshDoc });
                    setIsDetailOpen(true);
                  }}
                  fontWeight="800"
                  borderRadius="xl"
                  boxShadow="xs"
                >
                  {isAdminUser && (isPendingApproval || isPendingBilling) ? "Verificar" : "Vista"}
                </Button>
              );
            })()}

            {/* Botón PDF Mobile: SOLO SI YA ESTÁ APROBADO */}
            {isApprovedOrder && (
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
            )}

            {/* Botón Corregir para cotizaciones observadas (Mobile - SOLO PARA VENDEDOR) */}
            {!isAdminUser && (status === "OBSERVADO" || status === "EN_EDICION") && (
              <Button
                size="sm"
                h="40px"
                bg="#ea580c"
                color="white"
                _hover={{ bg: "#c2410c" }}
                leftIcon={<Edit3 className="w-4 h-4" />}
                onClick={() => handleLoadQuote(q)}
                fontWeight="800"
                borderRadius="xl"
                boxShadow="xs"
              >
                ✏️ Corregir
              </Button>
            )}

            {/* Administrador: Botón Observar rápido (Mobile) */}
            {isAdminUser && (isPendingApproval || isPendingBilling) && (
              <Button
                size="sm"
                h="40px"
                colorScheme="orange"
                bg="#fff7ed"
                color="#c2410c"
                border="1.5px solid #fdba74"
                _hover={{ bg: "#ffedd5" }}
                leftIcon={<MessageSquare className="w-4 h-4 text-orange-600" />}
                onClick={() => handleObserveQuote(q)}
                fontWeight="800"
                borderRadius="xl"
              >
                Observar
              </Button>
            )}

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

        {/* Móvil: Vendedor Retirar Solicitud si aún no fue abierta por el admin ni está en revisión */}
        {isPendingApproval && !isAdminUser && !isViewedOrUnderReview && (
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
          <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: isAdminUser ? "repeat(5, 1fr)" : "repeat(4, 1fr)" }} gap={3}>
            {[
              { id: "ALL", label: "Todas", count: counts.ALL, color: "#475569", bgSelected: "#475569", bgGlow: "#f1f5f9" },
              { id: "ENVIADO", label: "1. Pend. Aprobación", count: counts.ENVIADO, color: "#0284c7", bgSelected: "#0284c7", bgGlow: "#e0f2fe" },
              { id: "APROBADO", label: "2. Pedidos Aprobados", count: counts.APROBADO, color: "#16a34a", bgSelected: "#16a34a", bgGlow: "#dcfce7" },
              { id: "GENERADO", label: "Borradores", isTrash: true, count: counts.GENERADO, color: "#dc2626", bgSelected: "#dc2626", bgGlow: "#fef2f2" },
              // 🛡️ Solo visibles para Administrador y Facturación
              ...(isAdminUser ? [
                { id: "ANULADO", label: "Anuladas / Canceladas", count: counts.ANULADO, color: "#dc2626", bgSelected: "#dc2626", bgGlow: "#fee2e2" }
              ] : [])
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
                pr={searchQuery ? "2.5rem" : "1rem"}
              />
              {searchQuery && (
                <InputRightElement>
                  {isDeepSearching ? (
                    <Spinner size="xs" color="emerald.600" mr={1} />
                  ) : (
                    <IconButton
                      size="xs"
                      variant="ghost"
                      icon={<X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />}
                      onClick={() => setSearchQuery("")}
                      aria-label="Limpiar búsqueda"
                      borderRadius="full"
                      mr={1}
                    />
                  )}
                </InputRightElement>
              )}
            </InputGroup>
            <Tooltip label="Actualizar cotizaciones del servidor">
              <IconButton
                icon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />}
                size="md"
                variant="outline"
                borderRadius="xl"
                isLoading={isRefreshing || (isServerLoading && quotes.length === 0)}
                onClick={() => handleRefresh(true)}
                aria-label="Actualizar"
                _hover={{ bg: "emerald.50", borderColor: "emerald.300" }}
              />
            </Tooltip>
          </HStack>
        </Flex>

        {/* BARRA DE PROGRESO DISCRETA AL ACTUALIZAR */}
        {(isRefreshing || isServerLoading) && (
          <Box w="full" px={1} mb={-2}>
            <Progress size="xs" isIndeterminate colorScheme="green" bg="green.50" borderRadius="full" />
          </Box>
        )}

        {/* TABLA PRINCIPAL OPTIMIZADA CON ALTO CONTRASTE (solo escritorio) */}
        <Box display={{ base: "none", lg: "block" }} bg="white" borderRadius="2xl" border="1.5px solid" borderColor="#cbd5e1" boxShadow="sm" overflowX="auto" overflowY="hidden" width="100%">
          <Table variant="simple" size="md" style={{ tableLayout: "fixed", width: "100%", minWidth: "960px" }}>
            <Thead bg="#0e572b">
              <Tr>
                <Th py={4} px={4} fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" width="28%">DOCUMENTO Y CLIENTE</Th>
                <Th py={4} px={3} fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" width="11%" whiteSpace="nowrap">FECHA</Th>
                <Th py={4} px={3} fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" textAlign="right" width="14%" whiteSpace="nowrap">TOTAL (USD)</Th>
                <Th py={4} px={3} fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" textAlign="center" width="25%" whiteSpace="nowrap">ESTADO DE APROBACIÓN</Th>
                <Th py={4} px={4} fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" textAlign="right" width="22%">ACCIONES DISPONIBLES</Th>
              </Tr>
            </Thead>
            <Tbody>
              {((isServerLoading || isRefreshing) && quotes.length === 0) ? (
                <>
                  <Tr bg="linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.15) 50%, rgba(16, 185, 129, 0.08) 100%)">
                    <Td colSpan={5} py={3.5} textAlign="center" borderBottom="1.5px solid" borderColor="emerald.200">
                      <Flex align="center" justify="center" gap={3}>
                        <Spinner size="xs" color="emerald.600" speed="0.7s" thickness="2.5px" />
                        <Text fontSize="xs" fontWeight="900" color="emerald.900" letterSpacing="wide">
                          ⚡ Sincronizando seguimiento comercial con SAP Business One en tiempo real...
                        </Text>
                      </Flex>
                    </Td>
                  </Tr>
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <Tr key={`skeleton-row-${idx}`} borderBottom="1px solid" borderColor="#e2e8f0" _hover={{ bg: "gray.50" }}>
                      <Td py={3.5} px={4}>
                        <VStack align="flex-start" spacing={1.5}>
                          <Skeleton height="14px" width="120px" borderRadius="md" startColor="gray.100" endColor="green.100" speed={1.1} />
                          <Skeleton height="18px" width="240px" borderRadius="md" startColor="gray.100" endColor="green.100" speed={1.1} />
                          <Skeleton height="12px" width="90px" borderRadius="md" startColor="gray.100" endColor="green.100" speed={1.1} />
                        </VStack>
                      </Td>
                      <Td py={3.5} px={3}>
                        <Skeleton height="14px" width="80px" borderRadius="md" startColor="gray.100" endColor="green.100" speed={1.1} />
                      </Td>
                      <Td py={3.5} px={3} textAlign="right">
                        <Skeleton height="16px" width="70px" borderRadius="md" ml="auto" startColor="gray.100" endColor="green.100" speed={1.1} />
                      </Td>
                      <Td py={3.5} px={3} textAlign="center">
                        <Skeleton height="24px" width="130px" borderRadius="full" mx="auto" startColor="gray.100" endColor="green.100" speed={1.1} />
                      </Td>
                      <Td py={3.5} px={4} textAlign="right">
                        <HStack justify="flex-end" spacing={2}>
                          <Skeleton height="30px" width="75px" borderRadius="lg" startColor="gray.100" endColor="green.100" speed={1.1} />
                          <Skeleton height="30px" width="55px" borderRadius="lg" startColor="gray.100" endColor="green.100" speed={1.1} />
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </>
              ) : paginatedQuotes.length === 0 ? (
                <Tr>
                  <Td colSpan={5} textAlign="center" py={12} color="gray.500" fontWeight="700" fontSize="sm">
                    No se encontraron cotizaciones en este estado.
                  </Td>
                </Tr>
              ) : (
                paginatedQuotes.map((q) => {
                  const docId = q.docNumber || q.id;
                  const status = q.approvalStatus || q.state || "GENERADO";
                  const clientName = cleanClientName(q);
                  const sellerName = formatQuoteSellerName(q, sellersList);
                  const grandTotalUSD = getQuoteTotalUSD(q);

                  const hasAdditionalDiscount = checkHasAdditionalDiscount(q);
                  const sapDocNum = q.sapDocNum || q.totals?.sapDocNum || (q.isSapDirect ? (q.DocNum || q.totals?.DocNum) : null);
                  const isHighlighted = highlightedDocId && (String(docId) === highlightedDocId || String(q.id) === highlightedDocId);

                  return (
                    <Tr
                      key={docId}
                      bg={isHighlighted ? "#f0fdf4" : "transparent"}
                      borderLeft={isHighlighted ? "4px solid #16a34a" : "none"}
                      transition="all 0.35s ease"
                      _hover={{ bg: isHighlighted ? "#dcfce7" : "#f8fafc" }}
                      borderBottom="1px solid"
                      borderColor="#e2e8f0"
                    >
                      {/* Documento, Cliente y Vendedor consolidado */}
                      <Td py={3} px={4} maxW="0">
                        <VStack align="flex-start" spacing={1} maxW="full" w="full">
                          <HStack spacing={2} align="center" wrap="wrap">
                            {Boolean(sapDocNum || (status === "EMITIDO" && q.docNumber && !String(q.docNumber).includes("WEB") && !String(q.docNumber).includes("PENDIENTE"))) ? (
                              <Text fontSize="sm" fontWeight="950" color="#0e572b" fontFamily="mono">
                                {q.docNumber && String(q.docNumber).startsWith("COT-") && !String(q.docNumber).includes("WEB") ? q.docNumber : `COT-${String(sapDocNum).padStart(6, '0')}`}
                              </Text>
                            ) : (
                              <Badge colorScheme="orange" variant="subtle" px={2} py={0.5} borderRadius="md" fontSize="xs" fontWeight="900" letterSpacing="wide" title={q.id ? `ID Web: #${q.id}` : undefined}>
                                COT-PENDIENTE
                              </Badge>
                            )}
                            {!isDraftState(status) && sapDocNum && (
                              <Badge colorScheme="green" variant="solid" bg="#15803d" color="white" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="900" boxShadow="xs">
                                🏛️ Orden SAP: #{sapDocNum}
                              </Badge>
                            )}

                            {hasAdditionalDiscount && (
                              <Badge colorScheme="purple" variant="solid" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="900" boxShadow="xs">
                                ⚡ DESCUENTO ADICIONAL APLICADO
                              </Badge>
                            )}

                            {(q.hasDebt || q.hasOverdueDebt || q.totals?.hasDebt || q.totals?.hasOverdueDebt) && (
                              <Badge
                                colorScheme="red"
                                variant="solid"
                                bg="#dc2626"
                                color="white"
                                fontSize="9px"
                                px={2}
                                py={0.5}
                                borderRadius="md"
                                fontWeight="900"
                                boxShadow="xs"
                                title={q.debtSummary || q.totals?.debtSummary || "Cliente con deuda registrada"}
                              >
                                ⚠️ CLIENTE CON DEUDA {q.hasOverdueDebt || q.totals?.hasOverdueDebt ? "VENCIDA" : ""}
                              </Badge>
                            )}
                          </HStack>
                          <Text
                            fontWeight="900"
                            color="#0f172a"
                            fontSize="sm"
                            lineHeight="short"
                            maxW="full"
                            w="full"
                            wordBreak="break-word"
                            title={clientName}
                          >
                            {clientName}
                          </Text>
                          <HStack spacing={2} wrap="wrap">
                            <Badge bg="#f1f5f9" color="#475569" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="700" textTransform="none">
                              Vend: {sellerName}
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
                      <Td fontSize="sm" color="gray.850" fontWeight="800" py={3} px={3} whiteSpace="nowrap">
                        {q.docDate ? String(q.docDate).split("T")[0] : (q.createdAt ? String(q.createdAt).split("T")[0] : "—")}
                      </Td>

                      {/* Total */}
                      <Td textAlign="right" fontWeight="900" color="#0f172a" fontFamily="mono" fontSize="sm" py={3} px={3} whiteSpace="nowrap">
                        ${formatThousands(grandTotalUSD)}
                      </Td>

                      {/* Píldora de Estado */}
                      <Td textAlign="center" py={3} px={2} whiteSpace="nowrap">
                        <Flex justify="center" align="center" maxW="full">
                          {renderStatusBadge(status, q)}
                        </Flex>
                      </Td>

                      {/* Acciones */}
                      <Td textAlign="right" py={3} px={4} whiteSpace="nowrap">
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
          {((isServerLoading || isRefreshing) && quotes.length === 0) ? (
            <>
              <Box bg="emerald.50" borderRadius="2xl" border="1px solid" borderColor="emerald.200" p={3.5} textAlign="center">
                <Flex align="center" justify="center" gap={2.5}>
                  <Spinner size="xs" color="emerald.600" speed="0.7s" thickness="2px" />
                  <Text fontSize="xs" fontWeight="900" color="emerald.900">
                    ⚡ Sincronizando cotizaciones con SAP B1...
                  </Text>
                </Flex>
              </Box>
              {[1, 2, 3, 4].map((idx) => (
                <Box key={`skeleton-card-${idx}`} bg="white" borderRadius="2xl" border="1.5px solid" borderColor="#e2e8f0" p={4}>
                  <VStack align="stretch" spacing={3}>
                    <Flex justify="space-between">
                      <Skeleton height="16px" width="110px" borderRadius="md" startColor="gray.100" endColor="green.100" speed={1.1} />
                      <Skeleton height="22px" width="100px" borderRadius="full" startColor="gray.100" endColor="green.100" speed={1.1} />
                    </Flex>
                    <Skeleton height="18px" width="80%" borderRadius="md" startColor="gray.100" endColor="green.100" speed={1.1} />
                    <Skeleton height="38px" width="100%" borderRadius="lg" startColor="gray.100" endColor="green.100" speed={1.1} />
                    <HStack spacing={2}>
                      <Skeleton height="34px" flex="1" borderRadius="xl" startColor="gray.100" endColor="green.100" speed={1.1} />
                      <Skeleton height="34px" flex="1" borderRadius="xl" startColor="gray.100" endColor="green.100" speed={1.1} />
                    </HStack>
                  </VStack>
                </Box>
              ))}
            </>
          ) : paginatedQuotes.length === 0 ? (
            <Box bg="white" borderRadius="2xl" border="1.5px solid" borderColor="#cbd5e1" p={8} textAlign="center" color="gray.500" fontWeight="700" fontSize="sm">
              No se encontraron cotizaciones en este estado.
            </Box>
          ) : (
            paginatedQuotes.map((q) => {
              const docId = q.docNumber || q.id;
              const status = q.approvalStatus || q.state || "GENERADO";
              const clientName = cleanClientName(q);
              const sellerName = formatQuoteSellerName(q, sellersList);
              const grandTotalUSD = getQuoteTotalUSD(q);

              const hasAdditionalDiscount = checkHasAdditionalDiscount(q);
              const sapDocNum = q.sapDocNum || q.totals?.sapDocNum || (q.isSapDirect ? (q.DocNum || q.totals?.DocNum) : null);
              const isHighlighted = highlightedDocId && (String(docId) === highlightedDocId || String(q.id) === highlightedDocId);

              return (
                <Box
                  key={docId}
                  bg="white"
                  borderRadius="2xl"
                  border="1.5px solid"
                  borderColor={isHighlighted ? "#16a34a" : "#cbd5e1"}
                  boxShadow={isHighlighted ? "0 0 12px rgba(22, 163, 74, 0.25)" : "sm"}
                  p={4}
                  transition="all 0.3s ease"
                >
                  <VStack align="stretch" spacing={3}>
                    <Flex justify="space-between" align="flex-start" gap={2} wrap="wrap">
                      <HStack spacing={1.5} align="center" wrap="wrap">
                        {Boolean(sapDocNum || (status === "EMITIDO" && q.docNumber && !String(q.docNumber).includes("WEB") && !String(q.docNumber).includes("PENDIENTE"))) ? (
                          <Text fontSize="sm" fontWeight="950" color="#0e572b" fontFamily="mono">
                            {q.docNumber && String(q.docNumber).startsWith("COT-") && !String(q.docNumber).includes("WEB") ? q.docNumber : `COT-${String(sapDocNum).padStart(6, '0')}`}
                          </Text>
                        ) : (
                          <Badge colorScheme="orange" variant="subtle" px={2} py={0.5} borderRadius="md" fontSize="xs" fontWeight="900" letterSpacing="wide" title={q.id ? `ID Web: #${q.id}` : undefined}>
                            COT-PENDIENTE
                          </Badge>
                        )}
                        {!isDraftState(status) && sapDocNum && (
                          <Badge colorScheme="green" variant="solid" bg="#15803d" color="white" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="900" boxShadow="xs">
                            🏛️ Orden SAP: #{sapDocNum}
                          </Badge>
                        )}
                      </HStack>
                      {renderStatusBadge(status, q)}
                    </Flex>
                    <Text fontWeight="900" color="#0f172a" fontSize="md">{clientName}</Text>
                    <HStack spacing={2} wrap="wrap">
                      <Badge bg="#f1f5f9" color="#475569" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="700" textTransform="none">
                        Vend: {sellerName}
                      </Badge>

                      {hasAdditionalDiscount && (
                        <Badge colorScheme="purple" variant="solid" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="900" boxShadow="xs">
                          ⚡ DESCUENTO ADICIONAL
                        </Badge>
                      )}
                      {(q.hasDebt || q.hasOverdueDebt || q.totals?.hasDebt || q.totals?.hasOverdueDebt) && (
                        <Badge
                          colorScheme="red"
                          variant="solid"
                          bg="#dc2626"
                          color="white"
                          fontSize="9px"
                          px={2}
                          py={0.5}
                          borderRadius="md"
                          fontWeight="900"
                          boxShadow="xs"
                          title={q.debtSummary || q.totals?.debtSummary || "Cliente con deuda registrada"}
                        >
                          ⚠️ CLIENTE CON DEUDA {q.hasOverdueDebt || q.totals?.hasOverdueDebt ? "VENCIDA" : ""}
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
                        <Text fontSize="sm" color="gray.800" fontWeight="800">{q.docDate || (q.createdAt ? q.createdAt.split("T")[0] : "—")}</Text>
                      </Box>
                      <Box textAlign="right">
                        <Text fontSize="10px" fontWeight="700" color="gray.500" textTransform="uppercase">Total (USD)</Text>
                        <Text fontSize="md" color="#0f172a" fontWeight="900" fontFamily="mono">${formatThousands(grandTotalUSD)}</Text>
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
                Mostrando <Text as="span" fontWeight="900" color="gray.900">{(validCurrentPage - 1) * effectivePageSize + 1}</Text> -{" "}
                <Text as="span" fontWeight="900" color="gray.900">{Math.min(validCurrentPage * effectivePageSize, totalItems)}</Text> de{" "}
                <Text as="span" fontWeight="900" color="#0e572b">{totalItems}</Text> cotizaciones
              </Text>

              {/* Selector de tamaño de página */}
              <HStack spacing={1} ml={{ base: 0, md: 3 }}>
                <Text fontSize="11px" fontWeight="800" color="gray.500" textTransform="uppercase">
                  Por pág:
                </Text>
                {[5, 10, 20].map((size) => (
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
                    onClick={() => handlePageSizeChange(size)}
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
                onClick={() => handlePageChange(1)}
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
                onClick={() => handlePageChange((p) => Math.max(1, p - 1))}
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
                onClick={() => handlePageChange((p) => Math.min(totalPages, p + 1))}
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
                onClick={() => handlePageChange(totalPages)}
                aria-label="Última página"
                borderRadius="lg"
                _hover={{ bg: "gray.50" }}
              />
            </HStack>
          </Flex>
        )}
      </VStack>

      {isDetailOpen && selectedQuote && (
        <QuoteDetailDrawer
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          quote={selectedQuote}
          onUpdateStatus={handleUpdateStatus}
          onDeleteQuote={(id, status) => handleDeleteQuote(id, status)}
        />
      )}

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

      {/* MODAL DE ADVERTENCIA DE BLOQUEO POR CONCURRENCIA */}
      <Modal isOpen={!!lockAlertTarget} onClose={() => setLockAlertTarget(null)} isCentered size="md">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(3px)" />
        <ModalContent borderRadius="2xl" p={2}>
          <ModalHeader display="flex" alignItems="center" gap={2} color="#b45309" fontSize="md">
            <Lock className="w-5 h-5 text-amber-600" />
            Cotización en Revisión Activa
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Alert status="warning" borderRadius="xl" bg="#fffbeb" border="1.5px solid #fde68a" p={3.5}>
                <AlertIcon />
                <Box fontSize="xs">
                  <Text fontWeight="900" color="#92400e">
                    Esta cotización ({lockAlertTarget?.quote?.docNumber || lockAlertTarget?.quote?.id}) ya fue abierta y está siendo verificada.
                  </Text>
                  <Text color="#78350f" mt={1.5} fontWeight="700">
                    👤 Atendida por: <strong>{lockAlertTarget?.lockInfo?.lockedByUsername}</strong> ({lockAlertTarget?.lockInfo?.lockedByProfile})
                  </Text>
                  <Text color="#92400e" mt={0.5} fontSize="11px">
                    ⏰ Inicio de verificación: {lockAlertTarget?.lockInfo?.lockedAt ? new Date(lockAlertTarget.lockInfo.lockedAt).toLocaleTimeString() : "Recientemente"}
                  </Text>
                </Box>
              </Alert>
              <Text fontSize="xs" color="gray.600" fontWeight="600">
                Para evitar emisión duplicada de órdenes en SAP o inconsistencia de datos, no se permite que dos personas de digitación la verifiquen simultáneamente.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2} wrap="wrap">
            {isAdminUser && (
              <Button
                colorScheme="teal"
                size="sm"
                fontWeight="800"
                onClick={() => {
                  const targetQ = lockAlertTarget?.quote;
                  const id = targetQ?.docNumber || targetQ?.id;
                  forceUnlockQuote(id);
                  if (targetQ?.id) forceUnlockQuote(targetQ.id);
                  setLockAlertTarget(null);
                  if (targetQ) {
                    markAsViewedByAdmin(targetQ);
                    const freshDoc = quotes.find(item => isMatchingDoc(item, targetQ.docNumber || targetQ.id)) || targetQ;
                    setSelectedQuote({ ...freshDoc });
                    setIsDetailOpen(true);
                  }
                  toast({
                    title: "🔓 Entrando a Verificar",
                    description: `Se liberó la revisión previa y se abrió la cotización ${id}.`,
                    status: "info",
                    duration: 3500
                  });
                }}
              >
                🔓 Desbloquear y Entrar a Verificar (Admin)
              </Button>
            )}
            <Button
              colorScheme="blue"
              variant="outline"
              size="sm"
              fontWeight="700"
              leftIcon={<Eye className="w-4 h-4" />}
              onClick={() => {
                const targetQ = lockAlertTarget?.quote;
                setLockAlertTarget(null);
                if (targetQ) {
                  const freshDoc = quotes.find(item => isMatchingDoc(item, targetQ.docNumber || targetQ.id)) || targetQ;
                  setSelectedQuote({ ...freshDoc });
                  setIsDetailOpen(true);
                }
              }}
            >
              👁️ Ver en Modo Solo Lectura
            </Button>
            <Button colorScheme="gray" size="sm" fontWeight="700" onClick={() => setLockAlertTarget(null)}>
              Entendido / Cerrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN DE ANULACIÓN / ELIMINACIÓN */}
      <Modal isOpen={!!deleteConfirmDoc} onClose={() => setDeleteConfirmDoc(null)} isCentered size="sm">
        <ModalOverlay bg="blackAlpha.600" />
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

      {/* 🚀 MODAL DE CARGA EN MINIATURA PARA ACTUALIZACIONES Y PROCESOS */}
      <Modal
        isOpen={processModal.isOpen}
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
                <ChakraIcon as={processModal.icon || Zap} boxSize="22px" />
              </Flex>

              <VStack spacing={0.5}>
                <Text fontSize="sm" fontWeight="900" color="gray.800" letterSpacing="-0.01em">
                  {processModal.title || "Procesando actualización..."}
                </Text>
                <Text fontSize="10.5px" fontWeight="600" color="gray.500" isTruncated maxW="240px">
                  {processModal.sub || "Sincronizando cambios en vivo"}
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
                  {processModal.step || "Sincronizando..."}
                </Text>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default QuoteApprovalPage;
