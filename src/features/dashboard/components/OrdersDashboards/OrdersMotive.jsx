import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Spinner, 
  Center, 
  Badge,
  Flex,
  useColorModeValue
} from "@chakra-ui/react";
import { useState } from "react";

export default function OrdersMotive({ ordersMotive, isLoading, isError }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.700", "gray.300");
  const subtextColor = useColorModeValue("gray.500", "gray.400");

  // Paleta de colores vibrantes
  const colors = [
    "#EF4444", // Rojo
    "#F97316", // Naranja
    "#F59E0B", // Amarillo/Ámbar
    "#8B5CF6", // Púrpura
    "#EC4899", // Rosa
    "#3B82F6", // Azul
    "#06B6D4", // Cyan
    "#10B981", // Verde
  ];

  if (isLoading) {
    return (
      <Center py={8}>
        <VStack spacing={3}>
          <Spinner size="lg" color="orange.500" thickness="3px" />
          <Text fontSize="sm" color="gray.500">Cargando motivos...</Text>
        </VStack>
      </Center>
    );
  }

  if (isError) {
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
          ⚠️ Error al cargar los motivos
        </Text>
      </Box>
    );
  }

  if (!ordersMotive || ordersMotive.length === 0) {
    return (
      <Box 
        py={8} 
        textAlign="center"
        bg={useColorModeValue("gray.50", "gray.700")}
        borderRadius="lg"
        borderStyle="dashed"
        borderWidth="2px"
        borderColor={useColorModeValue("gray.300", "gray.600")}
      >
        <Text fontSize="2xl" mb={2}>✅</Text>
        <Text color="gray.500" fontSize="sm">
          No hay cancelaciones en este periodo
        </Text>
      </Box>
    );
  }

  // Calcular total y porcentajes
  const total = ordersMotive.reduce((sum, item) => sum + (item.ordersCount || 0), 0);
  const dataWithPercentages = ordersMotive.map((item, index) => ({
    ...item,
    percentage: ((item.ordersCount / total) * 100).toFixed(1),
    color: colors[index % colors.length]
  }));

  // Crear segmentos del círculo
  let currentAngle = -90; // Empezar desde arriba
  const segments = dataWithPercentages.map((item) => {
    const angle = (item.ordersCount / total) * 360;
    const segment = {
      ...item,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      angle: angle
    };
    currentAngle += angle;
    return segment;
  });

  // Función para crear path del segmento
  const createArc = (startAngle, endAngle, radius = 90) => {
    const start = polarToCartesian(100, 100, radius, endAngle);
    const end = polarToCartesian(100, 100, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", 100, 100,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const hoveredItem = hoveredIndex !== null ? segments[hoveredIndex] : null;

  return (
    <Flex 
      gap={8} 
      align="center" 
      justify="center"
      direction={{ base: "column", md: "row" }}
      minH="300px"
    >
      
      {/* Gráfico de Torta */}
      <Box position="relative">
        <svg viewBox="0 0 200 200" width="280" height="280">
          {segments.map((segment, index) => (
            <path
              key={index}
              d={createArc(segment.startAngle, segment.endAngle)}
              fill={segment.color}
              opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.3}
              stroke="white"
              strokeWidth="3"
              cursor="pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                transform: hoveredIndex === index ? 'scale(1.08)' : 'scale(1)',
                transformOrigin: '100px 100px',
                transition: 'all 0.3s ease',
                filter: hoveredIndex === index ? 'brightness(1.1)' : 'none'
              }}
            />
          ))}
          
          {/* Círculo central */}
          <circle cx="100" cy="100" r="55" fill={cardBg} />
          
          {/* Texto central */}
          <text
            x="100"
            y="95"
            textAnchor="middle"
            fontSize="24"
            fontWeight="bold"
            fill={textColor}
          >
            {total}
          </text>
          <text
            x="100"
            y="112"
            textAnchor="middle"
            fontSize="11"
            fill={subtextColor}
          >
            órdenes
          </text>
        </svg>
      </Box>

      {/* Panel de detalles al hacer hover */}
      <Box 
        w={{ base: "100%", md: "350px" }}
        minH="200px"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {hoveredItem ? (
          <VStack 
            spacing={4} 
            align="stretch"
            p={5}
            bg={useColorModeValue("gray.50", "gray.700")}
            borderRadius="xl"
            borderWidth="2px"
            borderColor={hoveredItem.color}
            w="100%"
            transition="all 0.3s"
            boxShadow="lg"
          >
            <HStack spacing={3}>
              <Box
                w="20px"
                h="20px"
                borderRadius="md"
                bg={hoveredItem.color}
                flexShrink={0}
              />
              <Text fontSize="md" fontWeight="bold" lineHeight="1.3">
                {hoveredItem.cancellationReason}
              </Text>
            </HStack>

            <VStack spacing={3} align="stretch">
              <Flex justify="space-between" align="center">
                <Text fontSize="sm" color={subtextColor}>
                  Total de órdenes
                </Text>
                <Badge 
                  colorScheme="orange" 
                  fontSize="md" 
                  px={3} 
                  py={1}
                  borderRadius="md"
                >
                  {hoveredItem.ordersCount}
                </Badge>
              </Flex>

              <Flex justify="space-between" align="center">
                <Text fontSize="sm" color={subtextColor}>
                  Porcentaje del total
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color={hoveredItem.color}>
                  {hoveredItem.percentage}%
                </Text>
              </Flex>
            </VStack>

            <Box 
              pt={3} 
              borderTopWidth="1px" 
              borderColor={useColorModeValue("gray.300", "gray.600")}
            >
              <VStack spacing={2} align="stretch" fontSize="sm">
                <Flex justify="space-between">
                  <Text color={subtextColor}>👥 Clientes afectados</Text>
                  <Text fontWeight="medium">{hoveredItem.affectedClients}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text color={subtextColor}>📦 Unidades canceladas</Text>
                  <Text fontWeight="medium">
                    {hoveredItem.cancelledUnits?.toLocaleString() || 0}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text color={subtextColor}>🏷️ Productos diferentes</Text>
                  <Text fontWeight="medium">{hoveredItem.differentProducts}</Text>
                </Flex>
              </VStack>
            </Box>
          </VStack>
        ) : (
          <VStack spacing={3} p={8} opacity={0.5}>
            <Text fontSize="3xl">👆</Text>
            <Text fontSize="sm" color={subtextColor} textAlign="center">
              Pasa el mouse sobre un segmento
              <br />
              para ver los detalles
            </Text>
          </VStack>
        )}
      </Box>
    </Flex>
  );
}