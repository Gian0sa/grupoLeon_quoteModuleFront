import {
  Box,
  Text,
  Flex,
  Image,
  useColorModeValue,
  Button,
  Grid,
} from "@chakra-ui/react";
import OrderStatusProgress from "./OrderStatusProgress";

export default function OrdersList({ detalle, onVerSeguimiento }) {
  const bgCard = useColorModeValue("white", "gray.800");

  return detalle.map((orden, idx) => {
    const color = orden.estadoMeta?.color || "gray.300";
    const estadoGeneral = orden.estadoMeta?.status || "Desconocido";

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
        <Grid templateColumns="1fr auto" gap={6} alignItems="center">
          {/* CONTENIDO PRINCIPAL */}
          <Box>
            {/* Nro de orden */}
            <Flex align="center" gap={2} mb={2}>
              <Image src="/src/assets/icons/etiqueta.png" boxSize="16px" />
              <Text fontSize="md" fontWeight="bold" color="green.600">
                #{orden.orden.numero}
              </Text>
            </Flex>

            {/* Cliente */}
            <Flex align="center" gap={2} mb={2}>
              <Image src="/src/assets/icons/ubicacion.png" boxSize="16px" />
              <Text fontSize="sm">{orden.cliente.nombre}</Text>
            </Flex>

            {/* Fecha */}
            <Flex align="center" gap={2} mb={4}>
              <Image src="/src/assets/icons/reloj.png" boxSize="16px" />
              <Text fontSize="sm">
                {orden.orden.fechaCreacion} - {orden.orden.horaCreacion}
              </Text>
            </Flex>

            {/* Asesor */}
            <Flex align="center" gap={3} mb={2}>
              <Box>
                <Text fontWeight="semibold" fontSize="sm" color="green.600"></Text>
                <Text>{orden.vendedor}</Text>
                <Text fontSize="xs">Asesor de ventas</Text>
              </Box>
            </Flex>
          </Box>

          {/* STATUS BAR */}
          <Box ml={4}>
            <OrderStatusProgress
              estadoMeta={orden.estadoMeta}
              estadoOrden={orden.estadoOrden}
            />
            <Button
              size="xs"
              mt={2}
              colorScheme={
               `${orden.estadoMeta.color}`
              }
              variant="outline"
              borderRadius="full"
            >
              {estadoGeneral}
            </Button>
          </Box>
        </Grid>
      </Box>
    );
  });
}
