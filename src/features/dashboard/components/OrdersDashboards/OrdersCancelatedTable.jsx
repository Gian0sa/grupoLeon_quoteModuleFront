import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Text,
  useColorModeValue,
  Button,
  Flex,
  Badge,
  VStack,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  IconButton,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";
import { useState, useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  ViewIcon,
} from "@chakra-ui/icons";
import ModalSeguimiento from "../../../reports/components/ModalSeguimiento";

export default function OrdersCancelatedTable({ data, isLoading, isError }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const tableBg = useColorModeValue("white", "gray.800");
  const hoverBg = useColorModeValue("red.50", "red.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // --- FILTRADO DE DATOS ---
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data;

    const term = searchTerm.toLowerCase();
    return data.filter(
      (item) =>
        item.sellerName?.toLowerCase().includes(term) ||
        item.clientName?.toLowerCase().includes(term) ||
        item.orderNumber?.toString().includes(term) ||
        item.cancellationReason?.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  // --- PAGINACIÓN ---
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = filteredData.slice(startIndex, endIndex);

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  // --- ESTADOS DE CARGA Y ERROR ---
  if (isLoading) {
    return (
      <VStack spacing={3} py={8}>
        <Spinner size="lg" color="red.500" thickness="3px" />
        <Text fontSize="sm" color="gray.500">
          Cargando pedidos cancelados...
        </Text>
      </VStack>
    );
  }

  if (isError) {
    return (
      <Box
        py={6}
        px={4}
        bg={useColorModeValue("red.50", "red.900")}
        borderRadius="lg"
        borderLeft="4px solid"
        borderColor="red.500"
      >
        <Text color="red.600" fontWeight="medium">
          ⚠️ Error al cargar los pedidos cancelados
        </Text>
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box
        py={8}
        textAlign="center"
        bg={useColorModeValue("gray.50", "gray.700")}
        borderRadius="lg"
        borderStyle="dashed"
        borderWidth="2px"
        borderColor={useColorModeValue("gray.300", "gray.600")}
      >
        <Text fontSize="2xl" mb={2}>
          ✅
        </Text>
        <Text color="gray.500" fontSize="sm">
          No hay pedidos cancelados en este periodo
        </Text>
      </Box>
    );
  }

  // --- FUNCIÓN PARA ABRIR MODAL DE SEGUIMIENTO ---
 // --- FUNCIÓN PARA ABRIR MODAL DE SEGUIMIENTO ---
const handleOpenTracking = (order) => {
  console.log("Orden original (cancelada):", order);

  // Adaptar al formato que TrackingPage espera
  const adaptedOrder = {
    ordenData: {
      numero: order.orderNumber || order.internalNumber, // TrackingPage usa "ordenData.numero"
      fechaCreacion: order.orderDate,
      total: order.totalAmount,
      moneda: order.currency,
    },
    clienteData: {
      nombre: order.clientName,
      codigo: order.clientCode,
    },
    vendedorData: {
      nombre: order.sellerName,
      codigo: order.sellerCode,
    },
    motivoCancelacion: order.cancellationReason,
    comentarios: order.comments,
    DocEntry: order.internalNumber || order.orderNumber, // compatibilidad con ModalSeguimiento
    orden: { id: order.internalNumber || order.orderNumber },
  };

  console.log("Orden adaptada para TrackingPage:", adaptedOrder);

  setSelectedOrder(adaptedOrder);
  onOpen();
};


  return (
    <>
      <VStack spacing={4} align="stretch">
        {/* --- BUSCADOR Y CONTROLES --- */}
        <Flex
          gap={3}
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "stretch", md: "center" }}
        >
          <InputGroup maxW={{ base: "100%", md: "400px" }}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Buscar por vendedor, cliente, pedido o motivo..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              bg={tableBg}
              borderColor={borderColor}
            />
          </InputGroup>

          <HStack spacing={3}>
            <Text fontSize="sm" color="gray.600" whiteSpace="nowrap">
              Mostrar:
            </Text>
            <Select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(e.target.value)}
              size="sm"
              w="100px"
              bg={tableBg}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </Select>
            <Badge colorScheme="red" px={3} py={1} borderRadius="full">
              {filteredData.length} resultados
            </Badge>
          </HStack>
        </Flex>

        {/* --- TABLA --- */}
        <Box overflowX="auto" borderWidth="1px" borderColor={borderColor} borderRadius="lg">
          <Table variant="simple" size="sm">
            <Thead bg={useColorModeValue("gray.50", "gray.700")}>
              <Tr>
                <Th>Vendedor</Th>
                <Th>Pedido</Th>
                <Th>Cliente</Th>
                <Th>Motivo</Th>
                <Th isNumeric>Unidades</Th>
                <Th>Fecha</Th>
                <Th textAlign="center">Acción</Th>
              </Tr>
            </Thead>
            <Tbody>
              {currentData.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8}>
                    <Text color="gray.500">
                      No se encontraron resultados para "{searchTerm}"
                    </Text>
                  </Td>
                </Tr>
              ) : (
                currentData.map((item, index) => (
                  <Tr
                    key={index}
                    _hover={{ bg: hoverBg }}
                    transition="background 0.2s"
                  >
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="medium" fontSize="sm">
                          {item.sellerName}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          Código: {item.sellerCode}
                        </Text>
                      </VStack>
                    </Td>

                    <Td>
                      <Badge colorScheme="blue" variant="outline">
                        #{item.orderNumber}
                      </Badge>
                    </Td>

                    <Td maxW="200px">
                      <Tooltip label={item.clientName} hasArrow>
                        <Text fontSize="sm" noOfLines={1}>
                          {item.clientName}
                        </Text>
                      </Tooltip>
                    </Td>

                    <Td maxW="250px">
                      <Tooltip label={item.cancellationReason} hasArrow>
                        <Badge
                          colorScheme="red"
                          variant="subtle"
                          px={2}
                          fontSize="xs"
                        >
                          {item.cancellationReason?.length > 30
                            ? item.cancellationReason.substring(0, 30) + "..."
                            : item.cancellationReason}
                        </Badge>
                      </Tooltip>
                    </Td>

                    <Td isNumeric>
                      <Text fontWeight="bold" color="red.500">
                        {item.totalUnits}
                      </Text>
                    </Td>

                    <Td>
                      <Text fontSize="xs" color="gray.600">
                        {item.orderDate}
                      </Text>
                    </Td>

                    <Td textAlign="center">
                      <Tooltip label="Ver seguimiento del pedido" hasArrow>
                        <IconButton
                          icon={<ViewIcon />}
                          colorScheme="red"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenTracking(item)}
                          aria-label="Ver seguimiento"
                        />
                      </Tooltip>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>

        {/* --- PAGINACIÓN --- */}
        {totalPages > 1 && (
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <Text fontSize="sm" color="gray.600">
              Mostrando {startIndex + 1} - {Math.min(endIndex, filteredData.length)} de{" "}
              {filteredData.length}
            </Text>

            <HStack spacing={2}>
              <IconButton
                icon={<ChevronLeftIcon />}
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                isDisabled={currentPage === 1}
                aria-label="Página anterior"
              />

              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      colorScheme={currentPage === pageNum ? "red" : "gray"}
                      variant={currentPage === pageNum ? "solid" : "ghost"}
                    >
                      {pageNum}
                    </Button>
                  );
                } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return <Text key={pageNum}>...</Text>;
                }
                return null;
              })}

              <IconButton
                icon={<ChevronRightIcon />}
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                isDisabled={currentPage === totalPages}
                aria-label="Página siguiente"
              />
            </HStack>
          </Flex>
        )}
      </VStack>

      {/* --- MODAL DE SEGUIMIENTO --- */}
      <ModalSeguimiento isOpen={isOpen} onClose={onClose} orden={selectedOrder} />
    </>
  );
}
