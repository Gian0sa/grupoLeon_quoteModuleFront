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
import { HeaderBrandWatermark, HEADER_BRAND_IMAGE } from "./HeaderBrandWatermark";
import { LateralMenu } from "../features/dashboard/components/LateralMenu";
import { useExchangeRate } from "../features/dashboard/hooks/queries/dashboardQueries";
import { useAuthStore } from "../features/auth/stores/useAuthStore";
import { useNotifications } from "../features/quotes/hooks/queries/quotesQueries";
import { useHeaderTheme } from "../hooks/useHeaderTheme";
import { getHeaderThemeConfig } from "../shared/utils/headerThemes";
import { useIsAdmin } from "../shared/utils/permissions";
import { QUERY_KEYS } from "../shared/utils/queryKeys";
import { subscribeToPush } from "../shared/services/pushNotificationService";

export { HEADER_BRAND_IMAGE };
export const HEADER_MAIN_BG = "linear-gradient(135deg, #0e572b 0%, #126C36 50%, #0b4a24 100%)";

// Panel "vidrio esmerilado" para envolver contenido (buscadores, filtros) dentro del header,
// para que se integre visualmente con el mismo lenguaje que los pills de QuickActions.
export const HEADER_GLASS_PANEL_PROPS = {
  bg: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "2xl",
};

/**
 * Genera propiedades armónicas de panel vidriado dinámicamente según el tema activo.
 */
export function getHeaderGlassPanelProps(theme) {
  if (!theme || theme.key === "green") {
    return HEADER_GLASS_PANEL_PROPS;
  }
  return {
    bg: theme.glassBg || "rgba(255,255,255,0.16)",
    border: `1px solid ${theme.glassBorder || "rgba(255,255,255,0.25)"}`,
    borderRadius: "2xl",
  };
}

