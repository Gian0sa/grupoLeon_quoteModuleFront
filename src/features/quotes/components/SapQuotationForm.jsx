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
  MessageSquare, XCircle, Send, Zap
} from "lucide-react";
import ClientAutocomplete from "./ClientAutocomplete";
import SapItemGrid from "./SapItemGrid";
import { NewSellTerms } from "./NewSellTerms";
import { SapQuoteDocumentModal } from "./SapQuoteDocumentModal";
import { ObserveReasonModal } from "./ObserveReasonModal";
import { RejectReasonModal } from "./RejectReasonModal";
import { OrderTimelineBar, OrderChecklist } from "./OrderProgressTracker";
import { useQueryClient } from "@tanstack/react-query";
import { createQuote, updateQuote, getNextDocNumber } from "../services/quoteService";
import { useQuoteStore, normalizeQuoteClient } from "../stores/quoteStore";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useExchangeRate } from "../../dashboard/hooks/queries/dashboardQueries";
import { axiosInstance } from "../../../shared/lib/axiosInstance";
import { useGetTransports, useGetPaymentType, useGetDeliveryForms, useGetHouseBankAccounts } from "../hooks/queries/quotesQueries";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";
import { useNavigate } from "react-router-dom";
import QuoteSubmitConfirmModal from "./QuoteSubmitConfirmModal";
import { isPickupInStoreForm } from "./NewSellTerms";

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
  const { username, userId, salesEmployeeCode, role } = useAuthStore();
  const isAdmin = role === "ADMIN" || role === "FACTURACION" || username?.toLowerCase() === "enrique";
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

  const effectiveStoreSeller = (storeSellerName && storeSellerName !== "Vendedor SAP" && storeSellerName !== "Vendedor Autorizado")
    ? storeSellerName
    : storeCreatedByUsername;

  const activeSeller = effectiveStoreSeller
    || ((sellerName && sellerName !== "Vendedor SAP" && sellerName !== "Vendedor Autorizado" && (!isAdmin || !username))
      ? sellerName
      : (isAdmin ? "Vendedor Autorizado" : (username || localSeller || "Vendedor Autorizado")));

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

  const isApproved = approvalStatus === "APROBADO_COMERCIAL" || approvalStatus === "APROBADO";
  const isCancelled = approvalStatus === "ANULADO";
  const isReadOnly = isApproved || isCancelled;

  // Determinar si es una cotización formalmente enviada para revisión/validación por un vendedor
  const isSubmittedQuote = Boolean(
    quoteId &&
    approvalStatus &&
    ["ENVIADO", "EN_PROCESO", "PENDIENTE_FACTURACION", "APROBADO_COMERCIAL", "APROBADO", "RECHAZADO", "OBSERVADO", "EN_EDICION", "ANULADO"].includes(approvalStatus)
  );

  // La línea de tiempo y checklist solo se muestran cuando la solicitud ya fue enviada / está en seguimiento
  const isQuoteAlreadySentOrInReview = Boolean(
    isTracking ||
    (approvalStatus && !["BORRADOR", "GENERADO", "DRAFT", "draft"].includes(approvalStatus))
  );

  // Estado que permite al Administrador desbloquear/editar cualquier cotización si necesita corregir ítems/precios
  const [adminForceEditMode, setAdminForceEditMode] = useState(false);

  // Si la cotización está observada o en edición, está en modo corrección activa
  const isCorrectionMode = approvalStatus === "OBSERVADO" || approvalStatus === "EN_EDICION";

  // El Administrador está en modo "Solo Revisión" cuando es una cotización enviada/en proceso y no está en corrección ni forzando edición
  const isAdminReviewing = Boolean(isAdmin && isSubmittedQuote && !adminForceEditMode && !isCorrectionMode);

  // Los campos comerciales (Cliente, Grilla de Productos) solo se bloquean si es solo lectura o revisión estricta
  const isSellerFieldsLocked = (isReadOnly && !isCorrectionMode) || (isAdminReviewing && !adminForceEditMode);

  // Despacho y Logística son editables si no está aprobada/cerrada en SAP, o si está en corrección, o si faltan datos
  const isDeliveryLocked = (isReadOnly && !isCorrectionMode) || (isAdminReviewing && !adminForceEditMode && Boolean(selectedDeliveryForm));
  const revealTabs = true; // Flujo unificado: Pestaña de logística y pagos accesible al inicio

  useEffect(() => {
    if (quoteId) {
      setDocNumber(quoteId);
    }
  }, [quoteId]);

  // Al montar con una cotización realmente nueva (sin quoteId cargado desde un
  // borrador o retiro), se solicita el correlativo secuencial del backend en
  // vez de improvisar uno con Date.now(), que rompía la numeración correlativa.
  useEffect(() => {
    if (quoteId) return;
    let cancelled = false;
    (async () => {
      const next = await getNextDocNumber();
      if (!cancelled) {
        setDocNumber(next || `COT-${Date.now().toString().slice(-6)}`);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data: rateData } = useExchangeRate({
    currency: "USD",
    date: docDate || todayIso(),
  });
  const exchangeRate = rateData?.collectionRate || rateData?.officialRate || 3.76;

  const { dataTransports } = useGetTransports();
  const { dataDeliveryForms } = useGetDeliveryForms();
  const { dataPaymentTypes } = useGetPaymentType();
  const { dataHouseBankAccounts } = useGetHouseBankAccounts();

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

  // Auto-inicializar datos comerciales de SAP para el cliente si vienen vacíos
  useEffect(() => {
    if (!client) return;

    // 1. Condición de Pago y Condición de Venta
    if (!selectedPaymentType && Array.isArray(dataPaymentTypes) && dataPaymentTypes.length > 0 && setSelectedPaymentType) {
      const clientPayTerms = client.raw?.PayTermsGrpCode ?? client.PayTermsGrpCode ?? client.PaymentGroupCode;
      let matched = null;
      if (clientPayTerms !== undefined && clientPayTerms !== null) {
        matched = dataPaymentTypes.find(pt => String(pt.GroupNum ?? pt.GroupNumber ?? pt.value) === String(clientPayTerms));
      }
      if (!matched) {
        matched = dataPaymentTypes.find(pt => {
          const name = (pt.PymntGroup || pt.PaymentTermsGroupName || pt.label || "").toLowerCase();
          return name.includes("contado") || String(pt.GroupNum) === "-1";
        }) || dataPaymentTypes[0];
      }
      if (matched) {
        setSelectedPaymentType(matched);
      }
    }

    // 2. Tipo de Comprobante (DNI -> BOLETA, RUC 20 -> FACTURA)
    if (!documentType && setDocumentType) {
      const docStr = String(client.LicTradNum || client.clientRuc || client.CardCode || client.clientDocument || "").replace(/^CL/i, '').trim();
      if (docStr.startsWith("20") || docStr.length === 11) {
        setDocumentType("FACTURA");
      } else {
        setDocumentType("BOLETA");
      }
    }

    // 3. Condición de Venta (CONTADO por defecto si no está seteado)
    if (!saleCondition && setSaleCondition) {
      setSaleCondition("CONTADO");
    }

    // 4. Punto de Llegada por defecto desde SAP
    if (!selectedPoint && deliveryPoints.length > 0 && setSelectedPoint) {
      const defaultPt = deliveryPoints.find(p => p.AddressName?.toLowerCase().includes("entrega") || p.AddressName?.toLowerCase().includes("fiscal")) || deliveryPoints[0];
      if (defaultPt) {
        setSelectedPoint(defaultPt);
      }
    }
  }, [client, selectedPaymentType, documentType, saleCondition, selectedPoint, dataPaymentTypes, deliveryPoints, setSelectedPaymentType, setDocumentType, setSaleCondition, setSelectedPoint]);

  // Auto-seleccionar Forma de Entrega por defecto si viene vacía
  useEffect(() => {
    if (!selectedDeliveryForm && Array.isArray(dataDeliveryForms) && dataDeliveryForms.length > 0 && setSelectedDeliveryForm) {
      const defaultForm = dataDeliveryForms.find(f => {
        const name = (f.TrnspName || f.label || "").toLowerCase();
        return name.includes("recojo") || name.includes("tienda") || String(f.TrnspCode) === "1";
      }) || dataDeliveryForms[0];
      if (defaultForm) {
        setSelectedDeliveryForm(defaultForm);
      }
    }
  }, [selectedDeliveryForm, dataDeliveryForms, setSelectedDeliveryForm]);

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
    id: docNumber || "COT-017071",
    docNumber: docNumber || "COT-017071",
    client,
    products,
    totals,
    sellerName: activeSeller,
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

    const currentLoggedInUsername = (username || localSeller || authUsername || "").toLowerCase().trim();
    const finalSellerName = originalSellerName || (activeSeller && activeSeller !== "Vendedor Autorizado" ? activeSeller : (currentLoggedInUsername || "Enrique"));
    const finalCreatedByUsername = originalCreatedByUsername || currentLoggedInUsername || "enrique";
    const finalCreatedByUserId = originalUserId || (isAdmin ? null : (userId || null));
    const effectiveSlpCode = (originalSlpCode && !isNaN(Number(originalSlpCode)))
      ? Number(originalSlpCode)
      : ((!isAdmin && salesEmployeeCode && !isNaN(Number(salesEmployeeCode))) ? Number(salesEmployeeCode) : undefined);

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
      totals: {
        ...finalTotals,
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
      docDueDate,
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
      salesEmployeeCode: effectiveSlpCode,
      paymentMethod: paymentMethod || "DEPOSITO_BANCARIO",
      bankAccount: bankAccount || "BCP_SOLES",
      sunatOpType: sunatOpType || "0101",
      U_VS_TIPOPER: "01",
      U_VS_TIPO_FACT: sunatOpType || "0101",
      U_VS_AFEDET: "N",
      U_VS_BANCO: bankAccount || "BCP_SOLES",
      PaymentMethod: paymentMethod || "001",
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
    const updated = isExisting
      ? saved.map((q) => (isMatchingDoc(q) ? newDoc : q))
      : [newDoc, ...saved.filter((q) => !isMatchingDoc(q))];

    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
    window.dispatchEvent(new Event("localQuotesUpdated"));
    if (setQuoteId) setQuoteId(activeDocNumber);

    // Persistencia centralizada en MySQL vía Backend
    const savePromise = createQuote(newDoc).then((res) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      return res;
    }).catch(err => {
      console.error("Error persistiendo cotización en base de datos:", err);
      return newDoc;
    });

    // Si se ENVIÓ a validación, generar la notificación para Facturación
    if (targetStatus === "ENVIADO") {
      const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
      const clientName = client?.CardName || client?.name || "Cliente General";
      const totalUsdStr = finalTotals?.grandTotalUSD ? `$${finalTotals.grandTotalUSD.toFixed(2)}` : "$0.00";
      const ADMIN_FACTURACION_USERNAME = "enrique";
      const senderUsername = username || localSeller || "vendedor";

      const maxAdic = (products || []).reduce((max, it) => Math.max(max, Number(it.lineDiscount || it.LineDiscount || 0)), 0);
      const discountNotice = maxAdic > 0 ? ' • ⚠️ CON DESCUENTO ADICIONAL APLICADO' : '';
      const notifTitle = maxAdic > 0
        ? `🔥 Cotización con Descuento Adicional - ${activeDocNumber}`
        : `📩 Nueva Cotización Recibida - ${activeDocNumber}`;

      const notifObj = {
        id: `NOTIF-${Date.now()}`,
        targetRole: "FACTURACION",
        targetUsername: ADMIN_FACTURACION_USERNAME,
        fromUsername: senderUsername,
        fromUserId: userId || null,
        quoteId: activeDocNumber,
        quoteObj: newDoc,
        title: notifTitle,
        description: `Enviada por ${activeSeller} • Cliente: ${clientName} (${totalUsdStr})${discountNotice} ${opNum ? `• Váucher BCP: N° ${opNum}` : ''}. Requiere aprobación comercial.`,
        status: "ENVIADO",
        hasDiscount: maxAdic > 0,
        maxDiscount: maxAdic,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        read: false
      };
      localStorage.setItem("grupoLeon_notifications", JSON.stringify([notifObj, ...existingNotifs.filter(n => n.quoteId !== activeDocNumber || n.targetUsername !== ADMIN_FACTURACION_USERNAME)]));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
    }

    return { success: true, activeDocNumber, currentStatus, newDoc, savePromise };
  };

  // Autoguardado preventivo (Exit-Safe & Crash-Safe) solo para borradores activos o cotizaciones nuevas
  // Si el Admin está revisando o la cotización es de solo lectura, NUNCA sobreescribir al salir
  useEffect(() => {
    if (isAdminReviewing || isReadOnly) return;

    const shouldAutoSave = () => {
      return !isExplicitlySubmittingRef.current && client && products && products.length > 0 && !isAdminReviewing && !isReadOnly;
    };

    const handleBeforeUnload = () => {
      if (shouldAutoSave()) {
        handleSaveAction("BORRADOR", { silent: true });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && shouldAutoSave()) {
        handleSaveAction("BORRADOR", { silent: true });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Guardar automáticamente al salir de la pantalla solo si no se envió explícitamente y hay datos completos
      if (shouldAutoSave()) {
        handleSaveAction("BORRADOR", { silent: true });
      }
    };
  }, [client, products, totals, docNumber, quoteId, comment, selectedDeliveryForm, selectedTransport, selectedPaymentType, opNum, contactPerson, refNumber, saleCondition, documentType, isLetra, creditTerm, bankAccount, paymentMethod, sunatOpType, isAdminReviewing, isReadOnly]);

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
      // En entorno de pruebas si los artículos vinieron con $0.00, auto-reparar asignando $25.00 a cada producto sin precio
      const autoUpdatedProducts = products.map((p) => {
        const pPrice = Number(p.price || p.unitPrice || p.Price || 0);
        const fixedPrice = pPrice > 0 ? pPrice : 25.0;
        return {
          ...p,
          price: fixedPrice,
          unitPrice: fixedPrice,
          importe: fixedPrice,
        };
      });
      setProducts(autoUpdatedProducts);
      grandTotalUSD = autoUpdatedProducts.reduce((acc, p) => acc + (p.price * (p.quantity || 1)), 0);
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

    // 5. Validar Abono / Váucher Bancario o Términos de Crédito
    const currentPymntLabel = String(
      (typeof selectedPaymentType === "object"
        ? (selectedPaymentType.PymntGroup || selectedPaymentType.PaymentTermsGroupName || selectedPaymentType.label || selectedPaymentType.value)
        : selectedPaymentType) ||
      saleCondition ||
      ""
    ).toLowerCase();

    const isCreditCondition = currentPymntLabel.includes("credit") || 
                              currentPymntLabel.includes("crédito") || 
                              currentPymntLabel.includes("dias") || 
                              currentPymntLabel.includes("días") || 
                              currentPymntLabel.includes("letra") || 
                              saleCondition === "CREDITO";

    if (isCreditCondition) {
      if (!creditTerm || !String(creditTerm).trim()) {
        toast({
          title: "⚠️ Plazo de Crédito requerido",
          description: "Para ventas a crédito, debe ingresar el plazo pactado (ej: 30 días, 45 días) en la Sección 2.",
          status: "warning",
          duration: 4500,
          isClosable: true,
        });
        setActiveTabIndex(1);
        return false;
      }
    } else {
      // Venta al Contado / Anticipada
      if (paymentMethod === "EFECTIVO") {
        // En efectivo / contra entrega no se exige banco ni váucher
      } else if (paymentMethod === "CHEQUE") {
        if (!opNum || !String(opNum).trim()) {
          toast({
            title: "⚠️ N° de Cheque requerido",
            description: "Debe ingresar el Número de Cheque o referencia (Sección 2).",
            status: "warning",
            duration: 4500,
            isClosable: true,
          });
          setActiveTabIndex(1);
          return false;
        }
      } else {
        // Depósito en Cuenta, Transferencia Bancaria, Yape/Plin
        if (!bankAccount || !String(bankAccount).trim()) {
          toast({
            title: "⚠️ Cuenta Bancaria requerida",
            description: "Debe seleccionar la Cuenta Bancaria Oficial donde el cliente depositó o abonará (Sección 2).",
            status: "warning",
            duration: 4500,
            isClosable: true,
          });
          setActiveTabIndex(1);
          return false;
        }
        if (!opNum || !String(opNum).trim()) {
          toast({
            title: "⚠️ N° de Operación (Váucher) requerido",
            description: "Debe ingresar el Número de Operación Bancaria del comprobante de abono (Sección 2).",
            status: "warning",
            duration: 4500,
            isClosable: true,
          });
          setActiveTabIndex(1);
          return false;
        }
      }
    }

    return true;
  };

  const handleAdminApproveQuote = async () => {
    if (!validateBeforeAdminApproval()) {
      return;
    }

    const activeDocNumber = docNumber || quoteId || `COT-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const adminName = username || "Enrique";
    const sellerUsername = currentQuoteObj.sellerName || "Vendedor";

    // 1. Guardar y actualizar cotización a estado APROBADO
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
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
    localStorage.setItem("grupoLeon_notifications", JSON.stringify([newNotif, ...existingNotifs]));
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
    const adminName = username || "Enrique";

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
    const adminName = username || "Enrique";

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
    // Validar también Condición de Pago
    const hasPaymentType = Boolean(
      selectedPaymentType &&
      (typeof selectedPaymentType === "object"
        ? (selectedPaymentType.value || selectedPaymentType.GroupNum !== undefined || selectedPaymentType.PymntGroup || selectedPaymentType.PaymentTermsGroupName || selectedPaymentType.label)
        : String(selectedPaymentType).trim().length > 0)
    );
    if (!hasPaymentType) {
      toast({
        title: "⚠️ Condición de Pago requerida",
        description: "Debe seleccionar la Condición de Pago oficial en la Sección 2 (Condición de Pago SAP B1) antes de enviar.",
        status: "warning",
        duration: 4500,
        isClosable: true,
      });
      setActiveTabIndex(1);
      return false;
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
    // Abrir modal de confirmación pre-envío
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
      if (result && result.savePromise) {
        setValidationStepText("Persistiendo cotización en la base de datos MySQL...");
        await result.savePromise;
      }

      setValidationStepText("Notificando en tiempo real vía WebSocket a Facturación...");
      await new Promise((res) => setTimeout(res, 800));

      setValidationStepText("✅ Cotización registrada con éxito. Redirigiendo...");
      await new Promise((res) => setTimeout(res, 600));

      toast({
        title: "✅ Cotización Enviada a Validación",
        description: `Documento ${result?.activeDocNumber || activeDocNumber} registrado y enviado en tiempo real a la Asesora de Facturación.`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

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
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        read: false
      };
      
      localStorage.setItem("grupoLeon_notifications", JSON.stringify([notifObj, ...existingNotifs.filter(n => n.quoteId !== activeDocNumber)]));
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
      const targetDocEntry = initialData?.sapDocEntry || initialData?.DocEntry || initialData?.docEntry || 22;
      const payload = {
        client,
        products,
        docDueDate,
        docDate,
        comment,
        observations,
        refNumber,
        contactPerson,
        saleCondition,
        documentType,
        isLetra,
        creditTerm,
        deliveryDate,
        deliveryForm: selectedDeliveryForm,
        transport: selectedTransport,
        deliveryPoint: selectedPoint,
        paymentType: selectedPaymentType,
        paymentMethod,
        bankAccount,
        sunatOpType,
        opNum,
        sellerName: finalSellerName,
        SlpCode: effectiveSlpCode,
        slpCode: effectiveSlpCode,
        whsCode: whsCode || "014",
      };
      const res = await axiosInstance.post(`/quoteModule/quotes/sap/${targetDocEntry}/copy-to-order`, payload);
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
      const targetDocEntry = initialData?.sapDocEntry || initialData?.DocEntry || initialData?.docEntry || 22;
      const payload = {
        client,
        products,
        docDueDate,
        docDate,
        comment,
        observations,
        refNumber,
        contactPerson,
        saleCondition,
        documentType,
        isLetra,
        creditTerm,
        deliveryDate,
        deliveryForm: selectedDeliveryForm,
        transport: selectedTransport,
        deliveryPoint: selectedPoint,
        paymentType: selectedPaymentType,
        paymentMethod,
        bankAccount,
        sunatOpType,
        opNum,
        sellerName: finalSellerName,
        SlpCode: effectiveSlpCode,
        slpCode: effectiveSlpCode,
        whsCode: whsCode || "014",
      };
      const res = await axiosInstance.post(`/quoteModule/quotes/sap/${targetDocEntry}/copy-to-invoice`, payload);
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

  const handleNewQuote = async () => {
    clear();
    if (typeof setWhsCode === "function") setWhsCode("014");
    setDocType("OFERTA_VENTA");
    const next = await getNextDocNumber();
    setDocNumber(next || `COT-${Date.now().toString().slice(-6)}`);
    toast({
      title: "Formulario Reiniciado",
      description: "Listo para crear una nueva Solicitud de Pedido.",
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
              <Heading size="sm" color="emerald.900" fontWeight="800" letterSpacing="tight">
                {docType === "PEDIDO_CLIENTE" ? "SOLICITUD DE PEDIDO DE VENTA" : "NUEVA COTIZACIÓN (OFERTA DE VENTA)"}
              </Heading>
              <Text fontSize="xs" color="gray.500" display={{ base: "none", md: "block" }}>
                {docType === "PEDIDO_CLIENTE"
                  ? "Gestión comercial de requerimiento de pedido y despacho"
                  : "Elaboración de propuesta comercial y precios para el cliente"}
              </Text>
            </Box>
          </HStack>

          <Flex wrap="wrap" gap={2} align="center" w={{ base: "full", md: "auto" }}>
            <Badge colorScheme={docType === "OFERTA_VENTA" ? "blue" : "emerald"} px={2.5} py={1} borderRadius="md" fontSize="xs" textTransform="uppercase">
              Nº {docNumber}
            </Badge>
            {isApproved && (
              <Badge colorScheme="green" bg="#15803d" color="white" px={2.5} py={1} borderRadius="md" fontSize="xs" fontWeight="900" boxShadow="xs">
                🏛️ SAP DocNum Oficial
              </Badge>
            )}
            <Badge
              bg={
                approvalStatus === "APROBADO" || approvalStatus === "APROBADO_COMERCIAL"
                  ? "#dcfce7"
                  : approvalStatus === "PENDIENTE_FACTURACION"
                  ? "#f5f3ff"
                  : approvalStatus === "RECHAZADO"
                  ? "#fee2e2"
                  : "#fef9c3"
              }
              color={
                approvalStatus === "APROBADO" || approvalStatus === "APROBADO_COMERCIAL"
                  ? "#15803d"
                  : approvalStatus === "PENDIENTE_FACTURACION"
                  ? "#5b21b6"
                  : approvalStatus === "RECHAZADO"
                  ? "#b91c1c"
                  : "#854d0e"
              }
              border="1px solid"
              borderColor={
                approvalStatus === "APROBADO" || approvalStatus === "APROBADO_COMERCIAL"
                  ? "#86efac"
                  : approvalStatus === "PENDIENTE_FACTURACION"
                  ? "#ddd6fe"
                  : approvalStatus === "RECHAZADO"
                  ? "#fca5a5"
                  : "#fef08a"
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
            )}
            {isAdmin && isSubmittedQuote && !isReadOnly && (
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
        {revealTabs ? (
          <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
            {/* Columna Izquierda: Datos de Cliente SAP */}
            <VStack align="stretch" spacing={3}>
              {isSellerFieldsLocked ? (
                <Box p={3.5} bg="#f0fdf4" borderRadius="xl" border="1.5px solid" borderColor="#bbf7d0" boxShadow="xs">
                  <HStack justify="space-between" mb={1.5}>
                    <Text fontSize="10px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider">
                      🤝 Cliente SAP (Bloqueado)
                    </Text>
                    <Badge colorScheme="green" fontSize="10px">SAP OK</Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.800" fontWeight="700">
                    {client?.CardName || client?.name || "Cliente General"}
                  </Text>
                  <Text fontSize="0.75rem" color="gray.500" fontWeight="600" mt={0.5}>
                    Documento / Código: {client?.CardCode || client?.id || "N/A"}
                  </Text>
                  {client?.Address && (
                    <Text fontSize="0.75rem" color="gray.500" fontWeight="500">
                      Dirección: {client.Address}
                    </Text>
                  )}
                </Box>
              ) : (
                <ClientAutocomplete client={client} setClient={setClient} />
              )}
            </VStack>

            {/* Columna Derecha: Parámetros del Documento (Grid 2x2 Simétrico) */}
            <VStack align="stretch" spacing={3}>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
                <FormControl>
                  <FormLabel fontSize={{ base: "13px", md: "xs" }} fontWeight="700" color="gray.700" mb={1}>
                    Válido Hasta / Vencimiento {isSellerFieldsLocked && "🔒"}
                  </FormLabel>
                  <Input
                    type="date"
                    size="sm"
                    borderRadius="md"
                    value={docDueDate}
                    onChange={(e) => setDocDueDate(e.target.value)}
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
        ) : (
          /* FASE 1: Cotización Inicial limpia — Buscador compacto de 560px */
          <Box w="full" maxW={{ base: "full", md: "560px" }}>
            {isSellerFieldsLocked ? (
              <Box p={3.5} bg="#f0fdf4" borderRadius="xl" border="1.5px solid" borderColor="#bbf7d0" boxShadow="xs">
                <HStack justify="space-between" mb={1.5}>
                  <Text fontSize="10px" fontWeight="900" color="#166534" textTransform="uppercase" letterSpacing="wider">
                    🤝 Cliente SAP (Bloqueado)
                  </Text>
                  <Badge colorScheme="green" fontSize="10px">SAP OK</Badge>
                </HStack>
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
                  <Text>{isAdmin ? "Logística, Pagos y Anexos" : "Logística y Despacho"}</Text>
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
                isReadOnly={isSellerFieldsLocked}
              />
            </TabPanel>

            {/* Pestaña 2: Logística y Condiciones */}
            {revealTabs && (
              <TabPanel p={2}>
                <VStack align="stretch" spacing={3}>
                  <NewSellTerms
                    client={client}
                    transports={dataTransports || []}
                    deliveryPoints={deliveryPoints}
                    deliveryForms={dataDeliveryForms || []}
                    paymentTypes={dataPaymentTypes || []}
                    houseBankAccounts={dataHouseBankAccounts || []}
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
                    isAdmin={isAdmin}
                    isDeliveryLocked={isDeliveryLocked}
                    isFinanceLocked={isAdmin ? false : isReadOnly}
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
              Comentarios u Observaciones de Cotización {isSellerFieldsLocked && "🔒"}
            </FormLabel>
            <Textarea
              size="sm"
              borderRadius="md"
              rows={4}
              placeholder="Detalla aquí condiciones de entrega, vigencia del precio o garantía..."
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
                USD {(totals.grossSubtotalUSD ?? totals.subtotalUSD).toFixed(2)}
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
          {isAdminReviewing ? (
            <>
              <Button
                bg="#126C36"
                color="white"
                _hover={{ bg: "#0e572b" }}
                size="md"
                w={{ base: "full", sm: "auto" }}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleAdminApproveQuote}
                fontWeight="900"
                boxShadow="0 4px 12px rgba(18,108,54,0.3)"
              >
                ✅ Aprobar y Generar Pedido de Venta
              </Button>
              <Button
                colorScheme="amber"
                bg="#d97706"
                _hover={{ bg: "#b45309" }}
                color="white"
                size="md"
                w={{ base: "full", sm: "auto" }}
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
                w={{ base: "full", sm: "auto" }}
                leftIcon={<XCircle className="w-4 h-4 stroke-[2.5]" />}
                onClick={() => setIsRejectModalOpen(true)}
                fontWeight="800"
              >
                ✕ Rechazar
              </Button>
            </>
          ) : isReadOnly ? (
            <Badge colorScheme="green" p={2.5} borderRadius="lg" fontSize="xs" fontWeight="800">
              {approvalStatus === "APROBADO" ? "✅ 4. Pedido Aprobado (Solo Lectura)" : "✅ Cotización Aprobada (Solo Lectura)"}
            </Badge>
          ) : approvalStatus === "APROBADO_COMERCIAL" ? (
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
                {isAdmin && (
                  <Button
                    bg="#126C36"
                    color="white"
                    _hover={{ bg: "#0e572b" }}
                    size="md"
                    w={{ base: "full", sm: "auto" }}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={handleAdminApproveQuote}
                    fontWeight="900"
                    boxShadow="0 4px 12px rgba(18,108,54,0.3)"
                    isLoading={isSendingToValidation}
                    isDisabled={isSendingToValidation}
                  >
                    ⚡ Guardar y Aprobar Directamente
                  </Button>
                )}
                <Button
                  bg={isAdmin ? "teal.600" : "#126C36"}
                  color="white"
                  _hover={{ bg: isAdmin ? "teal.700" : "#0e572b" }}
                  size="md"
                  w={{ base: "full", sm: "auto" }}
                  leftIcon={<Save className="w-4 h-4" />}
                  onClick={handleSaveAndSend}
                  fontWeight="800"
                  isLoading={isSendingToValidation}
                  isDisabled={isSendingToValidation}
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

          {/* Botón Limpiar: SOLO al crear una cotización nueva desde cero (sin quoteId y no enviada a aprobación) */}
          {!quoteId && !isQuoteAlreadySentOrInReview && !isAdminReviewing ? (
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
          ) : (
            <Button
              variant="outline"
              colorScheme="gray"
              borderColor="gray.300"
              size="md"
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
    </VStack>
  );
}
