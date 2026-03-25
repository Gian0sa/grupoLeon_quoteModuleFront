import {
    Box,
    Flex,
    Icon,
    Text,
    Input,
    Button,
    VStack,
    Spinner,
    Badge,
} from "@chakra-ui/react";
import { FiShoppingBag, FiSearch, FiX } from "react-icons/fi";
import { adaptClientFromApi } from "../../clients/adapters/clientAdapter";

function ClientSearchInput({ inputValue, onChange, onSearch, onKeyPress, isSearching }) {
    return (
        <Flex gap={2} mb={3}>
            <Input
                placeholder="Buscar por RUC/DNI o nombre"
                value={inputValue}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
                onKeyPress={onKeyPress}
                fontSize="md"
                flex={1}
            />
            <Button
                colorScheme="green"
                onClick={onSearch}
                isLoading={isSearching}
                leftIcon={<FiSearch />}
                px={6}
            >
                Buscar
            </Button>
        </Flex>
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
}) {
    if (isSearching) {
        return (
            <Flex justify="center" py={4}>
                <Spinner color="green.500" />
            </Flex>
        );
    }

    if (searchError) {
        return (
            <Box p={3} bg="red.50" borderRadius="md" borderLeft="4px solid" borderColor="red.500">
                <Text color="red.600" fontSize="sm">
                    Error al buscar: {searchError.message}
                </Text>
            </Box>
        );
    }

    const noResults =
        searchTerm &&
        ((isSearchingByCode && !dataByCode) ||
            (!isSearchingByCode && dataByName?.value?.length === 0));

    if (noResults) {
        return (
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
        );
    }

    if (isSearchingByCode && dataByCode) {
        const client = adaptClientFromApi(dataByCode);
        return (
            <Box
                p={3}
                bg="green.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="green.200"
                cursor="pointer"
                onClick={() => onSelectClient(dataByCode)}
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
    }

    if (!isSearchingByCode && dataByName?.value?.length > 0) {
        return (
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
                            onClick={() => onSelectClient(clientData)}
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
        );
    }

    return null;
}

function SelectedClient({ client, hasActiveCheckIn, onClear }) {
    return (
        <Box
            p={4}
            bg="green.50"
            borderRadius="md"
            borderWidth="2px"
            borderColor="green.400"
            position="relative"
        >
            {!hasActiveCheckIn && (
                <Button
                    size="sm"
                    position="absolute"
                    top={2}
                    right={2}
                    colorScheme="red"
                    variant="ghost"
                    onClick={onClear}
                    leftIcon={<FiX />}
                >
                    Cambiar
                </Button>
            )}
            <Badge colorScheme="green" mb={2}>
                {hasActiveCheckIn ? "Check-In Activo" : "Seleccionado"}
            </Badge>
            <Text fontWeight="700" fontSize="lg" color="green.800" mb={2}>
                {client.firstName}
            </Text>
            {client.id !== "AUTO" && (
                <Text fontSize="sm" color="gray.700" mb={1}>
                    <strong>Código:</strong> {client.id}
                </Text>
            )}
            <Text fontSize="sm" color="gray.700">
                <strong>Dirección:</strong> {client.address}
            </Text>
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
    onClearClient,
}) {
    return (
        <Box bg="white" p={4} borderRadius="lg" boxShadow="sm">
            <Flex align="center" mb={3}>
                <Icon as={FiShoppingBag} color="green.600" mr={2} />
                <Text fontSize="sm" fontWeight="500" color="gray.600">
                    Cliente
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
                    />
                    <ClientSearchResults
                        isSearching={isSearching}
                        searchError={searchError}
                        searchTerm={searchTerm}
                        isSearchingByCode={isSearchingByCode}
                        dataByCode={dataByCode}
                        dataByName={dataByName}
                        onSelectClient={onSelectClient}
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