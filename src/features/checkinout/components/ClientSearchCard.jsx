import {
    Box,
    Flex,
    Icon,
    Text,
    Input,
    Button,
    VStack,
    HStack,
    Spinner,
    Badge,
    useColorModeValue,
} from "@chakra-ui/react";
import { FiShoppingBag, FiSearch, FiX, FiUserCheck, FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { adaptClientFromApi } from "../../clients/adapters/clientAdapter";

function ClientSearchInput({ inputValue, onChange, onSearch, onKeyPress, isSearching, onCreateNewClient }) {
    return (
        <Box mb={3}>
            <Flex gap={2}>
                <Input
                    placeholder="Buscar por RUC, DNI o Nombre del cliente..."
                    value={inputValue}
                    onChange={(e) => onChange(e.target.value.toUpperCase())}
                    onKeyPress={onKeyPress}
                    h="48px"
                    borderRadius="xl"
                    fontSize="sm"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{
                        bg: "white",
                        borderColor: "green.600",
                        boxShadow: "0 0 0 1px #126C36",
                    }}
                    flex={1}
                />
                <Button
                    bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                    color="white"
                    onClick={onSearch}
                    isLoading={isSearching}
                    leftIcon={<FiSearch />}
                    px={6}
                    h="48px"
                    borderRadius="xl"
                    fontSize="sm"
                    fontWeight="700"
                    boxShadow="0 4px 12px rgba(22, 101, 52, 0.25)"
                    _hover={{ bg: "#0d4226" }}
                >
                    Buscar
                </Button>
            </Flex>
        </Box>
    );
}

function ClientSearchResults({
    isSearching,
    searchError,
    searchTerm,
    isSearchingByCode,
    dataByCode,
    dataByName,
    onSelectClient,
    onCreateNewClient,
}) {
    if (isSearching) {
        return (
            <Flex justify="center" py={6}>
                <Spinner color="green.600" size="md" />
            </Flex>
        );
    }

    const is404OrEmpty =
        searchError ||
        (searchTerm &&
            ((isSearchingByCode && !dataByCode) ||
                (!isSearchingByCode && dataByName?.value?.length === 0)));

    if (is404OrEmpty) {
        const rawSearch = searchTerm ? searchTerm.replace(/^CL/, "") : "";
        return (
            <Box
                p={4}
                bg="amber.50"
                borderRadius="xl"
                border="1px solid"
                borderColor="amber.300"
                boxShadow="0 4px 12px rgba(217, 119, 6, 0.08)"
            >
                <Text color="amber.900" fontSize="sm" fontWeight="800" mb={1}>
                    Cliente no encontrado en SAP
                </Text>
                <Text color="amber.800" fontSize="xs" mb={3}>
                    {rawSearch ? `No existen registros en SAP para "${rawSearch}".` : "El cliente consultado no existe en SAP."} Puedes registrarlo inmediatamente como cliente nuevo.
                </Text>

                <Button
                    size="sm"
                    bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                    color="white"
                    borderRadius="lg"
                    leftIcon={<FiPlus />}
                    onClick={(e) => {
                        e.stopPropagation();
                        onCreateNewClient(rawSearch);
                    }}
                    _hover={{ bg: "#0d4226" }}
                >
                    Registrar Cliente Nuevo
                </Button>
            </Box>
        );
    }

    if (isSearchingByCode && dataByCode) {
        const client = adaptClientFromApi(dataByCode);
        return (
            <Box
                p={4}
                bg="green.50"
                borderRadius="xl"
                border="1px solid"
                borderColor="green.200"
                cursor="pointer"
                onClick={() => onSelectClient(dataByCode)}
                _hover={{ bg: "green.100", transform: "translateY(-1px)" }}
                transition="all 0.2s"
            >
                <HStack justify="space-between" mb={1}>
                    <Text fontWeight="800" fontSize="md" color="green.900">
                        {client.firstName}
                    </Text>
                    <Badge colorScheme="green" borderRadius="full">SAP</Badge>
                </HStack>
                <Text fontSize="xs" color="gray.600" fontWeight="600">
                    Código: {client.id}
                </Text>
                <Text fontSize="xs" color="gray.600">
                    {client.address}
                </Text>
            </Box>
        );
    }

    if (!isSearchingByCode && dataByName?.value?.length > 0) {
        return (
            <VStack spacing={2} maxH="280px" overflowY="auto" pt={1}>
                {dataByName.value.map((clientData) => {
                    const client = adaptClientFromApi(clientData);
                    return (
                        <Box
                            key={client.id}
                            w="100%"
                            p={3.5}
                            bg="green.50"
                            borderRadius="xl"
                            border="1px solid"
                            borderColor="green.200"
                            cursor="pointer"
                            onClick={() => onSelectClient(clientData)}
                            _hover={{ bg: "green.100", transform: "translateY(-1px)" }}
                            transition="all 0.2s"
                        >
                            <HStack justify="space-between" mb={1}>
                                <Text fontWeight="800" fontSize="sm" color="green.900">
                                    {client.firstName}
                                </Text>
                                <Badge colorScheme="green" borderRadius="full" fontSize="10px">
                                    {client.id}
                                </Badge>
                            </HStack>
                            <Text fontSize="xs" color="gray.600" isTruncated>
                                {client.address}
                            </Text>
                        </Box>
                    );
                })}
            </VStack>
        );
    }

    return null;
}

