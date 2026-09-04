import {
  Box,
  Text,
  VStack,
  HStack,
  Icon,
  Flex,
  Badge,
} from "@chakra-ui/react";
import { ShoppingBag, FileText, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
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

  const rawVendor = (data.VENDEDOR || "").trim();
  const firstName = (!rawVendor || rawVendor.toLowerCase() === "todos") ? "Equipo" : rawVendor.split(" ")[0];
  const slpCode = Number(data.SLP_CODE || 0);

  const getGradient = (value) => {
    if (value >= 100) return "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)";
    if (value >= 70) return "linear-gradient(90deg, #6366f1 0%, #818cf8 100%)";
    return "linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)";
  };

  const getStatusMessage = (value) => {
    const seed = Math.abs((slpCode * 23 + new Date().getDate() * 7 + Number(cantidadPedidos) * 3) % 100);

    // 🏆 1. Facturación completa de pedidos (>= 100%)
    if (value >= 100) {
      const topPhrases = [
        `🎉 ¡${cantidadPedidos} pedidos 100% facturados, ${firstName}!`,
        `⚡ ¡Despacho al día con ${cantidadPedidos} pedidos!`,
        `✨ ¡Flujo perfecto de pedidos, ${firstName}!`,
        `💎 ¡Eficiencia total en pedidos, ${firstName}!`,
      ];
      return topPhrases[seed % topPhrases.length];
    }

    // 📦 2. Buen ritmo de pedidos (>= 80%)
    if (value >= 80) {
      const goodPhrases = [
        `📦 ¡${cantidadPedidos} pedidos en marcha, ${firstName}!`,
        `🚚 ¡Buen volumen con ${cantidadPedidos} pedidos!`,
        `🚀 ¡Gran actividad con ${cantidadPedidos} pedidos, ${firstName}!`,
        `📈 ¡Cartera dinámica con ${cantidadPedidos} pedidos!`,
      ];
      return goodPhrases[seed % goodPhrases.length];
    }

    // 📝 3. Ritmo medio (50% - 79%)
    if (value >= 50) {
      const midPhrases = [
        `📝 ¡${cantidadPedidos} pedidos activos, ${firstName}!`,
        `💼 ¡${firstName}, convirtiendo cotizaciones!`,
        `📈 ¡${cantidadPedidos} pedidos registrados este mes!`,
        `🏃‍♂️ ¡Avanzando pedidos con fuerza, ${firstName}!`,
      ];
      return midPhrases[seed % midPhrases.length];
    }

    // 🎯 4. Ritmo inicial (< 50%)
    const lowPhrases = [
      `🎯 ¡${firstName}, a levantar más pedidos hoy!`,
      `📞 ¡Momento de llamar a clientes, ${firstName}!`,
      `💡 ¡${cantidadPedidos} pedidos listos, vamos por más!`,
      `🔥 ¡${firstName}, activa tus cotizaciones pendientes!`,
    ];
    return lowPhrases[seed % lowPhrases.length];
  };

  const getStatusBadge = (value) => {
    if (value >= 100) return { bg: "blue.50", color: "blue.700", border: "1px solid rgba(59, 130, 246, 0.25)" };
    if (value >= 70) return { bg: "indigo.50", color: "indigo.700", border: "1px solid rgba(99, 102, 241, 0.25)" };
    return { bg: "purple.50", color: "purple.700", border: "1px solid rgba(139, 92, 246, 0.25)" };
  };

  const badgeStyle = getStatusBadge(pctFactVsPed);

  return (
    <MotionBox
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      bg="white"
      borderRadius="3xl"
      p={{ base: 4, md: 6 }}
      w="full"
      h={{ base: "225px", md: "245px" }}
      minH={{ base: "220px", md: "245px" }}
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
            <Icon as={ShoppingBag} boxSize={5} />
          </Box>
          <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
            Pedidos del Mes
          </Text>
        </HStack>

        <Badge bg="blue.100" color="blue.700" borderRadius="full" px={2.5} py={1} fontSize="xs" fontWeight="bold" display="flex" align="center" gap={1}>
          <Icon as={ArrowUpRight} boxSize={3.5} /> ACTIVO
        </Badge>
      </Flex>

      {/* Valor principal */}
      <VStack align="start" spacing={0} my={1}>
        <Text fontSize={{ base: "xl", sm: "2xl", md: "3xl" }} fontWeight="900" color="gray.800" lineHeight="1" letterSpacing="tight">
          ${pedidosMes}
        </Text>
        <Text fontSize={{ base: "11px", sm: "xs" }} color="gray.400" mt={1} fontWeight="medium">
          Total de pedidos: <Text as="span" color="gray.700" fontWeight="bold">{cantidadPedidos}</Text>
        </Text>
      </VStack>

      {/* Progreso visual con barra personalizada */}
      <Box w="full">
        <Flex justify="space-between" align="center" mb={1.5}>
          <HStack spacing={1}>
            <Icon as={Clock} boxSize={3.5} color="gray.400" />
            <Text fontSize={{ base: "10.5px", sm: "xs" }} color="gray.500" fontWeight="semibold">
              Dif: ${diferencia}
            </Text>
          </HStack>
          <Text fontSize={{ base: "11px", sm: "xs" }} fontWeight="900" color="blue.600">
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
          px={{ base: 2, sm: 3 }}
          py={1}
          fontSize={{ base: "10px", sm: "11px", md: "xs" }}
          fontWeight="bold"
          bg={badgeStyle.bg}
          color={badgeStyle.color}
          border={badgeStyle.border}
          maxW="100%"
          noOfLines={1}
        >
          {getStatusMessage(pctFactVsPed)}
        </Badge>
      </Flex>
    </MotionBox>
  );
}