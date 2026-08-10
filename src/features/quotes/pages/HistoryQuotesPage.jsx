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

          {/* PESTAÑAS DEL MÓDULO UNIFICADO */}
          <Box bg="white" borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm" overflow="hidden">
            <Tabs colorScheme="green" variant="enclosed">
              {/* Las pestañas de texto largo se desplazan lateralmente dentro
                  de la propia barra en móvil, sin empujar el ancho de la página. */}
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
                  <HStack spacing={2} fontSize="xs">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <Text>Aprobaciones y Seguimiento (Stepper)</Text>
                  </HStack>
                </Tab>

                <Tab flexShrink={0} whiteSpace="nowrap" minH={{ base: "44px", md: "auto" }} _selected={{ bg: "white", color: "#126C36", fontWeight: "800", borderTop: "3px solid #126C36" }}>
                  <HStack spacing={2} fontSize="xs">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <Text>Borradores Guardados ({localQuotes.length})</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels p={0}>
                {/* PESTAÑA 1: SEGUIMIENTO Y STEPPER DE APROBACIONES */}
                <TabPanel p={0}>
                  <QuoteApprovalPage />
                </TabPanel>

                {/* PESTAÑA 2: HISTORIAL DE BORRADORES LOCALES */}
                <TabPanel p={{ base: 3, md: 5 }}>
                  <Flex align="center" justify="space-between" mb={4} gap={2}>
                    <Text fontSize="xs" fontWeight="800" color="gray.700" textTransform="uppercase">
                      Historial de Documentos Locales
                    </Text>
                    {localQuotes.length > 0 && (
                      <Button
                        variant="outline"
                        colorScheme="red"
                        size={{ base: "sm", md: "xs" }}
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={handleClearLocal}
                        flexShrink={0}
                      >
                        Limpiar Historial
                      </Button>
                    )}
                  </Flex>

                  {localQuotes.length === 0 ? (
                    <VStack py={12} spacing={3} color="gray.500">
                      <FileText className="w-12 h-12 text-gray-300" />
                      <Text fontSize="md" fontWeight="600">No hay cotizaciones guardadas en borrador</Text>
                      <Button
                        mt={2}
                        colorScheme="emerald"
                        size="sm"
                        onClick={() => {
                          useQuoteStore.getState().clear();
                          navigate("/newquotes");
                        }}
                      >
                        Crear Cotización
                      </Button>
                    </VStack>
                  ) : (
                    <TableContainer
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="xl"
                      overflowX="auto"
                      maxW="100%"
                      sx={{ WebkitOverflowScrolling: "touch" }}
                    >
                      <Table variant="simple" size="sm" minW="900px">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th fontSize="xs">Nº Documento</Th>
                            <Th fontSize="xs">Tipo</Th>
                            <Th fontSize="xs">Cliente</Th>
                            <Th fontSize="xs">Vendedor</Th>
                            <Th fontSize="xs">Fecha</Th>
                            <Th fontSize="xs" textAlign="right">Total Doc.</Th>
                            <Th fontSize="xs" textAlign="center">Acciones</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {localQuotes.map((q) => (
                            <Tr key={q.id || q.docNumber} _hover={{ bg: "emerald.50/40" }}>
                              <Td fontWeight="800" color="emerald.800" fontSize="xs" fontFamily="mono">
                                {q.docNumber || q.id}
                              </Td>
                              <Td>
                                <Badge colorScheme={q.docType === "PEDIDO_CLIENTE" ? "emerald" : "blue"} fontSize="0.65rem">
                                  {q.docType === "PEDIDO_CLIENTE" ? "Orden de Venta" : "Oferta de Ventas"}
                                </Badge>
                              </Td>
                              <Td fontSize="xs" fontWeight="700" color="gray.800" maxW="200px" isTruncated>
                                {q.client?.CardName || q.clientName || "Cliente No Asignado"}
                              </Td>
                              <Td fontSize="xs" color="gray.600">
                                {q.sellerName || activeSeller}
                              </Td>
                              <Td fontSize="xs" color="gray.500">
                                {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : q.docDate}
                              </Td>
                              <Td fontSize="xs" fontWeight="900" color="emerald.900" textAlign="right" fontFamily="mono">
                                {money(q.totals?.grandTotalUSD || q.totals?.grandTotal || 0, q.currency)}
                              </Td>
                              <Td textAlign="center">
                                <HStack spacing={2} justify="center">
                                  <Button
                                    size={{ base: "sm", md: "xs" }}
                                    colorScheme="emerald"
                                    variant="outline"
                                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                                    onClick={() => handleOpenPreview(q)}
                                  >
                                    Vista Previa
                                  </Button>
                                  <Button
                                    size={{ base: "sm", md: "xs" }}
                                    colorScheme="emerald"
                                    onClick={() => handleLoadQuote(q)}
                                  >
                                    Cargar
                                  </Button>
                                  <Button
                                    size={{ base: "sm", md: "xs" }}
                                    colorScheme="red"
                                    variant="outline"
                                    onClick={() => handleDeleteQuote(q.id || q.docNumber)}
                                  >
                                    Eliminar
                                  </Button>
                                </HStack>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
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
