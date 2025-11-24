import { useState, useMemo } from "react";
import {
  Box,
  Heading,
  Input,
  Button,
  Spinner,
  VStack,
  Flex,
  useColorModeValue,
  useToast,
  Center,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  InputGroup,
  InputLeftElement,
  Text,
  HStack,
  Stack,
  useBreakpointValue,
  Card,
  CardBody,
  Select,
} from "@chakra-ui/react";
import { SearchIcon, EditIcon, ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { useGetAllUsersAdmin } from "../hooks/queries/authAdminQueries";
import { useAuthAdminMutations } from "../hooks/mutations/authAdminMutations";
import { useGetServices } from "../../auth/hooks/queries/authQueries";
import { BackButton } from "../../../components/BackButton";
import PermissionsSection from "../components/PermissionsSection";
import UserBasicFields from "../components/UserBasicFields";
import { groupServicesByCategory } from "../../../shared/utils/serviceHelpers";

// Componente de tarjeta para móvil
function UserCard({ user, onEdit, hoverBg }) {
  return (
    <Card
      cursor="pointer"
      _hover={{ bg: hoverBg, transform: "translateY(-2px)", boxShadow: "md" }}
      transition="all 0.2s"
      onClick={() => onEdit(user)}
    >
      <CardBody>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <Text fontWeight="bold" fontSize="lg">{user.username}</Text>
            <Badge colorScheme={user.active ? "green" : "red"}>
              {user.active ? "Activo" : "Inactivo"}
            </Badge>
          </HStack>
          
          <Text fontSize="sm" color="gray.600">{user.email}</Text>
          
          <Button
            leftIcon={<EditIcon />}
            colorScheme="green"
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(user);
            }}
          >
            Editar
          </Button>
        </VStack>
      </CardBody>
    </Card>
  );
}

// Componente de paginación
function Pagination({ currentPage, totalPages, onPageChange, pageSize, onPageSizeChange }) {
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = isMobile ? 3 : 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= Math.min(maxVisible, totalPages); i++) {
          pages.push(i);
        }
        if (totalPages > maxVisible) {
          pages.push('...');
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - (maxVisible - 2); i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <Stack 
      direction={{ base: "column", md: "row" }}
      spacing={4}
      justify="space-between"
      align="center"
      mt={6}
    >
      <HStack spacing={2}>
        <Text fontSize="sm" color="gray.600">Mostrar</Text>
        <Select 
          size="sm" 
          w="70px" 
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </Select>
        <Text fontSize="sm" color="gray.600">por página</Text>
      </HStack>

      <HStack spacing={2}>
        <IconButton
          icon={<ChevronLeftIcon />}
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          isDisabled={currentPage === 1}
          aria-label="Página anterior"
        />
        
        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <Text key={`ellipsis-${index}`} px={2}>...</Text>
          ) : (
            <Button
              key={page}
              size="sm"
              onClick={() => onPageChange(page)}
              colorScheme={currentPage === page ? "green" : "gray"}
              variant={currentPage === page ? "solid" : "ghost"}
            >
              {page}
            </Button>
          )
        ))}
        
        <IconButton
          icon={<ChevronRightIcon />}
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          isDisabled={currentPage === totalPages}
          aria-label="Página siguiente"
        />
      </HStack>

      <Text fontSize="sm" color="gray.600">
        Página {currentPage} de {totalPages}
      </Text>
    </Stack>
  );
}

