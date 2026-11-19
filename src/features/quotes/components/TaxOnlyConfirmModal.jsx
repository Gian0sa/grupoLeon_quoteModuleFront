import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Text,
  VStack,
  HStack,
  Box,
} from "@chakra-ui/react";
import { AlertTriangle } from "lucide-react";

/**
 * Modal informativo de confirmación para habilitar el modo Transferencia Gratuita (TaxOnly / Solo IGV).
 * Solo debe mostrarse a Administradores y Facturación antes de activar los controles por ítem.
 */
export function TaxOnlyConfirmModal({ isOpen, onClose, onConfirm }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(2px)" />
      <ModalContent borderRadius="2xl" mx={3} overflow="hidden" boxShadow="2xl">
        <ModalHeader bg="#fff7ed" borderBottom="1px solid" borderColor="orange.200" py={3.5} px={5}>
          <HStack spacing={2.5}>
            <Box
              p={1.5}
              borderRadius="lg"
              bg="orange.100"
              color="orange.600"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <AlertTriangle size={18} />
            </Box>
            <Text fontSize="md" fontWeight="900" color="orange.900">
              Activar Transferencia Gratuita (Solo IGV)
            </Text>
          </HStack>
          <ModalCloseButton top={3} right={3} />
        </ModalHeader>

        <ModalBody py={4} px={5}>
          <VStack align="stretch" spacing={3} fontSize="sm" color="gray.700">
            <Text fontWeight="600">
              Esta modalidad está reservada para operaciones sin cobro comercial como{" "}
              <strong>regalos, bonificaciones, muestras o retiros</strong>.
            </Text>
            <Box bg="gray.50" p={3} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <VStack align="stretch" spacing={1.5} fontSize="xs" fontWeight="600" color="gray.700">
                <Text>• El valor comercial de los artículos marcados pasará a <strong>$0.00</strong>.</Text>
                <Text>• Solo se cobrará el <strong>IGV (18%)</strong> calculado sobre el valor referencial.</Text>
                <Text>• En SAP se enviará como <strong>Transferencia Gratuita (Solo Impuesto)</strong> para SUNAT.</Text>
                <Text>• Si todos los ítems son gratuitos, se autocompletará la condición <strong>10) TRANSFERENCIA GRATUITA</strong>, fecha de hoy y entrega por defecto (editable en Logística).</Text>
              </VStack>
            </Box>
            <Text fontSize="xs" color="gray.500" fontWeight="600">
              Al aceptar se marcarán los artículos actuales con stock como gratuitos (puedes ajustar cada ítem individualmente).
            </Text>
          </VStack>
        </ModalBody>

        <ModalFooter bg="gray.50" borderTop="1px solid" borderColor="gray.200" py={3} px={5} gap={2.5}>
          <Button variant="outline" size="sm" onClick={onClose} fontWeight="700" borderRadius="lg">
            Cancelar
          </Button>
          <Button
            colorScheme="orange"
            bg="#ea580c"
            _hover={{ bg: "#c2410c" }}
            size="sm"
            onClick={onConfirm}
            fontWeight="800"
            borderRadius="lg"
          >
            Aceptar y Activar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
