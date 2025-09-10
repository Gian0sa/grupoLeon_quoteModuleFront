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
import { FiTarget, FiTrendingUp } from "react-icons/fi";

export function SalesSummary({ data }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.600", "gray.300");
  const accentColor = useColorModeValue("teal.500", "teal.300");

  if (!data) return null;

  const progressValue = data.CUMPLIMIENTO_PCT;
  const pedidos = data.AVANCE_MES_USD.toLocaleString();
  const cuota = data.CUOTA_MES_USD.toLocaleString();

  return (
    <Box
      bg={cardBg}
      p={1}
      borderRadius="2xl"
      shadow="xl"
      position="relative"
      overflow="hidden"
      w="full"
    >
      {/* Fondo decorativo */}
      <Box
        position="absolute"
        top="-20px"
        right="-20px"
        w="80px"
        h="80px"
        bg={accentColor}
        opacity={0.1}
        borderRadius="full"
      />

      {/* Valor principal */}
      <VStack spacing={1} mb={6}>
        <Text fontSize="3xl" fontWeight="900" color={accentColor} lineHeight="1">
          ${pedidos}
        </Text>
        <HStack spacing={1} opacity={0.8}>
          <Icon as={FiTrendingUp} boxSize={4} color={textColor} />
          <Text fontSize="sm" color={textColor} fontWeight="medium">
            Pedidos actuales
          </Text>
        </HStack>
      </VStack>

      {/* Progreso visual */}
      <Box mb={4}>
        <HStack justify="space-between" mb={2}>
          <HStack spacing={1}>
            <Icon as={FiTarget} boxSize={4} color={textColor} />
            <Text fontSize="sm" color={textColor}>
              Meta: ${cuota}
            </Text>
          </HStack>
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
