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
  MessageSquareWarning
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuoteStore } from "../stores/quoteStore";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import { QuoteStepper, getStageIndex } from "../components/QuoteStepper";
import { QuoteDetailDrawer } from "../components/QuoteDetailDrawer";
import QuotePdfModal from "../components/QuotePdfModal";
import { calculateQuoteTotals } from "../../../shared/utils/quoteCalculator";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useQueryClient } from "@tanstack/react-query";
import { useGetQuotes } from "../hooks/queries/quotesQueries";
import { updateQuote, deleteQuote, createQuote } from "../services/quoteService";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function QuoteApprovalPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });

  const { username: authUsername, role: authRole } = useAuthStore();
  const isAdminUser = authRole === "ADMIN" || authUsername?.toLowerCase() === "enrique";

  const { data: serverQuotes, isLoading: isServerLoading, refetch: refetchServerQuotes } = useGetQuotes();

  const handleLoadQuote = (q) => {
    if (typeof useQuoteStore.getState().setQuoteData === "function") {
      useQuoteStore.getState().setQuoteData(q);
    } else {
      if (q.client) useQuoteStore.getState().setClient(q.client);
      if (q.products) useQuoteStore.getState().setProducts(q.products);
      if (q.comment) useQuoteStore.getState().setComment(q.comment);
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

  // Sincronizar cotizaciones desde el servidor en tiempo real sin borrar borradores locales
  useEffect(() => {
    const local = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    if (serverQuotes && Array.isArray(serverQuotes) && serverQuotes.length > 0) {
      const serverDocIds = new Set(serverQuotes.map(q => q.docNumber || q.id));
      const unsyncedLocal = local.filter(q => !serverDocIds.has(q.docNumber || q.id));
      const merged = [...unsyncedLocal, ...serverQuotes];
      setQuotes(merged);
      localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(merged));
    } else if (local.length > 0) {
      setQuotes(local);
    }
  }, [serverQuotes]);

  // Cargar cotizaciones iniciales desde localStorage y servidor
  const loadQuotes = () => {
    try {
      const stored = localStorage.getItem("grupoLeon_local_quotes");
      const local = stored ? JSON.parse(stored) : [];
      if (serverQuotes && Array.isArray(serverQuotes) && serverQuotes.length > 0) {
        const serverDocIds = new Set(serverQuotes.map(q => q.docNumber || q.id));
        const unsyncedLocal = local.filter(q => !serverDocIds.has(q.docNumber || q.id));
        setQuotes([...unsyncedLocal, ...serverQuotes]);
      } else {
        setQuotes(Array.isArray(local) ? local : []);
      }
    } catch (err) {
      console.error("Error al cargar cotizaciones:", err);
    }
  };

  const DRAFT_STATUSES = ["BORRADOR", "GENERADO"];

  const handleDeleteQuote = async (id, currentStatus) => {
    const isHardDelete = !currentStatus || DRAFT_STATUSES.includes(currentStatus) || currentStatus === "ANULADO";

    try {
      await deleteQuote(id, isHardDelete);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      console.error("Error eliminando cotización en el servidor:", e);
    }

    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    if (isHardDelete) {
      const updated = saved.filter(q => (q.id || q.docNumber) !== id);
      localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
      window.dispatchEvent(new Event("localQuotesUpdated"));
      toast({
        title: "🗑️ Cotización Borrada",
        description: `La cotización ${id} fue borrada permanentemente del sistema.`,
        status: "info",
        duration: 3000,
        isClosable: true
      });
    } else {
      const nowIso = new Date().toISOString();
      const adminName = authUsername || "Enrique";
      const updated = saved.map(q => {
        if ((q.id || q.docNumber) !== id) return q;
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
            ...prevLogs
          ]
        };
      });
      localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
      window.dispatchEvent(new Event("localQuotesUpdated"));
      toast({
        title: "❌ Cotización Anulada",
        description: `La cotización ${id} cambió su estado a ANULADO. Se muestra el distintivo Anulado ❌ en la tabla.`,
        status: "warning",
        duration: 4000,
        isClosable: true
      });
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
  const handleRecallQuote = async (docId) => {
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const nowIso = new Date().toISOString();
    const recallUser = authUsername || "vendedor";
    const target = quotes.find(q => (q.id || q.docNumber) === docId) || saved.find(q => (q.id || q.docNumber) === docId);
    const prevLogs = target?.historyLog || [];
    const version = (target?.quoteVersion || 1);
    const newLog = { status: "EN_EDICION", timestamp: nowIso, user: recallUser, note: `↩️ Solicitud retirada por el vendedor para corrección (v${version})` };
    const updatedHistory = [newLog, ...prevLogs];

    try {
      await updateQuote({
        id: docId,
        docNumber: docId,
        state: "EN_EDICION",
        approvalStatus: "EN_EDICION",
        historyLog: updatedHistory,
      });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    } catch (e) {
      console.error("Error retirando cotización:", e);
    }

    const updated = saved.map(q => {
      if ((q.id || q.docNumber) !== docId) return q;
      if (q.viewedByAdmin) return q;
      return {
        ...q,
        status: "EN_EDICION",
        state: "EN_EDICION",
        approvalStatus: "EN_EDICION",
        quoteVersion: version,
        recalledAt: nowIso,
        recalledBy: recallUser,
        historyLog: updatedHistory
      };
    });
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
    window.dispatchEvent(new Event("localQuotesUpdated"));

    const recalledDoc = updated.find(q => (q.id || q.docNumber) === docId) || target;
    if (recalledDoc) {
      const store = useQuoteStore.getState();
      if (typeof store.setQuoteData === "function") {
        store.setQuoteData(recalledDoc);
      } else {
        if (recalledDoc.client) store.setClient(recalledDoc.client);
        if (recalledDoc.products) store.setProducts(recalledDoc.products);
        if (recalledDoc.comment) store.setComment(recalledDoc.comment);
        if (store.setQuoteId) store.setQuoteId(docId);
      }
    }

    toast({
      title: "↩️ Cotización Retirada para Corrección",
      description: `La solicitud ${docId} fue retirada antes de que Enrique la abriera. Se cargó en tu formulario para corregir.`,
      status: "info",
      duration: 5000,
      isClosable: true
    });
    navigate("/newquotes");
  };

  // ── OBSERVE: Enrique devuelve con observación al vendedor ──
  const handleObserveQuote = async (docId) => {
    const reason = window.prompt("💬 Escribe la observación o motivo de devolución al vendedor:");
    if (!reason || !reason.trim()) return;

    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const nowIso = new Date().toISOString();
    const adminName = authUsername || "Enrique";
    const target = quotes.find(q => (q.id || q.docNumber) === docId) || saved.find(q => (q.id || q.docNumber) === docId);
    const prevLogs = target?.historyLog || [];
    const newLog = { status: "OBSERVADO", timestamp: nowIso, user: adminName, note: `💬 Devuelto por ${adminName}: ${reason.trim()}` };
    const updatedHistory = [newLog, ...prevLogs];

    try {
      await updateQuote({
        id: docId,
        docNumber: docId,
        state: "OBSERVADO",
        approvalStatus: "OBSERVADO",
        rejectionReason: reason.trim(),
        historyLog: updatedHistory,
      });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      console.error("Error observando cotización:", e);
    }

    const updated = saved.map(q => {
      if ((q.id || q.docNumber) !== docId) return q;
      return {
        ...q,
        status: "OBSERVADO",
        state: "OBSERVADO",
        approvalStatus: "OBSERVADO",
        observedAt: nowIso,
        observedBy: adminName,
        observationReason: reason.trim(),
        historyLog: updatedHistory
      };
    });
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
    window.dispatchEvent(new Event("localQuotesUpdated"));

    const observedDoc = updated.find(q => (q.id || q.docNumber) === docId);
    const existingNotifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
    const notifObj = {
      id: `NOTIF-OBS-${Date.now()}`,
      targetRole: "VENDEDOR",
      targetUsername: observedDoc?.createdByUsername || "vendedor",
      fromUsername: adminName,
      quoteId: docId,
      title: `💬 Cotización Observada - ${docId}`,
      description: `${adminName} solicita corrección: ${reason.trim()}`,
      status: "OBSERVADO",
      timestamp: nowIso,
      read: false
    };
    localStorage.setItem("grupoLeon_notifications", JSON.stringify([notifObj, ...existingNotifs.filter(n => n.quoteId !== docId || n.status !== "OBSERVADO")]));
    window.dispatchEvent(new Event("localNotificationsUpdated"));
    localStorage.setItem("grupoLeon_notifications", JSON.stringify([notifObj, ...existingNotifs]));
    window.dispatchEvent(new Event("localNotificationsUpdated"));

    toast({
      title: "💬 Cotización Devuelta con Observación",
      description: `Se notificó al vendedor para que corrija: ${reason.trim()}`,
      status: "warning",
      duration: 5000,
      isClosable: true
    });
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

  // Transición de Estado del Workflow (Stepper)
  const handleUpdateStatus = async (docId, newStatus) => {
    const target = quotes.find(q => (q.id || q.docNumber) === docId);
    const currentLog = target?.historyLog || [];
    const newLogEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      user: authUsername || "Enrique",
      note:
        newStatus === "ENVIADO"
          ? "Enviado a Cliente / Aprobador"
          : newStatus === "EN_PROCESO"
          ? "Puesto En Proceso de Revisión"
          : newStatus === "APROBADO_COMERCIAL"
          ? "Aprobado Comercial por Administrador"
          : newStatus === "APROBADO"
          ? "Aprobado exitosamente — Listo para facturar"
          : "Rechazado"
    };
    const updatedHistory = [newLogEntry, ...currentLog];

    try {
      await updateQuote({
        id: docId,
        docNumber: docId,
        state: newStatus,
        approvalStatus: newStatus,
        historyLog: updatedHistory,
      });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (err) {
      console.error("Error actualizando estado de cotización en servidor:", err);
    }

    const updated = quotes.map((q) => {
      if (q.id === docId || q.docNumber === docId) {
        return {
          ...q,
          state: newStatus,
          approvalStatus: newStatus,
          historyLog: updatedHistory
        };
      }
      return q;
    });

    setQuotes(updated);
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));

    if (selectedQuote && (selectedQuote.id === docId || selectedQuote.docNumber === docId)) {
      setSelectedQuote((prev) => ({
        ...prev,
        state: newStatus,
        approvalStatus: newStatus,
        historyLog: [
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            user: authUsername || "Enrique",
            note: "Actualización desde detalle"
          },
          ...(prev.historyLog || [])
        ]
      }));
    }

    toast({
      title: `Estado Actualizado: ${newStatus}`,
      description: `La cotización ${docId} avanzó en el flujo comercial.`,
      status: newStatus === "APROBADO" || newStatus === "APROBADO_COMERCIAL" ? "success" : newStatus === "RECHAZADO" ? "error" : "info",
      duration: 3500,
      isClosable: true
    });
  };

  // Filtrado de la lista por Pestañas y Buscador
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const currentStatus = q.approvalStatus || q.state || "GENERADO";

      // Filtro por pestaña
      if (selectedTab === "GENERADO" && !["GENERADO", "DRAFT", "draft", "BORRADOR", "borrador"].includes(currentStatus)) return false;
      if (selectedTab === "ENVIADO" && currentStatus !== "ENVIADO" && currentStatus !== "EN_PROCESO") return false;
      if (selectedTab === "APROBADO_COMERCIAL" && currentStatus !== "APROBADO_COMERCIAL") return false;
      if (selectedTab === "PENDIENTE_FACTURACION" && currentStatus !== "PENDIENTE_FACTURACION") return false;
      if (selectedTab === "APROBADO" && currentStatus !== "APROBADO") return false;
      if (selectedTab === "RECHAZADO" && currentStatus !== "RECHAZADO") return false;

      // Filtro por búsqueda
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const docNum = (q.docNumber || q.id || "").toLowerCase();
      const clientName = (q.clientName || q.client?.CardName || "").toLowerCase();
      const clientDoc = (q.clientDocument || q.client?.CardCode || "").toLowerCase();

      return docNum.includes(query) || clientName.includes(query) || clientDoc.includes(query);
    });
  }, [quotes, selectedTab, searchQuery]);

  // Contadores por Estado (TODAS cuenta solo cotizaciones enviadas/comerciales)
  const counts = useMemo(() => {
    const res = { ALL: 0, GENERADO: 0, ENVIADO: 0, APROBADO_COMERCIAL: 0, PENDIENTE_FACTURACION: 0, APROBADO: 0, RECHAZADO: 0 };
    quotes.forEach((q) => {
      const st = q.approvalStatus || q.state || q.status || "GENERADO";
      const isDraft = ["GENERADO", "DRAFT", "draft", "BORRADOR", "borrador"].includes(st);
      
      if (isDraft) {
        res.GENERADO++;
      } else {
        res.ALL++;
        if (st === "ENVIADO" || st === "EN_PROCESO") res.ENVIADO++;
        else if (st === "APROBADO_COMERCIAL") res.APROBADO_COMERCIAL++;
        else if (st === "PENDIENTE_FACTURACION") res.PENDIENTE_FACTURACION++;
        else if (st === "APROBADO") res.APROBADO++;
        else if (st === "RECHAZADO") res.RECHAZADO++;
      }
    });
    return res;
  }, [quotes]);

  const renderStatusBadge = (status) => {
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
      case "ENVIADO":
        return (
          <Badge bg="#e0f2fe" color="#0369a1" border="1.5px solid #bae6fd" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            2. Enviado a Cliente
          </Badge>
        );
      case "EN_PROCESO":
        return (
          <Badge bg="#f3e8ff" color="#6b21a8" border="1.5px solid #e9d5ff" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            3. En Revisión
          </Badge>
        );
      case "APROBADO_COMERCIAL":
        return (
          <Badge bg="#fef9c3" color="#854d0e" border="1.5px solid #fef08a" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            2. Aprob. Comercial 📢
          </Badge>
        );
      case "PENDIENTE_FACTURACION":
        return (
          <Badge bg="#f5f3ff" color="#5b21b6" border="1.5px solid #ddd6fe" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            3. Pnd. Facturación 💳
          </Badge>
        );
      case "APROBADO":
        return (
          <Badge bg="#dcfce7" color="#166534" border="1.5px solid #bbf7d0" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            4. Pedido Emitido ✓
          </Badge>
        );
      case "RECHAZADO":
        return (
          <Badge bg="#fee2e2" color="#991b1b" border="1.5px solid #fecaca" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            Rechazado ❌
          </Badge>
        );
      case "ANULADO":
        return (
          <Badge bg="#ffe4e6" color="#e11d48" border="1.5px solid #fda4af" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            Anulado ❌
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

  // Botones de acción por fila, compartidos entre la tabla (escritorio) y las
  // tarjetas (móvil). `stack` apila los botones a ancho completo en móvil.
  // En modo tarjeta (stack) los botones mantienen 42px táctiles aunque el
  // breakpoint `md` reduzca las escalas, porque las tarjetas se muestran hasta
  // `lg`; en la tabla de escritorio conservan el tamaño compacto original.
  const touchH = stack => (stack ? "42px" : undefined);
  const renderRowActions = (q, docId, status, { stack = false } = {}) => {
    const isDraft = !status || ["GENERADO", "BORRADOR", "DRAFT", "draft"].includes(status);
    const btnSize = stack ? "sm" : "xs";
    const halfFlex = stack ? "1 1 calc(50% - 6px)" : undefined;
    const fullFlex = stack ? "1 1 100%" : undefined;
    const btnMinW = stack ? "105px" : undefined;

    return (
      <Flex gap={2} justify={stack ? "stretch" : "flex-end"} w="full" wrap="wrap" align="center">
        {/* 1. Botón Editar (Para Borradores) */}
        {isDraft && (
          <Button
            size={btnSize}
            minH={touchH(stack)}
            colorScheme="blue"
            bg="#2563eb"
            _hover={{ bg: "#1d4ed8" }}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            onClick={() => handleLoadQuote(q)}
            fontWeight="800"
            borderRadius="lg"
            px={2.5}
            whiteSpace="nowrap"
            boxShadow="0 2px 6px rgba(37,99,235,0.2)"
            flex={halfFlex}
            minW={btnMinW}
          >
            Editar
          </Button>
        )}

        {/* 1.1 Botón Borrar (Exclusivo para Borradores) */}
        {isDraft && (
          <Button
            size={btnSize}
            minH={touchH(stack)}
            colorScheme="red"
            variant="outline"
            borderColor="#fecaca"
            color="#dc2626"
            bg="#fff5f5"
            _hover={{ bg: "#fee2e2", borderColor: "#fca5a5" }}
            leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
            onClick={() => setDeleteConfirmDoc({ docId, status })}
            fontWeight="800"
            borderRadius="lg"
            px={2.5}
            whiteSpace="nowrap"
            flex={halfFlex}
            minW={btnMinW}
          >
            Borrar
          </Button>
        )}

        {/* 2. Botón Vista Previa / Detalle */}
        <Button
          size={btnSize}
          minH={touchH(stack)}
          variant="outline"
          borderColor="#cbd5e1"
          color="#334155"
          bg="white"
          _hover={{ bg: "#f8fafc", borderColor: "#94a3b8" }}
          leftIcon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
          onClick={() => {
            markAsViewedByAdmin(q);
            setSelectedQuote(q);
            setIsDetailOpen(true);
          }}
          fontWeight="700"
          borderRadius="lg"
          px={2.5}
          whiteSpace="nowrap"
          flex={halfFlex}
          minW={btnMinW}
        >
          Vista
        </Button>

        {/* 2.5 Vista Previa y Descarga PDF */}
        <Button
          size={btnSize}
          minH={touchH(stack)}
          colorScheme="teal"
          variant="outline"
          borderColor="#99f6e4"
          color="#0d9488"
          bg="#f0fdfa"
          _hover={{ bg: "#ccfbf1", borderColor: "#5eead4" }}
          leftIcon={<Download className="w-3.5 h-3.5 text-teal-600" />}
          onClick={() => {
            markAsViewedByAdmin(q);
            setPdfQuote(q);
          }}
          fontWeight="800"
          borderRadius="lg"
          px={2.5}
          whiteSpace="nowrap"
          flex={halfFlex}
          minW={btnMinW}
        >
          PDF
        </Button>

        {/* 3. Acciones de Stepper (Validación Admin, etc.) */}
        {(status === "ENVIADO" || status === "EN_PROCESO") && (
          isAdminUser ? (
            <>
              {!q.viewedByAdmin && (
                <Badge
                  w={stack ? "full" : "auto"}
                  textAlign="center"
                  bg="#fee2e2"
                  color="#dc2626"
                  border="1.5px solid #fca5a5"
                  px={2}
                  py={stack ? 1.5 : 1}
                  borderRadius="lg"
                  fontSize="9px"
                  fontWeight="900"
                  whiteSpace="nowrap"
                  flex={fullFlex}
                >
                  🔥 NUEVA SOLICITUD
                </Badge>
              )}
              <Button
                size={btnSize}
                minH={touchH(stack)}
                colorScheme="green"
                bg="#16a34a"
                _hover={{ bg: "#15803d" }}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                onClick={() => handleUpdateStatus(docId, "APROBADO_COMERCIAL")}
                fontWeight="800"
                borderRadius="lg"
                px={2.5}
                whiteSpace="nowrap"
                flex={halfFlex}
                minW={btnMinW}
              >
                Aprobar
              </Button>
              <Button
                size={btnSize}
                minH={touchH(stack)}
                colorScheme="red"
                variant="outline"
                onClick={() => handleUpdateStatus(docId, "RECHAZADO")}
                fontWeight="700"
                borderRadius="lg"
                px={2.5}
                whiteSpace="nowrap"
                flex={halfFlex}
                minW={btnMinW}
              >
                Rechazar
              </Button>
              {/* OBSERVAR: Devolver con motivo al vendedor */}
              <Button
                size={btnSize}
                minH={touchH(stack)}
                colorScheme="yellow"
                variant="outline"
                borderColor="#fde68a"
                color="#92400e"
                bg="#fefce8"
                _hover={{ bg: "#fef9c3", borderColor: "#fcd34d" }}
                leftIcon={<MessageSquareWarning className="w-3.5 h-3.5" />}
                onClick={() => handleObserveQuote(docId)}
                fontWeight="800"
                borderRadius="lg"
                px={2.5}
                whiteSpace="nowrap"
                flex={fullFlex}
              >
                💬 Observar
              </Button>
            </>
          ) : (
            <>
              {q.viewedByAdmin ? (
                <Badge
                  w={stack ? "full" : "auto"}
                  textAlign="center"
                  bg="#e0f2fe"
                  color="#0284c7"
                  border="1.5px solid #7dd3fc"
                  px={2.5}
                  py={1.5}
                  borderRadius="lg"
                  fontSize="10px"
                  fontWeight="900"
                  whiteSpace="nowrap"
                  flex={fullFlex}
                >
                  💎 Leído por Enrique (Admin) {q.adminViewCount > 1 ? `(${q.adminViewCount}ª lectura)` : ""}
                </Badge>
              ) : (
                <>
                  <Badge
                    w={stack ? "full" : "auto"}
                    textAlign="center"
                    bg="#f1f5f9"
                    color="#64748b"
                    border="1.5px solid #cbd5e1"
                    px={2.5}
                    py={1.5}
                    borderRadius="lg"
                    fontSize="10px"
                    fontWeight="800"
                    whiteSpace="nowrap"
                    flex={fullFlex}
                  >
                    📩 Entregado (Sin abrir)
                  </Badge>
                  {/* RECALL: Vendedor puede retirar solicitud si Enrique aún no la abrió */}
                  <Button
                    size={btnSize}
                    minH={touchH(stack)}
                    colorScheme="orange"
                    variant="outline"
                    borderColor="#fdba74"
                    color="#ea580c"
                    bg="#ffedd5"
                    _hover={{ bg: "#fed7aa", borderColor: "#f97316" }}
                    leftIcon={<Undo2 className="w-3.5 h-3.5" />}
                    onClick={() => handleRecallQuote(docId)}
                    fontWeight="800"
                    borderRadius="lg"
                    px={2.5}
                    whiteSpace="nowrap"
                    flex={fullFlex}
                  >
                    ↩️ Retirar y Corregir
                  </Button>
                </>
              )}
            </>
          )
        )}

        {status === "APROBADO_COMERCIAL" && (
          isAdminUser ? (
            <Button
              size={btnSize}
              minH={touchH(stack)}
              colorScheme="amber"
              bg="#d97706"
              color="white"
              _hover={{ bg: "#b45309" }}
              leftIcon={<FileCheck2 className="w-3.5 h-3.5" />}
              onClick={() => handleLoadQuote(q)}
              fontWeight="800"
              borderRadius="lg"
              px={2.5}
              whiteSpace="nowrap"
              flex={fullFlex}
            >
              📦 Generar Pedido
            </Button>
          ) : null
        )}

        {status === "PENDIENTE_FACTURACION" && (
          isAdminUser ? (
            <>
              <Button
                size={btnSize}
                minH={touchH(stack)}
                colorScheme="green"
                bg="#16a34a"
                _hover={{ bg: "#15803d" }}
                leftIcon={<Check className="w-3.5 h-3.5" />}
                onClick={() => handleUpdateStatus(docId, "APROBADO")}
                fontWeight="800"
                borderRadius="lg"
                px={2.5}
                whiteSpace="nowrap"
                flex={halfFlex}
                minW={btnMinW}
              >
                ⚡ Emitir Pedido
              </Button>
              <Button
                size={btnSize}
                minH={touchH(stack)}
                colorScheme="red"
                variant="outline"
                onClick={() => handleUpdateStatus(docId, "RECHAZADO")}
                fontWeight="700"
                borderRadius="lg"
                px={2.5}
                whiteSpace="nowrap"
                flex={halfFlex}
                minW={btnMinW}
              >
                Rechazar
              </Button>
            </>
          ) : (
            <Badge
              w={stack ? "full" : "auto"}
              textAlign="center"
              bg="#f3e8ff"
              color="#7c3aed"
              border="1.5px solid #c084fc"
              px={2.5}
              py={1.5}
              borderRadius="lg"
              fontSize="10px"
              fontWeight="900"
              whiteSpace="nowrap"
              flex={fullFlex}
            >
              🔮 En Validación por Asesora
            </Badge>
          )
        )}

        {/* OBSERVADO: Cotización devuelta por Enrique con observación */}
        {status === "OBSERVADO" && !isAdminUser && (
          <Button
            size={btnSize}
            minH={touchH(stack)}
            colorScheme="orange"
            bg="#ea580c"
            color="white"
            _hover={{ bg: "#c2410c" }}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            onClick={() => {
              handleLoadQuote(q);
            }}
            fontWeight="800"
            borderRadius="lg"
            px={2.5}
            whiteSpace="nowrap"
            flex={fullFlex}
          >
            ✉️ Corregir y Reenviar
          </Button>
        )}

        {/* EN_EDICION: Retirada por el vendedor para corrección */}
        {status === "EN_EDICION" && !isAdminUser && (
          <Button
            size={btnSize}
            minH={touchH(stack)}
            colorScheme="orange"
            bg="#ea580c"
            color="white"
            _hover={{ bg: "#c2410c" }}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            onClick={() => handleLoadQuote(q)}
            fontWeight="800"
            borderRadius="lg"
            px={2.5}
            whiteSpace="nowrap"
            flex={fullFlex}
          >
            ✏️ Editar y Reenviar
          </Button>
        )}

        {/* 4. Borrar / Anular / Purgar — Solo Enrique (Admin) para cotizaciones no borradores */}
        {isAdminUser && !isDraft && (
          <Tooltip
            label={
              status === "ANULADO"
                ? "Eliminar permanentemente del historial"
                : "Anular cotización (el estado cambiará a Anulado ❌)"
            }
          >
            <IconButton
              size={btnSize}
              aria-label={status === "ANULADO" ? "Eliminar" : "Anular cotización"}
              icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
              colorScheme="red"
              variant="ghost"
              _hover={{ bg: "#fef2f2" }}
              onClick={() => handleDeleteQuote(docId, status)}
              flex={stack ? "1 1 100%" : undefined}
            />
          </Tooltip>
        )}
      </Flex>
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
          <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" }} gap={3}>
            {[
              { id: "ALL", label: "Todas", count: counts.ALL, color: "#475569", bgSelected: "#475569", bgGlow: "#f1f5f9" },
              { id: "ENVIADO", label: "1. Pend. Aprobación", count: counts.ENVIADO, color: "#0284c7", bgSelected: "#0284c7", bgGlow: "#e0f2fe" },
              { id: "APROBADO_COMERCIAL", label: "2. Aprob. Comercial", count: counts.APROBADO_COMERCIAL, color: "#d97706", bgSelected: "#d97706", bgGlow: "#fef9c3" },
              { id: "PENDIENTE_FACTURACION", label: "3. Pnd. Facturación", count: counts.PENDIENTE_FACTURACION, color: "#7c3aed", bgSelected: "#7c3aed", bgGlow: "#f3e8ff" },
              { id: "APROBADO", label: "4. Pedidos Emitidos", count: counts.APROBADO, color: "#16a34a", bgSelected: "#16a34a", bgGlow: "#dcfce7" },
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
            <InputGroup size="md" maxW={{ base: "full", md: "340px" }}>
              <InputLeftElement pointerEvents="none">
                <Search className="w-4 h-4 text-gray-500" />
              </InputLeftElement>
              <Input
                placeholder="Buscar cliente, RUC o N° cotización..."
                borderRadius="xl"
                fontSize="sm"
                fontWeight="700"
                borderColor="#cbd5e1"
                _placeholder={{ color: 'gray.400' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <Tooltip label="Actualizar lista">
              <IconButton
                icon={<RefreshCw className="w-4 h-4" />}
                size="md"
                variant="outline"
                borderRadius="xl"
                onClick={loadQuotes}
                aria-label="Actualizar"
              />
            </Tooltip>
            {/* Solo Enrique (Admin) puede limpiar el historial completo */}
            {isAdminUser && (
              <Tooltip label="Solo el Administrador puede limpiar el historial completo">
                <Button
                  size="md"
                  leftIcon={<Trash2 className="w-4 h-4 text-red-600" />}
                  onClick={handleClearAll}
                  colorScheme="red"
                  variant="outline"
                  borderColor="red.200"
                  bg="red.50"
                  _hover={{ bg: "red.100" }}
                  borderRadius="xl"
                  fontWeight="800"
                  fontSize="xs"
                >
                  Limpiar Todo
                </Button>
              </Tooltip>
            )}
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
              {filteredQuotes.length === 0 ? (
                <Tr>
                  <Td colSpan={5} textAlign="center" py={12} color="gray.500" fontWeight="700" fontSize="sm">
                    No se encontraron cotizaciones en este estado.
                  </Td>
                </Tr>
              ) : (
                filteredQuotes.map((q) => {
                  const docId = q.docNumber || q.id;
                  const status = q.approvalStatus || q.state || "GENERADO";
                  const clientName = q.clientName || q.client?.CardName || "Cliente No Registrado";
                  const grandTotalUSD = calculateQuoteTotals(q.products || q.items, q.totals?.tc || 3.76).grandTotalUSD;

                  return (
                    <Tr key={docId} _hover={{ bg: "#f8fafc" }} borderBottom="1px solid" borderColor="#e2e8f0">
                      {/* Documento, Cliente y Vendedor consolidado */}
                      <Td py={3}>
                        <VStack align="flex-start" spacing={1}>
                          <HStack spacing={2} align="center">
                            <Text fontSize="sm" fontWeight="950" color="#0e572b" fontFamily="mono">{docId}</Text>
                            {q.opNum && (
                              <Badge colorScheme="purple" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                                VOUCHER: {q.opNum}
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
                          {renderStatusBadge(status)}
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

        {/* VISTA DE TARJETAS (solo móvil / tablet <lg): la tabla de 5 columnas
            con botones de acción es inusable en un teléfono, así que cada
            cotización se muestra como una tarjeta apilada y táctil. */}
        <VStack display={{ base: "flex", lg: "none" }} align="stretch" spacing={3}>
          {filteredQuotes.length === 0 ? (
            <Box bg="white" borderRadius="2xl" border="1.5px solid" borderColor="#cbd5e1" p={8} textAlign="center" color="gray.500" fontWeight="700" fontSize="sm">
              No se encontraron cotizaciones en este estado.
            </Box>
          ) : (
            filteredQuotes.map((q) => {
              const docId = q.docNumber || q.id;
              const status = q.approvalStatus || q.state || "GENERADO";
              const clientName = q.clientName || q.client?.CardName || "Cliente No Registrado";
              const grandTotalUSD = calculateQuoteTotals(q.products || q.items, q.totals?.tc || 3.76).grandTotalUSD;

              return (
                <Box key={docId} bg="white" borderRadius="2xl" border="1.5px solid" borderColor="#cbd5e1" boxShadow="sm" p={4}>
                  <VStack align="stretch" spacing={3}>
                    {/* Cabecera: documento + estado */}
                    <Flex justify="space-between" align="flex-start" gap={2} wrap="wrap">
                      <HStack spacing={2} align="center" minW={0}>
                        <Text fontSize="sm" fontWeight="950" color="#0e572b" fontFamily="mono">{docId}</Text>
                        {q.opNum && (
                          <Badge colorScheme="purple" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                            VOUCHER: {q.opNum}
                          </Badge>
                        )}
                      </HStack>
                      {renderStatusBadge(status)}
                    </Flex>

                    {/* Cliente */}
                    <Text fontWeight="900" color="#0f172a" fontSize="md" lineHeight="1.3" overflowWrap="anywhere">
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

                    {/* Fecha + Total */}
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

                    {/* Acciones táctiles */}
                    <Flex gap={2} wrap="wrap" align="center">
                      {renderRowActions(q, docId, status, { stack: true })}
                    </Flex>
                  </VStack>
                </Box>
              );
            })
          )}
        </VStack>
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

      {/* MODAL DE CONFIRMACIÓN DE BORRADO DE BORRADOR */}
      <Modal isOpen={!!deleteConfirmDoc} onClose={() => setDeleteConfirmDoc(null)} isCentered size="sm">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(3px)" />
        <ModalContent borderRadius="2xl" p={2}>
          <ModalHeader fontSize="md" fontWeight="900" color="red.700" display="flex" alignItems="center" gap={2}>
            <Trash2 className="w-5 h-5 text-red-600" /> Confirmar Borrado de Borrador
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody fontSize="xs" color="gray.600" fontWeight="600">
            ¿Estás seguro de que deseas eliminar permanentemente el borrador{" "}
            <Text as="span" fontWeight="900" color="gray.800">{deleteConfirmDoc?.docId}</Text>? Esta acción no se puede deshacer.
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
              🗑️ Sí, Eliminar Borrador
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default QuoteApprovalPage;
