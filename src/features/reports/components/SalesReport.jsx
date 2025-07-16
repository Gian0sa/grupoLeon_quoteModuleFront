import React, { useState } from "react";
import { Box, Heading, Spinner, Text } from "@chakra-ui/react";
import { useDisclosure } from "@chakra-ui/react";

import { useGetSalespersonReports } from "../hooks/queries/reportQueries";
import FiltersWithSummary from "./FilterWithSummary";
import OrdenesLista from "./OrdersList";
import Paginacion from "./Pagination";
import ModalSeguimiento from "./ModalSeguimiento";

export default function SalespersonReports({ salespersonId }) {
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

  const { data, isLoading, error } = useGetSalespersonReports(
    salespersonId,
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

  if (isLoading) return <Spinner size="xl" />;
  if (error || !data) return <Text color="red.500">Error cargando datos.</Text>;

  const { resumen, paginacion, detalle } = data;

  return (
    <Box
      p={5}
      maxW="1000px"
      mx="auto"
      fontFamily="'InterVariable', sans-serif"
      pb="200px" // 👈 espacio para el filtro fijo
    >
      <Heading size="lg" mb={6} fontWeight="bold">
        Reporte de Órdenes
      </Heading>

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
