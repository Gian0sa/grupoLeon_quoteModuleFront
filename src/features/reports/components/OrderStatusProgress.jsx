import { Box, CircularProgress, CircularProgressLabel, Text, VStack } from "@chakra-ui/react";

// Mapea los estados a un porcentaje de progreso
const getProgressData = (estado) => {
  const estadoMap = {
    "Pedido sin preparar": { percent: 20, color: "gray" , estate : "En progreso" },
    "Pedido parcial": { percent: 40, color: "green" , estate : "En progreso" },
    "Pedido preparado": { percent: 60, color: "green" , estate : "En progreso" },
    "Finalizado con pendientes": { percent: 80, color: "green" , estate : "Completado"},
    "Pedido finalizado": { percent: 100, color: "green", estate : "Completado" },
    "Pedido anulado": { percent: 100, color: "red", estate : "Cancelado" },
  };

  return estadoMap[estado] || { percent: 0, color: "gray" };
};

export default function OrderStatusProgressCircle({ estado }) {
  const { percent, color } = getProgressData(estado);

  return (
    <VStack spacing={1}>
      <CircularProgress
        value={percent}
        size="100px"
        thickness="6px"
        color={`${color}.400`}
      >
        <CircularProgressLabel fontWeight="bold">{percent}%</CircularProgressLabel>
      </CircularProgress>
      <Text fontSize="xs" color="gray.600">{estado}</Text>
    </VStack>
  );
}