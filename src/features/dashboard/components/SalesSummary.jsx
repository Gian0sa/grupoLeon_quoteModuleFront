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
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.600", "gray.300");
  const accentColor = useColorModeValue("teal.500", "teal.300");

  if (!data) return null;

  // 👉 Formateador de moneda con 2 decimales
  const formatCurrency = (value) =>
    Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const progressValue = data.CUMPLIMIENTO_PCT;
  const pedidos = formatCurrency(data.AVANCE_MES_USD);
  const cuota = formatCurrency(data.CUOTA_MES_USD);

  return (
    <Box
      bg={cardBg}
      p={1}
      w="full"
      display="flex"
      h="220px"
      flexDirection="column"
      justifyContent="space-evenly"
      alignItems="center"
      position="relative"
    >
      {/* Header */}
      <VStack spacing={1} mb={6}>
        <HStack spacing={1} opacity={0.8}>
          <Icon as={FiTrendingUp} boxSize={4} color={textColor} />
          <Text fontSize="sm" color={textColor} fontWeight="medium">
            Total Facturado
          </Text>
        </HStack>
      </VStack>

      {/* Valor principal */}
      <VStack spacing={1} mb={6}>
        <Text fontSize="2xl" fontWeight="900" color={accentColor} lineHeight="1">
          ${pedidos}
        </Text>
      </VStack>

      {/* Progreso visual */}
      <Box mb={4}>
        <HStack justify="space-between" flexDirection="column" mb={2}>
          <Text fontSize="sm" color={textColor}>
            Meta: ${cuota}
          </Text>
          <Text fontSize="sm" fontWeight="bold" color={accentColor}>
            {progressValue}%
          </Text>
        </HStack>

        <Progress
          value={progressValue}
          colorScheme={
            progressValue >= 100 ? "green" : progressValue >= 70 ? "yellow" : "red"
          }
          borderRadius="full"
          h="8px"
          bg={useColorModeValue("gray.100", "gray.700")}
        />
      </Box>

      {/* Estado */}
      <Flex justify="center">
        <HStack spacing={2}>
          <Circle
            size="8px"
            bg={
              progressValue >= 100
                ? "green.400"
                : progressValue >= 70
                ? "yellow.400"
                : "red.400"
            }
          />
          <Text fontSize="xs" color={textColor} fontWeight="medium">
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
