import { useState, useCallback } from "react";
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
            const compressedFile = await compressImage(file, 1);
            setImage(compressedFile);

            const reader = new FileReader();
            reader.onloadend = () => {
                clearTimeout(safetyTimer);
                setImagePreview(reader.result);
                setIsProcessingImage(false);
            };
            reader.onerror = () => {
                clearTimeout(safetyTimer);
                setIsProcessingImage(false);
                // Incrementar key para resetear el input y permitir reintento
                setFileInputKey((k) => k + 1);
                toast({
                    title: "Error al leer imagen",
                    description: "No se pudo leer el archivo. Intenta de nuevo.",
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                });
            };
            reader.readAsDataURL(compressedFile);
        } catch (error) {
            clearTimeout(safetyTimer);
            setIsProcessingImage(false);
            // Incrementar key para resetear el input y permitir reintento
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
        setImagePreview(null);
        // Incrementar key para forzar recreación del <input type="file">
        // Esto permite seleccionar la misma foto de nuevo sin que el proceso se congele
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