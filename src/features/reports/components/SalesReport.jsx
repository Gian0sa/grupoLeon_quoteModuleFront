import React, { useState } from "react";
import { Box, Heading, Spinner, Text } from "@chakra-ui/react";
import { useDisclosure } from "@chakra-ui/react";

import { useGetSalespersonReports } from "../hooks/queries/reportQueries";
import FiltersWithSummary from "./FilterWithSummary";
import OrdenesLista from "./OrdersList";
import Paginacion from "./Pagination";
import ModalSeguimiento from "./ModalSeguimiento";
import SellerSelectReport from "./SellerSelectReport";
import { useAuthStore } from "../../auth/stores/useAuthStore";

export default function SalespersonReports({ salespersonId }) {
  const role = useAuthStore((state) => state.role);

  const [pagina, setPagina] = useState(1);
  const porPagina = 10;
  const [estadoOrdenFiltro, setEstadoOrdenFiltro] = useState(null);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const estadosVisibles = [
    "Pedido sin preparar",
    "Pedido preparado parcialmente",
    "Pedido preparado",
    "Pedido finalizado",
    "Finalizado con pendientes",
    "Pedido anulado",
  ];

  
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

  const { isOpen, onOpen, onClose } = useDisclosure();

  const abrirModal = (orden) => {
    setOrdenSeleccionada(orden);
    onOpen();
  };

  console.log(data);

  if (isLoading) return <Spinner size="xl" />;
  if (error || !data) return <Text color="red.500">Error cargando datos.</Text>;

  const { resumen, paginacion, detalle } = data;

  return (
    <Box
      maxW="1000px"
      fontFamily="'InterVariable', sans-serif"
      pb="180px"
    >
      <Heading size="lg" mb={6} fontWeight="bold">
        Reporte de Órdenes
      </Heading>

       <Box mb={4}>
        {role === "ADMIN" && (
          <SellerSelectReport
              selectedSeller={selectedSeller}
              setSelectedSeller={setSelectedSeller}
              setValue={() => {}}
              error={null}
            />
          )}
      </Box>

      <OrdenesLista detalle={detalle} onVerSeguimiento={abrirModal} />

      <Paginacion
        totalPaginas={paginacion.totalPaginas}
        paginaActual={pagina}
        setPagina={setPagina}
      />

      <ModalSeguimiento
        isOpen={isOpen}
        onClose={onClose}
        orden={ordenSeleccionada}
      />

      {/* Filtros Fijos abajo */}
      <Box
        position="fixed"
        bottom="0"
        left="0"
        width="100%"
        bg="white"
        borderTop="1px solid"
        borderColor="gray.200"
        zIndex="1000"
        p={4}
        boxShadow="lg"
      >
        <Box maxW="1000px" mx="auto">
          <FiltersWithSummary
            statuses={estadosVisibles}
            activeStatus={estadoOrdenFiltro}
            setStatus={setEstadoOrdenFiltro}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            startDate={startDate}
            endDate={endDate}
            summary={resumen}
          />
        </Box>
      </Box>
    </Box>
  );
}
