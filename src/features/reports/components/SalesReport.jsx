import React, { useState } from "react";
import {
  Box,
  Text,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Button,
  Flex,
  Stack,
  Divider,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
   Select,
   Stepper,
   Step,
   StepIndicator,
   StepStatus,
   StepTitle
} from "@chakra-ui/react";
import { CheckIcon , WarningIcon } from "@chakra-ui/icons";
import { useGetSalespersonReports } from "../hooks/queries/reportQueries";
import TrackingPage from "./SalesReportDetail";

export default function SalespersonReports({ salespersonId }) {
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;
  const [productosPendientes, setProductosPendientes] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [estadoOrdenFiltro, setEstadoOrdenFiltro] = useState(null);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);



  const { data, isLoading, error } = useGetSalespersonReports(
    salespersonId,
    pagina,
    porPagina,
    estadoOrdenFiltro
  );

  if (isLoading) return <Spinner size="xl" />;
  if (error || !data) return <Text color="red.500">Error cargando datos.</Text>;

  const { resumen, paginacion, detalle } = data;

  console.log(detalle);

  const abrirModalPendientes = (productos) => {
    setProductosPendientes(productos);
    onOpen();
  };

  return (
    <Box p={5}>


      <Heading size="md" mb={4}>
        Resumen del Vendedor
      </Heading>

      

      <Flex wrap="wrap" gap={2} mb={4}>
        {["Orden de Venta", "Entrega Completa", "Entrega Incompleta", "Factura Completa", "Factura Incompleta"].map((estado) => (
            <Button
            key={estado}
            size="sm"
            variant={estadoOrdenFiltro === estado ? "solid" : "outline"}
            colorScheme="blue"
            onClick={() => {
                setEstadoOrdenFiltro(estadoOrdenFiltro === estado ? null : estado); // Permite quitar el filtro si se vuelve a hacer clic
                setPagina(1);
            }}
            >
            {estado}
            </Button>
        ))}
        </Flex>

      <Stack spacing={2} mb={6}>
        <Text><b>Total órdenes:</b> {resumen.totalOrdenes}</Text>
        <Divider />
        <Text><b>Resumen por estado:</b></Text>
        {resumen.porEstado &&
            Object.entries(resumen.porEstado).map(([estado, count]) => (
            <Text key={estado}>
                • {estado}: {count}
            </Text>
            ))}
        </Stack>


      <Divider mb={4} />

      <Heading size="sm" mb={2}>
        Detalle (Página {paginacion.paginaActual} de {paginacion.totalPaginas})
      </Heading>

      {detalle.map((orden, idx) => (
        <Box key={idx} p={4} border="1px solid #ccc" borderRadius="lg" mb={4}>
          <Text><b>Cliente:</b> {orden.cliente.nombre} ({orden.cliente.codigo})</Text>
          <Text><b>Orden:</b> #{orden.orden.numero}</Text>
          <Text><b>Fecha:</b> {orden.orden.fechaCreacion}</Text>
          <Text><b>Estado de Orden:</b> {orden.estadoOrden}</Text>
          <Text><b>Cerrada:</b> {orden.cerrada ? "Sí" : "No"}</Text>

         
            <Button
            mt={2}
            size="sm"
            colorScheme="blue"
            onClick={() => {
                setOrdenSeleccionada(orden);
                onOpen();
            }}
            >
            Ver seguimiento
            </Button>
        </Box>
      ))}

      <Flex justify="center" mt={4} gap={2} wrap="wrap">
  {Array.from({ length: paginacion.totalPaginas }, (_, i) => i + 1)
    .filter(
      (num) =>
        num === 1 ||
        num === paginacion.totalPaginas ||
        Math.abs(num - pagina) <= 2
    )
    .map((num, i, arr) => {
      const prevNum = arr[i - 1];
      const showDots = prevNum && num - prevNum > 1;

      return (
        <React.Fragment key={num}>
          {showDots && <Text px={2}>...</Text>}
          <Button
            size="sm"
            variant={num === pagina ? "solid" : "outline"}
            colorScheme="blue"
            onClick={() => setPagina(num)}
          >
            {num}
          </Button>
        </React.Fragment>
      );
    })}
</Flex>

     <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent maxH="90vh" overflowY="auto">
            <ModalHeader>Seguimiento de Pedido</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
            {ordenSeleccionada ? (
                <TrackingPage orden={ordenSeleccionada} />
            ) : (
                <Text>No hay datos.</Text>
            )}
            </ModalBody>
        </ModalContent>
    </Modal>

    </Box>
  );
}
