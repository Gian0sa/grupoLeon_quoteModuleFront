import { Flex, Box, Text, useBreakpointValue } from "@chakra-ui/react";
import { Tag, ShoppingBag, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export function QuickActions() {
  const navigate = useNavigate();
  const iconSize = useBreakpointValue({ base: 16, sm: 18, md: 22 });

  const actions = [
    { label: "Lista de Precios", icon: Tag, path: "/productsPriceList", color: "#86efac" },
    { label: "Mis Pedidos", icon: ShoppingBag, path: "/reports", color: "#93c5fd" },
    { label: "Cuentas por Cobrar", icon: CreditCard, path: "/receivable", color: "#fca5a5" },
  ]; 

  return (
    <Flex 
      px={{ base: 3, sm: 4, md: 6 }} 
      pt={2}
      pb={3} 
      gap={{ base: 2, sm: 3, md: 5 }} 
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
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(action.path)}
            bg="rgba(255, 255, 255, 0.14)"
            backdropFilter="blur(16px)"
            border="1.5px solid rgba(255, 255, 255, 0.28)"
            color="white"
            flex={{ base: "1 1 0px", md: "0 1 240px" }}
            minW="0"
            py={{ base: 2, md: 3 }}
            px={{ base: 2, sm: 3, md: 6 }}
            h={{ base: "40px", md: "46px" }}
            borderRadius="full"
            cursor="pointer"
            boxShadow="0 4px 20px rgba(0,0,0,0.18)"
            transition={{ duration: 0.15 }}
            display="flex"
            alignItems="center"
            justifyContent="center"
            _hover={{ bg: "rgba(255, 255, 255, 0.25)", borderColor: "rgba(255, 255, 255, 0.5)" }}
          >
            <Flex align="center" justify="center" gap={{ base: 1.5, sm: 2, md: 3 }}>
              <Box flexShrink={0} display="flex" alignItems="center" justifyContent="center">
                <IconComp size={iconSize || 18} color={action.color} strokeWidth={2.2} />
              </Box>
              <Text 
                fontWeight="700"
                fontSize={{ base: "10.5px", sm: "12px", md: "14px" }}
                whiteSpace="nowrap"
                textAlign="center"
                lineHeight="1"
                letterSpacing="tight"
              >
                {action.label}
              </Text>
            </Flex>
          </MotionBox>
        );
      })}
    </Flex>
  );
}
