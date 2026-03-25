import { useState } from "react";
import { useToast } from "@chakra-ui/react";
import { compressImage } from "../utils/deviceUtils";

export function useImageUpload() {
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const toast = useToast();

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingImage(true);

        try {
            const compressedFile = await compressImage(file, 1);
            setImage(compressedFile);

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
                setIsProcessingImage(false);
            };
            reader.readAsDataURL(compressedFile);
        } catch (error) {
            setIsProcessingImage(false);
            toast({
                title: "Error al procesar imagen",
                description: error.message || "Intenta con otra foto",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        }
    };

    const resetImage = () => {
        setImage(null);
        setImagePreview(null);
    };

    return {
        image,
        imagePreview,
        isProcessingImage,
        handleImageChange,
        resetImage,
    };
}