import { Flex, Box, Text, HStack, Badge, Icon } from "@chakra-ui/react";
import { Layers, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export function ReceivableStatusFilter({
  activeFilter,
  onFilterChange,
  totalCount,
  overdueCount,
  onTimeCount,
  creditCount = 0,
  ageFilter = "all",
  onAgeFilterChange,
  sortBy = "debt",
  onSortByChange
}) {
  const filters = [
    {
      id: "all",
      label: "Todos",
      count: totalCount,
      icon: Layers,
      activeBg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      activeColor: "white",
      borderColor: "transparent",
      badgeBg: "rgba(255, 255, 255, 0.2)",
      badgeColor: "white",
      iconColor: "#94a3b8",
      inactiveBg: "#ffffff",
      inactiveColor: "#334155",
      inactiveBorder: "#cbd5e1",
      inactiveHover: "#f8fafc",
      inactiveIconColor: "#64748b",
      shadow: "0 4px 14px rgba(15, 23, 42, 0.2)",
    },
    {
      id: "activos",
      label: "Activos",
      count: onTimeCount,
      icon: CheckCircle2,
      activeBg: "linear-gradient(135deg, #059669 0%, #047857 100%)",
      activeColor: "white",
      borderColor: "transparent",
      badgeBg: "rgba(255, 255, 255, 0.25)",
      badgeColor: "white",
      iconColor: "#a7f3d0",
      inactiveBg: "#ffffff",
      inactiveColor: "#065f46",
      inactiveBorder: "#a7f3d0",
      inactiveHover: "#ecfdf5",
      inactiveIconColor: "#059669",
      shadow: "0 4px 14px rgba(5, 150, 105, 0.2)",
    },
    {
      id: "rechazados",
      label: "Vencidos",
      count: overdueCount,
      icon: AlertCircle,
      activeBg: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
      activeColor: "white",
      borderColor: "transparent",
      badgeBg: "rgba(255, 255, 255, 0.25)",
      badgeColor: "white",
      iconColor: "#fecdd3",
      inactiveBg: "#ffffff",
      inactiveColor: "#9f1239",
      inactiveBorder: "#fecdd3",
      inactiveHover: "#fff1f2",
      inactiveIconColor: "#e11d48",
      shadow: "0 4px 14px rgba(225, 29, 72, 0.2)",
    },
    {
      id: "credito",
      label: "Saldos a Favor",
      count: creditCount,
      icon: FileText,
      activeBg: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
      activeColor: "white",
      borderColor: "transparent",
      badgeBg: "rgba(255, 255, 255, 0.25)",
      badgeColor: "white",
      iconColor: "#bfdbfe",
      inactiveBg: "#ffffff",
      inactiveColor: "#1e40af",
      inactiveBorder: "#bfdbfe",
      inactiveHover: "#eff6ff",
      inactiveIconColor: "#2563eb",
      shadow: "0 4px 14px rgba(37, 99, 235, 0.2)",
    }
  ];

  const ageBuckets = [
    { id: "all", label: "Todas las Moras" },
    { id: "1-30", label: "🟡 1 - 30 Días" },
    { id: "31-60", label: "🟠 31 - 60 Días" },
    { id: "61-90", label: "🟠 61 - 90 Días" },
    { id: "90+", label: "🔴 +90 Días (Crítico)" }
  ];

  return (
    <Flex direction="column" gap={3} w="full">
      <Flex 
        gap={{ base: 1.5, sm: 2, md: 4 }} 
        w="full" 
        py={1} 
        px={0}
        justify="flex-start"
        align="center"
        wrap="wrap"
      >
        {filters.map((f) => {
          const isActive = activeFilter === f.id;
          const IconComponent = f.icon;

          return (
            <MotionBox
              key={f.id}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              flex={{ base: "1 1 0px", md: "0 0 auto" }}
              minW="0"
              py={{ base: 2, md: 2.5 }}
              px={{ base: 3, sm: 4, md: 6 }}
              borderRadius="full"
              bg={isActive ? f.activeBg : f.inactiveBg}
              color={isActive ? f.activeColor : f.inactiveColor}
              border="1px solid"
              borderColor={isActive ? "transparent" : f.inactiveBorder}
              boxShadow={
                isActive 
                  ? f.shadow 
                  : "0 1px 3px rgba(0, 0, 0, 0.04)"
              }
              _hover={{
                bg: isActive ? f.activeBg : f.inactiveHover,
                transform: "translateY(-1px)",
              }}
              cursor="pointer"
              onClick={() => onFilterChange(f.id)}
              transition={{ duration: 0.15 }}
              textAlign="center"
            >
              <HStack spacing={{ base: 1, md: 2.5 }} justify="center" align="center">
                <Icon 
                  as={IconComponent} 
                  boxSize={{ base: 3.5, md: 5 }} 
                  color={isActive ? f.iconColor : f.inactiveIconColor} 
                  flexShrink={0}
                />
                <Text 
                  fontSize={{ base: "10px", sm: "11px", md: "14.5px" }} 
                  fontWeight={isActive ? "700" : "600"} 
                  letterSpacing="tight"
                  whiteSpace="nowrap"
                  lineHeight="1.1"
                >
                  {f.label}
                </Text>
                <Badge
                  borderRadius="full"
                  px={{ base: 1.5, md: 2.5 }}
                  py={0.5}
                  fontSize={{ base: "9px", sm: "10px", md: "12px" }}
                  fontWeight="800"
                  bg={isActive ? f.badgeBg : "#f1f5f9"}
                  color={isActive ? f.badgeColor : f.inactiveColor}
                  flexShrink={0}
                >
                  {f.count}
                </Badge>
              </HStack>
            </MotionBox>
          );
        })}
      </Flex>

      {/* Sub-filtros por Antigüedad de Mora (RN-FECHAS-03) y Ordenación (RN-FECHAS-04) cuando se selecciona Vencidos */}
      {activeFilter === "rechazados" && onAgeFilterChange && (
        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={2}
          bg="white"
          p={2.5}
          borderRadius="xl"
          border="1px solid"
          borderColor="red.100"
          boxShadow="xs"
        >
          <HStack spacing={1.5} wrap="wrap" flex={1}>
            <Text fontSize="11px" fontWeight="800" color="gray.500" textTransform="uppercase" mr={1}>
              ⏱️ Tramo de Mora:
            </Text>
            {ageBuckets.map((b) => {
              const isAgeActive = ageFilter === b.id;
              return (
                <Badge
                  key={b.id}
                  cursor="pointer"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="11px"
                  fontWeight={isAgeActive ? "800" : "600"}
                  bg={isAgeActive ? "red.600" : "gray.100"}
                  color={isAgeActive ? "white" : "gray.700"}
                  _hover={{ bg: isAgeActive ? "red.700" : "gray.200" }}
                  onClick={() => onAgeFilterChange(b.id)}
                  transition="all 0.2s"
                >
                  {b.label}
                </Badge>
              );
            })}
          </HStack>

          {onSortByChange && (
            <HStack spacing={1.5} fontSize="11px">
              <Text fontWeight="800" color="gray.500" textTransform="uppercase">
                🔥 Ordenar:
              </Text>
              <Badge
                cursor="pointer"
                px={2.5}
                py={1}
                borderRadius="full"
                fontWeight="700"
                bg={sortBy === "debt" ? "emerald.600" : "gray.100"}
                color={sortBy === "debt" ? "white" : "gray.700"}
                onClick={() => onSortByChange("debt")}
              >
                Mayor Deuda ($)
              </Badge>
              <Badge
                cursor="pointer"
                px={2.5}
                py={1}
                borderRadius="full"
                fontWeight="700"
                bg={sortBy === "age" ? "emerald.600" : "gray.100"}
                color={sortBy === "age" ? "white" : "gray.700"}
                onClick={() => onSortByChange("age")}
              >
                Más Antiguo (⏱️)
              </Badge>
            </HStack>
          )}
        </Flex>
      )}
    </Flex>
  );
}
