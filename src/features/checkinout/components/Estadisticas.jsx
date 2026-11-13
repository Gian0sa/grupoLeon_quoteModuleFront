import { SimpleGrid, Box, Text, Icon, Flex, Badge } from "@chakra-ui/react";
import { MapPin, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export default function Estadisticas({
  stats = {},
  activeFilter = "all",
  onFilterChange = null,
}) {
  const safeStats = stats || {};
  const total = safeStats.total ?? safeStats.totalVisits ?? 0;
  const completed = safeStats.completed ?? safeStats.completedVisits ?? 0;
  const pending = safeStats.pending ?? safeStats.pendingCheckOut ?? 0;
  const errors = safeStats.errors ?? safeStats.errorVisits ?? 0;

  const cards = [
    {
      id: "all",
      label: "Total Visitas",
      value: total,
      helpText: "Visitas registradas",
      icon: MapPin,
      bg: "blue.50",
      border: "blue.200",
      activeBg: "blue.100",
      activeBorder: "#2563eb",
      activeRing: "rgba(37, 99, 235, 0.25)",
      iconBg: "blue.500",
      iconColor: "white",
      textColor: "blue.900",
    },
    {
      id: "completed",
      label: "Completadas",
      value: completed,
      helpText: "Check-In & Out",
      icon: CheckCircle2,
      bg: "emerald.50",
      border: "emerald.200",
      activeBg: "emerald.100",
      activeBorder: "#059669",
      activeRing: "rgba(5, 150, 105, 0.25)",
      iconBg: "emerald.500",
      iconColor: "white",
      textColor: "emerald.900",
    },
    {
      id: "pending",
      label: "Pendientes",
      value: pending,
      helpText: "Sin Check-Out",
      icon: Clock,
      bg: pending > 0 ? "amber.50" : "gray.50",
      border: pending > 0 ? "amber.300" : "gray.200",
      activeBg: "amber.100",
      activeBorder: "#d97706",
      activeRing: "rgba(217, 119, 6, 0.25)",
      iconBg: pending > 0 ? "amber.500" : "gray.400",
      iconColor: "white",
      textColor: pending > 0 ? "amber.900" : "gray.700",
      highlight: pending > 0,
    },
    {
      id: "errors",
      label: "Sin Sincronizar",
      value: errors,
      helpText: errors > 0 ? "Requiere sync" : "Sin errores",
      icon: AlertTriangle,
      bg: errors > 0 ? "red.50" : "gray.50",
      border: errors > 0 ? "red.300" : "gray.200",
      activeBg: "red.100",
      activeBorder: "#dc2626",
      activeRing: "rgba(220, 38, 38, 0.25)",
      iconBg: errors > 0 ? "red.500" : "gray.400",
      iconColor: "white",
      textColor: errors > 0 ? "red.900" : "gray.700",
      highlight: errors > 0,
    },
  ];

  const handleCardClick = (cardId) => {
    if (!onFilterChange) return;
    // Si ya está activo y hace clic de nuevo (excepto 'all'), vuelve a 'all'. Si no, activa el seleccionado.
    const nextFilter = activeFilter === cardId && cardId !== "all" ? "all" : cardId;
    onFilterChange(nextFilter);
  };

  return (
    <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={{ base: 2.5, md: 3.5 }} w="full">
      {cards.map((c) => {
        const IconComp = c.icon;
        const isActive = activeFilter === c.id;

        return (
          <MotionBox
            key={c.id}
            whileHover={onFilterChange ? { scale: 1.025, y: -2 } : { scale: 1.01, y: -1 }}
            whileTap={onFilterChange ? { scale: 0.97 } : undefined}
            bg={isActive ? c.activeBg : c.bg}
            borderRadius="xl"
            p={{ base: 2.5, sm: 3, md: 4 }}
            border={isActive ? "2.5px solid" : "1.5px solid"}
            borderColor={isActive ? c.activeBorder : c.border}
            boxShadow={isActive ? `0 6px 18px ${c.activeRing}` : "0 4px 14px rgba(0,0,0,0.03)"}
            cursor={onFilterChange ? "pointer" : "default"}
            userSelect="none"
            position="relative"
            overflow="hidden"
            onClick={() => handleCardClick(c.id)}
            role={onFilterChange ? "button" : undefined}
            tabIndex={onFilterChange ? 0 : undefined}
            onKeyDown={(e) => {
              if (onFilterChange && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                handleCardClick(c.id);
              }
            }}
            transition={{ duration: 0.15 }}
          >
            {/* Si está activo, mostrar badge destacado */}
            {isActive && (
              <Badge
                position="absolute"
                top="6px"
                right="6px"
                bg={c.iconBg}
                color="white"
                borderRadius="full"
                px={2}
                py={0.2}
                fontSize="9px"
                fontWeight="900"
                letterSpacing="0.4px"
                boxShadow="xs"
              >
                ACTIVO
              </Badge>
            )}

            {/* Punto de notificación si tiene highlight y no está activo */}
            {!isActive && c.highlight && (
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
              {!isActive && c.value > 0 && c.highlight && (
                <Badge colorScheme={c.id === "errors" ? "red" : "amber"} variant="solid" borderRadius="full" px={1.5} fontSize="9px">
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
