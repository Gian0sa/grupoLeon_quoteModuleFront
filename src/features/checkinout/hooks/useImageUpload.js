import { useState, useCallback, useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { compressImage } from "../utils/deviceUtils";

export function useImageUpload() {
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageInfo, setImageInfo] = useState(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    // fileInputKey cambia en cada selección para forzar al browser a recrear el <input>
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
        // CRÍTICO PARA MÓVILES: Limpiar inmediatamente el valor del input nativo.
        // Si no se limpia, cuando el usuario toma una foto nueva pero el sistema móvil
        // le asigna el mismo nombre de archivo temporal, el evento onChange NO se vuelve a disparar.
        if (e.target) {
            e.target.value = "";
        }
        if (!file) return;

        setIsProcessingImage(true);

        // Guardia de seguridad reducida a 10s: si el proceso se congela, liberar el spinner
        const safetyTimer = setTimeout(() => {
            setIsProcessingImage(false);
            setFileInputKey((k) => k + 1);
        }, 10000);

        try {
            const compressedFile = await compressImage(file);
            setImage(compressedFile);
            if (compressedFile.optimizedInfo) {
                setImageInfo(compressedFile.optimizedInfo);
            }

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
            // Recrear el input para el próximo cambio
            setFileInputKey((k) => k + 1);
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
        setImageInfo(null);
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
        imageInfo,
        isProcessingImage,
        handleImageChange,
        resetImage,
        fileInputKey,
    };
}