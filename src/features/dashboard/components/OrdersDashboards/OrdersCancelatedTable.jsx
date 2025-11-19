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
  Stack,
  Divider,
} from "@chakra-ui/react";
import { useState, useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  ViewIcon,
} from "@chakra-ui/icons";
import CancelledOrderModal from "./CancelledOrderModal";

export default function OrdersCancelatedTable({ data, isLoading, isError }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { isOpen, onOpen, onClose } = useDisclosure();

  const tableBg = useColorModeValue("white", "gray.800");
  const hoverBg = useColorModeValue("red.50", "red.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const cardBg = useColorModeValue("white", "gray.700");

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

  const handleOpenTracking = (order) => {
    setSelectedOrder(order);
    onOpen();
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

  return (
    <>
      <VStack spacing={4} align="stretch">
        {/* --- BUSCADOR Y CONTROLES --- */}
        <Stack
          spacing={3}
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "stretch", md: "center" }}
        >
          <InputGroup maxW={{ base: "100%", md: "400px" }}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              bg={tableBg}
              borderColor={borderColor}
              fontSize={{ base: "sm", md: "md" }}
            />
          </InputGroup>

          <HStack spacing={2} justify={{ base: "space-between", md: "flex-start" }}>
            <Text fontSize="sm" color="gray.600" whiteSpace="nowrap" display={{ base: "none", sm: "block" }}>
              Mostrar:
            </Text>
            <Select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(e.target.value)}
              size="sm"
              w={{ base: "80px", md: "100px" }}
              bg={tableBg}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </Select>
            <Badge colorScheme="red" px={3} py={1} borderRadius="full" fontSize="xs">
              {filteredData.length}
            </Badge>
          </HStack>
        </Stack>

        {/* --- VISTA DESKTOP: TABLA --- */}
        <Box 
          display={{ base: "none", lg: "block" }}
          overflowX="auto" 
          borderWidth="1px" 
          borderColor={borderColor} 
          borderRadius="lg"
        >
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
                      <Tooltip label="Ver seguimiento" hasArrow>
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

        {/* --- VISTA MÓVIL: CARDS --- */}
        <VStack spacing={3} display={{ base: "flex", lg: "none" }}>
          {currentData.length === 0 ? (
            <Box py={8} textAlign="center" w="100%">
              <Text color="gray.500" fontSize="sm">
                No se encontraron resultados para "{searchTerm}"
              </Text>
            </Box>
          ) : (
            currentData.map((item, index) => (
              <Box
                key={index}
                p={4}
                bg={cardBg}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="lg"
                w="100%"
                shadow="sm"
              >
                <VStack align="stretch" spacing={3}>
                  {/* Vendedor y Pedido */}
                  <Flex justify="space-between" align="start">
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontSize="xs" color="gray.500">
                        Vendedor
                      </Text>
                      <Text fontWeight="bold" fontSize="sm">
                        {item.sellerName}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Código: {item.sellerCode}
                      </Text>
                    </VStack>
                    <Badge colorScheme="blue" variant="outline" fontSize="xs">
                      #{item.orderNumber}
                    </Badge>
                  </Flex>

                  <Divider />

                  {/* Cliente */}
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>
                      Cliente
                    </Text>
                    <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
                      {item.clientName}
                    </Text>
                  </Box>

                  {/* Motivo */}
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>
                      Motivo de Cancelación
                    </Text>
                    <Badge
                      colorScheme="red"
                      variant="subtle"
                      px={2}
                      py={1}
                      fontSize="xs"
                      w="100%"
                      textAlign="center"
                    >
                      {item.cancellationReason}
                    </Badge>
                  </Box>

                  {/* Unidades y Fecha */}
                  <Flex justify="space-between" align="center">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="xs" color="gray.500">
                        Unidades
                      </Text>
                      <Text fontWeight="bold" color="red.500" fontSize="lg">
                        {item.totalUnits}
                      </Text>
                    </VStack>
                    <VStack align="end" spacing={0}>
                      <Text fontSize="xs" color="gray.500">
                        Fecha
                      </Text>
                      <Text fontSize="xs" fontWeight="medium">
                        {item.orderDate}
                      </Text>
                    </VStack>
                  </Flex>

                  <Divider />

                  {/* Botón de acción */}
                  <Button
                    leftIcon={<ViewIcon />}
                    colorScheme="red"
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenTracking(item)}
                    w="100%"
                  >
                    Ver Seguimiento
                  </Button>
                </VStack>
              </Box>
            ))
          )}
        </VStack>

        {/* --- PAGINACIÓN --- */}
        {totalPages > 1 && (
          <Stack 
            direction={{ base: "column", sm: "row" }}
            justify="space-between" 
            align="center" 
            spacing={3}
          >
            <Text fontSize="xs" color="gray.600" textAlign="center">
              {startIndex + 1} - {Math.min(endIndex, filteredData.length)} de {filteredData.length}
            </Text>

            <HStack spacing={1}>
              <IconButton
                icon={<ChevronLeftIcon />}
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                isDisabled={currentPage === 1}
                aria-label="Anterior"
              />

              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                const showPage = 
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                if (showPage) {
                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      colorScheme={currentPage === pageNum ? "red" : "gray"}
                      variant={currentPage === pageNum ? "solid" : "ghost"}
                      minW="35px"
                      display={{ base: pageNum === currentPage || pageNum === 1 || pageNum === totalPages ? "flex" : "none", sm: "flex" }}
                    >
                      {pageNum}
                    </Button>
                  );
                } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return <Text key={pageNum} fontSize="sm" display={{ base: "none", sm: "block" }}>...</Text>;
                }
                return null;
              })}

              <IconButton
                icon={<ChevronRightIcon />}
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                isDisabled={currentPage === totalPages}
                aria-label="Siguiente"
              />
            </HStack>
          </Stack>
        )}
      </VStack>

      {/* --- MODAL DE SEGUIMIENTO --- */}
      <CancelledOrderModal 
        isOpen={isOpen} 
        onClose={onClose} 
        order={selectedOrder} 
      />
    </>
  );
}