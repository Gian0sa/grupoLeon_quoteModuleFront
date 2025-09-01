// ModalSeguimiento.jsx
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Text,
} from "@chakra-ui/react";
import TrackingPage from "./SalesReportDetail";

export default function ModalSeguimiento({ isOpen, onClose, orden }) {
  console.log("Orden en ModalSeguimiento:", orden);
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxH="90vh" overflowY="auto">
        <ModalHeader>Seguimiento de Pedido</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {orden ? <TrackingPage orden={orden} /> : <Text>No hay datos.</Text>}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
