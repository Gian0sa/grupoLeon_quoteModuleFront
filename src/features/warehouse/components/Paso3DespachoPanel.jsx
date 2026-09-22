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
import { MdLocalShipping, MdLock, MdPrint } from 'react-icons/md';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const toast = useToast();

  const fechaFormat = format(new Date(deliveryData.fechaEmision || new Date()), "dd / MM / yy");

  // Armar filas para la tabla de doble columna como el talonario físico oficial
  const totalFilas = Math.max(14, cajas.length > 14 ? Math.ceil(cajas.length / 2) : cajas.length);
  const filasRender = [];
  if (cajas.length <= 14) {
    for (let i = 0; i < totalFilas; i++) {
      filasRender.push({
        izq: cajas[i] || null,
        der: null,
      });
    }
  } else {
    const n = Math.ceil(cajas.length / 2);
    for (let i = 0; i < n; i++) {
      filasRender.push({
        izq: cajas[i] || null,
        der: cajas[i + n] || null,
      });
    }
  }

  const handleDescargarPDF = async () => {
    const el = document.getElementById('hoja-control-despacho-impresion');
    if (!el) return;
    try {
      setDescargandoPdf(true);
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffd8e2',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = (canvas.height * printableWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, margin, printableWidth, Math.min(printableHeight, pageHeight - margin * 2));
      const numDoc = deliveryData.numeroGuiaInterna || deliveryData.docNumEntrega || 'despacho';
      pdf.save(`Control_Despacho_${numDoc}.pdf`);
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
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #hoja-control-despacho-impresion,
          #hoja-control-despacho-impresion * {
            visibility: visible !important;
          }
          #hoja-control-despacho-impresion {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            margin: 0 !important;
            padding: 8mm 12mm !important;
            background-color: #ffd8e2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

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

      {/* 📋 PLANTILLA OFICIAL TALONARIO ROSADO (OCULTA FUERA DE PANTALLA, USADA PARA EXPORTAR EL PDF IDÉNTICO AL FÍSICO) */}
      <Box
        id="hoja-control-despacho-impresion"
        position="fixed"
        left="-9999px"
        top="0"
        w="1050px"
        zIndex="-100"
        bg="#ffd8e2"
        border="2px solid #1b4332"
        borderRadius="none"
        p={6}
        fontFamily="'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      >
        {/* Cabecera Membrete */}
        <Flex justify="space-between" align="center" mb={2}>
          <HStack spacing={2} align="center">
            <Text color="#0e6b38" fontSize="26px" fontWeight="900" letterSpacing="-0.5px">
              ▲ Autopartes s.a.
            </Text>
          </HStack>
          <Box textAlign="center">
            <Text fontSize="19px" color="#113f28" fontWeight="900" letterSpacing="0.8px" textTransform="uppercase">
              CONTROL DE DESPACHO - LIMA
            </Text>
          </Box>
          <Text fontSize="24px" fontWeight="900" color="#113f28" pr={2}>
            A1
          </Text>
        </Flex>

        {/* Fila 1 de Datos */}
        <Flex justify="space-between" align="baseline" fontSize="12px" fontWeight="bold" color="#113f28" mb={1.5}>
          <Flex align="baseline" flex="1" mr={4}>
            <Text whiteSpace="nowrap" mr={1}>GUIA Nº:</Text>
            <Box flex="1" borderBottom="1.5px dotted #113f28" position="relative" minH="20px">
              <Text position="absolute" bottom="1px" left="4px" fontWeight="900" color="#0056b3" fontSize="13px">
                {deliveryData.numeroGuiaInterna || deliveryData.docNumEntrega}
              </Text>
            </Box>
          </Flex>

          <Flex align="baseline" w="220px" mr={4}>
            <Text whiteSpace="nowrap" mr={1}>FECHA:</Text>
            <Box flex="1" borderBottom="1.5px dotted #113f28" position="relative" minH="20px">
              <Text position="absolute" bottom="1px" left="4px" fontWeight="900" color="#222" fontSize="13px">
                {fechaFormat}
              </Text>
            </Box>
          </Flex>

          <Flex align="baseline" w="220px">
            <Text whiteSpace="nowrap" mr={1}>PLACA:</Text>
            <Box flex="1" borderBottom="1.5px dotted #113f28" position="relative" minH="20px">
              <Text position="absolute" bottom="1px" left="4px" fontWeight="900" color="#0056b3" fontSize="13px">
                {vehiculoPlaca || ''}
              </Text>
            </Box>
          </Flex>
        </Flex>

        {/* Fila 2 de Datos */}
        <Flex justify="space-between" align="baseline" fontSize="12px" fontWeight="bold" color="#113f28" mb={1.5}>
          <Flex align="baseline" flex="1" mr={4}>
            <Text whiteSpace="nowrap" mr={1}>FACTURA Nº:</Text>
            <Box flex="1" borderBottom="1.5px dotted #113f28" position="relative" minH="20px">
              <Text position="absolute" bottom="1px" left="4px" fontWeight="900" color="#222" fontSize="13px">
                {codigoFactura || ''}
              </Text>
            </Box>
          </Flex>

          <Flex align="baseline" w="220px" mr={4}>
            <Text whiteSpace="nowrap" mr={1}>B/V Nº:</Text>
            <Box flex="1" borderBottom="1.5px dotted #113f28" position="relative" minH="20px" />
          </Flex>

          <Flex align="baseline" w="220px">
            <Text whiteSpace="nowrap" mr={1}>CONDUCTOR:</Text>
            <Box flex="1" borderBottom="1.5px dotted #113f28" position="relative" minH="20px">
              <Text position="absolute" bottom="1px" left="4px" fontWeight="900" color="#222" fontSize="13px">
                {choferNombre || ''}
              </Text>
            </Box>
          </Flex>
        </Flex>

        {/* Fila 3 de Datos */}
        <Flex justify="space-between" align="baseline" fontSize="12px" fontWeight="bold" color="#113f28" mb={3}>
          <Flex align="baseline" flex="1" mr={4}>
            <Text whiteSpace="nowrap" mr={1}>CLIENTE:</Text>
            <Box flex="1" borderBottom="1.5px dotted #113f28" position="relative" minH="20px">
              <Text position="absolute" bottom="1px" left="4px" fontWeight="900" color="#222" fontSize="13px" noOfLines={1}>
                {deliveryData.clienteNombre}
              </Text>
            </Box>
          </Flex>

          <Flex align="baseline" w="360px">
            <Text whiteSpace="nowrap" mr={1}>AG. TRANSPORTE:</Text>
            <Box flex="1" borderBottom="1.5px dotted #113f28" position="relative" minH="20px">
              <Text position="absolute" bottom="1px" left="4px" fontWeight="900" color="#222" fontSize="13px" noOfLines={1}>
                {deliveryData.transportistaNombre || 'AUTOPARTES S.A.'}
              </Text>
            </Box>
          </Flex>
        </Flex>

        {/* Tabla doble columna idéntica al talonario oficial */}
        <Box border="1.5px solid #1b4332" mb={3} bg="transparent">
          <Table size="xs" variant="unstyled" sx={{ borderCollapse: 'collapse', width: '100%' }}>
            <Thead>
              <Tr borderBottom="1.5px solid #1b4332">
                {/* Columna Izquierda */}
                <Th w="50px" textAlign="center" color="#113f28" fontWeight="900" fontSize="11px" py={1.5} borderRight="1px solid #1b4332">
                  BULTO
                </Th>
                <Th color="#113f28" fontWeight="900" fontSize="11px" py={1.5} borderRight="1.5px solid #1b4332">
                  CONTENIDO
                </Th>
                {/* Columna Derecha */}
                <Th w="50px" textAlign="center" color="#113f28" fontWeight="900" fontSize="11px" py={1.5} borderRight="1px solid #1b4332">
                  BULTO
                </Th>
                <Th color="#113f28" fontWeight="900" fontSize="11px" py={1.5}>
                  CONTENIDO
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {filasRender.map((row, rIdx) => (
                <Tr key={rIdx} borderBottom="1px solid #7ea88f" minH="24px">
                  {/* Celda Bulto Izquierdo */}
                  <Td textAlign="center" fontWeight="bold" color="#113f28" borderRight="1px solid #1b4332" py={1} fontSize="12px">
                    {row.izq ? (row.izq.bultoNumero || rIdx + 1) : ''}
                  </Td>
                  {/* Celda Contenido Izquierdo */}
                  <Td borderRight="1.5px solid #1b4332" py={1} px={2} fontSize="11px">
                    {row.izq && (
                      <Flex justify="space-between" align="center">
                        <Text fontWeight="bold" color="#113f28" noOfLines={1}>
                          {row.izq.items?.map((it) => `${it.codigoArticulo} (${it.cantidad})`).join(' - ') || 'Bulto sin ítems'}
                          {row.izq.pesoKg ? ` [${row.izq.pesoKg} Kg]` : ''}
                        </Text>
                        <Text color="#0e6b38" fontWeight="900" ml={1} fontSize="12px">✔</Text>
                      </Flex>
                    )}
                  </Td>

                  {/* Celda Bulto Derecho */}
                  <Td textAlign="center" fontWeight="bold" color="#113f28" borderRight="1px solid #1b4332" py={1} fontSize="12px">
                    {row.der ? (row.der.bultoNumero || rIdx + 15) : ''}
                  </Td>
                  {/* Celda Contenido Derecho */}
                  <Td py={1} px={2} fontSize="11px">
                    {row.der && (
                      <Flex justify="space-between" align="center">
                        <Text fontWeight="bold" color="#113f28" noOfLines={1}>
                          {row.der.items?.map((it) => `${it.codigoArticulo} (${it.cantidad})`).join(' - ') || 'Bulto sin ítems'}
                          {row.der.pesoKg ? ` [${row.der.pesoKg} Kg]` : ''}
                        </Text>
                        <Text color="#0e6b38" fontWeight="900" ml={1} fontSize="12px">✔</Text>
                      </Flex>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* Pie de Página: Totales a la izquierda y Recuadro Embaladores a la derecha */}
        <Flex justify="space-between" align="flex-end" pt={1}>
          <Box w="60%">
            <Flex align="baseline" mb={2}>
              <Text fontWeight="bold" color="#113f28" fontSize="12px" whiteSpace="nowrap" mr={1}>
                TOTAL Nº BULTOS
              </Text>
              <Box flex="1" borderBottom="1.5px dotted #113f28" position="relative" minH="20px">
                <Text position="absolute" bottom="1px" left="6px" fontWeight="900" color="#113f28" fontSize="14px">
                  {String(cajas.length).padStart(2, '0')}
                </Text>
              </Box>
            </Flex>

            <Flex align="baseline">
              <Text fontWeight="bold" color="#113f28" fontSize="12px" whiteSpace="nowrap" mr={1}>
                KILOS
              </Text>
              <Box flex="1" borderBottom="1.5px dotted #113f28" position="relative" minH="20px">
                <Text position="absolute" bottom="1px" left="6px" fontWeight="900" color="#113f28" fontSize="14px">
                  {pesoKg ? `${pesoKg} Kg` : ''}
                </Text>
              </Box>
            </Flex>
          </Box>

          {/* Recuadro EMBALADORES */}
          <Box
            w="250px"
            border="1.5px solid #1b4332"
            bg="transparent"
            textAlign="center"
          >
            <Box borderBottom="1px solid #1b4332" py={0.5} bg="rgba(0,0,0,0.02)">
              <Text fontSize="11px" fontWeight="900" color="#113f28" letterSpacing="1px">
                EMBALADORES
              </Text>
            </Box>
            <Box h="46px" display="flex" alignItems="center" justifyContent="center" px={2}>
              <Text fontSize="11px" fontWeight="bold" color="#0e6b38" fontStyle="italic">
                {responsablePacking || ''}
              </Text>
            </Box>
          </Box>
        </Flex>
      </Box>

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
