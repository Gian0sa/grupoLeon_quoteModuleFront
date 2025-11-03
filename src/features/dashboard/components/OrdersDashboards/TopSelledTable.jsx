import {
  Box,
  Spinner,
  Text,
  useColorModeValue,
  Flex,
  Badge,
  VStack,
  HStack,
  Collapse,
  IconButton,
} from "@chakra-ui/react";
import { WarningIcon, ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { motion } from "framer-motion";
import { useState } from "react";

const MotionBox = motion(Box);

export default function TopSelledTable({ data, isLoading, isError }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const barBg = useColorModeValue("green.50", "green.900");
  const barColor = useColorModeValue("green.400", "green.500");
  const textColor = useColorModeValue("gray.700", "gray.300");
  const subTextColor = useColorModeValue("gray.500", "gray.400");

  const displayData = data?.slice(0, 5) || [];
  const maxValue = Math.max(...(displayData.map(i => i.Cantidad_Total_Pedida) || [1]));

  const formatCurrency = (v) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v || 0);

  const getColor = (tasa) => {
    if (tasa >= 90) return "green";
    if (tasa >= 70) return "yellow";
    return "red";
  };

  if (isLoading)
    return (
      <VStack py={10}>
        <Spinner size="lg" color="green.500" thickness="3px" />
        <Text color={subTextColor}>Cargando productos vendidos...</Text>
      </VStack>
    );

  if (isError)
    return (
      <Box
        py={6}
        px={4}
        bg={useColorModeValue("red.50", "red.900")}
        borderRadius="lg"
        borderLeft="4px solid"
        borderColor="red.500"
      >
        <Text color="red.600" fontWeight="medium">
          ⚠️ Error al cargar los datos
        </Text>
      </Box>
    );

  if (!data?.length)
    return (
      <Box
        py={10}
        textAlign="center"
        bg={useColorModeValue("gray.50", "gray.700")}
        borderRadius="lg"
        border="2px dashed"
        borderColor={borderColor}
      >
        <Text fontSize="2xl">📦</Text>
        <Text color={subTextColor}>No hay productos vendidos en este periodo</Text>
      </Box>
    );

  return (
    <Box bg={cardBg} borderRadius="xl" boxShadow="md" borderWidth="1px" borderColor={borderColor}>
      <VStack spacing={3} align="stretch">
        {displayData.map((item, index) => {
          const [open, setOpen] = useState(false);
          const percentage = (item.Cantidad_Total_Pedida / maxValue) * 100;
          const tasa = item.Tasa_Cumplimiento || 0;
          const colorScheme = getColor(tasa);
          const stockBajo = item.Stock_Actual_Almacen_014 < 10;
          const isTopThree = index < 3;

          return (
            <MotionBox
              key={item.Codigo_Producto}
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Box
                onClick={() => setOpen(!open)}
                cursor="pointer"
                p={2}
                borderRadius="md"
                borderWidth="1px"
                borderColor={borderColor}
                bg={useColorModeValue("gray.50", "gray.700")}
              >
                <Flex align="center" gap={3}>
                  <Badge
                    colorScheme={isTopThree ? "green" : "gray"}
                    fontSize="xs"
                    minW="28px"
                    textAlign="center"
                    borderRadius="md"
                  >
                    {index === 0
                      ? "🥇"
                      : index === 1
                      ? "🥈"
                      : index === 2
                      ? "🥉"
                      : `#${index + 1}`}
                  </Badge>

                  <Flex flex={1} direction="column" gap={1}>
                    <Flex justify="space-between" align="center">
                      <Text fontSize="xs" fontWeight="medium" color={textColor} noOfLines={1}>
                        {item.Descripcion_Producto}
                      </Text>
                      {stockBajo && <WarningIcon color="orange.400" boxSize={3} />}
                    </Flex>

                    <Box
                      h="18px"
                      bg={barBg}
                      borderRadius="md"
                      overflow="hidden"
                      borderWidth="1px"
                      borderColor={borderColor}
                    >
                      <MotionBox
                        h="100%"
                        w={`${percentage}%`}
                        bgGradient={`linear(to-r, ${barColor}, green.500)`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </Box>
                  </Flex>

                  <Flex direction="column" align="flex-end" minW={{ base: "80px", md: "100px" }}>
                    <Text fontSize="sm" fontWeight="bold" color="green.600">
                      {formatCurrency(item.Monto_Total_Vendido)}
                    </Text>
                    <Text fontSize="xs" color={subTextColor}>
                      {item.Cantidad_Total_Pedida} uds
                    </Text>
                  </Flex>

                  <IconButton
                    size="xs"
                    aria-label="expand"
                    icon={open ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    variant="ghost"
                    colorScheme="gray"
                  />
                </Flex>

                <Collapse in={open} animateOpacity>
                  <VStack align="start" spacing={1} mt={2} ml={2} fontSize="xs" color={subTextColor}>
                    <Text>Código: {item.Codigo_Producto}</Text>
                    <HStack spacing={3}>
                      <Text>Pedidos: {item.Numero_Pedidos}</Text>
                      <Text>Entregadas: {item.Cantidad_Entregada}</Text>
                      <Text>Pendientes: {item.Cantidad_Pendiente}</Text>
                    </HStack>
                    <Text>Monto: {formatCurrency(item.Monto_Total_Vendido)}</Text>
                    <Badge colorScheme={colorScheme}>
                      Cumplimiento {tasa.toFixed(0)}%
                    </Badge>
                    {stockBajo && (
                      <Badge colorScheme="orange" fontSize="xs">
                        Stock bajo
                      </Badge>
                    )}
                  </VStack>
                </Collapse>
              </Box>
            </MotionBox>
          );
        })}
      </VStack>
    </Box>
  );
}
