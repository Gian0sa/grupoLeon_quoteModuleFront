import { Flex, Box, Text, useBreakpointValue } from "@chakra-ui/react";
import { Tag, ShoppingBag, CreditCard, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useHasAccess } from "../../../shared/utils/permissions";

const MotionBox = motion(Box);

export function QuickActions() {
  const navigate = useNavigate();
  const iconSize = useBreakpointValue({ base: 15, sm: 17, md: 20 });
  const hasAccess = useHasAccess();
  const canAccessQuotes = hasAccess("POST:/quotations") || hasAccess("GET:/quotations") || hasAccess("PUT:/profile/admin/:userId");

  const actions = [
    ...(canAccessQuotes ? [{
      labelDesktop: "Cotizaciones",
      labelMobile: "Cotizaciones",
      icon: FileText,
      path: "/historyquotes",
      color: "#34d399",
      bgGlow: "rgba(52, 211, 153, 0.25)",
    }] : []),
    {
      labelDesktop: "Lista de Precios",
      labelMobile: "Lista Precios",
      icon: Tag,
      path: "/productsPriceList",
      color: "#4ade80",
      bgGlow: "rgba(74, 222, 128, 0.22)",
    },
    {
      labelDesktop: "Mis Pedidos",
      labelMobile: "Mis Pedidos",
      icon: ShoppingBag,
      path: "/reports",
      color: "#60a5fa",
      bgGlow: "rgba(96, 165, 250, 0.22)",
    },
    {
      labelDesktop: "Cuentas por Cobrar",
      labelMobile: "Cobranzas",
      icon: CreditCard,
      path: "/receivable",
      color: "#f87171",
      bgGlow: "rgba(248, 113, 113, 0.22)",
    },
  ];

  return (
    <Flex 
      px={{ base: 2.5, sm: 4, md: 6 }} 
      pt={2}
      pb={3} 
      gap={{ base: 2, sm: 3, md: 4 }} 
      w="full" 
      maxW="1200px" 
      mx="auto" 
      justify="center"
      align="center"
    >
      {actions.map((action) => {
        const IconComp = action.icon;
        return (
          <MotionBox
            key={action.path}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(action.path)}
            bg="rgba(255, 255, 255, 0.16)"
            backdropFilter="blur(16px)"
            border="1.5px solid rgba(255, 255, 255, 0.3)"
            color="white"
            flex={{ base: "1 1 0px", md: "0 1 240px" }}
            minW="0"
            py={{ base: 2, md: 3 }}
            px={{ base: 2, sm: 3.5, md: 6 }}
            h={{ base: "44px", sm: "46px", md: "48px" }}
            borderRadius="full"
            cursor="pointer"
            boxShadow="0 4px 20px rgba(0,0,0,0.18)"
            transition={{ duration: 0.15 }}
            display="flex"
            alignItems="center"
            justifyContent="center"
            _hover={{ bg: "rgba(255, 255, 255, 0.28)", borderColor: "rgba(255, 255, 255, 0.5)" }}
          >
            <Flex align="center" justify="center" gap={{ base: 1.5, sm: 2, md: 3 }} w="full">
              <Flex
                w={{ base: "26px", md: "32px" }}
                h={{ base: "26px", md: "32px" }}
                borderRadius="full"
                bg={action.bgGlow}
                align="center"
                justify="center"
                flexShrink={0}
              >
                <IconComp size={iconSize || 15} color={action.color} strokeWidth={2.4} />
              </Flex>
              <Text 
                fontWeight="800"
                fontSize={{ base: "11px", sm: "12.5px", md: "14px" }}
                whiteSpace="nowrap"
                textAlign="center"
                lineHeight="1"
                letterSpacing="tight"
                color="white"
              >
                <Box as="span" display={{ base: "inline", sm: "none" }}>
                  {action.labelMobile}
                </Box>
                <Box as="span" display={{ base: "none", sm: "inline" }}>
                  {action.labelDesktop}
                </Box>
              </Text>
            </Flex>
          </MotionBox>
        );
      })}
    </Flex>
  );
}
