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
  IconButton,
  Collapse,
  useDisclosure,
  Button,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';

export function GuiaDeliveryHeader({ deliveryData, getBadgeEstado }) {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: false });

  if (!deliveryData) return null;

  return (
    <Card boxShadow="sm" borderRadius="2xl" borderTop="4px solid" borderColor="green.500" bg="white">
      <CardHeader pb={isOpen ? 2 : 4} cursor="pointer" onClick={onToggle} _hover={{ bg: "gray.50" }} transition="background 0.2s" borderRadius="2xl">
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <HStack spacing={3} flexWrap="wrap">
            <Badge colorScheme="green" fontSize="1.05em" px={3.5} py={1.5} borderRadius="lg" fontWeight="bold">
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
            <Text fontSize="xs" color="gray.500" fontWeight="medium" display={{ base: 'none', md: 'block' }}>
              Emisión: <b>{new Date(deliveryData.fechaEmision).toLocaleDateString('es-PE')}</b>
            </Text>
            <Button
              size="xs"
              variant="outline"
              colorScheme="green"
              borderRadius="lg"
              rightIcon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {isOpen ? 'Ocultar' : 'Ver Cliente'}
            </Button>
          </HStack>
        </Flex>
      </CardHeader>

      <Collapse in={isOpen} animateOpacity>
        <CardBody pt={1}>
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
      </Collapse>
    </Card>
  );
}
