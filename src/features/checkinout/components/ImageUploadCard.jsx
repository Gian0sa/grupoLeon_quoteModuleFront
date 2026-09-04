import {
    Box,
    Flex,
    Icon,
    Text,
    Input,
    Button,
    Spinner,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalCloseButton,
    useColorModeValue,
    useDisclosure,
} from "@chakra-ui/react";
import { useRef } from "react";
import { FiCamera, FiClock, FiMaximize2, FiTrash2 } from "react-icons/fi";

export function ImageUploadCard({
    image,
    imagePreview,
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
                    <Text fontSize="sm" fontWeight="700" color="gray.800">
                        Fotografía de Verificación (Check-In)
                    </Text>
                </Flex>
                {image && onResetImage && (
                    <Button
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        leftIcon={<FiTrash2 />}
                        onClick={onResetImage}
                        fontSize="11px"
                    >
                        Quitar
                    </Button>
                )}
            </Flex>

            {isLoadingExistingImage && (
                <Flex justify="center" py={4}>
                    <Spinner size="sm" color="green.600" />
                </Flex>
            )}

            {!isLoadingExistingImage && hasExistingImage && !imagePreview && (
                <Box mb={4}>
                    <Flex align="center" mb={2} gap={2}>
                        <Icon as={FiClock} color="gray.400" boxSize={3.5} />
                        <Text fontSize="xs" color="gray.500" fontWeight="600">
                            Última fotografía registrada
                        </Text>
                    </Flex>

                    {/* Imagen clickeable */}
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
                            style={{ width: "100%", height: "180px", objectFit: "cover" }}
                        />
                        {/* Ícono de expansión */}
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
                            <Text fontSize="xs" color="white" fontWeight="600">Ampliar</Text>
                        </Flex>
                    </Box>
                </Box>
            )}

            {imagePreview && (
                <Box
                    mb={4}
                    borderRadius="xl"
                    overflow="hidden"
                    border="2px solid"
                    borderColor="green.400"
                    boxShadow="0 4px 14px rgba(34, 197, 94, 0.15)"
                >
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
                onClick={() => fileInputRef.current?.click()}
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
                loadingText="Procesando..."
            >
                {image ? "Cambiar Fotografía" : hasExistingImage ? "Actualizar Fotografía" : "Tomar / Subir Fotografía"}
            </Button>

            <Input
                ref={fileInputRef}
                type="file"
                id="file-input"
                key={fileInputKey}
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

            {/* Modal para ver imagen completa */}
            {hasExistingImage && (
                <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
                    <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(6px)" />
                    <ModalContent bg="transparent" boxShadow="none">
                        <ModalCloseButton color="white" bg="blackAlpha.500" borderRadius="full" zIndex={2} />
                        <Box p={2}>
                            <img
                                src={existingImageData.imageUrl}
                                alt="Foto ampliada"
                                style={{ width: "100%", borderRadius: "16px", maxHeight: "80vh", objectFit: "contain" }}
                            />
                        </Box>
                    </ModalContent>
                </Modal>
            )}
        </Box>
    );
}