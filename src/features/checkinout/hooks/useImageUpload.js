import { useState, useCallback, useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { compressImage } from "../utils/deviceUtils";

export function useImageUpload() {
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    // fileInputKey cambia en cada reset para forzar al browser a recrear el <input>
    // esto soluciona el bug donde seleccionar la misma foto no dispara onChange
    const [fileInputKey, setFileInputKey] = useState(0);
    const toast = useToast();

    // Limpieza de memoria al desmontar
    useEffect(() => {
        return () => {
            if (imagePreview && imagePreview.startsWith("blob:")) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleImageChange = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingImage(true);

        // Guardia de seguridad: si el proceso se congela (bug de browser móvil),
        // liberar el spinner y resetear el input después de 30s
        const safetyTimer = setTimeout(() => {
            setIsProcessingImage(false);
            setFileInputKey((k) => k + 1);
        }, 30000);

        try {
            const compressedFile = await compressImage(file, 0.35);
            setImage(compressedFile);

            // Usar URL.createObjectURL en lugar de Base64 gigante en memoria (evita OOM en móviles)
            const previewUrl = URL.createObjectURL(compressedFile);
            setImagePreview((prev) => {
                if (prev && prev.startsWith("blob:")) {
                    URL.revokeObjectURL(prev);
                }
                return previewUrl;
            });

            clearTimeout(safetyTimer);
            setIsProcessingImage(false);
        } catch (error) {
            clearTimeout(safetyTimer);
            setIsProcessingImage(false);
            setFileInputKey((k) => k + 1);
            toast({
                title: "Error al procesar imagen",
                description: error.message || "Intenta con otra foto",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        }
    }, [toast]);

    const resetImage = useCallback(() => {
        setImage(null);
        setImagePreview((prev) => {
            if (prev && prev.startsWith("blob:")) {
                URL.revokeObjectURL(prev);
            }
            return null;
        });
        setFileInputKey((k) => k + 1);
    }, []);

    return {
        image,
        imagePreview,
        isProcessingImage,
        handleImageChange,
        resetImage,
        fileInputKey,
    };
}