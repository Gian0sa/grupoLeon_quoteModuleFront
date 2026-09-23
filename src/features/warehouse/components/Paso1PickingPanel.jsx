import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  Button,
  VStack,
  HStack,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
  SimpleGrid,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';
import { MdInventory, MdAssignment } from 'react-icons/md';

export function Paso1PickingPanel({
  deliveryData,
  lineas,
  handleCambioCantidadSalida,
  responsablePicking,
  setResponsablePicking,
  observacionAlmacen,
  setObservacionAlmacen,
  guardandoPicking,
  handleValidarPicking,
  tieneVistoBuenoPicking,
  setTabIndex,
  getBadgeEstado,
}) {
  return (
    <VStack spacing={6} align="stretch">
      {/* Tabla de Artículos con Cantidades Pedidas vs Cantidades Salida */}
      <Card boxShadow="sm" borderRadius="2xl" bg="white">
        <CardHeader pb={2}>
          {/* Acción principal arriba: el visto bueno es un solo clic, no debe obligar a bajar */}
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <HStack>
              <Icon as={MdInventory} color="green.600" w={5} h={5} />
              <Heading size="md" color="gray.800">
                Verificación Física de Ítems ({lineas.length})
              </Heading>
            </HStack>

            <HStack spacing={3} flexWrap="wrap" w={{ base: 'full', md: 'auto' }}>
              {tieneVistoBuenoPicking && (
                <Button
                  rightIcon={<Icon as={MdInventory} />}
                  colorScheme="blue"
                  variant="outline"
                  borderRadius="xl"
                  size="md"
                  flex={{ base: 1, md: 'none' }}
                  onClick={() => {
                    setTabIndex(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Ir a Embalaje (Paso 2)
                </Button>
              )}

              {deliveryData.estado !== 'DESPACHADA' && (
                <Button
                  leftIcon={<CheckCircleIcon />}
                  colorScheme="green"
                  bg="#126C36"
                  _hover={{ bg: '#0e572b' }}
                  borderRadius="xl"
                  size="md"
                  flex={{ base: 1, md: 'none' }}
                  isLoading={guardandoPicking}
                  loadingText="Guardando..."
                  onClick={handleValidarPicking}
                >
                  Dar Visto Bueno (Validar Picking)
                </Button>
              )}
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody p={0}>
          <Box overflowX="auto">
            <Table variant="simple" size="md">
              <Thead bg="gray.100">
                <Tr>
                  <Th w="60px" textAlign="center">N°</Th>
                  <Th>Descripción de Producto</Th>
                  <Th w="150px" textAlign="center">Cant. Pedida</Th>
                </Tr>
              </Thead>
              <Tbody>
                {lineas.map((l, index) => {
                  return (
                    <Tr
                      key={index}
                      bg="white"
                      _hover={{ bg: 'gray.50' }}
                    >
                      <Td textAlign="center" fontSize="sm" fontWeight="bold" color="gray.500">{index + 1}</Td>
                      <Td fontSize="sm">
                        <Text fontWeight="bold" color="gray.800">{l.nombreProducto}</Text>
                      </Td>
                      <Td textAlign="center" fontWeight="bold" color="blue.600" fontSize="md">
                        {Number.isInteger(l.cantidadPedida) ? l.cantidadPedida : l.cantidadPedida.toFixed(2)}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>

      {/* Responsable de Picking y Opinión de Almacén */}
      <Card boxShadow="sm" borderRadius="2xl" bg="white">
        <CardHeader pb={2}>
          <HStack>
            <Icon as={MdAssignment} color="green.600" w={5} h={5} />
            <Heading size="md" color="gray.800">
              Validación de Picking & Responsable
            </Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} mb={5}>
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" fontWeight="bold" color="gray.700">
                  Responsable de Picking (Almacén) *
                </Text>
                <Badge
                  colorScheme={deliveryData.responsablePicking ? 'green' : 'blue'}
                  fontSize="10px"
                  borderRadius="md"
                  px={1.5}
                  textTransform="none"
                >
                  {deliveryData.responsablePicking ? 'DNI SAP / Guardado' : 'Usuario en Sesión (Fijo)'}
                </Badge>
              </HStack>
              <Input
                value={responsablePicking || ''}
                isReadOnly
                borderRadius="xl"
                fontWeight="bold"
                bg={deliveryData.responsablePicking ? 'green.50' : 'blue.50'}
                color={deliveryData.responsablePicking ? 'green.900' : 'blue.900'}
                borderColor={deliveryData.responsablePicking ? 'green.300' : 'blue.200'}
                cursor="default"
              />
            </Box>

            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
                Estado Actual
              </Text>
              <Flex h="40px" align="center">
                {getBadgeEstado(deliveryData.estado)}
              </Flex>
            </Box>
          </SimpleGrid>

          <Box>
            <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
              Opinión / Explicación de Almacén (Obligatorio en caso de faltantes o diferencias)
            </Text>
            <Textarea
              placeholder='Ejemplo: "Le enviamos 4 de 8, debemos 4 unidades por falta de stock; se entregará en próximo pedido."'
              value={observacionAlmacen}
              onChange={(e) => setObservacionAlmacen(e.target.value)}
              rows={3}
              borderRadius="xl"
              bg="gray.50"
              border="1px solid"
              borderColor="gray.300"
              isDisabled={deliveryData.estado === 'DESPACHADA'}
            />
          </Box>
        </CardBody>
      </Card>
    </VStack>
  );
}
