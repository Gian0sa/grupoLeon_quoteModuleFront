import {
  Center,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  Heading,
  Input,
  VStack,
  Spinner,
  Checkbox,
  Link,
  Flex,
  useToast,
  InputGroup,
  InputRightElement,
  IconButton,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import ReCAPTCHA from "react-google-recaptcha";
import { useForm } from "react-hook-form";
import { useAuthMutations } from "../hooks/mutations/authMutations";
import styles from "./Login.module.css";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import { useEffect, useRef, useState } from "react";

export function Login() {
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();
  const [showPassword, setShowPassword] = useState(false);

  const toast = useToast();
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const recaptchaRef = useRef(null);
  const [captchaError, setCaptchaError] = useState(false);

  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);

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

  const onSubmit = (data) => {
    const token = recaptchaRef.current?.getValue();

    if (!token) {
      setCaptchaError(true);
      return;
    }

    login.mutate({ ...data, recaptchaToken: token }, {
      onError: (error) => {
        const message =
          error?.response?.data?.message || "Error al iniciar sesión";
        toast({
          title: "Inicio de sesión fallido",
          description: message,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "top",
        });
        recaptchaRef.current?.reset();
      },
    });
  };

  return (
    <Flex direction="column" h="100vh" w="full" bg="bg">
      {/* Parte superior */}
      <Box flex="1" w="full">
        <div className={styles.ImageLogin}></div>
      </Box>

      {/* Formulario */}
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
          bg="card"
          p={6}
          borderWidth={1}
          borderRadius="md"
          boxShadow="md"
          w="full"
          maxW="md"
        >
          <VStack spacing={4} align="stretch">
            <Heading
              as="h1"
              textAlign="center"
              color="text"
              className={styles.containerlogo}
            >
              ¡Hola de nuevo!
              <Box as="span" display="block" fontSize="md" fontWeight="normal" color="text">
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
              <InputGroup>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  {...register("password", {
                    required: "La contraseña es obligatoria",
                    minLength: { value: 6, message: "Mínimo 6 caracteres" },
                  })}
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>

            {/* Recordarme y olvidaste */}
            <Flex justify="space-between" align="center" w="full" fontSize="sm">
              <Checkbox
                colorScheme="purple"
                {...register("rememberMe")}
                sx={{
                  ".chakra-checkbox__label": {
                    fontSize: "10px",
                    color: "text",
                  },
                }}
              >
                Recordarme
              </Checkbox>

              <Link color="accent" href="/forgot-password" fontWeight="medium">
                ¿Olvidaste tu contraseña?
              </Link>
            </Flex>

            {/* ReCaptcha */}
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={siteKey}
              onChange={() => setCaptchaError(false)}
            />
            {captchaError && (
              <Box color="red.500" fontSize="sm">
                Por favor, verifica que no eres un robot.
              </Box>
            )}

            {/* Botón */}
            <Button
              bg="accent"
              color="white"
              _hover={{ bg: "accent" }}
              type="submit"
              width="full"
              isLoading={login.isPending}
              loadingText="Ingresando..."
              className={styles.btnInicioSesion}
            >
              Iniciar sesión
            </Button>
          </VStack>

          {/* Footer */}
          <Box flex="1" w="full" mt={4}>
            <div className={styles.PoweredBy}>
              Desarrollado por:&nbsp;
              <img
                src={"/assets/icons/logo-guruverso-g.png"}
                alt="Logo Guruverso"
                className={styles.LogoImg}
              />
            </div>
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
}
