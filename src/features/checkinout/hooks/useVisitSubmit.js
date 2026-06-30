import { useState } from "react";
import { useToast } from "@chakra-ui/react";
import { useCreateVisitLog } from "../../checkinout/hooks/mutations/visitLogMutations";
import { getLocation } from "../utils/deviceUtils";
import { useNavigate } from "react-router-dom";
import { addToQueue, getQueueCount } from "../services/visitLogQueue";

const LOCATION_ERRORS = {
    GEOLOCATION_NOT_SUPPORTED: {
        title: "Geolocalización no disponible",
        description: "Tu navegador no soporta geolocalización",
    },
    PERMISSION_DENIED: {
        title: "Permiso denegado",
        description: "Debes permitir el acceso a la ubicación",
    },
    POSITION_UNAVAILABLE: {
        title: "Ubicación no disponible",
        description: "No se pudo determinar tu ubicación. Verifica el GPS",
    },
    TIMEOUT: {
        title: "Tiempo agotado",
        description: "Tardó mucho en obtener la ubicación. Intenta de nuevo",
    },
};

export function useVisitSubmit({ username, userCode, hasActiveCheckIn, activeVisit, selectedClient, image, existingImageData }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { mutate: createVisit, isLoading: isCreatingVisit, isPending } = useCreateVisitLog();
    const toast = useToast();
    const navigate = useNavigate();

    const validate = (type) => {
        if (type === "IN" && hasActiveCheckIn) {
            toast({
                title: "Check-In ya registrado",
                description: `Tienes un Check-In activo en "${activeVisit.storeName}" desde ${new Date(
                    activeVisit.createdAt
                ).toLocaleTimeString()}. Debes hacer Check-Out primero.`,
                status: "warning",
                duration: 5000,
                isClosable: true,
            });
            return false;
        }

        if (type === "OUT" && !hasActiveCheckIn) {
            toast({
                title: "Sin Check-In activo",
                description: "No tienes un Check-In abierto. Debes hacer Check-In primero.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return false;
        }

        if (type === "IN" && !image) {
            const hasValidExisting = existingImageData?.hasImage && existingImageData?.isValid;
            if (!hasValidExisting) {
                toast({
                    title: "Imagen requerida",
                    description: "Debes subir una imagen para el Check-In",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
                return false;
            }
        }

        if (!selectedClient) {
            toast({
                title: "Cliente requerido",
                description: "Debes buscar y seleccionar un cliente",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }

        return true;
    };

    const submit = async (type, { onSuccess, onError }) => {
        if (!validate(type)) return;

        setIsSubmitting(true);

        try {
            const location = await getLocation();

            const formData = new FormData();
            console.log("selectedClient", selectedClient);
            formData.append("type", type);
            formData.append("vendorName", username);
            formData.append("vendorCode", userCode);
            formData.append("storeName", selectedClient.firstName);
            formData.append("createdAt", new Date().toISOString());
            formData.append("uuid", crypto.randomUUID());

            // Caso SAP
            if (selectedClient.type === "SAP") {
                formData.append("sapCode", selectedClient.sapCode);
            }
            // Caso cliente nuevo
            if (selectedClient.type === "NEW") {
                formData.append(
                    "newClientData",
                    JSON.stringify({
                        fullName: selectedClient.firstName,
                        personType: selectedClient.personType,
                        documentType: selectedClient.documentType,
                        documentNumber: selectedClient.documentNumber,
                        phone: selectedClient.phone,
                        email: selectedClient.email,
                    })
                );
            }
            formData.append("latitude", location.latitude);
            formData.append("longitude", location.longitude);

            if (type === "IN" && image) {
                formData.append("image", image);
            } else if (type === "IN" && !image && existingImageData?.hasImage && existingImageData?.isValid) {
                formData.append("existingImageUrl", existingImageData.imageUrl);
            }

            // Antes de enviar, verificar si hay operaciones pendientes en la cola
            const queueCount = await getQueueCount();
            if (queueCount > 0) {
                const localId = await addToQueue(formData);
                toast({
                    title: `Check-${type === "IN" ? "In" : "Out"} guardado localmente`,
                    description: `Hay otras operaciones pendientes en cola. Se sincronizará automáticamente.`,
                    status: "warning",
                    duration: 5000,
                    isClosable: true,
                    position: "top",
                });
                setIsSubmitting(false);
                onSuccess?.({ isLocal: true, id: localId }, type);
                if (type === "IN") {
                    navigate(`/clienteBusqueda?storeName=${encodeURIComponent(selectedClient.firstName)}`);
                }
                return;
            }

            createVisit(formData, {
                onSuccess: async (data) => {
                    toast({
                        title: type === "IN" ? "Check-in registrado" : "Check-out registrado",
                        description: `Check ${type} registrado correctamente en el servidor.`,
                        status: "success",
                        duration: 3000,
                        isClosable: true,
                        position: "top",
                    });
                    setIsSubmitting(false);
                    onSuccess?.(data, type);
                    if (type === "IN") {
                        navigate(`/clienteBusqueda?storeName=${encodeURIComponent(selectedClient.firstName)}`);
                    }
                },
                onError: async (error) => {
                    try {
                        const localId = await addToQueue(formData);
                        toast({
                            title: `Check-${type === "IN" ? "In" : "Out"} guardado localmente`,
                            description: `La operación quedó pendiente de sincronización debido a un fallo de red o del servidor.`,
                            status: "warning",
                            duration: 5000,
                            isClosable: true,
                            position: "top",
                        });
                        setIsSubmitting(false);
                        onSuccess?.({ isLocal: true, id: localId }, type);
                        if (type === "IN") {
                            navigate(`/clienteBusqueda?storeName=${encodeURIComponent(selectedClient.firstName)}`);
                        }
                    } catch (queueError) {
                        console.error("Failed to add to queue:", queueError);
                        toast({
                            title: "Error al registrar",
                            description: error?.response?.data?.message || error?.message || "Error al registrar y guardar",
                            status: "error",
                            duration: 5000,
                            isClosable: true,
                            position: "top",
                        });
                        setIsSubmitting(false);
                        onError?.(error);
                    }
                },
            });
        } catch (error) {
            const locationError = LOCATION_ERRORS[error.message];
            toast({
                title: locationError?.title || "Error",
                description: locationError?.description || error.message || "Error desconocido",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            setIsSubmitting(false);
        }
    };

    return { submit, isCreatingVisit, isPending, isSubmitting };
}