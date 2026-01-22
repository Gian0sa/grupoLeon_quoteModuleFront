import React, { useRef } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  IconButton,
  Button,
  Image,
  VStack,
  HStack,
  Avatar,
  Text,
  Divider,
  Box,
  Icon
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import {
  MdRequestQuote,
  MdHistory,
  MdPersonAdd,
  MdAssignment,
  MdBarChart,
  MdPerson,
  MdHelp,
  MdSupport,
  MdExitToApp,
  MdBubbleChart
} from 'react-icons/md';

import { useDisclosure } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../auth/stores/useAuthStore';
import styles from "./LateralMenu.module.css";
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
    { label: 'Generar cotización', icon: MdRequestQuote, path: '#', access: 'POST:/quotations' },
    { label: 'Historial de cotizaciones', icon: MdHistory, path: '#', access: 'GET:/quotations' },
    { label: 'Nuevo usuario', icon: MdPersonAdd, path: '/register', access: 'POST:/register' },
    { label: 'Gestión de solicitudes', icon: MdAssignment, path: '#', access: 'GET:/requests' },
    { label: 'Seguimiento de Pedidos', icon: MdBarChart, path: '/reports', access: 'GET:/reports' },
    { label: 'Cuentas por Cobrar', icon: MdBubbleChart, path: '/receivable', access: 'GET:/receivable' },
    { label: 'Lista de Precios', icon: MdBubbleChart, path: '/productsPriceList', access: 'GET:/receivable' },
    { label: 'Catalogo', icon: MdBubbleChart, path: '/catalog', access: 'GET:/receivable' },
    { label: 'Historial de Cliente', icon: MdBubbleChart, path: '/clienteBusqueda', access: 'GET:/receivable' },
    { label: 'Importaciones', icon: MdBubbleChart, path: '/importaciones', access: 'GET:/receivable' },
    { label: 'Visitas', icon: MdBubbleChart, path: '/visitLog', access: 'GET:/receivable' },
    { label: 'VisitasMapa', icon: MdBubbleChart, path: '/visitMap', access: 'GET:/receivable' }
  ];

  const accountOptions = [
    { label: 'Actualizar perfil', icon: MdPerson, path: '/profile' },
    { label: 'Preguntas frecuentes', icon: MdHelp, path: '#' },
    { label: 'Asistencia técnica', icon: MdSupport, path: '#' }
  ];

   const adminOptions = [
    { label: 'Actualizar usuario', icon: MdPerson, path: '/profileAdmin', access: 'PUT:/profile/admin/:userId'  },
    { label: 'Actualizar servicios', icon: MdHelp, path: '#' , access: 'PUT:/services/:id'  },
    { label: 'Gestionar Notificaciones', icon: MdAssignment, path: '/notification', access: 'GET:/receivable'} //access: 'POST:/notification' 
  ];

const renderMenuOptions = (options) =>
  options
    .filter(({ access }) => !access || hasAccess(access)) 
    .map(({ label, icon, path }, index) => (
      <React.Fragment key={index}>
        <Button
          variant="ghost"
          justifyContent="flex-start"
          leftIcon={<Icon as={icon} color="green.700" />}
          onClick={() => {
            navigate(path);
            onClose();
          }}
          _hover={{ bg: "green.50" }}
          fontWeight="normal"
          h="30px"
          color="gray.700"
        >
          {label}
        </Button>
        <div className={styles.rayita}></div>
      </React.Fragment>
    ));

  return (
    <>
      <IconButton
        ref={btnRef}
        icon={<HamburgerIcon color="white" />}
        bg="rgba(42, 97, 63, 1)"
        _hover={{ bg: "rgba(42, 97, 63, 0.8)" }}
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
        <DrawerOverlay />
        <DrawerContent bg="gray.50" maxW="350px">
          {/* Título y botón de cierre */}
          <Box px={6} py={3}>
            <Text>Menu</Text>
            <DrawerCloseButton color="gray.900" p={4} m={0} />
          </Box>

          <div className={styles.rayita}></div>

          {/* Perfil */}
          <DrawerHeader p={0}>
            <Box
              bg="linear-gradient(180deg, rgba(42, 97, 63, 1) 0%, rgba(18, 48, 30, 1) 100%)"
              p={4}
              mx={6}
              color="white"
              borderRadius={20}
            >
              <HStack spacing={4}>
                <Image 
                  src="/assets/icons/avatar.jpg" 
                  boxSize="60px"
                  borderRadius="full"
                  objectFit="cover"
                  alt="Avatar"
                  border="3px solid white"
                />
                <VStack align="start" spacing={1}>
                  <Text fontSize="lg" fontWeight="bold">
                    {username || "Antony Mattos"}
                  </Text>
                  <Text fontSize="sm" opacity={0.9}>
                    Asesor de ventas
                  </Text>
                  <Text fontSize="xs" opacity={0.7}>
                    Ver perfil
                  </Text>
                </VStack>
              </HStack>
            </Box>
          </DrawerHeader>

          {/* Cuerpo del menú */}
          <DrawerBody p={6}>
            <VStack spacing={6} align="stretch">
              <Box>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="green.600"
                  mb={1}
                  letterSpacing="wider"
                  pl="15px"
                >
                  APLICACIÓN
                </Text>
                <VStack spacing={2} align="stretch">
                  {renderMenuOptions(applicationOptions)}
                </VStack>
              </Box>

              <Divider />

              <Box>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="green.600"
                  mb={1}
                  letterSpacing="wider"
                  pl="15px"
                >
                  CUENTA
                </Text>
                <VStack spacing={2} align="stretch">
                  {renderMenuOptions(accountOptions)}
                </VStack>
              </Box>
            </VStack>
            {hasAdminAccess && (
              <Box pt={2}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="green.600"
                  mb={1}
                  letterSpacing="wider"
                  pl="15px"
                >
                  ADMIN
                </Text>
                <VStack spacing={2} align="stretch">
                  {renderMenuOptions(adminOptions)}
                </VStack>
              </Box>)}
          </DrawerBody>

          {/* Footer */}
          <DrawerFooter p={6}>
            {isAuthenticated && (
              <Button
                onClick={handleLogout}
                leftIcon={<Icon as={MdExitToApp} />}
                bg="green.600"
                color="white"
                _hover={{ bg: "green.700" }}
                w="100%"
                h="45px"
                borderRadius={70}
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
