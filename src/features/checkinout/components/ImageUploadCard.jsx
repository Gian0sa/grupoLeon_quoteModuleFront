import React, { useRef } from "react";
import {
    Box,
    Flex,
    VStack,
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
    useDisclosure,
} from "@chakra-ui/react";
import {
    FiCamera,
    FiClock,
    FiMaximize2,
    FiCheckCircle,
    FiTrash2,
    FiRefreshCw,
} from "react-icons/fi";

/**
 * ImageUploadCard
 * Componente para captura de fotografía de verificación de Check-In.
 * Utiliza la cámara nativa del dispositivo a pantalla completa (vía capture="environment")
 * garantizando la experiencia original del teléfono sin visores web recortados ni consumo excesivo de RAM.
 */
export function ImageUploadCard({
    image,
    imagePreview,
    imageInfo,
    isProcessingImage,
    onImageChange,
    existingImageData,
    isLoadingExistingImage,
    fileInputKey,
    onResetImage,
}) {
    const hasExistingImage = existingImageData?.hasImage;
    const { isOpen, onOpen, onClose } = useDisclosure();
    const cardBg = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.100", "gray.700");
    const fileInputRef = useRef(null);

    const handleOpenNativeCamera = () => {
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
            {/* Encabezado */}
            <Flex align="center" justify="space-between" mb={4}>
                <Flex align="center">
                    <Flex
                        w="36px"
                        h="36px"
                        borderRadius="xl"
                        bg="green.50"
                        align="center"
                        justify="center"
                        mr={3}
                    >
                        <Icon as={FiCamera} color="green.600" boxSize={4.5} />
                    </Flex>
                    <Box>
                        <Text fontSize="sm" fontWeight="700" color="gray.800">
                            Fotografía de Verificación (Check-In)
                        </Text>
                        <Text fontSize="2xs" color="gray.500" fontWeight="500">
                            Apertura directa de la cámara del teléfono
                        </Text>
                    </Box>
                </Flex>
            </Flex>

            {/* Spinner si carga imagen anterior desde el servidor */}
            {isLoadingExistingImage && (
                <Flex justify="center" py={4}>
                    <Spinner size="sm" color="green.600" />
                </Flex>
            )}

            {/* Fotografía previamente registrada en SAP / base de datos */}
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
                        borderColor={existingImageData.isValid ? "green.300" : "orange.300"}
                        position="relative"
                        cursor="pointer"
                        onClick={onOpen}
                        _hover={{ opacity: 0.95 }}
                        transition="all 0.2s"
                        boxShadow="0 4px 14px rgba(0,0,0,0.08)"
                    >
                        <img
                            src={existingImageData.imageUrl}
                            alt="Foto anterior registrada"
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

            {/* Preview de la fotografía recién capturada */}
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
                            alt="Preview de fotografía tomada"
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

            {/* Botones de acción - DISPARAN DIRECTAMENTE LA CÁMARA NATIVA DEL CELULAR A PANTALLA COMPLETA */}
            <VStack spacing={2.5} width="100%">
                {!imagePreview ? (
                    <Button
                        bg="green.500"
                        color="white"
                        width="100%"
                        h="50px"
                        borderRadius="xl"
                        fontSize="sm"
                        fontWeight="700"
                        cursor="pointer"
                        onClick={handleOpenNativeCamera}
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
                        loadingText="Optimizando fotografía..."
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
                            onClick={handleOpenNativeCamera}
                            leftIcon={<Icon as={FiRefreshCw} boxSize={3.5} />}
                            _hover={{ bg: "green.100", borderColor: "green.400" }}
                            isLoading={isProcessingImage}
                            loadingText="Procesando..."
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

            {/* Input nativo de cámara: abre directamente la app de cámara del celular en pantalla completa */}
            <input
                ref={fileInputRef}
                key={`cam-${fileInputKey}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onImageChange}
                style={{ display: "none" }}
            />

            {/* Modal para ver imagen ampliada previa si existía en SAP */}
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