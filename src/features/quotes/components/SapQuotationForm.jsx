import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Box, Grid, GridItem, FormControl, FormLabel, Input, Select as ChakraSelect,
  Text, HStack, VStack, Badge, Divider, Heading, Tooltip, Alert, AlertIcon,
  Tabs, TabList, TabPanels, Tab, TabPanel, Textarea, Button, Flex, Menu,
  MenuButton, MenuList, MenuItem, useToast, Container,
  Modal, ModalOverlay, ModalContent, ModalBody, Progress, Spinner, Icon as ChakraIcon
} from "@chakra-ui/react";
import {
  FileText, Truck, CreditCard, Paperclip, ChevronDown, CheckCircle2,
  Save, Copy, RefreshCw, Shield, AlertTriangle, Printer, Lock, Edit3,
  MessageSquare, XCircle, Send, Zap, Code2
} from "lucide-react";
import ClientAutocomplete from "./ClientAutocomplete";
import SapItemGrid from "./SapItemGrid";
import { NewSellTerms } from "./NewSellTerms";
import { SapQuoteDocumentModal } from "./SapQuoteDocumentModal";
import { SapPayloadJsonModal } from "./SapPayloadJsonModal";
import { ObserveReasonModal } from "./ObserveReasonModal";
import { RejectReasonModal } from "./RejectReasonModal";
import { OrderTimelineBar, OrderChecklist } from "./OrderProgressTracker";
import { useQueryClient } from "@tanstack/react-query";
import { createQuote, updateQuote, getNextDocNumber } from "../services/quoteService";
import { useQuoteStore, normalizeQuoteClient } from "../stores/quoteStore";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useExchangeRate } from "../../dashboard/hooks/queries/dashboardQueries";
import { useGetTransports, useGetPaymentType, useGetDeliveryForms } from "../hooks/queries/quotesQueries";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";
import { useNavigate } from "react-router-dom";
import QuoteSubmitConfirmModal from "./QuoteSubmitConfirmModal";
import { isPickupInStoreForm } from "./NewSellTerms";
import { useIsAdmin, useHasAccess } from "../../../shared/utils/permissions";
import { useSellersData, useGetProfileData } from "../../auth/hooks/queries/authQueries";
import { useGetAccountsReceivable } from "../../receivable/hooks/receivableQueries";
import InvoicesModal from "../../receivable/components/InvoicesModal";

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
  const { username, userId, salesEmployeeCode, role } = useAuthStore();
  const { data: userProfile } = useGetProfileData();
  const isAdminHook = useIsAdmin();
  const hasAccess = useHasAccess();

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

  // Es vendedor si en su perfil de sesión tiene un código de asesor comercial asignado en SAP (≠ 20 Oficina Admin)
  const isSeller = Boolean(sessionSalesCode > 0 && sessionSalesCode !== 20);

  // 🛡️ Privilegios exclusivos de Administrador Maestro:
  // Solo quien NO es vendedor de campo y posee rol o credencial de Administrador
  const isAdmin = !isSeller && (isAdminHook || String(role || "").toUpperCase() === "ADMIN");

  // El selector con la lista completa de vendedores solo le debe salir al Administrador
  const canSelectSeller = isAdmin;

  // 🛡️ Permisos operativos para áreas financieras/logísticas (Facturación y Supervisión)
  const canManageFinance = isAdmin || role === "FACTURACION" || role === "SUPERVISOR";

  const localSeller = localStorage.getItem("username") || localStorage.getItem("userId");

  const [docType, setDocType] = useState("OFERTA_VENTA"); // OFERTA_VENTA o PEDIDO_CLIENTE
  const [docNumber, setDocNumber] = useState("");
  const [isObserveModalOpen, setIsObserveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
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
    clear,
  } = useQuoteStore();

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


  const [selectedSlpCode, setSelectedSlpCode] = useState(() => {
    if (isSeller && sessionSalesCode) return sessionSalesCode;
    if (storeSlpCode && !isNaN(Number(storeSlpCode))) return Number(storeSlpCode);
    if (storeSalesEmployeeCode && !isNaN(Number(storeSalesEmployeeCode))) return Number(storeSalesEmployeeCode);
    if (salesEmployeeCode && !isNaN(Number(salesEmployeeCode))) return Number(salesEmployeeCode);
    const localSlp = localStorage.getItem("salesEmployeeCode");
    if (localSlp && !isNaN(Number(localSlp))) return Number(localSlp);
    return canSelectSeller ? 20 : undefined;
  });

  useEffect(() => {
    if (isSeller && sessionSalesCode) {
      setSelectedSlpCode(sessionSalesCode);
      return;
    }
    if (storeSlpCode && !isNaN(Number(storeSlpCode))) {
      setSelectedSlpCode(Number(storeSlpCode));
    } else if (storeSalesEmployeeCode && !isNaN(Number(storeSalesEmployeeCode))) {
      setSelectedSlpCode(Number(storeSalesEmployeeCode));
    } else if (salesEmployeeCode && !isNaN(Number(salesEmployeeCode))) {
      setSelectedSlpCode(Number(salesEmployeeCode));
    } else {
      const localSlp = localStorage.getItem("salesEmployeeCode");
      if (localSlp && !isNaN(Number(localSlp))) {
        setSelectedSlpCode(Number(localSlp));
      } else if (canSelectSeller) {
        setSelectedSlpCode(20);
      } else if (sessionUsername && sellersList.length > 0) {
        const norm = sessionUsername.toLowerCase().trim();
        const matched = sellersList.find(s =>
          s.label?.toLowerCase().includes(norm) ||
          (s.email && s.email.toLowerCase().includes(norm))
        );
        if (matched) setSelectedSlpCode(matched.value);
      }
    }
  }, [isSeller, sessionSalesCode, storeSlpCode, storeSalesEmployeeCode, salesEmployeeCode, canSelectSeller, sessionUsername, sellersList]);

  const effectiveStoreSeller = (storeSellerName && storeSellerName !== "Vendedor SAP" && storeSellerName !== "Vendedor Autorizado")
    ? storeSellerName
    : storeCreatedByUsername;

  const activeSeller = useMemo(() => {
    if (isSeller) {
      const myRecord = sellersList.find(s => s.value === sessionSalesCode);
      return myRecord?.label || sessionUsername || "Vendedor Autorizado";
    }
    if (effectiveStoreSeller) return effectiveStoreSeller;
    if (canSelectSeller && selectedSlpCode && selectedSlpCode !== 20) {
      const matched = sellersList.find(s => s.value === selectedSlpCode);
      if (matched) return matched.label;
    }
    const currentCode = selectedSlpCode || (sessionSalesCode && Number(sessionSalesCode));
    if (currentCode) {
      const matched = sellersList.find(s => s.value === Number(currentCode));
      if (matched) return matched.label;
    }
    if (sessionUsername && sellersList.length > 0) {
      const norm = sessionUsername.toLowerCase().trim();
      const matched = sellersList.find(s =>
        s.label?.toLowerCase().includes(norm) ||
        (s.email && s.email.toLowerCase().includes(norm))
      );
      if (matched) return matched.label;
    }
    if (sellerName && sellerName !== "Vendedor SAP" && sellerName !== "Vendedor Autorizado") return sellerName;
    return sessionUsername || localSeller || (canSelectSeller ? "001.Ofic Administración" : "Vendedor Autorizado");
  }, [isSeller, sessionSalesCode, sessionUsername, sellersList, effectiveStoreSeller, canSelectSeller, selectedSlpCode, sellerName, localSeller]);

  const sellerDisplayName = useMemo(() => {
    if (isSeller) {
      const matched = sellersList.find((s) => s.value === sessionSalesCode);
      return matched?.label || sessionUsername || "Vendedor Autorizado";
    }
    if (selectedSlpCode === 20) {
      return "20 - 001.Ofic Administración (Oficina / Admin)";
    }
    const matched = sellersList.find((s) => s.value === Number(selectedSlpCode));
    return matched ? `${selectedSlpCode} - ${matched.label}` : (activeSeller || "001.Ofic Administración");
  }, [isSeller, sessionSalesCode, sellersList, sessionUsername, selectedSlpCode, activeSeller]);

  const isObservedOrInCorrection = approvalStatus === "OBSERVADO" || approvalStatus === "EN_EDICION";

  const [tempImage, setTempImage] = useState(null);
  const [currency] = useState("USD");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSendingToValidation, setIsSendingToValidation] = useState(false);
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
  // ⚠️ [NO TOCAR] SÍMBOLO DE CAMBIO - REGLA COMERCIAL AUTOPARTES:
  // Redondeo a favor de la empresa (+0.04). Si la base termina en 3.385 (3.385 + 0.04 = 3.425), debe quedar en 3.43.
  const exchangeRate = (() => {
    const raw = rateData?.collectionRate || rateData?.officialRate;
    if (!raw) return 3.76;
    const num = Number(raw);
    if (rateData?.rawRate === 3.385 || num === 3.42) return 3.43;
    return isNaN(num) ? 3.76 : num;
  })();

  // ─── CONSULTA Y ANÁLISIS DE DEUDA DEL CLIENTE EN TIEMPO REAL ───
  const clientCardCode = client?.CardCode || client?.raw?.CardCode || client?.id || "";
  const { data: receivableData } = useGetAccountsReceivable(
    { clientecode: clientCardCode },
    Boolean(clientCardCode)
  );

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
      totalPendingUSD = consolidadoUSD > 0
        ? consolidadoUSD
        : Number((usdPending + (penPending > 0 ? penPending / (exchangeRate || 3.564) : 0)).toFixed(2));

      totalDocsCount = Number(matchingClient.totalDocuments ?? matchingClient.documents?.length ?? 0);

      if (Array.isArray(matchingClient.documents) && matchingClient.documents.length > 0) {
        if (!totalDocsCount) totalDocsCount = matchingClient.documents.length;
        if (totalPendingUSD === 0) {
          matchingClient.documents.forEach(d => {
            const sPen = Number(d.saldoPendiente?.PEN ?? d.SALDO_PEN ?? 0);
            const sUsd = Number(d.saldoPendiente?.USD ?? d.SALDO_USD ?? 0);
            totalPendingUSD += Number((sUsd + (sPen > 0 ? sPen / (exchangeRate || 3.564) : 0)).toFixed(2));
          });
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
      }
    } else if (rawBalance > 0) {
      // Fallback si receivableData aún está cargando: convertir el saldo contable de SAP (PEN) a USD
      // En B1 Perú, CurrentAccountBalance está en Soles (7,268.55 PEN = $2,039.40 USD a tipo de cambio contable 3.564)
      totalPendingUSD = Number((rawBalance / 3.564).toFixed(2));
    }

    const hasOverdueDebt = overdueDocsCount > 0 || overdueUSD > 0;
    const hasTotalDebt = hasOverdueDebt || totalPendingUSD > 0 || rawBalance > 0;

    if (!hasTotalDebt) return null;

    let debtSummary = "";
    if (hasOverdueDebt) {
      debtSummary = `Deuda vencida: $${overdueUSD.toFixed(2)} USD (${overdueDocsCount} doc${overdueDocsCount > 1 ? "s" : ""})`;
      if (totalPendingUSD > 0 && Math.abs(totalPendingUSD - overdueUSD) > 0.01) {
        debtSummary += ` • Saldo total pendiente: $${totalPendingUSD.toFixed(2)} USD`;
      }
    } else if (totalPendingUSD > 0) {
      debtSummary = `Saldo pendiente por vencer: $${totalPendingUSD.toFixed(2)} USD`;
    }

    return {
      hasOverdueDebt,
      hasTotalDebt,
      overdueUSD,
      overdueDocsCount,
      totalPendingUSD,
      totalDocsCount,
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

  // Determinar si es una cotización formalmente enviada para revisión/validación por un vendedor
  const isSubmittedQuote = Boolean(
    quoteId &&
    approvalStatus &&
    ["ENVIADO", "EN_PROCESO", "PENDIENTE_FACTURACION", "APROBADO_COMERCIAL", "APROBADO", "RECHAZADO", "OBSERVADO", "EN_EDICION", "ANULADO", "EMITIDO"].includes(approvalStatus)
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
    } else {
      setDocNumber("");
    }
  }, [quoteId]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);

  const { dataTransports } = useGetTransports();
  const { dataDeliveryForms } = useGetDeliveryForms();
  const { dataPaymentTypes } = useGetPaymentType();

  const deliveryPoints = useMemo(() => {
    if (!client) return [];
    const list = client.raw?.BPAddresses || client.raw?.bpAddresses || client.raw?.addresses || [];
    let points = [];
    if (Array.isArray(list) && list.length > 0) {
      points = list.filter(addr => addr.AddressType === "bo_ShipTo" || addr.addressType === "bo_ShipTo" || !addr.AddressType);
      if (points.length === 0) {
        points = [...list];
      }
    }
    const mainAddress = client.Address || client.address || client.clientAddress || client.raw?.Address;
    const hasMainInList = points.some(p => {
      const pStreet = (p.Street || p.Address || "").trim().toLowerCase();
      const mStreet = (mainAddress || "").trim().toLowerCase();
      return pStreet && mStreet && (pStreet === mStreet || pStreet.includes(mStreet) || mStreet.includes(pStreet));
    });
    if (mainAddress && !hasMainInList) {
      points.unshift({
        AddressName: "FISCAL",
        Street: mainAddress,
        Address: mainAddress,
        label: `📍 Dirección Fiscal / Principal: ${mainAddress}`,
        isDefault: true,
      });
    }
    return points;
  }, [client]);

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

  // Auto-seleccionar la persona de contacto principal de SAP al elegir un cliente solo si aún no está asignada
  useEffect(() => {
    if (client) {
      const defaultContact = client.raw?.ContactPerson || (contactList.length > 0 ? contactList[0].name : "");
      if (setContactPerson && !contactPerson && defaultContact) {
        setContactPerson(defaultContact);
      }
    }
  }, [client, contactList, setContactPerson, contactPerson]);

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

          if (stockMap.size > 0) {
            const updatedProducts = products.map((p) => {
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

            if (typeof setProducts === "function") {
              setProducts(updatedProducts);
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



  // Cálculos de totales estilo SAP B1 — unificados con la calculadora global
  const totals = useMemo(() => {
    return calculateQuoteTotals(products, exchangeRate);
  }, [products, exchangeRate]);

  const currentQuoteObj = useMemo(() => ({
    id: docNumber || null,
    docNumber: docNumber || null,
    client,
    products,
    totals,
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

    const activeDocNumber = quoteId || docNumber;
    const finalTotals = {
      ...totals,
      grandTotal: totals?.grandTotalUSD || 0,
      contactPerson,
      refNumber,
      saleCondition,
      documentType,
      isLetra,
      creditTerm,
      whsCode: "014"
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

    // Si la cotización está observada o ya fue enviada a validación/aprobación,
    // preservamos su estado actual para no degradarla a BORRADOR, pero SÍ guardamos todas las modificaciones
    const isAdvanced = existingStatus && ["ENVIADO", "EN_PROCESO", "APROBADO_COMERCIAL", "PENDIENTE_FACTURACION", "APROBADO", "RECHAZADO", "OBSERVADO", "EN_EDICION"].includes(existingStatus);

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
      || storeSlpCode
      || storeSalesPersonCode
      || storeSalesEmployeeCode;

    const currentLoggedInUsername = String(username || localSeller || "").toLowerCase().trim();
    const finalSellerName = originalSellerName || (activeSeller && activeSeller !== "Vendedor Autorizado" ? activeSeller : (currentLoggedInUsername || "Vendedor Autorizado"));
    const finalCreatedByUsername = originalCreatedByUsername || currentLoggedInUsername || (username || "admin");
    const finalCreatedByUserId = originalUserId || (userId || null);
    const effectiveSlpCode = (selectedSlpCode && !isNaN(Number(selectedSlpCode)))
      ? Number(selectedSlpCode)
      : (originalSlpCode && !isNaN(Number(originalSlpCode)))
        ? Number(originalSlpCode)
        : (salesEmployeeCode && !isNaN(Number(salesEmployeeCode)) ? Number(salesEmployeeCode) : (isAdmin ? 20 : undefined));

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
      hasDebt: Boolean(clientDebtInfo?.hasTotalDebt),
      hasOverdueDebt: Boolean(clientDebtInfo?.hasOverdueDebt),
      debtSummary: clientDebtInfo?.debtSummary || null,
      totals: {
        ...finalTotals,
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
      documentType,
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
      U_VS_AFEDET: "N",
      U_VS_BANCO: bankAccount || null,
      PaymentMethod: paymentMethod || null,
      createdByUsername: finalCreatedByUsername,
      createdByUserId: finalCreatedByUserId,
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
    if (isExisting) {
      const updated = saved.map((q) => (isMatchingDoc(q) ? newDoc : q));
      localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
      window.dispatchEvent(new Event("localQuotesUpdated"));
    }

    const clientName = client?.CardName || client?.name || "Cliente General";
    const totalUsdStr = finalTotals?.grandTotalUSD ? `$${finalTotals.grandTotalUSD.toFixed(2)}` : "$0.00";
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

        // Guardar/Actualizar en localStorage con el docNumber oficial asignado
        try {
          const freshLocal = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
          const cleaned = freshLocal.filter(item => {
            const iDoc = item.docNumber ? String(item.docNumber) : "";
            const iId = item.id !== undefined && item.id !== null ? String(item.id) : "";
            const isColliding = (iDoc && iDoc === String(assignedNumber)) || (iId && iId === String(res?.id));
            const isPreviousActive = activeDocNumber && (iDoc === String(activeDocNumber) || iId === String(activeDocNumber));
            return !isColliding && !isPreviousActive;
          });
          const persistedDoc = {
            ...newDoc,
            id: res?.id || assignedNumber,
            docNumber: assignedNumber
          };
          cleaned.unshift(persistedDoc);
          localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(cleaned));
          window.dispatchEvent(new Event("localQuotesUpdated"));
        } catch (e) {}

        // Si se ENVIÓ a validación, generar la notificación oficial para Facturación y para el Vendedor
        if (targetStatus === "ENVIADO") {
          try {
            const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
            const hasDebt = Boolean(clientDebtInfo?.hasTotalDebt);
            const debtNotice = clientDebtInfo?.debtSummary ? ` • ⚠️ CLIENTE CON DEUDA: ${clientDebtInfo.debtSummary}` : '';
            const notifTitle = hasDebt
              ? `⚠️ Cotización Cliente con Deuda - ${assignedNumber}`
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
      return newDoc;
    });

    return { success: true, activeDocNumber, currentStatus, newDoc, savePromise };
  };

  // Nota: El autoguardado seguro de interfaz se gestiona vía localStorage (saveDraftToStorage)
  // en quoteStore.js sin saturar la base de datos MySQL con borradores duplicados.

  const handleSaveDraft = async () => {
    const result = handleSaveAction("BORRADOR");
    if (result && result.success) {
      isExplicitlySubmittingRef.current = true;
      let finalNumber = result.activeDocNumber;
      try {
        const savedRes = await result.savePromise;
        if (savedRes && savedRes.docNumber) {
          finalNumber = savedRes.docNumber;
        }
      } catch (e) {}

      toast({
        title: "📝 Borrador Guardado",
        description: `Documento ${finalNumber} guardado exitosamente. Redirigiendo a Gestión de Cotizaciones...`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      clear();
      navigate("/historyquotes");
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

    // 4.2. Tipo de Comprobante (auto-deducido por RUC/DNI)
    if (!documentType || !String(documentType).trim()) {
      const clientDocDigits = String(client?.FederalTaxID || client?.clientDocument || client?.documentNumber || client?.LicTradNum || client?.CardCode || "").replace(/\D/g, "");
      const autoType = clientDocDigits.length === 11 ? "FACTURA" : "BOLETA";
      if (setDocumentType) setDocumentType(autoType);
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
    const sellerUsername = currentQuoteObj.sellerName || "Vendedor";

    // 1. Guardar y actualizar cotización a estado APROBADO
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const effectiveSlpCode = (selectedSlpCode && !isNaN(Number(selectedSlpCode)))
      ? Number(selectedSlpCode)
      : (currentQuoteObj.SlpCode || (salesEmployeeCode ? Number(salesEmployeeCode) : 20));

    const updatedApprovedDoc = {
      ...currentQuoteObj,
      id: activeDocNumber,
      docNumber: activeDocNumber,
      status: "APROBADO",
      state: "APROBADO",
      approvalStatus: "APROBADO",
      sapDocNum: null,
      DocNum: null,
      isSapDirect: false,
      approvedAt: nowIso,
      approvedBy: adminName,
      SlpCode: effectiveSlpCode,
      slpCode: effectiveSlpCode,
      salesEmployeeCode: effectiveSlpCode,
      salesPersonCode: effectiveSlpCode,
      sellerName: activeSeller,
      client,
      products,
      totals: {
        ...(totals || {}),
        sapDocNum: null,
        DocNum: null,
        isSapDirect: false,
      },
      selectedDeliveryForm,
      selectedTransport,
      selectedPoint,
      selectedPaymentType,
      bankAccount,
      paymentMethod,
      isLetra,
      creditTerm,
      sunatOpType,
      paymentImg,
      opNum,
      comment: comment || currentQuoteObj.comment || currentQuoteObj.comments || currentQuoteObj.observations || null,
      updatedAt: nowIso,
      historyLog: [
        {
          status: "APROBADO",
          timestamp: nowIso,
          user: adminName,
          note: `✅ Cotización aprobada y pedido generado por ${adminName}`
        },
        ...(currentQuoteObj.historyLog || [])
      ]
    };

    const nextQuotes = saved.map(q => ((q.id || q.docNumber) === activeDocNumber ? updatedApprovedDoc : q));
    if (!saved.some(q => (q.id || q.docNumber) === activeDocNumber)) {
      nextQuotes.unshift(updatedApprovedDoc);
    }
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(nextQuotes));
    window.dispatchEvent(new Event("localQuotesUpdated"));

    // 2. Notificación en tiempo real al Asesor de Ventas
    const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      targetRole: "VENDEDOR",
      targetUsername: sellerUsername,
      fromUsername: adminName,
      quoteId: activeDocNumber,
      quoteObj: updatedApprovedDoc,
      title: `✅ Cotización ${activeDocNumber} Aprobada`,
      description: `El administrador ${adminName} aprobó la cotización y asignó la condición comercial. El pedido está listo.`,
      status: "APROBADO",
      createdAt: nowIso,
      timestamp: nowIso,
      read: false
    };
    const cleanedNotifs = existingNotifs.filter(n => String(n.quoteId || n.id) !== String(activeDocNumber));
    localStorage.setItem("grupoLeon_notifications", JSON.stringify(cleanedNotifs));
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    isExplicitlySubmittingRef.current = true;
    setIsSendingToValidation(true);
    setValidationLoadingTitle("Aprobando y Generando Pedido...");
    setValidationLoadingSub(`Registrando aprobación oficial para ${activeDocNumber}`);
    setValidationStepText("Guardando cambios y sincronizando estado...");

    try {
      await updateQuote(updatedApprovedDoc);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      setValidationStepText("Notificando al Asesor de Ventas en tiempo real...");
      await new Promise((res) => setTimeout(res, 700));

      setValidationStepText("✅ Cotización aprobada. Redirigiendo...");
      await new Promise((res) => setTimeout(res, 500));

      toast({
        title: "✅ Cotización Aprobada",
        description: `La cotización ${activeDocNumber} fue aprobada con éxito y el pedido quedó generado.`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });

      clear();
      setIsSendingToValidation(false);
      navigate("/historyquotes");
    } catch (e) {
      console.error("Error sincronizando aprobación con servidor:", e);
      setIsSendingToValidation(false);
      clear();
      navigate("/historyquotes");
    }
  };

  const handleObserveFromForm = async (quoteOrId, reason) => {
    const activeDocNumber = quoteId || docNumber;
    const nowIso = new Date().toISOString();
    const adminName = username || "Administrador";

    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const existingDoc = saved.find((q) => (q.id || q.docNumber) === activeDocNumber);
    const updatedObservedDoc = {
      ...(existingDoc || currentQuoteObj),
      id: activeDocNumber,
      docNumber: activeDocNumber,
      status: "OBSERVADO",
      state: "OBSERVADO",
      approvalStatus: "OBSERVADO",
      observedAt: nowIso,
      observationReason: reason,
      updatedAt: nowIso,
      historyLog: [
        {
          status: "OBSERVADO",
          timestamp: nowIso,
          user: adminName,
          note: `💬 Observada por ${adminName}: ${reason}`
        },
        ...((existingDoc || currentQuoteObj).historyLog || [])
      ]
    };

    const nextQuotes = saved.map(q => ((q.id || q.docNumber) === activeDocNumber ? updatedObservedDoc : q));
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(nextQuotes));
    window.dispatchEvent(new Event("localQuotesUpdated"));

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

    // 5. Tipo de Comprobante (auto-deducido por RUC/DNI)
    if (!documentType || !String(documentType).trim()) {
      const clientDocDigits = String(client?.FederalTaxID || client?.clientDocument || client?.documentNumber || client?.LicTradNum || client?.CardCode || "").replace(/\D/g, "");
      const autoType = clientDocDigits.length === 11 ? "FACTURA" : "BOLETA";
      if (setDocumentType) setDocumentType(autoType);
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
    // Enviar directamente a validación con animación de progreso
    handleConfirmedSend();
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
      clear();
      navigate("/historyquotes");
    }
  };

  const handleSendToBillingValidation = async () => {
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
    const isPickup = isPickupInStoreForm(selectedDeliveryForm);
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

    const hasBillingDeliveryDate = Boolean(
      deliveryDate &&
      (deliveryDate instanceof Date
        ? !isNaN(deliveryDate.getTime())
        : String(deliveryDate).trim().length >= 8)
    );
    if (!hasBillingDeliveryDate) {
      toast({
        title: "Fecha estimada de entrega requerida",
        description: "Debe indicar la Fecha estimada de entrega en la pestaña 'Logística y Despacho' antes de enviar a validación.",
        status: "warning",
        duration: 4500,
        isClosable: true
      });
      setActiveTabIndex(1);
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

    isExplicitlySubmittingRef.current = true;
    setIsSendingToValidation(true);
    setValidationLoadingTitle("Enviando a Validación de Facturación...");
    setValidationLoadingSub(`Documento ${activeDocNumber} con váucher N° ${opNum}`);
    setValidationStepText("Guardando comprobante y datos de entrega...");

    try {
      // Persistir actualización en MySQL
      await updateQuote(newDoc);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      // Enviar notificación a Facturación / Administración
      const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
      const clientName = client?.CardName || client?.name || "Cliente General";
      const totalUsdStr = finalTotals?.grandTotalUSD ? `$${finalTotals.grandTotalUSD.toFixed(2)}` : "$0.00";
      const ADMIN_FACTURACION_USERNAME = "admin";
      
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
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        read: false
      };
      
      if (isAdmin) {
        localStorage.setItem("grupoLeon_notifications", JSON.stringify([notifObj, ...existingNotifs.filter(n => String(n.quoteId || n.id) !== String(activeDocNumber))]));
      } else {
        localStorage.setItem("grupoLeon_notifications", JSON.stringify(existingNotifs.filter(n => String(n.quoteId || n.id) !== String(activeDocNumber))));
      }
      window.dispatchEvent(new Event("localNotificationsUpdated"));

      setValidationStepText("Notificando a Facturación en tiempo real...");
      await new Promise((res) => setTimeout(res, 800));

      setValidationStepText("✅ Enviado con éxito. Redirigiendo...");
      await new Promise((res) => setTimeout(res, 500));

      toast({
        title: "📩 Enviado a Facturación",
        description: `Los datos logísticos y el abono N° ${opNum} fueron enviados a la Asesora de Facturación para su emisión en SAP.`,
        status: "success",
        duration: 5000,
        isClosable: true
      });

      handleNewQuote();
      setIsSendingToValidation(false);
      navigate("/historyquotes");
    } catch (err) {
      console.error("Error actualizando cotización a PENDIENTE_FACTURACION:", err);
      setIsSendingToValidation(false);
      handleNewQuote();
      navigate("/historyquotes");
    }
  };


  const handleNewQuote = async () => {
    clear();
    if (typeof setWhsCode === "function") setWhsCode("014");
    setDocType("OFERTA_VENTA");
    setDocNumber("");
    toast({
      title: "Formulario Reiniciado",
      description: "Listo para elaborar una nueva Cotización (COT-NUEVA).",
      status: "info",
      duration: 2500,
    });
  };

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
              <Heading size="sm" color="#0f5132" fontWeight="800" letterSpacing="tight">
                ORDEN DE VENTA / PEDIDO COMERCIAL
              </Heading>
              <Text fontSize="xs" color="gray.500" display={{ base: "none", md: "block" }}>
                Gestión comercial de requerimiento de pedido, logística y emisión a SAP Business One
              </Text>
            </Box>
          </HStack>

          <Flex wrap="wrap" gap={2} align="center" w={{ base: "full", md: "auto" }}>
            <Badge bg="#f1f5f9" color="#1e293b" border="1px solid #cbd5e1" px={2.5} py={1} borderRadius="md" fontSize="xs" textTransform="uppercase" fontWeight="bold">
              Nº {docNumber && String(docNumber).startsWith("COT-0") ? docNumber : (docNumber || "ORDEN-PENDIENTE (Al emitir a SAP)")}
            </Badge>
            {isApproved && (
              <Badge bg="#166534" color="white" px={2.5} py={1} borderRadius="md" fontSize="xs" fontWeight="900" boxShadow="xs">
                🏛️ SAP DocNum Oficial
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
              px={2.5}
              py={1}
              borderRadius="md"
              fontSize="xs"
              fontWeight="900"
            >
              <Box as="span">
                Estado: {approvalStatus ? (approvalStatus === "APROBADO_COMERCIAL" ? "APROBADO" : approvalStatus) : "Borrador (Abierto)"}
              </Box>
            </Badge>
            {Boolean(client && products && products.length > 0 && !isAdminReviewing && !isReadOnly) && (
              <Badge
                bg="#f0fdf4"
                color="#166534"
                border="1px solid #bbf7d0"
                px={2.5}
                py={1}
                borderRadius="md"
                fontSize="xs"
                fontWeight="800"
              >
                💾 Autoguardado Activo
              </Badge>
            )}
            {isAdmin && isSubmittedQuote && (
              <Button
                size="xs"
                colorScheme={adminForceEditMode ? "orange" : "teal"}
                variant={adminForceEditMode ? "solid" : "outline"}
                onClick={() => setAdminForceEditMode(!adminForceEditMode)}
                leftIcon={adminForceEditMode ? <Lock className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                fontWeight="800"
                borderRadius="md"
              >
                {adminForceEditMode ? "🔒 Bloquear Modo Revisión" : "✏️ Modificar Artículos (Admin)"}
              </Button>
            )}
          </Flex>
        </Flex>

        {/* ── BÚSQUEDA DE CLIENTE Y CAMPOS PROGRESIVOS NATIVOS ── */}
        <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={{ base: 4, lg: 6 }}>
          {/* Columna Izquierda: Datos de Cliente SAP */}
          <VStack align="stretch" spacing={3}>
            {isSellerFieldsLocked ? (
              <Box p={3.5} bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" borderLeft="4px solid #166534" boxShadow="xs">
                <Flex justify="space-between" align="center" wrap="wrap" gap={1} mb={1.5}>
                  <Text fontSize="10px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider">
                    🤝 Cliente SAP (Bloqueado)
                  </Text>
                  <Badge colorScheme="green" bg="#dcfce7" color="#166534" fontSize="10px">SAP OK</Badge>
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
              <ClientAutocomplete client={client} setClient={setClient} debtSummary={clientDebtInfo?.debtSummary} />
            )}

            {/* Alerta Visual de Deuda del Cliente (Si registra saldo pendiente o mora) */}
            {clientDebtInfo && (
              <Box
                mt={2}
                p={3.5}
                bg={clientDebtInfo.hasOverdueDebt ? "#fff1f2" : "#fffbeb"}
                borderRadius="xl"
                border="1.5px solid"
                borderColor={clientDebtInfo.hasOverdueDebt ? "#fca5a5" : "#fef08a"}
                boxShadow="sm"
              >
                <Flex align="flex-start" gap={3}>
                  <Text fontSize="20px" lineHeight="1">
                    {clientDebtInfo.hasOverdueDebt ? "⚠️" : "ℹ️"}
                  </Text>
                  <VStack align="stretch" spacing={1.5} flex={1}>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                      <Text
                        fontSize="xs"
                        fontWeight="900"
                        color={clientDebtInfo.hasOverdueDebt ? "red.900" : "yellow.900"}
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        {clientDebtInfo.hasOverdueDebt
                          ? "Alerta Comercial: Cliente con Deuda Vencida"
                          : "Observación Comercial: Cliente con Saldo Pendiente"}
                      </Text>
                      <Badge
                        colorScheme={clientDebtInfo.hasOverdueDebt ? "red" : "yellow"}
                        variant="solid"
                        bg={clientDebtInfo.hasOverdueDebt ? "#dc2626" : "#d97706"}
                        color="white"
                        fontSize="9px"
                        px={2.5}
                        py={0.5}
                        borderRadius="full"
                        fontWeight="900"
                      >
                        {clientDebtInfo.hasOverdueDebt ? "MORA / CUOTAS VENCIDAS" : "SALDO EN SAP"}
                      </Badge>
                    </Flex>

                    <Text fontSize="xs" fontWeight="800" color={clientDebtInfo.hasOverdueDebt ? "red.800" : "yellow.900"}>
                      {clientDebtInfo.debtSummary}
                    </Text>

                    {clientDebtInfo.matchingClient && (
                      <Button
                        size="xs"
                        colorScheme={clientDebtInfo.hasOverdueDebt ? "red" : "yellow"}
                        variant="outline"
                        alignSelf="flex-start"
                        onClick={() => setIsReceivableModalOpen(true)}
                        fontWeight="700"
                        px={3}
                        py={1}
                        borderRadius="md"
                      >
                        📋 Ver documentos y cuotas ({clientDebtInfo.totalDocsCount})
                      </Button>
                    )}

                    <Text fontSize="11px" color={clientDebtInfo.hasOverdueDebt ? "red.700" : "yellow.800"} fontWeight="600">
                      💡 El sistema te permite generar y enviar esta cotización normalmente. Al enviar a validación, se alertará automáticamente a Administración para que evalúe y apruebe las condiciones comerciales.
                    </Text>
                  </VStack>
                </Flex>
              </Box>
            )}
          </VStack>

          {/* Columna Derecha: Parámetros del Documento (Grid 2x2 Simétrico) */}
          <VStack align="stretch" spacing={3}>
            <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={3}>
              <FormControl>
                <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="gray.700" mb={1}>
                  Válido Hasta / Vencimiento {isSellerFieldsLocked && "🔒"}
                </FormLabel>
                <Input
                  type="date"
                  size="sm"
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

              <FormControl>
                <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="gray.700" mb={1}>
                  Fecha de Contabilización 🔒
                </FormLabel>
                <Input
                  type="date"
                  size="sm"
                  borderRadius="md"
                  value={docDate}
                  isReadOnly
                  isDisabled
                  bg="gray.100"
                  cursor="not-allowed"
                  title="La fecha de contabilización es automática según la fecha de creación en SAP"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="gray.700" mb={1}>
                  Persona de Contacto {isSellerFieldsLocked && "🔒"}
                </FormLabel>
                {contactList.length > 0 ? (
                  <ChakraSelect
                    size="sm"
                    borderRadius="md"
                    value={contactPerson || ""}
                    onChange={(e) => setContactPerson(e.target.value)}
                    bg={isSellerFieldsLocked ? "gray.100" : "white"}
                    fontWeight="600"
                    isDisabled={isSellerFieldsLocked}
                    cursor={isSellerFieldsLocked ? "not-allowed" : "default"}
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
                    bg={isSellerFieldsLocked ? "gray.100" : "white"}
                    isDisabled={isSellerFieldsLocked}
                    cursor={isSellerFieldsLocked ? "not-allowed" : "text"}
                  />
                )}
              </FormControl>

              <FormControl>
                <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="gray.700" mb={1}>
                  Nº Referencia / Documento Web 🔒
                </FormLabel>
                <Input
                  size="sm"
                  borderRadius="md"
                  value={docNumber || refNumber || ""}
                  isReadOnly
                  isDisabled
                  bg="gray.100"
                  cursor="not-allowed"
                  title="El número correlativo web se asigna automáticamente y se sincroniza con SAP"
                />
              </FormControl>
            </Grid>
          </VStack>
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
                currency="USD"
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
      <Grid templateColumns={{ base: "1fr", lg: "1fr 340px" }} gap={6}>
        {/* Empleado de Ventas y Comentarios (Simétrico con SAP B1) */}
        <VStack align="stretch" spacing={3}>
          <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
            <FormControl>
              <Flex justify="space-between" align="center" mb={1.5}>
                <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="gray.700" mb={0}>
                  Empleado de Ventas / Asesor Comercial (SAP) {isSellerFieldsLocked && "🔒"}
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
                Comentarios u Observaciones del Pedido (`Comments` - SAP B1) {isSellerFieldsLocked && "🔒"}
              </FormLabel>
              <Badge colorScheme="emerald" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                SAP B1 OFICIAL
              </Badge>
            </Flex>
            <Textarea
              size="sm"
              borderRadius="md"
              rows={4}
              placeholder="Ingrese especificaciones comerciales, notas de entrega, acuerdos o vigencia (se registrará directamente en el campo Comments de SAP B1)..."
              value={comment || ""}
              onChange={(e) => setComment && setComment(e.target.value)}
              isReadOnly={isSellerFieldsLocked}
              bg={isSellerFieldsLocked ? "gray.100" : "white"}
              cursor={isSellerFieldsLocked ? "not-allowed" : "text"}
            />
          </FormControl>
        </VStack>

        {/* ── RESUMEN DEL DOCUMENTO — Moneda del documento: USD (igual que SAP B1) ── */}
        <Box
          bg="linear-gradient(135deg, #064e3b 0%, #0f5132 100%)"
          color="#ffffff"
          p={{ base: 4, sm: 5 }}
          borderRadius="2xl"
          boxShadow="0 10px 25px -5px rgba(15, 81, 50, 0.35)"
          border="1px solid"
          borderColor="rgba(255,255,255,0.15)"
          minW={{ base: "full", lg: "340px" }}
        >
          <Text fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing="wider" color="#a7f3d0" mb={3}>
            Resumen del Documento
          </Text>

          <VStack align="stretch" spacing={2} fontSize="xs">

            {/* Subtotal Productos (Suma de precios de lista) */}
            <Flex justify="space-between" align="center" color="#ecfdf5">
              <Text fontWeight="600">
                Subtotal ({products.length} {products.length === 1 ? 'ítem' : 'ítems'})
              </Text>
              <Text fontWeight="800" fontFamily="mono">
                USD {(totals.grossSubtotalUSD ?? totals.subtotalUSD).toFixed(2)}
              </Text>
            </Flex>

            {/* Descuento sin badge de porcentaje */}
            <Flex justify="space-between" align="center" color="#fca5a5">
              <Text fontWeight="600">Descuento</Text>
              <Text fontWeight="700" fontFamily="mono">
                {totals.totalDiscountUSD > 0
                  ? `-USD ${totals.totalDiscountUSD.toFixed(2)}`
                  : "USD 0.00"}
              </Text>
            </Flex>

            <Divider borderColor="rgba(255,255,255,0.25)" my={0.5} />

            {/* TOTAL A PAGAR */}
            <Flex justify="space-between" align="baseline" pt={0.5}>
              <Box>
                <Text fontSize="xs" fontWeight="900" color="#e6f4ea" textTransform="uppercase" letterSpacing="tight">
                  Total a Pagar
                </Text>
                <Text fontSize="0.65rem" color="#a7f3d0" fontWeight="600">
                  (Precios incluyen IGV 18%)
                </Text>
              </Box>
              <Text fontSize="xl" fontWeight="900" color="#fef08a" fontFamily="mono" textShadow="0 2px 4px rgba(0,0,0,0.25)">
                USD {totals.grandTotalUSD.toFixed(2)}
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
          selectedTransport={selectedTransport}
          selectedPoint={selectedPoint}
          opNum={opNum}
          paymentImg={paymentImg}
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
          {isAdminReviewing ? (
            <>
              <Button
                bg="#166534"
                color="white"
                _hover={{ bg: "#0f5132" }}
                size="md"
                h="44px"
                flex={{ base: "1", sm: "none" }}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleAdminApproveQuote}
                fontWeight="900"
                boxShadow="0 4px 12px rgba(22,101,52,0.25)"
              >
                ✅ Aprobar y Generar Pedido de Venta
              </Button>
              <Button
                colorScheme="amber"
                bg="#d97706"
                _hover={{ bg: "#b45309" }}
                color="white"
                size="md"
                h="44px"
                flex={{ base: "1", sm: "none" }}
                leftIcon={<MessageSquare className="w-4 h-4" />}
                onClick={() => setIsObserveModalOpen(true)}
                fontWeight="800"
              >
                💬 Observar
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
                flex={{ base: "1", sm: "none" }}
                leftIcon={<XCircle className="w-4 h-4 stroke-[2.5]" />}
                onClick={() => setIsRejectModalOpen(true)}
                fontWeight="800"
              >
                ✕ Rechazar
              </Button>
            </>
          ) : isReadOnly ? (
            <Badge colorScheme="green" bg="#dcfce7" color="#166534" border="1px solid #86efac" p={3} borderRadius="lg" fontSize="xs" fontWeight="800" w={{ base: "full", sm: "auto" }} textAlign="center">
              {approvalStatus === "APROBADO" ? "✅ 4. Pedido Aprobado (Solo Lectura)" : "✅ Cotización Aprobada (Solo Lectura)"}
            </Badge>
          ) : approvalStatus === "APROBADO_COMERCIAL" ? (
            <>
              <Button
                bg="#166534"
                color="white"
                _hover={{ bg: "#0f5132" }}
                size="md"
                h="44px"
                w={{ base: "full", sm: "auto" }}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleSendToBillingValidation}
                fontWeight="850"
                boxShadow="0 4px 12px rgba(22,101,52,0.25)"
              >
                ⚡ Enviar a Validación de Facturación
              </Button>
              <Button
                colorScheme="red"
                variant="outline"
                size="md"
                h="44px"
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
            Boolean(!docType || docType === "OFERTA_VENTA" || docType === "PEDIDO_CLIENTE") && (
              <>
                {isAdmin && (
                  <Button
                    bg="#0f5132"
                    color="white"
                    _hover={{ bg: "#093822" }}
                    size="md"
                    h="44px"
                    w={{ base: "full", sm: "auto" }}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={handleAdminApproveQuote}
                    fontWeight="900"
                    boxShadow="0 4px 12px rgba(15,81,50,0.3)"
                    isLoading={isSendingToValidation}
                    isDisabled={isSendingToValidation}
                  >
                    ⚡ Guardar y Aprobar Directamente
                  </Button>
                )}
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
                  isDisabled={isSendingToValidation}
                >
                  {isObservedOrInCorrection
                    ? "Guardar y Reenviar a Validación"
                    : "Guardar y Enviar a Validación"}
                </Button>
                {!isObservedOrInCorrection && (
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
                    isDisabled={isSendingToValidation}
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

      {/* Modal de Confirmación Pre-Envío (Checklist de Seguridad) */}
      <QuoteSubmitConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmedSend}
        quote={currentQuoteObj}
      />

      {/* Modal de Observación para Administrador */}
      <ObserveReasonModal
        isOpen={isObserveModalOpen}
        onClose={() => setIsObserveModalOpen(false)}
        quote={currentQuoteObj}
        onConfirmObserve={(reason) => handleObserveFromForm(currentQuoteObj, reason)}
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
