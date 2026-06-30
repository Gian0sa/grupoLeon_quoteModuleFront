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
import { Turnstile } from "@marsidev/react-turnstile";
import { useForm } from "react-hook-form";
import { useAuthMutations } from "../hooks/mutations/authMutations";
import styles from "./Login.module.css";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import { useEffect, useState } from "react";

export function Login() {
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaError, setCaptchaError] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0); // ✅ fix: key separada

  const toast = useToast();
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const { login } = useAuthMutations(); // ✅ fix: hooks antes del return condicional

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

  const resetCaptcha = () => {
    setCaptchaKey((prev) => prev + 1);
    setCaptchaToken(null);
  };

  const onSubmit = (data) => {
     if (!captchaToken) {
       setCaptchaError(true);
       return;
     }

    login.mutate(
      { ...data, captchaToken },
      {
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

          resetCaptcha(); // ✅ fix: reset real del widget
        },
      }
    );
  };

  return (
    <Flex direction="column" h="100vh" w="full" bg="bg">
      <Box flex="1" w="full">
        <div className={styles.ImageLogin}></div>
      </Box>

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
            <Heading textAlign="center" color="text">
              ¡Hola de nuevo!
              <Box as="span" display="block" fontSize="md" fontWeight="normal">
                Accede a tu cuenta
              </Box>
            </Heading>

            <FormControl isInvalid={errors.email}>
              <Input
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
                    aria-label="toggle password"
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>

            <Flex justify="space-between" align="center" fontSize="sm">
              <Checkbox {...register("rememberMe")}>Recordarme</Checkbox>
              <Link color="accent" href="/forgot-password">
                ¿Olvidaste tu contraseña?
              </Link>
            </Flex>

           
            <Turnstile
              key={captchaKey} // ✅ fix: solo cambia cuando resetCaptcha() es llamado
              siteKey={siteKey}
              onSuccess={(token) => {
                setCaptchaToken(token);
                setCaptchaError(false);
              }}
              onError={() => {
                setCaptchaError(true);
                resetCaptcha();
              }}
              onExpire={() => {
                resetCaptcha();
              }}
            /> 
           

            {captchaError && (
              <Box color="red.500" fontSize="sm">
                Por favor, verifica que no eres un robot.
              </Box>
            )}

            <Button
              bg="accent"
              color="white"
              type="submit"
              isLoading={login.isPending}
              _hover={{ bg: "accent", opacity: 0.9 }}
              _active={{ bg: "accent", opacity: 0.8 }}
              _focus={{ bg: "accent" }}
            >
              Iniciar sesión
            </Button>
          </VStack>

          <Box mt={4}>
            <div className={styles.PoweredBy}>
              Desarrollado por:&nbsp;
              <img
                src="/assets/icons/logo-guruverso-g.png"
                alt="Logo"
                className={styles.LogoImg}
              />
            </div>
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
}