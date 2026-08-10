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
      activeBg: "linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)",
      activeColor: "white",
      borderColor: "transparent",
      badgeBg: "rgba(255, 255, 255, 0.25)",
      badgeColor: "white",
      iconColor: "#86efac"
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
      iconColor: "#a7f3d0"
    },
    {
      id: "rechazados",
      label: "Vencidos",
      count: overdueCount,
      icon: AlertCircle,
      activeBg: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
      activeColor: "white",
      borderColor: "transparent",
      badgeBg: "rgba(255, 255, 255, 0.25)",
      badgeColor: "white",
      iconColor: "#fca5a5"
    },
    {
      id: "credito",
      label: "Saldos a Favor",
      count: creditCount,
      icon: FileText,
      activeBg: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
      activeColor: "white",
      borderColor: "transparent",
      badgeBg: "rgba(255, 255, 255, 0.25)",
      badgeColor: "white",
      iconColor: "#93c5fd"
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
              bg={isActive ? f.activeBg : "green.50"}
              color={isActive ? f.activeColor : "green.800"}
              border={isActive ? "none" : "1px solid"}
              borderColor={isActive ? "transparent" : "green.200"}
              boxShadow={
                isActive 
                  ? "0 4px 14px rgba(22, 101, 52, 0.25)" 
                  : "none"
              }
              _hover={{
                bg: isActive ? f.activeBg : "green.100",
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
                  color={isActive ? f.iconColor : f.id === "activos" ? "green.500" : f.id === "rechazados" ? "red.500" : f.id === "credito" ? "blue.500" : "gray.500"} 
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
                  bg={isActive ? f.badgeBg : "gray.100"}
                  color={isActive ? f.badgeColor : "gray.700"}
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
