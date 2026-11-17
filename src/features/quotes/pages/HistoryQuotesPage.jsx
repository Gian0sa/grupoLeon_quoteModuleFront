import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Heading, Text, VStack, HStack, Table, Thead, Tbody, Tr, Th, Td,
  TableContainer, Badge, Button, Flex, Tabs, TabList, TabPanels, Tab, TabPanel,
  IconButton
} from "@chakra-ui/react";
import { FileText, Eye, Plus, Trash2, Clock, CheckCircle2, Bell, XCircle, X, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import { useQuoteStore } from "../stores/quoteStore";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useHasAccess, useIsAdmin } from "../../../shared/utils/permissions";
import { useGetPromotions } from "../hooks/queries/quotesQueries";
import { ProductPromotionsModal } from "../components/ProductPromotionsModal";
import { SapQuoteDocumentModal } from "../components/SapQuoteDocumentModal";
import { SapEnvironmentBadge } from "../components/SapEnvironmentBadge";
import { QuoteApprovalPage } from "./QuoteApprovalPage";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const money = (val, currency = "USD") => {
  const num = Number(val || 0);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: currency === "PEN" ? "PEN" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export function HistoryQuotesPage() {
  const navigate = useNavigate();
  const [localQuotes, setLocalQuotes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [notifRole, setNotifRole] = useState("FACTURACION"); // "FACTURACION" vs "VENDEDOR"

  const filteredNotifs = notifications.filter(n => (n.targetRole || "VENDEDOR") === notifRole);

  const { setQuoteData, setClient, setProducts, setComment, setWhsCode, setContactPerson, setRefNumber } = useQuoteStore();
  const { username, role: authRole } = useAuthStore();
  const endpoints = useAuthStore((state) => state.endpoints);
  const [localEndpoints, setLocalEndpoints] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("endpoints") || "[]");
    } catch {
      return [];
    }
  });

  const localUser = (localStorage.getItem("username") || localStorage.getItem("userId") || "").toLowerCase();
  const localRole = (localStorage.getItem("role") || "").toUpperCase();
  const hasAccess = useHasAccess();
  const isAdmin = useIsAdmin();

  // 🛡️ Las promociones y ofertas del mes se muestran ÚNICAMENTE si el usuario
  // tiene activado explícitamente el permiso "Cotizaciones - Gestionar Ofertas del Mes y Promociones" (POST /promotions).
  // Si está inactivo o desmarcado en el perfil, el botón se oculta estrictamente sin excepción.
  const canManagePromotions = useMemo(() => {
    const list = Array.isArray(endpoints) && endpoints.length > 0 ? endpoints : localEndpoints;
    return list.some((e) => {
      if (!e) return false;
      const str = String(e).trim().toUpperCase();
      return (
        str === "POST:/PROMOTIONS" ||
        str === "POST /PROMOTIONS" ||
        str === "/PROMOTIONS" ||
        str === "POST:/QUOTEMODULE/PROMOTIONS" ||
        str === "POST /QUOTEMODULE/PROMOTIONS" ||
        str.endsWith("/PROMOTIONS")
      );
    });
  }, [endpoints, localEndpoints]);

  const canCreateQuote = isAdmin || hasAccess("POST /quotes") || hasAccess("POST:/quotes");

  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const { promotions, activeCount = 0 } = useGetPromotions();

  const activeSeller = username || localStorage.getItem("username") || "Vendedor Autorizado";
  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });

  const reloadLocal = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
      setLocalQuotes(saved);
    } catch (err) {
      console.error("Error leyendo cotizaciones locales:", err);
    }
  };

  const reloadNotifications = () => {
    try {
      const notifs = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
      setNotifications(notifs);
    } catch (err) {
      console.error("Error leyendo notificaciones:", err);
    }
  };

  const reloadPermissions = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("endpoints") || "[]");
      setLocalEndpoints(stored);
    } catch (err) {
      console.error("Error leyendo permisos locales:", err);
    }
  };

  useEffect(() => {
    reloadLocal();
    reloadNotifications();
    reloadPermissions();
    window.addEventListener("localQuotesUpdated", reloadLocal);
    window.addEventListener("localNotificationsUpdated", reloadNotifications);
    window.addEventListener("permissionsUpdated", reloadPermissions);
    return () => {
      window.removeEventListener("localQuotesUpdated", reloadLocal);
      window.removeEventListener("localNotificationsUpdated", reloadNotifications);
      window.removeEventListener("permissionsUpdated", reloadPermissions);
    };
  }, []);

  const handleClearNotifications = () => {
    localStorage.setItem("grupoLeon_notifications", "[]");
    setNotifications([]);
  };

  const handleLoadQuote = (quote) => {
    if (typeof setQuoteData === "function") {
      setQuoteData(quote);
    } else {
      if (quote.client) setClient(quote.client);
      if (quote.products) setProducts(quote.products);
      if (quote.comment) setComment(quote.comment);
      if (quote.whsCode && typeof setWhsCode === "function") setWhsCode(quote.whsCode);
      if (quote.contactPerson && typeof setContactPerson === "function") setContactPerson(quote.contactPerson);
      if (quote.refNumber && typeof setRefNumber === "function") setRefNumber(quote.refNumber);
    }

    navigate("/newquotes");
  };

  const handleOpenPreview = (quote) => {
    setSelectedQuote(quote);
    setIsPreviewOpen(true);
  };

  const handleClearLocal = () => {
    localStorage.setItem("grupoLeon_local_quotes", "[]");
    window.dispatchEvent(new Event("localQuotesUpdated"));
  };

  const handleDeleteQuote = (id) => {
    const idStr = String(id);
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const updated = saved.filter(q => String(q.id || "") !== idStr && String(q.docNumber || "") !== idStr);
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
    setLocalQuotes(updated);
    window.dispatchEvent(new Event("localQuotesUpdated"));
  };

  return (
    <Box w="full" maxW="100%" overflowX="clip" minH="100vh" bg="gray.50" pb="100px">
      <TopHeaderBanner
        title="Gestión de Cotizaciones"
        titleExtra={<SapEnvironmentBadge />}
        subtitle={`Centro Unificado de Creación, Historial y Aprobaciones • ${today.charAt(0).toUpperCase() + today.slice(1)}`}
        showBack={true}
        showExchangeRate={false}
        minH={{ base: "112px", sm: "136px", md: "200px" }}
        mb={{ base: 2, md: 5 }}
      />

      <Box maxW="1200px" w="full" minW={0} mx="auto" px={{ base: 2.5, sm: 3, md: 6 }}>
        <VStack align="stretch" spacing={{ base: 2.5, md: 5 }} w="full" minW={0}>



          {/* BARRA DE ACCIÓN PRINCIPAL */}
          <Flex
            align={{ base: "stretch", lg: "center" }}
            direction={{ base: "column", lg: "row" }}
            justify="space-between"
            bg="white"
            p={{ base: 2.5, sm: 3.5, md: 5 }}
            borderRadius={{ base: "xl", md: "2xl" }}
            border="1px solid"
            borderColor="gray.200"
            boxShadow="sm"
            gap={{ base: 2.5, md: 4 }}
            w="full"
            minW={0}
          >
            <HStack spacing={{ base: 2.5, md: 3 }} minW={0} w="full">
              <Flex
                w={{ base: "32px", md: "42px" }}
                h={{ base: "32px", md: "42px" }}
                minW={{ base: "32px", md: "42px" }}
                borderRadius={{ base: "lg", md: "xl" }}
                bg="emerald.50"
                align="center"
                justify="center"
                color="emerald.700"
              >
                <FileText className="w-4 h-4 md:w-6 md:h-6" />
              </Flex>
              <Box minW={0} flex="1">
                <Heading fontSize={{ base: "13px", sm: "md", md: "lg" }} color="emerald.900" fontWeight="900" lineHeight="1.2">
                  Módulo Integrado de Cotizaciones
                </Heading>
                <Text fontSize={{ base: "10px", md: "xs" }} color="gray.500" lineHeight="1.2" noOfLines={{ base: 1, md: 2 }}>
                  Creación inmediata, historial de borradores y seguimiento comercial
                </Text>
              </Box>
            </HStack>

            <Flex
              direction={{ base: "column", sm: "row" }}
              align="center"
              gap={{ base: 2, md: 3 }}
              w={{ base: "full", lg: "auto" }}
              flexShrink={{ base: 1, lg: 0 }}
              minW={0}
            >
              {canManagePromotions && (
                <Button
                  bg="#fef3c7"
                  color="#92400e"
                  border="1.5px solid"
                  borderColor="#f59e0b"
                  _hover={{ bg: "#fde68a", transform: "translateY(-1px)", boxShadow: "0 4px 14px rgba(245, 158, 11, 0.25)" }}
                  _active={{ bg: "#fcd34d" }}
                  size={{ base: "xs", sm: "md" }}
                  h={{ base: "34px", sm: "40px" }}
                  fontSize={{ base: "11px", sm: "sm" }}
                  w={{ base: "full", sm: "auto" }}
                  leftIcon={<Tag className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-700" />}
                  onClick={() => setIsPromoModalOpen(true)}
                  boxShadow="xs"
                  fontWeight="800"
                  borderRadius="xl"
                  whiteSpace="nowrap"
                >
                  Ofertas del Mes{activeCount > 0 ? ` (${activeCount})` : ""}
                </Button>
              )}

              {canCreateQuote && (
                <Button
                  bg="#126C36"
                  color="white"
                  _hover={{ bg: "#0e572b", transform: "translateY(-1px)", boxShadow: "0 6px 18px rgba(18, 108, 54, 0.35)" }}
                  _active={{ bg: "#0a3f1f" }}
                  size="md"
                  h={{ base: "46px", md: "44px" }}
                  fontSize={{ base: "15px", md: "sm" }}
                  w={{ base: "full", sm: "auto" }}
                  whiteSpace="nowrap"
                  leftIcon={<Plus className="w-4 h-4 stroke-[3]" />}
                  onClick={() => {
                    useQuoteStore.getState().clear();
                    navigate("/newquotes");
                  }}
                  boxShadow="0 4px 14px rgba(18, 108, 54, 0.3)"
                  fontWeight="900"
                  borderRadius="xl"
                >
                  Crear Nueva Cotización
                </Button>
              )}
            </Flex>
          </Flex>

          {/* VISTA UNIFICADA DE SEGUIMIENTO Y BORRADORES */}
          <Box
            bg={{ base: "transparent", md: "white" }}
            p={{ base: 0, md: 4 }}
            borderRadius={{ base: "none", md: "2xl" }}
            borderWidth={{ base: 0, md: "1px" }}
            borderColor="gray.200"
            boxShadow={{ base: "none", md: "sm" }}
            w="full"
            minW={0}
            overflowX="clip"
          >
            <QuoteApprovalPage />
          </Box>
        </VStack>
      </Box>

      {/* MODAL DE VISTA PREVIA DE COTIZACIÓN */}
      <SapQuoteDocumentModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        quote={selectedQuote}
        onLoadToForm={handleLoadQuote}
      />

      {/* MODAL DE GESTIÓN DE OFERTAS DEL MES */}
      {canManagePromotions && (
        <ProductPromotionsModal
          isOpen={isPromoModalOpen}
          onClose={() => setIsPromoModalOpen(false)}
        />
      )}
    </Box>
  );
}

export default HistoryQuotesPage;
