import React from "react";
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  IconButton,
  Spinner,
  useDisclosure
} from "@chakra-ui/react";
import { BellIcon } from "@chakra-ui/icons";
import { format } from "date-fns";
import { BackButton } from "./BackButton";
import { RefreshButton } from "./RefreshButton";
import { NotificationDrawer } from "./NotificationDrawer";
import { LateralMenu } from "../features/dashboard/components/LateralMenu";
import { useExchangeRate } from "../features/dashboard/hooks/queries/dashboardQueries";
import { useAuthStore } from "../features/auth/stores/useAuthStore";
import { QUERY_KEYS } from "../shared/utils/queryKeys";

export const HEADER_BRAND_IMAGE = "/assets/header-brand-bg.png";
export const HEADER_MAIN_BG = "linear-gradient(135deg, #0e572b 0%, #126C36 50%, #0b4a24 100%)";

// Panel "vidrio esmerilado" para envolver contenido (buscadores, filtros) dentro del header,
// para que se integre visualmente con el mismo lenguaje que los pills de QuickActions.
export const HEADER_GLASS_PANEL_PROPS = {
  bg: "whiteAlpha.100",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "2xl",
};

export function TopHeaderBanner({
  title,
  subtitle,
  showBack = true,
  showExchangeRate = false,
  refreshQueries,
  children,
  minH = "270px",
  pb = { base: 6, md: 7 },
  pt = { base: 5, md: 6 },
  mb = 6
}) {
  const { salesEmployeeCode } = useAuthStore();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { isOpen: isNotifOpen, onOpen: onOpenNotif, onClose: onCloseNotif } = useDisclosure();

  const { data: exchangeRate, isLoading: isLoadingExchangeRate } = useExchangeRate(
    {
      currency: "USD",
      date: todayStr
    },
    { enabled: showExchangeRate }
  );

  const defaultQueries = refreshQueries || [
    [QUERY_KEYS.exchangeRate, "USD", todayStr],
    [QUERY_KEYS.notifications]
  ];

  return (
    <Box
      w="full"
      minH={{ base: "auto", md: minH }}
      bg="#126C36"
      borderRadius="0 0 36px 36px"
      boxShadow="0 20px 45px -10px rgba(18, 108, 54, 0.45)"
      position="relative"
      overflow="hidden"
      color="white"
      pt={pt}
      pb={pb}
      mb={mb}
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      _after={{
        content: "''",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "2px",
        background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 35%, rgba(255, 255, 255, 0.35) 65%, transparent 100%)",
      }}
    >
      {/* Capa de Imagen de Fondo de Marca (León / Autopartes) */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bgImage={`url('${HEADER_BRAND_IMAGE}')`}
        bgPosition="center center"
        bgSize="cover"
        bgRepeat="no-repeat"
        opacity={0.40}
        pointerEvents="none"
        _after={{
          content: "''",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(180deg, rgba(18, 108, 54, 0.15) 0%, rgba(11, 74, 36, 0.55) 100%)",
        }}
      />

      {/* Círculo / "Bolita" del extremo derecho en verde más claro #278847 */}
      <Box
        position="absolute"
        top="-70px"
        right="-50px"
        w="280px"
        h="280px"
        borderRadius="full"
        bg="#278847"
        opacity={0.75}
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom="-40px"
        left="-40px"
        w="160px"
        h="160px"
        borderRadius="full"
        bg="#278847"
        opacity={0.35}
        pointerEvents="none"
      />

      <Box
        maxW="1200px"
        mx="auto"
        w="full"
        px={{ base: 4, md: 6 }}
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        flex="1"
        position="relative"
        zIndex={2}
      >
        {/* BARRA SUPERIOR DE UTILIDAD: Botón Volver + USD Rate (solo si showExchangeRate) y Refrescar + Campana + Menú Lateral (der) */}
        <Flex justify="space-between" align="center" mb={{ base: 4, md: 6 }}>
          <HStack spacing={3}>
            {showBack && <BackButton color="white" />}

            {/* Badge Tipo de Cambio USD - Solo en vista principal / cuando se habilite */}
            {showExchangeRate && (
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
                    USD: {exchangeRate?.collectionRate ?? "3.45"}
                  </Text>
                )}
              </Box>
            )}
          </HStack>

          {/* Bloque de acciones del Dashboard: Recargar + Notificaciones + Menú Lateral */}
          <HStack
            bg="rgba(255, 255, 255, 0.14)"
            backdropFilter="blur(14px)"
            border="1px solid rgba(255, 255, 255, 0.25)"
            borderRadius="full"
            py={{ base: 1.5, md: 2 }}
            px={{ base: 3, md: 4 }}
            spacing={{ base: 2, md: 3 }}
            boxShadow="0 4px 15px rgba(0,0,0,0.12)"
          >
            <RefreshButton
              variant="ghost"
              queries={defaultQueries}
              showToast={true}
              mode="invalidateAndRefetch"
            />

            <IconButton
              icon={<BellIcon boxSize={{ base: 5, md: 6 }} />}
              variant="ghost"
              aria-label="Notificaciones"
              color="white"
              borderRadius="full"
              w={{ base: "42px", md: "48px" }}
              h={{ base: "42px", md: "48px" }}
              _hover={{ bg: "whiteAlpha.300" }}
              onClick={onOpenNotif}
            />

            <LateralMenu />
          </HStack>
        </Flex>

        <NotificationDrawer isOpen={isNotifOpen} onClose={onCloseNotif} />

        {/* TÍTULO GIGANTE 4XL E IDENTICO AL DASHBOARD */}
        {(title || subtitle) && (
          <Box w="full" mb={children ? 4 : 2}>
            <VStack align="start" spacing={1}>
              {title && (
                <Text
                  fontSize={{ base: "2xl", sm: "3xl", md: "4xl" }}
                  fontWeight="800"
                  color="white"
                  letterSpacing="tight"
                  lineHeight="1.15"
                >
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text
                  fontSize={{ base: "xs", sm: "sm" }}
                  color="whiteAlpha.900"
                  fontWeight="500"
                  letterSpacing="wide"
                >
                  {subtitle}
                </Text>
              )}
            </VStack>
          </Box>
        )}

        {/* CONTENIDO ADICIONAL (Buscadores / Filtros / Acciones integradas) */}
        {children}
      </Box>
    </Box>
  );
}
