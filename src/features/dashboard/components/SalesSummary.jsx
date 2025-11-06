// SalesSummary.jsx
import {
  Box,
  Text,
  useColorModeValue,
  Progress,
  VStack,
  HStack,
  Icon,
  Circle,
  Flex,
} from "@chakra-ui/react";
import { FiTrendingUp } from "react-icons/fi";

export function SalesSummary({ data }) {
  console.log("SalesSummary data:", data);
  
  if (!data) return null;

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const progressValue = Number(data.CUMPLIMIENTO_PCT || 0);
  const pedidos = formatCurrency(data.AVANCE_MES_USD);
  const cuota = formatCurrency(data.CUOTA_MES_USD);
  const cantidadPedidos = data.CANT_PEDIDOS || 0; // ✅ Campo correcto

  return (
    <Box
      bg="card"
      borderRadius="xl"
      p={6} // ✅ Cambiado de 1 a 6
      w="full"
      display="flex"
      flexDirection="column"
      justifyContent="space-evenly"
      alignItems="center"
      position="relative"
    >
      {/* Header */}
      <VStack spacing={1} mb={4}>
        <HStack spacing={2} opacity={0.8}>
          <Icon as={FiTrendingUp} boxSize={5} color="subtitle" />
          <Text fontSize="sm" color="subtitle" fontWeight="medium">
            Total Facturado
          </Text>
        </HStack>
      </VStack>

      {/* Valor principal */}
      <VStack spacing={1} mb={4}>
        <Text fontSize="3xl" fontWeight="900" color="accentTeal" lineHeight="1">
          ${pedidos}
        </Text>
        <Text fontSize="sm" color="text" mt={2}>
          Facturas: {cantidadPedidos}
        </Text>
      </VStack>

      {/* Progreso visual */}
      <Box mb={4} w="full">
        <HStack justify="space-between" mb={2}>
          <Text fontSize="sm" color="text">
            Meta: ${cuota}
          </Text>
          <Text fontSize="sm" fontWeight="bold" color="accentTeal">
            {progressValue.toFixed(2)}%
          </Text>
        </HStack>

        <Progress
          value={progressValue}
          colorScheme={
            progressValue >= 100 ? "green" : progressValue >= 70 ? "yellow" : "red"
          }
          borderRadius="full"
          h="8px"
          bg="progressBg"
        />
      </Box>

      {/* Estado */}
      <Flex justify="center">
        <HStack spacing={2}>
          <Circle
            size="8px"
            bg={
              progressValue >= 100
                ? "success"
                : progressValue >= 70
                ? "warning"
                : "error"
            }
          />
          <Text fontSize="xs" color="subtitle" fontWeight="medium">
            {progressValue >= 100
              ? "¡Meta alcanzada!"
              : progressValue >= 70
              ? "Buen progreso"
              : "Necesita impulso"}
          </Text>
        </HStack>
      </Flex>
    </Box>
  );
}