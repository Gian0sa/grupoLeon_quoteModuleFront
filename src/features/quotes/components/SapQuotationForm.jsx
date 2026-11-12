import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Box, Grid, GridItem, FormControl, FormLabel, Input, Select as ChakraSelect,
  Text, HStack, VStack, Badge, Divider, Heading, Tooltip, Alert, AlertIcon,
  Tabs, TabList, TabPanels, Tab, TabPanel, Textarea, Button, Flex, Menu,
  MenuButton, MenuList, MenuItem, useToast, Container,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Progress, Spinner, Icon as ChakraIcon
} from "@chakra-ui/react";
import {
  FileText, Truck, CreditCard, Paperclip, ChevronDown, CheckCircle2,
  Save, Copy, RefreshCw, Shield, AlertTriangle, Printer, Lock, Edit3,
  MessageSquare, XCircle, Send, Zap, Code2, Sparkles, Check, Building2, User, ArrowRight
} from "lucide-react";
import ClientAutocomplete from "./ClientAutocomplete";
import SapItemGrid from "./SapItemGrid";
import { NewSellTerms } from "./NewSellTerms";
import { SapQuoteDocumentModal } from "./SapQuoteDocumentModal";
import { resolveUserProfileTitle, acquireQuoteLock, releaseQuoteLock, checkQuoteLock } from "../services/quoteLockService";
import { SapPayloadJsonModal } from "./SapPayloadJsonModal";
import { ObserveReasonModal } from "./ObserveReasonModal";
import { RejectReasonModal } from "./RejectReasonModal";
import { OrderTimelineBar, OrderChecklist } from "./OrderProgressTracker";
import { useQueryClient } from "@tanstack/react-query";
import { createQuote, updateQuote, getNextDocNumber } from "../services/quoteService";
import { useQuoteStore, normalizeQuoteClient } from "../stores/quoteStore";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useExchangeRate } from "../../dashboard/hooks/queries/dashboardQueries";
import { useGetTransports, useGetPaymentType, useGetDeliveryForms, useGetPromotions } from "../hooks/queries/quotesQueries";
import { calculateQuoteTotals, formatThousands } from "../../../shared/utils/quoteCalculator";
import { useNavigate } from "react-router-dom";
import QuoteSubmitConfirmModal from "./QuoteSubmitConfirmModal";
import { isPickupInStoreForm } from "./NewSellTerms";
import { useIsAdmin, useHasAccess, checkIsAdmin } from "../../../shared/utils/permissions";
import { useSellersData, useGetProfileData } from "../../auth/hooks/queries/authQueries";
import { useGetAccountsReceivable } from "../../receivable/hooks/receivableQueries";
import { useClientPointsDelivery } from "../../clients/hooks/queries/clientQueries";
import InvoicesModal from "../../receivable/components/InvoicesModal";
import { fetchClientByCode } from "../../clients/services/clientService";
import { axiosInstance } from "../../../shared/lib/axiosInstance";
import { isSpecialAgreementItem, computeSapTqcBreakdown } from "../utils/discountBreakdown";

