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
} from "@chakra-ui/react";
import { useDisclosure } from "@chakra-ui/react";

import { useGetSalespersonReports } from "../hooks/queries/reportQueries";
import FiltersWithSummary from "./FilterWithSummary";
import OrdenesLista from "./OrdersList";
import Paginacion from "./Pagination";
import ModalSeguimiento from "./ModalSeguimiento";
import SellerSelectReport from "./SellerSelectReport";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { BackButton } from "../../../components/BackButton";
import ActiveFilters from "./ActiveFilters"; // ajusta la ruta si está en otro lugar

import styles from "./SalesReport.module.css";

export default function SalespersonReports({ salespersonId }) {
  const role = useAuthStore((state) => state.role);
  const { endpoints } = useAuthStore();
  const btnRef = useRef();

  const hasAccess = (endpoint) => endpoints?.includes(endpoint);

  const [estadoOrdenFiltro, setEstadoOrdenFiltro] = useState([]);
  const [tempEstadoOrdenFiltro, setTempEstadoOrdenFiltro] = useState([]);

const [tempStartDate, setTempStartDate] = useState(null);
const [tempEndDate, setTempEndDate] = useState(null);


  const [pagina, setPagina] = useState(1);
  const porPagina = 10;
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [selectedSeller, setSelectedSeller] = useState(null);
  const dynamicSalespersonId = selectedSeller?.value ?? salespersonId ?? "";

  const { data, isLoading, error } = useGetSalespersonReports(
    dynamicSalespersonId,
    pagina,
    porPagina,
    estadoOrdenFiltro,
    startDate,
    endDate
  );

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

  const abrirModal = (orden) => {
    setOrdenSeleccionada(orden);
    openModal();
  };

  if (isLoading) return <Spinner size="xl" />;
  if (error || !data) return <Text color="red.500">Error cargando datos.</Text>;

  const { resumen, paginacion, detalle } = data;

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
            <div>Reporte de Órdenes</div>
            <div className={styles.backbtn}>
              <BackButton />
            </div>
          </div>

          {/* 🔹 Renderiza SellerSelectReport solo si el usuario tiene acceso */}
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
          clearSingleEstado={(estado) => {
            setEstadoOrdenFiltro((prev) => prev.filter((e) => e !== estado));
            setTempEstadoOrdenFiltro((prev) => prev.filter((e) => e !== estado)); // sincronizar
          }}
          clearDateRange={() => {
            setStartDate(null);
            setEndDate(null);
            setTempStartDate(null);
            setTempEndDate(null); // sincronizar
          }}
          clearAll={() => {
            setEstadoOrdenFiltro([]);
            setStartDate(null);
            setEndDate(null);
            setTempEstadoOrdenFiltro([]); // sincronizar
            setTempStartDate(null);
            setTempEndDate(null);         // sincronizar
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
                statuses={[
                  "Pedido sin preparar",
                  "Pedido preparado parcialmente",
                  "Pedido preparado",
                  "Pedido finalizado",
                  "Finalizado con pendientes",
                  "Pedido anulado",
                ]}
                activeStatuses={tempEstadoOrdenFiltro}
                setStatuses={setTempEstadoOrdenFiltro}
                setStartDate={setTempStartDate}
                setEndDate={setTempEndDate}
                startDate={tempStartDate}
                endDate={tempEndDate}
                summary={resumen}
                onFilterApplied={() => {
                  setEstadoOrdenFiltro(tempEstadoOrdenFiltro);
                  setStartDate(tempStartDate);
                  setEndDate(tempEndDate);
                  closeDrawer();
                }}
              />
            </DrawerBody>
            
          </DrawerContent>
        </Drawer>

        <OrdenesLista detalle={detalle} onVerSeguimiento={abrirModal} />
      </Box>

      <Paginacion
        totalPaginas={paginacion.totalPaginas}
        paginaActual={pagina}
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
