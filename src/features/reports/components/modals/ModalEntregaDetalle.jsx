import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  Box,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@chakra-ui/react";
import { useGetDeliveryNoteByCode } from "../../hooks/queries/reportQueries";

export default function ModalEntregaDetalle({ isOpen, onClose, entregaId }) {
  const { data, isLoading, error } = useGetDeliveryNoteByCode(entregaId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Detalle de Entrega</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Spinner />
          ) : error ? (
            <Text color="red.500">Error al cargar entrega</Text>
          ) : data ? (
            <>
              <Box mb={4}>
                <Text><strong>Número:</strong> {data.docNum}</Text>
                <Text><strong>Fecha:</strong> {data.docDate?.slice(0, 10)}</Text>
                <Text><strong>Cliente:</strong> {data.cardName}</Text>
                <Text><strong>Dirección:</strong> {data.address}</Text>
                <Text><strong>Moneda:</strong> {data.currency}</Text>
                <Text><strong>Total c. IGV:</strong> {data.total}</Text>
              </Box>

              <Box overflowX="auto">
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Código</Th>
                      <Th>Descripción</Th>
                      <Th isNumeric>Cantidad</Th>
                      <Th isNumeric>Precio</Th>
                      <Th isNumeric>Total</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.lines.map((line, index) => (
                      <Tr key={index}>
                        <Td>{line.itemCode}</Td>
                        <Td>{line.description}</Td>
                        <Td isNumeric>{line.quantity}</Td>
                        <Td isNumeric>{line.unitPrice}</Td>
                        <Td isNumeric>{line.lineTotal}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </>
          ) : (
            <Text>No hay datos disponibles</Text>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
