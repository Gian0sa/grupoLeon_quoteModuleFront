import {
  Box,
  Text,
  VStack,
  HStack,
  Icon,
  Flex,
  Badge,
} from "@chakra-ui/react";
import { Zap, Activity, CheckCircle2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export function QuickInsightCard({ data }) {
  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const porcentajeAvance = data?.CUMPLIMIENTO_PCT ? Number(data.CUMPLIMIENTO_PCT).toFixed(1) : "0.0";
  const pedidosCount = data?.CANT_PEDIDOS || 0;

  return (
    <MotionBox
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      bg="linear-gradient(135deg, #18181b 0%, #27272a 100%)"
      color="white"
      borderRadius="3xl"
      p={6}
      w="full"
      h="240px"
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      position="relative"
      boxShadow="0 12px 35px rgba(0,0,0,0.2)"
      overflow="hidden"
    >
      {/* Glow decorativo de fondo */}
      <Box
        position="absolute"
        top="-30px"
        right="-30px"
        w="120px"
        h="120px"
        borderRadius="full"
        bg="emerald.500"
        opacity={0.15}
        filter="blur(20px)"
        pointerEvents="none"
      />

      {/* Header */}
      <Flex justify="space-between" align="center">
        <HStack spacing={2}>
          <Box p={2} borderRadius="xl" bg="whiteAlpha.200" color="emerald.400">
            <Icon as={Zap} boxSize={5} />
          </Box>
          <Text fontSize="xs" color="gray.300" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
            Rendimiento General
          </Text>
        </HStack>

        <Badge bg="emerald.500" color="white" borderRadius="full" px={2.5} py={1} fontSize="xs" fontWeight="bold">
          LIVE
        </Badge>
      </Flex>

      {/* Métricas destacadas */}
      <VStack align="start" spacing={1} my={1}>
        <HStack spacing={2} align="baseline">
          <Text fontSize={{ base: "3xl", sm: "4xl" }} fontWeight="900" color="emerald.400" lineHeight="1" letterSpacing="tight">
            {porcentajeAvance}%
          </Text>
          <Text fontSize="xs" color="gray.400" fontWeight="semibold">
            cumplimiento
          </Text>
        </HStack>
        <Text fontSize="xs" color="gray.300" mt={1}>
          Operaciones procesadas: <Text as="span" color="white" fontWeight="bold">{pedidosCount} registros</Text>
        </Text>
      </VStack>

      {/* Indicadores rápidos */}
      <VStack spacing={2} align="stretch" pt={1}>
        <Flex justify="space-between" align="center" bg="whiteAlpha.100" p={2.5} borderRadius="2xl" border="1px solid rgba(255,255,255,0.08)">
          <HStack spacing={2}>
            <Icon as={Activity} boxSize={4} color="emerald.400" />
            <Text fontSize="xs" color="gray.300" fontWeight="medium">
              Estatus del Sistema
            </Text>
          </HStack>
          <Badge bg="emerald.900" color="emerald.200" borderRadius="full" px={2} py={0.5} fontSize="10px">
            En línea
          </Badge>
        </Flex>
      </VStack>
    </MotionBox>
  );
}
