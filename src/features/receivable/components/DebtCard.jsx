import {
  Card,
  CardBody,
  Flex,
  VStack,
  Text,
  Button,
  Box,
} from "@chakra-ui/react";
import { generateReceivablePDF } from "../utils/receivablePDF";

export function DebtCard({ debt, onViewInvoices }) {
  // Soporte para ambas monedas separadas (saldoPEN/saldoUSD) y el modo legado (saldoPrincipal)
  const saldoPEN = debt.saldoPEN ?? (debt.monedaPrincipal === "PEN" ? debt.saldoPrincipal : 0) ?? 0;
  const saldoUSD = debt.saldoUSD ?? (debt.monedaPrincipal === "USD" ? debt.saldoPrincipal : 0) ?? 0;

  const formatAmount = (amount, currency) => {
    if (amount == null || isNaN(Number(amount))) return null;
    const num = Number(amount);
    const symbol = currency === "USD" ? "$" : "S/";
    return `${symbol}${Math.abs(num).toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case "vencido":
      case "parcialmente_vencido":
        return "red";
      case "al_dia":
        return "green";
      default:
        return "gray";
    }
  };

  const statusColor =
    debt.tipoDocumento === "Nota de Crédito"
      ? "blue"
      : getStatusColor(debt.estado);

  // 🔹 Si el monto es negativo o es Nota de Crédito → azul
  const getAmountColor = (amount) => {
    if (amount < 0 || debt.tipoDocumento === "Nota de Crédito") return "blue.600";
    return `${statusColor}.600`;
  };

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
          <Text textStyle="cardTitle" color={`${statusColor}.600`}>
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

              <Text
                fontSize="sm"
                color={statusColor === "blue" || saldoPEN < 0 || saldoUSD < 0 ? "blue.600" : "gray.600"}
                fontWeight="semibold"
                mb={0.5}
              >
                {statusColor === "blue" || saldoPEN < 0 || saldoUSD < 0
                  ? "Saldo a favor disponible:"
                  : "Monto pendiente:"}
              </Text>
              {/* Mostrar AMBAS monedas si el cliente tiene saldo en PEN y USD */}
              {saldoPEN !== 0 && (
                <Text
                  fontSize="md"
                  fontWeight="semibold"
                  color={getAmountColor(saldoPEN)}
                  lineHeight="short"
                >
                  {formatAmount(saldoPEN, "PEN")}
                </Text>
              )}
              {saldoUSD !== 0 && (
                <Text
                  fontSize="md"
                  fontWeight="semibold"
                  color={getAmountColor(saldoUSD)}
                  lineHeight="short"
                >
                  {formatAmount(saldoUSD, "USD")}
                </Text>
              )}
              {saldoPEN === 0 && saldoUSD === 0 && (
                <Text fontSize="md" fontWeight="semibold" color="gray.400">S/0.00</Text>
              )}
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
                <Text fontSize="sm" fontWeight="bold" color={`${statusColor}.600`}>
                  {statusColor === "blue"
                    ? "Saldo a Favor / Nota de Crédito"
                    : `${debt.documentosVencidos.toString().padStart(2, "0")} documentos vencidos`}
                </Text>
                <VStack align="flex-start" spacing={1}>
                  {debt.saldoVencidoPEN !== 0 && (
                    <Text
                      as="span"
                      fontSize="sm"
                      color={getAmountColor(debt.saldoVencidoPEN)}
                      fontWeight="semibold"
                    >
                      {formatAmount(debt.saldoVencidoPEN, "PEN")}
                    </Text>
                  )}
                  {debt.saldoVencidoUSD !== 0 && (
                    <Text
                      as="span"
                      fontSize="sm"
                      color={getAmountColor(debt.saldoVencidoUSD)}
                      fontWeight="semibold"
                    >
                      {formatAmount(debt.saldoVencidoUSD, "USD")}
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
              onClick={() => {console.log(debt),generateReceivablePDF(debt)}}
            >
              Ver detalles
            </Button>
          </Flex>
        </Flex>
      </CardBody>
    </Card>
  );
}
