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
  
  export function Register() {
    const {
      handleSubmit,
      register,
      watch,
      formState: { errors },
    } = useForm();
  
    const onSubmit = (data) => {
      console.log("Datos enviados:", data);
    };
  
    const password = watch("password");
  
    return (
      <MainLayout>
        <Center as="form" onSubmit={handleSubmit(onSubmit)}>
          <Box p={6} borderWidth={1} borderRadius="md" boxShadow="md" width="100%">
            <VStack spacing={4} align="stretch">
              <Heading textAlign="center">Registro</Heading>
  
              <FormControl isInvalid={errors.name}>
                <FormLabel>Nombre</FormLabel>
                <Input
                  type="text"
                  placeholder="Tu nombre"
                  {...register("name", {
                    required: "El nombre es obligatorio",
                    minLength: { value: 2, message: "Mínimo 2 caracteres" },
                  })}
                />
                <FormErrorMessage>{errors.name && errors.name.message}</FormErrorMessage>
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
                <FormErrorMessage>{errors.email && errors.email.message}</FormErrorMessage>
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
                <FormErrorMessage>{errors.password && errors.password.message}</FormErrorMessage>
              </FormControl>
  
              <FormControl isInvalid={errors.confirmPassword}>
                <FormLabel>Repetir Contraseña</FormLabel>
                <Input
                  type="password"
                  placeholder="********"
                  {...register("confirmPassword", {
                    required: "Confirma tu contraseña",
                    validate: (value) =>
                      value === password || "Las contraseñas no coinciden",
                  })}
                />
                <FormErrorMessage>{errors.confirmPassword && errors.confirmPassword.message}</FormErrorMessage>
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
  