export function ProfileAdmin() {
  const { data: users, isLoading } = useGetAllUsersAdmin();
  const { data: services, isLoading: isLoadingServices } = useGetServices();
  const { updateProfileAdmin } = useAuthAdminMutations();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const toast = useToast();
  const pageBg = useColorModeValue("gray.50", "gray.900");
  const tableBg = useColorModeValue("white", "gray.800");
  const hoverBg = useColorModeValue("gray.50", "gray.700");

  // Responsive: mostrar tabla o cards
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

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const groupedServices = useMemo(() => {
    return groupServicesByCategory(services);
  }, [services]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users
      .filter(u =>
        `${u.username} ${u.email} ${u.salesEmployeeCode || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, currentPage, pageSize]);

  // Resetear a página 1 cuando cambia el término de búsqueda
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleOpenModal = (user) => {
    setSelectedUser(user);
    
    let userPermissions = user.permittedServices || [];
    
    if (services && userPermissions.length > 0 && typeof userPermissions[0] === 'string') {
      userPermissions = services
        .filter(service => {
          const serviceString = `${service.method}:${service.path}`;
          return userPermissions.includes(serviceString);
        })
        .map(service => service.id);
    }
    
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
      active: user.active,
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
    setFormData(prev => ({
      ...prev,
      salesEmployeeCode: value === "" ? null : Number(value)
    }));
    return;
  }

  setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleServiceChange = (serviceId, checked) => {
    const currentServices = formData.permittedServices || [];
    const updatedServices = checked
      ? [...currentServices, serviceId]
      : currentServices.filter((id) => id !== serviceId);
    
    setFormData(prev => ({ ...prev, permittedServices: updatedServices }));
  };

  const handleCategoryChange = (categoryServices, checked) => {
    const serviceIds = categoryServices.map(service => service.id);
    const currentServices = formData.permittedServices || [];
    
    let updatedServices;
    if (checked) {
      updatedServices = [...new Set([...currentServices, ...serviceIds])];
    } else {
      updatedServices = currentServices.filter(id => !serviceIds.includes(id));
    }
    
    setFormData(prev => ({ ...prev, permittedServices: updatedServices }));
  };

  const isCategoryFullySelected = (categoryServices) => {
    const serviceIds = categoryServices.map(service => service.id);
    const permittedServices = formData.permittedServices || [];
    return serviceIds.every(id => permittedServices.includes(id));
  };

  const isCategoryPartiallySelected = (categoryServices) => {
    const serviceIds = categoryServices.map(service => service.id);
    const permittedServices = formData.permittedServices || [];
    return serviceIds.some(id => permittedServices.includes(id)) && !isCategoryFullySelected(categoryServices);
  };

  const handleSubmit = () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setErrors({});
    
    updateProfileAdmin.mutate(formData, {
      onSuccess: () => {
        toast({
          title: "Cambios guardados",
          description: "El perfil se actualizó correctamente",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        handleCloseModal();
      },
      onError: (error) => {
        toast({
          title: "Error al guardar",
          description: error?.message || "Ocurrió un error al actualizar el perfil",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    });
  };

  if (isLoading || isLoadingServices) {
    return (
      <Center height="100vh" bg={pageBg}>
        <Spinner size="xl" color="green.500" thickness="4px" />
      </Center>
    );
  }

  return (
    <Flex direction="column" h="100vh" w="full" bg={pageBg}>
      {/* Header */}
      <Flex
        bg="green.800"
        color="white"
        align="center"
        p={4}
        borderBottomRadius="2xl"
        justify="center"
        position="relative"
        boxShadow="lg"
      >
        <Box position="absolute" left="4">
          <BackButton color="white" />
        </Box>
        <Heading size={{ base: "sm", md: "md" }}>👤 Gestión de Usuarios</Heading>
      </Flex>

      {/* Contenido Principal */}
      <Box flex="1" p={{ base: 3, md: 6 }} overflowY="auto">
        <Box bg={tableBg} borderRadius="xl" boxShadow="lg" p={{ base: 4, md: 6 }}>
          {/* Buscador */}
          <Stack 
            direction={{ base: "column", md: "row" }}
            mb={6} 
            spacing={4}
            justify="space-between"
            align={{ base: "stretch", md: "center" }}
          >
            <InputGroup maxW={{ base: "100%", md: "400px" }}>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Buscar usuario..."
                value={searchTerm}
                onChange={handleSearchChange}
                focusBorderColor="green.500"
                bg={useColorModeValue("white", "gray.700")}
              />
            </InputGroup>
            <Badge colorScheme="blue" fontSize="md" px={3} py={2} alignSelf={{ base: "flex-start", md: "center" }}>
              {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}
            </Badge>
          </Stack>

          {/* Vista Responsive */}
          {isMobile ? (
            // Vista Mobile: Cards
            <VStack spacing={3} align="stretch">
              {paginatedUsers.length === 0 ? (
                <Center py={8}>
                  <VStack spacing={2}>
                    <Text fontSize="2xl">🔍</Text>
                    <Text color="gray.500">No se encontraron usuarios</Text>
                  </VStack>
                </Center>
              ) : (
                paginatedUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onEdit={handleOpenModal}
                    hoverBg={hoverBg}
                  />
                ))
              )}
            </VStack>
          ) : (
            // Vista Desktop: Tabla
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Usuario</Th>
                    <Th>Email</Th>
                    <Th>Estado</Th>
                    <Th textAlign="center">Acciones</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {paginatedUsers.length === 0 ? (
                    <Tr>
                      <Td colSpan={4} textAlign="center" py={8}>
                        <VStack spacing={2}>
                          <Text fontSize="2xl">🔍</Text>
                          <Text color="gray.500">No se encontraron usuarios</Text>
                        </VStack>
                      </Td>
                    </Tr>
                  ) : (
                    paginatedUsers.map((user) => (
                      <Tr
                        key={user.id}
                        _hover={{ bg: hoverBg }}
                        transition="background 0.2s"
                      >
                        <Td>
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold">{user.username}</Text>
                          </VStack>
                        </Td>
                        <Td>{user.email}</Td>
                        <Td>
                          <Badge colorScheme={user.active ? "green" : "red"}>
                            {user.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </Td>
                        <Td textAlign="center">
                          <IconButton
                            icon={<EditIcon />}
                            colorScheme="green"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(user)}
                            aria-label="Editar usuario"
                          />
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Box>
          )}

          {/* Paginación */}
          {filteredUsers.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </Box>
      </Box>

      {/* Modal de Edición */}
      <Modal 
        isOpen={isOpen} 
        onClose={handleCloseModal} 
        size={{ base: "full", md: "4xl" }}
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Stack direction={{ base: "column", sm: "row" }} spacing={2}>
              <Text>✏️ Editar Usuario</Text>
              {selectedUser && (
                <Badge colorScheme="blue" fontSize="sm" alignSelf={{ base: "flex-start", sm: "center" }}>
                  {selectedUser.username}
                </Badge>
              )}
            </Stack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">
              <UserBasicFields
                formData={formData}
                errors={errors}
                onChange={handleChange}
              />

              <Divider />

              <PermissionsSection
                groupedServices={groupedServices}
                permittedServices={formData.permittedServices || []}
                onServiceChange={handleServiceChange}
                onCategoryChange={handleCategoryChange}
                isCategoryFullySelected={isCategoryFullySelected}
                isCategoryPartiallySelected={isCategoryPartiallySelected}
              />

              <Stack 
                direction={{ base: "column", sm: "row" }}
                spacing={3} 
                pt={4}
              >
                <Button
                  onClick={handleSubmit}
                  colorScheme="green"
                  flex={1}
                  size="lg"
                  isLoading={updateProfileAdmin.isPending || updateProfileAdmin.isLoading}
                  loadingText="Guardando..."
                >
                  💾 Guardar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  size="lg"
                  flex={{ base: 1, sm: "initial" }}
                >
                  Cancelar
                </Button>
              </Stack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}