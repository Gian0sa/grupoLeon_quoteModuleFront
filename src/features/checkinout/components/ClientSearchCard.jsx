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
import { adaptClientFromApi } from "../../clients/adapters/clientAdapter";

function ClientSearchInput({ inputValue, onChange, onSearch, onKeyPress, isSearching, onCreateNewClient }) {
    return (
        <Box mb={3}>
            <Flex gap={2} mb={2}>
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

            <Flex justify="space-between" align="center" px={1} pt={1} flexWrap="wrap" gap={1}>
                <Text fontSize="xs" color="gray.500">
                    ¿El cliente no está registrado en SAP?
                </Text>
                <Button
                    size="xs"
                    variant="solid"
                    colorScheme="green"
                    bg="green.50"
                    color="green.700"
                    border="1px solid"
                    borderColor="green.300"
                    borderRadius="md"
                    px={2.5}
                    py={1}
                    fontWeight="700"
                    onClick={onCreateNewClient}
                    leftIcon={<FiPlus />}
                    _hover={{ bg: "green.100" }}
                >
                    Registrar Cliente Nuevo
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

    return (
        <Box
            p={5}
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
                    bg={hasActiveCheckIn ? "amber.500" : isNewClient ? "blue.600" : "green.700"}
                    color="white"
                    px={3}
                    py={0.5}
                    borderRadius="full"
                    fontSize="10px"
                    fontWeight="700"
                >
                    {hasActiveCheckIn
                        ? "Check-In Activo"
                        : isNewClient
                        ? "Cliente Nuevo"
                        : "Cliente Seleccionado"}
                </Badge>
            </HStack>

            <Text fontWeight="800" fontSize="lg" color="green.900" mb={1.5}>
                {client.firstName}
            </Text>

            {/* SOLO SAP */}
            {!isNewClient && client.id !== "AUTO" && (
                <Text fontSize="xs" color="gray.700" mb={1}>
                    <strong>Código SAP:</strong> {client.id}
                </Text>
            )}

            {/* SOLO SAP */}
            {!isNewClient && (
                <Text fontSize="xs" color="gray.700">
                    <strong>Dirección:</strong> {client.address}
                </Text>
            )}

            {/* SOLO NUEVO */}
            {isNewClient && (
                <HStack spacing={4} pt={1}>
                    <Text fontSize="xs" color="gray.700">
                        <strong>Documento:</strong> {client.documentNumber}
                    </Text>
                    <Text fontSize="xs" color="gray.700">
                        <strong>Tipo:</strong> {client.isBusiness ? "Empresa" : "Persona"}
                    </Text>
                </HStack>
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