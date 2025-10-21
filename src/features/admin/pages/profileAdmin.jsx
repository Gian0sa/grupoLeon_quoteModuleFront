import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  Spinner,
  VStack,
  Flex,
  useColorModeValue,
  useToast,
  FormErrorMessage,
  Center,
  SimpleGrid,
  Checkbox,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Text,
  Badge,
  HStack,
  Divider
} from "@chakra-ui/react";
import { useGetAllUsersAdmin } from "../hooks/queries/authAdminQueries";
import { useAuthAdminMutations } from "../hooks/mutations/authAdminMutations";
import { useGetServices } from "../../auth/hooks/queries/authQueries";
import { BackButton } from "../../../components/BackButton";
import Select from "react-select";

function groupServicesByCategory(services) {
  if (!services || services.length === 0) return {};

  const iconMap = {
    'notificación': '🔔',
    'producto': '🛍️',
    'pedido': '📦',
    'cliente': '👤',
    'reporte': '📊',
    'usuario': '👥',
    'factura': '📄',
    'orden': '📃',
    'admin': '⚙️',
  };

  const colorMap = {
    'notificación': 'purple',
    'producto': 'orange',
    'pedido': 'blue',
    'vendedor': 'green',
    'admin': 'yellow',
    'usuario': 'pink',
    'factura': 'red',
    'orden': 'teal',
  };

  const dynamicCategories = {};

  services.forEach(service => {
    // Extraer prefijo antes del primer "-"
    const rawPrefix = service.name?.split('-')[0]?.trim() || 'Otros';
    const prefixKey = rawPrefix.toLowerCase();

    if (!dynamicCategories[prefixKey]) {
      dynamicCategories[prefixKey] = {
        name: rawPrefix,
        icon: iconMap[prefixKey] || '📁',
        color: colorMap[prefixKey] || 'gray',
        services: []
      };
    }

    dynamicCategories[prefixKey].services.push(service);
  });

  return dynamicCategories;
}

const getServiceDisplayName = (name) => {
  if (!name) return '';
  const parts = name.split('-');
  return parts.length > 1 ? parts.slice(1).join('-').trim() : name.trim();
};

