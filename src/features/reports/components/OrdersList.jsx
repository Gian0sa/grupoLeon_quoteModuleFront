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
import { useHasAccess } from "../../../shared/utils/permissions";

export default function OrdersList({ detalle, onVerSeguimiento }) {
  const bgCard = useColorModeValue("white", "gray.800");
  const hasAccess = useHasAccess();

  return detalle.map((orden, idx) => {
    const color = orden.estadoMeta?.color || "gray.300";
    const estadoGeneral = orden.estadoMeta?.status || "Desconocido";

    // Función para obtener el ícono según el color
    const getIconPath = (baseName) => {
      const isRed =
        orden.estadoMeta?.color?.startsWith("red") ||
        orden.estadoMeta?.color?.startsWith("red.");
      return isRed
        ? `/src/assets/icons/${baseName}-red.png`
        : `/src/assets/icons/${baseName}.png`;
    };

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
              <Image src={getIconPath("etiqueta")} boxSize="16px" />
              <Text fontSize="md" fontWeight="bold" color={color}>
                #{orden.orden.numero}
              </Text>
            </Flex>

            {/* Cliente */}
            <Flex align="center" gap={2} mb={2}>
              <Image src={getIconPath("ubicacion")} boxSize="16px" />
              <Text fontSize="xs">{orden.cliente.nombre}</Text>
            </Flex>

            {/* Fecha */}
            <Flex align="center" gap={2} mb={4}>
              <Image src={getIconPath("reloj")} boxSize="16px" />
              <Text fontSize="xs">
                {orden.orden.fechaCreacion} - {orden.orden.horaCreacion}
              </Text>
            </Flex>

            {/* Asesor */}
            {hasAccess("GET:/sellers") && (
              <Flex align="center" gap={3} mb={2}>
                <Box>
                  <Text fontWeight="semibold" fontSize="sm" color={color}></Text>
                  <Text fontSize="xs" fontWeight="bold">{orden.vendedor}</Text>
                  <Text fontSize="2xs" color={color}>Asesor de ventas</Text>
                </Box>
              </Flex>
            )}
          </Box>

          {/* STATUS BAR */}
          <Flex
            direction="column"
            align="center"
            maxW="100px"
            w="100px"
            minH="140px"
          >
            <OrderStatusProgress
              estadoMeta={orden.estadoMeta}
              estadoOrden={orden.estadoOrden}
            />
            <Button
              size="xs"
              colorScheme={`${orden.estadoMeta.color}`}
              variant="outline"
              borderRadius="full"
              whiteSpace="normal"
              textAlign="center"
              px={2}
              w="100%"
              mt="auto"
              py={1}
              height="auto"
            >
              {estadoGeneral}
            </Button>
          </Flex>
        </Grid>
      </Box>
    );
  });
}
