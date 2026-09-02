import {
  Box,
  Text,
  Flex,
  HStack,
  VStack,
  Badge,
  Button,
  SimpleGrid,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  Tag,
  Clock,
  ShoppingBag,
  Package,
  Receipt,
  XCircle,
  Building2,
  User,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useHasAccess } from "../../../shared/utils/permissions";

const MotionBox = motion(Box);

const STATUS_ICON_MAP = {
  "order.png": ShoppingBag,
  "package.png": Package,
  "factura.png": Receipt,
  "cancel.png": XCircle,
};

export default function OrdersList({ detalle = [], onVerSeguimiento, searchTerm = "", onClearSearch }) {
  const bgCard = useColorModeValue("white", "gray.800");
  const hasAccess = useHasAccess();

  if (!Array.isArray(detalle) || detalle.length === 0) {
    return (
      <Box p={8} bg="white" borderRadius="2xl" border="1.5px dashed" borderColor="gray.200" textAlign="center" my={4}>
        <VStack spacing={2}>
          <Text color="gray.700" fontWeight="800" fontSize="md">
            {searchTerm ? `🔍 No se encontraron órdenes para "${searchTerm}"` : "No hay órdenes para mostrar"}
          </Text>
          <Text color="gray.500" fontSize="sm">
            {searchTerm ? "Intenta buscar por otro término (RUC, DNI, nombre o N° de orden) o limpia la búsqueda." : "No se registraron pedidos en este período con los filtros aplicados."}
          </Text>
          {searchTerm && onClearSearch && (
            <Button size="sm" colorScheme="green" variant="outline" borderRadius="full" mt={2} onClick={onClearSearch}>
              Limpiar búsqueda
            </Button>
          )}
        </VStack>
      </Box>
    );
  }

  const formatHora = (docTime) => {
    if (!docTime) return "";
    const str = docTime.toString().padStart(4, "0");
    const horas = str.substring(0, 2);
    const minutos = str.substring(2, 4);
    return `${horas}:${minutos}`;
  };

  return (
    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 3.5, md: 4.5 }} w="full" my={2}>
      {detalle.map((orden, idx) => {
        const numeroOrden = orden.DocNum;
        const fecha = new Date(orden.DocDate).toLocaleDateString("es-PE", {
          timeZone: "UTC",
        });
        const hora = orden.DocTime;
        const cliente = orden.CardName;
        const vendedor = orden.NameVendedor ?? "Sin vendedor";

        const statusInfo = orden.StatusInfo || {
          name: "Estado desconocido",
          color: "gray.400",
          progress: 0,
          icon: "order.png",
        };

        // Extraer color hex o token
        const rawColor = statusInfo.color || "#10b981";
        const isGreen = rawColor.includes("green") || rawColor === "#10b981";
        const themeColor = isGreen ? "#10b981" : rawColor.includes("red") ? "#ef4444" : "#3b82f6";
        const estadoGeneral = statusInfo.name;
        const progress = statusInfo.progress || 0;
        const StatusIcon = STATUS_ICON_MAP[statusInfo.icon] || ShoppingBag;

        return (
          <MotionBox
            key={orden.DocEntry || idx}
            whileHover={{ y: -3, boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}
            whileTap={{ scale: 0.99 }}
            bg={bgCard}
            borderRadius="2xl"
            p={{ base: 4, md: 5 }}
            border="1px solid"
            borderColor="gray.100"
            boxShadow="0 4px 15px rgba(0,0,0,0.03)"
            cursor="pointer"
            onClick={() => onVerSeguimiento(orden)}
            position="relative"
            overflow="hidden"
            display="flex"
            flexDirection="column"
            justifyContent="space-between"
            transition={{ duration: 0.2 }}
          >
            {/* Barra superior de acento con color del estado */}
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              h="4px"
              bg={themeColor}
            />

            {/* CABECERA: Número de orden + Badge de Estado */}
            <Flex justify="space-between" align="center" mb={3} gap= {2}>
              <HStack spacing={2} minW={0}>
                <Box p={1.5} borderRadius="lg" bg={`${themeColor}15`}>
                  <Tag size={16} color={themeColor} strokeWidth={2.5} />
                </Box>
                <Text textStyle="cardTitle" color="gray.800">
                  #{numeroOrden}
                </Text>
              </HStack>

              <Badge
                bg={`${themeColor}15`}
                color={themeColor}
                borderRadius="full"
                px={3}
                py={1}
                fontSize="11px"
                fontWeight="700"
                display="flex"
                alignItems="center"
                gap={1.5}
                border="1px solid"
                borderColor={`${themeColor}30`}
                flexShrink={0}
              >
                <StatusIcon size={13} color={themeColor} strokeWidth={2.5} />
                <Text noOfLines={1}>{estadoGeneral}</Text>
              </Badge>
            </Flex>

            {/* DETALLES DEL CLIENTE Y FECHA */}
            <VStack align="stretch" spacing={2} mb={4}>
              <HStack spacing={2.5} align="flex-start" minW={0}>
                <Box color="gray.400" mt={0.5} flexShrink={0}>
                  <Building2 size={16} />
                </Box>
                <Text textStyle="cardTitle" color="gray.700">
                  {cliente}
                </Text>
              </HStack>

              <HStack spacing={2.5} align="center">
                <Box color="gray.400" flexShrink={0}>
                  <Clock size={15} />
                </Box>
                <Text fontSize="13px" color="gray.500" fontWeight="500">
                  {fecha} - {formatHora(hora)}
                </Text>
              </HStack>

              {hasAccess("GET:/sellers") && (
                <HStack spacing={2.5} align="center">
                  <Box color="gray.400" flexShrink={0}>
                    <User size={15} />
                  </Box>
                  <Text fontSize="12.5px" color="gray.600" fontWeight="600">
                    {vendedor} <Text as="span" color="gray.400" fontWeight="normal">(Asesor)</Text>
                  </Text>
                </HStack>
              )}
            </VStack>

            {/* BARRA INFERIOR DE PROGRESO + ACCIÓN DE SEGUIMIENTO */}
            <Box pt={3} borderTop="1px solid" borderColor="gray.100">
              <Flex justify="space-between" align="center" mb={1.5}>
                <HStack spacing={1.5}>
                  <CheckCircle2 size={13} color={themeColor} />
                  <Text fontSize="12px" fontWeight="700" color="gray.600">
                    Progreso: {progress}%
                  </Text>
                </HStack>

                <HStack spacing={1} color="emerald.600" fontWeight="700" fontSize="12px">
                  <Text>Ver seguimiento</Text>
                  <ChevronRight size={14} />
                </HStack>
              </Flex>

              {/* Progress bar visual */}
              <Box w="full" h="6px" bg="gray.100" borderRadius="full" overflow="hidden">
                <Box
                  h="full"
                  bg={themeColor}
                  borderRadius="full"
                  w={`${progress}%`}
                  transition="width 0.4s ease-out"
                />
              </Box>
            </Box>
          </MotionBox>
        );
      })}
    </SimpleGrid>
  );
}
