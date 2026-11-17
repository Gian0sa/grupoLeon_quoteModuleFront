import React, { useRef, useMemo, useCallback } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  IconButton,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  Icon,
  Flex,
  Badge,
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons';
import {
  MdRequestQuote,
  MdPersonAdd,
  MdPerson,
  MdPeople,
  MdLocalShipping,
  MdAccountBalanceWallet,
  MdPriceChange,
  MdInventory2,
  MdFileUpload,
  MdLocationOn,
  MdMap,
  MdHelp,
  MdAssignment,
  MdSupport,
  MdExitToApp,
  MdAccessTime,
  MdChevronRight,
} from "react-icons/md";

import { useDisclosure } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '../../auth/stores/useAuthStore';
import { useHasAccess } from '../../../shared/utils/permissions';
import { useAuthMutations } from '../../auth/hooks/mutations/authMutations';
import { useHeaderTheme } from '../../../hooks/useHeaderTheme';
import { HeaderBrandWatermark } from '../../../components/HeaderBrandWatermark';

// Opciones estáticas fuera del componente para evitar recreación de memoria en cada render
const APPLICATION_OPTIONS = [
  { label: 'Gestión de Cotizaciones', icon: MdRequestQuote, path: '/historyquotes', access: 'GET:/quotes' },
  { label: 'Órdenes de Venta', icon: MdLocalShipping, path: '/reports', access: 'GET:/reports' },
  { label: 'Cuentas por cobrar', icon: MdAccountBalanceWallet, path: '/receivable', access: 'GET:/accountsReceivable' },
  { label: 'Lista de precios', icon: MdPriceChange, path: '/productsPriceList', access: 'GET:/priceList' },
  { label: 'Catálogo de productos', icon: MdInventory2, path: '/catalog', access: 'GET:/catalogProducts' },
  { label: 'Importaciones', icon: MdFileUpload, path: '/importaciones', access: 'GET:/purchaseOrdersImportacion' },
  { label: 'Registro de visitas', icon: MdLocationOn, path: '/visitLog', access: 'POST:/visit-logs' },
  { label: 'Mapa de visitas', icon: MdMap, path: '/visitMap', access: 'GET:/visit-logs' },
  { label: 'Mis visitas', icon: MdMap, path: '/myVisits', access: 'POST:/visit-logs' },
  { label: 'Clientes nuevos', icon: MdPersonAdd, path: '/newClients', access: 'POST:/visit-logs' },
  { label: 'Control de asistencia', icon: MdAccessTime, path: '/entrada', access: 'POST:/attendance' }
];

const ACCOUNT_OPTIONS = [
  { label: 'Actualizar perfil', icon: MdPerson, path: '/profile' },
  { label: 'Preguntas frecuentes', icon: MdHelp, path: '/faq' },
  { label: 'Asistencia técnica', icon: MdSupport, path: 'https://wa.me/51921372398', external: true }
];

const ADMIN_OPTIONS = [
  { label: 'Gestión de Usuarios', icon: MdPerson, path: '/profileAdmin', access: 'PUT:/profile/admin/:userId' },
  { label: 'Usuarios en línea', icon: MdPeople, path: '/admin/online-users', access: 'GET:/presence/users' },
  { label: 'Actualizar servicios', icon: MdHelp, path: '#', access: 'PUT:/services/:id' },
  // ⚠️ No usar GET:/notifications ni GET:/attendance aquí: vienen en los presets de Vendedor/Supervisor
  { label: 'Gestionar Notificaciones', icon: MdAssignment, path: '/notification', access: 'PUT:/profile/admin/:userId' },
  { label: 'Control de Asistencias (Admin)', icon: MdAccessTime, path: '/admin/attendance', access: 'PUT:/profile/admin/:userId' }
];

