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
  Image,
  Text,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { Turnstile } from "@marsidev/react-turnstile";
import { useForm } from "react-hook-form";
import { useAuthMutations } from "../hooks/mutations/authMutations";
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
  // Guarda el texto del error (o null). Antes era un booleano y siempre decía
  // "verifica que no eres un robot", incluso cuando la causa era de red.
  const [captchaError, setCaptchaError] = useState(null);
  // En local la clave está restringida al dominio de producción: Cloudflare
  // devuelve 600010 y el widget queda en "Verificando..." reintentando sin fin.
  // Con esto se oculta el recuadro roto en vez de dejarlo girando.
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
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
    // En local el widget no puede resolverse; recargarlo solo reinicia el bucle
    // de reintentos y borra el marcador que permite seguir trabajando.
    if (import.meta.env.DEV && captchaUnavailable) return;
    setCaptchaKey((prev) => prev + 1);
    setCaptchaToken(null);
  };

  const onSubmit = (data) => {
    if (!captchaToken) {
      setCaptchaError("Completa la verificación de seguridad para continuar.");
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
    <Flex direction={{ base: "column", md: "row" }} minH="100vh" w="full" bg={{ base: "gray.50", md: "gray.50" }}>
      {/* Left Panel: Login Form */}
      <Flex
        as="form"
        onSubmit={handleSubmit(onSubmit)}
        flex="1"
        direction="column"
        justify="center"
        align="center"
        p={{ base: 4, sm: 6, md: 12 }}
        bg="gray.50"
        position="relative"
        overflow="hidden"
      >
        {/* Mobile Split Header Background (Hidden on Desktop) */}
        <Box
          display={{ base: "block", md: "none" }}
          position="absolute"
          top="0"
          left="0"
          right="0"
          h="40vh"
          bgColor="#0f4a25"
          bgImage="url('/assets/frame-2-bg.png')"
          bgSize="cover"
          bgPosition="center"
          zIndex={0}
        />
        <Box
          display={{ base: "block", md: "none" }}
          position="absolute"
          top="0"
          left="0"
          right="0"
          h="40vh"
          bgGradient="radial(circle, transparent 20%, rgba(0, 30, 10, 0.4) 100%)"
          zIndex={0}
        />

        {/* Mobile Logo (Hidden on Desktop) */}
        <Image
          display={{ base: "block", md: "none" }}
          src="/assets/icons/logo-autopartes-w.png"
          alt="Autopartes s.a."
          maxW="220px"
          mb={{ base: 6, sm: 8 }}
          zIndex={1}
          filter="drop-shadow(0 4px 12px rgba(0,0,0,0.4))"
        />

        <Box
          zIndex={1}
          bg="white"
          p={{ base: 6, sm: 8 }}
          borderRadius="2xl"
          boxShadow="0 10px 40px rgba(0, 0, 0, 0.08)"
          w="full"
          maxW="420px"
        >
          <VStack spacing={5} w="full" align="stretch">
            <VStack spacing={2} align="center" textAlign="center">
              <Heading size="lg" color="gray.800" fontWeight="bold">
                ¡Hola de nuevo!
              </Heading>
              <Text color="gray.500" fontSize="sm">
                Accede a tu cuenta de Autopartes
              </Text>
            </VStack>

          <VStack spacing={4} align="stretch">
            <FormControl isInvalid={errors.email}>
              <Input
                placeholder="ejemplo@autopartes.pe"
                size="lg"
                bg="gray.100"
                border="none"
                _focus={{ bg: "white", boxShadow: "outline" }}
                borderRadius="xl"
                {...register("email", {
                  required: "El correo es requerido",
                })}
              />
              <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={errors.password}>
              <InputGroup size="lg">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  bg="gray.100"
                  border="none"
                  _focus={{ bg: "white", boxShadow: "outline" }}
                  borderRadius="xl"
                  {...register("password", {
                    required: "La contraseña es requerida",
                    minLength: { value: 6, message: "Mínimo 6 caracteres" },
                  })}
                />
                <InputRightElement h="full">
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

            <Flex justify="space-between" align="center" fontSize="sm" px={1}>
              <Checkbox colorScheme="green" {...register("rememberMe")}>
                Recordarme
              </Checkbox>
              <Link color="green.600" fontWeight="semibold" href="/forgot-password">
                ¿Olvidaste tu contraseña?
              </Link>
            </Flex>

            <Center w="full" overflow="hidden" display={captchaUnavailable ? "none" : "flex"}>
              <Turnstile
                key={captchaKey}
                siteKey={siteKey}
                // Sin reintentos en local: la clave nunca podrá validarse en
                // localhost y el bucle llena la consola de cientos de errores.
                options={{ retry: import.meta.env.DEV ? "never" : "auto" }}
                onSuccess={(token) => {
                  setCaptchaToken(token);
                  setCaptchaError(null);
                  setCaptchaUnavailable(false);
                }}
                onError={() => {
                  // En local la clave real está restringida al dominio de
                  // producción, así que el widget falla siempre. Se deja pasar
                  // el envío con un marcador para no bloquear el desarrollo;
                  // quien decide es el backend, que solo lo acepta si tiene
                  // TURNSTILE_DEV_BYPASS=true.
                  if (import.meta.env.DEV) {
                    setCaptchaToken("local-dev");
                    setCaptchaError(null);
                    setCaptchaUnavailable(true);
                    return;
                  }
                  // En producción un fallo del captcha es un fallo real: no se
                  // finge éxito, porque el backend lo rechazaría igual y el
                  // usuario vería un error confuso al enviar.
                  setCaptchaToken(null);
                  setCaptchaError(
                    "No se pudo cargar la verificación de seguridad. Revisa tu conexión y recarga la página."
                  );
                }}
                onExpire={() => {
                  resetCaptcha();
                }}
              />
            </Center>

            {captchaError && (
              <Box color="red.500" fontSize="sm" textAlign="center">
                {captchaError}
              </Box>
            )}

            <Button
              colorScheme="green"
              bg="green.500"
              _hover={{ bg: "green.600", transform: "translateY(-2px)", boxShadow: "lg" }}
              _active={{ bg: "green.700", transform: "translateY(0)" }}
              borderRadius="xl"
              size="lg"
              type="submit"
              isLoading={login.isPending}
              transition="all 0.2s"
              w="full"
              fontWeight="bold"
            >
              Iniciar sesión
            </Button>
          </VStack>

          <Flex mt={4} justify="center" align="center" fontSize="xs" color="gray.400">
            <Text as="span">Desarrollado por:&nbsp;</Text>
            <Box
              display="inline-block"
              position="relative"
              overflow="hidden"
              sx={{
                "@keyframes rtxShineFooter": {
                  "0%": { transform: "translateX(-100%)" },
                  "100%": { transform: "translateX(200%)" },
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "60%",
                  height: "100%",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent)",
                  transform: "skewX(-20deg)",
                  animation: "rtxShineFooter 2.5s infinite linear",
                },
              }}
            >
              <Image
                src="/assets/icons/logo-guruverso-g.png"
                alt="Logo"
                h="18px"
                objectFit="contain"
              />
            </Box>
          </Flex>
        </VStack>
      </Box>
    </Flex>

      {/* Right Panel: Green Background with Lightning Flash */}
      <Flex
        flex="1"
        display={{ base: "none", md: "flex" }}
        position="relative"
        bgColor="#0f4a25"
        bgImage="url('/assets/frame-2-bg.png')"
        bgSize="cover"
        bgPosition="center"
        justify="center"
        align="center"
        overflow="hidden"
      >
        {/* Dark Radial Overlay for Depth & Contrast */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bgGradient="radial(circle, transparent 20%, rgba(0, 30, 10, 0.4) 100%)"
        />



        {/* Static Logo */}
        <Image
          zIndex={1}
          src="/assets/icons/logo-autopartes-w.png"
          alt="Autopartes s.a."
          maxW={{ md: "320px", lg: "420px" }}
          w="100%"
          objectFit="contain"
          filter="drop-shadow(0 8px 24px rgba(0,0,0,0.4))"
        />
      </Flex>
    </Flex>
  );
}