function SelectedClient({ client, hasActiveCheckIn, onClear }) {
    const isNewClient = client.type === "NEW";
    const navigate = useNavigate();

    const sapCodeDisplay = (client.id && client.id !== "AUTO")
        ? client.id
        : (client.sapCode || client.cardCode || client.clientCode || "");

    return (
        <Box
            p={4}
            bg="linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
            borderRadius="xl"
            border="2px solid"
            borderColor="green.500"
            position="relative"
            boxShadow="0 4px 15px rgba(34, 197, 94, 0.12)"
        >
            {!hasActiveCheckIn && (
                <Button
                    size="xs"
                    position="absolute"
                    top={3}
                    right={3}
                    colorScheme="red"
                    variant="ghost"
                    borderRadius="full"
                    onClick={onClear}
                    leftIcon={<FiX />}
                >
                    Cambiar
                </Button>
            )}

            <HStack spacing={2} mb={2}>
                <Badge
                    bg={hasActiveCheckIn ? "#0e572b" : isNewClient ? "blue.600" : "green.700"}
                    color="white"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="11px"
                    fontWeight="900"
                    letterSpacing="0.5px"
                    boxShadow="0 2px 6px rgba(14, 87, 43, 0.25)"
                >
                    {hasActiveCheckIn
                        ? "✓ CHECK-IN ACTIVO"
                        : isNewClient
                            ? "CLIENTE NUEVO"
                            : "CLIENTE SELECCIONADO"}
                </Badge>
            </HStack>

            <Text fontWeight="850" fontSize="md" color="green.950" mb={1} lineHeight="1.2">
                {client.firstName}
            </Text>

            {/* SOLO SAP */}
            {!isNewClient && (
                <Text fontSize="xs" color="gray.800" fontWeight="600" mb={0.5}>
                    <strong>Código SAP:</strong> {sapCodeDisplay || "No asignado"}
                </Text>
            )}

            {/* SOLO SAP */}
            {!isNewClient && (
                <Text fontSize="xs" color="gray.700" fontWeight="500">
                    <strong>Dirección:</strong> {client.address}
                </Text>
            )}

            {/* SOLO NUEVO */}
            {isNewClient && (
                <HStack spacing={4} pt={0.5}>
                    <Text fontSize="xs" color="gray.700">
                        <strong>Documento:</strong> {client.documentNumber}
                    </Text>
                    <Text fontSize="xs" color="gray.700">
                        <strong>Tipo:</strong> {client.isBusiness ? "Empresa" : "Persona"}
                    </Text>
                </HStack>
            )}

            {/* APARTADO COMPACTO INTERNO PARA ACCESO AL COTIZADOR EN CHECK-OUT */}
            {hasActiveCheckIn && (
                <Flex
                    pt={2.5}
                    mt={2.5}
                    borderTop="1px dashed"
                    borderColor="green.300"
                    justify="space-between"
                    align="center"
                    flexWrap="wrap"
                    gap={2}
                >
                    <HStack spacing={1.5}>
                        <FiShoppingBag size={14} color="#0e572b" />
                        <Text fontSize="11px" fontWeight="800" color="green.900">
                            Historial de Busqueda
                        </Text>
                    </HStack>
                    <Button
                        size="xs"
                        h="28px"
                        bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
                        color="white"
                        borderRadius="lg"
                        px={3}
                        fontWeight="800"
                        fontSize="10px"
                        leftIcon={<FiShoppingBag size={12} />}
                        boxShadow="0 2px 6px rgba(22, 101, 52, 0.2)"
                        _hover={{ bg: "#0d4226", transform: "translateY(-1px)" }}
                        onClick={() => {
                            const clientName = client.firstName || "";
                            const sapCode = sapCodeDisplay;
                            try {
                                localStorage.setItem(
                                    "grupoLeon_active_client_cache",
                                    JSON.stringify({ clientName, sapCode, timestamp: Date.now() })
                                );
                            } catch (e) { }
                            navigate(`/clienteBusqueda?storeName=${encodeURIComponent(clientName)}&clientCode=${encodeURIComponent(sapCode)}&returnTo=/visitLog`);
                        }}
                    >
                        Historial Cliente 
                    </Button>
                </Flex>
            )}
        </Box>
    );
}