export function ProfileAdmin() {
  const { data: users, isLoading } = useGetAllUsersAdmin();
  const { data: services, isLoading: isLoadingServices } = useGetServices();
  const { updateProfileAdmin } = useAuthAdminMutations();
  const toast = useToast();


  const boxBg = useColorModeValue("white", "gray.800");
  const pageBg = useColorModeValue("gray.50", "gray.900");

  const [selectedUserId, setSelectedUserId] = useState("");
  const [formData, setFormData] = useState({
    userId: "",
    username: "",
    email: "",
    salesEmployeeCode: "",
    newPassword: "",
    permittedServices: [],
  });
  const [errors, setErrors] = useState({});

  // Agrupar servicios usando useMemo para optimizar rendimiento
  const groupedServices = useMemo(() => {
    return groupServicesByCategory(services);
  }, [services]);

  // Actualizar formulario al seleccionar un usuario
  useEffect(() => {
    if (selectedUserId && users) {
      const user = users.find(u => u.id === Number(selectedUserId));
      if (user) {
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
          userId: Number(selectedUserId),
          username: user.username || "",
          email: user.email || "",
          salesEmployeeCode: user.salesEmployeeCode ?? null,
          newPassword: "",
          permittedServices: userPermissions,
        });
        setErrors({});
      }
    } else {
      setFormData({
        userId: "",
        username: "",
        email: "",
        salesEmployeeCode: "",
        newPassword: "",
        permittedServices: [],
      });
    }
  }, [selectedUserId, users, services]);

  const handleChange = (e) => {
    const { name, value } = e.target;
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

  // Función para manejar selección de servicios
  const handleServiceChange = (serviceId, checked) => {
    const currentServices = formData.permittedServices || [];
    const updatedServices = checked
      ? [...currentServices, serviceId]
      : currentServices.filter((id) => id !== serviceId);
    
    setFormData(prev => ({ ...prev, permittedServices: updatedServices }));
  };

  // Función para seleccionar/deseleccionar todos los servicios de una categoría
  const handleCategoryChange = (categoryServices, checked) => {
    const serviceIds = categoryServices.map(service => service.id);
    const currentServices = formData.permittedServices || [];
    
    let updatedServices;
    if (checked) {
      // Agregar todos los servicios de la categoría
      updatedServices = [...new Set([...currentServices, ...serviceIds])];
    } else {
      // Remover todos los servicios de la categoría
      updatedServices = currentServices.filter(id => !serviceIds.includes(id));
    }
    
    setFormData(prev => ({ ...prev, permittedServices: updatedServices }));
  };

  // Verificar si todos los servicios de una categoría están seleccionados
  const isCategoryFullySelected = (categoryServices) => {
    const serviceIds = categoryServices.map(service => service.id);
    const permittedServices = formData.permittedServices || [];
    return serviceIds.every(id => permittedServices.includes(id));
  };

  // Verificar si algunos servicios de una categoría están seleccionados
  const isCategoryPartiallySelected = (categoryServices) => {
    const serviceIds = categoryServices.map(service => service.id);
    const permittedServices = formData.permittedServices || [];
    return serviceIds.some(id => permittedServices.includes(id)) && !isCategoryFullySelected(categoryServices);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast({
        title: "Selecciona un usuario",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    
    updateProfileAdmin.mutate(formData);
  };

  if (isLoading || isLoadingServices) {
    return (
      <Center height="100vh" bg={pageBg}>
        <Spinner size="xl" />
      </Center>
    );
  }

  const permittedServices = formData.permittedServices || [];

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
        boxShadow="sm"
      >
        <Box position="absolute" left="4">
          <BackButton color="white" />
        </Box>
        <Heading size="md">Perfil Admin</Heading>
      </Flex>

      {/* Formulario */}
      <Flex
        as="form"
        onSubmit={handleSubmit}
        direction="column"
        justify="flex-start"
        align="center"
        w="full"
        flex="1"
        px={4}
        py={6}
        overflowY="auto"
      >
        <Box
          bg={boxBg}
          p={8}
          borderRadius="xl"
          boxShadow="lg"
          w="full"
          maxW="2xl"
        >
          <VStack spacing={6} align="stretch">
            {/* Selector de usuario */}
            <FormControl>
              <FormLabel fontWeight="semibold">Selecciona Usuario</FormLabel>
                <Select
                placeholder="Selecciona un usuario"
                options={users?.map((u) => ({
                  value: u.id,
                  label: `${u.username} (${u.email})`,
                }))}
                value={
                  users
                    ?.map((u) => ({ value: u.id, label: `${u.username} (${u.email})` }))
                    .find((option) => option.value === Number(selectedUserId)) || null
                }
                onChange={(option) => setSelectedUserId(option?.value || "")}
                styles={{
                  container: (base) => ({
                    ...base,
                    width: "100%", // full responsive
                    maxWidth: "100%", 
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 9999, // evita que se esconda detrás de otros elementos
                  }),
                }}
              />
            </FormControl>

            {selectedUserId && (
              <>
                <Divider />
                
                <FormControl isInvalid={errors.username}>
                  <FormLabel fontWeight="semibold">Usuario</FormLabel>
                  <Input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    focusBorderColor="green.500"
                  />
                  <FormErrorMessage>{errors.username}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={errors.email}>
                  <FormLabel fontWeight="semibold">Email</FormLabel>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    focusBorderColor="green.500"
                  />
                  <FormErrorMessage>{errors.email}</FormErrorMessage>
                </FormControl>

                <FormControl>
                  <FormLabel fontWeight="semibold">Código de Vendedor</FormLabel>
                  <Input
                    name="salesEmployeeCode"
                    value={formData.salesEmployeeCode}
                    onChange={handleChange}
                    focusBorderColor="green.500"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontWeight="semibold">Nueva contraseña</FormLabel>
                  <Input
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    focusBorderColor="green.500"
                    placeholder="Dejar vacío para mantener la actual"
                  />
                </FormControl>

                <Divider />

                {/* Sección de Permisos */}
                <FormControl>
                  <FormLabel fontWeight="semibold">
                    Permisos / Servicios
                    <Badge ml={2} colorScheme="blue">
                      {permittedServices.length} seleccionados
                    </Badge>
                  </FormLabel>
                  
                  <Accordion allowToggle>
                    {Object.entries(groupedServices).map(([categoryKey, category]) => (
                      <AccordionItem key={categoryKey}>
                        <AccordionButton>
                          <HStack flex="1" textAlign="left">
                            <Text fontSize="lg">{category.icon}</Text>
                            <Text fontWeight="bold">{category.name}</Text>
                            <Badge 
                              colorScheme={category.color} 
                              variant={isCategoryFullySelected(category.services) ? "solid" : "outline"}
                            >
                              {category.services.length} servicios
                            </Badge>
                            {isCategoryPartiallySelected(category.services) && (
                              <Badge colorScheme="orange" variant="subtle">
                                Parcial
                              </Badge>
                            )}
                          </HStack>
                          <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel pb={4}>
                          <VStack align="stretch" spacing={2}>
                            {/* Checkbox para seleccionar toda la categoría */}
                            <Checkbox
                              isChecked={isCategoryFullySelected(category.services)}
                              isIndeterminate={isCategoryPartiallySelected(category.services)}
                              onChange={(e) => handleCategoryChange(category.services, e.target.checked)}
                              colorScheme={category.color}
                              fontWeight="bold"
                            >
                              Seleccionar todos en {category.name}
                            </Checkbox>
                            
                            {/* Lista de servicios individuales */}
                            <SimpleGrid columns={1} spacing={2} pl={6}>
                              {category.services.map((srv) => (
                                <Checkbox
                                  key={srv.id}
                                  isChecked={permittedServices.includes(srv.id)}
                                  onChange={(e) => handleServiceChange(srv.id, e.target.checked)}
                                  colorScheme={category.color}
                                >
                                  <VStack align="start" spacing={0}>
                                    <Text fontWeight="medium">{getServiceDisplayName(srv.name)}</Text>
                                    <HStack>
                                      <Badge colorScheme="gray" size="sm">
                                        {srv.method}
                                      </Badge>
                                      <Text fontSize="xs" color="gray.500">
                                        {srv.path}
                                      </Text>
                                    </HStack>
                                  </VStack>
                                </Checkbox>
                              ))}
                            </SimpleGrid>
                          </VStack>
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="green"
                  width="full"
                  size="lg"
                  borderRadius="lg"
                  isLoading={updateProfileAdmin.isPending || updateProfileAdmin.isLoading}
                  loadingText="Guardando..."
                >
                  Guardar cambios
                </Button>
              </>
            )}
          </VStack>
        </Box>
      </Flex>
    </Flex>
  );
}