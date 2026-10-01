import React, { useState, useRef, useMemo, useEffect } from "react";
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
  SimpleGrid,
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
import { useQueryClient } from "@tanstack/react-query";
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
import { useHasAccess, useIsAdmin } from "../../../shared/utils/permissions";
import { useGetOrderswithStatusReports } from "../hooks/queries/reportQueries";
import { RefreshButton } from "../../../components/RefreshButton";
import { QUERY_KEYS } from "../../../shared/utils/queryKeys";
export default function SalespersonReports({ salespersonId }) {
  const { endpoints } = useAuthStore();
  const btnRef = useRef();

  const hasAccess = useHasAccess();
  const isAdmin = useIsAdmin() || hasAccess("GET:/sellers");
  const { data: rawReglas } = useRules();
  const reglas = Array.isArray(rawReglas) ? rawReglas : [];

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

  const defaultAllSellers = useMemo(() => ({ value: "", label: "Todos los vendedores" }), []);
  const [selectedSeller, setSelectedSeller] = useState(() =>
    isAdmin ? { value: "", label: "Todos los vendedores" } : null
  );

  useEffect(() => {
    if (isAdmin && !selectedSeller) {
      setSelectedSeller(defaultAllSellers);
    }
  }, [isAdmin, selectedSeller, defaultAllSellers]);

  const dynamicSalespersonId = isAdmin
    ? (selectedSeller?.value ? selectedSeller.value : 0)
    : (salespersonId || 0);

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

  // Prefetch inteligente de la siguiente página para paginación instantánea (0ms)
  const queryClient = useQueryClient();
  useEffect(() => {
    if (reportData?.hasMore) {
      const nextPage = pagina; // siguiente página en base 0
      queryClient.prefetchQuery({
        queryKey: [
          QUERY_KEYS.orderswithStatusReports,
          dynamicSalespersonId || 0,
          estadoOrdenFiltro || "",
          nextPage,
          porPagina,
          debouncedSearch,
        ],
        queryFn: () =>
          getOrderswithStatusReports({
            salesPersonCode: dynamicSalespersonId || 0,
            estadopedido: estadoOrdenFiltro || "",
            page: nextPage,
            pageSize: porPagina,
            search: debouncedSearch,
          }),
        staleTime: 1000 * 60 * 2,
      });
    }
  }, [
    reportData?.hasMore,
    pagina,
    dynamicSalespersonId,
    estadoOrdenFiltro,
    porPagina,
    debouncedSearch,
    queryClient,
  ]);

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

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="120px">
      {/* HEADER PRINCIPAL UNIFICADO */}
      <TopHeaderBanner
        title="Reporte de Órdenes"
        subtitle="Monitoreo en tiempo real del flujo de pedidos"
        showBack={true}
        refreshQueries={refreshQueries}
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
            {reportFetching && (
              <Badge
                bg="blue.50"
                color="blue.600"
                px={2}
                py={0.5}
                borderRadius="full"
                fontWeight="700"
                fontSize="10px"
                border="1px solid"
                borderColor="blue.200"
              >
                ⚡ Actualizando...
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
                statuses={(reglas || []).map((regla) => ({
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

        {/* LISTA DE ÓRDENES FILTRADAS O SKELETON PERSISTENTE */}
        {reportLoading && (!filteredOrders || filteredOrders.length === 0) ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} my={4}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Box
                key={i}
                p={5}
                bg="white"
                borderRadius="2xl"
                border="1px solid"
                borderColor="gray.200"
                boxShadow="xs"
              >
                <Flex justify="space-between" align="center" mb={3}>
                  <Skeleton height="20px" width="80px" borderRadius="md" />
                  <Skeleton height="22px" width="130px" borderRadius="full" />
                </Flex>
                <Skeleton height="18px" width="70%" mb={2} borderRadius="md" />
                <Skeleton height="14px" width="40%" mb={4} borderRadius="md" />
                <Flex justify="space-between" align="center" pt={3} borderTop="1px solid" borderColor="gray.100">
                  <Skeleton height="14px" width="90px" borderRadius="md" />
                  <Skeleton height="14px" width="110px" borderRadius="md" />
                </Flex>
              </Box>
            ))}
          </SimpleGrid>
        ) : reportError ? (
          <Box p={8} bg="white" borderRadius="2xl" border="1.5px dashed" borderColor="red.200" textAlign="center" my={4}>
            <Text color="red.500" fontWeight="bold">
              ❌ Error al cargar órdenes desde SAP. Por favor reintenta con el botón de refrescar.
            </Text>
          </Box>
        ) : (
          <Box position="relative" transition="opacity 0.2s ease" opacity={reportFetching ? 0.75 : 1}>
            <OrdenesLista
              detalle={filteredOrders}
              onVerSeguimiento={abrirModal}
              searchTerm={searchTerm}
              onClearSearch={() => handleSearchChange("")}
            />
          </Box>
        )}
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