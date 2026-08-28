import { Box, Grid, GridItem, Flex, Text } from "@chakra-ui/react";
import { Tag, ShoppingBag, CreditCard, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useHasAccess } from "../../../shared/utils/permissions";

const MotionBox = motion(Box);

export function QuickActions() {
  const navigate = useNavigate();
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
      borderColor: "rgba(52, 211, 153, 0.4)",
    }] : []),
    {
      labelDesktop: "Lista de Precios",
      labelMobile: "Lista Precios",
      icon: Tag,
      path: "/productsPriceList",
      color: "#4ade80",
      bgGlow: "rgba(74, 222, 128, 0.22)",
      borderColor: "rgba(74, 222, 128, 0.4)",
    },
    {
      labelDesktop: "Mis Pedidos",
      labelMobile: "Mis Pedidos",
      icon: ShoppingBag,
      path: "/reports",
      color: "#60a5fa",
      bgGlow: "rgba(96, 165, 250, 0.22)",
      borderColor: "rgba(96, 165, 250, 0.4)",
    },
    {
      labelDesktop: "Cuentas por Cobrar",
      labelMobile: "Cobranzas",
      icon: CreditCard,
      path: "/receivable",
      color: "#f87171",
      bgGlow: "rgba(248, 113, 113, 0.22)",
      borderColor: "rgba(248, 113, 113, 0.4)",
    },
  ];

  const count = actions.length;

  return (
    <Box w="full" maxW="1200px" mx="auto" pt={2} pb={3} px={{ base: 1, sm: 2, md: 4 }}>
      <Grid
        templateColumns={{
          base: "repeat(2, 1fr)",
          sm: count === 3 ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
          md: `repeat(${count}, minmax(0, 1fr))`,
          lg: `repeat(${count}, minmax(0, 260px))`,
        }}
        gap={{ base: 2, sm: 2.5, md: 3.5, lg: 4 }}
        justifyContent="center"
        alignItems="center"
      >
        {actions.map((action, index) => {
          const IconComp = action.icon;
          // Si son 3 botones y estamos en móvil base (< 480px), el tercer botón se expande a 2 columnas centrado
          const isThirdItemInThree = count === 3 && index === 2;

          return (
            <GridItem
              key={action.path}
              colSpan={{
                base: isThirdItemInThree ? 2 : 1,
                sm: 1,
              }}
              display="flex"
              justifyContent="center"
              minW="0"
            >
              <MotionBox
                w="full"
                maxW={isThirdItemInThree ? { base: "260px", sm: "none" } : "none"}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(action.path)}
                bg="rgba(255, 255, 255, 0.16)"
                backdropFilter="blur(16px)"
                border="1.5px solid rgba(255, 255, 255, 0.28)"
                color="white"
                minW="0"
                py={{ base: 2, sm: 2.5, md: 2.5 }}
                px={{ base: 2, sm: 3, md: 4, lg: 5 }}
                h={{ base: "44px", sm: "46px", md: "48px" }}
                borderRadius="full"
                cursor="pointer"
                boxShadow="0 4px 18px rgba(0, 0, 0, 0.16)"
                transition={{ duration: 0.15 }}
                display="flex"
                alignItems="center"
                justifyContent="center"
                _hover={{
                  bg: "rgba(255, 255, 255, 0.26)",
                  borderColor: "rgba(255, 255, 255, 0.55)",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.24)",
                }}
                role="button"
                aria-label={action.labelDesktop}
              >
                <Flex align="center" justify="center" gap={{ base: 1.5, sm: 2, md: 2.5 }} minW="0" w="full">
                  <Flex
                    w={{ base: "24px", sm: "28px", md: "30px" }}
                    h={{ base: "24px", sm: "28px", md: "30px" }}
                    borderRadius="full"
                    bg={action.bgGlow}
                    border="1px solid"
                    borderColor={action.borderColor || "transparent"}
                    align="center"
                    justify="center"
                    flexShrink={0}
                  >
                    <IconComp
                      size={16}
                      color={action.color}
                      strokeWidth={2.4}
                    />
                  </Flex>
                  <Text
                    fontWeight="800"
                    fontSize={{ base: "11px", sm: "12px", md: "13px", lg: "13.5px" }}
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    textAlign="center"
                    lineHeight="1.2"
                    letterSpacing="tight"
                    color="white"
                    minW="0"
                  >
                    <Box as="span" display={{ base: "inline", md: "none" }}>
                      {action.labelMobile}
                    </Box>
                    <Box as="span" display={{ base: "none", md: "inline" }}>
                      {action.labelDesktop}
                    </Box>
                  </Text>
                </Flex>
              </MotionBox>
            </GridItem>
          );
        })}
      </Grid>
    </Box>
  );
}

