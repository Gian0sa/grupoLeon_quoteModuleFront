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
import RoleSelectorMenu, { AVAILABLE_ROLES } from "../../admin/components/RoleSelectorMenu";
import { getPresetServiceIds } from "../../admin/utils/permissionTreeHelper";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuthStore } from "../stores/useAuthStore";
import { useIsAdmin, useHasAccess } from "../../../shared/utils/permissions";

export function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAdmin = useIsAdmin();
  const hasAccess = useHasAccess();
  const canRegister = isAuthenticated && (isAdmin || hasAccess("POST:/register"));

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }
    if (!canRegister) {
      toast({
        title: "Acceso denegado",
        description: "Solo los administradores pueden registrar nuevos usuarios.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, canRegister, navigate, toast]);

  if (!canRegister) {
    return (
      <Center height="80vh">
        <Spinner size="xl" color="green.600" />
      </Center>
    );
  }

  const {
    handleSubmit,
    register,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      role: "ASESOR_VENTAS",
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
  const isSellerRole = role === "ASESOR_VENTAS" || role === "SELLER";

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

  const handleApplyPreset = (presetKey) => {
    const ids = getPresetServiceIds(presetKey, services || []);
    if (ids.length > 0) {
      setValue("permittedServices", ids);
      toast({
        title: "Permisos sugeridos aplicados",
        description: "Se han preseleccionado los permisos recomendados en el árbol inferior.",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  const handleSelectRole = (newRoleKey) => {
    setValue("role", newRoleKey);
    const currentPerms = watch("permittedServices") || [];
    const roleCfg = AVAILABLE_ROLES.find((r) => r.key === newRoleKey);
    if (roleCfg?.presetKey && currentPerms.length === 0) {
      const ids = getPresetServiceIds(roleCfg.presetKey, services || []);
      if (ids.length > 0) {
        setValue("permittedServices", ids);
      }
    }
  };

  const onSubmit = (data) => {
    if (data.password !== data.confirmPassword) {
      setError("confirmPassword", {
        type: "manual",
        message: "Las contraseñas no coinciden",
      });
      return;
    }

    if (isSellerRole && !data.salesPerson?.value && !selectedSeller?.value) {
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
      role: data.role || "ASESOR_VENTAS",
      username: data.name,
      email: data.email,
      password: data.password,
      salesEmployeeCode: isSellerRole ? (data.salesPerson?.value || selectedSeller?.value) : null,
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
      />

      <Box maxW="1000px" mx="auto" px={{ base: 3, md: 6 }}>
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
            {/* 1. SELECCIÓN DE CARGO OFICIAL (COMPACTO TIPO HAMBURGUESA) */}
            <RoleSelectorMenu
              role={role}
              onSelectRole={handleSelectRole}
              onApplyRolePreset={handleApplyPreset}
              stepNumber="1."
              title="Tipo de Cuenta y Cargo Oficial en el Sistema"
              subtitle="Define el puesto en la empresa. Se mostrará en su perfil y menú lateral de forma independiente a los permisos técnicos que le actives."
              mb={2}
            />

            {/* 2. VINCULACIÓN SAP (SI ES ASESOR DE VENTAS) */}
            {isSellerRole && (
              <Box bg="#f8fafc" p={4} borderRadius="xl" border="1px solid" borderColor="#e2e8f0">
                <Text fontSize="xs" fontWeight="900" color="gray.700" textTransform="uppercase" letterSpacing="wider" mb={2}>
                  2. Asignación de Vendedor SAP Oficial
                </Text>
                <SellerSelect
                  selectedSeller={selectedSeller}
                  setSelectedSeller={setSelectedSeller}
                  setValue={setValue}
                  error={errors.salesPerson}
                  allowAll={false}
                  onlyUnassigned={true}
                />
              </Box>
            )}

            {/* 3. DATOS DE ACCESO */}
            <Box>
              <Text fontSize="xs" fontWeight="900" color="gray.700" textTransform="uppercase" letterSpacing="wider" mb={3}>
                {isSellerRole ? "3. Credenciales y Datos de Acceso" : "2. Credenciales y Datos de Acceso"}
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
                {isSellerRole ? "4. Permisos del Sistema y Módulos Autorizados" : "3. Permisos del Sistema y Módulos Autorizados"}
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