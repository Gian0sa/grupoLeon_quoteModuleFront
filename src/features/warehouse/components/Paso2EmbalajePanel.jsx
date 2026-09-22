import React, { useState, useEffect } from 'react';
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
  NumberInput,
  NumberInputField,
  Divider,
  IconButton,
  Select,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useToast,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, CloseIcon, ArrowBackIcon, CheckCircleIcon } from '@chakra-ui/icons';
import { MdInventory, MdInbox, MdAddBox, MdAssignment, MdLocalShipping, MdLock } from 'react-icons/md';
import { axiosInstance } from '../../../shared/lib/axiosInstance';

export function Paso2EmbalajePanel({
  deliveryData,
  lineas,
  cajas,
  getCantidadEmpacada,
  getCantidadPendiente,
  handleAbrirModalEmpaque,
  handleCrearNuevaCaja,
  handleEliminarCaja,
  handleRemoverItemDeCaja,
  handleCambioPesoCaja,
  pesoKg,
  setPesoKg,
  responsablePacking,
  setResponsablePacking,
  observacionEmbalaje,
  setObservacionEmbalaje,
  guardandoEmbalaje,
  handleValidarEmbalaje,
  handleEmpacarTodoEnUnSoloBulto,
  tieneVistoBuenoPicking,
  tieneVistoBuenoEmbalaje,
  setTabIndex,
}) {
  const [embaladoresList, setEmbaladoresList] = useState([]);
  const [cargandoEmbaladores, setCargandoEmbaladores] = useState(false);
  const { isOpen: isModalNuevoOpen, onOpen: onOpenModalNuevo, onClose: onCloseModalNuevo } = useDisclosure();
  const [nuevoDni, setNuevoDni] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const toast = useToast();

  const cargarEmbaladores = async () => {
    try {
      setCargandoEmbaladores(true);
      const res = await axiosInstance.get('/warehouseModule/guias-salida/embaladores');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setEmbaladoresList(res.data.data);
      }
    } catch (e) {
      console.error('Error cargando embaladores:', e);
    } finally {
      setCargandoEmbaladores(false);
    }
  };

  useEffect(() => {
    cargarEmbaladores();
  }, []);

  const handleGuardarNuevoEmbalador = async () => {
    if (!nuevoDni.trim() || !nuevoNombre.trim()) {
      toast({ title: 'DNI y Nombre son requeridos', status: 'warning', duration: 3000 });
      return;
    }
    try {
      setGuardandoNuevo(true);
      const res = await axiosInstance.post('/warehouseModule/guias-salida/embaladores', {
        dni: nuevoDni.trim(),
        nombre: nuevoNombre.trim().toUpperCase(),
      });
      if (res.data?.success) {
        toast({ title: 'Embalador registrado exitosamente', status: 'success', duration: 3000 });
        const valorNuevo = `${nuevoDni.trim()} - ${nuevoNombre.trim().toUpperCase()}`;
        await cargarEmbaladores();
        setResponsablePacking(valorNuevo);
        setNuevoDni('');
        setNuevoNombre('');
        onCloseModalNuevo();
      }
    } catch (err) {
      toast({ title: 'Error al registrar', description: err.response?.data?.message || err.message, status: 'error', duration: 4000 });
    } finally {
      setGuardandoNuevo(false);
    }
  };

  if (!tieneVistoBuenoPicking) {
    return (
      <Card boxShadow="sm" borderRadius="2xl" bg="white" p={8} textAlign="center">
        <VStack spacing={4}>
          <Icon as={MdLock} w={16} h={16} color="orange.400" />
          <Heading size="md" color="gray.700">
            Paso 2 Bloqueado: Requiere Visto Bueno de Picking
          </Heading>
          <Text color="gray.500" maxW="500px">
            Antes de embalar y registrar los bultos, el equipo de almacén debe confirmar la revisión física de los ítems en el <b>Paso 1</b>.
          </Text>
          <Button
            leftIcon={<ArrowBackIcon />}
            colorScheme="green"
            bg="#126C36"
            _hover={{ bg: "#0e572b" }}
            color="white"
            borderRadius="xl"
            onClick={() => setTabIndex(0)}
          >
            Ir al Paso 1: Guía de Salida (Picking)
          </Button>
        </VStack>
      </Card>
    );
  }

  const totalAprobado = lineas.reduce((acc, l) => acc + Number(l.cantidadSalida || 0), 0);
  const totalEnCajas = cajas.reduce((acc, c) => acc + c.items.reduce((s, it) => s + Number(it.cantidad || 0), 0), 0);

  return (
    <VStack spacing={6} align="stretch">
      {/* 1. Mercadería Verificada Lista para Embalar */}
      <Card boxShadow="sm" borderRadius="2xl" bg="white">
        <CardHeader pb={2}>
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
            <HStack>
              <Icon as={MdInventory} color="green.600" w={5} h={5} />
              <Heading size="md" color="gray.800">
                Mercadería Verificada Lista para Embalar ({lineas.length} ítems)
              </Heading>
            </HStack>
            <HStack spacing={3} flexWrap="wrap">
              <Badge colorScheme="blue" px={3} py={1} borderRadius="lg" fontSize="sm">
                Total Aprobado: {totalAprobado} und.
              </Badge>
              <Badge colorScheme="green" px={3} py={1} borderRadius="lg" fontSize="sm">
                En Cajas: {totalEnCajas} und.
              </Badge>
              {deliveryData.estado !== 'DESPACHADA' && handleEmpacarTodoEnUnSoloBulto && (
                <Button
                  size="sm"
                  colorScheme="green"
                  bg="#126C36"
                  _hover={{ bg: "#0e572b" }}
                  color="white"
                  borderRadius="xl"
                  leftIcon={<Icon as={MdInbox} />}
                  onClick={handleEmpacarTodoEnUnSoloBulto}
                >
                  📦 Empacar Todo en 1 Solo Bulto
                </Button>
              )}
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody pt={2}>
          <Box overflowX="auto" border="1px solid" borderColor="gray.200" borderRadius="xl">
            <Table size="sm" variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Cód. Art.</Th>
                  <Th>Descripción</Th>
                  <Th textAlign="center">Und.</Th>
                  <Th textAlign="center">Cant. Aprobada</Th>
                  <Th textAlign="center">En Cajas</Th>
                  <Th textAlign="center">Pendiente</Th>
                  <Th textAlign="center">Acción</Th>
                </Tr>
              </Thead>
              <Tbody>
                {lineas.map((l, i) => {
                  const empacado = getCantidadEmpacada(l.codigoArticulo);
                  const pendiente = getCantidadPendiente(l);
                  const estaCompleto = pendiente === 0;
                  return (
                    <Tr
                      key={i}
                      bg={estaCompleto ? '#e8f5e9' : 'white'}
                      _hover={{ bg: estaCompleto ? '#c8e6c9' : 'gray.50' }}
                      transition="background-color 0.15s"
                    >
                      <Td fontWeight="bold" fontSize="xs">{l.codigoArticulo}</Td>
                      <Td fontSize="xs">{l.nombreProducto}</Td>
                      <Td textAlign="center" fontSize="xs">{l.unidadMedida}</Td>
                      <Td textAlign="center" fontWeight="bold" color="gray.700" fontSize="xs">
                        {l.cantidadSalida}
                      </Td>
                      <Td textAlign="center" fontWeight="bold" color="teal.600" fontSize="xs">
                        {empacado}
                      </Td>
                      <Td textAlign="center" fontWeight="bold" color={pendiente > 0 ? "orange.600" : "green.600"} fontSize="xs">
                        {pendiente}
                      </Td>
                      <Td textAlign="center">
                        {deliveryData.estado !== 'DESPACHADA' ? (
                          pendiente > 0 ? (
                            <Button
                              size="xs"
                              colorScheme="teal"
                              variant="solid"
                              borderRadius="lg"
                              leftIcon={<AddIcon />}
                              onClick={() => handleAbrirModalEmpaque(l)}
                            >
                              Empacar
                            </Button>
                          ) : (
                            <Badge colorScheme="green" px={2} py={0.5} borderRadius="md" fontSize="xs">
                              ✔ Completo
                            </Badge>
                          )
                        ) : (
                          <Badge colorScheme="gray" px={2} py={0.5} borderRadius="md" fontSize="xs">
                            Cerrado
                          </Badge>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>

      {/* 2. Cajas / Bultos Dinámicos de Embalaje */}
      <Card boxShadow="sm" borderRadius="2xl" bg="white">
        <CardHeader pb={2}>
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
            <HStack>
              <Icon as={MdInbox} color="green.600" w={6} h={6} />
              <Box>
                <Heading size="md" color="gray.800">
                  Cajas & Bultos de Salida ({cajas.length})
                </Heading>
                <Text fontSize="xs" color="gray.500">
                  Arma las cajas dinámicamente. Cada caja acumula sus ítems y genera el control de despacho.
                </Text>
              </Box>
            </HStack>
            {deliveryData.estado !== 'DESPACHADA' && (
              <Button
                size="sm"
                colorScheme="green"
                bg="#126C36"
                _hover={{ bg: "#0e572b" }}
                color="white"
                leftIcon={<AddIcon />}
                borderRadius="xl"
                onClick={handleCrearNuevaCaja}
              >
                + Crear Nueva Caja / Bulto
              </Button>
            )}
          </Flex>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {cajas.map((caja) => {
              const unidadesEnCaja = caja.items.reduce((s, it) => s + Number(it.cantidad || 0), 0);
              return (
                <Box
                  key={caja.id}
                  p={4}
                  border="2px dashed"
                  borderColor={caja.items.length > 0 ? "green.400" : "gray.300"}
                  bg={caja.items.length > 0 ? "green.50" : "gray.50"}
                  borderRadius="2xl"
                  position="relative"
                >
                  <Flex justify="space-between" align="center" mb={2}>
                    <HStack spacing={1}>
                      <Icon as={MdAddBox} color="green.700" w={5} h={5} />
                      <Text fontWeight="bold" fontSize="sm" color="gray.800">
                        {caja.codigoCaja}
                      </Text>
                    </HStack>
                    <HStack spacing={1.5}>
                      {/* Peso Individual del Bulto */}
                      <HStack
                        spacing={1}
                        bg="white"
                        px={1.5}
                        py={0.5}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={caja.pesoKg ? "green.500" : "gray.300"}
                        boxShadow="2xs"
                        title="Peso del bulto en Kg"
                      >
                        <Input
                          size="xs"
                          w="48px"
                          type="number"
                          step="0.01"
                          min="0"
                          variant="unstyled"
                          placeholder="0.0"
                          textAlign="right"
                          fontWeight="bold"
                          color="green.800"
                          value={caja.pesoKg ?? ''}
                          onChange={(e) => handleCambioPesoCaja && handleCambioPesoCaja(caja.id, e.target.value)}
                          isDisabled={deliveryData.estado === 'DESPACHADA'}
                        />
                        <Text fontSize="10px" fontWeight="bold" color="gray.500">
                          Kg
                        </Text>
                      </HStack>

                      <Badge colorScheme="green" borderRadius="md" px={2} py={0.5} fontSize="xs">
                        {unidadesEnCaja} und.
                      </Badge>
                      {cajas.length > 1 && deliveryData.estado !== 'DESPACHADA' && (
                        <IconButton
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          icon={<DeleteIcon />}
                          aria-label="Eliminar caja"
                          onClick={() => handleEliminarCaja(caja.id)}
                        />
                      )}
                    </HStack>
                  </Flex>

                  <Divider mb={2} borderColor="gray.300" />

                  {caja.items.length === 0 ? (
                    <Box py={6} textAlign="center">
                      <Text fontSize="xs" color="gray.400">
                        Caja vacía. Agrega productos arriba con el botón "Empacar".
                      </Text>
                    </Box>
                  ) : (
                    <VStack spacing={2} align="stretch" maxH="160px" overflowY="auto">
                      {caja.items.map((it, itIdx) => (
                        <Flex
                          key={itIdx}
                          justify="space-between"
                          align="center"
                          p={2}
                          bg="white"
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="gray.200"
                        >
                          <Box flex="1" pr={2}>
                            <Text fontSize="xs" fontWeight="bold" color="gray.800">
                              {it.codigoArticulo} ({it.cantidad})
                            </Text>
                            <Text fontSize="10px" color="gray.500" noOfLines={1}>
                              {it.nombreProducto}
                            </Text>
                          </Box>
                          {deliveryData.estado !== 'DESPACHADA' && (
                            <IconButton
                              size="xs"
                              colorScheme="red"
                              variant="ghost"
                              icon={<CloseIcon boxSize="8px" />}
                              aria-label="Quitar de caja"
                              onClick={() => handleRemoverItemDeCaja(caja.id, it.codigoArticulo)}
                            />
                          )}
                        </Flex>
                      ))}
                    </VStack>
                  )}
                </Box>
              );
            })}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* 3. Registro de Pesaje Balanza y Responsable de Packing */}
      <Card boxShadow="sm" borderRadius="2xl" bg="white">
        <CardHeader pb={2}>
          <HStack>
            <Icon as={MdAssignment} color="green.600" w={5} h={5} />
            <Heading size="md" color="gray.800">
              Resumen de Embalaje & Pesaje Balanza
            </Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4} mb={5}>
            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
                Bultos Totales
              </Text>
              <NumberInput
                min={1}
                value={cajas.length}
                isReadOnly
              >
                <NumberInputField borderRadius="xl" fontWeight="bold" bg="gray.50" color="green.700" />
              </NumberInput>
            </Box>

            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
                Peso Total Balanza (Kg)
              </Text>
              <Input
                placeholder="0.00"
                value={pesoKg}
                onChange={(e) => setPesoKg(e.target.value)}
                borderRadius="xl"
                fontWeight="bold"
                bg="green.50"
                color="green.800"
                borderColor="green.200"
                isDisabled={deliveryData.estado === 'DESPACHADA'}
              />
            </Box>

            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" fontWeight="bold" color="gray.700">
                  Responsable Embalaje / Packing *
                </Text>
                {deliveryData.estado !== 'DESPACHADA' && (
                  <Button
                    size="xs"
                    variant="ghost"
                    colorScheme="teal"
                    leftIcon={<AddIcon boxSize="8px" />}
                    onClick={onOpenModalNuevo}
                    h="20px"
                    fontSize="11px"
                  >
                    + Nuevo Embalador
                  </Button>
                )}
              </HStack>
              <Select
                placeholder={cargandoEmbaladores ? 'Cargando embaladores...' : '-- Seleccionar Embalador (DNI - Nombre) --'}
                value={responsablePacking || ''}
                onChange={(e) => setResponsablePacking(e.target.value)}
                borderRadius="xl"
                fontWeight="bold"
                bg={deliveryData.estado === 'DESPACHADA' ? 'gray.50' : 'white'}
                color="blue.900"
                borderColor="blue.200"
                isDisabled={deliveryData.estado === 'DESPACHADA'}
              >
                {/* Si ya hay un responsable previo o guardado que no coincide exactamente, preservarlo */}
                {responsablePacking && !embaladoresList.some(e => `${e.dni} - ${e.nombre}` === responsablePacking || e.nombre === responsablePacking) && (
                  <option value={responsablePacking}>{responsablePacking}</option>
                )}
                {embaladoresList.map((emb) => (
                  <option key={emb.id} value={`${emb.dni} - ${emb.nombre}`}>
                    {emb.dni} - {emb.nombre}
                  </option>
                ))}
              </Select>
            </Box>
          </SimpleGrid>

          <Box mb={5}>
            <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
              Notas de Embalaje / Tipo de Empaque
            </Text>
            <Input
              placeholder='Ejemplo: "Cajas de cartón selladas y flejadas con cinta de seguridad"'
              value={observacionEmbalaje}
              onChange={(e) => setObservacionEmbalaje(e.target.value)}
              borderRadius="xl"
              isDisabled={deliveryData.estado === 'DESPACHADA'}
            />
          </Box>

          <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <Button
              leftIcon={<ArrowBackIcon />}
              variant="ghost"
              borderRadius="xl"
              onClick={() => setTabIndex(0)}
            >
              Volver a Picking (Paso 1)
            </Button>

            <HStack spacing={3}>
              {tieneVistoBuenoEmbalaje && (
                <Button
                  rightIcon={<Icon as={MdLocalShipping} />}
                  colorScheme="blue"
                  variant="outline"
                  borderRadius="xl"
                  onClick={() => setTabIndex(2)}
                >
                  Ir a Control Despacho (Paso 3)
                </Button>
              )}

              {deliveryData.estado !== 'DESPACHADA' && (
                <Button
                  leftIcon={<CheckCircleIcon />}
                  colorScheme="green"
                  bg="#126C36"
                  _hover={{ bg: "#0e572b" }}
                  borderRadius="xl"
                  isLoading={guardandoEmbalaje}
                  loadingText="Registrando embalaje..."
                  onClick={handleValidarEmbalaje}
                >
                  Confirmar Embalaje & Habilitar Despacho
                </Button>
              )}
            </HStack>
          </Flex>
        </CardBody>
      </Card>

      {/* Modal para registrar nuevo Embalador en BD */}
      <Modal isOpen={isModalNuevoOpen} onClose={onCloseModalNuevo} isCentered size="sm">
        <ModalOverlay />
        <ModalContent borderRadius="2xl">
          <ModalHeader color="gray.800" pb={1}>
            ➕ Registrar Nuevo Embalador
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3} align="stretch" py={2}>
              <Box>
                <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
                  DNI del Embalador *
                </Text>
                <Input
                  placeholder="Ej: 60784772"
                  value={nuevoDni}
                  onChange={(e) => setNuevoDni(e.target.value.replace(/\D/g, '').slice(0, 15))}
                  borderRadius="xl"
                  fontWeight="bold"
                />
              </Box>
              <Box>
                <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
                  Nombres y Apellidos *
                </Text>
                <Input
                  placeholder="Ej: JUAN PEREZ LOPEZ"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  borderRadius="xl"
                  fontWeight="bold"
                />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCloseModalNuevo}>
              Cancelar
            </Button>
            <Button
              colorScheme="green"
              bg="#126C36"
              _hover={{ bg: "#0e572b" }}
              borderRadius="xl"
              isLoading={guardandoNuevo}
              onClick={handleGuardarNuevoEmbalador}
            >
              Guardar en BD
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