// Componente de fila ultra ligero y memoizado para garantizar 60 FPS al abrir y hacer scroll
const MenuItemRow = React.memo(function MenuItemRow({
  label,
  icon: IconComponent,
  isActive,
  accentColor = "green",
  customIconBg,
  customIconColor,
  activeBg,
  activeColor = "white",
  activeShadow = "0 4px 14px rgba(18, 108, 54, 0.25)",
  activeHoverBg = "#0e572b",
  activeIconBg = "whiteAlpha.300",
  activeChevronColor = "whiteAlpha.800",
  onClick
}) {
  return (
    <Flex
      as="button"
      type="button"
      align="center"
      justify="space-between"
      w="full"
      h="44px"
      px={2.5}
      borderRadius="xl"
      bg={isActive ? activeBg : "transparent"}
      color={isActive ? activeColor : "gray.700"}
      boxShadow={isActive ? activeShadow : "none"}
      cursor="pointer"
      transition="background 0.12s ease, transform 0.08s ease"
      _hover={{
        bg: isActive ? activeBg : "gray.100",
        color: isActive ? activeColor : "gray.900"
      }}
      _active={{
        transform: "scale(0.98)",
        bg: isActive ? activeHoverBg : "gray.200"
      }}
      outline="none"
      onClick={onClick}
      sx={{
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        userSelect: "none"
      }}
    >
      <HStack spacing={3} minW={0} flex={1}>
        <Flex
          w="32px"
          h="32px"
          align="center"
          justify="center"
          borderRadius="lg"
          bg={isActive ? activeIconBg : (customIconBg || `${accentColor}.50`)}
          color={isActive ? activeColor : (customIconColor || `${accentColor}.600`)}
          flexShrink={0}
        >
          <Icon as={IconComponent} boxSize={4} />
        </Flex>
        <Text
          fontWeight={isActive ? "700" : "500"}
          fontSize="14px"
          noOfLines={1}
          textAlign="left"
        >
          {label}
        </Text>
      </HStack>
      <Icon
        as={MdChevronRight}
        color={isActive ? activeChevronColor : "gray.400"}
        boxSize={4}
        flexShrink={0}
      />
    </Flex>
  );
});

const SectionLabel = React.memo(function SectionLabel({ children, icon, color = "gray" }) {
  const resolvedColor = color && (color.startsWith("#") || color.startsWith("rgb")) ? color : `${color}.400`;
  return (
    <HStack spacing={2} px={2} mb={2} mt={1}>
      {icon && (
        <Box w="18px" h="3px" borderRadius="full" bg={resolvedColor} />
      )}
      <Text
        fontSize="10px"
        fontWeight="800"
        color={resolvedColor}
        letterSpacing="widest"
        textTransform="uppercase"
      >
        {children}
      </Text>
      <Box flex="1" h="1px" bg="gray.100" />
    </HStack>
  );
});

