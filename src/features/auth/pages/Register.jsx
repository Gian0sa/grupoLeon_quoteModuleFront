import {
  Center,
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  VStack,
  Flex,
  Spinner,
  InputGroup,
  InputRightElement,
  SimpleGrid,
  Checkbox,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Text,
  Badge,
  HStack
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useAuthMutations } from "../hooks/mutations/authMutations";
import { useSellersData } from "../hooks/queries/authQueries";
import { useEffect, useState, useMemo } from "react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { BackButton } from "../../../components/BackButton";
import SellerSelect from "../../../components/SellerSelect";
import { useNavigate } from "react-router-dom";
import { useGetServices } from "../hooks/queries/authQueries";

function groupServicesByCategory(services) {
  if (!services || services.length === 0) return {};

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
    
    for (const [categoryKey, category] of Object.entries(manualCategories)) {
      if (category.keywords.some(keyword => basePath.toLowerCase().includes(keyword.toLowerCase()))) {
        category.services.push(service);
        assigned = true;
        break;
      }
    }
    
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

  const result = {};
  
  Object.entries(manualCategories).forEach(([key, category]) => {
    if (category.services.length > 0) {
      result[key] = category;
    }
  });

  Object.entries(dynamicCategories).forEach(([key, category]) => {
    result[key] = category;
  });

  return result;
}

export function Register() {
  const navigate = useNavigate();
  const {
    handleSubmit,
    register,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      permittedServices: [],
    },
  });

  const { register: registerMutation } = useAuthMutations();

  const role = watch("role");
  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const permittedServices = watch("permittedServices") || [];

  const { data: sellers, isLoading } = useSellersData();
  const { data: services, isLoading: isLoadingServices } = useGetServices();
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const groupedServices = useMemo(() => {
    return groupServicesByCategory(services);
  }, [services]);

  const onSubmit = (data) => {
    if (data.password !== data.confirmPassword) {
      setError("confirmPassword", {
        type: "manual",
        message: "Las contraseñas no coinciden",
      });
      return;
    }

    const user = {
      role: data.role,
      username: data.name,
      email: data.email,
      password: data.password,
      salesEmployeeCode: role === "SELLER" ? data.salesPerson.value : undefined,
      permittedServices: data.permittedServices,
    };

    registerMutation.mutate(user);
  };

  const handleServiceChange = (serviceId, checked) => {
    const currentServices = permittedServices;
    const updatedServices = checked
      ? [...currentServices, serviceId]
      : currentServices.filter((id) => id !== serviceId);
    
    setValue("permittedServices", updatedServices);
  };

  const handleCategoryChange = (categoryServices, checked) => {
    const serviceIds = categoryServices.map(service => service.id);
    const currentServices = permittedServices;
    
    let updatedServices;
    if (checked) {
      updatedServices = [...new Set([...currentServices, ...serviceIds])];
    } else {
      updatedServices = currentServices.filter(id => !serviceIds.includes(id));
    }
    
    setValue("permittedServices", updatedServices);
  };

  const isCategoryFullySelected = (categoryServices) => {
    const serviceIds = categoryServices.map(service => service.id);
    return serviceIds.every(id => permittedServices.includes(id));
  };

  const isCategoryPartiallySelected = (categoryServices) => {
    const serviceIds = categoryServices.map(service => service.id);
    return serviceIds.some(id => permittedServices.includes(id)) && !isCategoryFullySelected(categoryServices);
  };

  useEffect(() => {
    if (selectedSeller) {
      setValue("name", selectedSeller.label);
      setValue("email", selectedSeller.email);
    }
  }, [selectedSeller, setValue]);

  return (
    <Box minHeight="100vh">
      <Flex
        bg="green.800"
        color="white"
        align="center"
        p={4}
        borderBottomRadius="xl"
        justify="center"
        position="relative"
      >
        <Box position="absolute" left="4">
          <BackButton color="white" />
        </Box>
        <Heading size="md">Registro de usuarios</Heading>
      </Flex>
      <Center as="form" onSubmit={handleSubmit(onSubmit)}>
        <Box p={6} borderWidth={1} borderRadius="md" boxShadow="md" width="100%">
          <VStack spacing={4} align="stretch">
            <Heading textAlign="center">Registro</Heading>

            <FormControl isInvalid={errors.role}>
              <FormLabel>Rol</FormLabel>
              <Flex gap="4">
                <label>
                  <input
                    type="radio"
                    value="SUPERVISOR"
                    {...register("role", { required: "El rol es obligatorio" })}
                  />{" "}
                  Supervisor
                </label>
                <label>
                  <input
                    type="radio"
                    value="SELLER"
                    {...register("role", { required: "El rol es obligatorio" })}
                  />{" "}
                  Vendedor
                </label>
              </Flex>
              <FormErrorMessage>{errors.role?.message}</FormErrorMessage>
            </FormControl>

            {role === "SELLER" && (
              <SellerSelect
                selectedSeller={selectedSeller}
                setSelectedSeller={setSelectedSeller}
                setValue={setValue}
                error={errors.salesPerson}
              />
            )}

            <FormControl isInvalid={errors.name}>
              <FormLabel>Nombre</FormLabel>
              <Input
                type="text"
                placeholder="Nombre"
                {...register("name", {
                  required: "El nombre es obligatorio",
                  minLength: { value: 2, message: "Mínimo 2 caracteres" },
                })}
              />
              <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.email}>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                {...register("email", {
                  required: "El correo es obligatorio",
                  pattern: {
                    value: /^[^@]+@[^@]+\.[^@]+$/,
                    message: "Correo inválido",
                  },
                })}
              />
              <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.password}>
              <FormLabel>Contraseña</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  {...register("password", {
                    required: "La contraseña es obligatoria",
                    minLength: { value: 6, message: "Mínimo 6 caracteres" },
                  })}
                />
                <InputRightElement>
                  <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <ViewOffIcon /> : <ViewIcon />}
                  </Button>
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.confirmPassword}>
              <FormLabel>Repetir Contraseña</FormLabel>
              <InputGroup>
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="********"
                  {...register("confirmPassword", {
                    required: "La confirmación es obligatoria",
                    minLength: { value: 6, message: "Mínimo 6 caracteres" },
                  })}
                />
                <InputRightElement>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                  </Button>
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.confirmPassword?.message}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>
                Permisos / Servicios
                <Badge ml={2} colorScheme="blue">
                  {permittedServices.length} seleccionados
                </Badge>
              </FormLabel>
              {isLoadingServices ? (
                <Spinner />
              ) : (
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
                          <Checkbox
                            isChecked={isCategoryFullySelected(category.services)}
                            isIndeterminate={isCategoryPartiallySelected(category.services)}
                            onChange={(e) => handleCategoryChange(category.services, e.target.checked)}
                            colorScheme={category.color}
                            fontWeight="bold"
                          >
                            Seleccionar todos en {category.name}
                          </Checkbox>
                          
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
              )}
            </FormControl>

            <Button colorScheme="teal" type="submit" width="full">
              Registrarse
            </Button>
          </VStack>
        </Box>
      </Center>
    </Box>
  );
}