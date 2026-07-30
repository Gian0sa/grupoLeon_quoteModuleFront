import { useState, useMemo } from "react";
import {
  Box,
  Text,
  Flex,
  VStack,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Badge,
  Collapse,
  useDisclosure,
  Icon,
} from "@chakra-ui/react";
import {
  Search,
  MapPin,
  ShoppingCart,
  CreditCard,
  Package,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wifi,
  WifiOff,
  RefreshCw,
  DollarSign,
  Filter,
  Eye,
  MousePointerClick,
  LayoutDashboard,
  Bell,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "../../../components/BackButton";

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

/* ─────────── Paso visual individual ─────────── */
function StepItem({ number, title, description, icon: StepIcon, tip }) {
  return (
    <MotionBox
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: number * 0.08 }}
    >
      <Flex gap={3} align="flex-start">
        {/* Número del paso */}
        <Flex
          w="36px"
          h="36px"
          minW="36px"
          borderRadius="full"
          bg="linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
          color="white"
          align="center"
          justify="center"
          fontWeight="800"
          fontSize="sm"
          boxShadow="0 4px 12px rgba(22, 163, 74, 0.35)"
          position="relative"
        >
          {number}
        </Flex>

        <Box flex="1" pb={4}>
          <HStack spacing={2} mb={1}>
            {StepIcon && (
              <Box color="green.600">
                <StepIcon size={16} strokeWidth={2.5} />
              </Box>
            )}
            <Text fontWeight="700" fontSize="sm" color="gray.800">
              {title}
            </Text>
          </HStack>
          <Text fontSize="13px" color="gray.600" lineHeight="1.6">
            {description}
          </Text>
          {tip && (
            <Box
              mt={2}
              px={3}
              py={2}
              bg="emerald.50"
              borderRadius="xl"
              borderLeft="3px solid"
              borderLeftColor="green.400"
            >
              <HStack spacing={1.5}>
                <Box color="green.500" flexShrink={0}>
                  <CheckCircle2 size={14} />
                </Box>
                <Text fontSize="12px" color="green.700" fontWeight="600">
                  💡 {tip}
                </Text>
              </HStack>
            </Box>
          )}
        </Box>
      </Flex>
    </MotionBox>
  );
}

