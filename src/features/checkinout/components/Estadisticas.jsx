import { SimpleGrid, Box, Text, HStack, Icon, Flex, Badge } from "@chakra-ui/react";
import { MapPin, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export default function Estadisticas({ stats = {} }) {
  const safeStats = stats || {};
  const total = safeStats.total ?? safeStats.totalVisits ?? 0;
  const completed = safeStats.completed ?? safeStats.completedVisits ?? 0;
  const pending = safeStats.pending ?? safeStats.pendingCheckOut ?? 0;
  const errors = safeStats.errors ?? safeStats.errorVisits ?? 0;

  const cards = [
    {
      label: "Total Visitas",
      value: total,
      helpText: "Visitas registradas",
      icon: MapPin,
      bg: "blue.50",
      border: "blue.200",
      iconBg: "blue.500",
      iconColor: "white",
      textColor: "blue.900",
    },
    {
      label: "Completadas",
      value: completed,
      helpText: "Check-In & Out",
      icon: CheckCircle2,
      bg: "emerald.50",
      border: "emerald.200",
      iconBg: "emerald.500",
      iconColor: "white",
      textColor: "emerald.900",
    },
    {
      label: "Pendientes",
      value: pending,
      helpText: "Sin Check-Out",
      icon: Clock,
      bg: pending > 0 ? "amber.50" : "gray.50",
      border: pending > 0 ? "amber.300" : "gray.200",
      iconBg: pending > 0 ? "amber.500" : "gray.400",
      iconColor: "white",
      textColor: pending > 0 ? "amber.900" : "gray.700",
      highlight: pending > 0,
    },
    {
      label: "Sin Sincronizar",
      value: errors,
      helpText: errors > 0 ? "Requiere sync" : "Sin errores",
      icon: AlertTriangle,
      bg: errors > 0 ? "red.50" : "gray.50",
      border: errors > 0 ? "red.300" : "gray.200",
      iconBg: errors > 0 ? "red.500" : "gray.400",
      iconColor: "white",
      textColor: errors > 0 ? "red.900" : "gray.700",
      highlight: errors > 0,
    },
  ];

  return (
    <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={{ base: 2.5, md: 3.5 }} w="full">
      {cards.map((c, index) => {
        const IconComp = c.icon;
        return (
          <MotionBox
            key={index}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            bg={c.bg}
            borderRadius="xl"
            p={{ base: 2.5, sm: 3, md: 4 }}
            border="1.5px solid"
            borderColor={c.border}
            boxShadow="0 4px 14px rgba(0,0,0,0.03)"
            position="relative"
            overflow="hidden"
            transition={{ duration: 0.15 }}
          >
            {c.highlight && (
              <Box
                position="absolute"
                top="6px"
                right="6px"
                w="7px"
                h="7px"
                borderRadius="full"
                bg={c.iconBg}
                boxShadow={`0 0 8px ${c.iconBg}`}
              />
            )}
            <Flex justify="space-between" align="center" mb={1.5}>
              <Box p={1.5} borderRadius="lg" bg={c.iconBg} color={c.iconColor}>
                <Icon as={IconComp} boxSize={{ base: 3.5, md: 4.5 }} />
              </Box>
              {c.value > 0 && c.highlight && (
                <Badge colorScheme={c.label.includes("Sin Sincronizar") ? "red" : "amber"} variant="solid" borderRadius="full" px={1.5} fontSize="9px">
                  ACTIVO
                </Badge>
              )}
            </Flex>
            <Text fontSize={{ base: "11px", sm: "xs", md: "sm" }} fontWeight="700" color="gray.700" lineHeight="1.2" isTruncated>
              {c.label}
            </Text>
            <Text fontSize={{ base: "xl", sm: "2xl", md: "3xl" }} fontWeight="900" color={c.textColor} my={0.5}>
              {c.value}
            </Text>
            <Text fontSize={{ base: "9px", sm: "10px", md: "xs" }} color="gray.500" fontWeight="medium" isTruncated>
              {c.helpText}
            </Text>
          </MotionBox>
        );
      })}
    </SimpleGrid>
  );
}
