import {
  Grid,
  Stat,
  StatLabel,
  StatNumber,
  useColorModeValue,
  Spinner,
  Text,
  Box,
} from "@chakra-ui/react";

export default function SummaryCards({ data, isLoading, error }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.700", "gray.200");

  if (isLoading) return <Spinner size="lg" />;
  if (error) return <Text color="red.500">Error al cargar datos</Text>;
  if (!data) return <Text>No hay datos disponibles</Text>;

  // 💾 Extrae solo los valores de pedido
  const {
    CANT_PEDIDOS,
    PEDIDOS_MES_USD,
    AVANCE_MES_USD,
    CUMPLIMIENTO_PCT,
    CUOTA_MES_USD,
    VENTAS_HOY_USD,
    YEAR,
    MONTH,
  } = data;

  const stats = [
    { label: "Pedidos del Mes", value: CANT_PEDIDOS },
    {
      label: "Pedidos USD",
      value: PEDIDOS_MES_USD?.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      }),
    },
    {
      label: "Avance del Mes",
      value: AVANCE_MES_USD?.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      }),
    },
    {
      label: "Cumplimiento",
      value: `${CUMPLIMIENTO_PCT?.toFixed(2)}%`,
      color: "green.500",
    },
    {
      label: "Cuota USD",
      value: CUOTA_MES_USD?.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      }),
    },
    {
      label: "Ventas Hoy",
      value: VENTAS_HOY_USD?.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      }),
    },
    { label: "Periodo", value: `${MONTH}/${YEAR}` },
  ];

  return (
    <Box w="100%" px={{ base: 2, md: 4 }} py={2}>
      <Grid
        templateColumns={{
          base: "repeat(1, 1fr)", // 📱 móviles
          sm: "repeat(2, 1fr)",   // 📲 pantallas pequeñas
          md: "repeat(3, 1fr)",   // 💻 medianas
          lg: "repeat(4, 1fr)",   // 🖥️ grandes
        }}
        gap={{ base: 3, md: 4, lg: 5 }}
        mb={6}
      >
        {stats.map((stat, index) => (
          <Stat
            key={index}
            p={{ base: 3, md: 4 }}
            bg={cardBg}
            rounded="2xl"
            shadow="md"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            textAlign={{ base: "center", md: "left" }}
            minH="100px"
          >
            <StatLabel fontSize={{ base: "sm", md: "md" }} color={textColor}>
              {stat.label}
            </StatLabel>
            <StatNumber
              fontSize={{ base: "lg", md: "2xl" }}
              fontWeight="bold"
              color={stat.color || "blue.600"}
            >
              {stat.value ?? "-"}
            </StatNumber>
          </Stat>
        ))}
      </Grid>
    </Box>
  );
}
