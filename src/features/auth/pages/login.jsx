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
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { MainLayout } from "../../../components/layouts/MainLayout";
import { useAuthMutations } from "../hooks/mutations/authMutations";

export function Login() {
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const { login } = useAuthMutations();

  const onSubmit = (data) => {
    login.mutate(data);
  };

  return (
    <MainLayout>
      <Center as="form" onSubmit={handleSubmit(onSubmit)}>
        <Box p={6} borderWidth={1} borderRadius="md" boxShadow="md" width="100%" maxW="md">
          <VStack spacing={4} align="stretch">
            <Heading textAlign="center">Login</Heading>

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
              colorScheme="teal"
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
    </MainLayout>
  );
}
