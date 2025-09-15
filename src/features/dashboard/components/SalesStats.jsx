import {
  Box,
  Text,
  useColorModeValue,
  VStack,
  HStack,
  Icon,
  Flex,
  Circle,
  Progress,
} from "@chakra-ui/react";
import { FiFileText } from "react-icons/fi";

export function SalesStats({ data }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.600", "gray.300");
  const accentColor = useColorModeValue("purple.500", "purple.300");

  if (!data) return null;

  // 👉 Formateador de moneda con 2 decimales
  const formatCurrency = (value) =>
    Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const pedidosMes = formatCurrency(data.PEDIDOS_MES_USD);
  const diferencia = formatCurrency(Math.abs(data.DIF_FACT_VS_PED_USD));
  const pctFactVsPed = data.PCT_FACT_VS_PED;
  const cantidadPedidos = data.CANT_PEDIDOS;

  return (
    <Box
      bg={cardBg}
      p={1}
      w="full"
      display="flex"
      flexDirection="column"
      justifyContent="space-evenly"
      alignItems="center"
      position="relative"
    >
      <VStack spacing={1} mb={6}>
        <HStack spacing={1} opacity={0.8}>
          <Icon as={FiFileText} boxSize={4} color={textColor} />
          <Text fontSize="sm" color={textColor} fontWeight="medium">
            Total de Pedido
          </Text>
        </HStack>
      </VStack>

      {/* Valor principal */}
      <VStack spacing={1} mb={6}>
        <Text fontSize="2xl" fontWeight="900" color={accentColor} lineHeight="1">
          ${pedidosMes}
        </Text>
        <Text fontSize="sm" color={textColor}>
          Pedidos: {cantidadPedidos}
        </Text>
      </VStack>

      {/* Progreso visual */}
      <Box mb={4}>
        <HStack flexDirection="column" justify="space-between" mb={2}>
          <Text fontSize="sm" color={textColor}>
            Pendiente: $ {diferencia}
          </Text>
          <Text
            fontSize="sm"
            fontWeight="bold"
            color={
              parseFloat(data.DIF_FACT_VS_PED_USD) >= 0
                ? "green.400"
                : "blue.500"
            }
          >
            {parseFloat(data.DIF_FACT_VS_PED_USD) >= 0 ? "+" : ""}
            {pctFactVsPed} %
          </Text>
        </HStack>

        <Progress
          value={pctFactVsPed}
          colorScheme={
            pctFactVsPed >= 100 ? "green" : pctFactVsPed >= 70 ? "yellow" : "red"
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
              pctFactVsPed >= 100
                ? "green.400"
                : pctFactVsPed >= 70
                ? "yellow.400"
                : "red.400"
            }
          />
          <Text fontSize="xs" color={textColor} fontWeight="medium">
            {pctFactVsPed >= 100
              ? "Facturación completa"
              : pctFactVsPed >= 70
              ? "Facturación aceptable"
              : "Facturación baja"}
          </Text>
        </HStack>
      </Flex>
    </Box>
  );
}
