import { VStack, Box, Heading, Input, Button, Divider, Spinner } from "@chakra-ui/react";
import { useState } from "react";
import { useCreateVisitLog } from "../hooks/mutations/visitLogMutations";
import { useAuthStore } from "../../auth/stores/useAuthStore";

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

  const { mutate: createVisit, isLoading } = useCreateVisitLog();

  const handleSubmit = async (type) => {
    try {
      const location = await getLocation();

      createVisit({
        type,
        vendorName: username,
        storeName,
        latitude: location.latitude,
        longitude: location.longitude,
      });
    } catch (error) {
      console.error("Error obteniendo ubicación", error);
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={10} p={6} borderWidth="1px" borderRadius="xl">
      <Heading size="md" mb={6} textAlign="center">
        Registro de Visita
      </Heading>

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
