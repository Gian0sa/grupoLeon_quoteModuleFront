import {
  SimpleGrid,
  Card,
  CardBody,
  Text,
  VStack,
  HStack,
  Badge,
  Divider,
  Box
} from "@chakra-ui/react";

export function SummaryCards({ summary }) {
  const formatCurrency = (amount, currency = 'PEN') => {
    if (amount == null) return '0.00';
    const symbol = currency === 'USD' ? '$' : 'S/';
    return `${symbol} ${Number(amount).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatPercentage = (value) => `${value || 0}%`;

  return (
    <Box mb={3}>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={2} mb={2}>
        {/* Total Clientes */}
        <Card bg="blue.50" borderColor="blue.200" minH="90px">
          <CardBody p={2}>
            <VStack align="flex-start" spacing={0.5}>
              <Text fontSize="xs" color="blue.600">Total Clientes</Text>
              <Text fontSize="md" fontWeight="bold" color="blue.700">
                {summary.totalClientes || 0}
              </Text>
              <Badge colorScheme="blue" fontSize="0.65rem">
                {formatPercentage(summary.porcentajeClientesConVencidos)} con vencidos
              </Badge>
            </VStack>
          </CardBody>
        </Card>

        {/* Total Documentos */}
        <Card bg="purple.50" borderColor="purple.200" minH="90px">
          <CardBody p={2}>
            <VStack align="flex-start" spacing={0.5}>
              <Text fontSize="xs" color="purple.600">Total Documentos</Text>
              <Text fontSize="md" fontWeight="bold" color="purple.700">
                {summary.totalDocumentos || 0}
              </Text>
              <Badge colorScheme="purple" fontSize="0.65rem">
                {formatPercentage(summary.porcentajeDocumentosVencidos)} vencidos
              </Badge>
            </VStack>
          </CardBody>
        </Card>

        {/* Saldo USD */}
        <Card bg="orange.50" borderColor="orange.200" minH="90px">
          <CardBody p={2}>
            <VStack align="flex-start" spacing={0.5}>
              <Text fontSize="xs" color="orange.600">Saldo Total USD</Text>
              <Text fontSize="sm" fontWeight="bold" color="orange.700">
                {formatCurrency(summary.saldoTotalUSD, 'USD')}
              </Text>
              <Text fontSize="xs" color="red.600">
                Vencido: {formatCurrency(summary.saldoVencidoTotalUSD, 'USD')}
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Resumen por estado */}
      <Card bg="gray.50" borderColor="gray.200">
        <CardBody p={2}>
          <Text fontSize="xs" fontWeight="medium" mb={2} color="gray.700">
            Distribución por Estado
          </Text>
          <HStack spacing={3} wrap="wrap">
            <VStack spacing={0}>
              <Text fontSize="sm" fontWeight="bold" color="green.600">
                {summary.resumenCategorias?.sin_vencer?.documentos || 0}
              </Text>
              <Text fontSize="xs" color="gray.600">Sin vencer</Text>
            </VStack>

            <Divider orientation="vertical" h="25px" />

            <VStack spacing={0}>
              <Text fontSize="sm" fontWeight="bold" color="yellow.600">
                {summary.resumenCategorias?.vence_hoy?.documentos || 0}
              </Text>
              <Text fontSize="xs" color="gray.600">Vence hoy</Text>
            </VStack>

            <Divider orientation="vertical" h="25px" />

            <VStack spacing={0}>
              <Text fontSize="sm" fontWeight="bold" color="red.600">
                {summary.resumenCategorias?.ya_vencidos?.documentos || 0}
              </Text>
              <Text fontSize="xs" color="gray.600">Ya vencidos</Text>
            </VStack>
          </HStack>
        </CardBody>
      </Card>
    </Box>
  );
}
