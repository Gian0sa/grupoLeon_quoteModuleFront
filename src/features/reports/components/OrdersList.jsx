import {
  Box,
  Text,
  Flex,
  Image,
  useColorModeValue,
} from "@chakra-ui/react";
import OrderStatusProgress from "./OrderStatusProgress";

const statusColors = {
  "Pedido sin preparar": "gray.300",
  "Pedido preparado parcialmente": "yellow.300",
  "Pedido preparado": "green.300",
  "Pedido finalizado": "green.400",
  "Finalizado con pendientes": "yellow.400",
  "Pedido anulado": "red.300",
};

export default function OrdersList({ detalle, onVerSeguimiento }) {
  const bgCard = useColorModeValue("white", "gray.800");
  const borderColorDefault = useColorModeValue("gray.200", "gray.700");

  return detalle.map((orden, idx) => {
    const color = statusColors[orden.estadoOrden] || borderColorDefault;

    return (
      <Box
        key={idx}
        bg={bgCard}
        p={5}
        borderRadius="xl"
        shadow="md"
        mb={4}
        borderLeft="6px solid"
        borderColor={color}
        transition="all 0.2s"
        _hover={{ transform: "scale(1.01)", shadow: "lg", cursor: "pointer" }}
        onClick={() => onVerSeguimiento(orden)}
      >
        <Flex align="center" justify="space-between" mb={3}>
          <Box>
            {/* Cliente */}
            <Flex align="center" gap={2} mb={1}>
              <Image src="/src/assets/icons/usuario.png" boxSize="16px" alt="Cliente" />
              <Text fontWeight="bold" fontSize="md">
                {orden.cliente.nombre}
              </Text>
            </Flex>

            {/* Orden */}
            <Flex align="center" gap={2} mb={1}>
              <Image src="/src/assets/icons/orden.png" boxSize="16px" alt="Orden" />
              <Text fontSize="sm" color="gray.600">
                #{orden.orden.numero}
              </Text>
            </Flex>

            {/* Fecha */}
            <Flex align="center" gap={2}>
              <Image src="/src/assets/icons/calendario.png" boxSize="16px" alt="Fecha" />
              <Text fontSize="sm" color="gray.600">
                {orden.orden.fechaCreacion}
              </Text>
            </Flex>
          </Box>

          <OrderStatusProgress estado={orden.estadoOrden} />
        </Flex>
      </Box>
    );
  });
}
