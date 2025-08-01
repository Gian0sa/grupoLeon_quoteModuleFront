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
import avatarImg from "../../../assets/icons/avatar.jpg";
import styles from "./LateralMenu.module.css";

export function LateralMenu() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef();
  const navigate = useNavigate();
  const { token, logout, role, username } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const applicationOptions = [
    { label: 'Generar cotización', icon: MdRequestQuote, path: '/client' },
    { label: 'Historial de cotizaciones', icon: MdHistory, path: '/history' },
    { label: 'Nuevo usuario', icon: MdPersonAdd, path: '/register' },
    { label: 'Gestión de solicitudes', icon: MdAssignment, path: '/requests' },
    { label: 'Seguimiento de Pedidos', icon: MdBarChart, path: '/reports' },
    { label: 'Cuentas por Cobrar', icon: MdBubbleChart, path: '/receivable' }
  ];

  const accountOptions = [
    { label: 'Actualizar perfil', icon: MdPerson, path: '/profile' },
    { label: 'Preguntas frecuentes', icon: MdHelp, path: '/faq' },
    { label: 'Asistencia técnica', icon: MdSupport, path: '/support' }
  ];

  const renderMenuOptions = (options) =>
    options.map(({ label, icon, path }, index) => (
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
                  src={avatarImg}
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
          </DrawerBody>

          {/* Footer */}
          <DrawerFooter p={6}>
            {token && (
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
