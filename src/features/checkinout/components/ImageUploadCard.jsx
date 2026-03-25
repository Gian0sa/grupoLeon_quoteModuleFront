import { Box, Flex, Icon, Text, Input, Button } from "@chakra-ui/react";
import { FiCamera } from "react-icons/fi";

export function ImageUploadCard({ image, imagePreview, isProcessingImage, onImageChange }) {
    return (
        <Box bg="white" p={4} borderRadius="lg" boxShadow="sm">
            <Flex align="center" mb={3}>
                <Icon as={FiCamera} color="green.600" mr={2} />
                <Text fontSize="sm" fontWeight="500" color="gray.600">
                    Fotografía (Check-In)
                </Text>
            </Flex>

            {imagePreview && (
                <Box
                    mb={3}
                    borderRadius="md"
                    overflow="hidden"
                    border="2px solid"
                    borderColor="green.200"
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
                variant="outline"
                colorScheme="green"
                width="100%"
                cursor="pointer"
                leftIcon={<FiCamera />}
                size="lg"
                isLoading={isProcessingImage}
                loadingText="Procesando..."
            >
                {image ? "Cambiar Foto" : "Tomar/Subir Foto"}
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
        </Box>
    );
}