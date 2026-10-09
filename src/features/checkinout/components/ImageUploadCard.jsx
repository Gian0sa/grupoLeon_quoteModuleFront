import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Box,
    Flex,
    VStack,
    HStack,
    Icon,
    Text,
    Button,
    Badge,
    Spinner,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalCloseButton,
    useColorModeValue,
    useToast,
    IconButton,
} from "@chakra-ui/react";
import {
    FiCamera,
    FiClock,
    FiMaximize2,
    FiCheckCircle,
    FiTrash2,
    FiRefreshCw,
    FiX,
    FiCheck,
} from "react-icons/fi";
import { useDisclosure } from "@chakra-ui/react";

export function ImageUploadCard({
    image,
    imagePreview,
    imageInfo,
    isProcessingImage,
    onImageChange,
    onDirectImage,
    existingImageData,
    isLoadingExistingImage,
    fileInputKey,
    onResetImage,
}) {
    const hasExistingImage = existingImageData?.hasImage;
    const { isOpen, onOpen, onClose } = useDisclosure();
    const cardBg = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.100", "gray.700");
    const toast = useToast();

    // Estados de cámara en vivo (WebRTC / In-App)
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [stream, setStream] = useState(null);
    const [facingMode, setFacingMode] = useState("environment"); // "environment" = trasera por defecto
    const [isCapturing, setIsCapturing] = useState(false);
    const videoRef = useRef(null);
    const nativeCameraInputRef = useRef(null);

    // Detener la cámara y liberar tracks de hardware
    const stopCamera = useCallback((mediaStream = stream) => {
        if (mediaStream) {
            mediaStream.getTracks().forEach((track) => {
                try {
                    track.stop();
                } catch (e) {
                    // ignorar
                }
            });
        }
        setStream(null);
        setIsCameraActive(false);
        setIsCapturing(false);
    }, [stream]);

    // Iniciar cámara in-app con resolución óptima (evita OOM de 108MP de apps externas)
    const startCamera = useCallback(async (desiredFacingMode = facingMode) => {
        // Verificar soporte básico de WebRTC
        if (
            typeof navigator === "undefined" ||
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {
            // Si el navegador o webview no soporta getUserMedia, disparar fallback nativo
            nativeCameraInputRef.current?.click();
            return;
        }

        try {
            // Detener stream anterior si había uno
            if (stream) {
                stream.getTracks().forEach((t) => t.stop());
            }

            setIsCameraActive(true);

            // Solicitar cámara trasera (o frontal si se alternó) a 720p/1080p
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: desiredFacingMode },
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                },
                audio: false,
            });

            setStream(mediaStream);
        } catch (err) {
            console.warn("Fallo al iniciar cámara in-app:", err);
            setIsCameraActive(false);
            setStream(null);

            // Fallback transparente: abrir cámara nativa del sistema
            if (nativeCameraInputRef.current) {
                nativeCameraInputRef.current.click();
            } else {
                toast({
                    title: "Acceso a cámara",
                    description: "Por favor autoriza el permiso de cámara en tu navegador.",
                    status: "warning",
                    duration: 4000,
                    isClosable: true,
                    position: "top",
                });
            }
        }
    }, [facingMode, stream, toast]);

    // Asignar el stream al elemento <video> cuando esté montado
    useEffect(() => {
        if (isCameraActive && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
        }
    }, [isCameraActive, stream]);

    // Limpieza al desmontar el componente
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [stream]);

    // Cambiar entre cámara trasera y frontal
    const toggleFacingMode = () => {
        const nextMode = facingMode === "environment" ? "user" : "environment";
        setFacingMode(nextMode);
        startCamera(nextMode);
    };

    // Capturar la fotografía desde el visor de video
    const handleCapturePhoto = () => {
        if (!videoRef.current || isCapturing) return;
        setIsCapturing(true);

        try {
            const video = videoRef.current;
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            const ctx = canvas.getContext("2d", { willReadFrequently: false });

            if (facingMode === "user") {
                // Espejo para selfies
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            } else {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const file = new File(
                            [blob],
                            `checkin_${Date.now()}.jpg`,
                            { type: "image/jpeg", lastModified: Date.now() }
                        );
                        if (onDirectImage) {
                            onDirectImage(file);
                        }
                    }
                    // Liberar memoria gráfica del canvas inmediatamente
                    canvas.width = 0;
                    canvas.height = 0;
                    stopCamera();
                },
                "image/jpeg",
                0.85
            );
        } catch (err) {
            console.error("Error al capturar frame de video:", err);
            setIsCapturing(false);
            stopCamera();
            toast({
                title: "Error al capturar",
                description: "Ocurrió un problema capturando la imagen. Intenta de nuevo.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
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
            <Flex align="center" justify="space-between" mb={4}>
                <Flex align="center">
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
                    <Box>
                        <Text fontSize="sm" fontWeight="700" color="gray.800">
                            Fotografía de Verificación (Check-In)
                        </Text>
                        <Text fontSize="2xs" color="gray.500" fontWeight="500">
                            Captura obligatoria en tiempo real
                        </Text>
                    </Box>
                </Flex>

                {isCameraActive && (
                    <Badge colorScheme="red" variant="subtle" borderRadius="full" px={2} py={0.5} fontSize="2xs">
                        🔴 En Vivo
                    </Badge>
                )}
            </Flex>

            {isLoadingExistingImage && (
                <Flex justify="center" py={4}>
                    <Spinner size="sm" color="green.600" />
                </Flex>
            )}

            {/* Foto registrada previamente en SAP / backend */}
            {!isLoadingExistingImage && hasExistingImage && !imagePreview && !isCameraActive && (
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

            {/* VISOR DE CÁMARA EN VIVO (WebRTC In-App - Consumo <5MB RAM) */}
            {isCameraActive && (
                <Box mb={4} position="relative" borderRadius="2xl" overflow="hidden" bg="black">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                            width: "100%",
                            height: "240px",
                            objectFit: "cover",
                            borderRadius: "16px",
                            backgroundColor: "#000",
                        }}
                    />

                    {/* Botón flotante para alternar cámara (frontal / trasera) */}
                    <IconButton
                        aria-label="Cambiar cámara"
                        icon={<Icon as={FiRefreshCw} />}
                        size="sm"
                        position="absolute"
                        top={3}
                        right={3}
                        colorScheme="blackAlpha"
                        bg="blackAlpha.600"
                        color="white"
                        borderRadius="full"
                        onClick={toggleFacingMode}
                        _hover={{ bg: "blackAlpha.800" }}
                    />

                    {/* Controles de captura en vivo */}
                    <Flex
                        position="absolute"
                        bottom={3}
                        left={0}
                        right={0}
                        px={4}
                        justify="space-between"
                        align="center"
                    >
                        <Button
                            size="sm"
                            variant="ghost"
                            color="white"
                            bg="blackAlpha.500"
                            borderRadius="xl"
                            leftIcon={<Icon as={FiX} />}
                            onClick={() => stopCamera()}
                            _hover={{ bg: "blackAlpha.700" }}
                        >
                            Cancelar
                        </Button>

                        <Button
                            size="sm"
                            colorScheme="green"
                            bg="green.500"
                            color="white"
                            borderRadius="xl"
                            px={4}
                            leftIcon={<Icon as={FiCamera} />}
                            onClick={handleCapturePhoto}
                            isLoading={isCapturing}
                            loadingText="Capturando..."
                            boxShadow="0 4px 14px rgba(34, 197, 94, 0.4)"
                            _hover={{ bg: "green.600" }}
                        >
                            Capturar Foto
                        </Button>
                    </Flex>
                </Box>
            )}

            {/* PREVIEW DE LA FOTO CAPTURADA */}
            {imagePreview && !isCameraActive && (
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
                            alt="Preview de Fotografía"
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

            {/* BOTONES DE ACCIÓN: ÚNICAMENTE CÁMARA (CERO GALERÍA / CERO ARCHIVOS) */}
            {!isCameraActive && (
                <VStack spacing={2.5} width="100%">
                    {!imagePreview ? (
                        <Button
                            bg="green.500"
                            color="white"
                            width="100%"
                            h="48px"
                            borderRadius="xl"
                            fontSize="sm"
                            fontWeight="700"
                            cursor="pointer"
                            onClick={() => startCamera()}
                            leftIcon={
                                <Flex
                                    w="28px"
                                    h="28px"
                                    borderRadius="lg"
                                    bg="whiteAlpha.300"
                                    align="center"
                                    justify="center"
                                >
                                    <Icon as={FiCamera} color="white" boxSize={4} />
                                </Flex>
                            }
                            _hover={{
                                bg: "green.600",
                                transform: "translateY(-1px)",
                                boxShadow: "0 4px 14px rgba(34, 197, 94, 0.3)",
                            }}
                            transition="all 0.2s"
                            isLoading={isProcessingImage}
                            loadingText="Procesando foto..."
                        >
                            {hasExistingImage ? "Tomar Nueva Foto (Cámara)" : "Tomar Fotografía (Cámara)"}
                        </Button>
                    ) : (
                        <VStack spacing={2} width="100%">
                            <Button
                                width="100%"
                                h="44px"
                                bg="green.50"
                                color="green.800"
                                border="1.5px solid"
                                borderColor="green.300"
                                borderRadius="xl"
                                fontSize="xs"
                                fontWeight="700"
                                cursor="pointer"
                                onClick={() => startCamera()}
                                leftIcon={<Icon as={FiCamera} boxSize={3.5} />}
                                _hover={{ bg: "green.100", borderColor: "green.400" }}
                                isLoading={isProcessingImage}
                            >
                                Retomar Fotografía (Cámara)
                            </Button>

                            {onResetImage && (
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
                        </VStack>
                    )}
                </VStack>
            )}

            {/* Input nativo de fallback: EXCLUSIVO de captura por cámara (Sin opción de galería) */}
            <input
                ref={nativeCameraInputRef}
                key={`cam-${fileInputKey}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onImageChange}
                style={{ display: "none" }}
            />

            {/* Modal para ver imagen completa previa */}
            {hasExistingImage && (
                <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
                    <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(6px)" />
                    <ModalContent bg="transparent" boxShadow="none">
                        <ModalCloseButton color="white" bg="blackAlpha.500" borderRadius="full" zIndex={2} />
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