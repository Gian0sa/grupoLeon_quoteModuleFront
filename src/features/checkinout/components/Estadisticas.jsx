import { SimpleGrid, Box, Text, HStack, Icon, Flex, Badge } from "@chakra-ui/react";
import { MapPin, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export default function Estadisticas({ stats }) {
  const cards = [
    {
      label: "Total Visitas",
      value: stats.total || 0,
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
      value: stats.completed || 0,
      helpText: "Con Check-In / Out",
      icon: CheckCircle2,
      bg: "emerald.50",
      border: "emerald.200",
      iconBg: "emerald.500",
      iconColor: "white",
      textColor: "emerald.900",
    },
    {
      label: "Pendientes",
      value: stats.pending || 0,
      helpText: "Sin Check-Out registrado",
      icon: Clock,
      bg: stats.pending > 0 ? "amber.50" : "gray.50",
      border: stats.pending > 0 ? "amber.300" : "gray.200",
      iconBg: stats.pending > 0 ? "amber.500" : "gray.400",
      iconColor: "white",
      textColor: stats.pending > 0 ? "amber.900" : "gray.700",
      highlight: stats.pending > 0,
    },
    {
      label: "Errores / Sin subir",
      value: stats.errors || 0,
      helpText: stats.errors > 0 ? "Requiere sincronización" : "Sin errores de red",
      icon: AlertTriangle,
      bg: stats.errors > 0 ? "red.50" : "gray.50",
      border: stats.errors > 0 ? "red.300" : "gray.200",
      iconBg: stats.errors > 0 ? "red.500" : "gray.400",
      iconColor: "white",
      textColor: stats.errors > 0 ? "red.900" : "gray.700",
      highlight: stats.errors > 0,
    },
  ];

  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 3, md: 4 }} w="full">
      {cards.map((c, index) => {
        const IconComp = c.icon;
        return (
          <MotionBox
            key={index}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            bg={c.bg}
            borderRadius="2xl"
            p={{ base: 3, md: 4 }}
            border="1.5px solid"
            borderColor={c.border}
            boxShadow="0 4px 14px rgba(0,0,0,0.04)"
            position="relative"
            overflow="hidden"
            transition={{ duration: 0.15 }}
          >
            {c.highlight && (
              <Box
                position="absolute"
                top="8px"
                right="8px"
                w="8px"
                h="8px"
                borderRadius="full"
                bg={c.iconBg}
                boxShadow={`0 0 10px ${c.iconBg}`}
              />
            )}
            <Flex justify="space-between" align="flex-start" mb={2}>
              <Box p={2} borderRadius="xl" bg={c.iconBg} color={c.iconColor}>
                <Icon as={IconComp} boxSize={{ base: 4, md: 5 }} />
              </Box>
              {c.value > 0 && c.highlight && (
                <Badge colorScheme={c.label.includes("Errores") ? "red" : "amber"} variant="solid" borderRadius="full" px= {2} fontSize="10px">
                  ATENCIÓN
                </Badge>
              )}
            </Flex>
            <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="600" color="gray.600" lineHeight="1.2">
              {c.label}
            </Text>
            <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="900" color={c.textColor} my={0.5}>
              {c.value}
            </Text>
            <Text fontSize={{ base: "10px", md: "xs" }} color="gray.500" fontWeight="medium">
              {c.helpText}
            </Text>
          </MotionBox>
        );
      })}
    </SimpleGrid>
  );
}
