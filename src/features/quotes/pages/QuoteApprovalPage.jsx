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
  Tooltip
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
  Filter,
  Check,
  Trash2
} from "lucide-react";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import { QuoteStepper, getStageIndex } from "../components/QuoteStepper";
import { QuoteDetailDrawer } from "../components/QuoteDetailDrawer";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function QuoteApprovalPage() {
  const toast = useToast();
  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });

  const [quotes, setQuotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("ALL");
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Cargar cotizaciones desde localStorage (Sandbox local)
  const loadQuotes = () => {
    try {
      const stored = localStorage.getItem("grupoLeon_local_quotes");
      if (stored) {
        const parsed = JSON.parse(stored);
        setQuotes(Array.isArray(parsed) ? parsed : []);
      } else {
        // Datos iniciales de demostración si no hay guardados
        const mockQuotes = [
          {
            id: "COT-634119",
            docNumber: "COT-634119",
            docType: "OFERTA_VENTA",
            clientName: "GRUPO PANA S.A.",
            clientDocument: "20100144922",
            sellerName: "Enrique",
            docDate: "2026-08-08",
            totals: { subtotalUSD: 13.21, grandTotalUSD: 13.21, grandTotalSOL: 49.66, tc: 3.76 },
            approvalStatus: "GENERADO",
            historyLog: [{ status: "GENERADO", timestamp: new Date().toISOString(), user: "Enrique", note: "Cotización creada" }]
          },
          {
            id: "COT-030291",
            docNumber: "COT-030291",
            docType: "OFERTA_VENTA",
            clientName: "MOTRIX J & C S.A.C.",
            clientDocument: "20600433386",
            sellerName: "Enrique",
            docDate: "2026-08-07",
            totals: { subtotalUSD: 172.90, grandTotalUSD: 204.02, grandTotalSOL: 767.12, tc: 3.76 },
            approvalStatus: "ENVIADO",
            historyLog: [
              { status: "GENERADO", timestamp: "2026-08-07T10:00:00Z", user: "Enrique", note: "Cotización creada" },
              { status: "ENVIADO", timestamp: "2026-08-07T11:30:00Z", user: "Enrique", note: "Enviado por correo a cliente" }
            ]
          },
          {
            id: "COT-972099",
            docNumber: "COT-972099",
            docType: "OFERTA_VENTA",
            clientName: "CABALLERO JULCHA ANGEL",
            clientDocument: "10429104812",
            sellerName: "Enrique",
            docDate: "2026-08-07",
            totals: { subtotalUSD: 85.00, grandTotalUSD: 100.30, grandTotalSOL: 377.12, tc: 3.76 },
            approvalStatus: "EN_PROCESO",
            historyLog: [
              { status: "GENERADO", timestamp: "2026-08-07T09:00:00Z", user: "Enrique", note: "Cotización creada" },
              { status: "ENVIADO", timestamp: "2026-08-07T09:15:00Z", user: "Enrique", note: "Enviado a cliente" },
              { status: "EN_PROCESO", timestamp: "2026-08-07T14:20:00Z", user: "Supervisor", note: "En revisión de margen por descuento" }
            ]
          }
        ];
        setQuotes(mockQuotes);
        localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(mockQuotes));
      }
    } catch (err) {
      console.error("Error al cargar cotizaciones:", err);
      setQuotes([]);
    }
  };

  const handleDeleteQuote = (id) => {
    const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    const updated = saved.filter(q => (q.id || q.docNumber) !== id);
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
    window.dispatchEvent(new Event("localQuotesUpdated"));
    toast({
      title: "Cotización Eliminada",
      description: `La cotización ${id} ha sido borrada del historial.`,
      status: "success",
      duration: 3000,
      isClosable: true
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

  // Transición de Estado del Workflow (Stepper)
  const handleUpdateStatus = (docId, newStatus) => {
    const updated = quotes.map((q) => {
      if (q.id === docId || q.docNumber === docId) {
        const currentLog = q.historyLog || [];
        const newLogEntry = {
          status: newStatus,
          timestamp: new Date().toISOString(),
          user: "Enrique",
          note:
            newStatus === "ENVIADO"
              ? "Enviado a Cliente / Aprobador"
              : newStatus === "EN_PROCESO"
              ? "Puesto En Proceso de Revisión"
              : newStatus === "APROBADO"
              ? "Aprobado exitosamente — Listo para facturar"
              : "Rechazado"
        };
        return {
          ...q,
          approvalStatus: newStatus,
          historyLog: [newLogEntry, ...currentLog]
        };
      }
      return q;
    });

    setQuotes(updated);
    localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));

    if (selectedQuote && (selectedQuote.id === docId || selectedQuote.docNumber === docId)) {
      setSelectedQuote((prev) => ({
        ...prev,
        approvalStatus: newStatus,
        historyLog: [
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            user: "Enrique",
            note: "Actualización desde detalle"
          },
          ...(prev.historyLog || [])
        ]
      }));
    }

    toast({
      title: `Estado Actualizado: ${newStatus}`,
      description: `La cotización ${docId} avanzó en el flujo comercial.`,
      status: newStatus === "APROBADO" ? "success" : newStatus === "RECHAZADO" ? "error" : "info",
      duration: 3500,
      isClosable: true
    });
  };

  // Filtrado de la lista por Pestañas y Buscador
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const currentStatus = q.approvalStatus || q.state || "GENERADO";

      // Filtro por pestaña
      if (selectedTab === "GENERADO" && currentStatus !== "GENERADO" && currentStatus !== "DRAFT" && currentStatus !== "draft") return false;
      if (selectedTab === "ENVIADO" && currentStatus !== "ENVIADO") return false;
      if (selectedTab === "EN_PROCESO" && currentStatus !== "EN_PROCESO") return false;
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

  // Contadores por Estado
  const counts = useMemo(() => {
    const res = { ALL: quotes.length, GENERADO: 0, ENVIADO: 0, EN_PROCESO: 0, APROBADO: 0, RECHAZADO: 0 };
    quotes.forEach((q) => {
      const st = q.approvalStatus || q.state || "GENERADO";
      if (st === "ENVIADO") res.ENVIADO++;
      else if (st === "EN_PROCESO") res.EN_PROCESO++;
      else if (st === "APROBADO") res.APROBADO++;
      else if (st === "RECHAZADO") res.RECHAZADO++;
      else res.GENERADO++;
    });
    return res;
  }, [quotes]);

  const renderStatusBadge = (status) => {
    switch (status) {
      case "GENERADO":
      case "DRAFT":
      case "draft":
        return (
          <Badge bg="#eff6ff" color="#1e40af" border="1.5px solid #bfdbfe" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            1. Creado (Borrador)
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
      case "APROBADO":
        return (
          <Badge bg="#dcfce7" color="#166534" border="1.5px solid #bbf7d0" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            4. Listo Facturar
          </Badge>
        );
      case "RECHAZADO":
        return (
          <Badge bg="#fee2e2" color="#991b1b" border="1.5px solid #fecaca" px={3} py={1.5} borderRadius="full" fontSize="xs" fontWeight="900" textTransform="uppercase" letterSpacing="wider">
            Rechazado
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
  const renderRowActions = (q, docId, status, { stack = false } = {}) => (
    <>
      <Tooltip label="Ver detalle completo de cotización">
        <IconButton
          icon={<Eye className="w-4 h-4" />}
          size="sm"
          minH={touchH(stack)}
          minW={touchH(stack)}
          variant="solid"
          bg="gray.100"
          color="gray.700"
          _hover={{ bg: "gray.200" }}
          onClick={() => {
            setSelectedQuote(q);
            setIsDetailOpen(true);
          }}
          aria-label="Ver Detalle"
          borderRadius="lg"
          flexShrink={0}
        />
      </Tooltip>

      <Tooltip label="Eliminar cotización del historial">
        <IconButton
          icon={<Trash2 className="w-4 h-4" />}
          size="sm"
          minH={touchH(stack)}
          minW={touchH(stack)}
          variant="solid"
          colorScheme="red"
          onClick={() => handleDeleteQuote(docId)}
          aria-label="Eliminar"
          borderRadius="lg"
          flexShrink={0}
        />
      </Tooltip>

      {status === "GENERADO" && (
        <Button
          size="sm"
          minH={touchH(stack)}
          colorScheme="blue"
          leftIcon={<Send className="w-3.5 h-3.5" />}
          onClick={() => handleUpdateStatus(docId, "ENVIADO")}
          fontWeight="800"
          px={3.5}
          borderRadius="lg"
          flex={stack ? "1" : undefined}
        >
          Enviar
        </Button>
      )}

      {status === "ENVIADO" && (
        <Button
          size="sm"
          minH={touchH(stack)}
          colorScheme="purple"
          leftIcon={<Clock className="w-3.5 h-3.5" />}
          onClick={() => handleUpdateStatus(docId, "EN_PROCESO")}
          fontWeight="800"
          px={3.5}
          borderRadius="lg"
          flex={stack ? "1" : undefined}
        >
          Procesar
        </Button>
      )}

      {status === "EN_PROCESO" && (
        <>
          <Button
            size="sm"
            minH={touchH(stack)}
            colorScheme="green"
            bg="#16a34a"
            _hover={{ bg: "#15803d" }}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            onClick={() => handleUpdateStatus(docId, "APROBADO")}
            fontWeight="800"
            borderRadius="lg"
            flex={stack ? "1" : undefined}
          >
            Aprobar
          </Button>
          <Button
            size="sm"
            minH={touchH(stack)}
            colorScheme="red"
            variant="outline"
            onClick={() => handleUpdateStatus(docId, "RECHAZADO")}
            fontWeight="700"
            borderRadius="lg"
            flex={stack ? "1" : undefined}
          >
            Rechazar
          </Button>
        </>
      )}

      {status === "APROBADO" && (
        <Badge bg="#dcfce7" color="#15803d" px={2.5} py={1.5} borderRadius="lg" fontSize="10px" fontWeight="900" border="1.5px solid #bbf7d0">
          ✓ Aprobado
        </Badge>
      )}

      {status === "RECHAZADO" && (
        <Badge bg="#fee2e2" color="#b91c1c" px={2.5} py={1.5} borderRadius="lg" fontSize="10px" fontWeight="900" border="1.5px solid #fecaca">
          Rechazado
        </Badge>
      )}
    </>
  );

  return (
    <Box w="full" py={2}>
      <VStack align="stretch" spacing={5}>
        {/* KPI CARDS: BOTONES GRANDES DE FILTRADO TÁCTIL */}
        <Box bg="#f8fafc" p={4} borderRadius="2xl" border="1px solid" borderColor="#e2e8f0" boxShadow="xs">
          <Text fontSize="xs" fontWeight="900" color="#475569" mb={3} textTransform="uppercase" letterSpacing="wider">
            Filtrar Cotizaciones por Fase Comercial (Toca para seleccionar):
          </Text>
          <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(5, 1fr)" }} gap={3}>
            {[
              { id: "ALL", label: "Todas", count: counts.ALL, color: "#475569", bgSelected: "#475569", bgGlow: "#f1f5f9" },
              { id: "GENERADO", label: "1. Creadas", count: counts.GENERADO, color: "#2563eb", bgSelected: "#2563eb", bgGlow: "#eff6ff" },
              { id: "ENVIADO", label: "2. Enviadas", count: counts.ENVIADO, color: "#0284c7", bgSelected: "#0284c7", bgGlow: "#e0f2fe" },
              { id: "EN_PROCESO", label: "3. En Revisión", count: counts.EN_PROCESO, color: "#7c3aed", bgSelected: "#7c3aed", bgGlow: "#f3e8ff" },
              { id: "APROBADO", label: "4. Aprobadas", count: counts.APROBADO, color: "#16a34a", bgSelected: "#16a34a", bgGlow: "#dcfce7" }
            ].map((card) => {
              const isSelected = selectedTab === card.id;
              return (
                <Box
                  key={card.id}
                  onClick={() => setSelectedTab(card.id)}
                  cursor="pointer"
                  bg={isSelected ? card.bgSelected : "white"}
                  color={isSelected ? "white" : card.color}
                  p={4}
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
                  <Text fontSize="2xl" fontWeight="900" lineHeight="1">{card.count}</Text>
                  <Text fontSize="11px" fontWeight="800" mt={1.5} textTransform="uppercase" letterSpacing="tight">
                    {card.label}
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
            <IconButton
              icon={<RefreshCw className="w-4 h-4" />}
              size="md"
              variant="outline"
              colorScheme="emerald"
              onClick={loadQuotes}
              aria-label="Refrescar"
              borderRadius="xl"
            />
          </HStack>
        </Flex>

        {/* TABLA PRINCIPAL OPTIMIZADA CON ALTO CONTRASTE (solo escritorio) */}
        <Box display={{ base: "none", lg: "block" }} bg="white" borderRadius="2xl" border="1.5px solid" borderColor="#cbd5e1" boxShadow="sm" overflow="hidden" width="100%">
          <Table variant="simple" size="md" style={{ tableLayout: "fixed", width: "100%" }}>
            <Thead bg="#0e572b">
              <Tr>
                <Th py={4} fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" width="38%">DOCUMENTO Y CLIENTE</Th>
                <Th fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" width="12%">FECHA</Th>
                <Th fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" textAlign="right" width="14%">TOTAL (USD)</Th>
                <Th fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" textAlign="center" width="18%">ESTADO DE APROBACIÓN</Th>
                <Th fontSize="xs" color="white" fontWeight="900" letterSpacing="wider" textAlign="right" width="18%">ACCIONES DISPONIBLES</Th>
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
                  const grandTotalUSD = q.totals?.grandTotalUSD || q.totals?.grandTotal || 0;

                  return (
                    <Tr key={docId} _hover={{ bg: "#f8fafc" }} borderBottom="1px solid" borderColor="#e2e8f0">
                      {/* Documento, Cliente y Vendedor consolidado */}
                      <Td py={3}>
                        <VStack align="flex-start" spacing={1}>
                          <HStack spacing={2} align="center">
                            <Text fontSize="sm" fontWeight="950" color="#0e572b" fontFamily="mono">{docId}</Text>
                            <Badge colorScheme="purple" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                              VOUCHER BCP: 0169944
                            </Badge>
                          </HStack>
                          <Text fontWeight="900" color="#0f172a" fontSize="sm" lineHeight="tight" isTruncated maxW="380px">
                            {clientName}
                          </Text>
                          <HStack spacing={2} wrap="wrap">
                            <Badge bg="#f1f5f9" color="#475569" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="700">
                              Vend: {q.sellerName || "Eric Acuña (540)"}
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
              const grandTotalUSD = q.totals?.grandTotalUSD || q.totals?.grandTotal || 0;

              return (
                <Box key={docId} bg="white" borderRadius="2xl" border="1.5px solid" borderColor="#cbd5e1" boxShadow="sm" p={4}>
                  <VStack align="stretch" spacing={3}>
                    {/* Cabecera: documento + estado */}
                    <Flex justify="space-between" align="flex-start" gap={2} wrap="wrap">
                      <HStack spacing={2} align="center" minW={0}>
                        <Text fontSize="sm" fontWeight="950" color="#0e572b" fontFamily="mono">{docId}</Text>
                        <Badge colorScheme="purple" fontSize="9px" px={2} py={0.5} borderRadius="md" fontWeight="800">
                          VOUCHER BCP: 0169944
                        </Badge>
                      </HStack>
                      {renderStatusBadge(status)}
                    </Flex>

                    {/* Cliente */}
                    <Text fontWeight="900" color="#0f172a" fontSize="md" lineHeight="1.3" overflowWrap="anywhere">
                      {clientName}
                    </Text>

                    <HStack spacing={2} wrap="wrap">
                      <Badge bg="#f1f5f9" color="#475569" fontSize="10px" px={2} py={0.5} borderRadius="md" fontWeight="700">
                        Vend: {q.sellerName || "Eric Acuña (540)"}
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
    </Box>
  );
}

export default QuoteApprovalPage;
