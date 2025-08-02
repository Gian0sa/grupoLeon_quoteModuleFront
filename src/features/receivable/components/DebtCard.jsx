import {
  Card,
  CardBody,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Badge,
  Box,
  Tooltip,
  CircularProgress,
  CircularProgressLabel
} from "@chakra-ui/react";
import { FiEye, FiFileText, FiAlertTriangle, FiMapPin, FiUser } from "react-icons/fi";

export function DebtCard({ debt, onViewInvoices, onViewDetails }) {
  const formatCurrency = (amount, currency = 'PEN') => {
    if (amount == null || amount === 0) return currency === 'USD' ? '$0.00' : 'S/0.00';
    const symbol = currency === 'USD' ? '$' : 'S/';
    return `${symbol}${Number(amount).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'vencido': return 'red';
      case 'parcialmente_vencido': return 'yellow';
      case 'al_dia': return 'green';
      default: return 'gray';
    }
  };

  const getStatusText = (estado) => {
    switch (estado) {
      case 'vencido': return 'Totalmente Vencido';
      case 'parcialmente_vencido': return 'Parcialmente Vencido';
      case 'al_dia': return 'Al Día';
      default: return 'Sin Estado';
    }
  };

  // Calcular porcentaje de documentos vencidos
  const porcentajeVencido = debt.totalDocumentos > 0 
    ? Math.round((debt.documentosVencidos / debt.totalDocumentos) * 100)
    : 0;

  // Determinar el color del progreso basado en el porcentaje
  const getProgressColor = () => {
    if (porcentajeVencido === 0) return 'green';
    if (porcentajeVencido <= 30) return 'yellow';
    return 'red';
  };

  const statusColor = getStatusColor(debt.estado);

  return (
    <Card
      bg="white"
      borderLeft="4px solid"
      borderLeftColor={`${statusColor}.400`}
      shadow="sm"
      _hover={{
        shadow: 'md',
        transform: 'translateY(-1px)'
      }}
      transition="all 0.2s"
      mb={4}
    >
      <CardBody p={4}>
        <Flex justify="space-between" align="flex-start">

          <VStack align="flex-start" spacing={3} flex="1">

            <HStack spacing={2}>
                <Icon as={FiMapPin} color="gray.500" size="14px" />
                <Text fontSize="sm" color={statusColor} fontWeight="semibold" noOfLines={2}>
                  {debt.nombre}
                </Text>
              </HStack>
            

            <VStack align="flex-start" spacing={1}>
              <HStack spacing={2}>
                <Text colorScheme="green" fontSize="xs" fontWeight="bold">
                    RUC/DNI: {debt.ruc}
                </Text>
                </HStack>

              <HStack spacing={2}>
                <Text fontSize="xs" color="gray.500">
                  Vendedor: {debt.vendedor}
                </Text>
              </HStack>
            </VStack>
              {debt.documentosVencidos > 0 && (
                <Text color="red.500">
                  <Icon as={FiAlertTriangle} mr={1} />
                  {debt.documentosVencidos} documentos vencidos
                </Text>
                )}

            {/* Fecha o información adicional */}
            <HStack spacing={2}>
              
              <Text fontSize="xs" color="gray.500">
                Monto Pendiente: {formatCurrency(debt.saldoPrincipal, debt.monedaPrincipal)}
              </Text>
            </HStack>

            {/* Saldos vencidos si existen */}
            {(debt.saldoVencidoPEN > 0 || debt.saldoVencidoUSD > 0) && (
              <Box>
                <Text fontSize="xs" color="red.600" fontWeight="medium">
                  Vencido: 
                  {debt.saldoVencidoPEN > 0 && ` ${formatCurrency(debt.saldoVencidoPEN, 'PEN')}`}
                  {debt.saldoVencidoUSD > 0 && ` ${formatCurrency(debt.saldoVencidoUSD, 'USD')}`}
                </Text>
              </Box>
            )}

          </VStack>

          {/* Sección derecha - Progreso y acciones */}
          <VStack spacing={3} align="center" minW="120px">

            <Tooltip label="Ver detalles">
              <Button
                size="xs"
                border="none"
                fontSize="2xs"
                px={4}
                onClick={() => onViewDetails?.(debt)}
              >
                Visualizar facturas 
              </Button>
            </Tooltip>
            

            {/* Botón de acción principal */}
            <Tooltip label="Ver detalles">
              <Button
                size="sm"
                colorScheme={statusColor}
                borderRadius="full"
                fontSize="xs"
                px={4}
                onClick={() => onViewDetails?.(debt)}
              >
                Ver detalles
              </Button>
            </Tooltip>

            {/* Información de documentos */}
            <VStack spacing={0} fontSize="xs" color="gray.500">
              <Text>
                <Icon as={FiFileText} mr={1} />
                {debt.totalDocumentos} docs
              </Text>
            </VStack>
          </VStack>
        </Flex>
      </CardBody>
    </Card>
  );
}