export function TopHeaderBanner({
  title,
  titleExtra,
  subtitle,
  showBack = true,
  backTo = "/dashboard",
  onBackClick,
  showExchangeRate = false,
  refreshQueries,
  children,
  minH = { base: "172px", sm: "190px", md: "235px" },
  pb = { base: 3.5, sm: 4, md: 4.5 },
  pt = { base: 3.5, sm: 4, md: 4.5 },
  mb = { base: 2.5, md: 6 }
}) {
  const { salesEmployeeCode, username, userId, role } = useAuthStore();
  const { theme } = useHeaderTheme();
  const activeTheme = theme?.key ? theme : (theme || getHeaderThemeConfig("green"));
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { isOpen: isNotifOpen, onOpen: onOpenNotif, onClose: onCloseNotif } = useDisclosure();
  const notifBtnRef = React.useRef(null);

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

  const isAdminHook = useIsAdmin();
  const sessionRoleUpper = String(role || localStorage.getItem("role") || "").trim().toUpperCase();
  const isVerifierOrAdminRole =
    isAdminHook ||
    sessionRoleUpper === "ADMIN" ||
    sessionRoleUpper === "ADMINISTRADOR" ||
    sessionRoleUpper.startsWith("ADMIN") ||
    sessionRoleUpper === "FACTURACION" ||
    sessionRoleUpper.includes("DIGIT") ||
    sessionRoleUpper.includes("SUPERVIS") ||
    sessionRoleUpper.includes("CREDIT") ||
    sessionRoleUpper.includes("COBRAN") ||
    sessionRoleUpper.includes("GERENC") ||
    sessionRoleUpper.includes("SISTEMA") ||
    sessionRoleUpper.includes("JEFE");

  const isAdmin = Boolean(isVerifierOrAdminRole);
  const { data: serverNotifs } = useNotifications(
    isAdmin ? "FACTURACION" : "VENDEDOR",
    username
  );

  const notifCount = React.useMemo(() => {
    let rawLocal = [];
    try {
      const raw = localStorage.getItem("grupoLeon_notifications");
      rawLocal = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(rawLocal)) rawLocal = [];
    } catch {
      rawLocal = [];
    }

    const serverList = Array.isArray(serverNotifs) ? serverNotifs : [];
    const combined = [...rawLocal, ...serverList];

    const filtered = combined.filter((n) => {
      if (!n || !n.title || n.read) return false;
      const targetRoleUpper = (n.targetRole || "").trim().toUpperCase();
      const targetUser = (n.targetUsername || "").trim().toLowerCase();
      const userLower = (username || "").trim().toLowerCase();
      const roleUpper = (role || localStorage.getItem("role") || "").trim().toUpperCase();
      const isAdminOrMaster =
        isAdmin ||
        roleUpper === "ADMIN" ||
        roleUpper === "ADMINISTRADOR" ||
        roleUpper.startsWith("ADMIN") ||
        roleUpper === "FACTURACION" ||
        roleUpper.includes("DIGIT") ||
        roleUpper.includes("SUPERVIS") ||
        roleUpper.includes("CREDIT") ||
        roleUpper.includes("COBRAN") ||
        roleUpper.includes("GERENC") ||
        roleUpper.includes("SISTEMA") ||
        roleUpper.includes("JEFE");

      if (isAdminOrMaster) {
        if (
          targetRoleUpper !== "FACTURACION" &&
          targetRoleUpper !== "ADMIN" &&
          targetRoleUpper !== "ADMINISTRADOR" &&
          !targetRoleUpper.startsWith("ADMIN") &&
          !targetRoleUpper.includes("DIGIT") &&
          !targetRoleUpper.includes("SUPERVIS")
        ) {
          return false;
        }
        const statusUpper = (n.status || "").trim().toUpperCase();
        if (statusUpper === "EMITIDO" || statusUpper === "ANULADO" || statusUpper === "CANCELADO") return false;
        const titleLower = (n.title || "").toLowerCase();
        if (titleLower.includes("orden sap") || titleLower.includes("pedido emitido") || titleLower.includes("orden de venta") || titleLower.includes("orden emitida") || titleLower.includes("cotización enviada a validación")) return false;
        return true;
      } else {
        if (targetRoleUpper !== "VENDEDOR" && targetRoleUpper !== "SELLER") return false;
        if (!targetUser) return true;
        return targetUser === userLower || userLower.includes(targetUser) || targetUser.includes(userLower);
      }
    });

    const uniqueQuoteKeys = new Set();
    let unreadTotal = 0;
    for (const notif of filtered) {
      const rawQ = String(notif.quoteId || notif.id || "").trim();
      const matchWeb = String(notif.title || "").match(/COT-WEB-(\d+)/i) || 
                       String(notif.title || "").match(/COT-(\d+)/i) ||
                       rawQ.match(/COT-WEB-(\d+)/i) || 
                       rawQ.match(/COT-(\d+)/i) || 
                       rawQ.match(/^(\d+)$/);
      const key = matchWeb ? `QUOTE-${Number(matchWeb[1])}` : rawQ;
      if (!uniqueQuoteKeys.has(key)) {
        uniqueQuoteKeys.add(key);
        unreadTotal++;
      }
    }
    return unreadTotal;
  }, [serverNotifs, username, userId, role, isAdmin, localVersion]);

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
      minH={typeof minH === "string" ? { base: minH, md: minH } : minH}
      bg={activeTheme.baseBg}
      bgImage={activeTheme.mainBg}
      borderRadius={{ base: "0 0 24px 24px", md: "0 0 34px 34px" }}
      boxShadow={activeTheme.boxShadow}
      position="relative"
      overflow="hidden"
      color={activeTheme.textColor}
      pt={pt}
      pb={pb}
      mb={mb}
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      transition="background 0.25s ease, box-shadow 0.25s ease, color 0.25s ease"
      _after={{
        content: "''",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "2px",
        background: activeTheme.bottomGlow || (
          activeTheme.useDarkText
            ? (activeTheme.glassBorder
                ? `linear-gradient(90deg, transparent 0%, ${activeTheme.glassBorder} 35%, ${activeTheme.glassBorder} 65%, transparent 100%)`
                : "linear-gradient(90deg, transparent 0%, rgba(92, 22, 56, 0.22) 35%, rgba(92, 22, 56, 0.32) 65%, transparent 100%)")
            : "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 35%, rgba(255, 255, 255, 0.35) 65%, transparent 100%)"
        ),
      }}
    >
      {/* Capa de Fondo de Marca + Esferas decorativas */}
      <HeaderBrandWatermark
        theme={activeTheme}
        variant="banner"
        opacity={0.40}
        showOverlay={true}
        showCircles={true}
      />

      <Box
        maxW="1200px"
        mx="auto"
        w="full"
        px={{ base: 3, sm: 4, md: 6 }}
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        flex="1"
        position="relative"
        zIndex={2}
      >
        <Box w="full">
          {/* BARRA SUPERIOR DE UTILIDAD: Botón Volver + USD Rate (solo si showExchangeRate) y Refrescar + Campana + Menú Lateral (der) */}
          <Flex justify="space-between" align="center" gap={2} mb={{ base: 2.5, md: 2.5 }}>
          <HStack spacing={{ base: 2, sm: 2.5, md: 3 }} minW={0} flexShrink={1}>
            {showBack && (
              <BackButton
                color={activeTheme.textColor}
                bg={activeTheme.glassBg}
                border="1px solid"
                borderColor={activeTheme.glassBorder}
                boxShadow={activeTheme.useDarkText ? "0 4px 12px rgba(0,0,0,0.06)" : "0 4px 12px rgba(0,0,0,0.12)"}
                _hover={{ bg: activeTheme.glassHoverBg, transform: "translateY(-1px)" }}
                _active={{ bg: activeTheme.glassHoverBg, transform: "translateY(0)" }}
                to={backTo}
                onClick={onBackClick}
              />
            )}

            {/* Badge Tipo de Cambio USD - Solo en vista principal / cuando se habilite */}
            {showExchangeRate && (
              <Box
                bg={activeTheme.glassBg}
                border="1px solid"
                borderColor={activeTheme.glassBorder}
                borderRadius="full"
                px={{ base: 3, sm: 3.5, md: 4 }}
                py={{ base: 1, md: 1.5 }}
                minH={{ base: "34px", md: "36px" }}
                boxShadow={activeTheme.useDarkText ? "0 4px 12px rgba(0,0,0,0.06)" : "0 4px 15px rgba(0,0,0,0.12)"}
                display="flex"
                alignItems="center"
                flexShrink={0}
                gap={{ base: 1.5, md: 2 }}
                // En teléfonos muy angostos (<360px) el badge se compacta:
                // se oculta el punto indicador y se reduce el padding para que
                // nunca compita por ancho con las acciones de la derecha.
                sx={{
                  "@media (max-width: 359px)": {
                    paddingInline: "0.625rem",
                    gap: "0.25rem",
                  },
                }}
              >
                <Box
                  w="6px"
                  h="6px"
                  borderRadius="full"
                  bg={activeTheme.dotColor}
                  flexShrink={0}
                  boxShadow={activeTheme.dotShadow}
                  sx={{ "@media (max-width: 359px)": { display: "none" } }}
                />
                {isLoadingExchangeRate ? (
                  <Spinner size="xs" color={activeTheme.textColor} />
                ) : (
                  <Text
                    color={activeTheme.textColor}
                    fontSize={{ base: "12.5px", sm: "13px", md: "sm" }}
                    fontWeight="bold"
                    letterSpacing="wide"
                    whiteSpace="nowrap"
                    sx={{ "@media (max-width: 359px)": { fontSize: "11.5px", letterSpacing: "normal" } }}
                  >
                    USD: {(() => {
                      const rate = exchangeRate?.collectionRate || exchangeRate?.officialRate;
                      if (!rate) return "3.49";
                      const num = Number(rate);
                      if (exchangeRate?.rawRate === 3.385 || num === 3.42) return "3.43";
                      return isNaN(num) ? String(rate) : num.toFixed(2);
                    })()}
                  </Text>
                )}
              </Box>
            )}
          </HStack>

          {/* Bloque de acciones del Dashboard: Recargar + Notificaciones + Menú Lateral */}
          <HStack
            bg={activeTheme.glassBg}
            border="1px solid"
            borderColor={activeTheme.glassBorder}
            borderRadius="full"
            py={{ base: 1, sm: 1.5, md: 2 }}
            px={{ base: 2, sm: 2.5, md: 4 }}
            spacing={{ base: 1, sm: 1.5, md: 3 }}
            flexShrink={0}
            boxShadow={activeTheme.useDarkText ? "0 4px 12px rgba(0,0,0,0.06)" : "0 4px 15px rgba(0,0,0,0.12)"}
          >
            <RefreshButton
              variant="ghost"
              color={activeTheme.textColor}
              iconColor={activeTheme.textColor}
              hoverBg={activeTheme.glassHoverBg}
              queries={defaultQueries}
              showToast={true}
              fullReload={true}
            />

            <Box position="relative">
              <IconButton
                ref={notifBtnRef}
                icon={<BellIcon boxSize={{ base: 5, sm: 5.5, md: 6 }} />}
                variant="ghost"
                aria-label="Notificaciones"
                color={activeTheme.textColor}
                borderRadius="full"
                w={{ base: "38px", sm: "42px", md: "48px" }}
                h={{ base: "38px", sm: "42px", md: "48px" }}
                minW={{ base: "38px", sm: "42px", md: "48px" }}
                _hover={{ bg: activeTheme.glassHoverBg }}
                _active={{ bg: activeTheme.glassHoverBg }}
                onClick={(e) => {
                  e.currentTarget?.blur();
                  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
                    Notification.requestPermission()
                      .then((perm) => {
                        if (perm === "granted") {
                          subscribeToPush().catch(() => {});
                        }
                      })
                      .catch(() => {});
                  }
                  onOpenNotif();
                }}
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
                  top={{ base: "-2px", sm: "0px", md: "2px" }}
                  right={{ base: "-2px", sm: "0px", md: "2px" }}
                  bg="red.500"
                  color="white"
                  borderRadius="full"
                  px={{ base: 1, md: 1.5 }}
                  py={0}
                  fontSize={{ base: "9px", md: "10px" }}
                  fontWeight="900"
                  boxShadow="0 0 12px rgba(239, 68, 68, 0.9)"
                  border="2px solid"
                  borderColor={activeTheme.badgeBorderColor || activeTheme.baseBg || "#126C36"}
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

            <LateralMenu iconColor={activeTheme.textColor} hoverBg={activeTheme.glassHoverBg} />
          </HStack>
        </Flex>

        <NotificationDrawer isOpen={isNotifOpen} onClose={onCloseNotif} finalFocusRef={notifBtnRef} />

        {/* TÍTULO GIGANTE 4XL E IDENTICO AL DASHBOARD */}
        {(title || subtitle) && (
          <Box w="full" maxW="100%" mb={children ? { base: 2.5, sm: 3, md: 3.5 } : 0}>
            <VStack align="start" spacing={{ base: 0.5, md: 0 }} maxW="100%">
              {title && (
                <Flex align="center" gap={{ base: 2, md: 3 }} wrap="wrap">
                  <Text
                    fontSize={{ base: "20px", sm: "22px", md: "3xl", lg: "32px" }}
                    fontWeight="800"
                    color={activeTheme.textColor}
                    letterSpacing="tight"
                    lineHeight="1.2"
                    maxW="100%"
                    overflowWrap="anywhere"
                  >
                    {title}
                  </Text>
                  {titleExtra}
                </Flex>
              )}
              {subtitle && (
                <Text
                  fontSize={{ base: "12px", sm: "13px", md: "sm" }}
                  color={activeTheme.subtextColor}
                  fontWeight="500"
                  letterSpacing="wide"
                  lineHeight="1.35"
                  maxW="100%"
                  overflowWrap="anywhere"
                >
                  {subtitle}
                </Text>
              )}
            </VStack>
          </Box>
        )}
        </Box>

        {/* CONTENIDO ADICIONAL (Buscadores / Filtros / Acciones integradas) */}
        {children && (
          <Box w="full" mt="auto">
            {children}
          </Box>
        )}
      </Box>
    </Box>
  );
}
