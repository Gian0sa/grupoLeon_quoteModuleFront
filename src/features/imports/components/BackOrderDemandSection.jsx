import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Card,
  CardBody,
  SimpleGrid,
  useColorModeValue,
  Icon,
  Tooltip,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Tag,
  TagLabel,
  useToast,
} from "@chakra-ui/react";
import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Package,
  User,
  FileText,
  RefreshCw,
  AlertTriangle,
  Layers,
  ListFilter,
  CheckCircle2,
  Calendar,
  Building2,
  FileSpreadsheet,
  Download,
  Clock,
  Flame,
  Ship,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useBackOrderDemands } from "../hooks/importQueries";
import { useIsAdmin } from "../../../shared/utils/permissions";
import {
  getTodayPeruDateString,
  getQuoteDateString,
  formatDateDisplayPeru,
  formatQuoteSellerName,
} from "../../../shared/utils/quoteLogisticsFormatters";

export const formatPriorityLabel = (priority) => {
  if (!priority) return "EN EVALUACIÓN";
  const p = String(priority).toUpperCase().trim();
  if (p === "ALTA" || p.includes("SÍ") || p.includes("SI") || p.includes("PRIORI")) {
    return "CON PRIORIZACIÓN (PEDIR SÍ O SÍ)";
  }
  if (p === "PROXIMO" || p.includes("EMBARQUE")) {
    return "PRÓXIMO EN EMBARQUE";
  }
  if (p === "NO_PRIORITARIO" || p.includes("NO")) {
    return "NO PRIORITARIO";
  }
  return "EN EVALUACIÓN";
};

