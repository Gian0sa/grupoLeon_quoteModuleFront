import React, { useState, useRef } from "react";
import {
  Box,
  Text,
  Spinner,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Flex,
  Button,
  Skeleton
} from "@chakra-ui/react";
import { useDisclosure } from "@chakra-ui/react";

import FiltersWithSummary from "./FilterWithSummary";
import OrdenesLista from "./OrdersList";
import Paginacion from "./Pagination";
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

import styles from "./SalesReport.module.css";

export default function SalespersonReports({ salespersonId }) {
  const role = useAuthStore((state) => state.role);
  const { endpoints } = useAuthStore();
  const btnRef = useRef();

  const hasAccess = useHasAccess();
  const { data: reglas = [], isLoading: reglasLoading } = useRules();

  const [estadoOrdenFiltro, setEstadoOrdenFiltro] = useState('');
  const [tempEstadoOrdenFiltro, setTempEstadoOrdenFiltro] = useState('');

  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);

  const [pagina, setPagina] = useState(1);
  const porPagina = 5;
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [selectedSeller, setSelectedSeller] = useState(null);
  const dynamicSalespersonId = selectedSeller?.value ?? salespersonId ?? null;
   const refreshQueries = [
      [
        QUERY_KEYS.orderswithStatusReports,
        dynamicSalespersonId || 0,
        estadoOrdenFiltro || '',
        pagina - 1,
        porPagina,
      ],
      [QUERY_KEYS.rules],
    ];


  const { data: reportData, isLoading: reportLoading, error: reportError } =
  useGetOrderswithStatusReports({
    salesPersonCode: dynamicSalespersonId || 0,
    estadopedido: estadoOrdenFiltro || '',
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
      <Box px={6} pt={4}>
        <Skeleton height="90px" width="100%" mb={4} />
        <Skeleton height="120px" mb={4} />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height="150px" mb={3} borderRadius="md" />
        ))}
      </Box>
    );
  }

  if (reportError) return <Text color="red.500">Error cargando datos.</Text>;

  const FilterIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
    </svg>
  );

  return ( 
    <Box maxW="1000px" fontFamily="'InterVariable', sans-serif" pb="180px">
      <Box size="lg" mb={6} fontWeight="bold" className={styles.heading}>
        <div className={styles.topHeader}>
         <div className={styles.reportTitle}>
          <div className={styles.backbtn}>
            <BackButton />
          </div>
          <div>Reporte de Órdenes</div>          
          <div className={styles.refreshBtn}>   
            <RefreshButton 
              queries={refreshQueries}
              showToast={true} 
              mode="refetch"
            />
          </div>
        </div>

          {hasAccess("GET:/sellers") && (
            <div className={styles.salereport}>
              <SellerSelectReport
                selectedSeller={selectedSeller}
                setSelectedSeller={setSelectedSeller}
                setValue={() => {}}
                error={null}
              />
            </div>
          )}
        </div>
      </Box>

      <Box px={6}>
        <ActiveFilters
          estadoOrdenFiltro={estadoOrdenFiltro}
          startDate={startDate}
          endDate={endDate}
          clearSingleEstado={() => {
            setEstadoOrdenFiltro('');
            setTempEstadoOrdenFiltro('');
          }}
          clearDateRange={() => {
            setStartDate(null);
            setEndDate(null);
            setTempStartDate(null);
            setTempEndDate(null);
          }}
          clearAll={() => {
            setEstadoOrdenFiltro('');
            setStartDate(null);
            setEndDate(null);
            setTempEstadoOrdenFiltro('');
            setTempStartDate(null);
            setTempEndDate(null);
          }}
        />

        <Flex justify="space-between" align="center" py={2}>
          <Text fontWeight="bold">Todas las órdenes</Text>
          <Button
            ref={btnRef}
            leftIcon={<FilterIcon />}
            variant="ghost"
            size="sm"
            color="gray.600"
            _hover={{ bg: "gray.100" }}
            onClick={openDrawer}
          >
            Mostrar filtros
          </Button>
        </Flex>

        <Drawer
          isOpen={isDrawerOpen}
          placement="right"
          onClose={closeDrawer}
          finalFocusRef={btnRef}
          size="md"
        >
          <DrawerOverlay />
          <DrawerContent>
            <DrawerHeader px={10} borderBottomWidth="1px">
              <Flex justify="space-between" align="center">
                <Text fontSize="lg" fontWeight="bold">Filtros</Text>
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

        <OrdenesLista detalle={reportData.data} onVerSeguimiento={abrirModal} />
      </Box>

      <Paginacion
        paginaActual={pagina}
        hasMore={reportData?.hasMore}
        setPagina={setPagina}
      />
     
      <ModalSeguimiento
        isOpen={isModalOpen}
        onClose={closeModal}
        orden={ordenSeleccionada}
      />
    </Box>
  );
}