import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Image,
  Input,
  Button,
  HStack,
  VStack,
  Text,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  Flex,
  Badge,
  Spinner,
  TableContainer,
  useColorModeValue,
  Center,
  Stack,
  Icon,
  Tooltip
} from '@chakra-ui/react';
import { FiSearch, FiCalendar, FiMapPin, FiCamera, FiEye } from 'react-icons/fi';
import { entradaService } from '../services/entradaService';

export const AttendanceAdminPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Filters
  const [vendorSearch, setVendorSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal for selfie preview
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedSelfieUrl, setSelectedSelfieUrl] = useState('');

  const bgCard = useColorModeValue('white', 'gray.800');
  const tableHeaderBg = useColorModeValue('gray.50', 'gray.700');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await entradaService.getAllAttendance({
        vendor: vendorSearch,
        dateFrom,
        dateTo
      });
      setLogs(response.logs || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error("Error fetching attendance logs:", error);
    } finally {
      setLoading(false);
    }
  }, [vendorSearch, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleClearFilters = () => {
    setVendorSearch('');
    setDateFrom('');
    setDateTo('');
    // We can't rely on state updates being synchronous, so we pass empty values directly
    setLoading(true);
    entradaService.getAllAttendance({
      vendor: '',
      dateFrom: '',
      dateTo: ''
    }).then(response => {
      setLogs(response.logs || []);
      setTotal(response.total || 0);
    }).catch(error => {
      console.error(error);
    }).finally(() => {
      setLoading(false);
    });
  };

  const openSelfie = (url) => {
    setSelectedSelfieUrl(url);
    onOpen();
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Box bg="gray.50" minH="100vh" py={8} px={4}>
      <VStack spacing={6} align="stretch" maxW="container.xl" mx="auto">
        <Box>
          <Heading size="lg" mb={1}>Registro de Asistencia de Vendedores</Heading>
          <Text color="gray.600">Visualiza y filtra los marcados de ingreso diarios.</Text>
        </Box>

        {/* Panel de Filtros */}
        <Box bg={bgCard} p={6} borderRadius="xl" boxShadow="sm">
          <form onSubmit={handleSearch}>
            <Stack direction={{ base: 'column', md: 'row' }} spacing={4} align="flex-end">
              <Box flex={2} w="full">
                <Text fontSize="sm" fontWeight="bold" mb={2}>Buscar Vendedor</Text>
                <HStack>
                  <Icon as={FiSearch} color="gray.400" position="absolute" ml={3} zIndex={2} />
                  <Input
                    placeholder="Nombre del vendedor..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    pl={10}
                  />
                </HStack>
              </Box>

              <Box flex={1} w="full">
                <Text fontSize="sm" fontWeight="bold" mb={2}>Desde</Text>
                <HStack>
                  <Icon as={FiCalendar} color="gray.400" position="absolute" ml={3} zIndex={2} />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    pl={10}
                  />
                </HStack>
              </Box>

              <Box flex={1} w="full">
                <Text fontSize="sm" fontWeight="bold" mb={2}>Hasta</Text>
                <HStack>
                  <Icon as={FiCalendar} color="gray.400" position="absolute" ml={3} zIndex={2} />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    pl={10}
                  />
                </HStack>
              </Box>

              <HStack w={{ base: 'full', md: 'auto' }} spacing={2} justify="flex-end">
                <Button colorScheme="green" px={8} type="submit" leftIcon={<FiSearch />}>
                  Buscar
                </Button>
                <Button variant="outline" onClick={handleClearFilters}>
                  Limpiar
                </Button>
              </HStack>
            </Stack>
          </form>
        </Box>

        {/* Tabla de Resultados */}
        <Box bg={bgCard} borderRadius="xl" boxShadow="sm" overflow="hidden">
          <Box p={4} bg={tableHeaderBg} borderBottom="1px solid" borderColor="gray.200">
            <HStack justify="space-between">
              <Text fontWeight="bold">Listado de Marcaciones</Text>
              <Badge colorScheme="blue" fontSize="0.9em" px={3} py={1} borderRadius="full">
                Total: {total}
              </Badge>
            </HStack>
          </Box>

          {loading ? (
            <Center py={20}>
              <Spinner size="xl" color="green.500" thickness="4px" />
            </Center>
          ) : logs.length === 0 ? (
            <Center py={20} flexDirection="column">
              <Text color="gray.500" fontSize="lg" mb={2}>No se encontraron marcaciones.</Text>
              <Text color="gray.400" fontSize="sm">Intenta ajustar los criterios de búsqueda.</Text>
            </Center>
          ) : (
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Vendedor</Th>
                    <Th>Código SAP</Th>
                    <Th>Fecha y Hora</Th>
                    <Th>Ubicación</Th>
                    <Th>Selfie</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {logs.map((log) => (
                    <Tr key={log.id}>
                      <Td fontWeight="medium">{log.vendorName}</Td>
                      <Td>
                        <Badge colorScheme="gray" variant="solid">
                          {log.vendorCode || 'N/A'}
                        </Badge>
                      </Td>
                      <Td>{formatDate(log.createdAt)}</Td>
                      <Td>
                        <HStack spacing={1}>
                          <Icon as={FiMapPin} color="red.500" />
                          <Tooltip label="Ver coordenadas" placement="top">
                            <Text 
                              fontSize="sm" 
                              as="a" 
                              href={`https://www.google.com/maps/search/?api=1&query=${log.latitude},${log.longitude}`} 
                              target="_blank"
                              color="blue.500" 
                              textDecoration="underline" 
                              _hover={{ color: 'blue.600', cursor: 'pointer' }}
                            >
                              {log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}
                            </Text>
                          </Tooltip>
                        </HStack>
                      </Td>
                      <Td>
                        {log.imageUrl ? (
                          <Box 
                            position="relative" 
                            w="60px" 
                            h="60px" 
                            borderRadius="md" 
                            overflow="hidden"
                            cursor="pointer"
                            onClick={() => openSelfie(log.imageUrl)}
                            _hover={{ transform: 'scale(1.05)' }}
                            transition="transform 0.2s"
                            border="1px solid"
                            borderColor="gray.200"
                          >
                            <Image 
                              src={log.imageUrl} 
                              alt="Selfie" 
                              objectFit="cover" 
                              w="full" 
                              h="full" 
                            />
                            <Flex 
                              position="absolute" 
                              top={0} 
                              left={0} 
                              w="full" 
                              h="full" 
                              bg="blackAlpha.400" 
                              opacity={0} 
                              _hover={{ opacity: 1 }} 
                              align="center" 
                              justify="center"
                            >
                              <Icon as={FiEye} color="white" />
                            </Flex>
                          </Box>
                        ) : (
                          <HStack color="gray.400">
                            <Icon as={FiCamera} />
                            <Text fontSize="sm">Sin foto</Text>
                          </HStack>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </VStack>

      {/* Modal para ampliar selfie */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalCloseButton color="white" size="lg" zIndex={10} />
          <Flex align="center" justify="center" p={4} onClick={onClose}>
            <Image
              src={selectedSelfieUrl}
              alt="Selfie Completa"
              maxW="100%"
              maxH="80vh"
              objectFit="contain"
              borderRadius="lg"
              onClick={(e) => e.stopPropagation()}
            />
          </Flex>
        </ModalContent>
      </Modal>
    </Box>
  );
};
