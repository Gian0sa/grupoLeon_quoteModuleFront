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
import { useGetOrderByCode } from "../../hooks/queries/reportQueries";

export default function ModalOrdenDetalle({ isOpen, onClose, ordenId }) {
  const { data, isLoading, error } = useGetOrderByCode(ordenId);
  console.log("la data de el order es : ",data);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Detalle de Orden</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
  <Spinner />
) : error ? (
  <Text color="red.500">Error al cargar orden</Text>
) : data ? (
  <>
    <Box mb={4}>
        <Text><strong>Número:</strong> {data.docNum}</Text>
        <Text><strong>Fecha emisión:</strong> {data.docDate?.slice(0, 10)}</Text>
        <Text><strong>Hora:</strong> {data.time}</Text>
        <Text><strong>Código cliente:</strong> {data.cardCode}</Text>
        <Text><strong>Cliente:</strong> {data.cardName}</Text>
        <Text><strong>Dirección:</strong> {data.address}</Text>
        <Text><strong>Moneda:</strong> {data.currency}</Text>
    </Box>

    <Box overflowX="auto">
      <Table size="sm" variant="simple" minWidth="600px">
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
    <Box>
        <Text><strong>Total IGV:</strong> {data.total}</Text>
    </Box>
  </>
) : (
  <Text>Cargando datos...</Text>
)}

        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
