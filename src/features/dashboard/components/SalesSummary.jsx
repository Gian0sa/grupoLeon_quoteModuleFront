import {
  Box,
  Text,
  VStack,
  HStack,
  Icon,
  Flex,
  Badge,
} from "@chakra-ui/react";
import { TrendingUp, Target, Award, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export function SalesSummary({ data }) {
  if (!data) return null;

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const progressValue = Math.min(100, Math.max(0, Number(data.CUMPLIMIENTO_PCT || 0)));
  const pedidos = formatCurrency(data.AVANCE_MES_USD);
  const cuota = formatCurrency(data.CUOTA_MES_USD);
  const cantidadPedidos = data.CANT_PEDIDOS || 0;

  const isTopPerformer = progressValue >= 100;

  const getGradient = (value) => {
    if (value >= 100) return "linear-gradient(90deg, #10b981 0%, #34d399 100%)";
    if (value >= 70) return "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)";
    return "linear-gradient(90deg, #ea580c 0%, #f97316 100%)";
  };

  const getStatusMessage = (value) => {
    if (value >= 100) return "¡Meta Superada!";
    if (value >= 70) return "¡Casi lo logras!";
    if (value >= 40) return "En camino";
    return "¡A por ello!";
  };

  const getStatusBadge = (value) => {
    if (value >= 100) return { bg: "emerald.100", color: "emerald.700" };
    if (value >= 70) return { bg: "amber.100", color: "amber.700" };
    return { bg: "orange.100", color: "orange.700" };
  };

  const badgeStyle = getStatusBadge(progressValue);

  return (
    <MotionBox
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      bg="white"
      borderRadius="3xl"
      p={6}
      w="full"
      h="240px"
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      position="relative"
      boxShadow={isTopPerformer 
        ? "0 12px 35px rgba(16, 185, 129, 0.18)" 
        : "0 12px 35px rgba(0,0,0,0.05)"
      }
      border="1px solid"
      borderColor={isTopPerformer ? "emerald.300" : "gray.100"}
      overflow="hidden"
    >
      {/* Elemento decorativo flotante */}
      <Box
        position="absolute"
        top="-20px"
        right="-20px"
        w="100px"
        h="100px"
        borderRadius="full"
        bg={progressValue >= 70 ? "emerald.50" : "orange.50"}
        opacity={0.6}
        pointerEvents="none"
      />

      {/* Header */}
      <Flex justify="space-between" align="center">
        <HStack spacing={2}>
          <Box p={2} borderRadius="xl" bg="emerald.50" color="emerald.600">
            <Icon as={TrendingUp} boxSize={5} />
          </Box>
          <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
            Total Facturado
          </Text>
        </HStack>

        {isTopPerformer && (
          <Badge bg="yellow.100" color="yellow.800" borderRadius="full" px={2.5} py={1} fontSize="xs" fontWeight="bold" display="flex" align="center" gap={1}>
            <Icon as={Sparkles} boxSize={3.5} /> TOP
          </Badge>
        )}
      </Flex>

      {/* Valor principal */}
      <VStack align="start" spacing={0} my={1}>
        <Text fontSize={{ base: "2xl", sm: "3xl" }} fontWeight="900" color="gray.800" lineHeight="1" letterSpacing="tight">
          ${pedidos}
        </Text>
        <Text fontSize="xs" color="gray.400" mt={1} fontWeight="medium">
          Facturas realizadas: <Text as="span" color="gray.700" fontWeight="bold">{cantidadPedidos}</Text>
        </Text>
      </VStack>

      {/* Progreso visual con barra personalizada */}
      <Box w="full">
        <Flex justify="space-between" align="center" mb={1.5}>
          <HStack spacing={1}>
            <Icon as={Target} boxSize={3.5} color="gray.400" />
            <Text fontSize="xs" color="gray.500" fontWeight="semibold">
              {Number(data.CUOTA_MES_USD || 0) > 0 ? `Meta: $${cuota}` : "Meta SAP: Sin asignar ($0.00)"}
            </Text>
          </HStack>
          <Text fontSize="xs" fontWeight="900" color={progressValue >= 70 ? "emerald.600" : "orange.600"}>
            {progressValue.toFixed(2)}%
          </Text>
        </Flex>

        {/* Barra de progreso custom con gradiente */}
        <Box w="full" h="8px" bg="gray.100" borderRadius="full" overflow="hidden" position="relative">
          <MotionBox
            initial={{ width: 0 }}
            animate={{ width: `${progressValue}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            h="100%"
            borderRadius="full"
            background={getGradient(progressValue)}
          />
        </Box>
      </Box>

      {/* Estado motivacional */}
      <Flex justify="space-between" align="center" pt={1}>
        <Badge
          borderRadius="full"
          px={3}
          py={1}
          fontSize="xs"
          fontWeight="bold"
          bg={badgeStyle.bg}
          color={badgeStyle.color}
        >
          {getStatusMessage(progressValue)}
        </Badge>
      </Flex>
    </MotionBox>
  );
}