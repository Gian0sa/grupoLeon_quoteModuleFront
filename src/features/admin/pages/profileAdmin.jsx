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
  Select,
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

// Función para agrupar servicios (copiada del componente Register)
function groupServicesByCategory(services) {
  if (!services || services.length === 0) return {};

  // Categorías manuales prioritarias
  const manualCategories = {
    'ventas': {
      name: 'Ventas',
      icon: '💼',
      color: 'blue',
      keywords: ['orders', 'order', 'sellers', 'quotations', 'sales'],
      services: []
    },
    'servicios': {
      name: 'Servicios',
      icon: '⚙️',
      color: 'green',
      keywords: ['services'],
      services: []
    },
    'reportes': {
      name: 'Reportes',
      icon: '📊',
      color: 'purple',
      keywords: ['reports', 'pdf', 'analytics'],
      services: []
    },
    'documentos': {
      name: 'Documentos',
      icon: '📄',
      color: 'orange',
      keywords: ['deliveryNote', 'invoice'],
      services: []
    },
    'finanzas': {
      name: 'Finanzas',
      icon: '💰',
      color: 'yellow',
      keywords: ['accountsReceivable', 'receivable', 'payments', 'expenses'],
      services: []
    },
    'administracion': {
      name: 'Administración',
      icon: '👥',
      color: 'teal',
      keywords: ['users', 'requests', 'roles', 'permissions'],
      services: []
    }
  };

  const dynamicCategories = {};
  
  // Función para generar nombres legibles automáticamente
  const getCategoryDisplayName = (basePath) => {
    const displayNames = {
      'inventory': 'Inventario',
      'customers': 'Clientes',
      'suppliers': 'Proveedores',
      'products': 'Productos',
      'categories': 'Categorías',
      'brands': 'Marcas',
      'warehouses': 'Almacenes',
      'purchases': 'Compras',
      'payments': 'Pagos',
      'expenses': 'Gastos',
      'dashboard': 'Dashboard',
      'analytics': 'Análisis',
      'notifications': 'Notificaciones',
      'settings': 'Configuración',
      'auth': 'Autenticación',
      'profile': 'Perfil',
      'audit': 'Auditoría',
      'logs': 'Registros',
      'backup': 'Respaldo',
      'maintenance': 'Mantenimiento'
    };
    
    const normalized = basePath.toLowerCase().replace(/[-_]/g, '');
    return displayNames[normalized] || 
           basePath.charAt(0).toUpperCase() + basePath.slice(1).replace(/[-_]/g, ' ');
  };

  // Función para asignar iconos automáticamente
  const getCategoryIcon = (basePath) => {
    const icons = {
      'inventory': '📦',
      'customers': '👨‍💼',
      'suppliers': '🏭',
      'products': '🛍️',
      'categories': '🏷️',
      'brands': '🏪',
      'warehouses': '🏬',
      'purchases': '🛒',
      'payments': '💴',
      'expenses': '💸',
      'dashboard': '📈',
      'analytics': '📊',
      'notifications': '🔔',
      'settings': '⚙️',
      'auth': '🔐',
      'profile': '👤',
      'audit': '🔍',
      'logs': '📋',
      'backup': '💾',
      'maintenance': '🔧'
    };
    
    const normalized = basePath.toLowerCase().replace(/[-_]/g, '');
    return icons[normalized] || '📁';
  };

  // Función para asignar colores automáticamente
  const getCategoryColor = (basePath) => {
    const colors = ['blue', 'green', 'purple', 'orange', 'yellow', 'teal', 'pink', 'cyan', 'red', 'gray'];
    let hash = 0;
    for (let i = 0; i < basePath.length; i++) {
      hash = basePath.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  
  services.forEach(service => {
    const pathParts = service.path.split('/').filter(part => part && !part.includes(':'));
    const basePath = pathParts[0] || 'general';
    
    let assigned = false;
    
    // Primero intentar asignar a categorías manuales
    for (const [categoryKey, category] of Object.entries(manualCategories)) {
      if (category.keywords.some(keyword => basePath.toLowerCase().includes(keyword.toLowerCase()))) {
        category.services.push(service);
        assigned = true;
        break;
      }
    }
    
    // Si no se asignó manualmente, crear categoría dinámica
    if (!assigned) {
      const categoryKey = basePath.toLowerCase();
      
      if (!dynamicCategories[categoryKey]) {
        dynamicCategories[categoryKey] = {
          name: getCategoryDisplayName(basePath),
          icon: getCategoryIcon(basePath),
          color: getCategoryColor(basePath),
          services: []
        };
      }
      
      dynamicCategories[categoryKey].services.push(service);
    }
  });

  // Combinar categorías manuales (con servicios) y dinámicas
  const result = {};
  
  // Agregar categorías manuales que tienen servicios
  Object.entries(manualCategories).forEach(([key, category]) => {
    if (category.services.length > 0) {
      result[key] = category;
    }
  });
  
  // Agregar categorías dinámicas
  Object.entries(dynamicCategories).forEach(([key, category]) => {
    result[key] = category;
  });

  return result;
}

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
        // Convertir permisos de string format a IDs si es necesario
        let userPermissions = user.permittedServices || [];
        
        // Si los permisos están en formato string "METHOD:/path", convertir a IDs
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
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.email})
                  </option>
                ))}
              </Select>
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
                                    <Text fontWeight="medium">{srv.name}</Text>
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