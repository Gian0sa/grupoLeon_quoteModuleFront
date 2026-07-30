import {
  Box,
  Text,
  VStack,
  HStack,
  Icon,
  Flex,
  Badge,
} from "@chakra-ui/react";
import { FileText, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export function SalesStats({ data }) {
  if (!data) return null;

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const pedidosMes = formatCurrency(data.PEDIDOS_MES_USD);
  const diferencia = formatCurrency(Math.abs(data.DIF_FACT_VS_PED_USD || 0));
  const pctFactVsPed = Math.min(100, Math.max(0, Number(data.PCT_FACT_VS_PED || 0)));
  const cantidadPedidos = data.CANT_PEDIDOS || 0;

  const isTopPerformer = pctFactVsPed >= 100;

  const getGradient = (value) => {
    if (value >= 100) return "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)";
    if (value >= 70) return "linear-gradient(90deg, #6366f1 0%, #818cf8 100%)";
    return "linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)";
  };

  const getStatusMessage = (value) => {
    if (value >= 100) return "Facturación completa";
    if (value >= 70) return "Buen ritmo de pedidos";
    return "Avanzando pedidos";
  };

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
      boxShadow="0 12px 35px rgba(0,0,0,0.05)"
      border="1px solid"
      borderColor="gray.100"
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
        bg="blue.50"
        opacity={0.6}
        pointerEvents="none"
      />

      {/* Header */}
      <Flex justify="space-between" align="center">
        <HStack spacing={2}>
          <Box p={2} borderRadius="xl" bg="blue.50" color="blue.600">
            <Icon as={FileText} boxSize={5} />
          </Box>
          <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
            Total Pedido
          </Text>
        </HStack>

        <Badge bg="blue.100" color="blue.700" borderRadius="full" px={2.5} py={1} fontSize="xs" fontWeight="bold" display="flex" align="center" gap={1}>
          <Icon as={ArrowUpRight} boxSize={3.5} /> ACTIVO
        </Badge>
      </Flex>

      {/* Valor principal */}
      <VStack align="start" spacing={0} my={1}>
        <Text fontSize={{ base: "2xl", sm: "3xl" }} fontWeight="900" color="gray.800" lineHeight="1" letterSpacing="tight">
          ${pedidosMes}
        </Text>
        <Text fontSize="xs" color="gray.400" mt={1} fontWeight="medium">
          Total de pedidos: <Text as="span" color="gray.700" fontWeight="bold">{cantidadPedidos}</Text>
        </Text>
      </VStack>

      {/* Progreso visual con barra personalizada */}
      <Box w="full">
        <Flex justify="space-between" align="center" mb={1.5}>
          <HStack spacing={1}>
            <Icon as={Clock} boxSize={3.5} color="gray.400" />
            <Text fontSize="xs" color="gray.500" fontWeight="semibold">
              Dif: ${diferencia}
            </Text>
          </HStack>
          <Text fontSize="xs" fontWeight="900" color="blue.600">
            {parseFloat(data.DIF_FACT_VS_PED_USD || 0) >= 0 ? "+" : ""}
            {pctFactVsPed.toFixed(2)}%
          </Text>
        </Flex>

        {/* Barra de progreso custom con gradiente */}
        <Box w="full" h="8px" bg="gray.100" borderRadius="full" overflow="hidden" position="relative">
          <MotionBox
            initial={{ width: 0 }}
            animate={{ width: `${pctFactVsPed}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            h="100%"
            borderRadius="full"
            background={getGradient(pctFactVsPed)}
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
          bg="indigo.50"
          color="indigo.700"
        >
          {getStatusMessage(pctFactVsPed)}
        </Badge>
      </Flex>
    </MotionBox>
  );
}