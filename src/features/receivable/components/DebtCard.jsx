import {
  Card,
  CardBody,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  Box,
} from "@chakra-ui/react";
import { generateReceivablePDF } from "../utils/receivablePDF";

export function DebtCard({ debt, onViewInvoices }) {
  const formatCurrency = (amount, currency = "PEN") => {
    if (amount == null || amount === 0)
      return currency === "USD" ? "$0.00" : "S/0.00";
    const symbol = currency === "USD" ? "$" : "S/";
    return `${symbol}${Number(amount).toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case "vencido":
        return "red";
      case "parcialmente_vencido":
        return "red";
      case "al_dia":
        return "green";
      default:
        return "gray";
    }
  };

  const statusColor = getStatusColor(debt.estado);

  return (
    <Card
      bg="white"
      borderLeft="4px solid"
      borderLeftColor={`${statusColor}.400`}
      shadow="sm"
      _hover={{ shadow: "md", transform: "translateY(-1px)" }}
      transition="all 0.2s"
      mb={5}
    >
      <CardBody p={4}>
        <Flex direction="column" gap={3}>
          {/* Nombre del cliente */}
          <Text fontSize="lg" fontWeight="bold" color={`${statusColor}.600`}>
            {debt.nombre}
          </Text>

          {/* Información básica */}
          <VStack align="flex-start" spacing={1} w="100%">
            <Text fontSize="sm" color="gray.600" fontWeight="medium">
              RUC / DNI:
              <Text as="span" color="gray.800" ml={2} fontWeight="normal">
                {debt.ruc}
              </Text>
            </Text>

            <Text fontSize="sm" color="gray.600" fontWeight="medium">
              Vendedor:
              <Text as="span" color="gray.800" ml={2} fontWeight="normal">
                {debt.vendedor}
              </Text>
            </Text>
          </VStack>

          {/* Documentos + monto pendiente */}
          <Flex justify="space-between" align="flex-end" w="100%">
            <VStack align="flex-start" spacing={1}>
              <Text fontSize="sm" color="gray.600" fontWeight="medium">
                Documentos:
                <Text as="span" color="gray.800" ml={2} fontWeight="normal">
                  {debt.totalDocumentos}
                </Text>
              </Text>

              <Text fontSize="sm" color="gray.600" fontWeight="medium">
                Monto pendiente:
                <Text
                  as="span"
                  color="gray.800"
                  fontWeight="semibold"
                  ml={2}
                  fontSize="md"
                >
                  {formatCurrency(debt.saldoPrincipal, debt.monedaPrincipal)}
                </Text>
              </Text>
            </VStack>

            <Button
              size="sm"
              variant="outline"
              colorScheme="gray"
              borderRadius="full"
              fontSize="sm"
              px={4}
              onClick={() => onViewInvoices?.(debt)}
            >
              Ver facturas
            </Button>
          </Flex>

          <Box w="100%" h="1px" bg="gray.200" />

          {/* Estado de vencimiento */}
          <Flex justify="space-between" align="flex-start" w="100%">
            {debt.documentosVencidos === 0 ? (
              <VStack align="flex-start" spacing={1}>
                <Text fontSize="sm" fontWeight="bold" color={`${statusColor}.500`}>
                  0 documentos vencidos
                </Text>
                <Text fontSize="sm" color="gray.600" fontWeight="medium">
                  Monto vencido:
                  <Text
                    as="span"
                    color={`${statusColor}.600`}
                    fontWeight="semibold"
                    ml={2}
                  >
                    0
                  </Text>
                </Text>
              </VStack>
            ) : (
              <VStack align="flex-start" spacing={1}>
                <Text fontSize="sm" fontWeight="bold" color={`${statusColor}.500`}>
                  {debt.documentosVencidos.toString().padStart(2, "0")}{" "}
                  documentos vencidos
                </Text>
                <VStack align="flex-start" spacing={1}>
                  {debt.saldoVencidoPEN > 0 && (
                    <Text
                      as="span"
                      fontSize="sm"
                      color={`${statusColor}.600`}
                      fontWeight="semibold"
                    >
                      {formatCurrency(debt.saldoVencidoPEN, "PEN")}
                    </Text>
                  )}
                  {debt.saldoVencidoUSD > 0 && (
                    <Text
                      as="span"
                      fontSize="sm"
                      color={`${statusColor}.600`}
                      fontWeight="semibold"
                    >
                      {formatCurrency(debt.saldoVencidoUSD, "USD")}
                    </Text>
                  )}
                </VStack>
              </VStack>
            )}

            <Button
              size="sm"
              colorScheme={statusColor}
              borderRadius="full"
              fontSize="sm"
              px={4}
              onClick={() => generateReceivablePDF(debt)}
            >
              Ver detalles
            </Button>
          </Flex>
        </Flex>
      </CardBody>
    </Card>
  );
}