export function ClientSearchCard({
    inputValue,
    onInputChange,
    onSearch,
    onKeyPress,
    isSearching,
    searchError,
    searchTerm,
    isSearchingByCode,
    dataByCode,
    dataByName,
    selectedClient,
    hasActiveCheckIn,
    onSelectClient,
    onCreateNewClient,
    onClearClient,
}) {
    const cardBg = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.100", "gray.700");

    return (
        <Box
            bg={cardBg}
            p={{ base: 5, md: 6 }}
            borderRadius="2xl"
            boxShadow="0 8px 24px rgba(0,0,0,0.04)"
            border="1px solid"
            borderColor={borderColor}
        >
            <Flex align="center" mb={4}>
                <Flex
                    w="34px"
                    h="34px"
                    borderRadius="xl"
                    bg="green.50"
                    align="center"
                    justify="center"
                    mr={3}
                >
                    <Icon as={FiShoppingBag} color="green.600" boxSize={4} />
                </Flex>
                <Text fontSize="sm" fontWeight="700" color="gray.800">
                    Cliente de la Visita
                </Text>
            </Flex>

            {!selectedClient ? (
                <>
                    <ClientSearchInput
                        inputValue={inputValue}
                        onChange={onInputChange}
                        onSearch={onSearch}
                        onKeyPress={onKeyPress}
                        isSearching={isSearching}
                        onCreateNewClient={onCreateNewClient}
                    />
                    <ClientSearchResults
                        isSearching={isSearching}
                        searchError={searchError}
                        searchTerm={searchTerm}
                        isSearchingByCode={isSearchingByCode}
                        dataByCode={dataByCode}
                        dataByName={dataByName}
                        onSelectClient={onSelectClient}
                        onCreateNewClient={onCreateNewClient}
                    />
                </>
            ) : (
                <SelectedClient
                    client={selectedClient}
                    hasActiveCheckIn={hasActiveCheckIn}
                    onClear={onClearClient}
                />
            )}
        </Box>
    );
}