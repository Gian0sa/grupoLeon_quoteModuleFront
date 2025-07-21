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
    Checkbox,
    Link,
    Flex,
    Spacer,
  } from "@chakra-ui/react";
  import { useForm } from "react-hook-form";
  import { useAuthMutations } from "../hooks/mutations/authMutations";
  import styles from "./Login.module.css";  
  import { useColorModeValue } from "@chakra-ui/react";
  import { useNavigate } from "react-router-dom";
  import { useAuthStore } from "../stores/useAuthStore";
  import { useEffect } from "react";
  import logoGuruverso from '../../../assets/icons/logo-guruverso-g.png';

  
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
  <Flex direction="column" h="100vh" w="full">
    
    {/* Parte superior */}
    <Box flex="1" w="full">
      <div className={styles.ImageLogin}></div>
    </Box>

    {/* Parte inferior con el formulario */}
    <Flex
      as="form"
      onSubmit={handleSubmit(onSubmit)}
      direction="column"
      justify="center"
      align="center"
      w="full"
      p={4}
    >
      <Box
        bg={boxBg}
        p={6}
        borderWidth={1}
        borderRadius="md"
        boxShadow="md"
        w="full"
        maxW="md"
      >
        <VStack spacing={4} align="stretch">
          <Heading as="h1" textAlign="center" className={styles.containerlogo}>
            ¡Hola de nuevo!
            <Box as="span" display="block" fontSize="md" fontWeight="normal">
              Accede a tu cuenta
            </Box>
          </Heading>


          {/* Email */}
          <FormControl isInvalid={errors.email}>
            <Input
              type="text"
              placeholder="Correo electrónico"
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

          {/* Password */}
          <FormControl isInvalid={errors.password}>
            <Input
              type="password"
              placeholder="Contraseña"
              {...register("password", {
                required: "La contraseña es obligatoria",
                minLength: { value: 6, message: "Mínimo 6 caracteres" },
              })}
            />
            <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
          </FormControl>

          {/* Recordarme y olvidaste */}
          <Flex justify="space-between" align="center" w="full" fontSize="sm">
            <Checkbox
              colorScheme="green"
              spacing="0.5rem"
              sx={{
                ".chakra-checkbox__control": {
                  border: "none",
                  borderRadius: "10px",
                  width: "10px",
                  height: "10px",
                  bg: "gray.100",
                  _checked: {
                    bg: "green",
                    color: "white",
                  },
                },
                ".chakra-checkbox__icon": {
                  fontSize: "8px",
                },
                ".chakra-checkbox__label": {
                  fontSize: "10px",
                  color: "gray.700",
                },
              }}
              {...register("rememberMe")}
            >
              Recordarme
            </Checkbox>

            <Link color="green.500" href="/forgot-password" fontWeight="medium">
              ¿Olvidaste tu contraseña?
            </Link>
          </Flex>

          {/* Botón */}
          <Button
            colorScheme="green"
            type="submit"
            width="full"
            isLoading={login.isPending}
            className={styles.btnInicioSesion}
            loadingText="Ingresando..."
          >
            Iniciar sesión
          </Button>
        </VStack>

          <Box flex="1" w="full">
            <div className={styles.PoweredBy}>
              Desarrollado por:&nbsp;
              <img src={logoGuruverso} alt="Logo Guruverso" className={styles.LogoImg} />
            </div>
          </Box>
      </Box>
    </Flex>
  </Flex>
    );
  }
  