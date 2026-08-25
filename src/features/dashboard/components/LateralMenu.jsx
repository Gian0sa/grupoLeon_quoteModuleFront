import React, { useRef } from 'react';
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
  MdHistory,
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

export function LateralMenu() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();
  const { username, isAuthenticated } = useAuthStore();
  const { logout } = useAuthMutations();

  // Cerrar menú automáticamente al cambiar de página
  React.useEffect(() => {
    onClose();
  }, [location.pathname]);

  const hasAccess = useHasAccess();
  const hasAdminAccess = hasAccess("PUT:/profile/admin/:userId");

  const handleLogout = () => {
    logout.mutate();
  };

  const applicationOptions = [
    { label: 'Gestión de Cotizaciones', icon: MdRequestQuote, path: '/historyquotes', access: 'POST:/quotations' },
    { label: 'Crear usuario', icon: MdPersonAdd, path: '/register', access: 'POST:/register' },
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

  const accountOptions = [
    { label: 'Actualizar perfil', icon: MdPerson, path: '/profile' },
    { label: 'Preguntas frecuentes', icon: MdHelp, path: '/faq' },
    { label: 'Asistencia técnica', icon: MdSupport, path: 'https://wa.me/51921372398', external: true }
  ];

  const adminOptions = [
    { label: 'Gestión de Usuarios', icon: MdPerson, path: '/profileAdmin', access: 'PUT:/profile/admin/:userId' },
    { label: 'Actualizar servicios', icon: MdHelp, path: '#', access: 'PUT:/services/:id' },
    { label: 'Gestionar Notificaciones', icon: MdAssignment, path: '/notification', access: 'PUT:/profile/admin/:userId' },
    { label: 'Control de Asistencias (Admin)', icon: MdAccessTime, path: '/admin/attendance', access: 'PUT:/profile/admin/:userId' }
  ];

  const renderMenuOptions = (options, accentColor = "green") =>
    options
      .filter(({ access }) => !access || hasAccess(access))
      .map(({ label, icon, path, external }, index) => {
        const isActive = !external && location.pathname === path;

        return (
          <Button
            key={index}
            variant="ghost"
            justifyContent="flex-start"
            leftIcon={
              <Flex
                w="34px"
                h="34px"
                align="center"
                justify="center"
                borderRadius="xl"
                bg={isActive ? "whiteAlpha.200" : `${accentColor}.50`}
                flexShrink={0}
              >
                <Icon
                  as={icon}
                  color={isActive ? "white" : `${accentColor}.600`}
                  boxSize={4}
                />
              </Flex>
            }
            rightIcon={
              <Icon
                as={MdChevronRight}
                color={isActive ? "whiteAlpha.800" : "gray.400"}
                boxSize={4}
              />
            }
            onClick={() => {
              if (external) {
                window.open(path, '_blank');
              } else {
                navigate(path);
              }
              onClose();
            }}
            bg={isActive ? HEADER_MAIN_BG : "transparent"}
            color={isActive ? "white" : "gray.700"}
            boxShadow={isActive ? "0 4px 14px rgba(18, 108, 54, 0.25)" : "none"}
            _focus={{
              boxShadow: "none",
              bg: isActive ? HEADER_MAIN_BG : "transparent",
            }}
            _active={{
              bg: "#0e572b",
              color: "white",
            }}
            sx={{
              "@media (hover: hover) and (pointer: fine)": {
                "&:hover": {
                  bg: HEADER_MAIN_BG,
                  color: "white",
                  boxShadow: "0 4px 14px rgba(18, 108, 54, 0.25)",
                  "& svg": { color: "white" },
                  "& span": { color: "white" },
                  "& .chakra-button__icon > div": { bg: "whiteAlpha.200" },
                },
              },
            }}
            h="46px"
            w="full"
            borderRadius="xl"
            px={2}
          >
            <Text
              as="span"
              fontWeight={isActive ? "700" : "500"}
              fontSize="14px"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
              flex="1"
              textAlign="left"
            >
              {label}
            </Text>
          </Button>
        );
      });

  const SectionLabel = ({ children, icon, color = "gray" }) => (
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
        onClick={onOpen}
        aria-label="Abrir menú"
      />

      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        finalFocusRef={btnRef}
        size="md"
        blockScrollOnMount={true}
        preserveScrollBarGap={false}
        autoFocus={false}
      >
        {/* Sin backdropFilter para respuesta ultra veloz de 60fps en móviles */}
        <DrawerOverlay bg="blackAlpha.600" transition="opacity 0.15s ease-out" />
        <DrawerContent
          bg="white"
          maxW="340px"
          borderLeftRadius="2xl"
          boxShadow="-8px 0 40px rgba(0,0,0,0.12)"
          style={{ willChange: "transform", transform: "translateZ(0)" }}
        >
          {/* Header con perfil integrado */}
          <DrawerHeader p={0}>
            <Box
              bg="#126C36"
              boxShadow="0 10px 30px rgba(18, 108, 54, 0.4)"
              px={5}
              pt={5}
              pb={6}
              position="relative"
              overflow="hidden"
              borderBottomRadius="3xl"
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
              {/* Decoración círculo "bolita" del costado en #278847 */}
              <Box
                position="absolute"
                top="-30px"
                right="-30px"
                w="130px"
                h="130px"
                borderRadius="full"
                bg="#278847"
                opacity={0.75}
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
                opacity={0.45}
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
              />

              {/* Avatar + Info de Usuario */}
              <HStack spacing={4} align="center" position="relative" zIndex={1}>
                <Box
                  w="58px"
                  h="58px"
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

          {/* Cuerpo del menú con scroll fluido optimizado */}
          <DrawerBody px={3} py={4}>
            <VStack spacing={4} align="stretch">
              {/* SECCIÓN 1: Aplicación */}
              <Box>
                <SectionLabel icon color="green">Aplicación</SectionLabel>
                <VStack spacing={1} align="stretch">
                  {renderMenuOptions(applicationOptions, "green")}
                </VStack>
              </Box>

              {/* SECCIÓN 2: Cuenta */}
              <Box>
                <SectionLabel icon color="blue">Cuenta</SectionLabel>
                <VStack spacing={1} align="stretch">
                  {renderMenuOptions(accountOptions, "blue")}
                </VStack>
              </Box>

              {/* SECCIÓN 3: Administración (solo si tiene permisos) */}
              {adminOptions.some(({ access }) => !access || hasAccess(access)) && (
                <Box>
                  <SectionLabel icon color="purple">Administración</SectionLabel>
                  <VStack spacing={1} align="stretch">
                    {renderMenuOptions(adminOptions, "purple")}
                  </VStack>
                </Box>
              )}
            </VStack>
          </DrawerBody>

          {/* Footer con Botón de Cerrar Sesión */}
          <DrawerFooter borderTop="1px solid" borderColor="gray.100" p={4}>
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
            >
              Cerrar sesión
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
