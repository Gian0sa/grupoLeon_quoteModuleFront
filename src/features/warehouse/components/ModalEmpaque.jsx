import React from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  VStack,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';

export function ModalEmpaque({
  isOpen,
  onClose,
  articulo,
  cajas,
  cajaDestinoSeleccionada,
  setCajaDestinoSeleccionada,
  cantidadEmpacarInput,
  setCantidadEmpacarInput,
  getCantidadEmpacada,
  getCantidadPendiente,
  handleConfirmarEmpaque,
}) {
  if (!articulo) return null;

  const pendiente = getCantidadPendiente(articulo);
  const empacada = getCantidadEmpacada(articulo.codigoArticulo);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay />
      <ModalContent borderRadius="2xl">
        <ModalHeader color="gray.800" pb={1}>
          📦 Empacar en Caja / Bulto
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box p={3} bg="gray.50" borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Text fontSize="xs" color="gray.500">Producto Seleccionado:</Text>
              <Text fontWeight="bold" fontSize="sm" color="green.700">
                {articulo.codigoArticulo} - {articulo.nombreProducto}
              </Text>
              <HStack spacing={4} mt={2} fontSize="xs">
                <Text>Aprobado: <b>{articulo.cantidadSalida}</b></Text>
                <Text color="teal.600">En Cajas: <b>{empacada}</b></Text>
                <Text color="orange.600">Pendiente: <b>{pendiente}</b></Text>
              </HStack>
            </Box>

            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
                Selecciona la Caja Destino:
              </Text>
              <Select
                borderRadius="xl"
                value={cajaDestinoSeleccionada}
                onChange={(e) => setCajaDestinoSeleccionada(e.target.value)}
              >
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigoCaja} (Tiene {c.items?.reduce((s, it) => s + Number(it.cantidad || 0), 0)} und.{c.pesoKg ? ` - ${c.pesoKg} Kg` : ''})
                  </option>
                ))}
                <option value="NUEVA_CAJA">+ Crear y Colocar en Nueva Caja</option>
              </Select>
            </Box>

            <Box>
              <Flex justify="space-between" align="center" mb={1}>
                <Text fontSize="xs" fontWeight="bold" color="gray.700">
                  Cantidad de Unidades a Empacar:
                </Text>
                <Button
                  size="xs"
                  variant="link"
                  colorScheme="teal"
                  onClick={() => setCantidadEmpacarInput(pendiente)}
                >
                  Máximo ({pendiente})
                </Button>
              </Flex>
              <NumberInput
                min={1}
                max={pendiente}
                value={cantidadEmpacarInput}
                onChange={(_, val) => setCantidadEmpacarInput(val)}
                clampValueOnBlur
                keepWithinRange
              >
                <NumberInputField borderRadius="xl" fontWeight="bold" fontSize="md" textAlign="center" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <Text fontSize="10px" color="gray.500" mt={1}>
                No puedes superar la cantidad pendiente por empacar.
              </Text>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} borderRadius="xl" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            colorScheme="green"
            bg="#126C36"
            _hover={{ bg: "#0e572b" }}
            color="white"
            borderRadius="xl"
            onClick={handleConfirmarEmpaque}
          >
            Confirmar e Ingresar a Caja
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
