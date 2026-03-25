import { useState } from "react";
import { useToast } from "@chakra-ui/react";
import { useCreateVisitLog } from "../../checkinout/hooks/mutations/visitLogMutations";
import { getLocation } from "../utils/deviceUtils";

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

export function useVisitSubmit({ username, hasActiveCheckIn, activeVisit, selectedClient, image }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { mutate: createVisit, isLoading: isCreatingVisit, isPending } = useCreateVisitLog();
    const toast = useToast();

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
            toast({
                title: "Imagen requerida",
                description: "Debes subir una imagen para el Check-In",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
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
            formData.append("type", type);
            formData.append("vendorName", username);
            formData.append("storeName", selectedClient.firstName);
            formData.append("latitude", location.latitude);
            formData.append("longitude", location.longitude);

            if (type === "IN" && image) {
                formData.append("image", image);
            }

            createVisit(formData, {
                onSuccess: async (data) => {
                    toast({
                        title: "¡Registro exitoso!",
                        description: `Check ${type} registrado correctamente`,
                        status: "success",
                        duration: 3000,
                        isClosable: true,
                    });
                    setIsSubmitting(false);
                    onSuccess?.(data, type);
                },
                onError: (error) => {
                    let errorMessage = "Error desconocido";
                    if (error.response) {
                        errorMessage =
                            error.response.data?.message || `Error ${error.response.status}`;
                    } else if (error.request) {
                        errorMessage = "No se recibió respuesta del servidor";
                    } else {
                        errorMessage = error.message;
                    }

                    toast({
                        title: "Error al registrar",
                        description: errorMessage,
                        status: "error",
                        duration: 5000,
                        isClosable: true,
                    });
                    setIsSubmitting(false);
                    onError?.(error);
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