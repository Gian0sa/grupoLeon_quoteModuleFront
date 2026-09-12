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
  InputGroup,
  InputLeftElement,
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
  Tooltip,
  IconButton
} from '@chakra-ui/react';
import {
  FiSearch,
  FiCalendar,
  FiMapPin,
  FiCamera,
  FiEye,
  FiRefreshCw,
  FiUserCheck,
  FiFilter,
  FiRotateCcw,
  FiExternalLink
} from 'react-icons/fi';
import { TopHeaderBanner } from '../../../components/TopHeaderBanner';
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
  const tableHeaderBg = useColorModeValue('#f8fafc', 'gray.700');
  const borderColor = useColorModeValue('#e2e8f0', 'gray.700');

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
    return date.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <Box bg="gray.50" minH="100vh" w="full" pb="100px">
      {/* CABECERA OFICIAL CORPORATIVA DE GRUPO LEÓN */}
      <TopHeaderBanner
        title="Registro de Asistencia de Vendedores"
        subtitle="Auditoría de marcaciones diarias, geolocalización y selfies en tiempo real"
        showBack={true}
        backTo="/dashboard"
        mb={6}
      />

      {/* CONTENEDOR PRINCIPAL */}
      <Box maxW="1280px" mx="auto" px={{ base: 3, md: 6 }} mt={-6}>
        <VStack spacing={5} align="stretch">

          {/* BARRA DE ACCIÓN PRINCIPAL / ESTADÍSTICAS */}
          <Flex
            align={{ base: "stretch", md: "center" }}
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            bg="white"
            p={{ base: 4, md: 5 }}
            borderRadius="2xl"
            border="1px solid"
            borderColor={borderColor}
            boxShadow="sm"
            gap={4}
          >
            <HStack spacing={3} minW={0}>
              <Flex
                w="46px"
                h="46px"
                minW="46px"
                borderRadius="xl"
                bg="emerald.50"
                align="center"
                justify="center"
                color="emerald.700"
                border="1px solid"
                borderColor="emerald.200"
              >
                <Icon as={FiUserCheck} boxSize={6} />
              </Flex>
              <Box minW={0}>
                <HStack spacing={2} align="center">
                  <Heading size={{ base: "sm", md: "md" }} color="emerald.900" fontWeight="900">
                    Control de Marcaciones
                  </Heading>
                  <Badge
                    bg="emerald.100"
                    color="emerald.800"
                    fontSize="xs"
                    fontWeight="800"
                    px={2.5}
                    py={0.5}
                    borderRadius="full"
                  >
                    EN VIVO
                  </Badge>
                </HStack>
                <Text fontSize={{ base: "11px", md: "xs" }} color="gray.500">
                  Monitoreo de ingresos de la fuerza de ventas con validación fotográfica y GPS
                </Text>
              </Box>
            </HStack>

            <HStack spacing={3} justify={{ base: "space-between", md: "flex-end" }}>
              <Badge
                bg="#f0fdf4"
                border="1.5px solid"
                borderColor="emerald.300"
                color="emerald.800"
                fontSize="0.9em"
                fontWeight="900"
                px={4}
                py={2}
                borderRadius="xl"
                boxShadow="xs"
              >
                Total Marcaciones: {total}
              </Badge>

              <Tooltip label="Actualizar registros del servidor" placement="top">
                <IconButton
                  icon={<FiRefreshCw className={loading ? "animate-spin" : ""} />}
                  aria-label="Refrescar lista"
                  onClick={fetchLogs}
                  isLoading={loading}
                  bg="white"
                  border="1.5px solid"
                  borderColor={borderColor}
                  borderRadius="xl"
                  _hover={{ bg: "emerald.50", borderColor: "emerald.300", color: "emerald.700" }}
                  color="gray.600"
                  size="md"
                />
              </Tooltip>
            </HStack>
          </Flex>

          {/* PANEL DE FILTROS AVANZADOS */}
          <Box
            bg="white"
            p={{ base: 4, md: 5 }}
            borderRadius="2xl"
            border="1px solid"
            borderColor={borderColor}
            boxShadow="sm"
          >
            <Flex align="center" justify="space-between" mb={4}>
              <HStack spacing={2}>
                <Icon as={FiFilter} color="emerald.700" boxSize={4} />
                <Text fontSize="xs" fontWeight="900" color="gray.700" textTransform="uppercase" letterSpacing="wide">
                  Filtros de Búsqueda
                </Text>
              </HStack>
              {(vendorSearch || dateFrom || dateTo) && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="emerald"
                  leftIcon={<Icon as={FiRotateCcw} />}
                  onClick={handleClearFilters}
                  fontWeight="800"
                >
                  Restablecer
                </Button>
              )}
            </Flex>

            <form onSubmit={handleSearch}>
              <Stack direction={{ base: 'column', lg: 'row' }} spacing={3.5} align={{ base: 'stretch', lg: 'flex-end' }}>
                <Box flex={{ base: 1, lg: 2 }}>
                  <Text fontSize="11px" fontWeight="800" color="gray.600" mb={1.5} textTransform="uppercase">
                    Vendedor
                  </Text>
                  <InputGroup size="md">
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiSearch} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      placeholder="Buscar por nombre o código..."
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      borderRadius="xl"
                      bg="gray.50"
                      _hover={{ bg: "white", borderColor: "emerald.300" }}
                      _focus={{ bg: "white", borderColor: "#126C36", boxShadow: "0 0 0 1px #126C36" }}
                      fontSize="sm"
                      fontWeight="600"
                    />
                  </InputGroup>
                </Box>

                <Box flex={1}>
                  <Text fontSize="11px" fontWeight="800" color="gray.600" mb={1.5} textTransform="uppercase">
                    Fecha Desde
                  </Text>
                  <InputGroup size="md">
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiCalendar} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      borderRadius="xl"
                      bg="gray.50"
                      _hover={{ bg: "white", borderColor: "emerald.300" }}
                      _focus={{ bg: "white", borderColor: "#126C36", boxShadow: "0 0 0 1px #126C36" }}
                      fontSize="sm"
                      fontWeight="600"
                    />
                  </InputGroup>
                </Box>

                <Box flex={1}>
                  <Text fontSize="11px" fontWeight="800" color="gray.600" mb={1.5} textTransform="uppercase">
                    Fecha Hasta
                  </Text>
                  <InputGroup size="md">
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiCalendar} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      borderRadius="xl"
                      bg="gray.50"
                      _hover={{ bg: "white", borderColor: "emerald.300" }}
                      _focus={{ bg: "white", borderColor: "#126C36", boxShadow: "0 0 0 1px #126C36" }}
                      fontSize="sm"
                      fontWeight="600"
                    />
                  </InputGroup>
                </Box>

                <HStack spacing={2} pt={{ base: 2, lg: 0 }}>
                  <Button
                    bg="#126C36"
                    color="white"
                    _hover={{ bg: "#0e572b", transform: "translateY(-1px)", boxShadow: "0 4px 14px rgba(18, 108, 54, 0.35)" }}
                    _active={{ bg: "#0a3f1f" }}
                    size="md"
                    px={6}
                    type="submit"
                    leftIcon={<Icon as={FiSearch} />}
                    borderRadius="xl"
                    fontWeight="800"
                    boxShadow="0 4px 12px rgba(18, 108, 54, 0.25)"
                    isLoading={loading}
                  >
                    Buscar
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    px={5}
                    onClick={handleClearFilters}
                    borderRadius="xl"
                    fontWeight="700"
                    borderColor={borderColor}
                    _hover={{ bg: "gray.100" }}
                  >
                    Limpiar
                  </Button>
                </HStack>
              </Stack>
            </form>
          </Box>

          {/* TABLA DE RESULTADOS */}
          <Box
            bg={bgCard}
            borderRadius="2xl"
            border="1px solid"
            borderColor={borderColor}
            boxShadow="sm"
            overflow="hidden"
          >
            {loading ? (
              <Center py={24} flexDirection="column" gap={3}>
                <Spinner size="xl" color="emerald.600" thickness="4px" speed="0.7s" />
                <Text fontSize="sm" color="gray.500" fontWeight="700">
                  Cargando marcaciones de asistencia...
                </Text>
              </Center>
            ) : logs.length === 0 ? (
              <Center py={20} px={4} flexDirection="column" textAlign="center">
                <Flex
                  w="64px"
                  h="64px"
                  borderRadius="2xl"
                  bg="gray.100"
                  align="center"
                  justify="center"
                  color="gray.400"
                  mb={4}
                >
                  <Icon as={FiUserCheck} boxSize={8} />
                </Flex>
                <Text color="gray.800" fontSize="md" fontWeight="800" mb={1}>
                  No se encontraron marcaciones
                </Text>
                <Text color="gray.500" fontSize="xs" maxW="sm">
                  No hay registros que coincidan con los filtros aplicados. Intenta ampliar el rango de fechas o limpiar los filtros.
                </Text>
                {(vendorSearch || dateFrom || dateTo) && (
                  <Button
                    mt={4}
                    size="sm"
                    variant="outline"
                    colorScheme="emerald"
                    borderRadius="xl"
                    onClick={handleClearFilters}
                    leftIcon={<Icon as={FiRotateCcw} />}
                  >
                    Limpiar Filtros
                  </Button>
                )}
              </Center>
            ) : (
              <TableContainer>
                <Table variant="simple" size="md">
                  <Thead bg={tableHeaderBg}>
                    <Tr>
                      <Th fontSize="11px" fontWeight="900" color="gray.600" py={3.5} textTransform="uppercase" letterSpacing="wider">
                        Vendedor
                      </Th>
                      <Th fontSize="11px" fontWeight="900" color="gray.600" py={3.5} textTransform="uppercase" letterSpacing="wider">
                        Código SAP
                      </Th>
                      <Th fontSize="11px" fontWeight="900" color="gray.600" py={3.5} textTransform="uppercase" letterSpacing="wider">
                        Fecha y Hora
                      </Th>
                      <Th fontSize="11px" fontWeight="900" color="gray.600" py={3.5} textTransform="uppercase" letterSpacing="wider">
                        Geolocalización
                      </Th>
                      <Th fontSize="11px" fontWeight="900" color="gray.600" py={3.5} textTransform="uppercase" letterSpacing="wider" textAlign="center">
                        Selfie
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {logs.map((log) => (
                      <Tr
                        key={log.id}
                        _hover={{ bg: "emerald.50/40" }}
                        transition="background 0.15s ease"
                      >
                        <Td py={3.5}>
                          <HStack spacing={2.5}>
                            <Flex
                              w="34px"
                              h="34px"
                              borderRadius="full"
                              bg="emerald.100"
                              color="emerald.800"
                              align="center"
                              justify="center"
                              fontWeight="800"
                              fontSize="xs"
                            >
                              {(log.vendorName || "V").charAt(0).toUpperCase()}
                            </Flex>
                            <Box>
                              <Text fontWeight="800" color="gray.900" fontSize="sm">
                                {log.vendorName}
                              </Text>
                              <Text fontSize="11px" color="gray.400">
                                Registro #{log.id}
                              </Text>
                            </Box>
                          </HStack>
                        </Td>
                        <Td py={3.5}>
                          <Badge
                            bg="#e0f2fe"
                            color="#0369a1"
                            border="1px solid"
                            borderColor="#bae6fd"
                            fontSize="xs"
                            fontWeight="800"
                            px={2.5}
                            py={1}
                            borderRadius="lg"
                          >
                            {log.vendorCode || 'N/A'}
                          </Badge>
                        </Td>
                        <Td py={3.5}>
                          <Text fontSize="sm" fontWeight="700" color="gray.800">
                            {formatDate(log.createdAt)}
                          </Text>
                        </Td>
                        <Td py={3.5}>
                          {log.latitude && log.longitude ? (
                            <HStack
                              as="a"
                              href={`https://www.google.com/maps/search/?api=1&query=${log.latitude},${log.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              spacing={1.5}
                              px={2.5}
                              py={1}
                              borderRadius="lg"
                              bg="red.50"
                              border="1px solid"
                              borderColor="red.100"
                              color="red.700"
                              _hover={{ bg: "red.100", transform: "translateY(-1px)" }}
                              transition="all 0.2s"
                              w="fit-content"
                            >
                              <Icon as={FiMapPin} color="red.600" boxSize={3.5} />
                              <Text fontSize="xs" fontWeight="800">
                                {Number(log.latitude).toFixed(5)}, {Number(log.longitude).toFixed(5)}
                              </Text>
                              <Icon as={FiExternalLink} boxSize={3} opacity={0.7} />
                            </HStack>
                          ) : (
                            <Text fontSize="xs" color="gray.400">Sin GPS</Text>
                          )}
                        </Td>
                        <Td py={3.5} textAlign="center">
                          {log.imageUrl ? (
                            <Tooltip label="Clic para ampliar selfie" placement="top">
                              <Box
                                position="relative"
                                w="48px"
                                h="48px"
                                borderRadius="xl"
                                overflow="hidden"
                                cursor="pointer"
                                onClick={() => openSelfie(log.imageUrl)}
                                _hover={{ transform: 'scale(1.08)', boxShadow: 'md' }}
                                transition="all 0.2s"
                                border="2px solid"
                                borderColor="emerald.200"
                                mx="auto"
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
                                  bg="blackAlpha.500"
                                  opacity={0}
                                  _hover={{ opacity: 1 }}
                                  align="center"
                                  justify="center"
                                  transition="opacity 0.2s"
                                >
                                  <Icon as={FiEye} color="white" boxSize={4} />
                                </Flex>
                              </Box>
                            </Tooltip>
                          ) : (
                            <HStack color="gray.400" justify="center" spacing={1}>
                              <Icon as={FiCamera} boxSize={3.5} />
                              <Text fontSize="xs" fontWeight="600">Sin foto</Text>
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
      </Box>

      {/* MODAL PARA AMPLIAR SELFIE */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(6px)" />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalCloseButton color="white" size="lg" zIndex={10} bg="blackAlpha.500" borderRadius="full" m={2} />
          <Flex align="center" justify="center" p={4} onClick={onClose}>
            <Image
              src={selectedSelfieUrl}
              alt="Selfie Completa"
              maxW="100%"
              maxH="82vh"
              objectFit="contain"
              borderRadius="2xl"
              boxShadow="2xl"
              border="2px solid rgba(255,255,255,0.3)"
              onClick={(e) => e.stopPropagation()}
            />
          </Flex>
        </ModalContent>
      </Modal>
    </Box>
  );
};
