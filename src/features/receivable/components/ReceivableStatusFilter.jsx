import { Flex, Box, Text, HStack, Badge, Icon } from "@chakra-ui/react";
import { Layers, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export function ReceivableStatusFilter({ activeFilter, onFilterChange, totalCount, overdueCount, onTimeCount }) {
  const filters = [
    {
      id: "all",
      label: "Todos",
      count: totalCount,
      icon: Layers,
      activeBg: "linear-gradient(135deg, #1e4620 0%, #153417 100%)",
      activeColor: "white",
      borderColor: "#2e6532",
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
      borderColor: "#10b981",
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
      borderColor: "#ef4444",
      badgeBg: "rgba(255, 255, 255, 0.25)",
      badgeColor: "white",
      iconColor: "#fca5a5"
    }
  ];

  return (
    <Flex 
      gap={{ base: 1.5, sm: 2, md: 4 }} 
      w="full" 
      py={1} 
      px={0}
      justify="flex-start"
      align="center"
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
            py={{ base: 2, md: 3 }}
            px={{ base: 1.5, sm: 2.5, md: 6 }}
            borderRadius="full"
            bg={isActive ? f.activeBg : "white"}
            color={isActive ? f.activeColor : "gray.700"}
            border="1.5px solid"
            borderColor={isActive ? f.borderColor : "gray.200"}
            boxShadow={
              isActive 
                ? "0 4px 16px rgba(0, 0, 0, 0.15)" 
                : "0 2px 8px rgba(0, 0, 0, 0.04)"
            }
            cursor="pointer"
            onClick={() => onFilterChange(f.id)}
            transition={{ duration: 0.15 }}
            textAlign="center"
          >
            <HStack spacing={{ base: 1, md: 2.5 }} justify="center" align="center">
              <Icon 
                as={IconComponent} 
                boxSize={{ base: 3.5, md: 5 }} 
                color={isActive ? f.iconColor : f.id === "activos" ? "green.500" : f.id === "rechazados" ? "red.500" : "gray.500"} 
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
  );
}
