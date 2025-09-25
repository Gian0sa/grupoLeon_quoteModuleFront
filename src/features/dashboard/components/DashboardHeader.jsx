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
    <Box position="relative">
      {/* Badge flotante con el tipo de cambio */}
      <Box
        position="absolute"
        top="2"
        right="2"
        bg={badgeBg}
        borderRadius="md"
        px={3}
        py={1}
        boxShadow="sm"
        minW="80px"
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        {isLoadingExchangeRate ? (
          <Spinner size="xs" color={accent} />
        ) : (
          <Text color={badgeText} fontSize="xs" fontWeight="semibold">
            USD: {exchangeRate?.collectionRate ?? "N/A"}
          </Text>
        )}
      </Box>

      <Flex justify="space-between" align="center" p={4} py={5} boxShadow="sm" gap={4}>
        {/* Bloque del saludo */}
        <Box flex="1" minW="0">
          <VStack align="start" spacing={0}>
            <Text fontSize="2xl" fontWeight="bold" color="white" whiteSpace="normal">
              Hola, {username}.
            </Text>
            <Text fontSize="sm" color="white" opacity={0.9}>
              {today}
            </Text>
          </VStack>
        </Box>

        {/* Bloque de íconos */}
        <HStack spacing={2} flexShrink={0}>
          {/* <IconButton
            aria-label="Toggle Theme"
            icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            color={accent}
          /> */}
          <RefreshButton
              queries={[
                [QUERY_KEYS.quotesSellers, salesEmployeeCode ?? 0, format(new Date(), "MM")],
                [QUERY_KEYS.quotesSellersAdmin, salesEmployeeCode ?? 0, format(new Date(), "MM")],
                [QUERY_KEYS.notifications],
                [QUERY_KEYS.exchangeRate, "USD", format(new Date(), "yyyy-MM-dd")]
              ]}
            />
          {/* Botón de notificaciones */}
          <IconButton
            icon={<BellIcon />}
            variant="ghost"
            aria-label="Notificaciones"
            color={accent}
            onClick={() => console.log("Notificaciones abiertas")}
          />
          <LateralMenu />
        </HStack>
      </Flex>
    </Box>
  );
}
