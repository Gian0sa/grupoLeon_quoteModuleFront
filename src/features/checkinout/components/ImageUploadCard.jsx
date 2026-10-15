import React, { useRef, useEffect } from "react";
import {
    Box,
    Flex,
    VStack,
    Icon,
    Text,
    Button,
    Badge,
    Spinner,
    Alert,
    AlertIcon,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalCloseButton,
    useColorModeValue,
    useDisclosure,
} from "@chakra-ui/react";
import {
    FiCamera,
    FiClock,
    FiMaximize2,
    FiCheckCircle,
    FiTrash2,
} from "react-icons/fi";
import { purgeMemoryBeforeCamera } from "../utils/deviceUtils";
import { sendDeviceTelemetry } from "../services/telemetryService";

/**
 * ImageUploadCard
 * Componente exclusivo de Cámara en vivo (Check-In) con optimización universal de memoria.
 * Requiere toma de fotografía en tiempo real para validar la presencia del vendedor en el cliente.
 */
export function ImageUploadCard({
    image,
    imagePreview,
    imageInfo,
    isProcessingImage,
    hasError = false,
    cameraRecoveryFailed = false,
    onImageChange,
    existingImageData,
    isLoadingExistingImage,
    fileInputKey,
    onResetImage,
    onBeforeCamera,
    onCameraCancel,
}) {
    const hasExistingImage = existingImageData?.hasImage;
    const { isOpen, onOpen, onClose } = useDisclosure();
    const cardBg = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.100", "gray.700");
    const fileInputRef = useRef(null);

    useEffect(() => {
        const input = fileInputRef.current;
        const handleCancel = () => onCameraCancel?.();
        input?.addEventListener("cancel", handleCancel);
        return () => input?.removeEventListener("cancel", handleCancel);
    }, [fileInputKey, onCameraCancel]);

    const handleOpenNativeCamera = () => {
        if (!fileInputRef.current || isProcessingImage) return;
        onBeforeCamera?.();
        // Purga preventiva de memoria síncrona para no perder la activación por gesto del usuario
        purgeMemoryBeforeCamera();
        sendDeviceTelemetry("CAMERA_LAUNCH", { action: "Botón pulsado" });
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <Box
            bg={cardBg}
            p={{ base: 5, md: 6 }}
            borderRadius="2xl"
            boxShadow="0 8px 24px rgba(0,0,0,0.04)"
            border="1px solid"
            borderColor={borderColor}
        >
            {/* Encabezado original */}
            <Flex align="center" mb={4}>
                <Flex
                    w="34px"
                    h="34px"
                    borderRadius="xl"
                    bg="green.50"
                    align="center"
                    justify="center"
                    mr={3}
                >
                    <Icon as={FiCamera} color="green.600" boxSize={4} />
                </Flex>
                <Text fontSize="sm" fontWeight="700" color="gray.800">
                    Fotografía de Verificación (Check-In)
                </Text>
            </Flex>

            {/* Spinner si carga imagen anterior desde el servidor */}
            {isLoadingExistingImage && (
                <Flex justify="center" py={4}>
                    <Spinner size="sm" color="green.600" />
                </Flex>
            )}

            {/* Fotografía previa registrada en SAP / backend */}
            {!isLoadingExistingImage && hasExistingImage && !imagePreview && (
                <Box mb={4}>
                    <Flex align="center" mb={2} gap={2}>
                        <Icon as={FiClock} color="gray.400" boxSize={3.5} />
                        <Text fontSize="xs" color="gray.500" fontWeight="600">
                            Última fotografía registrada
                        </Text>
                    </Flex>

                    <Box
                        borderRadius="xl"
                        overflow="hidden"
                        border="2px solid"
                        borderColor={existingImageData.isValid ? "green.300" : "amber.300"}
                        position="relative"
                        cursor="pointer"
                        onClick={onOpen}
                        _hover={{ opacity: 0.95 }}
                        transition="all 0.2s"
                        boxShadow="0 4px 14px rgba(0,0,0,0.08)"
                    >
                        <img
                            src={existingImageData.imageUrl}
                            alt="Foto anterior"
                            loading="lazy"
                            decoding="async"
                            style={{ width: "100%", height: "180px", objectFit: "cover" }}
                        />
                        <Flex
                            position="absolute"
                            bottom={3}
                            right={3}
                            bg="blackAlpha.700"
                            backdropFilter="blur(4px)"
                            borderRadius="lg"
                            px={2.5}
                            py={1}
                            align="center"
                            gap={1.5}
                        >
                            <Icon as={FiMaximize2} color="white" boxSize={3.5} />
                            <Text fontSize="xs" color="white" fontWeight="600">
                                Ampliar
                            </Text>
                        </Flex>
                    </Box>
                </Box>
            )}

            {/* Preview de la foto recién capturada */}
            {imagePreview && (
                <Box mb={4}>
                    <Box
                        borderRadius="xl"
                        overflow="hidden"
                        border="2px solid"
                        borderColor="green.400"
                        boxShadow="0 4px 14px rgba(34, 197, 94, 0.15)"
                    >
                        <img
                            src={imagePreview}
                            alt="Preview"
                            decoding="async"
                            style={{ width: "100%", height: "200px", objectFit: "cover" }}
                        />
                    </Box>

                    {imageInfo && (
                        <Flex
                            mt={2}
                            px={3}
                            py={1.5}
                            bg="green.50"
                            borderRadius="lg"
                            align="center"
                            justify="space-between"
                            border="1px solid"
                            borderColor="green.200"
                        >
                            <Flex align="center" gap={1.5}>
                                <Icon as={FiCheckCircle} color="green.600" boxSize={3.5} />
                                <Text fontSize="xs" fontWeight="700" color="green.800">
                                    Foto Optimizada ({imageInfo.sizeKB} KB)
                                </Text>
                            </Flex>
                            <Badge
                                colorScheme={imageInfo.profile === "LITE" ? "purple" : "green"}
                                variant="subtle"
                                fontSize="2xs"
                                borderRadius="md"
                                px={1.5}
                            >
                                {imageInfo.profileLabel}
                            </Badge>
                        </Flex>
                    )}
                </Box>
            )}

            {/* BOTÓN DE CAPTURA EXCLUSIVA CON CÁMARA EN VIVO */}
            <VStack spacing={2.5} width="100%">
                <Button
                    onClick={handleOpenNativeCamera}
                    bg="gray.50"
                    color="gray.700"
                    border="1.5px dashed"
                    borderColor="gray.300"
                    width="100%"
                    h="52px"
                    borderRadius="xl"
                    fontSize="sm"
                    fontWeight="700"
                    cursor="pointer"
                    leftIcon={
                        <Flex
                            w="30px"
                            h="30px"
                            borderRadius="lg"
                            bg="white"
                            align="center"
                            justify="center"
                            border="1px solid"
                            borderColor="gray.200"
                            boxShadow="0 2px 5px rgba(0,0,0,0.05)"
                        >
                            <Icon as={FiCamera} color="gray.600" boxSize={4} />
                        </Flex>
                    }
                    _hover={{
                        bg: "gray.100",
                        borderColor: "green.500",
                        color: "green.800",
                        transform: "translateY(-1px)",
                    }}
                    transition="all 0.2s"
                    isLoading={isProcessingImage}
                    loadingText="Procesando foto..."
                >
                    {image
                        ? "Tomar otra con Cámara"
                        : hasExistingImage
                        ? "Actualizar con Cámara"
                        : "Tomar Fotografía (Cámara en vivo)"}
                </Button>

                {imagePreview && onResetImage && (
                    <Button
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={onResetImage}
                        leftIcon={<Icon as={FiTrash2} boxSize={3} />}
                    >
                        Quitar fotografía seleccionada
                    </Button>
                )}

                {/* Alerta si el SO cerró la cámara por RAM */}
                {(cameraRecoveryFailed || (hasError && !image)) && (
                    <Alert
                        status="warning"
                        variant="subtle"
                        borderRadius="xl"
                        py={2.5}
                        px={3.5}
                        alignItems="flex-start"
                    >
                        <AlertIcon boxSize={4} mt={0.5} />
                        <Box flex="1" textAlign="left" mr={2}>
                            <Text fontSize="xs" fontWeight="700" color="orange.800">
                                Aviso de memoria en tu celular
                            </Text>
                            <Text fontSize="2xs" color="gray.600" mt={0.5}>
                                Tu teléfono liberó memoria al abrir la cámara. Te sugerimos <strong>cerrar aplicaciones en segundo plano</strong> (TikTok, YouTube, WhatsApp) y volver a presionar <strong>Tomar Fotografía</strong>.
                            </Text>
                        </Box>
                    </Alert>
                )}
            </VStack>

            {/* Input nativo de cámara: abre exclusivamente la app de cámara en vivo a pantalla completa */}
            <input
                ref={fileInputRef}
                key={`cam-${fileInputKey}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onImageChange}
                style={{ display: "none" }}
            />

            {/* Modal para ver imagen ampliada si existía foto previa en SAP */}
            {hasExistingImage && (
                <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
                    <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(6px)" />
                    <ModalContent bg="transparent" boxShadow="none">
                        <ModalCloseButton
                            color="white"
                            bg="blackAlpha.500"
                            borderRadius="full"
                            zIndex={2}
                        />
                        <Box p={2}>
                            <img
                                src={existingImageData.imageUrl}
                                alt="Foto ampliada"
                                decoding="async"
                                style={{
                                    width: "100%",
                                    borderRadius: "16px",
                                    maxHeight: "80vh",
                                    objectFit: "contain",
                                }}
                            />
                        </Box>
                    </ModalContent>
                </Modal>
            )}
        </Box>
    );
}

export default ImageUploadCard;