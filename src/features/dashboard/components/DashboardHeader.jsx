// DashboardHeader.jsx
import { 
  Box, 
  Flex, 
  Text, 
  VStack, 
  HStack, 
  IconButton, 
  Spinner, 
  useColorMode, 
  useColorModeValue, 
  Tooltip
} from "@chakra-ui/react";
import { MoonIcon, SunIcon, BellIcon, RepeatIcon } from "@chakra-ui/icons";
import { LateralMenu } from "./LateralMenu";
import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import { RefreshButton } from "../../../components/RefreshButton";
import { QUERY_KEYS } from "../../../shared/utils/queryKeys";
import { format } from "date-fns";


export function DashboardHeader({ today, exchangeRate, isLoadingExchangeRate, onRefetchExchangeRate }) {
  const { username, salesEmployeeCode } = useAuthStore();
  const isVendedor = salesEmployeeCode && salesEmployeeCode > 0;
  const { colorMode, toggleColorMode } = useColorMode();

  // 🎨 Usamos semanticTokens
  const badgeBg = useColorModeValue("card", "card");
  const badgeText = useColorModeValue("text", "text");
  const headerText = useColorModeValue("text", "text");
  const accent = useColorModeValue("accent", "accent");

  return (
    <Box position="relative" maxW="1200px" mx="auto" px={{ base: 4, md: 6 }} pt={{ base: 3, md: 5 }} pb={{ base: 2, md: 4 }}>
      {/* Barra superior de utilidad: Tipo de Cambio + Acciones */}
      <Flex justify="space-between" align="center" mb={{ base: 4, md: 5 }}>
        {/* Badge con el tipo de cambio */}
        <Box
          bg="whiteAlpha.200"
          backdropFilter="blur(12px)"
          border="1px solid rgba(255,255,255,0.25)"
          borderRadius="full"
          px={{ base: 3, sm: 4 }}
          py={1.5}
          boxShadow="0 4px 15px rgba(0,0,0,0.12)"
          display="flex"
          alignItems="center"
          gap={2}
        >
          <Box w="6px" h="6px" borderRadius="full" bg="green.300" boxShadow="0 0 8px rgba(134, 239, 172, 0.8)" />
          {isLoadingExchangeRate ? (
            <Spinner size="xs" color="white" />
          ) : (
            <Text color="white" fontSize={{ base: "xs", sm: "sm" }} fontWeight="bold" letterSpacing="wide">
              USD: {exchangeRate?.collectionRate ?? "N/A"}
            </Text>
          )}
        </Box>

        {/* Bloque de íconos de acción unificados en un solo recuadro */}
        <HStack 
          bg="rgba(255, 255, 255, 0.14)" 
          backdropFilter="blur(14px)" 
          border="1px solid rgba(255, 255, 255, 0.25)" 
          borderRadius="full" 
          p={1} 
          px={1.5}
          spacing={1}
          boxShadow="0 4px 15px rgba(0,0,0,0.12)"
        >
          <RefreshButton
            variant="ghost"
            size="sm"
            queries={[
              [QUERY_KEYS.quotesSellers, salesEmployeeCode ?? 0, format(new Date(), "MM")],
              [QUERY_KEYS.quotesSellersAdmin, salesEmployeeCode ?? 0, format(new Date(), "MM")],
              [QUERY_KEYS.notifications],
              [QUERY_KEYS.exchangeRate, "USD", format(new Date(), "yyyy-MM-dd")]
            ]}
          />

          <IconButton
            icon={<BellIcon boxSize={4} />}
            variant="ghost"
            aria-label="Notificaciones"
            color="white"
            borderRadius="full"
            size="sm"
            _hover={{ bg: "whiteAlpha.300" }}
            onClick={() => console.log("Notificaciones abiertas")}
          />

          <LateralMenu />
        </HStack>
      </Flex>

      {/* Bloque del saludo a ancho completo */}
      <Box w="full" mb={2}>
        <VStack align="start" spacing={1}>
          <Text 
            fontSize={{ base: "2xl", sm: "3xl", md: "4xl" }} 
            fontWeight="900" 
            bgGradient="linear(to-r, white, whiteAlpha.800)"
            bgClip="text"
            letterSpacing="tight"
            lineHeight="1.15"
            style={{ WebkitTextFillColor: "transparent" }}
          >
            Hola, {username}.
          </Text>
          <Text fontSize={{ base: "xs", sm: "sm" }} color="whiteAlpha.800" fontWeight="normal" letterSpacing="wide">
            {today}
          </Text>
        </VStack>
      </Box>
    </Box>
  );
}
