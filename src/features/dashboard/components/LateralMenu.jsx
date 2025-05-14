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
  
  export function LateralMenu(){
      const { isOpen, onOpen, onClose } = useDisclosure()
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
             
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        </>
      )
  }
  