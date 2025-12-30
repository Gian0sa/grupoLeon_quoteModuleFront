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
  Badge,
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
import { groupServicesByCategory } from "../../../shared/utils/serviceHelpers";
import PermissionsSection from "../../admin/components/PermissionsSection";

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
              {isLoadingServices ? (
                <Spinner />
              ) : (
                <PermissionsSection
                  groupedServices={groupedServices}
                  permittedServices={permittedServices}
                  onServiceChange={handleServiceChange}
                  onCategoryChange={handleCategoryChange}
                  isCategoryFullySelected={isCategoryFullySelected}
                  isCategoryPartiallySelected={isCategoryPartiallySelected}
                />
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