const money = (val, currency = "USD") => {
  const num = Number(val || 0);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: currency === "PEN" ? "PEN" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const extractPaymentLabel = (pt) => {
  if (!pt) return "";
  if (typeof pt === "object") {
    return String(pt.PymntGroup || pt.PaymentTermsGroupName || pt.label || pt.value || "").trim();
  }
  return String(pt).trim();
};

const todayIso = () => new Date().toISOString().split("T")[0];

export default function SapQuotationForm({ sellerName = "Vendedor Autorizado", isTracking = false }) {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { username, userId, salesEmployeeCode, role, endpoints = [] } = useAuthStore();
  const { data: userProfile } = useGetProfileData();
  const isAdminHook = useIsAdmin();
  const hasAccess = useHasAccess();

  const { data: sellersResponse } = useSellersData();
  const sellersList = useMemo(() => {
    const list = Array.isArray(sellersResponse) ? sellersResponse : (sellersResponse?.sellers || []);
    const parsed = list
      .filter((s) => {
        const code = Number(s.SalesEmployeeCode ?? s.value ?? -1);
        const active = String(s.Active ?? "tYES").toUpperCase();
        return code > 0 && (active === "TYES" || active === "Y" || active === "TRUE");
      })
      .map((s) => ({
        value: Number(s.SalesEmployeeCode ?? s.value),
        label: s.SalesEmployeeName ?? s.label,
        email: s.Email ?? s.email,
      }));

    if (parsed.length > 0) {
      try {
        localStorage.setItem("cached_sap_sellers", JSON.stringify(parsed));
      } catch {}
      return parsed;
    }

    try {
      const saved = localStorage.getItem("cached_sap_sellers");
      if (saved) return JSON.parse(saved);
    } catch {}

    return [];
  }, [sellersResponse]);

  // Código de vendedor obtenido de la sesión activa / perfil del usuario
  const sessionSalesCode = Number(
    userProfile?.salesEmployeeCode ??
    salesEmployeeCode ??
    localStorage.getItem("salesEmployeeCode") ??
    0
  );

  const sessionUsername =
    userProfile?.username ||
    username ||
    localStorage.getItem("username") ||
    "";

  // Intentar empatar al usuario logueado con la lista de vendedores de SAP
  const matchedSellerByUsername = useMemo(() => {
    if (!sessionUsername || !sellersList || sellersList.length === 0) return null;
    const norm = sessionUsername.toLowerCase().trim();
    return sellersList.find((s) => {
      const sLabel = String(s.label || "").toLowerCase();
      const sEmail = String(s.email || "").toLowerCase();
      return (
        sLabel.includes(norm) ||
        (norm.length >= 3 && sLabel.includes(norm.slice(0, 4))) ||
        (sEmail && sEmail.includes(norm))
      );
    }) || null;
  }, [sessionUsername, sellersList]);

  const effectiveSessionSalesCode = Number(
    sessionSalesCode > 0 ? sessionSalesCode : (matchedSellerByUsername?.value || 0)
  );

  const localRole = (localStorage.getItem("role") || "").toUpperCase();
  const roleUpper = String(role || localRole || "").toUpperCase();

  // 🛡️ Privilegios de Administrador Maestro:
  // Si posee permisos de administrador, SIEMPRE tiene facultades de Administrador
  // para emitir cotizaciones por cuenta de cualquier asesor comercial o por la propia Administración
  const isAdmin = Boolean(
    isAdminHook ||
    roleUpper === "ADMIN" ||
    roleUpper === "ADMINISTRADOR" ||
    roleUpper.startsWith("ADMIN") ||
    checkIsAdmin(endpoints, sessionUsername || username)
  );

  // El selector con la lista completa de vendedores le sale al Administrador
  const canSelectSeller = isAdmin;

  // Es vendedor de campo únicamente si NO es Administrador y tiene código de vendedor en SAP (≠ 20)
  const isSeller = !isAdmin && Boolean(effectiveSessionSalesCode > 0 && effectiveSessionSalesCode !== 20);

  // 🛡️ Permisos operativos para áreas financieras/logísticas (Facturación y Supervisión)
  const canManageFinance = isAdmin || roleUpper === "FACTURACION" || roleUpper === "SUPERVISOR";
  // 🛡️ Permiso granular para modificar la moneda del documento (USD / Soles)
  const canChangeCurrency = isAdmin || hasAccess("PUT:/quotes/currency");

  const localSeller = localStorage.getItem("username") || localStorage.getItem("userId");

  const [docType, setDocType] = useState("OFERTA_VENTA"); // OFERTA_VENTA o PEDIDO_CLIENTE
  const [docNumber, setDocNumber] = useState("");
  const [isObserveModalOpen, setIsObserveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const isExplicitlySubmittingRef = useRef(false);
  const isExplicitlyClearedRef = useRef(false);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef(null);
  const handleSaveActionRef = useRef(null);

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
    saleCondition, setSaleCondition,
    documentType, setDocumentType,
    isLetra, setIsLetra,
    creditTerm, setCreditTerm,
    paymentMethod, setPaymentMethod,
    bankAccount, setBankAccount,
    sunatOpType, setSunatOpType,
    approvalStatus, setApprovalStatus,
    rejectionReason, observations,
    historyLog,
    sellerName: storeSellerName,
    createdByUsername: storeCreatedByUsername,
    createdByUserId: storeCreatedByUserId,
    SlpCode: storeSlpCode,
    salesPersonCode: storeSalesPersonCode,
    salesEmployeeCode: storeSalesEmployeeCode,
    currency, setCurrency,
    clear,
  } = useQuoteStore();

  const [selectedSlpCode, setSelectedSlpCode] = useState(() => {
    if (storeSlpCode && !isNaN(Number(storeSlpCode)) && Number(storeSlpCode) > 0) return Number(storeSlpCode);
    if (storeSalesEmployeeCode && !isNaN(Number(storeSalesEmployeeCode)) && Number(storeSalesEmployeeCode) > 0) return Number(storeSalesEmployeeCode);
    if (isSeller && effectiveSessionSalesCode) return effectiveSessionSalesCode;
    if (salesEmployeeCode && !isNaN(Number(salesEmployeeCode))) return Number(salesEmployeeCode);
    const localSlp = localStorage.getItem("salesEmployeeCode");
    if (localSlp && !isNaN(Number(localSlp))) return Number(localSlp);
    if (matchedSellerByUsername) return matchedSellerByUsername.value;
    return canSelectSeller ? 20 : undefined;
  });

  useEffect(() => {
    // 1. Si la cotización en store tiene un código de vendedor válido, PRESERVARLO SIEMPRE
    const quoteSlp = Number(storeSlpCode || storeSalesEmployeeCode);
    if (!isNaN(quoteSlp) && quoteSlp > 0) {
      setSelectedSlpCode(quoteSlp);
      return;
    }

    // 2. Si no tiene código numérico pero tiene nombre de vendedor, intentar resolverlo desde sellersList
    const targetSellerStr = (storeSellerName || storeCreatedByUsername || "").trim();
    if (targetSellerStr && !targetSellerStr.toLowerCase().includes("ofic administración") && sellersList?.length > 0) {
      const cleanTarget = targetSellerStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const matched = sellersList.find((s) => {
        const cleanL = String(s.label || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return cleanL.includes(cleanTarget) || cleanTarget.includes(cleanL.replace(/^\d+\./, "").trim());
      });
      if (matched && matched.value > 0) {
        setSelectedSlpCode(Number(matched.value));
        return;
      }
    }

    // 3. Si el usuario actual es un vendedor de campo
    if (isSeller && effectiveSessionSalesCode) {
      setSelectedSlpCode(effectiveSessionSalesCode);
      return;
    }

    // 4. Fallback de sesión / admin
    if (salesEmployeeCode && !isNaN(Number(salesEmployeeCode)) && Number(salesEmployeeCode) > 0) {
      setSelectedSlpCode(Number(salesEmployeeCode));
    } else {
      const localSlp = localStorage.getItem("salesEmployeeCode");
      if (localSlp && !isNaN(Number(localSlp)) && Number(localSlp) > 0) {
        setSelectedSlpCode(Number(localSlp));
      } else if (matchedSellerByUsername) {
        setSelectedSlpCode(matchedSellerByUsername.value);
      } else if (canSelectSeller && !selectedSlpCode) {
        setSelectedSlpCode(20);
      }
    }
  }, [isSeller, effectiveSessionSalesCode, storeSlpCode, storeSalesEmployeeCode, storeSellerName, storeCreatedByUsername, salesEmployeeCode, canSelectSeller, matchedSellerByUsername, sellersList]);

  const effectiveStoreSeller = (storeSellerName && storeSellerName !== "Vendedor SAP" && storeSellerName !== "Vendedor Autorizado")
    ? storeSellerName
    : storeCreatedByUsername;

  const activeSeller = useMemo(() => {
    if (selectedSlpCode) {
      const matched = sellersList.find((s) => s.value === Number(selectedSlpCode));
      if (matched) return matched.label;
    }
    if (isSeller && effectiveSessionSalesCode) {
      const myRecord = sellersList.find((s) => s.value === effectiveSessionSalesCode);
      return myRecord?.label || sessionUsername || "Vendedor Autorizado";
    }
    if (matchedSellerByUsername) {
      return matchedSellerByUsername.label;
    }
    if (effectiveStoreSeller && effectiveStoreSeller !== "Vendedor SAP" && effectiveStoreSeller !== "Vendedor Autorizado") {
      return effectiveStoreSeller;
    }
    if (sellerName && sellerName !== "Vendedor SAP" && sellerName !== "Vendedor Autorizado") return sellerName;
    return sessionUsername || localSeller || (canSelectSeller ? "001.Ofic Administración" : "Vendedor Autorizado");
  }, [selectedSlpCode, sellersList, isSeller, effectiveSessionSalesCode, sessionUsername, matchedSellerByUsername, effectiveStoreSeller, sellerName, localSeller, canSelectSeller]);

  const sellerDisplayName = useMemo(() => {
    if (selectedSlpCode) {
      const matched = sellersList.find((s) => s.value === Number(selectedSlpCode));
      if (matched) return `${matched.value} - ${matched.label}`;
      if (selectedSlpCode === 20) return "20 - 001.Ofic Administración (Oficina / Admin)";
    }
    if (isSeller && effectiveSessionSalesCode) {
      const matched = sellersList.find((s) => s.value === effectiveSessionSalesCode);
      return matched ? `${matched.value} - ${matched.label}` : (sessionUsername || "Vendedor Autorizado");
    }
    if (matchedSellerByUsername) {
      return `${matchedSellerByUsername.value} - ${matchedSellerByUsername.label}`;
    }
    return activeSeller || "20 - 001.Ofic Administración (Oficina / Admin)";
  }, [selectedSlpCode, sellersList, isSeller, effectiveSessionSalesCode, sessionUsername, matchedSellerByUsername, activeSeller]);

  const isObservedOrInCorrection = approvalStatus === "OBSERVADO" || approvalStatus === "EN_EDICION";

  const [tempImage, setTempImage] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAdminConfirmModal, setShowAdminConfirmModal] = useState(false);
  const [isSapSuccessModalOpen, setIsSapSuccessModalOpen] = useState(false);
  const [sapSyncResult, setSapSyncResult] = useState(null);
  const [hasCopiedDocNum, setHasCopiedDocNum] = useState(false);
  const [isSendingToValidation, setIsSendingToValidation] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [validationLoadingTitle, setValidationLoadingTitle] = useState("Guardando y Enviando a Validación...");
  const [validationLoadingSub, setValidationLoadingSub] = useState("");
  const [validationStepText, setValidationStepText] = useState("Sincronizando datos comerciales, finanzas y logística...");
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [docDate, setDocDate] = useState(todayIso());
  const [docDueDate, setDocDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });

  const { data: rateData } = useExchangeRate({
    currency: "USD",
    date: docDate || todayIso(),
  });
  // 👁️ Tipo de cambio comercial a la vista del frontend (+0.04 aumento comercial de la empresa)
  const exchangeRate = (() => {
    const raw = rateData?.collectionRate || rateData?.officialRate;
    if (!raw) return 3.49;
    const num = Number(raw);
    if (rateData?.rawRate === 3.385 || num === 3.42) return 3.43;
    return isNaN(num) ? 3.49 : num;
  })();

  // ─── CONSULTA Y ANÁLISIS DE DEUDA Y LOGÍSTICA DEL CLIENTE EN TIEMPO REAL (SAP B1) ───
  const clientCardCode = client?.CardCode || client?.cardCode || client?.raw?.CardCode || (client?.LicTradNum ? `CL${client.LicTradNum}` : "") || (client?.clientDocument ? `CL${client.clientDocument}` : "") || client?.id || "";
  const { data: receivableData } = useGetAccountsReceivable(
    { clientecode: clientCardCode },
    Boolean(clientCardCode)
  );
  const { dataDeliveryPoints, isLoadingDeliveryPoints } = useClientPointsDelivery(clientCardCode);

  // Auto-sincronizar ficha fresca del cliente desde SAP (Línea U_TQC_LMCRED, MaxCommitment, Balances)
  const lastFetchedCreditRef = useRef("");
  useEffect(() => {
    if (!clientCardCode) return;
    const rawLimit = Number(client?.U_TQC_LMCRED ?? client?.raw?.U_TQC_LMCRED ?? 0);
    const rawCommitment = Number(client?.MaxCommitment ?? client?.raw?.MaxCommitment ?? 0);
    const alreadyFetched = lastFetchedCreditRef.current === clientCardCode;

    if ((rawLimit > 0 || rawCommitment > 0) && client?.creditChecked) return;
    if (alreadyFetched && client?.creditChecked) return;

    lastFetchedCreditRef.current = clientCardCode;
    fetchClientByCode(clientCardCode).then((fullData) => {
      if (fullData) {
        const rawLimitUSD = Number(fullData.U_TQC_LMCRED ?? fullData.CreditLimit ?? 0);
        const rawCommitPEN = Number(fullData.MaxCommitment ?? 0);
        const effectiveLimitUSD = rawLimitUSD > 0
          ? rawLimitUSD
          : (rawCommitPEN > 0 ? Number((rawCommitPEN / 3.40).toFixed(2)) : 0);

        const updated = normalizeQuoteClient({
          ...client,
          ...fullData,
          U_TQC_LMCRED: effectiveLimitUSD,
          CreditLimit: effectiveLimitUSD,
          creditLimit: effectiveLimitUSD,
          MaxCommitment: rawCommitPEN,
          CurrentAccountBalance: fullData.CurrentAccountBalance ?? client?.CurrentAccountBalance,
          OpenOrdersBalance: fullData.OpenOrdersBalance ?? client?.OpenOrdersBalance,
          OpenDeliveryNotesBalance: fullData.OpenDeliveryNotesBalance ?? client?.OpenDeliveryNotesBalance,
          creditChecked: true,
          raw: { ...client?.raw, ...fullData },
        });
        setClient(updated);
      }
    }).catch((err) => {
      console.warn("⚠️ No se pudo refrescar línea de crédito del cliente:", err.message);
    });
  }, [clientCardCode, client?.U_TQC_LMCRED, client?.MaxCommitment]);

  const clientDebtInfo = useMemo(() => {
    if (!client) return null;

    const rawBalance = Number(client.CurrentAccountBalance ?? client.raw?.CurrentAccountBalance ?? client.Balance ?? 0);

    // Buscar en la lista de cuentas por cobrar
    const clientsList = receivableData?.clients?.clients || receivableData?.clients || receivableData?.data || (Array.isArray(receivableData) ? receivableData : []);
    const cleanClientCode = String(clientCardCode || "").replace(/^CL/i, "").trim().toUpperCase();
    const matchingClient = clientsList.find(c => {
      const cCode = String(c.clientCode || c.CardCode || c.cardCode || c.id || "").replace(/^CL/i, "").trim().toUpperCase();
      return cCode === cleanClientCode;
    }) || (cleanClientCode && clientsList.length === 1 ? clientsList[0] : null);

    let overdueUSD = 0;
    let overdueDocsCount = 0;
    let totalPendingUSD = 0;
    let totalDocsCount = 0;
    let creditNotesUSD = 0;
    let currentDebtUSD = 0;
    let docBalanceUSD = 0;

    if (matchingClient) {
      const penOverdue = Number(matchingClient.overdueAmount?.PEN ?? matchingClient.saldoVencidoPEN ?? 0);
      const usdOverdue = Number(matchingClient.overdueAmount?.USD ?? matchingClient.saldoVencidoUSD ?? 0);
      overdueUSD = Number((usdOverdue + (penOverdue > 0 ? penOverdue / (exchangeRate || 3.564) : 0)).toFixed(2));

      overdueDocsCount = Number(
        matchingClient.overdueDocumentsCount ??
        matchingClient.resumenSapCrystal?.countVencidos ??
        matchingClient.documentosVencidos ??
        0
      );

      const penPending = Number(matchingClient.pendingAmount?.PEN ?? 0);
      const usdPending = Number(matchingClient.pendingAmount?.USD ?? 0);
      const consolidadoUSD = Number(matchingClient.totalConsolidadoUSD ?? matchingClient.saldoConsolidadoUSD ?? 0);
      const headerPendingUSD = consolidadoUSD > 0
        ? consolidadoUSD
        : Number((usdPending + (penPending > 0 ? penPending / (exchangeRate || 3.564) : 0)).toFixed(2));
      totalPendingUSD = headerPendingUSD;

      totalDocsCount = Number(matchingClient.totalDocuments ?? matchingClient.documents?.length ?? 0);

      if (Array.isArray(matchingClient.documents) && matchingClient.documents.length > 0) {
        totalDocsCount = matchingClient.documents.length;
        let sumDocUSD = 0;
        let ncSumUSD = 0;
        let facturasSumUSD = 0;
        matchingClient.documents.forEach(d => {
          const numUpper = (d.numeroDocumento || d.NRO_DOC || "").toUpperCase();
          const tipoLower = (d.tipoDocumento || d.TIPO_DOC || "").toLowerCase();
          const isNC = tipoLower.includes("abono") || tipoLower.includes("credito") || numUpper.startsWith("ABO-") || numUpper.startsWith("NC-") || numUpper.startsWith("AB0-");
          const sPen = Number(d.saldoPendiente?.PEN ?? d.SALDO_PEN ?? 0);
          const sUsd = Number(d.saldoPendiente?.USD ?? d.SALDO_USD ?? 0);
          const valUSD = Math.abs(sUsd + (sPen > 0 ? sPen / (exchangeRate || 3.564) : 0));
          if (isNC || sUsd < 0 || sPen < 0) {
            sumDocUSD -= valUSD;
            ncSumUSD += valUSD;
          } else {
            sumDocUSD += valUSD;
            facturasSumUSD += valUSD;
          }
        });
        docBalanceUSD = Number(Math.max(0, sumDocUSD).toFixed(2));
        creditNotesUSD = Number(ncSumUSD.toFixed(2));

        if (docBalanceUSD > 0) {
          totalPendingUSD = docBalanceUSD;
        }

        if (overdueDocsCount === 0 && overdueUSD === 0) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          matchingClient.documents.forEach(d => {
            const sPen = Number(d.saldoPendiente?.PEN ?? d.SALDO_PEN ?? 0);
            const sUsd = Number(d.saldoPendiente?.USD ?? d.SALDO_USD ?? 0);
            const isOverdue = Boolean(d.estaVencido || d.isOverdue || d.vdStatus === "VENCIDO") ||
              (d.REFDATE && new Date(d.REFDATE) < now && (sPen > 0 || sUsd > 0));
            if (isOverdue) {
              overdueUSD += Number((sUsd + (sPen > 0 ? sPen / (exchangeRate || 3.564) : 0)).toFixed(2));
              overdueDocsCount++;
            }
          });
        }

        // ⚠️ REGLA DE COHERENCIA FINANCIERA: La deuda en mora neta no puede ser mayor que el saldo total pendiente neto
        // (si el cliente tiene abonos o notas de crédito, estos amortizan su saldo neto real exigible).
        if (totalPendingUSD > 0 && overdueUSD > totalPendingUSD) {
          overdueUSD = totalPendingUSD;
        }
        currentDebtUSD = Math.max(0, Number((totalPendingUSD - overdueUSD).toFixed(2)));
      }
    } else if (rawBalance > 0) {
      // Fallback si receivableData aún está cargando: convertir el saldo contable de SAP (PEN) a USD
      // En B1 Perú, CurrentAccountBalance está en Soles (7,268.55 PEN = $2,039.40 USD a tipo de cambio contable 3.564)
      totalPendingUSD = Number((rawBalance / 3.564).toFixed(2));
      docBalanceUSD = totalPendingUSD;
    }

    const hasOverdueDebt = overdueDocsCount > 0 || overdueUSD > 0;
    const hasTotalDebt = hasOverdueDebt || totalPendingUSD > 0 || rawBalance > 0;

    if (!hasTotalDebt) return null;

    let debtSummary = "";
    if (hasOverdueDebt) {
      debtSummary = `Deuda vencida: $${formatThousands(overdueUSD)} USD (${overdueDocsCount} doc${overdueDocsCount > 1 ? "s" : ""})`;
      if (totalPendingUSD > overdueUSD && Math.abs(totalPendingUSD - overdueUSD) > 0.01) {
        debtSummary += ` • Saldo total pendiente: $${formatThousands(totalPendingUSD)} USD`;
      }
    } else if (totalPendingUSD > 0) {
      debtSummary = `Saldo pendiente por vencer: $${formatThousands(totalPendingUSD)} USD`;
    }

    return {
      hasOverdueDebt,
      hasTotalDebt,
      overdueUSD,
      overdueDocsCount,
      totalPendingUSD,
      totalDocsCount,
      creditNotesUSD: Number(creditNotesUSD || 0),
      currentDebtUSD: Number(currentDebtUSD || 0),
      docBalanceUSD: Number(docBalanceUSD || 0),
      debtSummary,
      matchingClient,
    };
  }, [client, clientCardCode, receivableData, exchangeRate]);

  const [isReceivableModalOpen, setIsReceivableModalOpen] = useState(false);

  // Estado que permite al Administrador desbloquear/editar cualquier cotización si necesita corregir ítems/precios.
  // Por defecto SIEMPRE inicia en false (bloqueado en modo revisión) para proteger la integridad de los datos.
  const [adminForceEditMode, setAdminForceEditMode] = useState(false);

  const isApproved = approvalStatus === "APROBADO_COMERCIAL" || approvalStatus === "APROBADO";
  const isCancelled = approvalStatus === "ANULADO";
  const isReadOnly = !adminForceEditMode && (isApproved || isCancelled);

  // Estados NO aprobados: jamás deben ser considerados emitidos ni aprobados
  const UNAPPROVED_STATUSES = [
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
  ];
  const isUnapprovedStatus = UNAPPROVED_STATUSES.includes(String(approvalStatus || "").toUpperCase().trim());

  // Orden/Cotización oficialmente aprobada o emitida
  const isApprovedOrder = Boolean(
    !isUnapprovedStatus && (
      isApproved ||
      approvalStatus === "PEDIDO_EMITIDO" ||
      approvalStatus === "FACTURADO" ||
      approvalStatus === "COMPLETADO" ||
      approvalStatus === "EMITIDO" ||
      approvalStatus === "EMITIDO_SAP"
    )
  );

  // Determinar si es una cotización formalmente enviada para revisión/validación por un vendedor
  const isSubmittedQuote = Boolean(
    quoteId &&
    approvalStatus &&
    ["ENVIADO", "EN_PROCESO", "PENDIENTE_FACTURACION", "PENDIENTE_APROBACION", "APROBADO_COMERCIAL", "APROBADO", "RECHAZADO", "OBSERVADO", "EN_EDICION", "ANULADO", "EMITIDO"].includes(approvalStatus)
  );

  // Cotización pendiente enviada por un vendedor (para que el admin NO vea "Guardar como Borrador")
  const isSubmittedVendorQuote = Boolean(
    quoteId &&
    ["ENVIADO", "EN_PROCESO", "PENDIENTE_APROBACION", "PENDIENTE_FACTURACION", "OBSERVADO", "EN_EDICION"].includes(String(approvalStatus || "").toUpperCase().trim())
  );

  // Devolver con Observación y Rechazar: SOLO cuando el cliente/vendedor envió la cotización y el administrador está verificando
  const canAdminObserveOrReject = Boolean(
    isAdmin &&
    isSubmittedQuote &&
    ["ENVIADO", "EN_PROCESO", "PENDIENTE_APROBACION", "PENDIENTE_FACTURACION"].includes(approvalStatus) &&
    !isApprovedOrder
  );

  // La línea de tiempo y checklist solo se muestran cuando la solicitud ya fue enviada / está en seguimiento
  const isQuoteAlreadySentOrInReview = Boolean(
    isTracking ||
    (approvalStatus && !["BORRADOR", "GENERADO", "DRAFT", "draft"].includes(approvalStatus))
  );

  // Si la cotización está observada o en edición, el vendedor está en modo corrección activa.
  // El Administrador siempre entra en modo revisión bloqueado por defecto a menos que active explícitamente adminForceEditMode.
  const isCorrectionMode = !isAdmin && (approvalStatus === "OBSERVADO" || approvalStatus === "EN_EDICION");

  // El Administrador está en modo "Solo Revisión" cuando es una cotización enviada/en proceso y no está en corrección ni forzando edición
  const isAdminReviewing = Boolean(isAdmin && isSubmittedQuote && !adminForceEditMode && !isCorrectionMode);

  // Los campos comerciales (Cliente, Grilla de Productos) solo se bloquean si es solo lectura o revisión estricta
  const isSellerFieldsLocked = (isReadOnly && !isCorrectionMode) || (isAdminReviewing && !adminForceEditMode);

  // Despacho y Logística son editables si no está en revisión estricta o si el admin habilita edición
  const isDeliveryLocked = (isReadOnly && !isCorrectionMode) || (isAdminReviewing && !adminForceEditMode);
  const revealTabs = true; // Flujo unificado: Pestaña de logística y pagos accesible al inicio

  useEffect(() => {
    setAdminForceEditMode(false);
    if (quoteId) {
      setDocNumber(quoteId);
      // Adquirir candado de revisión activa para esta cotización si es de validación y el usuario es evaluador administrativo
      if (isSubmittedQuote && isAdmin) {
        const lockCheck = checkQuoteLock(quoteId, userId, username || localSeller);
        if (lockCheck.isLocked) {
          toast({
            title: "🔒 Cotización en Revisión Activa",
            description: `Esta cotización ya está siendo verificada por ${lockCheck.lockInfo?.lockedByUsername} (${lockCheck.lockInfo?.lockedByProfile}). Redirigiendo a Historial...`,
            status: "warning",
            duration: 6000,
            isClosable: true
          });
          navigate("/historyquotes");
          return;
        }
        acquireQuoteLock(quoteId, {
          id: userId,
          username: username || localSeller,
          role,
          endpoints,
          salesEmployeeCode,
          isAdmin: true
        });
      }
    } else {
      setDocNumber("");
    }
    return () => {
      if (quoteId) {
        releaseQuoteLock(quoteId, userId);
      }
    };
  }, [quoteId, isSubmittedQuote, userId, username, localSeller, role, endpoints, isAdmin]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);

  const { dataTransports } = useGetTransports();
  const { dataDeliveryForms } = useGetDeliveryForms();
  const { dataPaymentTypes } = useGetPaymentType();
  const { promotionsMap } = useGetPromotions();

  const deliveryPoints = useMemo(() => {
    if (!client) return [];

    // 1. Puntos traídos en vivo desde SAP Business One (Service Layer)
    const sapApiList = Array.isArray(dataDeliveryPoints) ? dataDeliveryPoints : (dataDeliveryPoints?.value || []);

    // 2. Puntos adjuntos en el objeto raw del cliente (si existen)
    const rawList = client.raw?.BPAddresses || client.raw?.bpAddresses || client.raw?.addresses || [];

    // 3. Combinar listas
    const combined = [...sapApiList, ...rawList];

    let points = [];
    if (combined.length > 0) {
      points = combined.filter(addr =>
        addr.AddressType === "bo_ShipTo" ||
        addr.addressType === "bo_ShipTo" ||
        !addr.AddressType ||
        addr.AddressName?.toUpperCase().includes("ALMACEN") ||
        addr.AddressName?.toUpperCase().includes("ENTREGA")
      );
      if (points.length === 0) {
        points = [...combined];
      }
    }

    // Deduplicar por AddressName y Dirección/Street
    const uniquePoints = [];
    const seen = new Set();
    points.forEach(p => {
      const name = (p.AddressName || p.name || "").trim();
      const street = (p.Street || p.Address || p.address || "").trim();
      const key = `${name}_${street}`.toLowerCase();
      if ((name || street) && !seen.has(key)) {
        seen.add(key);
        uniquePoints.push({
          ...p,
          AddressName: name || "SUCURSAL",
          Street: street,
          Address: street,
          label: street ? (name ? `${name} - ${street}` : street) : name,
        });
      }
    });

    const mainAddress = client.Address || client.address || client.clientAddress || client.raw?.Address;
    const hasMainInList = uniquePoints.some(p => {
      const pStreet = (p.Street || p.Address || "").trim().toLowerCase();
      const mStreet = (mainAddress || "").trim().toLowerCase();
      return pStreet && mStreet && (pStreet === mStreet || pStreet.includes(mStreet) || mStreet.includes(pStreet));
    });

    if (mainAddress && !hasMainInList) {
      uniquePoints.unshift({
        AddressName: "FISCAL",
        Street: mainAddress,
        Address: mainAddress,
        label: `📍 Dirección Fiscal / Principal: ${mainAddress}`,
        isDefault: true,
      });
    }

    return uniquePoints;
  }, [client, dataDeliveryPoints]);

  // Extraer lista de personas de contacto oficiales registradas en SAP para este cliente
  const contactList = useMemo(() => {
    if (!client) return [];
    const rawList =
      client.raw?.ContactEmployees ||
      client.raw?.contactEmployees ||
      client.ContactEmployees ||
      client.contactEmployees ||
      client.contacts ||
      [];
    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList
        .map((c) => ({
          code: c.InternalCode || c.code || c.Name || c.name,
          name: c.Name || `${c.FirstName || ""} ${c.LastName || ""}`.trim() || c.name || "",
          position: c.Position || c.title || "",
        }))
        .filter((c) => c.name);
    }
    const singleContact =
      client.raw?.ContactPerson ||
      client.ContactPerson ||
      client.contactPerson ||
      client.raw?.ContactPersonCode;
    if (typeof singleContact === "string" && singleContact.trim()) {
      return [{ code: "DEFAULT", name: singleContact.trim(), position: "Contacto Principal" }];
    }
    return [];
  }, [client]);

  // ⚡ Gestión de persona de contacto y limpieza de residuales al cambiar o quitar cliente
  const prevClientCodeRef = useRef(client?.CardCode || null);

  useEffect(() => {
    const currentCode = client?.CardCode || null;
    if (prevClientCodeRef.current !== currentCode) {
      prevClientCodeRef.current = currentCode;
      if (!client) {
        // Se limpió el cliente (botón Cambiar Cliente / X): limpiar residuales
        if (typeof setContactPerson === "function") setContactPerson("");
        if (typeof setSelectedPoint === "function") setSelectedPoint(null);
      } else {
        // Se seleccionó un nuevo cliente: asignar contacto por defecto del nuevo cliente
        const defaultContact = client.raw?.ContactPerson || (contactList.length > 0 ? contactList[0].name : "");
        if (typeof setContactPerson === "function") setContactPerson(defaultContact || "");
        if (typeof setSelectedPoint === "function") setSelectedPoint(null);
      }
    } else if (client && !contactPerson) {
      const defaultContact = client.raw?.ContactPerson || (contactList.length > 0 ? contactList[0].name : "");
      if (defaultContact && typeof setContactPerson === "function") {
        setContactPerson(defaultContact);
      }
    } else if (!client && contactPerson) {
      if (typeof setContactPerson === "function") {
        setContactPerson("");
      }
    }
  }, [client, contactList, setContactPerson, setSelectedPoint, contactPerson]);

  // Nota: No se auto-seleccionan forma de entrega, condición de pago, condición de venta
  // ni tipo de comprobante para evitar errores humanos; el usuario debe elegirlos conscientemente.

  // Regla de negocio: El almacén es obligatoria y estrictamente el 014
  useEffect(() => {
    if (typeof setWhsCode === "function" && whsCode !== "014") {
      setWhsCode("014");
    }
  }, [whsCode, setWhsCode]);

  // Sincronizar automáticamente stock en tiempo real desde SAP al cargar cualquier borrador o cotización
  const lastCheckedStockRef = useRef("");
  useEffect(() => {
    if (!products || products.length === 0) return;

    const codes = products
      .map((p) => p.code || p.productCode || p.itemCode || p.id)
      .filter(Boolean);

    if (codes.length === 0) return;

    const currentKey = codes.sort().join(",");
    const needsStockCheck = products.some((p) => p.stock === null || p.stock === undefined || !p.stockChecked);

    if (!needsStockCheck && lastCheckedStockRef.current === currentKey) return;

    let isMounted = true;
    const fetchLiveStock = async () => {
      try {
        lastCheckedStockRef.current = currentKey;
        const url = `/reportModule/priceListByItemCodes?itemCodes=${encodeURIComponent(codes.join(","))}`;
        const res = await axiosInstance.get(url);
        const sapRecords = Array.isArray(res.data) ? res.data : (res.data?.records || []);

        if (Array.isArray(sapRecords) && sapRecords.length > 0 && isMounted) {
          const stockMap = new Map();
          sapRecords.forEach((r) => {
            const codeKey = String(r.ITEM_CODE || r.itemCode || "").trim().toUpperCase();
            const rawStk = r.STOCK_DISPONIBLE ?? r.Stock ?? r.OnHand;
            if (codeKey && rawStk !== undefined && rawStk !== null) {
              stockMap.set(codeKey, {
                stock: Number(rawStk),
                isAgotado: Number(rawStk) === 0,
                stockChecked: true,
                marca: r.MARCA || undefined,
                sigla: r.SIGLA || undefined,
              });
            }
          });

          if (stockMap.size > 0 && isMounted) {
            if (typeof setProducts === "function") {
              setProducts((prevProducts) => {
                const currentList = Array.isArray(prevProducts) ? prevProducts : products;
                return currentList.map((p) => {
                  const pKey = String(p.code || p.productCode || p.itemCode || p.id || "").trim().toUpperCase();
                  if (stockMap.has(pKey)) {
                    const info = stockMap.get(pKey);
                    return {
                      ...p,
                      stock: info.stock,
                      isAgotado: info.isAgotado,
                      stockChecked: true,
                      marca: p.marca || info.marca || "",
                      sigla: p.sigla || info.sigla || "",
                    };
                  }
                  return { ...p, stockChecked: true };
                });
              });
            }
          }
        }
      } catch (err) {
        console.warn("⚠️ No se pudo refrescar el stock de SAP en vivo:", err);
      }
    };

    fetchLiveStock();
    return () => {
      isMounted = false;
    };
  }, [products, setProducts]);

  // ⚡ Sincronización en tiempo real de Ofertas / Promociones en los artículos de la cotización activa
  useEffect(() => {
    // Si la cotización está bloqueada (solo lectura / ya emitida en SAP) no alterar retroactivamente
    if (isSellerFieldsLocked || !products || products.length === 0 || !promotionsMap) return;

    let hasChanges = false;
    const updatedProducts = products.map((p) => {
      if (p.isSpecialPrice || p.campaignName === "Convenio Cliente" || isSpecialAgreementItem(p)) return p;
      const code = String(p.productCode || p.itemCode || p.code || p.id || "").trim();
      if (!code) return p;

      const livePromo = promotionsMap[code];
      const livePromoDisc = livePromo ? Number(livePromo.discountPct || 0) : 0;
      const livePromoPriceConIGV = livePromo ? Number(livePromo.promoPriceConIGV || livePromo.U_US_PROMO || 0) : null;
      const livePromoPrice = livePromo ? Number(livePromo.promoPrice || livePromo.promoPriceNeto || 0) : null;
      const liveCampaign = livePromo?.campaignName || (livePromoDisc > 0 || livePromoPriceConIGV > 0 ? "Oferta del Mes" : undefined);
      const liveTotalDisc = livePromo ? Number(livePromo.totalDiscountPct || 0) : 0;

      const currentPromoDisc = Number(p.promoDiscount || 0);
      const currentPromoPriceConIGV = Number(p.promoPriceConIGV || p.U_US_PROMO || 0);
      const currentCampaign = p.campaignName;

      if (currentPromoDisc !== livePromoDisc || currentPromoPriceConIGV !== (livePromoPriceConIGV || 0) || currentCampaign !== liveCampaign) {
        hasChanges = true;
        return {
          ...p,
          promoDiscount: livePromoDisc,
          promoPrice: livePromoPrice,
          promoPriceNeto: livePromoPrice,
          promoPriceConIGV: livePromoPriceConIGV,
          U_US_PROMO: livePromoPriceConIGV || livePromoPrice,
          totalDiscountPct: liveTotalDisc,
          campaignName: liveCampaign,
        };
      }
      return p;
    });

    if (hasChanges && typeof setProducts === "function") {
      setProducts(updatedProducts);
    }
  }, [promotionsMap, isSellerFieldsLocked, products, setProducts]);

  // Cálculos de totales estilo SAP B1 — unificados con la calculadora global
  const totals = useMemo(() => {
    return calculateQuoteTotals(products, exchangeRate, { currency: currency || "USD" });
  }, [products, exchangeRate, currency]);

  // ─── ANÁLISIS DE LÍNEA DE CRÉDITO Y DISPONIBILIDAD EN TIEMPO REAL (SAP B1 U_TQC_LMCRED) ───
  const isCreditSale = useMemo(() => {
    if (saleCondition === "CREDITO") return true;
    if (saleCondition === "CONTADO") return false;
    const pLabel = extractPaymentLabel(selectedPaymentType).toLowerCase();
    if (pLabel.includes("contado") || pLabel.includes("anticipado")) return false;
    return pLabel.includes("credit") || pLabel.includes("crédito") || pLabel.includes("dias") || pLabel.includes("días") || pLabel.includes("letra");
  }, [saleCondition, selectedPaymentType]);

  const clientCreditInfo = useMemo(() => {
    if (!client) return null;

    // 1. Límite de Crédito Autorizado en SAP:
    // U_TQC_LMCRED se registra en USD (ej: 21,133 USD)
    // MaxCommitment ("Límite de comprometido") en SAP B1 Perú se registra en Soles (PEN) (ej: 71,852.20 PEN = 21,133 USD a TC contable 3.40)
    // CreditLimit es el campo estándar de SAP
    const rawLimitUSD = Number(
      client.U_TQC_LMCRED ??
      client.raw?.U_TQC_LMCRED ??
      client.creditLimit ??
      0
    );
    const rawMaxCommitmentPEN = Number(
      client.MaxCommitment ??
      client.raw?.MaxCommitment ??
      0
    );
    const rawStandardLimit = Number(
      client.CreditLimit ??
      client.raw?.CreditLimit ??
      0
    );

    let creditLimitUSD = 0;
    let maxCommitmentPEN = 0;

    if (rawLimitUSD > 0) {
      creditLimitUSD = Number(rawLimitUSD.toFixed(2));
      maxCommitmentPEN = rawMaxCommitmentPEN > 0 ? Number(rawMaxCommitmentPEN.toFixed(2)) : Number((creditLimitUSD * 3.40).toFixed(2));
    } else if (rawMaxCommitmentPEN > 0) {
      // Si en SAP se llenó "Límite de comprometido" en Soles (PEN), convertir a USD al TC 3.40
      creditLimitUSD = Number((rawMaxCommitmentPEN / 3.40).toFixed(2));
      maxCommitmentPEN = Number(rawMaxCommitmentPEN.toFixed(2));
    } else if (rawStandardLimit > 0) {
      creditLimitUSD = Number(rawStandardLimit.toFixed(2));
      maxCommitmentPEN = Number((creditLimitUSD * 3.40).toFixed(2));
    }

    const hasCreditLine = creditLimitUSD > 0;

    // 2. Saldo deudor facturado pendiente (en USD) - Saldo neto real exigible del cliente
    const rawBalance = Number(client.CurrentAccountBalance ?? client.raw?.CurrentAccountBalance ?? client.Balance ?? 0);
    const pendingDebtUSD = clientDebtInfo?.totalPendingUSD > 0
      ? clientDebtInfo.totalPendingUSD
      : (rawBalance > 0 ? Number((rawBalance / (exchangeRate || 3.564)).toFixed(2)) : 0);

    // 3. Crédito utilizado real del cliente (coincidente con el saldo neto consolidado por cobrar)
    const totalCommittedUSD = Number(pendingDebtUSD.toFixed(2));

    // 4. Crédito disponible antes de esta cotización (Línea autorizada - Crédito utilizado)
    // Refleja saldo negativo si el cliente ha consumido más de su línea autorizada en SAP
    const availableCreditUSD = hasCreditLine
      ? Number((creditLimitUSD - totalCommittedUSD).toFixed(2))
      : 0;

    // 5. Impacto de esta cotización (en USD) - Sincronizado en tiempo real con calculateQuoteTotals
    const quoteTotalUSD = Number(totals?.grandTotalUSD ?? totals?.grandTotal ?? totals?.total ?? 0);
    const projectedTotalUSD = Number((totalCommittedUSD + quoteTotalUSD).toFixed(2));

    // 6. Sobregiro / Exceso de línea
    // Si la venta es al contado, no genera sobregiro de línea a plazo
    let creditOverflowUSD = 0;
    let isExceeded = false;

    if (isCreditSale) {
      if (hasCreditLine) {
        if (projectedTotalUSD > creditLimitUSD) {
          creditOverflowUSD = Number((projectedTotalUSD - creditLimitUSD).toFixed(2));
          isExceeded = true;
        }
      } else if (quoteTotalUSD > 0) {
        creditOverflowUSD = quoteTotalUSD;
        isExceeded = true;
      }
    }

    // 7. Porcentaje de ocupación de línea (ej: 524.54 / 5577 = 9.4%)
    const usagePercent = hasCreditLine && creditLimitUSD > 0
      ? Math.min(999, Number(((totalCommittedUSD / creditLimitUSD) * 100).toFixed(1)))
      : 0;

    return {
      hasCreditLine,
      creditLimitUSD,
      maxCommitmentPEN,
      pendingDebtUSD,
      invoicedDebtUSD: pendingDebtUSD,
      openOrdersUSD: 0,
      totalCommittedUSD,
      availableCreditUSD,
      quoteTotalUSD,
      projectedTotalUSD,
      creditOverflowUSD,
      isExceeded,
      usagePercent,
      isCreditSale,
    };
  }, [client, clientDebtInfo, totals?.grandTotalUSD, totals?.grandTotal, totals?.total, isCreditSale, exchangeRate]);

  // Solo mostrar cartillas financieras si el cliente realmente tiene línea de crédito o deuda activa
  const hasCreditCard = Boolean(
    client &&
    clientCreditInfo &&
    (clientCreditInfo.hasCreditLine || clientCreditInfo.totalCommittedUSD > 0)
  );

  const hasDebtCard = Boolean(
    client &&
    clientDebtInfo &&
    clientDebtInfo.hasTotalDebt
  );

  const hasClientFinancialCards = Boolean(hasCreditCard || hasDebtCard);

  const currentQuoteObj = useMemo(() => ({
    id: docNumber || null,
    docNumber: docNumber || null,
    sapDocNum: null,
    DocNum: null,
    client,
    products,
    currency: currency || "USD",
    DocCurrency: currency || "USD",
    totals,
    clientCreditInfo,
    isCreditSale,
    sellerName: activeSeller,
    SlpCode: selectedSlpCode || (isAdmin ? 20 : undefined),
    slpCode: selectedSlpCode || (isAdmin ? 20 : undefined),
    salesEmployeeCode: selectedSlpCode || (isAdmin ? 20 : undefined),
    salesPersonCode: selectedSlpCode || (isAdmin ? 20 : undefined),
    docDate,
    docDueDate,
    deliveryDate: deliveryDate ? (deliveryDate instanceof Date ? deliveryDate.toISOString().split("T")[0] : deliveryDate) : null,
    contactPerson,
    refNumber,
    comment,
    selectedDeliveryForm,
    selectedTransport,
    selectedPaymentType,
    selectedPoint,
    opNum,
    saleCondition,
    documentType,
    isLetra,
    creditTerm,
    whsCode: "014"
  }), [
    docNumber,
    client,
    products,
    currency,
    totals,
    activeSeller,
    selectedSlpCode,
    isAdmin,
    docDate,
    docDueDate,
    deliveryDate,
    contactPerson,
    refNumber,
    comment,
    selectedDeliveryForm,
    selectedTransport,
    selectedPaymentType,
    selectedPoint,
    opNum,
    saleCondition,
    documentType,
    isLetra,
    creditTerm
  ]);

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

    const invalidQtyProduct = products.find(p => !p.quantity || Number(p.quantity) < 1 || isNaN(Number(p.quantity)));
    if (invalidQtyProduct) {
      if (!silent) {
        toast({
          title: "Cantidad requerida",
          description: `El artículo "${invalidQtyProduct.name || invalidQtyProduct.description || 'seleccionado'}" tiene una cantidad vacía o en cero. La cantidad mínima es 1.`,
          status: "warning",
          duration: 3500,
          isClosable: true,
        });
      }
      return false;
    }

    const activeDocNumber = quoteId || docNumber;
    const clientDocDigits = String(client?.FederalTaxID || client?.clientDocument || client?.documentNumber || client?.LicTradNum || client?.CardCode || "").replace(/\D/g, "");
    const effectiveDocType = clientDocDigits.length === 8 ? "BOLETA" : "FACTURA";

    const finalTotals = {
      ...totals,
      grandTotal: totals?.grandTotalUSD || 0,
      contactPerson,
      refNumber,
      saleCondition,
      documentType: effectiveDocType,
      isLetra,
      creditTerm,
      whsCode: "014",
      inStockProducts: totals?.inStockProducts || [],
      backOrderProducts: totals?.backOrderProducts || [],
      backOrderItems: totals?.backOrderProducts || [],
      hasBackOrder: Boolean(totals?.hasBackOrder),
      creditLimit: clientCreditInfo?.creditLimitUSD || 0,
      tqcCreditLimit: clientCreditInfo?.creditLimitUSD || 0,
      creditUsed: clientCreditInfo?.totalCommittedUSD || 0,
      creditAvailable: clientCreditInfo?.availableCreditUSD || 0,
      creditOverflow: clientCreditInfo?.creditOverflowUSD || 0,
      exceedsCreditLimit: Boolean(clientCreditInfo?.isExceeded),
      requiresCreditApproval: Boolean(clientCreditInfo?.isExceeded && clientCreditInfo?.isCreditSale),
      isCreditSale: Boolean(clientCreditInfo?.isCreditSale),
    };

    // Extraer número de correlativo limpio (ej. "COT-WEB-000015" -> 15, "15" -> 15)
    const cleanNumFast = (str) => {
      if (!str) return null;
      const match = String(str).match(/(?:COT-(?:WEB-)?0*)?(\d+)/i);
      return match ? parseInt(match[1], 10) : null;
    };

    const activeNum = cleanNumFast(activeDocNumber);

    // Guardar o actualizar en localStorage sin retroceder de estado
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const isMatchingDoc = (q) => {
      if (!q) return false;
      const qDocNum = q.docNumber ? String(q.docNumber).trim() : "";
      const qId = q.id !== undefined && q.id !== null ? String(q.id).trim() : "";
      if (activeDocNumber) {
        const activeStr = String(activeDocNumber).trim();
        if (activeStr && ((qDocNum && qDocNum === activeStr) || (qId && qId === activeStr))) {
          return true;
        }
        if (activeNum !== null) {
          if (cleanNumFast(qDocNum) === activeNum || cleanNumFast(qId) === activeNum) {
            return true;
          }
        }
      }
      return false;
    };

    const existingDoc = saved.find(isMatchingDoc);
    const existingStatus = existingDoc?.approvalStatus || existingDoc?.state;

    // Si la cotización está observada o ya fue enviada a validación/aprobación,
    // preservamos su estado actual para no degradarla a BORRADOR, pero SÍ guardamos todas las modificaciones
    const isAdvanced = existingStatus && ["ENVIADO", "EN_PROCESO", "APROBADO_COMERCIAL", "PENDIENTE_FACTURACION", "APROBADO", "RECHAZADO", "OBSERVADO", "EN_EDICION"].includes(existingStatus);

    const currentStatus = targetStatus === "BORRADOR"
      ? "BORRADOR"
      : (targetStatus === "ENVIADO" ? "ENVIADO" : (isAdvanced ? existingStatus : targetStatus));
    const nowIso = new Date().toISOString();
    const prevHistory = existingDoc?.historyLog || [];
    
    let updatedHistory = [...prevHistory];
    
    if (targetStatus === "ENVIADO") {
      // Al enviar formalmente a validación, se purgan entradas internas de borrador previo para mantener limpia la línea de tiempo oficial
      updatedHistory = updatedHistory.filter(h => h.status !== "BORRADOR" && h.note !== "Borrador guardado");
      if (!updatedHistory.some(h => h.status === "ENVIADO")) {
        updatedHistory.push({ status: "ENVIADO", timestamp: nowIso, user: activeSeller, note: "Cotización enviada a validación" });
      }
    } else if (targetStatus === "BORRADOR" && !options?.silent && prevHistory.length === 0) {
      // Solo registrar entrada explícita si el vendedor pulsa manualmente "Guardar como Borrador" (nunca por autoguardado silencioso)
      updatedHistory.push({ status: "BORRADOR", timestamp: nowIso, user: activeSeller, note: "Borrador guardado" });
    }

    const normalizedClient = normalizeQuoteClient(client) || client;
    const clientCardCodeVal = normalizedClient?.CardCode || "";
    const clientRucVal = normalizedClient?.LicTradNum || normalizedClient?.clientRuc || normalizedClient?.clientDocument || clientCardCodeVal;
    const clientAddressVal = normalizedClient?.Address || normalizedClient?.address || "";
    const clientNameVal = normalizedClient?.CardName || normalizedClient?.name || "CLIENTE GENERAL";

    const originalSellerName = existingDoc?.sellerName 
      || (storeSellerName && storeSellerName !== "Vendedor SAP" && storeSellerName !== "Vendedor Autorizado" ? storeSellerName : null)
      || existingDoc?.createdByUsername 
      || storeCreatedByUsername;

    const originalCreatedByUsername = existingDoc?.createdByUsername 
      || storeCreatedByUsername 
      || existingDoc?.sellerName 
      || (storeSellerName && storeSellerName !== "Vendedor SAP" && storeSellerName !== "Vendedor Autorizado" ? storeSellerName : null);

    const originalUserId = existingDoc?.createdByUserId 
      || existingDoc?.userId 
      || storeCreatedByUserId;

    const originalSlpCode = existingDoc?.SlpCode
      || existingDoc?.slpCode
      || existingDoc?.salesPersonCode
      || existingDoc?.salesEmployeeCode
      || existingDoc?.totals?.SlpCode
      || existingDoc?.totals?.slpCode
      || existingDoc?.totals?.salesPersonCode
      || existingDoc?.totals?.salesEmployeeCode
      || storeSlpCode
      || storeSalesPersonCode
      || storeSalesEmployeeCode;

    const currentLoggedInUsername = String(username || localSeller || "").toLowerCase().trim();
    const effectiveSlpCode = (() => {
      if (selectedSlpCode && !isNaN(Number(selectedSlpCode)) && Number(selectedSlpCode) !== 20) {
        return Number(selectedSlpCode);
      }
      if (originalSlpCode && !isNaN(Number(originalSlpCode)) && Number(originalSlpCode) > 0 && Number(originalSlpCode) !== 20) {
        return Number(originalSlpCode);
      }
      if (selectedSlpCode && !isNaN(Number(selectedSlpCode))) {
        return Number(selectedSlpCode);
      }
      return effectiveSessionSalesCode > 0 ? effectiveSessionSalesCode : 20;
    })();

    const matchedSlpObj = effectiveSlpCode ? sellersList.find((s) => s.value === Number(effectiveSlpCode)) : null;
    let finalSellerName = matchedSlpObj?.label;
    if (!finalSellerName && originalSellerName && !/^(vendedor\s*autorizado|vendedor|sin\s*vendedor|001\.ofic administración)$/i.test(originalSellerName)) {
      finalSellerName = originalSellerName;
    }
    if (!finalSellerName && Number(effectiveSlpCode) === 20) {
      finalSellerName = "001.Ofic Administración";
    }
    if (!finalSellerName && activeSeller && !/^(vendedor\s*autorizado|vendedor|sin\s*vendedor)$/i.test(activeSeller)) {
      finalSellerName = activeSeller;
    }
    if (!finalSellerName) {
      finalSellerName = "001.Ofic Administración";
    }
    const finalCreatedByUsername = originalCreatedByUsername || currentLoggedInUsername || (username || "admin");
    const finalCreatedByUserId = originalUserId || (userId || null);

    const resolvedNumericId = existingDoc?.id && !isNaN(Number(existingDoc.id))
      ? Number(existingDoc.id)
      : (activeNum !== null ? activeNum : null);

    const resolvedDocNumber = activeDocNumber && !["COT-PENDIENTE", "COT-NUEVA"].includes(String(activeDocNumber).toUpperCase().trim())
      ? activeDocNumber
      : (resolvedNumericId ? `COT-WEB-${String(resolvedNumericId).padStart(6, "0")}` : null);

    const newDoc = {
      id: resolvedNumericId || existingDoc?.id || activeDocNumber,
      docNumber: resolvedDocNumber,
      docType,
      client,
      clientName: clientNameVal,
      clientRuc: clientRucVal,
      clientAddress: clientAddressVal,
      products,
      currency: currency || "USD",
      DocCurrency: currency || "USD",
      hasDebt: Boolean(clientDebtInfo?.hasTotalDebt),
      hasOverdueDebt: Boolean(clientDebtInfo?.hasOverdueDebt),
      debtSummary: clientDebtInfo?.debtSummary || null,
      creditLimit: clientCreditInfo?.creditLimitUSD || 0,
      tqcCreditLimit: clientCreditInfo?.creditLimitUSD || 0,
      creditUsed: clientCreditInfo?.totalCommittedUSD || 0,
      creditAvailable: clientCreditInfo?.availableCreditUSD || 0,
      creditOverflowAmount: clientCreditInfo?.creditOverflowUSD || 0,
      exceedsCreditLimit: Boolean(clientCreditInfo?.isExceeded),
      requiresCreditApproval: Boolean(clientCreditInfo?.isExceeded && clientCreditInfo?.isCreditSale),
      isCreditSale: Boolean(clientCreditInfo?.isCreditSale),
      hasBackOrder: Boolean(finalTotals.hasBackOrder),
      backOrderItems: finalTotals.backOrderProducts || [],
      totals: {
        ...finalTotals,
        currency: currency || "USD",
        DocCurrency: currency || "USD",
        hasDebt: Boolean(clientDebtInfo?.hasTotalDebt),
        hasOverdueDebt: Boolean(clientDebtInfo?.hasOverdueDebt),
        debtSummary: clientDebtInfo?.debtSummary || null,
        SlpCode: effectiveSlpCode,
        salesEmployeeCode: effectiveSlpCode,
        salesPersonCode: effectiveSlpCode,
        sapDocNum: null,
        DocNum: null,
        isSapDirect: false,
      },
      whsCode: "014",
      contactPerson,
      refNumber,
      saleCondition,
      documentType: effectiveDocType,
      isLetra,
      creditTerm,
      docDate,
      docDueDate: deliveryDate ? (deliveryDate instanceof Date ? deliveryDate.toISOString().split("T")[0] : deliveryDate) : docDueDate,
      deliveryDate: deliveryDate ? (deliveryDate instanceof Date ? deliveryDate.toISOString().split("T")[0] : deliveryDate) : (existingDoc?.deliveryDate || null),
      comment,
      deliveryForm: selectedDeliveryForm,
      selectedDeliveryForm,
      transport: selectedTransport,
      selectedTransport,
      paymentType: selectedPaymentType,
      selectedPaymentType,
      deliveryPoint: selectedPoint,
      selectedPoint,
      sellerName: finalSellerName,
      SlpCode: effectiveSlpCode,
      slpCode: effectiveSlpCode,
      salesPersonCode: effectiveSlpCode,
      paymentMethod: paymentMethod || null,
      bankAccount: bankAccount || null,
      sunatOpType: sunatOpType || "0101",
      U_VS_TIPOPER: "01",
      U_VS_TIPO_FACT: sunatOpType || "0101",
      U_VS_NATNUM: "T",
      natNum: "T",
      payToCode: "FISCAL",
      PayToCode: "FISCAL",
      U_VS_AFEDET: "N",
      U_VS_BANCO: bankAccount || null,
      PaymentMethod: paymentMethod || null,
      createdByUsername: finalCreatedByUsername,
      createdByUserId: finalCreatedByUserId,
      userId: finalCreatedByUserId,
      createdAt: existingDoc?.createdAt || nowIso,
      updatedAt: nowIso,
      status: currentStatus,
      state: currentStatus,
      approvalStatus: currentStatus,
      sapDocNum: null,
      DocNum: null,
      isSapDirect: false,
      rejectionReason: existingDoc?.rejectionReason || null,
      historyLog: updatedHistory,
      opNum: opNum || existingDoc?.opNum || null,
      observations: observations || existingDoc?.observations || null,
    };

    const isExisting = Boolean(existingDoc);
    let updated;
    if (isExisting) {
      updated = saved.map((q) => (isMatchingDoc(q) ? newDoc : q));
    } else {
      const cleanedSaved = saved.filter((q) => !isMatchingDoc(q));
      updated = [newDoc, ...cleanedSaved];
    }
    // Deduplicar para garantizar que nunca haya dos borradores del mismo documento
    const dedupedLocal = [];
    for (const q of updated) {
      if (!dedupedLocal.some((existing) => isMatchingDoc(existing) && isMatchingDoc(q))) {
        dedupedLocal.push(q);
      }
    }
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(dedupedLocal.slice(0, 80)));
    window.dispatchEvent(new Event("localQuotesUpdated"));

    const clientName = client?.CardName || client?.name || "Cliente General";
    const totalUsdStr = finalTotals?.grandTotalUSD ? `$${formatThousands(finalTotals.grandTotalUSD)}` : "$0.00";
    const ADMIN_FACTURACION_USERNAME = "admin";
    const senderUsername = username || localSeller || "vendedor";
    const maxAdic = (products || []).reduce((max, it) => Math.max(max, Number(it.lineDiscount || it.LineDiscount || 0)), 0);
    const discountNotice = maxAdic > 0 ? ' • ⚠️ CON DESCUENTO ADICIONAL APLICADO' : '';

    // Persistencia centralizada en MySQL vía Backend
    const savePromise = createQuote(newDoc).then((res) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      const assignedNumber = res?.docNumber || (res?.id ? `COT-WEB-${String(res.id).padStart(6, "0")}` : activeDocNumber);
      if (assignedNumber) {
        console.log(`🔄 [Correlativo Asignado] Oficial: ${assignedNumber}`);
        setDocNumber(assignedNumber);
        if (setQuoteId) setQuoteId(res?.id || assignedNumber);
        if (setApprovalStatus) setApprovalStatus(currentStatus);

        // Guardar/Actualizar en localStorage con el docNumber oficial asignado
        try {
          const freshLocal = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
          const cleaned = freshLocal.filter(item => {
            const iDoc = item.docNumber ? String(item.docNumber) : "";
            const iId = item.id !== undefined && item.id !== null ? String(item.id) : "";
            const isColliding = (iDoc && iDoc === String(assignedNumber)) || (iId && iId === String(res?.id));
            const isPreviousActive = activeDocNumber && (iDoc === String(activeDocNumber) || iId === String(activeDocNumber));
            const isSameDraft = isMatchingDoc(item);
            const isSameNumeric = res?.id && (cleanNumFast(item.docNumber) === res.id || cleanNumFast(item.id) === res.id);
            return !isColliding && !isPreviousActive && !isSameDraft && !isSameNumeric;
          });
          const persistedDoc = {
            ...newDoc,
            id: res?.id || assignedNumber,
            docNumber: assignedNumber,
            status: currentStatus,
            state: currentStatus,
            approvalStatus: currentStatus,
          };
          cleaned.unshift(persistedDoc);
          localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(cleaned.slice(0, 80)));
          window.dispatchEvent(new Event("localQuotesUpdated"));
        } catch (e) {}

        // Si se ENVIÓ a validación, generar la notificación oficial para Facturación y para el Vendedor
        if (targetStatus === "ENVIADO") {
          try {
            const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
            const hasOverdue = Boolean(clientDebtInfo?.hasOverdueDebt);
            const debtNotice = clientDebtInfo?.debtSummary 
              ? (hasOverdue ? ` • ⚠️ DEUDA VENCIDA: ${clientDebtInfo.debtSummary}` : ` • 🗓️ ${clientDebtInfo.debtSummary}`)
              : '';
            const notifTitle = hasOverdue
              ? `⚠️ Cotización Cliente con Deuda Vencida - ${assignedNumber}`
              : (maxAdic > 0
                ? `🔥 Cotización con Descuento Adicional - ${assignedNumber}`
                : `📩 Nueva Cotización Recibida - ${assignedNumber}`);

            const notifAdminObj = {
              id: `NOTIF-A-${Date.now()}`,
              targetRole: "FACTURACION",
              targetUsername: null,
              fromUsername: senderUsername,
              fromUserId: userId || null,
              quoteId: assignedNumber,
              quoteObj: {
                ...newDoc,
                id: res?.id || assignedNumber,
                docNumber: assignedNumber,
                hasDebt,
                hasOverdueDebt: Boolean(clientDebtInfo?.hasOverdueDebt),
                debtSummary: clientDebtInfo?.debtSummary || null
              },
              title: notifTitle,
              description: `Enviada por ${activeSeller} • Cliente: ${clientName} (${totalUsdStr})${discountNotice}${debtNotice} ${opNum ? `• Váucher / Op: N° ${opNum}` : ''}. Requiere aprobación comercial.`,
              status: "ENVIADO",
              hasDiscount: maxAdic > 0,
              maxDiscount: maxAdic,
              hasDebt,
              hasOverdueDebt: Boolean(clientDebtInfo?.hasOverdueDebt),
              debtSummary: clientDebtInfo?.debtSummary || null,
              createdAt: new Date().toISOString(),
              timestamp: new Date().toISOString(),
              read: false
            };

            const notifSellerObj = {
              id: `NOTIF-S-${Date.now()}`,
              targetRole: "VENDEDOR",
              targetUsername: senderUsername,
              fromUsername: "Sistema de Cotizaciones",
              fromUserId: null,
              quoteId: assignedNumber,
              quoteObj: {
                ...newDoc,
                id: res?.id || assignedNumber,
                docNumber: assignedNumber,
                hasDebt,
                hasOverdueDebt: Boolean(clientDebtInfo?.hasOverdueDebt),
                debtSummary: clientDebtInfo?.debtSummary || null
              },
              title: `📤 Cotización Enviada a Validación - ${assignedNumber}`,
              description: `Tu cotización para ${clientName} (${totalUsdStr})${discountNotice}${debtNotice} fue enviada con éxito a validación de Facturación.`,
              status: "ENVIADO",
              hasDiscount: maxAdic > 0,
              maxDiscount: maxAdic,
              hasDebt,
              hasOverdueDebt: Boolean(clientDebtInfo?.hasOverdueDebt),
              debtSummary: clientDebtInfo?.debtSummary || null,
              createdAt: new Date().toISOString(),
              timestamp: new Date().toISOString(),
              read: false
            };

            const cleanedNotifs = existingNotifs.filter(n => String(n.quoteId || n.id) !== String(assignedNumber));
            const myRoleNotif = isAdmin ? notifAdminObj : notifSellerObj;
            localStorage.setItem("grupoLeon_notifications", JSON.stringify([myRoleNotif, ...cleanedNotifs]));
            window.dispatchEvent(new Event("localNotificationsUpdated"));
          } catch (e) {}
        }
      }

      return res;
    }).catch(err => {
      console.error("Error persistiendo cotización en base de datos:", err);
      if (targetStatus === "ENVIADO") {
        throw err;
      }
      return newDoc;
    });

    return { success: true, activeDocNumber, currentStatus, newDoc, savePromise };
  };

  handleSaveActionRef.current = handleSaveAction;

  // ── AUTOGUARDADO INTELIGENTE (Anti-duplicidad) ──
  // 1. Guardado periódico reactivo: Al agregar artículos o modificar precios/términos (debounced 2.5s)
  useEffect(() => {
    if (
      !products ||
      products.length === 0 ||
      isExplicitlySubmittingRef.current ||
      isExplicitlyClearedRef.current ||
      isReadOnly ||
      isAdminReviewing
    ) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (isExplicitlySubmittingRef.current || isExplicitlyClearedRef.current) return;
      setIsAutoSaving(true);
      try {
        const result = handleSaveActionRef.current?.("BORRADOR", { silent: true });
        if (result && result.savePromise) {
          const res = await result.savePromise;
          if (res && (res.id || res.docNumber)) {
            const assignedNumber = res.docNumber || (res.id ? `COT-WEB-${String(res.id).padStart(6, "0")}` : null);
            if (res.id && setQuoteId) setQuoteId(res.id);
            if (assignedNumber) setDocNumber(assignedNumber);
          }
        }
        setLastAutoSavedTime(new Date());
      } catch (e) {
        console.warn("⚠️ Aviso en autoguardado reactivo:", e);
      } finally {
        setIsAutoSaving(false);
      }
    }, 2500);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    products,
    client,
    totals?.grandTotalUSD,
    comment,
    deliveryDate,
    selectedPoint,
    selectedTransport,
    selectedDeliveryForm,
    selectedPaymentType,
    currency,
    contactPerson,
    refNumber,
    saleCondition,
    documentType,
    creditTerm,
    isReadOnly,
    isAdminReviewing
  ]);

  // 2. Guardado al salir de la pantalla (Desmontaje / Cambio de ruta)
  useEffect(() => {
    return () => {
      if (!isExplicitlySubmittingRef.current && !isExplicitlyClearedRef.current && !isReadOnly && !isAdminReviewing) {
        try {
          handleSaveActionRef.current?.("BORRADOR", { silent: true });
        } catch (e) {}
      }
    };
  }, [isReadOnly, isAdminReviewing]);

  // 3. Guardado al cerrar la pestaña o recargar el navegador (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isExplicitlySubmittingRef.current && !isExplicitlyClearedRef.current && !isReadOnly && !isAdminReviewing) {
        try {
          handleSaveActionRef.current?.("BORRADOR", { silent: true });
        } catch (e) {}
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isReadOnly, isAdminReviewing]);

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const result = handleSaveAction("BORRADOR");
      if (result && result.success) {
        let finalNumber = result.activeDocNumber;
        try {
          const savedRes = await result.savePromise;
          if (savedRes && (savedRes.docNumber || savedRes.id)) {
            finalNumber = savedRes.docNumber || (savedRes.id ? `COT-WEB-${String(savedRes.id).padStart(6, "0")}` : finalNumber);
            if (savedRes.id && setQuoteId) {
              setQuoteId(savedRes.id);
            }
            if (finalNumber) {
              setDocNumber(finalNumber);
            }
          }
        } catch (e) {
          console.warn("Aviso al persistir borrador en backend:", e);
        }

        if (setApprovalStatus) {
          setApprovalStatus("BORRADOR");
        }

        toast({
          title: "💾 Borrador Guardado Exitosamente",
          description: `Cotización ${finalNumber || "actualizada"} guardada en Borradores. Puedes continuar agregando productos o enviarla a validación.`,
          status: "success",
          duration: 4000,
          isClosable: true,
          position: "top",
        });
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  const validateBeforeAdminApproval = () => {
    // 1. Validar Cliente
    if (!client || (!client.CardCode && !client.CardName && !client.name)) {
      toast({
        title: "⚠️ Cliente requerido",
        description: "Debe buscar y seleccionar un cliente antes de aprobar la cotización.",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
      setActiveTabIndex(0);
      return false;
    }

    // 2. Validar Productos y Monto Total
    if (!products || products.length === 0) {
      toast({
        title: "⚠️ Sin artículos agregados",
        description: "La cotización debe tener al menos 1 producto en la grilla para generar un pedido.",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
      setActiveTabIndex(0);
      return false;
    }

    let grandTotalUSD = totals?.grandTotalUSD ?? totals?.grandTotal ?? 0;
    if (Number(grandTotalUSD) <= 0 && products.length > 0) {
      toast({
        title: "Total Inválido",
        description: "El total de la cotización debe ser mayor a cero. Verifique los precios de los productos en SAP.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return false;
    }

    if (Number(grandTotalUSD) <= 0) {
      toast({
        title: "⚠️ Monto total inválido",
        description: "El total de la cotización debe ser mayor a $0.00 para aprobar y generar el pedido.",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
      setActiveTabIndex(0);
      return false;
    }

    // 3. Validar Logística y Despacho (Sección 1)
    if (!selectedDeliveryForm) {
      toast({
        title: "⚠️ Forma de Entrega requerida",
        description: "Debe seleccionar una Forma de Entrega en la pestaña 'Logística, Pagos y Anexos' (Sección 1).",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
      setActiveTabIndex(1);
      return false;
    }

    const isPickup = isPickupInStoreForm(selectedDeliveryForm);
    if (!isPickup && !selectedPoint && !selectedTransport) {
      toast({
        title: "⚠️ Destino o Agencia requerida",
        description: "Para despachos fuera de tienda, debe indicar la agencia de transporte o el punto de llegada (Sección 1).",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
      setActiveTabIndex(1);
      return false;
    }

    // 3.1. Validar Fecha estimada de entrega (Obligatorio)
    const hasAdminDeliveryDate = Boolean(
      deliveryDate &&
      (deliveryDate instanceof Date
        ? !isNaN(deliveryDate.getTime())
        : String(deliveryDate).trim().length >= 8)
    );

    if (!hasAdminDeliveryDate) {
      toast({
        title: "⚠️ Fecha estimada de entrega requerida",
        description: "Debe indicar la Fecha estimada de entrega en la pestaña 'Logística, Pagos y Anexos' antes de aprobar.",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
      setActiveTabIndex(1);
      return false;
    }

    // 4. Validar Condición de Pago / Comercial (Sección 2)
    const hasValidPaymentType = Boolean(
      selectedPaymentType &&
      (typeof selectedPaymentType === "object"
        ? (selectedPaymentType.value || selectedPaymentType.GroupNum !== undefined || selectedPaymentType.PymntGroup || selectedPaymentType.PaymentTermsGroupName || selectedPaymentType.label)
        : String(selectedPaymentType).trim().length > 0)
    );

    if (!hasValidPaymentType) {
      toast({
        title: "⚠️ Condición de Pago requerida",
        description: "Debe seleccionar la Condición Comercial / Tipo de Pago en la pestaña 'Logística, Pagos y Anexos' (Sección 2).",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
      setActiveTabIndex(1);
      return false;
    }

    // 4.1. Auto-deducir Condición de Venta (CONTADO o CRÉDITO) según la condición de pago SAP
    if (!saleCondition || !String(saleCondition).trim()) {
      const pLabel = extractPaymentLabel(selectedPaymentType).toLowerCase();
      const isCredit = pLabel.includes("credit") || pLabel.includes("crédito") || pLabel.includes("dias") || pLabel.includes("días") || pLabel.includes("letra");
      const derivedCondition = isCredit ? "CREDITO" : "CONTADO";
      if (setSaleCondition) setSaleCondition(derivedCondition);
    }

    // 4.2. Tipo de Comprobante (auto-deducido internamente: DNI 8 dígitos -> BOLETA, RUC/Otro -> FACTURA)
    const clientDocDigits = String(client?.FederalTaxID || client?.clientDocument || client?.documentNumber || client?.LicTradNum || client?.CardCode || "").replace(/\D/g, "");
    const autoType = clientDocDigits.length === 8 ? "BOLETA" : "FACTURA";
    if (setDocumentType && documentType !== autoType) {
      setDocumentType(autoType);
    }

    // 5. Validar Términos de Crédito (si aplica)
    const currentPymntLabel = (extractPaymentLabel(selectedPaymentType) || saleCondition || "").toLowerCase();

    const isCreditCondition = currentPymntLabel.includes("credit") || 
                              currentPymntLabel.includes("crédito") || 
                              currentPymntLabel.includes("dias") || 
                              currentPymntLabel.includes("días") || 
                              currentPymntLabel.includes("letra") || 
                              saleCondition === "CREDITO";

    if (isCreditCondition && (!creditTerm || !String(creditTerm).trim())) {
      if (setCreditTerm) setCreditTerm("30 días");
    }

    return true;
  };

  const handleAdminApproveQuote = async () => {
    if (!validateBeforeAdminApproval()) {
      return;
    }

    const activeDocNumber = docNumber || quoteId || `COT-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const adminName = username || localSeller || "Administrador";
    const sellerUsername = currentQuoteObj.sellerName || currentQuoteObj.createdByUsername || "Vendedor";

    isExplicitlySubmittingRef.current = true;
    setIsSendingToValidation(true);
    setValidationLoadingTitle("Aprobando y Generando Pedido en SAP...");
    setValidationLoadingSub(`Emitiendo a SAP Business One para ${activeDocNumber}`);
    setValidationStepText("Construyendo trama técnica para Service Layer...");

    const originalQuoteSlp = Number(
      currentQuoteObj.SlpCode ||
      currentQuoteObj.slpCode ||
      currentQuoteObj.salesPersonCode ||
      currentQuoteObj.salesEmployeeCode ||
      currentQuoteObj.totals?.SlpCode ||
      currentQuoteObj.totals?.slpCode ||
      currentQuoteObj.totals?.salesPersonCode ||
      currentQuoteObj.totals?.salesEmployeeCode ||
      storeSlpCode ||
      storeSalesPersonCode ||
      storeSalesEmployeeCode
    );

    const effectiveSlpCode = (() => {
      if (selectedSlpCode && !isNaN(Number(selectedSlpCode)) && Number(selectedSlpCode) !== 20) {
        return Number(selectedSlpCode);
      }
      if (!isNaN(originalQuoteSlp) && originalQuoteSlp > 0 && originalQuoteSlp !== 20) {
        return originalQuoteSlp;
      }
      if (selectedSlpCode && !isNaN(Number(selectedSlpCode))) {
        return Number(selectedSlpCode);
      }
      return 20;
    })();

    const origSeller = currentQuoteObj.sellerName || currentQuoteObj.totals?.sellerName || storeSellerName;
    const resolvedSellerName = (() => {
      if (effectiveSlpCode && sellersList?.length > 0) {
        const found = sellersList.find((s) => s.value === Number(effectiveSlpCode));
        if (found && found.label) return found.label;
      }
      if (origSeller && !origSeller.toLowerCase().includes("ofic administración")) {
        return origSeller;
      }
      return activeSeller || sellerUsername || "001.Ofic Administración";
    })();

    const clientDocDigits = String(client?.FederalTaxID || client?.clientDocument || client?.documentNumber || client?.LicTradNum || client?.CardCode || "").replace(/\D/g, "");
    const effectiveDocType = clientDocDigits.length === 8 ? "BOLETA" : "FACTURA";

    const inStockProductsForSap = [];
    const backOrderProductsList = [];

    const sanitizedProducts = products.map((p) => {
      const isAgotado = p.isAgotado === true || p.isAgotado === 1 || p.isAgotado === "true" || p.isAgotado === "Y";
      const stk = p.stock !== undefined && p.stock !== null ? Number(p.stock) : (p.stockChecked ? 0 : 1);
      const isOutOfStock = isAgotado || stk <= 0;

      const rawPrice = Number(p.unitPrice ?? p.price ?? 0);
      const isSol = currency === "SOL" || currency === "PEN";
      const rateMultiplier = isSol ? Number(exchangeRate || 3.43) : 1;
      const sapUnitPrice = Number((rawPrice * rateMultiplier).toFixed(4));
      const sapCustomPrice = p.customPriceConIGV && Number(p.customPriceConIGV) > 0 ? Number(p.customPriceConIGV) : null;

      const isSpecial = isSpecialAgreementItem(p);
      const specialDisc = isSpecial ? Number(p.specialDiscount ?? p.discount ?? p.sapDiscount ?? 0) : 0;
      const sapDisc = Number(p.sapDiscount ?? p.discount ?? p.descuentoSAP ?? p.U_TQC_DESL ?? specialDisc ?? 0);
      const promoDisc = isSpecial ? 0 : Number(p.promoDiscount ?? p.promoDisc ?? 0);
      let addDisc = Number(p.lineDiscount ?? p.manualDiscount ?? p.addDisc ?? p.descuentoManual ?? p.descuentoAdicional ?? (isSpecial ? 0 : p.U_TQC_DESV) ?? 0);

      const targetPromoPriceConIGV = (!isOutOfStock && !isSpecial) && (
        (p.promoPriceConIGV && Number(p.promoPriceConIGV) > 0) ? Number(p.promoPriceConIGV) :
        (p.U_US_PROMO && Number(p.U_US_PROMO) > 0) ? Number(p.U_US_PROMO) :
        (p.promoPrice && Number(p.promoPrice) > 0 && !p.promoPriceNeto) ? Number((Number(p.promoPrice) * 1.18).toFixed(2)) :
        null
      );
      const targetPromoNeto = targetPromoPriceConIGV
        ? Number((targetPromoPriceConIGV / 1.18).toFixed(6))
        : ((!isOutOfStock && !isSpecial) ? (p.promoPriceNeto && Number(p.promoPriceNeto) > 0 ? Number(p.promoPriceNeto) : (p.promoPrice && Number(p.promoPrice) > 0 ? Number(p.promoPrice) : null)) : null);
      const hasPromoPrice = Boolean(!isOutOfStock && !isSpecial && (targetPromoNeto > 0 || targetPromoPriceConIGV > 0));

      const baseSpecialNeto = isSpecial
        ? (p.specialPrice && Number(p.specialPrice) > 0
            ? Number((Number(p.specialPrice) * rateMultiplier).toFixed(6))
            : Number((sapUnitPrice * (1 - specialDisc / 100)).toFixed(6)))
        : 0;
      const calculatedSpecialConIGV = isSpecial && sapUnitPrice > 0 && specialDisc > 0
        ? Number((Number((sapUnitPrice * 1.18).toFixed(2)) * (1 - specialDisc / 100)).toFixed(2))
        : null;
      const baseSpecialConIGV = isSpecial
        ? (calculatedSpecialConIGV
            || (p.specialPriceConIGV && Number(p.specialPriceConIGV) > 0 ? Number((Number(p.specialPriceConIGV) * rateMultiplier).toFixed(2)) : null)
            || Number((baseSpecialNeto * 1.18).toFixed(2)))
        : 0;

      let netUnitPrice;
      let totalDisc;
      if (sapCustomPrice) {
        const effectiveCustomPrice = isSpecial && baseSpecialConIGV > 0 && sapCustomPrice < baseSpecialConIGV - 0.02
          ? baseSpecialConIGV
          : sapCustomPrice;
        netUnitPrice = Number((effectiveCustomPrice / 1.18).toFixed(6));
        totalDisc = sapUnitPrice > 0
          ? Math.min(100, Math.max(0, Number((((sapUnitPrice - netUnitPrice) / sapUnitPrice) * 100).toFixed(2))))
          : 0;
        if (isSpecial && specialDisc > 0) {
          totalDisc = Math.min(specialDisc, totalDisc);
          addDisc = Number((totalDisc - specialDisc).toFixed(2));
        }
      } else if (isSpecial && (specialDisc > 0 || baseSpecialNeto > 0 || baseSpecialConIGV > 0)) {
        const clampedAddDisc = Math.min(0, addDisc);
        if (clampedAddDisc === 0) {
          if (baseSpecialConIGV > 0) {
            netUnitPrice = Number((baseSpecialConIGV / 1.18).toFixed(6));
          } else if (baseSpecialNeto > 0) {
            netUnitPrice = baseSpecialNeto;
          } else {
            netUnitPrice = Number((sapUnitPrice * (1 - specialDisc / 100)).toFixed(6));
          }
          totalDisc = specialDisc;
        } else {
          netUnitPrice = Number((baseSpecialNeto * (1 - clampedAddDisc / 100)).toFixed(6));
          totalDisc = sapUnitPrice > 0
            ? Math.min(specialDisc, Math.max(0, Number((((sapUnitPrice - netUnitPrice) / sapUnitPrice) * 100).toFixed(2))))
            : Math.max(0, Math.min(specialDisc, Number((specialDisc + clampedAddDisc).toFixed(2))));
        }
      } else if (hasPromoPrice && targetPromoNeto > 0) {
        netUnitPrice = Number((targetPromoNeto * (1 - addDisc / 100)).toFixed(6));
        totalDisc = sapUnitPrice > 0
          ? Math.min(100, Math.max(0, Number((((sapUnitPrice - netUnitPrice) / sapUnitPrice) * 100).toFixed(2))))
          : Number(p.totalDiscountPct || (sapDisc + promoDisc).toFixed(2));
      } else {
        totalDisc = Number(p.discountPercent ?? p.DiscountPercent ?? p.totalDiscount ?? (sapDisc + promoDisc + addDisc));
        if (addDisc === 0 && totalDisc < sapDisc && sapDisc > 0) {
          totalDisc = sapDisc;
        }
        netUnitPrice = Number((sapUnitPrice * (1 - totalDisc / 100)).toFixed(6));
      }

      const { descListaPct, valorDescLista, descVenta } = computeSapTqcBreakdown({
        item: p,
        sapUnitPrice,
        sapDisc,
        totalDisc,
      });

      const itemClean = {
        id: p.id || p.code || p.productCode,
        itemCode: p.productCode || p.itemCode || p.ItemCode || p.code || p.id,
        productCode: p.productCode || p.itemCode || p.ItemCode || p.code || p.id,
        quantity: Math.min(999999, Math.max(1, Math.floor(Number(p.quantity || p.Quantity || 1)))),
        description: p.productName || p.description || p.name || p.ItemDescription,
        productName: p.productName || p.description || p.name || p.ItemDescription,
        unitPrice: sapUnitPrice,
        price: sapUnitPrice,
        discount: isSpecial ? specialDisc : sapDisc,
        sapDiscount: isSpecial ? specialDisc : sapDisc,
        baseListDiscount: descListaPct,
        promoDiscount: promoDisc,
        lineDiscount: addDisc,
        discountPercent: totalDisc,
        DiscountPercent: totalDisc,
        isSpecialPrice: isSpecial,
        specialDiscount: isSpecial ? specialDisc : 0,
        specialPrice: isSpecial ? p.specialPrice : null,
        specialPriceConIGV: isSpecial ? p.specialPriceConIGV : null,
        campaignName: isSpecial ? "Convenio Cliente" : (p.campaignName || (promoDisc > 0 ? "Oferta del Mes" : undefined)),
        customPriceConIGV: sapCustomPrice,
        discountedUnitPrice: Number(netUnitPrice.toFixed(6)),
        promoPriceConIGV: targetPromoPriceConIGV,
        promoPriceNeto: targetPromoNeto,
        promoPrice: targetPromoNeto,
        U_US_PROMO: targetPromoPriceConIGV,
        totalDiscountPct: totalDisc,
        ...(descListaPct !== null
          ? {
              U_TQC_DESL: descListaPct,
              U_TQC_DELP: valorDescLista,
              U_TQC_DESV: descVenta,
            }
          : {}),
        stock: stk,
        isAgotado: isOutOfStock,
        sigla: p.sigla || p.Sigla || p.U_TQC_SIGLA || "",
        whsCode: p.whsCode || "014",
      };

      if (isOutOfStock) {
        backOrderProductsList.push(itemClean);
      } else {
        inStockProductsForSap.push(itemClean);
      }

      return itemClean;
    });

    const isAlreadyEmittedLocally = Boolean(currentQuoteObj.sapDocNum && Number(currentQuoteObj.sapDocNum) > 1000);
    const quotePayload = {
      ...currentQuoteObj,
      grandTotalUSD: totals?.grandTotalUSD || grandTotal,
      subtotalUSD: totals?.subtotalUSD || subtotal,
      igvUSD: totals?.igvUSD || igv,
      id: activeDocNumber,
      docNumber: activeDocNumber,
      sapDocNum: isAlreadyEmittedLocally ? Number(currentQuoteObj.sapDocNum) : null,
      DocNum: isAlreadyEmittedLocally ? Number(currentQuoteObj.sapDocNum) : null,
      forceEmit: !isAlreadyEmittedLocally,
      currency: currency || "USD",
      DocCurrency: currency || "USD",
      DocRate: exchangeRate,
      clientDocument: client?.CardCode || client?.clientDocument || client?.FederalTaxID || clientDocDigits,
      clientName: client?.CardName || client?.name || client?.clientName,
      sellerName: resolvedSellerName || activeSeller || sellerUsername,
      createdByUsername: currentQuoteObj.createdByUsername || origSeller || sellerUsername,
      SlpCode: effectiveSlpCode,
      slpCode: effectiveSlpCode,
      salesPersonCode: effectiveSlpCode,
      salesEmployeeCode: effectiveSlpCode,
      documentsOwner: currentQuoteObj.documentsOwner || currentQuoteObj.DocumentsOwner || currentQuoteObj.OwnerCode,
      DocumentsOwner: currentQuoteObj.documentsOwner || currentQuoteObj.DocumentsOwner || currentQuoteObj.OwnerCode,
      deliveryForm: selectedDeliveryForm,
      deliveryPoint: selectedPoint,
      shipToCode: selectedPoint?.AddressName || undefined,
      transport: selectedTransport,
      deliveryDate: deliveryDate,
      paymentType: selectedPaymentType,
      paymentMethod: paymentMethod || null,
      bankAccount: bankAccount || null,
      sunatOpType: sunatOpType || "0101",
      U_VS_TIPOPER: "01",
      U_VS_TIPO_FACT: sunatOpType || "0101",
      U_VS_NATNUM: "T",
      natNum: "T",
      payToCode: "FISCAL",
      PayToCode: "FISCAL",
      U_VS_AFEDET: "N",
      U_VS_BANCO: bankAccount || null,
      saleCondition: saleCondition || (extractPaymentLabel(selectedPaymentType).toLowerCase().includes("credit") ? "CREDITO" : "CONTADO"),
      documentType: effectiveDocType,
      creditTerm: creditTerm || (saleCondition === "CREDITO" ? "30 días" : null),
      isLetra: isLetra !== undefined ? isLetra : false,
      opNum: opNum || null,
      refNumber: null,
      NumAtCard: null,
      contactPerson: contactPerson || null,
      whsCode: "014",
      products: inStockProductsForSap, // 🎯 A SAP SOLO LLEGAN LOS ARTÍCULOS QUE TIENEN STOCK
      backOrderProducts: backOrderProductsList,
      backOrderItems: backOrderProductsList,
      hasBackOrder: backOrderProductsList.length > 0,
      comment: (() => {
        const raw = [
          comment,
          currentQuoteObj.comment,
          currentQuoteObj.observations
        ].filter(Boolean)
         .map(s => String(s).trim())
         .filter(s => s && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined")
         .filter((v, i, a) => a.indexOf(v) === i)
         .join(" | ");
        return raw || "";
      })(),
    };

    let officialSapDocNum = null;
    let officialSapDocEntry = null;
    let sapErrorMessage = null;

    if (inStockProductsForSap.length === 0) {
      console.log("ℹ️ Cotización contiene únicamente artículos sin stock. Se registra en Demanda Back Order sin emitir a SAP.");
      setValidationStepText("Registrando Demanda Back Order para Importaciones (artículos sin stock)...");
      await new Promise(r => setTimeout(r, 600));
    } else {
      setValidationStepText(`Emitiendo orden oficial directamente a SAP Service Layer (${inStockProductsForSap.length} artículo(s) con stock)...`);
      try {
        const res = await axiosInstance.post("/quoteModule/quotes/sap/order", quotePayload, { timeout: 95000 });
        const sapData = res.data?.data || res.data || {};
        officialSapDocNum = sapData.DocNum || sapData.docNum;
        officialSapDocEntry = sapData.DocEntry || sapData.docEntry;
      } catch (err) {
        console.error("⚠️ Error emitiendo directamente a SAP B1:", err);

        // 🛡️ Auto-recuperación: Si el backend devolvió el doc en el body de error o si ya existe en BD
        const fallbackSapData = err.response?.data?.data;
        if (fallbackSapData && (fallbackSapData.DocNum || fallbackSapData.docNum)) {
          officialSapDocNum = Number(fallbackSapData.DocNum || fallbackSapData.docNum);
          officialSapDocEntry = Number(fallbackSapData.DocEntry || fallbackSapData.docEntry || officialSapDocNum);
          console.log(`✅ [Frontend Auto-Recuperación] Orden oficial #${officialSapDocNum} recuperada de respuesta backend.`);
        } else {
          try {
            setValidationStepText("Verificando si la orden se registró en SAP tras respuesta demorada...");
            const rawId = currentQuoteObj.id || activeDocNumber;
            const checkRes = await axiosInstance.get(`/quoteModule/quotes/${rawId}`).catch(() => null);
            const foundQuote = checkRes?.data?.data || checkRes?.data;
            if (foundQuote && foundQuote.sapDocNum && Number(foundQuote.sapDocNum) > 1000) {
              console.log(`✅ [Frontend Auto-Recuperación] ¡Orden oficial #${foundQuote.sapDocNum} encontrada en base de datos!`);
              officialSapDocNum = Number(foundQuote.sapDocNum);
              officialSapDocEntry = Number(foundQuote.sapDocEntry || foundQuote.sapDocNum);
            }
          } catch (_) {}
        }

        if (!officialSapDocNum) {
          sapErrorMessage = err.response?.data?.error?.message?.value
            || err.response?.data?.error?.message
            || err.response?.data?.message
            || (typeof err.response?.data === "string" ? err.response?.data : null)
            || err.message
            || "Error conectando con SAP Service Layer";

          setIsSendingToValidation(false);
          isExplicitlySubmittingRef.current = false;
          const isRateError = typeof sapErrorMessage === "string" && (
            sapErrorMessage.toLowerCase().includes("tipo de cambio") || 
            sapErrorMessage.toLowerCase().includes("exchange rate")
          );
          toast({
            title: isRateError ? "⚠️ Tipo de Cambio Requerido en SAP" : "❌ Error al Sincronizar con SAP",
            description: typeof sapErrorMessage === "string" ? sapErrorMessage : JSON.stringify(sapErrorMessage),
            status: isRateError ? "warning" : "error",
            duration: 9000,
            isClosable: true,
            position: "top-right",
          });
          return;
        }
      }
    }

    const currentProfile = resolveUserProfileTitle(role, endpoints, adminName);
    const isEmittedToSap = Boolean(officialSapDocNum);
    const finalOfficialDocNum = officialSapDocNum ? `COT-${String(officialSapDocNum).padStart(6, '0')}` : activeDocNumber;
    const finalStatus = isEmittedToSap ? "EMITIDO" : "APROBADO";

    const updatedApprovedDoc = {
      ...currentQuoteObj,
      ...quotePayload,
      id: finalOfficialDocNum,
      docNumber: finalOfficialDocNum,
      products: sanitizedProducts,
      inStockProducts: inStockProductsForSap,
      backOrderProducts: backOrderProductsList,
      backOrderItems: backOrderProductsList,
      hasBackOrder: backOrderProductsList.length > 0,
      status: finalStatus,
      state: finalStatus,
      approvalStatus: finalStatus,
      sapDocNum: officialSapDocNum ? Number(officialSapDocNum) : null,
      DocNum: officialSapDocNum || finalOfficialDocNum,
      DocEntry: officialSapDocEntry || null,
      isSapDirect: isEmittedToSap,
      approvedAt: nowIso,
      approvedBy: adminName,
      approvedByRole: currentProfile,
      evaluatedBy: adminName,
      evaluatedByRole: currentProfile,
      updatedAt: nowIso,
      historyLog: [
        {
          status: finalStatus,
          timestamp: nowIso,
          user: adminName,
          note: officialSapDocNum
            ? `✅ Aprobada y emitida oficialmente a SAP (Orden de Venta #${officialSapDocNum}) por ${adminName}`
            : `✅ Cotización aprobada por ${adminName}`
        },
        ...(currentQuoteObj.historyLog || [])
      ]
    };

    // 1. Purgar borrador pendiente de localStorage para que no quede como 'COT-PENDIENTE' en cola
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const nextQuotes = saved.filter(q => {
      const qDoc = String(q.docNumber || "");
      const qId = String(q.id || "");
      return qDoc !== activeDocNumber && qId !== activeDocNumber && qDoc !== finalOfficialDocNum && qId !== finalOfficialDocNum;
    });
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(nextQuotes));
    window.dispatchEvent(new Event("localQuotesUpdated"));

    // 2. Notificación en tiempo real al Asesor de Ventas
    const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      targetRole: "VENDEDOR",
      targetUsername: sellerUsername,
      fromUsername: adminName,
      quoteId: finalOfficialDocNum,
      quoteObj: updatedApprovedDoc,
      title: officialSapDocNum
        ? `🎉 ¡Cotización ${finalOfficialDocNum} Aprobada y Emitida a SAP!`
        : `✅ Cotización ${activeDocNumber} Aprobada por Administración`,
      description: officialSapDocNum
        ? `Tu solicitud fue aprobada directamente por ${adminName} y se generó la Orden de Venta Oficial SAP #${officialSapDocNum}.`
        : `Tu solicitud fue aprobada por ${adminName}.`,
      status: finalStatus,
      createdAt: nowIso,
      timestamp: nowIso,
      read: false
    };
    const cleanedNotifs = existingNotifs.filter(n => String(n.quoteId || n.id) !== String(activeDocNumber) && String(n.quoteId || n.id) !== String(finalOfficialDocNum));
    cleanedNotifs.unshift(newNotif);
    localStorage.setItem("grupoLeon_notifications", JSON.stringify(cleanedNotifs));
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    setValidationStepText("Sincronizando estado oficial con el servidor...");
    try {
      await updateQuote({
        ...updatedApprovedDoc,
        originalDocNumber: activeDocNumber !== finalOfficialDocNum ? activeDocNumber : undefined,
      });
      queryClient.setQueriesData({ queryKey: ["quotes"] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map(q => {
          const isMatch = String(q.docNumber || q.id) === String(activeDocNumber) || String(q.docNumber || q.id) === String(finalOfficialDocNum);
          return isMatch ? { ...q, ...updatedApprovedDoc } : q;
        });
      });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      setValidationStepText("Notificando al Asesor de Ventas en tiempo real...");
      await new Promise((res) => setTimeout(res, 500));

      setValidationStepText("✅ Aprobación y Emisión SAP completadas.");
      await new Promise((res) => setTimeout(res, 350));

      if (officialSapDocNum) {
        setSapSyncResult({
          quoteId: finalOfficialDocNum,
          docNum: officialSapDocNum,
          docEntry: officialSapDocEntry,
          cardCode: client?.CardCode || clientDocDigits,
          cardName: client?.CardName || client?.name,
          salesPersonCode: effectiveSlpCode,
          docTotalUSD: Number(totals.grandTotalUSD || 0),
          companyDB: "SBO_AJUSTES_2025"
        });

        toast({
          title: "⚡ Orden Aprobada y Emitida en SAP B1",
          description: `Se registró directamente la Orden de Venta Oficial #${officialSapDocNum} en SAP Business One.`,
          status: "success",
          duration: 6000,
          isClosable: true,
          position: "top-right",
        });

        releaseQuoteLock(activeDocNumber, userId);
        if (finalOfficialDocNum !== activeDocNumber) releaseQuoteLock(finalOfficialDocNum, userId);
        setIsSendingToValidation(false);
        setIsSapSuccessModalOpen(true);
      } else {
        toast({
          title: "✅ Demanda Back Order Registrada",
          description: `La cotización ${finalOfficialDocNum} fue procesada para compras e importaciones por falta de stock.`,
          status: "info",
          duration: 6000,
          isClosable: true,
          position: "top-right",
        });

        releaseQuoteLock(activeDocNumber, userId);
        if (finalOfficialDocNum !== activeDocNumber) releaseQuoteLock(finalOfficialDocNum, userId);
        clear();
        setIsSendingToValidation(false);
        navigate("/historyquotes");
      }
    } catch (e) {
      console.error("Error sincronizando aprobación con servidor:", e);
      setIsSendingToValidation(false);
      clear();
      navigate("/historyquotes");
    }
  };

  const handleCloseSapSuccess = () => {
    setIsSapSuccessModalOpen(false);
    clear();
    navigate("/historyquotes");
  };

  const handleObserveFromForm = async (quoteOrId, reason) => {
    const reasonText = typeof reason === "string" && reason.trim() ? reason.trim() : (typeof quoteOrId === "string" && quoteOrId.trim() ? quoteOrId.trim() : "Cotización observada para corrección");
    const activeDocNumber = quoteId || docNumber;
    const nowIso = new Date().toISOString();
    const adminName = username || "Administrador";

    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const existingDoc = saved.find((q) => (q.id || q.docNumber) === activeDocNumber) || currentQuoteObj;
    const updatedObservedDoc = {
      ...existingDoc,
      id: activeDocNumber,
      docNumber: activeDocNumber,
      status: "OBSERVADO",
      state: "OBSERVADO",
      approvalStatus: "OBSERVADO",
      observedAt: nowIso,
      observationReason: reasonText,
      observations: reasonText,
      rejectionReason: reasonText,
      updatedAt: nowIso,
      historyLog: [
        {
          status: "OBSERVADO",
          timestamp: nowIso,
          user: adminName,
          note: `💬 Observada por ${adminName}: ${reasonText}`
        },
        ...(existingDoc.historyLog || [])
      ]
    };

    const nextQuotes = saved.map(q => ((q.id || q.docNumber) === activeDocNumber ? updatedObservedDoc : q));
    if (!saved.some(q => (q.id || q.docNumber) === activeDocNumber)) {
      nextQuotes.unshift(updatedObservedDoc);
    }
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(nextQuotes));
    window.dispatchEvent(new Event("localQuotesUpdated"));

    // Notificación en tiempo real al Asesor de Ventas
    const sellerUsername = existingDoc.sellerName || existingDoc.createdByUsername || "Vendedor";
    const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const newNotif = {
      id: `NOTIF-OBS-${Date.now()}`,
      targetRole: "VENDEDOR",
      targetUsername: sellerUsername,
      fromUsername: adminName,
      quoteId: activeDocNumber,
      quoteObj: updatedObservedDoc,
      title: `💬 Cotización ${activeDocNumber} Observada`,
      description: `El administrador ${adminName} solicita corrección: "${reasonText}"`,
      status: "OBSERVADO",
      createdAt: nowIso,
      timestamp: nowIso,
      read: false
    };
    const cleanedNotifs = existingNotifs.filter(n => String(n.quoteId || n.id) !== String(activeDocNumber));
    cleanedNotifs.unshift(newNotif);
    localStorage.setItem("grupoLeon_notifications", JSON.stringify(cleanedNotifs));
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    try {
      await updateQuote(updatedObservedDoc);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {}

    isExplicitlySubmittingRef.current = true;
    toast({
      title: "💬 Cotización Observada",
      description: `La cotización ${activeDocNumber} fue devuelta al vendedor para corrección.`,
      status: "info",
      duration: 4000,
      isClosable: true,
    });
    clear();
    navigate("/historyquotes");
  };

  const handleRejectFromForm = async (qId, reason) => {
    const activeDocNumber = quoteId || docNumber;
    const nowIso = new Date().toISOString();
    const adminName = username || "Administrador";

    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const existingDoc = saved.find((q) => (q.id || q.docNumber) === activeDocNumber);
    const updatedRejectedDoc = {
      ...(existingDoc || currentQuoteObj),
      id: activeDocNumber,
      docNumber: activeDocNumber,
      status: "RECHAZADO",
      state: "RECHAZADO",
      approvalStatus: "RECHAZADO",
      rejectedAt: nowIso,
      rejectionReason: reason,
      updatedAt: nowIso,
      historyLog: [
        {
          status: "RECHAZADO",
          timestamp: nowIso,
          user: adminName,
          note: `❌ Rechazada por ${adminName}: ${reason}`
        },
        ...((existingDoc || currentQuoteObj).historyLog || [])
      ]
    };

    const nextQuotes = saved.map(q => ((q.id || q.docNumber) === activeDocNumber ? updatedRejectedDoc : q));
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(nextQuotes));
    window.dispatchEvent(new Event("localQuotesUpdated"));

    try {
      await updateQuote(updatedRejectedDoc);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {}

    isExplicitlySubmittingRef.current = true;
    toast({
      title: "❌ Cotización Rechazada",
      description: `La cotización ${activeDocNumber} fue rechazada.`,
      status: "error",
      duration: 4000,
      isClosable: true,
    });
    clear();
    navigate("/historyquotes");
  };

  const validateLogisticsAndPayments = () => {
    if (!selectedDeliveryForm) {
      toast({
        title: "⚠️ Forma de Entrega requerida",
        description: "Debe seleccionar una Forma de Entrega en la pestaña 'Logística y Despacho' (Sección 1) antes de enviar.",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
      setActiveTabIndex(1);
      return false;
    }
    const isPickup = isPickupInStoreForm(selectedDeliveryForm);
    if (!isPickup && !selectedPoint && !selectedTransport) {
      toast({
        title: "⚠️ Destino o Agencia requerida",
        description: "Para envíos fuera de tienda, debe indicar la agencia de transporte o el punto de llegada (Sección 1).",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
      setActiveTabIndex(1);
      return false;
    }

    // 2.1. Validar Fecha estimada de entrega (Obligatorio)
    const hasDeliveryDate = Boolean(
      deliveryDate &&
      (deliveryDate instanceof Date
        ? !isNaN(deliveryDate.getTime())
        : String(deliveryDate).trim().length >= 8)
    );

    if (!hasDeliveryDate) {
      toast({
        title: "⚠️ Fecha estimada de entrega requerida",
        description: "Debe indicar la Fecha estimada de entrega en la pestaña 'Logística y Despacho' antes de enviar.",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
      setActiveTabIndex(1);
      return false;
    }
    // 3. Validar Condición de Pago / Comercial (Tabla OCTG)
    const hasPaymentType = Boolean(
      selectedPaymentType &&
      (typeof selectedPaymentType === "object"
        ? (selectedPaymentType.value || selectedPaymentType.GroupNum !== undefined || selectedPaymentType.PymntGroup || selectedPaymentType.PaymentTermsGroupName || selectedPaymentType.label)
        : String(selectedPaymentType).trim().length > 0)
    );
    if (!hasPaymentType) {
      toast({
        title: "⚠️ Condición de Pago requerida",
        description: "Debe seleccionar la Condición de Pago (Tabla OCTG) en la pestaña 'Logística, Pagos y Anexos' antes de enviar.",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
      setActiveTabIndex(1);
      return false;
    }

    // 4. Auto-deducir Condición de Venta (CONTADO o CRÉDITO) según la condición de pago SAP
    if (!saleCondition || !String(saleCondition).trim()) {
      const pLabel = extractPaymentLabel(selectedPaymentType).toLowerCase();
      const isCredit = pLabel.includes("credit") || pLabel.includes("crédito") || pLabel.includes("dias") || pLabel.includes("días") || pLabel.includes("letra");
      const derivedCondition = isCredit ? "CREDITO" : "CONTADO";
      if (setSaleCondition) setSaleCondition(derivedCondition);
    }

    // 5. Tipo de Comprobante (auto-deducido internamente: DNI 8 dígitos -> BOLETA, RUC/Otro -> FACTURA)
    const clientDocDigits = String(client?.FederalTaxID || client?.clientDocument || client?.documentNumber || client?.LicTradNum || client?.CardCode || "").replace(/\D/g, "");
    const autoType = clientDocDigits.length === 8 ? "BOLETA" : "FACTURA";
    if (setDocumentType && documentType !== autoType) {
      setDocumentType(autoType);
    }

    return true;
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
    // Validar obligatoriedad de Logística, Pagos y Anexos antes de enviar
    if (!validateLogisticsAndPayments()) {
      return;
    }
    // Abrir modal de confirmación previa (Checklist de Seguridad)
    setShowConfirmModal(true);
  };

  const handleConfirmedSend = async () => {
    isExplicitlySubmittingRef.current = true;
    setShowConfirmModal(false);

    const activeDocNumber = quoteId || docNumber || "COT-000000";
    setIsSendingToValidation(true);
    setValidationLoadingTitle(
      isObservedOrInCorrection
        ? "Reenviando Cotización a Validación..."
        : "Guardando y Enviando a Validación..."
    );
    setValidationLoadingSub(
      `Registrando ${activeDocNumber} y notificando en tiempo real a Facturación y Administración`
    );
    setValidationStepText("Validando datos comerciales, finanzas y logística...");

    try {
      const result = handleSaveAction("ENVIADO");
      let assignedDocNumber = activeDocNumber;
      if (result && result.savePromise) {
        setValidationStepText("Persistiendo cotización en la base de datos MySQL...");
        const savedRes = await result.savePromise;
        if (savedRes && savedRes.docNumber) {
          assignedDocNumber = savedRes.docNumber;
        }
      }

      setValidationStepText("Notificando en tiempo real vía WebSocket a Facturación...");
      await new Promise((res) => setTimeout(res, 800));

      setValidationStepText("✅ Cotización registrada con éxito. Redirigiendo...");
      await new Promise((res) => setTimeout(res, 600));

      if (clientDebtInfo?.hasTotalDebt) {
        toast({
          title: "⚠️ Cotización Enviada con Observación Financiera",
          description: `Documento ${assignedDocNumber || "generado"} registrado y enviado a validación. Se notificó a Facturación/Administración que el cliente registra ${clientDebtInfo.debtSummary.toLowerCase()}.`,
          status: "warning",
          duration: 6000,
          isClosable: true,
        });
      } else {
        toast({
          title: "✅ Cotización Enviada a Validación",
          description: `Documento ${assignedDocNumber || "generado"} registrado y enviado en tiempo real a la Asesora de Facturación.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }

      clear();
      setIsSendingToValidation(false);
      navigate("/historyquotes");
    } catch (err) {
      console.error("Error al enviar a validación:", err);
      setIsSendingToValidation(false);
      toast({
        title: "❌ No se pudo enviar a validación",
        description: err?.message || "Ocurrió un error al persistir el pedido en el servidor. Por favor verifique su conexión e intente nuevamente.",
        status: "error",
        duration: 6000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const handleNewQuote = async () => {
    isExplicitlyClearedRef.current = true;
    clear();
    if (typeof setWhsCode === "function") setWhsCode("014");
    setDocType("OFERTA_VENTA");
    setDocNumber("");
    setLastAutoSavedTime(null);
    toast({
      title: "Formulario Reiniciado",
      description: "Listo para elaborar una nueva Cotización (COT-NUEVA).",
      status: "info",
      duration: 2500,
    });
    setTimeout(() => {
      isExplicitlyClearedRef.current = false;
    }, 600);
  };

  // ── FUNCIÓN REUTILIZABLE: 4 PARÁMETROS DEL DOCUMENTO (Contacto, Moneda, Válido Hasta, Fecha Contabilización) ──
  const renderDocParamsGrid = (isMobile = false) => (
    <Grid templateColumns="repeat(2, 1fr)" gap={{ base: 2, sm: 2.5 }}>
      {/* 1. Persona de Contacto */}
      <FormControl>
        <FormLabel fontSize={{ base: "11px", md: "xs" }} fontWeight="700" color="gray.700" mb={{ base: 0.5, md: 1 }}>
          Persona de Contacto {isSellerFieldsLocked && "🔒"}
        </FormLabel>
        {contactList.length > 0 ? (
          <ChakraSelect
            size={{ base: "xs", md: "sm" }}
            borderRadius="md"
            value={contactPerson || ""}
            onChange={(e) => setContactPerson(e.target.value)}
            bg={isSellerFieldsLocked ? "gray.100" : "white"}
            fontWeight="600"
            isDisabled={isSellerFieldsLocked}
            cursor={isSellerFieldsLocked ? "not-allowed" : "default"}
          >
            <option value="">Seleccionar contacto...</option>
            {contactList.map((c, idx) => (
              <option key={c.code || idx} value={c.name}>
                {c.name} {c.position ? `(${c.position})` : ""}
              </option>
            ))}
          </ChakraSelect>
        ) : (
          <Input
            size={{ base: "xs", md: "sm" }}
            borderRadius="md"
            placeholder="Ej. Juan Pérez"
            value={contactPerson || ""}
            onChange={(e) => setContactPerson(e.target.value)}
            bg={isSellerFieldsLocked ? "gray.100" : "white"}
            isDisabled={isSellerFieldsLocked}
            cursor={isSellerFieldsLocked ? "not-allowed" : "text"}
          />
        )}
      </FormControl>

      {/* 2. Moneda */}
      <FormControl>
        <HStack justify="space-between" mb={{ base: 0.5, md: 1 }}>
          <FormLabel fontSize={{ base: "11px", md: "xs" }} fontWeight="700" color="gray.700" mb={0}>
            Moneda {!canChangeCurrency && "🔒"}
          </FormLabel>
          {!canChangeCurrency && (
            <Badge colorScheme="gray" fontSize={{ base: "8px", md: "9px" }} px={1} borderRadius="md" title="Requiere autorización para cotizar en Soles">
              BLOQUEADO
            </Badge>
          )}
        </HStack>
        <ChakraSelect
          size={{ base: "xs", md: "sm" }}
          borderRadius="md"
          value={currency || "USD"}
          onChange={(e) => setCurrency(e.target.value)}
          bg={(!canChangeCurrency || isSellerFieldsLocked) ? "gray.100" : "white"}
          fontWeight="700"
          color={currency === "SOL" ? "#047857" : "gray.800"}
          isDisabled={!canChangeCurrency || isSellerFieldsLocked}
          cursor={(!canChangeCurrency || isSellerFieldsLocked) ? "not-allowed" : "pointer"}
        >
          <option value="USD">USD ($) Dólares</option>
          <option value="SOL">SOL (S/) Soles</option>
        </ChakraSelect>
      </FormControl>

      {/* 3. Válido Hasta */}
      <FormControl>
        <FormLabel fontSize={{ base: "11px", md: "xs" }} fontWeight="700" color="gray.700" mb={{ base: 0.5, md: 1 }}>
          Válido Hasta {isSellerFieldsLocked && "🔒"}
        </FormLabel>
        <Input
          type="date"
          size={{ base: "xs", md: "sm" }}
          borderRadius="md"
          min={todayIso()}
          value={docDueDate}
          onChange={(e) => {
            const val = e.target.value;
            const minVal = todayIso();
            if (val && val < minVal) {
              setDocDueDate(minVal);
            } else {
              setDocDueDate(val);
            }
          }}
          bg={isSellerFieldsLocked ? "gray.100" : "white"}
          isDisabled={isSellerFieldsLocked}
          cursor={isSellerFieldsLocked ? "not-allowed" : "default"}
        />
      </FormControl>

      {/* 4. Fecha Contabilización */}
      <FormControl>
        <FormLabel fontSize={{ base: "11px", md: "xs" }} fontWeight="700" color="gray.700" mb={{ base: 0.5, md: 1 }}>
          Fecha Contabilización 🔒
        </FormLabel>
        <Input
          type="date"
          size={{ base: "xs", md: "sm" }}
          borderRadius="md"
          value={docDate}
          isReadOnly
          isDisabled
          bg="gray.100"
          cursor="not-allowed"
          title="La fecha de contabilización se asigna automáticamente"
        />
      </FormControl>
    </Grid>
  );

  return (
    <VStack align="stretch" spacing={5} pb={10} maxW="100%" overflowX="hidden">
      {/* ── BANNER MODO PRUEBAS (SANDBOX) COMPACTO (Solo si está configurado en entorno) ── */}
      {import.meta.env.VITE_SHOW_SANDBOX_BANNER === "true" && (
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
                Consultas en tiempo real de SAP. Guardado y conversión operan en base de datos web y memoria local.
              </Text>
            </Flex>
            <Text fontSize="10px" color="blue.700" fontWeight="500" display={{ base: "block", sm: "none" }} mt={0.5}>
              Consultas en tiempo real. Guardado local en memoria.
            </Text>
          </Box>
        </Alert>
      )}

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

      {/* ── LÍNEA DE TIEMPO / SEGUIMIENTO EN TIEMPO REAL (Solo al enviar / revisar cotización) ── */}
      {isQuoteAlreadySentOrInReview && (
        <OrderTimelineBar
          status={approvalStatus || (isSubmittedQuote ? "ENVIADO" : "GENERADO")}
          historyLog={historyLog}
          createdIso={docDate}
        />
      )}

      {/* ── CABECERA PRINCIPAL Y FORMULARIO SUPERIOR ── */}
      <Box bg="white" p={{ base: 2, sm: 2.5, md: 4 }} borderRadius={{ base: "xl", md: "2xl" }} border="1px solid" borderColor="gray.200" boxShadow="sm">
        {/* Cabecera Compacta en 1 sola fila responsiva */}
        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={{ base: 1.5, md: 2 }}
          mb={{ base: 2, md: 3 }}
          pb={{ base: 1.5, md: 2 }}
          borderBottom="1px solid"
          borderColor="gray.100"
        >
          {/* Título de la Orden */}
          <HStack spacing={{ base: 1.5, md: 2 }} align="center" minW={0}>
            <Flex
              w={{ base: "26px", md: "32px" }}
              h={{ base: "26px", md: "32px" }}
              minW={{ base: "26px", md: "32px" }}
              borderRadius="md"
              bg="emerald.50"
              align="center"
              justify="center"
              color="emerald.700"
            >
              <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </Flex>
            <Box minW={0}>
              <Heading
                fontSize={{ base: "11px", sm: "12.5px", md: "sm" }}
                color="#0f5132"
                fontWeight="800"
                letterSpacing="tight"
                lineHeight="1.2"
                isTruncated
              >
                ORDEN DE VENTA / PEDIDO COMERCIAL
              </Heading>
              <Text fontSize="10px" color="gray.500" display={{ base: "none", md: "block" }}>
                Gestión comercial de requerimiento de pedido y logística
              </Text>
            </Box>
          </HStack>

          {/* Badges de Estado en la MISMA fila */}
          <HStack spacing={1.5} align="center" flexShrink={0} wrap="wrap">
            <Badge
              bg="#f1f5f9"
              color="#1e293b"
              border="1px solid #cbd5e1"
              px={{ base: 1.5, md: 2 }}
              py={{ base: 0.2, md: 0.5 }}
              borderRadius="md"
              fontSize={{ base: "8.5px", md: "xs" }}
              textTransform="uppercase"
              fontWeight="bold"
            >
              Nº {docNumber && String(docNumber).startsWith("COT-0") ? docNumber : (docNumber || "ORDEN-PENDIENTE")}
            </Badge>
            {isApproved && (
              <Badge bg="#166534" color="white" px={{ base: 1.5, md: 2 }} py={{ base: 0.2, md: 0.5 }} borderRadius="md" fontSize={{ base: "8.5px", md: "xs" }} fontWeight="900" boxShadow="xs">
                🏛️ Oficial
              </Badge>
            )}
            <Badge
              bg={
                approvalStatus === "APROBADO" || approvalStatus === "APROBADO_COMERCIAL"
                  ? "#dcfce7"
                  : approvalStatus === "PENDIENTE_FACTURACION"
                  ? "#eff6ff"
                  : approvalStatus === "RECHAZADO"
                  ? "#fef2f2"
                  : "#f8fafc"
              }
              color={
                approvalStatus === "APROBADO" || approvalStatus === "APROBADO_COMERCIAL"
                  ? "#166534"
                  : approvalStatus === "PENDIENTE_FACTURACION"
                  ? "#1d4ed8"
                  : approvalStatus === "RECHAZADO"
                  ? "#b91c1c"
                  : "#475569"
              }
              border="1px solid"
              borderColor={
                approvalStatus === "APROBADO" || approvalStatus === "APROBADO_COMERCIAL"
                  ? "#86efac"
                  : approvalStatus === "PENDIENTE_FACTURACION"
                  ? "#bfdbfe"
                  : approvalStatus === "RECHAZADO"
                  ? "#fca5a5"
                  : "#cbd5e1"
              }
              px={{ base: 1.5, md: 2 }}
              py={{ base: 0.2, md: 0.5 }}
              borderRadius="md"
              fontSize={{ base: "8.5px", md: "xs" }}
              fontWeight="900"
            >
              <Box as="span">
                {approvalStatus ? (approvalStatus === "APROBADO_COMERCIAL" ? "APROBADO" : approvalStatus) : "BORRADOR (ABIERTO)"}
              </Box>
            </Badge>
            {Boolean(products && products.length > 0 && !isAdminReviewing && !isReadOnly) && (
              <Badge
                bg={isAutoSaving ? "#fef3c7" : "#f0fdf4"}
                color={isAutoSaving ? "#92400e" : "#166534"}
                border="1px solid"
                borderColor={isAutoSaving ? "#fde68a" : "#bbf7d0"}
                px={{ base: 1.5, md: 2 }}
                py={{ base: 0.2, md: 0.5 }}
                borderRadius="md"
                fontSize={{ base: "8.5px", md: "xs" }}
                fontWeight="800"
                display="inline-flex"
                alignItems="center"
                gap={1}
              >
                {isAutoSaving ? (
                  <>
                    <Spinner size="xs" color="amber.600" speed="0.6s" />
                    <Text as="span">Guardando...</Text>
                  </>
                ) : lastAutoSavedTime ? (
                  <Text as="span">
                    ☁️ {lastAutoSavedTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                ) : (
                  <Text as="span">💾 Auto</Text>
                )}
              </Badge>
            )}
            {isAdmin && isSubmittedQuote && (
              <Button
                size="xs"
                h={{ base: "20px", md: "24px" }}
                fontSize={{ base: "9px", md: "xs" }}
                colorScheme={adminForceEditMode ? "orange" : "teal"}
                variant={adminForceEditMode ? "solid" : "outline"}
                onClick={() => setAdminForceEditMode(!adminForceEditMode)}
                leftIcon={adminForceEditMode ? <Lock className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                fontWeight="800"
                borderRadius="md"
                px={2}
              >
                {adminForceEditMode ? "🔒 Bloquear" : "✏️ Modificar (Admin)"}
              </Button>
            )}
          </HStack>
        </Flex>

        {/* ── GRID PRINCIPAL: CLIENTE + PARÁMETROS DEL DOCUMENTO + LÍNEA/COBRANZA SAP ── */}
        <Grid templateColumns="repeat(2, 1fr)" gap={{ base: 2, lg: 4 }} alignItems="stretch">
              {/* COLUMNA IZQUIERDA (span 1 en PC, span 2 en Móvil):
                  - Cliente Seleccionado / Buscador
                  - En PC: Solo si ya hay cliente seleccionado, los parámetros van debajo para dejar espacio a Línea y Cobranza a la derecha */}
              <VStack
                align="stretch"
                spacing={2}
                order={1}
                gridColumn={{ base: "span 2", lg: "span 1" }}
                justify={client ? "space-between" : "flex-start"}
                h="full"
              >
                {isSellerFieldsLocked ? (
                  <Box p={3.5} bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" borderLeft="4px solid #166534" boxShadow="xs">
                    <Flex justify="space-between" align="center" wrap="wrap" gap={1} mb={1.5}>
                      <Text fontSize="10px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider">
                        🤝 Cliente (Bloqueado)
                      </Text>
                      <Badge colorScheme="green" bg="#dcfce7" color="#166534" fontSize="10px">OK</Badge>
                    </Flex>
                    <Text fontSize="xs" color="gray.800" fontWeight="700" wordBreak="break-word">
                      {client?.CardName || client?.name || "Cliente General"}
                    </Text>
                    <Text fontSize="0.75rem" color="gray.500" fontWeight="600" mt={0.5}>
                      Documento / Código: {client?.CardCode || client?.id || "N/A"}
                    </Text>
                    {client?.Address && (
                      <Text fontSize="0.75rem" color="gray.500" fontWeight="500" wordBreak="break-word">
                        Dirección: {client.Address}
                      </Text>
                    )}
                  </Box>
                ) : (
                  <ClientAutocomplete
                    client={client}
                    setClient={setClient}
                    debtSummary={clientDebtInfo?.debtSummary}
                    onClear={() => {
                      if (typeof setClient === "function") setClient(null);
                      if (typeof setContactPerson === "function") setContactPerson("");
                      if (typeof setSelectedPoint === "function") setSelectedPoint(null);
                      if (typeof setDocumentType === "function") setDocumentType("");
                    }}
                  />
                )}

                {/* 🖥️ EN PC (>= lg): Solo cuando el cliente tiene cartillas financieras activas (línea o deuda), los parámetros van aquí abajo para liberar la derecha */}
                {hasClientFinancialCards && (
                  <Box display={{ base: "none", lg: "block" }}>
                    {renderDocParamsGrid()}
                  </Box>
                )}
              </VStack>

              {/* COLUMNA DERECHA (span 1 en PC, span 2 en Móvil):
                  - En PC (lg):
                    * Si SÍ hay cliente: LÍNEA SAP arriba + COBRANZA SAP abajo
                    * Si NO hay cliente: Los parámetros del documento se sitúan aquí a la derecha para no dejar el vacío
                  - En Móvil (base): Parámetros del documento */}
              <VStack
                align="stretch"
                spacing={2.5}
                order={{ base: 3, lg: 2 }}
                gridColumn={{ base: "span 2", lg: "span 1" }}
                justify={client ? "space-between" : "flex-start"}
                h="full"
              >
                {/* 🖥️ EN PC (>= lg): */}
                <Box display={{ base: "none", lg: "flex" }} flexDirection="column" gap={2.5} h="full" justify="space-between">
                  {hasClientFinancialCards ? (
                    <>
                      {/* 1. LÍNEA SAP */}
                      {hasCreditCard && clientCreditInfo && (
                        hasDebtCard ? (
                          /* ── CASO A: CUANDO SALEN AMBAS CARTILLAS (Línea + Cobranza con Deuda) ── */
                          <Box
                            flex="1"
                            p={3}
                            bg={
                              clientCreditInfo.isExceeded && clientCreditInfo.isCreditSale
                                ? "#fff5f5"
                                : clientCreditInfo.usagePercent > 80 && clientCreditInfo.isCreditSale
                                ? "#fffbeb"
                                : "white"
                            }
                            borderRadius="xl"
                            border="1.5px solid"
                            borderColor={
                              clientCreditInfo.isExceeded && clientCreditInfo.isCreditSale
                                ? "#fca5a5"
                                : clientCreditInfo.usagePercent > 80 && clientCreditInfo.isCreditSale
                                ? "#fef08a"
                                : "gray.200"
                            }
                            boxShadow="xs"
                            display="flex"
                            flexDirection="column"
                            justifyContent="space-between"
                            minH="95px"
                          >
                            <Flex justify="space-between" align="center" mb={1}>
                              <HStack spacing={1.5} minW={0}>
                                <CreditCard className="w-4 h-4 text-blue-600" />
                                <Text fontSize="10px" fontWeight="900" color="gray.800" textTransform="uppercase" isTruncated>
                                  LÍNEA SAP
                                </Text>
                              </HStack>
                              <Badge
                                fontSize="8px"
                                px={1.5}
                                py={0.2}
                                borderRadius="sm"
                                colorScheme={
                                  saleCondition === "CONTADO"
                                    ? "green"
                                    : clientCreditInfo.isCreditSale && clientCreditInfo.isExceeded
                                    ? "red"
                                    : !clientCreditInfo.hasCreditLine
                                    ? "yellow"
                                    : "blue"
                                }
                              >
                                {saleCondition === "CONTADO"
                                  ? "CONTADO"
                                  : clientCreditInfo.isCreditSale && clientCreditInfo.isExceeded
                                  ? "SOBREGIRADO"
                                  : !clientCreditInfo.hasCreditLine
                                  ? "SIN LÍNEA"
                                  : "CRÉDITO"}
                              </Badge>
                            </Flex>

                            <Flex justify="space-between" align="baseline" mb={1}>
                              <Box>
                                <Text fontSize="7.5px" fontWeight="800" color="gray.500" textTransform="uppercase" lineHeight="1">DISPONIBLE</Text>
                                <Text
                                  fontSize="13px"
                                  fontWeight="900"
                                  color={
                                    clientCreditInfo.availableCreditUSD > 0
                                      ? "#16a34a"
                                      : clientCreditInfo.availableCreditUSD < 0
                                      ? "#dc2626"
                                      : saleCondition === "CONTADO"
                                      ? "gray.600"
                                      : "#dc2626"
                                  }
                                  lineHeight="1.1"
                                >
                                  {clientCreditInfo.availableCreditUSD < 0
                                    ? `-$${formatThousands(Math.abs(clientCreditInfo.availableCreditUSD))}`
                                    : `$${formatThousands(clientCreditInfo.availableCreditUSD)}`}
                                </Text>
                              </Box>
                              <Box textAlign="right">
                                <Text fontSize="7.5px" fontWeight="800" color="gray.500" textTransform="uppercase" lineHeight="1">LÍNEA</Text>
                                <Text fontSize="11px" fontWeight="700" color="gray.700" lineHeight="1.1">
                                  ${formatThousands(clientCreditInfo.creditLimitUSD)}
                                </Text>
                              </Box>
                            </Flex>

                            <Box>
                              <Flex justify="space-between" align="center" mb={0.5}>
                                <Text fontSize="7.5px" color="gray.500" fontWeight="600">
                                  Utilizado: ${formatThousands(clientCreditInfo.totalCommittedUSD)}
                                </Text>
                                <Text
                                  fontSize="8px"
                                  fontWeight="800"
                                  color={
                                    clientCreditInfo.availableCreditUSD < 0
                                      ? "red.600"
                                      : clientCreditInfo.usagePercent > 80
                                      ? "orange.600"
                                      : "blue.600"
                                  }
                                >
                                  {clientCreditInfo.usagePercent}%
                                </Text>
                              </Flex>
                              <Progress
                                value={Math.min(100, clientCreditInfo.usagePercent)}
                                h="3px"
                                borderRadius="full"
                                colorScheme={
                                  clientCreditInfo.availableCreditUSD < 0 || (clientCreditInfo.isExceeded && clientCreditInfo.isCreditSale)
                                    ? "red"
                                    : clientCreditInfo.usagePercent > 80
                                    ? "yellow"
                                    : "blue"
                                }
                              />
                            </Box>
                          </Box>
                        ) : (
                          /* ── CASO B: CUANDO SALE SOLITO (Tiene línea en SAP y 0 Deuda / Al Día) ── */
                          <Box
                            h="full"
                            p={3.5}
                            bg="white"
                            borderRadius="xl"
                            border="1.5px solid"
                            borderColor="#86efac"
                            boxShadow="xs"
                            display="flex"
                            flexDirection="column"
                            justifyContent="space-between"
                          >
                            {/* Cabecera Superior */}
                            <Flex justify="space-between" align="center">
                              <HStack spacing={1.5} minW={0}>
                                <CreditCard className="w-4 h-4 text-emerald-600" />
                                <Text fontSize="11px" fontWeight="900" color="gray.800" textTransform="uppercase" letterSpacing="wider">
                                  LÍNEA DE CRÉDITO SAP
                                </Text>
                                <Badge colorScheme="green" bg="#dcfce7" color="#166534" fontSize="8.5px" px={2} py={0.5} borderRadius="full" fontWeight="800">
                                  ✓ 100% DISPONIBLE
                                </Badge>
                              </HStack>
                              <Badge
                                fontSize="8.5px"
                                px={2}
                                py={0.5}
                                borderRadius="md"
                                fontWeight="800"
                                colorScheme={saleCondition === "CONTADO" ? "green" : "blue"}
                              >
                                {saleCondition === "CONTADO" ? "CONTADO" : "CRÉDITO"}
                              </Badge>
                            </Flex>

                            {/* Sección Central Hero: Monto Disponible */}
                            <Box my={1} p={2.5} bg="#f0fdf4" borderRadius="lg" border="1px solid" borderColor="#bbf7d0">
                              <Flex justify="space-between" align="center">
                                <Box>
                                  <Text fontSize="8px" fontWeight="800" color="emerald.800" textTransform="uppercase" letterSpacing="wider">
                                    CRÉDITO DISPONIBLE
                                  </Text>
                                  <Text fontSize="24px" fontWeight="900" color="#16a34a" lineHeight="1.1">
                                    ${formatThousands(clientCreditInfo.availableCreditUSD)}
                                  </Text>
                                  <Text fontSize="8.5px" color="emerald.700" fontWeight="600" mt={0.5}>
                                    Línea comercial libre y aprobada para compras
                                  </Text>
                                </Box>
                                <Box textAlign="right" pl={2}>
                                  <Badge bg="#16a34a" color="white" fontSize="9px" px={2} py={1} borderRadius="md" fontWeight="800">
                                    SIN DEUDA
                                  </Badge>
                                </Box>
                              </Flex>
                            </Box>

                            {/* Grid de 3 Métricas Contables */}
                            <Grid templateColumns="repeat(3, 1fr)" gap={2} my={0.5}>
                              <Box p={2} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.100">
                                <Text fontSize="7.5px" fontWeight="800" color="gray.500" textTransform="uppercase">Línea Total</Text>
                                <Text fontSize="11.5px" fontWeight="900" color="gray.800">
                                  ${formatThousands(clientCreditInfo.creditLimitUSD)}
                                </Text>
                              </Box>
                              <Box p={2} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.100">
                                <Text fontSize="7.5px" fontWeight="800" color="gray.500" textTransform="uppercase">Utilizado</Text>
                                <Text fontSize="11.5px" fontWeight="900" color="gray.800">
                                  ${formatThousands(clientCreditInfo.totalCommittedUSD)}
                                </Text>
                              </Box>
                              <Box p={2} bg="emerald.50" borderRadius="md" border="1px solid" borderColor="emerald.100">
                                <Text fontSize="7.5px" fontWeight="800" color="emerald.700" textTransform="uppercase">Deuda / Mora</Text>
                                <Text fontSize="11.5px" fontWeight="900" color="emerald.800">
                                  $0.00 (Al Día)
                                </Text>
                              </Box>
                            </Grid>

                            {/* Barra de Progreso y Pie Informativo */}
                            <Box pt={0.5}>
                              <Flex justify="space-between" align="center" mb={1}>
                                <Text fontSize="7.5px" color="gray.500" fontWeight="700" textTransform="uppercase">
                                  Ocupación de línea
                                </Text>
                                <Text fontSize="8px" fontWeight="800" color="emerald.700">
                                  {clientCreditInfo.usagePercent}% utilizado
                                </Text>
                              </Flex>
                              <Progress
                                value={Math.min(100, clientCreditInfo.usagePercent)}
                                h="3.5px"
                                borderRadius="full"
                                colorScheme="emerald"
                                bg="gray.100"
                              />
                            </Box>
                          </Box>
                        )
                      )}

                      {/* 2. COBRANZA SAP */}
                      {hasDebtCard && clientDebtInfo && (
                        <Box
                          flex="1"
                          p={3}
                          bg={clientDebtInfo.hasOverdueDebt ? "#fff5f5" : "#f0fdf4"}
                          borderRadius="xl"
                          border="1.5px solid"
                          borderColor={clientDebtInfo.hasOverdueDebt ? "#fca5a5" : "#bbf7d0"}
                          boxShadow="xs"
                          display="flex"
                          flexDirection="column"
                          justifyContent="space-between"
                          minH="95px"
                        >
                          <Flex justify="space-between" align="center" mb={1}>
                            <HStack spacing={1.5} minW={0}>
                              {clientDebtInfo.hasOverdueDebt ? (
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              )}
                              <Text fontSize="10px" fontWeight="900" color={clientDebtInfo.hasOverdueDebt ? "red.900" : "emerald.900"} textTransform="uppercase" isTruncated>
                                COBRANZA SAP
                              </Text>
                            </HStack>
                            <Badge
                              fontSize="8px"
                              px={1.5}
                              py={0.2}
                              borderRadius="sm"
                              colorScheme={clientDebtInfo.hasOverdueDebt ? "red" : "green"}
                              bg={clientDebtInfo.hasOverdueDebt ? "#fee2e2" : "#dcfce7"}
                              color={clientDebtInfo.hasOverdueDebt ? "#991b1b" : "#166534"}
                            >
                              {clientDebtInfo.hasOverdueDebt
                                ? `${clientDebtInfo.overdueDocsCount} VENCIDO${clientDebtInfo.overdueDocsCount > 1 ? "S" : ""}`
                                : "AL DÍA"}
                            </Badge>
                          </Flex>

                          <Flex justify="space-between" align="baseline" mb={1}>
                            <Box>
                              <Text fontSize="7.5px" fontWeight="800" color={clientDebtInfo.hasOverdueDebt ? "red.600" : "emerald.700"} textTransform="uppercase" lineHeight="1">
                                {clientDebtInfo.hasOverdueDebt ? "VENCIDO" : "MORA VENCIDA"}
                              </Text>
                              <Text fontSize="13px" fontWeight="900" color={clientDebtInfo.hasOverdueDebt ? "#dc2626" : "#16a34a"} lineHeight="1.1">
                                ${formatThousands(clientDebtInfo.hasOverdueDebt ? clientDebtInfo.overdueUSD : 0)}
                              </Text>
                            </Box>
                            <Box textAlign="right">
                              <Text fontSize="7.5px" fontWeight="800" color="gray.500" textTransform="uppercase" lineHeight="1">TOTAL ACTIVO</Text>
                              <Text fontSize="11px" fontWeight="700" color="gray.700" lineHeight="1.1">
                                ${formatThousands(clientDebtInfo.totalPendingUSD)}
                              </Text>
                            </Box>
                          </Flex>

                          <Box>
                            {clientDebtInfo.matchingClient ? (
                              <Button
                                size="2xs"
                                colorScheme={clientDebtInfo.hasOverdueDebt ? "red" : "emerald"}
                                variant="outline"
                                borderColor={clientDebtInfo.hasOverdueDebt ? "red.400" : "emerald.400"}
                                color={clientDebtInfo.hasOverdueDebt ? "red.700" : "emerald.800"}
                                _hover={{ bg: clientDebtInfo.hasOverdueDebt ? "red.50" : "emerald.50" }}
                                h="22px"
                                fontSize="8.5px"
                                fontWeight="800"
                                w="full"
                                onClick={() => setIsReceivableModalOpen(true)}
                                borderRadius="sm"
                                px={1.5}
                              >
                                📋 Ver {clientDebtInfo.totalDocsCount} doc{clientDebtInfo.totalDocsCount > 1 ? "s" : ""} / cuotas
                              </Button>
                            ) : (
                              <Text fontSize="7.5px" color="gray.500" fontWeight="600" isTruncated>
                                Sin comprobantes
                              </Text>
                            )}
                          </Box>
                        </Box>
                      )}
                    </>
                  ) : (
                    /* Cuando NO hay cliente o el cliente NO tiene línea ni deuda, los parámetros van a la derecha de forma limpia y equilibrada */
                    <Box pt={0.5}>
                      {renderDocParamsGrid()}
                    </Box>
                  )}
                </Box>

                {/* 📱 EN MÓVIL (< lg): PARÁMETROS DEL DOCUMENTO (Válido hasta, Contacto, Moneda, etc.) */}
                <Box display={{ base: "block", lg: "none" }}>
                  {renderDocParamsGrid(true)}
                </Box>
              </VStack>

              {/* 📱 EN MÓVIL (< lg): GRID PARA LÍNEA SAP Y COBRANZA SAP (SOLO SI TIENE LÍNEA O DEUDA) */}
              {hasClientFinancialCards && (
                <Box
                  order={2}
                  gridColumn="span 2"
                  display={{ base: "block", lg: "none" }}
                >
                  <Box
                    display={{ base: "grid", lg: "none" }}
                    gridTemplateColumns={hasCreditCard && hasDebtCard ? "repeat(2, 1fr)" : "1fr"}
                    gap={2}
                  >
                    {/* LÍNEA SAP (Col 1) */}
                    {hasCreditCard && clientCreditInfo && (
                      <Box
                        p={2}
                        bg={
                          clientCreditInfo.isExceeded && clientCreditInfo.isCreditSale
                            ? "#fff5f5"
                            : clientCreditInfo.usagePercent > 80 && clientCreditInfo.isCreditSale
                            ? "#fffbeb"
                            : "white"
                        }
                        borderRadius="lg"
                        border="1px solid"
                        borderColor={
                          clientCreditInfo.isExceeded && clientCreditInfo.isCreditSale
                            ? "#fca5a5"
                            : clientCreditInfo.usagePercent > 80 && clientCreditInfo.isCreditSale
                            ? "#fef08a"
                            : "gray.200"
                        }
                        boxShadow="xs"
                        display="flex"
                        flexDirection="column"
                        justifyContent="space-between"
                        minH="80px"
                      >
                        <Flex justify="space-between" align="center" mb={1}>
                          <HStack spacing={1} minW={0}>
                            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                            <Text fontSize="9px" fontWeight="800" color="gray.800" textTransform="uppercase" isTruncated>
                              LÍNEA SAP
                            </Text>
                          </HStack>
                          <Badge
                            fontSize="7px"
                            px={1}
                            py={0}
                            borderRadius="sm"
                            colorScheme={
                              saleCondition === "CONTADO"
                                ? "green"
                                : clientCreditInfo.isCreditSale && clientCreditInfo.isExceeded
                                ? "red"
                                : !clientCreditInfo.hasCreditLine
                                ? "yellow"
                                : "blue"
                            }
                          >
                            {saleCondition === "CONTADO"
                              ? "CONTADO"
                              : clientCreditInfo.isCreditSale && clientCreditInfo.isExceeded
                              ? "SOBREGIRADO"
                              : !clientCreditInfo.hasCreditLine
                              ? "SIN LÍNEA"
                              : "CRÉDITO"}
                          </Badge>
                        </Flex>

                        <Flex justify="space-between" align="baseline" mb={1}>
                          <Box>
                            <Text fontSize="6.5px" fontWeight="800" color="gray.500" textTransform="uppercase" lineHeight="1">DISPONIBLE</Text>
                            <Text
                              fontSize="11px"
                              fontWeight="900"
                              color={
                                clientCreditInfo.availableCreditUSD > 0
                                  ? "#16a34a"
                                  : clientCreditInfo.availableCreditUSD < 0
                                  ? "#dc2626"
                                  : saleCondition === "CONTADO"
                                  ? "gray.600"
                                  : "#dc2626"
                              }
                              lineHeight="1.1"
                            >
                              {clientCreditInfo.availableCreditUSD < 0
                                ? `-$${formatThousands(Math.abs(clientCreditInfo.availableCreditUSD))}`
                                : `$${formatThousands(clientCreditInfo.availableCreditUSD)}`}
                            </Text>
                          </Box>
                          <Box textAlign="right">
                            <Text fontSize="6.5px" fontWeight="800" color="gray.500" textTransform="uppercase" lineHeight="1">LÍNEA</Text>
                            <Text fontSize="9.5px" fontWeight="700" color="gray.700" lineHeight="1.1">
                              ${formatThousands(clientCreditInfo.creditLimitUSD)}
                            </Text>
                          </Box>
                        </Flex>

                        <Box>
                          <Flex justify="space-between" align="center" mb={0.5}>
                            <Text fontSize="7px" color="gray.500" fontWeight="600">Utilizado: ${formatThousands(clientCreditInfo.totalCommittedUSD)}</Text>
                            <Text
                              fontSize="7.5px"
                              fontWeight="800"
                              color={
                                clientCreditInfo.availableCreditUSD < 0
                                  ? "red.600"
                                  : clientCreditInfo.usagePercent > 80
                                  ? "orange.600"
                                  : "blue.600"
                              }
                            >
                              {clientCreditInfo.usagePercent}%
                            </Text>
                          </Flex>
                          <Progress
                            value={Math.min(100, clientCreditInfo.usagePercent)}
                            h="2.5px"
                            borderRadius="full"
                            colorScheme={
                              clientCreditInfo.availableCreditUSD < 0 || (clientCreditInfo.isExceeded && clientCreditInfo.isCreditSale)
                                ? "red"
                                : clientCreditInfo.usagePercent > 80
                                ? "yellow"
                                : "blue"
                            }
                          />
                        </Box>
                      </Box>
                    )}

                    {/* COBRANZA SAP (Col 2) */}
                    {hasDebtCard && clientDebtInfo && (
                      <Box
                        p={2}
                        bg={clientDebtInfo.hasOverdueDebt ? "#fff5f5" : "#f0fdf4"}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor={clientDebtInfo.hasOverdueDebt ? "#fca5a5" : "#bbf7d0"}
                        boxShadow="xs"
                        display="flex"
                        flexDirection="column"
                        justifyContent="space-between"
                        minH="80px"
                      >
                        <Flex justify="space-between" align="center" mb={1}>
                          <HStack spacing={1} minW={0}>
                            {clientDebtInfo.hasOverdueDebt ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <Text fontSize="9px" fontWeight="800" color={clientDebtInfo.hasOverdueDebt ? "red.900" : "emerald.900"} textTransform="uppercase" isTruncated>
                              COBRANZA SAP
                            </Text>
                          </HStack>
                          <Badge
                            fontSize="7px"
                            px={1}
                            py={0}
                            borderRadius="sm"
                            colorScheme={clientDebtInfo.hasOverdueDebt ? "red" : "green"}
                            bg={clientDebtInfo.hasOverdueDebt ? "#fee2e2" : "#dcfce7"}
                            color={clientDebtInfo.hasOverdueDebt ? "#991b1b" : "#166534"}
                          >
                            {clientDebtInfo.hasOverdueDebt
                              ? `${clientDebtInfo.overdueDocsCount} VENCIDO${clientDebtInfo.overdueDocsCount > 1 ? "S" : ""}`
                              : "AL DÍA"}
                          </Badge>
                        </Flex>

                        <Flex justify="space-between" align="baseline" mb={1}>
                          <Box>
                            <Text fontSize="6.5px" fontWeight="800" color={clientDebtInfo.hasOverdueDebt ? "red.600" : "emerald.700"} textTransform="uppercase" lineHeight="1">
                              {clientDebtInfo.hasOverdueDebt ? "VENCIDO" : "MORA VENCIDA"}
                            </Text>
                            <Text fontSize="11px" fontWeight="900" color={clientDebtInfo.hasOverdueDebt ? "#dc2626" : "#16a34a"} lineHeight="1.1">
                              ${formatThousands(clientDebtInfo.hasOverdueDebt ? clientDebtInfo.overdueUSD : 0)}
                            </Text>
                          </Box>
                          <Box textAlign="right">
                            <Text fontSize="6.5px" fontWeight="800" color="gray.500" textTransform="uppercase" lineHeight="1">TOTAL ACTIVO</Text>
                            <Text fontSize="9.5px" fontWeight="700" color="gray.700" lineHeight="1.1">
                              ${formatThousands(clientDebtInfo.totalPendingUSD)}
                            </Text>
                          </Box>
                        </Flex>

                        <Box>
                          {clientDebtInfo.matchingClient ? (
                            <Button
                              size="2xs"
                              colorScheme={clientDebtInfo.hasOverdueDebt ? "red" : "emerald"}
                              variant="outline"
                              borderColor={clientDebtInfo.hasOverdueDebt ? "red.400" : "emerald.400"}
                              color={clientDebtInfo.hasOverdueDebt ? "red.700" : "emerald.800"}
                              _hover={{ bg: clientDebtInfo.hasOverdueDebt ? "red.50" : "emerald.50" }}
                              h="19px"
                              fontSize="7.5px"
                              fontWeight="800"
                              w="full"
                              onClick={() => setIsReceivableModalOpen(true)}
                              borderRadius="sm"
                              px={1}
                            >
                              📋 Ver {clientDebtInfo.totalDocsCount} doc{clientDebtInfo.totalDocsCount > 1 ? "s" : ""} / cuotas
                            </Button>
                          ) : (
                            <Text fontSize="7px" color="gray.500" fontWeight="600" isTruncated>
                              Sin comprobantes
                            </Text>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
        </Grid>
      </Box>

      {/* ── SECCIÓN CENTRAL CON PESTAÑAS SAP ── */}
      <Box bg="white" borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
        <Tabs index={activeTabIndex} onChange={(index) => setActiveTabIndex(index)} colorScheme="emerald" variant="enclosed">
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
            <Tab flexShrink={0} whiteSpace="nowrap" minH={{ base: "44px", md: "auto" }} _selected={{ bg: "white", color: "#166534", fontWeight: "800", borderTop: "3px solid #166534" }}>
              <HStack spacing={1.5} fontSize="xs">
                <FileText className="w-3.5 h-3.5" />
                <Text>Contenido ({products.length})</Text>
              </HStack>
            </Tab>

            {revealTabs && (
              <Tab flexShrink={0} whiteSpace="nowrap" minH={{ base: "44px", md: "auto" }} _selected={{ bg: "white", color: "#166534", fontWeight: "800", borderTop: "3px solid #166534" }}>
                <HStack spacing={1.5} fontSize="xs">
                  <Truck className="w-3.5 h-3.5" />
                  <Text>{isAdmin ? "Logística, Pagos y Anexos" : "Logística y Despacho"}</Text>
                </HStack>
              </Tab>
            )}
          </TabList>

          <TabPanels p={{ base: 2, md: 4 }}>
            {/* Pestaña 1: Contenido (Grid de productos) */}
            <TabPanel p={0}>
              {isAdmin && isSellerFieldsLocked && (
                <Flex justify="space-between" align="center" bg="#fefce8" border="1.5px solid #fef08a" p={2.5} borderRadius="lg" mb={3} wrap="wrap" gap={2}>
                  <HStack spacing={2}>
                    <Lock className="w-4 h-4 text-amber-600" />
                    <Text fontSize="xs" fontWeight="700" color="amber.900">
                      Artículos bloqueados en modo revisión. ¿Deseas modificar precios, cantidades o agregar productos?
                    </Text>
                  </HStack>
                  <Button
                    size="xs"
                    colorScheme="orange"
                    variant="solid"
                    bg="#ea580c"
                    _hover={{ bg: "#c2410c" }}
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={() => setAdminForceEditMode(true)}
                    fontWeight="900"
                  >
                    ✏️ Habilitar Edición de Artículos
                  </Button>
                </Flex>
              )}
              {isAdmin && adminForceEditMode && (
                <Flex justify="space-between" align="center" bg="#eff6ff" border="1.5px solid #bfdbfe" p={2.5} borderRadius="lg" mb={3} wrap="wrap" gap={2}>
                  <HStack spacing={2}>
                    <Edit3 className="w-4 h-4 text-blue-600" />
                    <Text fontSize="xs" fontWeight="800" color="blue.900">
                      Modo Edición Administrador Activo — Puedes agregar, modificar o retirar artículos libremente.
                    </Text>
                  </HStack>
                  <Button
                    size="xs"
                    colorScheme="blue"
                    variant="outline"
                    leftIcon={<Lock className="w-3.5 h-3.5" />}
                    onClick={() => setAdminForceEditMode(false)}
                    fontWeight="800"
                  >
                    🔒 Bloquear Edición
                  </Button>
                </Flex>
              )}
              <SapItemGrid
                client={client}
                products={products}
                onAddProduct={addProduct}
                onRemoveProduct={removeProduct}
                onUpdateProduct={updateProduct}
                currency={currency || "USD"}
                exchangeRate={exchangeRate}
                whsCode="014"
                isReadOnly={isSellerFieldsLocked}
              />
            </TabPanel>

            {/* Pestaña 2: Logística y Condiciones */}
            {revealTabs && (
              <TabPanel p={{ base: 1, md: 2 }}>
                <VStack align="stretch" spacing={3}>
                  <NewSellTerms
                    client={client}
                    transports={dataTransports || []}
                    deliveryPoints={deliveryPoints}
                    isLoadingDeliveryPoints={isLoadingDeliveryPoints}
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
                    saleCondition={saleCondition}
                    setSaleCondition={setSaleCondition}
                    documentType={documentType}
                    setDocumentType={setDocumentType}
                    isLetra={isLetra}
                    setIsLetra={setIsLetra}
                    creditTerm={creditTerm}
                    setCreditTerm={setCreditTerm}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    bankAccount={bankAccount}
                    setBankAccount={setBankAccount}
                    sunatOpType={sunatOpType}
                    setSunatOpType={setSunatOpType}
                    isAdmin={canManageFinance}
                    isDeliveryLocked={isDeliveryLocked}
                    isFinanceLocked={adminForceEditMode ? false : isReadOnly}
                  />
                </VStack>
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
      </Box>

      {/* ── PIE DE PÁGINA Y CUADRO DE TOTALES ESTILO SAP ── */}
      <Grid templateColumns={{ base: "1fr", lg: "1fr 380px" }} gap={6} alignItems="start">
        {/* Empleado de Ventas y Comentarios (Simétrico con SAP B1) */}
        <VStack align="stretch" spacing={3}>
          <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
            <FormControl>
              <Flex justify="space-between" align="center" mb={1.5}>
                <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="gray.700" mb={0}>
                  Empleado de Ventas / Asesor Comercial {isSellerFieldsLocked && "🔒"}
                </FormLabel>
                {canSelectSeller && (
                  <Badge colorScheme="purple" fontSize="10px" px={2} py={0.5} borderRadius="md">
                    Admin / Asignación Oficial
                  </Badge>
                )}
              </Flex>
              {canSelectSeller && !isSellerFieldsLocked ? (
                <ChakraSelect
                  size="sm"
                  borderRadius="md"
                  value={selectedSlpCode || 20}
                  onChange={(e) => {
                    const code = Number(e.target.value);
                    setSelectedSlpCode(code);
                  }}
                  bg="white"
                  fontWeight="600"
                >
                  <option value={20}>20 - 001.Ofic Administración (Oficina / Admin)</option>
                  {sellersList
                    .filter((s) => s.value !== 20)
                    .map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.value} - {s.label}
                      </option>
                    ))}
                </ChakraSelect>
              ) : (
                <Input
                  size="sm"
                  borderRadius="md"
                  value={sellerDisplayName}
                  isReadOnly
                  isDisabled
                  bg="gray.100"
                  cursor="not-allowed"
                  fontWeight="700"
                  color="gray.800"
                />
              )}
            </FormControl>
          </Box>

          <FormControl bg="white" p={{ base: 3, md: 4 }} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
            <Flex justify="space-between" align="center" mb={1.5}>
              <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.700" mb={0}>
                Comentarios u Observaciones del Pedido {isSellerFieldsLocked && "🔒"}
              </FormLabel>
              <Badge colorScheme="emerald" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                OFICIAL
              </Badge>
            </Flex>
            <Textarea
              size="sm"
              borderRadius="md"
              rows={4}
              placeholder="Ingrese especificaciones comerciales, notas de entrega, acuerdos o vigencia..."
              value={comment || ""}
              onChange={(e) => setComment && setComment(e.target.value)}
              isReadOnly={isSellerFieldsLocked}
              bg={isSellerFieldsLocked ? "gray.100" : "white"}
              cursor={isSellerFieldsLocked ? "not-allowed" : "text"}
            />
          </FormControl>
        </VStack>

        {/* ── RESUMEN DEL DOCUMENTO — Moneda del documento: USD o SOL (según selección) ── */}
        <Box
          bg="linear-gradient(135deg, #064e3b 0%, #0f5132 100%)"
          color="#ffffff"
          p={{ base: 4, sm: 5 }}
          borderRadius="xl"
          boxShadow="0 4px 20px -2px rgba(15, 81, 50, 0.35)"
          border="1px solid"
          borderColor="rgba(255,255,255,0.15)"
          minW={{ base: "full", lg: "380px" }}
          alignSelf="start"
        >
          <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="wider" color="#a7f3d0" mb={3}>
            Resumen del Documento
          </Text>

          <VStack align="stretch" spacing={2} fontSize="xs">

            {/* Valor Venta Neto (con conteo de ítems con stock) */}
            <Flex justify="space-between" align="center" color="#ecfdf5" gap={2}>
              <Text fontWeight="600">
                Valor Venta Neto ({(totals.inStockProducts ? totals.inStockProducts.length : products.length)} {(totals.inStockProducts ? totals.inStockProducts.length : products.length) === 1 ? 'ítem con stock' : 'ítems con stock'})
              </Text>
              <Text fontWeight="800" fontFamily="mono" whiteSpace="nowrap">
                {currency === "SOL" ? `S/ ${formatThousands(totals.subtotalSOL)}` : `USD ${formatThousands(totals.subtotalUSD)}`}
              </Text>
            </Flex>

            {totals.backOrderProducts && totals.backOrderProducts.length > 0 && (
              <Flex justify="space-between" align="center" bg="rgba(239, 68, 68, 0.25)" px={2} py={1} borderRadius="md" border="1px solid rgba(248, 113, 113, 0.4)">
                <Text fontSize="10px" fontWeight="700" color="#fecaca">
                  📦 Sin Stock ({totals.backOrderProducts.length} {totals.backOrderProducts.length === 1 ? 'ítem' : 'ítems'}):
                </Text>
                <Badge colorScheme="red" bg="#dc2626" color="white" fontSize="9px" px={1.5} py={0.2} borderRadius="sm" fontWeight="800">
                  Back Order
                </Badge>
              </Flex>
            )}

            {/* I.G.V. 18% oficial (sumado al final tal como hace SAP) */}
            <Flex justify="space-between" align="center" color="#a7f3d0" gap={2}>
              <Text fontWeight="700">I.G.V. (18%)</Text>
              <Text fontWeight="800" fontFamily="mono" whiteSpace="nowrap">
                {currency === "SOL" ? `+S/ ${formatThousands(totals.igvSOL)}` : `+USD ${formatThousands(totals.igvUSD)}`}
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
                Total a Pagar
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
                {currency === "SOL" ? `S/ ${formatThousands(totals.grandTotalSOL)}` : `USD ${formatThousands(totals.grandTotalUSD)}`}
              </Text>
            </Flex>
          </VStack>
        </Box>
      </Grid>

      {/* ── LISTADO CON CHECKS DE AVANCE COMERCIAL (Solo al enviar / revisar cotización) ── */}
      {isQuoteAlreadySentOrInReview && (
        <OrderChecklist
          client={client}
          products={products}
          saleCondition={saleCondition}
          creditTerm={creditTerm}
          selectedDeliveryForm={selectedDeliveryForm}
          selectedTransport={selectedTransport}
          selectedPoint={selectedPoint}
          approvalStatus={approvalStatus || (isSubmittedQuote ? "ENVIADO" : "GENERADO")}
        />
      )}

      {/* ── BARRA DE ACCIÓN Y MENÚ "COPIAR A" ESTILO SAP NATIVO ── */}
      {/* ── BARRA DE ACCIÓN Y MENÚ "COPIAR A" ESTILO SAP NATIVO ── */}
      <Box
        bg="white"
        p={{ base: 3, sm: 4 }}
        borderRadius="2xl"
        border="1px solid"
        borderColor="gray.200"
        boxShadow="sm"
      >
        <Flex
          gap={2.5}
          direction={{ base: "column", sm: "row" }}
          wrap={{ base: "nowrap", sm: "wrap" }}
          align={{ base: "stretch", sm: "center" }}
          w="full"
        >
          {isReadOnly ? (
            <Badge colorScheme="green" bg="#dcfce7" color="#166534" border="1px solid #86efac" p={3} borderRadius="lg" fontSize="xs" fontWeight="800" w={{ base: "full", sm: "auto" }} textAlign="center">
              {approvalStatus === "APROBADO" ? "✅ 3. Orden de Venta Aprobada (Solo Lectura)" : "✅ Cotización Aprobada (Solo Lectura)"}
            </Badge>
          ) : isAdmin ? (
            <>
              <Button
                bg="#0f5132"
                color="white"
                _hover={{ bg: "#093822" }}
                size="md"
                h="44px"
                w={{ base: "full", sm: "auto" }}
                leftIcon={<Zap className="w-4 h-4" />}
                onClick={() => {
                  if (!validateBeforeAdminApproval()) return;
                  setShowAdminConfirmModal(true);
                }}
                fontWeight="900"
                boxShadow="0 4px 12px rgba(15,81,50,0.3)"
                isLoading={isSendingToValidation}
                isDisabled={isSendingToValidation}
              >
                ⚡ Aprobar y Emitir a SAP
              </Button>

              {canAdminObserveOrReject && (
                <>
                  <Button
                    colorScheme="amber"
                    bg="#d97706"
                    _hover={{ bg: "#b45309" }}
                    color="white"
                    size="md"
                    h="44px"
                    w={{ base: "full", sm: "auto" }}
                    leftIcon={<MessageSquare className="w-4 h-4" />}
                    onClick={() => setIsObserveModalOpen(true)}
                    fontWeight="800"
                    isDisabled={isSendingToValidation}
                  >
                    💬 Devolver con Observación
                  </Button>
                  <Button
                    colorScheme="red"
                    variant="outline"
                    borderColor="#fca5a5"
                    bg="#fef2f2"
                    color="#dc2626"
                    _hover={{ bg: "#fee2e2" }}
                    size="md"
                    h="44px"
                    w={{ base: "full", sm: "auto" }}
                    leftIcon={<XCircle className="w-4 h-4 stroke-[2.5]" />}
                    onClick={() => setIsRejectModalOpen(true)}
                    fontWeight="800"
                    isDisabled={isSendingToValidation}
                  >
                    ✕ Rechazar
                  </Button>
                </>
              )}

              {!isSubmittedVendorQuote && (
                <Button
                  variant="outline"
                  borderColor="gray.300"
                  color="gray.700"
                  bg="white"
                  _hover={{ bg: "gray.50" }}
                  size="md"
                  h="44px"
                  w={{ base: "full", sm: "auto" }}
                  leftIcon={<Save className="w-4 h-4 text-gray-500" />}
                  onClick={handleSaveDraft}
                  fontWeight="700"
                  isLoading={isSavingDraft}
                  isDisabled={isSendingToValidation || isSavingDraft}
                >
                  {quoteId ? "💾 Guardar Borrador" : "💾 Guardar como Borrador"}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                bg="#166534"
                color="white"
                _hover={{ bg: "#0f5132" }}
                size="md"
                h="44px"
                w={{ base: "full", sm: "auto" }}
                leftIcon={<Save className="w-4 h-4" />}
                onClick={handleSaveAndSend}
                fontWeight="900"
                boxShadow="0 4px 12px rgba(22,101,52,0.25)"
                isLoading={isSendingToValidation}
                isDisabled={isSendingToValidation || isSavingDraft}
              >
                {isObservedOrInCorrection
                  ? "💾 Guardar y Reenviar a Validación"
                  : "💾 Guardar y Enviar a Validación"}
              </Button>
              {!isApprovedOrder && (
                <Button
                  variant="outline"
                  borderColor="gray.300"
                  color="gray.700"
                  bg="white"
                  _hover={{ bg: "gray.50" }}
                  size="md"
                  h="44px"
                  w={{ base: "full", sm: "auto" }}
                  leftIcon={<Save className="w-4 h-4 text-gray-500" />}
                  onClick={handleSaveDraft}
                  fontWeight="700"
                  isLoading={isSavingDraft}
                  isDisabled={isSendingToValidation || isSavingDraft}
                >
                  {quoteId ? "💾 Guardar Borrador" : "💾 Guardar como Borrador"}
                </Button>
              )}
            </>
          )}

          {/* Botón Ver Boleta / Factura: SOLO SI YA ESTÁ APROBADO Y ES VENDEDOR */}
          {!isAdmin && isApprovedOrder && (
            <Button
              colorScheme="teal"
              variant="outline"
              borderColor="teal.400"
              color="teal.700"
              bg="teal.50"
              _hover={{ bg: "teal.100", borderColor: "teal.600" }}
              size="md"
              h="44px"
              w={{ base: "full", sm: "auto" }}
              leftIcon={<Printer className="w-4 h-4 text-teal-600" />}
              onClick={() => setIsPreviewOpen(true)}
              fontWeight="800"
              borderRadius="md"
            >
              Ver Boleta
            </Button>
          )}

          {/* Botón exclusivo para Administrador: Ver Trama JSON SAP */}
          {isAdmin && (
            <Button
              colorScheme="purple"
              variant="outline"
              borderColor="purple.400"
              color="purple.700"
              bg="purple.50"
              _hover={{ bg: "purple.100", borderColor: "purple.600" }}
              size="md"
              h="44px"
              w={{ base: "full", sm: "auto" }}
              leftIcon={<Code2 className="w-4 h-4 text-purple-600" />}
              onClick={() => setIsJsonModalOpen(true)}
              fontWeight="800"
              borderRadius="md"
              title="Inspector Técnico: Ver Trama JSON para SAP Service Layer (Solo Administrador)"
            >
              Ver JSON SAP
            </Button>
          )}

          {/* Botón Limpiar / Salir */}
          {!quoteId && !isQuoteAlreadySentOrInReview && !isAdminReviewing ? (
            <Button
              variant="ghost"
              colorScheme="gray"
              size="md"
              h="44px"
              w={{ base: "full", sm: "auto" }}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={handleNewQuote}
              fontWeight="700"
            >
              Limpiar
            </Button>
          ) : (
            <Button
              variant="outline"
              colorScheme="gray"
              borderColor="gray.300"
              size="md"
              h="44px"
              w={{ base: "full", sm: "auto" }}
              onClick={() => {
                clear();
                navigate("/historyquotes");
              }}
              fontWeight="700"
            >
              Salir
            </Button>
          )}
        </Flex>
      </Box>

      {/* Modal de Documento Oficial SAP */}
      <SapQuoteDocumentModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        quote={currentQuoteObj}
      />

      {/* Modal Inspector Técnico JSON SAP (Solo Administrador) */}
      {isAdmin && (
        <SapPayloadJsonModal
          isOpen={isJsonModalOpen}
          onClose={() => setIsJsonModalOpen(false)}
          quote={currentQuoteObj}
        />
      )}

      {/* Modal de Confirmación Pre-Envío Vendedor (Checklist de Seguridad) */}
      <QuoteSubmitConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedSend}
        quote={currentQuoteObj}
        isAdminApproval={false}
        isLoading={isSendingToValidation}
      />

      {/* Modal de Confirmación Pre-Emisión Administrador (Checklist de Seguridad SAP) */}
      <QuoteSubmitConfirmModal
        isOpen={showAdminConfirmModal}
        onClose={() => setShowAdminConfirmModal(false)}
        onConfirm={() => {
          setShowAdminConfirmModal(false);
          handleAdminApproveQuote();
        }}
        quote={currentQuoteObj}
        isAdminApproval={true}
        isLoading={isSendingToValidation}
      />

      {/* MODAL DE CONFIRMACIÓN EXITOSA DE EMISIÓN A SAP B1 */}
      <Modal
        isOpen={isSapSuccessModalOpen}
        onClose={handleCloseSapSuccess}
        size="lg"
        isCentered
        motionPreset="slideInBottom"
        closeOnOverlayClick={false}
      >
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent borderRadius="3xl" overflow="hidden" boxShadow="0 25px 50px -12px rgba(5, 150, 105, 0.35)" border="1px solid" borderColor="#a7f3d0">
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
              <Box
                bg="white"
                p={5}
                borderRadius="2xl"
                border="2px solid"
                borderColor="#6ee7b7"
                boxShadow="0 4px 15px rgba(5, 150, 105, 0.08)"
                textAlign="center"
              >
                <VStack spacing={2}>
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

                  <Text fontSize="xs" fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="wider">
                    Número Oficial de Orden SAP (DocNum)
                  </Text>

                  <HStack justify="center" spacing={3}>
                    <Text fontSize="3xl" fontWeight="900" color="#065f46" fontFamily="mono">
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
                      Vendedor ID: {sapSyncResult?.salesPersonCode || "—"}
                    </Badge>
                  </HStack>
                </VStack>
              </Box>

              <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                  <Box p={2.5} bg="gray.50" borderRadius="lg">
                    <HStack spacing={1.5} mb={0.5}>
                      <ChakraIcon as={Building2} boxSize="13px" color="gray.500" />
                      <Text fontSize="10.5px" fontWeight="700" color="gray.500" textTransform="uppercase">Cliente</Text>
                    </HStack>
                    <Text fontSize="xs" fontWeight="900" color="gray.800" isTruncated maxW="200px">
                      {sapSyncResult?.cardName || "—"}
                    </Text>
                    <Text fontSize="10px" fontWeight="700" color="gray.500">
                      RUC/DNI: {sapSyncResult?.cardCode || "—"}
                    </Text>
                  </Box>

                  <Box p={2.5} bg="#ecfdf5" borderRadius="lg" border="1px solid" borderColor="#a7f3d0">
                    <Text fontSize="10.5px" fontWeight="700" color="#065f46" textTransform="uppercase">Importe Total SAP</Text>
                    <Text fontSize="md" fontWeight="900" color="#064e3b" fontFamily="mono">
                      ${formatThousands(Number(sapSyncResult?.docTotalUSD || 0))} USD
                    </Text>
                  </Box>
                    </Grid>
              </Box>

              <Alert status="success" variant="subtle" borderRadius="xl" p={3} bg="green.50" border="1px solid" borderColor="green.200">
                <AlertIcon color="green.500" boxSize="15px" />
                <Text fontSize="11px" color="green.900" fontWeight="600">
                  <Text as="span" fontWeight="800">✅ Transacción Exitosa:</Text> La orden ha sido registrada oficialmente en SAP Business One y notificada en tiempo real al asesor comercial.
                </Text>
              </Alert>
            </VStack>
          </ModalBody>

          <ModalFooter bg="white" borderTop="1px solid" borderColor="gray.200" py={4} px={6}>
            <Button
              colorScheme="teal"
              bg="#0f5132"
              _hover={{ bg: "#093822" }}
              color="white"
              w="full"
              size="md"
              fontWeight="900"
              borderRadius="xl"
              rightIcon={<ChakraIcon as={ArrowRight} />}
              onClick={handleCloseSapSuccess}
            >
              Ir al Historial de Cotizaciones
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de Observación para Administrador */}
      <ObserveReasonModal
        isOpen={isObserveModalOpen}
        onClose={() => setIsObserveModalOpen(false)}
        quote={currentQuoteObj}
        onConfirmObserve={(quoteOrReason, maybeReason) => {
          const finalReason = typeof maybeReason === "string" ? maybeReason : (typeof quoteOrReason === "string" ? quoteOrReason : "");
          handleObserveFromForm(currentQuoteObj, finalReason);
        }}
      />

      {/* Modal de Rechazo para Administrador */}
      <RejectReasonModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        quoteId={quoteId || docNumber}
        onConfirmReject={(qId, reason) => handleRejectFromForm(qId, reason)}
      />

      {/* MODAL DE ANIMACIÓN DE CARGA AL GUARDAR Y ENVIAR A VALIDACIÓN (MINIATURA) */}
      <Modal
        isOpen={isSendingToValidation}
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
                <ChakraIcon as={Send} boxSize="22px" />
              </Flex>

              <VStack spacing={0.5}>
                <Text fontSize="sm" fontWeight="900" color="gray.800" letterSpacing="-0.01em">
                  {validationLoadingTitle || "Enviando a Validación..."}
                </Text>
                <Text fontSize="10.5px" fontWeight="600" color="gray.500" isTruncated maxW="240px">
                  {validationLoadingSub || `Registrando ${quoteId || docNumber || "cotización"}`}
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
                  {validationStepText || "Notificando a Facturación..."}
                </Text>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
      {/* Modal de Documentos y Cuotas del Cliente */}
      {clientDebtInfo?.matchingClient && (
        <InvoicesModal
          isOpen={isReceivableModalOpen}
          onClose={() => setIsReceivableModalOpen(false)}
          cliente={clientDebtInfo.matchingClient}
          documentos={clientDebtInfo.matchingClient?.documents || []}
        />
      )}
    </VStack>
  );
}