export function BackOrderDemandSection() {
  const [search, setSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState("");
  const [viewMode, setViewMode] = useState("grouped"); // 'grouped' | 'table'
  const [selectedDate, setSelectedDate] = useState(() => getTodayPeruDateString());
  const [currentPeruDate, setCurrentPeruDate] = useState(() => getTodayPeruDateString());
  const toast = useToast();
  const isAdmin = useIsAdmin();

  // ─── Cierre y avance automático a medianoche (11:59:59 PM -> 00:00:00 AM PET) ───
  // Si pasa al siguiente día, se archiva el día anterior y se reinicia automáticamente en limpio para el nuevo día.
  useEffect(() => {
    const interval = setInterval(() => {
      const today = getTodayPeruDateString();
      if (today !== currentPeruDate) {
        if (selectedDate === currentPeruDate) {
          setSelectedDate(today);
        }
        setCurrentPeruDate(today);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [currentPeruDate, selectedDate]);

  // Escuchar y sincronizar cotizaciones locales en tiempo real
  const [localQuotes, setLocalQuotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    const handleLocalUpdate = () => {
      try {
        setLocalQuotes(JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]"));
      } catch (e) {}
    };
    window.addEventListener("localQuotesUpdated", handleLocalUpdate);
    window.addEventListener("storage", handleLocalUpdate);
    return () => {
      window.removeEventListener("localQuotesUpdated", handleLocalUpdate);
      window.removeEventListener("storage", handleLocalUpdate);
    };
  }, []);

  const {
    backOrdersData,
    isLoadingBackOrders,
    isFetchingBackOrders,
    errorBackOrders,
    refetchBackOrders,
  } = useBackOrderDemands({
    sellerName: selectedSeller || undefined,
    search: search || undefined,
  });

  const bgCard = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const headerBg = useColorModeValue("gray.50", "gray.750");
  const hoverRowBg = useColorModeValue("blue.50", "whiteAlpha.100");
  const mutedText = useColorModeValue("gray.600", "gray.400");

  // ─── Consolidar Demanda Back Order (Backend + Cotizaciones Locales) ───
  const allBackOrderItems = useMemo(() => {
    const backendItems = backOrdersData?.items || [];
    const itemMap = new Map();

    // 1. Agregar items oficiales del backend
    backendItems.forEach((it) => {
      const pCode = String(it.productCode || it.itemCode || it.code || "").trim();
      const docNum = String(it.docNumber || it.quoteId || "").trim();
      const key = `${docNum}-${pCode}`.toUpperCase();
      itemMap.set(key, {
        ...it,
        sellerName: formatQuoteSellerName(it),
        clientCardCode: it.clientCardCode || it.CardCode || it.clientDocument || "",
        importPriority: it.importPriority || "EVALUACION",
      });
    });

    // 2. Extraer y fusionar items de cotizaciones locales (garantiza sincronización inmediata)
    (localQuotes || []).forEach((q) => {
      if (!q) return;
      const docNum = q.sapDocNum 
        ? `COT-${String(q.sapDocNum).padStart(6, "0")}` 
        : (q.docNumber && !String(q.docNumber).match(/^COT-0+\d+$/i) ? q.docNumber : `COT-WEB-${String(q.id || "").padStart(6, "0")}`);
      const seller = formatQuoteSellerName(q);
      const clientName = q.clientName || q.client?.CardName || "Cliente General";
      const clientDoc = q.clientDocument || q.clientRuc || q.client?.CardCode || "";
      const clientCardCode = q.client?.CardCode || q.clientCardCode || q.CardCode || (String(clientDoc).startsWith("C") ? clientDoc : "");
      const docDate = q.docDate || (q.createdAt ? q.createdAt.split("T")[0] : "");
      const state = q.approvalStatus || q.state || q.status || "BORRADOR";

      let rawBackItems = q.backOrderItems || q.totals?.backOrderItems || q.totals?.backOrderProducts || [];
      if (!rawBackItems || rawBackItems.length === 0) {
        const candidateProducts = q.products || q.items || q.totals?.normalizedProducts || [];
        rawBackItems = candidateProducts.filter((p) => {
          if (!p) return false;
          const isAgotado = p.isAgotado === true || p.isAgotado === 1 || p.isAgotado === "true" || p.isAgotado === "Y";
          const stk = p.stock !== undefined && p.stock !== null ? Number(p.stock) : (p.stockChecked ? 0 : 1);
          return isAgotado || stk <= 0;
        });
      }

      (rawBackItems || []).forEach((p, idx) => {
        const pCode = String(p.productCode || p.code || p.id || p.itemCode || "S/C").trim();
        const pName = String(p.productName || p.name || p.description || p.ItemDescription || "Artículo Sin Stock").trim();
        const pSigla = p.sigla || p.Sigla || p.U_TQC_SIGLA || "";
        const pQty = Number(p.quantity || p.Quantity || 1);
        const pWhs = p.whsCode || p.WhsCode || "014";
        const pStock = p.stock !== undefined && p.stock !== null ? Number(p.stock) : 0;
        const pPriority = p.importPriority || "EVALUACION";
        const key = `${docNum}-${pCode}`.toUpperCase();

        const existing = itemMap.get(key);
        if (!existing) {
          itemMap.set(key, {
            id: `${docNum}-${pCode}-${idx}`,
            quoteId: q.id,
            docNumber: docNum,
            docDate,
            createdAt: q.createdAt,
            sellerName: seller,
            createdByUsername: q.createdByUsername || seller,
            clientName,
            clientDocument: clientDoc,
            clientCardCode: clientCardCode || clientDoc,
            productCode: pCode,
            productName: pName,
            sigla: pSigla,
            whsCode: pWhs,
            quantity: pQty,
            stock: pStock,
            state,
            approvalStatus: state,
            importPriority: pPriority,
          });
        } else if (p.importPriority && p.importPriority !== existing.importPriority) {
          existing.importPriority = p.importPriority;
        }
      });
    });

    return Array.from(itemMap.values());
  }, [backOrdersData?.items, localQuotes]);

  // Función para actualizar la prioridad de un artículo directamente
  const handleUpdatePriority = (item, newPriority) => {
    try {
      const saved = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
      let matched = false;
      const updated = saved.map((q) => {
        const isMatch = (q.docNumber && q.docNumber === item.docNumber) || (q.id && String(q.id) === String(item.quoteId));
        if (!isMatch) return q;
        matched = true;

        const updateItemArray = (arr = []) =>
          arr.map((p) => {
            const pCode = String(p.code || p.id || p.productCode || p.itemCode || "").trim();
            if (pCode === item.productCode) {
              return { ...p, importPriority: newPriority };
            }
            return p;
          });

        const nextProducts = updateItemArray(q.products || []);
        const nextBackOrder = updateItemArray(q.backOrderItems || q.totals?.backOrderItems || []);

        return {
          ...q,
          products: nextProducts,
          backOrderItems: nextBackOrder,
          totals: {
            ...(q.totals || {}),
            backOrderItems: nextBackOrder,
            backOrderProducts: nextBackOrder,
          },
        };
      });

      if (matched) {
        localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
        window.dispatchEvent(new Event("localQuotesUpdated"));
      }

      toast({
        title: "Prioridad Asignada",
        description: `${item.productCode} (${item.docNumber}): ${formatPriorityLabel(newPriority)}`,
        status: "success",
        duration: 3500,
        isClosable: true,
      });
    } catch (err) {
      console.error("Error al actualizar prioridad:", err);
    }
  };

  // ─── Filtrado Exclusivamente DIARIO (por fecha seleccionada en Calendario) ───
  const periodFilteredItems = useMemo(() => {
    if (!selectedDate) return [];

    return allBackOrderItems.filter((it) => {
      const itDate = getQuoteDateString(it);
      return itDate === selectedDate;
    });
  }, [allBackOrderItems, selectedDate]);

  // Resumen Dinámico de Métricas Rápidas
  const summary = useMemo(() => {
    const totalBackOrders = periodFilteredItems.length;
    const totalQuantity = periodFilteredItems.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
    const uniqueQuotes = new Set(periodFilteredItems.map((it) => it.docNumber || it.quoteId));
    const uniqueSellers = new Set(periodFilteredItems.map((it) => it.sellerName).filter(Boolean));
    const sellersList = Array.from(uniqueSellers).sort();

    return {
      totalBackOrders,
      totalQuantity,
      totalQuotes: uniqueQuotes.size,
      sellersCount: uniqueSellers.size,
      sellersList,
    };
  }, [periodFilteredItems]);

  // Filtrado final por búsqueda y vendedor
  const filteredItems = useMemo(() => {
    let list = periodFilteredItems;
    if (selectedSeller) {
      list = list.filter((it) => (it.sellerName || "").toLowerCase().includes(selectedSeller.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter((it) =>
        (it.productCode && it.productCode.toLowerCase().includes(q)) ||
        (it.productName && it.productName.toLowerCase().includes(q)) ||
        (it.sellerName && it.sellerName.toLowerCase().includes(q)) ||
        (it.clientName && it.clientName.toLowerCase().includes(q)) ||
        (it.clientDocument && it.clientDocument.toLowerCase().includes(q)) ||
        (it.clientCardCode && it.clientCardCode.toLowerCase().includes(q)) ||
        (it.docNumber && it.docNumber.toLowerCase().includes(q)) ||
        (it.sigla && it.sigla.toLowerCase().includes(q))
      );
    }
    return list;
  }, [periodFilteredItems, selectedSeller, search]);

  // Agrupación por Vendedor
  const groupedBySeller = useMemo(() => {
    const groups = {};
    filteredItems.forEach((it) => {
      const seller = it.sellerName || "Sin Vendedor";
      if (!groups[seller]) {
        groups[seller] = {
          sellerName: seller,
          items: [],
          totalItems: 0,
          totalQuantity: 0,
          uniqueQuotes: new Set(),
        };
      }
      groups[seller].items.push(it);
      groups[seller].totalItems += 1;
      groups[seller].totalQuantity += Number(it.quantity || 0);
      groups[seller].uniqueQuotes.add(it.docNumber);
    });

    return Object.values(groups)
      .map((g) => ({
        ...g,
        quotesCount: g.uniqueQuotes.size,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [filteredItems]);

  const sellerOptions = useMemo(() => summary.sellersList || [], [summary.sellersList]);

  // ─── Exportación Oficial a Excel (.xlsx) con Fecha Diaria y Priorización ───
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      toast({
        title: "Sin datos para exportar",
        description: `No hay artículos en Demanda Back Order para la fecha seleccionada (${selectedDate}).`,
        status: "warning",
        duration: 3500,
        isClosable: true,
      });
      return;
    }

    try {
      const exportRows = filteredItems.map((it, idx) => ({
        "N°": idx + 1,
        "Vendedor (Persona que Cotizó)": it.sellerName || "—",
        "Código SAP Cliente (CardCode)": it.clientCardCode || it.clientDocument || "—",
        "RUC / Documento Cliente": it.clientDocument || "—",
        "Cliente / Razón Social": it.clientName || "—",
        "N° Cotización": it.docNumber || "—",
        "Fecha Pedido / Cotización": it.docDate || "—",
        "Código Producto (Cotizador / SAP)": it.productCode || "—",
        "Descripción del Producto": it.productName || "—",
        "Sigla / Marca": it.sigla || "—",
        "Cantidad Solicitada (Demanda)": Number(it.quantity || 0),
        "Almacén Solicitado": it.whsCode || "014",
        "Stock Disponible": Number(it.stock || 0),
        "Priorización Importación": formatPriorityLabel(it.importPriority),
        "Estado Cotización": it.approvalStatus || it.state || "—",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportRows);

      // Anchos de columna óptimos para lectura ejecutiva
      ws["!cols"] = [
        { wch: 6 },   // N°
        { wch: 28 },  // Vendedor
        { wch: 22 },  // Código SAP Cliente
        { wch: 18 },  // RUC / Doc
        { wch: 38 },  // Cliente / Razón Social
        { wch: 18 },  // N° Cotización
        { wch: 18 },  // Fecha Pedido
        { wch: 24 },  // Código Producto
        { wch: 45 },  // Descripción
        { wch: 16 },  // Sigla / Marca
        { wch: 18 },  // Cantidad Solicitada
        { wch: 14 },  // Almacén
        { wch: 14 },  // Stock
        { wch: 32 },  // Priorización Importación
        { wch: 18 },  // Estado
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Demanda_Diaria");
      const fileName = `Reporte_BackOrder_Diario_${selectedDate}_GrupoLeon.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "📥 Reporte Diario Descargado",
        description: `Se exportaron ${filteredItems.length} registros del ${selectedDate} a "${fileName}".`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error("Error al exportar Excel:", err);
      toast({
        title: "Error al generar Excel",
        description: err.message || "Ocurrió un error al compilar el archivo Excel.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const periodButtonLabel = selectedDate === currentPeruDate ? `Hoy (${formatDateDisplayPeru(selectedDate)})` : formatDateDisplayPeru(selectedDate);

  return (
    <Box w="full">
      {/* ─── Encabezado y Métricas Rápidas ─── */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={5}>
        <Card bg={bgCard} border="1px solid" borderColor={borderColor} shadow="sm" borderRadius="xl">
          <CardBody p={4}>
            <HStack justify="space-between" align="start">
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" color={mutedText}>
                  Demanda Back Order
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="red.500">
                  {summary.totalBackOrders}
                </Text>
                <Text fontSize="xs" color={mutedText}>Ítems cotizados sin stock</Text>
              </VStack>
              <Flex p={2} bg="red.50" color="red.600" borderRadius="lg">
                <Icon as={Package} boxSize={5} />
              </Flex>
            </HStack>
          </CardBody>
        </Card>

        <Card bg={bgCard} border="1px solid" borderColor={borderColor} shadow="sm" borderRadius="xl">
          <CardBody p={4}>
            <HStack justify="space-between" align="start">
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" color={mutedText}>
                  Unidades Demandadas
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                  {summary.totalQuantity}
                </Text>
                <Text fontSize="xs" color={mutedText}>Unidades solicitadas</Text>
              </VStack>
              <Flex p={2} bg="orange.50" color="orange.600" borderRadius="lg">
                <Icon as={Layers} boxSize={5} />
              </Flex>
            </HStack>
          </CardBody>
        </Card>

        <Card bg={bgCard} border="1px solid" borderColor={borderColor} shadow="sm" borderRadius="xl">
          <CardBody p={4}>
            <HStack justify="space-between" align="start">
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" color={mutedText}>
                  Cotizaciones
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                  {summary.totalQuotes}
                </Text>
                <Text fontSize="xs" color={mutedText}>Documentos con back order</Text>
              </VStack>
              <Flex p={2} bg="blue.50" color="blue.600" borderRadius="lg">
                <Icon as={FileText} boxSize={5} />
              </Flex>
            </HStack>
          </CardBody>
        </Card>

        <Card bg={bgCard} border="1px solid" borderColor={borderColor} shadow="sm" borderRadius="xl">
          <CardBody p={4}>
            <HStack justify="space-between" align="start">
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" color={mutedText}>
                  Vendedores
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                  {summary.sellersCount}
                </Text>
                <Text fontSize="xs" color={mutedText}>Vendedores con demanda</Text>
              </VStack>
              <Flex p={2} bg="purple.50" color="purple.600" borderRadius="lg">
                <Icon as={User} boxSize={5} />
              </Flex>
            </HStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* ─── Barra de Filtros, Períodos y Búsqueda ─── */}
      <Card bg={bgCard} border="1px solid" borderColor={borderColor} shadow="sm" borderRadius="xl" mb={6}>
        <CardBody p={4}>
          <VStack spacing={3} align="stretch">
            {/* Fila 1: Selector Diario con Calendario y Control de Fecha */}
            <Flex
              direction={{ base: "column", lg: "row" }}
              justify="space-between"
              align={{ base: "stretch", lg: "center" }}
              wrap="wrap"
              gap={3}
              bg={useColorModeValue("blue.50", "whiteAlpha.50")}
              p={3}
              borderRadius="xl"
              border="1.5px solid"
              borderColor={useColorModeValue("blue.200", "blue.800")}
            >
              <HStack spacing={2.5} wrap="wrap" align="center">
                <HStack spacing={1.5}>
                  <Icon as={Calendar} boxSize={4} color="blue.600" />
                  <Text fontSize="xs" fontWeight="900" color="blue.950" textTransform="uppercase" letterSpacing="wide">
                    Reporte Diario:
                  </Text>
                </HStack>

                {/* Botón rápido "Hoy" */}
                <Button
                  size="xs"
                  borderRadius="lg"
                  fontWeight="900"
                  colorScheme={selectedDate === currentPeruDate ? "teal" : "gray"}
                  variant={selectedDate === currentPeruDate ? "solid" : "outline"}
                  bg={selectedDate === currentPeruDate ? "#0f766e" : undefined}
                  color={selectedDate === currentPeruDate ? "white" : undefined}
                  _hover={{ bg: selectedDate === currentPeruDate ? "#115e59" : undefined }}
                  onClick={() => setSelectedDate(currentPeruDate)}
                  leftIcon={<Icon as={Clock} boxSize={3} />}
                >
                  ☀️ Hoy
                </Button>

                {/* Input Calendario para seleccionar Día / Mes / Año al tocar la fecha */}
                <Input
                  type="date"
                  size="xs"
                  w="145px"
                  h="28px"
                  borderRadius="md"
                  fontWeight="800"
                  fontSize="12px"
                  cursor="pointer"
                  bg={useColorModeValue("white", "gray.900")}
                  borderColor={selectedDate === currentPeruDate ? "blue.300" : "blue.500"}
                  boxShadow={selectedDate !== currentPeruDate ? "0 0 0 1px #3182ce" : "none"}
                  focusBorderColor="blue.500"
                  value={selectedDate}
                  max={currentPeruDate}
                  title="Tocar fecha en calendario para consultar"
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                    }
                  }}
                />
              </HStack>

              <HStack spacing={2} wrap="wrap" justify={{ base: "flex-start", lg: "flex-end" }}>
                {selectedDate === currentPeruDate ? (
                  <Badge
                    bg="#dcfce7"
                    color="#166534"
                    border="1.5px solid #86efac"
                    fontSize="11px"
                    fontWeight="900"
                    px={2.5}
                    py={0.5}
                    borderRadius="full"
                    textTransform="none"
                  >
                    ☀️ En Vivo • Hoy ({formatDateDisplayPeru(selectedDate)})
                  </Badge>
                ) : (
                  <Badge
                    bg="#f3e8ff"
                    color="#6b21a8"
                    border="1.5px solid #d8b4fe"
                    fontSize="11px"
                    fontWeight="900"
                    px={2.5}
                    py={0.5}
                    borderRadius="full"
                    textTransform="none"
                  >
                    🗓️ Histórico del {formatDateDisplayPeru(selectedDate)}
                  </Badge>
                )}

                <Badge colorScheme="blue" variant="solid" bg="#1d4ed8" color="white" px={2.5} py={0.5} borderRadius="full" fontSize="11px" fontWeight="800">
                  {filteredItems.length} {filteredItems.length === 1 ? "artículo" : "artículos"} ({summary.totalQuantity} Uds)
                </Badge>
              </HStack>
            </Flex>

            {/* Fila 2: Búsqueda, Vendedor, Vistas y Exportación */}
            <Flex
              direction={{ base: "column", md: "row" }}
              justify="space-between"
              align={{ base: "stretch", md: "center" }}
              gap={3}
              pt={2}
              borderTop="1px solid"
              borderColor={borderColor}
            >
              <HStack flex={1} spacing={3} wrap={{ base: "wrap", md: "nowrap" }}>
                <InputGroup size="sm" maxW={{ base: "full", md: "320px" }}>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={Search} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Buscar código, artículo, cliente, cotización..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    borderRadius="lg"
                    bg={useColorModeValue("white", "gray.900")}
                  />
                </InputGroup>

                <Select
                  size="sm"
                  maxW={{ base: "full", md: "240px" }}
                  borderRadius="lg"
                  value={selectedSeller}
                  onChange={(e) => setSelectedSeller(e.target.value)}
                  bg={useColorModeValue("white", "gray.900")}
                >
                  <option value="">👤 Todos los vendedores</option>
                  {sellerOptions.map((seller) => (
                    <option key={seller} value={seller}>
                      {seller}
                    </option>
                  ))}
                </Select>
              </HStack>

              <HStack spacing={2} justify="flex-end" wrap="wrap">
                <HStack bg={useColorModeValue("gray.100", "gray.700")} p={1} borderRadius="lg" spacing={1}>
                  <Button
                    size="xs"
                    variant={viewMode === "grouped" ? "solid" : "ghost"}
                    colorScheme={viewMode === "grouped" ? "blue" : "gray"}
                    onClick={() => setViewMode("grouped")}
                    borderRadius="md"
                    leftIcon={<Icon as={User} boxSize={3.5} />}
                  >
                    Por Vendedor
                  </Button>
                  <Button
                    size="xs"
                    variant={viewMode === "table" ? "solid" : "ghost"}
                    colorScheme={viewMode === "table" ? "blue" : "gray"}
                    onClick={() => setViewMode("table")}
                    borderRadius="md"
                    leftIcon={<Icon as={ListFilter} boxSize={3.5} />}
                  >
                    Listado General
                  </Button>
                </HStack>

                <Tooltip label="Actualizar demanda" hasArrow>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchBackOrders()}
                    isLoading={isFetchingBackOrders}
                    borderRadius="lg"
                    leftIcon={<Icon as={RefreshCw} boxSize={3.5} />}
                  >
                    Actualizar
                  </Button>
                </Tooltip>

                <Tooltip label={`Descargar reporte ${periodButtonLabel.toLowerCase()} en archivo Excel (.xlsx)`} hasArrow>
                  <Button
                    size="sm"
                    colorScheme="whatsapp"
                    bg="#107c41"
                    color="white"
                    _hover={{ bg: "#0b5c30", transform: "translateY(-1px)" }}
                    _active={{ bg: "#084222" }}
                    transition="all 0.15s ease"
                    onClick={handleExportExcel}
                    borderRadius="lg"
                    fontWeight="bold"
                    leftIcon={<Icon as={FileSpreadsheet} boxSize={4} />}
                  >
                    Descargar {periodButtonLabel} (.xlsx)
                  </Button>
                </Tooltip>
              </HStack>
            </Flex>
          </VStack>
        </CardBody>
      </Card>

      {/* ─── Estados de Carga / Error ─── */}
      {isLoadingBackOrders && (
        <Flex justify="center" align="center" minH="240px" direction="column" gap={3}>
          <Spinner size="lg" color="blue.500" thickness="3px" />
          <Text fontSize="sm" color={mutedText}>
            Consultando artículos sin stock cotizados por vendedor...
          </Text>
        </Flex>
      )}

      {errorBackOrders && (
        <Card bg="red.50" border="1px solid" borderColor="red.200" borderRadius="xl" p={6} mb={6}>
          <HStack spacing={3}>
            <Icon as={AlertTriangle} color="red.500" boxSize={6} />
            <VStack align="start" spacing={1}>
              <Text fontWeight="bold" color="red.800">
                Error al cargar Demanda Back Order
              </Text>
              <Text fontSize="sm" color="red.600">
                {errorBackOrders.message || "No se pudo conectar con el servicio de cotizaciones."}
              </Text>
              <Button size="xs" colorScheme="red" onClick={() => refetchBackOrders()} mt={2}>
                Reintentar
              </Button>
            </VStack>
          </HStack>
        </Card>
      )}

      {/* ─── Estado Vacío ─── */}
      {!isLoadingBackOrders && !errorBackOrders && filteredItems.length === 0 && (
        <Card bg={bgCard} border="1px solid" borderColor={borderColor} borderRadius="xl" p={10} textAlign="center">
          <VStack spacing={3}>
            <Flex p={3} bg="green.50" color="green.600" borderRadius="full">
              <Icon as={CheckCircle2} boxSize={8} />
            </Flex>
            <Text fontSize="lg" fontWeight="bold">
              {selectedDate === currentPeruDate
                ? `☀️ Día en Curso (${formatDateDisplayPeru(selectedDate)}) — Sin demanda pendiente`
                : `Sin demanda Back Order para el ${formatDateDisplayPeru(selectedDate)}`}
            </Text>
            <Text fontSize="sm" color={mutedText} maxW="520px">
              {selectedDate === currentPeruDate
                ? "Las cotizaciones de días anteriores se cerraron y archivaron para este ciclo. A medida que se registren nuevas cotizaciones con productos sin stock hoy, ingresarán automáticamente en tiempo real."
                : `No se registraron cotizaciones con productos sin stock en la fecha seleccionada (${selectedDate})${selectedSeller ? ` para el vendedor "${selectedSeller}"` : ""}.`}
            </Text>
            {(selectedSeller || search || selectedDate !== currentPeruDate) && (
              <Button
                size="sm"
                colorScheme="teal"
                variant="outline"
                onClick={() => {
                  setSelectedSeller("");
                  setSearch("");
                  setSelectedDate(currentPeruDate);
                }}
              >
                Volver a la Demanda de Hoy
              </Button>
            )}
          </VStack>
        </Card>
      )}

      {/* ─── VISTA 1: AGRUPADO POR VENDEDOR (Cards & Accordions) ─── */}
      {!isLoadingBackOrders && !errorBackOrders && filteredItems.length > 0 && viewMode === "grouped" && (
        <VStack spacing={4} align="stretch">
          <Accordion allowMultiple defaultIndex={[0]}>
            {groupedBySeller.map((group, idx) => (
              <AccordionItem
                key={group.sellerName || idx}
                bg={bgCard}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="xl"
                mb={4}
                overflow="hidden"
              >
                <h2>
                  <AccordionButton p={4} _hover={{ bg: hoverRowBg }} transition="all 0.2s">
                    <HStack flex="1" textAlign="left" justify="space-between" spacing={4} wrap="wrap">
                      <HStack spacing={3}>
                        <Flex
                          w={10}
                          h={10}
                          borderRadius="full"
                          bg="blue.50"
                          color="blue.600"
                          align="center"
                          justify="center"
                          fontWeight="bold"
                          fontSize="sm"
                        >
                          {group.sellerName.slice(0, 2).toUpperCase()}
                        </Flex>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold" fontSize="md">
                            {group.sellerName}
                          </Text>
                          <Text fontSize="xs" color={mutedText}>
                            {group.quotesCount} {group.quotesCount === 1 ? "cotización" : "cotizaciones"} con demanda
                          </Text>
                        </VStack>
                      </HStack>

                      <HStack spacing={3}>
                        <Badge colorScheme="red" variant="subtle" px={2.5} py={1} borderRadius="md" fontSize="xs">
                          📦 {group.totalItems} {group.totalItems === 1 ? "artículo" : "artículos"}
                        </Badge>
                        <Badge colorScheme="orange" variant="solid" px={2.5} py={1} borderRadius="md" fontSize="xs">
                          Demanda: {group.totalQuantity} uds.
                        </Badge>
                      </HStack>
                    </HStack>
                    <AccordionIcon ml={4} />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb={4} pt={2} px={4} borderTop="1px solid" borderColor={borderColor}>
                  <Box overflowX="auto">
                    <Table size="sm" variant="simple">
                      <Thead bg={headerBg}>
                        <Tr>
                          <Th>Cotización</Th>
                          <Th>Fecha</Th>
                          <Th>Cliente</Th>
                          <Th>Código SAP</Th>
                          <Th>Descripción</Th>
                          <Th isNumeric>Cant. Solicitada</Th>
                          <Th>Almacén</Th>
                          <Th>Priorización</Th>
                          <Th>Estado</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {group.items.map((item, itemIdx) => (
                          <Tr key={item.id || itemIdx} _hover={{ bg: hoverRowBg }}>
                            <Td fontWeight="bold" color="blue.600">
                              <Badge colorScheme="blue" variant="subtle" borderRadius="md" px={2} py={0.5}>
                                {item.docNumber}
                              </Badge>
                            </Td>
                            <Td fontSize="xs" color={mutedText}>
                              {item.docDate || "—"}
                            </Td>
                            <Td maxW="200px">
                              <VStack align="start" spacing={0}>
                                <Text fontSize="xs" fontWeight="semibold" isTruncated maxW="190px">
                                  {item.clientName}
                                </Text>
                                <HStack spacing={1} wrap="wrap">
                                  {item.clientCardCode && (
                                    <Badge colorScheme="purple" variant="subtle" fontSize="9px" fontWeight="800" px={1}>
                                      {item.clientCardCode}
                                    </Badge>
                                  )}
                                  {item.clientDocument && item.clientDocument !== item.clientCardCode && (
                                    <Text fontSize="10px" color={mutedText}>
                                      RUC: {item.clientDocument}
                                    </Text>
                                  )}
                                </HStack>
                              </VStack>
                            </Td>
                            <Td>
                              <Badge variant="outline" colorScheme="gray" fontFamily="mono" fontSize="xs">
                                {item.productCode}
                              </Badge>
                            </Td>
                            <Td maxW="250px">
                              <VStack align="start" spacing={0}>
                                <Text fontSize="xs" fontWeight="medium" isTruncated maxW="240px">
                                  {item.productName}
                                </Text>
                                {item.sigla && (
                                  <Text fontSize="10px" color="blue.500">
                                    Sigla: {item.sigla}
                                  </Text>
                                )}
                              </VStack>
                            </Td>
                            <Td isNumeric>
                              <Badge colorScheme="orange" variant="solid" px={2} py={0.5} borderRadius="full">
                                {item.quantity} uds
                              </Badge>
                            </Td>
                            <Td>
                              <Badge colorScheme="gray" variant="subtle" fontSize="10px">
                                {item.whsCode || "014"}
                              </Badge>
                            </Td>
                            <Td>
                              {isAdmin ? (
                                <Select
                                  size="xs"
                                  h="24px"
                                  w="160px"
                                  borderRadius="md"
                                  fontWeight="800"
                                  fontSize="10px"
                                  borderColor={item.importPriority === "ALTA" ? "red.400" : "gray.300"}
                                  bg={item.importPriority === "ALTA" ? "red.50" : "white"}
                                  value={item.importPriority || "EVALUACION"}
                                  onChange={(e) => handleUpdatePriority(item, e.target.value)}
                                >
                                  <option value="ALTA">🔴 PEDIR SÍ O SÍ</option>
                                  <option value="PROXIMO">🟡 PRÓXIMO EMBARQUE</option>
                                  <option value="EVALUACION">🔵 EN EVALUACIÓN</option>
                                  <option value="NO_PRIORITARIO">⚪ NO PRIORITARIO</option>
                                </Select>
                              ) : (
                                <Badge
                                  colorScheme={item.importPriority === "ALTA" ? "red" : item.importPriority === "PROXIMO" ? "orange" : "blue"}
                                  variant="solid"
                                  fontSize="10px"
                                  px={2}
                                  py={0.5}
                                  borderRadius="md"
                                >
                                  {formatPriorityLabel(item.importPriority)}
                                </Badge>
                              )}
                            </Td>
                            <Td>
                              <Badge
                                colorScheme={
                                  item.state === "APROBADO" ? "green" : item.state === "ENVIADO" ? "blue" : "gray"
                                }
                                variant="subtle"
                                fontSize="10px"
                              >
                                {item.state}
                              </Badge>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </VStack>
      )}

      {/* ─── VISTA 2: LISTADO GENERAL TABULAR ─── */}
      {!isLoadingBackOrders && !errorBackOrders && filteredItems.length > 0 && viewMode === "table" && (
        <Card bg={bgCard} border="1px solid" borderColor={borderColor} shadow="sm" borderRadius="xl" overflow="hidden">
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead bg={headerBg}>
                <Tr>
                  <Th>Vendedor</Th>
                  <Th>Cotización</Th>
                  <Th>Fecha</Th>
                  <Th>Cliente</Th>
                  <Th>Código SAP</Th>
                  <Th>Descripción</Th>
                  <Th isNumeric>Cant. Solicitada</Th>
                  <Th>Almacén</Th>
                  <Th>Priorización</Th>
                  <Th>Estado</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredItems.map((item, idx) => (
                  <Tr key={item.id || idx} _hover={{ bg: hoverRowBg }}>
                    <Td>
                      <HStack spacing={2}>
                        <Flex
                          w={6}
                          h={6}
                          borderRadius="full"
                          bg="blue.50"
                          color="blue.600"
                          align="center"
                          justify="center"
                          fontSize="10px"
                          fontWeight="bold"
                        >
                          {item.sellerName?.slice(0, 1).toUpperCase()}
                        </Flex>
                        <Text fontSize="xs" fontWeight="semibold">
                          {item.sellerName}
                        </Text>
                      </HStack>
                    </Td>
                    <Td fontWeight="bold">
                      <Badge colorScheme="blue" variant="subtle" borderRadius="md" px={2} py={0.5}>
                        {item.docNumber}
                      </Badge>
                    </Td>
                    <Td fontSize="xs" color={mutedText}>
                      {item.docDate || "—"}
                    </Td>
                    <Td maxW="190px">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="xs" fontWeight="semibold" isTruncated maxW="180px">
                          {item.clientName}
                        </Text>
                        <HStack spacing={1} wrap="wrap">
                          {item.clientCardCode && (
                            <Badge colorScheme="purple" variant="subtle" fontSize="9px" fontWeight="800" px={1}>
                              {item.clientCardCode}
                            </Badge>
                          )}
                          {item.clientDocument && item.clientDocument !== item.clientCardCode && (
                            <Text fontSize="10px" color={mutedText}>
                              RUC: {item.clientDocument}
                            </Text>
                          )}
                        </HStack>
                      </VStack>
                    </Td>
                    <Td>
                      <Badge variant="outline" colorScheme="gray" fontFamily="mono" fontSize="xs">
                        {item.productCode}
                      </Badge>
                    </Td>
                    <Td maxW="240px">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="xs" fontWeight="medium" isTruncated maxW="230px">
                          {item.productName}
                        </Text>
                        {item.sigla && (
                          <Text fontSize="10px" color="blue.500">
                            Sigla: {item.sigla}
                          </Text>
                        )}
                      </VStack>
                    </Td>
                    <Td isNumeric>
                      <Badge colorScheme="orange" variant="solid" px={2} py={0.5} borderRadius="full">
                        {item.quantity} uds
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme="gray" variant="subtle" fontSize="10px">
                        {item.whsCode || "014"}
                      </Badge>
                    </Td>
                    <Td>
                      {isAdmin ? (
                        <Select
                          size="xs"
                          h="24px"
                          w="160px"
                          borderRadius="md"
                          fontWeight="800"
                          fontSize="10px"
                          borderColor={item.importPriority === "ALTA" ? "red.400" : "gray.300"}
                          bg={item.importPriority === "ALTA" ? "red.50" : "white"}
                          value={item.importPriority || "EVALUACION"}
                          onChange={(e) => handleUpdatePriority(item, e.target.value)}
                        >
                          <option value="ALTA">🔴 PEDIR SÍ O SÍ</option>
                          <option value="PROXIMO">🟡 PRÓXIMO EMBARQUE</option>
                          <option value="EVALUACION">🔵 EN EVALUACIÓN</option>
                          <option value="NO_PRIORITARIO">⚪ NO PRIORITARIO</option>
                        </Select>
                      ) : (
                        <Badge
                          colorScheme={item.importPriority === "ALTA" ? "red" : item.importPriority === "PROXIMO" ? "orange" : "blue"}
                          variant="solid"
                          fontSize="10px"
                          px={2}
                          py={0.5}
                          borderRadius="md"
                        >
                          {formatPriorityLabel(item.importPriority)}
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={
                          item.state === "APROBADO" ? "green" : item.state === "ENVIADO" ? "blue" : "gray"
                        }
                        variant="subtle"
                        fontSize="10px"
                      >
                        {item.state}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Card>
      )}
    </Box>
  );
}
