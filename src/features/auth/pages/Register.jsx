import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  VStack,
  HStack,
  Flex,
  Spinner,
  InputGroup,
  InputRightElement,
  Badge,
  Text,
  SimpleGrid,
  useToast,
  IconButton,
  Divider,
  Center,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useAuthMutations } from "../hooks/mutations/authMutations";
import { useSellersData, useGetServices } from "../hooks/queries/authQueries";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  UserCheck,
  ShieldCheck,
  Eye,
  EyeOff,
  UserPlus,
} from "lucide-react";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import SellerSelect from "../../../components/SellerSelect";
import PermissionsTreeView from "../../admin/components/PermissionsTreeView";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });

  const {
    handleSubmit,
    register,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      role: "SELLER",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      permittedServices: [],
    },
  });

  const { register: registerMutation } = useAuthMutations();

  const role = watch("role");
  const permittedServices = watch("permittedServices") || [];

  const { data: sellers, isLoading: isLoadingSellers } = useSellersData();
  const { data: services, isLoading: isLoadingServices } = useGetServices();
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (selectedSeller) {
      setValue("name", selectedSeller.label || "");
      setValue("email", selectedSeller.email || "");
    }
  }, [selectedSeller, setValue]);

  const onSubmit = (data) => {
    if (data.password !== data.confirmPassword) {
      setError("confirmPassword", {
        type: "manual",
        message: "Las contraseñas no coinciden",
      });
      return;
    }

    if (data.role === "SELLER" && !data.salesPerson?.value && !selectedSeller?.value) {
      toast({
        title: "Vendedor SAP requerido",
        description: "Por favor selecciona el asesor de ventas SAP correspondiente.",
        status: "warning",
        duration: 3500,
        isClosable: true,
      });
      return;
    }

    const userPayload = {
      role: data.role,
      username: data.name,
      email: data.email,
      password: data.password,
      salesEmployeeCode: data.role === "SELLER" ? (data.salesPerson?.value || selectedSeller?.value) : null,
      permittedServices: data.permittedServices || [],
    };

    registerMutation.mutate(userPayload, {
      onSuccess: () => {
        navigate("/profileAdmin");
      },
    });
  };

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="80px">
      {/* ─── TOP HEADER BANNER ESTÁNDAR ─── */}
      <TopHeaderBanner
        title="Registro de Nuevos Usuarios"
        subtitle={`Creación de cuentas, vinculación con vendedor SAP y configuración de accesos • ${today.charAt(0).toUpperCase() + today.slice(1)}`}
        showBack={true}
        backTo="/profileAdmin"
        mb={6}
      />

      <Box maxW="1000px" mx="auto" px={{ base: 3, md: 6 }} mt={-6}>
        <Box
          as="form"
          onSubmit={handleSubmit(onSubmit)}
          bg="white"
          p={{ base: 4, md: 8 }}
          borderRadius="2xl"
          border="1px solid"
          borderColor="gray.200"
          boxShadow="sm"
        >
          <VStack spacing={6} align="stretch">
            {/* 1. SELECCIÓN DE ROL */}
            <Box>
              <Text fontSize="xs" fontWeight="900" color="gray.700" textTransform="uppercase" letterSpacing="wider" mb={3}>
                1. Tipo de Cuenta y Rol en el Sistema
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3.5}>
                {[
                  {
                    id: "SUPERVISOR",
                    title: "Supervisor",
                    desc: "Revisión comercial, reportes y supervisión de pedidos",
                    icon: UserCheck,
                  },
                  {
                    id: "SELLER",
                    title: "Vendedor",
                    desc: "Gestión de pedidos en campo, cotizaciones y clientes",
                    icon: Briefcase,
                  },
                ].map((r) => {
                  const isSelected = role === r.id;
                  const IconComp = r.icon;
                  return (
                    <Box
                      key={r.id}
                      p={4}
                      borderRadius="xl"
                      border="2px solid"
                      borderColor={isSelected ? "#16a34a" : "gray.200"}
                      bg={isSelected ? "#f0fdf4" : "white"}
                      cursor="pointer"
                      onClick={() => setValue("role", r.id)}
                      transition="all 0.15s ease-in-out"
                      _hover={{ borderColor: isSelected ? "#16a34a" : "gray.300", transform: "translateY(-1px)" }}
                    >
                      <HStack justify="space-between" mb={2}>
                        <Flex
                          w="32px"
                          h="32px"
                          borderRadius="lg"
                          bg={isSelected ? "#16a34a" : "gray.100"}
                          color={isSelected ? "white" : "gray.600"}
                          align="center"
                          justify="center"
                        >
                          <IconComp className="w-4 h-4" />
                        </Flex>
                        {isSelected && (
                          <Badge colorScheme="green" fontSize="10px" borderRadius="full" px={2} py={0.5}>
                            SELECCIONADO
                          </Badge>
                        )}
                      </HStack>
                      <Text fontWeight="800" fontSize="sm" color={isSelected ? "emerald.900" : "gray.800"}>
                        {r.title}
                      </Text>
                      <Text fontSize="xs" color="gray.500" mt={0.5} lineHeight="shorter">
                        {r.desc}
                      </Text>
                    </Box>
                  );
                })}
              </SimpleGrid>
            </Box>

            <Divider />

            {/* 2. VINCULACIÓN SAP (SI ES VENDEDOR) */}
            {role === "SELLER" && (
              <Box bg="#f8fafc" p={4} borderRadius="xl" border="1px solid" borderColor="#e2e8f0">
                <Text fontSize="xs" fontWeight="900" color="gray.700" textTransform="uppercase" letterSpacing="wider" mb={2}>
                  2. Asignación de Vendedor SAP Oficial
                </Text>
                <SellerSelect
                  selectedSeller={selectedSeller}
                  setSelectedSeller={setSelectedSeller}
                  setValue={setValue}
                  error={errors.salesPerson}
                />
              </Box>
            )}

            {/* 3. DATOS DE ACCESO */}
            <Box>
              <Text fontSize="xs" fontWeight="900" color="gray.700" textTransform="uppercase" letterSpacing="wider" mb={3}>
                {role === "SELLER" ? "3. Credenciales y Datos de Acceso" : "2. Credenciales y Datos de Acceso"}
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {/* Nombre de Usuario */}
                <FormControl isInvalid={errors.name} isRequired>
                  <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={1}>
                    Nombre Completo / Usuario
                  </FormLabel>
                  <Input
                    type="text"
                    placeholder="Ej. Juan Perez"
                    bg="white"
                    borderRadius="lg"
                    borderColor="gray.300"
                    _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px #16a34a" }}
                    fontSize="sm"
                    {...register("name", {
                      required: "El nombre es obligatorio",
                      minLength: { value: 2, message: "Mínimo 2 caracteres" },
                    })}
                  />
                  <FormErrorMessage fontSize="xs">{errors.name?.message}</FormErrorMessage>
                </FormControl>

                {/* Email */}
                <FormControl isInvalid={errors.email} isRequired>
                  <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={1}>
                    Correo Electrónico
                  </FormLabel>
                  <Input
                    type="email"
                    placeholder="correo@autopartes.pe"
                    bg="white"
                    borderRadius="lg"
                    borderColor="gray.300"
                    _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px #16a34a" }}
                    fontSize="sm"
                    {...register("email", {
                      required: "El correo es obligatorio",
                      pattern: {
                        value: /^[^@]+@[^@]+\.[^@]+$/,
                        message: "Correo inválido",
                      },
                    })}
                  />
                  <FormErrorMessage fontSize="xs">{errors.email?.message}</FormErrorMessage>
                </FormControl>

                {/* Contraseña */}
                <FormControl isInvalid={errors.password} isRequired>
                  <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={1}>
                    Contraseña
                  </FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      bg="white"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px #16a34a" }}
                      fontSize="sm"
                      {...register("password", {
                        required: "La contraseña es obligatoria",
                        minLength: { value: 6, message: "Mínimo 6 caracteres" },
                      })}
                    />
                    <InputRightElement>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={showPassword ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Ver contraseña"
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage fontSize="xs">{errors.password?.message}</FormErrorMessage>
                </FormControl>

                {/* Confirmar Contraseña */}
                <FormControl isInvalid={errors.confirmPassword} isRequired>
                  <FormLabel fontSize="xs" fontWeight="800" color="gray.700" mb={1}>
                    Repetir Contraseña
                  </FormLabel>
                  <InputGroup>
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repita la contraseña"
                      bg="white"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px #16a34a" }}
                      fontSize="sm"
                      {...register("confirmPassword", {
                        required: "La confirmación es obligatoria",
                        minLength: { value: 6, message: "Mínimo 6 caracteres" },
                      })}
                    />
                    <InputRightElement>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={showConfirmPassword ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label="Ver confirmación"
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage fontSize="xs">{errors.confirmPassword?.message}</FormErrorMessage>
                </FormControl>
              </SimpleGrid>
            </Box>

            <Divider />

            {/* 4. ÁRBOL JERÁRQUICO DE PERMISOS */}
            <Box>
              <Text fontSize="xs" fontWeight="900" color="gray.700" textTransform="uppercase" letterSpacing="wider" mb={2}>
                {role === "SELLER" ? "4. Permisos del Sistema y Módulos Autorizados" : "3. Permisos del Sistema y Módulos Autorizados"}
              </Text>
              {isLoadingServices ? (
                <Center py={8}>
                  <VStack spacing={2}>
                    <Spinner size="md" color="green.600" />
                    <Text fontSize="xs" color="gray.500">Cargando permisos del sistema...</Text>
                  </VStack>
                </Center>
              ) : (
                <PermissionsTreeView
                  services={services || []}
                  permittedServices={permittedServices}
                  onChange={(newPermitted) => setValue("permittedServices", newPermitted)}
                />
              )}
            </Box>

            {/* 5. BOTONES DE ACCIÓN */}
            <HStack spacing={3} justify="flex-end" pt={4} borderTop="1px solid" borderColor="gray.100">
              <Button
                variant="outline"
                size="md"
                borderRadius="xl"
                fontWeight="700"
                onClick={() => navigate("/profileAdmin")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                colorScheme="green"
                bg="#126C36"
                _hover={{ bg: "#0d552b" }}
                _active={{ bg: "#0a3f1f" }}
                size="md"
                borderRadius="xl"
                fontWeight="800"
                px={6}
                leftIcon={<UserPlus className="w-4 h-4" />}
                isLoading={registerMutation.isPending}
                loadingText="Registrando..."
              >
                Registrar Usuario
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Box>
    </Box>
  );
}

export default Register;