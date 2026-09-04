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

  // Valor real para mostrar (puede superar 100%); la barra sí se recorta.
  const progressValue = Math.max(0, Number(data.CUMPLIMIENTO_PCT || 0));
  const barValue = Math.min(100, progressValue);
  const pedidos = formatCurrency(data.AVANCE_MES_USD);
  const cuota = formatCurrency(data.CUOTA_MES_USD);
  const ventasHoy = formatCurrency(data.VENTAS_HOY_USD || 0);
  const ventasHoyNum = Number(data.VENTAS_HOY_USD || 0);
  const rawVendor = (data.VENDEDOR || "").trim();
  const firstName = (!rawVendor || rawVendor.toLowerCase() === "todos") ? "Equipo" : rawVendor.split(" ")[0];
  const cuotaNum = Number(data.CUOTA_MES_USD || 0);
  const avanceNum = Number(data.AVANCE_MES_USD || 0);
  const faltaNum = Math.max(0, cuotaNum - avanceNum);
  const slpCode = Number(data.SLP_CODE || 0);

  const isTopPerformer = progressValue >= 100;

  const getGradient = (value) => {
    if (value >= 100) return "linear-gradient(90deg, #10b981 0%, #34d399 100%)";
    if (value >= 70) return "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)";
    return "linear-gradient(90deg, #ea580c 0%, #f97316 100%)";
  };

  const getStatusMessage = (value) => {
    const seed = Math.abs((slpCode * 17 + new Date().getDate() * 5 + Math.round(value * 3)) % 100);

    // 1. 👑 Si superó la meta del mes (>= 100%)
    if (value >= 100) {
      const topPhrases = [
        `👑 ¡${firstName}, meta superada al ${value.toFixed(1)}%!`,
        `🏆 ¡Imparable ${firstName}! Cuota reventada`,
        `💎 ¡Nivel leyenda ${firstName}! Récord del mes`,
        `🌟 ¡Misión cumplida ${firstName}! A seguir sumando`,
      ];
      return topPhrases[seed % topPhrases.length];
    }

    // 2. 🎯 Si está cerca de la meta (>= 80%)
    if (value >= 80) {
      const formattedFalta = faltaNum.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      const nearPhrases = [
        faltaNum > 0 ? `🎯 ¡${firstName}, solo faltan $${formattedFalta} para coronar!` : `🎯 ¡${firstName}, a un paso del 100%!`,
        `🔥 ¡Al ${value.toFixed(1)}% ${firstName}! Cierre con todo`,
        `🚀 ¡${firstName}, la meta está al alcance!`,
        `💪 ¡${firstName}, último esfuerzo para el 100%!`,
      ];
      return nearPhrases[seed % nearPhrases.length];
    }

    // 3. ⚡ Si vendió hoy y va entre 50% y 79%
    if (ventasHoyNum > 0 && value >= 50) {
      const formattedHoy = ventasHoyNum.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      const salePhrases = [
        `🔥 ¡Sumando hoy +$${formattedHoy}, ${firstName}!`,
        `⚡ ¡Buena venta hoy ${firstName}! Al ${value.toFixed(1)}%`,
        `🎯 ¡Gran cierre hoy ${firstName}! Sigues sumando`,
        `🚀 ¡Facturando hoy +$${formattedHoy}! Vamos ${firstName}`,
      ];
      return salePhrases[seed % salePhrases.length];
    }

    // 4. 📈 Si va a buen ritmo (50% - 79% sin venta hoy)
    if (value >= 50) {
      const midPhrases = [
        `📈 ¡Buen ritmo ${firstName}! Vas al ${value.toFixed(1)}%`,
        `🏃‍♂️ ¡A buen paso ${firstName}, no pares!`,
        `✨ ¡Constancia que rinde frutos, ${firstName}!`,
        `💼 ¡${firstName}, avanzando firme hacia la meta!`,
      ];
      return midPhrases[seed % midPhrases.length];
    }

    // 5. ⚡ Si vendió hoy pero está < 50%
    if (ventasHoyNum > 0) {
      const formattedHoy = ventasHoyNum.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      const earlySalePhrases = [
        `🔥 ¡Buena venta de +$${formattedHoy}, ${firstName}!`,
        `⚡ ¡Arrancando el día con venta, ${firstName}!`,
        `🚀 ¡Sumando hoy +$${formattedHoy}! Con todo`,
        `🎯 ¡Esa es la actitud ${firstName}! A cerrar más`,
      ];
      return earlySalePhrases[seed % earlySalePhrases.length];
    }

    // 6. 🌱 Si está iniciando o con ritmo bajo (< 50% sin venta hoy)
    const lowPhrases = [
      `💪 ¡Con todo ${firstName}! Cada cliente cuenta`,
      `🌱 ¡Hoy es gran día para cerrar ventas, ${firstName}!`,
      `🔥 ¡A buscar esos cierres ${firstName}, tú puedes!`,
      `🚀 ¡Enfoque total ${firstName}! A concretar pedidos`,
    ];
    return lowPhrases[seed % lowPhrases.length];
  };

  const getStatusBadge = (value) => {
    if (ventasHoyNum > 0) return { bg: "emerald.50", color: "emerald.700", border: "1px solid rgba(16, 185, 129, 0.25)" };
    if (value >= 100) return { bg: "emerald.50", color: "emerald.700", border: "1px solid rgba(16, 185, 129, 0.25)" };
    if (value >= 70) return { bg: "amber.50", color: "amber.700", border: "1px solid rgba(245, 158, 11, 0.25)" };
    return { bg: "orange.50", color: "orange.700", border: "1px solid rgba(234, 88, 12, 0.25)" };
  };

  const badgeStyle = getStatusBadge(progressValue);

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
        w="105px"
        h="105px"
        borderRadius="full"
        bg="#fffbf0"
        opacity={0.85}
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
        <Text fontSize={{ base: "xl", sm: "2xl", md: "3xl" }} fontWeight="900" color="gray.800" lineHeight="1" letterSpacing="tight">
          ${pedidos}
        </Text>
        <Text fontSize={{ base: "11px", sm: "xs" }} color="gray.400" mt={1} fontWeight="medium">
          Venta facturada hoy: <Text as="span" color="emerald.600" fontWeight="bold">${ventasHoy}</Text>
        </Text>
      </VStack>

      {/* Progreso visual con barra personalizada */}
      <Box w="full">
        <Flex justify="space-between" align="center" mb={1.5}>
          <HStack spacing={1}>
            <Icon as={Target} boxSize={3.5} color="gray.400" />
            <Text fontSize={{ base: "10.5px", sm: "xs" }} color="gray.500" fontWeight="semibold">
              {Number(data.CUOTA_MES_USD || 0) > 0 ? `Meta: $${cuota}` : "Meta SAP: Sin asignar ($0.00)"}
            </Text>
          </HStack>
          <Text fontSize={{ base: "11px", sm: "xs" }} fontWeight="900" color={progressValue >= 70 ? "emerald.600" : "orange.600"}>
            {progressValue.toFixed(2)}%
          </Text>
        </Flex>

        {/* Barra de progreso custom con gradiente */}
        <Box w="full" h="8px" bg="gray.100" borderRadius="full" overflow="hidden" position="relative">
          <MotionBox
            initial={{ width: 0 }}
            animate={{ width: `${barValue}%` }}
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
          px={{ base: 2, sm: 3 }}
          py={1}
          fontSize={{ base: "10px", sm: "11px", md: "xs" }}
          fontWeight="bold"
          bg={badgeStyle.bg}
          color={badgeStyle.color}
          maxW="100%"
          noOfLines={1}
        >
          {getStatusMessage(progressValue)}
        </Badge>
      </Flex>
    </MotionBox>
  );
}