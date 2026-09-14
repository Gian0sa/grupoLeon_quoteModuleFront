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
  MdAssignmentTurnedIn,
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
import { HEADER_MAIN_BG } from '../../../components/TopHeaderBanner';

// Opciones estáticas fuera del componente para evitar recreación de memoria en cada render
const APPLICATION_OPTIONS = [
  { label: 'Gestión de Cotizaciones', icon: MdRequestQuote, path: '/historyquotes', access: 'POST:/quotations' },
  { label: 'Solicitudes', icon: MdAssignmentTurnedIn, path: '#', access: 'GET:/requests' },
  { label: 'Pedidos', icon: MdLocalShipping, path: '/reports', access: 'GET:/reports' },
  { label: 'Cuentas por cobrar', icon: MdAccountBalanceWallet, path: '/receivable', access: 'GET:/receivable' },
  { label: 'Lista de precios', icon: MdPriceChange, path: '/productsPriceList', access: 'GET:/priceList' },
  { label: 'Catálogo de productos', icon: MdInventory2, path: '/catalog', access: 'GET:/catalogProducts' },
  { label: 'Importaciones', icon: MdFileUpload, path: '/importaciones', access: 'GET:/purchaseOrdersImportacion' },
  { label: 'Registro de visitas', icon: MdLocationOn, path: '/visitLog', access: 'POST:/visit-logs' },
  { label: 'Mapa de visitas', icon: MdMap, path: '/visitMap', access: 'GET:/visit-logs' },
  { label: 'Mis visitas', icon: MdMap, path: '/myVisits', access: 'POST:/visit-logs' },
  { label: 'Clientes nuevos', icon: MdPersonAdd, path: '/newClients', access: 'POST:/visit-logs' },
  { label: 'Control de asistencia', icon: MdAccessTime, path: '/entrada', access: 'POST:/visit-logs' }
];

const ACCOUNT_OPTIONS = [
  { label: 'Actualizar perfil', icon: MdPerson, path: '/profile' },
  { label: 'Preguntas frecuentes', icon: MdHelp, path: '/faq' },
  { label: 'Asistencia técnica', icon: MdSupport, path: 'https://wa.me/51921372398', external: true }
];

const ADMIN_OPTIONS = [
  { label: 'Gestión de Usuarios', icon: MdPerson, path: '/profileAdmin', access: 'PUT:/profile/admin/:userId' },
  { label: 'Actualizar servicios', icon: MdHelp, path: '#', access: 'PUT:/services/:id' },
  { label: 'Gestionar Notificaciones', icon: MdAssignment, path: '/notification', access: 'PUT:/profile/admin/:userId' },
  { label: 'Control de Asistencias (Admin)', icon: MdAccessTime, path: '/admin/attendance', access: 'PUT:/profile/admin/:userId' }
];

// Componente de fila ultra ligero y memoizado para garantizar 60 FPS al abrir y hacer scroll
const MenuItemRow = React.memo(function MenuItemRow({
  label,
  icon: IconComponent,
  isActive,
  accentColor = "green",
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
      bg={isActive ? HEADER_MAIN_BG : "transparent"}
      color={isActive ? "white" : "gray.700"}
      boxShadow={isActive ? "0 4px 14px rgba(18, 108, 54, 0.25)" : "none"}
      cursor="pointer"
      transition="background 0.12s ease, transform 0.08s ease"
      _hover={{
        bg: isActive ? HEADER_MAIN_BG : "gray.100",
        color: isActive ? "white" : "gray.900"
      }}
      _active={{
        transform: "scale(0.98)",
        bg: isActive ? "#0e572b" : "gray.200"
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
          bg={isActive ? "whiteAlpha.300" : `${accentColor}.50`}
          color={isActive ? "white" : `${accentColor}.600`}
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
        color={isActive ? "whiteAlpha.800" : "gray.400"}
        boxSize={4}
        flexShrink={0}
      />
    </Flex>
  );
});

const SectionLabel = React.memo(function SectionLabel({ children, icon, color = "gray" }) {
  return (
    <HStack spacing={2} px={2} mb={2} mt={1}>
      {icon && (
        <Box w="18px" h="3px" borderRadius="full" bg={`${color}.400`} />
      )}
      <Text
        fontSize="10px"
        fontWeight="800"
        color={`${color}.400`}
        letterSpacing="widest"
        textTransform="uppercase"
      >
        {children}
      </Text>
      <Box flex="1" h="1px" bg="gray.100" />
    </HStack>
  );
});

export function LateralMenu() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const { username } = useAuthStore();
  const { logout } = useAuthMutations();

  // Cerrar menú automáticamente al cambiar de página
  React.useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  const hasAccess = useHasAccess();
  const hasAdminAccess = hasAccess("PUT:/profile/admin/:userId");

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

  return (
    <>
      <IconButton
        ref={btnRef}
        icon={<HamburgerIcon boxSize={{ base: 5, md: 6 }} color="white" />}
        variant="ghost"
        borderRadius="full"
        w={{ base: "42px", md: "48px" }}
        h={{ base: "42px", md: "48px" }}
        _hover={{ bg: "whiteAlpha.300" }}
        _active={{ bg: "whiteAlpha.400" }}
        onClick={onOpen}
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
        autoFocus={false}
        returnFocusOnClose={false}
        trapFocus={false}
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
              bg="#126C36"
              boxShadow="0 6px 20px rgba(18, 108, 54, 0.3)"
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
              {/* Capa de Imagen de Fondo de Marca */}
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                bgImage="url('/assets/header-brand-bg.png')"
                bgPosition="center center"
                bgSize="cover"
                bgRepeat="no-repeat"
                opacity={0.35}
                pointerEvents="none"
              />

              {/* Decoraciones en verde #278847 */}
              <Box
                position="absolute"
                top="-30px"
                right="-30px"
                w="130px"
                h="130px"
                borderRadius="full"
                bg="#278847"
                opacity={0.7}
                pointerEvents="none"
              />
              <Box
                position="absolute"
                bottom="-15px"
                left="-15px"
                w="70px"
                h="70px"
                borderRadius="full"
                bg="#278847"
                opacity={0.4}
                pointerEvents="none"
              />

              {/* Botón Cerrar */}
              <IconButton
                icon={<CloseIcon boxSize={3} color="white" />}
                variant="ghost"
                size="sm"
                borderRadius="full"
                position="absolute"
                top={3}
                right={3}
                zIndex={2}
                _hover={{ bg: "whiteAlpha.300" }}
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
                    bg="green.100"
                    align="center"
                    justify="center"
                    overflow="hidden"
                  >
                    <Icon as={MdPerson} color="green.700" boxSize={8} />
                  </Flex>
                </Box>
                <VStack align="start" spacing={0.5} overflow="hidden">
                  <Text
                    color="white"
                    fontWeight="800"
                    fontSize="16px"
                    noOfLines={1}
                    lineHeight="1.2"
                  >
                    {username || 'Usuario'}
                  </Text>
                  <Badge
                    bg="whiteAlpha.300"
                    color="white"
                    fontSize="10px"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    letterSpacing="wider"
                    textTransform="uppercase"
                  >
                    {hasAdminAccess ? 'Administrador' : 'Asesor de Ventas'}
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
                <SectionLabel icon color="green">Aplicación</SectionLabel>
                <VStack spacing={1} align="stretch">
                  {filteredAppOptions.map((opt) => (
                    <MenuItemRow
                      key={opt.path + opt.label}
                      label={opt.label}
                      icon={opt.icon}
                      path={opt.path}
                      external={opt.external}
                      isActive={!opt.external && location.pathname === opt.path}
                      accentColor="green"
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
