import { VStack, Box, Heading, Input, Button, Divider, Spinner, Flex } from "@chakra-ui/react";
import { useState } from "react";
import { useCreateVisitLog } from "../hooks/mutations/visitLogMutations";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { BackButton } from "../../../components/BackButton";

// Utilidad para obtener ubicación
const getLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject("Geolocalización no soportada");
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                });
            },
            (err) => reject(err),
            { enableHighAccuracy: true }
        );
    });
};

export default function VisitLogPage() {
    // Vendedor se obtiene del auth store
    const { salesEmployeeCode, username } = useAuthStore();
    const [storeName, setStoreName] = useState("Tienda Prueba");
    const [image, setImage] = useState(null);


    const { mutate: createVisit, isLoading } = useCreateVisitLog();

    const handleSubmit = async (type) => {
    try {
        const location = await getLocation();

        const formData = new FormData();
        formData.append("type", type);
        formData.append("vendorName", username);
        formData.append("storeName", storeName);
        formData.append("latitude", location.latitude);
        formData.append("longitude", location.longitude);

        if (image) {
        formData.append("image", image);
        }

        createVisit(formData);
    } catch (error) {
        console.error("Error obteniendo ubicación", error);
    }
    };


    return (
        <Box maxW="md" mx="auto" mt={10} p={6} borderWidth="1px" borderRadius="xl">
            <Flex
                bg="green.700"
                color="white"
                align="center"
                justify="center"
                w="100%"
                minH={{ base: "44px", md: "56px" }}
                px={{ base: 2, md: 4 }}
                borderRadius={{ base: "md", md: "xl" }}
                position="relative"
            >
                <Box position="absolute" left={2}>
                    <BackButton color="white" />
                </Box>

                <Heading
                    textAlign="center"
                    fontSize={{ base: "md", sm: "lg", md: "xl" }}
                    noOfLines={1}
                >
                    Registro de Visita
                </Heading>
            </Flex>

            <VStack spacing={4}>
                {/* Vendedor desde sesión */}
                <Input
                    placeholder="Vendedor"
                    value={username || ""}
                    isReadOnly
                />

                <Input
                    placeholder="Nombre de la tienda"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                />

                <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files?.[0] || null)}
                />

                <Divider />

                <Button
                    colorScheme="green"
                    width="100%"
                    onClick={() => handleSubmit("IN")}
                    isLoading={isLoading}
                >
                    Check In
                </Button>

                <Button
                    colorScheme="red"
                    width="100%"
                    onClick={() => handleSubmit("OUT")}
                    isLoading={isLoading}
                >
                    Check Out
                </Button>

                {isLoading && <Spinner />}
            </VStack>
        </Box>
    );
}
