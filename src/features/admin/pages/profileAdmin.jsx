import React, { useState, useMemo } from "react";
import {
  Box,
  Heading,
  Input,
  Button,
  Spinner,
  VStack,
  Flex,
  useToast,
  Center,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  IconButton,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Text,
  HStack,
  Stack,
  useBreakpointValue,
  Card,
  CardBody,
  Select,
  Avatar,
  SimpleGrid,
  Tooltip
} from "@chakra-ui/react";
import {
  Search,
  Edit3,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Users,
  ShieldCheck,
  X,
  KeyRound,
  Mail,
  Hash,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { useGetAllUsersAdmin } from "../hooks/queries/authAdminQueries";
import { useAuthAdminMutations } from "../hooks/mutations/authAdminMutations";
import { useGetServices } from "../../auth/hooks/queries/authQueries";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import PermissionsTreeView from "../components/PermissionsTreeView";
import UserBasicFields from "../components/UserBasicFields";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Componente de tarjeta para vista móvil
function UserMobileCard({ user, onEdit }) {
  const permCount = Array.isArray(user.permittedServices) ? user.permittedServices.length : 0;

  return (
    <Card
      bg="white"
      borderRadius="xl"
      border="1px solid"
      borderColor={user.active ? "gray.200" : "red.200"}
      boxShadow="xs"
      _hover={{ borderColor: "green.400", boxShadow: "sm" }}
      transition="all 0.15s ease-in-out"
      p={3.5}
    >
      <VStack align="stretch" spacing={2.5}>
        <Flex justify="space-between" align="center">
          <HStack spacing={2.5}>
            <Avatar
              size="sm"
              name={user.username}
              bg={user.active ? "#126C36" : "gray.400"}
              color="white"
              fontWeight="800"
            />
            <Box>
              <Text fontWeight="800" fontSize="sm" color="gray.900">
                {user.username}
              </Text>
              <Text fontSize="11px" color="gray.500">
                {user.email}
              </Text>
            </Box>
          </HStack>
          <Badge
            bg={user.active ? "#dcfce7" : "#fee2e2"}
            color={user.active ? "#15803d" : "#991b1b"}
            border="1px solid"
            borderColor={user.active ? "#bbf7d0" : "#fecaca"}
            px={2.5}
            py={0.5}
            borderRadius="full"
            fontSize="10px"
            fontWeight="900"
          >
            {user.active ? "ACTIVO" : "INACTIVO"}
          </Badge>
        </Flex>

        <Divider borderColor="gray.100" />

        <Flex justify="space-between" align="center" fontSize="xs">
          <HStack spacing={1.5} color="gray.600">
            <Hash className="w-3.5 h-3.5 text-gray-400" />
            <Text fontWeight="600">
              Cód. SAP: {user.salesEmployeeCode ? `#${user.salesEmployeeCode}` : "—"}
            </Text>
          </HStack>
          <Badge colorScheme="blue" variant="subtle" fontSize="10px" px={2} borderRadius="md">
            {permCount} permisos
          </Badge>
        </Flex>

        <Button
          leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          colorScheme="green"
          bg="#126C36"
          _hover={{ bg: "#0e572b" }}
          size="sm"
          w="full"
          borderRadius="lg"
          fontWeight="800"
          onClick={() => onEdit(user)}
          mt={1}
        >
          Editar Perfil y Permisos
        </Button>
      </VStack>
    </Card>
  );
}

// Componente de paginación de alta fidelidad
function ModernPagination({ currentPage, totalPages, onPageChange, pageSize, onPageSizeChange }) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = isMobile ? 3 : 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= Math.min(maxVisible, totalPages); i++) pages.push(i);
        if (totalPages > maxVisible) {
          pages.push("...");
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - (maxVisible - 2); i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <Stack
      direction={{ base: "column", sm: "row" }}
      spacing={3}
      justify="space-between"
      align="center"
      mt={5}
      pt={3}
      borderTop="1px solid"
      borderColor="gray.200"
    >
      <HStack spacing={2} fontSize="xs" color="gray.600">
        <Text>Mostrar</Text>
        <Select
          size="xs"
          w="70px"
          borderRadius="md"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          bg="white"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </Select>
        <Text>por página</Text>
      </HStack>

      <HStack spacing={1.5}>
        <IconButton
          icon={<ChevronLeft className="w-4 h-4" />}
          size="xs"
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
          isDisabled={currentPage === 1}
          aria-label="Página anterior"
          borderRadius="md"
        />

        {getPageNumbers().map((page, index) =>
          page === "..." ? (
            <Text key={`ellipsis-${index}`} px={1.5} fontSize="xs" color="gray.400">
              ...
            </Text>
          ) : (
            <Button
              key={page}
              size="xs"
              onClick={() => onPageChange(page)}
              bg={currentPage === page ? "#126C36" : "white"}
              color={currentPage === page ? "white" : "gray.700"}
              border="1px solid"
              borderColor={currentPage === page ? "#126C36" : "gray.200"}
              _hover={{ bg: currentPage === page ? "#0e572b" : "gray.50" }}
              fontWeight={currentPage === page ? "800" : "600"}
              borderRadius="md"
              minW="28px"
            >
              {page}
            </Button>
          )
        )}

        <IconButton
          icon={<ChevronRight className="w-4 h-4" />}
          size="xs"
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
          isDisabled={currentPage === totalPages || totalPages === 0}
          aria-label="Página siguiente"
          borderRadius="md"
        />
      </HStack>

      <Text fontSize="xs" color="gray.500" fontWeight="600">
        Página {currentPage} de {totalPages || 1}
      </Text>
    </Stack>
  );
}

