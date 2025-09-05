import {
  Box,
  Text,
  Flex,
  Image,
  useColorModeValue,
  Button,
  Grid,
  Progress,
  CircularProgress,
  CircularProgressLabel,
} from "@chakra-ui/react";
import { useHasAccess } from "../../../shared/utils/permissions";

export default function OrdersList({ detalle = [], onVerSeguimiento }) {
  const bgCard = useColorModeValue("white", "gray.800");
  const hasAccess = useHasAccess();

  if (!Array.isArray(detalle)) {
    return <Text>No hay órdenes para mostrar</Text>;
  }

 const getIconPath = (baseName) => `/assets/icons/${baseName}`;

  return detalle.map((orden, idx) => {
    // Datos base que vienen del backend
    const numeroOrden = orden.DocNum;
    const fecha = new Date(orden.DocDate).toLocaleDateString("es-PE", {
      timeZone: "UTC"
    });
    const hora = orden.DocTime;
    const cliente = orden.CardName;
    const vendedor = orden.NameVendedor ?? "Sin vendedor";

    // Información del estado desde StatusInfo
    const statusInfo = orden.StatusInfo || {
      name: "Estado desconocido",
      color: "gray.400",
      progress: 0,
      icon: "order.png"
    };

    const color = statusInfo.color;
    const estadoGeneral = statusInfo.name;
    const progress = statusInfo.progress;
    const iconName = statusInfo.icon;

    const getStatusIcon = (baseName, estado) => {
      if (estado.toLowerCase().includes("cancel")) {
        return `${baseName}-red.png`;
      }
      return `${baseName}.png`;
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
              <Image src={getIconPath(getStatusIcon("etiqueta", estadoGeneral))} boxSize="16px" />
              <Text fontSize="md" fontWeight="bold" color={color}>
                #{numeroOrden}
              </Text>
            </Flex>

            {/* Cliente */}
            <Flex align="center" gap={2} mb={2}>
              <Image src={getIconPath(getStatusIcon("ubicacion", estadoGeneral))} boxSize="16px" />
              <Text fontSize="xs">{cliente}</Text>
            </Flex>

            {/* Fecha */}
            <Flex align="center" gap={2} mb={4}>
              <Image src={getIconPath(getStatusIcon("reloj", estadoGeneral))} boxSize="16px" />
              <Text fontSize="xs">
                {fecha} - {hora}
              </Text>
            </Flex>
            {/* Asesor */}
            {hasAccess("GET:/sellers") && (
              <Flex align="center" gap={3} mb={2}>
                <Box>
                  <Text fontSize="xs" fontWeight="bold">
                    {vendedor}
                  </Text>
                  <Text fontSize="2xs" color={color}>
                    Asesor de ventas
                  </Text>
                </Box>
              </Flex>
            )}
          </Box>

          {/* STATUS BAR CON INFORMACIÓN COMPLETA */}
          <Flex
            direction="column"
            align="center"
            maxW="120px"
            w="120px"
            minH="140px"
            gap={3}
          >
            {/* Progreso circular */}
            <CircularProgress
              value={progress}
              color={color}
              size="60px"
              thickness="6px"
            >
              <CircularProgressLabel fontSize="xs" fontWeight="bold">
                {progress}%
              </CircularProgressLabel>
            </CircularProgress>

            {/* Icono del estado */}
            <Image 
              src={getIconPath(iconName)} 
              boxSize="24px" 
              alt={estadoGeneral}
            />

            {/* Botón con estado */}
            <Button
              size="xs"
              colorScheme={color.split('.')[0]} // extrae 'green' de 'green.400'
              variant="outline"
              borderRadius="full"
              whiteSpace="normal"
              textAlign="center"
              px={2}
              w="100%"
              py={1}
              height="auto"
              fontSize="2xs"
            >
              {estadoGeneral}
            </Button>
          </Flex>
        </Grid>
      </Box>
    );
  });
}