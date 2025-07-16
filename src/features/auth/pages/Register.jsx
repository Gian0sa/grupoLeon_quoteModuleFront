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
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { adaptUsertoRegister } from "../adapters/authAdapter";  
import { useAuthMutations } from "../hooks/mutations/authMutations";
import { useSellersData } from "../hooks/queries/authQueries";
import Select from "react-select";
import { useEffect, useState } from "react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { BackButton } from "../../../components/BackButton";
import SellerSelect from "../../../components/SellerSelect";


export function Register() {
  const {
    handleSubmit,
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm();

  const { register: registerMutation } = useAuthMutations();

  const role = watch("role");
  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  const { data: sellers, isLoading } = useSellersData();
  console.log(sellers)
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const onSubmit = (data) => {
    const user = {
      role: data.role,
      username: data.name,
      email: data.email,
      password: data.password,
      salesEmployeeCode: role === "SELLER" ? data.salesPerson.value : undefined,
    };
    console.log(user);
    registerMutation.mutate(user, {
      onSuccess: () => {
        navigate("/dashboard");
      },
      onError: (error) => {
        const message = error?.response?.data?.message || "Error al registrar";
    
        if (message.includes("email")) {
          setError("email", {
            type: "manual",
            message: "Este correo ya está registrado",
          });
        } else if (message.includes("username")) {
          setError("name", {
            type: "manual",
            message: "Este nombre ya está en uso",
          });
        } else {
          alert(message);
        }
      },
    });
    
  };

  useEffect(() => {
    if (selectedSeller) {
      setValue("name", selectedSeller.label);
      setValue("email", selectedSeller.email);
    }
  }, [selectedSeller, setValue]);

  return (
    <MainLayout>
      <BackButton />
      <Center as="form" onSubmit={handleSubmit(onSubmit)}>
        <Box p={6} borderWidth={1} borderRadius="md" boxShadow="md" width="100%">
          <VStack spacing={4} align="stretch">
            <Heading textAlign="center">Registro</Heading>

            {/* Campo de Rol */}
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

            {/* Selección de vendedor si es SELLER */}
            {role === "SELLER" && (
              <SellerSelect
                selectedSeller={selectedSeller}
                setSelectedSeller={setSelectedSeller}
                setValue={setValue}
                error={errors.salesPerson}
              />
            )}

            {/* Nombre (autocompletado si es SELLER) */}
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

            {/* Email (autocompletado si es SELLER) */}
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

            {/* Contraseña para ambos roles */}
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
                    required: "La contraseña es obligatoria",
                    minLength: { value: 6, message: "Mínimo 6 caracteres" },
                  })}
                />
                <InputRightElement>
                  <Button variant="ghost" size="sm" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                  </Button>
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>

            <Button colorScheme="teal" type="submit" width="full">
              Registrarse
            </Button>
          </VStack>
        </Box>
      </Center>
    </MainLayout>
  );
}
