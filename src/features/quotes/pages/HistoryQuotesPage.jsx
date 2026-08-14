import React, { useState, useEffect } from "react";
import {
  Box, Heading, Text, VStack, HStack, Table, Thead, Tbody, Tr, Th, Td,
  TableContainer, Badge, Button, Flex, Tabs, TabList, TabPanels, Tab, TabPanel,
  IconButton
} from "@chakra-ui/react";
import { FileText, Eye, Plus, Trash2, Clock, CheckCircle2, Bell, XCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import { useQuoteStore } from "../stores/quoteStore";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { SapQuoteDocumentModal } from "../components/SapQuoteDocumentModal";
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
  const { username } = useAuthStore();
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

  useEffect(() => {
    reloadLocal();
    reloadNotifications();
    window.addEventListener("localQuotesUpdated", reloadLocal);
    window.addEventListener("localNotificationsUpdated", reloadNotifications);
    return () => {
      window.removeEventListener("localQuotesUpdated", reloadLocal);
      window.removeEventListener("localNotificationsUpdated", reloadNotifications);
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
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const updated = saved.filter(q => (q.id || q.docNumber) !== id);
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
    window.dispatchEvent(new Event("localQuotesUpdated"));
  };

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="100px">
      <TopHeaderBanner
        title="Gestión de Cotizaciones"
        subtitle={`Centro Unificado de Creación, Historial y Aprobaciones • ${today.charAt(0).toUpperCase() + today.slice(1)}`}
        showBack={true}
        showExchangeRate={false}
        mb={6}
      />

      <Box maxW="1200px" mx="auto" px={{ base: 3, md: 6 }} mt={-6}>
        <VStack align="stretch" spacing={6}>



          {/* BARRA DE ACCIÓN PRINCIPAL */}
          <Flex
            align={{ base: "stretch", md: "center" }}
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            bg="white"
            p={{ base: 4, md: 5 }}
            borderRadius="2xl"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="sm"
            gap={4}
          >
            <HStack spacing={3} minW={0}>
              <Flex w="42px" h="42px" minW="42px" borderRadius="xl" bg="emerald.50" align="center" justify="center" color="emerald.700">
                <FileText className="w-6 h-6" />
              </Flex>
              <Box minW={0}>
                <Heading size={{ base: "sm", md: "md" }} color="emerald.900" fontWeight="900">
                  Módulo Integrado de Cotizaciones
                </Heading>
                <Text fontSize={{ base: "11px", md: "xs" }} color="gray.500">
                  Creación inmediata, historial de borradores y seguimiento por Stepper comercial
                </Text>
              </Box>
            </HStack>

            <Button
              bg="#126C36"
              color="white"
              _hover={{ bg: "#0e572b" }}
              _active={{ bg: "#0a3f1f" }}
              size="md"
              w={{ base: "full", md: "auto" }}
              flexShrink={0}
              leftIcon={<Plus className="w-4 h-4 stroke-[3]" />}
              onClick={() => {
                useQuoteStore.getState().clear();
                navigate("/newquotes");
              }}
              boxShadow="0 4px 14px rgba(18, 108, 54, 0.3)"
              fontWeight="800"
            >
              + Crear Nueva Cotización
            </Button>
          </Flex>

          {/* VISTA UNIFICADA DE SEGUIMIENTO Y BORRADORES */}
          <Box bg="white" p={{ base: 2, md: 4 }} borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
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
    </Box>
  );
}

export default HistoryQuotesPage;