export function ProfileAdmin() {
  const { data: users, isLoading, refetch: refetchUsers } = useGetAllUsersAdmin();
  const { data: services, isLoading: isLoadingServices } = useGetServices();
  const { updateProfileAdmin } = useAuthAdminMutations();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const toast = useToast();
  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });
  const isMobile = useBreakpointValue({ base: true, md: false });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    userId: "",
    username: "",
    email: "",
    salesEmployeeCode: "",
    newPassword: "",
    permittedServices: [],
    active: true,
  });
  const [errors, setErrors] = useState({});

  // Paginación y Filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("username_asc");

  // Métricas del sistema
  const stats = useMemo(() => {
    if (!users || !Array.isArray(users)) return { total: 0, active: 0, inactive: 0, servicesTotal: 0 };
    const total = users.length;
    const active = users.filter((u) => u.active).length;
    const inactive = total - active;
    const servicesTotal = Array.isArray(services) ? services.length : 0;
    return { total, active, inactive, servicesTotal };
  }, [users, services]);

  const filteredUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];

    let result = users;

    // Filtro de búsqueda
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((u) =>
        `${u.username || ""} ${u.email || ""} ${u.salesEmployeeCode || ""}`.toLowerCase().includes(q)
      );
    }

    // Filtro de estado
    if (statusFilter === "active") {
      result = result.filter((u) => u.active === true);
    } else if (statusFilter === "inactive") {
      result = result.filter((u) => u.active === false);
    }

    // Ordenamiento
    result = [...result];
    if (sortBy === "username_asc") {
      result.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
    } else if (sortBy === "username_desc") {
      result.sort((a, b) => (b.username || "").localeCompare(a.username || ""));
    } else if (sortBy === "email_asc") {
      result.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
    } else if (sortBy === "email_desc") {
      result.sort((a, b) => (b.email || "").localeCompare(a.email || ""));
    } else if (sortBy === "active_first") {
      result.sort((a, b) => Number(b.active) - Number(a.active));
    } else if (sortBy === "inactive_first") {
      result.sort((a, b) => Number(a.active) - Number(b.active));
    }

    return result;
  }, [users, searchTerm, statusFilter, sortBy]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, currentPage, pageSize]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Helper robusto para normalizar permisos a lista de IDs numéricos
  const extractServiceIds = (userPermissionsList, allServicesList = []) => {
    if (!Array.isArray(userPermissionsList)) return [];

    const serviceKeyToId = new Map();
    (allServicesList || []).forEach((s) => {
      serviceKeyToId.set(`${s.method}:${s.path}`.toUpperCase(), s.id);
      serviceKeyToId.set(`${s.method} ${s.path}`.toUpperCase(), s.id);
      if (s.name) serviceKeyToId.set(s.name.toUpperCase(), s.id);
    });

    const ids = new Set();

    userPermissionsList.forEach((item) => {
      if (typeof item === "number") {
        ids.add(item);
      } else if (typeof item === "string") {
        const num = Number(item);
        if (!isNaN(num) && num > 0) {
          ids.add(num);
        } else {
          const upper = item.toUpperCase();
          if (serviceKeyToId.has(upper)) {
            ids.add(serviceKeyToId.get(upper));
          }
        }
      } else if (typeof item === "object" && item !== null) {
        if (item.service && typeof item.service.id === "number") {
          ids.add(item.service.id);
        } else if (typeof item.serviceId === "number") {
          ids.add(item.serviceId);
        } else if (typeof item.id === "number") {
          ids.add(item.id);
        } else if (item.service && item.service.method && item.service.path) {
          const key = `${item.service.method}:${item.service.path}`.toUpperCase();
          if (serviceKeyToId.has(key)) {
            ids.add(serviceKeyToId.get(key));
          }
        }
      }
    });

    return Array.from(ids);
  };

  const handleOpenModal = (user) => {
    setSelectedUser(user);

    const userPermissions = extractServiceIds(user.permittedServices, services || []);

    setFormData({
      userId: user.id,
      username: user.username || "",
      email: user.email || "",
      salesEmployeeCode:
        user.salesEmployeeCode === null || user.salesEmployeeCode === undefined
          ? null
          : Number(user.salesEmployeeCode),
      newPassword: "",
      permittedServices: userPermissions,
      active: Boolean(user.active),
    });
    setErrors({});
    onOpen();
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setFormData({
      userId: "",
      username: "",
      email: "",
      salesEmployeeCode: "",
      newPassword: "",
      permittedServices: [],
      active: true,
    });
    setErrors({});
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "salesEmployeeCode") {
      setFormData((prev) => ({
        ...prev,
        salesEmployeeCode: value === "" ? null : Number(value),
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = "El usuario es obligatorio";
    if (!formData.email) newErrors.email = "El correo es obligatorio";
    if (formData.email && !/^[^@]+@[^@]+\.[^@]+$/.test(formData.email)) {
      newErrors.email = "Correo inválido";
    }
    return newErrors;
  };

  const handleSubmit = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    // formData.permittedServices ya contiene IDs numéricos gracias al árbol de permisos
    // Solo aseguramos que sean números enteros limpios y únicos
    const cleanPermissions = [...new Set(
      (formData.permittedServices || [])
        .map((id) => Number(id))
        .filter((id) => !isNaN(id) && id > 0)
    )];

    const payload = {
      ...formData,
      permittedServices: cleanPermissions,
    };

    console.log("📤 [ProfileAdmin] Enviando payload al servidor:", {
      userId: payload.userId,
      username: payload.username,
      permittedServices: payload.permittedServices,
      totalPermisos: payload.permittedServices.length,
    });

    updateProfileAdmin.mutate(payload, {
      onSuccess: (data) => {
        console.log("✅ [ProfileAdmin] Guardado exitoso:", data);
        toast({
          title: "Cambios guardados exitosamente",
          description: `El perfil y permisos de "${formData.username}" fueron actualizados.`,
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top-right",
        });
        handleCloseModal();
        if (typeof refetchUsers === "function") refetchUsers();
      },
      onError: (error) => {
        console.error("❌ [ProfileAdmin] Error al guardar:", error?.response?.status, error?.response?.data, error?.message);
        toast({
          title: "Error al guardar cambios",
          description: error?.response?.data?.message || error?.message || "Ocurrió un error al actualizar el perfil",
          status: "error",
          duration: 4000,
          isClosable: true,
          position: "top-right",
        });
      },
    });
  };

  if (isLoading || isLoadingServices) {
    return (
      <Box w="full" minH="100vh" bg="gray.50">
        <TopHeaderBanner
          title="Gestión de Usuarios"
          subtitle={`Administración de cuentas, perfiles y control de accesos • ${today.charAt(0).toUpperCase() + today.slice(1)}`}
          showBack={true}
        />
        <Center py={20}>
          <VStack spacing={3}>
            <Spinner size="xl" color="green.600" thickness="4px" />
            <Text fontSize="sm" fontWeight="600" color="gray.600">
              Cargando usuarios y servicios del sistema...
            </Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="80px">
      {/* ─── TOP HEADER BANNER ESTÁNDAR ─── */}
      <TopHeaderBanner
        title="Gestión de Usuarios"
        subtitle={`Administración de cuentas, perfiles, asignación de permisos y control de accesos • ${today.charAt(0).toUpperCase() + today.slice(1)}`}
        showBack={true}
        backTo="/dashboard"
        refreshQueries={["adminUsers", "Services"]}
        mb={6}
      />

      <Box maxW="1200px" mx="auto" px={{ base: 3, md: 6 }} mt={-6}>
        <VStack align="stretch" spacing={5}>
          {/* ─── TARJETAS DE MÉTRICAS RÁPIDAS ─── */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3.5}>
            <Card bg="white" borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <CardBody p={3.5}>
                <Flex align="center" justify="space-between">
                  <Box>
                    <Text fontSize="11px" fontWeight="800" color="gray.500" textTransform="uppercase">
                      Total Usuarios
                    </Text>
                    <Text fontSize="22px" fontWeight="900" color="gray.900" mt={0.5}>
                      {stats.total}
                    </Text>
                  </Box>
                  <Flex w="38px" h="38px" borderRadius="xl" bg="blue.50" color="blue.600" align="center" justify="center">
                    <Users className="w-5 h-5" />
                  </Flex>
                </Flex>
              </CardBody>
            </Card>

            <Card bg="white" borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <CardBody p={3.5}>
                <Flex align="center" justify="space-between">
                  <Box>
                    <Text fontSize="11px" fontWeight="800" color="gray.500" textTransform="uppercase">
                      Usuarios Activos
                    </Text>
                    <Text fontSize="22px" fontWeight="900" color="green.700" mt={0.5}>
                      {stats.active}
                    </Text>
                  </Box>
                  <Flex w="38px" h="38px" borderRadius="xl" bg="green.50" color="green.600" align="center" justify="center">
                    <UserCheck className="w-5 h-5" />
                  </Flex>
                </Flex>
              </CardBody>
            </Card>

            <Card bg="white" borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <CardBody p={3.5}>
                <Flex align="center" justify="space-between">
                  <Box>
                    <Text fontSize="11px" fontWeight="800" color="gray.500" textTransform="uppercase">
                      Inactivos
                    </Text>
                    <Text fontSize="22px" fontWeight="900" color={stats.inactive > 0 ? "red.600" : "gray.600"} mt={0.5}>
                      {stats.inactive}
                    </Text>
                  </Box>
                  <Flex w="38px" h="38px" borderRadius="xl" bg="red.50" color="red.600" align="center" justify="center">
                    <UserX className="w-5 h-5" />
                  </Flex>
                </Flex>
              </CardBody>
            </Card>

            <Card bg="white" borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <CardBody p={3.5}>
                <Flex align="center" justify="space-between">
                  <Box>
                    <Text fontSize="11px" fontWeight="800" color="gray.500" textTransform="uppercase">
                      Permisos del Sistema
                    </Text>
                    <Text fontSize="22px" fontWeight="900" color="purple.700" mt={0.5}>
                      {stats.servicesTotal}
                    </Text>
                  </Box>
                  <Flex w="38px" h="38px" borderRadius="xl" bg="purple.50" color="purple.600" align="center" justify="center">
                    <ShieldCheck className="w-5 h-5" />
                  </Flex>
                </Flex>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* ─── CONTENEDOR PRINCIPAL: BUSCADOR, FILTROS Y TABLA ─── */}
          <Box bg="white" p={{ base: 3.5, md: 6 }} borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
            {/* Barra de Filtros */}
            <Flex
              direction={{ base: "column", md: "row" }}
              justify="space-between"
              align={{ base: "stretch", md: "center" }}
              gap={3}
              mb={4}
            >
              {/* Buscador */}
              <InputGroup size="md" maxW={{ base: "100%", md: "400px" }}>
                <InputLeftElement pointerEvents="none">
                  <Search className="w-4 h-4 text-gray-400" />
                </InputLeftElement>
                <Input
                  placeholder="Buscar por usuario, email o cód. SAP..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  bg="white"
                  borderRadius="xl"
                  borderColor="gray.300"
                  _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px #16a34a" }}
                  fontSize="sm"
                />
                {searchTerm && (
                  <InputRightElement>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      icon={<X className="w-3.5 h-3.5 text-gray-400" />}
                      onClick={() => setSearchTerm("")}
                      aria-label="Limpiar"
                    />
                  </InputRightElement>
                )}
              </InputGroup>

              {/* Filtros Dropdowns y Contador */}
              <HStack spacing={2.5} wrap="wrap">
                <Select
                  size="sm"
                  borderRadius="lg"
                  w="140px"
                  bg="white"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos los Estados</option>
                  <option value="active">Solo Activos</option>
                  <option value="inactive">Solo Inactivos</option>
                </Select>

                <Select
                  size="sm"
                  borderRadius="lg"
                  w="180px"
                  bg="white"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="username_asc">Usuario A → Z</option>
                  <option value="username_desc">Usuario Z → A</option>
                  <option value="email_asc">Email A → Z</option>
                  <option value="email_desc">Email Z → A</option>
                  <option value="active_first">Activos primero</option>
                  <option value="inactive_first">Inactivos primero</option>
                </Select>

                <Badge
                  bg="#eff6ff"
                  color="#1d4ed8"
                  border="1px solid #bfdbfe"
                  px={3}
                  py={1.5}
                  borderRadius="full"
                  fontSize="11px"
                  fontWeight="900"
                  letterSpacing="wider"
                >
                  {filteredUsers.length} USUARIOS
                </Badge>
              </HStack>
            </Flex>

            {/* ─── VISTA RESPONSIVE: MÓVIL (CARDS) O ESCRITORIO (TABLA) ─── */}
            {isMobile ? (
              <VStack spacing={3} align="stretch">
                {paginatedUsers.length === 0 ? (
                  <Center py={10}>
                    <VStack spacing={2}>
                      <Users className="w-10 h-10 text-gray-300" />
                      <Text fontWeight="700" color="gray.600">
                        No se encontraron usuarios
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        Prueba con otros términos de búsqueda o filtros.
                      </Text>
                    </VStack>
                  </Center>
                ) : (
                  paginatedUsers.map((user) => (
                    <UserMobileCard key={user.id} user={user} onEdit={handleOpenModal} />
                  ))
                )}
              </VStack>
            ) : (
              <TableContainer borderRadius="xl" border="1px solid" borderColor="gray.200" overflowX="auto">
                <Table size="sm" variant="simple">
                  <Thead bg="#f8fafc" borderBottom="2px solid #0f172a">
                    <Tr>
                      <Th py={3} px={3} fontSize="11px" color="gray.900" fontWeight="900">
                        USUARIO
                      </Th>
                      <Th py={3} px={3} fontSize="11px" color="gray.900" fontWeight="900">
                        EMAIL
                      </Th>
                      <Th py={3} px={3} fontSize="11px" color="gray.900" fontWeight="900">
                        CÓD. VENDEDOR
                      </Th>
                      <Th py={3} px={3} fontSize="11px" color="gray.900" fontWeight="900" textAlign="center">
                        PERMISOS
                      </Th>
                      <Th py={3} px={3} fontSize="11px" color="gray.900" fontWeight="900" textAlign="center">
                        ESTADO
                      </Th>
                      <Th py={3} px={3} fontSize="11px" color="gray.900" fontWeight="900" textAlign="right">
                        ACCIONES
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {paginatedUsers.length === 0 ? (
                      <Tr>
                        <Td colSpan={6} textAlign="center" py={10}>
                          <VStack spacing={2}>
                            <Users className="w-10 h-10 text-gray-300" />
                            <Text fontWeight="700" color="gray.600">
                              No se encontraron usuarios registrados
                            </Text>
                            <Text fontSize="xs" color="gray.400">
                              Prueba modificando los filtros de búsqueda.
                            </Text>
                          </VStack>
                        </Td>
                      </Tr>
                    ) : (
                      paginatedUsers.map((user) => {
                        const permCount = extractServiceIds(user.permittedServices, services || []).length;

                        return (
                          <Tr key={user.id} _hover={{ bg: "gray.50" }} transition="background 0.15s">
                            <Td px={3} py={2}>
                              <HStack spacing={2.5}>
                                <Avatar
                                  size="xs"
                                  name={user.username}
                                  bg={user.active ? "#126C36" : "gray.400"}
                                  color="white"
                                  fontWeight="800"
                                />
                                <Box>
                                  <Text fontWeight="800" fontSize="12.5px" color="gray.900">
                                    {user.username}
                                  </Text>
                                  {user.username?.toLowerCase() === "enrique" && (
                                    <Badge colorScheme="purple" fontSize="9px" px={1.5} borderRadius="sm">
                                      Admin
                                    </Badge>
                                  )}
                                </Box>
                              </HStack>
                            </Td>

                            <Td px={3} py={2} fontSize="12px" color="gray.600">
                              {user.email || "—"}
                            </Td>

                            <Td px={3} py={2} fontSize="12px" fontFamily="mono" fontWeight="600" color="gray.700">
                              {user.salesEmployeeCode ? (
                                <Badge bg="gray.100" color="gray.800" fontSize="10px" px={2} borderRadius="md">
                                  #{user.salesEmployeeCode}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </Td>

                            <Td px={3} py={2} textAlign="center">
                              <Badge
                                bg="#eff6ff"
                                color="#1e40af"
                                border="1px solid #bfdbfe"
                                px={2}
                                py={0.5}
                                borderRadius="full"
                                fontSize="10px"
                                fontWeight="800"
                              >
                                {permCount} asignados
                              </Badge>
                            </Td>

                            <Td px={3} py={2} textAlign="center">
                              <Badge
                                bg={user.active ? "#dcfce7" : "#fee2e2"}
                                color={user.active ? "#15803d" : "#991b1b"}
                                border="1px solid"
                                borderColor={user.active ? "#bbf7d0" : "#fecaca"}
                                px={2.5}
                                py={0.5}
                                borderRadius="full"
                                fontSize="10.5px"
                                fontWeight="900"
                              >
                                {user.active ? "ACTIVO" : "INACTIVO"}
                              </Badge>
                            </Td>

                            <Td px={3} py={2} textAlign="right">
                              <Button
                                size="xs"
                                variant="outline"
                                borderColor="#126C36"
                                color="#126C36"
                                _hover={{ bg: "#f0fdf4" }}
                                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                                onClick={() => handleOpenModal(user)}
                                fontWeight="800"
                                borderRadius="lg"
                                px={3}
                              >
                                Editar
                              </Button>
                            </Td>
                          </Tr>
                        );
                      })
                    )}
                  </Tbody>
                </Table>
              </TableContainer>
            )}

            {/* Paginación */}
            {filteredUsers.length > 0 && (
              <ModernPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </Box>
        </VStack>
      </Box>

      {/* ─── MODAL PREMIUM DE EDICIÓN DE USUARIO Y ÁRBOL DE PERMISOS ─── */}
      <Modal
        isOpen={isOpen}
        onClose={handleCloseModal}
        size={{ base: "full", md: "4xl" }}
        scrollBehavior="inside"
        isCentered
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent borderRadius={{ base: 0, md: "2xl" }} boxShadow="2xl" maxH="90vh" overflow="hidden">
          {/* Header del Modal */}
          <ModalHeader bg="#f8fafc" borderBottom="1px solid" borderColor="gray.200" py={4} px={6}>
            <Flex justify="space-between" align="center">
              <HStack spacing={3}>
                <Avatar
                  size="md"
                  name={formData.username}
                  bg="#126C36"
                  color="white"
                  fontWeight="900"
                />
                <Box>
                  <HStack spacing={2}>
                    <Heading size="sm" color="gray.900" fontWeight="900">
                      Editar Usuario: {formData.username || "Usuario"}
                    </Heading>
                    <Badge
                      bg={formData.active ? "#dcfce7" : "#fee2e2"}
                      color={formData.active ? "#15803d" : "#991b1b"}
                      border="1px solid"
                      borderColor={formData.active ? "#bbf7d0" : "#fecaca"}
                      px={2}
                      py={0.2}
                      borderRadius="full"
                      fontSize="10px"
                      fontWeight="900"
                    >
                      {formData.active ? "ACTIVO" : "INACTIVO"}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.500" mt={0.5}>
                    ID #{formData.userId} • {formData.email}
                  </Text>
                </Box>
              </HStack>
              <ModalCloseButton position="static" />
            </Flex>
          </ModalHeader>

          {/* Cuerpo del Modal */}
          <ModalBody py={5} px={{ base: 4, md: 6 }}>
            <VStack spacing={6} align="stretch">
              {/* 1. Datos Básicos del Usuario */}
              <Box bg="gray.50" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                <Text fontSize="xs" fontWeight="900" color="gray.700" textTransform="uppercase" letterSpacing="wider" mb={3}>
                  1. Información de Cuenta y Acceso
                </Text>
                <UserBasicFields formData={formData} errors={errors} onChange={handleChange} />
              </Box>

              {/* 2. Árbol de Permisos y Servicios */}
              <Box>
                <Text fontSize="xs" fontWeight="900" color="gray.700" textTransform="uppercase" letterSpacing="wider" mb={2}>
                  2. Árbol Jerárquico de Permisos y Módulos
                </Text>
                <PermissionsTreeView
                  services={services || []}
                  permittedServices={formData.permittedServices || []}
                  onChange={(newPermitted) => setFormData((prev) => ({ ...prev, permittedServices: newPermitted }))}
                />
              </Box>
            </VStack>
          </ModalBody>

          {/* Footer del Modal */}
          <ModalFooter bg="#f8fafc" borderTop="1px solid" borderColor="gray.200" py={3.5} px={6}>
            <HStack spacing={3} w="full" justify="flex-end">
              <Button variant="outline" onClick={handleCloseModal} size="md" borderRadius="xl" fontWeight="700">
                Cancelar
              </Button>
              <Button
                bg="#126C36"
                color="white"
                _hover={{ bg: "#0e572b" }}
                _active={{ bg: "#0a3f1f" }}
                size="md"
                borderRadius="xl"
                fontWeight="800"
                onClick={handleSubmit}
                isLoading={updateProfileAdmin.isPending || updateProfileAdmin.isLoading}
                loadingText="Guardando cambios..."
                boxShadow="0 4px 14px rgba(18, 108, 54, 0.3)"
              >
                💾 Guardar Cambios
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default ProfileAdmin;