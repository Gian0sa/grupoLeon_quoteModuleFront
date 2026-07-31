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
        
        {/* Mobile Top-to-Bottom Light Sweep (Restricted to Header) */}
        <Box
          display={{ base: "block", md: "none" }}
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="40vh"
          pointerEvents="none"
          overflow="hidden"
          zIndex={0}
        >
          <Box
            position="absolute"
            w="200%"
            h="250px"
            left="-50%"
            bg="linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15) 30%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0.15) 70%, transparent)"
            sx={{
              "@keyframes topDownSweepMobile": {
                "0%": { transform: "translateY(-300px) rotate(-25deg)", opacity: 0 },
                "5%": { opacity: 1 },
                "35%": { transform: "translateY(50vh) rotate(-25deg)", opacity: 1 },
                "40%": { opacity: 0 },
                "100%": { transform: "translateY(50vh) rotate(-25deg)", opacity: 0 },
              },
              animation: "topDownSweepMobile 8s infinite cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </Box>

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
          bg={{ base: "white", md: "whiteAlpha.900" }}
          backdropFilter={{ base: "none", md: "blur(16px)" }}
          p={{ base: 6, sm: 8 }}
          borderRadius="2xl"
          boxShadow="0 10px 40px rgba(0, 0, 0, 0.08)"
          w="full"
          maxW="420px"
        >
          <VStack spacing={5} align="stretch">
            <Box textAlign="center">
              <Heading size="lg" color="gray.800" fontWeight="extrabold" letterSpacing="tight">
                ¡Hola de nuevo!
              </Heading>
              <Text fontSize="sm" color="gray.500" mt={1}>
                Accede a tu cuenta de Autopartes
              </Text>
            </Box>

            <FormControl isInvalid={errors.email}>
              <Input
                variant="filled"
                bg="#eef2f6"
                _hover={{ bg: "#e2e8f0" }}
                _focus={{ bg: "white", borderColor: "green.500" }}
                borderRadius="xl"
                placeholder="Correo electrónico"
                size="lg"
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
              <InputGroup size="lg">
                <Input
                  variant="filled"
                  bg="#eef2f6"
                  _hover={{ bg: "#e2e8f0" }}
                  _focus={{ bg: "white", borderColor: "green.500" }}
                  borderRadius="xl"
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  {...register("password", {
                    required: "La contraseña es obligatoria",
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

            <Center w="full" overflow="hidden">
              <Turnstile
                key={captchaKey}
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
            </Center>

            {captchaError && (
              <Box color="red.500" fontSize="sm" textAlign="center">
                Por favor, verifica que no eres un robot.
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

          <Flex mt={6} justify="center" align="center" fontSize="xs" color="gray.400">
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

        {/* Top-to-Bottom Light Sweep */}
        <Box
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="100%"
          pointerEvents="none"
          overflow="hidden"
          zIndex={0}
        >
          <Box
            position="absolute"
            w="200%"
            h="250px"
            left="-50%"
            bg="linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15) 30%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0.15) 70%, transparent)"
            sx={{
              "@keyframes topDownSweep": {
                "0%": { transform: "translateY(-400px) rotate(-25deg)", opacity: 0 },
                "5%": { opacity: 1 },
                "35%": { transform: "translateY(120vh) rotate(-25deg)", opacity: 1 },
                "40%": { opacity: 0 },
                "100%": { transform: "translateY(120vh) rotate(-25deg)", opacity: 0 },
              },
              animation: "topDownSweep 8s infinite cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </Box>

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