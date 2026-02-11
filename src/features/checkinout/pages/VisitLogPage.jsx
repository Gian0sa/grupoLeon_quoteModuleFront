import { VStack, Box, Heading, Input, Button, Divider, Spinner, Flex, Text, Icon, useToast, Badge } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { FiCamera, FiMapPin, FiUser, FiShoppingBag, FiSearch, FiX } from "react-icons/fi";
import { useCreateVisitLog } from "../../checkinout/hooks/mutations/visitLogMutations";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { BackButton } from "../../../components/BackButton";
import { useClientQueries } from "../../clients/hooks/queries/clientQueries";
import { useClientQueriesByName } from "../../clients/hooks/queries/clientQueries";
import { adaptClientFromApi } from "../../clients/adapters/clientAdapter";
import { useActiveVisitByVendor } from "../../checkinout/hooks/queries/visitLogQueries";
import { useNavigate } from "react-router-dom";

// Función para comprimir imagen
const compressImage = (file, maxSizeMB = 1) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Reducir dimensiones si es muy grande
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1920;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Comprimir con calidad variable hasta lograr el tamaño deseado
                let quality = 0.8;
                const compress = () => {
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const sizeMB = blob.size / 1024 / 1024;
                                console.log(`Imagen comprimida: ${sizeMB.toFixed(2)}MB con calidad ${quality}`);

                                if (sizeMB > maxSizeMB && quality > 0.1) {
                                    quality -= 0.1;
                                    compress();
                                } else {
                                    const compressedFile = new File([blob], file.name, {
                                        type: 'image/jpeg',
                                        lastModified: Date.now()
                                    });
                                    resolve(compressedFile);
                                }
                            } else {
                                reject(new Error('Error al comprimir imagen'));
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };

                compress();
            };
            img.onerror = () => reject(new Error('Error al cargar imagen'));
        };
        reader.onerror = () => reject(new Error('Error al leer archivo'));
    });
};

// Utilidad para obtener ubicación con mejor manejo de errores
const getLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("GEOLOCATION_NOT_SUPPORTED"));
            return;
        }

        console.log("Solicitando ubicación...");

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                console.log("Ubicación obtenida:", pos.coords);
                resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                });
            },
            (err) => {
                console.error("Error de geolocalización:", err);
                let errorMessage = "ERROR_DESCONOCIDO";

                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        errorMessage = "PERMISSION_DENIED";
                        break;
                    case err.POSITION_UNAVAILABLE:
                        errorMessage = "POSITION_UNAVAILABLE";
                        break;
                    case err.TIMEOUT:
                        errorMessage = "TIMEOUT";
                        break;
                }

                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
};

