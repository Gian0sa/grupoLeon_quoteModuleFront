import React, { useState, useRef, useMemo } from "react";
import { useDebounce } from "../../../shared/hooks/useDebounce";
import {
  Box,
  Text,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Flex,
  Button,
  Skeleton,
  HStack,
  VStack,
  Badge,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
} from "@chakra-ui/react";
import { useDisclosure } from "@chakra-ui/react";
import { Filter, RefreshCw, Search, X } from "lucide-react";

import FiltersWithSummary from "./FilterWithSummary";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import OrdenesLista from "./OrdersList";
import Pagination from "../../../components/Pagination";
import ModalSeguimiento from "./ModalSeguimiento";
import SellerSelectReport from "./SellerSelectReport";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { BackButton } from "../../../components/BackButton";
import ActiveFilters from "./ActiveFilters";
import { useRules } from "../hooks/queries/configQueries";
import { useHasAccess } from "../../../shared/utils/permissions";
import { useGetOrderswithStatusReports } from "../hooks/queries/reportQueries";
import { RefreshButton } from "../../../components/RefreshButton";
import { QUERY_KEYS } from "../../../shared/utils/queryKeys";

export default function SalespersonReports({ salespersonId }) {
  const { endpoints } = useAuthStore();
  const btnRef = useRef();

  const hasAccess = useHasAccess();
  const { data: reglas = [] } = useRules();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [estadoOrdenFiltro, setEstadoOrdenFiltro] = useState("");
  const [tempEstadoOrdenFiltro, setTempEstadoOrdenFiltro] = useState("");

  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);

  const [pagina, setPagina] = useState(1);
  const porPagina = 12;
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [selectedSeller, setSelectedSeller] = useState(null);
  const dynamicSalespersonId = selectedSeller?.value ?? salespersonId ?? null;

  // Resetear a página 1 cuando cambia la búsqueda
  const handleSearchChange = (val) => {
    setSearchTerm(val);
    setPagina(1);
  };

  const refreshQueries = [
    [
      QUERY_KEYS.orderswithStatusReports,
      dynamicSalespersonId || 0,
      estadoOrdenFiltro || "",
      pagina - 1,
      porPagina,
      debouncedSearch,
    ],
    [QUERY_KEYS.rules],
  ];

  const {
    data: reportData,
    isLoading: reportLoading,
    isFetching: reportFetching,
    error: reportError,
  } = useGetOrderswithStatusReports({
    salesPersonCode: dynamicSalespersonId || 0,
    estadopedido: estadoOrdenFiltro || "",
    page: pagina - 1,
    pageSize: porPagina,
    search: debouncedSearch,
  });

  // Los datos ya vienen filtrados por SAP en backend (por RUC, DNI, cliente o N° orden)
  const filteredOrders = reportData?.data || [];

  const totalPaginas = reportData?.hasMore ? pagina + 1 : Math.max(pagina, 1);

  const {
    isOpen: isDrawerOpen,
    onOpen: openDrawer,
    onClose: closeDrawer,
  } = useDisclosure();

  const {
    isOpen: isModalOpen,
    onOpen: openModal,
    onClose: closeModal,
  } = useDisclosure();

  const abrirModal = (ordenRaw) => {
    setOrdenSeleccionada(ordenRaw);
    openModal();
  };

  if (reportLoading) {
    return (
      <Box maxW="1200px" mx="auto" px={{ base: 4, md: 6 }} pt={4} pb="100px">
        <Skeleton height="100px" width="100%" mb={6} borderRadius="2xl" />
        <Skeleton height="40px" width="200px" mb={4} borderRadius="xl" />
        <Skeleton height="180px" mb={4} borderRadius="2xl" />
        <Skeleton height="180px" mb={4} borderRadius="2xl" />
      </Box>
    );
  }

  if (reportError) {
    return (
      <Box maxW="1200px" mx="auto" px={4} py={10} textAlign="center">
        <Text color="red.500" fontWeight="bold">
          ❌ Error cargando datos de reporte. Por favor reintenta.
        </Text>
      </Box>
    );
  }

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="120px">
      {/* HEADER PRINCIPAL UNIFICADO */}
      <TopHeaderBanner
        title="Reporte de Órdenes"
        subtitle="Monitoreo en tiempo real del flujo de pedidos"
        showBack={true}
        refreshQueries={refreshQueries}
        mb={6}
      >
        {/* Fila inferior: Selector de Asesor (si tiene acceso) */}
        {hasAccess("GET:/sellers") && (
          <Box w="full" maxW={{ base: "100%", md: "360px" }} pt={1}>
            <SellerSelectReport
              selectedSeller={selectedSeller}
              setSelectedSeller={setSelectedSeller}
              setValue={() => {}}
              error={null}
            />
          </Box>
        )}
      </TopHeaderBanner>

      {/* CUERPO: FILTROS + BUSCADOR + GRILLA DE ÓRDENES */}
      <Box maxW="1200px" mx="auto" px={{ base: 3, md: 6 }}>
        <ActiveFilters
          estadoOrdenFiltro={estadoOrdenFiltro}
          startDate={startDate}
          endDate={endDate}
          clearSingleEstado={() => {
            setEstadoOrdenFiltro("");
            setTempEstadoOrdenFiltro("");
          }}
          clearDateRange={() => {
            setStartDate(null);
            setEndDate(null);
            setTempStartDate(null);
            setTempEndDate(null);
          }}
          clearAll={() => {
            setEstadoOrdenFiltro("");
            setStartDate(null);
            setEndDate(null);
            setTempEstadoOrdenFiltro("");
            setTempStartDate(null);
            setTempEndDate(null);
          }}
        />

        {/* BARRA SUPERIOR: Contador + Buscador Rápido + Botón Filtros */}
        <Flex
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "stretch", md: "center" }}
          py={3}
          mb={3}
          gap={3}
        >
          <HStack spacing={2} minW="fit-content">
            <Text textStyle="cardTitle" color="gray.800" fontWeight="800">
              Todas las órdenes
            </Text>
            {reportData?.data?.length > 0 && (
              <Badge
                bg={searchTerm ? "emerald.50" : "gray.100"}
                color={searchTerm ? "emerald.700" : "gray.600"}
                px={2.5}
                py={0.5}
                borderRadius="full"
                fontWeight="800"
                fontSize="xs"
                border="1px solid"
                borderColor={searchTerm ? "emerald.200" : "gray.200"}
              >
                {searchTerm
                  ? `${filteredOrders.length} encontradas`
                  : `${reportData.data.length} mostradas`}
              </Badge>
            )}
          </HStack>

          {/* Buscador Rápido Multi-criterio */}
          <Flex gap={2.5} align="center" flex={{ md: 1 }} justify={{ md: "flex-end" }} maxW={{ md: "520px" }}>
            <InputGroup size="sm" flex={1}>
              <InputLeftElement pointerEvents="none">
                <Search size={15} color="#16a34a" />
              </InputLeftElement>
              <Input
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar por cliente, RUC, DNI o N° orden (#19852)..."
                bg="white"
                borderRadius="full"
                borderColor="gray.200"
                fontSize="13px"
                fontWeight="600"
                boxShadow="xs"
                _focus={{
                  borderColor: "emerald.500",
                  boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.2)",
                }}
                _hover={{ borderColor: "gray.300" }}
              />
              {searchTerm && (
                <InputRightElement>
                  <IconButton
                    size="xs"
                    variant="ghost"
                    borderRadius="full"
                    icon={<X size={13} />}
                    aria-label="Limpiar búsqueda"
                    onClick={() => handleSearchChange("")}
                    _hover={{ bg: "gray.100" }}
                  />
                </InputRightElement>
              )}
            </InputGroup>

            <Button
              ref={btnRef}
              leftIcon={<Filter size={15} />}
              variant="outline"
              size="sm"
              colorScheme="green"
              borderRadius="full"
              fontWeight="800"
              fontSize="12px"
              onClick={openDrawer}
              boxShadow="xs"
              bg="white"
              px={3.5}
              flexShrink={0}
              _hover={{ bg: "emerald.50", borderColor: "emerald.400" }}
            >
              Filtros
            </Button>
          </Flex>
        </Flex>

        {/* DRAWER DE FILTROS */}
        <Drawer
          isOpen={isDrawerOpen}
          placement="right"
          onClose={closeDrawer}
          finalFocusRef={btnRef}
          size={{ base: "full", md: "md" }}
        >
          <DrawerOverlay backdropFilter="blur(4px)" />
          <DrawerContent borderLeftRadius={{ base: "none", md: "2xl" }}>
            <DrawerHeader px={{ base: 4, md: 6 }} borderBottomWidth="1px">
              <Flex justify="space-between" align="center">
                <Text fontSize="lg" fontWeight="800">Filtrar Órdenes</Text>
                <DrawerCloseButton position="static" />
              </Flex>
            </DrawerHeader>
            <DrawerBody p={4}>
              <FiltersWithSummary
                statuses={reglas.map((regla) => ({
                  label: regla.name,
                  value: regla.name,
                  color: regla.color,
                  progress: regla.progress,
                }))}
                activeStatus={tempEstadoOrdenFiltro}
                setStatus={setTempEstadoOrdenFiltro}
                setStartDate={setTempStartDate}
                setEndDate={setTempEndDate}
                startDate={tempStartDate}
                endDate={tempEndDate}
                onFilterApplied={() => {
                  setEstadoOrdenFiltro(tempEstadoOrdenFiltro);
                  setStartDate(tempStartDate);
                  setEndDate(tempEndDate);
                  setPagina(1);
                  closeDrawer();
                }}
              />
            </DrawerBody>
          </DrawerContent>
        </Drawer>

        {/* LISTA DE ÓRDENES FILTRADAS */}
        <OrdenesLista
          detalle={filteredOrders}
          onVerSeguimiento={abrirModal}
          searchTerm={searchTerm}
          onClearSearch={() => handleSearchChange("")}
        />
      </Box>

      {/* PAGINACIÓN */}
      <Box mt={6}>
        <Pagination
          page={pagina}
          totalPages={totalPaginas}
          onPageChange={setPagina}
        />
      </Box>

      {/* MODAL DE SEGUIMIENTO */}
      <ModalSeguimiento
        isOpen={isModalOpen}
        onClose={closeModal}
        orden={ordenSeleccionada}
      />
    </Box>
  );
}