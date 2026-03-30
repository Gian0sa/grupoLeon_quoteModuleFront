import { Box, Flex, Icon, Text, Input, Button, Badge, Spinner, Modal, ModalOverlay, ModalContent, ModalCloseButton } from "@chakra-ui/react";
import { FiCamera, FiClock, FiMaximize2 } from "react-icons/fi";
import { useDisclosure } from "@chakra-ui/react";

export function ImageUploadCard({
    image,
    imagePreview,
    isProcessingImage,
    onImageChange,
    existingImageData,
    isLoadingExistingImage,
}) {
    const hasExistingImage = existingImageData?.hasImage;
    const { isOpen, onOpen, onClose } = useDisclosure();

    return (
        <Box bg="white" p={4} borderRadius="lg" boxShadow="sm">
            <Flex align="center" mb={3}>
                <Icon as={FiCamera} color="green.600" mr={2} />
                <Text fontSize="sm" fontWeight="500" color="gray.600">
                    Fotografía (Check-In)
                </Text>
            </Flex>

            {isLoadingExistingImage && (
                <Flex justify="center" py={3}>
                    <Spinner size="sm" color="green.500" />
                </Flex>
            )}

            {!isLoadingExistingImage && hasExistingImage && !imagePreview && (
                <Box mb={3}>
                    <Flex align="center" mb={1} gap={2}>
                        <Icon as={FiClock} color="gray.400" boxSize={3} />
                        <Text fontSize="xs" color="gray.500">
                            Última foto registrada
                        </Text>
                    </Flex>

                    {/* Imagen clickeable */}
                    <Box
                        borderRadius="md"
                        overflow="hidden"
                        border="2px solid"
                        borderColor={existingImageData.isValid ? "green.200" : "orange.200"}
                        opacity={0.85}
                        position="relative"
                        cursor="pointer"
                        onClick={onOpen}
                        _hover={{ opacity: 1 }}
                        transition="opacity 0.2s"
                    >
                        <img
                            src={existingImageData.imageUrl}
                            alt="Foto anterior"
                            style={{ width: "100%", height: "160px", objectFit: "cover" }}
                        />
                        {/* Ícono de expansión */}
                        <Flex
                            position="absolute"
                            bottom={2}
                            right={2}
                            bg="blackAlpha.600"
                            borderRadius="md"
                            p={1}
                            align="center"
                            gap={1}
                        >
                            <Icon as={FiMaximize2} color="white" boxSize={3} />
                            <Text fontSize="xs" color="white">Ver</Text>
                        </Flex>
                    </Box>
                </Box>
            )}

            {imagePreview && (
                <Box mb={3} borderRadius="md" overflow="hidden" border="2px solid" borderColor="green.200">
                    <img
                        src={imagePreview}
                        alt="Preview"
                        style={{ width: "100%", height: "200px", objectFit: "cover" }}
                    />
                </Box>
            )}

            <Button
                as="label"
                htmlFor="file-input"
                variant="outline"
                colorScheme="green"
                width="100%"
                cursor="pointer"
                leftIcon={<FiCamera />}
                size="lg"
                isLoading={isProcessingImage}
                loadingText="Procesando..."
            >
                {image ? "Cambiar Foto" : hasExistingImage ? "Actualizar Foto" : "Tomar/Subir Foto"}
            </Button>

            <Input
                id="file-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onImageChange}
                display="none"
            />

            {image && (
                <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">
                    Tamaño: {(image.size / 1024).toFixed(2)} KB
                </Text>
            )}

            {/* Modal fullscreen */}
            <Modal isOpen={isOpen} onClose={onClose} size="full" isCentered>
                <ModalOverlay bg="blackAlpha.900" />
                <ModalContent bg="transparent" boxShadow="none">
                    <ModalCloseButton color="white" size="lg" zIndex={10} />
                    <Flex align="center" justify="center" h="100vh" p={4} onClick={onClose}>
                        <img
                            src={existingImageData?.imageUrl}
                            alt="Foto completa"
                            style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: "8px" }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </Flex>
                </ModalContent>
            </Modal>
        </Box>
    );
}