export default function VisitLogPage() {
    const { salesEmployeeCode, username } = useAuthStore();
    const navigate = useNavigate();
    const toast = useToast();

    const {
        data: activeVisitData,
        isLoading: isLoadingActiveVisit,
        refetch: refetchActiveVisit,
    } = useActiveVisitByVendor(username);

    const [inputValue, setInputValue] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearchingByCode, setIsSearchingByCode] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { mutate: createVisit, isLoading: isCreatingVisit, isPending } = useCreateVisitLog();

    // Extraer la visita activa del response
    const activeVisit = activeVisitData?.visit || null;
    const hasActiveCheckIn = activeVisitData?.active || false;

    // 🔥 EFECTO: Auto-rellenar cliente cuando hay check-in activo
    useEffect(() => {
        if (hasActiveCheckIn && activeVisit && !selectedClient) {
            console.log("📍 Check-In activo detectado, auto-rellenando cliente:", activeVisit.storeName);

            // Crear objeto de cliente simulado con los datos de la visita activa
            const clientFromActiveVisit = {
                firstName: activeVisit.storeName,
                id: "AUTO", // No tenemos el código del cliente en la respuesta
                address: `Lat: ${activeVisit.latitude}, Lon: ${activeVisit.longitude}`,
            };

            setSelectedClient(clientFromActiveVisit);
        }
    }, [hasActiveCheckIn, activeVisit, selectedClient]);

    // Client search hooks
    const {
        data: dataByCode,
        isLoading: isLoadingByCode,
        error: errorByCode,
    } = useClientQueries(isSearchingByCode ? searchTerm : null);

    const {
        data: dataByName,
        isLoading: isLoadingByName,
        error: errorByName,
    } = useClientQueriesByName(!isSearchingByCode ? searchTerm : null);

    const isSearching = isSearchingByCode ? isLoadingByCode : isLoadingByName;
    const searchError = isSearchingByCode ? errorByCode : errorByName;

    const handleSearch = () => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput) return;

        const isNumeric = /^\d+$/.test(trimmedInput);
        setIsSearchingByCode(isNumeric);
        setSearchTerm(isNumeric ? `CL${trimmedInput}` : trimmedInput);
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const handleSelectClient = (clientData) => {
        const client = adaptClientFromApi(clientData);
        setSelectedClient(client);
        setInputValue("");
        setSearchTerm("");

        console.log("Cliente seleccionado:", client);
    };

    const handleClearClient = () => {
        setSelectedClient(null);
        setInputValue("");
        setSearchTerm("");
    };

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingImage(true);

        try {
            console.log("Archivo original:", {
                name: file.name,
                size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                type: file.type
            });

            const compressedFile = await compressImage(file, 1); 

            console.log("Archivo comprimido:", {
                name: compressedFile.name,
                size: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
                type: compressedFile.type
            });

            setImage(compressedFile);

            // Crear preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
                setIsProcessingImage(false);
            };
            reader.readAsDataURL(compressedFile);

        } catch (error) {
            console.error("Error procesando imagen:", error);
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

    const handleSubmit = async (type) => {
        console.log("=== INICIANDO CHECK", type, "===");
        setIsSubmitting(true);

        try {
            // 🔥 VALIDACIÓN CRÍTICA: Verificar estado de check-in según tipo
            if (type === "IN" && hasActiveCheckIn) {
                console.log("❌ Ya existe un Check-In activo");
                toast({
                    title: "Check-In ya registrado",
                    description: `Tienes un Check-In activo en "${activeVisit.storeName}" desde ${new Date(activeVisit.createdAt).toLocaleTimeString()}. Debes hacer Check-Out primero.`,
                    status: "warning",
                    duration: 5000,
                    isClosable: true,
                });
                return;
            }

            if (type === "OUT" && !hasActiveCheckIn) {
                console.log("❌ No hay Check-In activo para cerrar");
                toast({
                    title: "Sin Check-In activo",
                    description: "No tienes un Check-In abierto. Debes hacer Check-In primero.",
                    status: "warning",
                    duration: 4000,
                    isClosable: true,
                });
                return;
            }

            // Validación: Imagen solo para Check-In
            if (type === "IN" && !image) {
                console.log("❌ Falta imagen para Check-In");
                toast({
                    title: "Imagen requerida",
                    description: "Debes subir una imagen para el Check-In",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
                return;
            }

            // Validación: Cliente seleccionado
            if (!selectedClient) {
                console.log("❌ Falta seleccionar cliente");
                toast({
                    title: "Cliente requerido",
                    description: "Debes buscar y seleccionar un cliente",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
                return;
            }

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

            for (let pair of formData.entries()) {
                if (pair[0] === 'image') {
                    console.log(`${pair[0]}: [File: ${pair[1].name}, ${(pair[1].size / 1024).toFixed(2)}KB]`);
                } else {
                    console.log(`${pair[0]}: ${pair[1]}`);
                }
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

                    await refetchActiveVisit();

                    if (type === "OUT") {
                        setSelectedClient(null);
                        setImage(null);
                        setImagePreview(null);
                        setInputValue("");
                        setSearchTerm("");
                        setIsSearchingByCode(true);
                    }
                    
                    if (type === "IN") {
                        setImage(null);
                        setImagePreview(null);
                    }

                    setIsSubmitting(false);
                },
                onError: (error) => {
                    console.error("❌ ERROR:", error);
                    console.error("Error completo:", JSON.stringify(error, null, 2));

                    let errorMessage = "Error desconocido";

                    if (error.response) {
                        console.error("Response data:", error.response.data);
                        console.error("Response status:", error.response.status);
                        errorMessage = error.response.data?.message || `Error ${error.response.status}`;
                    } else if (error.request) {
                        console.error("No response received:", error.request);
                        errorMessage = "No se recibió respuesta del servidor";
                    } else {
                        console.error("Error message:", error.message);
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
                }
            });

        } catch (error) {
            console.error("❌ ERROR GENERAL:", error);

            let errorTitle = "Error";
            let errorDescription = error.message || "Error desconocido";

            // Manejar errores específicos de geolocalización
            const locationErrors = {
                "GEOLOCATION_NOT_SUPPORTED": {
                    title: "Geolocalización no disponible",
                    description: "Tu navegador no soporta geolocalización"
                },
                "PERMISSION_DENIED": {
                    title: "Permiso denegado",
                    description: "Debes permitir el acceso a la ubicación"
                },
                "POSITION_UNAVAILABLE": {
                    title: "Ubicación no disponible",
                    description: "No se pudo determinar tu ubicación. Verifica el GPS"
                },
                "TIMEOUT": {
                    title: "Tiempo agotado",
                    description: "Tardó mucho en obtener la ubicación. Intenta de nuevo"
                }
            };

            if (locationErrors[error.message]) {
                errorTitle = locationErrors[error.message].title;
                errorDescription = locationErrors[error.message].description;
            }

            toast({
                title: errorTitle,
                description: errorDescription,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            setIsSubmitting(false);
        }
    };

    return (
        <Box
            minH="100vh"
            bg="gray.50"
            pb={6}
        >
            {/* Header */}
            <Flex
                bg="green.600"
                color="white"
                align="center"
                justify="center"
                w="100%"
                h="56px"
                px={4}
                position="sticky"
                top={0}
                zIndex={10}
                boxShadow="sm"
            >
                <Box position="absolute" left={4}>
                    <BackButton color="white" />
                </Box>

                <Heading
                    textAlign="center"
                    fontSize="lg"
                    fontWeight="600"
                >
                    Registro de Visita
                </Heading>
            </Flex>

            {/* Alert de Check-In activo */}
            {hasActiveCheckIn && activeVisit && (
                <Box mx={4} mt={4}>
                    <Box
                        bg="orange.50"
                        borderLeft="4px solid"
                        borderColor="orange.400"
                        p={3}
                        borderRadius="md"
                    >
                        <Flex justify="space-between" align="center">
                            <Box flex={1}>
                                <Text fontSize="sm" color="orange.800" mb={1}>
                                    Tienes un <strong>Check-In activo</strong> en{" "}
                                    <strong>{activeVisit.storeName}</strong>
                                </Text>
                                <Text fontSize="xs" color="orange.700">
                                    Desde {new Date(activeVisit.createdAt).toLocaleTimeString()} • No olvides marcar tu Check-Out
                                </Text>
                            </Box>
                            {activeVisit.imageUrl && (
                                <Box
                                    ml={3}
                                    w="60px"
                                    h="60px"
                                    borderRadius="md"
                                    overflow="hidden"
                                    border="2px solid"
                                    borderColor="orange.300"
                                    flexShrink={0}
                                >
                                    <img
                                        src={activeVisit.imageUrl}
                                        alt="Check-In"
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover"
                                        }}
                                    />
                                </Box>
                            )}
                        </Flex>
                    </Box>
                </Box>
            )}

            {/* Loading state inicial */}
            {isLoadingActiveVisit && (
                <Flex justify="center" py={4}>
                    <Spinner color="green.500" size="sm" />
                </Flex>
            )}

            {/* Content */}
            <Box px={4} pt={6}>
                <VStack spacing={5} align="stretch">
                    {/* Vendedor Card */}
                    <Box
                        bg="white"
                        p={4}
                        borderRadius="lg"
                        boxShadow="sm"
                    >
                        <Flex align="center" mb={2}>
                            <Icon as={FiUser} color="green.600" mr={2} />
                            <Text fontSize="sm" fontWeight="500" color="gray.600">
                                Vendedor
                            </Text>
                        </Flex>
                        <Input
                            value={username || ""}
                            isReadOnly
                            bg="gray.50"
                            border="none"
                            fontSize="md"
                            fontWeight="500"
                            _focus={{ bg: "gray.50" }}
                        />
                    </Box>

                    {/* Cliente Card - Búsqueda */}
                    <Box
                        bg="white"
                        p={4}
                        borderRadius="lg"
                        boxShadow="sm"
                    >
                        <Flex align="center" mb={3}>
                            <Icon as={FiShoppingBag} color="green.600" mr={2} />
                            <Text fontSize="sm" fontWeight="500" color="gray.600">
                                Cliente
                            </Text>
                        </Flex>

                        {!selectedClient ? (
                            <>
                                <Flex gap={2} mb={3}>
                                    <Input
                                        placeholder="Buscar por RUC/DNI o nombre"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                                        onKeyPress={handleKeyPress}
                                        fontSize="md"
                                        flex={1}
                                    />
                                    <Button
                                        colorScheme="green"
                                        onClick={handleSearch}
                                        isLoading={isSearching}
                                        leftIcon={<FiSearch />}
                                        px={6}
                                    >
                                        Buscar
                                    </Button>
                                </Flex>

                                {/* Loading state */}
                                {isSearching && (
                                    <Flex justify="center" py={4}>
                                        <Spinner color="green.500" />
                                    </Flex>
                                )}

                                {/* Error state */}
                                {searchError && (
                                    <Box
                                        p={3}
                                        bg="red.50"
                                        borderRadius="md"
                                        borderLeft="4px solid"
                                        borderColor="red.500"
                                    >
                                        <Text color="red.600" fontSize="sm">
                                            Error al buscar: {searchError.message}
                                        </Text>
                                    </Box>
                                )}

                                {/* Resultado por código */}
                                {isSearchingByCode && dataByCode && !isSearching && (
                                    <Box
                                        p={3}
                                        bg="green.50"
                                        borderRadius="md"
                                        borderWidth="1px"
                                        borderColor="green.200"
                                        cursor="pointer"
                                        onClick={() => handleSelectClient(dataByCode)}
                                        _hover={{ bg: "green.100" }}
                                        transition="all 0.2s"
                                    >
                                        <Text fontWeight="600" color="green.800" mb={1}>
                                            {adaptClientFromApi(dataByCode).firstName}
                                        </Text>
                                        <Text fontSize="sm" color="gray.600">
                                            Código: {adaptClientFromApi(dataByCode).id}
                                        </Text>
                                        <Text fontSize="sm" color="gray.600">
                                            {adaptClientFromApi(dataByCode).address}
                                        </Text>
                                    </Box>
                                )}

                                {/* Resultados por nombre (lista) */}
                                {!isSearchingByCode && dataByName?.value && dataByName.value.length > 0 && (
                                    <VStack spacing={2} maxH="300px" overflowY="auto">
                                        {dataByName.value.map((clientData) => {
                                            const client = adaptClientFromApi(clientData);
                                            return (
                                                <Box
                                                    key={client.id}
                                                    w="100%"
                                                    p={3}
                                                    bg="green.50"
                                                    borderRadius="md"
                                                    borderWidth="1px"
                                                    borderColor="green.200"
                                                    cursor="pointer"
                                                    onClick={() => handleSelectClient(clientData)}
                                                    _hover={{ bg: "green.100" }}
                                                    transition="all 0.2s"
                                                >
                                                    <Text fontWeight="600" color="green.800" mb={1}>
                                                        {client.firstName}
                                                    </Text>
                                                    <Text fontSize="sm" color="gray.600">
                                                        Código: {client.id}
                                                    </Text>
                                                    <Text fontSize="sm" color="gray.600">
                                                        {client.address}
                                                    </Text>
                                                </Box>
                                            );
                                        })}
                                    </VStack>
                                )}

                                {/* No se encontró cliente */}
                                {!isSearching &&
                                    !searchError &&
                                    searchTerm &&
                                    ((isSearchingByCode && !dataByCode) ||
                                        (!isSearchingByCode && dataByName?.value?.length === 0)) && (
                                        <Box
                                            p={3}
                                            bg="yellow.50"
                                            borderRadius="md"
                                            borderLeft="4px solid"
                                            borderColor="yellow.500"
                                        >
                                            <Text color="yellow.800" fontSize="sm">
                                                No se encontró ningún cliente
                                            </Text>
                                        </Box>
                                    )}
                            </>
                        ) : (
                            /* Cliente seleccionado */
                            <Box
                                p={4}
                                bg="green.50"
                                borderRadius="md"
                                borderWidth="2px"
                                borderColor="green.400"
                                position="relative"
                            >
                                {/* Solo permitir cambiar cliente si NO hay check-in activo */}
                                {!hasActiveCheckIn && (
                                    <Button
                                        size="sm"
                                        position="absolute"
                                        top={2}
                                        right={2}
                                        colorScheme="red"
                                        variant="ghost"
                                        onClick={handleClearClient}
                                        leftIcon={<FiX />}
                                    >
                                        Cambiar
                                    </Button>
                                )}

                                <Badge colorScheme="green" mb={2}>
                                    {hasActiveCheckIn ? "Check-In Activo" : "Seleccionado"}
                                </Badge>
                                <Text fontWeight="700" fontSize="lg" color="green.800" mb={2}>
                                    {selectedClient.firstName}
                                </Text>
                                {selectedClient.id !== "AUTO" && (
                                    <Text fontSize="sm" color="gray.700" mb={1}>
                                        <strong>Código:</strong> {selectedClient.id}
                                    </Text>
                                )}
                                <Text fontSize="sm" color="gray.700">
                                    <strong>Dirección:</strong> {selectedClient.address}
                                </Text>
                            </Box>
                        )}
                    </Box>

                    {/* Imagen Card - Solo mostrar si NO hay check-in activo */}
                    {!hasActiveCheckIn && (
                        <Box
                            bg="white"
                            p={4}
                            borderRadius="lg"
                            boxShadow="sm"
                        >
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
                                        style={{
                                            width: "100%",
                                            height: "200px",
                                            objectFit: "cover"
                                        }}
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
                                onChange={handleImageChange}
                                display="none"
                            />

                            {image && (
                                <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">
                                    Tamaño: {(image.size / 1024).toFixed(2)} KB
                                </Text>
                            )}
                        </Box>
                    )}

                    {/* Location Info */}
                    <Flex
                        align="center"
                        justify="center"
                        py={2}
                        color="gray.500"
                        fontSize="sm"
                    >
                        <Icon as={FiMapPin} mr={2} />
                        <Text>Se registrará tu ubicación actual</Text>
                    </Flex>

                    <Divider my={2} />

                    {/* Action Buttons */}
                    <VStack spacing={3} pt={2}>
                        {/* Solo mostrar botón Check-In si NO hay activo */}
                        {!hasActiveCheckIn && (
                            <Button
                                colorScheme="green"
                                width="100%"
                                size="lg"
                                height="56px"
                                fontSize="md"
                                fontWeight="600"
                                onClick={() => handleSubmit("IN")}
                                isLoading={isCreatingVisit || isSubmitting}
                                isDisabled={isSubmitting || isPending}
                                loadingText="Registrando..."
                                boxShadow="md"
                                _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
                                transition="all 0.2s"
                            >
                                Check In
                            </Button>
                        )}
                        {hasActiveCheckIn && (
                            <Button
                                colorScheme="green"
                                variant="outline"
                                width="100%"
                                size="lg"
                                height="56px"
                                fontSize="md"
                                fontWeight="600"
                                onClick={() => {
                                    const storeName =
                                        selectedClient?.firstName || activeVisit?.storeName;

                                    navigate(
                                        `/clienteBusqueda?storeName=${encodeURIComponent(storeName)}`
                                    );
                                }}
                            >
                                Volver al historial del cliente
                            </Button>
                        )}
                        {/* Solo mostrar botón Check-Out si HAY activo */}
                        {hasActiveCheckIn && (
                            <Button
                                colorScheme="red"
                                width="100%"
                                size="lg"
                                height="56px"
                                fontSize="md"
                                fontWeight="600"
                                onClick={() => handleSubmit("OUT")}
                                isLoading={isCreatingVisit || isSubmitting}
                                isDisabled={isSubmitting || isPending}
                                loadingText="Registrando..."
                                boxShadow="md"
                                _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
                                transition="all 0.2s"
                            >
                                Check Out
                            </Button>
                        )}


                    </VStack>

                    {isCreatingVisit && (
                        <Flex justify="center" pt={4}>
                            <Spinner size="lg" color="green.500" thickness="3px" />
                        </Flex>
                    )}
                </VStack>
            </Box>
        </Box>
    );
}