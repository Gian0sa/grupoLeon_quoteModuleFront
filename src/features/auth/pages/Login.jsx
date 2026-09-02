import {
  Center,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  Heading,
  Input,
  VStack,
  HStack,
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon, DownloadIcon } from "@chakra-ui/icons";
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { login } = useAuthMutations(); // ✅ fix: hooks antes del return condicional

  // 📲 ESTADO Y CAPTURA PARA INSTALACIÓN PWA (TIPO APK / ESCRITORIO)
  const getDevicePlatform = () => {
    if (typeof window === "undefined") return "android";
    const ua = (navigator.userAgent || navigator.vendor || window.opera || "").toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIos) return "ios";
    const isAndroid = /android/.test(ua);
    if (isAndroid) return "android";
    return "desktop";
  };

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(() => getDevicePlatform());
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Detectar si la app ya está instalada o ejecutándose en modo standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) {
      setIsAppInstalled(true);
    }

    // 2. Regla de 7 días: si el usuario cerró el aviso, no mostrarlo hasta cumplirse 7 días
    const lastDismissed = localStorage.getItem("pwa_install_dismissed_at");
    if (lastDismissed) {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(lastDismissed, 10) < SEVEN_DAYS_MS) {
        setIsDismissed(true);
      }
    }

    // 3. Capturar el evento de instalación nativo de navegadores
    if (window.deferredPwaPrompt) {
      setDeferredPrompt(window.deferredPwaPrompt);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.deferredPwaPrompt = e;
      setDeferredPrompt(e);
    };

    const handlePwaPromptReady = () => {
      if (window.deferredPwaPrompt) {
        setDeferredPrompt(window.deferredPwaPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      window.deferredPwaPrompt = null;
      toast({
        title: "🎉 ¡Aplicación Instalada!",
        description: "Autopartes S.A. ya está instalada en tu dispositivo.",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwaPromptReady", handlePwaPromptReady);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwaPromptReady", handlePwaPromptReady);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [toast]);

  const handleInstallApp = async () => {
    const promptEvent = deferredPrompt || window.deferredPwaPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
          setDeferredPrompt(null);
          window.deferredPwaPrompt = null;
          setIsAppInstalled(true);
        }
      } catch (err) {
        setSelectedPlatform(getDevicePlatform());
        setIsInstallModalOpen(true);
      }
    } else {
      setSelectedPlatform(getDevicePlatform());
      setIsInstallModalOpen(true);
    }
  };

  const handleDismissModal = () => {
    setIsInstallModalOpen(false);
    localStorage.setItem("pwa_install_dismissed_at", Date.now().toString());
  };

  useEffect(() => {
    if (isAuthenticated) {
      const savedRoute = localStorage.getItem("lastRoute");
      const target = savedRoute && savedRoute !== "/" && savedRoute !== "/register" ? savedRoute : "/dashboard";
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return (
      <Center height="100vh" bg="#051f11">
        <Spinner size="xl" color="emerald.400" thickness="4px" />
      </Center>
    );
  }

  const resetCaptcha = () => {
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
        onSuccess: () => {
          const savedRoute = localStorage.getItem("lastRoute");
          const target = savedRoute && savedRoute !== "/" && savedRoute !== "/register" ? savedRoute : "/dashboard";
          navigate(target, { replace: true });
        },
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

          resetCaptcha();
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

            {/* ========================================================================= */}
            {/* 📲 BOTÓN COMPACTO DE INSTALACIÓN PWA (Sale cada 7 días si no se instala)   */}
            {/* ========================================================================= */}
            {!isAppInstalled && !isDismissed && (
              <Button
                variant="ghost"
                colorScheme="green"
                color="green.800"
                bg="green.50"
                border="1.5px solid"
                borderColor="green.300"
                _hover={{ bg: "green.100", borderColor: "green.500", transform: "translateY(-1px)", boxShadow: "sm" }}
                _active={{ bg: "green.200" }}
                borderRadius="xl"
                size="sm"
                h={{ base: "36px", md: "32px" }}
                px={4}
                fontWeight="800"
                fontSize={{ base: "12px", md: "11px" }}
                leftIcon={<Image src="/icon.svg" h="16px" w="16px" borderRadius="sm" />}
                onClick={handleInstallApp}
                transition="all 0.2s"
                alignSelf="center"
                w={{ base: "full", sm: "auto" }}
              >
                {selectedPlatform === "ios"
                  ? "📲 Agregar a Pantalla de Inicio (iPhone / iPad)"
                  : selectedPlatform === "android"
                  ? "📲 Instalar Aplicativo en Android"
                  : "💻 Instalar App en tu Equipo"}
              </Button>
            )}
            {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 📲 MODAL ULTRA INTUITIVO CON GUÍA ESPECÍFICA SEGÚN EL DISPOSITIVO DEL USUARIO */}
      {/* ========================================================================= */}
      <Modal isOpen={isInstallModalOpen} onClose={handleDismissModal} isCentered size={{ base: "xs", sm: "md" }}>
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(5px)" />
        <ModalContent borderRadius="2xl" p={2} boxShadow="2xl">
          <ModalHeader textAlign="center" pb={2} pt={4}>
            <HStack justify="center" spacing={2.5}>
              <Image src="/icon.svg" h="32px" w="32px" borderRadius="lg" boxShadow="xs" />
              <Text fontWeight="900" fontSize="lg" color="green.900">
                Instalar Autopartes App
              </Text>
            </HStack>
            <Text color="gray.500" fontSize="12px" fontWeight="500" mt={1}>
              {selectedPlatform === "ios"
                ? "Sigue estos 3 pasos rápidos en Safari de tu iPhone / iPad"
                : selectedPlatform === "android"
                ? "Sigue estos pasos en Chrome o Edge de tu Android"
                : "Instala el aplicativo directamente en tu navegador"}
            </Text>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody px={4} py={2}>
            <VStack spacing={4} align="stretch">
              {/* Selector de Plataforma */}
              <HStack spacing={1} bg="gray.100" p={1} borderRadius="xl" justify="center">
                <Button
                  size="xs"
                  flex="1"
                  borderRadius="lg"
                  variant={selectedPlatform === "ios" ? "solid" : "ghost"}
                  colorScheme={selectedPlatform === "ios" ? "green" : "gray"}
                  bg={selectedPlatform === "ios" ? "green.600" : "transparent"}
                  color={selectedPlatform === "ios" ? "white" : "gray.600"}
                  fontWeight="700"
                  onClick={() => setSelectedPlatform("ios")}
                >
                  🍎 iPhone / iPad
                </Button>
                <Button
                  size="xs"
                  flex="1"
                  borderRadius="lg"
                  variant={selectedPlatform === "android" ? "solid" : "ghost"}
                  colorScheme={selectedPlatform === "android" ? "green" : "gray"}
                  bg={selectedPlatform === "android" ? "green.600" : "transparent"}
                  color={selectedPlatform === "android" ? "white" : "gray.600"}
                  fontWeight="700"
                  onClick={() => setSelectedPlatform("android")}
                >
                  🤖 Android
                </Button>
                <Button
                  size="xs"
                  flex="1"
                  borderRadius="lg"
                  variant={selectedPlatform === "desktop" ? "solid" : "ghost"}
                  colorScheme={selectedPlatform === "desktop" ? "green" : "gray"}
                  bg={selectedPlatform === "desktop" ? "green.600" : "transparent"}
                  color={selectedPlatform === "desktop" ? "white" : "gray.600"}
                  fontWeight="700"
                  onClick={() => setSelectedPlatform("desktop")}
                >
                  💻 PC / Mac
                </Button>
              </HStack>

              {/* Guía para iOS (iPhone / iPad) */}
              {selectedPlatform === "ios" && (
                <Box p={4} bg="blue.50" borderRadius="2xl" border="1.5px solid" borderColor="blue.200">
                  <VStack spacing={3.5} align="stretch">
                    <HStack spacing={3} align="flex-start">
                      <Flex w="24px" h="24px" borderRadius="full" bg="blue.600" color="white" align="center" justify="center" fontSize="12px" fontWeight="900" flexShrink={0} mt={0.5}>
                        1
                      </Flex>
                      <Box fontSize="12px" color="blue.900" fontWeight="600">
                        En <b>Safari</b>, toca el botón <b>Compartir</b> (el ícono de la flecha hacia arriba <b>⎋</b> en la barra inferior).
                      </Box>
                    </HStack>

                    <HStack spacing={3} align="flex-start">
                      <Flex w="24px" h="24px" borderRadius="full" bg="blue.600" color="white" align="center" justify="center" fontSize="12px" fontWeight="900" flexShrink={0} mt={0.5}>
                        2
                      </Flex>
                      <Box fontSize="12px" color="blue.900" fontWeight="600">
                        Desliza la lista hacia abajo y selecciona <b>"Agregar a inicio" (➕)</b>.
                      </Box>
                    </HStack>

                    <HStack spacing={3} align="flex-start">
                      <Flex w="24px" h="24px" borderRadius="full" bg="blue.600" color="white" align="center" justify="center" fontSize="12px" fontWeight="900" flexShrink={0} mt={0.5}>
                        3
                      </Flex>
                      <Box fontSize="12px" color="blue.900" fontWeight="600">
                        Asegúrate de que la casilla <b>"Abrir como app web"</b> esté activada y pulsa <b>"Agregar"</b> arriba a la derecha.
                      </Box>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {/* Guía para Android */}
              {selectedPlatform === "android" && (
                <Box p={4} bg="green.50" borderRadius="2xl" border="1.5px solid" borderColor="green.200">
                  <VStack spacing={3.5} align="stretch">
                    <HStack spacing={3} align="flex-start">
                      <Flex w="24px" h="24px" borderRadius="full" bg="green.700" color="white" align="center" justify="center" fontSize="12px" fontWeight="900" flexShrink={0} mt={0.5}>
                        1
                      </Flex>
                      <Box fontSize="12px" color="green.900" fontWeight="600">
                        Toca los tres puntos (<b>⋮</b>) en la esquina superior del navegador (Chrome o Edge).
                      </Box>
                    </HStack>

                    <HStack spacing={3} align="flex-start">
                      <Flex w="24px" h="24px" borderRadius="full" bg="green.700" color="white" align="center" justify="center" fontSize="12px" fontWeight="900" flexShrink={0} mt={0.5}>
                        2
                      </Flex>
                      <Box fontSize="12px" color="green.900" fontWeight="600">
                        Selecciona <b>"Instalar aplicación"</b> o <b>"Agregar a pantalla principal"</b>.
                      </Box>
                    </HStack>

                    <HStack spacing={3} align="flex-start">
                      <Flex w="24px" h="24px" borderRadius="full" bg="green.700" color="white" align="center" justify="center" fontSize="12px" fontWeight="900" flexShrink={0} mt={0.5}>
                        3
                      </Flex>
                      <Box fontSize="12px" color="green.900" fontWeight="600">
                        Presiona <b>"Instalar"</b> para confirmar. ¡Listo!
                      </Box>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {/* Guía para Computadora */}
              {selectedPlatform === "desktop" && (
                <Box p={4} bg="purple.50" borderRadius="2xl" border="1.5px solid" borderColor="purple.200">
                  <VStack spacing={3.5} align="stretch">
                    <HStack spacing={3} align="flex-start">
                      <Flex w="24px" h="24px" borderRadius="full" bg="purple.700" color="white" align="center" justify="center" fontSize="12px" fontWeight="900" flexShrink={0} mt={0.5}>
                        1
                      </Flex>
                      <Box fontSize="12px" color="purple.900" fontWeight="600">
                        Haz clic en el ícono de <b>Instalar (➕)</b> o monitor que aparece al final de la barra de direcciones arriba en Chrome o Edge.
                      </Box>
                    </HStack>

                    <HStack spacing={3} align="flex-start">
                      <Flex w="24px" h="24px" borderRadius="full" bg="purple.700" color="white" align="center" justify="center" fontSize="12px" fontWeight="900" flexShrink={0} mt={0.5}>
                        2
                      </Flex>
                      <Box fontSize="12px" color="purple.900" fontWeight="600">
                        Haz clic en <b>"Instalar"</b> en la ventana emergente para abrirla como aplicación independiente.
                      </Box>
                    </HStack>
                  </VStack>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter justify="center" gap={2} pt={2}>
            <Button variant="ghost" size="sm" borderRadius="xl" color="gray.500" onClick={handleDismissModal}>
              Recordar más tarde
            </Button>
            <Button colorScheme="green" bg="green.700" _hover={{ bg: "green.800" }} size="sm" borderRadius="xl" px={6} fontWeight="800" onClick={handleDismissModal}>
              ¡Entendido!
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* ========================================================================= */}
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