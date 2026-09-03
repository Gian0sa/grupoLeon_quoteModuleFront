import { useEffect, useState, useRef } from "react";
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Image,
  Badge,
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Database, BarChart3, Sparkles, CheckCircle2 } from "lucide-react";

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

const STEPS = [
  {
    pct: 30,
    title: "Autenticando credenciales",
    desc: "Verificando permisos y sesión segura...",
    icon: ShieldCheck,
    badge: "Seguridad SSL",
    color: "emerald",
  },
  {
    pct: 65,
    title: "Conectando con SAP B1",
    desc: "Sincronizando catálogo y órdenes en tiempo real...",
    icon: Database,
    badge: "SAP Service Layer",
    color: "cyan",
  },
  {
    pct: 90,
    title: "Cargando métricas y cuentas",
    desc: "Preparando alertas de crédito, top productos y ventas...",
    icon: BarChart3,
    badge: "Analítica HANA",
    color: "teal",
  },
  {
    pct: 100,
    title: "¡Todo listo!",
    desc: "Ingresando al espacio de trabajo...",
    icon: Sparkles,
    badge: "Acceso Concedido",
    color: "green",
  },
];

export function LoginTransitionScreen({ username, isReady = true, onComplete }) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [progress, setProgress] = useState(20);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const completedRef = useRef(false);

  const cleanName = username
    ? username.charAt(0).toUpperCase() + username.slice(1).toLowerCase()
    : "Vendedor";

  // 1. Progresión temporal fluida mientras se espera respuesta de SAP B1
  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress((prev) => Math.max(prev, 55));
      setCurrentStepIdx(1);
    }, 450);

    const t2 = setTimeout(() => {
      setProgress((prev) => Math.max(prev, 85));
      setCurrentStepIdx(2);
    }, 1200);

    const tMin = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 800);

    // Timeout de seguridad máximo (12s) como salvaguarda en caso de red lenta
    const tMax = setTimeout(() => {
      triggerFinalize();
    }, 12000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(tMin);
      clearTimeout(tMax);
    };
  }, []);

  const triggerFinalize = () => {
    if (completedRef.current) return;
    completedRef.current = true;

    setProgress(100);
    setCurrentStepIdx(3);

    setTimeout(() => {
      if (typeof onComplete === "function") {
        onComplete();
      }
    }, 380);
  };

  // 2. Finalizar exactamente cuando todos los datos de SAP están listos
  useEffect(() => {
    if (isReady && minTimeElapsed && !completedRef.current) {
      triggerFinalize();
    }
  }, [isReady, minTimeElapsed]);

  const step = STEPS[currentStepIdx] || STEPS[0];
  const StepIcon = step.icon;

  return (
    <MotionFlex
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      zIndex={99999}
      direction="column"
      align="center"
      justify="center"
      bg="rgba(15, 23, 42, 0.65)"
      backdropFilter={{ base: "none", md: "blur(6px)" }}
      overflow="hidden"
      p={4}
      style={{ willChange: "opacity" }}
    >
      {/* Círculos de luz ambiental animados suaves */}
      <MotionBox
        position="absolute"
        w="450px"
        h="450px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0) 70%)"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        pointerEvents="none"
      />

      {/* Tarjeta de Carga Blanca Sólida y Nítida (Sin blur pesado) */}
      <MotionBox
        initial={{ y: 20, scale: 0.95, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        w="full"
        maxW="420px"
        bg="white"
        border="1px solid rgba(255, 255, 255, 0.8)"
        borderRadius="3xl"
        p={{ base: 6, sm: 8 }}
        boxShadow="0 25px 60px -12px rgba(0, 0, 0, 0.35), 0 0 30px rgba(16, 185, 129, 0.15)"
        textAlign="center"
        position="relative"
        zIndex={10}
        style={{ willChange: "transform, opacity", transform: "translate3d(0, 0, 0)" }}
      >
        {/* Logo con respiración suave */}
        <VStack spacing={3} mb={5}>
          <MotionBox
            animate={{
              y: [0, -3, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Image
              src="/assets/LogoAutopartes.png"
              alt="Autopartes S.A."
              h={{ base: "36px", sm: "42px" }}
              objectFit="contain"
              mx="auto"
              fallbackSrc="/assets/icons/logo-autopartes-w.png"
            />
          </MotionBox>

          <Box>
            <Text fontSize="lg" fontWeight="950" color="#0f172a" letterSpacing="tight">
              ¡Hola, {cleanName}!
            </Text>
            <Text fontSize="xs" color="#64748b" fontWeight="600" mt={0.5}>
              Preparando tu entorno de trabajo
            </Text>
          </Box>
        </VStack>

        {/* Icono de Paso Animado */}
        <Flex justify="center" mb={4}>
          <AnimatePresence mode="wait">
            <MotionBox
              key={currentStepIdx}
              initial={{ scale: 0.7, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.7, opacity: 0, rotate: 15 }}
              transition={{ duration: 0.25 }}
              p={3.5}
              borderRadius="2xl"
              bg="#ecfdf5"
              border="1.5px solid #a7f3d0"
              boxShadow="0 4px 14px rgba(16, 185, 129, 0.15)"
              color="#059669"
            >
              <StepIcon size={28} strokeWidth={2.4} />
            </MotionBox>
          </AnimatePresence>
        </Flex>

        {/* Texto del Paso Actual */}
        <Box minH="52px" mb={5}>
          <AnimatePresence mode="wait">
            <MotionBox
              key={currentStepIdx}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Text fontSize="sm" fontWeight="900" color="#0f172a" letterSpacing="wide">
                {step.title}
              </Text>
              <Text fontSize="xs" color="#64748b" fontWeight="600" mt={1} px={2} lineHeight="short">
                {step.desc}
              </Text>
            </MotionBox>
          </AnimatePresence>
        </Box>

        {/* Barra de Progreso con Gradiente y Resplandor */}
        <Box w="full" mb={3}>
          <Flex justify="space-between" align="center" mb={1.5}>
            <Badge
              borderRadius="full"
              px={2.5}
              py={0.5}
              fontSize="10px"
              fontWeight="800"
              bg="#ecfdf5"
              color="#047857"
              border="1px solid #6ee7b7"
              textTransform="uppercase"
            >
              {step.badge}
            </Badge>
            <Text fontSize="xs" fontWeight="950" color="#059669">
              {progress}%
            </Text>
          </Flex>

          <Box
            w="full"
            h="7px"
            bg="#e2e8f0"
            borderRadius="full"
            overflow="hidden"
            p="1px"
          >
            <MotionBox
              h="100%"
              borderRadius="full"
              bg="linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%)"
              boxShadow="0 0 10px rgba(16, 185, 129, 0.4)"
              initial={{ width: "20%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </Box>
        </Box>

        <HStack justify="center" spacing={1.5} pt={2}>
          <Box as={CheckCircle2} size={14} color="#059669" />
          <Text fontSize="11px" color="#64748b" fontWeight="700">
            Conexión encriptada de alta velocidad
          </Text>
        </HStack>
      </MotionBox>
    </MotionFlex>
  );
}
