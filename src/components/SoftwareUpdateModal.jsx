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
        p={4}
        userSelect="none"
        sx={{
          overscrollBehavior: 'contain',
          touchAction: 'none',
        }}
      >
        <AnimatePresence>
          <MotionBox
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            w="full"
            maxW="430px"
            bg={cardBg}
            borderRadius="32px"
            boxShadow="0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)"
            p={{ base: 6, sm: 8 }}
            overflow="hidden"
            position="relative"
          >
            {/* Top Bar Header */}
            <VStack spacing={1} textAlign="center" mb={6}>
              <Text
                fontSize="xs"
                fontWeight="700"
                textTransform="uppercase"
                letterSpacing="1.2px"
                color="green.500"
              >
                Autopartes Grupo León
              </Text>
              <Heading size="md" fontWeight="800" color={textColor} letterSpacing="-0.5px">
                {updateInfo?.title || 'Actualización del Sistema'}
              </Heading>
            </VStack>

            {/* Central App Emblem / Badge */}
            <Flex justify="center" mb={5}>
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
                w="80px"
                h="80px"
                borderRadius="24px"
                bg="linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)"
                boxShadow="0 12px 30px rgba(16, 185, 129, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.4)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                position="relative"
              >
                <Icon as={FiSettings} boxSize={9} color="white" />
                {isUpdating && (
                  <MotionFlex
                    position="absolute"
                    inset="-4px"
                    borderRadius="28px"
                    border="2px dashed rgba(52, 211, 153, 0.6)"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                  />
                )}
              </MotionBox>
            </Flex>

            {/* Version Tag */}
            <VStack spacing={1} mb={5} textAlign="center">
              <Heading size="sm" fontWeight="800" color={textColor}>
                Versión {updateInfo?.version || '2.4.0'} Oficial
              </Heading>
              <Text fontSize="xs" color={subtextColor} fontWeight="500">
                {statusMessage}
              </Text>
            </VStack>

            {/* Progress Bar with Glow */}
            <Box mb={6} position="relative">
              <Box
                w="full"
                h="10px"
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
                  boxShadow="0 0 14px rgba(16, 185, 129, 0.6)"
                />
              </Box>
              <Flex justify="space-between" mt={2} px={1}>
                <Text fontSize="11px" fontWeight="700" color="green.500">
                  {isSuccess ? '100% Completado' : isUpdating ? `${progress}%` : 'Listo para iniciar'}
                </Text>
                <Text fontSize="11px" fontWeight="600" color={subtextColor}>
                  {isSuccess ? 'Reiniciando...' : 'Auto-instalable'}
                </Text>
              </Flex>
            </Box>

            {/* Checklist of Real Steps */}
            <VStack spacing={3} align="stretch" mb={6}>
              {/* Step 1: Integridad */}
              <HStack
                spacing={3}
                p={2.5}
                borderRadius="xl"
                bg={currentStep === 1 && isUpdating ? 'green.50' : 'transparent'}
                transition="background 0.2s"
              >
                <Flex
                  w="26px"
                  h="26px"
                  borderRadius="full"
                  align="center"
                  justify="center"
                  bg={currentStep > 1 ? 'green.500' : currentStep === 1 && isUpdating ? 'green.100' : 'gray.100'}
                  color={currentStep > 1 ? 'white' : 'green.600'}
                >
                  {currentStep > 1 ? (
                    <Icon as={FiCheck} boxSize={3.5} />
                  ) : currentStep === 1 && isUpdating ? (
                    <Spinner size="xs" color="green.600" />
                  ) : (
                    <Box w="8px" h="8px" borderRadius="full" bg="gray.300" />
                  )}
                </Flex>
                <Text
                  fontSize="xs"
                  fontWeight={currentStep === 1 ? '700' : '600'}
                  color={currentStep >= 1 ? textColor : subtextColor}
                >
                  Verificación de integridad del aplicativo
                </Text>
              </HStack>

              {/* Step 2: Descarga de módulos */}
              <HStack
                spacing={3}
                p={2.5}
                borderRadius="xl"
                bg={currentStep === 2 && isUpdating ? 'green.50' : 'transparent'}
                transition="background 0.2s"
              >
                <Flex
                  w="26px"
                  h="26px"
                  borderRadius="full"
                  align="center"
                  justify="center"
                  bg={currentStep > 2 ? 'green.500' : currentStep === 2 && isUpdating ? 'green.100' : 'gray.100'}
                  color={currentStep > 2 ? 'white' : 'green.600'}
                >
                  {currentStep > 2 ? (
                    <Icon as={FiCheck} boxSize={3.5} />
                  ) : currentStep === 2 && isUpdating ? (
                    <Spinner size="xs" color="green.600" />
                  ) : (
                    <Box w="8px" h="8px" borderRadius="full" bg="gray.300" />
                  )}
                </Flex>
                <Text
                  fontSize="xs"
                  fontWeight={currentStep === 2 ? '700' : '600'}
                  color={currentStep >= 2 ? textColor : subtextColor}
                >
                  Descarga de módulos actualizados
                </Text>
              </HStack>

              {/* Step 3: Limpieza profunda de memoria y temporales */}
              <HStack
                spacing={3}
                p={2.5}
                borderRadius="xl"
                bg={currentStep === 3 && isUpdating ? 'green.50' : 'transparent'}
                transition="background 0.2s"
              >
                <Flex
                  w="26px"
                  h="26px"
                  borderRadius="full"
                  align="center"
                  justify="center"
                  bg={currentStep > 3 ? 'green.500' : currentStep === 3 && isUpdating ? 'green.100' : 'gray.100'}
                  color={currentStep > 3 ? 'white' : 'green.600'}
                >
                  {currentStep > 3 ? (
                    <Icon as={FiCheck} boxSize={3.5} />
                  ) : currentStep === 3 && isUpdating ? (
                    <Spinner size="xs" color="green.600" />
                  ) : (
                    <Box w="8px" h="8px" borderRadius="full" bg="gray.300" />
                  )}
                </Flex>
                <Text
                  fontSize="xs"
                  fontWeight={currentStep === 3 ? '700' : '600'}
                  color={currentStep >= 3 ? textColor : subtextColor}
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
              borderRadius="20px"
              p={4}
              mb={6}
            >
              <Text fontSize="xs" fontWeight="700" color={textColor} mb={2}>
                Novedades de la versión:
              </Text>
              <VStack align="stretch" spacing={1.5}>
                {updateInfo?.releaseNotes?.map((note, idx) => (
                  <HStack key={idx} align="flex-start" spacing={2}>
                    <Text color="green.500" fontSize="xs" fontWeight="bold">
                      •
                    </Text>
                    <Text fontSize="11px" color={subtextColor} lineHeight="short">
                      {note}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Box>

            {/* Action Button */}
            <Button
              w="full"
              h="52px"
              borderRadius="18px"
              bg="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              color="white"
              fontWeight="800"
              fontSize="sm"
              boxShadow="0 8px 25px rgba(16, 185, 129, 0.35)"
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
          </MotionBox>
        </AnimatePresence>
      </Box>
    </Portal>
  );
};
