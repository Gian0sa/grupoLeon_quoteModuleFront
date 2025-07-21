import { 
  Drawer, 
  DrawerBody, 
  DrawerFooter, 
  DrawerHeader, 
  DrawerOverlay, 
  DrawerContent, 
  DrawerCloseButton, 
  Button, 
  Image, 
  VStack,
  HStack,
  Avatar,
  Text,
  Divider,
  Box,
  Icon,
} from '@chakra-ui/react'
import avatarImg from "../../../assets/icons/avatar.jpg";
import React from 'react'
import { useDisclosure } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/stores/useAuthStore'
import { IconButton } from '@chakra-ui/react'
import { HamburgerIcon } from '@chakra-ui/icons'
import { 
  MdRequestQuote, 
  MdHistory, 
  MdPersonAdd, 
  MdAssignment, 
  MdBarChart,
  MdPerson,
  MdHelp,
  MdSupport,
  MdExitToApp
} from 'react-icons/md'
import styles from "./LateralMenu.module.css";

export function LateralMenu() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { token, logout, role, username } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/')
  }
  
  const btnRef = React.useRef()
  const navigate = useNavigate()

  // Opciones del menú organizadas por secciones
  const applicationOptions = [
    {
      label: 'Generar cotización',
      icon: MdRequestQuote,
      path: '/client',
      color: 'green.700'
    },
    {
      label: 'Historial de cotizaciones',
      icon: MdHistory,
      path: '/history',
      color: 'green.700'
    },
    {
      label: 'Nuevo registro',
      icon: MdPersonAdd,
      path: '/register',
      color: 'green.700'
    },
    {
      label: 'Gestión de solicitudes',
      icon: MdAssignment,
      path: '/requests',
      color: 'green.700'
    },
    {
      label: 'Ver reportes',
      icon: MdBarChart,
      path: '/reports',
      color: 'green.700'
    }
  ]

  const accountOptions = [
    {
      label: 'Actualizar perfil',
      icon: MdPerson,
      path: '/profile',
      color: 'green.700'
    },
    {
      label: 'Preguntas frecuentes',
      icon: MdHelp,
      path: '/faq',
      color: 'green.700'
    },
    {
      label: 'Asistencia técnica',
      icon: MdSupport,
      path: '/support',
      color: 'green.700'
    }
  ]

  return (
    <>
      <IconButton 
        ref={btnRef} 
        icon={<HamburgerIcon color="white" />} 
        bg="rgba(42, 97, 63, 1)" 
        _hover={{ bg: "rgba(42, 97, 63, 0.8)" }} 
        onClick={onOpen} 
        aria-label='Abrir menú' 
      />
      
      <Drawer 
        isOpen={isOpen} 
        placement='right' 
        onClose={onClose} 
        finalFocusRef={btnRef}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent bg="gray.50" maxW="350px">
          <Box px={6} py={3}>
            <Text>Menu</Text>
            <DrawerCloseButton color="gray.900" p={4} m={0}/>
          </Box>

          <div className={styles.rayita}></div>

          {/* Header con perfil del usuario */}
          <DrawerHeader p={0}>
  <Box
    bg="linear-gradient(180deg, rgba(42, 97, 63, 1) 0%, rgba(18, 48, 30, 1) 100%)"
    p={4}
    mx={6}
    color="white"
    borderRadius={20}
  >
    <HStack spacing={4} align="center" justify="space-between">
      <HStack spacing={4} align="center">
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

    </HStack>
  </Box>
</DrawerHeader>



          <DrawerBody p={6}>
            <VStack spacing={6} align="stretch">
              {/* Sección APLICACIÓN */}
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
                  {applicationOptions.map((option, index) => (
                    <>
                    <Button
                      key={index}
                      variant="ghost"
                      justifyContent="flex-start"
                      leftIcon={<Icon as={option.icon} color={option.color} />}
                      onClick={() => {
                        navigate(option.path)
                        onClose()
                      }}
                      _hover={{ bg: "green.50" }}
                      fontWeight="normal"
                      h="30px"
                      color="gray.700"
                    >
                      {option.label}
                    </Button>
                    <div className={styles.rayita}></div>
                    </>
                  ))}
                </VStack>
              </Box>

              <Divider />

              {/* Sección CUENTA */}
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
                  {accountOptions.map((option, index) => (
                    <>
                    <Button
                      key={index}
                      variant="ghost"
                      justifyContent="flex-start"
                      leftIcon={<Icon as={option.icon} color={option.color} />}
                      onClick={() => {
                        navigate(option.path)
                        onClose()
                      }}
                      _hover={{ bg: "green.50" }}
                      fontWeight="normal"
                      h="30px"
                      color="gray.700"
                    >
                      {option.label}
                    </Button>
                    <div className={styles.rayita}></div>
                    </>
                  ))}
                </VStack>
              </Box>
            </VStack>
          </DrawerBody>

          {/* Footer con botón de cerrar sesión */}
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
  )
}