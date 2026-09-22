import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Badge,
  HStack,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';

export function GuiaDeliveryHeader({ deliveryData, getBadgeEstado }) {
  if (!deliveryData) return null;

  return (
    <Card boxShadow="sm" borderRadius="2xl" borderTop="4px solid" borderColor="green.500" bg="white">
      <CardHeader pb={2}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <HStack spacing={3}>
            <Badge colorScheme="green" fontSize="1.1em" px={3.5} py={1.5} borderRadius="lg" fontWeight="bold">
              Guía N° {deliveryData.numeroGuiaInterna}
            </Badge>
            <Badge colorScheme="blue" fontSize="0.95em" px={3} py={1} borderRadius="lg">
              Pedido SAP #{deliveryData.codigoPedido || 'Sin pedido'}
            </Badge>
            <Badge colorScheme="purple" fontSize="0.95em" px={3} py={1} borderRadius="lg">
              DocNum: {deliveryData.docNumEntrega}
            </Badge>
          </HStack>
          <HStack spacing={3}>
            {getBadgeEstado(deliveryData.estado)}
            <Text fontSize="sm" color="gray.500" fontWeight="medium">
              Emisión: <b>{new Date(deliveryData.fechaEmision).toLocaleDateString('es-PE')}</b>
            </Text>
          </HStack>
        </Flex>
      </CardHeader>
      <CardBody pt={2}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Box bg="gray.50" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
            <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" mb={1}>
              Cliente & Destino de Facturación
            </Text>
            <Text fontWeight="bold" fontSize="md" color="gray.800">
              {deliveryData.clienteNombre}
            </Text>
            <Text fontSize="sm" color="gray.600">
              RUC / DNI: <b>{deliveryData.clienteRuc || deliveryData.idClienteSap}</b>
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Dirección: {deliveryData.destinoFactura}
            </Text>
          </Box>

          <Box bg="gray.50" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
            <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" mb={1}>
              Transportista Designado & Punto de Entrega
            </Text>
            <Text fontWeight="bold" fontSize="sm" color="gray.800">
              {deliveryData.transportistaNombre || 'SIN TRANSPORTISTA (REPARTO PROPIO / CLIENTE)'}
            </Text>
            <Text fontSize="xs" color="gray.600">
              {deliveryData.transportistaRuc ? `RUC: ${deliveryData.transportistaRuc} | ` : ''}Modalidad: {deliveryData.modalidadTransporte || 'No especificada'}
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Llegada: {deliveryData.destinoMercaderia || '-'}
            </Text>
          </Box>
        </SimpleGrid>

        {deliveryData.observacionAlmacen && !deliveryData.observacionAlmacen.trim().startsWith('{') && (
          <Alert status={deliveryData.estado === 'OBSERVADA' ? 'warning' : 'info'} borderRadius="xl" mt={4}>
            <AlertIcon />
            <Box>
              <AlertTitle fontSize="sm" fontWeight="bold">
                Opinión / Explicación Registrada en Almacén:
              </AlertTitle>
              <AlertDescription fontSize="sm" color="gray.800">
                "{deliveryData.observacionAlmacen}"
              </AlertDescription>
            </Box>
          </Alert>
        )}
      </CardBody>
    </Card>
  );
}
