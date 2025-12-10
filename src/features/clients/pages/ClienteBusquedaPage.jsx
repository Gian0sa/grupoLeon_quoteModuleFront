import { useState } from "react";
import {
    Container,
    VStack,
    Flex,
    Box,
    Heading,
    Input,
    Button,
    Text,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Divider,
    Spinner,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
} from "@chakra-ui/react";
import { useClientProductHistory } from "../hooks/queries/clientQueries";
import { useAuthStore } from "../../auth/stores/useAuthStore";

export default function ClienteBusquedaPage() {
    const [search, setSearch] = useState("");
    const [clientQuery, setClientQuery] = useState("");
    const [slpCode, setSlpCode] = useState("");
    const { salesEmployeeCode } = useAuthStore();
    
    // Usar el hook
    const { 
        dataProductHistory, 
        isLoadingProductHistory, 
        errorProductHistory, 
        refetchProductHistory 
    } = useClientProductHistory(clientQuery, slpCode);

    const handleSearch = () => {
        // Aquí defines el clientQuery y slpCode según tu lógica
        // Por ejemplo, podrías extraerlos del input de búsqueda
        setClientQuery(search);
        setSlpCode(salesEmployeeCode); 
    };

    // Obtener datos del primer registro para mostrar el cliente
    const clienteInfo = dataProductHistory?.[0];
    const productos = dataProductHistory || [];

    return (
        <Container maxW="container.xl" py={10}>
            <VStack bg="#E0F1E6" p={8} borderRadius="2xl" spacing={8}>

                {/* Título */}
                <Heading color="green.700">Búsqueda de cliente</Heading>

                {/* Barra de búsqueda */}
                <Flex
                    bg="white"
                    p={4}
                    borderRadius="full"
                    w="100%"
                    align="center"
                    gap={4}
                    border="1px solid #dcdcdc"
                >
                    <Input
                        placeholder="Insertar nombre, apellido o código"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        border="none"
                        _focus={{ outline: "none" }}
                    />

                    <Button
                        bg="green.600"
                        color="white"
                        px={8}
                        borderRadius="full"
                        _hover={{ bg: "green.500" }}
                        onClick={handleSearch}
                        isLoading={isLoadingProductHistory}
                    >
                        Buscar cliente
                    </Button>
                </Flex>

                <Divider />

                {/* Loading */}
                {isLoadingProductHistory && (
                    <Flex justify="center" w="100%" py={8}>
                        <Spinner size="xl" color="green.600" thickness="4px" />
                    </Flex>
                )}

                {/* Error */}
                {errorProductHistory && (
                    <Alert status="error" borderRadius="md">
                        <AlertIcon />
                        <Box flex="1">
                            <AlertTitle>Error al buscar cliente</AlertTitle>
                            <AlertDescription>
                                {errorProductHistory.response?.status === 504 
                                    ? "El servidor tardó demasiado en responder. Por favor, intenta con una búsqueda más específica o intenta nuevamente."
                                    : errorProductHistory.message || "Ocurrió un error al buscar el cliente"}
                            </AlertDescription>
                        </Box>
                        <Button 
                            size="sm" 
                            colorScheme="red" 
                            variant="outline"
                            onClick={() => refetchProductHistory()}
                        >
                            Reintentar
                        </Button>
                    </Alert>
                )}

                {/* Resultado */}
                {clienteInfo && !isLoadingProductHistory && (
                    <Box w="100%">
                        <Text fontWeight="bold" color="gray.600">
                            Resultado de la búsqueda:
                        </Text>

                        <Text fontSize="xl" fontWeight="bold" color="green.700" mb={2}>
                            {clienteInfo.clientName}
                        </Text>
                        <Text fontSize="md" color="gray.600" mb={4}>
                            Código: {clienteInfo.clientCode} | Último Vendedor: {clienteInfo.lastSellerName}
                        </Text>

                        {/* Tabs */}
                        <Tabs variant="soft-rounded" colorScheme="green">
                            <TabList gap={4}>
                                <Tab
                                    bg="transparent"
                                    color="gray.700"
                                    border="1px solid #c3e2cc"
                                    borderRadius="full"
                                    px={6}
                                    _selected={{
                                        bg: "green.700",
                                        color: "white",
                                        borderColor: "green.700",
                                    }}
                                >
                                    Histórico
                                </Tab>

                                <Tab
                                    bg="transparent"
                                    color="gray.700"
                                    border="1px solid #c3e2cc"
                                    borderRadius="full"
                                    px={6}
                                    _selected={{
                                        bg: "green.700",
                                        color: "white",
                                        borderColor: "green.700",
                                    }}
                                >
                                    Stock
                                </Tab>

                                <Tab
                                    bg="transparent"
                                    color="gray.700"
                                    border="1px solid #c3e2cc"
                                    borderRadius="full"
                                    px={6}
                                    _selected={{
                                        bg: "green.700",
                                        color: "white",
                                        borderColor: "green.700",
                                    }}
                                >
                                    Importaciones
                                </Tab>
                            </TabList>


                            <TabPanels mt={4}>

                                {/* Panel Histórico */}
                                <TabPanel>
                                    <Table variant="simple" bg="white" borderRadius="md">
                                        <Thead bg="green.700">
                                            <Tr>
                                                <Th color="white">Código</Th>
                                                <Th color="white">Artículo</Th>
                                                <Th color="white" isNumeric>Cantidad Total</Th>
                                                <Th color="white">Última Compra</Th>
                                                <Th color="white" isNumeric>Último Precio</Th>
                                            </Tr>
                                        </Thead>

                                        <Tbody>
                                            {productos.length > 0 ? (
                                                productos.map((producto, i) => (
                                                    <Tr key={i} bg={i % 2 === 0 ? "green.50" : "green.100"}>
                                                        <Td fontWeight="medium">{producto.productCode}</Td>
                                                        <Td>{producto.productName}</Td>
                                                        <Td isNumeric>{producto.historicQuantity}</Td>
                                                        <Td>{new Date(producto.lastPurchaseDate).toLocaleDateString('es-PE')}</Td>
                                                        <Td isNumeric>${producto.lastSalePrice.toFixed(2)}</Td>
                                                    </Tr>
                                                ))
                                            ) : (
                                                <Tr>
                                                    <Td colSpan={5} textAlign="center" py={8}>
                                                        No hay datos disponibles
                                                    </Td>
                                                </Tr>
                                            )}
                                        </Tbody>
                                    </Table>
                                </TabPanel>

                                {/* Panel Stock */}
                                <TabPanel>
                                    <Table variant="simple" bg="white" borderRadius="md">
                                        <Thead bg="green.700">
                                            <Tr>
                                                <Th color="white">Item</Th>
                                                <Th color="white">Cantidad</Th>
                                                <Th color="white">Fecha</Th>
                                            </Tr>
                                        </Thead>

                                        <Tbody>
                                            <Tr bg="green.50">
                                                <Td colSpan={3} textAlign="center" py={8}>
                                                    Función en desarrollo
                                                </Td>
                                            </Tr>
                                        </Tbody>
                                    </Table>
                                </TabPanel>

                                {/* Panel Importaciones */}
                                <TabPanel>
                                    <Table variant="simple" bg="white" borderRadius="md">
                                        <Thead bg="green.700">
                                            <Tr>
                                                <Th color="white">Item</Th>
                                                <Th color="white">Cantidad</Th>
                                                <Th color="white">Fecha</Th>
                                            </Tr>
                                        </Thead>

                                        <Tbody>
                                            <Tr bg="green.50">
                                                <Td colSpan={3} textAlign="center" py={8}>
                                                    Función en desarrollo
                                                </Td>
                                            </Tr>
                                        </Tbody>
                                    </Table>
                                </TabPanel>

                            </TabPanels>
                        </Tabs>
                    </Box>
                )}

                {/* Estado inicial (sin búsqueda) */}
                {!clientQuery && !isLoadingProductHistory && (
                    <Text color="gray.500" fontSize="lg">
                        Ingrese un nombre, apellido o código para buscar un cliente
                    </Text>
                )}
            </VStack>
        </Container>
    );
}