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
  Spinner,
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@chakra-ui/react";
import {
  useGetInvoiceByCode,
  useGetPdfByCode,
} from "../../hooks/queries/reportQueries";
import { useMemo, useState } from "react";

export default function ModalFacturaDetalle({ isOpen, onClose, facturaId }) {
  const { data, isLoading, error } = useGetInvoiceByCode(facturaId);
  const [showPdf, setShowPdf] = useState(false);

  const numAtCard = data?.numAtCard;

  const url = useMemo(() => {
    if (!numAtCard) return null;
    return `${import.meta.env.VITE_API_URL}/reportModule/pdf/${numAtCard}`;
  }, [numAtCard]);

  const {
    isFetching: isFetchingPdf,
    refetch: fetchPdf,
  } = useGetPdfByCode(numAtCard, !!numAtCard);

  function handleShowPdf() {
    setShowPdf(true);
  }

  function handlePrintPdf() {
    if (url) {
      const printWindow = window.open(url, "_blank");
      printWindow?.focus();
      printWindow?.print();
    }
  }

  const downloadPdf = async () => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `Factura_${facturaId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    alert("No se pudo descargar el archivo.");
  }
};


  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Cargando Factura...</ModalHeader>
          <ModalBody>
            <Spinner />
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  if (error || !data) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Error</ModalHeader>
          <ModalBody>
            <Text>No se pudo cargar la factura.</Text>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Cerrar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Detalle de Factura #{data?.docNum ?? "—"}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box mb={4}>
            <Text><strong>Cliente:</strong> {data.cardName}</Text>
            <Text><strong>RUC:</strong> {data.cardCode}</Text>
            <Text><strong>Dirección:</strong> {data.address}</Text>
            <Text><strong>Fecha:</strong> {new Date(data.docDate).toLocaleDateString()}</Text>
            <Text><strong>Moneda:</strong> {data.currency}</Text>
            <Text><strong>Total:</strong> ${data.total.toFixed(2)}</Text>
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

          {showPdf && url && (
            <Box h="70vh" border="1px solid #ccc" mt={4}>
                <object
                    data={url}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                >
                    <p>Tu dispositivo no puede mostrar el PDF. <a href={url} target="_blank">Haz clic aquí para abrirlo</a>.</p>
                </object>
            </Box>
          )}
        </ModalBody>

        <ModalFooter>
          {!showPdf && (
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleShowPdf}
              isDisabled={!url}
            >
              Ver PDF
            </Button>
          )}
          {showPdf && url && (
            <>
              <Button colorScheme="green" mr={3} onClick={handlePrintPdf}>
                Imprimir
              </Button>
              <Button
                colorScheme="blue"
                variant="outline"
                mr={3}
                onClick={downloadPdf}
                >
                Descargar
                </Button>
              <Button onClick={() => setShowPdf(false)}>Volver</Button>
            </>
          )}
          <Button onClick={onClose}>Cerrar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
