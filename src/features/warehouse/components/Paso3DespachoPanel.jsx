import React, { useState } from 'react';
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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
} from '@chakra-ui/react';
import { DownloadIcon, ArrowBackIcon, CheckCircleIcon } from '@chakra-ui/icons';
import { MdLocalShipping, MdLock } from 'react-icons/md';
import { format } from 'date-fns';
import { descargarControlDespachoPdf } from '../utils/controlDespachoPdf';

export function Paso3DespachoPanel({
  deliveryData,
  cajas,
  bultos,
  pesoKg,
  responsablePacking,
  vehiculoPlaca,
  setVehiculoPlaca,
  choferNombre,
  setChoferNombre,
  choferLicencia,
  setChoferLicencia,
  codigoFactura,
  setCodigoFactura,
  codigoPedidoDespacho,
  setCodigoPedidoDespacho,
  observacionDespacho,
  setObservacionDespacho,
  guardandoDespacho,
  handleRegistrarDespacho,
  tieneVistoBuenoEmbalaje,
  setTabIndex,
}) {
  // Los hooks van antes de cualquier return (reglas de hooks de React)
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const toast = useToast();

  if (!tieneVistoBuenoEmbalaje) {
    return (
      <Card boxShadow="sm" borderRadius="2xl" bg="white" p={8} textAlign="center">
        <VStack spacing={4}>
          <Icon as={MdLock} w={16} h={16} color="orange.400" />
          <Heading size="md" color="gray.700">
            Paso 3 Bloqueado: Requiere Embalaje Completado
          </Heading>
          <Text color="gray.500" maxW="500px">
            Antes de cargar el camión y realizar el Control de Despacho, se debe completar y confirmar el <b>Paso 2: Embalaje</b> (cajas y pesaje de balanza).
          </Text>
          <Button
            leftIcon={<ArrowBackIcon />}
            colorScheme="green"
            bg="#126C36"
            _hover={{ bg: "#0e572b" }}
            color="white"
            borderRadius="xl"
            onClick={() => setTabIndex(1)}
          >
            Ir al Paso 2: Embalaje
          </Button>
        </VStack>
      </Card>
    );
  }

  const fechaFormat = format(new Date(deliveryData.fechaEmision || new Date()), "dd / MM / yy");

  const handleDescargarPDF = async () => {
    try {
      setDescargandoPdf(true);
      await descargarControlDespachoPdf({
        deliveryData,
        cajas,
        pesoKg,
        responsablePacking,
        vehiculoPlaca,
        choferNombre,
        codigoFactura,
      });
      toast({
        title: '✅ PDF de Control de Despacho descargado',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error generando PDF:', err);
      toast({
        title: 'Error al generar PDF',
        description: err.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setDescargandoPdf(false);
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Estado del Despacho si ya está completado */}
      {deliveryData.estado === 'DESPACHADA' && (
        <Alert status="success" borderRadius="2xl" variant="solid" bg="green.600">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle fontWeight="bold" fontSize="md">
              ¡MERCADERÍA DESPACHADA EN CAMIÓN!
            </AlertTitle>
            <AlertDescription fontSize="sm">
              Vehículo: <b>{deliveryData.despacho?.vehiculoPlaca}</b> | Chofer: <b>{deliveryData.despacho?.choferNombre}</b> | Bultos: <b>{deliveryData.despacho?.bultosCargados}</b> | Fecha: <b>{new Date(deliveryData.despacho?.fechaDespacho || deliveryData.actualizadoEn).toLocaleString('es-PE')}</b>
            </AlertDescription>
          </Box>
        </Alert>
      )}


      {/* 📋 VISTA EN PANTALLA: Tarjeta Moderna de Control de Despacho (Versión preferida) */}
      <Card
        bg="#fff5f7"
        border="2px solid #f1aeb5"
        borderRadius="2xl"
        p={6}
        boxShadow="sm"
      >
        {/* Cabecera */}
        <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={2}>
          <HStack spacing={2} align="center">
            <Text color="#0e6b38" fontSize="22px" fontWeight="900" letterSpacing="-0.5px">
              ▲ Autopartes s.a.
            </Text>
          </HStack>
          <Box textAlign="center">
            <Text fontSize="18px" color="#113f28" fontWeight="900" letterSpacing="0.8px" textTransform="uppercase">
              CONTROL DE DESPACHO - LIMA
            </Text>
          </Box>
          <Badge
            border="1.5px solid #113f28"
            bg="transparent"
            color="#113f28"
            fontSize="16px"
            fontWeight="900"
            px={3}
            py={0.5}
            borderRadius="md"
          >
            A1
          </Badge>
        </Flex>

        {/* Datos Generales */}
        <Box mb={4} fontSize="xs" fontWeight="semibold" color="gray.700">
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacingY={2} spacingX={4} mb={2}>
            <Flex align="center">
              <Text fontWeight="bold" color="gray.600" mr={2}>GUIA Nº:</Text>
              <Text fontWeight="900" color="#0e6b38" fontSize="sm">
                {deliveryData.numeroGuiaInterna || deliveryData.docNumEntrega}
              </Text>
            </Flex>
            <Flex align="center">
              <Text fontWeight="bold" color="gray.600" mr={2}>FECHA:</Text>
              <Text fontWeight="bold" color="gray.800">
                {fechaFormat}
              </Text>
            </Flex>
            <Flex align="center">
              <Text fontWeight="bold" color="gray.600" mr={2}>PLACA:</Text>
              <Text fontWeight="bold" color="blue.700">
                {vehiculoPlaca || '— — — —'}
              </Text>
            </Flex>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, sm: 3 }} spacingY={2} spacingX={4} mb={2}>
            <Flex align="center">
              <Text fontWeight="bold" color="gray.600" mr={2}>FACTURA Nº:</Text>
              <Text fontWeight="bold" color="gray.800">
                {codigoFactura || '— — — —'}
              </Text>
            </Flex>
            <Flex align="center">
              <Text fontWeight="bold" color="gray.600" mr={2}>B/V Nº:</Text>
              <Text fontWeight="bold" color="gray.800">— — — —</Text>
            </Flex>
            <Flex align="center">
              <Text fontWeight="bold" color="gray.600" mr={2}>CONDUCTOR:</Text>
              <Text fontWeight="bold" color="gray.800">
                {choferNombre || '— — — —'}
              </Text>
            </Flex>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, sm: 2 }} spacingY={2} spacingX={4}>
            <Flex align="center">
              <Text fontWeight="bold" color="gray.600" mr={2}>CLIENTE:</Text>
              <Text fontWeight="bold" color="gray.900" noOfLines={1}>
                {deliveryData.clienteNombre}
              </Text>
            </Flex>
            <Flex align="center">
              <Text fontWeight="bold" color="gray.600" mr={2}>AG. TRANSPORTE:</Text>
              <Text fontWeight="bold" color="gray.900" noOfLines={1}>
                {deliveryData.transportistaNombre || 'AUTOPARTES S.A.'}
              </Text>
            </Flex>
          </SimpleGrid>
        </Box>

        {/* Tabla Limpia de Bultos */}
        <Box border="1px solid #f8d7da" borderRadius="xl" overflow="hidden" bg="white" mb={4}>
          <Table size="sm" variant="simple">
            <Thead bg="#fde8ec">
              <Tr>
                <Th w="80px" textAlign="center" color="#842029" fontWeight="bold">BULTO</Th>
                <Th color="#842029" fontWeight="bold">CONTENIDO</Th>
                <Th w="100px" textAlign="center" color="#842029" fontWeight="bold">ESTADO</Th>
              </Tr>
            </Thead>
            <Tbody>
              {cajas.length === 0 ? (
                <Tr>
                  <Td colSpan={3} textAlign="center" py={4} color="gray.500">
                    No hay bultos registrados
                  </Td>
                </Tr>
              ) : (
                cajas.map((caja, idx) => (
                  <Tr key={caja.id || idx} _hover={{ bg: "#fffbfc" }}>
                    <Td textAlign="center" fontWeight="bold" color="gray.700">
                      {caja.bultoNumero || idx + 1}
                    </Td>
                    <Td fontSize="xs" fontWeight="semibold" color="gray.800">
                      {caja.items?.map((it) => `${it.codigoArticulo} (${it.cantidad})`).join(' - ') || 'Bulto sin ítems'}
                      {caja.pesoKg ? (
                        <Badge ml={2} colorScheme="teal" borderRadius="full" px={2}>
                          {caja.pesoKg} Kg
                        </Badge>
                      ) : null}
                    </Td>
                    <Td textAlign="center">
                      <Badge colorScheme="green" variant="subtle" borderRadius="full" px={2}>
                        ✔
                      </Badge>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>

        {/* Totales y Embalador */}
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <HStack spacing={4}>
            <HStack>
              <Text fontWeight="bold" color="gray.700" fontSize="sm">
                TOTAL Nº BULTOS:
              </Text>
              <Badge colorScheme="purple" fontSize="md" px={3} py={0.5} borderRadius="lg">
                {String(cajas.length).padStart(2, '0')}
              </Badge>
            </HStack>
            <HStack>
              <Text fontWeight="bold" color="gray.700" fontSize="sm">
                KILOS:
              </Text>
              <Text fontWeight="900" color="gray.800" fontSize="md">
                {pesoKg ? `${pesoKg} Kg` : '0 Kg'}
              </Text>
            </HStack>
          </HStack>

          <Box
            border="1.5px dashed #f1aeb5"
            borderRadius="xl"
            px={4}
            py={2}
            bg="white"
            textAlign="center"
          >
            <Text fontSize="10px" fontWeight="bold" color="gray.500" textTransform="uppercase">
              EMBALADORES
            </Text>
            <Text fontSize="xs" fontWeight="bold" color="#0e6b38">
              ✍️ {responsablePacking || 'CONTROL ALMACEN'}
            </Text>
          </Box>
        </Flex>
      </Card>

      {/* 🚚 Formulario Operativo para el Despacho del Camión */}
      <Card boxShadow="sm" borderRadius="2xl" bg="white">
        <CardHeader pb={2}>
          <HStack>
            <Icon as={MdLocalShipping} color="green.600" w={5} h={5} />
            <Heading size="md" color="gray.800">
              Confirmación de Carga & Chofer de Salida
            </Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4} mb={4}>
            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
                Placa del Camión / Vehículo *
              </Text>
              <Input
                placeholder="Ej: APB-899"
                value={vehiculoPlaca}
                onChange={(e) => setVehiculoPlaca(e.target.value)}
                borderRadius="xl"
                textTransform="uppercase"
                fontWeight="bold"
                isDisabled={deliveryData.estado === 'DESPACHADA'}
              />
            </Box>

            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
                Nombre del Chofer / Conductor *
              </Text>
              <Input
                placeholder="Ej: ANTONIO"
                value={choferNombre}
                onChange={(e) => setChoferNombre(e.target.value)}
                borderRadius="xl"
                fontWeight="bold"
                isDisabled={deliveryData.estado === 'DESPACHADA'}
              />
            </Box>

            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
                Licencia de Conducir
              </Text>
              <Input
                placeholder="Ej: Q-12345678"
                value={choferLicencia}
                onChange={(e) => setChoferLicencia(e.target.value)}
                borderRadius="xl"
                isDisabled={deliveryData.estado === 'DESPACHADA'}
              />
            </Box>

            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
                N° Factura Asociada
              </Text>
              <Input
                placeholder="Ej: 36489"
                value={codigoFactura}
                onChange={(e) => setCodigoFactura(e.target.value)}
                borderRadius="xl"
                fontWeight="bold"
                isDisabled={deliveryData.estado === 'DESPACHADA'}
              />
            </Box>

            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
                N° Pedido SAP Asociado
              </Text>
              <Input
                placeholder="Ej: 20561"
                value={codigoPedidoDespacho}
                onChange={(e) => setCodigoPedidoDespacho(e.target.value)}
                borderRadius="xl"
                fontWeight="bold"
                isDisabled={deliveryData.estado === 'DESPACHADA'}
              />
            </Box>

            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
                Bultos Cargados al Camión
              </Text>
              <NumberInput
                min={1}
                value={cajas.length || bultos}
                isReadOnly
              >
                <NumberInputField borderRadius="xl" fontWeight="bold" bg="gray.50" color="green.700" />
              </NumberInput>
            </Box>
          </SimpleGrid>

          <Box mb={5}>
            <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.700">
              Observaciones de Despacho en Rampa
            </Text>
            <Input
              placeholder="Ej: Camión cargado en orden, precinto de seguridad colocado..."
              value={observacionDespacho}
              onChange={(e) => setObservacionDespacho(e.target.value)}
              borderRadius="xl"
              isDisabled={deliveryData.estado === 'DESPACHADA'}
            />
          </Box>

          <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <Button
              leftIcon={<ArrowBackIcon />}
              variant="ghost"
              borderRadius="xl"
              onClick={() => {
                setTabIndex(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Volver a Embalaje (Paso 2)
            </Button>

            <HStack spacing={3}>
              <Button
                leftIcon={<DownloadIcon />}
                colorScheme="pink"
                bg="#d63384"
                _hover={{ bg: "#b02a6b" }}
                color="white"
                borderRadius="xl"
                isLoading={descargandoPdf}
                loadingText="Generando PDF..."
                onClick={handleDescargarPDF}
              >
                Descargar PDF
              </Button>

              {deliveryData.estado !== 'DESPACHADA' && (
                <Button
                  leftIcon={<CheckCircleIcon />}
                  colorScheme="green"
                  bg="#126C36"
                  _hover={{ bg: "#0e572b" }}
                  borderRadius="xl"
                  isLoading={guardandoDespacho}
                  loadingText="Despachando..."
                  onClick={handleRegistrarDespacho}
                >
                  🚛 Confirmar Salida de Camión / Despacho Final
                </Button>
              )}
            </HStack>
          </Flex>
        </CardBody>
      </Card>
    </VStack>
  );
}
