import { useState, useCallback, useEffect, useRef } from "react";
import { useToast } from "@chakra-ui/react";
import { compressImage, createImagePreviewUrl, revokeImagePreviewUrl, clearCameraPending } from "../utils/deviceUtils";
import { sendDeviceTelemetry } from "../services/telemetryService";

export function useImageUpload() {
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageInfo, setImageInfo] = useState(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [fileInputKey, setFileInputKey] = useState(0);
    const mountedRef = useRef(false);
    const imageRef = useRef(null);
    const previewRef = useRef(null);
    const operationRef = useRef(null);
    const toast = useToast();

    const releasePreview = useCallback(() => {
        revokeImagePreviewUrl(previewRef.current);
        previewRef.current = null;
    }, []);
    const replacePreview = useCallback((file) => {
        releasePreview();
        const url = file ? createImagePreviewUrl(file) : null;
        previewRef.current = url;
        setImagePreview(url);
    }, [releasePreview]);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            operationRef.current?.abort();
            releasePreview();
            imageRef.current = null;
        };
    }, [releasePreview]);

    const processImage = useCallback(async (fileOrBlob) => {
        // El candado permanece hasta que el decodificador termina, también tras reset.
        if (!fileOrBlob || operationRef.current || !mountedRef.current) return;
        const operation = new AbortController();
        operationRef.current = operation;
        setIsProcessingImage(true);
        try {
            const file = fileOrBlob instanceof File ? fileOrBlob
                : new File([fileOrBlob], "foto_checkin.jpg", { type: fileOrBlob.type || "image/jpeg" });
            const compressed = await compressImage(file, { signal: operation.signal });
            if (!mountedRef.current || operation.signal.aborted) return;
            replacePreview(compressed);
            imageRef.current = compressed;
            setImage(compressed);
            setImageInfo(compressed.optimizedInfo || null);
            void sendDeviceTelemetry("IMAGE_OPTIMIZED_SUCCESS", {
                originalSizeKB: Math.round(file.size / 1024),
                optimizedSizeKB: compressed.optimizedInfo?.sizeKB,
                dimensions: compressed.optimizedInfo?.width + "x" + compressed.optimizedInfo?.height,
                profile: compressed.optimizedInfo?.profile,
            });
        } catch (error) {
            if (!mountedRef.current || operation.signal.aborted) return;
            if (imageRef.current && !previewRef.current) {
                try { replacePreview(imageRef.current); } catch { /* La asignación del preview también puede fallar. */ }
            }
            void sendDeviceTelemetry("IMAGE_PROCESSING_ERROR", {
                errorMessage: error?.message || "Error al procesar",
                originalSizeKB: Math.round(fileOrBlob.size / 1024),
            });
            toast({
                title: "Error al procesar imagen", description: error.message || "Intenta con otra foto",
                status: "error", duration: 5000, isClosable: true,
            });
        } finally {
            clearCameraPending();
            if (operationRef.current === operation) operationRef.current = null;
            if (mountedRef.current) {
                setIsProcessingImage(false);
                setFileInputKey((key) => key + 1);
            }
        }
    }, [replacePreview, toast]);

    const handleCameraCancel = useCallback(() => {
        clearCameraPending();
        if (mountedRef.current && imageRef.current && !previewRef.current) replacePreview(imageRef.current);
    }, [replacePreview]);
    const handleImageChange = useCallback((event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) { handleCameraCancel(); return; }
        return processImage(file);
    }, [processImage, handleCameraCancel]);
    const prepareForCamera = useCallback(() => {
        releasePreview();
        setImagePreview(null);
    }, [releasePreview]);
    const resetImage = useCallback(() => {
        operationRef.current?.abort();
        clearCameraPending();
        imageRef.current = null;
        setImage(null);
        setImageInfo(null);
        replacePreview(null);
        setFileInputKey((key) => key + 1);
    }, [replacePreview]);
    return {
        image, imagePreview, imageInfo, isProcessingImage, handleImageChange,
        setDirectImage: processImage, resetImage, fileInputKey, prepareForCamera, handleCameraCancel,
    };
}