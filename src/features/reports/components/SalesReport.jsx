import React, { useState, useRef } from "react";
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
} from "@chakra-ui/react";
import { useDisclosure } from "@chakra-ui/react";
import { Filter, RefreshCw } from "lucide-react";

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

  const [estadoOrdenFiltro, setEstadoOrdenFiltro] = useState("");
  const [tempEstadoOrdenFiltro, setTempEstadoOrdenFiltro] = useState("");

  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);

  const [pagina, setPagina] = useState(1);
  const porPagina = 6;
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [selectedSeller, setSelectedSeller] = useState(null);
  const dynamicSalespersonId = selectedSeller?.value ?? salespersonId ?? null;

  const refreshQueries = [
    [
      QUERY_KEYS.orderswithStatusReports,
      dynamicSalespersonId || 0,
      estadoOrdenFiltro || "",
      pagina - 1,
      porPagina,
    ],
    [QUERY_KEYS.rules],
  ];

  const {
    data: reportData,
    isLoading: reportLoading,
    error: reportError,
  } = useGetOrderswithStatusReports({
    salesPersonCode: dynamicSalespersonId || 0,
    estadopedido: estadoOrdenFiltro || "",
    page: pagina - 1,
    pageSize: porPagina,
  });

  const totalPaginas = reportData?.hasMore ? pagina + 1 : pagina;

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

      {/* CUERPO: FILTROS + GRILLA DE ÓRDENES */}
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

        <Flex justify="space-between" align="center" py={3} mb={2}>
          <HStack spacing={2}>
            <Text textStyle="cardTitle" color="gray.800">
              Todas las órdenes
            </Text>
            {reportData?.data?.length > 0 && (
              <Text fontSize="xs" bg="gray.100" px={2.5} py={0.5} borderRadius="full" fontWeight="700" color="gray.600">
                {reportData.data.length} mostradas
              </Text>
            )}
          </HStack>

          <Button
            ref={btnRef}
            leftIcon={<Filter size={16} />}
            variant="outline"
            size="sm"
            colorScheme="green"
            borderRadius="full"
            fontWeight="700"
            fontSize="12px"
            onClick={openDrawer}
            boxShadow="sm"
            _hover={{ bg: "emerald.50" }}
          >
            Mostrar filtros
          </Button>
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

        {/* LISTA DE ÓRDENES */}
        <OrdenesLista detalle={reportData?.data || []} onVerSeguimiento={abrirModal} />
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