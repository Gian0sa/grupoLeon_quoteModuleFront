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
import { HEADER_MAIN_BG } from '../../../components/TopHeaderBanner';

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
              w="34px"
              h="34px"
              align="center"
              justify="center"
              borderRadius="xl"
              bg={`${accentColor}.50`}
              flexShrink={0}
              transition="all 0.2s ease"
            >
              <Icon as={icon} color={`${accentColor}.600`} boxSize={4} />
            </Flex>
          }
          rightIcon={<Icon as={MdChevronRight} color="gray.400" boxSize={4} />}
          onClick={() => {
            if (external) {
              window.open(path, '_blank');
            } else {
              navigate(path);
            }
            onClose();
          }}
          _hover={{
            bg: HEADER_MAIN_BG,
            color: "white",
            boxShadow: "0 6px 18px rgba(18, 108, 54, 0.35)",
            transform: "translateX(4px)",
            '& > span:first-of-type > div': { bg: "white" },
            '& > span:first-of-type > div > svg': { color: "#126C36" },
            '& > svg': { color: "white" },
          }}
          _active={{
            bg: "#0e572b",
            color: "white",
          }}
          transition="all 0.2s ease"
          h="46px"
          color="gray.700"
          w="full"
          borderRadius="xl"
          px={2}
        >
          <Text
            as="span"
            fontWeight="500"
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
                opacity={0.35}
                pointerEvents="none"
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
