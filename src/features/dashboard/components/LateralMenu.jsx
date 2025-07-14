import {
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    Button,
    Input,
    Flex,
  } from '@chakra-ui/react'
  import React from 'react'
  import { useDisclosure } from '@chakra-ui/react'
  import { useNavigate } from 'react-router-dom'
  import { useAuthStore } from '../../auth/stores/useAuthStore'
  import { IconButton } from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
  
  export function LateralMenu(){
      const { isOpen, onOpen, onClose } = useDisclosure()
      const { token , logout , role} = useAuthStore()

      const handleLogout = () => {
        logout()
        navigate('/')
      }
    const btnRef = React.useRef()
    const navigate = useNavigate()

      return(
          <>
          <IconButton
            ref={btnRef}
            icon={<HamburgerIcon />}
            colorScheme='teal'
            onClick={onOpen}
            aria-label='Abrir menú'
          />
        <Drawer
          isOpen={isOpen}
          placement='left'
          onClose={onClose}
          finalFocusRef={btnRef}
        >
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            <DrawerHeader>Opciones</DrawerHeader>
  
            <DrawerBody>
                <Flex direction='column' gap='2'>
                    <Button onClick={() => navigate('/client')}>Cotizar</Button>
                    <Button onClick={() => navigate('/history')}>Historial</Button>
                    {role === "ADMIN" && (
                      <Button onClick={() => navigate('/register')}>Registrar</Button>
                    )}
                    {role === "ADMIN" && (
                      <Button onClick={() => navigate('/requests')}>Solicitudes</Button>
                    )}

                </Flex>
            </DrawerBody>
  
            <DrawerFooter>
              {token && (
                <Button onClick={handleLogout}>Cerrar sesión</Button> 
              )}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        </>
      )
  }
  