import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Text,
  Spinner,
  Center,
} from "@chakra-ui/react";
import TrackingPage from "./SalesReportDetail";
import { useGetInvoiceDeliveryNoteperOrder } from "../hooks/queries/reportQueries";

export default function ModalSeguimiento({ isOpen, onClose, orden }) {
  const docEntry = orden?.orden?.id;

  const {
    data,
    isLoading,
    isError,
    error,
  } = useGetInvoiceDeliveryNoteperOrder({ docEntry });

  const mappedData = Array.isArray(data) && data.length > 0
    ? {
        orden: {
          id: data[0].Sales_Order_DocEntry,
          numero: data[0].Sales_Order_DocNum,
          fechaCreacion: data[0].DELIVERY_DATE || data[0].INVOICE_DATE,
          montoUsd: data[0].MONTO_INVOICE || 0,
        },
        cliente: {
          nombre: data[0].Customer_Name,
          codigo: data[0].Customer_Code,
        },
        entrega: data[0].DELIVERY_ENTRY
          ? [
              {
                id: data[0].DELIVERY_ENTRY,
                fecha: data[0].DELIVERY_DATE,
              },
            ]
          : [],
        factura: data[0].INVOICE_ENTRY
          ? [
              {
                id: data[0].INVOICE_ENTRY,
                fecha: data[0].INVOICE_DATE,
                montoUsd: data[0].MONTO_INVOICE || 0,
              },
            ]
          : [],
      }
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxH="90vh" overflowY="auto">
        <ModalHeader>Seguimiento de Pedido</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {!orden ? (
            <Text>No hay datos de la orden.</Text>
          ) : isLoading ? (
            <Center py={10}>
              <Spinner size="xl" color="green.500" />
            </Center>
          ) : isError ? (
            <Text color="red.500">
              ❌ Error cargando seguimiento: {error.message}
            </Text>
          ) : !mappedData ? (
            <Text>No hay registros disponibles.</Text>
          ) : (
            <TrackingPage orden={mappedData} />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
