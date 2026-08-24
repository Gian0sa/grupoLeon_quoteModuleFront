import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  IconButton,
  Spinner,
  useDisclosure,
  Badge
} from "@chakra-ui/react";
import { BellIcon } from "@chakra-ui/icons";
import { format } from "date-fns";
import { BackButton } from "./BackButton";
import { RefreshButton } from "./RefreshButton";
import { NotificationDrawer } from "./NotificationDrawer";
import { LateralMenu } from "../features/dashboard/components/LateralMenu";
import { useExchangeRate } from "../features/dashboard/hooks/queries/dashboardQueries";
import { useAuthStore } from "../features/auth/stores/useAuthStore";
import { useNotifications } from "../features/quotes/hooks/queries/quotesQueries";
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
  backTo = "/dashboard",
  onBackClick,
  showExchangeRate = false,
  refreshQueries,
  children,
  minH = "270px",
  pb = { base: 6, md: 7 },
  pt = { base: 5, md: 6 },
  mb = 6
}) {
  const { salesEmployeeCode, username, userId, role } = useAuthStore();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { isOpen: isNotifOpen, onOpen: onOpenNotif, onClose: onCloseNotif } = useDisclosure();

  const [localVersion, setLocalVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setLocalVersion(v => v + 1);
    window.addEventListener("localNotificationsUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("localNotificationsUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const { data: serverNotifs } = useNotifications(
    role === "ADMIN" ? "FACTURACION" : undefined,
    username
  );

  const notifCount = React.useMemo(() => {
    let combined = [];

    if (serverNotifs && Array.isArray(serverNotifs)) {
      combined = [...serverNotifs];
      try {
        const raw = localStorage.getItem("grupoLeon_notifications");
        const saved = raw ? JSON.parse(raw) : [];
        if (Array.isArray(saved)) {
          const now = Date.now();
          const serverIds = new Set(serverNotifs.map(s => String(s.id)));
          const serverQuoteIds = new Set(serverNotifs.map(s => String(s.quoteId)));
          const recentLocal = saved.filter(sn => {
            const time = sn.createdAt ? new Date(sn.createdAt).getTime() : 0;
            const isFresh = (now - time) < 30000;
            return isFresh && !serverIds.has(String(sn.id)) && serverQuoteIds.has(String(sn.quoteId));
          });
          combined = [...recentLocal, ...combined];
        }
      } catch {}
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem("grupoLeon_notifications") || "[]");
        combined = Array.isArray(saved) ? [...saved] : [];
      } catch {}
    }

    const filtered = combined.filter((n) => {
      if (n.status === "ANULADO" || String(n.title || "").toLowerCase().includes("anulad") || n.read) {
        return false;
      }
      if (n.targetUsername && username) {
        return n.targetUsername.toLowerCase() === username.toLowerCase();
      }
      if (n.targetRole === "FACTURACION" && (role === "ADMIN" || username?.toLowerCase() === "enrique")) {
        return true;
      }
      if (n.targetUserId && userId) {
        return String(n.targetUserId) === String(userId);
      }
      return false;
    });

    const uniqueQuoteKeys = new Set(filtered.map(n => String(n.quoteId || n.id)));
    return uniqueQuoteKeys.size;
  }, [serverNotifs, username, userId, role, localVersion]);

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
      maxW="100vw"
      minH={{ base: "auto", md: minH }}
      bg="#126C36"
      borderRadius={{ base: "0 0 28px 28px", md: "0 0 36px 36px" }}
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
        <Flex justify="space-between" align="center" gap={2} mb={{ base: 4, md: 6 }}>
          <HStack spacing={{ base: 2, md: 3 }} minW={0} flexShrink={1}>
            {showBack && <BackButton color="white" to={backTo} onClick={onBackClick} />}

            {/* Badge Tipo de Cambio USD - Solo en vista principal / cuando se habilite */}
            {showExchangeRate && (
              <Box
                bg="whiteAlpha.200"
                backdropFilter="blur(12px)"
                border="1px solid rgba(255,255,255,0.25)"
                borderRadius="full"
                px={{ base: 3, sm: 4 }}
                py={1.5}
                minH="36px"
                boxShadow="0 4px 15px rgba(0,0,0,0.12)"
                display="flex"
                alignItems="center"
                flexShrink={0}
                gap={2}
                // En teléfonos muy angostos (<360px) el badge se compacta:
                // se oculta el punto indicador y se reduce el padding para que
                // nunca compita por ancho con las acciones de la derecha.
                sx={{
                  "@media (max-width: 359px)": {
                    paddingInline: "0.5rem",
                    gap: "0.25rem",
                  },
                }}
              >
                <Box
                  w="6px"
                  h="6px"
                  borderRadius="full"
                  bg="green.300"
                  flexShrink={0}
                  boxShadow="0 0 8px rgba(134, 239, 172, 0.8)"
                  sx={{ "@media (max-width: 359px)": { display: "none" } }}
                />
                {isLoadingExchangeRate ? (
                  <Spinner size="xs" color="white" />
                ) : (
                  <Text
                    color="white"
                    fontSize={{ base: "13px", sm: "sm" }}
                    fontWeight="bold"
                    letterSpacing="wide"
                    whiteSpace="nowrap"
                    sx={{ "@media (max-width: 359px)": { fontSize: "11px", letterSpacing: "normal" } }}
                  >
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
            px={{ base: 2, md: 4 }}
            spacing={{ base: 1, md: 3 }}
            flexShrink={0}
            boxShadow="0 4px 15px rgba(0,0,0,0.12)"
          >
            <RefreshButton
              variant="ghost"
              queries={defaultQueries}
              showToast={true}
              fullReload={true}
            />

            <Box position="relative">
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
                sx={
                  notifCount > 0
                    ? {
                        animation: "bellRing 2.5s infinite ease-in-out",
                        "@keyframes bellRing": {
                          "0%": { transform: "rotate(0)" },
                          "10%": { transform: "rotate(14deg)" },
                          "20%": { transform: "rotate(-14deg)" },
                          "30%": { transform: "rotate(10deg)" },
                          "40%": { transform: "rotate(-10deg)" },
                          "50%": { transform: "rotate(4deg)" },
                          "60%": { transform: "rotate(-4deg)" },
                          "100%": { transform: "rotate(0)" }
                        }
                      }
                    : {}
                }
              />
              {notifCount > 0 && (
                <Badge
                  position="absolute"
                  top="2px"
                  right="2px"
                  bg="red.500"
                  color="white"
                  borderRadius="full"
                  px={1.5}
                  py={0.2}
                  fontSize="10px"
                  fontWeight="900"
                  boxShadow="0 0 12px rgba(239, 68, 68, 0.9)"
                  border="2px solid"
                  borderColor="#126C36"
                  pointerEvents="none"
                  sx={{
                    animation: "pulseGlow 1.5s infinite ease-in-out",
                    "@keyframes pulseGlow": {
                      "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 8px rgba(239,68,68,0.8)" },
                      "50%": { transform: "scale(1.15)", boxShadow: "0 0 18px rgba(239,68,68,1)" }
                    }
                  }}
                >
                  {notifCount}
                </Badge>
              )}
            </Box>

            <LateralMenu />
          </HStack>
        </Flex>

        <NotificationDrawer isOpen={isNotifOpen} onClose={onCloseNotif} />

        {/* TÍTULO GIGANTE 4XL E IDENTICO AL DASHBOARD */}
        {(title || subtitle) && (
          <Box w="full" maxW="100%" mb={children ? 4 : 2}>
            <VStack align="start" spacing={1} maxW="100%">
              {title && (
                <Text
                  fontSize={{ base: "xl", sm: "2xl", md: "3xl", lg: "4xl" }}
                  fontWeight="800"
                  color="white"
                  letterSpacing="tight"
                  lineHeight="1.2"
                  maxW="100%"
                  // Títulos largos parten de línea en vez de recortarse o
                  // desbordar horizontalmente en pantallas angostas.
                  overflowWrap="anywhere"
                >
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text
                  fontSize={{ base: "13px", sm: "sm" }}
                  color="whiteAlpha.900"
                  fontWeight="500"
                  letterSpacing="wide"
                  lineHeight="1.45"
                  maxW="100%"
                  overflowWrap="anywhere"
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