/* ─────────── Acordeón de pregunta individual ─────────── */
function FAQItem({ question, steps, warningNote }) {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <Box
      bg="white"
      borderRadius="2xl"
      border="1px solid"
      borderColor={isOpen ? "green.200" : "gray.100"}
      boxShadow={isOpen ? "0 8px 30px rgba(22, 163, 74, 0.1)" : "0 2px 8px rgba(0,0,0,0.04)"}
      overflow="hidden"
      transition="all 0.3s ease"
      _hover={{ borderColor: isOpen ? "green.300" : "gray.200", boxShadow: "0 4px 15px rgba(0,0,0,0.06)" }}
    >
      {/* Pregunta */}
      <Flex
        as="button"
        w="full"
        onClick={onToggle}
        align="center"
        justify="space-between"
        px={{ base: 4, md: 5 }}
        py={4}
        cursor="pointer"
        _hover={{ bg: "gray.50" }}
        transition="background 0.15s"
      >
        <HStack spacing={3} align="center" flex="1">
          <Box
            bg={isOpen ? "green.500" : "gray.200"}
            p={1.5}
            borderRadius="lg"
            transition="background 0.2s"
          >
            <HelpCircle size={16} color={isOpen ? "white" : "#6b7280"} />
          </Box>
          <Text
            fontWeight="700"
            fontSize={{ base: "13px", md: "14px" }}
            color={isOpen ? "green.700" : "gray.700"}
            textAlign="left"
            transition="color 0.2s"
          >
            {question}
          </Text>
        </HStack>
        <Box color={isOpen ? "green.500" : "gray.400"} flexShrink={0} ml={2}>
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </Box>
      </Flex>

      {/* Respuesta paso a paso */}
      <Collapse in={isOpen} animateOpacity>
        <Box px={{ base: 4, md: 5 }} pb={5} pt={1}>
          {/* Línea conectora vertical */}
          <Box
            position="relative"
            pl={4}
            _before={{
              content: '""',
              position: "absolute",
              left: "17px",
              top: "18px",
              bottom: "18px",
              width: "2px",
              bg: "green.100",
              borderRadius: "full",
            }}
          >
            <VStack spacing={0} align="stretch">
              {steps.map((step, idx) => (
                <StepItem key={idx} number={idx + 1} {...step} />
              ))}
            </VStack>
          </Box>

          {warningNote && (
            <Box
              mt={2}
              px={4}
              py={3}
              bg="orange.50"
              borderRadius="xl"
              border="1px solid"
              borderColor="orange.200"
            >
              <HStack spacing={2} align="flex-start">
                <Box color="orange.500" mt={0.5} flexShrink={0}>
                  <AlertTriangle size={16} />
                </Box>
                <Text fontSize="12.5px" color="orange.700" fontWeight="600" lineHeight="1.5">
                  ⚠️ {warningNote}
                </Text>
              </HStack>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

/* ─────────── Tarjeta de categoría (Responsive: pill en móvil, card en desktop) ─────────── */
function CategoryCard({ category, icon: CatIcon, color, count, isSelected, onClick }) {
  return (
    <MotionBox
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      cursor="pointer"
      bg={isSelected ? color : "white"}
      border="1.5px solid"
      borderColor={isSelected ? color : "gray.100"}
      borderRadius={{ base: "full", md: "2xl" }}
      px={{ base: 3, md: 4 }}
      py={{ base: 2, md: 3 }}
      minW={{ base: "auto", md: "120px" }}
      flexShrink={0}
      boxShadow={isSelected ? `0 6px 20px ${color}30` : "0 2px 8px rgba(0,0,0,0.04)"}
      transition="all 0.2s"
      _hover={{
        borderColor: isSelected ? color : "gray.200",
        boxShadow: isSelected ? `0 6px 20px ${color}30` : "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      {/* Mobile: horizontal pill */}
      <HStack spacing={2} display={{ base: "flex", md: "none" }}>
        <Box
          bg={isSelected ? "rgba(255,255,255,0.25)" : `${color}15`}
          p={1.5}
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <CatIcon size={14} color={isSelected ? "white" : color} strokeWidth={2.5} />
        </Box>
        <Text
          fontWeight="700"
          fontSize="11px"
          color={isSelected ? "white" : "gray.700"}
          whiteSpace="nowrap"
        >
          {category}
        </Text>
        <Badge
          bg={isSelected ? "rgba(255,255,255,0.3)" : "gray.100"}
          color={isSelected ? "white" : "gray.500"}
          borderRadius="full"
          fontSize="9px"
          px={1.5}
          ml={-0.5}
        >
          {count}
        </Badge>
      </HStack>

      {/* Desktop: vertical card */}
      <VStack spacing={1.5} display={{ base: "none", md: "flex" }}>
        <Box
          bg={isSelected ? "rgba(255,255,255,0.25)" : `${color}15`}
          p={2}
          borderRadius="xl"
        >
          <CatIcon size={20} color={isSelected ? "white" : color} strokeWidth={2.2} />
        </Box>
        <Text
          fontWeight="800"
          fontSize="11px"
          color={isSelected ? "white" : "gray.700"}
          textAlign="center"
          lineHeight="1.2"
        >
          {category}
        </Text>
        <Badge
          bg={isSelected ? "rgba(255,255,255,0.3)" : "gray.100"}
          color={isSelected ? "white" : "gray.500"}
          borderRadius="full"
          fontSize="9px"
          px={2}
        >
          {count} guías
        </Badge>
      </VStack>
    </MotionBox>
  );
}

/* ══════════════════════════════════════════════════════════
   DATOS: Preguntas organizadas por categoría con pasos
   ══════════════════════════════════════════════════════════ */
const FAQ_DATA = [
  {
    id: "visitas",
    category: "Visitas y Check-In",
    icon: MapPin,
    color: "#16a34a",
    questions: [
      {
        question: "¿Cómo registro mi Check-In al llegar a un cliente?",
        steps: [
          {
            title: "Abre el menú lateral",
            description: "Toca el ícono de las tres líneas (☰) en la esquina superior derecha de tu pantalla.",
            icon: LayoutDashboard,
          },
          {
            title: 'Selecciona "Registro de visitas"',
            description: 'En la sección APLICACIÓN, busca y toca la opción "Registro de visitas" con el ícono de ubicación.',
            icon: MapPin,
          },
          {
            title: "Permite el acceso a tu ubicación",
            description: "Tu navegador o celular te pedirá permiso para usar tu GPS. Presiona \"Permitir\" para continuar.",
            icon: MapPin,
            tip: "Si no aceptas la ubicación, el sistema no podrá registrar tu visita correctamente.",
          },
          {
            title: 'Presiona el botón "Check-In"',
            description: "Una vez que estés físicamente en el local del cliente, presiona el botón verde de Check-In. El sistema guardará tu ubicación, hora y fecha automáticamente.",
            icon: CheckCircle2,
          },
        ],
      },
      {
        question: "¿Qué hago si me quedo sin internet durante una visita?",
        steps: [
          {
            title: "No te preocupes, el registro se guarda localmente",
            description: "Si pierdes señal Wi-Fi o datos móviles, el sistema guardará tu Check-In o Check-Out en la memoria de tu dispositivo de forma segura.",
            icon: WifiOff,
          },
          {
            title: "Aparecerá un banner amarillo de alerta",
            description: 'En la pantalla de "Mis Visitas", verás un aviso amarillo indicando que tienes registros pendientes de subir al servidor.',
            icon: AlertTriangle,
          },
          {
            title: "Recupera tu conexión a internet",
            description: "Cuando vuelvas a tener señal (Wi-Fi o datos móviles), regresa a la pantalla de Mis Visitas.",
            icon: Wifi,
          },
          {
            title: 'Presiona "Sincronizar Todo" o "Reintentar"',
            description: "Toca el botón verde que aparece en el banner o en la tarjeta de la visita. El sistema subirá automáticamente tus registros pendientes en el orden correcto.",
            icon: RefreshCw,
            tip: "El sistema envía primero el Check-In y después el Check-Out para evitar errores.",
          },
        ],
        warningNote: "No cierres la aplicación mientras sincroniza. Espera a que desaparezca el banner amarillo.",
      },
      {
        question: "¿Por qué el sistema rechaza mi Check-Out?",
        steps: [
          {
            title: "Verifica que tu Check-In ya se subió al servidor",
            description: 'En "Mis Visitas", busca la tarjeta de tu visita actual. Si el Check-In tiene un borde rojo o dice "Pendiente", significa que aún no se ha subido.',
            icon: Eye,
          },
          {
            title: "Sincroniza primero el Check-In",
            description: 'Presiona el botón "Reintentar Sincronización" en la tarjeta con borde rojo. Espera a que cambie a verde (confirmado).',
            icon: RefreshCw,
          },
          {
            title: "Ahora realiza tu Check-Out normalmente",
            description: "Una vez confirmado el Check-In en el servidor, el sistema aceptará tu Check-Out sin problemas.",
            icon: CheckCircle2,
            tip: "El servidor siempre necesita el Check-In antes del Check-Out. Es una validación de seguridad.",
          },
        ],
      },
    ],
  },
  {
    id: "precios",
    category: "Precios y Productos",
    icon: ShoppingCart,
    color: "#2563eb",
    questions: [
      {
        question: "¿Cómo busco precios y stock de un producto?",
        steps: [
          {
            title: "Ingresa a Lista de Precios",
            description: 'Desde el Dashboard principal, toca el botón "Lista de Precios" (primer botón verde en la parte superior).',
            icon: MousePointerClick,
          },
          {
            title: "Escribe el nombre o código del producto",
            description: "En el campo de búsqueda superior, escribe el nombre, código o parte del nombre del producto que necesitas.",
            icon: Search,
          },
          {
            title: "Usa los filtros para refinar",
            description: 'Puedes seleccionar Marca, Tipo y Subtipo en los selectores de filtro. También puedes activar "Solo con Stock" para ver solo productos disponibles.',
            icon: Filter,
          },
          {
            title: 'Presiona "Buscar"',
            description: "Toca el botón de búsqueda. Los resultados aparecerán como tarjetas con el precio, stock disponible y detalles del producto.",
            icon: Search,
            tip: "Si necesitas más resultados, desplázate hacia abajo y presiona \"Cargar más\".",
          },
        ],
      },
      {
        question: "¿Cómo veo el tipo de cambio del dólar (USD)?",
        steps: [
          {
            title: "Revisa la barra superior del Dashboard",
            description: 'Al ingresar al sistema, en la esquina superior izquierda verás una etiqueta verde que dice "USD: X.XX".',
            icon: DollarSign,
          },
          {
            title: "El valor se actualiza automáticamente",
            description: "El tipo de cambio se obtiene en tiempo real desde SAP cada vez que inicias sesión o refrescas la página.",
            icon: RefreshCw,
            tip: "Si ves \"N/A\", presiona el botón de refrescar (⟲) para actualizar el valor.",
          },
        ],
      },
    ],
  },
  {
    id: "cobrar",
    category: "Cuentas por Cobrar",
    icon: CreditCard,
    color: "#dc2626",
    questions: [
      {
        question: "¿Cómo reviso las cuentas pendientes de mis clientes?",
        steps: [
          {
            title: 'Ingresa a "Cuentas por Cobrar"',
            description: "Desde el Dashboard, toca el tercer botón de acceso rápido o búscalo en el menú lateral.",
            icon: CreditCard,
          },
          {
            title: "Espera a que cargue la lista de deudas",
            description: "El sistema consultará SAP y mostrará todas las facturas pendientes con el monto en dólares, fecha de vencimiento y nombre del cliente.",
            icon: Eye,
          },
          {
            title: "Usa los filtros de estado",
            description: 'En la parte superior verás tres botones: "Todos", "Activos" y "Rechazados". Toca el que necesites para filtrar.',
            icon: Filter,
            tip: '"Activos" son facturas pendientes de cobro. "Rechazados" son facturas con discrepancias administrativas.',
          },
          {
            title: "Busca un cliente específico",
            description: "Usa la barra de búsqueda para escribir el nombre o código del cliente y encontrar sus facturas rápidamente.",
            icon: Search,
          },
        ],
      },
    ],
  },
  {
    id: "catalogo",
    category: "Catálogo y Equivalencias",
    icon: Package,
    color: "#7c3aed",
    questions: [
      {
        question: "¿Cómo busco un producto por código OEM o equivalente?",
        steps: [
          {
            title: "Ingresa al Catálogo de Productos",
            description: 'En el menú lateral, toca "Catálogo de productos" (necesitas tener el permiso habilitado).',
            icon: Package,
          },
          {
            title: "Escribe el código en el buscador",
            description: 'En el campo "Código / OEM", escribe el código del producto. Puede ser el código interno o cualquier código OEM del mercado.',
            icon: Search,
          },
          {
            title: 'Presiona "Buscar"',
            description: "El sistema mostrará la tarjeta del producto con su marca, categoría e imagen.",
            icon: MousePointerClick,
          },
          {
            title: "Revisa la sección de Equivalencias",
            description: 'Debajo del producto encontrarás la sección "RELACIONES DE PRODUCTO" con los cruces disponibles.',
            icon: ArrowRight,
            tip: '"CRUCE VENDEMOS" significa que lo tenemos en stock propio. "CRUCE EQUIVALENTE" es de otra marca compatible.',
          },
        ],
      },
      {
        question: "¿Qué significan las etiquetas VENDEMOS y EQUIVALENTE?",
        steps: [
          {
            title: '"VENDEMOS" = Producto propio en stock',
            description: "Significa que esta referencia la tenemos disponible en nuestro almacén y la comercializamos directamente.",
            icon: CheckCircle2,
          },
          {
            title: '"EQUIVALENTE" = Cruce compatible de otra marca',
            description: "Es un producto de otra marca que cumple la misma función y puede sustituir al que busca el cliente.",
            icon: ArrowRight,
            tip: "Siempre ofrece primero las opciones marcadas como VENDEMOS, ya que tienen mejor margen.",
          },
        ],
      },
    ],
  },
  {
    id: "general",
    category: "Uso General",
    icon: LayoutDashboard,
    color: "#ea580c",
    questions: [
      {
        question: "¿Cómo recibo notificaciones importantes del sistema?",
        steps: [
          {
            title: "Las notificaciones aparecen en tu Dashboard",
            description: "Cada vez que un administrador publica un aviso, aparecerá automáticamente en la sección de Notificaciones al final de tu pantalla principal.",
            icon: Bell,
          },
          {
            title: "Identifica el tipo de notificación por su color",
            description: "Azul = Información general. Amarillo = Aviso preventivo. Rojo = Alerta urgente que requiere tu atención inmediata.",
            icon: Eye,
            tip: "Revisa tus notificaciones cada vez que abras la aplicación para no perder avisos importantes.",
          },
        ],
      },
      {
        question: "¿Cómo actualizo mis datos o contraseña?",
        steps: [
          {
            title: "Abre el menú lateral (☰)",
            description: "Toca las tres líneas en la esquina superior derecha del Dashboard.",
            icon: LayoutDashboard,
          },
          {
            title: 'Selecciona "Actualizar perfil"',
            description: "En la sección CUENTA del menú, toca la primera opción con el ícono de persona.",
            icon: MousePointerClick,
          },
          {
            title: "Modifica tus datos y guarda",
            description: "Podrás cambiar tu email, nombre de usuario y contraseña. Recuerda presionar el botón de guardar cuando termines.",
            icon: CheckCircle2,
            tip: "Tu contraseña debe tener al menos 6 caracteres. Usa una combinación de letras y números.",
          },
        ],
      },
      {
        question: "¿Necesito estar conectado a internet para usar la app?",
        steps: [
          {
            title: "La mayoría de funciones requieren conexión",
            description: "Para consultar precios, cuentas por cobrar, catálogo y pedidos necesitas estar conectado a internet ya que los datos vienen de SAP en tiempo real.",
            icon: Wifi,
          },
          {
            title: "Las visitas funcionan sin internet",
            description: "El registro de Check-In y Check-Out se guarda localmente si no hay conexión. Cuando recuperes señal, se sincronizará automáticamente.",
            icon: WifiOff,
            tip: "Si trabajas en zonas con mala señal, registra tus visitas normalmente. El sistema las subirá cuando tengas internet.",
          },
        ],
      },
    ],
  },
];

/* ══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL: FAQPage
   ══════════════════════════════════════════════════════════ */
export function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    let data = FAQ_DATA;

    if (selectedCategory) {
      data = data.filter((cat) => cat.id === selectedCategory);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      data = data
        .map((cat) => ({
          ...cat,
          questions: cat.questions.filter(
            (q) =>
              q.question.toLowerCase().includes(term) ||
              q.steps.some(
                (s) =>
                  s.title.toLowerCase().includes(term) ||
                  s.description.toLowerCase().includes(term)
              )
          ),
        }))
        .filter((cat) => cat.questions.length > 0);
    }

    return data;
  }, [selectedCategory, searchTerm]);

  const totalQuestions = FAQ_DATA.reduce((sum, cat) => sum + cat.questions.length, 0);

  return (
    <Box bg="gray.50" minH="100vh" pb="100px">
      {/* ── Header ── */}
      <Box
        bg="linear-gradient(135deg, #14532d 0%, #166534 40%, #15803d 100%)"
        pt={4}
        pb={8}
        px={{ base: 4, md: 6 }}
        position="relative"
        overflow="hidden"
        _after={{
          content: '""',
          position: "absolute",
          bottom: "-20px",
          left: "0",
          right: "0",
          height: "40px",
          bg: "gray.50",
          borderTopRadius: "3xl",
        }}
      >
        <Flex maxW="900px" mx="auto" align="center" justify="space-between" mb={5}>
          <BackButton color="white" />
          <HStack spacing={2}>
            <Box color="white">
              <HelpCircle size={22} />
            </Box>
            <Text color="white" fontWeight="800" fontSize={{ base: "md", md: "lg" }}>
              Centro de Ayuda
            </Text>
          </HStack>
          <Box w="40px" />
        </Flex>

        <VStack maxW="900px" mx="auto" spacing={3}>
          <Text color="whiteAlpha.900" fontSize={{ base: "sm", md: "md" }} textAlign="center" fontWeight="500">
            Guías paso a paso para usar todas las funciones
          </Text>
          <Badge
            bg="whiteAlpha.200"
            color="white"
            borderRadius="full"
            px={3}
            py={1}
            fontSize="11px"
            fontWeight="700"
            backdropFilter="blur(8px)"
            border="1px solid rgba(255,255,255,0.15)"
          >
            📖 {totalQuestions} guías disponibles
          </Badge>
        </VStack>
      </Box>

      {/* ── Contenido Principal ── */}
      <Box maxW="900px" mx="auto" px={{ base: 4, md: 6 }} mt={-2} position="relative" zIndex={2}>
        {/* Barra de búsqueda */}
        <InputGroup
          size="lg"
          mb={5}
          bg="white"
          borderRadius="2xl"
          boxShadow="0 4px 20px rgba(0,0,0,0.06)"
          border="1.5px solid"
          borderColor="gray.100"
          _focusWithin={{ borderColor: "green.300", boxShadow: "0 4px 20px rgba(22, 163, 74, 0.12)" }}
          transition="all 0.2s"
        >
          <InputLeftElement pointerEvents="none" h="full" pl={4}>
            <Search size={18} color="#9ca3af" />
          </InputLeftElement>
          <Input
            placeholder="Buscar: check-in, precios, stock, factura..."
            border="none"
            borderRadius="2xl"
            _focus={{ boxShadow: "none" }}
            _placeholder={{ color: "gray.400", fontSize: "14px" }}
            fontSize="14px"
            pl={12}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        {/* Categorías horizontales */}
        <Flex
          gap={{ base: 2, md: 3 }}
          mb={6}
          overflowX="auto"
          pb={2}
          css={{
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
          }}
        >
          <MotionBox
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedCategory(null)}
            cursor="pointer"
            bg={!selectedCategory ? "gray.800" : "white"}
            border="1.5px solid"
            borderColor={!selectedCategory ? "gray.800" : "gray.100"}
            borderRadius={{ base: "full", md: "2xl" }}
            px={{ base: 3, md: 4 }}
            py={{ base: 2, md: 3 }}
            flexShrink={0}
            minW={{ base: "auto", md: "80px" }}
            textAlign="center"
            boxShadow={!selectedCategory ? "0 6px 20px rgba(0,0,0,0.15)" : "0 2px 8px rgba(0,0,0,0.04)"}
          >
            {/* Mobile pill */}
            <HStack spacing={2} display={{ base: "flex", md: "none" }}>
              <Box
                bg={!selectedCategory ? "whiteAlpha.200" : "gray.100"}
                p={1.5}
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Eye size={14} color={!selectedCategory ? "white" : "#6b7280"} />
              </Box>
              <Text
                fontWeight="700"
                fontSize="11px"
                color={!selectedCategory ? "white" : "gray.700"}
                whiteSpace="nowrap"
              >
                Todas
              </Text>
              <Badge
                bg={!selectedCategory ? "whiteAlpha.300" : "gray.100"}
                color={!selectedCategory ? "white" : "gray.500"}
                borderRadius="full"
                fontSize="9px"
                px={1.5}
              >
                {totalQuestions}
              </Badge>
            </HStack>

            {/* Desktop card */}
            <VStack spacing={1.5} display={{ base: "none", md: "flex" }}>
              <Box
                bg={!selectedCategory ? "whiteAlpha.200" : "gray.100"}
                p={2}
                borderRadius="xl"
              >
                <Eye size={20} color={!selectedCategory ? "white" : "#6b7280"} />
              </Box>
              <Text
                fontWeight="800"
                fontSize="11px"
                color={!selectedCategory ? "white" : "gray.700"}
              >
                Todas
              </Text>
              <Badge
                bg={!selectedCategory ? "whiteAlpha.300" : "gray.100"}
                color={!selectedCategory ? "white" : "gray.500"}
                borderRadius="full"
                fontSize="9px"
                px={2}
              >
                {totalQuestions}
              </Badge>
            </VStack>
          </MotionBox>

          {FAQ_DATA.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat.category}
              icon={cat.icon}
              color={cat.color}
              count={cat.questions.length}
              isSelected={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            />
          ))}
        </Flex>

        {/* Preguntas */}
        <AnimatePresence mode="wait">
          {filteredData.length > 0 ? (
            <VStack spacing={5} align="stretch">
              {filteredData.map((cat) => (
                <MotionBox
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Encabezado de categoría */}
                  <HStack spacing={2} mb={3}>
                    <Box
                      bg={`${cat.color}15`}
                      p={1.5}
                      borderRadius="lg"
                    >
                      <cat.icon size={16} color={cat.color} strokeWidth={2.5} />
                    </Box>
                    <Text fontWeight="800" fontSize="sm" color="gray.700" textTransform="uppercase" letterSpacing="wide">
                      {cat.category}
                    </Text>
                    <Box h="1px" flex="1" bg="gray.200" />
                  </HStack>

                  <VStack spacing={3} align="stretch">
                    {cat.questions.map((q, idx) => (
                      <FAQItem key={idx} question={q.question} steps={q.steps} warningNote={q.warningNote} />
                    ))}
                  </VStack>
                </MotionBox>
              ))}
            </VStack>
          ) : (
            <MotionBox
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              textAlign="center"
              py={16}
            >
              <Box color="gray.300" mb={4}>
                <Search size={48} />
              </Box>
              <Text fontWeight="700" fontSize="lg" color="gray.500" mb={1}>
                No se encontraron resultados
              </Text>
              <Text fontSize="sm" color="gray.400">
                Intenta con otras palabras clave
              </Text>
            </MotionBox>
          )}
        </AnimatePresence>

        {/* Banner de contacto */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          mt={8}
          bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
          borderRadius="2xl"
          p={{ base: 5, md: 6 }}
          color="white"
          position="relative"
          overflow="hidden"
          boxShadow="0 12px 40px rgba(20, 83, 45, 0.25)"
        >
          <Box
            position="absolute"
            top="-20px"
            right="-20px"
            w="100px"
            h="100px"
            borderRadius="full"
            bg="whiteAlpha.100"
          />
          <VStack spacing={3} position="relative" zIndex={2}>
            <HStack spacing={2}>
              <MessageCircle size={20} />
              <Text fontWeight="800" fontSize="md">
                ¿No encontraste tu respuesta?
              </Text>
            </HStack>
            <Text fontSize="sm" color="whiteAlpha.800" textAlign="center" maxW="400px">
              Contacta al equipo de soporte técnico para recibir ayuda personalizada.
            </Text>
            <HStack
              as="a"
              href="https://wa.me/51921372398"
              target="_blank"
              bg="whiteAlpha.200"
              backdropFilter="blur(8px)"
              border="1px solid rgba(255,255,255,0.2)"
              borderRadius="full"
              px={5}
              py={2.5}
              cursor="pointer"
              _hover={{ bg: "whiteAlpha.300", transform: "translateY(-2px)" }}
              transition="all 0.2s"
              spacing={2}
            >
              <MessageCircle size={16} />
              <Text fontWeight="700" fontSize="sm">
                Escribir por WhatsApp
              </Text>
            </HStack>
          </VStack>
        </MotionBox>
      </Box>
    </Box>
  );
}
