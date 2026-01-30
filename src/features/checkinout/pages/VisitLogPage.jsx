import { VStack, Box, Heading, Input, Button, Divider, Spinner, Flex, Text, Icon, useToast, Badge } from "@chakra-ui/react";
import { useState } from "react";
import { FiCamera, FiMapPin, FiUser, FiShoppingBag, FiSearch, FiX } from "react-icons/fi";
import { useCreateVisitLog } from "../../checkinout/hooks/mutations/visitLogMutations";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { BackButton } from "../../../components/BackButton";
import { useClientQueries } from "../../clients/hooks/queries/clientQueries";
import { useClientQueriesByName } from "../../clients/hooks/queries/clientQueries";
import { adaptClientFromApi } from "../../clients/adapters/clientAdapter";

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
    const { salesEmployeeCode, username } = useAuthStore();
    const [inputValue, setInputValue] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearchingByCode, setIsSearchingByCode] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const toast = useToast();

    const { mutate: createVisit, isLoading: isCreatingVisit } = useCreateVisitLog();

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
    };

    const handleClearClient = () => {
        setSelectedClient(null);
        setInputValue("");
        setSearchTerm("");
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            // Crear preview de la imagen
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (type) => {
        try {
            if (type === "IN" && !image) {
                toast({
                    title: "Imagen requerida",
                    description: "Debes subir una imagen para el Check-In",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
                return;
            }

            if (!selectedClient) {
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

            createVisit(formData);
        } catch (error) {
            console.error("Error obteniendo ubicación", error);
            toast({
                title: "Error de ubicación",
                description: "No se pudo obtener la ubicación. Verifica los permisos.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
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
                                <Badge colorScheme="green" mb={2}>
                                    Seleccionado
                                </Badge>
                                <Text fontWeight="700" fontSize="lg" color="green.800" mb={2}>
                                    {selectedClient.firstName}
                                </Text>
                                <Text fontSize="sm" color="gray.700" mb={1}>
                                    <strong>Código:</strong> {selectedClient.id}
                                </Text>
                                <Text fontSize="sm" color="gray.700">
                                    <strong>Dirección:</strong> {selectedClient.address}
                                </Text>
                            </Box>
                        )}
                    </Box>

                    {/* Imagen Card */}
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
                    </Box>

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
                        <Button
                            colorScheme="green"
                            width="100%"
                            size="lg"
                            height="56px"
                            fontSize="md"
                            fontWeight="600"
                            onClick={() => handleSubmit("IN")}
                            isLoading={isCreatingVisit}
                            loadingText="Registrando..."
                            boxShadow="md"
                            _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
                            transition="all 0.2s"
                        >
                            Check In
                        </Button>

                        <Button
                            colorScheme="red"
                            width="100%"
                            size="lg"
                            height="56px"
                            fontSize="md"
                            fontWeight="600"
                            onClick={() => handleSubmit("OUT")}
                            isLoading={isCreatingVisit}
                            loadingText="Registrando..."
                            boxShadow="md"
                            _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
                            transition="all 0.2s"
                        >
                            Check Out
                        </Button>
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