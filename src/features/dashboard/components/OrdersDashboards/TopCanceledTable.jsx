import {
  Box,
  Spinner,
  Text,
  useColorModeValue,
  Flex,
  Badge,
  VStack,
  Collapse,
  Divider,
  HStack,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";

const MotionBox = motion(Box);

export default function TopCanceledTable({ data, isLoading, isError }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const barBg = useColorModeValue("red.50", "red.900");
  const barColor = useColorModeValue("red.400", "red.500");
  const textColor = useColorModeValue("gray.700", "gray.300");
  const subTextColor = useColorModeValue("gray.500", "gray.400");

  const displayData = data?.slice(0, 5) || [];
  const maxUnidades = Math.max(
    ...(displayData.map((item) => item.Unidades_en_Pedidos_Cancelados) || [1])
  );

  const [openIndex, setOpenIndex] = useState(null);
  const toggleIndex = (i) => setOpenIndex(openIndex === i ? null : i);

  if (isLoading)
    return (
      <VStack spacing={3} py={10}>
        <Spinner size="lg" color="red.500" thickness="3px" />
        <Text color={subTextColor}>Cargando productos cancelados...</Text>
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

  if (!data || data.length === 0)
    return (
      <Box
        py={10}
        textAlign="center"
        bg={useColorModeValue("gray.50", "gray.700")}
        borderRadius="lg"
        border="2px dashed"
        borderColor={borderColor}
      >
        <Text fontSize="2xl" mb={2}>
          🎉
        </Text>
        <Text color={subTextColor}>No hay productos cancelados en este periodo</Text>
      </Box>
    );

  return (
    <Box
      bg={cardBg}
      borderRadius="xl"
      boxShadow="md"
      borderWidth="1px"
      borderColor={borderColor}
    >
      <VStack spacing={3} align="stretch">
        {displayData.map((item, index) => {
          const percentage =
            (item.Unidades_en_Pedidos_Cancelados / maxUnidades) * 100;
          const isTopThree = index < 3;
          const isOpen = openIndex === index;

          return (
            <MotionBox
              key={index}
              whileHover={{ scale: 1.01 }}
              onClick={() => toggleIndex(index)}
              cursor="pointer"
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              {/* Fila principal */}
              <Flex
                align="center"
                gap={3}
                p={2}
                borderRadius="md"
                borderWidth="1px"
                borderColor={borderColor}
                bg={useColorModeValue("gray.50", "gray.700")}
              >
                <Badge
                  colorScheme={isTopThree ? "red" : "gray"}
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
                    <Text
                      fontSize="xs"
                      noOfLines={1}
                      fontWeight="medium"
                      color={textColor}
                    >
                      {item.Descripcion_Producto}
                    </Text>
                    {isOpen ? (
                      <ChevronUpIcon boxSize={4} color={subTextColor} />
                    ) : (
                      <ChevronDownIcon boxSize={4} color={subTextColor} />
                    )}
                  </Flex>

                  {/* Barra de progreso */}
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
                      bgGradient={`linear(to-r, ${barColor}, red.500)`}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </Box>
                </Flex>

                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  minW="55px"
                  textAlign="right"
                  color="red.500"
                >
                  {item.Unidades_en_Pedidos_Cancelados}
                </Text>
              </Flex>

              {/* Panel desplegable de detalles */}
              <Collapse in={isOpen} animateOpacity>
                <Box
                  px={3}
                  py={2}
                  bg={useColorModeValue("gray.100", "gray.800")}
                  borderLeft="3px solid"
                  borderColor="red.400"
                  borderRadius="md"
                  mt={1}
                >
                  <VStack align="start" spacing={1} fontSize="xs">
                    <Text fontWeight="bold">{item.Descripcion_Producto}</Text>
                    <Text color={subTextColor}>Código: {item.Codigo_Producto}</Text>
                    <Divider />
                    <HStack justify="space-between" w="full">
                      <Text>Pedidos:</Text>
                      <Text>{item.Pedidos_Cancelados}</Text>
                    </HStack>
                    <HStack justify="space-between" w="full">
                      <Text>Promedio por pedido:</Text>
                      <Text>
                        {parseFloat(item.Promedio_por_Pedido_Cancelado).toFixed(1)}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              </Collapse>
            </MotionBox>
          );
        })}
      </VStack>
    </Box>
  );
}
