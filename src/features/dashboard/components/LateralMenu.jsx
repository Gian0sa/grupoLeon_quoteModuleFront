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
  Image,
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
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../auth/stores/useAuthStore';
import { useHasAccess } from '../../../shared/utils/permissions';
import { useAuthMutations } from '../../auth/hooks/mutations/authMutations';

export function LateralMenu() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef();
  const navigate = useNavigate();
  const { username, isAuthenticated } = useAuthStore();
  const { logout } = useAuthMutations();

  const hasAccess = useHasAccess();
  const hasAdminAccess = hasAccess("PUT:/profile/admin/:userId");

  const handleLogout = () => {
    logout.mutate();
  };

  const applicationOptions = [
    { label: 'Nueva cotización', icon: MdRequestQuote, path: '#', access: 'POST:/quotations' },
    { label: 'Historial de cotizaciones', icon: MdHistory, path: '#', access: 'GET:/quotations' },
    { label: 'Crear usuario', icon: MdPersonAdd, path: '/register', access: 'POST:/register' },
    { label: 'Solicitudes', icon: MdAssignmentTurnedIn, path: '#', access: 'GET:/requests' },
    { label: 'Pedidos', icon: MdLocalShipping, path: '/reports', access: 'GET:/reports' },
    { label: 'Cuentas por cobrar', icon: MdAccountBalanceWallet, path: '/receivable', access: 'GET:/receivable' },
    { label: 'Lista de precios', icon: MdPriceChange, path: '/productsPriceList', access: 'GET:/receivable' },
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
    { label: 'Actualizar usuario', icon: MdPerson, path: '/profileAdmin', access: 'PUT:/profile/admin/:userId' },
    { label: 'Actualizar servicios', icon: MdHelp, path: '#', access: 'PUT:/services/:id' },
    { label: 'Gestionar Notificaciones', icon: MdAssignment, path: '/notification', access: 'GET:/receivable' },
    { label: 'Control de Asistencias (Admin)', icon: MdAccessTime, path: '/admin/attendance', access: 'PUT:/profile/admin/:userId' }
  ];

  const renderMenuOptions = (options, accentColor = "green") =>
    options
      .filter(({ access }) => !access || hasAccess(access))
      .map(({ label, icon, path, external }, index) => (
        <Button
          key={index}
          variant="ghost"
          justifyContent="flex-start"
          leftIcon={
            <Flex
              w="32px"
              h="32px"
              align="center"
              justify="center"
              borderRadius="lg"
              bg={`${accentColor}.50`}
              flexShrink={0}
            >
              <Icon as={icon} color={`${accentColor}.600`} boxSize={4} />
            </Flex>
          }
          rightIcon={<Icon as={MdChevronRight} color="gray.300" boxSize={4} />}
          onClick={() => {
            if (external) {
              window.open(path, '_blank');
            } else {
              navigate(path);
            }
            onClose();
          }}
          _hover={{
            bg: `${accentColor}.50`,
            transform: "translateX(4px)",
            '& > span:first-of-type > div': { bg: `${accentColor}.100` },
          }}
          _active={{ bg: `${accentColor}.100` }}
          transition="all 0.2s ease"
          fontWeight="600"
          fontSize="13.5px"
          h="44px"
          color="gray.700"
          w="full"
          borderRadius="xl"
          px={2}
        >
          {label}
        </Button>
      ));

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
        icon={<HamburgerIcon color="white" />}
        variant="ghost"
        borderRadius="full"
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
      >
        <DrawerOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <DrawerContent
          bg="white"
          maxW="340px"
          borderLeftRadius="2xl"
          boxShadow="-8px 0 40px rgba(0,0,0,0.12)"
        >
          {/* Header con perfil integrado */}
          <DrawerHeader p={0}>
            <Box
              bg="linear-gradient(145deg, #14532d 0%, #166534 50%, #15803d 100%)"
              px={5}
              pt={5}
              pb={6}
              position="relative"
              overflow="hidden"
              borderBottomRadius="3xl"
            >
              {/* Decoración sutil */}
              <Box
                position="absolute"
                top="-30px"
                right="-30px"
                w="120px"
                h="120px"
                borderRadius="full"
                bg="whiteAlpha.100"
              />
              <Box
                position="absolute"
                bottom="-15px"
                left="-15px"
                w="70px"
                h="70px"
                borderRadius="full"
                bg="whiteAlpha.50"
              />

              {/* Botón cerrar */}
              <Flex justify="flex-end" mb={4} position="relative" zIndex={2}>
                <IconButton
                  icon={<CloseIcon boxSize={3} />}
                  variant="ghost"
                  color="whiteAlpha.700"
                  size="sm"
                  borderRadius="full"
                  _hover={{ bg: "whiteAlpha.200", color: "white" }}
                  onClick={onClose}
                  aria-label="Cerrar menú"
                />
              </Flex>

              {/* Perfil */}
              <HStack spacing={4} position="relative" zIndex={2}>
                <Box
                  p="2px"
                  borderRadius="full"
                  bg="linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.15))"
                >
                  <Image
                    src="/assets/icons/avatar.jpg"
                    boxSize="56px"
                    borderRadius="full"
                    objectFit="cover"
                    alt="Avatar"
                    border="2px solid rgba(0,0,0,0.1)"
                  />
                </Box>
                <VStack align="start" spacing={0.5} flex="1">
                  <Text fontSize="md" fontWeight="800" color="white" lineHeight="tight">
                    {username || "Usuario"}
                  </Text>
                  <Badge
                    bg="whiteAlpha.200"
                    color="green.100"
                    borderRadius="full"
                    fontSize="10px"
                    fontWeight="600"
                    px={2.5}
                    py={0.5}
                    backdropFilter="blur(4px)"
                    border="1px solid rgba(255,255,255,0.1)"
                  >
                    Asesor de ventas
                  </Badge>
                </VStack>
              </HStack>
            </Box>
          </DrawerHeader>

          {/* Cuerpo del menú */}
          <DrawerBody px={4} py={4} overflowY="auto">
            <VStack spacing={4} align="stretch">
              {/* Sección Aplicación */}
              <Box>
                <SectionLabel icon color="green">Aplicación</SectionLabel>
                <VStack spacing={0.5} align="stretch">
                  {renderMenuOptions(applicationOptions, "green")}
                </VStack>
              </Box>

              {/* Sección Cuenta */}
              <Box>
                <SectionLabel icon color="blue">Cuenta</SectionLabel>
                <VStack spacing={0.5} align="stretch">
                  {renderMenuOptions(accountOptions, "blue")}
                </VStack>
              </Box>

              {/* Sección Admin */}
              {hasAdminAccess && (
                <Box>
                  <SectionLabel icon color="orange">Administración</SectionLabel>
                  <VStack spacing={0.5} align="stretch">
                    {renderMenuOptions(adminOptions, "orange")}
                  </VStack>
                </Box>
              )}
            </VStack>
          </DrawerBody>

          {/* Footer */}
          <DrawerFooter px={5} py={4} borderTop="1px solid" borderColor="gray.100">
            {isAuthenticated && (
              <Button
                onClick={handleLogout}
                leftIcon={<Icon as={MdExitToApp} boxSize={5} />}
                bg="linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                color="white"
                _hover={{ bg: "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)", transform: "translateY(-1px)" }}
                _active={{ transform: "translateY(0)" }}
                w="100%"
                h="46px"
                borderRadius="xl"
                fontWeight="700"
                fontSize="14px"
                boxShadow="0 4px 15px rgba(220, 38, 38, 0.3)"
                transition="all 0.2s"
              >
                Cerrar sesión
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
