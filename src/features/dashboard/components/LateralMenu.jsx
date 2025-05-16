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
  
  export function LateralMenu(){
      const { isOpen, onOpen, onClose } = useDisclosure()
      const { token , logout} = useAuthStore()

      const handleLogout = () => {
        logout()
        navigate('/')
      }
    const btnRef = React.useRef()
    const navigate = useNavigate()

      return(
          <>
          <Button ref={btnRef} colorScheme='teal' onClick={onOpen}>
          Open
        </Button>
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
                    <Button onClick={() => navigate('/quotes')}>Cotizar</Button>
                    <Button onClick={() => navigate('/history')}>Historial</Button>
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
  