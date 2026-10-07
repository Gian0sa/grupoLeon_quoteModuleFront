import React, { useState, useMemo } from "react";
import {
  Box,
  Heading,
  Text,
  Flex,
  HStack,
  VStack,
  SimpleGrid,
  Card,
  CardBody,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Select,
  Button,
  IconButton,
  Badge,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Center,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Divider,
  Avatar,
  Tooltip,
  Tag,
  TagLabel,
} from "@chakra-ui/react";
import {
  Search,
  X,
  Users,
  Eye,
  Radio,
  Clock,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Compass,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  Activity,
  Sparkles,
  Wifi,
  ExternalLink,
  Monitor,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import { useOnlineUsersMonitor } from "../hooks/useOnlineUsersMonitor";
import { UserSessionDetailModal } from "../components/UserSessionDetailModal";
import {
  translateRoute,
  formatRelativeActivity,
  formatSessionDuration,
  formatDisconnectionDuration,
} from "../services/presenceService";

const STATUS_PRIORITY = {
  ONLINE: 1,
  IDLE: 2,
  OFFLINE: 3,
};

const formatHistoryTime = (timestamp) => {
  if (!timestamp) return "—";
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "—";
    return format(d, "HH:mm:ss");
  } catch {
    return "—";
  }
};

export function OnlineUsersPage() {
  const { users, counts, isLoading } = useOnlineUsersMonitor();

  const todayFormatted = useMemo(() => {
    const raw = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, []);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Modal de Detalle
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedUser, setSelectedUser] = useState(null);

  // Mantener actualizado en tiempo real el usuario seleccionado si cambian los datos vía WebSocket
  const activeSelectedUser = useMemo(() => {
    if (!selectedUser) return null;
    return users.find((u) => u.userId === selectedUser.userId) || selectedUser;
  }, [users, selectedUser]);

  // Historial de navegación estructurado
  const activeHistory = useMemo(() => {
    if (!activeSelectedUser) return [];
    if (Array.isArray(activeSelectedUser.pageHistory) && activeSelectedUser.pageHistory.length > 0) {
      return activeSelectedUser.pageHistory;
    }
    if (activeSelectedUser.currentPage && activeSelectedUser.currentPage !== "-") {
      return [
        {
          page: activeSelectedUser.currentPage,
          enteredAt: activeSelectedUser.connectedAt || activeSelectedUser.lastActivity || Date.now(),
        },
      ];
    }
    return [];
  }, [activeSelectedUser]);

  const handleOpenDetail = (user) => {
    setSelectedUser(user);
    onOpen();
  };

  // Filtrado y Ordenamiento
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        // 1. Filtro por texto (nombre, usuario o correo)
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !term ||
          (u.name && u.name.toLowerCase().includes(term)) ||
          (u.username && u.username.toLowerCase().includes(term)) ||
          (u.email && u.email.toLowerCase().includes(term));

        if (!matchesSearch) return false;

        // 2. Filtro por estado
        if (statusFilter !== "ALL" && u.status !== statusFilter) {
          return false;
        }

        // 3. Filtro por rol / tipo
        if (roleFilter === "VENDEDOR" && !u.salesEmployeeCode) {
          return false;
        }
        if (roleFilter === "ADMIN" && u.salesEmployeeCode) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Prioridad 1: ONLINE -> IDLE -> OFFLINE
        const priorityA = STATUS_PRIORITY[a.status] || 99;
        const priorityB = STATUS_PRIORITY[b.status] || 99;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Prioridad 2: Actividad más reciente primero
        return (b.lastActivity || 0) - (a.lastActivity || 0);
      });
  }, [users, searchTerm, statusFilter, roleFilter]);

  // Icono para tipo de dispositivo
  const getDeviceIcon = (deviceType) => {
    const t = String(deviceType || "").toLowerCase();
    if (t === "mobile") return <Smartphone size={15} />;
    if (t === "tablet") return <Tablet size={15} />;
    return <Laptop size={15} />;
  };

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="80px">
      {/* ─── BANNER SUPERIOR OFICIAL AUTOPARTES ──────────────────────────────── */}
      <TopHeaderBanner
        title="Usuarios Conectados"
        subtitle={`Monitor de actividad y presencia en tiempo real del personal • ${todayFormatted}`}
        showBack={true}
        backTo="/dashboard"
        refreshQueries={["adminUsers"]}
      />

      <Box maxW="1200px" mx="auto" px={{ base: 2.5, sm: 3, md: 6 }} mt="-10px">
        <VStack align="stretch" spacing={{ base: 3.5, md: 5 }}>
          {/* ─── 4 TARJETAS DE MÉTRICAS CORPORATIVAS ────────────────────────── */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 2.5, md: 3.5 }}>
            {/* 🟢 En Línea */}
            <Card
              bg="white"
              borderRadius="2xl"
              boxShadow="xs"
              border="1px solid"
              borderColor="gray.200"
              position="relative"
              overflow="hidden"
              transition="all 0.2s ease"
              _hover={{ transform: "translateY(-2px)", boxShadow: "0 6px 20px rgba(22, 163, 74, 0.12)" }}
            >
              <Box
                position="absolute"
                top="-15px"
                right="-15px"
                w="65px"
                h="65px"
                borderRadius="full"
                bg="green.50"
                opacity={0.8}
                pointerEvents="none"
              />
              <CardBody p={{ base: 2.5, sm: 3, md: 3.5 }}>
                <Flex align="center" justify="space-between">
                  <Box minW={0}>
                    <HStack spacing={1.5} mb={0.5}>
                      <Box
                        w={{ base: "6px", md: "7px" }}
                        h={{ base: "6px", md: "7px" }}
                        borderRadius="full"
                        bg="green.500"
                        flexShrink={0}
                        sx={{
                          animation: "pulseOnline 2s infinite",
                          "@keyframes pulseOnline": {
                            "0%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(34, 197, 94, 0.7)" },
                            "70%": { transform: "scale(1)", boxShadow: "0 0 0 6px rgba(34, 197, 94, 0)" },
                            "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(34, 197, 94, 0)" },
                          },
                        }}
                      />
                      <Text fontSize={{ base: "10px", md: "11px" }} fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="wider">
                        En Línea
                      </Text>
                    </HStack>
                    <Text fontSize={{ base: "20px", sm: "24px", md: "26px" }} fontWeight="900" color="green.600" lineHeight="1.1">
                      {counts.online}
                    </Text>
                    <Text fontSize={{ base: "10px", md: "xs" }} color="gray.400" mt={0.5} noOfLines={1}>
                      Interactuando ahora
                    </Text>
                  </Box>
                  <Flex w={{ base: "34px", md: "42px" }} h={{ base: "34px", md: "42px" }} borderRadius="xl" bg="green.50" color="green.600" align="center" justify="center" flexShrink={0}>
                    <Wifi size={18} />
                  </Flex>
                </Flex>
              </CardBody>
            </Card>

            {/* 🟡 Ausentes */}
            <Card
              bg="white"
              borderRadius="2xl"
              boxShadow="xs"
              border="1px solid"
              borderColor="gray.200"
              position="relative"
              overflow="hidden"
              transition="all 0.2s ease"
              _hover={{ transform: "translateY(-2px)", boxShadow: "0 6px 20px rgba(234, 179, 8, 0.12)" }}
            >
              <Box
                position="absolute"
                top="-15px"
                right="-15px"
                w="65px"
                h="65px"
                borderRadius="full"
                bg="yellow.50"
                opacity={0.8}
                pointerEvents="none"
              />
              <CardBody p={{ base: 2.5, sm: 3, md: 3.5 }}>
                <Flex align="center" justify="space-between">
                  <Box minW={0}>
                    <HStack spacing={1.5} mb={0.5}>
                      <Box w={{ base: "6px", md: "7px" }} h={{ base: "6px", md: "7px" }} borderRadius="full" bg="yellow.500" flexShrink={0} />
                      <Text fontSize={{ base: "10px", md: "11px" }} fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="wider">
                        Ausentes
                      </Text>
                    </HStack>
                    <Text fontSize={{ base: "20px", sm: "24px", md: "26px" }} fontWeight="900" color="yellow.600" lineHeight="1.1">
                      {counts.idle}
                    </Text>
                    <Text fontSize={{ base: "10px", md: "xs" }} color="gray.400" mt={0.5} noOfLines={1}>
                      Sin actividad &gt; 1m
                    </Text>
                  </Box>
                  <Flex w={{ base: "34px", md: "42px" }} h={{ base: "34px", md: "42px" }} borderRadius="xl" bg="yellow.50" color="yellow.600" align="center" justify="center" flexShrink={0}>
                    <Clock size={18} />
                  </Flex>
                </Flex>
              </CardBody>
            </Card>

            {/* ⚪ Desconectados */}
            <Card
              bg="white"
              borderRadius="2xl"
              boxShadow="xs"
              border="1px solid"
              borderColor="gray.200"
              position="relative"
              overflow="hidden"
              transition="all 0.2s ease"
              _hover={{ transform: "translateY(-2px)", boxShadow: "0 6px 20px rgba(100, 116, 139, 0.08)" }}
            >
              <Box
                position="absolute"
                top="-15px"
                right="-15px"
                w="65px"
                h="65px"
                borderRadius="full"
                bg="gray.100"
                opacity={0.8}
                pointerEvents="none"
              />
              <CardBody p={{ base: 2.5, sm: 3, md: 3.5 }}>
                <Flex align="center" justify="space-between">
                  <Box minW={0}>
                    <HStack spacing={1.5} mb={0.5}>
                      <Box w={{ base: "6px", md: "7px" }} h={{ base: "6px", md: "7px" }} borderRadius="full" bg="gray.400" flexShrink={0} />
                      <Text fontSize={{ base: "10px", md: "11px" }} fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="wider">
                        Desconectados
                      </Text>
                    </HStack>
                    <Text fontSize={{ base: "20px", sm: "24px", md: "26px" }} fontWeight="900" color="gray.600" lineHeight="1.1">
                      {counts.offline}
                    </Text>
                    <Text fontSize={{ base: "10px", md: "xs" }} color="gray.400" mt={0.5} noOfLines={1}>
                      Sin sesión activa
                    </Text>
                  </Box>
                  <Flex w={{ base: "34px", md: "42px" }} h={{ base: "34px", md: "42px" }} borderRadius="xl" bg="gray.100" color="gray.500" align="center" justify="center" flexShrink={0}>
                    <MinusCircle size={18} />
                  </Flex>
                </Flex>
              </CardBody>
            </Card>

            {/* 👥 Total Usuarios */}
            <Card
              bg="white"
              borderRadius="2xl"
              boxShadow="xs"
              border="1px solid"
              borderColor="gray.200"
              position="relative"
              overflow="hidden"
              transition="all 0.2s ease"
              _hover={{ transform: "translateY(-2px)", boxShadow: "0 6px 20px rgba(59, 130, 246, 0.12)" }}
            >
              <Box
                position="absolute"
                top="-15px"
                right="-15px"
                w="65px"
                h="65px"
                borderRadius="full"
                bg="blue.50"
                opacity={0.8}
                pointerEvents="none"
              />
              <CardBody p={{ base: 2.5, sm: 3, md: 3.5 }}>
                <Flex align="center" justify="space-between">
                  <Box minW={0}>
                    <HStack spacing={1.5} mb={0.5}>
                      <Box w={{ base: "6px", md: "7px" }} h={{ base: "6px", md: "7px" }} borderRadius="full" bg="blue.500" flexShrink={0} />
                      <Text fontSize={{ base: "10px", md: "11px" }} fontWeight="800" color="gray.500" textTransform="uppercase" letterSpacing="wider">
                        Total Usuarios
                      </Text>
                    </HStack>
                    <Text fontSize={{ base: "20px", sm: "24px", md: "26px" }} fontWeight="900" color="gray.800" lineHeight="1.1">
                      {counts.total}
                    </Text>
                    <Text fontSize={{ base: "10px", md: "xs" }} color="gray.400" mt={0.5} noOfLines={1}>
                      Cuentas del sistema
                    </Text>
                  </Box>
                  <Flex w={{ base: "34px", md: "42px" }} h={{ base: "34px", md: "42px" }} borderRadius="xl" bg="blue.50" color="blue.600" align="center" justify="center" flexShrink={0}>
                    <Users size={18} />
                  </Flex>
                </Flex>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* ─── CONTENEDOR PRINCIPAL: FILTROS + VISTAS RESPONSIVAS ─────────── */}
          <Box
            bg="white"
            borderRadius="2xl"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="sm"
            overflow="hidden"
          >
            {/* Barra de Búsqueda y Filtros Optimizada para Móvil */}
            <Box p={{ base: 3, sm: 3.5, md: 5 }} borderBottom="1px solid" borderColor="gray.100">
              <Flex direction={{ base: "column", lg: "row" }} gap={2.5} align={{ base: "stretch", lg: "center" }} justify="space-between">
                {/* Buscador */}
                <InputGroup size="sm" maxW={{ base: "full", lg: "380px" }} w="full">
                  <InputLeftElement pointerEvents="none">
                    <Search size={16} color="#9ca3af" />
                  </InputLeftElement>
                  <Input
                    placeholder="Buscar por usuario, nombre o correo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    borderRadius="xl"
                    bg="white"
                    border="1px solid"
                    borderColor="gray.200"
                    fontSize="xs"
                    h="38px"
                    _hover={{ borderColor: "gray.300" }}
                    _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px #16a34a" }}
                  />
                  {searchTerm && (
                    <InputRightElement>
                      <IconButton
                        size="xs"
                        icon={<X size={14} />}
                        variant="ghost"
                        onClick={() => setSearchTerm("")}
                        aria-label="Limpiar búsqueda"
                      />
                    </InputRightElement>
                  )}
                </InputGroup>

                {/* Filtros Dropdowns y Contador */}
                <Flex
                  direction={{ base: "column", sm: "row" }}
                  gap={2}
                  w={{ base: "full", lg: "auto" }}
                  align={{ base: "stretch", sm: "center" }}
                >
                  <SimpleGrid columns={2} spacing={2} flex={{ base: "1", lg: "none" }} w={{ base: "full", lg: "auto" }}>
                    <Select
                      size="sm"
                      h="38px"
                      w={{ base: "full", sm: "165px" }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      borderRadius="xl"
                      bg="white"
                      border="1px solid"
                      borderColor="gray.200"
                      fontSize="xs"
                      fontWeight="600"
                      _hover={{ borderColor: "gray.300" }}
                      _focus={{ borderColor: "green.500" }}
                    >
                      <option value="ALL">Estado: Todos</option>
                      <option value="ONLINE">🟢 En línea ({counts.online})</option>
                      <option value="IDLE">🟡 Ausentes ({counts.idle})</option>
                      <option value="OFFLINE">⚪ Desconectados ({counts.offline})</option>
                    </Select>

                    <Select
                      size="sm"
                      h="38px"
                      w={{ base: "full", sm: "180px" }}
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      borderRadius="xl"
                      bg="white"
                      border="1px solid"
                      borderColor="gray.200"
                      fontSize="xs"
                      fontWeight="600"
                      _hover={{ borderColor: "gray.300" }}
                      _focus={{ borderColor: "green.500" }}
                    >
                      <option value="ALL">Rol: Todos</option>
                      <option value="VENDEDOR">Asesores</option>
                      <option value="ADMIN">Oficina</option>
                    </Select>
                  </SimpleGrid>

                  <Badge
                    bg="green.50"
                    color="green.700"
                    border="1px solid"
                    borderColor="green.200"
                    px={3}
                    h="38px"
                    borderRadius="xl"
                    fontSize="xs"
                    fontWeight="800"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    gap={1.5}
                    flexShrink={0}
                  >
                    <Activity size={13} color="#16a34a" /> {filteredUsers.length} registros
                  </Badge>
                </Flex>
              </Flex>
            </Box>

            {/* Contenido: Mobile Cards (< md) y Desktop Table (>= md) */}
            {isLoading ? (
              <Center py={20}>
                <VStack spacing={3}>
                  <Spinner size="xl" color="green.600" thickness="3px" speed="0.65s" />
                  <Text color="gray.500" fontSize="sm" fontWeight="500">
                    Sincronizando estado en tiempo real...
                  </Text>
                </VStack>
              </Center>
            ) : filteredUsers.length === 0 ? (
              <Center py={16} px={4}>
                <VStack spacing={2} textAlign="center">
                  <Flex w="52px" h="52px" borderRadius="2xl" bg="gray.100" align="center" justify="center" color="gray.400">
                    <Users size={26} />
                  </Flex>
                  <Text fontWeight="700" color="gray.700" fontSize="md">
                    No se encontraron usuarios
                  </Text>
                  <Text color="gray.400" fontSize="xs" maxW="320px">
                    Intenta modificando el término de búsqueda o cambiando los filtros de estado o rol.
                  </Text>
                </VStack>
              </Center>
            ) : (
              <>
                {/* ─── VISTA MÓVIL (< 768px): TARJETAS ULTRA-ADAPTADAS SIN DESBORDE ─── */}
                <VStack
                  spacing={3}
                  align="stretch"
                  display={{ base: "flex", md: "none" }}
                  p={{ base: 3, sm: 4 }}
                  bg="gray.50"
                >
                  {filteredUsers.map((u) => {
                    const isOnline = u.status === "ONLINE";
                    const isIdle = u.status === "IDLE";
                    const isOffline = u.status === "OFFLINE";
                    const relativeAct = formatRelativeActivity(u.lastActivity);
                    const isActNow = relativeAct === "Ahora";

                    return (
                      <Box
                        key={u.userId}
                        bg="white"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor={isOnline ? "green.200" : isIdle ? "yellow.200" : "gray.200"}
                        p={3.5}
                        boxShadow="xs"
                        position="relative"
                        transition="all 0.15s ease"
                        _hover={{ borderColor: isOnline ? "green.400" : "gray.300", boxShadow: "sm" }}
                      >
                        {/* Cabecera del usuario: Avatar + Nombre + Estado */}
                        <Flex justify="space-between" align="center" gap={2} mb={2.5}>
                          <HStack spacing={2.5} minW={0} flex={1}>
                            <Avatar
                              size="sm"
                              name={u.name || u.username}
                              bg={isOnline ? "green.600" : isIdle ? "yellow.500" : "gray.400"}
                              color="white"
                              fontWeight="bold"
                              fontSize="xs"
                            />
                            <Box minW={0} flex={1}>
                              <Text fontWeight="800" fontSize="sm" color="gray.900" noOfLines={1}>
                                {u.name || u.username}
                              </Text>
                              <Text fontSize="11px" color="gray.500" noOfLines={1}>
                                {u.email && u.email !== "-" ? u.email : `@${u.username}`}
                              </Text>
                            </Box>
                          </HStack>

                          {/* Badge de Estado */}
                          <Box flexShrink={0}>
                            {isOnline && (
                              <Badge
                                bg="green.50"
                                color="green.700"
                                border="1px solid"
                                borderColor="green.200"
                                px={2}
                                py={0.5}
                                borderRadius="full"
                                fontSize="10px"
                                fontWeight="800"
                              >
                                <HStack spacing={1}>
                                  <Box
                                    w="5px"
                                    h="5px"
                                    borderRadius="full"
                                    bg="green.500"
                                    sx={{
                                      animation: "pulseOnline 2s infinite",
                                      "@keyframes pulseOnline": {
                                        "0%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(34, 197, 94, 0.7)" },
                                        "70%": { transform: "scale(1)", boxShadow: "0 0 0 4px rgba(34, 197, 94, 0)" },
                                        "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(34, 197, 94, 0)" },
                                      },
                                    }}
                                  />
                                  <Text as="span">EN LÍNEA</Text>
                                </HStack>
                              </Badge>
                            )}
                            {isIdle && (
                              <Badge
                                bg="yellow.50"
                                color="yellow.800"
                                border="1px solid"
                                borderColor="yellow.300"
                                px={2}
                                py={0.5}
                                borderRadius="full"
                                fontSize="10px"
                                fontWeight="800"
                              >
                                <HStack spacing={1}>
                                  <Box w="5px" h="5px" borderRadius="full" bg="yellow.500" />
                                  <Text as="span">AUSENTE</Text>
                                </HStack>
                              </Badge>
                            )}
                            {isOffline && (
                              <Badge
                                bg="gray.100"
                                color="gray.500"
                                border="1px solid"
                                borderColor="gray.200"
                                px={2}
                                py={0.5}
                                borderRadius="full"
                                fontSize="10px"
                                fontWeight="700"
                              >
                                DESCONECTADO
                              </Badge>
                            )}
                          </Box>
                        </Flex>

                        {/* Info Grid: Página Actual + Dispositivo + Sesión */}
                        <VStack align="stretch" spacing={2} fontSize="xs" bg="gray.50" p={2.5} borderRadius="lg" mb={3}>
                          {/* Página Actual */}
                          <Flex align="center" justify="space-between" gap={2}>
                            <HStack spacing={1.5} color="gray.500" minW={0} flex={1}>
                              <Box color="green.600" flexShrink={0}>
                                <Compass size={13} />
                              </Box>
                              <Text fontWeight="700" color="gray.800" noOfLines={1} fontSize="xs">
                                {!isOffline && u.currentPage && u.currentPage !== "-"
                                  ? translateRoute(u.currentPage)
                                  : "Sin sesión activa"}
                              </Text>
                            </HStack>
                            {!isOffline && u.currentPage && u.currentPage !== "-" && (
                              <Text fontSize="10px" color="gray.400" fontFamily="mono" flexShrink={0}>
                                {u.currentPage}
                              </Text>
                            )}
                          </Flex>

                          <Divider borderColor="gray.200" />

                          {/* Fila secundaria: Dispositivo y Duración */}
                          <Flex justify="space-between" align="center" gap={2} fontSize="11px">
                            {/* Dispositivo */}
                            <HStack spacing={1.5} color={!isOffline ? "gray.600" : "gray.400"} minW={0}>
                              <Box color={!isOffline ? "gray.500" : "gray.400"} flexShrink={0}>
                                {getDeviceIcon(u.device?.type)}
                              </Box>
                              <Text color={!isOffline ? "gray.700" : "gray.500"} fontWeight="600" noOfLines={1}>
                                {u.device && u.device.browser && u.device.browser !== "-"
                                  ? `${u.device.browser} · ${u.device.os}`
                                  : "—"}
                              </Text>
                            </HStack>

                            {/* Tiempo conectado / desconectado */}
                            {!isOffline && u.connectedAt ? (
                              <Tag size="sm" variant="subtle" colorScheme="blue" borderRadius="md" px={2} py={0.5} fontSize="10px" fontWeight="700">
                                <TagLabel>{formatSessionDuration(u.connectedAt)} activo</TagLabel>
                              </Tag>
                            ) : isOffline && u.disconnectedAt ? (
                              <Tag size="sm" variant="subtle" colorScheme="gray" borderRadius="md" px={2} py={0.5} fontSize="10px" fontWeight="700">
                                <TagLabel>{formatDisconnectionDuration(u.disconnectedAt)}</TagLabel>
                              </Tag>
                            ) : null}
                          </Flex>

                          {/* Fila terciaria: Última Actividad */}
                          <Flex justify="space-between" align="center" fontSize="11px" color="gray.500">
                            <Text>Última interacción:</Text>
                            {isActNow ? (
                              <Badge bg="green.100" color="green.800" px={2} py={0.5} borderRadius="md" fontSize="10px" fontWeight="800">
                                ⚡ Ahora
                              </Badge>
                            ) : (
                              <Text fontWeight="600" color={!isOffline ? "gray.800" : "gray.400"}>
                                {relativeAct}
                              </Text>
                            )}
                          </Flex>
                        </VStack>

                        {/* Botón Ver Detalle */}
                        <Button
                          size="sm"
                          w="full"
                          colorScheme="green"
                          variant="outline"
                          leftIcon={<Eye size={14} />}
                          onClick={() => handleOpenDetail(u)}
                          borderRadius="lg"
                          fontWeight="700"
                          fontSize="xs"
                          h="34px"
                          _hover={{ bg: "green.600", color: "white", borderColor: "green.600" }}
                        >
                          Ver Detalles Completos
                        </Button>
                      </Box>
                    );
                  })}
                </VStack>

                {/* ─── VISTA ESCRITORIO (>= 768px): TABLA DE USUARIOS Y ACTIVIDAD (DISEÑO OFICIAL) ─── */}
                <Box display={{ base: "none", md: "block" }} w="full" overflow="hidden">
                  <Table variant="simple" size="sm" sx={{ tableLayout: "fixed" }} w="full">
                    <Thead bg="gray.50" borderBottom="1px solid" borderColor="gray.200">
                      <Tr>
                        <Th w="26%" color="gray.600" fontSize="11px" fontWeight="700" textTransform="none" letterSpacing="normal" py={3.5} px={4}>
                          Usuario
                        </Th>
                        <Th w="24%" color="gray.600" fontSize="11px" fontWeight="700" textTransform="none" letterSpacing="normal" py={3.5} px={3}>
                          Dispositivo
                        </Th>
                        <Th w="32%" color="gray.600" fontSize="11px" fontWeight="700" textTransform="none" letterSpacing="normal" py={3.5} px={3}>
                          Página (actual / última)
                        </Th>
                        <Th w="18%" color="gray.600" fontSize="11px" fontWeight="700" textTransform="none" letterSpacing="normal" py={3.5} px={3}>
                          Actividad
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredUsers.map((u) => {
                        const isOnline = u.status === "ONLINE";
                        const isIdle = u.status === "IDLE";
                        const isOffline = u.status === "OFFLINE";

                        const relativeAct = formatRelativeActivity(u.lastActivity);

                        // Dispositivo y OS
                        const hasDevice = Boolean(u.device && u.device.browser && u.device.browser !== "-");
                        const browserName = hasDevice
                          ? (u.device.browser.includes("Chrome") ? u.device.browser : `${u.device.type === "Mac" ? "Mac" : "PC"} - ${u.device.browser}`)
                          : "—";
                        const osName = hasDevice ? (u.device.os || (u.device.type === "Mac" ? "macOS" : "Windows")) : "";

                        // Página actual / última
                        const displayPageTitle = (!isOffline && u.currentPage && u.currentPage !== "-")
                          ? translateRoute(u.currentPage)
                          : (u.lastPage ? translateRoute(u.lastPage) : "Inicio");
                        const displaySubtext = "Autopartes";

                        return (
                          <Tr
                            key={u.userId}
                            onClick={() => handleOpenDetail(u)}
                            cursor="pointer"
                            transition="background 0.15s ease"
                            _hover={{ bg: "gray.50" }}
                            borderBottom="1px solid"
                            borderColor="gray.100"
                          >
                            {/* 1. Usuario */}
                            <Td py={3} px={4}>
                              <HStack spacing={3} minW={0}>
                                <Box position="relative">
                                  <Avatar
                                    size="sm"
                                    name={u.name || u.username}
                                    bg={isOnline ? "green.600" : isIdle ? "yellow.500" : "gray.300"}
                                    color="white"
                                    fontWeight="bold"
                                    fontSize="xs"
                                    w="32px"
                                    h="32px"
                                  />
                                  {/* Dot status indicator */}
                                  <Box
                                    position="absolute"
                                    bottom="-1px"
                                    right="-1px"
                                    w="8px"
                                    h="8px"
                                    borderRadius="full"
                                    bg={isOnline ? "#10b981" : isIdle ? "#eab308" : "#9ca3af"}
                                    border="1.5px solid white"
                                  />
                                </Box>
                                <Text fontWeight="700" color="gray.900" fontSize="13px" noOfLines={1}>
                                  {u.name || u.username}
                                </Text>
                              </HStack>
                            </Td>

                            {/* 2. Dispositivo */}
                            <Td py={3} px={3}>
                              {hasDevice ? (
                                <HStack spacing={2.5} align="flex-start">
                                  <Box color="gray.400" pt={0.5}>
                                    <Monitor size={15} />
                                  </Box>
                                  <VStack align="flex-start" spacing={0} minW={0}>
                                    <Text fontSize="12.5px" fontWeight="600" color="gray.700" noOfLines={1}>
                                      {browserName}
                                    </Text>
                                    {osName && (
                                      <Text fontSize="11px" color="gray.400" noOfLines={1}>
                                        {osName}
                                      </Text>
                                    )}
                                  </VStack>
                                </HStack>
                              ) : (
                                <Text fontSize="13px" color="gray.400">
                                  —
                                </Text>
                              )}
                            </Td>

                            {/* 3. Página (actual / última) */}
                            <Td py={3} px={3}>
                              <VStack align="flex-start" spacing={0} minW={0}>
                                <Text fontSize="13px" fontWeight="600" color="gray.800" noOfLines={1}>
                                  {displayPageTitle}
                                </Text>
                                <HStack spacing={1} color="gray.400" fontSize="11px">
                                  <FileText size={11} />
                                  <Text noOfLines={1}>{displaySubtext}</Text>
                                </HStack>
                              </VStack>
                            </Td>

                            {/* 4. Actividad */}
                            <Td py={3} px={3}>
                              {isOnline ? (
                                <Text fontSize="13px" fontWeight="600" color="#059669">
                                  Activo ahora
                                </Text>
                              ) : isIdle ? (
                                <Text fontSize="12.5px" fontWeight="500" color="#d97706">
                                  Ausente · {relativeAct}
                                </Text>
                              ) : (
                                <Text fontSize="12.5px" color="gray.400" fontWeight="400">
                                  {u.disconnectedAt
                                    ? `Desconectado · ${formatDisconnectionDuration(u.disconnectedAt)}`
                                    : "Desconectado"}
                                </Text>
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              </>
            )}
          </Box>
        </VStack>
      </Box>

      {/* ─── MODAL DE SESIONES Y RECORRIDO (DISEÑO OFICIAL) ────────────────── */}
      <UserSessionDetailModal
        isOpen={isOpen}
        onClose={onClose}
        user={activeSelectedUser}
      />
    </Box>
  );
}

export default OnlineUsersPage;
