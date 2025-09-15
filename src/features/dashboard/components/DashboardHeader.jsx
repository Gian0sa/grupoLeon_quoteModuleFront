// DashboardHeader.jsx
import { 
  Box, 
  Flex, 
  Text, 
  VStack, 
  HStack, 
  IconButton, 
  Badge, 
  Spinner 
} from "@chakra-ui/react";
import { MoonIcon, SunIcon, BellIcon } from "@chakra-ui/icons";
import { LateralMenu } from "./LateralMenu";
import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import { useColorMode } from "@chakra-ui/react";

export function DashboardHeader({ today, exchangeRate, isLoadingExchangeRate }) {
  console.log("Exchange Rate in Header:", exchangeRate);
  const { username, salesEmployeeCode } = useAuthStore();
  const isVendedor = salesEmployeeCode && salesEmployeeCode > 0;
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Box position="relative">
      {/* Badge flotante con el tipo de cambio */}
      <Box
        position="absolute"
        top="2"
        right="2"
        bg={colorMode === "light" ? "gray.100" : "gray.500"}
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
          <Spinner size="xs" color="teal.500" />
        ) : (
          <Text color="black" fontSize="xs" fontWeight="semibold">
            USD: {exchangeRate?.collectionRate ?? 'N/A'}
          </Text>
        )}
      </Box>

      <Flex justify="space-between" align="center" p={4} boxShadow="sm" gap={4}>
        {/* Bloque del saludo */}
        <Box flex="1" minW="0">
          <VStack align="start" spacing={0}>
            <Text fontSize="2xl" fontWeight="bold" whiteSpace="normal">
              Hola, {username}.
            </Text>
            <Text fontSize="sm" opacity={0.9}>
              {today}
            </Text>
          </VStack>
        </Box>

        {/* Bloque de íconos */}
        <HStack spacing={2} flexShrink={0}>
          <IconButton
            aria-label="Toggle Theme"
            icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
          />
          <IconButton
            icon={<BellIcon />}
            colorScheme="teal"
            variant="ghost"
            aria-label="Notificaciones"
            onClick={() => console.log("Notificaciones abiertas")}
          />
          <LateralMenu />
        </HStack>
      </Flex>
    </Box>
  );
}