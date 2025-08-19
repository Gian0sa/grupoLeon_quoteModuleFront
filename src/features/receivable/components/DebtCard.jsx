import {
  Card,
  CardBody,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Box,
  Tooltip,
} from "@chakra-ui/react";
import { FiEye, FiFileText, FiAlertTriangle, FiMapPin } from "react-icons/fi";
import { generateReceivablePDF } from "../utils/receivablePDF";

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
      case 'parcialmente_vencido': return 'blue';
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

  const porcentajeVencido = debt.totalDocumentos > 0 
    ? Math.round((debt.documentosVencidos / debt.totalDocumentos) * 100)
    : 0;

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
      <CardBody p={6}>
        <Flex justify="space-between" align="flex-start" direction="column" spacing={4}>
          
          {/* Encabezado con nombre de la empresa */}
          <Box mb={4}>
            <Text 
              fontSize="xl" 
              fontWeight="bold" 
              color={`${statusColor}.500`}
              mb={2}
            >
              {debt.nombre}
            </Text>
          </Box>

          {/* Información básica */}
          <VStack align="flex-start" spacing={2} w="100%">
            
            <HStack spacing={4} w="100%">
              <Text fontSize="md" color="gray.600" fontWeight="medium">
                RUC / DNI: 
                <Text as="span" color="gray.800" ml={2}>
                  {debt.ruc}
                </Text>
              </Text>
            </HStack>

            <HStack spacing={4} w="100%">
              <Text fontSize="md" color="gray.600" fontWeight="medium">
                Vendedor: 
                <Text as="span" color="gray.800" ml={2}>
                  {debt.vendedor}
                </Text>
              </Text>
            </HStack>

          <Flex alignItems="flex-end">
          <Flex flexDirection="column">   
            <HStack spacing={4} w="100%">
              <Text fontSize="sm" color="gray.600" fontWeight="medium">
                Documentos: 
                <Text as="span" color="gray.800" ml={2}>
                  {debt.totalDocumentos}
                </Text>
              </Text>
            </HStack>

            <HStack spacing={4} w="100%">
              <Text fontSize="sm" color="gray.600" fontWeight="medium">
                Monto pendiente: 
                <Text as="span" color="gray.800" fontWeight="bold" ml={2}>
                  {formatCurrency(debt.saldoPrincipal, debt.monedaPrincipal)}
                </Text>
              </Text>
            </HStack>
            </Flex>
              <Button
                size="md"
                variant="outline"
                colorScheme="gray"
                borderRadius="full"
                fontSize="sm"
                px={6}
                onClick={() => onViewInvoices?.(debt)}
              >
                Ver facturas
              </Button>
            </Flex>

            <Box w="100%" h="1px" bg="gray.500" my={4} />

            <Flex>
          {debt.documentosVencidos == 0 && (
                <VStack align="flex-start" spacing={2} w="100%">
                  <Text 
                  fontSize="sm" 
                  fontWeight="bold" 
                  color={`${statusColor}.500`}
                >
                  0 documentos vencidos
                </Text>
                
                <Text fontSize="sm" color="gray.600" fontWeight="medium">
                  Monto vencido: 
                  <Text as="span" color={`${statusColor}.600`} fontWeight="bold" ml={2}>
                    0
                  </Text>
                </Text>
                  </VStack>)}
            {debt.documentosVencidos > 0 && (
              <VStack align="flex-start" spacing={2} w="100%">
                <Text 
                  fontSize="sm" 
                  fontWeight="bold" 
                  color={`${statusColor}.500`}
                >
                  {debt.documentosVencidos.toString().padStart(2, '0')} documentos vencidos
                </Text>
                
                <Text fontSize="sm" color="gray.600" fontWeight="medium">
                  Monto vencido: 
                  <VStack align="flex-start" spacing={1} ml={2}>
                    {debt.saldoVencidoPEN > 0 && (
                      <Text as="span" color={`${statusColor}.600`} fontWeight="bold">
                        {formatCurrency(debt.saldoVencidoPEN, 'PEN')}
                      </Text>
                    )}
                    {debt.saldoVencidoUSD > 0 && (
                      <Text as="span" color={`${statusColor}.600`} fontWeight="bold">
                        {formatCurrency(debt.saldoVencidoUSD, 'USD')}
                      </Text>
                    )}
                  </VStack>
                </Text>
              </VStack>
            )}

             
           <Button
            size="md"
            colorScheme={statusColor}
            borderRadius="full"
            fontSize="sm"
            px={6}
            onClick={() => {console.log(debt) , generateReceivablePDF(debt)}}
          >
            Ver detalles
          </Button>
            </Flex>

          </VStack>
           
          
        </Flex>
      </CardBody>
    </Card>
  );
}