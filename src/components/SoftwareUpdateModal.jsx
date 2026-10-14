import React, { useEffect } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Icon,
  Spinner,
  Portal,
  useColorModeValue,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiSettings, FiCheckCircle } from 'react-icons/fi';
import { RiRefreshLine } from 'react-icons/ri';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

export const SoftwareUpdateModal = ({
  isOpen,
  updateInfo,
  status,
  progress,
  currentStep,
  statusMessage,
  onStartUpdate,
  onPostpone,
}) => {
  const cardBg = useColorModeValue('white', '#181b20');
  const textColor = useColorModeValue('gray.800', 'white');
  const subtextColor = useColorModeValue('gray.500', 'gray.400');
  const notesBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const notesBorder = useColorModeValue('gray.100', 'whiteAlpha.100');
  const trackBg = useColorModeValue('gray.100', 'whiteAlpha.100');

  // Si no está abierto o no hay datos, no renderizar
  if (!isOpen) return null;

  const isUpdating = status === 'updating';
  const isSuccess = status === 'success';

  return (
    <Portal>
      <Box
        position="fixed"
        inset={0}
        zIndex={999999}
        bg="rgba(10, 15, 25, 0.85)"
        backdropFilter="blur(16px)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={{ base: 3, sm: 4 }}
        overflowY="auto"
        userSelect="none"
        sx={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
      >
        <AnimatePresence>
          <MotionBox
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            w="full"
            maxW={{ base: '100%', sm: '430px' }}
            maxH={{ base: 'calc(100dvh - 28px)', sm: '90vh' }}
            display="flex"
            flexDirection="column"
            bg={cardBg}
            borderRadius={{ base: '24px', sm: '32px' }}
            boxShadow="0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)"
            p={{ base: 4, sm: 6 }}
            position="relative"
            my="auto"
            overflow="hidden"
          >
            {/* 1. Encabezado Fijo Superior */}
            <Box flexShrink={0}>
              <VStack spacing={0.5} textAlign="center" mb={{ base: 2, sm: 3 }}>
                <Text
                  fontSize="10px"
                  fontWeight="700"
                  textTransform="uppercase"
                  letterSpacing="1px"
                  color="green.500"
                >
                  Autopartes Grupo León
                </Text>
                <Heading size={{ base: 'sm', sm: 'md' }} fontWeight="800" color={textColor} letterSpacing="-0.5px">
                  {updateInfo?.title || 'Actualización del Sistema'}
                </Heading>
              </VStack>

              {/* Central App Emblem / Badge */}
              <Flex justify="center" mb={{ base: 2, sm: 3 }}>
                <MotionBox
                  animate={
                    isUpdating
                      ? {
                          scale: [1, 1.05, 1],
                          rotate: [0, 5, -5, 0],
                        }
                      : {}
                  }
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  w={{ base: '56px', sm: '68px' }}
                  h={{ base: '56px', sm: '68px' }}
                  borderRadius={{ base: '18px', sm: '22px' }}
                  bg="linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)"
                  boxShadow="0 10px 24px rgba(16, 185, 129, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.4)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  position="relative"
                >
                  <Icon as={FiSettings} boxSize={{ base: 6, sm: 8 }} color="white" />
                  {isUpdating && (
                    <MotionFlex
                      position="absolute"
                      inset="-4px"
                      borderRadius={{ base: '22px', sm: '26px' }}
                      border="2px dashed rgba(52, 211, 153, 0.6)"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                    />
                  )}
                </MotionBox>
              </Flex>

              {/* Version Tag */}
              <VStack spacing={0.5} mb={{ base: 2.5, sm: 3.5 }} textAlign="center">
                <Heading size={{ base: 'xs', sm: 'sm' }} fontWeight="800" color={textColor}>
                  Versión {updateInfo?.version || '2.4.0'} Oficial
                </Heading>
                <Text fontSize="11px" color={subtextColor} fontWeight="500">
                  {statusMessage}
                </Text>
              </VStack>

              {/* Progress Bar with Glow */}
              <Box mb={{ base: 3, sm: 4 }} position="relative">
                <Box
                  w="full"
                  h="8px"
                  bg={trackBg}
                  borderRadius="full"
                  overflow="hidden"
                  position="relative"
                >
                  <MotionBox
                    h="full"
                    bg="linear-gradient(90deg, #10b981 0%, #06b6d4 100%)"
                    borderRadius="full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.4 }}
                    boxShadow="0 0 12px rgba(16, 185, 129, 0.6)"
                  />
                </Box>
                <Flex justify="space-between" mt={1.5} px={0.5}>
                  <Text fontSize="10.5px" fontWeight="700" color="green.500">
                    {isSuccess ? '100% Completado' : isUpdating ? `${progress}%` : 'Listo para iniciar'}
                  </Text>
                  <Text fontSize="10.5px" fontWeight="600" color={subtextColor}>
                    {isSuccess ? 'Reiniciando...' : 'Auto-instalable'}
                  </Text>
                </Flex>
              </Box>
            </Box>

            {/* 2. Cuerpo Central con Scroll Autónomo (Pasos + Notas de la versión) */}
            <Box
              flex="1 1 auto"
              minH={0}
              overflowY="auto"
              pr={1}
              sx={{
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(156, 163, 175, 0.4)',
                  borderRadius: '4px',
                },
              }}
            >
              {/* Checklist of Real Steps */}
              <VStack spacing={1.5} align="stretch" mb={{ base: 3, sm: 4 }}>
                {/* Step 1: Integridad */}
                <HStack
                  spacing={2.5}
                  p={2}
                  borderRadius="lg"
                  bg={currentStep === 1 && isUpdating ? 'green.50' : 'transparent'}
                  transition="background 0.2s"
                >
                  <Flex
                    w="22px"
                    h="22px"
                    borderRadius="full"
                    align="center"
                    justify="center"
                    bg={currentStep > 1 ? 'green.500' : currentStep === 1 && isUpdating ? 'green.100' : 'gray.100'}
                    color={currentStep > 1 ? 'white' : 'green.600'}
                    flexShrink={0}
                  >
                    {currentStep > 1 ? (
                      <Icon as={FiCheck} boxSize={3} />
                    ) : currentStep === 1 && isUpdating ? (
                      <Spinner size="xs" color="green.600" />
                    ) : (
                      <Box w="6px" h="6px" borderRadius="full" bg="gray.300" />
                    )}
                  </Flex>
                  <Text
                    fontSize="11px"
                    fontWeight={currentStep === 1 ? '700' : '600'}
                    color={currentStep >= 1 ? textColor : subtextColor}
                    lineHeight="shorter"
                  >
                    Verificación de integridad del aplicativo
                  </Text>
                </HStack>

                {/* Step 2: Descarga de módulos */}
                <HStack
                  spacing={2.5}
                  p={2}
                  borderRadius="lg"
                  bg={currentStep === 2 && isUpdating ? 'green.50' : 'transparent'}
                  transition="background 0.2s"
                >
                  <Flex
                    w="22px"
                    h="22px"
                    borderRadius="full"
                    align="center"
                    justify="center"
                    bg={currentStep > 2 ? 'green.500' : currentStep === 2 && isUpdating ? 'green.100' : 'gray.100'}
                    color={currentStep > 2 ? 'white' : 'green.600'}
                    flexShrink={0}
                  >
                    {currentStep > 2 ? (
                      <Icon as={FiCheck} boxSize={3} />
                    ) : currentStep === 2 && isUpdating ? (
                      <Spinner size="xs" color="green.600" />
                    ) : (
                      <Box w="6px" h="6px" borderRadius="full" bg="gray.300" />
                    )}
                  </Flex>
                  <Text
                    fontSize="11px"
                    fontWeight={currentStep === 2 ? '700' : '600'}
                    color={currentStep >= 2 ? textColor : subtextColor}
                    lineHeight="shorter"
                  >
                    Descarga de módulos actualizados
                  </Text>
                </HStack>

                {/* Step 3: Limpieza profunda de memoria */}
                <HStack
                  spacing={2.5}
                  p={2}
                  borderRadius="lg"
                  bg={currentStep === 3 && isUpdating ? 'green.50' : 'transparent'}
                  transition="background 0.2s"
                >
                  <Flex
                    w="22px"
                    h="22px"
                    borderRadius="full"
                    align="center"
                    justify="center"
                    bg={currentStep > 3 ? 'green.500' : currentStep === 3 && isUpdating ? 'green.100' : 'gray.100'}
                    color={currentStep > 3 ? 'white' : 'green.600'}
                    flexShrink={0}
                  >
                    {currentStep > 3 ? (
                      <Icon as={FiCheck} boxSize={3} />
                    ) : currentStep === 3 && isUpdating ? (
                      <Spinner size="xs" color="green.600" />
                    ) : (
                      <Box w="6px" h="6px" borderRadius="full" bg="gray.300" />
                    )}
                  </Flex>
                  <Text
                    fontSize="11px"
                    fontWeight={currentStep === 3 ? '700' : '600'}
                    color={currentStep >= 3 ? textColor : subtextColor}
                    lineHeight="shorter"
                  >
                    Limpieza profunda de memoria RAM y caché
                  </Text>
                </HStack>
              </VStack>

              {/* Release Notes Card */}
              <Box
                bg={notesBg}
                border="1px solid"
                borderColor={notesBorder}
                borderRadius="16px"
                p={3}
                mb={3}
              >
                <Text fontSize="11px" fontWeight="700" color={textColor} mb={1.5}>
                  Novedades de la versión:
                </Text>
                <VStack align="stretch" spacing={1}>
                  {updateInfo?.releaseNotes?.map((note, idx) => (
                    <HStack key={idx} align="flex-start" spacing={1.5}>
                      <Text color="green.500" fontSize="10px" fontWeight="bold">
                        •
                      </Text>
                      <Text fontSize="10.5px" color={subtextColor} lineHeight="shorter">
                        {note}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>

              {/* Notice for unsaved drafts */}
              <Box mb={2} p={2} borderRadius="12px" bg="orange.50" border="1px solid" borderColor="orange.200">
                <Text fontSize="10.5px" color="orange.800" fontWeight="600" textAlign="center" lineHeight="shorter">
                  💡 Asegúrate de haber guardado tus cotizaciones o cambios pendientes antes de actualizar.
                </Text>
              </Box>
            </Box>

            {/* 3. Barra de Botones de Acción (Fija en la parte inferior del modal) */}
            <Box flexShrink={0} pt={3} borderTop="1px solid" borderColor={notesBorder} mt={1}>
              <Button
                w="full"
                h={{ base: '46px', sm: '50px' }}
                borderRadius="16px"
                bg="linear-gradient(135deg, #10b981 0%, #059669 100%)"
                color="white"
                fontWeight="800"
                fontSize={{ base: 'xs', sm: 'sm' }}
                boxShadow="0 6px 20px rgba(16, 185, 129, 0.35)"
                _hover={{
                  bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  transform: isUpdating ? 'none' : 'translateY(-1px)',
                }}
                _active={{
                  transform: isUpdating ? 'none' : 'translateY(1px)',
                }}
                onClick={!isUpdating && !isSuccess ? onStartUpdate : undefined}
                isLoading={isUpdating}
                loadingText={`Actualizando e instalando (${progress}%)...`}
                isDisabled={isSuccess}
                leftIcon={
                  isSuccess ? (
                    <Icon as={FiCheckCircle} />
                  ) : !isUpdating ? (
                    <Icon as={RiRefreshLine} />
                  ) : null
                }
              >
                {isSuccess
                  ? '¡Completado! Reiniciando...'
                  : isUpdating
                  ? 'Instalando actualización...'
                  : 'Instalar Actualización Ahora'}
              </Button>

              {/* Postpone button if seller is finishing work */}
              {!isUpdating && !isSuccess && typeof onPostpone === 'function' && (
                <Button
                  w="full"
                  h="32px"
                  variant="ghost"
                  colorScheme="gray"
                  borderRadius="12px"
                  fontSize="xs"
                  fontWeight="600"
                  mt={1.5}
                  onClick={onPostpone}
                >
                  Terminar de guardar (posponer 2 min)
                </Button>
              )}
            </Box>
          </MotionBox>
        </AnimatePresence>
      </Box>
    </Portal>
  );
};