export function LateralMenu({ iconColor = "white", hoverBg }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const { username, role } = useAuthStore();
  const { logout } = useAuthMutations();
  const { theme } = useHeaderTheme();

  const isGreen = !theme?.key || theme.key === "green";
  const appAccentColor = isGreen ? "green" : (theme?.accentColorScheme || "green");
  const appIconBg = isGreen ? undefined : theme?.accentLightBg;
  const appIconColor = isGreen ? undefined : theme?.accentTextColor;

  // Cerrar menú automáticamente al cambiar de página
  React.useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  const hasAccess = useHasAccess();
  const hasAdminAccess = hasAccess("PUT:/profile/admin/:userId");

  // Etiqueta oficial de rol priorizando el cargo asignado en la cuenta del usuario
  const userRoleLabel = useMemo(() => {
    // Si posee permiso maestro de administración de usuarios o endpoint admin, siempre es Administrador
    if (hasAdminAccess || hasAccess("PUT:/profile/admin/:userId") || hasAccess("PUT /profile/admin/:userId")) {
      return "Administrador";
    }

    const norm = String(role || "").toUpperCase().trim();
    if (norm === "ADMINISTRADOR" || norm === "ADMIN") {
      return "Administrador";
    }
    if (norm === "FACTURACION" || norm === "CREDITOS") {
      return "Facturación y Créditos";
    }
    if (norm === "SUPERVISOR") {
      return "Supervisor Comercial";
    }
    if (norm === "ALMACEN" || norm === "LOGISTICA") {
      return "Logística / Despacho";
    }
    if (norm === "ASESOR_VENTAS" || norm === "VENDEDOR" || norm === "ASESOR") {
      return "Asesor de Ventas";
    }

    // Fallback inteligente para sesiones previas sin migrar
    if (hasAccess("GET:/AdminQuotesSellers/:slpCode/:month") || (hasAccess("GET:/sellers") && hasAccess("GET:/visit-logs"))) {
      return "Supervisor Comercial";
    }
    if (hasAccess("POST:/quotes/approval") || hasAccess("POST /quotes/approval")) {
      return "Facturación y Créditos";
    }
    return "Asesor de Ventas";
  }, [role, hasAccess, hasAdminAccess]);

  const handleLogout = useCallback(() => {
    logout.mutate();
  }, [logout]);

  // Filtrado memoizado para evitar recalcular permisos en cada cuadro de animación
  const filteredAppOptions = useMemo(
    () => APPLICATION_OPTIONS.filter(({ access }) => !access || hasAccess(access)),
    [hasAccess]
  );

  const filteredAdminOptions = useMemo(
    () => ADMIN_OPTIONS.filter(({ access }) => !access || hasAccess(access)),
    [hasAccess]
  );

  const handleItemClick = useCallback((path, external) => {
    onClose();
    if (external) {
      window.open(path, '_blank');
    } else {
      // Uso de requestAnimationFrame para asegurar que el drawer comience su cierre sin congelar la navegación
      requestAnimationFrame(() => {
        navigate(path);
      });
    }
  }, [navigate, onClose]);

  const activeRowThemeProps = useMemo(
    () => ({
      activeBg: theme.activeMenuBg || theme.mainBg,
      activeColor: theme.textColor,
      activeShadow: theme.menuActiveShadow,
      activeHoverBg: theme.activeMenuHoverBg,
      activeIconBg: theme.useDarkText ? "rgba(92, 22, 56, 0.14)" : "whiteAlpha.300",
      activeChevronColor: theme.useDarkText ? theme.subtextColor : "whiteAlpha.800",
    }),
    [theme]
  );

  return (
    <>
      <IconButton
        ref={btnRef}
        icon={<HamburgerIcon boxSize={{ base: 4, sm: 5, md: 6 }} color={iconColor} />}
        variant="ghost"
        borderRadius="full"
        w={{ base: "30px", sm: "38px", md: "48px" }}
        h={{ base: "30px", sm: "38px", md: "48px" }}
        minW={{ base: "30px", sm: "38px", md: "48px" }}
        _hover={{ bg: hoverBg || "whiteAlpha.300" }}
        _active={{ bg: hoverBg || "whiteAlpha.400" }}
        onClick={(e) => {
          e.currentTarget?.blur();
          onOpen();
        }}
        aria-label="Abrir menú"
        sx={{
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation"
        }}
      />

      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        finalFocusRef={btnRef}
        blockScrollOnMount={false}
        preserveScrollBarGap={false}
      >
        <DrawerOverlay
          bg="blackAlpha.600"
          transition="opacity 0.2s ease"
        />
        <DrawerContent
          bg="white"
          maxW="340px"
          h="100%"
          maxH="100vh"
          display="flex"
          flexDirection="column"
          borderLeftRadius="2xl"
          boxShadow="-8px 0 40px rgba(0,0,0,0.12)"
          overflow="hidden"
          sx={{
            willChange: "transform",
            transform: "translate3d(0, 0, 0)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {/* Header con perfil integrado optimizado para GPU */}
          <DrawerHeader p={0} flexShrink={0}>
            <Box
              bg={theme.baseBg}
              bgImage={theme.mainBg}
              boxShadow={theme.drawerBoxShadow || theme.boxShadow}
              px={5}
              pt={5}
              pb={6}
              position="relative"
              overflow="hidden"
              borderBottomRadius="3xl"
              sx={{
                contain: "paint",
                willChange: "transform",
                transform: "translateZ(0)"
              }}
            >
              {/* Capa de Marca de Agua + Esferas decorativas */}
              <HeaderBrandWatermark
                theme={theme}
                variant="drawer"
                opacity={0.35}
                showCircles={true}
              />

              {/* Botón Cerrar */}
              <IconButton
                icon={<CloseIcon boxSize={3} color={theme.textColor} />}
                variant="ghost"
                size="sm"
                borderRadius="full"
                position="absolute"
                top={3}
                right={3}
                zIndex={2}
                _hover={{ bg: theme.glassHoverBg || "whiteAlpha.300" }}
                onClick={onClose}
                aria-label="Cerrar menú"
                sx={{
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation"
                }}
              />

              {/* Avatar + Info de Usuario */}
              <HStack spacing={4} align="center" position="relative" zIndex={1}>
                <Box
                  w="56px"
                  h="56px"
                  borderRadius="full"
                  bg="white"
                  p="3px"
                  boxShadow="0 4px 15px rgba(0,0,0,0.15)"
                  flexShrink={0}
                >
                  <Flex
                    w="100%"
                    h="100%"
                    borderRadius="full"
                    bg={theme.avatarBg}
                    align="center"
                    justify="center"
                    overflow="hidden"
                  >
                    <Icon as={MdPerson} color={theme.avatarIconColor} boxSize={8} />
                  </Flex>
                </Box>
                <VStack align="start" spacing={0.5} overflow="hidden">
                  <Text
                    color={theme.textColor}
                    fontWeight="800"
                    fontSize="16px"
                    noOfLines={1}
                    lineHeight="1.2"
                  >
                    {username || 'Usuario'}
                  </Text>
                  <Badge
                    bg={theme.badgeBg || theme.glassBg}
                    color={theme.textColor}
                    fontSize="10px"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    letterSpacing="wider"
                    textTransform="uppercase"
                  >
                    {userRoleLabel}
                  </Badge>
                </VStack>
              </HStack>
            </Box>
          </DrawerHeader>

          {/* Cuerpo del menú con scroll fluido a 60 FPS */}
          <DrawerBody
            px={3}
            py={3}
            flex="1"
            overflowY="auto"
            overscrollBehavior="contain"
            sx={{
              WebkitOverflowScrolling: "touch",
              willChange: "scroll-position",
              contain: "content",
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": { bg: "gray.200", borderRadius: "full" },
            }}
          >
            <VStack spacing={4} align="stretch" pb={2}>
              {/* SECCIÓN 1: Aplicación */}
              <Box>
                <SectionLabel icon color={appAccentColor}>Aplicación</SectionLabel>
                <VStack spacing={1} align="stretch">
                  {filteredAppOptions.map((opt) => (
                    <MenuItemRow
                      key={opt.path + opt.label}
                      label={opt.label}
                      icon={opt.icon}
                      path={opt.path}
                      external={opt.external}
                      isActive={!opt.external && location.pathname === opt.path}
                      accentColor={appAccentColor}
                      customIconBg={appIconBg}
                      customIconColor={appIconColor}
                      {...activeRowThemeProps}
                      onClick={() => handleItemClick(opt.path, opt.external)}
                    />
                  ))}
                </VStack>
              </Box>

              {/* SECCIÓN 2: Cuenta */}
              <Box>
                <SectionLabel icon color="blue">Cuenta</SectionLabel>
                <VStack spacing={1} align="stretch">
                  {ACCOUNT_OPTIONS.map((opt) => (
                    <MenuItemRow
                      key={opt.path + opt.label}
                      label={opt.label}
                      icon={opt.icon}
                      path={opt.path}
                      external={opt.external}
                      isActive={!opt.external && location.pathname === opt.path}
                      accentColor="blue"
                      {...activeRowThemeProps}
                      onClick={() => handleItemClick(opt.path, opt.external)}
                    />
                  ))}
                </VStack>
              </Box>

              {/* SECCIÓN 3: Administración */}
              {filteredAdminOptions.length > 0 && (
                <Box>
                  <SectionLabel icon color="purple">Administración</SectionLabel>
                  <VStack spacing={1} align="stretch">
                    {filteredAdminOptions.map((opt) => (
                      <MenuItemRow
                        key={opt.path + opt.label}
                        label={opt.label}
                        icon={opt.icon}
                        path={opt.path}
                        external={opt.external}
                        isActive={!opt.external && location.pathname === opt.path}
                        accentColor="purple"
                        {...activeRowThemeProps}
                        onClick={() => handleItemClick(opt.path, opt.external)}
                      />
                    ))}
                  </VStack>
                </Box>
              )}
            </VStack>
          </DrawerBody>

          {/* Footer con Botón de Cerrar Sesión fijo */}
          <DrawerFooter
            borderTop="1px solid"
            borderColor="gray.100"
            p={4}
            pb="calc(14px + env(safe-area-inset-bottom, 0px))"
            flexShrink={0}
            bg="white"
            zIndex={10}
            boxShadow="0 -4px 16px rgba(0,0,0,0.05)"
          >
            <Button
              bg="linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ef4444 100%)"
              color="white"
              w="full"
              h="48px"
              borderRadius="xl"
              fontWeight="700"
              fontSize="14px"
              leftIcon={<Icon as={MdExitToApp} boxSize={5} />}
              onClick={handleLogout}
              boxShadow="0 4px 14px rgba(220, 38, 38, 0.25)"
              _hover={{ bg: "#991b1b" }}
              _focus={{ boxShadow: "none", outline: "none" }}
              _focusVisible={{ boxShadow: "none", outline: "none" }}
              _active={{ transform: "scale(0.98)", bg: "#7f1d1d" }}
              outline="none"
              sx={{
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation"
              }}
            >
              Cerrar sesión
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
