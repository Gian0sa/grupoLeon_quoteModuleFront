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
  const docEntry = orden?.DocEntry || orden?.orden?.id;

  console.log(docEntry)
  const { data, isLoading, isError, error } =
    useGetInvoiceDeliveryNoteperOrder({ docEntry });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxH="90vh" overflowY="auto" mx={{ base: 2, md: 4 }} borderRadius="2xl">
        <ModalHeader px={{ base: 4, md: 6 }} py={3}>Seguimiento de Pedido</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={{ base: 2, md: 5 }}>
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
          ) : (
            <TrackingPage orden={orden} data={data} />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
