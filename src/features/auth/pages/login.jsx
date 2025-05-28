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
  Spinner,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { LoginLayout } from "../../../components/layouts/LoginLayout";
import { useAuthMutations } from "../hooks/mutations/authMutations";
import styles from "./Login.module.css";  
import { useColorModeValue } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import { useEffect } from "react";

export function Login() {
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const navigate = useNavigate();
  const token = useAuthStore((state)=>state.token)
  useEffect(() => {
    if (token) {
      navigate("/dashboard");
    }
  }, [token, navigate]);

  if (token) {
    return (
      <Center height="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  const { login } = useAuthMutations();

  const boxBg = useColorModeValue("white", "gray.800");

  const onSubmit = (data) => {
    login.mutate(data);
  };

  return (
    <LoginLayout>
      <Center as="form" onSubmit={handleSubmit(onSubmit)}>
        <Box  bg={boxBg} p={6} borderWidth={1} borderRadius="md" boxShadow="md" width="auto" maxW="md" minWidth={400}>
          <VStack spacing={4} align="stretch">
            <Heading textAlign="center" className={styles.containerlogo}><img src="/src/assets/logo.svg" alt="logo" className={styles.logo }/></Heading>

            <FormControl isInvalid={errors.email}>
              <FormLabel>Email</FormLabel>
              <Input
                type="text"
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
              <Input
                type="password"
                placeholder="********"
                {...register("password", {
                  required: "La contraseña es obligatoria",
                  minLength: { value: 6, message: "Mínimo 6 caracteres" },
                })}
              />
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>

            <Button
              colorScheme="green"
              type="submit"
              width="full"
              isLoading={login.isPending}
              loadingText="Ingresando..."
            >
              Iniciar sesión
            </Button>
          </VStack>
        </Box>
      </Center>
    </LoginLayout>
  );
}
