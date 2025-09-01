import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Box,
  Button,
} from "@chakra-ui/react";
import { useState } from "react";
import { getPdfByCode } from "../../../features/reports/services/reportService"; 
import { downloadInvoicePDFdirectly } from "../../../features/reports/utils/pdfGenerators"; 

export default function InvoicesModal({ isOpen, onClose, documentos }) {

  console.log("Documentos recibidos en InvoicesModal:", documentos);
  
  const [loadingRef, setLoadingRef] = useState(null); 

  const handleDownloadReference = async (referenceCode) => {
    if (!referenceCode) return;

    setLoadingRef(referenceCode);
    try {
      console.log(referenceCode);
      
      await downloadInvoicePDFdirectly(referenceCode);
    } catch (error) {
      console.error("Error al descargar el PDF de la referencia:", error);
      alert("No se pudo descargar el archivo.");
    } finally {
      setLoadingRef(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Facturas del cliente</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box overflowX="auto" borderRadius="md">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th
                    border="2px solid"
                    background="green.500"
                    color="white"
                    borderColor="green.500"
                  >
                    N° Documento
                  </Th>
                  <Th
                    border="2px solid"
                    background="green.500"
                    color="white"
                    borderColor="green.500"
                  >
                    Referencias
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {Array.isArray(documentos) &&
                  documentos.map((doc, index) => (
                    <Tr key={index}>
                      <Td border="2px solid" borderColor="green.500">
                        {doc.numeroDocumento}
                      </Td>
                      <Td border="2px solid" borderColor="green.500">
                        {(doc.referencia || []).map((ref, i) => {
                          const cleanedRef = ref
                            .replace(/\//g, "")
                            .replace(/\s/g, "");

                          return (
                            <div key={i}>
                              <Button
                                size="xs"
                                colorScheme="green"
                                variant="link"
                                onClick={() => handleDownloadReference(cleanedRef)}
                                isDisabled={!cleanedRef}
                                isLoading={loadingRef === cleanedRef}
                              >
                                {ref}
                              </Button>
                            </div>
                          );
                        })}
                      </Td>
                    </Tr>
                  ))}
              </Tbody>
            </Table>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
